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
} from 'lucide-react';
import { PhotostripResult, ThermalPrinterConfig, RemoteKioskConfig } from '../types';
import { thermalPrinterService } from '../services/thermalPrinter';
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

  // Dispenser animation
  const [feedAnimationKey, setFeedAnimationKey] = useState<number>(0);
  const [isFeeding, setIsFeeding] = useState<boolean>(true);
  const [showAutoPrintGuide, setShowAutoPrintGuide] = useState<boolean>(false);
  const [silentBridgeReady, setSilentBridgeReady] = useState<boolean>(() =>
    thermalPrinterService.isSilentBridgeActive()
  );
  const hasAutoPrintedRef = React.useRef<boolean>(false);
  const hasAutoSavedPhotoRef = React.useRef<boolean>(false);

  const confettiCleanupRef = React.useRef<(() => void) | null>(null);

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
    const timer = triggerFeedAnimation(true);
    const unsub = thermalPrinterService.subscribe(() => {
      setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
    });

    // Automatically save the photo taken directly to the device
    if (!hasAutoSavedPhotoRef.current && result.compositeDataUrl) {
      hasAutoSavedPhotoRef.current = true;
      try {
        const a = document.createElement('a');
        a.href = result.compositeDataUrl;
        a.download = `Photobooth-${result.id || Date.now()}.jpg`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        // Ignore if blocked by restricted WebView
      }
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
            if (res.previewDataUrl) {
              setThermalPreviewUrl(res.previewDataUrl);
            }
            setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
          }
        })
        .catch(() => {
          setIsPrinting(false);
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

  // Generate QR Code only when online (deferred so 60fps receipt slide & confetti never drop a frame)
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const delayMs = showQrModal ? 0 : 1200;
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
  }, [activeCanvas, result, showQrModal, isOnline]);

  // Host Full-HD photostrip & raw photos via WebRTC P2P when online
  useEffect(() => {
    if (!isOnline) return;
    let stopPeerHost: (() => void) | null = null;
    const deferTimer = setTimeout(() => {
      stopPeerHost = startTabletHdPeerHost(result, () => {
        setCountdownSeconds(60);
      });
    }, 250);
    return () => {
      clearTimeout(deferTimer);
      stopPeerHost?.();
    };
  }, [result, isOnline]);

  const handleQuickShareOffline = async () => {
    soundEffects.playTap();
    setCountdownSeconds(60);
    setQuickShareStatus(null);
    const res = await shareOfflineViaQuickShare(result, activeCanvas);
    if (res.message) {
      setQuickShareStatus(res.message);
    }
  };

  // Auto return countdown
  useEffect(() => {
    if (countdownSeconds <= 0) {
      onDone();
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds, onDone]);

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
      if (printResult.previewDataUrl) {
        setThermalPreviewUrl(printResult.previewDataUrl);
      }
      soundEffects.playSuccessChime();
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
          Your photos are ready
        </h1>
        <p className="text-[11px] sm:text-xs text-zinc-500">
          {isPrinting && printStatusText
            ? printStatusText
            : isFeeding
            ? `Printing ${activeCopiesCount} ${activeCopiesCount === 1 ? 'copy' : 'copies'} below...`
            : 'Collect & tear your photo receipt from the printer below'}
        </p>
      </div>

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
          Starting over in {countdownSeconds}s
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
    </div>
  );
};
