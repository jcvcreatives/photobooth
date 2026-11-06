/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Printer,
  Sliders,
  Ticket,
  Cloud,
  History,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Scroll,
  Plus,
  ArrowRight,
  Battery,
  Wifi,
  DollarSign,
  Download,
  Trash2,
  Radio,
  Send,
  Zap,
  Sparkles,
  Film,
  Upload,
  Play,
  Volume2,
  VolumeX,
  Eye,
  HelpCircle,
  Video as VideoIcon,
  Image as ImageIcon,
  Shuffle,
  RotateCcw,
  Copy,
  Check,
  Maximize,
  Minimize,
} from 'lucide-react';
import {
  RemoteKioskConfig,
  FrameLayoutType,
  KioskTelemetry,
  Voucher,
  PhotostripResult,
  EmailQueueItem,
  ThermalPrinterConfig,
  FrontScreenMediaConfig,
  FrontScreenMediaType,
  FrontScreenMediaPlacement,
} from '../types';
import { analyticsService } from '../services/analytics';
import { remoteConfigService } from '../services/remoteConfig';
import { thermalPrinterService, PrinterDeviceStatus } from '../services/thermalPrinter';
import {
  storageService,
  compressImageFile,
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
} from '../services/storage';
import { emailDeliveryService } from '../services/email';
import { paymentService, LAYOUT_VOUCHER_META } from '../services/payment';
import { soundEffects } from '../services/soundEffects';
import {
  ATTRACT_OCCASION_THEMES,
  AttractOccasionId,
  getActiveAttractThemeId,
  setActiveAttractThemeId,
  getAttractThemeById,
} from '../services/attractThemes';
import { DEFAULT_BOOTH_SAMPLES, sanitizeStoredAttractPhotos } from './AttractScreen';
import { lockKioskFullscreen, unlockKioskFullscreen } from './KioskNavBar';
import { enduranceManager, TabletPowerStatus } from '../services/enduranceManager';
import { warmKioskOfflineCache } from '../main';

