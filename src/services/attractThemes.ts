/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeStorageGet, safeStorageSet } from './storage';

export type AttractOccasionId =
  | 'gobble_haus'
  | 'default'
  | 'wedding'
  | 'birthday'
  | 'school'
  | 'halloween'
  | 'valentines'
  | 'christmas'
  | 'graduation'
  | 'baby_shower'
  | 'retro_disco';

export type StickerAnimationType =
  | 'food_drop'          // Cascading & bouncing rice-box food sticker drop
  | 'food_land'          // Dropping in with a spring bounce & gentle wiggle
  | 'disco_ball_shine'   // Spinning disco ball 🪩 with radiant shining rays ✨
  | 'clown_wiggle'       // Moving / wiggling clown 🤡
  | 'cake_with_candle'   // Birthday cake 🎂 with flickering candle flame 🔥 on top
  | 'balloon_rise'       // Balloons / hearts / bubbles floating up to the top of the screen
  | 'wing_glide'         // Gliding dove, bat, love letter, or cloud
  | 'twinkle_shine'      // Twinkling sparkle, ring, star, or Christmas tree
  | 'snow_fall'          // Falling and spinning snowflake
  | 'heartbeat'          // Romantic pulsing heart
  | 'ghost_float';       // Spooky floating ghost or jack-o'-lantern

export interface AnimatedStickerItem {
  id: string;
  emoji: string;
  imageUrl?: string;
  label?: string;
  animation: StickerAnimationType;
  positionClass: string;
  sizeClass: string;
  delayMs?: number;
  durationMs?: number;
}

export const GOBBLE_HAUS_STICKER_ASSETS = [
  {
    id: 'gh-01',
    name: 'Shredded Beef & Egg',
    url: '/assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
  },
  {
    id: 'gh-02',
    name: 'Chicken Inasal & Rice',
    url: '/assets/aistudio/02_tapa_and_garlic_rice_77785a88.png',
  },
  {
    id: 'gh-03',
    name: 'Hotdogs & Scrambled Egg',
    url: '/assets/aistudio/03_hotdogs_and_scrambled_egg_28f526aa.png',
  },
  {
    id: 'gh-05',
    name: 'Diced Hotdogs & Egg',
    url: '/assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
  },
  {
    id: 'gh-06',
    name: 'Beef & Egg Rice',
    url: '/assets/aistudio/06_beef_and_egg_rice_062af470.png',
  },
  {
    id: 'gh-07',
    name: 'Luncheon Meat Rice',
    url: '/assets/aistudio/07_luncheon_meat_rice_8770438d.png',
  },
  {
    id: 'gh-08',
    name: 'Beef & Scrambled Egg',
    url: '/assets/aistudio/08_beef_and_scrambled_egg_177c915a.png',
  },
  {
    id: 'gh-09',
    name: 'Creamy Chicken & Egg Rice',
    url: '/assets/aistudio/09_creamy_chicken_and_egg_rice_bfe9e7b2.png',
  },
];

export interface AttractOccasionTheme {
  id: AttractOccasionId;
  name: string;
  shortLabel: string;
  emoji: string;
  description: string;
  isDark: boolean;

  // Screen & Ambient
  screenBgClass: string;
  floatingSymbols: [string, string, string, string, string, string];
  floatingOpacityClass: string;
  animatedStickers: AnimatedStickerItem[];

  // Top Left Branding Card
  brandCardClass: string;
  brandIconBgClass: string;
  brandSubtitleText: string;

  // Center Hero Typography
  heroTitle: string;
  heroTitleClass: string;
  heroSubtitle: string;
  heroSubtitleClass: string;

  // 3 Shuffling Photostrips Style
  stripCardClass: string;
  polaroidCardClass: string;
  photoSlotClass: string;
  stripHeaderClass: string;
  stripFooterClass: string;
  leftStripHeader: string;
  leftStripFooter: string;
  leftCornerSticker?: string;
  leftCornerStickerImage?: string;
  leftCornerAnimClass?: string;
  centerPolaroidHeader: string;
  centerPolaroidCaption: string;
  centerPolaroidCaptionClass: string;
  centerCornerBadge?: string;
  centerCornerBadgeImage?: string;
  centerCornerAnimClass?: string;
  rightStripHeader: string;
  rightStripFooter: string;
  rightCornerSticker?: string;
  rightCornerStickerImage?: string;
  rightCornerAnimClass?: string;

  // Envelope Pocket Style
  envelopePocketClass: string;
  envelopeFlapClass: string;
  envelopeSealClass: string;
  envelopeSealTitleClass: string;
  envelopeSealSubtitleClass: string;
  envelopeAccentIcon: string;
  envelopeTitle: string;
  envelopeSubtitle: string;

  // Moving Start Button Style
  buttonClass: string;
  buttonText: string;
  ctaSubtext: string;
  ctaSubtextClass: string;

  // Bottom Feature Row
  bottomRowClass: string;
  bottomIconClass: string;
  bottomFeatures: [string, string, string];
}

