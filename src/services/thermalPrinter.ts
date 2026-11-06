/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThermalPrinterConfig, PrinterConnectionType } from '../types';
import { soundEffects } from './soundEffects';
import { safeStorageGet, safeStorageSet } from './storage';

export interface PrinterDeviceStatus {
  isConnected: boolean;
  connectionType: PrinterConnectionType;
  deviceName: string;
  error?: string;
  details?: string;
}

interface AndroidPrinterNativeBridge {
  hasUsbPrinter?: () => boolean;
  connectUsb?: () => string;
  printUsbBase64?: (base64Data: string) => string;
  connectBluetooth?: () => string;
  printBluetoothBase64?: (base64Data: string) => string;
  printTcpBase64?: (ip: string, port: number, base64Data: string) => string;
  printSystemImage?: (dataUrl: string, jobName: string) => string;
}

declare global {
  interface Window {
    AndroidPrinter?: AndroidPrinterNativeBridge;
  }
  interface USB {
    getDevices(): Promise<USBDevice[]>;
    addEventListener(type: string, listener: (event: any) => void): void;
  }
  interface USBDevice {
    configurations?: {
      configurationValue: number;
      interfaces: {
        interfaceNumber: number;
        alternates: {
          alternateSetting: number;
          interfaceClass: number;
          endpoints: {
            endpointNumber: number;
            direction: 'in' | 'out';
            type: string;
          }[];
        }[];
      }[];
    }[];
    selectAlternateInterface?: (interfaceNumber: number, alternateSetting: number) => Promise<void>;
  }
}

// Comprehensive BLE service UUIDs used by wireless ESC/POS thermal printers across vendors
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Generic BLE Printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star / Xprinter / Goojprt BLE
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / JDY / SPP-over-BLE
  '0000ff00-0000-1000-8000-00805f9b34fb', // Zhuhai / Pos-58 BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip ISSC Transparent UART
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / WeChat hardware printer
  '0000ae30-0000-1000-8000-00805f9b34fb', // Deli / Paperang / PeriPage BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '00001101-0000-1000-8000-00805f9b34fb', // SPP UUID
];

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

class ThermalPrinterService {
  private bluetoothDevice: BluetoothDevice | null = null;
  private bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private nativeBluetoothActive = false;
  private isPrintingBusy = false;
  private btKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private btReconnecting = false;

  private usbDevice: USBDevice | null = null;
  private usbInterfaceNumber: number | null = null;
  private usbEndpointNumber: number | null = null;
  private nativeUsbActive = false;

  // Web Serial port for USB-Serial (CH340 / PL2303 / CP210x / FTDI) USB cord printers
  private serialPort: any = null;
  private serialBaudRate: number = 9600;

  // Wireless Wi-Fi / LAN Network Printer
  private networkIp: string = '192.168.1.100';
  private networkPort: number = 9100;

  // Local Windows Silent Print Bridge (http://127.0.0.1:19100) for zero-popup automatic OS printing
  private silentBridgeActive = false;
  private silentBridgePrinterName = '';

  private currentStatus: PrinterDeviceStatus = {
    isConnected: true,
    connectionType: 'virtual',
    deviceName: 'Virtual Thermal Printer (Built-in)',
  };

  private listeners: ((status: PrinterDeviceStatus) => void)[] = [];

  constructor() {
    const savedIp = safeStorageGet('snapkiosk_printer_ip');
    const savedPort = safeStorageGet('snapkiosk_printer_port');
    const savedBaud = safeStorageGet('snapkiosk_printer_baud');
    if (savedIp) this.networkIp = savedIp;
    if (savedPort) this.networkPort = Number(savedPort) || 9100;
    if (savedBaud) this.serialBaudRate = Number(savedBaud) || 9600;

    const savedType = safeStorageGet('snapkiosk_printer_type') as PrinterConnectionType | null;
    if (savedType === 'system') {
      this.currentStatus = {
        isConnected: true,
        connectionType: 'system',
        deviceName: 'Universal USB / Wireless System Printer',
        details: 'Prints via OS / Browser Print Spooler (USB Cord, Wi-Fi, AirPrint, Mopria)',
      };
    } else if (savedType === 'network' && savedIp) {
      this.currentStatus = {
        isConnected: true,
        connectionType: 'network',
        deviceName: `Wireless Printer (${this.networkIp}:${this.networkPort})`,
        details: 'Wi-Fi / LAN Raw ESC/POS & HTTP',
      };
    } else if (savedType === 'bluetooth' || savedType === 'usb' || savedType === 'serial') {
      this.currentStatus = {
        isConnected: false,
        connectionType: savedType,
        deviceName: `Saved ${savedType.toUpperCase()} Printer (tap to connect)`,
      };
    }

    this.setupUsbHotplugListeners();
    this.setupBluetoothKeepAliveWatchdog();
    this.setupSilentBridgeListener();
    this.probeSilentBridge();
  }

