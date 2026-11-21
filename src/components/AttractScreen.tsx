/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Printer, QrCode, Sparkles } from 'lucide-react';
import { RemoteKioskConfig } from '../types';
import { soundEffects } from '../services/soundEffects';
import { storageService, safeStorageGet } from '../services/storage';
import { enduranceManager } from '../services/enduranceManager';
import { EMBEDDED_DEFAULT_BOOTH_SAMPLES } from '../services/defaultSamplePhotos';
import {
  AttractOccasionId,
  AnimatedStickerItem,
  getActiveAttractThemeId,
  getAttractThemeById,
} from '../services/attractThemes';

interface AttractScreenProps {
  config: RemoteKioskConfig;
  onStartSession: () => void;
  onSecretAdminTap: () => void;
}

// Built-in studio booth sample photos (IMG_3042 + IMG_3043 in Strip 1, IMG_3044 in Strip 2, IMG_3045 + IMG_3046 in Strip 3)
export const DEFAULT_BOOTH_SAMPLES: string[] = EMBEDDED_DEFAULT_BOOTH_SAMPLES;

export const sanitizeStoredAttractPhotos = (photos: unknown): string[] => {
  if (!Array.isArray(photos)) return [];
  return photos.filter(
    (p): p is string =>
      typeof p === 'string' &&
      p.trim().length > 0 &&
      !p.includes('ScreenRecording_10-21-2026') &&
      !p.includes('images.unsplash.com')
  );
};

export const resolveStickerAssetUrl = (url: string): string => {
  if (!url) return '';
  // Never append query strings (?v=...) because Android WebView AssetManager (file:///android_asset/)
  // fails to resolve local APK file assets when a query parameter is attached.
  const cleanUrl = url.split('?')[0];
  if (cleanUrl.startsWith('/')) {
    return `.${cleanUrl}`;
  }
  return cleanUrl;
};

/**
 * Memoized GPU-accelerated Animated Stickers Layer.
 * Uses data-js-sticker attributes driven by a 60fps requestAnimationFrame loop in AttractScreen
 * so animations run smoothly in Android .APK WebView even when Android Battery Saver or
 * ANIMATOR_DURATION_SCALE disables CSS @keyframes.
 */
