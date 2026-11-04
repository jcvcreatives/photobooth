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
 * Applies a thermal-printer-calibrated portrait tone curve to a photo region.
 * Compensates for thermal receipt paper dot-gain (heat spread) by lifting shadows
 * with a gamma curve, protecting a minimum shadow floor so dark hair/faces never
 * burn into solid black blobs, and cleaning near-white highlights so backgrounds stay crisp.
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

  // 1. Auto-exposure analysis: measure average luminance of the subject region
  let sumLum = 0;
  let sampleCount = 0;
  for (let i = 0; i < data.length; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumLum += lum;
    sampleCount++;
  }
  const avgLum = sampleCount > 0 ? sumLum / sampleCount : 128;

  // Gentle automatic low-light compensation if the original camera capture is dark (avgLum < 115)
  const autoLowLightBoost = avgLum < 115 ? Math.min(0.22, ((115 - avgLum) / 115) * 0.26) : 0;
  const effectiveBNorm = Math.max(-0.25, Math.min(1.0, bNorm + autoLowLightBoost));

  // 2. Smooth gamma (< 1.0) opens up dark hair and shadows while preserving full dynamic range
  const gamma = Math.max(0.48, Math.min(0.95, 0.72 - effectiveBNorm * 0.20));

  // 3. Natural shadow toe (28..52) so dark areas retain rich gradation without crushing into a flat gray plateau
  const shadowToe = Math.max(24, Math.min(54, Math.round(32 + effectiveBNorm * 18)));

  // 4. Clean white point so light backgrounds stay crisp paper-white
  const whitePoint = Math.max(215, Math.min(250, Math.round(242 - Math.max(0, effectiveBNorm) * 18)));

  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const n = v / 255;
    const curved = Math.pow(n, gamma) * 0.88 + n * 0.12;
    const mapped = curved * 255;
    if (mapped >= whitePoint) {
      lut[v] = 255;
    } else {
      const ratio = Math.max(0, mapped) / whitePoint;
      lut[v] = Math.round(shadowToe + ratio * (255 - shadowToe));
    }
  }

  // Pure 1D tone lookup with zero periodic spatial noise so downsampling never creates Moiré or vertical/horizontal lines
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

    // Evolution Stage pill box on top-left
    ctx.lineWidth = 2.5 * s;
    ctx.fillStyle = isThermalMode ? '#ffffff' : '#fef08a';
    ctx.fillRect(leftX + 14 * s, 36 * s, 145 * s, 32 * s);
    ctx.strokeRect(leftX + 14 * s, 36 * s, 145 * s, 32 * s);
    ctx.fillStyle = ink;
    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('STAGE 2 • GOBBLEMON', leftX + 86 * s, 57 * s);

    // Pokemon Name: GOBBLE-CHU
    ctx.textAlign = 'left';
    ctx.font = `900 ${Math.round(30 * s)}px sans-serif`;
    ctx.fillText('GOBBLE-CHU', leftX + 16 * s, 108 * s);

    // Right side HP 999 + Energy Circle
    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.round(16 * s)}px sans-serif`;
    ctx.fillStyle = accent;
    ctx.fillText('HP', rightX - 132 * s, 106 * s);
    ctx.fillStyle = ink;
    ctx.font = `900 ${Math.round(32 * s)}px sans-serif`;
    ctx.fillText('999', rightX - 58 * s, 108 * s);
    drawEnergyBadge(rightX - 32 * s, 96 * s, 16 * s);

    // Pokedex info strip banner right above centered photo
    const bannerY = headerZoneHeight - 54 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 10 * s, bannerY, contentW - 20 * s, 34 * s);
    ctx.font = `bold ${Math.round(12 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.fillText(
      `NO. 088  INASAL & FLOAT POKÉMON  •  HT: 100% FRESH  •  ${dateStr.toUpperCase()}`,
      centerX,
      bannerY + 22 * s
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
    ctx.font = `900 ${Math.round(20 * s)}px sans-serif`;
    ctx.fillText('Ice Cream Float Chill', leftX + 80 * s, atk1Y);
    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.round(22 * s)}px sans-serif`;
    ctx.fillText('+100', rightX - 18 * s, atk1Y);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(11.5 * s)}px sans-serif`;
    ctx.fillText('Restores 100% energy with creamy ice cream & ice-cold float!', leftX + 80 * s, atk1Y + 20 * s);

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
    ctx.font = `900 ${Math.round(21 * s)}px sans-serif`;
    ctx.fillText('Chicken Inasal Flame', leftX + 96 * s, atk2Y);
    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.round(24 * s)}px sans-serif`;
    ctx.fillText('999', rightX - 18 * s, atk2Y);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(11.5 * s)}px sans-serif`;
    ctx.fillText('Flip a coin! If heads, double grilled Chicken Inasal & rice box!', leftX + 96 * s, atk2Y + 20 * s);

    // Weakness / Resistance / Retreat Bar
    const statBarY = atk2Y + 36 * s;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(leftX + 14 * s, statBarY, contentW - 28 * s, 30 * s);
    ctx.font = `bold ${Math.round(11 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      'WEAKNESS: HUNGER ×2   |   RESISTANCE: BAD VIBES -30   |   RETREAT: ★ ★',
      centerX,
      statBarY + 19 * s
    );

    // Collector Card Bottom Signature
    ctx.font = `bold ${Math.round(11 * s)}px monospace`;
    ctx.fillText(
      'ILLUS. GOBBLE HAUS STUDIO  •  © 2026 POKÉ-GOBBLE SERIES  •  001/006 ★',
      centerX,
      canvasHeight - 36 * s
    );
  }

  // =========================================================================
  // 2. RICE IN A BOX THEME ('rice_box' / 'gobble_rice_box')
  // =========================================================================
  else if (styleId === 'rice_box' || theme.id === 'gobble_rice_box') {
    // Top Illustration: Open Takeout Box Flaps, Crossed Chopsticks & Rising Steam
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
    ctx.moveTo(boxTopCx - 70 * s, boxTopY + 26 * s);
    ctx.lineTo(boxTopCx - 52 * s, boxTopY - 2 * s);
    ctx.lineTo(boxTopCx + 52 * s, boxTopY - 2 * s);
    ctx.lineTo(boxTopCx + 70 * s, boxTopY + 26 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('HOT & FRESH', boxTopCx, boxTopY + 18 * s);

    // Main Top Headline
    ctx.font = `900 ${Math.round(32 * s)}px sans-serif`;
    ctx.fillText('GOBBLE HAUS', centerX, boxTopY + 64 * s);

    // Ribbon Box Subtitle
    const ribY = boxTopY + 78 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 20 * s, ribY, contentW - 40 * s, 34 * s);
    ctx.font = `900 ${Math.round(15 * s)}px monospace`;
    ctx.fillText('★  RICE IN A BOX • CHICKEN INASAL & FLOAT  ★', centerX, ribY + 23 * s);

    // Bottom Illustration: Iconic Takeout Rice Box Carton with Chicken Inasal & Rice
    const cartonCx = centerX;
    const cartonTopY = bottomStartY + 52 * s;
    const cartonBotY = bottomStartY + 132 * s;

    // Steaming rice & grilled Chicken Inasal peeking above the box
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(cartonCx - 38 * s, cartonTopY, 24 * s, Math.PI, 0, false);
    ctx.arc(cartonCx, cartonTopY - 8 * s, 30 * s, Math.PI, 0, false);
    ctx.arc(cartonCx + 38 * s, cartonTopY, 24 * s, Math.PI, 0, false);
    ctx.stroke();

    // Open side flaps of the rice box
    ctx.beginPath();
    ctx.moveTo(cartonCx - 66 * s, cartonTopY);
    ctx.lineTo(cartonCx - 94 * s, cartonTopY - 22 * s);
    ctx.lineTo(cartonCx - 74 * s, cartonTopY + 18 * s);
    ctx.moveTo(cartonCx + 66 * s, cartonTopY);
    ctx.lineTo(cartonCx + 94 * s, cartonTopY - 22 * s);
    ctx.lineTo(cartonCx + 74 * s, cartonTopY + 18 * s);
    ctx.stroke();

    // Trapezoid Takeout Carton Body
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

    // Wire handle & label on the rice box
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(cartonCx - 44 * s, cartonTopY + 18 * s, 88 * s, 44 * s);
    ctx.fillStyle = ink;
    ctx.font = `900 ${Math.round(14 * s)}px sans-serif`;
    ctx.fillText('GOBBLE', cartonCx, cartonTopY + 38 * s);
    ctx.font = `bold ${Math.round(11 * s)}px monospace`;
    ctx.fillText('RICE BOX', cartonCx, cartonTopY + 54 * s);

    // Flanking stars & badges
    drawStar(leftX + 55 * s, cartonTopY + 40 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 55 * s, cartonTopY + 40 * s, 18 * s, 8 * s, false);
    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.fillText('100%', leftX + 55 * s, cartonTopY + 74 * s);
    ctx.fillText('BUSOG', rightX - 55 * s, cartonTopY + 74 * s);

    // Bottom Text Banner
    ctx.font = `900 ${Math.round(20 * s)}px sans-serif`;
    ctx.fillText('CHICKEN INASAL • ICE CREAM • COLD FLOAT', centerX, cartonBotY + 34 * s);
    ctx.font = `bold ${Math.round(13 * s)}px monospace`;
    ctx.fillText(`PACKED FRESH AT GOBBLE HAUS  •  ${dateStr.toUpperCase()}`, centerX, cartonBotY + 58 * s);
  }

  // =========================================================================
  // 3. SO HUNGRY! THEME ('hungry_theme' / 'gobble_hungry')
  // =========================================================================
  else if (styleId === 'hungry_theme' || theme.id === 'gobble_hungry') {
    // Top Illustration: Hunger Fuel Meter / Cravings Gauge + Comic Alert
    const meterW = contentW - 40 * s;
    const meterX = leftX + 20 * s;
    const meterY = 30 * s;

    // Comic Alert Header
    ctx.font = `900 ${Math.round(31 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⚡ CERTIFIED HUNGRY! ⚡', centerX, meterY + 26 * s);

    // Hunger Meter Box: [EMPTY] [■][■][■][■][■][■] [100% CRAVING]
    const gaugeY = meterY + 42 * s;
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(meterX, gaugeY, meterW, 38 * s);

    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('CRAVING LVL:', meterX + 12 * s, gaugeY + 24 * s);

    // Segmented fuel bars inside gauge
    const barStartX = meterX + 122 * s;
    const barEndX = meterX + meterW - 90 * s;
    const segCount = 6;
    const segGap = 6 * s;
    const segW = (barEndX - barStartX - segGap * (segCount - 1)) / segCount;
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
    ctx.font = `900 ${Math.round(14 * s)}px monospace`;
    ctx.fillText('MAX!!', meterX + meterW - 12 * s, gaugeY + 24 * s);

    // Sub-banner above photo
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(14.5 * s)}px monospace`;
    ctx.fillText('WARNING: WILL TRADE POSES FOR INASAL & ICE CREAM FLOAT!', centerX, gaugeY + 64 * s);

    // Bottom Illustration: Steaming Plate + Fork & Spoon + Cravings Checklist
    const plateCy = bottomStartY + 76 * s;

    // Left Fork drawing
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

    // Right Spoon drawing
    const spoonX = centerX + 110 * s;
    ctx.beginPath();
    ctx.ellipse(spoonX, plateCy - 22 * s, 11 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(spoonX, plateCy - 7 * s);
    ctx.lineTo(spoonX, plateCy + 34 * s);
    ctx.stroke();

    // Center Plate drawing
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.arc(centerX, plateCy, 42 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(centerX, plateCy, 30 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `900 ${Math.round(14 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('FEED', centerX, plateCy - 2 * s);
    ctx.fillText('ME!', centerX, plateCy + 14 * s);

    // Cravings Checklist Boxes
    const chkY = plateCy + 56 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 16 * s, chkY, contentW - 32 * s, 32 * s);
    ctx.font = `900 ${Math.round(12.5 * s)}px monospace`;
    ctx.fillText('[✓] CHICKEN INASAL   [✓] ICE CREAM FLOAT   [✓] HAPPY', centerX, chkY + 21 * s);

    ctx.font = `900 ${Math.round(19 * s)}px sans-serif`;
    ctx.fillText(`POWERED BY GOBBLE HAUS  •  ${dateStr.toUpperCase()}`, centerX, chkY + 56 * s);
  }

  // =========================================================================
  // 4. ICE CREAM & FLOAT THEME ('ice_cream_float' / 'gobble_ice_cream_float')
  // =========================================================================
  else if (styleId === 'ice_cream_float' || theme.id === 'gobble_ice_cream_float') {
    // Top Illustration: Swirl Ice Cream Cone (Left) + Fizzy Float Cup with Straw (Right)
    const topY = 52 * s;

    // Left Mini Ice Cream Cone drawing
    const coneX = leftX + 46 * s;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(coneX, topY, 18 * s, Math.PI, 0, false);
    ctx.arc(coneX, topY - 12 * s, 12 * s, Math.PI, 0, false);
    ctx.moveTo(coneX - 18 * s, topY);
    ctx.lineTo(coneX, topY + 38 * s);
    ctx.lineTo(coneX + 18 * s, topY);
    ctx.closePath();
    ctx.stroke();

    // Right Mini Float Cup with Dome & Straw drawing
    const cupX = rightX - 46 * s;
    ctx.beginPath();
    ctx.moveTo(cupX - 18 * s, topY);
    ctx.lineTo(cupX + 18 * s, topY);
    ctx.lineTo(cupX + 13 * s, topY + 38 * s);
    ctx.lineTo(cupX - 13 * s, topY + 38 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cupX, topY, 18 * s, Math.PI, 0, false);
    ctx.moveTo(cupX + 4 * s, topY - 6 * s);
    ctx.lineTo(cupX + 16 * s, topY - 26 * s);
    ctx.stroke();

    // Main Top Title & Subtitle
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(30 * s)}px sans-serif`;
    ctx.fillText('GOBBLE HAUS FLOAT', centerX, topY + 8 * s);
    ctx.font = `900 ${Math.round(16 * s)}px monospace`;
    ctx.fillText('🍦 CREAMY ICE CREAM & COLD FLOAT 🥤', centerX, topY + 34 * s);

    // Top Ribbon Box
    const ribY = topY + 52 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(leftX + 16 * s, ribY, contentW - 32 * s, 34 * s);
    ctx.font = `900 ${Math.round(14 * s)}px monospace`;
    ctx.fillText(`★  SWEET SWIRL • FIZZY FLOAT • ${dateStr.toUpperCase()}  ★`, centerX, ribY + 22 * s);

    // Bottom Illustration: Tall Float Cup with Ice Cream Scoop, Cherry & Straw
    const fltCx = centerX;
    const fltTopY = bottomStartY + 58 * s;
    const fltBotY = bottomStartY + 136 * s;

    // Ice cream scoop domes on top of float cup + cherry + straw
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(fltCx, fltTopY - 6 * s, 32 * s, Math.PI, 0, false);
    ctx.stroke();
    // Cherry on top
    ctx.beginPath();
    ctx.arc(fltCx - 6 * s, fltTopY - 44 * s, 8 * s, 0, Math.PI * 2);
    ctx.stroke();
    // Drinking straw
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(fltCx + 12 * s, fltTopY - 16 * s);
    ctx.lineTo(fltCx + 34 * s, fltTopY - 46 * s);
    ctx.stroke();

    // Float Cup Body
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.moveTo(fltCx - 44 * s, fltTopY);
    ctx.lineTo(fltCx + 44 * s, fltTopY);
    ctx.lineTo(fltCx + 32 * s, fltBotY);
    ctx.lineTo(fltCx - 32 * s, fltBotY);
    ctx.closePath();
    ctx.stroke();

    // Fizzy bubbles & badge inside float cup
    ctx.font = `900 ${Math.round(14 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('FLOAT', fltCx, fltTopY + 34 * s);
    ctx.font = `bold ${Math.round(11 * s)}px monospace`;
    ctx.fillText('& SWIRL', fltCx, fltTopY + 52 * s);

    // Flanking stars & badges
    drawStar(leftX + 65 * s, fltTopY + 36 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 65 * s, fltTopY + 36 * s, 18 * s, 8 * s, false);
    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.fillText('ICE', leftX + 65 * s, fltTopY + 70 * s);
    ctx.fillText('COLD', rightX - 65 * s, fltTopY + 70 * s);

    // Bottom Text Banner
    ctx.font = `900 ${Math.round(20 * s)}px sans-serif`;
    ctx.fillText('ICE CREAM FLOAT • SOFT SERVE • CHICKEN INASAL', centerX, fltBotY + 34 * s);
    ctx.font = `bold ${Math.round(13 * s)}px monospace`;
    ctx.fillText('CHILL & REFRESH AT GOBBLE HAUS • 100% SWEET VIBES', centerX, fltBotY + 58 * s);
  }

  // =========================================================================
  // 5. CHICKEN INASAL THEME ('chicken_inasal' / 'gobble_chicken_inasal')
  // =========================================================================
  else if (styleId === 'chicken_inasal' || theme.id === 'gobble_chicken_inasal') {
    // Top Grill Marquee & Sizzling Banner
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(leftX, 24 * s, contentW, 44 * s);
    ctx.font = `900 ${Math.round(15 * s)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('🔥 CHAR-GRILLED SPECIAL', leftX + 14 * s, 52 * s);
    ctx.textAlign = 'right';
    ctx.fillText('100% JUICY & HOT', rightX - 14 * s, 52 * s);

    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(30 * s)}px sans-serif`;
    ctx.fillText('🍗 CHICKEN INASAL 🍗', centerX, 108 * s);

    const barW = contentW - 40 * s;
    const barX = leftX + 20 * s;
    const barY = 124 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.strokeRect(barX, barY, barW, 30 * s);
    ctx.font = `900 ${Math.round(13.5 * s)}px monospace`;
    ctx.fillText('GOBBLE HAUS GRILL • PAIRED WITH ICE-COLD FLOAT!', centerX, barY + 20 * s);

    ctx.font = `bold ${Math.round(13 * s)}px monospace`;
    ctx.fillText(`FRESH OFF THE GRILL  •  ${dateStr.toUpperCase()}`, centerX, headerZoneHeight - 16 * s);

    // Bottom Illustration: Sizzling Grilled Chicken Inasal Drumstick/Quarter on Platter
    const pltCy = bottomStartY + 78 * s;

    // Platter oval drawing
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.ellipse(centerX, pltCy + 14 * s, 96 * s, 34 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Grilled Chicken Inasal Drumstick shape drawing on platter
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.ellipse(centerX - 16 * s, pltCy - 4 * s, 44 * s, 24 * s, -0.15, 0, Math.PI * 2);
    ctx.stroke();
    // Bone handle on right of drumstick
    ctx.beginPath();
    ctx.moveTo(centerX + 26 * s, pltCy - 12 * s);
    ctx.lineTo(centerX + 56 * s, pltCy - 18 * s);
    ctx.moveTo(centerX + 26 * s, pltCy - 2 * s);
    ctx.lineTo(centerX + 56 * s, pltCy - 8 * s);
    ctx.arc(centerX + 60 * s, pltCy - 17 * s, 6 * s, 0, Math.PI * 2);
    ctx.arc(centerX + 60 * s, pltCy - 7 * s, 6 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Char-grill sear marks on the Chicken Inasal
    ctx.lineWidth = 2.5 * s;
    [-32 * s, -16 * s, 0].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(centerX + dx - 6 * s, pltCy - 16 * s);
      ctx.lineTo(centerX + dx + 6 * s, pltCy + 8 * s);
      ctx.stroke();
    });

    // Flanking stars & badges
    drawStar(leftX + 55 * s, pltCy - 4 * s, 18 * s, 8 * s, false);
    drawStar(rightX - 55 * s, pltCy - 4 * s, 18 * s, 8 * s, false);
    ctx.font = `900 ${Math.round(13 * s)}px monospace`;
    ctx.fillText('HOT', leftX + 55 * s, pltCy + 28 * s);
    ctx.fillText('GRILL', rightX - 55 * s, pltCy + 28 * s);

    // Bottom Text Banner
    ctx.font = `900 ${Math.round(19 * s)}px sans-serif`;
    ctx.fillText('SIGNATURE CHICKEN INASAL • RICE BOX • ICE CREAM FLOAT', centerX, pltCy + 76 * s);
    ctx.font = `bold ${Math.round(13 * s)}px monospace`;
    ctx.fillText('GOBBLE HAUS GRILL HOUSE • 100% BUSOG & SATISFIED', centerX, pltCy + 100 * s);
  }

  // =========================================================================
  // 6. GOBBLE RECEIPT THEME ('order_receipt' / 'gobble_receipt')
  // =========================================================================
  else {
    // Top Zig-Zag Receipt Tear Edge
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    const zigStep = 18 * s;
    for (let x = leftX; x <= rightX; x += zigStep) {
      const y = ((Math.round((x - leftX) / zigStep) & 1) === 0) ? 20 * s : 32 * s;
      if (x === leftX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(30 * s)}px monospace`;
    ctx.fillText('GOBBLE HAUS KITCHEN', centerX, 74 * s);

    ctx.font = `bold ${Math.round(14 * s)}px monospace`;
    ctx.fillText(`OFFICIAL ORDER TICKET #088  •  ${dateStr.toUpperCase()}`, centerX, 100 * s);

    // Dashed receipt divider
    ctx.lineWidth = 2.5 * s;
    ctx.setLineDash([8 * s, 6 * s]);
    ctx.beginPath();
    ctx.moveTo(leftX, 116 * s);
    ctx.lineTo(rightX, 116 * s);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `900 ${Math.round(15 * s)}px monospace`;
    ctx.fillText('QTY  ITEM DESCRIPTION', leftX + 8 * s, 142 * s);
    ctx.textAlign = 'right';
    ctx.fillText('STATUS', rightX - 8 * s, 142 * s);

    ctx.beginPath();
    ctx.moveTo(leftX, 154 * s);
    ctx.lineTo(rightX, 154 * s);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(13.5 * s)}px monospace`;
    ctx.fillText('★ VIP CUSTOMER PORTRAIT ATTACHED BELOW ★', centerX, headerZoneHeight - 16 * s);

    // Bottom Itemized Receipt + Barcode
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
    ctx.font = `bold ${Math.round(14 * s)}px monospace`;
    items.forEach(([label, val], idx) => {
      const iy = rTop + 26 * s + idx * 24 * s;
      ctx.textAlign = 'left';
      ctx.fillText(label, leftX + 8 * s, iy);
      ctx.textAlign = 'right';
      ctx.fillText(val, rightX - 8 * s, iy);
    });

    const totalLineY = rTop + 102 * s;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(leftX, totalLineY);
    ctx.lineTo(rightX, totalLineY);
    ctx.stroke();

    ctx.font = `900 ${Math.round(18 * s)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL SATISFACTION:', leftX + 8 * s, totalLineY + 26 * s);
    ctx.textAlign = 'right';
    ctx.fillText('1000% BUSOG', rightX - 8 * s, totalLineY + 26 * s);

    // Crisp Vector Barcode Drawing
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
    ctx.font = `bold ${Math.round(12 * s)}px monospace`;
    ctx.fillText('* GOBBLE-HAUS-VIP-088 *   •   THANK YOU, COME AGAIN!', centerX, bcY + bcH + 18 * s);
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
