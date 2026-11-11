/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScreenState = 
  | 'attract'      // Welcome screen with "Tap to start"
  | 'payment'      // QR payment or voucher code gate
  | 'frame_select' // Choose frame layout, theme, and filter
  | 'countdown'    // Countdown 3, 2, 1
  | 'capture'      // Live photo capture loop
  | 'editor'       // Doodles, stickers, and final review
  | 'print_share'  // Print on thermal printer & QR cloud share
  | 'admin';       // Management dashboard, telemetry, remote config

export type FrameLayoutType = 'strip_3' | 'strip_4' | 'grid_4' | 'single_polaroid';

export type ThemeCategory =
  | 'minimal'
  | 'wedding'
  | 'floral'
  | 'holiday'
  | 'passport'
  | 'party'
  | 'retro'
  | 'gobble'
  | 'custom';

export interface FrameTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  background: string;
  borderStyle: string;
  textColor: string;
  accentColor: string;
  headerText: string;
  footerText: string;
  dateVisible: boolean;
  decorativeSvg?: string;
  cornerIcon?: string;
  previewGradient?: string;
}

export type PhotoFilterType = 
  | 'none'
  | 'vintage'
  | 'noir'
  | 'warm'
  | 'glamour'
  | 'cyber'
  | 'duotone';

export type DigitalPropType =
  | 'none'
  | 'party_hat'
  | 'retro_sunglasses'
  | 'birthday_crown'
  | 'classic_mustache'
  | 'cat_ears'
  | 'star_glasses'
  | 'flower_crown'
  | 'bunny_ears';

export interface DigitalPropItem {
  id: DigitalPropType;
  name: string;
  emoji: string;
  category: 'head' | 'eyes' | 'mouth';
  defaultScale: number;
  offsetY: number; // percentage offset from face center
  description: string;
}

export interface PhotoCapture {
  id: string;
  dataUrl: string;
  timestamp: number;
}

export interface StickerItem {
  id: string;
  emoji: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number;
  rotation: number;
  isText?: boolean;
  text?: string;
  textColor?: string;
  textStyle?: 'white_pill' | 'black_pill' | 'outline' | 'plain';
}

export interface DrawingPath {
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
}

export interface PhotostripResult {
  id: string;
  createdAt: number;
  photos: string[]; // dataUrls
  compositeDataUrl: string; // finalized full strip
  thermalRasterDataUrl?: string; // 1-bit dithered monochrome preview
  layout: FrameLayoutType;
  themeId: string;
  filter: PhotoFilterType;
  eventTitle: string;
  shareCode: string;
  shareUrl: string;
  printCopies?: number;
  thermalBrightness?: number;
  stickers?: StickerItem[];
}

export interface Voucher {
  code: string;
  discountPercent: number; // 100 for 100% free pass
  maxUses: number;
  usedCount: number;
  description: string;
  expiresAt: number;
  active: boolean;
  createdAt?: number;
  lastUsedAt?: number;
  batchName?: string;
  isCashierTicket?: boolean;
  layoutType?: FrameLayoutType; // 1-Shot ('single_polaroid'), 2-Shot ('grid_4'), 3-Shot ('strip_3'), 4-Shot ('strip_4')
}

export interface PaymentTransaction {
  id: string;
  method: 'qr_mock' | 'qr_pix' | 'qr_cashapp' | 'voucher' | 'free_staff_pass';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  voucherCode?: string;
  layoutType?: FrameLayoutType;
  kioskId: string;
}

export type PrinterConnectionType =
  | 'usb'
  | 'serial'
  | 'bluetooth'
  | 'network'
  | 'system'
  | 'virtual';