const AnimatedThemeStickers = React.memo(
  ({
    stickers,
    opacityClass,
  }: {
    stickers: AnimatedStickerItem[];
    opacityClass: string;
  }) => {
    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 select-none ${opacityClass}`}
      >
        {stickers.map((item, idx) => {
          const delayMs = item.delayMs ?? idx * 450;
          const durationMs = item.durationMs ?? 5800;

          // 0. Custom Die-Cut Image Sticker (e.g. Gobble Haus Rice Box Stickers dropping & bouncing)
          if (item.imageUrl) {
            return (
              <div
                key={item.id}
                data-js-sticker="1"
                data-anim={item.animation}
                data-delay={delayMs}
                data-duration={durationMs}
                style={{ animation: 'none', willChange: 'transform, opacity' }}
                className={`absolute ${item.positionClass} ${item.sizeClass} flex items-center justify-center`}
              >
                <img
                  src={resolveStickerAssetUrl(item.imageUrl)}
                  alt={item.label || 'Sticker'}
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1';
                      const fileName = (item.imageUrl || '').split('?')[0].split('/').pop() || '';
                      img.src = `./assets/aistudio/${fileName}`;
                    }
                  }}
                  className="w-full h-full object-contain bg-transparent"
                />
              </div>
            );
          }

          // 1. Special Composite Sticker: Spinning & Shining Disco Ball with Radiant Light Rays
          if (item.animation === 'disco_ball_shine') {
            return (
              <div
                key={item.id}
                data-js-sticker="1"
                data-anim="disco_ball_shine"
                data-delay={delayMs}
                data-duration={durationMs}
                style={{ animation: 'none', willChange: 'transform' }}
                className={`absolute ${item.positionClass} flex items-center justify-center bg-transparent`}
              >
                <span className="absolute -top-3 -right-3 text-xs sm:text-sm text-amber-300">
                  ✨
                </span>
                <span className="absolute -bottom-2 -left-3 text-xs sm:text-sm text-cyan-300">
                  ✦
                </span>
                <span className={`relative ${item.sizeClass}`}>
                  {item.emoji}
                </span>
              </div>
            );
          }

          // 2. Special Composite Sticker: Birthday Cake with Moving/Flickering Candle Flame on Top
          if (item.animation === 'cake_with_candle') {
            return (
              <div
                key={item.id}
                data-js-sticker="1"
                data-anim="cake_with_candle"
                data-delay={delayMs}
                data-duration={durationMs}
                style={{ animation: 'none', willChange: 'transform' }}
                className={`absolute ${item.positionClass} flex flex-col items-center`}
              >
                <div className="relative -mb-2.5 z-10 flex items-center justify-center">
                  <span className="text-sm sm:text-base">
                    🔥
                  </span>
                  <span className="absolute -top-1 -right-2 text-[10px]">
                    ✨
                  </span>
                </div>
                <span className={item.sizeClass}>{item.emoji}</span>
              </div>
            );
          }

          // 3. Standard Animated Sticker (Clown Wiggle, Rising Balloons, Gliding Wings, Snowfall, etc.)
          return (
            <span
              key={item.id}
              data-js-sticker="1"
              data-anim={item.animation}
              data-delay={delayMs}
              data-duration={durationMs}
              style={{ animation: 'none', willChange: 'transform, opacity' }}
              className={`absolute ${item.positionClass} ${item.sizeClass}`}
            >
              {item.emoji}
            </span>
          );
        })}
      </div>
    );
  }
);

interface StartCallToActionProps {
  onStart: () => void;
  buttonClass: string;
  buttonText: string;
  ctaSubtext: string;
  ctaSubtextClass: string;
}

// Memoized Start CTA so photo shuffles never trigger React reconciliation on the button
const StartCallToAction = React.memo(
  ({ onStart, buttonClass, buttonText, ctaSubtext, ctaSubtextClass }: StartCallToActionProps) => (
    <div className="relative flex flex-col items-center mt-3 z-20">
      <button
        type="button"
        data-js-float-cta="1"
        style={{ animation: 'none', willChange: 'transform' }}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.playTap();
          onStart();
        }}
        className={`group relative inline-flex items-center justify-center px-12 py-4 font-bold text-base sm:text-lg tracking-wide active:scale-95 cursor-pointer select-none ${buttonClass}`}
      >
        <span>{buttonText}</span>
      </button>

      <p className={`mt-3.5 text-xs font-normal ${ctaSubtextClass}`}>{ctaSubtext}</p>
    </div>
  )
);

export const AttractScreen: React.FC<AttractScreenProps> = ({
  config,
  onStartSession,
  onSecretAdminTap,
}) => {
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState<AttractOccasionId>(() =>
    getActiveAttractThemeId()
  );
  const [customPhotos, setCustomPhotos] = useState<string[]>(() => {
    try {
      const saved = safeStorageGet('jcv_attract_custom_photos');
      if (saved) {
        const cleaned = sanitizeStoredAttractPhotos(JSON.parse(saved));
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Strip shuffle position index (0, 1, 2)
  const [shuffleStep, setShuffleStep] = useState<number>(0);
  const shuffleStepRef = React.useRef<number>(0);
  shuffleStepRef.current = shuffleStep;

  const [isIdleDimmed, setIsIdleDimmed] = useState<boolean>(false);
  const [dvdColorIndex, setDvdColorIndex] = useState<number>(0);

  // DVD Screensaver & 60fps JS Animation refs (guaranteed to animate in Android .APK WebView)
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dvdBadgeRef = React.useRef<HTMLDivElement | null>(null);
  const stripLeftRef = React.useRef<HTMLDivElement | null>(null);
  const stripCenterRef = React.useRef<HTMLDivElement | null>(null);
  const stripRightRef = React.useRef<HTMLDivElement | null>(null);

  const theme = getAttractThemeById(activeThemeId);

  // Subscribe to Galaxy Tab A11 Endurance Manager for thermal idle dimming
  useEffect(() => {
    return enduranceManager.subscribe((status) => {
      setIsIdleDimmed(status.isIdleDimmed);
    });
  }, []);

  const isSavingModeActive = isIdleDimmed && config.tabletEndurance?.enabled !== false;

  // Classic DVD Screensaver physics (active ONLY when screen saving mode is active)
  useEffect(() => {
    if (!isSavingModeActive) return;

    let rafId = 0;
    let x = 36;
    let y = 48;
    // Speed in pixels per second (diagonal DVD glide)
    let vx = 135;
    let vy = 105;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const container = containerRef.current;
      const badge = dvdBadgeRef.current;
      if (container && badge) {
        const maxX = Math.max(0, container.clientWidth - badge.offsetWidth - 8);
        const maxY = Math.max(0, container.clientHeight - badge.offsetHeight - 8);

        x += vx * dt;
        y += vy * dt;

        let bounced = false;
        if (x <= 8) {
          x = 8;
          vx = Math.abs(vx);
          bounced = true;
        } else if (x >= maxX) {
          x = maxX;
          vx = -Math.abs(vx);
          bounced = true;
        }

        if (y <= 8) {
          y = 8;
          vy = Math.abs(vy);
          bounced = true;
        } else if (y >= maxY) {
          y = maxY;
          vy = -Math.abs(vy);
          bounced = true;
        }

        if (bounced) {
          setDvdColorIndex((c) => (c + 1) % 6);
        }

        badge.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isSavingModeActive]);

  // Secret multi-tap on title/logo for kiosk operators (4 rapid taps unlocks to minimize & opens Admin)
  const handleLogoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playTap();
    const next = adminTapCount + 1;
    if (next >= 4) {
      setAdminTapCount(0);
      onSecretAdminTap();
      return;
    }
    setAdminTapCount(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAdminTapCount(0);
    }, 3000);
    return () => clearTimeout(timer);
  }, [adminTapCount]);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchronize custom photos, theme selection, and shuffles from Admin Screen
  useEffect(() => {
    storageService.getAttractPhotos().then((stored) => {
      const cleaned = sanitizeStoredAttractPhotos(stored);
      if (cleaned.length > 0) {
        setCustomPhotos(cleaned);
      }
    });

    const updatePhotosFromStorage = (e?: Event) => {
      const customEvt = e as CustomEvent<string[]>;
      if (customEvt && customEvt.detail && Array.isArray(customEvt.detail)) {
        setCustomPhotos(sanitizeStoredAttractPhotos(customEvt.detail));
        return;
      }

      try {
        const saved = safeStorageGet('jcv_attract_custom_photos');
        if (saved) {
          const cleaned = sanitizeStoredAttractPhotos(JSON.parse(saved));
          if (cleaned.length > 0) {
            setCustomPhotos(cleaned);
            return;
          }
        }
      } catch {
        // ignore
      }

      storageService.getAttractPhotos().then((stored) => {
        setCustomPhotos(sanitizeStoredAttractPhotos(stored));
      });
    };

    const handleThemeUpdated = (e?: Event) => {
      const customEvt = e as CustomEvent<AttractOccasionId>;
      if (customEvt?.detail) {
        setActiveThemeId(customEvt.detail);
      } else {
        setActiveThemeId(getActiveAttractThemeId());
      }
    };

    const handleShuffleEvent = () => {
      setShuffleStep((s) => (s + 1) % 3);
    };

    window.addEventListener('jcv_attract_photos_updated', updatePhotosFromStorage);
    window.addEventListener('jcv_attract_theme_updated', handleThemeUpdated);
    window.addEventListener('jcv_attract_shuffle_triggered', handleShuffleEvent);
    window.addEventListener('storage', () => {
      updatePhotosFromStorage();
      handleThemeUpdated();
    });

    return () => {
      window.removeEventListener('jcv_attract_photos_updated', updatePhotosFromStorage);
      window.removeEventListener('jcv_attract_theme_updated', handleThemeUpdated);
      window.removeEventListener('jcv_attract_shuffle_triggered', handleShuffleEvent);
    };
  }, []);

  // Automatic gentle shuffling of the 3 strips
  useEffect(() => {
    const isAutoShuffle = safeStorageGet('jcv_attract_auto_shuffle') !== 'false';
    if (!isAutoShuffle) return;

    const intervalMs = isIdleDimmed ? 9500 : 3800;
    const interval = setInterval(() => {
      setShuffleStep((s) => (s + 1) % 3);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isIdleDimmed]);

  const handleStripTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playTap();
    setShuffleStep((s) => (s + 1) % 3);
  };

  const media = config.frontScreenMedia;
  const hasMedia = Boolean(media?.enabled && (media?.url || media?.canvaEmbedUrl));
  const isBackgroundMedia = hasMedia && media?.placement === 'background';

  // Determine active photos array for the 3 strips (custom photos set by Admin or defaults)
  const activePhotos = customPhotos.length > 0 ? customPhotos : DEFAULT_BOOTH_SAMPLES;

  const getPhoto = (index: number) => {
    if (activePhotos.length === 0) return null;
    return activePhotos[index % activePhotos.length];
  };

  /**
   * 60fps JavaScript requestAnimationFrame engine for the Home Screen (AttractScreen):
   * - Animates all dropping/bouncing Gobble Haus stickers & occasion stickers ([data-js-sticker])
   * - Animates the floating Start button ([data-js-float-cta])
   * - Smoothly interpolates and bobs the 3 shuffling photostrip cards (stripLeftRef, stripCenterRef, stripRightRef)
   * Works 100% reliably inside the Android .APK WebView even when Android Battery Saver or
   * ANIMATOR_DURATION_SCALE disables CSS @keyframes and CSS transitions.
   */
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const curCards = {
      left: { tx: -122, ty: 10, rot: -14, scale: 0.95 },
      center: { tx: -50, ty: -6, rot: 0, scale: 1.06 },
      right: { tx: 22, ty: 10, rot: 14, scale: 0.95 },
    };

    const slotTargets = {
      posLeft: { tx: -122, ty: 10, rot: -14, scale: 0.95, z: 10 },
      posCenter: { tx: -50, ty: -6, rot: 0, scale: 1.06, z: 25 },
      posRight: { tx: 22, ty: 10, rot: 14, scale: 0.95, z: 10 },
    };

    const getTargetForCard = (cardId: 'left' | 'center' | 'right', stepIdx: number) => {
      if (stepIdx === 0) {
        if (cardId === 'left') return slotTargets.posLeft;
        if (cardId === 'center') return slotTargets.posCenter;
        return slotTargets.posRight;
      } else if (stepIdx === 1) {
        if (cardId === 'right') return slotTargets.posCenter;
        if (cardId === 'left') return slotTargets.posRight;
        return slotTargets.posLeft;
      } else {
        if (cardId === 'left') return slotTargets.posCenter;
        if (cardId === 'center') return slotTargets.posRight;
        return slotTargets.posLeft;
      }
    };

    const animateFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const lerpFactor = Math.min(1, dt * 8.5);
      const stepIdx = shuffleStepRef.current;

      // 1. Animate the 3 shuffling photostrip cards
      const cardEntries: [keyof typeof curCards, HTMLDivElement | null, number][] = [
        ['left', stripLeftRef.current, 0],
        ['center', stripCenterRef.current, 2.1],
        ['right', stripRightRef.current, 4.2],
      ];

      for (const [id, el, phase] of cardEntries) {
        if (!el) continue;
        const target = getTargetForCard(id, stepIdx);
        const cur = curCards[id];
        cur.tx += (target.tx - cur.tx) * lerpFactor;
        cur.ty += (target.ty - cur.ty) * lerpFactor;
        cur.rot += (target.rot - cur.rot) * lerpFactor;
        cur.scale += (target.scale - cur.scale) * lerpFactor;
        const floatY = Math.sin(now / 650 + phase) * 3.2;
        el.style.transition = 'none';
        el.style.zIndex = String(target.z);
        el.style.transform = `translate3d(${cur.tx.toFixed(2)}%, ${(cur.ty + floatY).toFixed(2)}px, 0) rotate(${cur.rot.toFixed(2)}deg) scale3d(${cur.scale.toFixed(3)}, ${cur.scale.toFixed(3)}, 1)`;
      }

      // 2. Animate all background & corner stickers ([data-js-sticker])
      const root = containerRef.current;
      if (root) {
        const vhPx = Math.max(480, root.clientHeight || window.innerHeight || 800) / 100;
        const stickerEls = root.querySelectorAll<HTMLElement>('[data-js-sticker="1"]');
        stickerEls.forEach((el, i) => {
          const anim = el.dataset.anim || 'twinkle_shine';
          const delay = Number(el.dataset.delay || i * 400);
          const duration = Math.max(1200, Number(el.dataset.duration || 5600));
          // Use elapsed time from mount/now with per-sticker delay offset so each sticker rains continuously
          const p = ((((now + delay) % duration) + duration) % duration) / duration;
          const angle = p * Math.PI * 2;

          let tx = 0;
          let ty = 0;
          let rot = 0;
          let scaleX = 1;
          let scaleY = 1;
          let opacity = 1;

          if (anim === 'food_drop') {
            // Matches @keyframes foodStickerDrop: rains from -18vh at top all the way down to +106vh past bottom
            // Keyframe stops: 0% (-18vh), 28% (22vh), 42% (38vh), 65% (66vh), 100% (106vh)
            if (p < 0.28) {
              const t = p / 0.28;
              tx = 0 + 14 * t;
              ty = (-18 + (22 - -18) * t) * vhPx;
              rot = -14 + (10 - -14) * t;
              const s = 0.85 + (1.04 - 0.85) * t;
              scaleX = s;
              scaleY = s;
            } else if (p < 0.42) {
              const t = (p - 0.28) / (0.42 - 0.28);
              tx = 14 + (-8 - 14) * t;
              ty = (22 + (38 - 22) * t) * vhPx;
              rot = 10 + (-8 - 10) * t;
              scaleX = 1.04 + (0.98 - 1.04) * t;
              scaleY = 1.04 + (1.03 - 1.04) * t;
            } else if (p < 0.65) {
              const t = (p - 0.42) / (0.65 - 0.42);
              tx = -8 + (12 - -8) * t;
              ty = (38 + (66 - 38) * t) * vhPx;
              rot = -8 + (12 - -8) * t;
              scaleX = 0.98 + (1.03 - 0.98) * t;
              scaleY = 1.03;
            } else {
              const t = (p - 0.65) / (1 - 0.65);
              tx = 12 + (-10 - 12) * t;
              ty = (66 + (106 - 66) * t) * vhPx;
              rot = 12 + (-10 - 12) * t;
              const s = 1.03 + (0.94 - 1.03) * t;
              scaleX = s;
              scaleY = s;
            }

            if (p < 0.08) {
              opacity = (p / 0.08) * 0.96;
            } else if (p > 0.88) {
              opacity = ((1 - p) / 0.12) * 0.96;
            } else {
              opacity = 0.96;
            }
          } else if (anim === 'food_land') {
            // Matches @keyframes foodStickerLandBounce: bouncy squash-and-stretch landing
            if (p < 0.18) {
              const t = p / 0.18;
              ty = -28 + (5 - -28) * t;
              rot = -10 + (6 - -10) * t;
              scaleX = 0.9 + (1.16 - 0.9) * t;
              scaleY = 1.08 + (0.84 - 1.08) * t;
            } else if (p < 0.32) {
              const t = (p - 0.18) / (0.32 - 0.18);
              ty = 5 + (-10 - 5) * t;
              rot = 6 + (-5 - 6) * t;
              scaleX = 1.16 + (0.96 - 1.16) * t;
              scaleY = 0.84 + (1.05 - 0.84) * t;
            } else if (p < 0.46) {
              const t = (p - 0.32) / (0.46 - 0.32);
              ty = -10 + (0 - -10) * t;
              rot = -5 + (3 - -5) * t;
              scaleX = 0.96 + (1.04 - 0.96) * t;
              scaleY = 1.05 + (0.96 - 1.05) * t;
            } else if (p < 0.65) {
              const t = (p - 0.46) / (0.65 - 0.46);
              ty = 0 + (-7 - 0) * t;
              rot = 3 + (-3 - 3) * t;
              scaleX = 1.04 + (1 - 1.04) * t;
              scaleY = 0.96 + (1 - 0.96) * t;
            } else if (p < 0.82) {
              const t = (p - 0.65) / (0.82 - 0.65);
              ty = -7 + (0 - -7) * t;
              rot = -3 + (2 - -3) * t;
              scaleX = 1 + (1.02 - 1) * t;
              scaleY = 1 + (0.98 - 1) * t;
            } else {
              const t = (p - 0.82) / (1 - 0.82);
              ty = 0 + (-28 - 0) * t;
              rot = 2 + (-10 - 2) * t;
              scaleX = 1.02 + (0.9 - 1.02) * t;
              scaleY = 0.98 + (1.08 - 0.98) * t;
            }
          } else if (
            anim === 'clown_wiggle' ||
            anim === 'cake_with_candle'
          ) {
            ty = Math.sin(angle) * 9;
            tx = Math.cos(angle * 2) * 3.5;
            rot = Math.sin(angle) * 10;
            const s = 1 + Math.sin(angle * 2) * 0.06;
            scaleX = s;
            scaleY = s;
          } else if (anim === 'disco_ball_shine') {
            ty = Math.sin(angle) * 6;
            rot = p * 360;
            const s = 1 + Math.sin(angle * 2) * 0.08;
            scaleX = s;
            scaleY = s;
          } else if (anim === 'balloon_rise') {
            // Rises across the full screen height from 95vh up to -18vh
            ty = (95 - p * 113) * vhPx;
            tx = Math.sin(angle * 2) * 14;
            rot = Math.sin(angle * 2) * 7;
            opacity = p < 0.08 ? p / 0.08 : p > 0.88 ? (1 - p) / 0.12 : 0.95;
          } else if (anim === 'snow_fall') {
            // Falls across the full screen height from -12vh down to 100vh
            ty = (-12 + p * 112) * vhPx;
            tx = Math.sin(angle * 2) * 12;
            rot = p * 360;
            opacity = p < 0.1 ? p / 0.1 : p > 0.88 ? (1 - p) / 0.12 : 0.95;
          } else if (anim === 'wing_glide' || anim === 'ghost_float') {
            tx = Math.sin(angle) * 14;
            ty = Math.cos(angle * 2) * 9;
            rot = Math.sin(angle) * 8;
          } else {
            ty = Math.sin(angle) * 5;
            const s = 1 + Math.sin(angle * 2) * 0.13;
            scaleX = s;
            scaleY = s;
            rot = Math.sin(angle) * 8;
            opacity = 0.82 + Math.sin(angle * 2) * 0.18;
          }

          el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}, 1)`;
          el.style.opacity = opacity.toFixed(2);
        });

        // 3. Animate the floating Start button ([data-js-float-cta="1"])
        const ctaEl = root.querySelector<HTMLElement>('[data-js-float-cta="1"]');
        if (ctaEl) {
          const bobY = Math.sin(now / 420) * 4.5;
          ctaEl.style.transform = `translate3d(0, ${bobY.toFixed(2)}px, 0)`;
        }
      }

      rafId = requestAnimationFrame(animateFrame);
    };

    rafId = requestAnimationFrame(animateFrame);
    return () => cancelAnimationFrame(rafId);
  }, [activeThemeId]);

  /**
   * Pure GPU-accelerated initial transform states for the 3 shuffling strips.
   */
  const getCardTransformStyle = (cardId: 'left' | 'center' | 'right'): React.CSSProperties => {
    const posLeft: React.CSSProperties = {
      transform: 'translate3d(-122%, 10px, 0) rotate(-14deg) scale3d(0.95, 0.95, 1)',
      zIndex: 10,
    };
    const posCenter: React.CSSProperties = {
      transform: 'translate3d(-50%, -6px, 0) rotate(0deg) scale3d(1.06, 1.06, 1)',
      zIndex: 25,
    };
    const posRight: React.CSSProperties = {
      transform: 'translate3d(22%, 10px, 0) rotate(14deg) scale3d(0.95, 0.95, 1)',
      zIndex: 10,
    };

    if (shuffleStep === 0) {
      if (cardId === 'left') return posLeft;
      if (cardId === 'center') return posCenter;
      return posRight;
    } else if (shuffleStep === 1) {
      if (cardId === 'right') return posCenter;
      if (cardId === 'left') return posRight;
      return posLeft;
    } else {
      if (cardId === 'left') return posCenter;
      if (cardId === 'center') return posRight;
      return posLeft;
    }
  };

  const dvdAccentStyles = [
    'border-amber-400/90 shadow-[0_8px_30px_rgba(251,191,36,0.35)] text-amber-200',
    'border-cyan-400/90 shadow-[0_8px_30px_rgba(34,211,238,0.35)] text-cyan-200',
    'border-rose-400/90 shadow-[0_8px_30px_rgba(251,113,133,0.35)] text-rose-200',
    'border-emerald-400/90 shadow-[0_8px_30px_rgba(52,211,153,0.35)] text-emerald-200',
    'border-fuchsia-400/90 shadow-[0_8px_30px_rgba(232,121,249,0.35)] text-fuchsia-200',
    'border-sky-400/90 shadow-[0_8px_30px_rgba(56,189,248,0.35)] text-sky-200',
  ];

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        soundEffects.playTap();
        onStartSession();
      }}
      className={`relative flex-1 flex flex-col justify-between items-center p-6 sm:p-10 select-none cursor-pointer overflow-y-auto min-h-0 h-full transition-colors duration-500 ${theme.screenBgClass}`}
    >
      {/* Background Animated Video / GIF / Canva Embed Layer (if enabled by operator) */}
      {isBackgroundMedia && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {media.mediaType === 'video' && (
            <video
              src={media.url}
              autoPlay
              loop={media.loop ?? true}
              muted={media.muted ?? true}
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          {media.mediaType === 'gif' && (
            <img
              src={media.url}
              alt="Event Background"
              className="w-full h-full object-cover"
            />
          )}
          {media.mediaType === 'canva_embed' && (
            <iframe
              src={media.canvaEmbedUrl || media.url}
              title="Canva Event Background"
              className="w-full h-full border-0 pointer-events-none scale-105"
              allow="autoplay; fullscreen"
            />
          )}
          <div
            className="absolute inset-0 bg-white/70 transition-opacity duration-300"
            style={{ opacity: (media.overlayOpacity ?? 50) / 100 }}
          />
        </div>
      )}

      {/* Choreographed Moving Occasion Stickers */}
      <AnimatedThemeStickers
        stickers={theme.animatedStickers}
        opacityClass={theme.floatingOpacityClass}
      />

      {/* Hero Visual Area: Occasion Envelope with Fan-out Photostrips */}
      <div className="my-auto z-10 flex flex-col items-center text-center max-w-md w-full py-4">
        {/* Title branding lockup (4 rapid taps unlocks to minimize & opens Admin) */}
        <div
          data-no-fullscreen-enforce="true"
          onClick={handleLogoTap}
          className="mb-2 text-center cursor-pointer"
        >
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-1 ${theme.heroTitleClass}`}
          >
            {theme.heroTitle}
          </h1>
          <p className={`text-sm sm:text-base tracking-wide ${theme.heroSubtitleClass}`}>
            {theme.heroSubtitle}
          </p>
        </div>

        {/* Realistic Envelope & Shuffling Photostrips Centerpiece */}
        <div
          onClick={handleStripTap}
          className="relative my-4 w-72 sm:w-80 h-72 sm:h-80 flex items-center justify-center cursor-pointer group"
          title="Tap to shuffle strips"
        >
          {/* Strip 1: Left 2-cut Photostrip (IMG_3042 + IMG_3043 together in one strip) */}
          <div
            ref={stripLeftRef}
            style={getCardTransformStyle('left')}
            className={`absolute left-1/2 top-2 w-26 h-52 flex flex-col p-2 strip-card-gpu select-none ${theme.stripCardClass}`}
          >
            {theme.leftCornerStickerImage ? (
              <img
                src={resolveStickerAssetUrl(theme.leftCornerStickerImage)}
                alt="Left Strip Sticker"
                data-js-sticker="1"
                data-anim="food_land"
                data-delay="0"
                data-duration="3400"
                style={{ animation: 'none' }}
                className="absolute -top-4 -left-4 w-10 h-10 object-contain z-20 pointer-events-none bg-transparent"
              />
            ) : theme.leftCornerSticker ? (
              <span
                data-js-sticker="1"
                data-anim="twinkle_shine"
                data-delay="0"
                data-duration="2800"
                style={{ animation: 'none' }}
                className="absolute -top-2.5 -left-2.5 text-base z-20 pointer-events-none"
              >
                {theme.leftCornerSticker}
              </span>
            ) : null}
            <div
              className={`shrink-0 text-[7.5px] leading-snug text-center uppercase tracking-wider pb-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis ${theme.stripHeaderClass}`}
            >
              {theme.leftStripHeader}
            </div>
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
              <div
                className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center relative ${theme.photoSlotClass}`}
              >
                {getPhoto(0) ? (
                  <img
                    src={getPhoto(0)!}
                    alt="Strip 1 Top"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">📸</span>
                )}
              </div>
              <div
                className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center relative ${theme.photoSlotClass}`}
              >
                {getPhoto(1) ? (
                  <img
                    src={getPhoto(1)!}
                    alt="Strip 1 Bottom"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">✨</span>
                )}
              </div>
            </div>
            <div
              className={`shrink-0 text-[6.5px] leading-snug text-center pt-1 mt-1 whitespace-nowrap overflow-hidden text-ellipsis ${theme.stripFooterClass}`}
            >
              {theme.leftStripFooter}
            </div>
          </div>

          {/* Strip 2: Center Front Polaroid Frame (IMG_3044) */}
          <div
            ref={stripCenterRef}
            style={getCardTransformStyle('center')}
            className={`absolute left-1/2 top-2 w-30 h-44 flex flex-col p-2 strip-card-gpu select-none ${theme.polaroidCardClass}`}
          >
            {theme.centerCornerBadgeImage ? (
              <img
                src={resolveStickerAssetUrl(theme.centerCornerBadgeImage)}
                alt="Center Strip Sticker"
                data-js-sticker="1"
                data-anim="food_land"
                data-delay="450"
                data-duration="3600"
                style={{ animation: 'none' }}
                className="absolute -top-5 -right-5 w-11 h-11 object-contain z-20 pointer-events-none bg-transparent"
              />
            ) : theme.centerCornerBadge ? (
              <div
                data-js-sticker="1"
                data-anim="food_land"
                data-delay="450"
                data-duration="3200"
                style={{ animation: 'none' }}
                className="absolute -top-3 -right-3 z-20 pointer-events-none flex flex-col items-center"
              >
                {theme.id === 'birthday' && (
                  <span className="text-[10px] -mb-1.5">🔥</span>
                )}
                {theme.id === 'retro_disco' && (
                  <span className="absolute -top-1 -right-1 text-[10px]">✨</span>
                )}
                <span className="text-base">
                  {theme.centerCornerBadge}
                </span>
              </div>
            ) : null}
            <div
              className={`shrink-0 text-[7.5px] leading-snug text-center uppercase tracking-wider pb-1 mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis ${theme.stripHeaderClass}`}
            >
              {theme.centerPolaroidHeader}
            </div>
            <div
              className={`flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center relative ${theme.photoSlotClass}`}
            >
              {getPhoto(2) ? (
                <img
                  src={getPhoto(2)!}
                  alt="Polaroid Hero"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">😊</span>
              )}
            </div>
            <div
              className={`shrink-0 pt-1.5 text-center text-[9.5px] leading-snug whitespace-nowrap overflow-hidden text-ellipsis ${theme.centerPolaroidCaptionClass}`}
            >
              {theme.centerPolaroidCaption}
            </div>
          </div>

          {/* Strip 3: Right Receipt 2-cut Photostrip (IMG_3045 + IMG_3046 together in one strip) */}
          <div
            ref={stripRightRef}
            style={getCardTransformStyle('right')}
            className={`absolute left-1/2 top-2 w-26 h-52 flex flex-col p-2 strip-card-gpu select-none ${theme.stripCardClass}`}
          >
            {theme.rightCornerStickerImage ? (
              <img
                src={resolveStickerAssetUrl(theme.rightCornerStickerImage)}
                alt="Right Strip Sticker"
                data-js-sticker="1"
                data-anim="food_land"
                data-delay="900"
                data-duration="3500"
                style={{ animation: 'none' }}
                className="absolute -top-4 -right-4 w-10 h-10 object-contain z-20 pointer-events-none bg-transparent"
              />
            ) : theme.rightCornerSticker ? (
              <span
                data-js-sticker="1"
                data-anim="twinkle_shine"
                data-delay="900"
                data-duration="3000"
                style={{ animation: 'none' }}
                className="absolute -top-2.5 -right-2.5 text-base z-20 pointer-events-none"
              >
                {theme.rightCornerSticker}
              </span>
            ) : null}
            <div
              className={`shrink-0 text-[7.5px] leading-snug text-center uppercase tracking-wider pb-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis ${theme.stripHeaderClass}`}
            >
              {theme.rightStripHeader}
            </div>
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
              <div
                className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center relative ${theme.photoSlotClass}`}
              >
                {getPhoto(3) ? (
                  <img
                    src={getPhoto(3)!}
                    alt="Receipt 1 Top"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">✌️</span>
                )}
              </div>
              <div
                className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center relative ${theme.photoSlotClass}`}
              >
                {getPhoto(4) ? (
                  <img
                    src={getPhoto(4)!}
                    alt="Receipt 2 Bottom"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">🥰</span>
                )}
              </div>
            </div>
            <div
              className={`shrink-0 text-[6.5px] leading-snug text-center pt-1 mt-1 whitespace-nowrap overflow-hidden text-ellipsis ${theme.stripFooterClass}`}
            >
              {theme.rightStripFooter}
            </div>
          </div>

          {/* Front Envelope Pocket: Styled dynamically per occasion */}
          <div
            className={`absolute bottom-0 inset-x-0 h-28 z-30 flex flex-col items-center justify-center pointer-events-none ${theme.envelopePocketClass}`}
          >
            {/* Envelope V-flap folded accent */}
            <div
              className={`absolute -top-3 w-6 h-6 border-b border-r transform rotate-45 rounded-br-sm shadow-2xs ${theme.envelopeFlapClass}`}
            />

            {/* Occasion Emblem Seal Badge (4 rapid taps unlocks to minimize & opens Admin) */}
            <div
              data-no-fullscreen-enforce="true"
              onClick={handleLogoTap}
              className={`flex flex-col items-center gap-1 z-10 px-5 py-2 rounded-full pointer-events-auto cursor-pointer ${theme.envelopeSealClass}`}
            >
              <div
                className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${theme.envelopeSealTitleClass}`}
              >
                <span className="sticker-twinkle-shine">{theme.envelopeAccentIcon}</span>
                <span>{theme.envelopeTitle}</span>
                <span className="sticker-twinkle-shine">{theme.envelopeAccentIcon}</span>
              </div>
              <span
                className={`text-[9px] font-mono tracking-wider ${theme.envelopeSealSubtitleClass}`}
              >
                {theme.envelopeSubtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Moving Occasion Button: Memoized & GPU-accelerated */}
        <StartCallToAction
          onStart={onStartSession}
          buttonClass={theme.buttonClass}
          buttonText={theme.buttonText}
          ctaSubtext={theme.ctaSubtext}
          ctaSubtextClass={theme.ctaSubtextClass}
        />
      </div>

      {/* Bottom Minimal Feature Row */}
      <div
        className={`w-full z-10 pt-4 flex items-center justify-center gap-6 max-w-xl text-xs ${theme.bottomRowClass}`}
      >
        <div className="flex items-center gap-2">
          <Printer className={`w-4 h-4 shrink-0 ${theme.bottomIconClass}`} />
          <span>{theme.bottomFeatures[0]}</span>
        </div>
        {isOnline && (
          <>
            <span>•</span>
            <div className="flex items-center gap-2">
              <QrCode className={`w-4 h-4 shrink-0 ${theme.bottomIconClass}`} />
              <span>{theme.bottomFeatures[1]}</span>
            </div>
          </>
        )}
        <span>•</span>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 shrink-0 ${theme.bottomIconClass}`} />
          <span>{theme.bottomFeatures[2]}</span>
        </div>
      </div>

      {/* Galaxy Tab A11 9–12 Hour Thermal Cooling & Screen Saving Mode with DVD-Bouncing "Touch Anywhere to Start" */}
      {isSavingModeActive && (
        <div
          className="absolute inset-0 z-40 pointer-events-none transition-opacity duration-700"
          style={{
            backgroundColor: `rgba(9, 9, 11, ${(config.tabletEndurance?.idleDimOpacity ?? 45) / 100})`,
          }}
        >
          <div
            ref={dvdBadgeRef}
            style={{ transform: 'translate3d(36px, 48px, 0)' }}
            className={`absolute top-0 left-0 z-50 pointer-events-none will-change-transform px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-zinc-950/85 border-2 backdrop-blur-md text-center transition-colors duration-300 ${
              dvdAccentStyles[dvdColorIndex % dvdAccentStyles.length]
            }`}
          >
            <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-white flex items-center justify-center gap-2">
              <span>📸</span>
              <span>Touch Anywhere to Start Photo Booth</span>
            </div>
            <div className="text-[10px] font-mono mt-0.5 opacity-90">
              Instant Thermal Print • Ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
