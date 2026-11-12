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
  Lock,
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
  Zap,
  Sparkles,
  Film,
  Upload,
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
  ThermalPrinterConfig,
  FrontScreenMediaConfig,
  FrontScreenMediaType,
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

  const [activeTab, setActiveTab] = useState<'printer' | 'vouchers' | 'frontscreen' | 'gallery' | 'config' | 'analytics'>('printer');
  const [telemetry, setTelemetry] = useState<KioskTelemetry>(analyticsService.getTelemetry());
  const [printerStatus, setPrinterStatus] = useState<PrinterDeviceStatus>(thermalPrinterService.getStatus());
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [captures, setCaptures] = useState<PhotostripResult[]>([]);

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
  const [batchPrefix, setBatchPrefix] = useState<string>('3');
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
  const [customHeaderStatusMsg, setCustomHeaderStatusMsg] = useState<string | null>(null);
  const customHeaderFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showResetStatsPrompt, setShowResetStatsPrompt] = useState(false);
  const [resetStatsPassword, setResetStatsPassword] = useState('');
  const [resetStatsError, setResetStatsError] = useState(false);
  const [resetStatsSuccessMsg, setResetStatsSuccessMsg] = useState<string | null>(null);

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

  const handleConfirmResetStats = async (e?: React.FormEvent) => {
    e?.preventDefault();
    soundEffects.playTap();
    if (resetStatsPassword.trim() === 'j@n27') {
      const fresh = await analyticsService.resetStats();
      setTelemetry(fresh);
      setResetStatsPassword('');
      setResetStatsError(false);
      setShowResetStatsPrompt(false);
      setResetStatsSuccessMsg('✓ Stats reset to zero.');
      soundEffects.playSuccessChime();
      setTimeout(() => setResetStatsSuccessMsg(null), 3500);
    } else {
      setResetStatsError(true);
      setResetStatsPassword('');
    }
  };

  const handleSaveConfig = async () => {
    soundEffects.playTap();
    const updated = await remoteConfigService.updateConfig(localConfig);
    onUpdateConfig(updated);
    setSaveSuccessMsg('Configuration saved successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const updateCustomHeaderConfig = async (
    patch: Partial<ThermalPrinterConfig>,
    feedbackMsg?: string
  ) => {
    const updated: RemoteKioskConfig = {
      ...localConfig,
      thermalPrinter: {
        ...localConfig.thermalPrinter,
        ...patch,
      },
    };
    setLocalConfig(updated);
    await remoteConfigService.updateConfig(updated);
    onUpdateConfig(updated);
    if (feedbackMsg) {
      setCustomHeaderStatusMsg(feedbackMsg);
      setTimeout(() => setCustomHeaderStatusMsg(null), 3500);
    }
  };

  const handleCustomHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundEffects.playTap();

    try {
      const processedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const nw = img.naturalWidth || img.width || 300;
            const nh = img.naturalHeight || img.height || 120;
            const maxW = 540;
            const maxH = 220;
            const ratio = Math.min(maxW / nw, maxH / nh, 2);
            const targetW = Math.max(32, Math.round(nw * ratio));
            const targetH = Math.max(32, Math.round(nh * ratio));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(reader.result as string);
              return;
            }

            // Fill pure white receipt background so transparent PNG logos never turn black
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);

            // Convert to high-contrast thermal monochrome for crisp receipt printing
            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const contrasted = Math.max(0, Math.min(255, Math.round((lum - 128) * 1.2 + 128)));
              d[i] = contrasted;
              d[i + 1] = contrasted;
              d[i + 2] = contrasted;
              d[i + 3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
          };
          img.onerror = () => reject(new Error('Invalid image'));
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });

      await updateCustomHeaderConfig(
        {
          customHeaderEnabled: true,
          customHeaderImageUrl: processedDataUrl,
        },
        '✓ Custom header image uploaded & added to the top of every printed receipt!'
      );
      soundEffects.playSuccessChime();
    } catch {
      setCustomHeaderStatusMsg('Could not process image. Please upload a PNG or JPG image.');
      setTimeout(() => setCustomHeaderStatusMsg(null), 3500);
    }

    e.target.value = '';
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

    const numericCode = newVoucherCode.replace(/\D/g, '');
    if (!numericCode) return;

    const voucher: Voucher = {
      code: numericCode,
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

    // Map darkness (5..100) to physical print head gamma (0.52 = max shadow lift for light print .. 1.05 = deep burn)
    const mappedGamma = Number(
      Math.max(0.48, Math.min(1.15, 0.52 + (clampedDarkness / 100) * 0.48)).toFixed(2)
    );

    const updated: RemoteKioskConfig = {
      ...localConfig,
      thermalPrinter: {
        ...localConfig.thermalPrinter,
        printDarkness: clampedDarkness,
        brightness: mappedBrightness,
        contrast: mappedContrast,
        gamma: mappedGamma,
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
    const activeGamma = (localConfig.thermalPrinter.gamma ?? 0.68).toFixed(2);
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
      `DARKNESS: ${activeDarkness}% • GAMMA: γ=${activeGamma} (${activeDensity})`,
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

  // PIN Lock Authentication Modal
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center text-zinc-900"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Admin Access</h2>
          <p className="text-xs text-zinc-500 mb-5">Enter security PIN to unlock settings</p>

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
            className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:outline-none rounded-xl text-center tracking-widest text-base font-mono text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal placeholder:text-xs mb-4"
          />

          {pinError && (
            <div className="text-xs text-zinc-900 font-semibold mb-3 flex items-center gap-1 bg-zinc-100 border border-zinc-300 px-3 py-1.5 rounded-lg">
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
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs active:scale-98 transition cursor-pointer"
            >
              Unlock
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      data-admin-scrollable="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-6 select-none animate-fadeIn"
    >
      <div className="relative w-full max-w-5xl bg-[#faf8f5] border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh] text-zinc-900">
        {/* Minimalist Admin Header */}
        <div className="px-5 py-3.5 bg-white border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-900 tracking-tight">Admin</h1>
              <span className="text-[11px] text-zinc-400 font-mono">
                • {config.locationName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-no-fullscreen-enforce="true"
              onClick={handleToggleFullscreenKiosk}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                isFullscreenLocked
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {isFullscreenLocked ? (
                <>
                  <Minimize className="w-3.5 h-3.5" />
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                setIsAuthenticated(false);
              }}
              title="Lock Admin"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Monochrome Tab Navigation */}
        <div className="flex items-center gap-1 px-5 py-2 bg-white border-b border-zinc-200 overflow-x-auto text-xs">
          {[
            { id: 'printer', label: 'Printer', icon: Printer },
            { id: 'vouchers', label: 'Prices & Vouchers', icon: Ticket },
            { id: 'frontscreen', label: 'Home Screen', icon: Sparkles },
            { id: 'gallery', label: 'Photos', icon: ImageIcon },
            { id: 'config', label: 'Settings', icon: Sliders },
            { id: 'analytics', label: 'Stats', icon: BarChart3 },
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
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-zinc-900 space-y-4">
          {/* TAB: Stats */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              {/* Top Key Metrics Grid (Paper Roll Level removed + Reset Stats with Password Prompt) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                  <div className="text-xs text-zinc-500 font-medium mb-1">Total Photo Sessions</div>
                  <div className="text-2xl font-bold text-zinc-900">{telemetry.totalSessions}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">Avg time: {telemetry.averageSessionDurationSec}s</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                  <div className="text-xs text-zinc-500 font-medium mb-1">Thermal Strips Printed</div>
                  <div className="text-2xl font-bold text-zinc-900">{telemetry.totalPrints}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {telemetry.lastPrintTimestamp ? 'Last: Just now' : 'Standby'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                  <div className="text-xs text-zinc-500 font-medium mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {config.currencySymbol}{telemetry.totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">Vouchers & Sessions</div>
                </div>

                {/* Reset Stats Card with Password-Only Prompt */}
                <div className="p-4 rounded-xl bg-white border border-zinc-200 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-zinc-500 font-medium mb-1">Reset All Stats</div>
                    <div className="text-[11px] text-zinc-400">
                      Clear sessions, prints &amp; revenue
                    </div>
                  </div>

                  {!showResetStatsPrompt ? (
                    <div className="mt-3 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playTap();
                          setShowResetStatsPrompt(true);
                          setResetStatsError(false);
                          setResetStatsPassword('');
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Stats</span>
                      </button>
                      {resetStatsSuccessMsg && (
                        <div className="text-[11px] text-zinc-700 font-medium text-center">
                          {resetStatsSuccessMsg}
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleConfirmResetStats} className="mt-2 space-y-2">
                      <input
                        type="password"
                        autoFocus
                        value={resetStatsPassword}
                        onChange={(e) => {
                          setResetStatsPassword(e.target.value);
                          if (resetStatsError) setResetStatsError(false);
                        }}
                        placeholder="Enter password"
                        className={`w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border text-zinc-900 text-xs font-mono focus:outline-none ${
                          resetStatsError
                            ? 'border-zinc-900'
                            : 'border-zinc-200 focus:border-zinc-900'
                        }`}
                      />
                      {resetStatsError && (
                        <div className="text-[10px] text-zinc-900 font-semibold">
                          Incorrect password
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[11px] transition cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playTap();
                            setShowResetStatsPrompt(false);
                            setResetStatsError(false);
                            setResetStatsPassword('');
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Hardware Health & Telemetry Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Device &amp; Hardware Status</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Printer Connection</span>
                      <span className="font-semibold text-zinc-900 capitalize">{printerStatus.connectionType} ({printerStatus.deviceName})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-500">Network Status</span>
                      <span className="font-semibold text-zinc-900">{telemetry.isOnline ? 'Online' : 'Offline Mode'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Tablet Battery Level</span>
                      <span className="font-semibold text-zinc-900">{telemetry.deviceBatteryLevel || 100}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Popular Frame Themes</h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(telemetry.popularFrames).length === 0 ? (
                      <div className="text-zinc-400 py-2">No sessions recorded yet.</div>
                    ) : (
                      Object.entries(telemetry.popularFrames).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
                          <span className="text-zinc-700 capitalize">{k.replace('_', ' ')}</span>
                          <span className="font-mono text-zinc-500">{v} sessions</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Front Screen & Event Media Editor */}
          {activeTab === 'frontscreen' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">Home Screen &amp; Event Media</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Customize welcome screen photos, occasion themes, and background media.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {saveSuccessMsg && (
                    <span className="text-xs text-zinc-600 font-medium">{saveSuccessMsg}</span>
                  )}
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>

              {/* Home Screen 3-Strips Photo Showcase & Shuffling */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Home Screen Strip Photos
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Upload and manage the photos showcased inside the 3 strips on the welcome screen.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isProcessingPhotos ? 'Processing...' : homeStripPhotos.length > 0 ? 'Replace Photos' : 'Upload Photos'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingPhotos}
                      onClick={() => {
                        setTargetSlotIndex(homeStripPhotos.length);
                        adminFileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium border border-zinc-200 transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdminShuffle}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium border border-zinc-200 transition cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle</span>
                    </button>

                    {homeStripPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAdminResetPhotos}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium border border-zinc-200 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {homePhotoStatusMsg && (
                  <div className="text-xs text-zinc-800 bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    <span>{homePhotoStatusMsg}</span>
                  </div>
                )}

                <div>
                  <div className="text-[11px] text-zinc-500 font-medium mb-2 flex items-center justify-between">
                    <span>
                      Active Photos ({homeStripPhotos.length > 0 ? `${homeStripPhotos.length} custom` : 'Default gallery'}):
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      TAP PHOTO TO REPLACE
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
                    {(homeStripPhotos.length > 0 ? homeStripPhotos : DEFAULT_BOOTH_SAMPLES).map((url, i) => (
                      <div
                        key={i}
                        className="group relative w-20 h-26 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0 transition hover:border-zinc-900"
                      >
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSlotIndex(i);
                              adminFileInputRef.current?.click();
                            }}
                            className="px-2 py-0.5 rounded bg-white text-zinc-900 text-[10px] font-semibold cursor-pointer w-full text-center"
                          >
                            Replace
                          </button>
                          {homeStripPhotos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAdminDeletePhoto(i)}
                              className="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-semibold cursor-pointer w-full text-center"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white pointer-events-none">
                          #{i + 1}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setTargetSlotIndex(homeStripPhotos.length);
                        adminFileInputRef.current?.click();
                      }}
                      className="w-20 h-26 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-900 bg-zinc-50 hover:bg-zinc-100 flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-900 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-medium">Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Home Screen Occasion Themes */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Occasion Themes
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Select an occasion style for the home screen strips and start button.
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-700 font-mono bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md shrink-0">
                    Active: {getAttractThemeById(activeAttractTheme).name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {ATTRACT_OCCASION_THEMES.map((occ) => {
                    const isSelected = activeAttractTheme === occ.id;
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => handleSelectOccasionTheme(occ.id)}
                        className={`relative p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 text-zinc-900'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs leading-tight">
                            {occ.shortLabel}
                          </div>
                          <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {occ.heroTitle}
                          </div>
                        </div>
                        <div className={`text-[10px] font-mono uppercase ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          {isSelected ? '✓ Selected' : 'Select'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Information & Operation Rules */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">Event Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-500 block mb-1">Event Title</label>
                    <input
                      type="text"
                      value={localConfig.eventTitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                      placeholder="E.g. Studio Capture"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1">Subtitle / Tagline</label>
                    <input
                      type="text"
                      value={localConfig.eventSubtitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventSubtitle: e.target.value })}
                      placeholder="E.g. Touch screen to begin"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1">Location / Venue Name</label>
                    <input
                      type="text"
                      value={localConfig.locationName}
                      onChange={(e) => setLocalConfig({ ...localConfig, locationName: e.target.value })}
                      placeholder="E.g. Main Hall"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1">Event Hashtag / Date</label>
                    <input
                      type="text"
                      value={localConfig.eventHashtag}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventHashtag: e.target.value })}
                      placeholder="#PhotoBooth"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Free Play Mode toggle */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig.freePlayMode}
                        onChange={(e) => setLocalConfig({ ...localConfig, freePlayMode: e.target.checked })}
                        className="rounded accent-zinc-900"
                      />
                      <span className="font-semibold">Free Play Mode (No Voucher Required)</span>
                    </label>
                    <p className="text-[11px] text-zinc-500 mt-0.5 ml-5">
                      Bypasses voucher code prompts so event guests can capture and print freely.
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded text-[10px] font-mono uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {localConfig.freePlayMode ? 'Free Play' : 'Voucher Mode'}
                  </span>
                </div>
              </div>

              {/* Front Screen Media (GIF, Canva Video, MP4) */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Front Screen Video / GIF Media
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Optional looping video, GIF, or Canva embed on the welcome screen
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateFrontMedia({
                        enabled: !(localConfig.frontScreenMedia?.enabled ?? false),
                        mediaType: localConfig.frontScreenMedia?.mediaType === 'none' ? 'gif' : (localConfig.frontScreenMedia?.mediaType || 'gif'),
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition border cursor-pointer ${
                      localConfig.frontScreenMedia?.enabled
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {localConfig.frontScreenMedia?.enabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Media Format Type */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { type: 'video' as const, label: 'Video (MP4/WebM)', icon: VideoIcon },
                    { type: 'gif' as const, label: 'Animated GIF', icon: ImageIcon },
                    { type: 'canva_embed' as const, label: 'Canva Embed', icon: Sparkles },
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
                        className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 cursor-pointer ${
                          isSel
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-xs truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Upload File</div>
                      <div className="text-[11px] text-zinc-500">MP4, WebM, or GIF</div>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 text-xs font-medium transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,image/gif,image/webp"
                        onChange={handleMediaFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-900">Direct URL / Canva Link</span>
                      <button
                        type="button"
                        onClick={() => setShowCanvaHelp(!showCanvaHelp)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Help</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={localConfig.frontScreenMedia?.url || canvaInputText}
                      onChange={(e) => handleCanvaInput(e.target.value)}
                      placeholder="Paste MP4, GIF, or Canva link..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Printer */}
          {activeTab === 'printer' && (
            <div className="space-y-4">
              {/* #1 TOP CARD: VOZY G80 RECEIPT PRINTER */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider">
                        Default
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                        VOZY G80 Receipt Printer (80mm • Bluetooth &amp; USB)
                      </h3>
                      {(localConfig.thermalPrinter.printerModel || 'vozy_g80') === 'vozy_g80' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      80mm Print Width (576 dots/line) • Continuous Printing • Automatic Paper Cut
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          printerModel: 'vozy_g80',
                          paperWidthMm: 80,
                          dotsPerLine: 576,
                          contrast: 40,
                          brightness: 45,
                          printDarkness: 38,
                          density: 'normal',
                          escPosCommandMode: 'gs_v_0',
                          feedLines: 5,
                          autoCut: true,
                          buzzerReminder: false,
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      setTestPrintFeedback(
                        '✓ VOZY G80 (80mm) set as Default Printer with continuous printing and auto-cut.'
                      );
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply VOZY G80 Defaults</span>
                  </button>
                </div>

                {/* Quick Connect Buttons for VOZY G80 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          connectionType: 'bluetooth',
                          printerModel: 'vozy_g80',
                          paperWidthMm: 80,
                          dotsPerLine: 576,
                          feedLines: 5,
                          autoCut: true,
                          buzzerReminder: Boolean(localConfig.thermalPrinter.buzzerReminder),
                          escPosCommandMode: 'gs_v_0',
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      await thermalPrinterService.connectBluetooth();
                    }}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                      (localConfig.thermalPrinter.printerModel || 'vozy_g80') === 'vozy_g80' &&
                      printerStatus.connectionType === 'bluetooth' &&
                      printerStatus.isConnected
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">1. Connect Bluetooth</div>
                      <div className="text-[11px] opacity-70 mt-0.5">
                        Wireless VOZY G80
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      const updated: RemoteKioskConfig = {
                        ...localConfig,
                        thermalPrinter: {
                          ...localConfig.thermalPrinter,
                          connectionType: 'usb',
                          printerModel: 'vozy_g80',
                          paperWidthMm: 80,
                          dotsPerLine: 576,
                          feedLines: 5,
                          autoCut: true,
                          buzzerReminder: Boolean(localConfig.thermalPrinter.buzzerReminder),
                          escPosCommandMode: 'gs_v_0',
                        },
                      };
                      setLocalConfig(updated);
                      await remoteConfigService.updateConfig(updated);
                      onUpdateConfig(updated);
                      await thermalPrinterService.connectUSB();
                    }}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                      (localConfig.thermalPrinter.printerModel || 'vozy_g80') === 'vozy_g80' &&
                      printerStatus.connectionType === 'usb' &&
                      printerStatus.isConnected
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">2. Connect USB Cable</div>
                      <div className="text-[11px] opacity-70 mt-0.5">
                        Direct USB / OTG
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    disabled={isTestPrinting}
                    onClick={handleTestPrint}
                    className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-zinc-400 text-left transition cursor-pointer flex items-center justify-between text-zinc-900 disabled:opacity-50"
                  >
                    <div>
                      <div className="font-semibold text-xs">
                        {isTestPrinting ? 'Printing Test...' : '3. Test Print'}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        80mm calibration slip
                      </div>
                    </div>
                    <Printer className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                  </button>
                </div>

                {/* VOZY G80 Hardware Feature Toggles & Profile Switcher */}
                <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        const updated: RemoteKioskConfig = {
                          ...localConfig,
                          thermalPrinter: {
                            ...localConfig.thermalPrinter,
                            autoCut: !localConfig.thermalPrinter.autoCut,
                          },
                        };
                        setLocalConfig(updated);
                        await remoteConfigService.updateConfig(updated);
                        onUpdateConfig(updated);
                      }}
                      className={`px-2.5 py-1 rounded-md border font-mono font-semibold text-[11px] transition cursor-pointer ${
                        localConfig.thermalPrinter.autoCut
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Auto Cut: {localConfig.thermalPrinter.autoCut ? 'ON' : 'OFF'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        soundEffects.playTap();
                        const nextVal = !Boolean(localConfig.thermalPrinter.buzzerReminder);
                        const updated: RemoteKioskConfig = {
                          ...localConfig,
                          thermalPrinter: {
                            ...localConfig.thermalPrinter,
                            buzzerReminder: nextVal,
                          },
                        };
                        setLocalConfig(updated);
                        await remoteConfigService.updateConfig(updated);
                        onUpdateConfig(updated);
                      }}
                      className={`px-2.5 py-1 rounded-md border font-mono font-semibold text-[11px] transition cursor-pointer ${
                        Boolean(localConfig.thermalPrinter.buzzerReminder)
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Buzzer: {Boolean(localConfig.thermalPrinter.buzzerReminder) ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Printer Model Selector */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-zinc-400 font-mono text-[11px]">Model:</span>
                    {(
                      [
                        { id: 'vozy_g80', label: 'VOZY G80 (80mm)' },
                        { id: 'xprinter_58iib', label: 'Xprinter 58iiB (58mm)' },
                        { id: 'kprinter_461a', label: 'MP58-09 (58mm)' },
                        { id: 'epson_80mm', label: '80mm POS' },
                      ] as const
                    ).map((modelItem) => {
                      const activeModel =
                        (localConfig.thermalPrinter.printerModel || 'vozy_g80') === modelItem.id;
                      return (
                        <button
                          key={modelItem.id}
                          type="button"
                          onClick={async () => {
                            soundEffects.playTap();
                            const is80 = modelItem.id === 'vozy_g80' || modelItem.id === 'epson_80mm';
                            const updated: RemoteKioskConfig = {
                              ...localConfig,
                              thermalPrinter: {
                                ...localConfig.thermalPrinter,
                                printerModel: modelItem.id,
                                paperWidthMm: is80 ? 80 : 58,
                                dotsPerLine: is80 ? 576 : 384,
                                feedLines: modelItem.id === 'vozy_g80' ? 5 : modelItem.id === 'xprinter_58iib' ? 6 : 4,
                                autoCut: is80 || modelItem.id === 'xprinter_58iib',
                                buzzerReminder: false,
                              },
                            };
                            setLocalConfig(updated);
                            await remoteConfigService.updateConfig(updated);
                            onUpdateConfig(updated);
                          }}
                          className={`px-2.5 py-1 rounded-md border font-mono font-semibold text-[11px] transition cursor-pointer ${
                            activeModel
                              ? 'bg-zinc-900 border-zinc-900 text-white'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          {modelItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* #2 CUSTOM RECEIPT HEADER (IMAGE / LOGO & TEXT) */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold uppercase">
                        Receipt Header
                      </span>
                      <h3 className="text-sm font-bold text-zinc-900">
                        Custom Receipt Header (Image &amp; Text)
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Upload a custom logo/image or enter header text to automatically print at the top of every receipt.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        const nextEnabled = localConfig.thermalPrinter.customHeaderEnabled === false;
                        updateCustomHeaderConfig(
                          { customHeaderEnabled: nextEnabled },
                          nextEnabled
                            ? '✓ Custom receipt header enabled'
                            : 'Custom receipt header paused'
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-mono font-semibold text-xs transition cursor-pointer ${
                        localConfig.thermalPrinter.customHeaderEnabled !== false
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {localConfig.thermalPrinter.customHeaderEnabled !== false
                        ? '✓ Header: ON'
                        : 'Header: OFF'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Left Controls: Image Upload + Header Text Inputs + Alignment & Size */}
                  <div className="lg:col-span-7 space-y-3">
                    {/* 1. Custom Header Image Upload */}
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-700" />
                            <span>1. Custom Header Image / Logo</span>
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            PNG, JPG, or WEBP — auto-formatted to thermal monochrome
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            ref={customHeaderFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCustomHeaderImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.playTap();
                              customHeaderFileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {localConfig.thermalPrinter.customHeaderImageUrl
                                ? 'Change Image'
                                : 'Upload Image'}
                            </span>
                          </button>

                          {localConfig.thermalPrinter.customHeaderImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playTap();
                                updateCustomHeaderConfig(
                                  { customHeaderImageUrl: '' },
                                  'Removed custom header image'
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Custom Header Text & Subtitle */}
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-zinc-900">
                          2. Custom Header Text (Main Title)
                        </label>
                        <input
                          type="text"
                          value={localConfig.thermalPrinter.customHeaderText || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalConfig((prev) => ({
                              ...prev,
                              thermalPrinter: {
                                ...prev.thermalPrinter,
                                customHeaderEnabled: true,
                                customHeaderText: val,
                              },
                            }));
                          }}
                          onBlur={() =>
                            updateCustomHeaderConfig(
                              {
                                customHeaderEnabled: true,
                                customHeaderText: localConfig.thermalPrinter.customHeaderText || '',
                              },
                              '✓ Saved custom receipt header text'
                            )
                          }
                          placeholder="e.g. OFFICIAL PHOTO RECEIPT"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-zinc-700">
                          3. Header Subtext / Line 2 (Optional)
                        </label>
                        <input
                          type="text"
                          value={localConfig.thermalPrinter.customHeaderSubtext || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalConfig((prev) => ({
                              ...prev,
                              thermalPrinter: {
                                ...prev.thermalPrinter,
                                customHeaderEnabled: true,
                                customHeaderSubtext: val,
                              },
                            }));
                          }}
                          onBlur={() =>
                            updateCustomHeaderConfig(
                              {
                                customHeaderEnabled: true,
                                customHeaderSubtext:
                                  localConfig.thermalPrinter.customHeaderSubtext || '',
                              },
                              '✓ Saved custom receipt header subtext'
                            )
                          }
                          placeholder="e.g. Thank you for celebrating with us!"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      {/* Alignment & Font Size Controls */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-zinc-500">Align:</span>
                          {(['left', 'center', 'right'] as const).map((alignOpt) => {
                            const activeAlign =
                              (localConfig.thermalPrinter.customHeaderTextAlign || 'center') ===
                              alignOpt;
                            return (
                              <button
                                key={alignOpt}
                                type="button"
                                onClick={() => {
                                  soundEffects.playTap();
                                  updateCustomHeaderConfig({ customHeaderTextAlign: alignOpt });
                                }}
                                className={`px-2 py-1 rounded border font-mono text-[10px] font-semibold uppercase transition cursor-pointer ${
                                  activeAlign
                                    ? 'bg-zinc-900 border-zinc-900 text-white'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                {alignOpt}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-zinc-500">Size:</span>
                          {(['small', 'medium', 'large'] as const).map((sizeOpt) => {
                            const activeSize =
                              (localConfig.thermalPrinter.customHeaderFontSize || 'medium') ===
                              sizeOpt;
                            return (
                              <button
                                key={sizeOpt}
                                type="button"
                                onClick={() => {
                                  soundEffects.playTap();
                                  updateCustomHeaderConfig({ customHeaderFontSize: sizeOpt });
                                }}
                                className={`px-2 py-1 rounded border font-mono text-[10px] font-semibold uppercase transition cursor-pointer ${
                                  activeSize
                                    ? 'bg-zinc-900 border-zinc-900 text-white'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                {sizeOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {customHeaderStatusMsg && (
                      <div className="text-xs font-medium text-zinc-700">
                        {customHeaderStatusMsg}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Top-of-Receipt Preview */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col items-center space-y-2.5">
                      <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>RECEIPT HEADER PREVIEW</span>
                        <span>{localConfig.thermalPrinter.paperWidthMm || 80}mm</span>
                      </div>

                      <div
                        className={`w-full max-w-[260px] bg-white text-black rounded-t-md shadow-xs px-4 pt-3.5 pb-3 border border-zinc-200 flex flex-col ${
                          (localConfig.thermalPrinter.customHeaderTextAlign || 'center') === 'left'
                            ? 'items-start text-left'
                            : (localConfig.thermalPrinter.customHeaderTextAlign || 'center') ===
                              'right'
                            ? 'items-end text-right'
                            : 'items-center text-center'
                        }`}
                      >
                        {localConfig.thermalPrinter.customHeaderEnabled !== false &&
                        (localConfig.thermalPrinter.customHeaderImageUrl ||
                          localConfig.thermalPrinter.customHeaderText?.trim() ||
                          localConfig.thermalPrinter.customHeaderSubtext?.trim()) ? (
                          <>
                            {localConfig.thermalPrinter.customHeaderImageUrl && (
                              <img
                                src={localConfig.thermalPrinter.customHeaderImageUrl}
                                alt="Custom Receipt Header"
                                className="max-h-18 w-auto object-contain mb-1.5"
                              />
                            )}
                            {localConfig.thermalPrinter.customHeaderText?.trim() && (
                              <div
                                className={`font-black tracking-tight text-black leading-tight break-words w-full ${
                                  localConfig.thermalPrinter.customHeaderFontSize === 'large'
                                    ? 'text-sm'
                                    : localConfig.thermalPrinter.customHeaderFontSize === 'small'
                                    ? 'text-[11px]'
                                    : 'text-xs'
                                }`}
                              >
                                {localConfig.thermalPrinter.customHeaderText}
                              </div>
                            )}
                            {localConfig.thermalPrinter.customHeaderSubtext?.trim() && (
                              <div
                                className={`font-mono font-semibold text-zinc-700 mt-0.5 leading-snug break-words w-full ${
                                  localConfig.thermalPrinter.customHeaderFontSize === 'large'
                                    ? 'text-[11px]'
                                    : 'text-[10px]'
                                }`}
                              >
                                {localConfig.thermalPrinter.customHeaderSubtext}
                              </div>
                            )}
                            <div className="w-full border-b border-dashed border-zinc-400 mt-2 mb-1.5" />
                          </>
                        ) : (
                          <div className="py-2.5 text-[10px] font-mono text-zinc-400 text-center w-full">
                            Upload an image or type header text to preview.
                          </div>
                        )}

                        <div className="w-full py-2 bg-zinc-50 border border-zinc-200 rounded flex flex-col items-center justify-center text-[9px] font-mono text-zinc-400">
                          <span>[ PHOTOSTRIP BODY ]</span>
                        </div>
                      </div>

                      <div className="w-full flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomHeaderConfig(
                              {
                                customHeaderEnabled: true,
                                customHeaderText: localConfig.thermalPrinter.customHeaderText || '',
                                customHeaderSubtext:
                                  localConfig.thermalPrinter.customHeaderSubtext || '',
                              },
                              '✓ Custom receipt header saved!'
                            )
                          }
                          className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          Save Header
                        </button>
                        <button
                          type="button"
                          disabled={isTestPrinting}
                          onClick={handleTestPrint}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isTestPrinting ? 'Printing...' : 'Test Print'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* #3 PRINTOUT DARKNESS CONTROL */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-zinc-700" />
                      <h3 className="text-sm font-bold text-zinc-900">
                        Printout Darkness &amp; Thermal Burn Level
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Lower Darkness (15% – 35%) reduces black thermal ink on faces and shadows.
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-xs px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 shrink-0">
                    Darkness: {localConfig.thermalPrinter.printDarkness ?? 35}%
                  </span>
                </div>

                {/* Darkness Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    {
                      label: 'Ultra Light (15%)',
                      sub: 'Minimal Ink',
                      darkness: 15,
                      density: 'light' as const,
                    },
                    {
                      label: 'Light (35%)',
                      sub: 'Recommended',
                      darkness: 35,
                      density: 'light' as const,
                    },
                    {
                      label: 'Medium (50%)',
                      sub: 'Balanced',
                      darkness: 50,
                      density: 'normal' as const,
                    },
                    {
                      label: 'Dark (70%)',
                      sub: 'High Contrast',
                      darkness: 70,
                      density: 'dark' as const,
                    },
                    {
                      label: 'Extra Dark (90%)',
                      sub: 'Max Burn',
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
                        className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'bg-zinc-900 border-zinc-900 text-white'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <div className="font-semibold text-xs">{preset.label}</div>
                        <div
                          className={`text-[10px] font-mono mt-0.5 ${
                            active ? 'text-zinc-300' : 'text-zinc-400'
                          }`}
                        >
                          {preset.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Fine Printout Darkness Slider */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-mono text-[11px]">
                      Fine Darkness (5% — 100%)
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 text-[11px]">
                      {localConfig.thermalPrinter.printDarkness ?? 35}% • γ={(localConfig.thermalPrinter.gamma ?? 0.68).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePrintDarkness(
                          (localConfig.thermalPrinter.printDarkness ?? 35) - 5
                        )
                      }
                      className="px-2.5 py-1 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-mono text-xs cursor-pointer shrink-0"
                    >
                      -5%
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
                      className="flex-1 accent-zinc-900 cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePrintDarkness(
                          (localConfig.thermalPrinter.printDarkness ?? 35) + 5
                        )
                      }
                      className="px-2.5 py-1 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-mono text-xs cursor-pointer shrink-0"
                    >
                      +5%
                    </button>
                  </div>
                </div>

                {testPrintFeedback && (
                  <div className="text-xs text-zinc-700 font-medium">{testPrintFeedback}</div>
                )}
              </div>

              {/* Universal USB & Wireless Connection */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Printer Connections (USB, Bluetooth &amp; Network)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Connect via USB cable, Bluetooth, Wi-Fi IP, or OS system print dialog.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        printerStatus.isConnected ? 'bg-zinc-900' : 'bg-zinc-300'
                      }`}
                    />
                    <span className="font-mono text-zinc-700">{printerStatus.deviceName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      await thermalPrinterService.connectUSB();
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      printerStatus.connectionType === 'usb' && printerStatus.isConnected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs mb-0.5">USB Cord (Direct / OTG)</div>
                      <div className="text-[11px] opacity-70">
                        Direct USB cable for 58mm/80mm printers
                      </div>
                    </div>
                    <div className="mt-2.5 text-[11px] font-medium flex items-center gap-1">
                      <span>Pair USB</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      soundEffects.playTap();
                      await thermalPrinterService.connectBluetooth();
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      printerStatus.connectionType === 'bluetooth' && printerStatus.isConnected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs mb-0.5">Wireless Bluetooth</div>
                      <div className="text-[11px] opacity-70">
                        Scan &amp; pair Bluetooth thermal printers
                      </div>
                    </div>
                    <div className="mt-2.5 text-[11px] font-medium flex items-center gap-1">
                      <span>Scan Bluetooth</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      thermalPrinterService.useSystemPrinter();
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      printerStatus.connectionType === 'system'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs mb-0.5">System OS Printer</div>
                      <div className="text-[11px] opacity-70">
                        Any installed Windows, Mac, Android, or AirPrint printer
                      </div>
                    </div>
                    <div className="mt-2.5 text-[11px] font-medium flex items-center gap-1">
                      <span>Use System Print</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>

                {/* Paper Width & Virtual Simulator Row */}
                <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Paper Width:</span>
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
                        className={`px-3 py-1 rounded-md border font-mono font-semibold text-xs transition cursor-pointer ${
                          localConfig.thermalPrinter.paperWidthMm === widthMm
                            ? 'bg-zinc-900 border-zinc-900 text-white'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        {widthMm}mm
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        thermalPrinterService.useVirtualPrinter();
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        printerStatus.connectionType === 'virtual'
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      Virtual Simulator
                    </button>
                    <button
                      disabled={isTestPrinting}
                      onClick={handleTestPrint}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestPrinting ? 'Printing...' : 'Print Test Slip'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Full Screen Kiosk-Mode Display & Session Auto-Lock Card */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4 text-zinc-700" />
                      <h3 className="text-sm font-bold text-zinc-900">
                        Full Screen Kiosk Display
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                        {isFullscreenLocked ? 'LOCKED' : 'WINDOWED'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Lock the tablet into fullscreen kiosk display and auto-hide the top navigation bar.
                    </p>
                  </div>

                  <button
                    type="button"
                    data-no-fullscreen-enforce="true"
                    onClick={handleToggleFullscreenKiosk}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    {isFullscreenLocked ? (
                      <>
                        <Minimize className="w-3.5 h-3.5" />
                        <span>Exit Full Screen</span>
                      </>
                    ) : (
                      <>
                        <Maximize className="w-3.5 h-3.5" />
                        <span>Enter Full Screen</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2.5 border-t border-zinc-100">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.autoFullscreenLock !== false}
                      onChange={(e) => handleToggleAutoFullscreenOnSessionStart(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-zinc-900 cursor-pointer"
                    />
                    <span>
                      Auto-lock full screen when a guest starts a session
                    </span>
                  </label>
                </div>
              </div>

              {/* Tablet Endurance & Power Saver Card */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-zinc-700" />
                      <h3 className="text-sm font-bold text-zinc-900">
                        Continuous Kiosk Endurance &amp; Power Saver
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Keeps WakeLock &amp; Bluetooth active, dims screen when idle, and cleans memory after each session.
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
                    className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shrink-0 transition border ${
                      localConfig.tabletEndurance?.enabled !== false
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    {localConfig.tabletEndurance?.enabled !== false
                      ? '✓ Endurance: ON'
                      : 'Endurance: OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] font-mono uppercase text-zinc-400">Battery</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">
                      {powerStatus.batteryLevelPercent !== null
                        ? `${powerStatus.batteryLevelPercent}% ${powerStatus.isCharging ? '(Charging)' : '(Battery)'}`
                        : 'AC Mode'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] font-mono uppercase text-zinc-400">WakeLock</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">
                      {powerStatus.wakeLockActive ? 'Active' : 'Standby'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] font-mono uppercase text-zinc-400">BT Watchdog</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">45s Interval</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] font-mono uppercase text-zinc-400">Uptime</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">
                      {powerStatus.uptimeMinutes}m
                    </div>
                  </div>
                </div>
              </div>

              {/* Kiosk Branding & Security Form */}
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">General Settings &amp; Security PIN</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-500 block mb-1">Event Header Title</label>
                    <input
                      type="text"
                      value={localConfig.eventTitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1">Location / Venue Name</label>
                    <input
                      type="text"
                      value={localConfig.locationName}
                      onChange={(e) => setLocalConfig({ ...localConfig, locationName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1">Admin Security PIN</label>
                    <input
                      type="password"
                      maxLength={16}
                      value={localConfig.passcodeAdminPin}
                      onChange={(e) => setLocalConfig({ ...localConfig, passcodeAdminPin: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig.showAdminInMenu)}
                      onChange={(e) => setLocalConfig({ ...localConfig, showAdminInMenu: e.target.checked })}
                      className="rounded accent-zinc-900"
                    />
                    <span>Show &quot;Admin&quot; button in top menu bar (or tap logo 4x to open)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {saveSuccessMsg && <span className="text-xs text-zinc-600">{saveSuccessMsg}</span>}
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Vouchers & Cashier Batch Generator */}
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
              <div className="space-y-4">
                {/* Feedback Banner */}
                {voucherFeedbackMsg && (
                  <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-medium flex items-center justify-between">
                    <span>{voucherFeedbackMsg}</span>
                    <button
                      type="button"
                      onClick={() => setVoucherFeedbackMsg(null)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* FREE PLAY MODE & PRICE PER LAYOUT CONFIGURATION */}
                <div className="p-4 rounded-xl bg-white border border-zinc-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-zinc-900">
                          Free Play Mode
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                          {localConfig.freePlayMode ? 'ACTIVE' : 'VOUCHER REQUIRED'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        When enabled, guests bypass the voucher code screen and can capture and print freely.
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
                            ? 'Free Play Mode enabled.'
                            : 'Free Play Mode disabled — voucher required.'
                        );
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer border ${
                        localConfig.freePlayMode
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {localConfig.freePlayMode
                          ? 'Disable Free Play'
                          : 'Enable Free Play'}
                      </span>
                    </button>
                  </div>

                  {/* Price Per Layout Editor */}
                  <div className="space-y-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Price Per Layout
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                            className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col gap-1"
                          >
                            <label className="text-[11px] font-semibold text-zinc-700">
                              {item.label}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-zinc-500 font-bold">
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
                                className="w-full px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-900 font-mono font-bold text-xs focus:outline-none focus:border-zinc-900"
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
                  <div className="p-3.5 rounded-xl bg-white border border-zinc-200">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono">Available</div>
                    <div className="text-xl font-bold text-zinc-900 mt-0.5">{availableVouchers.length}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-zinc-200">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono">Used</div>
                    <div className="text-xl font-bold text-zinc-900 mt-0.5">{usedVouchers.length}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-zinc-200">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono">Total Stored</div>
                    <div className="text-xl font-bold text-zinc-900 mt-0.5">{vouchers.length}</div>
                  </div>
                </div>

                {/* CASHIER BATCH VOUCHER GENERATOR */}
                <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        Cashier Single-Use Voucher Generator
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        1 Voucher = 1 Print Copy. Automatically marked as used once redeemed.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                            active
                              ? 'bg-zinc-900 border-zinc-900 text-white'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{meta.label}</span>
                            <span className="font-mono">P{price}</span>
                          </div>
                          <div className={`text-[10px] font-mono mt-0.5 ${active ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            Code: {meta.prefix}XXXXX
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Quantity Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-zinc-500 font-medium">Quantity:</span>
                    {[1, 5, 10, 20, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          soundEffects.playTap();
                          setBatchCount(preset);
                        }}
                        className={`px-2.5 py-1 rounded border font-mono font-semibold transition cursor-pointer ${
                          batchCount === preset
                            ? 'bg-zinc-900 border-zinc-900 text-white'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={handleGenerateCashierBatch}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end text-xs"
                  >
                    <div>
                      <label className="text-zinc-500 block mb-1">Count</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono font-bold text-xs focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-500 block mb-1">Numeric Prefix</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={batchPrefix}
                        onChange={(e) => setBatchPrefix(e.target.value.replace(/\D/g, ''))}
                        placeholder="3"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-500 block mb-1">Batch Note</label>
                      <input
                        type="text"
                        value={batchLabel}
                        onChange={(e) => setBatchLabel(e.target.value)}
                        placeholder="3-Shot • 1 Print Copy"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Generate {batchCount} ({LAYOUT_VOUCHER_META[batchLayoutType].shortLabel})
                      </span>
                    </button>
                  </form>
                </div>

                {/* CASHIER VOUCHER SHEET */}
                {sheetVouchers.length > 0 && (
                  <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                          <Scroll className="w-4 h-4 text-zinc-700" />
                          <span>
                            {lastGeneratedBatch.length > 0
                              ? `Generated Batch (${sheetVouchers.length})`
                              : `Available Vouchers (${sheetVouchers.length})`}
                          </span>
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
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
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {copiedCode === 'ALL' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy Codes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadVouchersList(
                              sheetVouchers.filter((v) => !isVoucherUsed(v))
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .TXT</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPrintingVouchers}
                          onClick={() =>
                            handlePrintCashierSlipsThermal(
                              sheetVouchers.filter((v) => !isVoucherUsed(v))
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>
                            {isPrintingVouchers ? 'Printing...' : 'Print Slips'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTicketSheet(!showTicketSheet)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-xs font-medium transition cursor-pointer"
                        >
                          {showTicketSheet ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {showTicketSheet && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1 max-h-80 overflow-y-auto pr-1">
                        {sheetVouchers.map((v, idx) => {
                          const used = isVoucherUsed(v);
                          return (
                            <div
                              key={v.code}
                              onClick={() => handleCopyText(v.code, v.code)}
                              title="Tap to copy voucher code"
                              className={`p-2.5 rounded-lg border border-dashed flex flex-col justify-between transition cursor-pointer select-all ${
                                used
                                  ? 'border-zinc-200 bg-zinc-50 opacity-50'
                                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-900'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                                <span>#{idx + 1}</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-800 font-semibold uppercase">
                                  {used ? 'USED' : 'VALID'}
                                </span>
                              </div>

                              <div
                                className={`text-center font-mono font-bold text-sm tracking-wider my-1 ${
                                  used ? 'line-through text-zinc-400' : 'text-zinc-900'
                                }`}
                              >
                                {v.code}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-200 pt-1 mt-1">
                                <span>
                                  {v.layoutType
                                    ? `${LAYOUT_VOUCHER_META[v.layoutType].shortLabel}`
                                    : `1 Copy`}
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

                {/* Existing & Generated Vouchers List */}
                <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {(
                        [
                          { id: 'all', label: `All (${vouchers.length})` },
                          { id: 'available', label: `Available (${availableVouchers.length})` },
                          { id: 'used', label: `Used (${usedVouchers.length})` },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setVoucherFilter(tab.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            voucherFilter === tab.id
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={voucherSearch}
                        onChange={(e) => setVoucherSearch(e.target.value)}
                        placeholder="Search code..."
                        className="px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 font-mono uppercase focus:outline-none focus:border-zinc-900"
                      />
                      {usedVouchers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearUsedVouchers}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Used</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs max-h-80 overflow-y-auto pr-1">
                    {filteredVouchers.length === 0 ? (
                      <div className="py-6 text-center text-zinc-400">
                        No vouchers match the selected filter.
                      </div>
                    ) : (
                      filteredVouchers.map((v) => {
                        const used = isVoucherUsed(v);
                        return (
                          <div
                            key={v.code}
                            className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              used
                                ? 'bg-zinc-50 border-zinc-200 opacity-55'
                                : 'bg-zinc-50 border-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`font-mono font-bold text-sm tracking-wider ${
                                  used ? 'line-through text-zinc-400' : 'text-zinc-900'
                                }`}
                              >
                                {v.code}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white border border-zinc-200 text-zinc-700">
                                {used ? 'USED' : 'AVAILABLE'}
                              </span>
                              <span className="text-zinc-500 truncate max-w-[200px]">
                                {v.description}
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2.5">
                              <span className="text-zinc-500 font-mono">
                                {v.usedCount}/{v.maxUses > 0 ? v.maxUses : '∞'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(v.code, v.code)}
                                title="Copy Code"
                                className="p-1.5 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer"
                              >
                                {copiedCode === v.code ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleVoucher(v.code)}
                                title="Delete Voucher"
                                className="p-1.5 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
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

          {/* TAB: Photos / Capture Archive */}
          {activeTab === 'gallery' && (
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                Local Capture History ({captures.length} saved sessions)
              </h4>
              {captures.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">No captures saved yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {captures.map((cap) => (
                    <div
                      key={cap.id}
                      className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 flex flex-col justify-between"
                    >
                      <img src={cap.compositeDataUrl} alt="Photostrip" className="w-full h-36 object-contain p-1" />
                      <div className="p-1.5 border-t border-zinc-200 text-[10px] font-mono text-zinc-500 text-center truncate">
                        {new Date(cap.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
