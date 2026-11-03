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
  { id: 'all', label: 'All Themes', icon: '✨' },
  { id: 'minimal', label: 'Studio Minimal', icon: '✦' },
  { id: 'wedding', label: 'Weddings & Romance', icon: '💍' },
  { id: 'floral', label: 'Flowers & Garden', icon: '🌸' },
  { id: 'passport', label: 'Passport & Travel', icon: '✈️' },
  { id: 'holiday', label: 'Holidays & Events', icon: '🎉' },
];

/**
 * Thermal Printer Frame Themes:
 * Dedicated themes for physical thermal receipt printing.
 * Zero color backgrounds (#ffffff paper) and zero color frames.
 * Features crisp black typography, clean black lines, stamps, and ticket edges
 * so thermal heads produce sharp prints without muddy dithering or blackened blocks.
 */
export const THERMAL_FRAME_THEMES: FrameTheme[] = [
  {
    id: 'thermal_mono',
    name: 'Studio Mono',
    category: 'minimal',
    background: '#ffffff',
    borderStyle: 'clean_border',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'JCVCREATIVES ARCHIVE',
    footerText: 'ORIGINAL CAPTURE • SERIES I',
    dateVisible: true,
  },
  {
    id: 'thermal_classic_double',
    name: 'Classic Double',
    category: 'wedding',
    background: '#ffffff',
    borderStyle: 'double_gold',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'PHOTOBOOTH ARCHIVE',
    footerText: 'GENUINE THERMAL SOUVENIR',
    dateVisible: true,
  },
  {
    id: 'thermal_vintage_receipt',
    name: 'Vintage Receipt',
    category: 'passport',
    background: '#ffffff',
    borderStyle: 'airmail_border',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'OFFICIAL RECEIPT',
    footerText: 'THANK YOU • VISIT AGAIN',
    dateVisible: true,
  },
  {
    id: 'thermal_passport_stamp',
    name: 'Official Permit',
    category: 'passport',
    background: '#ffffff',
    borderStyle: 'passport_emboss',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'BORDER ENTRY PERMIT',
    footerText: 'PORTRAIT VERIFIED • OFFICIAL ARCHIVE',
    dateVisible: true,
  },
  {
    id: 'thermal_wedding_flourish',
    name: 'Wedding Cherish',
    category: 'wedding',
    background: '#ffffff',
    borderStyle: 'wedding_gold',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'CELEBRATING LOVE',
    footerText: 'FOREVER & ALWAYS • BEST WISHES',
    dateVisible: true,
  },
  {
    id: 'thermal_botanical_clean',
    name: 'Botanical Leaf',
    category: 'floral',
    background: '#ffffff',
    borderStyle: 'clean_border',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'BOTANICAL GARDEN',
    footerText: 'FRESH FLORA • VERDANT LEAVES',
    dateVisible: true,
  },
  {
    id: 'thermal_editorial',
    name: 'Editorial Folio',
    category: 'minimal',
    background: '#ffffff',
    borderStyle: 'clean_border',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'PORTRAIT FOLIO',
    footerText: 'CONTEMPORARY EXHIBIT • EDITION 2026',
    dateVisible: true,
  },
  {
    id: 'thermal_holiday_celebration',
    name: 'Celebration Confetti',
    category: 'holiday',
    background: '#ffffff',
    borderStyle: 'double_gold',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'CELEBRATE TOGETHER',
    footerText: 'MEMORABLE MOMENTS • POP THE BUBBLY',
    dateVisible: true,
  },
  {
    id: 'thermal_gobble_haus',
    name: 'Gobble Haus Receipt',
    category: 'holiday',
    background: '#ffffff',
    borderStyle: 'airmail_border',
    textColor: '#000000',
    accentColor: '#000000',
    headerText: 'GOBBLE HAUS • ORDER #01',
    footerText: 'ALL-DAY SILOG & RICE BOXES • HOT & FRESH',
    dateVisible: true,
  },
];

/**
 * Digital & GIF Color Themes:
 * Full, rich color frames preserved specifically for guests downloading to their
 * smartphone via QR code or receiving via email.
 */