export const ATTRACT_OCCASION_THEMES: AttractOccasionTheme[] = [
  // 0. GOBBLE HAUS — Signature Rice Box Restaurant Theme with Dropping Food Stickers
  {
    id: 'gobble_haus',
    name: 'Gobble Haus',
    shortLabel: 'Gobble Haus',
    emoji: '🥡',
    description: 'Signature Gobble Haus restaurant theme featuring Chicken Inasal, Ice Cream, Float, and Rice Box stickers.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#fffbf2] via-[#fdf3e1] to-[#f5e1be] text-[#2c1a0e]',
    floatingSymbols: ['🥡', '🍗', '🍦', '🥤', '🥢', '✨'],
    floatingOpacityClass: 'opacity-100',
    animatedStickers: [
      // All 8 Gobble Haus Rice Box Stickers cascading and dropping across the home screen
      {
        id: 'gh-drop-1',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
        label: 'Shredded Beef & Egg',
        animation: 'food_drop',
        positionClass: 'left-[3%] sm:left-[5%] top-0',
        sizeClass: 'w-16 h-16 sm:w-22 sm:h-22',
        delayMs: 0,
        durationMs: 6800,
      },
      {
        id: 'gh-drop-2',
        emoji: '🍗',
        imageUrl: '/assets/aistudio/02_tapa_and_garlic_rice_77785a88.png',
        label: 'Chicken Inasal & Rice',
        animation: 'food_drop',
        positionClass: 'left-[14%] sm:left-[16%] top-0',
        sizeClass: 'w-15 h-15 sm:w-20 sm:h-20',
        delayMs: 1700,
        durationMs: 7400,
      },
      {
        id: 'gh-drop-3',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/03_hotdogs_and_scrambled_egg_28f526aa.png',
        label: 'Hotdogs & Scrambled Egg',
        animation: 'food_drop',
        positionClass: 'left-[25%] sm:left-[27%] top-0',
        sizeClass: 'w-14 h-14 sm:w-18 sm:h-18',
        delayMs: 3400,
        durationMs: 7000,
      },
      {
        id: 'gh-drop-4',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
        label: 'Diced Hotdogs & Egg',
        animation: 'food_drop',
        positionClass: 'left-[36%] top-0',
        sizeClass: 'w-15 h-15 sm:w-20 sm:h-20',
        delayMs: 5100,
        durationMs: 7600,
      },
      {
        id: 'gh-drop-5',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/06_beef_and_egg_rice_062af470.png',
        label: 'Beef & Egg Rice',
        animation: 'food_drop',
        positionClass: 'right-[36%] top-0',
        sizeClass: 'w-15 h-15 sm:w-20 sm:h-20',
        delayMs: 900,
        durationMs: 7200,
      },
      {
        id: 'gh-drop-6',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/07_luncheon_meat_rice_8770438d.png',
        label: 'Luncheon Meat Rice',
        animation: 'food_drop',
        positionClass: 'right-[25%] sm:right-[27%] top-0',
        sizeClass: 'w-14 h-14 sm:w-18 sm:h-18',
        delayMs: 2600,
        durationMs: 6900,
      },
      {
        id: 'gh-drop-7',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/08_beef_and_scrambled_egg_177c915a.png',
        label: 'Beef & Scrambled Egg',
        animation: 'food_drop',
        positionClass: 'right-[14%] sm:right-[16%] top-0',
        sizeClass: 'w-15 h-15 sm:w-20 sm:h-20',
        delayMs: 4300,
        durationMs: 7500,
      },
      {
        id: 'gh-drop-8',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/09_creamy_chicken_and_egg_rice_bfe9e7b2.png',
        label: 'Creamy Chicken & Egg Rice',
        animation: 'food_drop',
        positionClass: 'right-[3%] sm:right-[5%] top-0',
        sizeClass: 'w-16 h-16 sm:w-22 sm:h-22',
        delayMs: 5900,
        durationMs: 7100,
      },
      // Featured bouncing rice-box stickers anchored on the sides of the home screen
      {
        id: 'gh-land-tl',
        emoji: '🍗',
        imageUrl: '/assets/aistudio/02_tapa_and_garlic_rice_77785a88.png',
        label: 'Chicken Inasal & Rice',
        animation: 'food_land',
        positionClass: 'top-20 right-6 sm:right-14',
        sizeClass: 'w-18 h-18 sm:w-24 sm:h-24',
        delayMs: 0,
      },
      {
        id: 'gh-land-bl',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
        label: 'Diced Hotdogs & Egg',
        animation: 'food_land',
        positionClass: 'bottom-22 left-6 sm:left-14',
        sizeClass: 'w-18 h-18 sm:w-24 sm:h-24',
        delayMs: 500,
      },
      {
        id: 'gh-land-br',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/09_creamy_chicken_and_egg_rice_bfe9e7b2.png',
        label: 'Creamy Chicken & Egg Rice',
        animation: 'food_land',
        positionClass: 'bottom-22 right-6 sm:right-14',
        sizeClass: 'w-18 h-18 sm:w-24 sm:h-24',
        delayMs: 1000,
      },
      {
        id: 'gh-land-ml',
        emoji: '🥡',
        imageUrl: '/assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
        label: 'Shredded Beef & Egg',
        animation: 'food_land',
        positionClass: 'top-1/3 left-4 sm:left-10',
        sizeClass: 'w-16 h-16 sm:w-22 sm:h-22',
        delayMs: 1400,
      },
    ],
    brandCardClass: 'bg-[#fffcf7] border-[#d9a05b] text-[#2c1a0e] shadow-sm',
    brandIconBgClass: 'bg-gradient-to-tr from-[#c67d30] to-[#f59e0b] text-white border-[#fde68a] shadow-amber-500/30',
    brandSubtitleText: 'JCVcreatives Photobooth',
    heroTitle: 'Gobble Haus',
    heroTitleClass: 'text-[#2c1a0e] font-black tracking-tight drop-shadow-[0_2px_0_rgba(255,255,255,0.8)]',
    heroSubtitle: 'JCVcreatives Photobooth • Rice Box Kitchen',
    heroSubtitleClass: 'text-[#8c521e] font-bold tracking-wide',
    stripCardClass: 'bg-[#fffdf9] border-2 border-[#2c1a0e] rounded-lg shadow-xl ring-2 ring-[#e7b877]',
    polaroidCardClass: 'bg-[#fffdf9] border-2 border-[#2c1a0e] rounded-xl shadow-2xl ring-2 ring-[#f59e0b]',
    photoSlotClass: 'bg-[#f8efe0] border border-[#d9a05b] rounded',
    stripHeaderClass: 'text-[#2c1a0e] border-b-2 border-[#d9a05b] font-mono font-black',
    stripFooterClass: 'text-[#8c521e] border-t border-dashed border-[#c68b45] font-mono font-bold',
    leftStripHeader: 'GOBBLE HAUS',
    leftStripFooter: '★ ORDER #01 ★',
    leftCornerStickerImage: '/assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
    leftCornerAnimClass: 'sticker-food-land',
    centerPolaroidHeader: 'GOBBLE HAUS VIP',
    centerPolaroidCaption: 'eat well, snap happy! 🥡',
    centerPolaroidCaptionClass: 'font-bold text-[#9a4b14]',
    centerCornerBadgeImage: '/assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
    centerCornerAnimClass: 'sticker-food-land',
    rightStripHeader: 'RICE BOX CLUB',
    rightStripFooter: '||| FRESH HOT |||',
    rightCornerStickerImage: '/assets/aistudio/03_hotdogs_and_scrambled_egg_28f526aa.png',
    rightCornerAnimClass: 'sticker-food-land',
    envelopePocketClass: 'bg-gradient-to-b from-[#d9a05b] via-[#c68b45] to-[#a86f2c] border-t-3 border-[#2c1a0e] rounded-b-2xl shadow-2xl',
    envelopeFlapClass: 'border-[#2c1a0e] bg-[#d9a05b]',
    envelopeSealClass: 'bg-[#2c1a0e] border-2 border-[#fbbf24] shadow-lg',
    envelopeSealTitleClass: 'text-[#fbbf24] font-black',
    envelopeSealSubtitleClass: 'text-[#fde68a]',
    envelopeAccentIcon: '🥡',
    envelopeTitle: 'GOBBLE HAUS',
    envelopeSubtitle: 'JCVCREATIVES PHOTOBOOTH',
    buttonClass: 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706] hover:brightness-105 text-[#1c1008] font-black border-2 border-[#2c1a0e] shadow-[0_6px_0_#2c1a0e] rounded-full',
    buttonText: 'Tap to Snap at Gobble Haus 🥡',
    ctaSubtext: 'Capture your foodie keepsake & grab your favorite rice box!',
    ctaSubtextClass: 'text-[#6e3f16] font-semibold',
    bottomRowClass: 'text-[#5c3412] font-medium',
    bottomIconClass: 'text-[#b45309]',
    bottomFeatures: ['Receipt Photostrip', 'Instant Phone QR', 'Gobble Haus Stickers'],
  },

  // 1. DEFAULT — Classic Minimalist Studio
  {
    id: 'default',
    name: 'Classic Studio (Default)',
    shortLabel: 'Default Studio',
    emoji: '📸',
    description: 'Minimalist warm ivory aesthetic with crisp white thermal strips and baby-blue start button.',
    isDark: false,
    screenBgClass: 'bg-[#faf8f5] text-zinc-900',
    floatingSymbols: ['✧', '♡', '✩', '♡', '✦', '✧'],
    floatingOpacityClass: 'opacity-45 text-zinc-400',
    animatedStickers: [
      { id: 'def-1', emoji: '✧', animation: 'twinkle_shine', positionClass: 'top-14 left-12', sizeClass: 'text-2xl', delayMs: 0 },
      { id: 'def-2', emoji: '♡', animation: 'heartbeat', positionClass: 'top-24 right-14', sizeClass: 'text-xl', delayMs: 500 },
      { id: 'def-3', emoji: '✩', animation: 'twinkle_shine', positionClass: 'bottom-24 left-16', sizeClass: 'text-3xl', delayMs: 900 },
      { id: 'def-4', emoji: '♡', animation: 'wing_glide', positionClass: 'bottom-28 right-14', sizeClass: 'text-2xl', delayMs: 300 },
      { id: 'def-5', emoji: '✦', animation: 'twinkle_shine', positionClass: 'top-1/2 left-10', sizeClass: 'text-xl', delayMs: 1200 },
      { id: 'def-6', emoji: '✧', animation: 'twinkle_shine', positionClass: 'top-1/3 right-10', sizeClass: 'text-2xl', delayMs: 700 },
    ],
    brandCardClass: 'bg-white border-zinc-200 text-zinc-900',
    brandIconBgClass: 'bg-gradient-to-tr from-sky-400 to-sky-200 text-slate-950 border-sky-200 shadow-sky-300/30',
    brandSubtitleText: 'JCVcreatives Kiosk',
    heroTitle: 'JCVcreatives',
    heroTitleClass: 'text-zinc-950 font-serif italic',
    heroSubtitle: 'Receipt Photobooth',
    heroSubtitleClass: 'text-zinc-600 font-medium',
    stripCardClass: 'bg-white border border-zinc-300 rounded-md shadow-lg',
    polaroidCardClass: 'bg-white border border-zinc-300 rounded-lg shadow-xl',
    photoSlotClass: 'bg-zinc-100 border border-zinc-200 rounded',
    stripHeaderClass: 'text-zinc-500 border-b border-zinc-200 font-mono',
    stripFooterClass: 'text-zinc-400 border-t border-dashed border-zinc-300 font-mono',
    leftStripHeader: 'JCV • STRIP',
    leftStripFooter: '||| |||| |||',
    centerPolaroidHeader: 'JCVcreatives',
    centerPolaroidCaption: 'memories ♡',
    centerPolaroidCaptionClass: 'font-serif italic text-zinc-700',
    rightStripHeader: 'RECEIPT',
    rightStripFooter: '|||| || |||',
    envelopePocketClass: 'bg-gradient-to-b from-white via-zinc-50 to-zinc-100 border-t-2 border-zinc-200 rounded-b-2xl shadow-lg',
    envelopeFlapClass: 'border-zinc-300 bg-white',
    envelopeSealClass: 'bg-white border border-zinc-200 shadow-xs',
    envelopeSealTitleClass: 'text-zinc-900',
    envelopeSealSubtitleClass: 'text-zinc-400',
    envelopeAccentIcon: '✦',
    envelopeTitle: 'JCV CREATIVES',
    envelopeSubtitle: 'STUDIO PHOTOBOOTH',
    buttonClass: 'bg-sky-300 hover:bg-sky-200 text-slate-950 border border-sky-200 shadow-xl shadow-sky-300/40 rounded-full',
    buttonText: 'Tap to Start',
    ctaSubtext: 'Touch anywhere to snap your memories ♡',
    ctaSubtextClass: 'text-zinc-500',
    bottomRowClass: 'text-zinc-500',
    bottomIconClass: 'text-zinc-600',
    bottomFeatures: ['Thermal Print', 'Instant QR Save', 'Cute Stamps & Frames'],
  },

  // 2. WEDDING — Forever & Always Luxury Gold & Pearl
  {
    id: 'wedding',
    name: 'Wedding & Nuptials',
    shortLabel: 'Wedding',
    emoji: '💍',
    description: 'Champagne pearl backdrop, gold-foil bordered keepsake strips, gliding doves, and sparkling rings.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#fffdf9] via-[#fbf5eb] to-[#f4eadc] text-[#4a3b2c]',
    floatingSymbols: ['💍', '🕊️', '🥂', '✧', '🤍', '✨'],
    floatingOpacityClass: 'opacity-80 text-[#c59b27]',
    animatedStickers: [
      { id: 'wed-1', emoji: '💍', animation: 'twinkle_shine', positionClass: 'top-16 left-12', sizeClass: 'text-3xl', delayMs: 0 },
      { id: 'wed-2', emoji: '🕊️', animation: 'wing_glide', positionClass: 'top-20 right-16', sizeClass: 'text-3xl', delayMs: 300 },
      { id: 'wed-3', emoji: '🥂', animation: 'clown_wiggle', positionClass: 'bottom-28 left-14', sizeClass: 'text-3xl', delayMs: 600 },
      { id: 'wed-4', emoji: '🕊️', animation: 'wing_glide', positionClass: 'top-1/2 right-12', sizeClass: 'text-2xl', delayMs: 1100 },
      { id: 'wed-5', emoji: '🤍', animation: 'balloon_rise', positionClass: 'left-[18%] top-0', sizeClass: 'text-2xl', delayMs: 0, durationMs: 7000 },
      { id: 'wed-6', emoji: '🤍', animation: 'balloon_rise', positionClass: 'right-[18%] top-0', sizeClass: 'text-2xl', delayMs: 3200, durationMs: 7500 },
      { id: 'wed-7', emoji: '✨', animation: 'twinkle_shine', positionClass: 'bottom-24 right-16', sizeClass: 'text-2xl', delayMs: 900 },
    ],
    brandCardClass: 'bg-[#fffefb] border-[#e6d5b8] text-[#4a3b2c]',
    brandIconBgClass: 'bg-gradient-to-tr from-[#d4af37] to-[#f3e5ab] text-[#3d2e1e] border-[#e6c65a] shadow-[#d4af37]/30',
    brandSubtitleText: 'Wedding Edition',
    heroTitle: 'Forever & Always',
    heroTitleClass: 'text-[#3d2e1e] font-serif italic',
    heroSubtitle: 'JCVcreatives Wedding Photobooth',
    heroSubtitleClass: 'text-[#8c7355] font-serif tracking-widest uppercase text-xs',
    stripCardClass: 'bg-[#fffdf8] border-2 border-[#d4af37]/75 rounded-sm shadow-xl ring-1 ring-[#f3e5ab]',
    polaroidCardClass: 'bg-[#fffdf8] border-2 border-[#d4af37] rounded-sm shadow-2xl ring-2 ring-[#f3e5ab]/80',
    photoSlotClass: 'bg-[#f7f0e4] border border-[#e2ceaa] rounded-xs',
    stripHeaderClass: 'text-[#8c6d23] border-b border-[#e8d8b5] font-serif italic',
    stripFooterClass: 'text-[#b08d32] border-t border-dotted border-[#d4af37]/60 font-serif',
    leftStripHeader: 'MR & MRS',
    leftStripFooter: '✧ EST. 2026 ✧',
    leftCornerSticker: '🕊️',
    leftCornerAnimClass: 'sticker-wing-glide',
    centerPolaroidHeader: 'OUR WEDDING DAY',
    centerPolaroidCaption: 'just married 💍',
    centerPolaroidCaptionClass: 'font-serif italic text-[#7a5c1d] font-semibold',
    centerCornerBadge: '💍',
    centerCornerAnimClass: 'sticker-twinkle-shine',
    rightStripHeader: 'LOVE VOWS',
    rightStripFooter: '♡ FOREVER ♡',
    rightCornerSticker: '🥂',
    rightCornerAnimClass: 'sticker-clown-wiggle',
    envelopePocketClass: 'bg-gradient-to-b from-[#fffdf9] via-[#f9f1e4] to-[#f0e4d0] border-t-2 border-[#d4af37]/60 rounded-b-2xl shadow-xl',
    envelopeFlapClass: 'border-[#d4af37]/60 bg-[#fffdf9]',
    envelopeSealClass: 'bg-[#fffdf7] border border-[#d4af37]/70 shadow-md',
    envelopeSealTitleClass: 'text-[#5c4418] font-serif',
    envelopeSealSubtitleClass: 'text-[#9c7e3b]',
    envelopeAccentIcon: '💍',
    envelopeTitle: 'WEDDING KEEPSAKE',
    envelopeSubtitle: 'JCV CREATIVES STUDIO',
    buttonClass: 'bg-gradient-to-r from-[#c59b27] via-[#e2bf55] to-[#c59b27] hover:brightness-105 text-white border-2 border-[#f7e9b7] shadow-xl shadow-[#c59b27]/35 rounded-full',
    buttonText: 'Tap to Capture Love 💍',
    ctaSubtext: 'Complimentary wedding keepsake prints for our guests ♡',
    ctaSubtextClass: 'text-[#7d6549] font-serif italic',
    bottomRowClass: 'text-[#7d6549]',
    bottomIconClass: 'text-[#b08d32]',
    bottomFeatures: ['Keepsake Print', 'Digital Wedding Album', 'Custom Monogram'],
  },

  // 3. BIRTHDAY — Moving Clown, Cake with Flickering Candle, & Rising Balloons!
  {
    id: 'birthday',
    name: 'Birthday Bash',
    shortLabel: 'Birthday',
    emoji: '🎂',
    description: 'Moving juggling clown, birthday cake with flickering candle flame, and balloons floating up the screen!',
    isDark: false,
    screenBgClass: 'bg-gradient-to-br from-[#fff9f5] via-[#fff0f6] to-[#f0f9ff] text-slate-900',
    floatingSymbols: ['🤡', '🎂', '🎈', '🎉', '🎁', '🧁'],
    floatingOpacityClass: 'opacity-90 text-pink-500',
    animatedStickers: [
      // Dancing / Moving Clown
      { id: 'bday-clown-1', emoji: '🤡', animation: 'clown_wiggle', positionClass: 'top-20 left-8 sm:left-16', sizeClass: 'text-4xl sm:text-5xl', delayMs: 0 },
      { id: 'bday-clown-2', emoji: '🤡', animation: 'clown_wiggle', positionClass: 'bottom-28 right-8 sm:right-16', sizeClass: 'text-3xl sm:text-4xl', delayMs: 700 },
      // Birthday Cake with moving/flickering candle flame on top
      { id: 'bday-cake-1', emoji: '🎂', animation: 'cake_with_candle', positionClass: 'bottom-24 left-10 sm:left-20', sizeClass: 'text-4xl sm:text-5xl', delayMs: 200 },
      { id: 'bday-cake-2', emoji: '🎂', animation: 'cake_with_candle', positionClass: 'top-20 right-10 sm:right-20', sizeClass: 'text-3xl sm:text-4xl', delayMs: 900 },
      // Balloons rising up the screen continuously
      { id: 'bday-bal-1', emoji: '🎈', animation: 'balloon_rise', positionClass: 'left-[8%] top-0', sizeClass: 'text-3xl sm:text-4xl', delayMs: 0, durationMs: 6800 },
      { id: 'bday-bal-2', emoji: '🎈', animation: 'balloon_rise', positionClass: 'left-[24%] top-0', sizeClass: 'text-2xl sm:text-3xl', delayMs: 2200, durationMs: 7400 },
      { id: 'bday-bal-3', emoji: '🎈', animation: 'balloon_rise', positionClass: 'right-[22%] top-0', sizeClass: 'text-3xl sm:text-4xl', delayMs: 1100, durationMs: 6500 },
      { id: 'bday-bal-4', emoji: '🎈', animation: 'balloon_rise', positionClass: 'right-[9%] top-0', sizeClass: 'text-2xl sm:text-3xl', delayMs: 3600, durationMs: 7200 },
      { id: 'bday-confetti', emoji: '🎉', animation: 'twinkle_shine', positionClass: 'top-1/2 left-6 sm:left-12', sizeClass: 'text-2xl sm:text-3xl', delayMs: 400 },
    ],
    brandCardClass: 'bg-white border-pink-200 text-slate-900',
    brandIconBgClass: 'bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-300 text-white border-pink-200 shadow-pink-300/40',
    brandSubtitleText: 'Birthday Party Booth',
    heroTitle: 'Happy Birthday!',
    heroTitleClass: 'text-pink-600 font-extrabold tracking-tight',
    heroSubtitle: 'JCVcreatives Party Photobooth',
    heroSubtitleClass: 'text-amber-600 font-semibold',
    stripCardClass: 'bg-white border-2 border-dashed border-pink-400 rounded-xl shadow-lg',
    polaroidCardClass: 'bg-gradient-to-b from-white to-pink-50/70 border-2 border-pink-400 rounded-2xl shadow-xl ring-2 ring-amber-200',
    photoSlotClass: 'bg-pink-50/60 border border-pink-200 rounded-lg',
    stripHeaderClass: 'text-pink-600 border-b border-pink-200 font-bold',
    stripFooterClass: 'text-amber-500 border-t border-dashed border-pink-300 font-mono',
    leftStripHeader: '🎂 B-DAY VIP',
    leftStripFooter: '★ PARTY PASS ★',
    leftCornerSticker: '🤡',
    leftCornerAnimClass: 'sticker-clown-wiggle',
    centerPolaroidHeader: 'CELEBRATE!',
    centerPolaroidCaption: 'make a wish! 🎉',
    centerPolaroidCaptionClass: 'font-bold text-pink-600',
    centerCornerBadge: '🎂',
    centerCornerAnimClass: 'sticker-cake-bob',
    rightStripHeader: "🎈 LET'S PARTY",
    rightStripFooter: '🎉 HBD 2026 🎉',
    rightCornerSticker: '🎈',
    rightCornerAnimClass: 'sticker-wing-glide',
    envelopePocketClass: 'bg-gradient-to-b from-white via-pink-50/90 to-amber-50/90 border-t-2 border-pink-300 rounded-b-3xl shadow-lg',
    envelopeFlapClass: 'border-pink-300 bg-white',
    envelopeSealClass: 'bg-white border-2 border-pink-300 shadow-sm',
    envelopeSealTitleClass: 'text-pink-600',
    envelopeSealSubtitleClass: 'text-amber-600',
    envelopeAccentIcon: '🎈',
    envelopeTitle: 'BIRTHDAY BASH',
    envelopeSubtitle: 'JCV PARTY STUDIO',
    buttonClass: 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-105 text-white border-2 border-pink-200 shadow-xl shadow-pink-400/40 rounded-full',
    buttonText: 'Tap to Party! 🎂',
    ctaSubtext: 'Strike a pose & grab your birthday print! 🎈',
    ctaSubtextClass: 'text-pink-600/80 font-medium',
    bottomRowClass: 'text-pink-700/80',
    bottomIconClass: 'text-pink-500',
    bottomFeatures: ['Instant Party Print', 'Scan QR to Phone', 'Birthday Props & Stickers'],
  },

  // 4. SCHOOL EVENTS — Varsity Collegiate & Yearbook
  {
    id: 'school',
    name: 'School Events & Yearbook',
    shortLabel: 'School Event',
    emoji: '🎓',
    description: 'Collegiate varsity navy & gold styling, tossed graduation caps, spinning stars, and campus crest.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#f8fafc] via-[#eff6ff] to-[#fef9c3]/50 text-blue-950',
    floatingSymbols: ['🎓', '📚', '⭐', '🏆', '✏️', '🎒'],
    floatingOpacityClass: 'opacity-80 text-blue-600',
    animatedStickers: [
      { id: 'sch-1', emoji: '🎓', animation: 'balloon_rise', positionClass: 'left-[12%] top-0', sizeClass: 'text-3xl', delayMs: 0, durationMs: 7000 },
      { id: 'sch-2', emoji: '🎓', animation: 'balloon_rise', positionClass: 'right-[14%] top-0', sizeClass: 'text-3xl', delayMs: 3000, durationMs: 7200 },
      { id: 'sch-3', emoji: '🏆', animation: 'twinkle_shine', positionClass: 'top-20 left-14', sizeClass: 'text-3xl', delayMs: 200 },
      { id: 'sch-4', emoji: '✏️', animation: 'clown_wiggle', positionClass: 'bottom-28 left-16', sizeClass: 'text-3xl', delayMs: 500 },
      { id: 'sch-5', emoji: '⭐', animation: 'twinkle_shine', positionClass: 'top-24 right-16', sizeClass: 'text-3xl', delayMs: 800 },
      { id: 'sch-6', emoji: '📚', animation: 'wing_glide', positionClass: 'bottom-24 right-14', sizeClass: 'text-3xl', delayMs: 400 },
    ],
    brandCardClass: 'bg-white border-blue-200 text-blue-950',
    brandIconBgClass: 'bg-gradient-to-tr from-blue-800 to-blue-600 text-amber-300 border-amber-400 shadow-blue-500/30',
    brandSubtitleText: 'Campus Event Edition',
    heroTitle: 'Campus Memories',
    heroTitleClass: 'text-blue-950 font-black uppercase tracking-tight',
    heroSubtitle: 'JCVcreatives Yearbook & School Booth',
    heroSubtitleClass: 'text-blue-700 font-semibold',
    stripCardClass: 'bg-[#fffef5] border-2 border-blue-900 rounded-md shadow-lg',
    polaroidCardClass: 'bg-[#fffef7] border-2 border-blue-900 rounded-lg shadow-xl ring-2 ring-amber-400',
    photoSlotClass: 'bg-blue-50 border border-blue-200 rounded-xs',
    stripHeaderClass: 'text-blue-900 border-b-2 border-amber-400 font-mono font-bold',
    stripFooterClass: 'text-blue-800 border-t border-blue-300 font-mono',
    leftStripHeader: "YEARBOOK '26",
    leftStripFooter: 'CLASS OF 2026',
    leftCornerSticker: '✏️',
    leftCornerAnimClass: 'sticker-clown-wiggle',
    centerPolaroidHeader: 'CAMPUS SQUAD',
    centerPolaroidCaption: 'best friends 🎓',
    centerPolaroidCaptionClass: 'font-serif italic font-bold text-blue-900',
    centerCornerBadge: '🎓',
    centerCornerAnimClass: 'sticker-cake-bob',
    rightStripHeader: 'HALL PASS',
    rightStripFooter: '★ VARSITY ★',
    rightCornerSticker: '🏆',
    rightCornerAnimClass: 'sticker-twinkle-shine',
    envelopePocketClass: 'bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900 border-t-4 border-amber-400 rounded-b-2xl shadow-xl',
    envelopeFlapClass: 'border-amber-400 bg-blue-900',
    envelopeSealClass: 'bg-amber-400 border-2 border-white shadow-md',
    envelopeSealTitleClass: 'text-blue-950 font-black',
    envelopeSealSubtitleClass: 'text-blue-900 font-bold',
    envelopeAccentIcon: '⭐',
    envelopeTitle: 'SCHOOL SPIRIT',
    envelopeSubtitle: 'OFFICIAL YEARBOOK BOOTH',
    buttonClass: 'bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-700 text-amber-300 border-2 border-amber-400 shadow-xl shadow-blue-800/35 rounded-xl',
    buttonText: 'Tap for Yearbook Snap 🎓',
    ctaSubtext: 'Gather your classmates & snap your school keepsake!',
    ctaSubtextClass: 'text-blue-800 font-medium',
    bottomRowClass: 'text-blue-900/80',
    bottomIconClass: 'text-blue-700',
    bottomFeatures: ['Yearbook Strip Print', 'Instant Squad QR', 'School Spirit Stamps'],
  },

  // 5. HALLOWEEN — Spooky Midnight & Jack-O'-Lantern
  {
    id: 'halloween',
    name: 'Halloween Spooky Night',
    shortLabel: 'Halloween',
    emoji: '🎃',
    description: 'Swooping bats, floating ghosts, wiggling jack-o\'-lanterns, and glowing pumpkin button.',
    isDark: true,
    screenBgClass: 'bg-gradient-to-b from-[#120d1d] via-[#1d122c] to-[#0b0711] text-orange-100',
    floatingSymbols: ['🎃', '👻', '🦇', '🕸️', '🌙', '💀'],
    floatingOpacityClass: 'opacity-85 text-orange-400',
    animatedStickers: [
      { id: 'hal-1', emoji: '👻', animation: 'ghost_float', positionClass: 'top-16 left-10 sm:left-16', sizeClass: 'text-4xl', delayMs: 0 },
      { id: 'hal-2', emoji: '🦇', animation: 'wing_glide', positionClass: 'top-20 right-12 sm:right-20', sizeClass: 'text-3xl sm:text-4xl', delayMs: 300 },
      { id: 'hal-3', emoji: '🎃', animation: 'clown_wiggle', positionClass: 'bottom-24 left-12 sm:left-18', sizeClass: 'text-4xl', delayMs: 500 },
      { id: 'hal-4', emoji: '👻', animation: 'ghost_float', positionClass: 'bottom-28 right-12 sm:right-18', sizeClass: 'text-3xl sm:text-4xl', delayMs: 900 },
      { id: 'hal-5', emoji: '🦇', animation: 'wing_glide', positionClass: 'top-1/2 left-8 sm:left-12', sizeClass: 'text-3xl', delayMs: 1200 },
      { id: 'hal-6', emoji: '🕸️', animation: 'twinkle_shine', positionClass: 'top-1/3 right-8 sm:right-12', sizeClass: 'text-3xl', delayMs: 600 },
    ],
    brandCardClass: 'bg-[#1f162f] border-orange-500/40 text-orange-100',
    brandIconBgClass: 'bg-gradient-to-tr from-orange-600 to-amber-400 text-slate-950 border-orange-300 shadow-orange-500/40',
    brandSubtitleText: 'Haunted Booth Edition',
    heroTitle: 'Spooky Captures',
    heroTitleClass: 'text-orange-400 font-serif italic drop-shadow-[0_2px_10px_rgba(249,115,22,0.35)]',
    heroSubtitle: 'JCVcreatives Haunted Photobooth',
    heroSubtitleClass: 'text-purple-300 font-mono tracking-wider uppercase text-xs',
    stripCardClass: 'bg-[#1c1429] border-2 border-orange-500/80 rounded-md shadow-2xl shadow-orange-950/60',
    polaroidCardClass: 'bg-[#231834] border-2 border-orange-400 rounded-lg shadow-2xl ring-1 ring-purple-500/50',
    photoSlotClass: 'bg-[#110b1a] border border-purple-800/80 rounded',
    stripHeaderClass: 'text-orange-400 border-b border-purple-800 font-mono font-bold',
    stripFooterClass: 'text-purple-400 border-t border-dashed border-orange-500/50 font-mono',
    leftStripHeader: '👻 BOO • STRIP',
    leftStripFooter: '🕸️ 31 OCT 🕸️',
    leftCornerSticker: '👻',
    leftCornerAnimClass: 'sticker-ghost-float',
    centerPolaroidHeader: 'FRIGHT NIGHT',
    centerPolaroidCaption: 'trick or treat 🎃',
    centerPolaroidCaptionClass: 'font-serif italic text-orange-300 font-bold',
    centerCornerBadge: '🎃',
    centerCornerAnimClass: 'sticker-clown-wiggle',
    rightStripHeader: "WITCH'S BREW",
    rightStripFooter: '🦇 SPOOKY 🦇',
    rightCornerSticker: '🦇',
    rightCornerAnimClass: 'sticker-wing-glide',
    envelopePocketClass: 'bg-gradient-to-b from-[#261a39] via-[#1a1128] to-[#110b1a] border-t-2 border-orange-500/70 rounded-b-2xl shadow-2xl',
    envelopeFlapClass: 'border-orange-500/70 bg-[#261a39]',
    envelopeSealClass: 'bg-[#140d1f] border border-orange-500/80 shadow-lg',
    envelopeSealTitleClass: 'text-orange-400',
    envelopeSealSubtitleClass: 'text-purple-300',
    envelopeAccentIcon: '🎃',
    envelopeTitle: 'HAUNTED STUDIO',
    envelopeSubtitle: 'ENTER IF YOU DARE',
    buttonClass: 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-110 text-slate-950 border-2 border-orange-200 shadow-2xl shadow-orange-500/50 rounded-full',
    buttonText: 'Tap if You Dare 🎃',
    ctaSubtext: 'Snap your costume before midnight strikes! 👻',
    ctaSubtextClass: 'text-purple-300/90',
    bottomRowClass: 'text-purple-300/80',
    bottomIconClass: 'text-orange-400',
    bottomFeatures: ['Spooky Receipt Print', 'Instant Costume QR', 'Monster Stickers'],
  },

  // 6. VALENTINE'S DAY — Sweetheart Romance & Love Letter
  {
    id: 'valentines',
    name: "Valentine's & Romance",
    shortLabel: "Valentine's",
    emoji: '💘',
    description: 'Rising sweetheart balloons & hearts, gliding love letters, and pulsing ruby heart button.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#fff0f3] via-[#ffe5ec] to-[#ffd6e0] text-rose-950',
    floatingSymbols: ['💘', '💌', '❤️', '🌹', '💕', '♡'],
    floatingOpacityClass: 'opacity-85 text-rose-500',
    animatedStickers: [
      { id: 'val-1', emoji: '❤️', animation: 'balloon_rise', positionClass: 'left-[10%] top-0', sizeClass: 'text-3xl', delayMs: 0, durationMs: 6500 },
      { id: 'val-2', emoji: '💕', animation: 'balloon_rise', positionClass: 'left-[24%] top-0', sizeClass: 'text-2xl', delayMs: 2200, durationMs: 7000 },
      { id: 'val-3', emoji: '💖', animation: 'balloon_rise', positionClass: 'right-[12%] top-0', sizeClass: 'text-3xl', delayMs: 1200, durationMs: 6800 },
      { id: 'val-4', emoji: '💘', animation: 'heartbeat', positionClass: 'top-20 left-14', sizeClass: 'text-4xl', delayMs: 0 },
      { id: 'val-5', emoji: '💌', animation: 'wing_glide', positionClass: 'top-20 right-16', sizeClass: 'text-3xl', delayMs: 400 },
      { id: 'val-6', emoji: '🌹', animation: 'clown_wiggle', positionClass: 'bottom-28 left-16', sizeClass: 'text-3xl', delayMs: 700 },
      { id: 'val-7', emoji: '💘', animation: 'heartbeat', positionClass: 'bottom-24 right-16', sizeClass: 'text-3xl', delayMs: 900 },
    ],
    brandCardClass: 'bg-white/95 border-rose-200 text-rose-950',
    brandIconBgClass: 'bg-gradient-to-tr from-rose-600 to-pink-400 text-white border-rose-200 shadow-rose-400/40',
    brandSubtitleText: 'Sweetheart Edition',
    heroTitle: 'XOXO • Be Mine',
    heroTitleClass: 'text-rose-700 font-serif italic',
    heroSubtitle: "JCVcreatives Valentine's Photobooth",
    heroSubtitleClass: 'text-rose-500 font-medium',
    stripCardClass: 'bg-[#fffafb] border-2 border-rose-400 rounded-xl shadow-lg ring-2 ring-rose-100',
    polaroidCardClass: 'bg-white border-2 border-rose-500 rounded-2xl shadow-xl ring-2 ring-pink-200',
    photoSlotClass: 'bg-rose-50 border border-rose-200 rounded-lg',
    stripHeaderClass: 'text-rose-600 border-b border-rose-200 font-serif italic font-bold',
    stripFooterClass: 'text-rose-400 border-t border-dashed border-rose-300 font-mono',
    leftStripHeader: '💌 LOVE NOTE',
    leftStripFooter: '♥ XOXO ♥',
    leftCornerSticker: '💌',
    leftCornerAnimClass: 'sticker-wing-glide',
    centerPolaroidHeader: 'SWEETHEARTS',
    centerPolaroidCaption: 'be mine xoxo ❤️',
    centerPolaroidCaptionClass: 'font-serif italic text-rose-600 font-semibold',
    centerCornerBadge: '💘',
    centerCornerAnimClass: 'sticker-heartbeat',
    rightStripHeader: "CUPID'S MAIL",
    rightStripFooter: '♥ FEB 14 ♥',
    rightCornerSticker: '🌹',
    rightCornerAnimClass: 'sticker-twinkle-shine',
    envelopePocketClass: 'bg-gradient-to-b from-[#fff5f7] via-[#ffe0e9] to-[#ffccd8] border-t-2 border-rose-400 rounded-b-2xl shadow-lg',
    envelopeFlapClass: 'border-rose-400 bg-[#fff5f7]',
    envelopeSealClass: 'bg-rose-600 border-2 border-rose-200 shadow-md',
    envelopeSealTitleClass: 'text-white',
    envelopeSealSubtitleClass: 'text-rose-100',
    envelopeAccentIcon: '💘',
    envelopeTitle: 'SEALED WITH A KISS',
    envelopeSubtitle: 'JCV LOVE LETTER BOOTH',
    buttonClass: 'bg-gradient-to-r from-rose-600 via-red-500 to-pink-600 hover:brightness-105 text-white border-2 border-rose-200 shadow-xl shadow-rose-500/45 rounded-full',
    buttonText: 'Tap to Snap Love 💘',
    ctaSubtext: 'Capture a sweet keepsake with someone special ❤️',
    ctaSubtextClass: 'text-rose-700/80 font-serif italic',
    bottomRowClass: 'text-rose-800/80',
    bottomIconClass: 'text-rose-600',
    bottomFeatures: ['Love Letter Print', 'Sweetheart QR Save', 'Heart Stamps & Frames'],
  },

  // 7. CHRISTMAS & WINTER HOLIDAY — Festive Holly & Falling Snowflakes
  {
    id: 'christmas',
    name: 'Christmas & Winter Holiday',
    shortLabel: 'Christmas',
    emoji: '🎄',
    description: 'Falling spinning snowflakes, twinkling Christmas trees, dancing snowman, and festive crimson button.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#f4faf6] via-[#eaf4ee] to-[#fdf2f2] text-emerald-950',
    floatingSymbols: ['🎄', '❄️', '⛄', '🎁', '🦌', '⭐'],
    floatingOpacityClass: 'opacity-85 text-emerald-700',
    animatedStickers: [
      { id: 'xmas-snow-1', emoji: '❄️', animation: 'snow_fall', positionClass: 'left-[10%] top-0', sizeClass: 'text-2xl sm:text-3xl', delayMs: 0, durationMs: 7500 },
      { id: 'xmas-snow-2', emoji: '❄️', animation: 'snow_fall', positionClass: 'left-[26%] top-0', sizeClass: 'text-xl sm:text-2xl', delayMs: 2500, durationMs: 8200 },
      { id: 'xmas-snow-3', emoji: '❄️', animation: 'snow_fall', positionClass: 'right-[24%] top-0', sizeClass: 'text-2xl sm:text-3xl', delayMs: 1200, durationMs: 7800 },
      { id: 'xmas-snow-4', emoji: '❄️', animation: 'snow_fall', positionClass: 'right-[10%] top-0', sizeClass: 'text-xl sm:text-2xl', delayMs: 3800, durationMs: 7200 },
      { id: 'xmas-tree', emoji: '🎄', animation: 'twinkle_shine', positionClass: 'bottom-24 left-12', sizeClass: 'text-4xl', delayMs: 0 },
      { id: 'xmas-snowman', emoji: '⛄', animation: 'clown_wiggle', positionClass: 'bottom-24 right-12', sizeClass: 'text-4xl', delayMs: 400 },
      { id: 'xmas-gift', emoji: '🎁', animation: 'cake_with_candle', positionClass: 'top-20 right-14', sizeClass: 'text-3xl', delayMs: 700 },
    ],
    brandCardClass: 'bg-white border-emerald-200 text-emerald-950',
    brandIconBgClass: 'bg-gradient-to-tr from-red-600 to-emerald-600 text-white border-amber-300 shadow-red-400/30',
    brandSubtitleText: 'Holiday Wonderland',
    heroTitle: 'Merry & Bright',
    heroTitleClass: 'text-red-700 font-serif italic',
    heroSubtitle: 'JCVcreatives Holiday Photobooth',
    heroSubtitleClass: 'text-emerald-800 font-semibold',
    stripCardClass: 'bg-white border-2 border-red-600/80 rounded-lg shadow-lg ring-1 ring-emerald-500/40',
    polaroidCardClass: 'bg-[#fffdf9] border-2 border-emerald-700 rounded-xl shadow-xl ring-2 ring-red-500/40',
    photoSlotClass: 'bg-emerald-50/50 border border-emerald-200 rounded',
    stripHeaderClass: 'text-red-700 border-b border-emerald-200 font-serif font-bold',
    stripFooterClass: 'text-emerald-700 border-t border-dashed border-red-400 font-mono',
    leftStripHeader: '🎄 NORTH POLE',
    leftStripFooter: '❄ DEC 25 ❄',
    leftCornerSticker: '⛄',
    leftCornerAnimClass: 'sticker-clown-wiggle',
    centerPolaroidHeader: 'HOLIDAY CHEER',
    centerPolaroidCaption: 'merry & bright ❄️',
    centerPolaroidCaptionClass: 'font-serif italic text-emerald-800 font-semibold',
    centerCornerBadge: '🎄',
    centerCornerAnimClass: 'sticker-twinkle-shine',
    rightStripHeader: "SANTA'S LIST",
    rightStripFooter: '★ NICE LIST ★',
    rightCornerSticker: '❄️',
    rightCornerAnimClass: 'sticker-disco-spin',
    envelopePocketClass: 'bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 border-t-2 border-amber-400 rounded-b-2xl shadow-xl',
    envelopeFlapClass: 'border-amber-400 bg-emerald-800',
    envelopeSealClass: 'bg-red-700 border-2 border-amber-300 shadow-md',
    envelopeSealTitleClass: 'text-white',
    envelopeSealSubtitleClass: 'text-amber-200',
    envelopeAccentIcon: '❄️',
    envelopeTitle: "SEASON'S GREETINGS",
    envelopeSubtitle: 'NORTH POLE EXPRESS',
    buttonClass: 'bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:brightness-105 text-white border-2 border-amber-300 shadow-xl shadow-red-600/40 rounded-full',
    buttonText: 'Tap for Holiday Cheer 🎄',
    ctaSubtext: 'Warm wishes & instant holiday keepsake prints ❄️',
    ctaSubtextClass: 'text-emerald-800 font-medium',
    bottomRowClass: 'text-emerald-900/80',
    bottomIconClass: 'text-red-600',
    bottomFeatures: ['Festive Thermal Print', 'Holiday QR Card', 'Santa & Snowman Props'],
  },

  // 8. GRADUATION & PROM GALA — Black & Metallic Gold Foil
  {
    id: 'graduation',
    name: 'Graduation & Prom Gala',
    shortLabel: 'Graduation',
    emoji: '🥂',
    description: 'Luxury black & gold foil VIP evening theme, rising celebration toasts, and golden starbursts.',
    isDark: true,
    screenBgClass: 'bg-gradient-to-b from-[#141417] via-[#1f1f24] to-[#09090b] text-amber-50',
    floatingSymbols: ['🎓', '🥂', '✨', '🌟', '📜', '👑'],
    floatingOpacityClass: 'opacity-80 text-amber-400',
    animatedStickers: [
      { id: 'grad-1', emoji: '🎓', animation: 'balloon_rise', positionClass: 'left-[12%] top-0', sizeClass: 'text-3xl', delayMs: 0, durationMs: 7000 },
      { id: 'grad-2', emoji: '🥂', animation: 'clown_wiggle', positionClass: 'top-20 right-14', sizeClass: 'text-3xl sm:text-4xl', delayMs: 300 },
      { id: 'grad-3', emoji: '👑', animation: 'twinkle_shine', positionClass: 'top-18 left-14', sizeClass: 'text-3xl', delayMs: 600 },
      { id: 'grad-4', emoji: '🌟', animation: 'disco_ball_shine', positionClass: 'bottom-28 left-14', sizeClass: 'text-3xl', delayMs: 200 },
      { id: 'grad-5', emoji: '🎓', animation: 'balloon_rise', positionClass: 'right-[12%] top-0', sizeClass: 'text-3xl', delayMs: 3200, durationMs: 7200 },
      { id: 'grad-6', emoji: '✨', animation: 'twinkle_shine', positionClass: 'bottom-24 right-16', sizeClass: 'text-3xl', delayMs: 900 },
    ],
    brandCardClass: 'bg-zinc-900 border-amber-500/40 text-amber-50',
    brandIconBgClass: 'bg-gradient-to-tr from-amber-500 to-yellow-200 text-zinc-950 border-amber-200 shadow-amber-500/30',
    brandSubtitleText: 'VIP Gala Edition',
    heroTitle: 'Class of 2026',
    heroTitleClass: 'text-amber-300 font-serif italic',
    heroSubtitle: 'JCVcreatives Prom & Graduation Gala',
    heroSubtitleClass: 'text-zinc-400 tracking-widest uppercase text-xs font-mono',
    stripCardClass: 'bg-zinc-900 border-2 border-amber-400/80 rounded-md shadow-2xl',
    polaroidCardClass: 'bg-zinc-950 border-2 border-amber-300 rounded-lg shadow-2xl ring-1 ring-amber-500/40',
    photoSlotClass: 'bg-zinc-800 border border-amber-500/30 rounded-xs',
    stripHeaderClass: 'text-amber-300 border-b border-zinc-800 font-mono font-bold',
    stripFooterClass: 'text-amber-500/80 border-t border-dashed border-amber-500/40 font-mono',
    leftStripHeader: '🎓 GRAD GALA',
    leftStripFooter: '★ VIP ACCESS ★',
    leftCornerSticker: '🎓',
    leftCornerAnimClass: 'sticker-cake-bob',
    centerPolaroidHeader: 'PROM NIGHT',
    centerPolaroidCaption: 'we did it! 🥂',
    centerPolaroidCaptionClass: 'font-serif italic text-amber-300 font-semibold',
    centerCornerBadge: '🥂',
    centerCornerAnimClass: 'sticker-clown-wiggle',
    rightStripHeader: 'HONOR ROLL',
    rightStripFooter: "✦ CLASS '26 ✦",
    rightCornerSticker: '👑',
    rightCornerAnimClass: 'sticker-twinkle-shine',
    envelopePocketClass: 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-t-2 border-amber-400/80 rounded-b-2xl shadow-2xl',
    envelopeFlapClass: 'border-amber-400/80 bg-zinc-900',
    envelopeSealClass: 'bg-gradient-to-r from-amber-400 to-yellow-300 border border-white shadow-lg',
    envelopeSealTitleClass: 'text-zinc-950 font-black',
    envelopeSealSubtitleClass: 'text-zinc-800 font-bold',
    envelopeAccentIcon: '✦',
    envelopeTitle: 'VIP GALA EDITION',
    envelopeSubtitle: 'JCV PRESTIGE STUDIO',
    buttonClass: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-105 text-zinc-950 border-2 border-amber-100 shadow-2xl shadow-amber-400/40 rounded-full',
    buttonText: 'Tap to Celebrate 🥂',
    ctaSubtext: 'Step onto the red carpet & capture your milestone ✨',
    ctaSubtextClass: 'text-amber-200/80',
    bottomRowClass: 'text-zinc-400',
    bottomIconClass: 'text-amber-400',
    bottomFeatures: ['Gold Edition Print', 'Instant Gala QR', 'Crown & Grad Props'],
  },

  // 9. BABY SHOWER & GENDER REVEAL — Soft Cloud & Pastel Starlight
  {
    id: 'baby_shower',
    name: 'Baby Shower & Welcome',
    shortLabel: 'Baby Shower',
    emoji: '🧸',
    description: 'Dreamy cloud blue & buttercream yellow palette, rocking teddy bear, and rising pastel balloons.',
    isDark: false,
    screenBgClass: 'bg-gradient-to-b from-[#f0f9ff] via-[#fefce8] to-[#fdf2f8] text-slate-800',
    floatingSymbols: ['🧸', '🍼', '☁️', '🌙', '⭐', '🎈'],
    floatingOpacityClass: 'opacity-85 text-sky-400',
    animatedStickers: [
      { id: 'baby-1', emoji: '🧸', animation: 'clown_wiggle', positionClass: 'top-20 left-12', sizeClass: 'text-4xl', delayMs: 0 },
      { id: 'baby-2', emoji: '☁️', animation: 'wing_glide', positionClass: 'top-16 right-16', sizeClass: 'text-4xl', delayMs: 400 },
      { id: 'baby-3', emoji: '🎈', animation: 'balloon_rise', positionClass: 'left-[14%] top-0', sizeClass: 'text-3xl', delayMs: 0, durationMs: 7200 },
      { id: 'baby-4', emoji: '🎈', animation: 'balloon_rise', positionClass: 'right-[14%] top-0', sizeClass: 'text-3xl', delayMs: 3400, durationMs: 7400 },
      { id: 'baby-5', emoji: '🍼', animation: 'clown_wiggle', positionClass: 'bottom-28 left-16', sizeClass: 'text-3xl', delayMs: 600 },
      { id: 'baby-6', emoji: '🌙', animation: 'twinkle_shine', positionClass: 'bottom-24 right-16', sizeClass: 'text-3xl', delayMs: 900 },
    ],
    brandCardClass: 'bg-white border-sky-200 text-slate-800',
    brandIconBgClass: 'bg-gradient-to-tr from-sky-300 to-amber-200 text-slate-800 border-white shadow-sky-200',
    brandSubtitleText: 'Baby Shower Edition',
    heroTitle: 'Oh Baby!',
    heroTitleClass: 'text-sky-700 font-serif italic',
    heroSubtitle: 'JCVcreatives Sweet Arrival Photobooth',
    heroSubtitleClass: 'text-slate-500 font-medium',
    stripCardClass: 'bg-white border-2 border-sky-200 rounded-2xl shadow-md',
    polaroidCardClass: 'bg-white border-2 border-amber-200 rounded-2xl shadow-lg ring-2 ring-sky-100',
    photoSlotClass: 'bg-sky-50/70 border border-sky-100 rounded-xl',
    stripHeaderClass: 'text-sky-600 border-b border-sky-100 font-serif font-bold',
    stripFooterClass: 'text-amber-500 border-t border-dashed border-sky-200 font-mono',
    leftStripHeader: '☁️ OH BABY',
    leftStripFooter: '♡ SWEETPEA ♡',
    leftCornerSticker: '☁️',
    leftCornerAnimClass: 'sticker-wing-glide',
    centerPolaroidHeader: 'LITTLE ONE',
    centerPolaroidCaption: 'bundle of joy 🧸',
    centerPolaroidCaptionClass: 'font-serif italic text-sky-700',
    centerCornerBadge: '🧸',
    centerCornerAnimClass: 'sticker-clown-wiggle',
    rightStripHeader: 'BABY SHOWER',
    rightStripFooter: '★ WELCOME ★',
    rightCornerSticker: '🍼',
    rightCornerAnimClass: 'sticker-cake-bob',
    envelopePocketClass: 'bg-gradient-to-b from-white via-sky-50 to-amber-50/60 border-t-2 border-sky-200 rounded-b-3xl shadow-md',
    envelopeFlapClass: 'border-sky-200 bg-white',
    envelopeSealClass: 'bg-white border border-sky-200 shadow-xs',
    envelopeSealTitleClass: 'text-sky-700',
    envelopeSealSubtitleClass: 'text-amber-600',
    envelopeAccentIcon: '☁️',
    envelopeTitle: 'WELCOME LITTLE ONE',
    envelopeSubtitle: 'BABY SHOWER KEEPSAKE',
    buttonClass: 'bg-gradient-to-r from-sky-300 via-sky-200 to-pink-200 hover:brightness-105 text-slate-900 border-2 border-white shadow-xl shadow-sky-300/40 rounded-full',
    buttonText: 'Tap to Snap for Baby 🧸',
    ctaSubtext: 'Leave a sweet photo memory for the parents-to-be ☁️',
    ctaSubtextClass: 'text-slate-500',
    bottomRowClass: 'text-slate-500',
    bottomIconClass: 'text-sky-500',
    bottomFeatures: ['Keepsake Print', 'Instant Phone QR', 'Cute Nursery Stickers'],
  },

  // 10. RETRO DISCO / Y2K CYBER PARTY — Spinning & Shining Disco Ball!
  {
    id: 'retro_disco',
    name: 'Retro Disco & Y2K Party',
    shortLabel: 'Retro Disco',
    emoji: '🪩',
    description: 'Spinning & shining mirror disco balls with glowing light rays, grooving dancers, and neon synthwave strips!',
    isDark: true,
    screenBgClass: 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white',
    floatingSymbols: ['🪩', '⚡', '💿', '✨', '🕺', '🎶'],
    floatingOpacityClass: 'opacity-95 text-cyan-300',
    animatedStickers: [
      // Spinning & Shining Mirror Disco Balls with Light Beams
      { id: 'disco-ball-main', emoji: '🪩', animation: 'disco_ball_shine', positionClass: 'top-14 right-10 sm:right-20', sizeClass: 'text-4xl sm:text-5xl', delayMs: 0 },
      { id: 'disco-ball-left', emoji: '🪩', animation: 'disco_ball_shine', positionClass: 'top-16 left-10 sm:left-20', sizeClass: 'text-4xl sm:text-5xl', delayMs: 600 },
      // Grooving dancer & spinning vinyl
      { id: 'disco-dancer', emoji: '🕺', animation: 'clown_wiggle', positionClass: 'bottom-26 left-12 sm:left-20', sizeClass: 'text-4xl', delayMs: 200 },
      { id: 'disco-vinyl', emoji: '💿', animation: 'disco_ball_shine', positionClass: 'bottom-26 right-12 sm:right-20', sizeClass: 'text-3xl sm:text-4xl', delayMs: 400 },
      // Rising musical notes & sparkles
      { id: 'disco-note-1', emoji: '🎶', animation: 'balloon_rise', positionClass: 'left-[10%] top-0', sizeClass: 'text-2xl sm:text-3xl', delayMs: 0, durationMs: 6500 },
      { id: 'disco-note-2', emoji: '⚡', animation: 'twinkle_shine', positionClass: 'top-1/2 right-10', sizeClass: 'text-3xl', delayMs: 500 },
    ],
    brandCardClass: 'bg-slate-900/90 border-fuchsia-500/50 text-white',
    brandIconBgClass: 'bg-gradient-to-tr from-fuchsia-500 to-cyan-400 text-slate-950 border-cyan-200 shadow-fuchsia-500/40',
    brandSubtitleText: 'Disco Fever Booth',
    heroTitle: "Let's Groove",
    heroTitleClass: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 font-black italic',
    heroSubtitle: 'JCVcreatives Retro Disco Photobooth',
    heroSubtitleClass: 'text-cyan-300 font-mono uppercase tracking-widest text-xs',
    stripCardClass: 'bg-[#1a1638] border-2 border-cyan-400 rounded-lg shadow-2xl',
    polaroidCardClass: 'bg-[#221c46] border-2 border-fuchsia-400 rounded-xl shadow-2xl ring-2 ring-cyan-400/50',
    photoSlotClass: 'bg-slate-950 border border-fuchsia-500/40 rounded',
    stripHeaderClass: 'text-cyan-300 border-b border-fuchsia-500/40 font-mono font-bold',
    stripFooterClass: 'text-fuchsia-400 border-t border-dashed border-cyan-400/50 font-mono',
    leftStripHeader: '🪩 DISCO VIP',
    leftStripFooter: '⚡ Y2K VIBE ⚡',
    leftCornerSticker: '💿',
    leftCornerAnimClass: 'sticker-disco-spin',
    centerPolaroidHeader: 'BOOGIE NIGHTS',
    centerPolaroidCaption: 'stay groovy 🪩',
    centerPolaroidCaptionClass: 'font-mono font-bold text-fuchsia-300',
    centerCornerBadge: '🪩',
    centerCornerAnimClass: 'sticker-disco-spin',
    rightStripHeader: 'BACKSTAGE',
    rightStripFooter: '★ 100% LIVE ★',
    rightCornerSticker: '🕺',
    rightCornerAnimClass: 'sticker-clown-wiggle',
    envelopePocketClass: 'bg-gradient-to-b from-[#251e4d] via-[#1a1438] to-[#110d26] border-t-2 border-fuchsia-400 rounded-b-2xl shadow-2xl',
    envelopeFlapClass: 'border-fuchsia-400 bg-[#251e4d]',
    envelopeSealClass: 'bg-slate-950 border border-cyan-400 shadow-lg',
    envelopeSealTitleClass: 'text-cyan-300',
    envelopeSealSubtitleClass: 'text-fuchsia-400',
    envelopeAccentIcon: '⚡',
    envelopeTitle: 'DISCO FEVER',
    envelopeSubtitle: 'JCV AFTERPARTY BOOTH',
    buttonClass: 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 hover:brightness-110 text-slate-950 font-black border-2 border-white shadow-2xl shadow-fuchsia-500/50 rounded-full',
    buttonText: 'Tap to Groove 🪩',
    ctaSubtext: 'Hit the dancefloor & snap your retro photostrip! ⚡',
    ctaSubtextClass: 'text-cyan-200/80',
    bottomRowClass: 'text-cyan-200/80',
    bottomIconClass: 'text-fuchsia-400',
    bottomFeatures: ['Retro Receipt Print', 'Instant Neon QR', 'Y2K Cyber Filters'],
  },
];

const ACTIVE_THEME_STORAGE_KEY = 'jcv_attract_occasion_theme_v2';

export const getActiveAttractThemeId = (): AttractOccasionId => {
  const saved = safeStorageGet(ACTIVE_THEME_STORAGE_KEY) as AttractOccasionId | null;
  if (saved && ATTRACT_OCCASION_THEMES.some((t) => t.id === saved)) {
    return saved;
  }
  return 'gobble_haus';
};

export const setActiveAttractThemeId = (themeId: AttractOccasionId): void => {
  safeStorageSet(ACTIVE_THEME_STORAGE_KEY, themeId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jcv_attract_theme_updated', { detail: themeId }));
  }
};

export const getAttractThemeById = (themeId?: AttractOccasionId): AttractOccasionTheme => {
  return (
    ATTRACT_OCCASION_THEMES.find((t) => t.id === themeId) || ATTRACT_OCCASION_THEMES[0]
  );
};

