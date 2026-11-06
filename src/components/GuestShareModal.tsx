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
  WifiOff,
} from 'lucide-react';
import { PhotostripResult } from '../types';
import { soundEffects } from '../services/soundEffects';
import { emailDeliveryService } from '../services/email';
import {
  shareOfflineViaQuickShare,
  upscaleToIosCompatibleJpeg,
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
    result.compositeDataUrl && result.compositeDataUrl.length > 45000
  );

  const [activeTab, setActiveTab] = useState<'strip' | 'gif' | 'email' | 'thermal' | 'individual'>('strip');
  const [gifFrameIndex, setGifFrameIndex] = useState(0);
  // Do NOT initialize with the tiny raw QR thumbnail; wait for HD vector reconstruction or Full-HD stream
  const [iosReadyJpegUrl, setIosReadyJpegUrl] = useState<string>(
    isAlreadyFullHd ? result.compositeDataUrl : ''
  );
  const [thermalReadyUrl, setThermalReadyUrl] = useState<string>(
    isAlreadyFullHd ? result.thermalRasterDataUrl || result.compositeDataUrl : ''
  );
  const [hdPhotos, setHdPhotos] = useState<string[]>(isAlreadyFullHd ? result.photos : []);
  const [isHdSynced, setIsHdSynced] = useState<boolean>(isAlreadyFullHd);
  const [syncProgress, setSyncProgress] = useState<number>(isAlreadyFullHd ? 100 : 12);

  // Email form states
  const [emailInput, setEmailInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [quickShareMsg, setQuickShareMsg] = useState<string | null>(null);

  const isIos = isIosDevice();

  // 1. Reconstruct 100% HD Vector Frame (768x1152 / 768x1824) locally on the phone, AND
  // 2. Simultaneously stream the 100% uncompressed original Full-HD photo from the Galaxy Tab A11!
  React.useEffect(() => {
    let cancelled = false;
    let hdArrived = isAlreadyFullHd;

    reconstructVectorHdPhotostripOnPhone(result)
      .then((reconstructed) => {
        if (!cancelled && !hdArrived) {
          setIosReadyJpegUrl(reconstructed.colorStripJpegUrl);
          setThermalReadyUrl(reconstructed.thermalStripPngUrl);
          setHdPhotos(reconstructed.individualPhotos);
        }
      })
      .catch(() => {});

    if (!isAlreadyFullHd) {
      const stopPeerFetch = fetchFullHdFromTabletPeer(
        result.id,
        async (hdUpdate) => {
          if (cancelled) return;
          hdArrived = true;
          if (hdUpdate.compositeDataUrl) {
            const crispJpeg = await upscaleToIosCompatibleJpeg(hdUpdate.compositeDataUrl);
            if (!cancelled) {
              setIosReadyJpegUrl(crispJpeg);
              setIsHdSynced(true);
              setSyncProgress(100);
            }
          }
          if (hdUpdate.thermalRasterDataUrl && !cancelled) {
            setThermalReadyUrl(hdUpdate.thermalRasterDataUrl);
          }
          if (hdUpdate.photos && hdUpdate.photos.length > 0 && !cancelled) {
            setHdPhotos(hdUpdate.photos);
          }
        },
        (pct) => {
          if (!cancelled && !hdArrived) {
            setSyncProgress((prev) => Math.max(prev, pct));
          }
        }
      );

      return () => {
        cancelled = true;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                <span>Your Photo Strip</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono">
                  {isHdSynced ? (
                    <>
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>ORIGINAL FULL HD</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" />
                      <span>HD VECTOR READY</span>
                    </>
                  )}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400">Save directly to iPhone Photos or Android Gallery</div>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="p-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
          {activeTab === 'strip' && (
            <div className="flex flex-col items-center w-full">
              {!isHdSynced && syncProgress < 100 && (
                <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-sky-950/70 border border-sky-800/70 flex items-center justify-between text-[10px] text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Streaming Original Full-HD from Booth...</span>
                  </span>
                  <span className="font-mono font-bold">{syncProgress}%</span>
                </div>
              )}

              <div className="rounded-lg overflow-hidden shadow-lg border border-zinc-800 mb-2 max-h-[44vh] bg-white flex items-center justify-center min-h-[220px] min-w-[160px]">
                {iosReadyJpegUrl ? (
                  <img
                    src={iosReadyJpegUrl}
                    alt="Photostrip"
                    className="max-h-[42vh] w-auto object-contain select-auto pointer-events-auto"
                  />
                ) : (
                  <div className="p-6 flex flex-col items-center gap-2 text-zinc-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    <span>Rendering HD Photostrip...</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-amber-300 font-medium mb-2.5 text-center">
                📱 <strong>iPhone / iOS Tip:</strong> Tap the green button below and select <strong>&quot;Save Image&quot;</strong>, or <strong>Press &amp; Hold the photo above</strong> and tap <strong>&quot;Save to Photos&quot;</strong>!
              </p>

              <div className="w-full space-y-2">
                <button
                  disabled={!iosReadyJpegUrl}
                  onClick={async () => {
                    soundEffects.playTap();
                    const res = await shareOfflineViaQuickShare({
                      ...result,
                      compositeDataUrl: iosReadyJpegUrl,
                      photos: hdPhotos,
                    });
                    if (res.message) {
                      setQuickShareMsg(res.message);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-white" />
                  <span>{isIos ? 'Save to iPhone Photos (Camera Roll)' : 'Save / Quick Share Photo'}</span>
                </button>
                <button
                  disabled={!iosReadyJpegUrl}
                  onClick={() => downloadImage(iosReadyJpegUrl, `GobbleHaus-Photostrip-${result.id}.jpg`)}
                  className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Download Photostrip (.JPG)</span>
                </button>
                {quickShareMsg && (
                  <div className="text-[11px] text-emerald-400 text-center pt-0.5">
                    {quickShareMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gif' && (
            <div className="flex flex-col items-center w-full">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-sky-400/30 mb-3 w-full max-w-[280px] aspect-4/3 bg-slate-950 flex items-center justify-center">
                {hdPhotos[gifFrameIndex] && (
                  <img
                    src={hdPhotos[gifFrameIndex]}
                    alt={`Frame ${gifFrameIndex + 1}`}
                    className="w-full h-full object-cover select-auto"
                  />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[9px] font-mono text-sky-300 border border-sky-300/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ANIMATED REEL ({gifFrameIndex + 1}/{Math.max(1, hdPhotos.length)})</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-3 text-center">
                Live looping motion GIF created from your booth poses
              </p>
              <button
                onClick={() => downloadImage(hdPhotos[gifFrameIndex] || iosReadyJpegUrl, `motion_frame_${result.id}.jpg`)}
                className="w-full py-2.5 rounded-xl bg-sky-300 hover:bg-sky-200 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-sky-300/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Save Motion Reel Frame</span>
              </button>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="flex flex-col items-center w-full text-center py-2">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-sky-400 flex items-center justify-center mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                Email Photos &amp; Motion GIF
              </h4>
              <p className="text-xs text-zinc-400 mb-4 max-w-xs leading-relaxed">
                Send your full-color keepsake photostrip and animated GIF directly to your email address.
              </p>

              <div className="w-full space-y-2 mb-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 text-xs focus:outline-none focus:border-sky-400"
                />

                <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px]">
                  {['@gmail.com', '@yahoo.com', '@icloud.com'].map((domain) => (
                    <button
                      key={domain}
                      onClick={() => {
                        const prefix = emailInput.split('@')[0] || '';
                        setEmailInput(`${prefix}${domain}`);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              </div>

              {sentMessage && (
                <div className="w-full mb-3 text-xs text-emerald-400 bg-emerald-950/60 rounded-xl p-2.5 flex items-center gap-2 border border-emerald-800 text-left">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sentMessage}</span>
                </div>
              )}

              <button
                disabled={isSending || !emailInput.includes('@')}
                onClick={handleSendEmail}
                className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to My Inbox</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'thermal' && (
            <div className="flex flex-col items-center w-full">
              <div className="rounded-lg overflow-hidden shadow-lg border border-zinc-800 mb-3 max-h-[46vh] bg-white">
                {thermalReadyUrl && (
                  <img
                    src={thermalReadyUrl}
                    alt="Thermal Slip"
                    className="max-h-[44vh] w-auto object-contain select-auto"
                  />
                )}
              </div>
              <p className="text-[10px] text-zinc-400 mb-3 text-center">
                Clean monochrome thermal receipt copy
              </p>
              <button
                onClick={() =>
                  downloadImage(thermalReadyUrl, `thermal_${result.id}.jpg`)
                }
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-950" />
                <span>Save Thermal Receipt (.JPG)</span>
              </button>
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="w-full space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {hdPhotos.map((src, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                    <img src={src} alt={`Shot ${i + 1}`} className="w-full aspect-[4/3] object-cover select-auto" />
                    <button
                      onClick={() => downloadImage(src, `shot_${i + 1}_${result.id}.jpg`)}
                      className="absolute bottom-1 right-1 p-1 rounded bg-black/80 text-white hover:bg-zinc-800 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>#{i + 1}</span>
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
