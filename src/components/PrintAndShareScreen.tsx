/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Printer,
  QrCode,
  Download,
  RotateCcw,
  X,
  Loader2,
  Ticket,
  Share2,
  WifiOff,
  ChevronDown,
  AlertTriangle,
  Lock,
  RefreshCw,
  CheckCircle2,
  Usb,
  Bluetooth,
  Wrench,
} from 'lucide-react';
import { PhotostripResult, ThermalPrinterConfig, RemoteKioskConfig } from '../types';
import {
  thermalPrinterService,
  PrinterDiagnosticReport,
  PrinterErrorCategory,
  PrinterDeviceStatus,
} from '../services/thermalPrinter';
import { analyticsService } from '../services/analytics';
import { paymentService, LAYOUT_VOUCHER_META } from '../services/payment';
import { soundEffects } from '../services/soundEffects';
import {
  OfflineQrPacket,
  buildOfflineQrPacket,
  getSavedHotspotOrigin,
  getSavedOfflineQrMode,
  shareOfflineViaQuickShare,
  startTabletHdPeerHost,
} from '../services/offlineQrTransfer';
import { launchFun60FpsConfetti } from '../services/funConfetti';
import { ThermalPrintPreviewModal } from './ThermalPrintPreviewModal';

interface PrintAndShareScreenProps {
  result: PhotostripResult;
  canvas: HTMLCanvasElement;
  config: RemoteKioskConfig;
  copies: number;
  onDone: () => void;
  onOpenMobileShareModal?: () => void;
  onSecretAdminTap?: () => void;
}