export const DIGITAL_COLOR_THEMES: FrameTheme[] = [
  {
    id: 'gobble_haus_special',
    name: 'Gobble Haus Diner',
    category: 'holiday',
    background: '#fffbeb',
    borderStyle: 'double_gold',
    textColor: '#7c2d12',
    accentColor: '#ea580c',
    headerText: 'GOBBLE HAUS RICE BOXES',
    footerText: 'SIZZLING SILOG • GARLIC RICE & EGG',
    dateVisible: true,
    cornerIcon: '🍱',
  },
  {
    id: 'baby_blue_studio',
    name: 'Baby Blue Chic',
    category: 'minimal',
    background: '#f0f9ff',
    borderStyle: 'baby_blue_border',
    textColor: '#0c4a6e',
    accentColor: '#38bdf8',
    headerText: 'JCVCREATIVES STUDIO',
    footerText: 'PASTEL ARCHIVE • EDITION 2026',
    dateVisible: true,
    cornerIcon: '🩵',
  },
  {
    id: 'sakura_blossom',
    name: 'Cherry Blossom',
    category: 'floral',
    background: '#fff0f5',
    borderStyle: 'floral_sakura',
    textColor: '#371825',
    accentColor: '#db2777',
    headerText: 'SAKURA BLOSSOM',
    footerText: 'SPRINGTIME BOTANICAL • IN FULL BLOOM',
    dateVisible: true,
    cornerIcon: '🌸',
  },
  {
    id: 'rose_gold_nuptials',
    name: 'Rose Gold Nuptials',
    category: 'wedding',
    background: '#fff5f5',
    borderStyle: 'rose_gold',
    textColor: '#2a1719',
    accentColor: '#b76e79',
    headerText: 'MR & MRS CELEBRATION',
    footerText: 'FOREVER & ALWAYS • VERIFIED UNION',
    dateVisible: true,
    cornerIcon: '🕊️',
  },
  {
    id: 'eucalyptus_sage',
    name: 'Botanical Garden',
    category: 'floral',
    background: '#f0fdf4',
    borderStyle: 'floral_sage',
    textColor: '#142a1b',
    accentColor: '#166534',
    headerText: 'BOTANICAL GARDEN',
    footerText: 'FRESH FLORA • VERDANT LEAVES & GREENERY',
    dateVisible: true,
    cornerIcon: '🌿',
  },
  {
    id: 'wedding_elegance',
    name: 'Wedding Elegance',
    category: 'wedding',
    background: '#fefdfa',
    borderStyle: 'wedding_gold',
    textColor: '#1c1917',
    accentColor: '#c5a059',
    headerText: 'WEDDING CELEBRATION',
    footerText: 'TOGETHER FOREVER • WITH ALL OUR LOVE',
    dateVisible: true,
    cornerIcon: '💍',
  },
  {
    id: 'champagne_monogram',
    name: 'Champagne Monogram',
    category: 'wedding',
    background: '#fcf8f2',
    borderStyle: 'double_gold',
    textColor: '#211c15',
    accentColor: '#967444',
    headerText: 'THE WEDDING DAY',
    footerText: 'OUR LOVE STORY • A LIFETIME OF HAPPINESS',
    dateVisible: true,
    cornerIcon: '🥂',
  },
  {
    id: 'obsidian_dark',
    name: 'Obsidian Noir',
    category: 'minimal',
    background: '#09090b',
    borderStyle: 'clean_border',
    textColor: '#fafafa',
    accentColor: '#71717a',
    headerText: 'OBSIDIAN NOIR',
    footerText: 'PHOTOGRAPHIC ARCHIVE • JCVCREATIVES',
    dateVisible: true,
  },
  {
    id: 'wildflower_meadow',
    name: 'Wildflower Meadow',
    category: 'floral',
    background: '#faf5ff',
    borderStyle: 'floral_violet',
    textColor: '#24123a',
    accentColor: '#7c3aed',
    headerText: 'WILDFLOWER MEADOW',
    footerText: 'HANDPICKED MEMORIES • SWEET PETALS',
    dateVisible: true,
    cornerIcon: '💐',
  },
  {
    id: 'birthday_celebration',
    name: 'Birthday Party',
    category: 'holiday',
    background: '#fdf4ff',
    borderStyle: 'confetti_party',
    textColor: '#2e1065',
    accentColor: '#c026d3',
    headerText: 'HAPPY BIRTHDAY!',
    footerText: 'MAKE A WISH • ANOTHER YEAR OF JOY',
    dateVisible: true,
    cornerIcon: '🎂',
  },
  {
    id: 'official_passport',
    name: 'Official Passport',
    category: 'passport',
    background: '#0f172a',
    borderStyle: 'passport_emboss',
    textColor: '#f8fafc',
    accentColor: '#eab308',
    headerText: 'PASSPORT IDENTIFICATION',
    footerText: 'BORDER ENTRY PERMIT • OFFICIAL TRAVEL ARCHIVE',
    dateVisible: true,
    cornerIcon: '✈️',
  },
];

