/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RemoteKioskConfig } from '../types';
import { storageService } from './storage';

export const DEFAULT_CONFIG: RemoteKioskConfig = {
  kioskId: 'JCVcreatives-01',
  locationName: 'JCVcreatives Studio',
  eventTitle: 'JCVcreatives Photobooth',
  eventSubtitle: 'Archival Portrait & Thermal Print',
  eventDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  eventHashtag: '#JCVcreatives',
  pricePerSession: 150.0,
  layoutPrices: {
    single_polaroid: 20,
    grid_4: 25,
    strip_3: 30,
    strip_4: 40,
  },
  currencySymbol: '₱',
  freePlayMode: false,
  passcodeAdminPin: 'jan27',
  showAdminInMenu: false,
  autoFullscreenLock: true,
  allowedLayouts: ['strip_3', 'grid_4', 'single_polaroid', 'strip_4'],
  thermalPrinter: {
    connectionType: 'virtual',
    printerModel: 'xprinter_58iib',
    paperWidthMm: 58,
    dotsPerLine: 384,
    contrast: 40,
    brightness: 45,
    printDarkness: 38,
    autoCut: true,
    printCopies: 1,
    feedLines: 6,
    density: 'normal',
    escPosCommandMode: 'gs_v_0',
  },
  tabletEndurance: {
    enabled: true,
    idleDimTimeoutSec: 180,
    idleDimOpacity: 45,
    bluetoothKeepAlive: true,
    cameraIdleEcoMode: true,
    abandonedSessionResetSec: 180,
  },
  frontScreenMedia: {
    enabled: false,
    mediaType: 'none',
    url: '',
    placement: 'center_hero',
    overlayOpacity: 50,
    loop: true,
    muted: true,
    badgeText: 'EVENT SPECIAL',
  },
  remoteSyncUrl: 'https://api.snapkiosk.io/v1/kiosks/KIOSK-TAB-01/config',
  autoUpdateEnabled: true,
  version: '2.9.0-kiosk',
  lastSyncTimestamp: Date.now(),
};

class RemoteConfigService {
  private config: RemoteKioskConfig = { ...DEFAULT_CONFIG };
  private initialized = false;

  public async init(): Promise<RemoteKioskConfig> {
    if (this.initialized) return this.config;

    const saved = await storageService.getConfig();
    if (saved) {
      this.config = { ...DEFAULT_CONFIG, ...saved };
      let needsSave = false;
      // Ensure currency is updated to Pesos if previously saved as $
      if (this.config.currencySymbol === '$') {
        this.config.currencySymbol = '₱';
        if (this.config.pricePerSession === 5.0) {
          this.config.pricePerSession = 150.0;
        }
        needsSave = true;
      }
      // Migrate legacy default PIN '1234' to 'jan27'
      if (!this.config.passcodeAdminPin || this.config.passcodeAdminPin === '1234') {
        this.config.passcodeAdminPin = 'jan27';
        needsSave = true;
      }
      if (this.config.showAdminInMenu === undefined) {
        this.config.showAdminInMenu = false;
        needsSave = true;
      }
      if (this.config.autoFullscreenLock === undefined) {
        this.config.autoFullscreenLock = true;
        needsSave = true;
      }
      if (!this.config.layoutPrices) {
        this.config.layoutPrices = {
          single_polaroid: 20,
          grid_4: 25,
          strip_3: 30,
          strip_4: 40,
        };
        needsSave = true;
      } else {
        this.config.layoutPrices = {
          single_polaroid: this.config.layoutPrices.single_polaroid ?? 20,
          grid_4: this.config.layoutPrices.grid_4 ?? 25,
          strip_3: this.config.layoutPrices.strip_3 ?? 30,
          strip_4: this.config.layoutPrices.strip_4 ?? 40,
        };
      }
      if (this.config.thermalPrinter && this.config.thermalPrinter.brightness === undefined) {
        this.config.thermalPrinter.brightness = 45;
        this.config.thermalPrinter.contrast = 40;
        needsSave = true;
      }
      if (this.config.thermalPrinter && this.config.thermalPrinter.printDarkness === undefined) {
        this.config.thermalPrinter.printDarkness = 38;
        this.config.thermalPrinter.density = 'normal';
        needsSave = true;
      }
      if (!this.config.tabletEndurance) {
        this.config.tabletEndurance = {
          enabled: true,
          idleDimTimeoutSec: 180,
          idleDimOpacity: 45,
          bluetoothKeepAlive: true,
          cameraIdleEcoMode: true,
          abandonedSessionResetSec: 180,
        };
        needsSave = true;
      }
      if (
        this.config.thermalPrinter &&
        (!this.config.thermalPrinter.printerModel || this.config.version !== '2.9.0-kiosk')
      ) {
        this.config.thermalPrinter.printerModel = 'xprinter_58iib';
        this.config.thermalPrinter.escPosCommandMode = 'gs_v_0';
        this.config.thermalPrinter.paperWidthMm = 58;
        this.config.thermalPrinter.dotsPerLine = 384;
        this.config.thermalPrinter.feedLines = 6;
        this.config.thermalPrinter.autoCut = true;
        this.config.version = '2.9.0-kiosk';
        needsSave = true;
      }
      if (needsSave) {
        await storageService.saveConfig(this.config);
      }
    } else {
      await storageService.saveConfig(this.config);
    }

    this.initialized = true;
    return this.config;
  }

  public getConfig(): RemoteKioskConfig {
    return this.config;
  }

  public async updateConfig(partial: Partial<RemoteKioskConfig>): Promise<RemoteKioskConfig> {
    this.config = { ...this.config, ...partial };
    await storageService.saveConfig(this.config);
    return this.config;
  }

  /**
   * Remote OTA update simulation & fetch
   */
  public async checkForRemoteUpdates(): Promise<{
    hasUpdate: boolean;
    updatedConfig?: RemoteKioskConfig;
    message: string;
  }> {
    // Simulate remote config query
    await new Promise((r) => setTimeout(r, 1200));

    // Simulated remote cloud server response with new event branding and latest version
    const newVersion = '2.5.0-kiosk';
    const hasUpdate = this.config.version !== newVersion;

    if (hasUpdate) {
      const updated: RemoteKioskConfig = {
        ...this.config,
        version: newVersion,
        lastSyncTimestamp: Date.now(),
      };
      await this.updateConfig(updated);
      return {
        hasUpdate: true,
        updatedConfig: updated,
        message: `Remote update downloaded! Upgraded to version ${newVersion}. Remote policies applied.`,
      };
    }

    this.config.lastSyncTimestamp = Date.now();
    await this.updateConfig(this.config);

    return {
      hasUpdate: false,
      message: 'Kiosk is currently running the latest remote configuration (v' + this.config.version + ').',
    };
  }
}

export const remoteConfigService = new RemoteConfigService();
