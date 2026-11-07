/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Camera,
  Minus,
  Plus,
  Ticket,
} from 'lucide-react';
import { FrameLayoutType, FrameTheme, PhotoFilterType } from '../types';
import { soundEffects } from '../services/soundEffects';
import { cameraStreamService } from '../services/cameraStreamService';
import { safeStorageGet } from '../services/storage';
import { enterBrowserFullscreenApi } from './KioskNavBar';

interface FrameSelectorProps {
  selectedLayout: FrameLayoutType;
  onSelectLayout: (layout: FrameLayoutType) => void;
  selectedTheme: FrameTheme;
  onSelectTheme: (theme: FrameTheme) => void;
  selectedFilter: PhotoFilterType;
  onSelectFilter: (filter: PhotoFilterType) => void;
  copies: number;
  onSelectCopies: (copies: number) => void;
  layoutPrices?: Record<FrameLayoutType, number>;
  lockedLayout?: FrameLayoutType;
  voucherCode?: string;
  onContinue: () => void;
  onBack: () => void;
  onSecretAdminTap?: () => void;
}

interface LayoutItemConfig {
  id: FrameLayoutType;
  title: string;
  shots: number;
  subtitle: string;
  price: number;
  type: 'polaroid' | 'strip2' | 'strip3' | 'strip4';
}

const LAYOUTS: LayoutItemConfig[] = [
  {
    id: 'single_polaroid',
    title: 'Polaroid',
    shots: 1,
    subtitle: 'Classic vibes ♡',
    price: 20,
    type: 'polaroid',
  },
  {
    id: 'grid_4',
    title: 'Grid (2 shots)',
    shots: 2,
    subtitle: 'Two moments, more fun ♡',
    price: 25,
    type: 'strip2',
  },
  {
    id: 'strip_3',
    title: 'Grid (3 shots)',
    shots: 3,
    subtitle: 'More smiles, please! ♡',
    price: 30,
    type: 'strip3',
  },
  {
    id: 'strip_4',
    title: '4-Cut Strip',
    shots: 4,
    subtitle: 'More friends, more memories ♡',
    price: 40,
    type: 'strip4',
  },
];

