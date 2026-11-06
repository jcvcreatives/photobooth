/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FrameLayoutType, FrameTheme, PhotoFilterType, StickerItem, DrawingPath } from '../types';

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
      '🍗', '🍦', '🥤', '🥡', '🍚', '🔥', '⚡', '😋', '🤤', '🍴',
      '🥄', '🧋', '🍟', '🍔', '🍕', '🌭', '🌮', '🍩', '🍪', '🧁',
      '🍰', '🍿', '🍫', '🍬', '🍭', '🍮', '🍓', '🍒', '🍉', '🍍',
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
    id: 'love',
    label: 'Love & Cute',
    icon: '💖',
    emojis: [
      '💖', '🩵', '💕', '🤍', '🖤', '🫶', '💌', '💋', '🌸', '💐',
      '🌹', '🕊️', '💍', '🧸', '🌷', '🌺', '🫰', '💞', '💝', '💘',
      '💓', '💗', '💟', '❣️', '👼', '🧚', '🧜‍♀️', '🐰', '🐣', '🐾',
    ],
  },
  {
    id: 'vibes',
    label: 'Vibes & Smiles',
    icon: '😎',
    emojis: [
      '😎', '🥰', '🤩', '😂', '🤣', '😜', '🤪', '😇', '🤠', '🥳',
      '✌️', '🤘', '🤙', '👍', '👏', '🙌', '💪', '💫', '⭐', '🌟',
      '🦄', '🐱', '🐶', '🐼', '🦊', '🐸', '🦋', '🌈', '☀️', '🌙',
    ],
  },
  {
    id: 'minimal',
    label: 'Badges & Retro',
    icon: '✦',
    emojis: [
      '✦', '★', '☆', '♥', '♡', '✧', '✿', '❀', '●', '▲',
      '◆', '❖', '👑', '💎', '⚡', '🔥', '💥', '💯', '💢', '💤',
      '💬', '💭', '🗯️', '♠️', '♥️', '♦️', '♣️', '🎵', '🎶', '♾️',
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

  // =========================================================================
  // 1. POKÉMON CARD THEME ('pokemon_card' / 'gobble_pokemon_card')
  // =========================================================================
  if (styleId === 'pokemon_card' || theme.id === 'gobble_pokemon_card') {
    // Top outer card arch & collector header
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.moveTo(leftX, headerZoneHeight - 8 * s);
    ctx.lineTo(leftX, 24 * s);
    ctx.lineTo(rightX, 24 * s);
    ctx.lineTo(rightX, headerZoneHeight - 8 * s);
    ctx.stroke();

    // Evolution Stage pill box on top-left (widened to 192*s so STAGE 2 • GOBBLEMON never overlaps box edges)
    const pillX = leftX + 14 * s;
    const pillY = 36 * s;
    const pillW = 192 * s;
    const pillH = 32 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef08a';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeRect(pillX, pillY, pillW, pillH);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    fillFittedText(
      'STAGE 2 • GOBBLEMON',
      pillX + pillW / 2,
      pillY + 21 * s,
      pillW - 18 * s,
      12 * s,
      '900',
      'monospace'
    );

    // Pokemon Name: GOBBLE-CHU
    ctx.textAlign = 'left';
    fillFittedText('GOBBLE-CHU', leftX + 16 * s, 108 * s, contentW - 195 * s, 29 * s, '900', 'sans-serif');

    // Right side HP 999 + Energy Circle
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    fillFittedText('HP', rightX - 118 * s, 106 * s, 40 * s, 16 * s, '900', 'sans-serif');
    ctx.fillStyle = ink;
    fillFittedText('999', rightX - 56 * s, 108 * s, 58 * s, 31 * s, '900', 'sans-serif');
    drawEnergyBadge(rightX - 30 * s, 96 * s, 15 * s);

    // Pokedex info strip banner right above centered photo
    const bannerY = headerZoneHeight - 54 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 10 * s, bannerY, contentW - 20 * s, 34 * s);
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    fillFittedText(
      `NO. 088  INASAL & FLOAT POKÉMON  •  HT: 100% FRESH  •  ${dateStr.toUpperCase()}`,
      centerX,
      bannerY + 22 * s,
      contentW - 38 * s,
      11.5 * s,
      'bold',
      'monospace'
    );

    // Bottom Attack Moves & Collector Stats Box (below centered photo)
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.moveTo(leftX, bottomStartY + 8 * s);
    ctx.lineTo(leftX, canvasHeight - 24 * s);
    ctx.lineTo(rightX, canvasHeight - 24 * s);
    ctx.lineTo(rightX, bottomStartY + 8 * s);
    ctx.stroke();

    // Attack 1: Ice Cream Float Chill
    const atk1Y = bottomStartY + 42 * s;
    drawEnergyBadge(leftX + 28 * s, atk1Y - 6 * s, 12 * s);
    drawEnergyBadge(leftX + 56 * s, atk1Y - 6 * s, 12 * s);
    ctx.textAlign = 'left';
    fillFittedText('Ice Cream Float Chill', leftX + 80 * s, atk1Y, contentW - 165 * s, 20 * s, '900', 'sans-serif');
    ctx.textAlign = 'right';
    fillFittedText('+100', rightX - 18 * s, atk1Y, 68 * s, 22 * s, '900', 'sans-serif');
    ctx.textAlign = 'left';
    fillFittedText(
      'Restores 100% energy with creamy ice cream & ice-cold float!',
      leftX + 80 * s,
      atk1Y + 20 * s,
      contentW - 98 * s,
      11.5 * s,
      'bold',
      'sans-serif'
    );

    // Divider line between attacks
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(leftX + 14 * s, atk1Y + 34 * s);
    ctx.lineTo(rightX - 14 * s, atk1Y + 34 * s);
    ctx.stroke();

    // Attack 2: Chicken Inasal Flame
    const atk2Y = atk1Y + 66 * s;
    drawEnergyBadge(leftX + 24 * s, atk2Y - 6 * s, 11 * s);
    drawEnergyBadge(leftX + 49 * s, atk2Y - 6 * s, 11 * s);
    drawEnergyBadge(leftX + 74 * s, atk2Y - 6 * s, 11 * s);
    ctx.textAlign = 'left';
    fillFittedText('Chicken Inasal Flame', leftX + 96 * s, atk2Y, contentW - 175 * s, 20 * s, '900', 'sans-serif');
    ctx.textAlign = 'right';
    fillFittedText('999', rightX - 18 * s, atk2Y, 64 * s, 23 * s, '900', 'sans-serif');
    ctx.textAlign = 'left';
    fillFittedText(
      'Flip a coin! If heads, double grilled Chicken Inasal & rice box!',
      leftX + 96 * s,
      atk2Y + 20 * s,
      contentW - 114 * s,
      11.5 * s,
      'bold',
      'sans-serif'
    );

    // Weakness / Resistance / Retreat Bar
    const statBarY = atk2Y + 36 * s;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(leftX + 14 * s, statBarY, contentW - 28 * s, 30 * s);
    ctx.textAlign = 'center';
    fillFittedText(
      'WEAKNESS: HUNGER ×2  |  RESISTANCE: BAD VIBES -30  |  RETREAT: ★ ★',
      centerX,
      statBarY + 19 * s,
      contentW - 46 * s,
      10.5 * s,
      'bold',
      'monospace'
    );

    // Collector Card Bottom Signature
    fillFittedText(
      'ILLUS. GOBBLE HAUS STUDIO  •  © 2026 POKÉ-GOBBLE SERIES  •  001/006 ★',
      centerX,
      canvasHeight - 36 * s,
      contentW - 32 * s,
      10.5 * s,
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
    canvasWidth = 768; // 384 * 2
    canvasHeight = 2208; // 1104 * 2 (1104 is divisible by 24)
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

  if (layout === 'strip_3' || layout === 'strip_4' || (layout === 'grid_4' && photoCount <= 2)) {
    const margin = 36;
    // Symmetric top and bottom zones so the photo block is vertically centered in the printout
    const headerZoneHeight = 240;
    const footerZoneHeight = 240;
    const availableHeight = canvasHeight - headerZoneHeight - footerZoneHeight;
    const gap = 18;
    const slotHeight = (availableHeight - gap * (photoCount - 1)) / photoCount;
    const slotWidth = canvasWidth - margin * 2;

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

    // Draw each photo centered between top and bottom frame art
    loadedImages.forEach((img, idx) => {
      const slotY = headerZoneHeight + idx * (slotHeight + gap);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(margin - 4, slotY - 4, slotWidth + 8, slotHeight + 8);

      drawImageProp(ctx, img, margin, slotY, slotWidth, slotHeight);

      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, margin, slotY, slotWidth, slotHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, margin, slotY, slotWidth, slotHeight);
        ctx.strokeStyle = effectiveAccentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(margin, slotY, slotWidth, slotHeight);
      }
    });
  } else if (layout === 'grid_4') {
    // 2x2 grid centered vertically
    const margin = 56;
    const headerZoneHeight = 360;
    const footerZoneHeight = 360;
    const cols = 2;
    const rows = 2;
    const gap = 24;

    const slotWidth = (canvasWidth - margin * 2 - gap) / cols;
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
      const x = margin + c * (slotWidth + gap);
      const y = headerZoneHeight + r * (slotHeight + gap);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y - 6, slotWidth + 12, slotHeight + 12);

      drawImageProp(ctx, img, x, y, slotWidth, slotHeight);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, x, y, slotWidth, slotHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, x, y, slotWidth, slotHeight);
        ctx.strokeStyle = effectiveAccentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, slotWidth, slotHeight);
      }
    });
  } else if (layout === 'single_polaroid') {
    // Single Polaroid: Photo strictly centered vertically so Top & Bottom have rich frame drawings & texts
    const margin = 48;
    const headerZoneHeight = 290;
    const footerZoneHeight = 290;
    const photoWidth = canvasWidth - margin * 2;
    const photoHeight = canvasHeight - headerZoneHeight - footerZoneHeight; // 640px centered vertically
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
      ctx.fillRect(margin - 4, photoY - 4, photoWidth + 8, photoHeight + 8);

      drawImageProp(ctx, loadedImages[0], margin, photoY, photoWidth, photoHeight);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, margin, photoY, photoWidth, photoHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, margin, photoY, photoWidth, photoHeight);
        ctx.strokeStyle = effectiveAccentColor;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(margin, photoY, photoWidth, photoHeight);
      }
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

  return canvas;
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