export const FRAME_THEMES: FrameTheme[] = [
  ...THERMAL_FRAME_THEMES,
  ...DIGITAL_COLOR_THEMES,
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
    id: 'booth',
    label: 'Party & Kiosk',
    icon: '📸',
    emojis: ['📸', '🎞️', '✨', '🪩', '🎉', '🥳', '🕶️', '👑', '🎀', '🎈', '🎂', '🍸', '🥂', '🍾', '🍰', '🍿', '🎊', '🎁', '🕺', '💃'],
  },
  {
    id: 'love',
    label: 'Love & Cute',
    icon: '🩵',
    emojis: ['🩵', '💖', '💕', '🤍', '🖤', '🫶', '💌', '💋', '🌸', '💐', '🌹', '🕊️', '💍', '🧸', '🌷', '🌺', '🫰', '💞', '🧁', '🍒'],
  },
  {
    id: 'vibes',
    label: 'Vibes & Smiles',
    icon: '😎',
    emojis: ['😎', '🥰', '✌️', '🤘', '🤩', '💫', '⭐', '🌟', '🦄', '🐱', '🐶', '🦋', '🌈', '⚡', '☕', '🔥', '🍓', '🍦', '🍕', '🥑'],
  },
  {
    id: 'minimal',
    label: 'Minimal & Chic',
    icon: '✦',
    emojis: ['✦', '★', '♥', '✧', '✿', '●', '▲', '✒️', '🪽', '🫧', '◈', '◇', '☾', '☀', '☘', '∞', '✢', '✺', '🪞', '🏷️'],
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

  // Automatic low-light compensation if the original camera capture is dark (avgLum < 125)
  const autoLowLightBoost = avgLum < 125 ? Math.min(0.32, ((125 - avgLum) / 125) * 0.38) : 0;
  const effectiveBNorm = Math.max(-0.25, Math.min(1.15, bNorm + autoLowLightBoost));

  // 2. Smooth gamma (< 1.0) opens up dark hair and shadows while preserving strand-to-strand gradient
  const gamma = Math.max(0.32, Math.min(0.95, 0.58 - effectiveBNorm * 0.24));

  // 3. Soft shadow toe: keeps dark hair above the 82..98 luminance threshold (~52-60% thermal dot density)
  // so 58mm battery thermal printers (like KPrinter_461a at 3.67V) never suffer voltage sag or row-lock banding
  const shadowToe = Math.max(82, Math.min(122, Math.round(88 + effectiveBNorm * 28)));

  // 4. Clean white point so light backgrounds stay crisp paper-white
  const whitePoint = Math.max(195, Math.min(248, Math.round(236 - Math.max(0, effectiveBNorm) * 24)));

  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const n = v / 255;
    // Combine smooth power curve with linear slope in deepest shadows so v=0..35 never flattens into a constant plateau
    const curved = Math.pow(n, gamma) * 0.85 + n * 0.15;
    let mapped = curved * 255;
    mapped = (mapped - 148) * 1.04 + 148;
    if (mapped >= whitePoint) {
      lut[v] = 255;
    } else {
      const ratio = Math.max(0, mapped) / whitePoint;
      lut[v] = shadowToe + ratio * (255 - shadowToe);
    }
  }

  for (let py = 0; py < rh; py++) {
    const rowBase = py * rw;
    for (let px = 0; px < rw; px++) {
      const i = (rowBase + px) * 4;
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const baseVal = lut[Math.max(0, Math.min(255, gray))];

      // Inject 2D Interleaved Gradient Blue-Noise micro-dither (±4.5 levels) in dark/mid tones
      // so quantized webcam shadow plateaus in dark hair are completely decorrelated before scaling
      let out = baseVal;
      if (baseVal < 245) {
        const ign = ((52.9829189 * ((0.06711056 * px + 0.00583715 * py) % 1)) % 1 + 1) % 1;
        out = baseVal + (ign - 0.5) * 9.0;
      }
      const clamped = Math.max(0, Math.min(255, Math.round(out)));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    }
  }

  ctx.putImageData(imgData, rx, ry);
}

