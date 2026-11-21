/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FrameLayoutType, FrameTheme, PhotoFilterType, StickerItem, DrawingPath, ThermalPrinterConfig } from '../types';
import { remoteConfigService } from './remoteConfig';

export interface ThemeGroup {
  id: string;
  label: string;
  icon?: string;
}

export const THEME_GROUPS: ThemeGroup[] = [
  { id: 'gobble', label: 'Gobble Haus Frames', icon: '🥡' },
];

/**
 * The 6 Exclusive Gobble Haus Frame Themes (Thermal Print Edition):
 * Pure white receipt paper (#ffffff) with crisp black (#000000) custom line-art
 * illustrations and texts at the top and bottom, with the photo(s) centered in the middle.
 */
export const THERMAL_FRAME_THEMES: FrameTheme[] = [
  {
    id: 'gobble_old_mac',
    name: 'Gobble Haus Mac',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'old_apple_mac',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE MAC 128K • SYSTEM 1.0',
    footerText: 'HELLO, BUSOG! • INASAL & FLOAT OS',
    dateVisible: true,
    cornerIcon: '🖥️',
  },
  {
    id: 'gobble_old_phone',
    name: 'Gobble Haus Phone',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'old_phone',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS PHONE • 5G BUSOG',
    footerText: 'CALLING: INASAL & FLOAT HOTLINE',
    dateVisible: true,
    cornerIcon: '📟',
  },
  {
    id: 'gobble_arcade_boy',
    name: 'Gobble Boy Arcade',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'arcade_boy',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE BOY • 8-BIT KITCHEN',
    footerText: 'HIGH SCORE 999,990 • INASAL & FLOAT',
    dateVisible: true,
    cornerIcon: '🕹️',
  },
  {
    id: 'gobble_wanted_poster',
    name: 'Wanted: Food Bandit',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'wanted_poster',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'WANTED • DEAD OR BUSOG',
    footerText: 'REWARD: 999,999,000 RICE BOXES',
    dateVisible: true,
    cornerIcon: '🤠',
  },
  {
    id: 'gobble_pokemon_card',
    name: 'Poké-Gobble Card',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'pokemon_card',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE-CHU • HP 999',
    footerText: 'CHICKEN INASAL FLAME • +999 DMG',
    dateVisible: true,
    cornerIcon: '⚡',
  },
  {
    id: 'gobble_rice_box',
    name: 'Rice in a Box',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'rice_box',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS • RICE IN A BOX',
    footerText: 'CHICKEN INASAL • ICE CREAM • FLOAT',
    dateVisible: true,
    cornerIcon: '🥡',
  },
  {
    id: 'gobble_hungry',
    name: 'So Hungry!',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'hungry_theme',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'WARNING: 100% HUNGRY!',
    footerText: 'FEED ME GOBBLE HAUS • NO CRUMBS LEFT',
    dateVisible: true,
    cornerIcon: '🍴',
  },
  {
    id: 'gobble_ice_cream_float',
    name: 'Ice Cream & Float',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'ice_cream_float',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS • FLOAT & ICE CREAM',
    footerText: 'ICE COLD FLOAT • CREAMY SWIRL',
    dateVisible: true,
    cornerIcon: '🍦',
  },
  {
    id: 'gobble_chicken_inasal',
    name: 'Chicken Inasal',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'chicken_inasal',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS • CHICKEN INASAL',
    footerText: 'GRILLED TO PERFECTION • 100% JUICY',
    dateVisible: true,
    cornerIcon: '🍗',
  },
  {
    id: 'gobble_receipt',
    name: 'Gobble Receipt',
    category: 'gobble',
    background: '#ffffff',
    borderStyle: 'order_receipt',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS • ORDER #088',
    footerText: 'CHICKEN INASAL • FLOAT • ICE CREAM',
    dateVisible: true,
    cornerIcon: '🧾',
  },
];

/**
 * The 6 Exclusive Gobble Haus Frame Themes (Digital & GIF Color Edition):
 * Matching 6 themes with vibrant colors for phone QR & GIF downloads.
 */
export const DIGITAL_COLOR_THEMES: FrameTheme[] = [
  {
    id: 'gobble_old_mac',
    name: 'Gobble Haus Mac',
    category: 'gobble',
    background: '#f5f0e1',
    borderStyle: 'old_apple_mac',
    textColor: '#1c1917',
    accentColor: '#44403c',
    headerText: 'GOBBLE MAC 128K • SYSTEM 1.0',
    footerText: 'HELLO, BUSOG! • INASAL & FLOAT OS',
    dateVisible: true,
    cornerIcon: '🖥️',
  },
  {
    id: 'gobble_old_phone',
    name: 'Gobble Haus Phone',
    category: 'gobble',
    background: '#e2e8f0',
    borderStyle: 'old_phone',
    textColor: '#0f172a',
    accentColor: '#334155',
    headerText: 'GOBBLE HAUS PHONE • 5G BUSOG',
    footerText: 'CALLING: INASAL & FLOAT HOTLINE',
    dateVisible: true,
    cornerIcon: '📟',
  },
  {
    id: 'gobble_arcade_boy',
    name: 'Gobble Boy Arcade',
    category: 'gobble',
    background: '#ede9fe',
    borderStyle: 'arcade_boy',
    textColor: '#1e1b4b',
    accentColor: '#6d28d9',
    headerText: 'GOBBLE BOY • 8-BIT KITCHEN',
    footerText: 'HIGH SCORE 999,990 • INASAL & FLOAT',
    dateVisible: true,
    cornerIcon: '🕹️',
  },
  {
    id: 'gobble_wanted_poster',
    name: 'Wanted: Food Bandit',
    category: 'gobble',
    background: '#fef3c7',
    borderStyle: 'wanted_poster',
    textColor: '#451a03',
    accentColor: '#b45309',
    headerText: 'WANTED • DEAD OR BUSOG',
    footerText: 'REWARD: 999,999,000 RICE BOXES',
    dateVisible: true,
    cornerIcon: '🤠',
  },
  {
    id: 'gobble_pokemon_card',
    name: 'Poké-Gobble Card',
    category: 'gobble',
    background: '#fef9c3',
    borderStyle: 'pokemon_card',
    textColor: '#1e1b4b',
    accentColor: '#d97706',
    headerText: 'GOBBLE-CHU • HP 999',
    footerText: 'CHICKEN INASAL FLAME • +999 DMG',
    dateVisible: true,
    cornerIcon: '⚡',
  },
  {
    id: 'gobble_rice_box',
    name: 'Rice in a Box',
    category: 'gobble',
    background: '#fffbeb',
    borderStyle: 'rice_box',
    textColor: '#7c2d12',
    accentColor: '#ea580c',
    headerText: 'GOBBLE HAUS • RICE IN A BOX',
    footerText: 'CHICKEN INASAL • ICE CREAM • FLOAT',
    dateVisible: true,
    cornerIcon: '🥡',
  },
  {
    id: 'gobble_hungry',
    name: 'So Hungry!',
    category: 'gobble',
    background: '#fff1f2',
    borderStyle: 'hungry_theme',
    textColor: '#881337',
    accentColor: '#e11d48',
    headerText: 'WARNING: 100% HUNGRY!',
    footerText: 'FEED ME GOBBLE HAUS • NO CRUMBS LEFT',
    dateVisible: true,
    cornerIcon: '🍴',
  },
  {
    id: 'gobble_ice_cream_float',
    name: 'Ice Cream & Float',
    category: 'gobble',
    background: '#f0f9ff',
    borderStyle: 'ice_cream_float',
    textColor: '#0c4a6e',
    accentColor: '#0284c7',
    headerText: 'GOBBLE HAUS • FLOAT & ICE CREAM',
    footerText: 'ICE COLD FLOAT • CREAMY SWIRL',
    dateVisible: true,
    cornerIcon: '🍦',
  },
  {
    id: 'gobble_chicken_inasal',
    name: 'Chicken Inasal',
    category: 'gobble',
    background: '#fff7ed',
    borderStyle: 'chicken_inasal',
    textColor: '#7c2d12',
    accentColor: '#ea580c',
    headerText: 'GOBBLE HAUS • CHICKEN INASAL',
    footerText: 'GRILLED TO PERFECTION • 100% JUICY',
    dateVisible: true,
    cornerIcon: '🍗',
  },
  {
    id: 'gobble_receipt',
    name: 'Gobble Receipt',
    category: 'gobble',
    background: '#fafaf9',
    borderStyle: 'order_receipt',
    textColor: '#18181b',
    accentColor: '#52525b',
    headerText: 'GOBBLE HAUS • ORDER #088',
    footerText: 'CHICKEN INASAL • FLOAT • ICE CREAM',
    dateVisible: true,
    cornerIcon: '🧾',
  },
];

export const FRAME_THEMES: FrameTheme[] = [
  ...THERMAL_FRAME_THEMES,
];

export const AVAILABLE_FILTERS: { id: PhotoFilterType; name: string; description: string }[] = [
  { id: 'noir', name: 'Monochrome', description: 'Deep shadows, pure studio contrast' },
  { id: 'none', name: 'Natural', description: 'Clean daylight neutral fidelity' },
  { id: 'vintage', name: 'Matte Film', description: 'Soft grain & subtle low-key blacks' },
  { id: 'warm', name: 'Warm Tungsten', description: 'Quiet interior warmth' },
  { id: 'glamour', name: 'Soft Light', description: 'Gentle diffusion & crisp whites' },
];

export interface EmojiCategory {
  id: string;
  label: string;
  icon?: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'gobble',
    label: 'Gobble Haus',
    icon: '🍗',
    emojis: [
      '🫶', '🫰', '🤟', '❤️', '🩷', '💖', '💕', '❤️‍🔥', '🥰', '😍',
      '🍗', '🍦', '🥤', '🥡', '🍚', '🔥', '⚡', '😋', '🤤', '🍴',
      '🥄', '🧋', '🍟', '🍔', '🍕', '🌭', '🌮', '🍩', '🍪', '🧁',
      '🍰', '🍿', '🍫', '🍬', '🍭', '🍮', '🍓', '🍒', '🍉', '🍍',
    ],
  },
  {
    id: 'love',
    label: 'Love & Hearts',
    icon: '🫶',
    emojis: [
      '🫶', '🫰', '🤟', '🫶🏻', '🫶🏼', '🫶🏽', '🫰🏻', '🫰🏼', '🫰🏽', '🤟🏻',
      '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🖤', '🤍',
      '🤎', '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💘', '💝',
      '💟', '❣️', '💔', '💌', '💋', '🥰', '😍', '😘', '😻', '💑',
      '💏', '🌹', '💐', '🌸', '🌷', '🌺', '💍', '🧸', '🕊️', '👼',
      '♥', '♡', '❥', '❦', '♾️', '🤞', '✌️', '🤙', '🫂', '✨',
    ],
  },
  {
    id: 'booth',
    label: 'Party & Booth',
    icon: '📸',
    emojis: [
      '📸', '🎞️', '✨', '🪩', '🎉', '🥳', '🕶️', '👑', '🎀', '🎈',
      '🎂', '🥂', '🎊', '🎁', '🕺', '💃', '🏆', '🥇', '🎖️', '🎫',
      '🎮', '🕹️', '🎸', '🎤', '🎧', '🎬', '🎨', '🎯', '🚀', '🛸',
    ],
  },
  {
    id: 'vibes',
    label: 'Vibes & Smiles',
    icon: '😎',
    emojis: [
      '😎', '🥰', '🤩', '😂', '🤣', '😜', '🤪', '😇', '🤠', '🥳',
      '🫶', '🫰', '🤟', '✌️', '🤘', '🤙', '👍', '👏', '🙌', '💪',
      '💫', '⭐', '🌟', '🦄', '🐱', '🐶', '🐼', '🦊', '🦋', '🌈',
    ],
  },
  {
    id: 'minimal',
    label: 'Badges & Retro',
    icon: '✦',
    emojis: [
      '♥', '♡', '❥', '❦', '✦', '★', '☆', '✧', '✿', '❀',
      '●', '▲', '◆', '❖', '👑', '💎', '⚡', '🔥', '💥', '💯',
      '💢', '💤', '💬', '💭', '🗯️', '♠️', '♥️', '♦️', '♣️', '♾️',
    ],
  },
];

export const FUN_STICKERS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

/**
 * Apply canvas color filter matrix
 */
export function applyCanvasFilter(
  ctx: CanvasRenderingContext2D,
  filter: PhotoFilterType,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (filter === 'none') return;

  const imgData = ctx.getImageData(x, y, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filter === 'noir') {
      // High contrast B&W
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const contrast = ((gray - 128) * 1.35) + 128;
      const clamped = Math.max(0, Math.min(255, contrast));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    } else if (filter === 'vintage') {
      // Sepia warm vintage film
      data[i] = Math.min(255, r * 1.1 + 20);
      data[i + 1] = Math.min(255, g * 0.95 + 10);
      data[i + 2] = Math.max(0, b * 0.75 - 10);
    } else if (filter === 'warm') {
      data[i] = Math.min(255, r * 1.18);
      data[i + 1] = Math.min(255, g * 1.05);
      data[i + 2] = Math.max(0, b * 0.88);
    } else if (filter === 'glamour') {
      // High key bright vibrance
      data[i] = Math.min(255, r * 1.12 + 15);
      data[i + 1] = Math.min(255, g * 1.12 + 15);
      data[i + 2] = Math.min(255, b * 1.15 + 15);
    } else if (filter === 'cyber') {
      // Blue neon highlights
      data[i] = Math.max(0, r * 0.85);
      data[i + 1] = Math.min(255, g * 1.1 + 10);
      data[i + 2] = Math.min(255, b * 1.35 + 30);
    } else if (filter === 'duotone') {
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Interpolate between dark indigo (20, 10, 50) and bright magenta (255, 60, 150)
      data[i] = Math.round(20 + gray * (255 - 20));
      data[i + 1] = Math.round(10 + gray * (70 - 10));
      data[i + 2] = Math.round(50 + gray * (160 - 50));
    }
  }

  ctx.putImageData(imgData, x, y);
}

/**
 * Presets for adjusting physical thermal photo print brightness / lightness.
 */
export const THERMAL_BRIGHTNESS_PRESETS: {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
  description: string;
}[] = [
  {
    id: 'darker',
    label: 'Darker',
    shortLabel: 'Darker',
    value: -15,
    description: 'Deeper blacks for outdoor or overly bright lighting',
  },
  {
    id: 'standard',
    label: 'Normal',
    shortLabel: 'Normal',
    value: 15,
    description: 'Balanced tone curve for well-lit studio setups',
  },
  {
    id: 'bright',
    label: 'Bright ★',
    shortLabel: 'Bright',
    value: 45,
    description: 'Recommended — lifts shadows & faces for crisp thermal receipts',
  },
  {
    id: 'extra_bright',
    label: 'Extra Bright',
    shortLabel: 'Extra Bright',
    value: 70,
    description: 'High-key shadow boost for indoor rooms & dark hair/clothing',
  },
  {
    id: 'max_light',
    label: 'Max Light',
    shortLabel: 'Max Light',
    value: 92,
    description: 'Maximum shadow opening for low-light camera captures',
  },
];

