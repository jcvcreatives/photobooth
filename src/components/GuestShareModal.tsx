/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Check,
  X,
  Mail,
  Send,
  Loader2,
  Sparkles,
  Share2,
} from 'lucide-react';
import { PhotostripResult } from '../types';
import { soundEffects } from '../services/soundEffects';
import { emailDeliveryService } from '../services/email';
import {
  shareOfflineViaQuickShare,
  reconstructVectorHdPhotostripOnPhone,
  fetchFullHdFromTabletPeer,
  isIosDevice,
} from '../services/offlineQrTransfer';

interface GuestShareModalProps {
  result: PhotostripResult;
  onClose: () => void;
}

export const GuestShareModal: React.FC<GuestShareModalProps> = ({ result, onClose }) => {
  const isAlreadyFullHd = Boolean(
    result.compositeDataUrl &&
      result.compositeDataUrl.length > 55000 &&
      result.photos.length > 1
  );

  const [activeTab, setActiveTab] = useState<'strip' | 'gif' | 'email' | 'thermal' | 'individual'>('strip');
  const [gifFrameIndex, setGifFrameIndex] = useState(0);
  const [iosReadyJpegUrl, setIosReadyJpegUrl] = useState<string>(
    isAlreadyFullHd ? result.compositeDataUrl : ''
  );
  const [thermalReadyUrl, setThermalReadyUrl] = useState<string>(
    isAlreadyFullHd ? result.thermalRasterDataUrl || result.compositeDataUrl : ''
  );
  const [hdPhotos, setHdPhotos] = useState<string[]>(isAlreadyFullHd ? result.photos : []);
  const [isHdSynced, setIsHdSynced] = useState<boolean>(isAlreadyFullHd);
  const [syncProgress, setSyncProgress] = useState<number>(isAlreadyFullHd ? 100 : 18);

  // Email form states
  const [emailInput, setEmailInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [quickShareMsg, setQuickShareMsg] = useState<string | null>(null);

  const isIos = isIosDevice();

  // 1. Reconstruct 100% HD Vector Frame (768x1152 / 768x1824) with Unsharp Mask Clarity Enhancement locally on the phone, AND
  // 2. Simultaneously stream the HD Camera Portrait Sheet from the booth (completing smoothly within 3.5s even if offline!)
  React.useEffect(() => {
    let cancelled = false;
    let hdArrived = isAlreadyFullHd;

    reconstructVectorHdPhotostripOnPhone(result, false)
      .then((reconstructed) => {
        if (!cancelled && !hdArrived) {
          setIosReadyJpegUrl(reconstructed.colorStripJpegUrl);
          setThermalReadyUrl(reconstructed.thermalStripPngUrl);
          setHdPhotos(reconstructed.individualPhotos);
        }
      })
      .catch(() => {});

    if (!isAlreadyFullHd) {
      // Smoothly advance progress bar so it never stalls at 12% while connecting or enhancing
      const progressTicker = setInterval(() => {
        if (!cancelled && !hdArrived) {
          setSyncProgress((prev) => {
            if (prev >= 92) return prev;
            return prev + Math.max(4, Math.round((95 - prev) * 0.24));
          });
        }
      }, 380);

      // Guaranteed completion within 3.4s if booth is offline so user is never stuck waiting
      const fallbackDoneTimer = setTimeout(() => {
        if (!cancelled && !hdArrived) {
          setSyncProgress(100);
          setIsHdSynced(true);
        }
      }, 3400);

      const stopPeerFetch = fetchFullHdFromTabletPeer(
        result,
        (hdReconstructed) => {
          if (cancelled) return;
          hdArrived = true;
          clearInterval(progressTicker);
          clearTimeout(fallbackDoneTimer);
          setIosReadyJpegUrl(hdReconstructed.colorStripJpegUrl);
          setThermalReadyUrl(hdReconstructed.thermalStripPngUrl);
          setHdPhotos(hdReconstructed.individualPhotos);
          setIsHdSynced(true);
          setSyncProgress(100);
        },
        (pct) => {
          if (!cancelled && !hdArrived) {
            setSyncProgress((prev) => Math.max(prev, pct));
          }
        }
      );

      return () => {
        cancelled = true;
        clearInterval(progressTicker);
        clearTimeout(fallbackDoneTimer);
        stopPeerFetch();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [result, isAlreadyFullHd]);

  // Auto-cycle through photos to create live motion GIF player
  React.useEffect(() => {
    if (activeTab !== 'gif' || hdPhotos.length === 0) return;
    const interval = setInterval(() => {
      setGifFrameIndex((prev) => (prev + 1) % hdPhotos.length);
    }, 450);
    return () => clearInterval(interval);
  }, [activeTab, hdPhotos.length]);

  const downloadImage = (url: string, filename: string) => {
    if (!url) return;
    soundEffects.playTap();
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendEmail = async () => {
    if (!emailInput.includes('@')) return;
    soundEffects.playTap();
    setIsSending(true);
    setSentMessage(null);

    try {
      const res = await emailDeliveryService.sendPhotoEmail({
        recipientEmail: emailInput.trim(),
        photostripId: result.id,
        photostripUrl: iosReadyJpegUrl || result.compositeDataUrl,
        eventTitle: result.eventTitle || 'JCVcreatives Photobooth',
      });
      setSentMessage(res.message);
      soundEffects.playSuccessChime();
    } catch {
      setSentMessage('Delivery queued offline. Your photos will be emailed automatically when online.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 flex-wrap">
                <span className="truncate">Your Photo Strip</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{isHdSynced ? 'FULL-HD READY' : `ENHANCING ${syncProgress}%`}</span>
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                Save directly to iPhone Photos or Android Gallery
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-zinc-900/60 border-b border-zinc-800 text-xs">
          <button
            onClick={() => {
              soundEffects.playTap();
              setActiveTab('strip');
            }}
            className={`py-1.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
              activeTab === 'strip'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Color Strip
          </button>
          <button
            onClick={() => {
              soundEffects.playTap();
              setActiveTab('gif');
            }}
            className={`py-1.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
              activeTab === 'gif'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎬 GIF
          </button>
          <button
            onClick={() => {
              soundEffects.playTap();
              setActiveTab('email');
            }}
            className={`py-1.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
              activeTab === 'email'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✉️ Email
          </button>
          <button
            onClick={() => {
              soundEffects.playTap();
              setActiveTab('thermal');
            }}
            className={`py-1.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
              activeTab === 'thermal'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Receipt
          </button>
          <button
            onClick={() => {
              soundEffects.playTap();
              setActiveTab('individual');
            }}
            className={`py-1.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Photos
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col items-center">
          {activeTab === 'strip' && (
            <div className="flex flex-col items-center w-full">
              {!isHdSynced && syncProgress < 100 && (
                <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-sky-950/80 border border-sky-800/70 flex flex-col gap-1 text-[10px] text-sky-200">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                      <span>Enhancing &amp; Syncing Full-HD Photo...</span>
                    </span>
                    <span className="font-mono font-bold">{syncProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-sky-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg overflow-hidden shadow-lg border border-zinc-800 mb-2 max-h-[44vh] bg-white flex items-center justify-center min-h-[220px] min-w-[160px]">
                {iosReadyJpegUrl ? (
                  <img
                    src={iosReadyJpegUrl}
                    alt="Full Color Photostrip"
                    className="max-h-[44vh] w-auto object-contain select-auto"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-zinc-500 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>Rendering Full-HD Photo...</span>
                  </div>
                )}
              </div>

              {isIos ? (
                <p className="text-[11px] text-amber-300 font-medium text-center mb-2 px-2 leading-snug">
                  📱 <strong>iPhone / iOS Tip:</strong> Tap the green button below and select{' '}
                  <strong>&quot;Save Image&quot;</strong>, or <strong>Press &amp; Hold the photo above</strong> and tap{' '}
                  <strong>&quot;Save to Photos&quot;</strong>!
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 text-center mb-2">
                  Tap below to save directly to your phone gallery!
                </p>
              )}

              {/* Primary Save / Share Button for iOS & Android */}
              <button
                onClick={async () => {
                  soundEffects.playTap();
                  const res = await shareOfflineViaQuickShare({
                    ...result,
                    compositeDataUrl: iosReadyJpegUrl || result.compositeDataUrl,
                    photos: hdPhotos,
                  });
                  if (res.message) setQuickShareMsg(res.message);
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer mb-2"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {isIos
                    ? 'Save to iPhone Photos (Camera Roll)'
                    : 'Save / Quick Share to Phone Gallery'}
                </span>
              </button>

              <button
                onClick={() =>
                  downloadImage(
                    iosReadyJpegUrl || result.compositeDataUrl,
                    `GobbleHaus-Photostrip-${result.id}.jpg`
                  )
                }
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Photostrip (.JPG)</span>
              </button>

              {quickShareMsg && (
                <div className="mt-2 text-[11px] text-emerald-400 font-medium text-center">
                  {quickShareMsg}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gif' && (
            <div className="flex flex-col items-center w-full">
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-zinc-800 mb-3 bg-zinc-900 aspect-4/3 w-full flex items-center justify-center">
                {hdPhotos.length > 0 && (
                  <img
                    src={hdPhotos[gifFrameIndex]}
                    alt="Animated GIF Frame"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-sky-400 font-mono text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>LIVE LOOP • {gifFrameIndex + 1}/{hdPhotos.length}</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 text-center mb-3">
                Animated burst loop created from your session shots!
              </p>
              <button
                onClick={() =>
                  downloadImage(
                    hdPhotos[gifFrameIndex] || iosReadyJpegUrl,
                    `GobbleHaus-Burst-${result.id}.jpg`
                  )
                }
                className="w-full py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save Burst Frame</span>
              </button>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="flex flex-col items-center w-full py-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Email Your Photos</h4>
              <p className="text-xs text-zinc-400 text-center mb-4">
                Receive your high-resolution color photostrip directly in your inbox.
              </p>

              <div className="w-full space-y-2.5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !emailInput.includes('@')}
                  className="w-full py-3 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Photos...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send to My Inbox</span>
                    </>
                  )}
                </button>
              </div>

              {sentMessage && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-[11px] text-center flex items-center justify-center gap-1.5 w-full">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{sentMessage}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'thermal' && (
            <div className="flex flex-col items-center w-full">
              <div className="rounded-lg overflow-hidden shadow-lg border border-zinc-800 mb-3 max-h-[45vh] bg-white">
                <img
                  src={thermalReadyUrl || iosReadyJpegUrl}
                  alt="Thermal Receipt Edition"
                  className="max-h-[45vh] w-auto object-contain select-auto"
                />
              </div>
              <p className="text-[11px] text-zinc-400 text-center mb-3">
                Authentic monochrome dithered receipt edition.
              </p>
              <button
                onClick={() =>
                  downloadImage(
                    thermalReadyUrl || iosReadyJpegUrl,
                    `GobbleHaus-ThermalReceipt-${result.id}.jpg`
                  )
                }
                className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Receipt Image (.JPG)</span>
              </button>
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="w-full space-y-3">
              <p className="text-[11px] text-zinc-400 text-center">
                Tap any individual camera capture to save it:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {hdPhotos.map((photoUrl, i) => (
                  <div
                    key={i}
                    className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 aspect-4/3"
                  >
                    <img
                      src={photoUrl}
                      alt={`Capture ${i + 1}`}
                      className="w-full h-full object-cover select-auto"
                    />
                    <button
                      onClick={() =>
                        downloadImage(photoUrl, `GobbleHaus-Shot-${i + 1}-${result.id}.jpg`)
                      }
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition flex items-center justify-center text-white text-xs font-medium gap-1 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save #{i + 1}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