export interface ThermalPrinterConfig {
  connectionType: PrinterConnectionType;
  printerModel?: 'xprinter_58iib' | 'vozy_g80' | 'kprinter_461a' | 'epson_80mm' | 'generic_58mm';
  deviceName?: string;
  paperWidthMm: 58 | 80;
  dotsPerLine: 384 | 576;
  contrast: number; // 0 to 100 (40 default)
  brightness?: number; // -30 to 100 (45 default for bright thermal portrait exposure)
  printDarkness?: number; // 5 to 100 (35 default — controls overall printer printout darkness)
  gamma?: number; // 0.40 to 1.60 (0.68 default — maps input brightness to physical print head energy levels)
  autoCut: boolean;
  buzzerReminder?: boolean; // Auditory & visual reminder beep on VOZY G80 / 80mm POS printers
  printCopies: number;
  feedLines: number;
  density: 'light' | 'normal' | 'dark';
  networkIp?: string;
  networkPort?: number;
  serialBaudRate?: number;
  systemPrintColor?: boolean;
  escPosCommandMode?: 'gs_v_0' | 'gs_v_0_banded' | 'esc_star_33';
}

export interface EmailQueueItem {
  id: string;
  recipientEmail: string;
  photostripId: string;
  photostripUrl: string;
  eventTitle: string;
  queuedAt: number;
  status: 'queued' | 'sent' | 'failed';
  retries: number;
}

export interface KioskTelemetry {
  totalSessions: number;
  totalPrints: number;
  paperRemainingPercent: number; // 100 down to 0
  totalRevenue: number;
  currency: string;
  activeSince: number;
  lastPrintTimestamp?: number;
  popularFrames: Record<string, number>;
  popularFilters: Record<string, number>;
  deviceBatteryLevel?: number;
  isOnline: boolean;
  queuedEmailsCount: number;
  averageSessionDurationSec: number;
}

export type FrontScreenMediaType = 'none' | 'gif' | 'video' | 'canva_embed';
export type FrontScreenMediaPlacement = 'center_hero' | 'background';

export interface FrontScreenMediaConfig {
  enabled: boolean;
  mediaType: FrontScreenMediaType;
  url: string; // Video URL, GIF URL, Canva export URL, or base64 data URL
  canvaEmbedUrl?: string; // Optional Canva embed iframe src
  placement: FrontScreenMediaPlacement; // 'center_hero' or 'background'
  overlayOpacity: number; // 0 to 100 (for background video/gif dimming)
  loop: boolean;
  muted: boolean;
  badgeText?: string;
  headline?: string;
  subheadline?: string;
}

export interface TabletEnduranceConfig {
  enabled: boolean;
  idleDimTimeoutSec: number; // Seconds on Attract screen before thermal cooling dim (default 180s = 3m)
  idleDimOpacity: number; // 20 to 75% dimming veil to cool display while charging (default 45%)
  bluetoothKeepAlive: boolean; // Auto-reconnect & keep-alive GATT watchdog for 12h shift
  cameraIdleEcoMode: boolean; // Throttle camera sensor power on idle Attract screen without losing permission
  abandonedSessionResetSec: number; // Auto-return to Attract if guest walks away mid-session (default 180s)
  powerSaverOnBattery?: boolean; // Automatically reduce brightness & disable non-essential animations when on battery (regardless of 35% threshold)
  powerSaverBrightnessReductionPercent?: number; // Brightness reduction % when running on battery (default 30%)
}

export interface RemoteKioskConfig {
  kioskId: string;
  locationName: string;
  eventTitle: string;
  eventSubtitle: string;
  eventDate: string;
  eventHashtag: string;
  pricePerSession: number;
  layoutPrices?: Record<FrameLayoutType, number>;
  currencySymbol: string;
  freePlayMode: boolean;
  passcodeAdminPin: string;
  showAdminInMenu?: boolean;
  autoFullscreenLock?: boolean;
  allowedLayouts: FrameLayoutType[];
  thermalPrinter: ThermalPrinterConfig;
  tabletEndurance?: TabletEnduranceConfig;
  customWatermarkUrl?: string;
  frontScreenMedia?: FrontScreenMediaConfig;
  remoteSyncUrl?: string;
  autoUpdateEnabled: boolean;
  version: string;
  lastSyncTimestamp: number;
}