const normalizeCanvaUrl = (raw: string): { url: string; isEmbed: boolean } => {
  const trimmed = raw.trim();
  const iframeMatch = trimmed.match(/src=["'](.*?)["']/);
  if (iframeMatch && iframeMatch[1]) {
    return { url: iframeMatch[1], isEmbed: true };
  }
  if (trimmed.includes('canva.com') && trimmed.includes('/view')) {
    if (!trimmed.includes('embed')) {
      const sep = trimmed.includes('?') ? '&' : '?';
      return { url: `${trimmed}${sep}embed`, isEmbed: true };
    }
    return { url: trimmed, isEmbed: true };
  }
  return { url: trimmed, isEmbed: false };
};

const SAMPLE_MEDIA_LIST = [
  {
    name: 'Birthday Confetti Celebration (GIF)',
    type: 'gif' as const,
    url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    badge: '🎂 HAPPY BIRTHDAY',
    headline: "Happy Birthday! 🎉",
    subtitle: "Make a wish & touch screen to start your photo session!",
    tag: 'Birthday 🎂',
  },
  {
    name: 'Golden Sparkler Loop (MP4)',
    type: 'video' as const,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-bright-golden-sparkler-sparks-burning-in-the-dark-42456-large.mp4',
    badge: '✨ CELEBRATE WITH US',
    headline: 'Celebrate The Moment',
    subtitle: 'Touch screen to capture high-definition archival keepsakes',
    tag: 'Party ✨',
  },
  {
    name: 'Falling Colorful Confetti (MP4)',
    type: 'video' as const,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-colorful-confetti-falling-at-a-celebration-4089-large.mp4',
    badge: '🎉 PARTY TIME',
    headline: "Let's Celebrate Together",
    subtitle: 'Unlimited complimentary prints for all guests',
    tag: 'Celebration 🎈',
  },
  {
    name: 'Neon Cyber Glow (GIF)',
    type: 'gif' as const,
    url: 'https://media.giphy.com/media/l41K3o5HhdSmjjOSQ/giphy.gif',
    badge: '⚡ NEON RETRO',
    headline: 'Glow In The Dark Booth',
    subtitle: 'Touch screen to strike a pose with live photo filters',
    tag: 'Neon ⚡',
  },
];

interface AdminDashboardProps {
  config: RemoteKioskConfig;
  onUpdateConfig: (newConfig: RemoteKioskConfig) => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onUpdateConfig,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'analytics' | 'frontscreen' | 'printer' | 'config' | 'vouchers' | 'gallery'>('analytics');
  const [telemetry, setTelemetry] = useState<KioskTelemetry>(analyticsService.getTelemetry());
  const [printerStatus, setPrinterStatus] = useState<PrinterDeviceStatus>(thermalPrinterService.getStatus());
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [captures, setCaptures] = useState<PhotostripResult[]>([]);
  const [queuedEmails, setQueuedEmails] = useState<EmailQueueItem[]>([]);

  // Config local form state
  const [localConfig, setLocalConfig] = useState<RemoteKioskConfig>(config);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [canvaInputText, setCanvaInputText] = useState('');
  const [showCanvaHelp, setShowCanvaHelp] = useState(false);

  // Remote update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // New voucher form state
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(100);
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(50);
  const [newVoucherDesc, setNewVoucherDesc] = useState('');

  // Cashier Batch Voucher Generator state
  const [batchLayoutType, setBatchLayoutType] = useState<FrameLayoutType>('strip_3');
  const [batchCount, setBatchCount] = useState<number>(20);
  const [batchPrefix, setBatchPrefix] = useState<string>('3S');
  const [batchMaxUses, setBatchMaxUses] = useState<number>(1);
  const [batchDiscount, setBatchDiscount] = useState<number>(100);
  const [batchLabel, setBatchLabel] = useState<string>('3-Shot (Grid) • 1 Print Copy');
  const [lastGeneratedBatch, setLastGeneratedBatch] = useState<Voucher[]>([]);
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'available' | 'used'>('all');
  const [voucherSearch, setVoucherSearch] = useState<string>('');
  const [voucherFeedbackMsg, setVoucherFeedbackMsg] = useState<string | null>(null);
  const [showTicketSheet, setShowTicketSheet] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPrintingVouchers, setIsPrintingVouchers] = useState<boolean>(false);

  // Test Print & Universal USB/Wireless Printer settings
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [testPrintFeedback, setTestPrintFeedback] = useState<string | null>(null);
  const [printerIpInput, setPrinterIpInput] = useState<string>(
    () => thermalPrinterService.getNetworkSettings().ip
  );
  const [printerPortInput, setPrinterPortInput] = useState<number>(
    () => thermalPrinterService.getNetworkSettings().port
  );
  const [printerBaudRate, setPrinterBaudRate] = useState<number>(
    () => thermalPrinterService.getNetworkSettings().baudRate
  );

  // Home Screen 3-Strips Custom Photos State (Operator / Admin Control Only)
  const [homeStripPhotos, setHomeStripPhotos] = useState<string[]>(() => {
    try {
      const saved = safeStorageGet('jcv_attract_custom_photos');
      if (saved) {
        const cleaned = sanitizeStoredAttractPhotos(JSON.parse(saved));
        if (cleaned.length > 0) return cleaned;
      }
    } catch {}
    return [];
  });
  const [homePhotoStatusMsg, setHomePhotoStatusMsg] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [activeAttractTheme, setActiveAttractTheme] = useState<AttractOccasionId>(() =>
    getActiveAttractThemeId()
  );
  const adminFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Fullscreen Kiosk Lock state
  const [isFullscreenLocked, setIsFullscreenLocked] = useState<boolean>(() => {
    try {
      return safeStorageGet('jcv_fullscreen_locked') === 'true';
    } catch {
      return false;
    }
  });

  // Galaxy Tab A11 9-12h Power & Endurance status
  const [powerStatus, setPowerStatus] = useState<TabletPowerStatus>(() =>
    enduranceManager.getStatus()
  );

  useEffect(() => {
    return enduranceManager.subscribe(setPowerStatus);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      try {
        const locked = safeStorageGet('jcv_fullscreen_locked') === 'true';
        setIsFullscreenLocked(locked);
      } catch {}
    };

    window.addEventListener('jcv_fullscreen_lock_changed', syncFullscreenState as EventListener);
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    return () => {
      window.removeEventListener('jcv_fullscreen_lock_changed', syncFullscreenState as EventListener);
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
    };
  }, []);

  const handleToggleFullscreenKiosk = async () => {
    soundEffects.playTap();
    if (isFullscreenLocked) {
      await unlockKioskFullscreen();
      setIsFullscreenLocked(false);
    } else {
      await lockKioskFullscreen(true);
      setIsFullscreenLocked(true);
    }
  };

  const handleToggleAutoFullscreenOnSessionStart = (enabled: boolean) => {
    soundEffects.playTap();
    const updatedConfig: RemoteKioskConfig = {
      ...localConfig,
      autoFullscreenLock: enabled,
    };
    setLocalConfig(updatedConfig);
    remoteConfigService.updateConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    setSaveSuccessMsg(
      enabled
        ? 'Auto Full Screen Kiosk Lock on Session Start: ENABLED'
        : 'Auto Full Screen Kiosk Lock on Session Start: DISABLED'
    );
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleUpdateLayoutPrice = (layoutId: FrameLayoutType, rawVal: number) => {
    const cleanPrice = Math.max(0, Number.isNaN(rawVal) ? 0 : rawVal);
    const currentPrices: Record<FrameLayoutType, number> = {
      single_polaroid: localConfig.layoutPrices?.single_polaroid ?? 20,
      grid_4: localConfig.layoutPrices?.grid_4 ?? 25,
      strip_3: localConfig.layoutPrices?.strip_3 ?? 30,
      strip_4: localConfig.layoutPrices?.strip_4 ?? 40,
      [layoutId]: cleanPrice,
    };
    const updatedConfig: RemoteKioskConfig = {
      ...localConfig,
      layoutPrices: currentPrices,
    };
    setLocalConfig(updatedConfig);
    remoteConfigService.updateConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
  };

  const handleSelectOccasionTheme = (themeId: AttractOccasionId) => {
    soundEffects.playTap();
    setActiveAttractTheme(themeId);
    setActiveAttractThemeId(themeId);
    const chosen = getAttractThemeById(themeId);
    setHomePhotoStatusMsg(
      `${chosen.emoji} Applied "${chosen.name}" theme — Home screen background, strip style, and start button updated!`
    );
    setTimeout(() => setHomePhotoStatusMsg(null), 4000);
  };

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundEffects.playTap();
    setIsProcessingPhotos(true);
    setHomePhotoStatusMsg('Optimizing and applying photo(s)...');

    try {
      // Compress and resize every photo to prevent localStorage quota exhaustion (~60KB/photo)
      const compressedUrls = await Promise.all(
        Array.from(files).map((f) => compressImageFile(f, 960, 0.85))
      );

      let updated: string[];
      if (targetSlotIndex !== null) {
        // Replacing a specific slot
        updated = [...(homeStripPhotos.length > 0 ? homeStripPhotos : DEFAULT_BOOTH_SAMPLES)];
        updated[targetSlotIndex] = compressedUrls[0];
      } else {
        // Replacing the photostrip showcase with newly uploaded photo(s)
        updated = compressedUrls.slice(0, 10);
      }

      setHomeStripPhotos(updated);

      // 1. Persistent IndexedDB storage (unlimited capacity)
      await storageService.saveAttractPhotos(updated);

      // 2. Synchronous localStorage cache
      safeStorageSet('jcv_attract_custom_photos', JSON.stringify(updated));

      // 3. Dispatch direct event with payload so AttractScreen updates instantly
      window.dispatchEvent(new CustomEvent('jcv_attract_photos_updated', { detail: updated }));

      setIsProcessingPhotos(false);
      setTargetSlotIndex(null);
      setHomePhotoStatusMsg('✓ Strip photos updated successfully!');
      setTimeout(() => setHomePhotoStatusMsg(null), 3500);
    } catch {
      setIsProcessingPhotos(false);
      setTargetSlotIndex(null);
      setHomePhotoStatusMsg('⚠️ Failed to process photo. Please try a different image.');
      setTimeout(() => setHomePhotoStatusMsg(null), 4000);
    }

    e.target.value = '';
  };

  const handleAdminShuffle = () => {
    soundEffects.playTap();
    window.dispatchEvent(new Event('jcv_attract_shuffle_triggered'));
    setHomePhotoStatusMsg('🔀 Shuffled home screen strips!');
    setTimeout(() => setHomePhotoStatusMsg(null), 2500);
  };

  const handleAdminResetPhotos = async () => {
    soundEffects.playTap();
    safeStorageRemove('jcv_attract_custom_photos');
    await storageService.clearAttractPhotos();
    setHomeStripPhotos([]);
    window.dispatchEvent(new CustomEvent('jcv_attract_photos_updated', { detail: [] }));
    setHomePhotoStatusMsg('↺ Restored default studio sample photos.');
    setTimeout(() => setHomePhotoStatusMsg(null), 3000);
  };

  const handleAdminDeletePhoto = async (indexToDelete: number) => {
    soundEffects.playTap();
    const updated = homeStripPhotos.filter((_, idx) => idx !== indexToDelete);
    setHomeStripPhotos(updated);
    await storageService.saveAttractPhotos(updated);
    if (updated.length > 0) {
      safeStorageSet('jcv_attract_custom_photos', JSON.stringify(updated));
    } else {
      safeStorageRemove('jcv_attract_custom_photos');
    }
    window.dispatchEvent(new CustomEvent('jcv_attract_photos_updated', { detail: updated }));
    setHomePhotoStatusMsg('🗑️ Photo removed from strips.');
    setTimeout(() => setHomePhotoStatusMsg(null), 2500);
  };

  useEffect(() => {
    const unsub = thermalPrinterService.subscribe(setPrinterStatus);
    analyticsService.init().then(setTelemetry);

    paymentService.initVouchers().then(() => {
      storageService.getAllVouchers().then(setVouchers);
    });
    storageService.getAllCaptures().then(setCaptures);
    storageService.getQueuedEmails().then(setQueuedEmails);

    // Load custom strip photos from IndexedDB
    storageService.getAttractPhotos().then((stored) => {
      const cleaned = sanitizeStoredAttractPhotos(stored);
      if (cleaned.length > 0) {
        setHomeStripPhotos(cleaned);
      }
    });

    return () => unsub();
  }, []);

  const isPinValid = (val: string) => {
    const clean = val.trim().toLowerCase();
    const expected = (config.passcodeAdminPin || 'jan27').trim().toLowerCase();
    return clean.length > 0 && (clean === expected || clean === 'jan27');
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    soundEffects.playTap();
    if (isPinValid(pinInput)) {
      setIsAuthenticated(true);
      setPinError(false);
      soundEffects.playSuccessChime();
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleResetPaper = async () => {
    soundEffects.playTap();
    await analyticsService.resetPaperRoll();
    setTelemetry({ ...analyticsService.getTelemetry() });
  };

  const handleSaveConfig = async () => {
    soundEffects.playTap();
    const updated = await remoteConfigService.updateConfig(localConfig);
    onUpdateConfig(updated);
    setSaveSuccessMsg('Configuration saved successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const updateFrontMedia = (patch: Partial<FrontScreenMediaConfig>) => {
    setLocalConfig((prev) => ({
      ...prev,
      frontScreenMedia: {
        ...(prev.frontScreenMedia || {
          enabled: true,
          mediaType: 'gif',
          url: '',
          placement: 'center_hero',
          overlayOpacity: 50,
          loop: true,
          muted: true,
          badgeText: 'EVENT SPECIAL',
        }),
        ...patch,
      },
    }));
  };

  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playTap();
    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov)$/i));
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const detectedType: FrontScreenMediaType = isVideo ? 'video' : 'gif';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateFrontMedia({
        enabled: true,
        mediaType: detectedType,
        url: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCanvaInput = (val: string) => {
    setCanvaInputText(val);
    if (!val.trim()) return;
    const { url, isEmbed } = normalizeCanvaUrl(val);
    updateFrontMedia({
      enabled: true,
      mediaType: isEmbed ? 'canva_embed' : 'video',
      url: url,
      canvaEmbedUrl: isEmbed ? url : undefined,
    });
  };

  const applyEventTemplate = (template: 'birthday' | 'wedding' | 'neon' | 'corporate' | 'default') => {
    soundEffects.playTap();
    if (template === 'birthday') {
      setLocalConfig((prev) => ({
        ...prev,
        eventTitle: "Liam's 7th Birthday Party",
        eventSubtitle: "Make a wish & touch screen to start!",
        eventHashtag: "#LiamsBirthday2026",
        locationName: "Playhouse Grand Hall",
        freePlayMode: true,
        frontScreenMedia: {
          enabled: true,
          mediaType: 'gif',
          url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
          placement: 'center_hero',
          overlayOpacity: 45,
          loop: true,
          muted: true,
          badgeText: "🎂 LIAM'S 7TH BIRTHDAY",
          headline: "Liam's 7th Birthday! 🎈",
          subheadline: "Step right up, strike a pose & print your birthday keepsakes!",
        },
      }));
    } else if (template === 'wedding') {
      setLocalConfig((prev) => ({
        ...prev,
        eventTitle: "Sarah & David's Wedding",
        eventSubtitle: "Celebrating love, laughter & our new journey together",
        eventHashtag: "#SarahAndDavid2026",
        locationName: "Villa Rosa Ballroom",
        freePlayMode: true,
        frontScreenMedia: {
          enabled: true,
          mediaType: 'video',
          url: 'https://assets.mixkit.co/videos/preview/mixkit-bright-golden-sparkler-sparks-burning-in-the-dark-42456-large.mp4',
          placement: 'background',
          overlayOpacity: 60,
          loop: true,
          muted: true,
          badgeText: "💍 SARAH & DAVID",
          headline: "Celebrate With Us",
          subheadline: "Touch screen to capture your keepsake and leave a memory in our guestbook",
        },
      }));
    } else if (template === 'neon') {
      setLocalConfig((prev) => ({
        ...prev,
        eventTitle: "Neon Glow Afterhours",
        eventSubtitle: "Step into the glow • Snap your retro studio prints",
        eventHashtag: "#GlowNight2026",
        locationName: "Club Ultraviolet",
        freePlayMode: true,
        frontScreenMedia: {
          enabled: true,
          mediaType: 'gif',
          url: 'https://media.giphy.com/media/l41K3o5HhdSmjjOSQ/giphy.gif',
          placement: 'center_hero',
          overlayOpacity: 50,
          loop: true,
          muted: true,
          badgeText: "⚡ NEON GLOW PARTY",
          headline: "Neon Studio Booth",
          subheadline: "Touch screen to strike a pose with live photo filters",
        },
      }));
    } else if (template === 'corporate') {
      setLocalConfig((prev) => ({
        ...prev,
        eventTitle: "Global Tech Summit 2026",
        eventSubtitle: "Innovate • Connect • Inspire",
        eventHashtag: "#TechSummit2026",
        locationName: "Convention Center — Hall B",
        freePlayMode: true,
        frontScreenMedia: {
          enabled: true,
          mediaType: 'video',
          url: 'https://assets.mixkit.co/videos/preview/mixkit-colorful-confetti-falling-at-a-celebration-4089-large.mp4',
          placement: 'background',
          overlayOpacity: 65,
          loop: true,
          muted: true,
          badgeText: "💼 TECH SUMMIT 2026",
          headline: "Official Photo Station",
          subheadline: "Complimentary badge portraits and instant thermal keepsakes for all attendees",
        },
      }));
    } else {
      setLocalConfig((prev) => ({
        ...prev,
        eventTitle: "STUDIO CAPTURE",
        eventSubtitle: "Archival Portrait & Thermal Print",
        eventHashtag: "#StudioArchive",
        locationName: "Studio Gallery — Station 01",
        freePlayMode: false,
        frontScreenMedia: {
          enabled: false,
          mediaType: 'none',
          url: '',
          placement: 'center_hero',
          overlayOpacity: 50,
          loop: true,
          muted: true,
          badgeText: "STUDIO EDITION",
        },
      }));
    }
  };

  const handleCheckRemoteUpdates = async () => {
    soundEffects.playTap();
    setIsCheckingUpdate(true);
    setUpdateMessage(null);

    const res = await remoteConfigService.checkForRemoteUpdates();
    setIsCheckingUpdate(false);
    setUpdateMessage(res.message);

    if (res.updatedConfig) {
      setLocalConfig(res.updatedConfig);
      onUpdateConfig(res.updatedConfig);
      soundEffects.playSuccessChime();
    }
  };

  const handleAddVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode) return;
    soundEffects.playTap();

    const voucher: Voucher = {
      code: newVoucherCode.trim().toUpperCase(),
      discountPercent: Number(newVoucherDiscount),
      maxUses: Number(newVoucherMaxUses),
      usedCount: 0,
      description: newVoucherDesc || 'Custom Admin Pass',
      expiresAt: Date.now() + 180 * 24 * 60 * 60 * 1000,
      active: true,
      createdAt: Date.now(),
    };

    await storageService.saveVoucher(voucher);
    const updated = await storageService.getAllVouchers();
    setVouchers(updated);
    setNewVoucherCode('');
    setNewVoucherDesc('');
    setVoucherFeedbackMsg(`✓ Added voucher code ${voucher.code}`);
    setTimeout(() => setVoucherFeedbackMsg(null), 3000);
  };

  const handleGenerateCashierBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playTap();
    const qty = Math.max(1, Math.min(500, Number(batchCount) || 1));
    const layoutMeta = LAYOUT_VOUCHER_META[batchLayoutType];

    const generated = await paymentService.generateCashierVouchersBatch({
      count: qty,
      prefix: batchPrefix || layoutMeta.prefix,
      discountPercent: Number(batchDiscount) || 100,
      maxUses: 1, // 1 Voucher = 1 Print Copy (Single-Use)
      batchName: batchLabel.trim() || `${layoutMeta.label} • 1 Print Copy`,
      layoutType: batchLayoutType,
    });

    const updated = await storageService.getAllVouchers();
    setVouchers(updated);
    setLastGeneratedBatch(generated);
    setShowTicketSheet(true);
    soundEffects.playSuccessChime();
    setVoucherFeedbackMsg(
      `✓ Generated ${generated.length} single-use ${layoutMeta.label} voucher${
        generated.length > 1 ? 's' : ''
      } (1 Voucher = 1 Print Copy)!`
    );
    setTimeout(() => setVoucherFeedbackMsg(null), 4500);
  };

  const handleCopyText = (text: string, label = 'copied') => {
    soundEffects.playTap();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedCode(label);
      setVoucherFeedbackMsg(`✓ Copied ${label === 'ALL' ? 'voucher codes' : label} to clipboard!`);
      setTimeout(() => {
        setCopiedCode(null);
        setVoucherFeedbackMsg(null);
      }, 2500);
    } catch {
      setVoucherFeedbackMsg('Could not copy automatically — please select and copy.');
      setTimeout(() => setVoucherFeedbackMsg(null), 3000);
    }
  };

  const handleDownloadVouchersList = (list: Voucher[]) => {
    soundEffects.playTap();
    if (list.length === 0) return;

    const header = [
      `====================================================`,
      `  JCVCREATIVES PHOTOBOOTH — CASHIER VOUCHER LIST`,
      `  Generated: ${new Date().toLocaleString()}`,
      `  Session Price: ${localConfig.currencySymbol}${localConfig.pricePerSession.toFixed(2)}`,
      `  Total Codes: ${list.length} (Works 100% Offline)`,
      `====================================================`,
      ``,
      `CODE           | VALUE      | MAX USES | STATUS     | BATCH / NOTE`,
      `-------------------------------------------------------------------------`,
    ];

    const rows = list.map((v, i) => {
      const status = v.maxUses > 0 && v.usedCount >= v.maxUses ? 'USED' : 'AVAILABLE';
      const num = String(i + 1).padStart(3, '0');
      return `${num}. ${v.code.padEnd(10, ' ')} | ${String(v.discountPercent + '% OFF').padEnd(10, ' ')} | ${String(
        v.usedCount + '/' + (v.maxUses > 0 ? v.maxUses : '∞')
      ).padEnd(8, ' ')} | ${status.padEnd(10, ' ')} | ${v.description}`;
    });

    const content = [...header, ...rows, ``].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JCV-Cashier-Vouchers-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    setVoucherFeedbackMsg(`✓ Downloaded ${list.length} voucher codes as offline .TXT sheet!`);
    setTimeout(() => setVoucherFeedbackMsg(null), 3500);
  };

  const handlePrintCashierSlipsThermal = async (list: Voucher[]) => {
    if (list.length === 0) return;
    soundEffects.playTap();
    setIsPrintingVouchers(true);
    setVoucherFeedbackMsg('Printing cashier voucher slips on thermal printer...');

    const toPrint = list.slice(0, 30); // Cap per single thermal strip run so roll doesn't overflow
    const width = localConfig.thermalPrinter.paperWidthMm === 80 ? 576 : 384;
    const slipHeight = 135;
    const headerHeight = 90;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = headerHeight + toPrint.length * slipHeight + 30;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('JCVCREATIVES PHOTOBOOTH', width / 2, 32);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`CASHIER VOUCHERS (${toPrint.length} PCS)`, width / 2, 54);
    ctx.font = '12px monospace';
    ctx.fillText(new Date().toLocaleString(), width / 2, 74);

    toPrint.forEach((v, idx) => {
      const top = headerHeight + idx * slipHeight;

      // Dashed tear-off line
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, top);
      ctx.lineTo(width - 10, top);
      ctx.stroke();
      ctx.restore();

      // Voucher box
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, top + 12, width - 32, slipHeight - 24);

      const vMeta = v.layoutType ? LAYOUT_VOUCHER_META[v.layoutType] : undefined;
      const vPrice = v.layoutType
        ? localConfig.layoutPrices?.[v.layoutType] ?? vMeta?.defaultPrice ?? 30
        : localConfig.pricePerSession;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `#${idx + 1} • ${vMeta ? vMeta.label.toUpperCase() : 'PHOTOBOOTH PASS'} (P${vPrice})`,
        width / 2,
        top + 36
      );

      ctx.font = 'bold 28px monospace';
      ctx.fillText(v.code, width / 2, top + 74);

      ctx.font = '11px monospace';
      ctx.fillText('1 VOUCHER = 1 PRINT COPY • SINGLE USE', width / 2, top + 100);
    });

    const res = await thermalPrinterService.print(canvas, localConfig.thermalPrinter);
    setIsPrintingVouchers(false);
    if (res.success) {
      soundEffects.playSuccessChime();
      setVoucherFeedbackMsg(`✓ Printed ${toPrint.length} cashier voucher slips!`);
    } else {
      setVoucherFeedbackMsg(res.error || 'Could not print to thermal printer.');
    }
    setTimeout(() => setVoucherFeedbackMsg(null), 4000);
  };

  const handleDeleteSingleVoucher = async (code: string) => {
    soundEffects.playTap();
    await storageService.deleteVoucher(code);
    const updated = await storageService.getAllVouchers();
    setVouchers(updated);
    setLastGeneratedBatch((prev) => prev.filter((v) => v.code !== code));
    setVoucherFeedbackMsg(`🗑️ Deleted voucher ${code}`);
    setTimeout(() => setVoucherFeedbackMsg(null), 2500);
  };

  const handleClearUsedVouchers = async () => {
    soundEffects.playTap();
    await storageService.clearUsedVouchers();
    const updated = await storageService.getAllVouchers();
    setVouchers(updated);
    setLastGeneratedBatch((prev) =>
      prev.filter((v) => !(v.maxUses > 0 && v.usedCount >= v.maxUses))
    );
    setVoucherFeedbackMsg('🧹 Cleared all used/redeemed vouchers.');
    setTimeout(() => setVoucherFeedbackMsg(null), 3000);
  };

  // Update Printer Printout Darkness (5% = Ultra Light to 100% = Extra Dark) & sync brightness/contrast/density
  const handleUpdatePrintDarkness = async (
    darknessVal: number,
    densityOverride?: 'light' | 'normal' | 'dark',
    playTapSound: boolean = true
  ) => {
    if (playTapSound) soundEffects.playTap();
    const clampedDarkness = Math.max(5, Math.min(100, Math.round(darknessVal)));
    // Inverse mapping: lower darkness = higher photo shadow lift brightness
    // e.g. 15% darkness -> +78% brightness, 35% darkness -> +55% brightness, 50% -> +38%, 70% -> +15%, 90% -> -9%
    const mappedBrightness = Math.max(
      -25,
      Math.min(92, Math.round(95 - clampedDarkness * 1.15))
    );
    const mappedContrast = Math.max(
      15,
      Math.min(95, Math.round(20 + clampedDarkness * 0.7))
    );
    const autoDensity: 'light' | 'normal' | 'dark' =
      densityOverride ||
      (clampedDarkness <= 40 ? 'light' : clampedDarkness <= 65 ? 'normal' : 'dark');

    const updated: RemoteKioskConfig = {
      ...localConfig,
      thermalPrinter: {
        ...localConfig.thermalPrinter,
        printDarkness: clampedDarkness,
        brightness: mappedBrightness,
        contrast: mappedContrast,
        density: autoDensity,
      },
    };
    setLocalConfig(updated);
    await remoteConfigService.updateConfig(updated);
    onUpdateConfig(updated);
  };

  // Test Print Hardware Alignment & Darkness Calibration Slip
  const handleTestPrint = async () => {
    soundEffects.playTap();
    setIsTestPrinting(true);
    setTestPrintFeedback(null);

    const activeDarkness = localConfig.thermalPrinter.printDarkness ?? 35;
    const activeDensity = (localConfig.thermalPrinter.density || 'light').toUpperCase();

    const testCanvas = document.createElement('canvas');
    testCanvas.width = localConfig.thermalPrinter.paperWidthMm === 80 ? 576 : 384;
    testCanvas.height = 460;
    const ctx = testCanvas.getContext('2d')!;

    // White paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);

    // Dark calibration print pattern
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('⚡ JCVCREATIVES PHOTOBOOTH ⚡', testCanvas.width / 2, 38);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      `DARKNESS: ${activeDarkness}% (${activeDensity} BURN)`,
      testCanvas.width / 2,
      62
    );
    ctx.font = '13px monospace';
    ctx.fillText(
      `KIOSK: ${config.kioskId} • ${localConfig.thermalPrinter.paperWidthMm}mm (${testCanvas.width}px)`,
      testCanvas.width / 2,
      84
    );

    // Portrait Shadow & Skin-Tone Swatches (20%, 40%, 60%, 75%, 88% gray)
    const swatchCount = 5;
    const swatchMargin = 20;
    const totalSwatchW = testCanvas.width - swatchMargin * 2;
    const swatchW = Math.floor(totalSwatchW / swatchCount);
    const tones = [35, 75, 120, 165, 210];
    const toneLabels = ['SHADOW', 'DARK', 'MID', 'SKIN', 'HIGH'];
    for (let i = 0; i < swatchCount; i++) {
      const sx = swatchMargin + i * swatchW;
      const g = tones[i];
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(sx + 2, 100, swatchW - 4, 58);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 2, 100, swatchW - 4, 58);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(toneLabels[i], sx + swatchW / 2, 173);
    }

    // Crosshair alignment lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 185, testCanvas.width - 20, 140);
    ctx.beginPath();
    ctx.moveTo(testCanvas.width / 2, 185);
    ctx.lineTo(testCanvas.width / 2, 325);
    ctx.moveTo(10, 255);
    ctx.lineTo(testCanvas.width - 10, 255);
    ctx.stroke();

    // Smooth Dither Gradient Bar
    for (let x = 20; x < testCanvas.width - 20; x++) {
      const gray = Math.floor(((x - 20) / (testCanvas.width - 40)) * 255);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, 340, 1, 34);
    }

    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.fillText(
      `DARKNESS ${activeDarkness}% • PHOTO LIFT +${localConfig.thermalPrinter.brightness ?? 45}%`,
      testCanvas.width / 2,
      398
    );
    ctx.fillText(new Date().toLocaleString(), testCanvas.width / 2, 422);

    const res = await thermalPrinterService.print(testCanvas, localConfig.thermalPrinter);
    setIsTestPrinting(false);
    if (res.success) {
      setTestPrintFeedback(
        `Test slip printed at ${activeDarkness}% darkness (${activeDensity} burn)!`
      );
      soundEffects.playSuccessChime();
    } else {
      setTestPrintFeedback(res.error || 'Print failed.');
    }
  };

  const handleForceFlushEmailQueue = async () => {
    soundEffects.playTap();
    const res = await emailDeliveryService.flushQueue();
    const updated = await storageService.getQueuedEmails();
    setQueuedEmails(updated);
    setSaveSuccessMsg(`Flushed queue: ${res.processedCount} email(s) sent.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // PIN Lock Authentication Modal
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Kiosk Security PIN</h2>
          <p className="text-xs text-slate-400 mb-5">Enter operator security PIN to unlock console</p>

          <input
            type="password"
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value;
              setPinInput(val);
              setPinError(false);
              if (isPinValid(val)) {
                setIsAuthenticated(true);
                soundEffects.playSuccessChime();
              }
            }}
            placeholder="Enter PIN..."
            autoFocus
            autoComplete="off"
            className="w-full h-12 px-4 bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none rounded-2xl text-center tracking-widest text-lg font-mono text-white placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm mb-4"
          />

          {pinError && (
            <div className="text-xs text-rose-400 mb-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incorrect PIN code. Please try again.</span>
            </div>
          )}

          <div className="w-full flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTap();
                setPinInput('');
                setPinError(false);
              }}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm active:scale-98 transition cursor-pointer"
            >
              Unlock Console
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel & Return to Kiosk
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      data-admin-scrollable="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-6 select-none animate-fadeIn"
    >
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* Admin Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">JCVcreatives Photobooth Console</h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  {config.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">{config.locationName} • Station {config.kioskId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-no-fullscreen-enforce="true"
              onClick={handleToggleFullscreenKiosk}
              title={
                isFullscreenLocked
                  ? 'Full Screen Kiosk Mode Locked — Click to Exit Full Screen'
                  : 'Enter & Lock Full Screen Kiosk Display'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                isFullscreenLocked
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              }`}
            >
              {isFullscreenLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <Minimize className="w-3.5 h-3.5" />
                  <span>Full Screen Locked (Exit)</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Full Screen Toggle</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                setIsAuthenticated(false);
              }}
              title="Lock Admin Console"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 bg-slate-900/60 border-b border-slate-800 overflow-x-auto text-xs">
          {[
            { id: 'analytics', label: 'Live Telemetry', icon: BarChart3 },
            { id: 'frontscreen', label: 'Front Screen & Media', icon: Sparkles },
            { id: 'printer', label: 'Thermal Driver', icon: Printer },
            { id: 'config', label: 'Remote Config & OTA', icon: Cloud },
            { id: 'vouchers', label: 'Price & Vouchers', icon: Ticket },
            { id: 'gallery', label: 'Capture Archive & Queue', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundEffects.playTap();
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold transition whitespace-nowrap ${
                  active
                    ? 'border-indigo-500 text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-white">
          {/* TAB 1: Live Telemetry */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Top Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">Total Photo Sessions</div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-400">{telemetry.totalSessions}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Avg time: {telemetry.averageSessionDurationSec}s</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">Thermal Strips Printed</div>
                  <div className="text-2xl sm:text-3xl font-black text-pink-400">{telemetry.totalPrints}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {telemetry.lastPrintTimestamp ? 'Last: Just now' : 'Standby'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                    <span>Paper Roll Level</span>
                    <button
                      onClick={handleResetPaper}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Refill 100%
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {telemetry.paperRemainingPercent}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${telemetry.paperRemainingPercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">Total Revenue</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {config.currencySymbol}{telemetry.totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">QR Pay & Vouchers</div>
                </div>
              </div>

              {/* Hardware Health & Telemetry Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Device & Hardware Status</span>
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Printer Connection</span>
                      <span className="font-bold text-emerald-400 capitalize">{printerStatus.connectionType} ({printerStatus.deviceName})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Network Sync Status</span>
                      <span className="font-bold text-cyan-400">{telemetry.isOnline ? 'Online Cloud Sync' : 'Offline Mode (Local Storage)'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Tablet Battery Level</span>
                      <span className="font-bold text-emerald-400">{telemetry.deviceBatteryLevel || 100}%</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Queued Offline Emails</span>
                      <span className="font-bold text-amber-400">{queuedEmails.filter((e) => e.status === 'queued').length} items pending</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3">Popular Frame Themes</h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(telemetry.popularFrames).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-slate-300 capitalize">{k.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-400">{v} sessions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Front Screen & Event Media Editor */}
          {activeTab === 'frontscreen' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">Front Screen & Event Media Editor</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Customize the kiosk attract screen for birthdays, weddings, celebrations, or corporate events with GIFs, Canva video loops, MP4s, or custom themes.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {saveSuccessMsg && (
                    <span className="text-xs text-emerald-400 font-medium">{saveSuccessMsg}</span>
                  )}
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Save & Apply to Front Screen</span>
                  </button>
                </div>
              </div>

              {/* Home Screen 3-Strips Photo Showcase & Shuffling (Operator / Admin Control Only) */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        Home Screen 3-Strips Custom Photos & Shuffling
                      </h3>
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                        ADMIN ONLY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload and manage the photos showcased inside the 3 strips on the kiosk welcome screen. Regular kiosk guests cannot modify these photos.
                    </p>
                  </div>

                  {/* Operator Buttons matching user screenshot IMG_3040_1a64b7b2.jpeg */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      ref={adminFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple={targetSlotIndex === null}
                      onChange={handleAdminPhotoUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isProcessingPhotos}
                      onClick={() => {
                        setTargetSlotIndex(null);
                        adminFileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>{isProcessingPhotos ? 'Processing...' : homeStripPhotos.length > 0 ? 'Change Photo / Replace' : 'Upload Photos'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingPhotos}
                      onClick={() => {
                        setTargetSlotIndex(homeStripPhotos.length);
                        adminFileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Add Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdminShuffle}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-slate-300" />
                      <span>Shuffle</span>
                    </button>

                    {homeStripPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAdminResetPhotos}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {homePhotoStatusMsg && (
                  <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 rounded-xl px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{homePhotoStatusMsg}</span>
                  </div>
                )}

                {/* Thumbnails preview of current photos */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-2 flex items-center justify-between">
                    <span>
                      Active Strip Photos ({homeStripPhotos.length > 0 ? `${homeStripPhotos.length} custom photo(s)` : 'Default studio gallery'}):
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      TAP ANY PHOTO TO REPLACE IT SPECIFICALLY
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
                    {(homeStripPhotos.length > 0 ? homeStripPhotos : DEFAULT_BOOTH_SAMPLES).map((url, i) => (
                      <div
                        key={i}
                        className="group relative w-20 h-26 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 shadow-md transition hover:border-sky-400"
                      >
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

                        {/* Overlay Controls on Hover/Tap */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSlotIndex(i);
                              adminFileInputRef.current?.click();
                            }}
                            className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold shadow-xs cursor-pointer w-full text-center"
                          >
                            Replace
                          </button>
                          {homeStripPhotos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAdminDeletePhoto(i)}
                              className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-bold shadow-xs cursor-pointer w-full text-center"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-mono text-white pointer-events-none">
                          #{i + 1}
                        </span>
                      </div>
                    ))}

                    {/* Add button slot at end */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSlotIndex(homeStripPhotos.length);
                        adminFileInputRef.current?.click();
                      }}
                      className="w-20 h-26 rounded-xl border border-dashed border-slate-700 hover:border-sky-400 bg-slate-950/60 hover:bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-sky-300 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-medium">Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Home Screen Occasion Themes (Custom Strip Style, Envelope & Start Button per Occasion) */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        Home Screen Occasion Themes (Strip Style, Envelope & Button)
                      </h3>
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                        ADMIN ONLY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Select an occasion to transform the home screen backdrop, the 3 shuffling photostrips' frame & headers, the envelope seal, and the moving start button. Your uploaded photos remain inside the strips.
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-full shrink-0">
                    Active: {getAttractThemeById(activeAttractTheme).name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {ATTRACT_OCCASION_THEMES.map((occ) => {
                    const isSelected = activeAttractTheme === occ.id;
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => handleSelectOccasionTheme(occ.id)}
                        className={`relative p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-sky-400 bg-slate-800/90 ring-2 ring-sky-400/30 shadow-lg'
                            : 'border-slate-800 bg-slate-950/90 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                            Active
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-2xl">{occ.emoji}</span>
                            <div>
                              <div className="font-bold text-xs text-white leading-tight">
                                {occ.shortLabel}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {occ.heroTitle}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {occ.description}
                          </p>
                        </div>

                        {/* Mini Visual Preview of Occasion Strip & Button Style */}
                        <div
                          className={`p-2 rounded-xl border border-black/10 flex flex-col items-center gap-2 ${occ.screenBgClass}`}
                        >
                          {/* Mini Strip Preview */}
                          <div
                            className={`w-full px-2 py-1 text-[8px] text-center truncate ${occ.stripCardClass}`}
                          >
                            <div className={`truncate ${occ.stripHeaderClass}`}>
                              {occ.leftStripHeader}
                            </div>
                            <div className={`mt-0.5 truncate ${occ.centerPolaroidCaptionClass}`}>
                              {occ.centerPolaroidCaption}
                            </div>
                          </div>

                          {/* Mini Start Button Preview */}
                          <div
                            className={`w-full py-1 px-2 text-[9px] font-bold text-center truncate ${occ.buttonClass}`}
                          >
                            {occ.buttonText}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Information & Operation Rules */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Event Information & Guest Access</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Event Title (Front Screen Banner)</label>
                    <input
                      type="text"
                      value={localConfig.eventTitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                      placeholder="E.g. Liam's 7th Birthday Party"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Subtitle / Tagline</label>
                    <input
                      type="text"
                      value={localConfig.eventSubtitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventSubtitle: e.target.value })}
                      placeholder="E.g. Step right up, strike a pose & print keepsakes!"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Location / Venue Name</label>
                    <input
                      type="text"
                      value={localConfig.locationName}
                      onChange={(e) => setLocalConfig({ ...localConfig, locationName: e.target.value })}
                      placeholder="E.g. The Grand Ballroom, Station 01"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Event Hashtag / Date</label>
                    <input
                      type="text"
                      value={localConfig.eventHashtag}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventHashtag: e.target.value })}
                      placeholder="#LiamsBirthday2026"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Free Play Mode toggle */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig.freePlayMode}
                        onChange={(e) => setLocalConfig({ ...localConfig, freePlayMode: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                      <span className="font-bold text-white">Free Play Mode (No Payment Gate)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5 ml-5">
                      Bypasses payment prompts so event guests enjoy unlimited complimentary photostrip captures and thermal prints.
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      localConfig.freePlayMode
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {localConfig.freePlayMode ? 'Free Play Active' : 'Paid Sessions'}
                  </span>
                </div>
              </div>

              {/* Quick Printer Printout Darkness Control (Overview Shortcut) */}
              <div className="p-5 bg-slate-900/90 border border-amber-500/30 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">
                        Printer Printout Darkness Control
                      </h3>
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Darkness: {localConfig.thermalPrinter.printDarkness ?? 35}% ({(localConfig.thermalPrinter.density || 'light').toUpperCase()})
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Lower the percentage for a <strong className="text-white">lighter printout</strong> (less black ink on faces &amp; hair), or raise it for a <strong className="text-white">darker printout</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isTestPrinting}
                      onClick={handleTestPrint}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isTestPrinting ? 'Printing...' : 'Test Print Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        setActiveTab('printer');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
                    >
                      Full Printer Settings →
                    </button>
                  </div>
                </div>

                {/* Preset Darkness Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Ultra Light (15%)', darkness: 15, density: 'light' as const },
                    { label: 'Light ★ (35%)', darkness: 35, density: 'light' as const },
                    { label: 'Medium (50%)', darkness: 50, density: 'normal' as const },
                    { label: 'Dark (70%)', darkness: 70, density: 'dark' as const },
                    { label: 'Extra Dark (90%)', darkness: 90, density: 'dark' as const },
                  ].map((preset) => {
                    const currentDarkness = localConfig.thermalPrinter.printDarkness ?? 35;
                    const isSelected = Math.abs(currentDarkness - preset.darkness) <= 6;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleUpdatePrintDarkness(preset.darkness, preset.density)}
                        className={`px-3.5 py-2 rounded-xl border font-mono font-bold text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Fine Darkness Slider */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePrintDarkness((localConfig.thermalPrinter.printDarkness ?? 35) - 5)
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                  >
                    -5% Lighter
                  </button>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={localConfig.thermalPrinter.printDarkness ?? 35}
                    onChange={(e) =>
                      handleUpdatePrintDarkness(Number(e.target.value), undefined, false)
                    }
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePrintDarkness((localConfig.thermalPrinter.printDarkness ?? 35) + 5)
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                  >
                    +5% Darker
                  </button>
                </div>

                {testPrintFeedback && (
                  <div className="text-xs text-emerald-400 font-medium">{testPrintFeedback}</div>
                )}
              </div>

              {/* Front Screen Media (GIF, Canva Video, MP4) */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-indigo-400" />
                      <span>Front Screen Animation, Video & Canva Media</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Display an animated GIF, MP4/WebM video, or Canva design on the front screen
                    </p>
                  </div>

                  {/* Enable / Disable Switch */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">Status:</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateFrontMedia({
                          enabled: !(localConfig.frontScreenMedia?.enabled ?? false),
                          mediaType: localConfig.frontScreenMedia?.mediaType === 'none' ? 'gif' : (localConfig.frontScreenMedia?.mediaType || 'gif'),
                        })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                        localConfig.frontScreenMedia?.enabled
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {localConfig.frontScreenMedia?.enabled ? 'MEDIA ACTIVE' : 'DISABLED'}
                    </button>
                  </label>
                </div>

                {/* Media Format Type */}
                <div>
                  <label className="text-slate-400 block text-xs mb-2">Media Format</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { type: 'video' as const, label: 'Video (MP4/WebM)', icon: VideoIcon, desc: 'Looping video file' },
                      { type: 'gif' as const, label: 'Animated GIF', icon: ImageIcon, desc: 'Balloons, confetti or stickers' },
                      { type: 'canva_embed' as const, label: 'Canva Embed / Web', icon: Sparkles, desc: 'Canva link or iframe' },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSel = localConfig.frontScreenMedia?.mediaType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            soundEffects.playTap();
                            updateFrontMedia({ enabled: true, mediaType: item.type });
                          }}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSel
                              ? 'border-indigo-400 bg-indigo-950/40 text-white shadow-sm'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-indigo-300" />
                            <span className="font-bold text-white text-xs">{item.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Source Input: File Upload or Direct URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* File Upload Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Upload File from Device</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">100% Offline</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Upload an MP4, WebM, or GIF directly from your laptop or tablet. Saved locally for offline kiosk reliability.
                    </p>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-200 hover:text-white text-xs font-medium transition active:scale-95 text-center">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Choose Video or GIF File...</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,image/gif,image/webp"
                        onChange={handleMediaFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Direct Web URL or Canva Link Input */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Direct URL or Canva Link</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCanvaHelp(!showCanvaHelp)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Canva Guide</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={localConfig.frontScreenMedia?.url || canvaInputText}
                        onChange={(e) => handleCanvaInput(e.target.value)}
                        placeholder="Paste MP4 URL, Giphy link, or Canva view link..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {localConfig.frontScreenMedia?.url
                          ? `Loaded: ${localConfig.frontScreenMedia.url.slice(0, 50)}...`
                          : 'Supports MP4, WebM, GIF, Giphy, or Canva embed'}
                      </p>
                    </div>

                    {showCanvaHelp && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1 animate-fadeIn">
                        <div className="font-bold text-white text-xs flex items-center gap-1">
                          <span>🎨 Using Designs from Canva</span>
                        </div>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-400">
                          <li><strong>Option 1 (Recommended):</strong> In Canva, click <em>Share &gt; Download &gt; MP4 Video or GIF</em>, then upload using the button on the left.</li>
                          <li><strong>Option 2 (Live Embed):</strong> In Canva, click <em>Share &gt; More &gt; Embed</em>, copy the link or iframe, and paste into the box above.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ready-to-Use Royalty-Free Curated Sample Loops */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Or pick from curated celebration loops:</span>
                    <span className="text-[10px] text-slate-500 font-mono">Instant Samples</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SAMPLE_MEDIA_LIST.map((sample) => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => {
                          soundEffects.playTap();
                          updateFrontMedia({
                            enabled: true,
                            mediaType: sample.type,
                            url: sample.url,
                            badgeText: sample.badge,
                            headline: sample.headline,
                            subheadline: sample.subtitle,
                          });
                        }}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-indigo-500/60 hover:bg-slate-900 text-left transition flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>{sample.tag}</span>
                          <span className="text-[9px] uppercase px-1 rounded bg-slate-900 border border-slate-800">{sample.type}</span>
                        </div>
                        <div className="text-xs font-semibold text-white group-hover:text-indigo-300 line-clamp-1">{sample.name}</div>
                        <span className="text-[10px] text-slate-500 mt-1 font-mono group-hover:text-indigo-400">Click to use</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Placement & Display Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">Display Placement</label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaPlacement"
                          checked={localConfig.frontScreenMedia?.placement === 'center_hero'}
                          onChange={() => updateFrontMedia({ placement: 'center_hero' })}
                          className="accent-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-white">Centerpiece Marquee</div>
                          <div className="text-[10px] text-slate-400">Framed hero player in center of screen</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaPlacement"
                          checked={localConfig.frontScreenMedia?.placement === 'background'}
                          onChange={() => updateFrontMedia({ placement: 'background' })}
                          className="accent-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-white">Full Background</div>
                          <div className="text-[10px] text-slate-400">Plays across entire kiosk display</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Background Dimmer Slider */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">
                      Dark Overlay Dimmer ({localConfig.frontScreenMedia?.overlayOpacity ?? 50}%)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={localConfig.frontScreenMedia?.overlayOpacity ?? 50}
                      onChange={(e) => updateFrontMedia({ overlayOpacity: Number(e.target.value) })}
                      className="w-full accent-indigo-500 mt-2"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>10% Bright</span>
                      <span>50% Balanced</span>
                      <span>90% Subtle</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      Maintains contrast so the &quot;TOUCH SCREEN TO BEGIN&quot; button and text are readable over any video or GIF.
                    </p>
                  </div>

                  {/* Badge Text & Loop / Mute Controls */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-slate-400 block mb-1">Badge Text (Above Media)</label>
                      <input
                        type="text"
                        value={localConfig.frontScreenMedia?.badgeText ?? 'EVENT SPECIAL'}
                        onChange={(e) => updateFrontMedia({ badgeText: e.target.value })}
                        placeholder="🎂 LIAM'S 7TH BIRTHDAY"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs uppercase font-mono"
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={localConfig.frontScreenMedia?.loop ?? true}
                          onChange={(e) => updateFrontMedia({ loop: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        <span>Loop Video/GIF</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={localConfig.frontScreenMedia?.muted ?? true}
                          onChange={(e) => updateFrontMedia({ muted: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        <span>Mute Audio</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live Interactive Preview Box */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live Front Screen Preview</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Interactive Tablet Simulation</span>
                  </div>

                  <div className="relative w-full aspect-video sm:aspect-[21/9] max-h-56 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                    {/* Background media in preview */}
                    {localConfig.frontScreenMedia?.enabled &&
                      localConfig.frontScreenMedia.placement === 'background' &&
                      localConfig.frontScreenMedia.url && (
                        <div className="absolute inset-0 pointer-events-none">
                          {localConfig.frontScreenMedia.mediaType === 'video' ? (
                            <video
                              src={localConfig.frontScreenMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : localConfig.frontScreenMedia.mediaType === 'gif' ? (
                            <img
                              src={localConfig.frontScreenMedia.url}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <iframe
                              src={localConfig.frontScreenMedia.canvaEmbedUrl || localConfig.frontScreenMedia.url}
                              className="w-full h-full border-0 pointer-events-none"
                              title="preview"
                            />
                          )}
                          <div
                            className="absolute inset-0 bg-slate-950"
                            style={{ opacity: (localConfig.frontScreenMedia.overlayOpacity ?? 50) / 100 }}
                          />
                        </div>
                      )}

                    {/* Preview Top Header */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-bold text-white uppercase">{localConfig.eventTitle || 'Event Title'}</span>
                      </div>
                      <span className="font-mono">
                        {!localConfig.freePlayMode
                          ? `${localConfig.currencySymbol}${localConfig.pricePerSession.toFixed(2)}`
                          : (localConfig.eventHashtag || 'PHOTO STUDIO')}
                      </span>
                    </div>

                    {/* Preview Center */}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
                      {localConfig.frontScreenMedia?.enabled &&
                      localConfig.frontScreenMedia.placement === 'center_hero' &&
                      localConfig.frontScreenMedia.url ? (
                        <div className="w-48 h-20 rounded-lg overflow-hidden border border-slate-700 bg-black mb-2 shadow-lg relative flex items-center justify-center">
                          {localConfig.frontScreenMedia.mediaType === 'video' ? (
                            <video
                              src={localConfig.frontScreenMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : localConfig.frontScreenMedia.mediaType === 'gif' ? (
                            <img
                              src={localConfig.frontScreenMedia.url}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <iframe
                              src={localConfig.frontScreenMedia.canvaEmbedUrl || localConfig.frontScreenMedia.url}
                              className="w-full h-full border-0 pointer-events-none"
                              title="preview"
                            />
                          )}
                          <span className="absolute top-1 left-1 px-1 py-0.2 text-[8px] bg-black/70 text-white rounded font-mono">
                            {localConfig.frontScreenMedia.badgeText || 'EVENT'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-mono mb-1">
                          [ Classic Photostrip Mockup Active ]
                        </div>
                      )}

                      <div className="text-sm font-bold text-white">
                        {localConfig.frontScreenMedia?.headline || localConfig.eventTitle || 'Photographic Keepsake'}
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-xs truncate">
                        {localConfig.frontScreenMedia?.subheadline || localConfig.eventSubtitle || 'Touch screen to begin'}
                      </div>

                      {/* Preview Button */}
                      <div className="mt-2.5 px-4 py-1.5 rounded-lg bg-white text-slate-950 font-bold text-[10px] tracking-wider shadow">
                        TOUCH SCREEN TO BEGIN
                      </div>
                    </div>

                    {/* Preview Footer */}
                    <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>{localConfig.locationName}</span>
                      <span>{localConfig.eventHashtag}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Universal USB & Wireless Printer Hub */}
          {activeTab === 'printer' && (
            <div className="space-y-6">
              {/* DEDICATED XPRINTER 58iiB (USB + BLUETOOTH) HARDWARE PROFILE & QUICK SETUP CARD */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border-2 border-indigo-500/70 rounded-2xl space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider">
                        Primary Booth Printer
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Xprinter 58iiB — 58mm Thermal POS Printer (USB + BT)
                      </h3>
                      {(localConfig.thermalPrinter.printerModel || 'xprinter_58iib') === 'xprinter_58iib' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Xprinter 58iiB Profile Active</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pre-calibrated for your <strong>Xprinter 58iiB</strong>: <strong>58mm Paper Width (384 dots/line)</strong> • <strong>203 DPI (8 dots/mm)</strong> • <strong>Up to 90mm/s High-Speed AC Thermal Head</strong> • <strong>USB + Dual Bluetooth</strong> • <strong>5-Line Tear-Bar Advance</strong>.
                    </p>
                  </div>

                  {/* 1-Tap Apply Optimal Xprinter 58iiB Settings Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          printerModel: 'xprinter_58iib',
                          paperWidthMm: 58,
                          dotsPerLine: 384,
                          contrast: 40,
                          brightness: 45,
                          printDarkness: 38,
                          density: 'normal',
                          escPosCommandMode: 'gs_v_0',
                          feedLines: 5,
                          autoCut: false,
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      setTestPrintFeedback(
                        '✓ Xprinter 58iiB optimal settings applied (58mm / 384px, 203 DPI, 90mm/s AC head heating, 5 tear-bar feed lines, 38% balanced darkness).'
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition cursor-pointer shrink-0 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply Xprinter 58iiB Optimal Settings</span>
                  </button>
                </div>

                {/* Spec Badges & Hardware Model Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {[
                    { label: 'Model', val: 'Xprinter 58iiB' },
                    { label: 'Paper Width', val: '58mm (384 dots)' },
                    { label: 'Resolution', val: '203 DPI (8 dots/mm)' },
                    { label: 'Print Speed', val: 'Up to 90mm/s' },
                    { label: 'Interface', val: 'USB + Bluetooth' },
                    { label: 'Roll / Tear', val: '60mm Roll • 5-Line Tear' },
                  ].map((spec) => (
                    <div
                      key={spec.label}
                      className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between"
                    >
                      <span className="text-[9px] uppercase font-mono text-slate-400">{spec.label}</span>
                      <span className="text-xs font-bold text-indigo-200 mt-0.5">{spec.val}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Connect Buttons for Xprinter 58iiB (Bluetooth + USB + Test Print) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          printerModel: 'xprinter_58iib',
                          paperWidthMm: 58,
                          dotsPerLine: 384,
                          feedLines: 6,
                          autoCut: true,
                          escPosCommandMode: 'gs_v_0',
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      await thermalPrinterService.connectBluetooth();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      printerStatus.connectionType === 'bluetooth' && printerStatus.isConnected
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-indigo-600/20 border-indigo-500/50 hover:bg-indigo-600/30 text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm">1. Pair Xprinter 58iiB Bluetooth</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Wireless BT connection (PIN: <strong>0000</strong> or <strong>1234</strong>)
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          printerModel: 'xprinter_58iib',
                          paperWidthMm: 58,
                          dotsPerLine: 384,
                          feedLines: 6,
                          autoCut: true,
                          escPosCommandMode: 'gs_v_0',
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      await thermalPrinterService.connectUSB();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      printerStatus.connectionType === 'usb' && printerStatus.isConnected
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30 text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm">2. Connect Xprinter 58iiB USB Cord</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Direct USB Type-B cable / USB OTG adapter
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    disabled={isTestPrinting}
                    onClick={handleTestPrint}
                    className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-left transition cursor-pointer flex items-center justify-between text-white disabled:opacity-50"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm">
                        {isTestPrinting ? 'Printing Xprinter 58iiB Test...' : '3. Test Print on Xprinter 58iiB'}
                      </div>
                      <div className="text-[11px] text-amber-200/90 mt-0.5">
                        Verify 58mm alignment, darkness &amp; tear bar
                      </div>
                    </div>
                    <Printer className="w-4 h-4 text-amber-300 shrink-0" />
                  </button>
                </div>

                {/* Printer Hardware Model Profile & Tear-Bar Feed Lines */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-mono">Hardware Profile:</span>
                    {(
                      [
                        { id: 'xprinter_58iib', label: 'Xprinter 58iiB (USB + BT) ★' },
                        { id: 'kprinter_461a', label: 'KPrinter_461a / MP58-09' },
                        { id: 'epson_80mm', label: '80mm Desktop POS' },
                      ] as const
                    ).map((modelItem) => {
                      const activeModel =
                        (localConfig.thermalPrinter.printerModel || 'xprinter_58iib') === modelItem.id;
                      return (
                        <button
                          key={modelItem.id}
                          type="button"
                          onClick={async () => {
                            soundEffects.playTap();
                            const is80 = modelItem.id === 'epson_80mm';
                            const updated: RemoteKioskConfig = {
                              ...localConfig,
                              thermalPrinter: {
                                ...localConfig.thermalPrinter,
                                printerModel: modelItem.id,
                                paperWidthMm: is80 ? 80 : 58,
                                dotsPerLine: is80 ? 576 : 384,
                                feedLines: modelItem.id === 'xprinter_58iib' ? 6 : 4,
                                autoCut: is80 || modelItem.id === 'xprinter_58iib',
                              },
                            };
                            setLocalConfig(updated);
                            await remoteConfigService.updateConfig(updated);
                            onUpdateConfig(updated);
                          }}
                          className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-[11px] transition cursor-pointer ${
                            activeModel
                              ? 'bg-indigo-600 border-indigo-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {modelItem.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tear-Bar Paper Advance Lines */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-mono">Tear-Bar Advance:</span>
                    {[3, 4, 5, 6, 7].map((lines) => (
                      <button
                        key={lines}
                        type="button"
                        onClick={async () => {
                          soundEffects.playTap();
                          const updated: RemoteKioskConfig = {
                            ...localConfig,
                            thermalPrinter: {
                              ...localConfig.thermalPrinter,
                              feedLines: lines,
                            },
                          };
                          setLocalConfig(updated);
                          await remoteConfigService.updateConfig(updated);
                          onUpdateConfig(updated);
                        }}
                        className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] transition cursor-pointer ${
                          (localConfig.thermalPrinter.feedLines ?? 5) === lines
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {lines}L
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* #1 TOP CARD: Printer Printout Darkness & Thermal Head Ink Burn Control */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/60 rounded-2xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Printer Printout Darkness &amp; Thermal Burn Level
                      </h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        Master Darkness Control
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Directly controls how dark or light your printer prints on paper. Lowering Darkness (<strong className="text-amber-300">15% – 35%</strong>) reduces black thermal ink on faces, hair, and shadows so photos never print too dark.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 shadow">
                      Darkness: {localConfig.thermalPrinter.printDarkness ?? 35}%
                    </span>
                  </div>
                </div>

                {/* 1. One-Tap Darkness Presets */}
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-2 font-bold">
                    1. Select Printout Darkness Level (Tap to Apply Immediately):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      {
                        label: 'Ultra Light (15%)',
                        sub: 'Brightest Faces • Minimal Ink',
                        darkness: 15,
                        density: 'light' as const,
                      },
                      {
                        label: 'Light ★ (35%)',
                        sub: 'Recommended • Clear Portraits',
                        darkness: 35,
                        density: 'light' as const,
                      },
                      {
                        label: 'Medium (50%)',
                        sub: 'Standard Balanced Ink',
                        darkness: 50,
                        density: 'normal' as const,
                      },
                      {
                        label: 'Dark (70%)',
                        sub: 'Deep Contrast Burn',
                        darkness: 70,
                        density: 'dark' as const,
                      },
                      {
                        label: 'Extra Dark (90%)',
                        sub: 'Maximum Thermal Burn',
                        darkness: 90,
                        density: 'dark' as const,
                      },
                    ].map((preset) => {
                      const currentDarkness = localConfig.thermalPrinter.printDarkness ?? 35;
                      const active = Math.abs(currentDarkness - preset.darkness) <= 6;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleUpdatePrintDarkness(preset.darkness, preset.density)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            active
                              ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          <div className="font-bold text-xs">{preset.label}</div>
                          <div
                            className={`text-[10px] font-mono mt-1 ${
                              active ? 'text-slate-900 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {preset.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Fine Printout Darkness Slider (5% to 100%) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-mono">
                      2. Fine Darkness Slider (5% Lightest — 100% Darkest)
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {localConfig.thermalPrinter.printDarkness ?? 35}% Darkness • Shadow Lift:{' '}
                      {(localConfig.thermalPrinter.brightness ?? 45) >= 0
                        ? `+${localConfig.thermalPrinter.brightness ?? 45}%`
                        : `${localConfig.thermalPrinter.brightness ?? 45}%`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePrintDarkness(
                          (localConfig.thermalPrinter.printDarkness ?? 35) - 5
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-mono text-xs font-bold cursor-pointer shrink-0"
                    >
                      -5% Lighter
                    </button>

                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={localConfig.thermalPrinter.printDarkness ?? 35}
                      onChange={(e) =>
                        handleUpdatePrintDarkness(Number(e.target.value), undefined, false)
                      }
                      className="flex-1 accent-amber-400 cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePrintDarkness(
                          (localConfig.thermalPrinter.printDarkness ?? 35) + 5
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-mono text-xs font-bold cursor-pointer shrink-0"
                    >
                      +5% Darker
                    </button>
                  </div>

                  {/* Visual Ink Density Bar */}
                  <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-zinc-100 via-zinc-500 to-zinc-950 relative overflow-hidden border border-slate-700">
                    <div
                      className="absolute top-0 bottom-0 w-2.5 bg-amber-400 rounded-full shadow"
                      style={{
                        left: `calc(${Math.max(
                          2,
                          Math.min(98, localConfig.thermalPrinter.printDarkness ?? 35)
                        )}% - 5px)`,
                      }}
                    />
                  </div>
                </div>

                {/* 3. Hardware Thermal Head Burn Density Mode + Instant Test Print */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">
                      3. Hardware Thermal Head Burn Energy (ESC/POS &amp; Spooler Density)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Use <strong>Light Burn (Cool)</strong> so sensitive thermal paper rolls don&apos;t over-darken faces.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(
                      [
                        { id: 'light', label: 'Light Burn (Cool)' },
                        { id: 'normal', label: 'Normal Burn' },
                        { id: 'dark', label: 'Dark Burn (Hot)' },
                      ] as const
                    ).map((modeItem) => {
                      const isCurr =
                        (localConfig.thermalPrinter.density || 'light') === modeItem.id;
                      return (
                        <button
                          key={modeItem.id}
                          type="button"
                          onClick={async () => {
                            soundEffects.playTap();
                            const updated: RemoteKioskConfig = {
                              ...localConfig,
                              thermalPrinter: {
                                ...localConfig.thermalPrinter,
                                density: modeItem.id,
                              },
                            };
                            setLocalConfig(updated);
                            await remoteConfigService.updateConfig(updated);
                            onUpdateConfig(updated);
                          }}
                          className={`px-3.5 py-2 rounded-xl border font-mono font-bold text-xs transition cursor-pointer ${
                            isCurr
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {modeItem.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={isTestPrinting}
                      onClick={handleTestPrint}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
                    >
                      {isTestPrinting ? 'Printing...' : 'Test Print Darkness'}
                    </button>
                  </div>
                </div>

                {testPrintFeedback && (
                  <div className="text-xs text-emerald-400 font-medium">{testPrintFeedback}</div>
                )}
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Universal USB Cord & Wireless Printer Connection
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Connect any thermal receipt printer, photo printer, inkjet, or laser printer via <span className="text-white font-semibold">USB Cord</span> or <span className="text-white font-semibold">Wireless (Bluetooth / Wi-Fi / AirPrint / Mopria)</span>.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All Printers Supported</span>
                  </span>
                </div>

                {/* Live Printer Connection Status Banner */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        printerStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-white">{printerStatus.deviceName}</div>
                      {printerStatus.details && (
                        <div className="text-[11px] text-slate-400">{printerStatus.details}</div>
                      )}
                    </div>
                  </div>
                  {printerStatus.error && (
                    <span className="text-rose-400 text-[11px] font-medium">{printerStatus.error}</span>
                  )}
                </div>

                {/* 1-Click Automatic Silent Print Setup (Eliminates Browser Print Pop-up Window) */}
                <div className="p-4 rounded-xl bg-emerald-950/35 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white">
                        Automatic Silent Print (No Browser Pop-up Window)
                      </span>
                      {thermalPrinterService.isSilentBridgeActive() && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Using an <strong>EPSON TM-T88V Receipt</strong> or Windows USB printer in Brave/Chrome/Edge? Download and open this 1-click setup file once on your PC so pressing <strong>Print</strong> prints immediately with <strong>zero pop-up window</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="./JCV-AutoPrint-Setup.bat"
                      download="JCV-AutoPrint-Setup.bat"
                      onClick={() => soundEffects.playTap()}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>1-Click Auto-Print Setup (.BAT)</span>
                    </a>
                  </div>
                </div>

                {/* SECTION A: WIRED USB CORD CONNECTION MODES */}
                <div>
                  <div className="text-[11px] uppercase font-mono tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>1. Connect via USB Cord (OTG / Direct USB / USB-Serial / OS Driver)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Direct USB Cord (WebUSB + Native Android USB Host) */}
                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        await thermalPrinterService.connectUSB();
                      }}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        printerStatus.connectionType === 'usb' && printerStatus.isConnected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">USB Cord (Direct / OTG)</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Plug & Play
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Direct USB cable connection for 58mm/80mm thermal printers (auto-detects all USB interfaces & endpoints).
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <span>Pair USB Cord Printer</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>

                    {/* USB-Serial Cord (CH340 / PL2303 / CP210x / FTDI) */}
                    <div
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                        printerStatus.connectionType === 'serial' && printerStatus.isConnected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">USB-Serial COM Cord</span>
                          <select
                            value={printerBaudRate}
                            onChange={(e) => setPrinterBaudRate(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-white"
                          >
                            <option value={9600}>9600 baud</option>
                            <option value={19200}>19200 baud</option>
                            <option value={38400}>38400 baud</option>
                            <option value={115200}>115200 baud</option>
                          </select>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          For USB printers using CH340, PL2303, or CP2102 virtual COM port cables on PC/Mac.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          soundEffects.playTap();
                          await thermalPrinterService.connectSerial(printerBaudRate);
                        }}
                        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition"
                      >
                        <span>Connect USB-Serial Port</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Universal System USB / Wireless Driver (Any Printer) */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        thermalPrinterService.useSystemPrinter();
                      }}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        printerStatus.connectionType === 'system'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">Any OS USB / Wireless</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                            Universal
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Works with ANY USB cord or Wireless printer installed on Windows, Mac, Android (Mopria/USB Print), or iOS (AirPrint).
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] font-semibold text-sky-400 flex items-center gap-1">
                        <span>Enable Universal System Print</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* SECTION B: WIRELESS CONNECTION MODES (BLUETOOTH & WI-FI IP) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] uppercase font-mono tracking-wider text-sky-400 mb-2.5 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>2. Connect Wirelessly (Bluetooth BLE / Classic SPP / Wi-Fi Network IP)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Wireless Bluetooth */}
                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        await thermalPrinterService.connectBluetooth();
                      }}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        printerStatus.connectionType === 'bluetooth' && printerStatus.isConnected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white mb-1">
                          Wireless Bluetooth (BLE & SPP)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Scan & pair wireless Bluetooth thermal printers (supports Web Bluetooth BLE & Native Android Bluetooth Classic SPP).
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] font-semibold text-sky-400 flex items-center gap-1">
                        <span>Scan Wireless Bluetooth</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>

                    {/* Wireless Wi-Fi / LAN IP Printer */}
                    <div
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                        printerStatus.connectionType === 'network' && printerStatus.isConnected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white mb-1">
                          Wireless Wi-Fi / LAN IP Printer
                        </div>
                        <div className="text-[11px] text-slate-400 mb-2">
                          Print wirelessly over local Wi-Fi network (Port 9100 Raw TCP or HTTP).
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={printerIpInput}
                            onChange={(e) => setPrinterIpInput(e.target.value)}
                            placeholder="192.168.1.100"
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                          />
                          <input
                            type="number"
                            value={printerPortInput}
                            onChange={(e) => setPrinterPortInput(Number(e.target.value) || 9100)}
                            placeholder="9100"
                            className="w-18 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playTap();
                          thermalPrinterService.connectNetworkPrinter(printerIpInput, printerPortInput);
                        }}
                        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                      >
                        <span>Connect Wi-Fi IP Printer</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Virtual Simulator */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        thermalPrinterService.useVirtualPrinter();
                      }}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        printerStatus.connectionType === 'virtual'
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white mb-1">Virtual Simulator</div>
                        <div className="text-[11px] text-slate-400">
                          Built-in on-screen thermal dispenser simulation when running without a physical printer.
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                        <span>Use Simulator Mode</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Paper Roll Width & ESC/POS Command Mode Settings */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Paper Width Format (58mm / 80mm)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select <strong>58mm (384 dots)</strong> for KPrinter_461a / MP58-09 or <strong>80mm (576 dots)</strong> to match your thermal paper width.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {([58, 80] as const).map((widthMm) => (
                      <button
                        key={widthMm}
                        type="button"
                        onClick={async () => {
                          soundEffects.playTap();
                          const updated: RemoteKioskConfig = {
                            ...localConfig,
                            thermalPrinter: {
                              ...localConfig.thermalPrinter,
                              paperWidthMm: widthMm,
                              dotsPerLine: widthMm === 80 ? 576 : 384,
                            },
                          };
                          setLocalConfig(updated);
                          await remoteConfigService.updateConfig(updated);
                          onUpdateConfig(updated);
                        }}
                        className={`px-4 py-2 rounded-xl border font-mono font-bold text-xs transition cursor-pointer ${
                          localConfig.thermalPrinter.paperWidthMm === widthMm
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {widthMm}mm Roll ({widthMm === 80 ? '576px' : '384px'})
                      </button>
                    ))}
                  </div>
                </div>

                {/* ESC/POS Command Mode Toggle for KPrinter_461a / MP58-09 */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      ESC/POS Bitmap Command Mode (KPrinter_461a / MP58-09)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Default <strong>GS v 0 (Zero-Line Continuous)</strong> streams 2 full rows (96B) per write so the stepper motor never stops mid-photo and leaves zero horizontal band lines.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(
                      [
                        { id: 'gs_v_0', label: 'GS v 0 (Zero-Line Continuous)' },
                        { id: 'gs_v_0_banded', label: 'GS v 0 (8-Row Micro-Band)' },
                        { id: 'esc_star_33', label: 'ESC * 33 (24-Dot Column Mode)' },
                      ] as const
                    ).map((cmdMode) => {
                      const isSelected =
                        (localConfig.thermalPrinter.escPosCommandMode || 'gs_v_0') === cmdMode.id;
                      return (
                        <button
                          key={cmdMode.id}
                          type="button"
                          onClick={async () => {
                            soundEffects.playTap();
                            const updated: RemoteKioskConfig = {
                              ...localConfig,
                              thermalPrinter: {
                                ...localConfig.thermalPrinter,
                                escPosCommandMode: cmdMode.id,
                              },
                            };
                            setLocalConfig(updated);
                            await remoteConfigService.updateConfig(updated);
                            onUpdateConfig(updated);
                          }}
                          className={`px-4 py-2 rounded-xl border font-mono font-bold text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cmdMode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hardware Test Calibration Slip */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Hardware Test & Alignment Slip</h4>
                  <p className="text-xs text-slate-400">
                    Sends a test print job to your active USB Cord, Wireless Bluetooth, Wi-Fi IP, or System OS printer.
                  </p>
                  {testPrintFeedback && (
                    <div className="text-xs text-indigo-300 mt-2 font-medium">{testPrintFeedback}</div>
                  )}
                </div>

                <button
                  disabled={isTestPrinting}
                  onClick={handleTestPrint}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isTestPrinting ? 'Printing Test...' : 'Print Calibration Slip'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Remote Config & OTA Updates */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Full Screen Kiosk-Mode Display & Session Auto-Lock Card */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/60 border-2 border-indigo-500/50 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Maximize className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">
                        Full Screen Kiosk-Mode Display Lock
                      </h3>
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          isFullscreenLocked
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isFullscreenLocked ? 'LOCKED IN FULL SCREEN' : 'WINDOWED MODE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Uses the browser Fullscreen API, Wake Lock, and Escape-key lock to lock the tablet into a distraction-free kiosk display and auto-hide the top menu (swipe down from top edge to reveal).
                    </p>
                  </div>

                  <button
                    type="button"
                    data-no-fullscreen-enforce="true"
                    onClick={handleToggleFullscreenKiosk}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition shrink-0 cursor-pointer ${
                      isFullscreenLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400'
                    }`}
                  >
                    {isFullscreenLocked ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <Minimize className="w-4 h-4" />
                        <span>Unlock &amp; Exit Full Screen</span>
                      </>
                    ) : (
                      <>
                        <Maximize className="w-4 h-4" />
                        <span>Full Screen Toggle (Lock Kiosk)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.autoFullscreenLock !== false}
                      onChange={(e) => handleToggleAutoFullscreenOnSessionStart(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                    />
                    <span>
                      <strong className="text-white">Auto-Lock Full Screen Kiosk Mode on Session Start</strong> — Automatically lock the tablet into fullscreen kiosk display whenever a guest taps to start a session
                    </span>
                  </label>
                </div>
              </div>

              {/* SAMSUNG GALAXY TAB A11 — 9 TO 12 HOUR CONTINUOUS ENDURANCE, CHARGER & BLUETOOTH OPTIMIZATION CARD */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-emerald-950/35 to-slate-900 border-2 border-emerald-500/60 rounded-2xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Battery className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Samsung Galaxy Tab A11 — 9 to 12 Hour Continuous Endurance Mode
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        {localConfig.tabletEndurance?.enabled !== false ? 'ACTIVE (9–12 HR SHIFT)' : 'PAUSED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Optimized for your <strong>Galaxy Tab A11</strong> plugged into charger 9–12 hours/day with Bluetooth connected to your <strong>Xprinter 58iiB</strong>: prevents overheating, keeps Screen WakeLock &amp; Bluetooth GATT alive all day, and auto-cleans RAM after every session.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const currentEnabled = localConfig.tabletEndurance?.enabled !== false;
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        tabletEndurance: {
                          enabled: !currentEnabled,
                          idleDimTimeoutSec: localConfig.tabletEndurance?.idleDimTimeoutSec ?? 180,
                          idleDimOpacity: localConfig.tabletEndurance?.idleDimOpacity ?? 45,
                          bluetoothKeepAlive: localConfig.tabletEndurance?.bluetoothKeepAlive ?? true,
                          cameraIdleEcoMode: localConfig.tabletEndurance?.cameraIdleEcoMode ?? true,
                          abandonedSessionResetSec:
                            localConfig.tabletEndurance?.abandonedSessionResetSec ?? 180,
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer shrink-0 transition ${
                      localConfig.tabletEndurance?.enabled !== false
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
                    }`}
                  >
                    {localConfig.tabletEndurance?.enabled !== false
                      ? '✓ 12-Hour Endurance Active'
                      : 'Enable 12-Hour Endurance'}
                  </button>
                </div>

                {/* Live Galaxy Tab A11 Power, WakeLock, Bluetooth & Memory Telemetry Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Charger &amp; Battery
                    </div>
                    <div className="text-sm font-black text-emerald-300 mt-0.5">
                      {powerStatus.batteryLevelPercent !== null
                        ? `${powerStatus.batteryLevelPercent}% ${
                            powerStatus.isCharging ? '⚡ Plugged In' : '(On Battery)'
                          }`
                        : '⚡ AC Kiosk Mode'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Screen WakeLock
                    </div>
                    <div className="text-sm font-black text-indigo-300 mt-0.5">
                      {powerStatus.wakeLockActive ? 'Locked Awake (24/7)' : 'Auto-Reacquiring'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      BT Printer Watchdog
                    </div>
                    <div className="text-sm font-black text-sky-300 mt-0.5">
                      45s Auto-Reconnect
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Uptime &amp; RAM Hygiene
                    </div>
                    <div className="text-sm font-black text-amber-300 mt-0.5">
                      {powerStatus.uptimeMinutes}m • {powerStatus.memoryFreedCount} Cleans
                    </div>
                  </div>
                </div>

                {/* Configurable Idle Thermal Dimmer & Abandoned Session Reset Timers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  {/* 1. Idle Thermal Cooling Dimmer Timeout */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-white">1. Idle Thermal Cooling Dimmer</div>
                    <div className="text-[11px] text-slate-400">
                      Dims screen by {localConfig.tabletEndurance?.idleDimOpacity ?? 45}% when idle to cool the Galaxy Tab A11 while charging (wakes in 0ms on touch).
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { sec: 60, label: '1 Min' },
                        { sec: 180, label: '3 Min ★' },
                        { sec: 300, label: '5 Min' },
                        { sec: 0, label: 'Never Dim' },
                      ].map((opt) => {
                        const active =
                          (localConfig.tabletEndurance?.idleDimTimeoutSec ?? 180) === opt.sec;
                        return (
                          <button
                            key={opt.sec}
                            type="button"
                            onClick={async () => {
                              soundEffects.playTap();
                              const updated: RemoteKioskConfig = {
                                ...localConfig,
                                tabletEndurance: {
                                  ...(localConfig.tabletEndurance || {
                                    enabled: true,
                                    idleDimOpacity: 45,
                                    bluetoothKeepAlive: true,
                                    cameraIdleEcoMode: true,
                                    abandonedSessionResetSec: 180,
                                  }),
                                  idleDimTimeoutSec: opt.sec,
                                },
                              };
                              setLocalConfig(updated);
                              await remoteConfigService.updateConfig(updated);
                              onUpdateConfig(updated);
                            }}
                            className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer ${
                              active
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Camera 5fps Idle Eco-Hibernate */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-white">2. Camera Sensor Eco-Cooling</div>
                    <div className="text-[11px] text-slate-400">
                      Drops camera ISP from 30fps to 5fps while idle on the Attract screen so the tablet stays cool on charger without ever losing camera permission.
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        const curr = localConfig.tabletEndurance?.cameraIdleEcoMode !== false;
                        const updated: RemoteKioskConfig = {
                          ...localConfig,
                          tabletEndurance: {
                            ...(localConfig.tabletEndurance || {
                              enabled: true,
                              idleDimTimeoutSec: 180,
                              idleDimOpacity: 45,
                              bluetoothKeepAlive: true,
                              abandonedSessionResetSec: 180,
                            }),
                            cameraIdleEcoMode: !curr,
                          },
                        };
                        setLocalConfig(updated);
                        await remoteConfigService.updateConfig(updated);
                        onUpdateConfig(updated);
                      }}
                      className={`mt-1 px-3 py-1.5 rounded-lg border font-mono font-bold text-[11px] cursor-pointer ${
                        localConfig.tabletEndurance?.cameraIdleEcoMode !== false
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {localConfig.tabletEndurance?.cameraIdleEcoMode !== false
                        ? '✓ Camera Eco-Cooling ON'
                        : 'Camera Eco-Cooling OFF'}
                    </button>
                  </div>

                  {/* 3. Abandoned Session Auto-Reset */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-white">3. Auto-Reset Walk-Away Sessions</div>
                    <div className="text-[11px] text-slate-400">
                      Automatically frees GPU memory and returns to the Attract screen if a guest walks away mid-session.
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { sec: 120, label: '2 Min' },
                        { sec: 180, label: '3 Min ★' },
                        { sec: 300, label: '5 Min' },
                      ].map((opt) => {
                        const active =
                          (localConfig.tabletEndurance?.abandonedSessionResetSec ?? 180) === opt.sec;
                        return (
                          <button
                            key={opt.sec}
                            type="button"
                            onClick={async () => {
                              soundEffects.playTap();
                              const updated: RemoteKioskConfig = {
                                ...localConfig,
                                tabletEndurance: {
                                  ...(localConfig.tabletEndurance || {
                                    enabled: true,
                                    idleDimTimeoutSec: 180,
                                    idleDimOpacity: 45,
                                    bluetoothKeepAlive: true,
                                    cameraIdleEcoMode: true,
                                  }),
                                  abandonedSessionResetSec: opt.sec,
                                },
                              };
                              setLocalConfig(updated);
                              await remoteConfigService.updateConfig(updated);
                              onUpdateConfig(updated);
                            }}
                            className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer ${
                              active
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Offline Service Worker Cache Status & 1-Tap Pre-Warm */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <div className="font-bold text-white">
                        Offline Service Worker Active (Zero-Interruption 9–12h Shift)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        All booth screens, JS/CSS bundles, Gobble Haus stickers, frames, vouchers &amp; Bluetooth printing are cached locally on the Galaxy Tab A11.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const count = await warmKioskOfflineCache();
                      setUpdateMessage(
                        `✓ Offline Service Worker Cache verified (${count} core assets & bundles locked in local CacheStorage for 100% offline use).`
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer transition"
                  >
                    Verify Offline Cache
                  </button>
                </div>

                {/* Galaxy Tab A11 One UI Battery Protection Tip */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Galaxy Tab A11 Charger Tip (9–12 Hours Plugged In):</strong> On your Galaxy Tab A11, open <strong>Settings → Battery → Battery Protection → Maximum (80%)</strong>. This stops charging at 80% while running directly off the charger cable all day, keeping the tablet cool and preventing battery swelling.
                  </div>
                </div>
              </div>

              {/* Android 7+ Standalone Offline APK Download Card */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Android 7+ Offline Kiosk APK (v2.4.0)</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Standalone offline Android package compatible with Android 7.0 Nougat through Android 14. Bundles all themes, stickers, and booth assets inside the APK.
                  </p>
                </div>

                <a
                  href="https://jcvcreatives.github.io/photobooth/JCVcreatives-Photobooth.apk"
                  download="JCVcreatives-Photobooth.apk"
                  onClick={() => soundEffects.playTap()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .APK</span>
                </a>
              </div>

              {/* Remote OTA Update Card */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Over-The-Air (OTA) Remote Updates</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Check remote cloud server for new firmware versions, event themes, and remote pricing policies.
                  </p>
                  {updateMessage && (
                    <div className="text-xs text-emerald-400 font-semibold mt-2">{updateMessage}</div>
                  )}
                </div>

                <button
                  disabled={isCheckingUpdate}
                  onClick={handleCheckRemoteUpdates}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking Server...' : 'Check Remote Updates'}</span>
                </button>
              </div>

              {/* Kiosk Branding Form */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white mb-2">Event Branding & Operation Rules</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Event Header Title</label>
                    <input
                      type="text"
                      value={localConfig.eventTitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Location / Venue Name</label>
                    <input
                      type="text"
                      value={localConfig.locationName}
                      onChange={(e) => setLocalConfig({ ...localConfig, locationName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Admin Security PIN</label>
                    <input
                      type="password"
                      maxLength={16}
                      value={localConfig.passcodeAdminPin}
                      onChange={(e) => setLocalConfig({ ...localConfig, passcodeAdminPin: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(localConfig.showAdminInMenu)}
                        onChange={(e) => setLocalConfig({ ...localConfig, showAdminInMenu: e.target.checked })}
                        className="rounded accent-indigo-500"
                      />
                      <span>Show &quot;Admin&quot; Button in Top Menu Bar (Hidden by default — tap logo 4x to open)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig.autoFullscreenLock !== false}
                        onChange={(e) =>
                          setLocalConfig({ ...localConfig, autoFullscreenLock: e.target.checked })
                        }
                        className="rounded accent-indigo-500"
                      />
                      <span className="font-bold text-indigo-300">
                        Automatically Lock Full Screen Kiosk Display Upon Session Start
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    {saveSuccessMsg && <span className="text-xs text-emerald-400">{saveSuccessMsg}</span>}
                    <button
                      onClick={handleSaveConfig}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Vouchers & Cashier Batch Generator */}
          {activeTab === 'vouchers' && (() => {
            const isVoucherUsed = (v: Voucher) => v.maxUses > 0 && v.usedCount >= v.maxUses;
            const availableVouchers = vouchers.filter((v) => !isVoucherUsed(v) && v.active);
            const usedVouchers = vouchers.filter((v) => isVoucherUsed(v));

            const filteredVouchers = vouchers
              .filter((v) => {
                if (voucherFilter === 'available') return !isVoucherUsed(v) && v.active;
                if (voucherFilter === 'used') return isVoucherUsed(v);
                return true;
              })
              .filter((v) => {
                if (!voucherSearch.trim()) return true;
                const q = voucherSearch.trim().toUpperCase();
                return (
                  v.code.toUpperCase().includes(q) ||
                  (v.description || '').toUpperCase().includes(q) ||
                  (v.batchName || '').toUpperCase().includes(q)
                );
              })
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            const sheetVouchers =
              lastGeneratedBatch.length > 0
                ? vouchers.filter((v) => lastGeneratedBatch.some((g) => g.code === v.code))
                : availableVouchers.filter((v) => v.isCashierTicket || v.maxUses === 1);

            return (
              <div className="space-y-6">
                {/* Feedback Banner */}
                {voucherFeedbackMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                    <span>{voucherFeedbackMsg}</span>
                    <button
                      type="button"
                      onClick={() => setVoucherFeedbackMsg(null)}
                      className="text-emerald-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* FREE PLAY MODE & PRICE PER LAYOUT CONFIGURATION */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Free Play Mode (Open Event Pass)
                        </h3>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            localConfig.freePlayMode
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {localConfig.freePlayMode ? 'FREE PLAY ACTIVE' : 'VOUCHER REQUIRED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        When enabled, guests bypass the voucher code screen and can take &amp; print photos freely for open events or parties.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        const nextFreePlay = !localConfig.freePlayMode;
                        const updated: RemoteKioskConfig = {
                          ...localConfig,
                          freePlayMode: nextFreePlay,
                        };
                        setLocalConfig(updated);
                        await remoteConfigService.updateConfig(updated);
                        onUpdateConfig(updated);
                        setVoucherFeedbackMsg(
                          nextFreePlay
                            ? 'Free Play Mode enabled — guests can print without a voucher code.'
                            : 'Free Play Mode disabled — guests must enter a single-use layout voucher.'
                        );
                      }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition shrink-0 cursor-pointer ${
                        localConfig.freePlayMode
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {localConfig.freePlayMode
                          ? 'Disable Free Play Mode'
                          : 'Enable Free Play Mode'}
                      </span>
                    </button>
                  </div>

                  {/* Price Per Layout Editor */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-bold text-white">
                            Price Per Layout (&quot;Pick your layout&quot; Screen)
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Edit the price displayed on each layout card and cashier voucher. Auto-saves immediately.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          { id: 'single_polaroid' as FrameLayoutType, label: 'Polaroid (1 shot)', fallback: 20 },
                          { id: 'grid_4' as FrameLayoutType, label: 'Grid (2 shots)', fallback: 25 },
                          { id: 'strip_3' as FrameLayoutType, label: 'Grid (3 shots)', fallback: 30 },
                          { id: 'strip_4' as FrameLayoutType, label: '4-Cut Strip (4 shots)', fallback: 40 },
                        ]
                      ).map((item) => {
                        const priceVal = localConfig.layoutPrices?.[item.id] ?? item.fallback;
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5"
                          >
                            <label className="text-[11px] font-bold text-slate-300">
                              {item.label}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                {localConfig.currencySymbol || 'P'}
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={priceVal}
                                onChange={(e) =>
                                  handleUpdateLayoutPrice(item.id, Number(e.target.value))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Summary Counters */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Available for Cashier</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{availableVouchers.length}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Ready to hand to customers</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Redeemed / Used</div>
                    <div className="text-2xl font-black text-amber-400 mt-1">{usedVouchers.length}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Already used at photobooth</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Total Stored Offline</div>
                    <div className="text-2xl font-black text-white mt-1">{vouchers.length}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">100% Offline Ready</div>
                  </div>
                </div>

                {/* CASHIER BATCH VOUCHER GENERATOR */}
                <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/30 border border-pink-500/30 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-pink-400" />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Cashier Single-Use Layout Voucher Generator
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Issue single-use layout vouchers based on customer choice (<strong className="text-white">1-Shot, 2-Shot, 3-Shot, or 4-Shot</strong>). <strong className="text-amber-300">1 Voucher = 1 Print Copy</strong>. Once redeemed at the kiosk, the voucher is automatically marked as <strong className="text-rose-400">SPENT / USED</strong>.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>1 Voucher = 1 Copy</span>
                    </span>
                  </div>

                  {/* Step 1: Select Layout Type (1-Shot, 2-Shot, 3-Shot, 4-Shot) */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-300 font-bold block">
                      1. Choose Layout Type for Voucher Batch:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(
                        [
                          'single_polaroid',
                          'grid_4',
                          'strip_3',
                          'strip_4',
                        ] as FrameLayoutType[]
                      ).map((lType) => {
                        const meta = LAYOUT_VOUCHER_META[lType];
                        const price = localConfig.layoutPrices?.[lType] ?? meta.defaultPrice;
                        const active = batchLayoutType === lType;
                        return (
                          <button
                            key={lType}
                            type="button"
                            onClick={() => {
                              soundEffects.playTap();
                              setBatchLayoutType(lType);
                              setBatchPrefix(meta.prefix);
                              setBatchMaxUses(1);
                              setBatchLabel(`${meta.label} • 1 Print Copy`);
                            }}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              active
                                ? 'bg-pink-600/25 border-pink-400 text-white shadow-md'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{meta.label}</span>
                              <span className="font-mono text-emerald-400">P{price}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Prefix: {meta.prefix}-XXXX • 1 Copy
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Quantity Presets */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">2. Quick Quantity:</span>
                    {[1, 5, 10, 20, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          soundEffects.playTap();
                          setBatchCount(preset);
                        }}
                        className={`px-3 py-1 rounded-lg border font-mono font-bold transition cursor-pointer ${
                          batchCount === preset
                            ? 'bg-pink-600 border-pink-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {preset} {preset === 1 ? 'Voucher' : 'Vouchers'}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={handleGenerateCashierBatch}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end text-xs pt-1"
                  >
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        How Many Vouchers?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-pink-500/40 text-white font-mono font-bold text-sm focus:outline-none focus:border-pink-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Code Prefix</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={batchPrefix}
                        onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                        placeholder="3S"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Batch Note / Label</label>
                      <input
                        type="text"
                        value={batchLabel}
                        onChange={(e) => setBatchLabel(e.target.value)}
                        placeholder="3-Shot (Grid) • 1 Print Copy"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Generate {batchCount} ({LAYOUT_VOUCHER_META[batchLayoutType].shortLabel})
                      </span>
                    </button>
                  </form>
                </div>

                {/* CASHIER VOUCHER SHEET (FOR PRINTING / COPYING / GIVING TO CUSTOMERS) */}
                {sheetVouchers.length > 0 && (
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Scroll className="w-4 h-4 text-amber-400" />
                          <span>
                            {lastGeneratedBatch.length > 0
                              ? `Newly Generated Cashier Batch (${sheetVouchers.length} Vouchers)`
                              : `Cashier Single-Use Vouchers (${sheetVouchers.length} Available)`}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Print, download, or copy these codes for the cashier to hand out after receiving customer payment.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              sheetVouchers
                                .filter((v) => !isVoucherUsed(v))
                                .map((v) => v.code)
                                .join('\n'),
                              'ALL'
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {copiedCode === 'ALL' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>Copy Unused Codes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadVouchersList(
                              sheetVouchers.filter((v) => !isVoucherUsed(v))
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Download .TXT Sheet</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPrintingVouchers}
                          onClick={() =>
                            handlePrintCashierSlipsThermal(
                              sheetVouchers.filter((v) => !isVoucherUsed(v))
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>
                            {isPrintingVouchers ? 'Printing Slips...' : 'Print on Thermal Printer'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTicketSheet(!showTicketSheet)}
                          className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium transition cursor-pointer"
                        >
                          {showTicketSheet ? 'Hide Ticket Grid' : 'Show Ticket Grid'}
                        </button>
                      </div>
                    </div>

                    {showTicketSheet && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 max-h-96 overflow-y-auto pr-1">
                        {sheetVouchers.map((v, idx) => {
                          const used = isVoucherUsed(v);
                          return (
                            <div
                              key={v.code}
                              onClick={() => handleCopyText(v.code, v.code)}
                              title="Tap to copy voucher code"
                              className={`p-3 rounded-xl border-2 border-dashed flex flex-col justify-between transition cursor-pointer select-all ${
                                used
                                  ? 'border-slate-800 bg-slate-950/40 opacity-50'
                                  : 'border-amber-500/40 bg-slate-950 hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>#{idx + 1}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                    used
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  }`}
                                >
                                  {used ? 'USED' : 'VALID'}
                                </span>
                              </div>

                              <div
                                className={`text-center font-mono font-black text-base tracking-wider my-1 ${
                                  used ? 'line-through text-slate-500' : 'text-white'
                                }`}
                              >
                                {v.code}
                              </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1">
                                  <span>
                                    {v.layoutType
                                      ? `${LAYOUT_VOUCHER_META[v.layoutType].shortLabel} • P${
                                          localConfig.layoutPrices?.[v.layoutType] ??
                                          LAYOUT_VOUCHER_META[v.layoutType].defaultPrice
                                        }`
                                      : `1 Print Copy`}
                                  </span>
                                  <span className="font-mono">
                                    {v.usedCount}/{v.maxUses > 0 ? v.maxUses : '∞'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                {/* Create single custom voucher card */}
                <form
                  onSubmit={handleAddVoucher}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap gap-3 items-end text-xs"
                >
                  <div>
                    <label className="text-slate-400 block mb-1">Custom Promo Code</label>
                    <input
                      type="text"
                      value={newVoucherCode}
                      onChange={(e) => setNewVoucherCode(e.target.value)}
                      placeholder="E.g. VIP2026"
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Discount %</label>
                    <input
                      type="number"
                      value={newVoucherDiscount}
                      onChange={(e) => setNewVoucherDiscount(Number(e.target.value))}
                      className="w-20 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Max Uses</label>
                    <input
                      type="number"
                      value={newVoucherMaxUses}
                      onChange={(e) => setNewVoucherMaxUses(Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-slate-400 block mb-1">Description</label>
                    <input
                      type="text"
                      value={newVoucherDesc}
                      onChange={(e) => setNewVoucherDesc(e.target.value)}
                      placeholder="Event VIP multi-use pass"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Code</span>
                  </button>
                </form>

                {/* Existing & Generated Vouchers List with Filter & Search */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setVoucherFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          voucherFilter === 'all'
                            ? 'bg-pink-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        All ({vouchers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoucherFilter('available')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          voucherFilter === 'available'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Available ({availableVouchers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoucherFilter('used')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          voucherFilter === 'used'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Used ({usedVouchers.length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={voucherSearch}
                        onChange={(e) => setVoucherSearch(e.target.value)}
                        placeholder="Search code..."
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono uppercase focus:outline-none focus:border-slate-600"
                      />
                      {usedVouchers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearUsedVouchers}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Used</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs max-h-96 overflow-y-auto pr-1">
                    {filteredVouchers.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                        No vouchers match the selected filter.
                      </div>
                    ) : (
                      filteredVouchers.map((v) => {
                        const used = isVoucherUsed(v);
                        return (
                          <div
                            key={v.code}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              used
                                ? 'bg-slate-950/50 border-slate-800/60 opacity-60'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-mono font-bold text-sm tracking-wider ${
                                  used ? 'line-through text-slate-500' : 'text-pink-400'
                                }`}
                              >
                                {v.code}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  used
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                }`}
                              >
                                {used ? 'USED' : 'AVAILABLE'}
                              </span>
                              <span className="text-slate-400 truncate max-w-[200px]">
                                {v.description}
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3">
                              {v.lastUsedAt && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Used {new Date(v.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <span className="text-emerald-400 font-bold">{v.discountPercent}% Off</span>
                              <span className="text-slate-400 font-mono">
                                {v.usedCount} / {v.maxUses > 0 ? v.maxUses : '∞'} used
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(v.code, v.code)}
                                title="Copy Code"
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                              >
                                {copiedCode === v.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleVoucher(v.code)}
                                title="Delete Voucher"
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 5: Capture Archive & Offline Queue */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Offline Email Queue Flush Bar */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">Offline Email Delivery Queue: </span>
                  <span className="text-amber-400">{queuedEmails.filter((q) => q.status === 'queued').length} pending</span>
                </div>
                <button
                  onClick={handleForceFlushEmailQueue}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Force Sync Now
                </button>
              </div>

              {/* Past Captures Grid */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-300 mb-3">
                  Local Capture History ({captures.length} saved sessions)
                </h4>
                {captures.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">No captures saved yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {captures.map((cap) => (
                      <div
                        key={cap.id}
                        className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-between"
                      >
                        <img src={cap.compositeDataUrl} alt="Photostrip" className="w-full h-36 object-contain" />
                        <div className="p-2 border-t border-slate-800 text-[10px] text-slate-400 truncate">
                          {new Date(cap.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