/**
 * Composite full photostrip into a high-res printable canvas.
 * When isThermalMode is true, forces pure white background (#ffffff),
 * crisp black text and borders (#000000), and calibrated thermal portrait
 * tone curve so physical receipt printing is bright, detailed, and never overly dark.
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
  qrShareUrl?: string; // Optional QR rendered in footer
  isThermalMode?: boolean; // When true: monochrome receipt print without color frames
  thermalBrightness?: number; // -30 to +100 (default 45 Bright)
}): Promise<HTMLCanvasElement> {
  const {
    photos,
    layout,
    theme,
    filter,
    eventTitle = theme.headerText,
    eventSubtitle = theme.footerText,
    stickers = [],
    drawings = [],
    dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isThermalMode = false,
    thermalBrightness = 45,
  } = options;

  // Dimensions based on layout
  let canvasWidth = 600;
  let canvasHeight = 1800; // 1:3 ratio for classic 2x6 strip

  if (layout === 'grid_4') {
    if (photos.length <= 2) {
      // 2-shot vertical strip ("Grid (2 shots)")
      canvasWidth = 600;
      canvasHeight = 1400;
    } else {
      canvasWidth = 1200;
      canvasHeight = 1800; // 4x6" 2x2 postcard
    }
  } else if (layout === 'single_polaroid') {
    canvasWidth = 800;
    canvasHeight = 1000;
  } else if (layout === 'strip_4') {
    canvasWidth = 600;
    canvasHeight = 2200;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  const effectiveBg = isThermalMode ? '#ffffff' : theme.background;
  const effectiveTextColor = isThermalMode ? '#000000' : theme.textColor;
  const effectiveAccentColor = isThermalMode ? '#000000' : theme.accentColor;
  const effectiveFilter: PhotoFilterType = isThermalMode ? 'noir' : filter;

  // 1. Draw Frame Background
  ctx.fillStyle = effectiveBg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Decorative border styles (only for digital color keepsake; thermal receipt mode stays clean and borderless)
  if (!isThermalMode) {
    // Full color digital frame rendering
    if (theme.borderStyle === 'wedding_gold' || theme.borderStyle === 'double_gold') {
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, canvasWidth - 32, canvasHeight - 32);
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, canvasWidth - 44, canvasHeight - 44);
      ctx.fillStyle = theme.accentColor;
      ctx.font = '16px serif';
      ctx.fillText('❖', 28, 32);
      ctx.fillText('❖', canvasWidth - 28, 32);
      ctx.fillText('❖', 28, canvasHeight - 24);
      ctx.fillText('❖', canvasWidth - 28, canvasHeight - 24);
    } else if (theme.borderStyle === 'rose_gold') {
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(18, 18, canvasWidth - 36, canvasHeight - 36);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(23, 23, canvasWidth - 46, canvasHeight - 46);
    } else if (theme.borderStyle === 'passport_emboss') {
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, canvasWidth - 32, canvasHeight - 32);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 20); ctx.lineTo(30, 42);
      ctx.moveTo(20, 30); ctx.lineTo(42, 30);
      ctx.moveTo(canvasWidth - 30, 20); ctx.lineTo(canvasWidth - 30, 42);
      ctx.moveTo(canvasWidth - 20, 30); ctx.lineTo(canvasWidth - 42, 30);
      ctx.stroke();
    } else if (theme.borderStyle === 'airmail_border') {
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(14, 14, canvasWidth - 28, canvasHeight - 28);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
      ctx.setLineDash([]);
    } else if (theme.borderStyle === 'baby_blue_border') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, canvasWidth - 32, canvasHeight - 32);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, canvasWidth - 44, canvasHeight - 44);
    } else if (theme.cornerIcon) {
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(18, 18, canvasWidth - 36, canvasHeight - 36);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(theme.cornerIcon, 32, 36);
      ctx.fillText(theme.cornerIcon, canvasWidth - 32, 36);
      ctx.fillText(theme.cornerIcon, 32, canvasHeight - 24);
      ctx.fillText(theme.cornerIcon, canvasWidth - 32, canvasHeight - 24);
    } else {
      ctx.strokeStyle = theme.textColor === '#fafafa' || theme.textColor === '#f4f4f5'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, canvasWidth - 36, canvasHeight - 36);
    }
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

  // 3. Layout Slot Calculations
  const photoCount = Math.max(1, loadedImages.length);

  if (layout === 'strip_3' || layout === 'strip_4' || (layout === 'grid_4' && photoCount <= 2)) {
    const margin = 36;
    const headerHeight = 110;
    const footerHeight = 160;
    const availableHeight = canvasHeight - headerHeight - footerHeight - margin * 2;
    const gap = 20;
    const slotHeight = (availableHeight - gap * (photoCount - 1)) / photoCount;
    const slotWidth = canvasWidth - margin * 2;

    // Header text
    ctx.fillStyle = effectiveTextColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventTitle, canvasWidth / 2, headerHeight - 35);

    if (theme.dateVisible) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = effectiveAccentColor;
      ctx.fillText(dateStr, canvasWidth / 2, headerHeight - 12);
    }

    // Draw each photo in slot
    loadedImages.forEach((img, idx) => {
      const slotY = headerHeight + margin + idx * (slotHeight + gap);

      // Photo border & background card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(margin - 4, slotY - 4, slotWidth + 8, slotHeight + 8);

      // Cover-crop the image to fill the slot perfectly
      drawImageProp(ctx, img, margin, slotY, slotWidth, slotHeight);

      // Apply calibrated thermal tone curve (lifts shadows) or digital color filter
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, margin, slotY, slotWidth, slotHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, margin, slotY, slotWidth, slotHeight);
      }

      // Inner border accent (digital keepsake only; thermal receipt stays clean)
      if (!isThermalMode) {
        ctx.strokeStyle = effectiveAccentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, slotY, slotWidth, slotHeight);
      }
    });

    // Footer text
    const footerY = canvasHeight - 80;
    ctx.fillStyle = effectiveTextColor;
    ctx.font = '500 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventSubtitle, canvasWidth / 2, footerY);

    ctx.font = '500 11px monospace';
    ctx.fillStyle = effectiveAccentColor;
    ctx.fillText('JCVCREATIVES • ARCHIVAL PRINT', canvasWidth / 2, footerY + 34);
  } else if (layout === 'grid_4') {
    // 2x2 grid
    const margin = 48;
    const headerHeight = 140;
    const footerHeight = 180;
    const cols = 2;
    const rows = 2;
    const gap = 24;

    const slotWidth = (canvasWidth - margin * 2 - gap) / cols;
    const availableHeight = canvasHeight - headerHeight - footerHeight;
    const slotHeight = (availableHeight - gap) / rows;

    // Header
    ctx.fillStyle = effectiveTextColor;
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventTitle, canvasWidth / 2, headerHeight - 50);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = effectiveAccentColor;
    ctx.fillText(dateStr, canvasWidth / 2, headerHeight - 16);

    loadedImages.slice(0, 4).forEach((img, idx) => {
      const c = idx % 2;
      const r = Math.floor(idx / 2);
      const x = margin + c * (slotWidth + gap);
      const y = headerHeight + r * (slotHeight + gap);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y - 6, slotWidth + 12, slotHeight + 12);

      drawImageProp(ctx, img, x, y, slotWidth, slotHeight);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, x, y, slotWidth, slotHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, x, y, slotWidth, slotHeight);
      }

      if (!isThermalMode) {
        ctx.strokeStyle = effectiveAccentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, slotWidth, slotHeight);
      }
    });

    // Footer
    ctx.fillStyle = effectiveTextColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventSubtitle, canvasWidth / 2, canvasHeight - 90);
  } else if (layout === 'single_polaroid') {
    const margin = 40;
    const photoWidth = canvasWidth - margin * 2;
    const photoHeight = photoWidth * 0.9;
    const photoY = margin;

    // Polaroid white base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, canvasWidth - 40, canvasHeight - 40);

    if (loadedImages[0]) {
      drawImageProp(ctx, loadedImages[0], margin, photoY, photoWidth, photoHeight);
      if (isThermalMode) {
        applyThermalPhotoToneCurve(ctx, margin, photoY, photoWidth, photoHeight, thermalBrightness);
      } else {
        applyCanvasFilter(ctx, effectiveFilter, margin, photoY, photoWidth, photoHeight);
      }
    }

    ctx.fillStyle = effectiveTextColor;
    ctx.font = 'italic bold 28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventTitle, canvasWidth / 2, photoY + photoHeight + 70);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = effectiveAccentColor;
    ctx.fillText(dateStr, canvasWidth / 2, photoY + photoHeight + 110);
  }

  // 4. Render Hand Drawings (Doodles)
  if (drawings.length > 0) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawings.forEach((drawing) => {
      if (drawing.points.length < 2) return;
      ctx.strokeStyle = isThermalMode ? '#000000' : drawing.color;
      ctx.lineWidth = drawing.lineWidth * (canvasWidth / 400); // Scale with resolution
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

  // 5. Render Stickers & Emojis
  if (stickers.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stickers.forEach((st) => {
      const sx = (st.x / 100) * canvasWidth;
      const sy = (st.y / 100) * canvasHeight;
      const size = Math.round(56 * st.scale * (canvasWidth / 500));

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((st.rotation * Math.PI) / 180);
      ctx.font = `${size}px sans-serif`;
      ctx.fillText(st.emoji, 0, 0);
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
