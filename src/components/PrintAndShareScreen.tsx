/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Printer,
  QrCode,
  Mail,
  Download,
  RotateCcw,
  Sparkles,
  Smartphone,
  Check,
  X,
  Send,
  Loader2,
  Ticket,
  Share2,
  WifiOff,
  Scissors,
} from 'lucide-react';
import { PhotostripResult, ThermalPrinterConfig, RemoteKioskConfig } from '../types';
import { thermalPrinterService } from '../services/thermalPrinter';
import { emailDeliveryService } from '../services/email';
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
import { ThermalPrintPreviewModal } from './ThermalPrintPreviewModal';

interface PrintAndShareScreenProps {
  result: PhotostripResult;
  canvas: HTMLCanvasElement;
  config: RemoteKioskConfig;
  copies: number;
  onDone: () => void;
  onOpenMobileShareModal: () => void;
  onSecretAdminTap?: () => void;
}

export const PrintAndShareScreen: React.FC<PrintAndShareScreenProps> = ({
  result,
  canvas,
  config,
  copies,
  onDone,
  onOpenMobileShareModal,
  onSecretAdminTap,
}) => {
  const sessionCopies = 1; // 1 Voucher = 1 Print Copy for initial print
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPrintAnotherCopyModal, setShowPrintAnotherCopyModal] = useState(false);
  const [anotherCopyVoucherCode, setAnotherCopyVoucherCode] = useState('');
  const [anotherCopyError, setAnotherCopyError] = useState('');
  const [anotherCopySuccess, setAnotherCopySuccess] = useState('');
  const [isRedeemingCopyVoucher, setIsRedeemingCopyVoucher] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement>(canvas);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printedSuccessfully, setPrintedSuccessfully] = useState(false);
  const [printStatusText, setPrintStatusText] = useState<string>('');
  const [activeCopiesCount, setActiveCopiesCount] = useState<number>(1);
  const [qrShareDataUrl, setQrShareDataUrl] = useState<string>('');
  const [offlineQrPacket, setOfflineQrPacket] = useState<OfflineQrPacket | null>(null);
  const [quickShareStatus, setQuickShareStatus] = useState<string | null>(null);
  const [thermalPreviewUrl, setThermalPreviewUrl] = useState<string>(result.thermalRasterDataUrl || '');
  const [countdownSeconds, setCountdownSeconds] = useState(60);

  // Email form states
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);

  // Dispenser animation
  const [feedAnimationKey, setFeedAnimationKey] = useState<number>(0);
  const [isFeeding, setIsFeeding] = useState<boolean>(true);
  const [showAutoPrintGuide, setShowAutoPrintGuide] = useState<boolean>(false);
  const [silentBridgeReady, setSilentBridgeReady] = useState<boolean>(() =>
    thermalPrinterService.isSilentBridgeActive()
  );
  const hasAutoPrintedRef = React.useRef<boolean>(false);

  const triggerFeedAnimation = (playSound: boolean = true) => {
    setFeedAnimationKey((prev) => prev + 1);
    setIsFeeding(true);
    if (playSound) soundEffects.playPrintingMotor();
    const timer = setTimeout(() => {
      setIsFeeding(false);
      if (playSound) soundEffects.playPaperCut();
    }, 2400);
    return timer;
  };

  useEffect(() => {
    const timer = triggerFeedAnimation(true);
    const unsub = thermalPrinterService.subscribe(() => {
      setSilentBridgeReady(thermalPrinterService.isSilentBridgeActive());
    });

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
          try {
            confetti({
              particleCount: 60,
              spread: 75,
              origin: { x: 0.5, y: 0.4 },
              colors: ['#0f172a', '#71717a', '#a1a1aa', '#cbd5e1'],
            });
          } catch {
            // ignore
          }
        })
        .catch(() => {
          setIsPrinting(false);
        });
    }

    return () => {
      unsub();
      clearTimeout(timer);
      try {
        confetti.reset();
      } catch {}
    };
  }, []);

  // Generate Self-Contained Offline QR Code (embeds compressed camera portrait + vector frame metadata)
  useEffect(() => {
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, [activeCanvas, result, showQrModal]);

  // Host 100% uncompressed Full-HD photostrip & raw photos via WebRTC P2P for instant iPhone/Android HD sync
  useEffect(() => {
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
  }, [result]);

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

  // Send photo email handler
  const handleSendEmail = async (emailToSubmit: string) => {
    const trimmed = emailToSubmit.trim();
    if (!trimmed || !trimmed.includes('@')) return;

    soundEffects.playTap();
    setIsSendingEmail(true);
    setEmailSentStatus(null);

    try {
      const response = await emailDeliveryService.sendPhotoEmail({
        recipientEmail: trimmed,
        photostripId: result.id,
        photostripUrl: result.compositeDataUrl, // Sends the full-color keepsake photostrip
        eventTitle: result.eventTitle || 'JCVcreatives Photobooth',
      });

      setEmailSentStatus(response.message);
      soundEffects.playSuccessChime();
    } catch {
      setEmailSentStatus('Delivery queued offline! Your photos will send automatically when online.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const appendDomain = (domain: string) => {
    soundEffects.playTap();
    const prefix = emailInput.split('@')[0] || '';
    setEmailInput(`${prefix}${domain}`);
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
            ? `Printing ${activeCopiesCount} ${activeCopiesCount === 1 ? 'copy' : 'copies'}...`
            : 'Please use scissors carefully to cut your thermal photo receipt'}
        </p>
      </div>

      {/* Simulated Thermal Output Dispenser Slot */}
      <div className="my-auto w-full flex flex-col items-center py-1 shrink-0">
        {/* Output Slot Bezel */}
        <div className="w-60 sm:w-68 bg-zinc-200 border border-zinc-300 rounded-t-xl pt-1.5 px-3 pb-1 shadow-xs flex flex-col items-center">
          <div className="w-11/12 h-1.5 bg-black rounded-full" />
        </div>

        {/* Paper Chute holding photostrip (pure monochrome thermal print) */}
        <div className="w-60 sm:w-68 bg-white/40 border-x border-b border-zinc-200 rounded-b-xl p-1.5 pt-0 flex flex-col items-center overflow-hidden relative shadow-md">
          <div className="w-full overflow-hidden flex justify-center py-1.5">
            <div
              key={feedAnimationKey}
              className={`relative max-h-[29vh] sm:max-h-[33vh] flex flex-col items-center transition-transform ${
                isFeeding ? 'animate-thermalFeed' : ''
              }`}
            >
              {/* Thermal Receipt Body (detaches slightly when scissors finish cutting across) */}
              <div
                className={`relative rounded shadow-lg bg-white border border-zinc-200 overflow-hidden ${
                  !isFeeding ? 'animate-receipt-sever' : ''
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

              {/* Bottom Animated Scissors Cut Guide Line */}
              <div className="w-full relative mt-1.5 pt-1 flex items-center justify-center gap-1.5 text-[8px] font-mono text-amber-800 font-bold uppercase tracking-widest overflow-visible">
                {/* Dashed perforation line */}
                <div className="absolute top-0 inset-x-0 border-t border-dashed border-amber-500/80" />
                {!isFeeding && (
                  <>
                    <div className="absolute left-0 top-0 -translate-y-1/2 h-0.5 bg-amber-500 animate-cut-trail" />
                    <div className="absolute top-0 animate-scissors-across pointer-events-none z-20">
                      <svg
                        width="20"
                        height="16"
                        viewBox="0 0 28 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g className="animate-scissor-blade-top">
                          <circle cx="5.5" cy="6.5" r="3.6" stroke="#d97706" strokeWidth="2.2" fill="#fffbeb" />
                          <path d="M8.8 8.5L26 15.5L24.5 17.2L8.2 10.5Z" fill="#d97706" />
                        </g>
                        <g className="animate-scissor-blade-bottom">
                          <circle cx="5.5" cy="17.5" r="3.6" stroke="#d97706" strokeWidth="2.2" fill="#fffbeb" />
                          <path d="M8.8 15.5L26 8.5L24.5 6.8L8.2 13.5Z" fill="#f59e0b" />
                        </g>
                        <circle cx="11.5" cy="12" r="1.5" fill="#78350f" />
                      </svg>
                    </div>
                  </>
                )}
                <Scissors className="w-2.5 h-2.5 text-amber-600" />
                <span>CUT CAREFULLY WITH SCISSORS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post-Animation Scissor Cut Instruction Banner */}
        {isFeeding ? (
          <div className="mt-1.5 text-[10px] text-zinc-600 text-center flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-2xs">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-700" />
            <span>Feeding thermal photo receipt — please wait until printing stops...</span>
          </div>
        ) : (
          <div className="mt-1.5 w-full max-w-xs bg-amber-50 border border-amber-300 rounded-2xl px-3 py-1.5 shadow-xs flex items-center gap-2.5 text-left animate-fadeIn">
            {/* Mini Looping Receipt + Snipping Scissors Badge */}
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs relative overflow-hidden">
              {/* Mini receipt strip inside badge */}
              <div className="w-4 h-6 bg-white/95 rounded-[2px] flex flex-col items-center justify-between p-0.5 shadow-2xs animate-receipt-sever">
                <div className="w-full h-2.5 bg-zinc-800/80 rounded-[1px]" />
                <div className="w-full border-t border-dashed border-amber-500" />
                <div className="w-2.5 h-0.5 bg-zinc-400 rounded-full" />
              </div>
              {/* Looping snipping blades across mini receipt */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg
                  width="26"
                  height="22"
                  viewBox="0 0 28 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow"
                >
                  <g className="animate-scissor-blade-top">
                    <circle cx="5.5" cy="6.5" r="3.5" stroke="#ffffff" strokeWidth="2" fill="#b45309" />
                    <path d="M8.8 8.5L25 15L23.5 16.8L8.2 10.5Z" fill="#ffffff" />
                  </g>
                  <g className="animate-scissor-blade-bottom">
                    <circle cx="5.5" cy="17.5" r="3.5" stroke="#ffffff" strokeWidth="2" fill="#b45309" />
                    <path d="M8.8 15.5L25 9L23.5 7.2L8.2 13.5Z" fill="#fef3c7" />
                  </g>
                  <circle cx="11.5" cy="12" r="1.5" fill="#78350f" />
                </svg>
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-extrabold text-amber-950">
                Use scissors carefully to cut your thermal photo receipt
              </div>
              <div className="text-[9.5px] text-amber-800 mt-0.5">
                Printed ({activeCopiesCount}x) • Cut gently along the dashed line
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-1.5 max-w-xs pt-0.5 shrink-0">
        {/* Button 1: Show Offline QR Code & Quick Share */}
        <button
          onClick={() => {
            soundEffects.playTap();
            setQuickShareStatus(null);
            setShowQrModal(true);
          }}
          className="w-full py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Offline QR & Quick Share to Phone</span>
        </button>

        {/* Button 2: Send to Email */}
        <button
          onClick={() => {
            soundEffects.playTap();
            setEmailSentStatus(null);
            setShowEmailModal(true);
          }}
          className="w-full py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5 text-zinc-600" />
          <span>Send to Email (Color & GIF)</span>
        </button>

        {/* Button 3: Save Digital & GIF */}
        <button
          onClick={() => {
            soundEffects.playTap();
            onOpenMobileShareModal();
          }}
          className="w-full py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
          <span>Save Digital & Motion GIF</span>
        </button>

        {/* Button 4: Print Another Copy (Free in Free Play Mode, or Single-Use Voucher in Paid Mode) */}
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
            {isPrinting
              ? 'Printing Copy...'
              : config.freePlayMode
              ? 'Print Another Copy (Free)'
              : 'Print Another Copy'}
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

      {/* Modal 1: Offline QR Code & Quick Share Hub Modal */}
      {showQrModal && (
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

            {/* Quick Email Send Form inside QR Modal (Auto-queues when offline) */}
            <div className="w-full pt-2 border-t border-zinc-100 text-left mb-2.5">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                Or queue email delivery (sends automatically when online):
              </label>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@example.com"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-black bg-zinc-50"
                />
                <button
                  disabled={isSendingEmail || !emailInput.includes('@')}
                  onClick={() => handleSendEmail(emailInput)}
                  className="px-3 py-1.5 rounded-xl bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </div>

              {/* Status Message */}
              {emailSentStatus && (
                <div className="mt-2 text-[11px] text-emerald-600 bg-emerald-50 rounded-lg p-1.5 flex items-center gap-1.5 border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{emailSentStatus}</span>
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

      {/* Modal 2: Dedicated Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col items-center text-center">
            <div className="w-full flex justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-2">
              <Mail className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-zinc-950 mb-1">
              Email Full-Color Photos & GIF
            </h3>
            <p className="text-xs text-zinc-500 mb-3 max-w-xs leading-relaxed">
              We'll send your high-resolution color photostrip and animated motion reel directly to your inbox.
            </p>

            {/* Thumbnail of color keepsake strip */}
            <div className="w-24 h-32 rounded-lg overflow-hidden border border-zinc-200 shadow-sm mb-3 bg-zinc-50 flex items-center justify-center">
              <img
                src={result.compositeDataUrl}
                alt="Color Photostrip"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Email Input Field */}
            <div className="w-full space-y-2 mb-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black text-xs text-zinc-900 bg-zinc-50"
              />

              {/* Fast Kiosk Domain Helper Buttons */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px]">
                {['@gmail.com', '@yahoo.com', '@icloud.com', '@outlook.com'].map((domain) => (
                  <button
                    key={domain}
                    onClick={() => appendDomain(domain)}
                    className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono transition cursor-pointer"
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {emailSentStatus && (
              <div className="w-full mb-3 text-xs text-emerald-700 bg-emerald-50 rounded-xl p-2.5 flex items-center gap-2 border border-emerald-200 text-left">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{emailSentStatus}</span>
              </div>
            )}

            <button
              disabled={isSendingEmail || !emailInput.includes('@')}
              onClick={() => handleSendEmail(emailInput)}
              className="w-full py-3 rounded-full bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-2 cursor-pointer mb-2"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending photos...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Photos & Motion GIF</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowEmailModal(false)}
              className="text-xs text-zinc-400 hover:text-zinc-700 py-1"
            >
              Close
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