/**
 * Applies a physical-printhead-calibrated Gamma & Thermal Energy Tone Curve to a photo region.
 * 1. Analyzes input image luminance histogram (8th-percentile shadow P8, 92nd-percentile highlight P92, and mean brightness)
 *    to stretch narrow dynamic ranges and prevent washed-out bright portraits or overly dark low-light captures.
 * 2. Applies Inverse Print Head Dot-Gain Gamma Correction (gamma = 0.50..0.92) blended with a Hermite S-Curve
 *    so facial features and midtones stay crisp rather than flat.
 * 3. Maps optical density into the physical thermal print head's active energy window:
 *    - Highlight Activation Floor (E_min): Ensures subtle portrait highlights (210..240) receive sufficient
 *      thermal dot energy to register on paper instead of washing out to blank white.
 *    - Shadow Saturation Ceiling (E_max): Caps maximum continuous halftone burn energy at ~83% (shadowToe = 34..52)
 *      so dark hair and shadows never overheat the print head or fuse into solid black blobs.
 *
 * @param brightness -30 (Darker) to +100 (Max Light). Default is +45 (Bright).
 */
export function applyThermalPhotoToneCurve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  brightness: number = 45
) {
  const rx = Math.max(0, Math.round(x));
  const ry = Math.max(0, Math.round(y));
  const rw = Math.max(1, Math.round(width));
  const rh = Math.max(1, Math.round(height));

  const imgData = ctx.getImageData(rx, ry, rw, rh);
  const data = imgData.data;

  const clampedBrightness = Math.max(-40, Math.min(100, Number(brightness ?? 45)));
  const bNorm = clampedBrightness / 100; // -0.40 to +1.00

  // 1. Histogram & Auto-Exposure Analysis across the subject region
  const hist = new Uint32Array(256);
  let sumLum = 0;
  let sampleCount = 0;
  for (let i = 0; i < data.length; i += 8) {
    const lum = Math.max(
      0,
      Math.min(255, Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]))
    );
    hist[lum]++;
    sumLum += lum;
    sampleCount++;
  }
  const avgLum = sampleCount > 0 ? sumLum / sampleCount : 128;

  // Locate 8th percentile (black point P8) and 92nd percentile (white point P92)
  let p8 = 16;
  let p92 = 240;
  if (sampleCount > 0) {
    const targetLow = sampleCount * 0.08;
    const targetHigh = sampleCount * 0.92;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= targetLow) {
        p8 = v;
        break;
      }
    }
    acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= targetHigh) {
        p92 = v;
        break;
      }
    }
  }

  // Adaptive exposure compensation:
  // - Lifts under-exposed captures (avgLum < 115) so faces never print overly dark
  // - Pulls down over-exposed / washed-out captures (avgLum > 168) so bright skin/highlights retain detail
  const autoExposureOffset =
    avgLum < 115
      ? Math.min(0.24, ((115 - avgLum) / 115) * 0.28)
      : avgLum > 168
      ? -Math.min(0.18, ((avgLum - 168) / 87) * 0.22)
      : 0;
  const effectiveBNorm = Math.max(-0.3, Math.min(1.0, bNorm + autoExposureOffset));

  // Soft black/white anchoring prevents low-contrast or high-key photos from looking washed out
  const blackAnchor = Math.max(0, Math.min(42, Math.round((p8 - 10) * 0.45)));
  const whiteAnchor = Math.max(212, Math.min(252, Math.round(244 - Math.max(0, 240 - p92) * 0.35)));
  const anchorSpan = Math.max(120, whiteAnchor - blackAnchor);

  // 2. Physical Print Head Gamma Exponent (compensates for ~1.45x thermal paper dot gain)
  const gamma = Math.max(0.46, Math.min(1.05, 0.70 - effectiveBNorm * 0.20));

  // 3. Physical Thermal Head Energy Bounds:
  // - shadowToe (max continuous halftone energy ceiling ~82-86%): prevents solid black overheating in dark hair
  // - highlightKnee (min paper activation threshold): ensures light midtones/faces don't wash out to blank white
  const shadowToe = Math.max(26, Math.min(54, Math.round(34 + effectiveBNorm * 16)));
  const whitePoint = Math.max(218, Math.min(250, Math.round(243 - Math.max(0, effectiveBNorm) * 14)));

  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    // Normalize input luminance within anchored dynamic range [blackAnchor..whiteAnchor]
    const nRaw = Math.max(0, Math.min(1, (v - blackAnchor) / anchorSpan));

    // Apply Inverse Print Head Gamma Power Law: I_gamma = nRaw ^ gamma
    const gammaCorrected = Math.pow(nRaw, gamma);

    // Blend with smooth Hermite S-Curve (3t^2 - 2t^3) to preserve midtone portrait contrast & prevent washed-out skin
    const sCurve = gammaCorrected * gammaCorrected * (3 - 2 * gammaCorrected);
    const energiMapped = gammaCorrected * 0.78 + sCurve * 0.22;

    const mapped = energiMapped * 255;
    if (mapped >= whitePoint) {
      lut[v] = 255;
    } else {
      const ratio = Math.max(0, mapped) / whitePoint;
      lut[v] = Math.round(shadowToe + ratio * (255 - shadowToe));
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const val = lut[Math.max(0, Math.min(255, gray))];
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, rx, ry);
}

/**
 * Renders custom illustrated line-art drawings and typography in the Top Header Zone
 * (above the centered photo) and Bottom Footer Zone (below the centered photo)
 * for each of the 6 Gobble Haus frame themes.
 * Uses crisp vector line-art so thermal prints (isThermalMode: true) are 100% sharp
 * with zero horizontal banding across the centered photo.
 */