export const PrintAndShareScreen: React.FC<PrintAndShareScreenProps> = ({
  result,
  canvas,
  config,
  onDone,
  onSecretAdminTap,
}) => {
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setShowQrModal(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [showPrintAnotherCopyModal, setShowPrintAnotherCopyModal] = useState(false);
  const [anotherCopyVoucherCode, setAnotherCopyVoucherCode] = useState('');
  const [anotherCopyError, setAnotherCopyError] = useState('');
  const [anotherCopySuccess, setAnotherCopySuccess] = useState('');
  const [isRedeemingCopyVoucher, setIsRedeemingCopyVoucher] = useState(false);
  const [showAdminReprintModal, setShowAdminReprintModal] = useState(false);
  const [adminReprintPasscode, setAdminReprintPasscode] = useState('');
  const [adminReprintError, setAdminReprintError] = useState('');
  const [adminReprintCopies, setAdminReprintCopies] = useState<number>(1);
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement>(canvas);
  const [isPrinting, setIsPrinting] = useState(false);
  const [, setPrintedSuccessfully] = useState(false);
  const [printStatusText, setPrintStatusText] = useState<string>('');
  const [activeCopiesCount, setActiveCopiesCount] = useState<number>(1);
  const [qrShareDataUrl, setQrShareDataUrl] = useState<string>('');
  const [offlineQrPacket, setOfflineQrPacket] = useState<OfflineQrPacket | null>(null);
  const [quickShareStatus, setQuickShareStatus] = useState<string | null>(null);
  const [thermalPreviewUrl, setThermalPreviewUrl] = useState<string>(result.thermalRasterDataUrl || '');
  const [countdownSeconds, setCountdownSeconds] = useState(60);

  // Printer Error State & Diagnostic Modal
  const [livePrinterStatus, setLivePrinterStatus] = useState<PrinterDeviceStatus>(() =>
    thermalPrinterService.getStatus()
  );
  const [printerErrorReport, setPrinterErrorReport] = useState<PrinterDiagnosticReport | null>(null);
  const [showPrinterDiagnosticModal, setShowPrinterDiagnosticModal] = useState<boolean>(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<string>('');
  const [diagnosticReprintPin, setDiagnosticReprintPin] = useState<string>('');
  const [diagnosticPinError, setDiagnosticPinError] = useState<string>('');
  const [diagnosticGuideTab, setDiagnosticGuideTab] = useState<'auto' | 'paper_jam' | 'connection'>('auto');
  const [staffCallNotified, setStaffCallNotified] = useState<boolean>(false);
  const [paperLevelPercent, setPaperLevelPercent] = useState<number>(() =>
    analyticsService.getTelemetry().paperRemainingPercent ?? 100
  );

  const handleCallGobbleHausStaff = () => {
    soundEffects.playSuccessChime();
    setTimeout(() => {
      soundEffects.playCountdownBeep(true);
    }, 260);
    setStaffCallNotified(true);
    setCountdownSeconds(60);
    setDiagnosticFeedback(
      '👋 Gobble Haus crew chime sounded! Wave over any staff member at the counter — we gotchu bestie! ✨'
    );
  };

  // Dispenser animation
  const [feedAnimationKey, setFeedAnimationKey] = useState<number>(0);
  const [isFeeding, setIsFeeding] = useState<boolean>(true);
  const [showAutoPrintGuide, setShowAutoPrintGuide] = useState<boolean>(false);
  const [silentBridgeReady, setSilentBridgeReady] = useState<boolean>(() =>
    thermalPrinterService.isSilentBridgeActive()
  );
  const hasAutoPrintedRef = React.useRef<boolean>(false);

  const confettiCleanupRef = React.useRef<(() => void) | null>(null);

  const triggerPrinterErrorState = (
    rawErrorMsg?: string,
    overrideCategory?: PrinterErrorCategory,
    autoOpenModal: boolean = true
  ) => {
    const currentPaper = analyticsService.getTelemetry().paperRemainingPercent ?? 100;
    setPaperLevelPercent(currentPaper);
    const status = thermalPrinterService.getStatus();
    const classified = thermalPrinterService.classifyPrinterError(
      rawErrorMsg || status.error,
      overrideCategory === 'paper_out' ? 0 : currentPaper
    );
    const finalCategory: PrinterErrorCategory =
      overrideCategory && overrideCategory !== 'none' ? overrideCategory : classified.category;
    const report: PrinterDiagnosticReport = {
      healthy: false,
      category: finalCategory,
      title:
        finalCategory === 'paper_jam'
          ? 'Paper Jam or Feed Stall Detected'
          : finalCategory === 'paper_out'
          ? 'Out of Thermal Paper'
          : 'Printer Disconnected',
      message:
        rawErrorMsg ||
        status.error ||
        classified.message,
      connectionType: status.connectionType,
      deviceName: status.deviceName || 'Thermal Printer',
      paperRemainingPercent: currentPaper,
      checklist: classified.checklist,
      timestamp: Date.now(),
    };
    setIsFeeding(false);
    setPrinterErrorReport(report);
    if (autoOpenModal) {
      setShowPrinterDiagnosticModal(true);
    }
  };

  const triggerFunConfetti = () => {
    try {
      confettiCleanupRef.current?.();
      confettiCleanupRef.current = launchFun60FpsConfetti();
    } catch {
      // ignore
    }
  };

  const triggerFeedAnimation = (playSound: boolean = true) => {
    setFeedAnimationKey((prev) => prev + 1);
    setIsFeeding(true);
    if (playSound) soundEffects.playPrintingMotor();
    triggerFunConfetti();
    const timer = setTimeout(() => {
      setIsFeeding(false);
      if (playSound) soundEffects.playPaperCut();
    }, 3100);
    return timer;
  };

  useEffect(() => {
    const currentPaper = analyticsService.getTelemetry().paperRemainingPercent ?? 100;
    setPaperLevelPercent(currentPaper);

    const timer = triggerFeedAnimation(true);
    const unsub = thermalPrinterService.subscribe((status) => {
      setLivePrinterStatus(status);
      setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
      // Automatically detect live USB cable unplug, Bluetooth link drop, or hardware stall
      if (!status.isConnected || status.error) {
        triggerPrinterErrorState(
          status.error || `${status.deviceName} disconnected during session.`,
          status.errorCategory || 'disconnected',
          true
        );
      } else {
        setPrinterErrorReport((prev) => (prev?.category === 'disconnected' ? null : prev));
      }
    });

    // Check if paper roll telemetry is already depleted (0%)
    if (currentPaper <= 0) {
      triggerPrinterErrorState(
        'Thermal paper roll is empty (0% remaining). Load a fresh thermal paper roll and tap Reprint.',
        'paper_out',
        true
      );
    }

    // Automatically print 1 copy (1 Voucher = 1 Print Copy) to connected printer on session completion
    if (!hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      setActiveCopiesCount(1);
      const autoPrintConfig: ThermalPrinterConfig = {
        ...config.thermalPrinter,
        printCopies: 1,
      };
      setIsPrinting(true);
      thermalPrinterService
        .print(canvas, autoPrintConfig, (_pct, status) => {
          setPrintStatusText((prev) => (prev === status ? prev : status));
        })
        .then((res) => {
          setIsPrinting(false);
          if (res.success) {
            setPrintedSuccessfully(true);
            if (currentPaper > 0) {
              setPrinterErrorReport(null);
            }
            if (res.previewDataUrl) {
              setThermalPreviewUrl(res.previewDataUrl);
            }
            setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
          } else {
            triggerPrinterErrorState(
              res.error || 'Printer could not complete the print job. Check connection or paper roll.',
              res.errorCategory,
              true
            );
          }
        })
        .catch((err: unknown) => {
          setIsPrinting(false);
          const msg = err instanceof Error ? err.message : 'Printer communication error.';
          triggerPrinterErrorState(msg, undefined, true);
        });
    }

    return () => {
      unsub();
      clearTimeout(timer);
      confettiCleanupRef.current?.();
      try {
        confetti.reset();
      } catch {}
    };
  }, []);

  // Generate QR Code only when online and AFTER active thermal printing finishes (so zero CPU/canvas work stalls continuous printing)
  useEffect(() => {
    if (!isOnline) return;
    if (isPrinting && !showQrModal) return;
    let cancelled = false;
    const delayMs = showQrModal ? 0 : 600;
    const qrTimer = setTimeout(() => {
      buildOfflineQrPacket(
        activeCanvas,
        result,
        getSavedOfflineQrMode(),
        getSavedHotspotOrigin()
      )
        .then((packet) => {
          if (!cancelled && packet?.qrDataUrl) {
            setOfflineQrPacket(packet);
            setQrShareDataUrl(packet.qrDataUrl);
          }
        })
        .catch(() => {});
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(qrTimer);
    };
  }, [activeCanvas, result, showQrModal, isOnline, isPrinting]);

  // Host Full-HD photostrip & raw photos via WebRTC P2P when online (deferred until printing completes)
  useEffect(() => {
    if (!isOnline || isPrinting) return;
    let stopPeerHost: (() => void) | null = null;
    const deferTimer = setTimeout(() => {
      stopPeerHost = startTabletHdPeerHost(result, () => {
        setCountdownSeconds(60);
      });
    }, 350);
    return () => {
      clearTimeout(deferTimer);
      stopPeerHost?.();
    };
  }, [result, isOnline, isPrinting]);

  const handleQuickShareOffline = async () => {
    soundEffects.playTap();
    setCountdownSeconds(60);
    setQuickShareStatus(null);
    const res = await shareOfflineViaQuickShare(result, activeCanvas);
    if (res.message) {
      setQuickShareStatus(res.message);
    }
  };

  // Auto return countdown (paused while any reprint, printer error diagnostic, or QR modal is open)
  useEffect(() => {
    if (
      showPrinterDiagnosticModal ||
      showAdminReprintModal ||
      showPrintAnotherCopyModal ||
      showQrModal ||
      showPrintPreview ||
      Boolean(printerErrorReport)
    ) {
      return;
    }
    if (countdownSeconds <= 0) {
      onDone();
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    countdownSeconds,
    onDone,
    showPrinterDiagnosticModal,
    showAdminReprintModal,
    showPrintAnotherCopyModal,
    showQrModal,
    showPrintPreview,
    printerErrorReport,
  ]);

  // Run Live Connection & Paper Diagnostics inside the Diagnostic Modal
  const handleCheckPrinterConnection = async () => {
    soundEffects.playTap();
    setIsCheckingConnection(true);
    setDiagnosticFeedback('Checking printer link & paper sensor status...');
    setCountdownSeconds(60);

    const currentPaper = analyticsService.getTelemetry().paperRemainingPercent ?? 100;
    setPaperLevelPercent(currentPaper);
    const report = await thermalPrinterService.runDiagnosticCheck(currentPaper);
    setIsCheckingConnection(false);

    if (report.healthy) {
      setPrinterErrorReport(null);
      setDiagnosticFeedback(`✓ Connected to ${report.deviceName}! Ready to reprint.`);
      soundEffects.playSuccessChime();
    } else {
      setPrinterErrorReport(report);
      setDiagnosticFeedback(`⚠ ${report.title}: ${report.message}`);
    }
  };

  // 1-Tap Direct Re-Pair USB or Bluetooth from inside the Diagnostic Modal
  const handleQuickPairHardware = async (mode: 'usb' | 'bluetooth') => {
    soundEffects.playTap();
    setIsCheckingConnection(true);
    setDiagnosticFeedback(
      mode === 'bluetooth'
        ? 'Scanning & connecting Bluetooth thermal printer...'
        : 'Connecting to USB / OTG thermal printer...'
    );
    setCountdownSeconds(60);

    const ok =
      mode === 'bluetooth'
        ? await thermalPrinterService.connectBluetooth()
        : await thermalPrinterService.connectUSB();
    setIsCheckingConnection(false);

    const status = thermalPrinterService.getStatus();
    if (ok && status.isConnected) {
      setPrinterErrorReport(null);
      setDiagnosticFeedback(`✓ Connected to ${status.deviceName}! Tap "Reprint Photo Now".`);
      soundEffects.playSuccessChime();
    } else {
      triggerPrinterErrorState(
        status.error || `Could not connect via ${mode.toUpperCase()}. Verify power and cable/pairing.`,
        'disconnected',
        true
      );
      setDiagnosticFeedback(`⚠ ${status.error || 'Connection unsuccessful.'}`);
    }
  };

  // Mark paper roll reloaded / jam cleared (resets paper telemetry to 100%)
  const handleMarkPaperReloadedAndJamCleared = async () => {
    soundEffects.playTap();
    await analyticsService.resetPaperRoll();
    setPaperLevelPercent(100);
    thermalPrinterService.clearPrinterError();
    setDiagnosticFeedback('✓ Paper roll reset to 100% & paper jam state cleared. Tap "Reprint Photo Now".');
  };

  // User-friendly Reprint directly from the Printer Error Diagnostic Modal (Requires 1234 password)
  const handleDiagnosticReprintNow = async () => {
    soundEffects.playTap();
    const enteredPin = diagnosticReprintPin.trim();
    const expectedPin = (config.passcodeAdminPin || '1234').trim();
    if (enteredPin !== '1234' && enteredPin !== expectedPin) {
      setShowPrinterDiagnosticModal(true);
      setDiagnosticPinError('🔒 Enter password 1234 to reprint photo now');
      return;
    }
    setDiagnosticPinError('');
    setDiagnosticReprintPin('');
    setDiagnosticFeedback('Sending photo receipt to thermal printer...');
    setCountdownSeconds(60);
    setShowPrinterDiagnosticModal(false);
    await executePrintJob(activeCanvas, {
      ...config.thermalPrinter,
      printCopies: 1,
    });
  };

  // Execute print job (1 Voucher = 1 Print Copy, 100% silent)
  const executePrintJob = async (
    targetCanvas: HTMLCanvasElement = activeCanvas,
    printerConfig: ThermalPrinterConfig = {
      ...config.thermalPrinter,
      printCopies: 1,
    }
  ) => {
    soundEffects.playTap();
    setIsPrinting(true);
    triggerFeedAnimation(true);

    const printResult = await thermalPrinterService.print(
      targetCanvas,
      {
        ...printerConfig,
        printCopies: 1,
      },
      (_pct, status) => {
        setPrintStatusText(status);
      }
    );

    setIsPrinting(false);
    if (printResult.success) {
      setPrintedSuccessfully(true);
      setPrinterErrorReport(null);
      setDiagnosticFeedback('');
      if (printResult.previewDataUrl) {
        setThermalPreviewUrl(printResult.previewDataUrl);
      }
      soundEffects.playSuccessChime();
    } else {
      triggerPrinterErrorState(
        printResult.error || 'Print failed — check paper jam or printer connection.',
        printResult.errorCategory,
        true
      );
    }
  };

  // Redeem a new single-use voucher to print 1 additional copy
  const handleRedeemPrintAnotherCopy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = anotherCopyVoucherCode.trim();
    if (!code) {
      setAnotherCopyError('Please enter a new voucher code from the cashier');
      return;
    }

    soundEffects.playTap();
    setIsRedeemingCopyVoucher(true);
    setAnotherCopyError('');
    setAnotherCopySuccess('');

    const res = await paymentService.redeemVoucher(code, config.kioskId, result.layout);
    setIsRedeemingCopyVoucher(false);

    if (res.success) {
      setAnotherCopySuccess(res.message);
      setActiveCopiesCount((prev) => prev + 1);
      setCountdownSeconds(60);
      setTimeout(() => {
        setShowPrintAnotherCopyModal(false);
        setAnotherCopyVoucherCode('');
        setAnotherCopySuccess('');
        executePrintJob(activeCanvas, {
          ...config.thermalPrinter,
          printCopies: 1,
        });
      }, 900);
    } else {
      setAnotherCopyError(res.message);
    }
  };

  // Admin Reprint Override when printer runs out of paper or printout is bad (Accepts 1234 password)
  const handleAdminReprintSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const expectedPasscode = (config.passcodeAdminPin || '1234').trim();
    const enteredPin = adminReprintPasscode.trim();
    if (enteredPin !== '1234' && enteredPin !== expectedPasscode) {
      setAdminReprintError('Incorrect Passcode — enter 1234 to reprint');
      return;
    }

    soundEffects.playTap();
    const copiesToPrint = Math.max(1, Math.min(5, adminReprintCopies || 1));
    setShowAdminReprintModal(false);
    setAdminReprintPasscode('');
    setAdminReprintError('');
    setCountdownSeconds(60);

    soundEffects.playTap();
    setIsPrinting(true);
    triggerFeedAnimation(true);

    const printResult = await thermalPrinterService.print(
      activeCanvas,
      {
        ...config.thermalPrinter,
        printCopies: copiesToPrint,
      },
      (_pct, status) => {
        setPrintStatusText(status);
      }
    );

    setIsPrinting(false);
    if (printResult.success) {
      setPrintedSuccessfully(true);
      if (printResult.previewDataUrl) {
        setThermalPreviewUrl(printResult.previewDataUrl);
      }
      soundEffects.playSuccessChime();
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col items-center justify-between p-3 sm:p-4 bg-[#faf8f5] text-zinc-900 select-none overflow-hidden max-w-md mx-auto w-full">
      {/* FULL-SCREEN DEDICATED BIG RECEIPT PRINTING SCREEN */}
      {isFeeding && (
        <div className="fixed inset-0 z-50 bg-[#faf8f5] flex flex-col items-center justify-between overflow-hidden select-none animate-fadeIn">
          {/* Top Printing Status Header */}
          <div className="w-full pt-5 pb-3 px-6 bg-white border-b border-zinc-200 shadow-xs flex flex-col items-center text-center z-20 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900 text-white text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
              <Printer className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Printing Receipt ({activeCopiesCount} {activeCopiesCount === 1 ? 'Copy' : 'Copies'})</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              Printing Your Photo Receipt...
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              {printStatusText || 'Dispensing your photo receipt below'}
            </p>
          </div>

          {/* Center-to-Bottom Giant Thermal Receipt Chute Sliding Downward at 60fps */}
          <div className="relative flex-1 w-full flex flex-col items-center justify-end overflow-hidden pb-0">
            <div className="relative flex-1 w-full flex justify-center items-start overflow-hidden pt-2 z-10">
              <div
                key={`big-feed-${feedAnimationKey}`}
                className="w-70 sm:w-88 md:w-96 flex flex-col items-center animate-big-receipt-slide-below"
              >
                {/* Serrated Top Receipt Edge */}
                <svg
                  className="w-full h-3 text-white -mb-0.5 rotate-180"
                  viewBox="0 0 120 8"
                  preserveAspectRatio="none"
                >
                  <polygon
                    fill="currentColor"
                    points="0,0 4,8 8,0 12,8 16,0 20,8 24,0 28,8 32,0 36,8 40,0 44,8 48,0 52,8 56,0 60,8 64,0 68,8 72,0 76,8 80,0 84,8 88,0 92,8 96,0 100,8 104,0 108,8 112,0 116,8 120,0"
                  />
                </svg>

                {/* Big High-Resolution Crisp Thermal Receipt Paper */}
                <div className="w-full bg-white border-x border-b border-zinc-300 shadow-lg px-4 pt-3 pb-4 flex flex-col items-center relative">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-dashed border-zinc-300 pb-1.5 mb-2.5">
                    <span>{config.eventTitle || 'JCVCREATIVES'}</span>
                    <span>80MM RECEIPT</span>
                  </div>

                  <img
                    src={result.thermalRasterDataUrl || thermalPreviewUrl || result.compositeDataUrl}
                    alt="Printing Giant Thermal Receipt"
                    decoding="sync"
                    className="max-h-[54vh] sm:max-h-[58vh] w-auto object-contain select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Edge Exit Banner */}
          <div className="w-full bg-zinc-950 text-white py-3.5 px-6 border-t-2 border-zinc-700 shadow-2xl z-30 flex flex-col items-center justify-center shrink-0">
            <div className="flex items-center gap-3 text-sm sm:text-base font-black uppercase tracking-wider text-white">
              <ChevronDown className="w-6 h-6 text-white animate-arrow-down-below" />
              <span>Collect Your Printout Below</span>
              <ChevronDown className="w-6 h-6 text-white animate-arrow-down-below" />
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col items-center text-center shrink-0">
        <button
          type="button"
          data-no-fullscreen-enforce="true"
          onClick={() => {
            soundEffects.playTap();
            const next = logoTapCount + 1;
            if (next >= 4) {
              setLogoTapCount(0);
              onSecretAdminTap?.();
              return;
            }
            setLogoTapCount(next);
          }}
          className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1 cursor-pointer"
        >
          J
        </button>

        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 leading-tight">
          {printerErrorReport ? 'Oops! Tiny printer hiccup, bestie 🫶' : 'Your photos are ready'}
        </h1>
        <p className="text-[11px] sm:text-xs text-zinc-500">
          {printerErrorReport
            ? 'No stress — your snaps are 100% safe! Wave over our Gobble Haus crew ✨'
            : isPrinting && printStatusText
            ? printStatusText
            : isFeeding
            ? `Printing ${activeCopiesCount} ${activeCopiesCount === 1 ? 'copy' : 'copies'} below...`
            : 'Collect & tear your photo receipt from the printer below'}
        </p>
      </div>

      {/* Automatic Gen Z Friendly Printer Error State Alert Card */}
      {printerErrorReport && (
        <div className="w-full max-w-xs bg-gradient-to-br from-rose-50 via-amber-50/70 to-orange-50 border-2 border-rose-300 rounded-2xl p-3 shadow-sm flex flex-col gap-2 animate-fadeIn shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-sm shadow-2xs">
              🥡
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  ✨ Vibe Check • Printer Pause
                </span>
                <span className="text-[11px] font-extrabold text-rose-950 truncate">
                  {printerErrorReport.title}
                </span>
              </div>
              <p className="text-[11px] text-zinc-800 font-medium leading-snug mt-1">
                We ran into a little printer problem! 🥺 <strong>Your iconic snaps are 100% saved.</strong> Wave over our friendly <strong>Gobble Haus staff</strong> for a quick assist &amp; free reprint! 🍗🍦
              </p>
            </div>
          </div>

          {/* 1-Tap Call Gobble Haus Crew Chime Button */}
          <button
            type="button"
            onClick={() => {
              handleCallGobbleHausStaff();
              setShowPrinterDiagnosticModal(true);
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition ${
              staffCallNotified
                ? 'bg-amber-400 text-zinc-950 border border-amber-500 animate-pulse'
                : 'bg-zinc-950 hover:bg-zinc-800 text-white'
            }`}
          >
            <span>{staffCallNotified ? '👋' : '🔔'}</span>
            <span>
              {staffCallNotified
                ? 'Gobble Haus Crew Pinged! Wave us over ✨'
                : 'Call Gobble Haus Staff for Assist 🫶'}
            </span>
          </button>

          <div
            className={`grid gap-1.5 ${
              !livePrinterStatus.isConnected || printerErrorReport.category === 'disconnected'
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {(!livePrinterStatus.isConnected || printerErrorReport.category === 'disconnected') && (
              <button
                type="button"
                disabled={isPrinting || isCheckingConnection}
                onClick={() => {
                  soundEffects.playTap();
                  setDiagnosticFeedback('');
                  setShowPrinterDiagnosticModal(true);
                  handleCheckPrinterConnection();
                }}
                className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-rose-100/70 border border-rose-300 text-rose-900 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                <span>Check Connection</span>
              </button>
            )}
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => {
                soundEffects.playTap();
                setDiagnosticPinError('');
                setShowPrinterDiagnosticModal(true);
              }}
              className="py-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint Photo Now (PIN)</span>
            </button>
          </div>
        </div>
      )}

      {/* Thermal Output Dispenser */}
      <div className="my-auto w-full flex flex-col items-center py-1 shrink-0">
        {/* Clean Receipt Box with Tear Receipt Below at the Top of the Receipt */}
        <div className="w-60 sm:w-68 bg-white/60 border border-zinc-200 rounded-2xl p-2.5 flex flex-col items-center overflow-hidden relative shadow-sm">
          <div className="w-full overflow-hidden flex justify-center py-0.5">
            <div
              key={feedAnimationKey}
              className={`relative max-h-[30vh] sm:max-h-[34vh] flex flex-col items-center transition-transform ${
                isFeeding ? 'animate-thermalFeed' : ''
              }`}
            >
              {/* Top Animated Serrated Receipt Tear Line at the Top of the Receipt */}
              <div className="w-full relative mb-1.5 pb-1.5 flex items-center justify-center gap-1 text-[8px] font-mono text-zinc-800 font-bold uppercase tracking-widest overflow-visible">
                <span>▼ TEAR RECEIPT BELOW ▼</span>
                {/* Serrated perforation teeth line */}
                <svg
                  className="absolute bottom-0 inset-x-0 w-full h-1.5 text-zinc-400"
                  viewBox="0 0 120 6"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                    points="0,5 4,1 8,5 12,1 16,5 20,1 24,5 28,1 32,5 36,1 40,5 44,1 48,5 52,1 56,5 60,1 64,5 68,1 72,5 76,1 80,5 84,1 88,5 92,1 96,5 100,1 104,5 108,1 112,5 116,1 120,5"
                  />
                </svg>
                {!isFeeding && (
                  <>
                    {/* Animated tear split line progressing across the top of the receipt */}
                    <div className="absolute left-0 bottom-0.5 h-0.5 bg-zinc-900 rounded-full animate-tear-line" />
                    {/* Gentle hand pulling & tearing receipt at the top tear line */}
                    <div className="absolute -bottom-1.5 animate-tear-hand pointer-events-none z-20 flex items-center">
                      <span className="text-xs leading-none drop-shadow-xs">🤏</span>
                    </div>
                  </>
                )}
              </div>

              {/* Thermal Receipt Body */}
              <div
                className={`relative rounded shadow-md bg-white border border-zinc-200 overflow-hidden ${
                  !isFeeding ? 'animate-receipt-tear' : ''
                }`}
              >
                <img
                  src={thermalPreviewUrl || result.thermalRasterDataUrl || result.compositeDataUrl}
                  alt="Printed Thermal Photostrip"
                  className="max-h-[24vh] sm:max-h-[28vh] w-auto object-contain select-none pointer-events-none"
                />
                {activeCopiesCount > 1 && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-white text-[10px] font-mono font-bold shadow">
                    {activeCopiesCount} COPIES
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Post-Animation Careful Receipt Tear Instruction Banner */}
        {isFeeding ? (
          <div className="mt-2 text-[10px] text-zinc-600 text-center flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-2xs">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-700" />
            <span>Dispensing receipt — please wait...</span>
          </div>
        ) : (
          <div className="mt-2 w-full max-w-xs bg-white border border-zinc-300 rounded-2xl px-3 py-1.5 shadow-xs flex items-center gap-2.5 text-left animate-fadeIn">
            {/* Mini Looping Downward Receipt Badge */}
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex flex-col items-center justify-between shrink-0 shadow-2xs relative overflow-hidden p-1.5">
              {/* Mini receipt body sliding downward */}
              <div className="w-5 h-4 bg-white rounded-t-[2px] flex flex-col items-center justify-center gap-0.5 p-0.5 shadow-2xs animate-mini-receipt-tear">
                <div className="w-full h-2 bg-zinc-800 rounded-[1px]" />
                <div className="w-3 h-0.5 bg-zinc-400 rounded-full" />
              </div>
              {/* Bottom printer slot bar */}
              <div className="w-6 h-1 bg-zinc-500 rounded-full shrink-0" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-extrabold text-zinc-950 flex items-center gap-1">
                <span>Collect &amp; tear receipt below</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-900 animate-arrow-down-below" />
              </div>
              <div className="text-[9.5px] text-zinc-600 mt-0.5">
                Printed ({activeCopiesCount}x) • Photo auto-saved
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-1.5 max-w-xs pt-0.5 shrink-0">
        {/* Button 1: Show QR Code & Quick Share (Hidden when photobooth is offline) */}
        {isOnline && (
          <button
            onClick={() => {
              soundEffects.playTap();
              setQuickShareStatus(null);
              setShowQrModal(true);
            }}
            className="w-full py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>QR & Quick Share to Phone</span>
          </button>
        )}

        {/* Button 2: Print Another Copy (Free in Free Play Mode, or Single-Use Voucher in Paid Mode) */}
        <button
          disabled={isPrinting}
          onClick={() => {
            soundEffects.playTap();
            if (config.freePlayMode) {
              setActiveCopiesCount((prev) => prev + 1);
              setCountdownSeconds(60);
              executePrintJob(activeCanvas, {
                ...config.thermalPrinter,
                printCopies: 1,
              });
              return;
            }
            setAnotherCopyVoucherCode('');
            setAnotherCopyError('');
            setAnotherCopySuccess('');
            setShowPrintAnotherCopyModal(true);
          }}
          className="w-full py-2 px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {config.freePlayMode ? (
            <Printer className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          ) : (
            <Ticket className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          )}
          <span>
            {isPrinting ? 'Printing Copy...' : 'Print Another Copy'}
          </span>
        </button>

        {/* Button 3: Check Connection (ONLY shown when printer is not connected) & No Receipt Came Out? Reprint */}
        <div
          className={`grid gap-1.5 ${
            !livePrinterStatus.isConnected || Boolean(printerErrorReport)
              ? 'grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {(!livePrinterStatus.isConnected || Boolean(printerErrorReport)) && (
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => {
                soundEffects.playTap();
                setDiagnosticFeedback('');
                setDiagnosticPinError('');
                setShowPrinterDiagnosticModal(true);
              }}
              className={`py-1.5 px-2.5 rounded-full border text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                printerErrorReport || !livePrinterStatus.isConnected
                  ? 'border-rose-400 bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold'
                  : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <span>
                {!livePrinterStatus.isConnected || printerErrorReport?.category === 'disconnected'
                  ? 'Check Connection'
                  : 'Fix Printer Error'}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={isPrinting}
            onClick={() => {
              soundEffects.playTap();
              setAdminReprintPasscode('');
              setAdminReprintError('');
              setAdminReprintCopies(1);
              setShowAdminReprintModal(true);
            }}
            className="py-1.5 px-2.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>🥺 No Receipt Came Out?</span>
          </button>
        </div>

        {/* Button 5: Ready? Let's snap! */}
        <button
          onClick={() => {
            soundEffects.playTap();
            onDone();
          }}
          className="w-full py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs sm:text-sm font-medium shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white" />
          <span>Ready? Let's snap!</span>
        </button>

        {/* Starting over countdown timer */}
        <div className="text-center text-[10px] text-zinc-400">
          {showPrinterDiagnosticModal ||
          showAdminReprintModal ||
          showPrintAnotherCopyModal ||
          showQrModal ||
          Boolean(printerErrorReport)
            ? 'Timer paused while modal or printer alert is open'
            : `Starting over in ${countdownSeconds}s`}
        </div>

        {/* 1-Click Auto-Print Setup link if using OS System Driver without Silent Bridge yet */}
        {!silentBridgeReady && thermalPrinterService.getStatus().connectionType === 'system' && (
          <div className="text-center">
            <a
              href="./JCV-AutoPrint-Setup.bat"
              download="JCV-AutoPrint-Setup.bat"
              onClick={() => {
                soundEffects.playTap();
                setShowAutoPrintGuide(true);
              }}
              className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-medium underline cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Disable browser print pop-up (1-click Auto-Print setup)</span>
            </a>
          </div>
        )}
      </div>

      {/* Modal 1: QR Code & Quick Share Hub Modal (Hidden when photobooth is offline) */}
      {isOnline && showQrModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-4 sm:p-5 max-w-sm w-full max-h-[92dvh] overflow-y-auto text-center shadow-2xl border border-zinc-200 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <WifiOff className="w-3 h-3" />
                <span>Full-HD Photo Transfer</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-zinc-950 mb-0.5">
              Scan with iPhone (iOS) or Android
            </h3>
            <p className="text-[11px] text-zinc-500 mb-3 leading-snug">
              Scan with your phone camera to receive your <strong>Full-HD Color Photo</strong> and tap <strong>Save to Photos</strong>!
            </p>

            {/* High-Contrast Offline QR Code */}
            <div className="p-3 bg-white border-2 border-zinc-900 rounded-2xl shadow-sm mb-3 flex flex-col items-center">
              {qrShareDataUrl ? (
                <img
                  src={qrShareDataUrl}
                  alt="Photo QR Code"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-zinc-400">
                  Generating Full-HD QR...
                </div>
              )}
              {offlineQrPacket && (
                <div className="mt-1.5 text-[10px] font-semibold text-emerald-700">
                  ✨ iOS &amp; Android Full-HD Vector + Direct Sync Ready
                </div>
              )}
            </div>

            {/* 1-Tap Native Quick Share / Bluetooth Transfer for Galaxy Tab A11 */}
            <div className="w-full mb-2.5">
              <button
                type="button"
                onClick={handleQuickShareOffline}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Quick Share / Bluetooth Full HD (Offline)</span>
              </button>
              <p className="mt-1 text-[10px] text-zinc-500">
                On Galaxy Tab A11, opens <strong>Samsung Quick Share QR / Bluetooth</strong> to send 100% uncompressed photos offline.
              </p>
              {quickShareStatus && (
                <div className="mt-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-medium">
                  {quickShareStatus}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Thermal Preview Alignment Modal */}
      {showPrintPreview && (
        <ThermalPrintPreviewModal
          sourceCanvas={canvas}
          currentConfig={config.thermalPrinter}
          onConfirmPrint={(adjustedCanvas, adjustedConfig) => {
            setShowPrintPreview(false);
            setActiveCanvas(adjustedCanvas);
            executePrintJob(adjustedCanvas, adjustedConfig);
          }}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      {/* Print Another Copy Voucher Redemption Screen */}
      {showPrintAnotherCopyModal && (() => {
        const layoutMeta = LAYOUT_VOUCHER_META[result.layout] || LAYOUT_VOUCHER_META.strip_3;
        const unitPrice = config.layoutPrices?.[result.layout] ?? layoutMeta.defaultPrice;
        return (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#faf8f5] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col items-center text-center">
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrintAnotherCopyModal(false)}
                  className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-base mb-3 shadow-sm">
                <Ticket className="w-5 h-5" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] uppercase font-mono tracking-widest text-zinc-700 mb-2">
                <span>1 Voucher = 1 Print Copy</span>
              </div>

              <h3 className="text-lg font-extrabold text-zinc-950 mb-1">
                Print Another Copy
              </h3>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                Buy a new <strong className="text-zinc-800">{layoutMeta.label}</strong> voucher (P{unitPrice}) from the cashier and enter your code below to print 1 additional copy.
              </p>

              <form onSubmit={handleRedeemPrintAnotherCopy} className="w-full space-y-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={anotherCopyVoucherCode}
                  onChange={(e) => {
                    setAnotherCopyVoucherCode(e.target.value.replace(/\D/g, ''));
                    setAnotherCopyError('');
                  }}
                  placeholder="ENTER NUMERIC VOUCHER CODE..."
                  autoFocus
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-center uppercase tracking-widest font-mono text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black transition"
                />

                {anotherCopyError && (
                  <p className="text-xs font-medium text-rose-500">{anotherCopyError}</p>
                )}
                {anotherCopySuccess && (
                  <p className="text-xs font-medium text-emerald-600">{anotherCopySuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={isRedeemingCopyVoucher}
                  className="w-full py-3 rounded-full bg-black hover:bg-zinc-800 active:scale-98 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isRedeemingCopyVoucher
                      ? 'Validating Voucher...'
                      : 'Redeem Voucher & Print 1 Copy'}
                  </span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowPrintAnotherCopyModal(false)}
                className="mt-4 text-xs text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* 1-Click Auto-Print Setup Guide Modal */}
      {showAutoPrintGuide && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-950 mb-1">
              1-Click Auto-Print Setup Downloaded!
            </h3>
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Open <span className="font-mono font-bold text-zinc-900">JCV-AutoPrint-Setup.bat</span> from your browser&apos;s top-right Downloads bar once.
            </p>
            <div className="w-full text-left text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1.5 mb-4">
              <div>✓ Connects directly to your <strong>EPSON TM-T88V</strong> or USB printer</div>
              <div>✓ Enables <strong>--kiosk-printing</strong> in Brave, Chrome &amp; Edge</div>
              <div>✓ Prints <strong>100% automatically</strong> with no pop-up window!</div>
            </div>
            <button
              onClick={async () => {
                soundEffects.playTap();
                await thermalPrinterService.probeSilentBridge();
                setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
                setShowAutoPrintGuide(false);
              }}
              className="w-full py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* No Receipt Came Out? / Bad Printout — Gen Z Friendly Gobble Haus Staff Assist & Reprint Modal */}
      {showAdminReprintModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#faf8f5] rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col items-center text-center">
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setShowAdminReprintModal(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xl mb-2.5 shadow-sm">
              🥺
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-[10px] uppercase font-mono font-extrabold tracking-widest text-amber-900 mb-2">
              <span>✨ Snaps 100% Safe • Free Reprint</span>
            </div>

            <h3 className="text-lg font-black text-zinc-950 mb-1 leading-tight">
              No Receipt Came Out, Bestie? 🥺
            </h3>
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Did the printer run out of paper or ghost your strip? <strong>Don&apos;t stress — your iconic photos are saved!</strong> Tap below to chime our friendly <strong>Gobble Haus crew</strong> so we can reload the paper &amp; reprint your strip for free! 🍗🍦
            </p>

            {/* 1-Tap Gen Z Friendly Call Gobble Haus Staff Chime Button */}
            <button
              type="button"
              onClick={handleCallGobbleHausStaff}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition mb-3 ${
                staffCallNotified
                  ? 'bg-amber-400 text-zinc-950 border-2 border-zinc-900 animate-pulse'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-white'
              }`}
            >
              <span className="text-sm">{staffCallNotified ? '👋' : '🔔'}</span>
              <span>
                {staffCallNotified
                  ? 'Gobble Haus Crew Pinged! Wave us over, bestie ✨'
                  : 'Ping Gobble Haus Crew for Assist (Chime) 🫶'}
              </span>
            </button>

            <form
              onSubmit={handleAdminReprintSubmit}
              className="w-full space-y-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs text-left"
            >
              <div className="text-[10.5px] font-mono uppercase tracking-wider font-extrabold text-zinc-500 text-center">
                👨‍🍳 Gobble Haus Crew Quick Reprint
              </div>

              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-700">
                <span>Copies to Reprint:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        setAdminReprintCopies(num);
                      }}
                      className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition cursor-pointer ${
                        adminReprintCopies === num
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  value={adminReprintPasscode}
                  onChange={(e) => {
                    setAdminReprintPasscode(e.target.value);
                    setAdminReprintError('');
                  }}
                  placeholder="ENTER 1234 PASSWORD TO REPRINT..."
                  autoComplete="off"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-center tracking-widest font-mono text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>

              {adminReprintError && (
                <p className="text-xs font-medium text-rose-500 text-center">{adminReprintError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-black hover:bg-zinc-800 active:scale-98 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Reprint {adminReprintCopies} {adminReprintCopies === 1 ? 'Copy' : 'Copies'} Now ✨
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowAdminReprintModal(false)}
              className="mt-3.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* User-Friendly 'Printer Error' — 'Reprint' & 'Check Connection' Diagnostic Modal */}
      {showPrinterDiagnosticModal && (() => {
        const liveStatus = thermalPrinterService.getStatus();
        const activeCategory: PrinterErrorCategory =
          diagnosticGuideTab === 'paper_jam'
            ? 'paper_jam'
            : diagnosticGuideTab === 'connection'
            ? 'disconnected'
            : printerErrorReport?.category ||
              (paperLevelPercent <= 0
                ? 'paper_out'
                : !liveStatus.isConnected || liveStatus.error
                ? liveStatus.errorCategory || 'disconnected'
                : 'none');

        const activeInfo =
          activeCategory === 'paper_jam'
            ? thermalPrinterService.classifyPrinterError('paper jam stall', paperLevelPercent)
            : activeCategory === 'paper_out'
            ? thermalPrinterService.classifyPrinterError('out of paper', 0)
            : activeCategory === 'disconnected'
            ? thermalPrinterService.classifyPrinterError(
                printerErrorReport?.message || liveStatus.error || 'Printer disconnected',
                paperLevelPercent
              )
            : {
                category: 'none' as PrinterErrorCategory,
                title: 'Printer Connected & Ready',
                message: `${liveStatus.deviceName} is connected. If your printout had a paper jam or didn't feed cleanly, clear the roller and tap Reprint below.`,
                checklist: [
                  'Ensure thermal paper is loaded straight with the glossy side facing the print head.',
                  'Close the printer top cover firmly until both sides click shut.',
                  'Tap "Check Connection" to verify link health or tap "Reprint Photo Now".',
                ],
              };

        const isErrorActive = Boolean(printerErrorReport) || !liveStatus.isConnected || paperLevelPercent <= 0;

        return (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
            <div
              data-kiosk-scrollable="true"
              data-admin-scrollable="true"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="bg-[#faf8f5] rounded-3xl p-4 sm:p-5 max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-zinc-200 flex flex-col text-left"
            >
              {/* Top Modal Bar */}
              <div className="w-full flex items-center justify-between mb-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-extrabold tracking-wider border ${
                    isErrorActive
                      ? 'bg-rose-100 border-rose-300 text-rose-800'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                  }`}
                >
                  {isErrorActive ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>
                        {activeCategory === 'paper_jam'
                          ? 'Paper Jam Detected'
                          : activeCategory === 'paper_out'
                          ? 'Paper Empty'
                          : 'Printer Pause'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Printer Connected &amp; Ready</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrinterDiagnosticModal(false)}
                  className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Friendly Gen Z Customer Reassurance & Call Gobble Haus Crew Card */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50/80 to-rose-50 border-2 border-amber-300 rounded-2xl p-3.5 mb-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                    🫶
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-950 text-[9.5px] font-mono font-extrabold uppercase tracking-wider mb-1">
                      <span>✨ Don&apos;t Panic Bestie • Snaps 100% Saved</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-zinc-950 leading-tight">
                      No receipt came out or printer paused? 🥺
                    </h3>
                    <p className="text-[11.5px] text-zinc-700 mt-1 leading-relaxed">
                      Our thermal printer just needs a quick vibe check ({activeInfo.title.toLowerCase()}). Tap the button below to chime our friendly <strong>Gobble Haus crew</strong> — we&apos;ll hop right over and print your strip fresh! 🍗🍦
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCallGobbleHausStaff}
                  className={`mt-2.5 w-full py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition ${
                    staffCallNotified
                      ? 'bg-amber-400 text-zinc-950 border-2 border-zinc-900'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-white'
                  }`}
                >
                  <span className="text-sm">{staffCallNotified ? '👋' : '🔔'}</span>
                  <span>
                    {staffCallNotified
                      ? 'Gobble Haus Crew Pinged! Wave us over, bestie ✨'
                      : 'Ping Gobble Haus Crew for Quick Assist (Chime) 🫶'}
                  </span>
                </button>
              </div>

              {/* Technical Detected Issue Summary for Staff / Quick Check */}
              <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                <span className="text-[11px] font-extrabold text-zinc-900 uppercase tracking-wide font-mono">
                  👨‍🍳 Gobble Haus Staff Quick Fix &amp; Reprint
                </span>
                <span className="text-[10px] font-semibold text-zinc-500">
                  {activeInfo.title}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mb-2.5 leading-snug">
                {printerErrorReport?.message || activeInfo.message}
              </p>

              {/* Live Hardware & Paper Roll Status Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-2xl p-2.5 border border-zinc-200 shadow-2xs">
                  <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                    Printer Connection
                  </div>
                  <div className="text-xs font-extrabold text-zinc-900 truncate mt-0.5">
                    {liveStatus.deviceName || 'Thermal Printer'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        liveStatus.isConnected && !printerErrorReport
                          ? 'bg-emerald-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span
                      className={`text-[10.5px] font-bold ${
                        liveStatus.isConnected && !printerErrorReport
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {liveStatus.isConnected && !printerErrorReport
                        ? `Connected (${liveStatus.connectionType.toUpperCase()})`
                        : `Check ${liveStatus.connectionType.toUpperCase()} Link`}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-2.5 border border-zinc-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                      Paper Roll Sensor
                    </span>
                    <span
                      className={`text-[10.5px] font-mono font-extrabold ${
                        paperLevelPercent <= 15 ? 'text-rose-600' : 'text-zinc-800'
                      }`}
                    >
                      {paperLevelPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden my-1">
                    <div
                      style={{ width: `${Math.max(4, Math.min(100, paperLevelPercent))}%` }}
                      className={`h-full rounded-full transition-all ${
                        paperLevelPercent <= 15
                          ? 'bg-rose-500'
                          : paperLevelPercent <= 35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkPaperReloadedAndJamCleared}
                    className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg py-0.5 px-2 text-center cursor-pointer transition"
                  >
                    ✓ Paper Reloaded / Jam Cleared
                  </button>
                </div>
              </div>

              {/* Diagnostic Guide Switcher (Auto Detected / Paper Jam Steps / Connection Steps) */}
              <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-xl text-[11px] font-bold mb-2">
                {(
                  [
                    { id: 'auto', label: 'Detected Issue' },
                    { id: 'paper_jam', label: 'Paper Jam Fix' },
                    { id: 'connection', label: 'USB / Bluetooth Fix' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      setDiagnosticGuideTab(tab.id);
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                      diagnosticGuideTab === tab.id
                        ? 'bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Step-by-Step Recovery Checklist */}
              <div className="bg-white rounded-2xl p-3 border border-zinc-200 shadow-2xs space-y-1.5 mb-3">
                <div className="text-[10.5px] font-mono uppercase tracking-wider font-extrabold text-zinc-500">
                  Quick Recovery Steps
                </div>
                {activeInfo.checklist.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-700 leading-snug">
                    <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {/* Quick Hardware Re-Pairing Buttons (USB Cord & Bluetooth) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  disabled={isCheckingConnection || isPrinting}
                  onClick={() => handleQuickPairHardware('bluetooth')}
                  className="py-2 px-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Reconnect Bluetooth</span>
                </button>
                <button
                  type="button"
                  disabled={isCheckingConnection || isPrinting}
                  onClick={() => handleQuickPairHardware('usb')}
                  className="py-2 px-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
                >
                  <Usb className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Reconnect USB Cord</span>
                </button>
              </div>

              {/* Live Diagnostic Status Message */}
              {diagnosticFeedback && (
                <div
                  className={`mb-3 px-3 py-2 rounded-xl border text-xs font-semibold ${
                    diagnosticFeedback.startsWith('✓')
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {diagnosticFeedback}
                </div>
              )}

              {/* 1234 Password Input for Reprint Photo Now */}
              <div className="mb-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs">
                <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-zinc-600 mb-1.5 text-center">
                  🔒 Enter 1234 Password to Reprint Photo Now
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={diagnosticReprintPin}
                    onChange={(e) => {
                      setDiagnosticReprintPin(e.target.value);
                      setDiagnosticPinError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDiagnosticReprintNow();
                      }
                    }}
                    placeholder="ENTER 1234 PASSWORD..."
                    autoComplete="off"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-center tracking-widest font-mono text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>
                {diagnosticPinError && (
                  <p className="text-[11px] font-bold text-rose-600 text-center mt-1.5">
                    {diagnosticPinError}
                  </p>
                )}
              </div>

              {/* Primary Action Buttons: 'Check Connection' (only if not connected) & 'Reprint Photo Now' */}
              <div
                className={`grid gap-2 ${
                  !livePrinterStatus.isConnected || activeCategory === 'disconnected'
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {(!livePrinterStatus.isConnected || activeCategory === 'disconnected') && (
                  <button
                    type="button"
                    disabled={isCheckingConnection || isPrinting}
                    onClick={handleCheckPrinterConnection}
                    className="py-3 px-3 rounded-full border-2 border-zinc-900 bg-white hover:bg-zinc-100 active:scale-98 text-zinc-900 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                    <span>{isCheckingConnection ? 'Checking...' : 'Check Connection'}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isPrinting || isCheckingConnection}
                  onClick={handleDiagnosticReprintNow}
                  className="py-3 px-3 rounded-full bg-black hover:bg-zinc-800 active:scale-98 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'Reprinting...' : 'Reprint Photo Now'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPrinterDiagnosticModal(false)}
                className="mt-3 text-center text-xs text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer"
              >
                Close Diagnostic Window
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