const MiniLiveVideo: React.FC<{
  stream: MediaStream | null;
  facingMode: 'user' | 'environment';
  className?: string;
}> = ({ stream, facingMode, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className={`w-full h-full bg-sky-50 flex items-center justify-center text-sky-500 overflow-hidden ${className}`}>
        <Camera className="w-2.5 h-2.5 opacity-60" />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover pointer-events-none select-none ${
        facingMode === 'user' ? 'scale-x-[-1]' : ''
      } ${className}`}
    />
  );
};

export const FrameSelector: React.FC<FrameSelectorProps> = ({
  selectedLayout,
  onSelectLayout,
  layoutPrices,
  lockedLayout,
  voucherCode,
  onContinue,
  onBack,
  onSecretAdminTap,
}) => {
  const [facingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(() =>
    cameraStreamService.getCachedStream('user')
  );
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);

  // Attach persistent camera stream (keeps stream alive across screens without stopping tracks)
  useEffect(() => {
    let isMounted = true;

    const cached = cameraStreamService.getCachedStream(facingMode);
    if (cached) {
      setCameraStream(cached);
      return;
    }

    cameraStreamService
      .getOrStartStream(facingMode)
      .then((stream) => {
        if (!isMounted) return;
        if (stream) {
          setCameraStream(stream);
        }
        if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
          enterBrowserFullscreenApi();
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [facingMode]);

  const handleContinue = () => {
    soundEffects.playTap();
    if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
      enterBrowserFullscreenApi();
    }
    onContinue();
  };

  const handleBack = () => {
    soundEffects.playTap();
    if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
      enterBrowserFullscreenApi();
    }
    onBack();
  };

  const getPriceForLayout = (opt: LayoutItemConfig): number => {
    const custom = layoutPrices?.[opt.id];
    return typeof custom === 'number' && !Number.isNaN(custom) ? custom : opt.price;
  };

  const currentOption = LAYOUTS.find((l) => l.id === selectedLayout) || LAYOUTS[2];
  const currentUnitPrice = getPriceForLayout(currentOption);
  const totalPrice = currentUnitPrice;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col justify-between p-3 sm:p-5 max-w-xl mx-auto w-full select-none text-zinc-900 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-800 transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-zinc-400 text-sm">♡</span>
        </div>

        {/* Center Brand Icon (4-tap secret Admin unlock) */}
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
          className="w-7 h-7 rounded bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer"
        >
          J
        </button>

        {/* Right Note */}
        <div className="text-right text-[11px] font-serif italic text-zinc-500 leading-tight">
          Same Moments<br />Brighter Days ♡
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center mb-2 shrink-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">
          Pick your layout
        </h1>
        <p className="text-xs text-zinc-500">
          Choose how you want to capture your memories ♡
        </p>
      </div>

      {/* 2x2 Layout Grid fit within viewport without vertical scrolling */}
      <div className="grid grid-cols-2 gap-2.5 my-auto shrink-0">
        {LAYOUTS.map((opt) => {
          const isSelected = selectedLayout === opt.id;
          const isLockedOut = Boolean(lockedLayout && lockedLayout !== opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => {
                soundEffects.playTap();
                if (isLockedOut) {
                  const lockedObj = LAYOUTS.find((l) => l.id === lockedLayout);
                  setLockedNotice(
                    `Your voucher (${voucherCode || 'Active'}) is for ${
                      lockedObj?.title || 'another layout'
                    } (${lockedObj?.shots || 1}-Shot).`
                  );
                  return;
                }
                setLockedNotice(null);
                onSelectLayout(opt.id);
              }}
              className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between cursor-pointer ${
                isSelected
                  ? 'border-zinc-950 bg-white ring-2 ring-zinc-950/10 shadow-sm'
                  : isLockedOut
                  ? 'border-zinc-200 bg-zinc-50/70 opacity-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 shadow-2xs'
              }`}
            >
              {/* Top Row: Price badge and Checkmark */}
              <div className="w-full flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-zinc-500">
                  P{getPriceForLayout(opt)}
                </span>
                {isSelected ? (
                  <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-300">♡</span>
                )}
              </div>

              {/* Layout Graphic with LIVE CAMERA PREVIEWS inside slots */}
              <div className="my-1.5 flex items-center justify-center h-16 sm:h-18 w-full relative">
                <span className="absolute left-2 top-0.5 text-[9px] text-zinc-300">♡</span>
                <span className="absolute right-2 bottom-0.5 text-[9px] text-zinc-300">✧</span>

                {opt.type === 'polaroid' && (
                  <div className="w-12 h-15 bg-white border border-zinc-200 rounded-sm shadow-xs flex flex-col items-center pt-1 px-1 pb-1">
                    <div className="w-9 h-9 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <span className="text-[6px] font-mono text-zinc-400 mt-0.5">polaroid</span>
                  </div>
                )}

                {opt.type === 'strip2' && (
                  <div className="w-11 h-15 bg-white border border-zinc-200 rounded-xs shadow-xs flex flex-col items-center justify-between py-1 px-1 gap-0.5">
                    <div className="w-8 h-5.5 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-8 h-5.5 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                  </div>
                )}

                {opt.type === 'strip3' && (
                  <div className="w-10 h-16 bg-white border border-zinc-200 rounded-xs shadow-xs flex flex-col items-center justify-between py-0.5 px-1 gap-0.5">
                    <div className="w-7 h-4 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-7 h-4 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-7 h-4 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                  </div>
                )}

                {opt.type === 'strip4' && (
                  <div className="w-13 h-15 bg-white border border-zinc-200 rounded-xs shadow-xs grid grid-cols-2 items-center justify-items-center p-1 gap-0.5">
                    <div className="w-5 h-6 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-5 h-6 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-5 h-6 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                    <div className="w-5 h-6 bg-zinc-100 rounded-xs overflow-hidden border border-zinc-200/80">
                      <MiniLiveVideo stream={cameraStream} facingMode={facingMode} />
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div>
                <div className="font-semibold text-xs sm:text-sm text-zinc-900 leading-tight">
                  {opt.title}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {opt.shots} {opt.shots === 1 ? 'photo' : 'photos'}
                </div>
                <div className="text-[10px] text-zinc-500 font-serif italic">
                  {opt.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Controls */}
      <div className="space-y-2 pt-1 shrink-0">
        {lockedNotice && (
          <div className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1">
            {lockedNotice}
          </div>
        )}

        {/* 1 Voucher = 1 Print Copy Info Pill */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-700 font-semibold">
            <Ticket className="w-3.5 h-3.5 text-zinc-700" />
            <span>1 Voucher = 1 Print Copy • P{totalPrice}</span>
          </span>
        </div>

        {/* Big Black Pill Button */}
        <button
          onClick={handleContinue}
          className="w-full py-3.5 rounded-full bg-black hover:bg-zinc-800 text-white font-medium text-sm tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>
            Continue (1 Print Copy) • P{totalPrice}
          </span>
        </button>

        {/* Subactions: Cancel & Buy Voucher */}
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
          <button
            onClick={handleBack}
            className="hover:text-zinc-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <span>•</span>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 hover:text-zinc-900 transition cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Buy a voucher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