function drawGobbleFrameTopAndBottomArt(
  ctx: CanvasRenderingContext2D,
  theme: FrameTheme,
  canvasWidth: number,
  canvasHeight: number,
  headerZoneHeight: number,
  footerZoneHeight: number,
  margin: number,
  dateStr: string,
  isThermalMode: boolean
) {
  const ink = isThermalMode ? '#000000' : theme.textColor;
  const accent = isThermalMode ? '#000000' : theme.accentColor;
  const s = canvasWidth / 600; // Scale factor (1.0 for 600px, 1.333 for 800px, 2.0 for 1200px)
  const leftX = margin;
  const rightX = canvasWidth - margin;
  const contentW = rightX - leftX;
  const centerX = canvasWidth / 2;
  const bottomStartY = canvasHeight - footerZoneHeight;

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawStar = (cx: number, cy: number, outerR: number, innerR: number, filled = true) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) ctx.fill();
    else ctx.stroke();
  };

  const drawEnergyBadge = (cx: number, cy: number, r: number) => {
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    drawStar(cx, cy, r * 0.62, r * 0.28, true);
  };

  // Auto-scales font size down if device glyph metrics (e.g. iOS Courier/Menlo) exceed maxW, preventing any text/border overlap
  const fillFittedText = (
    text: string,
    x: number,
    y: number,
    maxW: number,
    baseFontPx: number,
    weight: string = '900',
    family: string = 'sans-serif'
  ) => {
    let size = Math.round(baseFontPx);
    const minSize = Math.max(7, Math.round(7.5 * s));
    ctx.font = `${weight} ${size}px ${family}`;
    while (ctx.measureText(text).width > maxW && size > minSize) {
      size -= 1;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    ctx.fillText(text, x, y, maxW);
  };

  const styleId = theme.borderStyle || theme.id;

  const drawRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // =========================================================================
  // 0A. OLD APPLE MACINTOSH COMPUTER THEME ('old_apple_mac' / 'gobble_old_mac')
  // =========================================================================
  if (styleId === 'old_apple_mac' || theme.id === 'gobble_old_mac') {
    const macTopY = 20 * s;
    const macBottomY = canvasHeight - 16 * s;
    const innerPad = 14 * s;
    const innerLeftX = leftX + innerPad;
    const innerRightX = rightX - innerPad;
    const innerW = contentW - innerPad * 2;

    // Helper: Draw Iconic Bitten Retro Apple Silhouette
    const drawRetroBittenApple = (cx: number, cy: number, r: number, filled: boolean = true) => {
      ctx.save();
      ctx.beginPath();
      // Left & right lobes of the apple
      ctx.moveTo(cx, cy - r * 0.55);
      ctx.bezierCurveTo(cx - r * 0.55, cy - r * 0.95, cx - r * 1.15, cy - r * 0.35, cx - r * 0.95, cy + r * 0.3);
      ctx.bezierCurveTo(cx - r * 0.8, cy + r * 0.85, cx - r * 0.35, cy + r * 1.05, cx - r * 0.08, cy + r * 0.82);
      ctx.bezierCurveTo(cx + r * 0.08, cy + r * 0.82, cx + r * 0.35, cy + r * 1.05, cx + r * 0.72, cy + r * 0.72);
      // Right side with bite indentation
      ctx.bezierCurveTo(cx + r * 0.92, cy + r * 0.5, cx + r * 0.95, cy + r * 0.35, cx + r * 0.82, cy + r * 0.25);
      ctx.arc(cx + r * 0.98, cy - r * 0.05, r * 0.36, Math.PI * 0.68, -Math.PI * 0.68, true);
      ctx.bezierCurveTo(cx + r * 0.82, cy - r * 0.78, cx + r * 0.42, cy - r * 0.92, cx, cy - r * 0.55);
      ctx.closePath();
      if (filled) ctx.fill();
      else ctx.stroke();

      // Top leaf
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.02, cy - r * 0.65);
      ctx.quadraticCurveTo(cx + r * 0.05, cy - r * 1.15, cx + r * 0.48, cy - r * 1.18);
      ctx.quadraticCurveTo(cx + r * 0.42, cy - r * 0.72, cx + r * 0.02, cy - r * 0.65);
      ctx.closePath();
      if (filled) ctx.fill();
      else ctx.stroke();
      ctx.restore();
    };

    // 1. Outer 1984 Macintosh 128K All-in-One Computer Chassis
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(leftX, macTopY, contentW, macBottomY - macTopY, 24 * s);
    ctx.stroke();

    // Inner recessed front-bezel seam line
    ctx.lineWidth = 1.6 * s;
    drawRoundedRectPath(
      leftX + 5 * s,
      macTopY + 5 * s,
      contentW - 10 * s,
      macBottomY - macTopY - 10 * s,
      20 * s
    );
    ctx.stroke();

    // Top Cooling Vent Slots on Upper Bezel
    ctx.lineWidth = 2.2 * s;
    for (let v = -5; v <= 5; v++) {
      const vx = centerX + v * 20 * s;
      ctx.beginPath();
      ctx.moveTo(vx, macTopY + 11 * s);
      ctx.lineTo(vx, macTopY + 19 * s);
      ctx.stroke();
    }

    // 2. Classic 1984 Macintosh System 1.0 Desktop Menu Bar
    const menuBarY = macTopY + 25 * s;
    const menuBarH = 26 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    drawRoundedRectPath(innerLeftX, menuBarY, innerW, menuBarH, 6 * s);
    ctx.fill();
    ctx.stroke();

    // Bitten Apple icon on far left of Menu Bar
    ctx.fillStyle = ink;
    drawRetroBittenApple(innerLeftX + 15 * s, menuBarY + 14 * s, 6.5 * s, true);

    // Classic Mac OS Menu Items: File  Edit  View  Inasal  Float  Gobble
    ctx.textAlign = 'left';
    fillFittedText(
      'File   Edit   Inasal   Float   Gobble',
      innerLeftX + 30 * s,
      menuBarY + 17.5 * s,
      innerW - 140 * s,
      11.5 * s,
      '900',
      'monospace'
    );

    ctx.textAlign = 'right';
    fillFittedText(
      'GOBBLE OS 1.0',
      innerRightX - 8 * s,
      menuBarY + 17.5 * s,
      105 * s,
      10.5 * s,
      '900',
      'monospace'
    );

    // 3. Classic Mac Window Title Bar with Horizontal Pinstripes & Close Box
    const winTitleY = menuBarY + menuBarH + 7 * s;
    const winTitleH = 30 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#e7e5e4';
    ctx.fillRect(innerLeftX, winTitleY, innerW, winTitleH);
    ctx.strokeRect(innerLeftX, winTitleY, innerW, winTitleH);

    // Horizontal Macintosh Title Bar Pinstripes
    ctx.lineWidth = 1.4 * s;
    for (let py = winTitleY + 5 * s; py <= winTitleY + winTitleH - 5 * s; py += 4 * s) {
      ctx.beginPath();
      ctx.moveTo(innerLeftX + 6 * s, py);
      ctx.lineTo(innerRightX - 6 * s, py);
      ctx.stroke();
    }

    // Left Window Close Box [□]
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    ctx.fillRect(innerLeftX + 10 * s, winTitleY + 7 * s, 16 * s, 16 * s);
    ctx.strokeRect(innerLeftX + 10 * s, winTitleY + 7 * s, 16 * s, 16 * s);

    // Right Window Zoom Box
    ctx.fillRect(innerRightX - 26 * s, winTitleY + 7 * s, 16 * s, 16 * s);
    ctx.strokeRect(innerRightX - 26 * s, winTitleY + 7 * s, 16 * s, 16 * s);
    ctx.strokeRect(innerRightX - 26 * s, winTitleY + 7 * s, 10 * s, 10 * s);

    // Centered White Backdrop Pill for Window Title Text over the pinstripes
    const titleBoxW = 284 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    ctx.fillRect(centerX - titleBoxW / 2, winTitleY + 3 * s, titleBoxW, winTitleH - 6 * s);
    ctx.strokeRect(centerX - titleBoxW / 2, winTitleY + 3 * s, titleBoxW, winTitleH - 6 * s);

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      'GOBBLE HAUS MACINTOSH 128K',
      centerX,
      winTitleY + 20 * s,
      titleBoxW - 14 * s,
      14.5 * s,
      '900',
      'monospace'
    );

    // 4. Continuous Recessed CRT Monitor Bezel (wraps Finder info header, photo slots, and bottom CRT status bar)
    const crtTopY = headerZoneHeight - 66 * s;
    const crtBottomY = bottomStartY + 30 * s;
    ctx.lineWidth = 3.2 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(
      innerLeftX - 4 * s,
      crtTopY,
      innerW + 8 * s,
      crtBottomY - crtTopY,
      14 * s
    );
    ctx.stroke();

    // Finder Info Header Strip inside CRT Monitor (above photos)
    const finderY = crtTopY + 18 * s;
    ctx.textAlign = 'left';
    fillFittedText(
      '📁 Gobble_Haus_Booth.app',
      innerLeftX + 6 * s,
      finderY,
      195 * s,
      11 * s,
      '900',
      'monospace'
    );
    ctx.textAlign = 'center';
    fillFittedText(
      'hello, busog!',
      centerX + 20 * s,
      finderY,
      120 * s,
      12 * s,
      '900',
      'serif'
    );
    ctx.textAlign = 'right';
    fillFittedText(
      '128K RAM OK',
      innerRightX - 6 * s,
      finderY,
      100 * s,
      11 * s,
      '900',
      'monospace'
    );

    // Sub-window status bar immediately above photo
    const subWinH = 26 * s;
    const subWinY = headerZoneHeight - subWinH - 10 * s;
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef3c7';
    ctx.fillRect(innerLeftX, subWinY, innerW, subWinH);
    ctx.strokeRect(innerLeftX, subWinY, innerW, subWinH);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      `★  CHICKEN INASAL • ICE CREAM FLOAT • ${dateStr.toUpperCase()}  ★`,
      centerX,
      subWinY + 17.5 * s,
      innerW - 14 * s,
      10.8 * s,
      '900',
      'monospace'
    );

    // 5. Bottom CRT Screen Scrollbar / Finder Status Bar (inside CRT bezel, right below photo)
    const crtStatusY = bottomStartY + 21 * s;
    ctx.textAlign = 'left';
    fillFittedText('◄ 100% BUSOG', innerLeftX + 6 * s, crtStatusY, 120 * s, 11 * s, '900', 'monospace');
    ctx.textAlign = 'center';
    fillFittedText('SYSTEM: GOBBLE HAUS OS', centerX, crtStatusY, 190 * s, 11 * s, '900', 'monospace');
    ctx.textAlign = 'right';
    fillFittedText('0 CRUMBS LEFT ►', innerRightX - 6 * s, crtStatusY, 130 * s, 11 * s, '900', 'monospace');

    // 6. Front Lower Macintosh Faceplate: Rainbow Apple/Gobble Badge (Left) + 3.5" Floppy Disk Drive Slot (Right)
    const faceY = bottomStartY + 40 * s;
    const badgeW = 165 * s;
    const badgeH = 44 * s;

    // Left Recessed Brand Badge Box with Bitten Apple Logo + "Gobble Haus Macintosh"
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    drawRoundedRectPath(innerLeftX, faceY, badgeW, badgeH, 8 * s);
    ctx.fill();
    ctx.stroke();

    // Bitten Apple inside a square emblem plate
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(innerLeftX + 8 * s, faceY + 7 * s, 30 * s, 30 * s);
    ctx.fillStyle = isThermalMode ? ink : '#dc2626';
    drawRetroBittenApple(innerLeftX + 23 * s, faceY + 23 * s, 9.5 * s, true);

    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    fillFittedText(
      'Gobble Haus',
      innerLeftX + 44 * s,
      faceY + 20 * s,
      badgeW - 50 * s,
      14.5 * s,
      '900',
      'serif'
    );
    fillFittedText(
      'MACINTOSH • EST 2026',
      innerLeftX + 44 * s,
      faceY + 35 * s,
      badgeW - 50 * s,
      9.5 * s,
      '900',
      'monospace'
    );

    // Right 3.5" Floppy Disk Drive Housing & Slot
    const driveX = innerLeftX + badgeW + 12 * s;
    const driveW = innerW - badgeW - 12 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#e7e5e4';
    drawRoundedRectPath(driveX, faceY, driveW, badgeH, 8 * s);
    ctx.fill();
    ctx.stroke();

    // Horizontal Floppy Disk Insertion Slot with Center Notch
    const slotX = driveX + 14 * s;
    const slotY = faceY + 12 * s;
    const slotW = driveW - 62 * s;
    const slotH = 9 * s;
    ctx.fillStyle = ink;
    ctx.fillRect(slotX, slotY, slotW, slotH);
    // Center disk grab cutout
    ctx.fillRect(slotX + slotW / 2 - 16 * s, slotY - 3 * s, 32 * s, slotH + 6 * s);

    // Physical Floppy Eject Button on Right of Slot
    const ejectX = slotX + slotW + 10 * s;
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#d6d3d1';
    ctx.fillRect(ejectX, slotY - 2 * s, 26 * s, 13 * s);
    ctx.strokeRect(ejectX, slotY - 2 * s, 26 * s, 13 * s);

    // Drive Label & Activity LED
    ctx.fillStyle = isThermalMode ? ink : '#ea580c';
    ctx.beginPath();
    ctx.arc(slotX + 6 * s, faceY + 34 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    fillFittedText(
      '3.5" FLOPPY • INASAL_OS.DSK',
      slotX + 15 * s,
      faceY + 37 * s,
      driveW - 30 * s,
      9.5 * s,
      '900',
      'monospace'
    );

    // 7. Bottom Mechanical Macintosh Keyboard & Classic 1-Button Mouse Deck
    const kbTopY = faceY + badgeH + 10 * s;
    const kbH = 74 * s;
    const mouseW = 68 * s;
    const kbW = innerW - mouseW - 12 * s;

    // Mechanical Keyboard Chassis (Left)
    ctx.lineWidth = 2.8 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#e7e5e4';
    drawRoundedRectPath(innerLeftX, kbTopY, kbW, kbH, 10 * s);
    ctx.fill();
    ctx.stroke();

    // Row 1 Keys: [] [G][O][B][B][L][E] [H][A][U][S]
    const row1Keys = ['', 'G', 'O', 'B', 'B', 'L', 'E', 'H', 'A', 'U', 'S'];
    const r1Gap = 3.5 * s;
    const r1PadX = 8 * s;
    const r1KeyW = (kbW - r1PadX * 2 - r1Gap * (row1Keys.length - 1)) / row1Keys.length;
    const r1KeyH = 20 * s;
    const r1Y = kbTopY + 8 * s;

    row1Keys.forEach((kChar, idx) => {
      const kx = innerLeftX + r1PadX + idx * (r1KeyW + r1Gap);
      ctx.lineWidth = 1.8 * s;
      ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
      drawRoundedRectPath(kx, r1Y, r1KeyW, r1KeyH, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      fillFittedText(kChar, kx + r1KeyW / 2, r1Y + 14.5 * s, r1KeyW - 2 * s, 11 * s, '900', 'monospace');
    });

    // Row 2 Keys: [⌘ CMD] [   INASAL & FLOAT SPACEBAR   ] [RETURN ⏎]
    const r2Y = r1Y + r1KeyH + 5 * s;
    const r2KeyH = 20 * s;
    const cmdW = 68 * s;
    const retW = 78 * s;
    const spaceW = kbW - r1PadX * 2 - cmdW - retW - r1Gap * 2;

    // ⌘ CMD Key
    ctx.lineWidth = 1.8 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    drawRoundedRectPath(innerLeftX + r1PadX, r2Y, cmdW, r2KeyH, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    fillFittedText('⌘ CMD', innerLeftX + r1PadX + cmdW / 2, r2Y + 14 * s, cmdW - 8 * s, 10 * s, '900', 'monospace');

    // Spacebar Key
    const spaceX = innerLeftX + r1PadX + cmdW + r1Gap;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef3c7';
    drawRoundedRectPath(spaceX, r2Y, spaceW, r2KeyH, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    fillFittedText(
      'CHICKEN INASAL & FLOAT',
      spaceX + spaceW / 2,
      r2Y + 14 * s,
      spaceW - 10 * s,
      10 * s,
      '900',
      'monospace'
    );

    // RETURN Key
    const retX = spaceX + spaceW + r1Gap;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    drawRoundedRectPath(retX, r2Y, retW, r2KeyH, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    fillFittedText('RETURN ⏎', retX + retW / 2, r2Y + 14 * s, retW - 8 * s, 10 * s, '900', 'monospace');

    // Keyboard Front Lip Label
    fillFittedText(
      'GOBBLE HAUS MECHANICAL KEYBOARD • THINK BUSOG™',
      innerLeftX + kbW / 2,
      kbTopY + kbH - 7 * s,
      kbW - 16 * s,
      9 * s,
      '900',
      'monospace'
    );

    // Classic 1-Button Blocky Macintosh Mouse (Right)
    const mouseX = innerLeftX + kbW + 12 * s;
    ctx.lineWidth = 2.8 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fafaf9';
    drawRoundedRectPath(mouseX, kbTopY + 8 * s, mouseW, kbH - 8 * s, 12 * s);
    ctx.fill();
    ctx.stroke();

    // Mouse Cord curving up to the computer
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(mouseX + mouseW / 2, kbTopY + 8 * s);
    ctx.quadraticCurveTo(mouseX + mouseW / 2 - 8 * s, kbTopY + 1 * s, mouseX + mouseW / 2, kbTopY - 6 * s);
    ctx.stroke();

    // Single Wide Rectangular Mouse Click Button
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#d6d3d1';
    drawRoundedRectPath(mouseX + 10 * s, kbTopY + 16 * s, mouseW - 20 * s, 18 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText('CLICK', mouseX + mouseW / 2, kbTopY + 29 * s, mouseW - 24 * s, 9 * s, '900', 'monospace');
    fillFittedText(' MOUSE', mouseX + mouseW / 2, kbTopY + 56 * s, mouseW - 10 * s, 9.5 * s, '900', 'monospace');

    // 8. Bottom Computer Base Serial Stamp
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      '●  GOBBLE HAUS COMPUTER INC. • MODEL M1984 • HELLO, BUSOG!  ●',
      centerX,
      macBottomY - 6 * s,
      innerW - 12 * s,
      9.2 * s,
      '900',
      'monospace'
    );
  }

  // =========================================================================
  // 0. OLD PHONE THEME — GOBBLE HAUS PHONE ('old_phone' / 'gobble_old_phone')
  // =========================================================================
  else if (styleId === 'old_phone' || theme.id === 'gobble_old_phone') {
    const phoneTopY = 24 * s;
    const phoneBottomY = canvasHeight - 16 * s;
    const innerPad = 14 * s;
    const innerLeftX = leftX + innerPad;
    const innerRightX = rightX - innerPad;
    const innerW = contentW - innerPad * 2;

    // 1. Stubby Retro External Antenna on top-right of the phone
    const antW = 24 * s;
    const antH = 16 * s;
    const antX = rightX - 56 * s;
    const antY = phoneTopY - antH + 2 * s;
    ctx.lineWidth = 3 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#334155';
    drawRoundedRectPath(antX, antY, antW, antH, 8 * s);
    ctx.fill();
    ctx.stroke();

    // Signal wave arcs radiating from the antenna
    ctx.lineWidth = 2 * s;
    [7 * s, 13 * s].forEach((arcR) => {
      ctx.beginPath();
      ctx.arc(antX + antW + 3 * s, antY + 6 * s, arcR, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    });

    // 2. Outer Retro Cell Phone Body Chassis (enclosing top earpiece, LCD screen, and bottom keypad)
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(leftX, phoneTopY, contentW, phoneBottomY - phoneTopY, 34 * s);
    ctx.stroke();

    // Subtle inner phone casing contour line
    ctx.lineWidth = 1.5 * s;
    drawRoundedRectPath(
      leftX + 5 * s,
      phoneTopY + 5 * s,
      contentW - 10 * s,
      phoneBottomY - phoneTopY - 10 * s,
      29 * s
    );
    ctx.stroke();

    // 3. Earpiece Speaker Recessed Grille at Top Center
    const earW = 124 * s;
    const earH = 16 * s;
    const earX = centerX - earW / 2;
    const earY = phoneTopY + 13 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#cbd5e1';
    drawRoundedRectPath(earX, earY, earW, earH, 8 * s);
    ctx.fill();
    ctx.stroke();

    // 5 Speaker acoustic holes inside earpiece
    ctx.fillStyle = ink;
    [-36 * s, -18 * s, 0, 18 * s, 36 * s].forEach((dx) => {
      ctx.beginPath();
      ctx.arc(centerX + dx, earY + earH / 2, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Phone Model Nameplate Badge: "GOBBLE HAUS PHONE"
    const plateW = innerW - 24 * s;
    const plateH = 34 * s;
    const plateX = centerX - plateW / 2;
    const plateY = phoneTopY + 37 * s;
    ctx.lineWidth = 2.8 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#0f172a';
    drawRoundedRectPath(plateX, plateY, plateW, plateH, 9 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isThermalMode ? ink : '#f8fafc';
    ctx.textAlign = 'center';
    fillFittedText(
      'GOBBLE HAUS PHONE',
      centerX,
      plateY + 23 * s,
      plateW - 20 * s,
      19.5 * s,
      '900',
      'monospace'
    );

    // Sub-model tagline above LCD screen bezel
    ctx.fillStyle = ink;
    fillFittedText(
      '★ RETRO EDITION • MODEL GH-3310 • 100% UNBREAKABLE ★',
      centerX,
      plateY + plateH + 17 * s,
      innerW - 12 * s,
      10.5 * s,
      '900',
      'monospace'
    );

    // 5. Continuous Inner LCD Screen Bezel (wraps top LCD status bar, photo slots, and bottom soft-keys)
    const screenTopY = headerZoneHeight - 72 * s;
    const screenBottomY = bottomStartY + 30 * s;
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(
      innerLeftX - 4 * s,
      screenTopY,
      innerW + 8 * s,
      screenBottomY - screenTopY,
      12 * s
    );
    ctx.stroke();

    // Top LCD Status Bar: Signal Bars + Carrier on Left, SMS icon center, Battery Bars on Right
    const statusY = screenTopY + 22 * s;
    const sigBaseX = innerLeftX + 6 * s;
    [6 * s, 10 * s, 14 * s, 18 * s].forEach((barH, idx) => {
      ctx.fillStyle = ink;
      ctx.fillRect(sigBaseX + idx * 6 * s, statusY - barH + 2 * s, 4 * s, barH);
    });
    ctx.textAlign = 'left';
    fillFittedText(
      '5G GOBBLE-TEL',
      sigBaseX + 28 * s,
      statusY,
      130 * s,
      11.5 * s,
      '900',
      'monospace'
    );

    ctx.textAlign = 'center';
    fillFittedText('✉ 1 VIP SNAP', centerX, statusY, 110 * s, 11 * s, '900', 'monospace');

    // Retro 4-cell battery indicator on top-right of LCD
    const batW = 30 * s;
    const batH = 14 * s;
    const batX = innerRightX - batW - 6 * s;
    const batY = statusY - 12 * s;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(batX, batY, batW, batH);
    ctx.fillRect(batX + batW, batY + 3.5 * s, 3 * s, batH - 7 * s);
    for (let b = 0; b < 4; b++) {
      ctx.fillRect(batX + 3 * s + b * 6.2 * s, batY + 3 * s, 4.5 * s, batH - 6 * s);
    }
    ctx.textAlign = 'right';
    fillFittedText('100%', batX - 5 * s, statusY, 45 * s, 11 * s, '900', 'monospace');

    // LCD Caller ID / Header Strip immediately above photo
    const bannerH = 28 * s;
    const bannerY = headerZoneHeight - bannerH - 10 * s;
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#dcfce7';
    ctx.fillRect(innerLeftX, bannerY, innerW, bannerH);
    ctx.strokeRect(innerLeftX, bannerY, innerW, bannerH);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      `☎ CALLING: INASAL & FLOAT HOTLINE  •  ${dateStr.toUpperCase()}`,
      centerX,
      bannerY + 19 * s,
      innerW - 16 * s,
      11 * s,
      '900',
      'monospace'
    );

    // 6. Bottom LCD Soft-Key Bar (directly under photo, inside the LCD screen bezel)
    const softBarY = bottomStartY + 21 * s;
    ctx.textAlign = 'left';
    fillFittedText('◄ MENU', innerLeftX + 6 * s, softBarY, 90 * s, 12.5 * s, '900', 'monospace');
    ctx.textAlign = 'center';
    fillFittedText(
      'GOBBLE HAUS PHONE',
      centerX,
      softBarY,
      innerW - 180 * s,
      11.5 * s,
      '900',
      'monospace'
    );
    ctx.textAlign = 'right';
    fillFittedText('ORDER ►', innerRightX - 6 * s, softBarY, 90 * s, 12.5 * s, '900', 'monospace');

    // 7. Physical Navigation Cluster (Call Button, Center Gobble D-Pad, End Button)
    const navY = bottomStartY + 38 * s;
    const navH = 31 * s;
    const sideBtnW = innerW * 0.27;
    const centerPadW = innerW * 0.4;

    // Left Call Key
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#bbf7d0';
    drawRoundedRectPath(innerLeftX, navY, sideBtnW, navH, 10 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      '✆ CALL',
      innerLeftX + sideBtnW / 2,
      navY + 20.5 * s,
      sideBtnW - 12 * s,
      12.5 * s,
      '900',
      'monospace'
    );

    // Center D-Pad / Navi Key
    const padX = centerX - centerPadW / 2;
    ctx.lineWidth = 3 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef08a';
    drawRoundedRectPath(padX, navY - 1 * s, centerPadW, navH + 2 * s, 12 * s);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.5 * s;
    drawRoundedRectPath(padX + 4 * s, navY + 3 * s, centerPadW - 8 * s, navH - 6 * s, 8 * s);
    ctx.stroke();
    ctx.fillStyle = ink;
    fillFittedText(
      '▲ GOBBLE ▼',
      centerX,
      navY + 20.5 * s,
      centerPadW - 18 * s,
      12.5 * s,
      '900',
      'monospace'
    );

    // Right End Key
    const rightBtnX = innerRightX - sideBtnW;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fecdd3';
    drawRoundedRectPath(rightBtnX, navY, sideBtnW, navH, 10 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    fillFittedText(
      '✖ END',
      rightBtnX + sideBtnW / 2,
      navY + 20.5 * s,
      sideBtnW - 12 * s,
      12.5 * s,
      '900',
      'monospace'
    );

    // 8. Classic 3x4 T9 Physical Alphanumeric Button Keypad
    const keypadStartY = bottomStartY + 77 * s;
    const colGap = 10 * s;
    const rowGap = 4.5 * s;
    const keyW = (innerW - colGap * 2) / 3;
    const keyH = 19.5 * s;

    const keypadRows: [string, string][][] = [
      [
        ['1', 'VOICEMAIL'],
        ['2', 'ABC'],
        ['3', 'DEF'],
      ],
      [
        ['4', 'GHI'],
        ['5', 'JKL'],
        ['6', 'MNO'],
      ],
      [
        ['7', 'PQRS'],
        ['8', 'TUV'],
        ['9', 'WXYZ'],
      ],
      [
        ['*', '+'],
        ['0', 'INASAL'],
        ['#', 'FLOAT'],
      ],
    ];

    keypadRows.forEach((row, rIdx) => {
      const ky = keypadStartY + rIdx * (keyH + rowGap);
      row.forEach(([digit, letters], cIdx) => {
        const kx = innerLeftX + cIdx * (keyW + colGap);
        ctx.lineWidth = 2.2 * s;
        ctx.fillStyle = isThermalMode ? '#ffffff' : '#f8fafc';
        drawRoundedRectPath(kx, ky, keyW, keyH, 8 * s);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = ink;
        ctx.textAlign = 'left';
        fillFittedText(
          digit,
          kx + 12 * s,
          ky + 14.5 * s,
          keyW * 0.35,
          13.5 * s,
          '900',
          'sans-serif'
        );
        ctx.textAlign = 'right';
        fillFittedText(
          letters,
          kx + keyW - 10 * s,
          ky + 14 * s,
          keyW * 0.55,
          9.5 * s,
          '900',
          'monospace'
        );
      });
    });

    // 9. Bottom Microphone Pinhole & Model Stamp inside Phone Chin
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      '●  MODEL: GOBBLE HAUS PHONE  •  CHICKEN INASAL & FLOAT  ●',
      centerX,
      phoneBottomY - 7 * s,
      innerW - 10 * s,
      9.5 * s,
      '900',
      'monospace'
    );
  }

  // =========================================================================
  // 0B. GOBBLE BOY ARCADE CONSOLE THEME ('arcade_boy' / 'gobble_arcade_boy')
  // =========================================================================
  else if (styleId === 'arcade_boy' || theme.id === 'gobble_arcade_boy') {
    const consoleTopY = 20 * s;
    const consoleBottomY = canvasHeight - 18 * s;
    const innerPad = 14 * s;
    const innerLeftX = leftX + innerPad;
    const innerRightX = rightX - innerPad;
    const innerW = contentW - innerPad * 2;

    // 1. Outer Handheld Game Boy Console Body Shell
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(leftX, consoleTopY, contentW, consoleBottomY - consoleTopY, 26 * s);
    ctx.stroke();

    // Top Cartridge Grip Grooves & Power Switch Label
    ctx.lineWidth = 2 * s;
    for (let g = -3; g <= 3; g++) {
      const gx = centerX + g * 18 * s;
      ctx.beginPath();
      ctx.moveTo(gx, consoleTopY);
      ctx.lineTo(gx, consoleTopY + 10 * s);
      ctx.stroke();
    }
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    fillFittedText(
      '◄ OFF•ON ►',
      innerLeftX + 4 * s,
      consoleTopY + 22 * s,
      100 * s,
      10 * s,
      '900',
      'monospace'
    );
    ctx.textAlign = 'right';
    fillFittedText(
      '8-BIT STEREO SOUND',
      innerRightX - 4 * s,
      consoleTopY + 22 * s,
      140 * s,
      10 * s,
      '900',
      'monospace'
    );

    // 2. Retro Console Brand Header Plate: "GOBBLE BOY ARCADE"
    const brandY = consoleTopY + 32 * s;
    const brandH = 34 * s;
    ctx.lineWidth = 2.8 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#1e1b4b';
    drawRoundedRectPath(innerLeftX, brandY, innerW, brandH, 8 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isThermalMode ? ink : '#f5f3ff';
    ctx.textAlign = 'center';
    fillFittedText(
      '🕹️  GOBBLE BOY • 8-BIT ARCADE  🕹️',
      centerX,
      brandY + 23 * s,
      innerW - 20 * s,
      18.5 * s,
      '900',
      'monospace'
    );

    // Sub-header dot matrix rule
    ctx.fillStyle = ink;
    fillFittedText(
      '═══ DOT MATRIX WITH GOBBLE HAUS INASAL POWER ═══',
      centerX,
      brandY + brandH + 17 * s,
      innerW - 8 * s,
      10 * s,
      '900',
      'monospace'
    );

    // 3. Continuous Inner Arcade Screen Bezel (wraps top HUD, photo slots, and bottom HUD)
    const screenTopY = headerZoneHeight - 72 * s;
    const screenBottomY = bottomStartY + 30 * s;
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = ink;
    drawRoundedRectPath(
      innerLeftX - 4 * s,
      screenTopY,
      innerW + 8 * s,
      screenBottomY - screenTopY,
      12 * s
    );
    ctx.stroke();

    // Top Arcade HUD: Battery LED on Left, 1UP High Score Center, Hearts HP on Right
    const hudY = screenTopY + 22 * s;
    ctx.beginPath();
    ctx.arc(innerLeftX + 12 * s, hudY - 4 * s, 5 * s, 0, Math.PI * 2);
    ctx.fillStyle = isThermalMode ? ink : '#ef4444';
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    fillFittedText(
      'BATTERY MAX',
      innerLeftX + 22 * s,
      hudY,
      110 * s,
      11 * s,
      '900',
      'monospace'
    );

    ctx.textAlign = 'center';
    fillFittedText(
      '1UP: 999,990',
      centerX,
      hudY,
      120 * s,
      12 * s,
      '900',
      'monospace'
    );

    ctx.textAlign = 'right';
    fillFittedText(
      'HP ♥♥♥♥',
      innerRightX - 6 * s,
      hudY,
      100 * s,
      11.5 * s,
      '900',
      'monospace'
    );

    // Stage Banner immediately above photo
    const stageH = 28 * s;
    const stageY = headerZoneHeight - stageH - 10 * s;
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#ddd6fe';
    ctx.fillRect(innerLeftX, stageY, innerW, stageH);
    ctx.strokeRect(innerLeftX, stageY, innerW, stageH);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      `STAGE 088: CHICKEN INASAL & FLOAT  •  ${dateStr.toUpperCase()}`,
      centerX,
      stageY + 19 * s,
      innerW - 16 * s,
      11 * s,
      '900',
      'monospace'
    );

    // 4. Bottom Arcade Screen Status Bar (inside screen bezel)
    const botHudY = bottomStartY + 21 * s;
    ctx.textAlign = 'left';
    fillFittedText('LVL 99 BUSOG', innerLeftX + 6 * s, botHudY, 110 * s, 11.5 * s, '900', 'monospace');
    ctx.textAlign = 'center';
    fillFittedText('★ WINNER! ★', centerX, botHudY, 110 * s, 11.5 * s, '900', 'monospace');
    ctx.textAlign = 'right';
    fillFittedText('CREDIT 99', innerRightX - 6 * s, botHudY, 100 * s, 11.5 * s, '900', 'monospace');

    // 5. Console Emblem Strip Below Screen Bezel
    const subBrandY = bottomStartY + 48 * s;
    ctx.textAlign = 'center';
    fillFittedText(
      'NINTEN-GOBBLE  •  GOBBLE HAUS POCKET SYSTEM',
      centerX,
      subBrandY,
      innerW - 12 * s,
      12.5 * s,
      '900',
      'sans-serif'
    );

    // 6. Left Cross D-Pad + Right A/B Action Buttons + Center Power Badge
    const controlsCy = bottomStartY + 102 * s;
    const dpadCx = innerLeftX + 58 * s;
    const dpadCy = controlsCy;
    const armLen = 38 * s;
    const armHalfW = 13 * s;

    // Unified 12-point Cross D-Pad Polygon
    ctx.lineWidth = 3 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#312e81';
    ctx.beginPath();
    ctx.moveTo(dpadCx - armHalfW, dpadCy - armLen);
    ctx.lineTo(dpadCx + armHalfW, dpadCy - armLen);
    ctx.lineTo(dpadCx + armHalfW, dpadCy - armHalfW);
    ctx.lineTo(dpadCx + armLen, dpadCy - armHalfW);
    ctx.lineTo(dpadCx + armLen, dpadCy + armHalfW);
    ctx.lineTo(dpadCx + armHalfW, dpadCy + armHalfW);
    ctx.lineTo(dpadCx + armHalfW, dpadCy + armLen);
    ctx.lineTo(dpadCx - armHalfW, dpadCy + armLen);
    ctx.lineTo(dpadCx - armHalfW, dpadCy + armHalfW);
    ctx.lineTo(dpadCx - armLen, dpadCy + armHalfW);
    ctx.lineTo(dpadCx - armLen, dpadCy - armHalfW);
    ctx.lineTo(dpadCx - armHalfW, dpadCy - armHalfW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center D-Pad Pivot Circle
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = isThermalMode ? ink : '#ede9fe';
    ctx.beginPath();
    ctx.arc(dpadCx, dpadCy, 7 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ink;

    // Center Mini Cartridge / Combo Box between D-Pad and A/B Buttons
    const midBoxW = 128 * s;
    const midBoxH = 48 * s;
    ctx.lineWidth = 2.2 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#f5f3ff';
    drawRoundedRectPath(centerX - midBoxW / 2, controlsCy - midBoxH / 2, midBoxW, midBoxH, 10 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText('COMBO MOVE', centerX, controlsCy - 4 * s, midBoxW - 14 * s, 11.5 * s, '900', 'monospace');
    fillFittedText('INASAL + FLOAT', centerX, controlsCy + 14 * s, midBoxW - 14 * s, 11.5 * s, '900', 'sans-serif');

    // Right A & B Round Action Buttons
    const btnR = 19 * s;
    const bBtnCx = innerRightX - 88 * s;
    const bBtnCy = controlsCy + 12 * s;
    const aBtnCx = innerRightX - 34 * s;
    const aBtnCy = controlsCy - 12 * s;

    [
      { cx: bBtnCx, cy: bBtnCy, label: 'B', sub: 'FLOAT' },
      { cx: aBtnCx, cy: aBtnCy, label: 'A', sub: 'INASAL' },
    ].forEach((btn) => {
      ctx.lineWidth = 3 * s;
      ctx.fillStyle = isThermalMode ? '#ffffff' : '#db2777';
      ctx.beginPath();
      ctx.arc(btn.cx, btn.cy, btnR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isThermalMode ? ink : '#ffffff';
      ctx.textAlign = 'center';
      fillFittedText(btn.label, btn.cx, btn.cy + 6 * s, btnR * 1.4, 17 * s, '900', 'sans-serif');

      ctx.fillStyle = ink;
      fillFittedText(btn.sub, btn.cx, btn.cy + btnR + 14 * s, 54 * s, 9.5 * s, '900', 'monospace');
    });

    // 7. Bottom SELECT & START Pill Buttons + Speaker Grille Vents
    const pillY = bottomStartY + 150 * s;
    const pillW = 68 * s;
    const pillH = 16 * s;
    [
      { x: centerX - pillW - 10 * s, label: 'SELECT' },
      { x: centerX + 10 * s, label: 'START' },
    ].forEach((p) => {
      ctx.lineWidth = 2.2 * s;
      ctx.fillStyle = isThermalMode ? '#ffffff' : '#cbd5e1';
      drawRoundedRectPath(p.x, pillY, pillW, pillH, 8 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      fillFittedText(p.label, p.x + pillW / 2, pillY + 12 * s, pillW - 10 * s, 10 * s, '900', 'monospace');
    });

    // Speaker Vents on Bottom-Right Corner
    ctx.lineWidth = 2.5 * s;
    for (let v = 0; v < 4; v++) {
      const vx = innerRightX - 50 * s + v * 12 * s;
      ctx.beginPath();
      ctx.moveTo(vx, pillY + 2 * s);
      ctx.lineTo(vx - 10 * s, pillY + 18 * s);
      ctx.stroke();
    }

    // Bottom Console Serial Line
    ctx.textAlign = 'center';
    fillFittedText(
      '© 2026 GOBBLE HAUS ARCADE • PLAYER 1 READY!',
      centerX,
      consoleBottomY - 8 * s,
      innerW - 16 * s,
      9.5 * s,
      '900',
      'monospace'
    );
  }

  // =========================================================================
  // 0C. WANTED: FOOD BANDIT POSTER THEME ('wanted_poster' / 'gobble_wanted_poster')
  // =========================================================================
  else if (styleId === 'wanted_poster' || theme.id === 'gobble_wanted_poster') {
    const posterTopY = 20 * s;
    const posterBottomY = canvasHeight - 20 * s;
    const innerPad = 14 * s;
    const innerLeftX = leftX + innerPad;
    const innerRightX = rightX - innerPad;
    const innerW = contentW - innerPad * 2;

    // 1. Double Western Bounty Poster Border (Outer Heavy Frame + Inner Thin Frame)
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = ink;
    ctx.strokeRect(leftX, posterTopY, contentW, posterBottomY - posterTopY);
    ctx.lineWidth = 1.8 * s;
    ctx.strokeRect(
      leftX + 7 * s,
      posterTopY + 7 * s,
      contentW - 14 * s,
      posterBottomY - posterTopY - 14 * s
    );

    // 4 Corner Sheriff Stars inside Poster Frame
    const starOff = 20 * s;
    drawStar(leftX + starOff, posterTopY + starOff, 9 * s, 4 * s, true);
    drawStar(rightX - starOff, posterTopY + starOff, 9 * s, 4 * s, true);
    drawStar(leftX + starOff, posterBottomY - starOff, 9 * s, 4 * s, true);
    drawStar(rightX - starOff, posterBottomY - starOff, 9 * s, 4 * s, true);

    // 2. Top Sheriff Notice Line
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      '★  GOBBLE HAUS SHERIFF DEPARTMENT • BOUNTY NOTICE  ★',
      centerX,
      posterTopY + 26 * s,
      innerW - 44 * s,
      11 * s,
      '900',
      'monospace'
    );

    // 3. Giant Western Saloon "W A N T E D" Headline
    fillFittedText(
      'W A N T E D',
      centerX,
      posterTopY + 72 * s,
      innerW - 10 * s,
      42 * s,
      '900',
      'serif'
    );

    // 4. Bold Ribbon Box: "DEAD OR 100% BUSOG!"
    const ribY = posterTopY + 84 * s;
    const ribH = 30 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fde68a';
    ctx.fillRect(innerLeftX, ribY, innerW, ribH);
    ctx.strokeRect(innerLeftX, ribY, innerW, ribH);
    ctx.fillStyle = ink;
    fillFittedText(
      'DEAD OR 100% BUSOG  •  ARMED WITH CHOPSTICKS & SPOON',
      centerX,
      ribY + 20 * s,
      innerW - 18 * s,
      12 * s,
      '900',
      'monospace'
    );

    // 5. Crime Dossier Strip right above photo
    const crimeH = 28 * s;
    const crimeY = headerZoneHeight - crimeH - 10 * s;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(innerLeftX, crimeY, innerW, crimeH);
    fillFittedText(
      `CRIME: STEALING ALL THE CHICKEN INASAL & FLOATS  •  ${dateStr.toUpperCase()}`,
      centerX,
      crimeY + 19 * s,
      innerW - 16 * s,
      10.8 * s,
      '900',
      'monospace'
    );

    // 6. Bottom Reward Header & Giant Bounty Amount Box
    const rewardTitleY = bottomStartY + 28 * s;
    drawStar(centerX - 118 * s, rewardTitleY - 7 * s, 10 * s, 4.5 * s, true);
    drawStar(centerX + 118 * s, rewardTitleY - 7 * s, 10 * s, 4.5 * s, true);
    fillFittedText(
      'R E W A R D',
      centerX,
      rewardTitleY,
      200 * s,
      22 * s,
      '900',
      'serif'
    );

    const bountyBoxY = bottomStartY + 38 * s;
    const bountyBoxH = 44 * s;
    ctx.lineWidth = 3 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef08a';
    ctx.fillRect(innerLeftX, bountyBoxY, innerW, bountyBoxH);
    ctx.strokeRect(innerLeftX, bountyBoxY, innerW, bountyBoxH);
    ctx.fillStyle = ink;
    fillFittedText(
      '₿ 999,999,000  RICE BOXES',
      centerX,
      bountyBoxY + 30 * s,
      innerW - 20 * s,
      25 * s,
      '900',
      'monospace'
    );

    // 7. Bandit Profile Dossier Rows
    const dosY = bountyBoxY + bountyBoxH + 22 * s;
    ctx.textAlign = 'left';
    fillFittedText(
      'KNOWN ALIAS: "THE INASAL & ICE CREAM FLOAT BANDIT"',
      innerLeftX + 4 * s,
      dosY,
      innerW - 8 * s,
      12 * s,
      '900',
      'monospace'
    );
    fillFittedText(
      'CAUTION: EXTREMELY HUNGRY • FEED IMMEDIATELY AT GOBBLE HAUS!',
      innerLeftX + 4 * s,
      dosY + 20 * s,
      innerW - 8 * s,
      11.5 * s,
      '900',
      'monospace'
    );

    // Divider line above Sheriff Stamp
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(innerLeftX, dosY + 32 * s);
    ctx.lineTo(innerRightX, dosY + 32 * s);
    ctx.stroke();

    // 8. Bottom Sheriff Seal Signature
    ctx.textAlign = 'center';
    fillFittedText(
      'BY ORDER OF SHERIFF GOBBLE HAUS  •  CASE #GH-088  •  NO CRUMBS LEFT',
      centerX,
      posterBottomY - 14 * s,
      innerW - 36 * s,
      10 * s,
      '900',
      'monospace'
    );
  }

  // =========================================================================
  // 1. POKÉMON CARD THEME ('pokemon_card' / 'gobble_pokemon_card')
  // =========================================================================
  else if (styleId === 'pokemon_card' || theme.id === 'gobble_pokemon_card') {
    const cardTopY = 22 * s;
    const cardBottomY = canvasHeight - 22 * s;
    const innerPad = 14 * s;
    const innerLeftX = leftX + innerPad;
    const innerRightX = rightX - innerPad;
    const innerW = contentW - innerPad * 2;

    // Continuous unbroken collector card frame enclosing header, photo(s), and footer
    ctx.lineWidth = 3.5 * s;
    ctx.strokeStyle = ink;
    ctx.strokeRect(leftX, cardTopY, contentW, cardBottomY - cardTopY);

    // Evolution Stage pill box on top-left
    const pillX = innerLeftX;
    const pillY = cardTopY + 12 * s;
    const pillW = 192 * s;
    const pillH = 28 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef08a';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeRect(pillX, pillY, pillW, pillH);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      'STAGE 2 • GOBBLEMON',
      pillX + pillW / 2,
      pillY + 19 * s,
      pillW - 16 * s,
      11.5 * s,
      '900',
      'monospace'
    );

    // Pokedex info strip banner right above centered photo (aligned with inner photo width)
    const bannerH = 30 * s;
    const bannerY = headerZoneHeight - bannerH - 12 * s;
    const titleY = Math.round((pillY + pillH + bannerY) / 2 + 10 * s);

    // Pokemon Name: GOBBLE-CHU
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    fillFittedText('GOBBLE-CHU', innerLeftX, titleY, innerW - 175 * s, 28 * s, '900', 'sans-serif');

    // Right side HP 999 + Energy Circle
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    fillFittedText('HP', innerRightX - 104 * s, titleY - 2 * s, 38 * s, 15.5 * s, '900', 'sans-serif');
    ctx.fillStyle = ink;
    fillFittedText('999', innerRightX - 42 * s, titleY, 58 * s, 30 * s, '900', 'sans-serif');
    drawEnergyBadge(innerRightX - 16 * s, titleY - 11 * s, 14.5 * s);

    // Draw Pokedex strip box
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = ink;
    ctx.strokeRect(innerLeftX, bannerY, innerW, bannerH);
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    fillFittedText(
      `NO. 088  INASAL & FLOAT POKÉMON  •  HT: 100% FRESH  •  ${dateStr.toUpperCase()}`,
      centerX,
      bannerY + 20 * s,
      innerW - 20 * s,
      11 * s,
      'bold',
      'monospace'
    );

    // Attack 1: Ice Cream Float Chill
    const atk1Y = bottomStartY + 32 * s;
    drawEnergyBadge(innerLeftX + 14 * s, atk1Y - 6 * s, 11.5 * s);
    drawEnergyBadge(innerLeftX + 41 * s, atk1Y - 6 * s, 11.5 * s);
    ctx.textAlign = 'left';
    fillFittedText('Ice Cream Float Chill', innerLeftX + 64 * s, atk1Y, innerW - 135 * s, 19 * s, '900', 'sans-serif');
    ctx.textAlign = 'right';
    fillFittedText('+100', innerRightX, atk1Y, 64 * s, 21 * s, '900', 'sans-serif');
    ctx.textAlign = 'left';
    fillFittedText(
      'Restores 100% energy with creamy ice cream & ice-cold float!',
      innerLeftX + 64 * s,
      atk1Y + 18 * s,
      innerW - 68 * s,
      11 * s,
      'bold',
      'sans-serif'
    );

    // Divider line between attacks
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(innerLeftX, atk1Y + 30 * s);
    ctx.lineTo(innerRightX, atk1Y + 30 * s);
    ctx.stroke();

    // Attack 2: Chicken Inasal Flame
    const atk2Y = atk1Y + 58 * s;
    drawEnergyBadge(innerLeftX + 12 * s, atk2Y - 6 * s, 10.5 * s);
    drawEnergyBadge(innerLeftX + 36 * s, atk2Y - 6 * s, 10.5 * s);
    drawEnergyBadge(innerLeftX + 60 * s, atk2Y - 6 * s, 10.5 * s);
    ctx.textAlign = 'left';
    fillFittedText('Chicken Inasal Flame', innerLeftX + 80 * s, atk2Y, innerW - 145 * s, 19 * s, '900', 'sans-serif');
    ctx.textAlign = 'right';
    fillFittedText('999', innerRightX, atk2Y, 60 * s, 22 * s, '900', 'sans-serif');
    ctx.textAlign = 'left';
    fillFittedText(
      'Flip a coin! If heads, double grilled Chicken Inasal & rice box!',
      innerLeftX + 80 * s,
      atk2Y + 18 * s,
      innerW - 84 * s,
      11 * s,
      'bold',
      'sans-serif'
    );

    // Weakness / Resistance / Retreat Bar
    const statBarY = atk2Y + 30 * s;
    const statBarH = 26 * s;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(innerLeftX, statBarY, innerW, statBarH);
    ctx.textAlign = 'center';
    fillFittedText(
      'WEAKNESS: HUNGER ×2  |  RESISTANCE: BAD VIBES -30  |  RETREAT: ★ ★',
      centerX,
      statBarY + 17.5 * s,
      innerW - 18 * s,
      10 * s,
      'bold',
      'monospace'
    );

    // Collector Card Bottom Signature (inside the continuous card frame)
    fillFittedText(
      'ILLUS. GOBBLE HAUS STUDIO  •  © 2026 POKÉ-GOBBLE SERIES  •  001/006 ★',
      centerX,
      cardBottomY - 11 * s,
      innerW - 8 * s,
      10 * s,
      'bold',
      'monospace'
    );
  }

  // =========================================================================
  // 2. RICE IN A BOX THEME ('rice_box' / 'gobble_rice_box')
  // =========================================================================
  else if (styleId === 'rice_box' || theme.id === 'gobble_rice_box') {
    const boxTopCx = centerX;
    const boxTopY = 58 * s;

    // Rising steam waves
    ctx.lineWidth = 3 * s;
    [-36 * s, 0, 36 * s].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(boxTopCx + dx, boxTopY - 6 * s);
      ctx.quadraticCurveTo(boxTopCx + dx - 8 * s, boxTopY - 18 * s, boxTopCx + dx, boxTopY - 28 * s);
      ctx.quadraticCurveTo(boxTopCx + dx + 8 * s, boxTopY - 38 * s, boxTopCx + dx, boxTopY - 46 * s);
      ctx.stroke();
    });

    // Crossed chopsticks drawing at top
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(boxTopCx - 115 * s, boxTopY - 18 * s);
    ctx.lineTo(boxTopCx + 115 * s, boxTopY + 14 * s);
    ctx.moveTo(boxTopCx - 115 * s, boxTopY + 14 * s);
    ctx.lineTo(boxTopCx + 115 * s, boxTopY - 18 * s);
    ctx.stroke();

    // Takeout roof badge
    ctx.lineWidth = 3 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fffbeb';
    ctx.beginPath();
    ctx.moveTo(boxTopCx - 74 * s, boxTopY + 26 * s);
    ctx.lineTo(boxTopCx - 56 * s, boxTopY - 2 * s);
    ctx.lineTo(boxTopCx + 56 * s, boxTopY - 2 * s);
    ctx.lineTo(boxTopCx + 74 * s, boxTopY + 26 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText('HOT & FRESH', boxTopCx, boxTopY + 18 * s, 104 * s, 12.5 * s, '900', 'monospace');

    // Main Top Headline
    fillFittedText('GOBBLE HAUS', centerX, boxTopY + 64 * s, contentW - 40 * s, 32 * s, '900', 'sans-serif');

    // Ribbon Box Subtitle
    const ribY = boxTopY + 78 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 20 * s, ribY, contentW - 40 * s, 34 * s);
    fillFittedText(
      '★  RICE IN A BOX • CHICKEN INASAL & FLOAT  ★',
      centerX,
      ribY + 23 * s,
      contentW - 58 * s,
      14 * s,
      '900',
      'monospace'
    );

    // Bottom Illustration: Iconic Takeout Rice Box Carton with Chicken Inasal & Rice
    const cartonCx = centerX;
    const cartonTopY = bottomStartY + 52 * s;
    const cartonBotY = bottomStartY + 132 * s;

    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(cartonCx - 38 * s, cartonTopY, 24 * s, Math.PI, 0, false);
    ctx.arc(cartonCx, cartonTopY - 8 * s, 30 * s, Math.PI, 0, false);
    ctx.arc(cartonCx + 38 * s, cartonTopY, 24 * s, Math.PI, 0, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cartonCx - 66 * s, cartonTopY);
    ctx.lineTo(cartonCx - 94 * s, cartonTopY - 22 * s);
    ctx.lineTo(cartonCx - 74 * s, cartonTopY + 18 * s);
    ctx.moveTo(cartonCx + 66 * s, cartonTopY);
    ctx.lineTo(cartonCx + 94 * s, cartonTopY - 22 * s);
    ctx.lineTo(cartonCx + 74 * s, cartonTopY + 18 * s);
    ctx.stroke();

    ctx.lineWidth = 3.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(cartonCx - 66 * s, cartonTopY);
    ctx.lineTo(cartonCx + 66 * s, cartonTopY);
    ctx.lineTo(cartonCx + 50 * s, cartonBotY);
    ctx.lineTo(cartonCx - 50 * s, cartonBotY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(cartonCx - 44 * s, cartonTopY + 18 * s, 88 * s, 44 * s);
    ctx.fillStyle = ink;
    fillFittedText('GOBBLE', cartonCx, cartonTopY + 38 * s, 76 * s, 14 * s, '900', 'sans-serif');
    fillFittedText('RICE BOX', cartonCx, cartonTopY + 54 * s, 76 * s, 10.5 * s, 'bold', 'monospace');

    drawStar(leftX + 55 * s, cartonTopY + 40 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 55 * s, cartonTopY + 40 * s, 18 * s, 8 * s, false);
    fillFittedText('100%', leftX + 55 * s, cartonTopY + 74 * s, 70 * s, 13 * s, '900', 'monospace');
    fillFittedText('BUSOG', rightX - 55 * s, cartonTopY + 74 * s, 70 * s, 13 * s, '900', 'monospace');

    fillFittedText(
      'CHICKEN INASAL • ICE CREAM • COLD FLOAT',
      centerX,
      cartonBotY + 34 * s,
      contentW - 24 * s,
      19.5 * s,
      '900',
      'sans-serif'
    );
    fillFittedText(
      `PACKED FRESH AT GOBBLE HAUS  •  ${dateStr.toUpperCase()}`,
      centerX,
      cartonBotY + 58 * s,
      contentW - 24 * s,
      12.5 * s,
      'bold',
      'monospace'
    );
  }

  // =========================================================================
  // 3. SO HUNGRY! THEME ('hungry_theme' / 'gobble_hungry')
  // =========================================================================
  else if (styleId === 'hungry_theme' || theme.id === 'gobble_hungry') {
    const meterW = contentW - 40 * s;
    const meterX = leftX + 20 * s;
    const meterY = 30 * s;

    ctx.textAlign = 'center';
    fillFittedText('⚡ CERTIFIED HUNGRY! ⚡', centerX, meterY + 26 * s, contentW - 24 * s, 30 * s, '900', 'sans-serif');

    const gaugeY = meterY + 42 * s;
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(meterX, gaugeY, meterW, 38 * s);

    ctx.textAlign = 'left';
    fillFittedText('CRAVING LVL:', meterX + 10 * s, gaugeY + 24 * s, 110 * s, 12 * s, '900', 'monospace');

    const barStartX = meterX + 128 * s;
    const barEndX = meterX + meterW - 84 * s;
    const segCount = 6;
    const segGap = 6 * s;
    const segW = Math.max(8 * s, (barEndX - barStartX - segGap * (segCount - 1)) / segCount);
    for (let i = 0; i < segCount; i++) {
      const bx = barStartX + i * (segW + segGap);
      ctx.lineWidth = 2.5 * s;
      ctx.strokeRect(bx, gaugeY + 8 * s, segW, 22 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 4 * s, gaugeY + 28 * s);
      ctx.lineTo(bx + segW - 4 * s, gaugeY + 10 * s);
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    fillFittedText('MAX!!', meterX + meterW - 10 * s, gaugeY + 24 * s, 66 * s, 13 * s, '900', 'monospace');

    ctx.textAlign = 'center';
    fillFittedText(
      'WARNING: WILL TRADE POSES FOR INASAL & ICE CREAM FLOAT!',
      centerX,
      gaugeY + 64 * s,
      contentW - 24 * s,
      13.5 * s,
      '900',
      'monospace'
    );

    const plateCy = bottomStartY + 76 * s;

    const forkX = centerX - 110 * s;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(forkX, plateCy - 34 * s);
    ctx.lineTo(forkX, plateCy + 34 * s);
    ctx.moveTo(forkX - 10 * s, plateCy - 34 * s);
    ctx.lineTo(forkX - 10 * s, plateCy - 12 * s);
    ctx.lineTo(forkX + 10 * s, plateCy - 12 * s);
    ctx.lineTo(forkX + 10 * s, plateCy - 34 * s);
    ctx.stroke();

    const spoonX = centerX + 110 * s;
    ctx.beginPath();
    ctx.ellipse(spoonX, plateCy - 22 * s, 11 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(spoonX, plateCy - 7 * s);
    ctx.lineTo(spoonX, plateCy + 34 * s);
    ctx.stroke();

    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.arc(centerX, plateCy, 42 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(centerX, plateCy, 30 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    fillFittedText('FEED', centerX, plateCy - 2 * s, 48 * s, 14 * s, '900', 'sans-serif');
    fillFittedText('ME!', centerX, plateCy + 14 * s, 48 * s, 14 * s, '900', 'sans-serif');

    const chkY = plateCy + 56 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 16 * s, chkY, contentW - 32 * s, 32 * s);
    fillFittedText(
      '[✓] CHICKEN INASAL   [✓] ICE CREAM FLOAT   [✓] HAPPY',
      centerX,
      chkY + 21 * s,
      contentW - 48 * s,
      12 * s,
      '900',
      'monospace'
    );

    fillFittedText(
      `POWERED BY GOBBLE HAUS  •  ${dateStr.toUpperCase()}`,
      centerX,
      chkY + 56 * s,
      contentW - 24 * s,
      18.5 * s,
      '900',
      'sans-serif'
    );
  }

  // =========================================================================
  // 4. ICE CREAM & FLOAT THEME ('ice_cream_float' / 'gobble_ice_cream_float')
  // =========================================================================
  else if (styleId === 'ice_cream_float' || theme.id === 'gobble_ice_cream_float') {
    const topY = 52 * s;

    const coneX = leftX + 42 * s;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(coneX, topY, 17 * s, Math.PI, 0, false);
    ctx.arc(coneX, topY - 11 * s, 11 * s, Math.PI, 0, false);
    ctx.moveTo(coneX - 17 * s, topY);
    ctx.lineTo(coneX, topY + 36 * s);
    ctx.lineTo(coneX + 17 * s, topY);
    ctx.closePath();
    ctx.stroke();

    const cupX = rightX - 42 * s;
    ctx.beginPath();
    ctx.moveTo(cupX - 17 * s, topY);
    ctx.lineTo(cupX + 17 * s, topY);
    ctx.lineTo(cupX + 12 * s, topY + 36 * s);
    ctx.lineTo(cupX - 12 * s, topY + 36 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cupX, topY, 17 * s, Math.PI, 0, false);
    ctx.moveTo(cupX + 4 * s, topY - 6 * s);
    ctx.lineTo(cupX + 15 * s, topY - 24 * s);
    ctx.stroke();

    ctx.textAlign = 'center';
    fillFittedText('GOBBLE HAUS FLOAT', centerX, topY + 8 * s, contentW - 140 * s, 28 * s, '900', 'sans-serif');
    fillFittedText(
      '🍦 CREAMY ICE CREAM & COLD FLOAT 🥤',
      centerX,
      topY + 34 * s,
      contentW - 140 * s,
      14.5 * s,
      '900',
      'monospace'
    );

    const ribY = topY + 52 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 16 * s, ribY, contentW - 32 * s, 34 * s);
    fillFittedText(
      `★  SWEET SWIRL • FIZZY FLOAT • ${dateStr.toUpperCase()}  ★`,
      centerX,
      ribY + 22 * s,
      contentW - 50 * s,
      13 * s,
      '900',
      'monospace'
    );

    const fltCx = centerX;
    const fltTopY = bottomStartY + 58 * s;
    const fltBotY = bottomStartY + 136 * s;

    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(fltCx, fltTopY - 6 * s, 32 * s, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fltCx - 6 * s, fltTopY - 44 * s, 8 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(fltCx + 12 * s, fltTopY - 16 * s);
    ctx.lineTo(fltCx + 34 * s, fltTopY - 46 * s);
    ctx.stroke();

    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.moveTo(fltCx - 44 * s, fltTopY);
    ctx.lineTo(fltCx + 44 * s, fltTopY);
    ctx.lineTo(fltCx + 32 * s, fltBotY);
    ctx.lineTo(fltCx - 32 * s, fltBotY);
    ctx.closePath();
    ctx.stroke();

    ctx.textAlign = 'center';
    fillFittedText('FLOAT', fltCx, fltTopY + 34 * s, 56 * s, 14 * s, '900', 'sans-serif');
    fillFittedText('& SWIRL', fltCx, fltTopY + 52 * s, 56 * s, 10.5 * s, 'bold', 'monospace');

    drawStar(leftX + 65 * s, fltTopY + 36 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 65 * s, fltTopY + 36 * s, 18 * s, 8 * s, false);
    fillFittedText('ICE', leftX + 65 * s, fltTopY + 70 * s, 60 * s, 13 * s, '900', 'monospace');
    fillFittedText('COLD', rightX - 65 * s, fltTopY + 70 * s, 60 * s, 13 * s, '900', 'monospace');

    fillFittedText(
      'ICE CREAM FLOAT • SOFT SERVE • CHICKEN INASAL',
      centerX,
      fltBotY + 34 * s,
      contentW - 24 * s,
      19.5 * s,
      '900',
      'sans-serif'
    );
    fillFittedText(
      'CHILL & REFRESH AT GOBBLE HAUS • 100% SWEET VIBES',
      centerX,
      fltBotY + 58 * s,
      contentW - 24 * s,
      12.5 * s,
      'bold',
      'monospace'
    );
  }

  // =========================================================================
  // 5. CHICKEN INASAL THEME ('chicken_inasal' / 'gobble_chicken_inasal')
  // =========================================================================
  else if (styleId === 'chicken_inasal' || theme.id === 'gobble_chicken_inasal') {
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(leftX, 24 * s, contentW, 44 * s);
    ctx.textAlign = 'left';
    fillFittedText('🔥 CHAR-GRILLED SPECIAL', leftX + 14 * s, 52 * s, contentW * 0.54, 14.5 * s, '900', 'monospace');
    ctx.textAlign = 'right';
    fillFittedText('100% JUICY & HOT', rightX - 14 * s, 52 * s, contentW * 0.38, 14.5 * s, '900', 'monospace');

    ctx.textAlign = 'center';
    fillFittedText('🍗 CHICKEN INASAL 🍗', centerX, 108 * s, contentW - 24 * s, 29 * s, '900', 'sans-serif');

    const barW = contentW - 40 * s;
    const barX = leftX + 20 * s;
    const barY = 124 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(barX, barY, barW, 30 * s);
    fillFittedText(
      'GOBBLE HAUS GRILL • PAIRED WITH ICE-COLD FLOAT!',
      centerX,
      barY + 20 * s,
      barW - 20 * s,
      13 * s,
      '900',
      'monospace'
    );

    fillFittedText(
      `FRESH OFF THE GRILL  •  ${dateStr.toUpperCase()}`,
      centerX,
      headerZoneHeight - 16 * s,
      contentW - 24 * s,
      12.5 * s,
      'bold',
      'monospace'
    );

    const pltCy = bottomStartY + 78 * s;

    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.ellipse(centerX, pltCy + 14 * s, 96 * s, 34 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.ellipse(centerX - 16 * s, pltCy - 4 * s, 44 * s, 24 * s, -0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + 26 * s, pltCy - 12 * s);
    ctx.lineTo(centerX + 56 * s, pltCy - 18 * s);
    ctx.moveTo(centerX + 26 * s, pltCy - 2 * s);
    ctx.lineTo(centerX + 56 * s, pltCy - 8 * s);
    ctx.arc(centerX + 60 * s, pltCy - 17 * s, 6 * s, 0, Math.PI * 2);
    ctx.arc(centerX + 60 * s, pltCy - 7 * s, 6 * s, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2.5 * s;
    [-32 * s, -16 * s, 0].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(centerX + dx - 6 * s, pltCy - 16 * s);
      ctx.lineTo(centerX + dx + 6 * s, pltCy + 8 * s);
      ctx.stroke();
    });

    drawStar(leftX + 55 * s, pltCy - 4 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 55 * s, pltCy - 4 * s, 18 * s, 8 * s, false);
    fillFittedText('HOT', leftX + 55 * s, pltCy + 28 * s, 64 * s, 13 * s, '900', 'monospace');
    fillFittedText('GRILL', rightX - 55 * s, pltCy + 28 * s, 64 * s, 13 * s, '900', 'monospace');

    fillFittedText(
      'SIGNATURE CHICKEN INASAL • RICE BOX • ICE CREAM FLOAT',
      centerX,
      pltCy + 76 * s,
      contentW - 24 * s,
      18.5 * s,
      '900',
      'sans-serif'
    );
    fillFittedText(
      'GOBBLE HAUS GRILL HOUSE • 100% BUSOG & SATISFIED',
      centerX,
      pltCy + 100 * s,
      contentW - 24 * s,
      12.5 * s,
      'bold',
      'monospace'
    );
  }

  // =========================================================================
  // 6. GOBBLE RECEIPT THEME ('order_receipt' / 'gobble_receipt')
  // =========================================================================
  else {
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    const zigStep = 18 * s;
    for (let x = leftX; x <= rightX; x += zigStep) {
      const y = (Math.round((x - leftX) / zigStep) & 1) === 0 ? 20 * s : 32 * s;
      if (x === leftX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.textAlign = 'center';
    fillFittedText('GOBBLE HAUS KITCHEN', centerX, 74 * s, contentW - 24 * s, 29 * s, '900', 'monospace');

    fillFittedText(
      `OFFICIAL ORDER TICKET #088  •  ${dateStr.toUpperCase()}`,
      centerX,
      100 * s,
      contentW - 24 * s,
      13.5 * s,
      'bold',
      'monospace'
    );

    ctx.lineWidth = 2.5 * s;
    ctx.setLineDash([8 * s, 6 * s]);
    ctx.beginPath();
    ctx.moveTo(leftX, 116 * s);
    ctx.lineTo(rightX, 116 * s);
    ctx.stroke();

    ctx.textAlign = 'left';
    fillFittedText('QTY  ITEM DESCRIPTION', leftX + 8 * s, 142 * s, contentW * 0.65, 14.5 * s, '900', 'monospace');
    ctx.textAlign = 'right';
    fillFittedText('STATUS', rightX - 8 * s, 142 * s, contentW * 0.28, 14.5 * s, '900', 'monospace');

    ctx.beginPath();
    ctx.moveTo(leftX, 154 * s);
    ctx.lineTo(rightX, 154 * s);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    fillFittedText(
      '★ VIP CUSTOMER PORTRAIT ATTACHED BELOW ★',
      centerX,
      headerZoneHeight - 16 * s,
      contentW - 24 * s,
      13 * s,
      'bold',
      'monospace'
    );

    const rTop = bottomStartY + 26 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.setLineDash([8 * s, 6 * s]);
    ctx.beginPath();
    ctx.moveTo(leftX, rTop);
    ctx.lineTo(rightX, rTop);
    ctx.stroke();
    ctx.setLineDash([]);

    const items = [
      ['1x  GRILLED CHICKEN INASAL', '100% HOT'],
      ['1x  CREAMY ICE CREAM FLOAT', 'ICE COLD'],
      ['1x  RICE IN A BOX & ICE CREAM', 'FRESH'],
    ];
    items.forEach(([label, val], idx) => {
      const iy = rTop + 26 * s + idx * 24 * s;
      ctx.textAlign = 'left';
      fillFittedText(label, leftX + 8 * s, iy, contentW * 0.68, 13.5 * s, 'bold', 'monospace');
      ctx.textAlign = 'right';
      fillFittedText(val, rightX - 8 * s, iy, contentW * 0.26, 13.5 * s, 'bold', 'monospace');
    });

    const totalLineY = rTop + 102 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(leftX, totalLineY);
    ctx.lineTo(rightX, totalLineY);
    ctx.stroke();

    ctx.textAlign = 'left';
    fillFittedText('TOTAL SATISFACTION:', leftX + 8 * s, totalLineY + 26 * s, contentW * 0.58, 16.5 * s, '900', 'monospace');
    ctx.textAlign = 'right';
    fillFittedText('1000% BUSOG', rightX - 8 * s, totalLineY + 26 * s, contentW * 0.36, 16.5 * s, '900', 'monospace');

    const bcY = totalLineY + 40 * s;
    const bcH = 38 * s;
    const bcW = 280 * s;
    const bcStartX = centerX - bcW / 2;
    const pattern = [3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 3, 1, 2, 1, 3];
    let curX = bcStartX;
    for (let i = 0; i < pattern.length && curX < bcStartX + bcW; i++) {
      const barW = pattern[i] * 3.2 * s;
      if (i % 2 === 0) {
        ctx.fillRect(curX, bcY, barW, bcH);
      }
      curX += barW + 2.5 * s;
    }

    ctx.textAlign = 'center';
    fillFittedText(
      '* GOBBLE-HAUS-VIP-088 *  •  THANK YOU, COME AGAIN!',
      centerX,
      bcY + bcH + 18 * s,
      contentW - 24 * s,
      11.5 * s,
      'bold',
      'monospace'
    );
  }

  ctx.restore();
}

/**
 * Composite full photostrip into a high-res printable canvas.
 * Centers the photo(s) vertically in the printout and draws custom Gobble Haus
 * frame illustrations and texts at the top and bottom.
 */
export async function renderPhotostripCanvas(options: {
  photos: string[]; // image DataURLs
  layout: FrameLayoutType;
  theme: FrameTheme;
  filter: PhotoFilterType;
  eventTitle?: string;
  eventSubtitle?: string;
  stickers?: StickerItem[];
  drawings?: DrawingPath[];
  dateStr?: string;
  qrShareUrl?: string;
  isThermalMode?: boolean;
  thermalBrightness?: number;
  skipCustomHeader?: boolean;
}): Promise<HTMLCanvasElement> {
  const {
    photos,
    layout,
    theme,
    filter,
    stickers = [],
    drawings = [],
    dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isThermalMode = false,
    thermalBrightness = 45,
    skipCustomHeader = false,
  } = options;

  // Dimensions are exact 2x / 3x integer multiples of 384px (58mm thermal printhead width) and 48px height
  // so downsampling to 384px is an exact 2x2 integer block average with zero fractional resampling Moiré
  let canvasWidth = 768; // 384 * 2
  let canvasHeight = 1824; // 912 * 2 (912 is divisible by 24)

  if (layout === 'grid_4') {
    if (photos.length <= 2) {
      // 2-shot vertical strip ("Grid (2 shots)")
      canvasWidth = 768; // 384 * 2
      canvasHeight = 1536; // 768 * 2 (768 is divisible by 24)
    } else {
      canvasWidth = 1152; // 384 * 3
      canvasHeight = 1800; // 600 * 3 (600 is divisible by 24)
    }
  } else if (layout === 'single_polaroid') {
    canvasWidth = 768; // 384 * 2
    canvasHeight = 1152; // 576 * 2 (576 is divisible by 24)
  } else if (layout === 'strip_4') {
    // 4 photos arranged next to each other by twos (2 columns x 2 rows)
    canvasWidth = 768; // 384 * 2
    canvasHeight = 1440; // 720 * 2 (720 is divisible by 24)
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  const effectiveBg = isThermalMode ? '#ffffff' : theme.background;
  const effectiveAccentColor = isThermalMode ? '#000000' : theme.accentColor;
  const effectiveFilter: PhotoFilterType = isThermalMode ? 'noir' : filter;

  // 1. Draw Frame Background
  ctx.fillStyle = effectiveBg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer card border in Digital Color mode (in Thermal mode, side margins alongside the photo stay pure white to prevent printhead row-banding)
  if (!isThermalMode) {
    ctx.strokeStyle = effectiveAccentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, canvasWidth - 28, canvasHeight - 28);
  }

  // 2. Load Photo Images
  const targetPhotos =
    layout === 'single_polaroid'
      ? photos.slice(0, 1)
      : layout === 'strip_3'
      ? photos.slice(0, 3)
      : photos.slice(0, 4);

  const loadedImages: HTMLImageElement[] = await Promise.all(
    targetPhotos.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = src;
        })
    )
  );

  // 3. Vertically Centered Photo Slot Calculations + Top & Bottom Frame Drawings
  const photoCount = Math.max(1, loadedImages.length);
  const s = canvasWidth / 600;
  const isPokemonCard =
    theme.borderStyle === 'pokemon_card' || theme.id === 'gobble_pokemon_card';
  const isOldAppleMac =
    theme.borderStyle === 'old_apple_mac' || theme.id === 'gobble_old_mac';
  const isOldPhone =
    theme.borderStyle === 'old_phone' || theme.id === 'gobble_old_phone';
  const isArcadeBoy =
    theme.borderStyle === 'arcade_boy' || theme.id === 'gobble_arcade_boy';
  const isWantedPoster =
    theme.borderStyle === 'wanted_poster' || theme.id === 'gobble_wanted_poster';
  const hasEnclosedOuterCard =
    isPokemonCard || isOldAppleMac || isOldPhone || isArcadeBoy || isWantedPoster;
  const innerPhotoInset = hasEnclosedOuterCard ? Math.round(14 * s) : 0;

  const drawPhotoFrameBorder = (x: number, y: number, w: number, h: number, lineW: number) => {
    ctx.save();
    if (hasEnclosedOuterCard && !isThermalMode) {
      // Double collector/LCD frame border around the photo inside the enclosed card/device screen
      ctx.strokeStyle = effectiveAccentColor;
      ctx.lineWidth = lineW + 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = theme.textColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    } else {
      ctx.strokeStyle = isThermalMode ? '#000000' : effectiveAccentColor;
      ctx.lineWidth = lineW;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  };

  if (layout === 'strip_3' || (layout === 'grid_4' && photoCount <= 2)) {
    const margin = 36;
    const photoX = margin + innerPhotoInset;
    // Symmetric top and bottom zones so the photo block is vertically centered in the printout
    const headerZoneHeight = 264;
    const footerZoneHeight = 264;
    const availableHeight = canvasHeight - headerZoneHeight - footerZoneHeight;
    const gap = 18;
    const slotHeight = (availableHeight - gap * (photoCount - 1)) / photoCount;
    const slotWidth = canvasWidth - photoX * 2;

    // Draw custom Gobble Haus top & bottom frame drawings and texts
    drawGobbleFrameTopAndBottomArt(
      ctx,
      theme,
      canvasWidth,
      canvasHeight,
      headerZoneHeight,
      footerZoneHeight,
      margin,
      dateStr,
      isThermalMode
    );

    // Draw each photo centered inside the frame
    loadedImages.forEach((img, idx) => {
      const slotY = Math.round(headerZoneHeight + idx * (slotHeight + gap));
      const rSlotW = Math.round(slotWidth);
      const rSlotH = Math.round(slotHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(photoX, slotY, rSlotW, rSlotH);

      drawImageProp(ctx, img, photoX, slotY, rSlotW, rSlotH);

      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, photoX, slotY, rSlotW, rSlotH, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, photoX, slotY, rSlotW, rSlotH);
      }
      drawPhotoFrameBorder(photoX, slotY, rSlotW, rSlotH, 3);
    });
  } else if (layout === 'strip_4' || layout === 'grid_4') {
    // 4 photos arranged next to each other by twos (2 columns x 2 rows: [1, 2] on top, [3, 4] on bottom)
    const isStandardWidth = canvasWidth === 768;
    const margin = isStandardWidth ? 36 : 56;
    const photoMargin = margin + innerPhotoInset;
    const headerZoneHeight = isStandardWidth ? 264 : 396;
    const footerZoneHeight = isStandardWidth ? 264 : 396;
    const cols = 2;
    const rows = 2;
    const gap = isStandardWidth ? 18 : 24;

    const slotWidth = (canvasWidth - photoMargin * 2 - gap) / cols;
    const availableHeight = canvasHeight - headerZoneHeight - footerZoneHeight;
    const slotHeight = (availableHeight - gap) / rows;

    drawGobbleFrameTopAndBottomArt(
      ctx,
      theme,
      canvasWidth,
      canvasHeight,
      headerZoneHeight,
      footerZoneHeight,
      margin,
      dateStr,
      isThermalMode
    );

    loadedImages.slice(0, 4).forEach((img, idx) => {
      const c = idx % 2;
      const r = Math.floor(idx / 2);
      const x = Math.round(photoMargin + c * (slotWidth + gap));
      const y = Math.round(headerZoneHeight + r * (slotHeight + gap));
      const rSlotW = Math.round(slotWidth);
      const rSlotH = Math.round(slotHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, rSlotW, rSlotH);

      drawImageProp(ctx, img, x, y, rSlotW, rSlotH);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, x, y, rSlotW, rSlotH, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, x, y, rSlotW, rSlotH);
      }
      drawPhotoFrameBorder(x, y, rSlotW, rSlotH, 3);
    });
  } else if (layout === 'single_polaroid') {
    // Single Polaroid: Photo strictly centered vertically & enclosed inside the card frame
    const margin = 48;
    const photoX = margin + innerPhotoInset;
    const headerZoneHeight = 290;
    const footerZoneHeight = 290;
    const photoWidth = Math.round(canvasWidth - photoX * 2);
    const photoHeight = Math.round(canvasHeight - headerZoneHeight - footerZoneHeight);
    const photoY = headerZoneHeight;

    drawGobbleFrameTopAndBottomArt(
      ctx,
      theme,
      canvasWidth,
      canvasHeight,
      headerZoneHeight,
      footerZoneHeight,
      margin,
      dateStr,
      isThermalMode
    );

    if (loadedImages[0]) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(photoX, photoY, photoWidth, photoHeight);

      drawImageProp(ctx, loadedImages[0], photoX, photoY, photoWidth, photoHeight);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, photoX, photoY, photoWidth, photoHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, photoX, photoY, photoWidth, photoHeight);
      }
      drawPhotoFrameBorder(photoX, photoY, photoWidth, photoHeight, 3.5);
    }
  }

  // 4. Render Hand Drawings (Doodles)
  if (drawings.length > 0) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawings.forEach((drawing) => {
      if (drawing.points.length < 2) return;
      ctx.strokeStyle = isThermalMode ? '#000000' : drawing.color;
      ctx.lineWidth = drawing.lineWidth * (canvasWidth / 400);
      ctx.beginPath();
      const startX = drawing.points[0].x * canvasWidth;
      const startY = drawing.points[0].y * canvasHeight;
      ctx.moveTo(startX, startY);
      for (let p = 1; p < drawing.points.length; p++) {
        const px = drawing.points[p].x * canvasWidth;
        const py = drawing.points[p].y * canvasHeight;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  }

  // 5. Render Stickers, Emojis & Custom Text Items
  if (stickers.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stickers.forEach((st) => {
      const sx = (st.x / 100) * canvasWidth;
      const sy = (st.y / 100) * canvasHeight;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((st.rotation * Math.PI) / 180);

      if (st.isText && st.text) {
        const fontSize = Math.max(14, Math.round(30 * st.scale * (canvasWidth / 500)));
        ctx.font = `900 ${fontSize}px sans-serif`;
        const label = st.text;
        const metrics = ctx.measureText(label);
        const padX = Math.round(fontSize * 0.55);
        const padY = Math.round(fontSize * 0.36);
        const boxW = metrics.width + padX * 2;
        const boxH = fontSize + padY * 2;
        const radius = Math.min(boxH / 2, Math.round(fontSize * 0.45));
        const style = st.textStyle || 'white_pill';

        const drawRoundedPill = (w: number, h: number, r: number) => {
          const x0 = -w / 2;
          const y0 = -h / 2;
          ctx.beginPath();
          ctx.moveTo(x0 + r, y0);
          ctx.lineTo(x0 + w - r, y0);
          ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
          ctx.lineTo(x0 + w, y0 + h - r);
          ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
          ctx.lineTo(x0 + r, y0 + h);
          ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
          ctx.lineTo(x0, y0 + r);
          ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
          ctx.closePath();
        };

        if (style === 'white_pill') {
          drawRoundedPill(boxW, boxH, radius);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = Math.max(2.5, Math.round(fontSize * 0.1));
          ctx.strokeStyle = isThermalMode ? '#000000' : st.textColor || '#000000';
          ctx.stroke();
          ctx.fillStyle = isThermalMode ? '#000000' : st.textColor || '#000000';
          ctx.fillText(label, 0, Math.round(fontSize * 0.04));
        } else if (style === 'black_pill') {
          drawRoundedPill(boxW, boxH, radius);
          ctx.fillStyle = isThermalMode ? '#000000' : st.textColor || '#000000';
          ctx.fill();
          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, 0, Math.round(fontSize * 0.04));
        } else if (style === 'outline') {
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.22));
          ctx.strokeStyle = '#ffffff';
          ctx.strokeText(label, 0, 0);
          ctx.fillStyle = isThermalMode ? '#000000' : st.textColor || '#000000';
          ctx.fillText(label, 0, 0);
        } else {
          ctx.fillStyle = isThermalMode ? '#000000' : st.textColor || '#000000';
          ctx.fillText(label, 0, 0);
        }
      } else {
        const size = Math.round(56 * st.scale * (canvasWidth / 500));
        ctx.font = `${size}px sans-serif`;
        ctx.fillText(st.emoji, 0, 0);
      }

      ctx.restore();
    });
  }

  // 6. Automatically prepend custom receipt header image / text at the top of every printed thermal receipt
  if (isThermalMode && !skipCustomHeader) {
    return await prependCustomHeaderToCanvas(canvas);
  }

  return canvas;
}

/**
 * Automatically prepends the Admin-configured custom header image and/or custom header text
 * to the very top of any printed receipt canvas.
 * Ensures idempotency via `__hasCustomReceiptHeader` so a canvas is never given a duplicate header.
 */
export async function prependCustomHeaderToCanvas(
  sourceCanvas: HTMLCanvasElement,
  configOverride?: Partial<ThermalPrinterConfig>
): Promise<HTMLCanvasElement> {
  if ((sourceCanvas as any).__hasCustomReceiptHeader) {
    return await appendCustomFooterWatermarkToCanvas(sourceCanvas, configOverride);
  }

  const savedCfg = remoteConfigService.getConfig()?.thermalPrinter;
  const cfg: Partial<ThermalPrinterConfig> = {
    ...savedCfg,
    ...configOverride,
  };

  if (cfg.customHeaderEnabled === false) {
    return await appendCustomFooterWatermarkToCanvas(sourceCanvas, configOverride);
  }

  const imgUrl = (cfg.customHeaderImageUrl || '').trim();
  const mainText = (cfg.customHeaderText || '').trim();
  const subText = (cfg.customHeaderSubtext || '').trim();

  if (!imgUrl && !mainText && !subText) {
    return await appendCustomFooterWatermarkToCanvas(sourceCanvas, configOverride);
  }

  const w = sourceCanvas.width || 576;
  const scale = w / 576;
  const padTop = Math.round(24 * scale);
  const padBottom = Math.round(18 * scale);
  const marginX = Math.round(32 * scale);
  const maxContentW = Math.max(120, w - marginX * 2);

  // Load custom header image if provided
  let headerImg: HTMLImageElement | null = null;
  let drawImgW = 0;
  let drawImgH = 0;

  if (imgUrl) {
    headerImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = imgUrl;
    });

    if (headerImg) {
      const nw = headerImg.naturalWidth || headerImg.width || 200;
      const nh = headerImg.naturalHeight || headerImg.height || 100;
      const maxImgW = Math.round(maxContentW * 0.9);
      const maxImgH = Math.round(210 * scale);
      const ratio = Math.min(maxImgW / nw, maxImgH / nh, 2.5);
      drawImgW = Math.max(24, Math.round(nw * ratio));
      drawImgH = Math.max(24, Math.round(nh * ratio));
    }
  }

  const fontSizeMode = cfg.customHeaderFontSize || 'medium';
  const mainFontPx = Math.max(
    14,
    Math.round((fontSizeMode === 'large' ? 34 : fontSizeMode === 'small' ? 22 : 28) * scale)
  );
  const subFontPx = Math.max(
    11,
    Math.round((fontSizeMode === 'large' ? 21 : fontSizeMode === 'small' ? 14 : 17) * scale)
  );

  // Measure & word-wrap lines using an offscreen context
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  const wrapTextLines = (raw: string, fontSpec: string, maxW: number): string[] => {
    if (!raw) return [];
    mCtx.font = fontSpec;
    const paragraphs = raw.split(/\r?\n/);
    const lines: string[] = [];
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const words = trimmed.split(/\s+/);
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const candidate = `${currentLine} ${words[i]}`;
        if (mCtx.measureText(candidate).width <= maxW) {
          currentLine = candidate;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  const mainFontSpec = `900 ${mainFontPx}px 'Inter', system-ui, -apple-system, sans-serif`;
  const subFontSpec = `700 ${subFontPx}px 'JetBrains Mono', monospace`;

  const mainLines = wrapTextLines(mainText, mainFontSpec, maxContentW);
  const subLines = wrapTextLines(subText, subFontSpec, maxContentW);

  const mainLineHeight = Math.round(mainFontPx * 1.25);
  const subLineHeight = Math.round(subFontPx * 1.32);

  let headerHeight = padTop;
  if (drawImgH > 0) {
    headerHeight += drawImgH;
    if (mainLines.length > 0 || subLines.length > 0) {
      headerHeight += Math.round(14 * scale);
    }
  }
  if (mainLines.length > 0) {
    headerHeight += mainLines.length * mainLineHeight;
    if (subLines.length > 0) {
      headerHeight += Math.round(6 * scale);
    }
  }
  if (subLines.length > 0) {
    headerHeight += subLines.length * subLineHeight;
  }
  headerHeight += padBottom + Math.round(12 * scale);

  // Keep height a multiple of 8px for clean thermal raster rows
  headerHeight = Math.ceil(headerHeight / 8) * 8;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = headerHeight + sourceCanvas.height;
  const outCtx = outCanvas.getContext('2d')!;

  // Fill pure white receipt paper background
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

  const align = cfg.customHeaderTextAlign || 'center';
  let cursorY = padTop;

  // 1. Draw custom header image in high-contrast monochrome on white background
  if (headerImg && drawImgW > 0 && drawImgH > 0) {
    const imgX =
      align === 'left'
        ? marginX
        : align === 'right'
        ? w - marginX - drawImgW
        : Math.round((w - drawImgW) / 2);

    outCtx.save();
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(imgX, cursorY, drawImgW, drawImgH);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(headerImg, imgX, cursorY, drawImgW, drawImgH);

    // Convert image region to crisp thermal monochrome (compositing transparent pixels on white)
    const imgData = outCtx.getImageData(imgX, cursorY, drawImgW, drawImgH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const alpha = d[i + 3] / 255;
      const r = d[i] * alpha + 255 * (1 - alpha);
      const g = d[i + 1] * alpha + 255 * (1 - alpha);
      const b = d[i + 2] * alpha + 255 * (1 - alpha);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Clean contrast S-curve for logos & header graphics
      const contrasted = Math.max(0, Math.min(255, Math.round((lum - 128) * 1.25 + 128)));
      d[i] = contrasted;
      d[i + 1] = contrasted;
      d[i + 2] = contrasted;
      d[i + 3] = 255;
    }
    outCtx.putImageData(imgData, imgX, cursorY);
    outCtx.restore();

    cursorY += drawImgH + (mainLines.length > 0 || subLines.length > 0 ? Math.round(14 * scale) : 0);
  }

  const textX =
    align === 'left' ? marginX : align === 'right' ? w - marginX : Math.round(w / 2);

  outCtx.fillStyle = '#000000';
  outCtx.textAlign = align;
  outCtx.textBaseline = 'top';

  // 2. Draw custom main header text lines
  if (mainLines.length > 0) {
    outCtx.font = mainFontSpec;
    for (const line of mainLines) {
      outCtx.fillText(line, textX, cursorY);
      cursorY += mainLineHeight;
    }
    if (subLines.length > 0) {
      cursorY += Math.round(6 * scale);
    }
  }

  // 3. Draw custom header subtext lines
  if (subLines.length > 0) {
    outCtx.font = subFontSpec;
    for (const line of subLines) {
      outCtx.fillText(line, textX, cursorY);
      cursorY += subLineHeight;
    }
  }

  // 4. Draw clean receipt header dashed separator line
  const dividerY = headerHeight - Math.round(8 * scale);
  outCtx.save();
  outCtx.strokeStyle = '#000000';
  outCtx.lineWidth = Math.max(1.5, Math.round(2 * scale));
  outCtx.setLineDash([Math.round(8 * scale), Math.round(6 * scale)]);
  outCtx.beginPath();
  outCtx.moveTo(marginX, dividerY);
  outCtx.lineTo(w - marginX, dividerY);
  outCtx.stroke();
  outCtx.restore();

  // 5. Draw original receipt / photostrip canvas directly below the custom header
  outCtx.drawImage(sourceCanvas, 0, headerHeight);

  (outCanvas as any).__hasCustomReceiptHeader = true;
  if ((sourceCanvas as any).__hasCustomReceiptFooter) {
    (outCanvas as any).__hasCustomReceiptFooter = true;
  }
  return await appendCustomFooterWatermarkToCanvas(outCanvas, configOverride);
}

/**
 * Automatically appends the Admin-configured custom bottom watermark logo image and/or
 * custom bottom text labels at the very bottom of every printed receipt strip, beyond
 * the default Gobble Haus branding.
 * Ensures idempotency via `__hasCustomReceiptFooter` so a canvas is never given a duplicate footer watermark.
 */
export async function appendCustomFooterWatermarkToCanvas(
  sourceCanvas: HTMLCanvasElement,
  configOverride?: Partial<ThermalPrinterConfig>
): Promise<HTMLCanvasElement> {
  if ((sourceCanvas as any).__hasCustomReceiptFooter) {
    return sourceCanvas;
  }

  const savedCfg = remoteConfigService.getConfig()?.thermalPrinter;
  const cfg: Partial<ThermalPrinterConfig> = {
    ...savedCfg,
    ...configOverride,
  };

  if (cfg.customFooterEnabled === false) {
    return sourceCanvas;
  }

  const imgUrl = (cfg.customFooterImageUrl || '').trim();
  const mainText = (cfg.customFooterText || '').trim();
  const subText = (cfg.customFooterSubtext || '').trim();

  if (!imgUrl && !mainText && !subText) {
    return sourceCanvas;
  }

  const w = sourceCanvas.width || 576;
  const scale = w / 576;
  const padTop = Math.round(18 * scale);
  const padBottom = Math.round(24 * scale);
  const marginX = Math.round(32 * scale);
  const maxContentW = Math.max(120, w - marginX * 2);

  // Load custom watermark logo image if provided
  let footerImg: HTMLImageElement | null = null;
  let drawImgW = 0;
  let drawImgH = 0;

  if (imgUrl) {
    footerImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = imgUrl;
    });

    if (footerImg) {
      const nw = footerImg.naturalWidth || footerImg.width || 200;
      const nh = footerImg.naturalHeight || footerImg.height || 100;
      const maxImgW = Math.round(maxContentW * 0.85);
      const maxImgH = Math.round(180 * scale);
      const ratio = Math.min(maxImgW / nw, maxImgH / nh, 2.5);
      drawImgW = Math.max(24, Math.round(nw * ratio));
      drawImgH = Math.max(24, Math.round(nh * ratio));
    }
  }

  const fontSizeMode = cfg.customFooterFontSize || 'medium';
  const mainFontPx = Math.max(
    13,
    Math.round((fontSizeMode === 'large' ? 30 : fontSizeMode === 'small' ? 20 : 25) * scale)
  );
  const subFontPx = Math.max(
    11,
    Math.round((fontSizeMode === 'large' ? 19 : fontSizeMode === 'small' ? 13 : 16) * scale)
  );

  // Measure & word-wrap lines using an offscreen context
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  const wrapTextLines = (raw: string, fontSpec: string, maxW: number): string[] => {
    if (!raw) return [];
    mCtx.font = fontSpec;
    const paragraphs = raw.split(/\r?\n/);
    const lines: string[] = [];
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const words = trimmed.split(/\s+/);
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const candidate = `${currentLine} ${words[i]}`;
        if (mCtx.measureText(candidate).width <= maxW) {
          currentLine = candidate;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  const mainFontSpec = `900 ${mainFontPx}px 'Inter', system-ui, -apple-system, sans-serif`;
  const subFontSpec = `700 ${subFontPx}px 'JetBrains Mono', monospace`;

  const mainLines = wrapTextLines(mainText, mainFontSpec, maxContentW);
  const subLines = wrapTextLines(subText, subFontSpec, maxContentW);

  const mainLineHeight = Math.round(mainFontPx * 1.25);
  const subLineHeight = Math.round(subFontPx * 1.32);

  let footerHeight = padTop + Math.round(12 * scale);
  if (drawImgH > 0) {
    footerHeight += drawImgH;
    if (mainLines.length > 0 || subLines.length > 0) {
      footerHeight += Math.round(12 * scale);
    }
  }
  if (mainLines.length > 0) {
    footerHeight += mainLines.length * mainLineHeight;
    if (subLines.length > 0) {
      footerHeight += Math.round(5 * scale);
    }
  }
  if (subLines.length > 0) {
    footerHeight += subLines.length * subLineHeight;
  }
  footerHeight += padBottom;

  // Keep height a multiple of 8px for clean thermal raster rows
  footerHeight = Math.ceil(footerHeight / 8) * 8;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = sourceCanvas.height + footerHeight;
  const outCtx = outCanvas.getContext('2d')!;

  // Fill pure white receipt paper background
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

  // 1. Draw the existing photostrip canvas at the top
  outCtx.drawImage(sourceCanvas, 0, 0);

  // 2. Draw clean dashed separator line above the custom bottom watermark
  const dividerY = sourceCanvas.height + Math.round(10 * scale);
  outCtx.save();
  outCtx.strokeStyle = '#000000';
  outCtx.lineWidth = Math.max(1.5, Math.round(2 * scale));
  outCtx.setLineDash([Math.round(8 * scale), Math.round(6 * scale)]);
  outCtx.beginPath();
  outCtx.moveTo(marginX, dividerY);
  outCtx.lineTo(w - marginX, dividerY);
  outCtx.stroke();
  outCtx.restore();

  const align = cfg.customFooterTextAlign || 'center';
  let cursorY = sourceCanvas.height + padTop + Math.round(12 * scale);

  // 3. Draw custom bottom watermark logo image in high-contrast monochrome on white background
  if (footerImg && drawImgW > 0 && drawImgH > 0) {
    const imgX =
      align === 'left'
        ? marginX
        : align === 'right'
        ? w - marginX - drawImgW
        : Math.round((w - drawImgW) / 2);

    outCtx.save();
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(imgX, cursorY, drawImgW, drawImgH);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(footerImg, imgX, cursorY, drawImgW, drawImgH);

    // Convert image region to crisp thermal monochrome (compositing transparent pixels on white)
    const imgData = outCtx.getImageData(imgX, cursorY, drawImgW, drawImgH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const alpha = d[i + 3] / 255;
      const r = d[i] * alpha + 255 * (1 - alpha);
      const g = d[i + 1] * alpha + 255 * (1 - alpha);
      const b = d[i + 2] * alpha + 255 * (1 - alpha);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const contrasted = Math.max(0, Math.min(255, Math.round((lum - 128) * 1.25 + 128)));
      d[i] = contrasted;
      d[i + 1] = contrasted;
      d[i + 2] = contrasted;
      d[i + 3] = 255;
    }
    outCtx.putImageData(imgData, imgX, cursorY);
    outCtx.restore();

    cursorY += drawImgH + (mainLines.length > 0 || subLines.length > 0 ? Math.round(12 * scale) : 0);
  }

  const textX =
    align === 'left' ? marginX : align === 'right' ? w - marginX : Math.round(w / 2);

  outCtx.fillStyle = '#000000';
  outCtx.textAlign = align;
  outCtx.textBaseline = 'top';

  // 4. Draw custom bottom watermark primary text label lines
  if (mainLines.length > 0) {
    outCtx.font = mainFontSpec;
    for (const line of mainLines) {
      outCtx.fillText(line, textX, cursorY);
      cursorY += mainLineHeight;
    }
    if (subLines.length > 0) {
      cursorY += Math.round(5 * scale);
    }
  }

  // 5. Draw custom bottom watermark secondary text label lines
  if (subLines.length > 0) {
    outCtx.font = subFontSpec;
    for (const line of subLines) {
      outCtx.fillText(line, textX, cursorY);
      cursorY += subLineHeight;
    }
  }

  (outCanvas as any).__hasCustomReceiptFooter = true;
  if ((sourceCanvas as any).__hasCustomReceiptHeader) {
    (outCanvas as any).__hasCustomReceiptHeader = true;
  }
  return outCanvas;
}

/**
 * Aspect-ratio preserving cover image drawer
 */
function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  offsetX = 0.5,
  offsetY = 0.5
) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let nw = img.naturalWidth || img.width;
  let nh = img.naturalHeight || img.height;
  if (!nw || !nh) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }

  const r = Math.min(w / nw, h / nh);
  let nw_ = nw * r;
  let nh_ = nh * r;
  let cx = 1;
  let cy = 1;

  if (Math.round(nw_) < w) cx = w / nw_;
  if (Math.round(nh_) < h) cy = h / nh_;

  nw_ *= Math.max(cx, cy);
  nh_ *= Math.max(cx, cy);

  let sx = (nw - w / (nw_ / nw)) * offsetX;
  let sy = (nh - h / (nh_ / nh)) * offsetY;

  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;

  const sw = w / (nw_ / nw);
  const sh = h / (nh_ / nh);

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
