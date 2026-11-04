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
  if (url.startsWith('/assets/')) {
    return `.${url}`;
  }
  return url;
};

/**
 * Memoized GPU-accelerated Animated Stickers Layer.
 * Renders dropping Gobble Haus rice-box stickers, spinning & shining disco balls,
 * moving clowns, birthday cakes with flickering candle flames, rising balloons,
 * gliding doves/bats, falling snowflakes, and pulsing hearts without main-thread lag.
 */
const AnimatedThemeStickers = React.memo(
  ({
    stickers,
    opacityClass,
  }: {
    stickers: AnimatedStickerItem[];
    opacityClass: string;
  }) => {
    const getAnimClass = (anim: AnimatedStickerItem['animation']) => {
      switch (anim) {
        case 'food_drop':
          return 'sticker-food-drop';
        case 'food_land':
          return 'sticker-food-land';
        case 'disco_ball_shine':
          return 'sticker-disco-spin';
        case 'clown_wiggle':
          return 'sticker-clown-wiggle';
        case 'cake_with_candle':
          return 'sticker-cake-bob';
        case 'balloon_rise':
          return 'sticker-balloon-rise';
        case 'wing_glide':
          return 'sticker-wing-glide';
        case 'twinkle_shine':
          return 'sticker-twinkle-shine';
        case 'snow_fall':
          return 'sticker-snow-fall';
        case 'heartbeat':
          return 'sticker-heartbeat';
        case 'ghost_float':
          return 'sticker-ghost-float';
        default:
          return 'sticker-twinkle-shine';
      }
    };

    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 select-none ${opacityClass}`}
      >
        {stickers.map((item) => {
          const style: React.CSSProperties = {
            ...(item.delayMs ? { animationDelay: `${item.delayMs}ms` } : {}),
            ...(item.durationMs ? { animationDuration: `${item.durationMs}ms` } : {}),
          };

          // 0. Custom Die-Cut Image Sticker (e.g. Gobble Haus Rice Box Stickers dropping & bouncing)
          if (item.imageUrl) {
            return (
              <div
                key={item.id}
                style={style}
                className={`absolute ${item.positionClass} ${item.sizeClass} ${getAnimClass(
                  item.animation
                )} flex items-center justify-center`}
              >
                <img
                  src={resolveStickerAssetUrl(item.imageUrl)}
                  alt={item.label || 'Sticker'}
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1';
                      const fileName = item.imageUrl?.split('/').pop() || '';
                      img.src = `./stickers/gobble-haus/${fileName}`;
                    }
                  }}
                  className="w-full h-full object-contain drop-shadow-[0_8px_14px_rgba(44,26,14,0.22)]"
                />
              </div>
            );
          }

          // 1. Special Composite Sticker: Spinning & Shining Disco Ball with Radiant Light Rays
          if (item.animation === 'disco_ball_shine') {
            return (
              <div
                key={item.id}
                className={`absolute ${item.positionClass} flex items-center justify-center`}
              >
                {/* Counter-rotating & pulsing neon shine starburst */}
                <div
                  style={style}
                  className="absolute -inset-4 rounded-full bg-gradient-to-tr from-cyan-400/35 via-fuchsia-400/40 to-amber-300/35 blur-md sticker-disco-rays"
                />
                <span
                  style={style}
                  className="absolute -top-3 -right-3 text-xs sm:text-sm text-amber-300 sticker-disco-rays"
                >
                  ✨
                </span>
                <span
                  style={style}
                  className="absolute -bottom-2 -left-3 text-xs sm:text-sm text-cyan-300 sticker-disco-rays"
                >
                  ✦
                </span>
                {/* Spinning Disco Ball */}
                <span style={style} className={`relative ${item.sizeClass} sticker-disco-spin`}>
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
                style={style}
                className={`absolute ${item.positionClass} flex flex-col items-center sticker-cake-bob`}
              >
                {/* Flickering Candle Flame dancing on top of the cake */}
                <div className="relative -mb-2.5 z-10 flex items-center justify-center">
                  <span className="text-sm sm:text-base sticker-candle-flicker drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
                    🔥
                  </span>
                  <span className="absolute -top-1 -right-2 text-[10px] sticker-twinkle-shine">
                    ✨
                  </span>
                </div>
                {/* Cake Base */}
                <span className={item.sizeClass}>{item.emoji}</span>
              </div>
            );
          }

          // 3. Standard Animated Sticker (Clown Wiggle, Rising Balloons, Gliding Wings, Snowfall, etc.)
          return (
            <span
              key={item.id}
              style={style}
              className={`absolute ${item.positionClass} ${item.sizeClass} ${getAnimClass(
                item.animation
              )}`}
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

// Memoized Start CTA so photo shuffles never trigger React reconciliation on the moving button
const StartCallToAction = React.memo(
  ({ onStart, buttonClass, buttonText, ctaSubtext, ctaSubtextClass }: StartCallToActionProps) => (
    <div className="relative flex flex-col items-center mt-3 z-20">
      <div className="animate-floatBob">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEffects.playTap();
            onStart();
          }}
          className={`group relative inline-flex items-center justify-center px-12 py-4 font-bold text-base sm:text-lg tracking-wide active:scale-95 transition-transform duration-150 cursor-pointer select-none ${buttonClass}`}
        >
          <span>{buttonText}</span>
        </button>
      </div>

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
  const [isIdleDimmed, setIsIdleDimmed] = useState<boolean>(false);
  const [pixelShiftIndex, setPixelShiftIndex] = useState<number>(0);

  const theme = getAttractThemeById(activeThemeId);

  // Subscribe to Galaxy Tab A11 Endurance Manager for thermal idle dimming
  useEffect(() => {
    return enduranceManager.subscribe((status) => {
      setIsIdleDimmed(status.isIdleDimmed);
    });
  }, []);

  // Slow pixel-shift cycle while dimmed so no pixels remain static during 9–12 hour shifts
  useEffect(() => {
    if (!isIdleDimmed) return;
    const t = setInterval(() => {
      setPixelShiftIndex((i) => (i + 1) % 4);
    }, 15000);
    return () => clearInterval(t);
  }, [isIdleDimmed]);

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

  // Automatic gentle shuffling of the 3 strips (slows down to 9.5s in Thermal Eco Dim mode to cool GPU while charging)
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
   * Pure GPU-accelerated transform states for the 3 shuffling strips.
   * All 3 strips remain anchored at left-1/2 top-2 and only interpolate transform: translate3d(),
   * eliminating main-thread layout reflows and paint lag completely.
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

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        soundEffects.playTap();
        onStartSession();
      }}
      className={`relative flex-1 flex flex-col justify-between items-center p-6 sm:p-10 select-none cursor-pointer overflow-hidden min-h-[90vh] transition-colors duration-500 ${theme.screenBgClass}`}
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

      {/* Choreographed Moving Occasion Stickers (Spinning Disco Ball, Moving Clown, Flickering Candle Cake, Rising Balloons) */}
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
            style={getCardTransformStyle('left')}
            className={`absolute left-1/2 top-2 w-26 h-52 flex flex-col p-2 strip-card-gpu select-none ${theme.stripCardClass}`}
          >
            {theme.leftCornerStickerImage ? (
              <img
                src={resolveStickerAssetUrl(theme.leftCornerStickerImage)}
                alt="Left Strip Sticker"
                className={`absolute -top-4 -left-4 w-10 h-10 object-contain z-20 pointer-events-none drop-shadow-md ${
                  theme.leftCornerAnimClass || 'sticker-food-land'
                }`}
              />
            ) : theme.leftCornerSticker ? (
              <span
                className={`absolute -top-2.5 -left-2.5 text-base z-20 pointer-events-none ${
                  theme.leftCornerAnimClass || 'sticker-twinkle-shine'
                }`}
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
            style={getCardTransformStyle('center')}
            className={`absolute left-1/2 top-2 w-30 h-44 flex flex-col p-2 strip-card-gpu select-none ${theme.polaroidCardClass}`}
          >
            {theme.centerCornerBadgeImage ? (
              <img
                src={resolveStickerAssetUrl(theme.centerCornerBadgeImage)}
                alt="Center Strip Sticker"
                className={`absolute -top-5 -right-5 w-11 h-11 object-contain z-20 pointer-events-none drop-shadow-md ${
                  theme.centerCornerAnimClass || 'sticker-food-land'
                }`}
              />
            ) : theme.centerCornerBadge ? (
              <div className="absolute -top-3 -right-3 z-20 pointer-events-none flex flex-col items-center">
                {theme.id === 'birthday' && (
                  <span className="text-[10px] -mb-1.5 sticker-candle-flicker">🔥</span>
                )}
                {theme.id === 'retro_disco' && (
                  <span className="absolute -top-1 -right-1 text-[10px] sticker-disco-rays">✨</span>
                )}
                <span
                  className={`text-base drop-shadow-xs ${
                    theme.centerCornerAnimClass || 'sticker-twinkle-shine'
                  }`}
                >
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
            style={getCardTransformStyle('right')}
            className={`absolute left-1/2 top-2 w-26 h-52 flex flex-col p-2 strip-card-gpu select-none ${theme.stripCardClass}`}
          >
            {theme.rightCornerStickerImage ? (
              <img
                src={resolveStickerAssetUrl(theme.rightCornerStickerImage)}
                alt="Right Strip Sticker"
                className={`absolute -top-4 -right-4 w-10 h-10 object-contain z-20 pointer-events-none drop-shadow-md ${
                  theme.rightCornerAnimClass || 'sticker-food-land'
                }`}
              />
            ) : theme.rightCornerSticker ? (
              <span
                className={`absolute -top-2.5 -right-2.5 text-base z-20 pointer-events-none ${
                  theme.rightCornerAnimClass || 'sticker-twinkle-shine'
                }`}
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
        <span>•</span>
        <div className="flex items-center gap-2">
          <QrCode className={`w-4 h-4 shrink-0 ${theme.bottomIconClass}`} />
          <span>{theme.bottomFeatures[1]}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 shrink-0 ${theme.bottomIconClass}`} />
          <span>{theme.bottomFeatures[2]}</span>
        </div>
      </div>

      {/* Galaxy Tab A11 9–12 Hour Thermal Cooling & Anti-Burn-In Dimmer Overlay (wakes & starts session in 0ms on tap) */}
      {isIdleDimmed && config.tabletEndurance?.enabled !== false && (
        <div
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center transition-opacity duration-700"
          style={{
            backgroundColor: `rgba(9, 9, 11, ${(config.tabletEndurance?.idleDimOpacity ?? 45) / 100})`,
          }}
        >
          <div
            className="px-6 py-3 rounded-2xl bg-black/75 border border-white/20 text-white shadow-2xl backdrop-blur-md text-center transition-transform duration-1000"
            style={{
              transform:
                pixelShiftIndex === 0
                  ? 'translate3d(-14px, -18px, 0)'
                  : pixelShiftIndex === 1
                  ? 'translate3d(14px, -12px, 0)'
                  : pixelShiftIndex === 2
                  ? 'translate3d(12px, 16px, 0)'
                  : 'translate3d(-12px, 14px, 0)',
            }}
          >
            <div className="text-xs sm:text-sm font-black tracking-widest uppercase">
              📸 Touch Anywhere to Start Photo Booth
            </div>
            <div className="text-[10px] text-zinc-300 font-mono mt-0.5">
              Instant Thermal Print • Ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