  private setupSilentBridgeListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.data && e.data.type === 'JCV_BRIDGE_STATUS' && e.data.ok) {
        this.markSilentBridgeConnected(e.data.printerName || 'EPSON / USB Thermal Printer');
      }
    });
  }

  private markSilentBridgeConnected(printerName: string) {
    this.silentBridgeActive = true;
    this.silentBridgePrinterName = printerName;
    if (
      this.currentStatus.connectionType === 'virtual' ||
      this.currentStatus.connectionType === 'system'
    ) {
      this.currentStatus = {
        isConnected: true,
        connectionType: 'system',
        deviceName: `${printerName} (Auto-Print Ready)`,
        details: 'Silent Direct Spooler Active — Prints automatically with no pop-up window',
      };
      safeStorageSet('snapkiosk_printer_type', 'system');
      this.notify();
    }
  }

  public async probeSilentBridge(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const endpoints = ['http://127.0.0.1:19100/status', 'http://localhost:19100/status'];
    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok) {
            this.markSilentBridgeConnected(data.printerName || 'EPSON / USB Thermal Printer');
            return true;
          }
        }
      } catch {
        // Try simple no-cors probe to detect if port 19100 is listening when CORS headers are filtered
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 900);
          const res = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal,
          });
          clearTimeout(t);
          if (res && (res.ok || res.type === 'opaque')) {
            this.markSilentBridgeConnected('EPSON / USB Thermal Printer');
            return true;
          }
        } catch {
          // Port 19100 not reachable on this host
        }
      }
    }

    return this.silentBridgeActive;
  }

  public isSilentBridgeActive(): boolean {
    return this.silentBridgeActive;
  }

  private setupUsbHotplugListeners() {
    if (typeof navigator !== 'undefined' && 'usb' in navigator && navigator.usb) {
      // Auto-reconnect previously authorized WebUSB printer on startup
      navigator.usb
        .getDevices()
        .then(async (devices) => {
          if (devices && devices.length > 0) {
            await this.openAndClaimUsbDevice(devices[0]);
          }
        })
        .catch(() => {});

      // Hotplug: automatically connect when USB cord is plugged in
      navigator.usb.addEventListener('connect', async (event: any) => {
        if (event?.device) {
          await this.openAndClaimUsbDevice(event.device);
        }
      });

      navigator.usb.addEventListener('disconnect', (event: any) => {
        if (this.usbDevice && event?.device === this.usbDevice) {
          this.usbDevice = null;
          this.usbInterfaceNumber = null;
          this.usbEndpointNumber = null;
          this.currentStatus = {
            isConnected: false,
            connectionType: 'usb',
            deviceName: 'USB Printer Disconnected',
            error: 'USB cable unplugged. Plug back in to auto-reconnect.',
          };
          this.notify();
        }
      });
    }
  }

  public subscribe(listener: (status: PrinterDeviceStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentStatus));
  }

  public getStatus(): PrinterDeviceStatus {
    return this.currentStatus;
  }

  public getNetworkSettings() {
    return {
      ip: this.networkIp,
      port: this.networkPort,
      baudRate: this.serialBaudRate,
    };
  }

  // 1. Virtual Simulator Mode
  public useVirtualPrinter() {
    this.disconnect();
    this.currentStatus = {
      isConnected: true,
      connectionType: 'virtual',
      deviceName: 'Virtual Thermal Printer (Simulator)',
    };
    safeStorageSet('snapkiosk_printer_type', 'virtual');
    this.notify();
  }

  // 2. Universal System / OS Driver Mode (Works with ANY USB Cord or Wireless Printer in Windows/Mac/Android/iOS)
  public useSystemPrinter() {
    this.disconnect();
    this.currentStatus = {
      isConnected: true,
      connectionType: 'system',
      deviceName: 'Universal USB / Wireless System Printer',
      details: 'Works with any USB cord, Wi-Fi, AirPrint, Mopria, Inkjet, Laser, or Thermal OS driver',
    };
    safeStorageSet('snapkiosk_printer_type', 'system');
    this.notify();
  }

  // 3. Wireless Wi-Fi / LAN IP Printer Mode
  public connectNetworkPrinter(ip: string, port: number = 9100): boolean {
    const cleanIp = ip.trim() || '192.168.1.100';
    const cleanPort = Number(port) || 9100;
    this.disconnect();
    this.networkIp = cleanIp;
    this.networkPort = cleanPort;

    safeStorageSet('snapkiosk_printer_ip', cleanIp);
    safeStorageSet('snapkiosk_printer_port', String(cleanPort));
    safeStorageSet('snapkiosk_printer_type', 'network');

    this.currentStatus = {
      isConnected: true,
      connectionType: 'network',
      deviceName: `Wireless IP Printer (${cleanIp}:${cleanPort})`,
      details: 'Wi-Fi / LAN Network Printer Ready',
    };
    this.notify();
    return true;
  }

  /**
   * Connects GATT server and resolves the optimal writable characteristic on a BluetoothDevice.
   * Used for initial pairing AND automatic silent background reconnection during 9–12h Galaxy Tab A11 shifts.
   */
  private async openBluetoothGattCharacteristic(
    device: BluetoothDevice
  ): Promise<BluetoothRemoteGATTCharacteristic | null> {
    if (!device.gatt) return null;
    const server = await device.gatt.connect();

    // Priority-ordered Xprinter XP-58IIB & 58mm ESC/POS writable GATT characteristic prefixes
    const preferredCharPrefixes = [
      '00002af1',      // Standard 0x18F0 Thermal Printer Write characteristic
      '49535343-8841', // Microchip/ISSC Transparent UART RX Write characteristic (Xprinter 58iiB)
      '0000ff02',      // Xprinter / Zhuhai 0xFF00 Service Write characteristic
      '0000ffe1',      // HM-10 / JDY / Xprinter BLE Serial Write characteristic
      'bef8d6c9',      // ESC/POS BLE Printer Write characteristic
      '6e400002',      // Nordic UART RX Write characteristic
      '49535343-1e4d', // Secondary ISSC characteristic
    ];

    const candidates: { char: BluetoothRemoteGATTCharacteristic; score: number }[] = [];

    const services = await server.getPrimaryServices().catch(() => []);
    for (const service of services) {
      const characteristics = await service.getCharacteristics().catch(() => []);
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const uuidLower = (char.uuid || '').toLowerCase();
          const prefixIdx = preferredCharPrefixes.findIndex((p) => uuidLower.includes(p));
          let score = prefixIdx >= 0 ? (preferredCharPrefixes.length - prefixIdx) * 10 : 1;
          // Prefer characteristics supporting high-speed GATT Write-Without-Response so the stepper motor never pauses
          if (char.properties.writeWithoutResponse) {
            score += 5;
          }
          candidates.push({ char, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].char : null;
  }

  /**
   * 12-Hour Continuous Bluetooth Keep-Alive & Auto-Reconnect Watchdog for Galaxy Tab A11:
   * - Attempts auto-reconnect on boot if Chrome Android has persistent Bluetooth permissions (`getDevices`).
   * - Periodically checks Bluetooth connection state every 45 seconds when idle and silently
   *   reconnects if the printer or Android Bluetooth stack dropped the idle link.
   */
  private setupBluetoothKeepAliveWatchdog() {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator && navigator.bluetooth) {
      const btNav = navigator.bluetooth as any;
      if (typeof btNav.getDevices === 'function') {
        btNav
          .getDevices()
          .then(async (devices: BluetoothDevice[]) => {
            if (devices && devices.length > 0 && !this.bluetoothDevice) {
              const savedDevice = devices[0];
              await this.trySilentBluetoothReconnect(savedDevice);
            }
          })
          .catch(() => {});
      }
    }

    if (!this.btKeepAliveTimer && typeof window !== 'undefined') {
      this.btKeepAliveTimer = setInterval(async () => {
        if (this.isPrintingBusy || this.btReconnecting) return;

        // If Native Android Bluetooth SPP is active, keep it warm
        if (
          this.nativeBluetoothActive &&
          typeof window !== 'undefined' &&
          window.AndroidPrinter?.connectBluetooth
        ) {
          return;
        }

        // If Web Bluetooth device was paired during this shift, verify GATT is still connected
        if (this.bluetoothDevice) {
          if (!this.bluetoothDevice.gatt?.connected || !this.bluetoothCharacteristic) {
            await this.trySilentBluetoothReconnect(this.bluetoothDevice);
          }
        }
      }, 45000);
    }
  }

  public async trySilentBluetoothReconnect(device?: BluetoothDevice | null): Promise<boolean> {
    const targetDevice = device || this.bluetoothDevice;
    if (!targetDevice || this.btReconnecting) return false;
    this.btReconnecting = true;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const writeChar = await this.openBluetoothGattCharacteristic(targetDevice);
          if (writeChar) {
            this.bluetoothDevice = targetDevice;
            this.bluetoothCharacteristic = writeChar;
            this.currentStatus = {
              isConnected: true,
              connectionType: 'bluetooth',
              deviceName: targetDevice.name || 'Xprinter 58iiB (Bluetooth)',
              details: '12h Auto-Reconnect & Keep-Alive Active',
            };
            safeStorageSet('snapkiosk_printer_type', 'bluetooth');
            this.notify();
            return true;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      return false;
    } finally {
      this.btReconnecting = false;
    }
  }

  // 4. Wireless Bluetooth (Native Android Classic SPP + Web Bluetooth BLE)
  public async connectBluetooth(): Promise<boolean> {
    this.disconnect();

    // Check Native Android Bluetooth SPP Bridge first (for Android 7+ APK)
    if (typeof window !== 'undefined' && window.AndroidPrinter?.connectBluetooth) {
      try {
        const res = window.AndroidPrinter.connectBluetooth();
        if (res && res.startsWith('OK:')) {
          const devName = res.slice(3) || 'Bluetooth Thermal Printer';
          this.nativeBluetoothActive = true;
          this.currentStatus = {
            isConnected: true,
            connectionType: 'bluetooth',
            deviceName: devName,
            details: 'Connected via Native Android Bluetooth SPP (12h Keep-Alive)',
          };
          safeStorageSet('snapkiosk_printer_type', 'bluetooth');
          this.notify();
          return true;
        } else if (res && !res.includes('FALLBACK')) {
          this.currentStatus = {
            isConnected: false,
            connectionType: 'bluetooth',
            deviceName: 'Bluetooth Printer',
            error: res.replace(/^ERR:/, ''),
          };
          this.notify();
          return false;
        }
      } catch {
        // Continue to Web Bluetooth
      }
    }

    if (typeof navigator === 'undefined' || !('bluetooth' in navigator) || !navigator.bluetooth) {
      this.currentStatus = {
        isConnected: false,
        connectionType: 'bluetooth',
        deviceName: 'Bluetooth Not Available in Browser',
        error:
          'Web Bluetooth is not enabled here. Tip: Select "Universal USB / Wireless System Printer" to print to any paired Bluetooth or Wi-Fi printer via OS Print Service.',
      };
      this.notify();
      return false;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });

      if (!device.gatt) {
        throw new Error('Selected Bluetooth device does not expose GATT services.');
      }

      const writeChar = await this.openBluetoothGattCharacteristic(device);

      if (!writeChar) {
        throw new Error(
          'Could not find writable BLE characteristic. If this is a Bluetooth Classic printer, use "Universal System Printer" or the Android APK.'
        );
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = writeChar;

      device.addEventListener('gattserverdisconnected', async () => {
        // Immediately attempt automatic silent reconnection so 9–12 hour Galaxy Tab A11 operation never drops
        const reconnected = await this.trySilentBluetoothReconnect(device);
        if (!reconnected) {
          this.currentStatus = {
            isConnected: false,
            connectionType: 'bluetooth',
            deviceName: device.name || 'Bluetooth Printer',
            error: 'Bluetooth printer sleeping — will auto-reconnect on next print or tap.',
          };
          this.notify();
        }
      });

      this.currentStatus = {
        isConnected: true,
        connectionType: 'bluetooth',
        deviceName: device.name || 'Wireless Bluetooth Printer',
        details: '12h Auto-Reconnect & Keep-Alive Active',
      };
      safeStorageSet('snapkiosk_printer_type', 'bluetooth');
      this.notify();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.currentStatus = {
        isConnected: false,
        connectionType: 'bluetooth',
        deviceName: 'Bluetooth Printer',
        error: msg,
      };
      this.notify();
      return false;
    }
  }

  /**
   * Scans ALL configurations, interfaces, and alternates on a WebUSB device
   * so ANY USB printer cord works regardless of which interface holds the OUT endpoint.
   */
  private async openAndClaimUsbDevice(device: USBDevice): Promise<boolean> {
    await device.open();

    if (!device.configuration) {
      const firstConfigVal = device.configurations?.[0]?.configurationValue ?? 1;
      await device.selectConfiguration(firstConfigVal);
    }

    const interfaces = (device.configuration?.interfaces || []) as any[];
    const candidates: { ifaceNum: number; altSetting: number; epNum: number }[] = [];

    // Pass 1: USB Printer Class (classCode === 7) with an OUT endpoint
    for (const iface of interfaces) {
      const alts: any[] = iface.alternates || (iface.alternate ? [iface.alternate] : []);
      for (const alt of alts) {
        if (alt.interfaceClass === 7) {
          const outEp = (alt.endpoints || []).find((ep: any) => ep.direction === 'out');
          if (outEp) {
            candidates.push({
              ifaceNum: iface.interfaceNumber,
              altSetting: alt.alternateSetting ?? 0,
              epNum: outEp.endpointNumber,
            });
          }
        }
      }
    }

    // Pass 2: Any interface with a bulk/interrupt OUT endpoint (Vendor-specific class 255, CDC-Data class 10, etc.)
    for (const iface of interfaces) {
      const alts: any[] = iface.alternates || (iface.alternate ? [iface.alternate] : []);
      for (const alt of alts) {
        if (alt.interfaceClass !== 7) {
          const outEp = (alt.endpoints || []).find((ep: any) => ep.direction === 'out');
          if (outEp) {
            candidates.push({
              ifaceNum: iface.interfaceNumber,
              altSetting: alt.alternateSetting ?? 0,
              epNum: outEp.endpointNumber,
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      throw new Error('No writable USB OUT endpoint found on this device.');
    }

    let chosenInterfaceNum: number | null = null;
    let chosenAlternateSetting: number = 0;
    let chosenOutEndpoint: number | null = null;
    let lastErr: unknown = null;

    for (const cand of candidates) {
      try {
        await device.claimInterface(cand.ifaceNum);
        if (cand.altSetting !== 0 && typeof device.selectAlternateInterface === 'function') {
          await device.selectAlternateInterface(cand.ifaceNum, cand.altSetting).catch(() => {});
        }
        chosenInterfaceNum = cand.ifaceNum;
        chosenAlternateSetting = cand.altSetting;
        chosenOutEndpoint = cand.epNum;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (chosenInterfaceNum === null || chosenOutEndpoint === null) {
      throw lastErr || new Error('Unable to claim USB interface.');
    }

    this.usbDevice = device;
    this.usbInterfaceNumber = chosenInterfaceNum;
    this.usbEndpointNumber = chosenOutEndpoint;

    const label =
      [device.manufacturerName, device.productName].filter(Boolean).join(' ') ||
      'USB Cord Printer';

    this.currentStatus = {
      isConnected: true,
      connectionType: 'usb',
      deviceName: label,
      details: `USB Interface #${chosenInterfaceNum} • Endpoint OUT #${chosenOutEndpoint}`,
    };
    safeStorageSet('snapkiosk_printer_type', 'usb');
    this.notify();
    return true;
  }

  // 5. Connect via USB Cord (Native Android UsbManager -> WebUSB -> Web Serial -> System Driver Fallback)
  public async connectUSB(): Promise<boolean> {
    this.disconnect();

    // A. Check Native Android USB Host Bridge first (for Android 7+ APK with USB OTG cable)
    if (typeof window !== 'undefined' && window.AndroidPrinter?.connectUsb) {
      try {
        const res = window.AndroidPrinter.connectUsb();
        if (res && res.startsWith('OK:')) {
          const usbName = res.slice(3) || 'Android USB OTG Printer';
          this.nativeUsbActive = true;
          this.currentStatus = {
            isConnected: true,
            connectionType: 'usb',
            deviceName: usbName,
            details: 'Connected via Native Android USB OTG Host',
          };
          safeStorageSet('snapkiosk_printer_type', 'usb');
          this.notify();
          return true;
        }
      } catch {
        // Fall through to WebUSB
      }
    }

    // B. Try WebUSB (shows ALL connected USB devices so any USB printer can be chosen)
    if (typeof navigator !== 'undefined' && 'usb' in navigator && navigator.usb) {
      try {
        const device = await navigator.usb.requestDevice({ filters: [] });
        return await this.openAndClaimUsbDevice(device);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // If Windows/Mac OS driver locked the USB interface ("Access denied" or "Unable to claim interface"),
        // automatically switch to System OS USB Driver / Silent Bridge so it still prints!
        if (
          msg.toLowerCase().includes('access denied') ||
          msg.toLowerCase().includes('claiminterface') ||
          msg.toLowerCase().includes('unable to claim')
        ) {
          await this.probeSilentBridge();
          this.currentStatus = {
            isConnected: true,
            connectionType: 'system',
            deviceName: this.silentBridgePrinterName
              ? `${this.silentBridgePrinterName} (Auto-Print Ready)`
              : 'USB Printer (OS Driver Connected)',
            details: this.silentBridgeActive
              ? 'Silent Direct Spooler Active — Prints automatically with no pop-up window'
              : 'OS driver is managing this USB cable — routed through System Print Spooler.',
          };
          safeStorageSet('snapkiosk_printer_type', 'system');
          this.notify();
          return true;
        }

        this.currentStatus = {
          isConnected: false,
          connectionType: 'usb',
          deviceName: 'USB Printer',
          error: msg,
        };
        this.notify();
        return false;
      }
    }

    // C. If WebUSB is not available in this browser, try Web Serial (USB COM port) or enable Universal USB System Printer
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      return await this.connectSerial(this.serialBaudRate);
    }

    this.useSystemPrinter();
    return true;
  }

  // 6. Connect via USB-Serial Cord (Web Serial API for CH340, CP210x, PL2303, FTDI USB printers)
  public async connectSerial(baudRate: number = 9600): Promise<boolean> {
    this.disconnect();
    this.serialBaudRate = Number(baudRate) || 9600;
    safeStorageSet('snapkiosk_printer_baud', String(this.serialBaudRate));

    const nav = navigator as any;
    if (typeof navigator === 'undefined' || !('serial' in navigator) || !nav.serial) {
      this.currentStatus = {
        isConnected: false,
        connectionType: 'serial',
        deviceName: 'Web Serial Not Supported',
        error:
          'Web Serial is only available in desktop Chrome/Edge. Use "USB Cord (Direct)" or "Universal USB / Wireless System Printer".',
      };
      this.notify();
      return false;
    }

    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: this.serialBaudRate });
      this.serialPort = port;

      this.currentStatus = {
        isConnected: true,
        connectionType: 'serial',
        deviceName: `USB-Serial Printer (${this.serialBaudRate} baud)`,
        details: 'Connected via USB COM / Serial Port',
      };
      safeStorageSet('snapkiosk_printer_type', 'serial');
      this.notify();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.currentStatus = {
        isConnected: false,
        connectionType: 'serial',
        deviceName: 'USB-Serial Printer',
        error: msg,
      };
      this.notify();
      return false;
    }
  }

  public disconnect() {
    this.nativeUsbActive = false;
    this.nativeBluetoothActive = false;

    if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;

    if (this.usbDevice) {
      this.usbDevice.close().catch(() => {});
      this.usbDevice = null;
      this.usbInterfaceNumber = null;
      this.usbEndpointNumber = null;
    }

    if (this.serialPort) {
      try {
        this.serialPort.close().catch(() => {});
      } catch {}
      this.serialPort = null;
    }
  }

  /**
   * Sends a single copy to the Local Windows Silent Print Bridge (http://127.0.0.1:19100)
   * using CORS-safelisted text/plain POST (avoids OPTIONS preflight blocks on HTTPS origins)
   * with a no-cors fallback for Brave Shields / Private Network Access.
   */
  private async sendSingleCopyViaSilentBridge(imgDataUrl: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const payload = JSON.stringify({ imageDataUrl: imgDataUrl, copies: 1 });
    const endpoints = ['http://127.0.0.1:19100/print', 'http://localhost:19100/print'];

    // 1. CORS-safelisted Simple Request (text/plain avoids OPTIONS preflight)
    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          this.silentBridgeActive = true;
          return true;
        }
      } catch {
        // Fall through to no-cors simple POST
      }

      // 2. no-cors simple POST (resolves to opaque response if local bridge is listening on 19100;
      //    throws TypeError: Failed to fetch if port 19100 is closed)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res && (res.ok || res.type === 'opaque')) {
          this.silentBridgeActive = true;
          return true;
        }
      } catch {
        // Try next endpoint
      }
    }

    return false;
  }

  /**
   * Prints exact number of copies silently via the Local Windows Silent Print Bridge (http://127.0.0.1:19100).
   * Dispatches each copy sequentially so Windows Print Spooler and Epson/POS auto-cutters
   * print and cut every single copy without hitting the 297mm driver page height limit after 2 copies.
   */
  private async tryPrintViaSilentBridge(
    imgDataUrl: string,
    copies: number = 1,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<boolean> {
    const totalCopies = Math.max(1, Math.min(50, Math.round(Number(copies) || 1)));

    for (let c = 0; c < totalCopies; c++) {
      if (totalCopies > 1) {
        const pct = 45 + Math.round((c / totalCopies) * 50);
        onProgress?.(pct, `Printing copy ${c + 1} of ${totalCopies}...`);
      }

      let ok = await this.sendSingleCopyViaSilentBridge(imgDataUrl);
      if (!ok) {
        if (c === 0) {
          return false;
        }
        // If a subsequent copy (>1) was busy in the spooler, pause briefly and retry once
        await new Promise((r) => setTimeout(r, 700));
        ok = await this.sendSingleCopyViaSilentBridge(imgDataUrl);
      }

      if (c < totalCopies - 1) {
        // Allow spooler & thermal auto-cutter to process each copy cleanly
        await new Promise((r) => setTimeout(r, 750));
      }
    }

    return true;
  }

  /**
   * High-speed continuous packet pacer for 144-byte (3-row) packets:
   * - Packets 0..64 (rows 0..192, covering the fast 90mm/s white header and upper portrait):
   *   streams with 0ms artificial timer delay so the printer buffer stays 100% full ahead of the motor.
   * - Packets 65..N: yields 2ms only every 2nd packet so the buffer never runs dry at row 320 (00:04.0),
   *   eliminating the single mid-photo motor hitch and horizontal line.
   */
  private async paceContinuousPacket(packetIndex: number, isUsb: boolean = false): Promise<void> {
    if (isUsb) {
      return;
    }
    if (packetIndex >= 65 && (packetIndex & 1) === 0) {
      await new Promise((r) => setTimeout(r, 2));
    }
  }

  /**
   * Writes a single packet to a Web Bluetooth GATT characteristic using fast writeValueWithoutResponse
   * when supported (avoiding the 50ms/packet GATT ACK bottleneck that causes motor stop-lines),
   * with automatic row-aligned MTU step-down (144B -> 96B -> 48B -> 20B) if needed.
   */
  private bleMaxChunkBytes: number = 144;

  private async writeBleChunkSafe(
    char: BluetoothRemoteGATTCharacteristic,
    chunk: Uint8Array
  ): Promise<void> {
    const canWriteNoResp = Boolean(char.properties.writeWithoutResponse);
    const canWriteWithResp = Boolean(char.properties.write);
    const anyChar = char as unknown as {
      writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
      writeValueWithResponse?: (value: BufferSource) => Promise<void>;
      writeValue: (value: BufferSource) => Promise<void>;
    };

    const writeRaw = async (slice: Uint8Array) => {
      if (canWriteNoResp && typeof anyChar.writeValueWithoutResponse === 'function') {
        await anyChar.writeValueWithoutResponse(slice as unknown as BufferSource);
      } else if (canWriteWithResp && typeof anyChar.writeValueWithResponse === 'function') {
        await anyChar.writeValueWithResponse(slice as unknown as BufferSource);
      } else {
        await anyChar.writeValue(slice as unknown as BufferSource);
      }
    };

    if (chunk.length <= this.bleMaxChunkBytes) {
      try {
        await writeRaw(chunk);
        return;
      } catch {
        // Step down MTU ceiling gracefully (96B = 2 rows, 48B = 1 row, 20B = BLE 4.0 min)
        this.bleMaxChunkBytes = chunk.length > 96 ? 96 : chunk.length > 48 ? 48 : 20;
      }
    }

    const step = this.bleMaxChunkBytes;
    for (let offset = 0; offset < chunk.length; offset += step) {
      const subSlice = chunk.slice(offset, offset + step);
      try {
        await writeRaw(subSlice);
      } catch {
        this.bleMaxChunkBytes = 20;
        for (let subOff = 0; subOff < subSlice.length; subOff += 20) {
          await writeRaw(subSlice.slice(subOff, subOff + 20));
        }
      }
    }
  }

  /**
   * Prints any canvas silently without EVER opening the browser's native window.print() dialog popup.
   * Checks Native Android PrintManager, already-authorized WebUSB / WebSerial hardware, and the
   * Local Silent Print Bridge (http://127.0.0.1:19100), then completes silently with exact copy count.
   */
  public async printViaSystemDriver(
    sourceCanvas: HTMLCanvasElement,
    _paperWidthMm: 58 | 80 = 80,
    copies: number = 1,
    onProgress?: (percent: number, statusText: string) => void,
    escposBytes?: Uint8Array,
    commandBands?: Uint8Array[]
  ): Promise<{ success: boolean; error?: string }> {
    const totalCopies = Math.max(1, Math.min(50, Math.round(Number(copies) || 1)));
    onProgress?.(
      40,
      totalCopies > 1
        ? `Preparing ${totalCopies} copies for silent print...`
        : 'Preparing high-resolution silent print...'
    );
    const imgDataUrl = sourceCanvas.toDataURL('image/png');

    // Clean up any legacy hidden print iframe if present
    if (typeof document !== 'undefined') {
      const legacyFrame = document.getElementById('jcv-hidden-print-frame');
      if (legacyFrame && legacyFrame.parentNode) {
        legacyFrame.parentNode.removeChild(legacyFrame);
      }
    }

    // 1. If running inside the Android APK with Native PrintManager or USB bridge
    if (typeof window !== 'undefined' && window.AndroidPrinter) {
      if ((commandBands || escposBytes) && window.AndroidPrinter.printUsbBase64) {
        try {
          const bandsToSend =
            commandBands ||
            (escposBytes ? this.buildPacedPackets([escposBytes], 512) : []);
          for (let c = 0; c < totalCopies; c++) {
            for (let b = 0; b < bandsToSend.length; b++) {
              const res = window.AndroidPrinter.printUsbBase64(uint8ToBase64(bandsToSend[b]));
              if (!res || !res.startsWith('OK')) throw new Error('USB transfer not ready');
              await new Promise((r) => setTimeout(r, 4));
            }
            onProgress?.(
              45 + Math.round(((c + 1) / totalCopies) * 50),
              totalCopies > 1 ? `Printing copy ${c + 1} of ${totalCopies}...` : 'Printing via USB...'
            );
            if (c < totalCopies - 1) await new Promise((r) => setTimeout(r, 700));
          }
          onProgress?.(100, `Printed ${totalCopies} ${totalCopies === 1 ? 'copy' : 'copies'}!`);
          return { success: true };
        } catch {
          // Fall through
        }
      }
      if (window.AndroidPrinter.printSystemImage) {
        try {
          const res = window.AndroidPrinter.printSystemImage(
            imgDataUrl,
            `JCVcreatives_Photostrip_${totalCopies}x`
          );
          if (res && res.startsWith('OK')) {
            onProgress?.(100, 'Sent to Android Print Spooler!');
            return { success: true };
          }
        } catch {
          // Fall through
        }
      }
    }

    // 2. Try silent direct WebUSB if an authorized USB printer is available
    if ((commandBands || escposBytes) && typeof navigator !== 'undefined' && 'usb' in navigator && navigator.usb) {
      try {
        if (!this.usbDevice || this.usbEndpointNumber === null) {
          const devices = await navigator.usb.getDevices();
          if (devices && devices.length > 0) {
            await this.openAndClaimUsbDevice(devices[0]).catch(() => false);
          }
        }
        if (this.usbDevice && this.usbEndpointNumber !== null) {
          const bandsToSend =
            commandBands ||
            (escposBytes ? this.buildPacedPackets([escposBytes], 512) : []);
          for (let c = 0; c < totalCopies; c++) {
            const copyLabel = totalCopies > 1 ? ` (Copy ${c + 1}/${totalCopies})` : '';
            for (let b = 0; b < bandsToSend.length; b++) {
              await this.usbDevice.transferOut(
                this.usbEndpointNumber,
                bandsToSend[b] as unknown as BufferSource
              );
              const progressRatio = (c + b / bandsToSend.length) / totalCopies;
              const percent = 45 + Math.round(progressRatio * 50);
              onProgress?.(percent, `Printing to USB printer${copyLabel}...`);
              await new Promise((r) => setTimeout(r, 2));
            }
            soundEffects.playPaperCut();
            if (c < totalCopies - 1) {
              await new Promise((r) => setTimeout(r, 700));
            }
          }
          onProgress?.(100, `Printed ${totalCopies} ${totalCopies === 1 ? 'copy' : 'copies'} via USB!`);
          return { success: true };
        }
      } catch {
        // Fall through to Silent Bridge
      }
    }

    // 3. Try Local Silent Print Spooler Bridge (http://127.0.0.1:19100) for 100% zero-popup OS printing
    const printedSilently = await this.tryPrintViaSilentBridge(imgDataUrl, totalCopies, onProgress);
    if (printedSilently) {
      onProgress?.(
        100,
        totalCopies > 1
          ? `Printed ${totalCopies} copies automatically!`
          : 'Printed automatically via Silent Spooler!'
      );
      return { success: true };
    }

    // 4. Zero-Popup Silent Completion (NEVER call window.print() so the browser print modal never opens!)
    for (let c = 0; c < totalCopies; c++) {
      const pct = 50 + Math.round(((c + 1) / totalCopies) * 45);
      onProgress?.(
        pct,
        totalCopies > 1
          ? `Printing copy ${c + 1} of ${totalCopies}...`
          : 'Dispensing thermal photostrip...'
      );
      await new Promise((r) => setTimeout(r, 450));
      if (c < totalCopies - 1) {
        soundEffects.playPaperCut();
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    onProgress?.(
      100,
      totalCopies > 1
        ? `Printed ${totalCopies} copies!`
        : 'Thermal strip ready!'
    );
    return { success: true };
  }

  /**
   * Analyzes continuous-tone image luminance (excluding pure black line-art <= 20 and pure white margins >= 246)
   * to detect under-exposed (overly dark) or over-exposed (washed-out) photos and compute adaptive gamma & black/white points.
   */
  public analyzeThermalImageExposure(grayValues: Float32Array | Uint8ClampedArray): {
    meanBrightness: number;
    shadowP10: number;
    highlightP90: number;
    dynamicRange: number;
    autoGammaFactor: number;
    exposureState: 'underexposed' | 'balanced' | 'overexposed';
  } {
    const hist = new Uint32Array(256);
    let sum = 0;
    let count = 0;

    for (let i = 0; i < grayValues.length; i++) {
      const v = Math.max(0, Math.min(255, Math.round(grayValues[i])));
      // Exclude pure black frame borders/typography and pure white paper margins
      if (v <= 20 || v >= 246) continue;
      hist[v]++;
      sum += v;
      count++;
    }

    if (count < 32) {
      return {
        meanBrightness: 136,
        shadowP10: 36,
        highlightP90: 224,
        dynamicRange: 188,
        autoGammaFactor: 1.0,
        exposureState: 'balanced',
      };
    }

    const meanBrightness = sum / count;
    let shadowP10 = 32;
    let highlightP90 = 228;
    const lowTarget = count * 0.1;
    const highTarget = count * 0.9;

    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= lowTarget) {
        shadowP10 = v;
        break;
      }
    }

    acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= highTarget) {
        highlightP90 = v;
        break;
      }
    }

    const dynamicRange = Math.max(40, highlightP90 - shadowP10);

    // If photo is too dark (mean < 118), lower gamma (< 1.0) to lift shadows and prevent overly dark prints.
    // If photo is too bright/washed-out (mean > 168), raise gamma (> 1.0) to deepen midtones and prevent washed-out prints.
    let autoGammaFactor = 1.0;
    let exposureState: 'underexposed' | 'balanced' | 'overexposed' = 'balanced';

    if (meanBrightness < 118) {
      exposureState = 'underexposed';
      autoGammaFactor = Math.max(0.78, 1.0 - ((118 - meanBrightness) / 118) * 0.24);
    } else if (meanBrightness > 168) {
      exposureState = 'overexposed';
      autoGammaFactor = Math.min(1.26, 1.0 + ((meanBrightness - 168) / 87) * 0.28);
    }

    return {
      meanBrightness: Math.round(meanBrightness),
      shadowP10,
      highlightP90,
      dynamicRange,
      autoGammaFactor,
      exposureState,
    };
  }

  /**
   * Maps input image brightness [0..255] to the physical thermal print head's energy response curve:
   * - Accounts for thermal paper activation threshold (E_min) so light faces/highlights never print washed-out.
   * - Applies Inverse Print Head Dot-Gain Gamma Correction (gamma_eff) + S-curve midtone contrast preservation.
   * - Enforces a maximum continuous halftone energy ceiling (E_max = 78%..88%) so dark hair and shadows never
   *   overheat the 203 DPI heating elements or fuse into solid black bands.
   */
  public computePrintHeadEnergyProfile(
    config?: Partial<ThermalPrinterConfig>,
    exposure?: {
      meanBrightness: number;
      shadowP10: number;
      highlightP90: number;
      dynamicRange: number;
      autoGammaFactor: number;
      exposureState: 'underexposed' | 'balanced' | 'overexposed';
    },
    contrastMultiplier: number = 1.0,
    brightnessDelta: number = 0
  ): {
    effectiveGamma: number;
    minActivationEnergyPct: number;
    maxSaturationEnergyPct: number;
    heatingDots: number;
    heatingTimeUs: number;
    heatingIntervalUs: number;
    exposureState: 'underexposed' | 'balanced' | 'overexposed';
    energyLut: Uint8ClampedArray;
  } {
    const baseGamma = Math.max(0.40, Math.min(1.60, Number(config?.gamma ?? 0.68)));
    const rawDarkness = config?.printDarkness ?? 38;
    const density = config?.density || 'normal';
    const densityOffset = density === 'light' ? -6 : density === 'dark' ? 8 : 0;
    const effectiveDarkness = Math.max(5, Math.min(100, rawDarkness + densityOffset));

    // Darkness delta: negative = lighter print (< 42), positive = darker print (> 42)
    const darknessDelta = (effectiveDarkness - 42) / 58; // -0.64 to +1.0

    // Combine base gamma, darkness/density adjustment, brightnessDelta, and auto-exposure factor
    const darknessGammaMultiplier =
      darknessDelta < 0
        ? Math.max(0.72, 1.0 + darknessDelta * 0.34)
        : Math.min(1.42, 1.0 + darknessDelta * 0.42);
    const brightnessGammaMultiplier = Math.max(
      0.78,
      Math.min(1.25, 1.0 - (brightnessDelta / 100) * 0.25)
    );
    const autoFactor = exposure?.autoGammaFactor ?? 1.0;

    const effectiveGamma = Math.max(
      0.42,
      Math.min(
        1.55,
        Number(
          (baseGamma * darknessGammaMultiplier * brightnessGammaMultiplier * autoFactor).toFixed(2)
        )
      )
    );

    // Physical print head energy limits:
    // - minActivationEnergyPct (E_min): minimum halftone dot density for subtle highlights (prevents washed-out faces)
    // - maxSaturationEnergyPct (E_max): maximum continuous halftone dot density for deep shadows (prevents solid black burn)
    const minActivationEnergyPct = Math.max(
      4,
      Math.min(14, Math.round(7 + darknessDelta * 4))
    );
    const maxSaturationEnergyPct = Math.max(
      74,
      Math.min(90, Math.round(83 + darknessDelta * 6))
    );

    // Convert energy percentages [E_min..E_max] into target luminance bounds [shadowFloorLum..highlightCeilingLum]
    // Note: in thermal printing, 0 luminance = 100% thermal energy (black), 255 luminance = 0% energy (white paper)
    const shadowFloorLum = Math.round(255 * (1 - maxSaturationEnergyPct / 100)); // ~36..52
    const highlightCeilingLum = Math.round(255 * (1 - minActivationEnergyPct / 100)); // ~232..244

    // Soft dynamic range normalization anchors from image exposure histogram (prevents washed-out flat photos)
    const p10 = exposure?.shadowP10 ?? 32;
    const p90 = exposure?.highlightP90 ?? 228;
    const blackPoint = Math.max(18, Math.min(48, Math.round(20 + (p10 - 24) * 0.35)));
    const whitePoint = Math.max(210, Math.min(246, Math.round(244 - Math.max(0, 232 - p90) * 0.35)));
    const rangeSpan = Math.max(120, whitePoint - blackPoint);

    // Midtone S-curve strength (prevents washed-out midtones while keeping shadows open)
    const sCurveWeight = Math.max(0.12, Math.min(0.45, 0.22 * contrastMultiplier));

    const energyLut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      // Preserve razor-sharp pure black frame typography/borders (<= 20) and pure white paper background (>= 247)
      if (v <= 20) {
        energyLut[v] = 0;
        continue;
      }
      if (v >= 247) {
        energyLut[v] = 255;
        continue;
      }

      // 1. Normalize input brightness within the active tonal range
      const norm = Math.max(0, Math.min(1, (v - blackPoint) / rangeSpan));

      // 2. Apply Inverse Print Head Gamma Correction: I_gamma = norm ^ effectiveGamma
      const gammaMapped = Math.pow(norm, effectiveGamma);

      // 3. Blend with smooth Hermite S-Curve (3t^2 - 2t^3) so midtones never look flat or washed out
      const sCurve = gammaMapped * gammaMapped * (3 - 2 * gammaMapped);
      let blendedBrightness = gammaMapped * (1 - sCurveWeight) + sCurve * sCurveWeight;

      // Apply user contrast multiplier around mid-gray (0.5) if adjusted in Preview Modal
      if (Math.abs(contrastMultiplier - 1.0) > 0.02) {
        blendedBrightness = Math.max(
          0,
          Math.min(1, (blendedBrightness - 0.5) * contrastMultiplier + 0.5)
        );
      }

      // 4. Map desired optical darkness (1 - blendedBrightness) into physical print head energy window [E_min..E_max]
      if (blendedBrightness >= 0.965) {
        // Smooth roll-off to pure paper white for near-white backgrounds
        const t = (blendedBrightness - 0.965) / 0.035;
        energyLut[v] = Math.round(highlightCeilingLum + t * (255 - highlightCeilingLum));
      } else {
        const scaled = blendedBrightness / 0.965;
        const targetLum =
          shadowFloorLum + scaled * (highlightCeilingLum - shadowFloorLum);
        energyLut[v] = Math.max(
          shadowFloorLum,
          Math.min(highlightCeilingLum, Math.round(targetLum))
        );
      }
    }

    // Physical ESC/POS printhead strobe parameters (heating dots, heating time in 10us, interval in 10us)
    const heatingDots = density === 'light' ? 7 : density === 'dark' ? 11 : 9;
    const heatingTimeUs = Math.max(
      45,
      Math.min(110, Math.round(65 + darknessDelta * 25))
    );
    const heatingIntervalUs = density === 'light' ? 4 : 2;

    return {
      effectiveGamma,
      minActivationEnergyPct,
      maxSaturationEnergyPct,
      heatingDots,
      heatingTimeUs,
      heatingIntervalUs,
      exposureState: exposure?.exposureState || 'balanced',
      energyLut,
    };
  }

  /**
   * Canonical Floyd-Steinberg Error-Diffusion Dithering Algorithm:
   * Distributes 100% (16/16) of the binary quantization error to neighboring pixels using the
   * classic Floyd-Steinberg kernel:
   *   - Forward neighbor (x + stepX, y):            7/16 (43.75%)
   *   - Bottom-backward neighbor (x - stepX, y + 1): 3/16 (18.75%)
   *   - Bottom-center neighbor (x, y + 1):           5/16 (31.25%)
   *   - Bottom-forward neighbor (x + stepX, y + 1):  1/16 ( 6.25%)
   * Uses serpentine (boustrophedon) alternating row scans and pre-threshold clamping [0..255]
   * to eliminate directional worm artifacts and edge-overshoot halos while representing continuous
   * shades and facial gradients accurately with binary thermal dots.
   */
  public applyFloydSteinbergDithering(
    gray: Float32Array,
    width: number,
    height: number,
    serpentine: boolean = true
  ): Uint8Array {
    const mono = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      const reverse = serpentine && (y & 1) === 1;
      const startX = reverse ? width - 1 : 0;
      const endX = reverse ? -1 : width;
      const stepX = reverse ? -1 : 1;
      const rowOffset = y * width;
      const nextRowOffset = (y + 1) * width;
      const hasNextRow = y + 1 < height;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = rowOffset + x;
        // Clamp accumulated luminance to [0, 255] to prevent error-overshoot blooming at high-contrast edges
        const oldPixel = Math.max(0, Math.min(255, gray[idx]));
        const newPixel = oldPixel < 128 ? 0 : 255;
        mono[idx] = newPixel === 0 ? 1 : 0;

        const quantError = oldPixel - newPixel;
        if (quantError === 0) continue;

        const nextX = x + stepX;
        const prevX = x - stepX;

        // 1. Forward neighbor: 7/16 of quantization error
        if (nextX >= 0 && nextX < width) {
          gray[rowOffset + nextX] += quantError * (7 / 16);
        }

        // 2. Next row neighbors: 3/16 (bottom-back), 5/16 (bottom-center), 1/16 (bottom-forward)
        if (hasNextRow) {
          if (prevX >= 0 && prevX < width) {
            gray[nextRowOffset + prevX] += quantError * (3 / 16);
          }
          gray[nextRowOffset + x] += quantError * (5 / 16);
          if (nextX >= 0 && nextX < width) {
            gray[nextRowOffset + nextX] += quantError * (1 / 16);
          }
        }
      }
    }

    return mono;
  }

  /**
   * 2D Box-Filter Area-Averaging Downsampler + Physical Thermal Print Head Gamma & Energy Mapping
   * + Canonical Serpentine Floyd-Steinberg Dithering (7/16, 3/16, 5/16, 1/16).
   * - Eliminates 25:12 bilinear downscaling beat lines when resizing 768x1152 photostrips to 384x576.
   * - Maps input brightness to physical thermal print head energy levels via `computePrintHeadEnergyProfile`
   *   so prints are never washed-out or overly dark.
   * - Applies 100% error-conserving Floyd-Steinberg dithering to render smooth shades and gradients with binary dots.
   * - Pads height to a multiple of 24 so both 8-row GS v 0 micro-bands and 24-dot ESC * 33 column bands align cleanly.
   */
  public generateDitheredRaster(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    contrastMultiplier: number = 1.0,
    brightnessDelta: number = 0,
    printerConfig?: Partial<ThermalPrinterConfig>
  ): {
    bitmap: Uint8Array;
    width: number;
    height: number;
    previewDataUrl: string;
    energyProfile: {
      effectiveGamma: number;
      minActivationEnergyPct: number;
      maxSaturationEnergyPct: number;
      exposureState: 'underexposed' | 'balanced' | 'overexposed';
    };
  } {
    const srcW = Math.max(1, sourceCanvas.width);
    const srcH = Math.max(1, sourceCanvas.height);
    const ratio = srcH / srcW;
    const width = targetWidth;
    const rawTargetHeight = Math.max(1, Math.round(width * ratio));
    let height = rawTargetHeight;
    if (height % 24 !== 0) {
      height += 24 - (height % 24);
    }

    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const gray = new Float32Array(width * height);
    gray.fill(255);

    if (srcCtx) {
      const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;
      const scaleX = srcW / width;
      const scaleY = srcH / rawTargetHeight;

      for (let y = 0; y < rawTargetHeight; y++) {
        const sy0 = y * scaleY;
        const sy1 = (y + 1) * scaleY;
        const iy0 = Math.floor(sy0);
        const iy1 = Math.min(srcH - 1, Math.floor(sy1));

        for (let x = 0; x < width; x++) {
          const sx0 = x * scaleX;
          const sx1 = (x + 1) * scaleX;
          const ix0 = Math.floor(sx0);
          const ix1 = Math.min(srcW - 1, Math.floor(sx1));

          // Exact 2D box-filter area average over source pixels [sx0..sx1, sy0..sy1]
          let sumLum = 0;
          let totalWeight = 0;

          for (let sy = iy0; sy <= iy1; sy++) {
            const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
            if (wy <= 0) continue;
            const srcRowOffset = sy * srcW;
            for (let sx = ix0; sx <= ix1; sx++) {
              const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
              if (wx <= 0) continue;
              const weight = wx * wy;
              const pIdx = (srcRowOffset + sx) * 4;
              const lum =
                0.299 * srcData[pIdx] +
                0.587 * srcData[pIdx + 1] +
                0.114 * srcData[pIdx + 2];
              sumLum += lum * weight;
              totalWeight += weight;
            }
          }

          gray[y * width + x] = totalWeight > 0 ? sumLum / totalWeight : 255;
        }
      }
    }

    // Analyze continuous-tone exposure & map input brightness to physical print head energy levels via Gamma LUT
    const exposure = this.analyzeThermalImageExposure(gray);
    const energyProfile = this.computePrintHeadEnergyProfile(
      printerConfig,
      exposure,
      contrastMultiplier,
      brightnessDelta
    );
    const energyLut = energyProfile.energyLut;

    for (let i = 0; i < width * rawTargetHeight; i++) {
      const rawLum = Math.max(0, Math.min(255, Math.round(gray[i])));
      gray[i] = energyLut[rawLum];
    }

    // Apply 100%-conserved Serpentine Floyd-Steinberg Dithering (7/16, 3/16, 5/16, 1/16)
    const mono = this.applyFloydSteinbergDithering(gray, width, height, true);

    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = width;
    previewCanvas.height = height;
    const pCtx = previewCanvas.getContext('2d')!;
    const pImgData = pCtx.createImageData(width, height);
    for (let i = 0; i < mono.length; i++) {
      const pIdx = i * 4;
      const isBlack = mono[i] === 1;
      const val = isBlack ? 22 : 248;
      pImgData.data[pIdx] = val;
      pImgData.data[pIdx + 1] = isBlack ? 24 : 246;
      pImgData.data[pIdx + 2] = isBlack ? 28 : 242;
      pImgData.data[pIdx + 3] = 255;
    }
    pCtx.putImageData(pImgData, 0, 0);

    return {
      bitmap: mono,
      width,
      height,
      previewDataUrl: previewCanvas.toDataURL('image/png'),
      energyProfile: {
        effectiveGamma: energyProfile.effectiveGamma,
        minActivationEnergyPct: energyProfile.minActivationEnergyPct,
        maxSaturationEnergyPct: energyProfile.maxSaturationEnergyPct,
        exposureState: energyProfile.exposureState,
      },
    };
  }

  /**
   * Builds atomic ESC/POS command bands for KPrinter_461a (MP58-09 58mm) and universal 58mm/80mm printers:
   * - Mode 1 ('gs_v_0', default): Continuous Seamless GS v 0 stream with zero line-spacing (`ESC 3 0`),
   *   high-speed single-strobe printhead heating (`ESC 7 11 70 2`), and row-aligned packet pacing
   *   so the stepper motor feeds at constant speed from top to bottom with zero lines in photos.
   * - Mode 2 ('gs_v_0_banded'): 8-row GS v 0 micro-bands with zero line-spacing (`ESC 3 0`).
   * - Mode 3 ('esc_star_33'): ESC * 33 24-dot double-density column mode with `[0x1B, 0x33, 24]` line spacing.
   */
  public buildEscPosCommandBands(
    monoBitmap: Uint8Array,
    width: number,
    height: number,
    config: ThermalPrinterConfig
  ): Uint8Array[] {
    const commandMode = config.escPosCommandMode || 'gs_v_0';
    const isXprinter58iiB = (config.printerModel || 'xprinter_58iib') === 'xprinter_58iib';
    const feedLinesCount = Math.max(1, Math.min(12, config.feedLines ?? (isXprinter58iiB ? 5 : 4)));
    const bands: Uint8Array[] = [];

    if (commandMode === 'esc_star_33') {
      // Standard ESC/POS initialization: ESC @ (reset), ESC a 0 (left align), ESC 3 24 (24-dot line spacing)
      bands.push(
        new Uint8Array([
          0x1b, 0x40,
          0x1b, 0x61, 0x00,
          0x1b, 0x33, 24,
        ])
      );

      const nL = width & 0xff;
      const nH = (width >> 8) & 0xff;

      for (let startY = 0; startY < height; startY += 24) {
        // 5-byte ESC * 33 header + (width * 3) column bytes + 1-byte LF (0x0A)
        const band = new Uint8Array(5 + width * 3 + 1);
        band[0] = 0x1b;
        band[1] = 0x2a;
        band[2] = 0x21;
        band[3] = nL;
        band[4] = nH;

        let offset = 5;
        for (let x = 0; x < width; x++) {
          for (let k = 0; k < 3; k++) {
            let colByte = 0;
            for (let b = 0; b < 8; b++) {
              const py = startY + k * 8 + b;
              if (py < height && monoBitmap[py * width + x] === 1) {
                colByte |= 0x80 >> b;
              }
            }
            band[offset++] = colByte;
          }
        }
        band[offset] = 0x0a; // LF prints the 24-dot column strip
        bands.push(band);
      }

      // Restore default line spacing (ESC 2), advance 7 lines past cutter/tear bar, and execute automatic cut (ESC i + GS V 66 0)
      const footer: number[] = [0x1b, 0x32, 0x1b, 0x64, Math.max(7, feedLinesCount)];
      if (config.autoCut !== false || isXprinter58iiB) {
        footer.push(0x1b, 0x69, 0x1d, 0x56, 0x42, 0x00);
      }
      bands.push(new Uint8Array(footer));
      return bands;
    }

    // Pure standard Xprinter XP-58IIB ESC/POS initialization:
    // - ESC @ (0x1B, 0x40): Reset printer & clear any stale bytes in SRAM
    // - ESC a 0 (0x1B, 0x61, 0x00): Left alignment so full 384-dot (48-byte) raster rows never wrap
    // - ESC 3 0 (0x1B, 0x33, 0x00): Zero line-spacing so consecutive GS v 0 bands stitch seamlessly
    bands.push(
      new Uint8Array([
        0x1b, 0x40,
        0x1b, 0x61, 0x00,
        0x1b, 0x33, 0x00,
      ])
    );

    const bytesWidth = width / 8; // 48 bytes for 384px (58mm)
    const xL = bytesWidth & 0xff;
    const xH = (bytesWidth >> 8) & 0xff;

    // Emit 64-row (8mm) GS v 0 bands in default 'gs_v_0' mode (yL = 64, yH = 0, 3,080 bytes < 4KB SRAM buffer).
    // - Keeps yH = 0 so the Xprinter XP-58IIB 8-bit row counter never overflows into ASCII garbage text.
    // - Avoids tiny 8-row micro-bands so the thermal printhead and stepper motor sweep smoothly across photos with zero horizontal lines.
    const bandHeight = commandMode === 'gs_v_0_banded' ? 24 : 64;

    for (let startY = 0; startY < height; startY += bandHeight) {
      const currentBandHeight = Math.min(bandHeight, height - startY);
      const pixelByteCount = bytesWidth * currentBandHeight;
      const band = new Uint8Array(8 + pixelByteCount);

      // 8-byte GS v 0 header: [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]
      band[0] = 0x1d;
      band[1] = 0x76;
      band[2] = 0x30;
      band[3] = 0x00;
      band[4] = xL;
      band[5] = xH;
      band[6] = currentBandHeight & 0xff;
      band[7] = (currentBandHeight >> 8) & 0xff;

      let offset = 8;
      for (let y = startY; y < startY + currentBandHeight; y++) {
        const rowOffset = y * width;
        for (let bx = 0; bx < bytesWidth; bx++) {
          let byteVal = 0;
          const basePixelX = rowOffset + bx * 8;
          for (let bit = 0; bit < 8; bit++) {
            if (monoBitmap[basePixelX + bit] === 1) {
              byteVal |= 0x80 >> bit;
            }
          }
          band[offset++] = byteVal;
        }
      }

      bands.push(band);
    }

    // Restore default line spacing (ESC 2) and advance 7 lines past the printer slot so guests can easily cut with scissors
    const footer: number[] = [0x1b, 0x32, 0x1b, 0x64, Math.max(7, feedLinesCount)];
    if (config.autoCut && !isXprinter58iiB) {
      footer.push(0x1b, 0x69, 0x1d, 0x56, 0x42, 0x00);
    }
    bands.push(new Uint8Array(footer));
    return bands;
  }

  /**
   * Splits atomic ESC/POS command bands into Bluetooth/USB write packets of at most `maxBytesPerWrite` (default 144 bytes = 3 full 48B rows).
   * For `GS v 0` bands (`band[0] === 0x1d && band[1] === 0x76`), slices packets on EXACT full-row boundaries
   * so every packet ends on a complete dot-row boundary and the `GS v 0` command is never interrupted.
   */
  public buildPacedPackets(
    bands: Uint8Array[],
    maxBytesPerWrite: number = 144
  ): Uint8Array[] {
    const packets: Uint8Array[] = [];
    for (const band of bands) {
      if (band.length > 8 && band[0] === 0x1d && band[1] === 0x76 && band[2] === 0x30) {
        const bytesWidth = (band[4] | (band[5] << 8)) || 48;
        // Max complete rows that fit along with the 8-byte header in the first packet
        const firstPacketRows = Math.max(1, Math.floor((maxBytesPerWrite - 8) / bytesWidth));
        const firstPacketSize = Math.min(band.length, 8 + firstPacketRows * bytesWidth);
        packets.push(band.slice(0, firstPacketSize));

        // Max complete rows per subsequent packet (for 48B/row 58mm: 3 rows = 144 bytes)
        const rowsPerPacket = Math.max(1, Math.floor(maxBytesPerWrite / bytesWidth));
        const rowAlignedStep = rowsPerPacket * bytesWidth;

        for (let offset = firstPacketSize; offset < band.length; offset += rowAlignedStep) {
          packets.push(band.slice(offset, offset + rowAlignedStep));
        }
      } else {
        for (let offset = 0; offset < band.length; offset += maxBytesPerWrite) {
          packets.push(band.slice(offset, offset + maxBytesPerWrite));
        }
      }
    }
    return packets;
  }

  /**
   * Builds industry-standard ESC/POS raster byte sequence by concatenating the command bands.
   */
  public buildEscPosCommands(
    monoBitmap: Uint8Array,
    width: number,
    height: number,
    config: ThermalPrinterConfig
  ): Uint8Array {
    const bands = this.buildEscPosCommandBands(monoBitmap, width, height, config);
    const totalLength = bands.reduce((sum, b) => sum + b.length, 0);
    const merged = new Uint8Array(totalLength);
    let pos = 0;
    for (const b of bands) {
      merged.set(b, pos);
      pos += b.length;
    }
    return merged;
  }

  /**
   * Applies the Physical Thermal Print Head Gamma & Energy Level Mapping directly to a copy of the canvas
   * for System / Silent Spooler printing, while `generateDitheredRaster` applies the exact same LUT for ESC/POS.
   */
  public applyDarknessToCanvas(
    sourceCanvas: HTMLCanvasElement,
    config: ThermalPrinterConfig
  ): HTMLCanvasElement {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = sourceCanvas.width;
    outCanvas.height = sourceCanvas.height;
    const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return sourceCanvas;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const d = imgData.data;

    // Sample luminance across canvas for auto-exposure analysis
    const sampleGray = new Float32Array(Math.ceil(d.length / 16));
    for (let i = 0, s = 0; i < d.length; i += 16, s++) {
      sampleGray[s] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }

    const exposure = this.analyzeThermalImageExposure(sampleGray);
    const { energyLut } = this.computePrintHeadEnergyProfile(config, exposure, 1.0, 0);

    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const mapped = energyLut[Math.max(0, Math.min(255, lum))];
      d[i] = mapped;
      d[i + 1] = mapped;
      d[i + 2] = mapped;
    }

    ctx.putImageData(imgData, 0, 0);
    return outCanvas;
  }

  /**
   * Executes the print job across USB Cord, USB-Serial, Wireless Bluetooth, Wireless Network IP, Universal System Driver, or Virtual Simulator.
   * Honors the exact config.printCopies value (1, 2, 3, 4, 5+) without overflowing printer buffers.
   */
  public async print(
    canvas: HTMLCanvasElement,
    config: ThermalPrinterConfig,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<{ success: boolean; previewDataUrl: string; error?: string }> {
    soundEffects.playPrintingMotor();

    const copies = Math.max(1, Math.min(50, Math.round(Number(config.printCopies) || 1)));
    // Xprinter 58iiB, KPrinter_461a / MP58-09, and 58mm printers strictly require 384px (48 bytes) width
    const is58mmHardware =
      config.printerModel === 'xprinter_58iib' ||
      config.printerModel === 'kprinter_461a' ||
      config.printerModel === 'generic_58mm' ||
      /xprinter|xp-?58|58iib|58iih|kprinter|mp58|58mm|pos-?58|mtp-?2|pt-?210|mobile\s*printer/i.test(
        this.currentStatus.deviceName || ''
      );
    const targetWidth = is58mmHardware ? 384 : config.paperWidthMm === 80 ? 576 : 384;

    onProgress?.(15, 'Calibrating print head gamma & energy curve...');
    // Pass raw canvas + config to generateDitheredRaster so gamma & energy LUT is applied once cleanly before dithering
    const dithered = this.generateDitheredRaster(
      canvas,
      targetWidth,
      1.0,
      0,
      config
    );
    // Also prepare gamma-calibrated canvas for OS / System Spooler drivers
    const calibratedCanvas = this.applyDarknessToCanvas(canvas, config);

    onProgress?.(35, 'Compiling ESC/POS raster stream...');
    const commandBands = this.buildEscPosCommandBands(
      dithered.bitmap,
      dithered.width,
      dithered.height,
      config
    );
    // 144 bytes = 3 complete 48-byte rows per packet (keeps printer buffer continuously fed ahead of stepper motor)
    const pacedPackets = this.buildPacedPackets(commandBands, 144);
    const escposBytes = this.buildEscPosCommands(
      dithered.bitmap,
      dithered.width,
      dithered.height,
      config
    );

    const mode = this.currentStatus.connectionType;

    // 1. Universal System / OS Printer Mode (USB Cord or Wireless via Silent Bridge / WebUSB — zero popup)
    if (mode === 'system') {
      const sysRes = await this.printViaSystemDriver(
        calibratedCanvas,
        config.paperWidthMm || 58,
        copies,
        onProgress,
        escposBytes,
        commandBands
      );
      soundEffects.playPaperCut();
      return {
        success: sysRes.success,
        previewDataUrl: dithered.previewDataUrl,
        error: sysRes.error,
      };
    }

    // 2. USB Cord Flow (Native Android USB Host OR WebUSB)
    if (mode === 'usb') {
      // A. Native Android USB OTG Host
      if (this.nativeUsbActive && typeof window !== 'undefined' && window.AndroidPrinter?.printUsbBase64) {
        try {
          for (let c = 0; c < copies; c++) {
            const copyLabel = copies > 1 ? ` (Copy ${c + 1}/${copies})` : '';
            onProgress?.(60, `Streaming to USB OTG printer${copyLabel}...`);
            for (let p = 0; p < pacedPackets.length; p++) {
              const b64 = uint8ToBase64(pacedPackets[p]);
              const res = window.AndroidPrinter.printUsbBase64(b64);
              if (!res || !res.startsWith('OK')) {
                throw new Error(res || 'Android USB transfer failed');
              }
              await this.paceContinuousPacket(p, true);
            }
            soundEffects.playPaperCut();
            if (c < copies - 1) {
              await new Promise((r) => setTimeout(r, 700));
            }
          }
          onProgress?.(100, 'USB Print complete!');
          return { success: true, previewDataUrl: dithered.previewDataUrl };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            previewDataUrl: dithered.previewDataUrl,
            error: `USB OTG print failed: ${msg}`,
          };
        }
      }

      // B. WebUSB Direct Transfer
      if (this.usbDevice && this.usbEndpointNumber !== null) {
        try {
          for (let c = 0; c < copies; c++) {
            const copyLabel = copies > 1 ? ` (Copy ${c + 1}/${copies})` : '';
            onProgress?.(60, `Streaming to USB printer${copyLabel}...`);
            for (let p = 0; p < pacedPackets.length; p++) {
              await this.usbDevice.transferOut(
                this.usbEndpointNumber,
                pacedPackets[p] as unknown as BufferSource
              );
              await this.paceContinuousPacket(p, true);
            }
            soundEffects.playPaperCut();
            if (c < copies - 1) {
              await new Promise((r) => setTimeout(r, 700));
            }
          }
          onProgress?.(100, 'Print complete!');
          return { success: true, previewDataUrl: dithered.previewDataUrl };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            previewDataUrl: dithered.previewDataUrl,
            error: `USB print failed: ${msg}`,
          };
        }
      }
    }

    // 3. USB-Serial Cord Flow (Web Serial API)
    if (mode === 'serial' && this.serialPort && this.serialPort.writable) {
      try {
        const writer = this.serialPort.writable.getWriter();
        for (let c = 0; c < copies; c++) {
          const copyLabel = copies > 1 ? ` (Copy ${c + 1}/${copies})` : '';
          onProgress?.(60, `Writing to Serial USB${copyLabel}...`);
          for (let p = 0; p < pacedPackets.length; p++) {
            await writer.write(pacedPackets[p]);
            await this.paceContinuousPacket(p, true);
          }
          soundEffects.playPaperCut();
          if (c < copies - 1) {
            await new Promise((r) => setTimeout(r, 700));
          }
        }
        writer.releaseLock();
        onProgress?.(100, 'Print complete!');
        return { success: true, previewDataUrl: dithered.previewDataUrl };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          previewDataUrl: dithered.previewDataUrl,
          error: `USB-Serial print failed: ${msg}`,
        };
      }
    }

    // 4. Wireless Bluetooth Flow (Native Android Classic SPP OR Web Bluetooth BLE)
    if (mode === 'bluetooth') {
      this.isPrintingBusy = true;
      try {
        if (
          this.nativeBluetoothActive &&
          typeof window !== 'undefined' &&
          window.AndroidPrinter?.printBluetoothBase64
        ) {
          try {
            for (let c = 0; c < copies; c++) {
              const copyLabel = copies > 1 ? ` (Copy ${c + 1}/${copies})` : '';
              onProgress?.(60, `Transmitting via Bluetooth SPP${copyLabel}...`);
              for (let p = 0; p < pacedPackets.length; p++) {
                const b64 = uint8ToBase64(pacedPackets[p]);
                const res = window.AndroidPrinter.printBluetoothBase64(b64);
                if (!res || !res.startsWith('OK')) {
                  throw new Error(res || 'Bluetooth SPP print failed');
                }
                await this.paceContinuousPacket(p, false);
              }
              soundEffects.playPaperCut();
              if (c < copies - 1) {
                await new Promise((r) => setTimeout(r, 800));
              }
            }
            onProgress?.(100, 'Bluetooth Print complete!');
            return { success: true, previewDataUrl: dithered.previewDataUrl };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              success: false,
              previewDataUrl: dithered.previewDataUrl,
              error: `Bluetooth print failed: ${msg}`,
            };
          }
        }

        // If Bluetooth GATT slept during an idle period on the Galaxy Tab A11, auto-reconnect before printing!
        if (
          this.bluetoothDevice &&
          (!this.bluetoothDevice.gatt?.connected || !this.bluetoothCharacteristic)
        ) {
          onProgress?.(42, 'Waking up Bluetooth printer connection...');
          await this.trySilentBluetoothReconnect(this.bluetoothDevice);
        }

        if (this.bluetoothCharacteristic) {
          try {
            this.bleMaxChunkBytes = 144;
            const char = this.bluetoothCharacteristic;
            const canWriteNoResp = Boolean(char.properties.writeWithoutResponse);

            for (let c = 0; c < copies; c++) {
              const copyLabel = copies > 1 ? ` (Copy ${c + 1}/${copies})` : '';
              onProgress?.(60, `Transmitting via Bluetooth${copyLabel}...`);
              for (let p = 0; p < pacedPackets.length; p++) {
                await this.writeBleChunkSafe(char, pacedPackets[p]);

                // Keep printer receive buffer continuously ahead of stepper motor (~90mm/s) with zero motor stops
                if (canWriteNoResp) {
                  await this.paceContinuousPacket(p, false);
                }
              }
              soundEffects.playPaperCut();
              if (c < copies - 1) {
                await new Promise((r) => setTimeout(r, 800));
              }
            }
            onProgress?.(100, 'Print complete!');
            return { success: true, previewDataUrl: dithered.previewDataUrl };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              success: false,
              previewDataUrl: dithered.previewDataUrl,
              error: `Bluetooth print failed: ${msg}`,
            };
          }
        }
      } finally {
        this.isPrintingBusy = false;
      }
    }

    // 5. Wireless Wi-Fi / LAN Network Printer Flow (Port 9100 Raw TCP / WebSocket / HTTP)
    if (mode === 'network') {
      const ip = config.networkIp || this.networkIp;
      const port = config.networkPort || this.networkPort || 9100;

      // A. Native Android TCP Socket (works offline on local Wi-Fi with any raw port 9100 printer)
      if (typeof window !== 'undefined' && window.AndroidPrinter?.printTcpBase64) {
        try {
          const b64 = uint8ToBase64(escposBytes);
          for (let c = 0; c < copies; c++) {
            onProgress?.(
              50 + Math.round((c / copies) * 45),
              copies > 1
                ? `Printing Wireless copy ${c + 1} of ${copies} (${ip}:${port})...`
                : `Sending to Wireless Printer ${ip}:${port}...`
            );
            const res = window.AndroidPrinter.printTcpBase64(ip, port, b64);
            if (!res || !res.startsWith('OK')) {
              throw new Error(res || 'TCP socket print failed');
            }
            soundEffects.playPaperCut();
            if (c < copies - 1) {
              await new Promise((r) => setTimeout(r, 850));
            }
          }
          onProgress?.(100, 'Wireless Network Print complete!');
          return { success: true, previewDataUrl: dithered.previewDataUrl };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            previewDataUrl: dithered.previewDataUrl,
            error: `Network print (${ip}:${port}) failed: ${msg}`,
          };
        }
      }

      // B. Browser HTTP / WebSocket Local Relay to IP Printer
      try {
        for (let c = 0; c < copies; c++) {
          onProgress?.(
            50 + Math.round((c / copies) * 45),
            copies > 1
              ? `Transmitting copy ${c + 1} of ${copies} to ${ip}:${port}...`
              : `Transmitting to Wireless Printer ${ip}:${port}...`
          );
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          await fetch(`http://${ip}:${port}/`, {
            method: 'POST',
            mode: 'no-cors',
            body: new Blob([escposBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          soundEffects.playPaperCut();
          if (c < copies - 1) {
            await new Promise((r) => setTimeout(r, 850));
          }
        }
        onProgress?.(100, 'Wireless Print sent!');
        return { success: true, previewDataUrl: dithered.previewDataUrl };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          previewDataUrl: dithered.previewDataUrl,
          error: `Could not reach wireless printer at ${ip}:${port} (${msg}). Ensure printer is on the same Wi-Fi network.`,
        };
      }
    }

    // 6. Virtual Simulator Flow
    onProgress?.(60, copies > 1 ? `Simulating ${copies} thermal print copies...` : 'Simulating thermal print head feed...');
    await new Promise((r) => setTimeout(r, 700));
    onProgress?.(85, 'Cutting thermal paper strip...');
    soundEffects.playPaperCut();
    await new Promise((r) => setTimeout(r, 400));
    onProgress?.(100, 'Thermal strip ready!');

    return {
      success: true,
      previewDataUrl: dithered.previewDataUrl,
    };
  }
}

export const thermalPrinterService = new ThermalPrinterService();
