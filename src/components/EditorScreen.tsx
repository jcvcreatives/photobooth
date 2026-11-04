/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Smile,
  Type,
  RotateCcw,
  Palette,
  Check,
  LayoutGrid,
  Film,
  Printer,
  FlipHorizontal,
  X,
  Sliders,
  ChevronRight,
  Eye,
  Smartphone,
  Minus,
  Plus,
  Sun,
} from 'lucide-react';
import {
  FrameLayoutType,
  FrameTheme,
  PhotoFilterType,
  StickerItem,
  DrawingPath,
  PhotostripResult,
} from '../types';
import {
  THERMAL_FRAME_THEMES,
  DIGITAL_COLOR_THEMES,
  FRAME_THEMES,
  AVAILABLE_FILTERS,
  EMOJI_CATEGORIES,
  FUN_STICKERS,
  THEME_GROUPS,
  THERMAL_BRIGHTNESS_PRESETS,
  renderPhotostripCanvas,
} from '../services/frameTemplates';
import { thermalPrinterService } from '../services/thermalPrinter';
import { soundEffects } from '../services/soundEffects';

const QUICK_TEXT_PRESETS = [
  'GOBBLE HAUS',
  'CHICKEN INASAL 🍗',
  'ICE CREAM FLOAT 🍦',
  'RICE IN A BOX 🥡',
  'SO BUSOG! 🔥',
  'BESTIES ♥',
  'VIP PASS ★',
];

const TEXT_COLOR_SWATCHES = [
  '#000000',
  '#e11d48',
  '#ea580c',
  '#0284c7',
  '#7c3aed',
  '#15803d',
];

interface EditorScreenProps {
  photos: string[];
  layout: FrameLayoutType;
  initialTheme: FrameTheme;
  initialFilter: PhotoFilterType;
  copies: number;
  onChangeCopies: (copies: number) => void;
  brightness?: number;
  onChangeBrightness?: (brightness: number) => void;
  onFinalized: (result: PhotostripResult, canvas: HTMLCanvasElement) => void;
  onRetake: () => void;
  onSecretAdminTap?: () => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  photos,
  layout,
  initialTheme,
  initialFilter,
  copies,
  onChangeCopies,
  brightness = 45,
  onChangeBrightness,
  onFinalized,
  onRetake,
  onSecretAdminTap,
}) => {
  const [currentLayout] = useState<FrameLayoutType>(layout);
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);

  // Separate thermal receipt theme vs digital color keepsake theme
  const [thermalTheme, setThermalTheme] = useState<FrameTheme>(() => {
    return THERMAL_FRAME_THEMES.find((t) => t.id === initialTheme.id) || THERMAL_FRAME_THEMES[0];
  });
  const [digitalTheme, setDigitalTheme] = useState<FrameTheme>(() => {
    return DIGITAL_COLOR_THEMES.find((t) => t.id === initialTheme.id) || DIGITAL_COLOR_THEMES[0];
  });

  // Selector mode: 'thermal' for physical receipt print (no color frames) vs 'digital' for phone QR & email (color frames)
  const [themeMode, setThemeMode] = useState<'thermal' | 'digital'>('thermal');
  // Preview view switcher: which version to inspect on the photostrip preview
  const [previewView, setPreviewView] = useState<'thermal' | 'digital'>('thermal');

  const [editablePhotos, setEditablePhotos] = useState<string[]>(photos);
  const [mirroredFlags, setMirroredFlags] = useState<boolean[]>(() => photos.map(() => false));
  const [isMirroring, setIsMirroring] = useState(false);

  useEffect(() => {
    setEditablePhotos(photos);
    setMirroredFlags(photos.map(() => false));
  }, [photos]);

  const handleMirrorSelectedPhoto = async () => {
    if (isMirroring) return;
    const targetSrc = editablePhotos[selectedPhotoIndex];
    if (!targetSrc) return;

    soundEffects.playTap();
    setIsMirroring(true);

    try {
      const flippedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(targetSrc);
            return;
          }
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => reject(new Error('Failed to mirror image'));
        img.src = targetSrc;
      });

      setEditablePhotos((prev) =>
        prev.map((item, idx) => (idx === selectedPhotoIndex ? flippedDataUrl : item))
      );
      setMirroredFlags((prev) =>
        prev.map((flag, idx) => (idx === selectedPhotoIndex ? !flag : flag))
      );
    } catch {
      // ignore
    } finally {
      setIsMirroring(false);
    }
  };

  const [filter] = useState<PhotoFilterType>(initialFilter);
  const [printBrightness, setPrintBrightness] = useState<number>(brightness ?? 45);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [defaultItemScale, setDefaultItemScale] = useState<number>(1.0);
  const [activeStickerCategory, setActiveStickerCategory] = useState<string>(EMOJI_CATEGORIES[0].id);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);

  // Modals & Drawers for the clean kiosk flows
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showStickersDrawer, setShowStickersDrawer] = useState(false);
  const [showTextDrawer, setShowTextDrawer] = useState(false);
  const [customTextInput, setCustomTextInput] = useState('');
  const [customTextStyle, setCustomTextStyle] = useState<'white_pill' | 'black_pill' | 'outline' | 'plain'>('white_pill');
  const [customTextColor, setCustomTextColor] = useState('#000000');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(3);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);

  const stripContainerRef = useRef<HTMLDivElement | null>(null);
  const stickerGridScrollRef = useRef<HTMLDivElement | null>(null);
  const activeStickerDragRef = useRef<{ id: string; startX: number; startY: number; stickerX: number; stickerY: number } | null>(null);

  const selectedSticker = stickers.find((s) => s.id === selectedStickerId) || null;

  const handleBrightnessUpdate = (val: number) => {
    const clamped = Math.max(-30, Math.min(100, Math.round(val)));
    setPrintBrightness(clamped);
    onChangeBrightness?.(clamped);
  };

  // Update composite strip preview whenever settings or thermal brightness change
  useEffect(() => {
    let active = true;

    async function updatePreview() {
      try {
        const isThermal = previewView === 'thermal';
        const activeTheme = isThermal ? thermalTheme : digitalTheme;
        const activeFilter = isThermal ? 'noir' : filter;

        const canvas = await renderPhotostripCanvas({
          photos: editablePhotos,
          layout: currentLayout,
          theme: activeTheme,
          filter: activeFilter,
          eventTitle: activeTheme.headerText,
          eventSubtitle: activeTheme.footerText,
          stickers: [], // Draggable DOM stickers rendered in overlay
          drawings: [],
          isThermalMode: isThermal,
          thermalBrightness: printBrightness,
        });

        if (active) {
          setPreviewSrc(canvas.toDataURL('image/jpeg', 0.9));
        }
      } catch {
        // ignore
      }
    }

    updatePreview();

    return () => {
      active = false;
    };
  }, [editablePhotos, currentLayout, thermalTheme, digitalTheme, filter, previewView, printBrightness]);

  // Add Emoji Sticker to strip
  const handleAddSticker = (emoji: string) => {
    soundEffects.playTap();
    const newSticker: StickerItem = {
      id: `st-${Date.now()}-${Math.random()}`,
      emoji,
      x: 35 + Math.random() * 30,
      y: 25 + Math.random() * 50,
      scale: defaultItemScale,
      rotation: Math.round((Math.random() - 0.5) * 12),
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  // Add Custom Text to strip
  const handleAddCustomText = (rawText?: string) => {
    const textVal = (rawText ?? customTextInput).trim();
    if (!textVal) return;
    soundEffects.playTap();

    const newTextItem: StickerItem = {
      id: `txt-${Date.now()}-${Math.random()}`,
      emoji: '🔤',
      isText: true,
      text: textVal,
      textStyle: customTextStyle,
      textColor: customTextColor,
      x: 50,
      y: 35 + Math.random() * 30,
      scale: defaultItemScale,
      rotation: 0,
    };
    setStickers((prev) => [...prev, newTextItem]);
    setSelectedStickerId(newTextItem.id);
    if (!rawText) {
      setCustomTextInput('');
    }
  };

  // Update scale of selected sticker/text (or default scale)
  const handleUpdateSelectedScale = (newScale: number) => {
    const clamped = Math.max(0.4, Math.min(2.6, Number(newScale.toFixed(2))));
    setDefaultItemScale(clamped);
    if (selectedStickerId) {
      setStickers((prev) =>
        prev.map((s) => (s.id === selectedStickerId ? { ...s, scale: clamped } : s))
      );
    }
  };

  // Update rotation of selected sticker/text
  const handleRotateSelected = (deltaDeg: number) => {
    soundEffects.playTap();
    if (!selectedStickerId) return;
    setStickers((prev) =>
      prev.map((s) =>
        s.id === selectedStickerId
          ? { ...s, rotation: ((s.rotation + deltaDeg + 180) % 360) - 180 }
          : s
      )
    );
  };

  const handleDeleteSticker = (id: string) => {
    soundEffects.playTap();
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  // Drag sticker handlers with pointer capture
  const handleStickerPointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    soundEffects.playTap();
    setSelectedStickerId(id);

    const st = stickers.find((s) => s.id === id);
    if (!st || !stripContainerRef.current) return;

    if (st.isText && st.text) {
      setCustomTextStyle(st.textStyle || 'white_pill');
      setCustomTextColor(st.textColor || '#000000');
    }

    activeStickerDragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      stickerX: st.x,
      stickerY: st.y,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleStickerPointerMove = (id: string, e: React.PointerEvent) => {
    if (!activeStickerDragRef.current || activeStickerDragRef.current.id !== id) return;
    if (!stripContainerRef.current) return;

    const rect = stripContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - activeStickerDragRef.current.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - activeStickerDragRef.current.startY) / rect.height) * 100;

    const newX = Math.max(5, Math.min(95, activeStickerDragRef.current.stickerX + deltaXPercent));
    const newY = Math.max(5, Math.min(95, activeStickerDragRef.current.stickerY + deltaYPercent));

    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: newX, y: newY } : s))
    );
  };

  const handleStickerPointerUp = (id: string, e: React.PointerEvent) => {
    if (activeStickerDragRef.current && activeStickerDragRef.current.id === id) {
      activeStickerDragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Finalize composite for printing and sharing:
  // Dual-canvas pipeline:
  // 1. thermalCanvas (isThermalMode: true, no color frames, pure white receipt background, black text) for physical thermal print
  // 2. colorCanvas (isThermalMode: false, full vibrant color theme and photo filter) for phone QR and email
  const handleFinalizePrint = async () => {
    if (isRendering) return;
    soundEffects.playTap();
    setIsRendering(true);

    try {
      // 1. Thermal print canvas (calibrated portrait brightness for ESC/POS & Silent Spooler)
      const thermalCanvas = await renderPhotostripCanvas({
        photos: editablePhotos,
        layout: currentLayout,
        theme: thermalTheme,
        filter: 'noir',
        eventTitle: thermalTheme.headerText,
        eventSubtitle: thermalTheme.footerText,
        stickers,
        drawings: [],
        isThermalMode: true,
        thermalBrightness: printBrightness,
      });

      const targetWidth = thermalTheme.borderStyle === 'wide' ? 576 : 384;
      const dithered = thermalPrinterService.generateDitheredRaster(thermalCanvas, targetWidth, 1.0, 0);

      // 2. Full color digital canvas (for phone QR and email download)
      const colorCanvas = await renderPhotostripCanvas({
        photos: editablePhotos,
        layout: currentLayout,
        theme: digitalTheme,
        filter,
        eventTitle: digitalTheme.headerText,
        eventSubtitle: digitalTheme.footerText,
        stickers,
        drawings: [],
        isThermalMode: false,
      });

      const fullDataUrl = colorCanvas.toDataURL('image/jpeg', 0.95);
      const shareId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const shareUrl = `${window.location.origin}/?share=${shareId}`;

      const result: PhotostripResult = {
        id: shareId,
        createdAt: Date.now(),
        photos: editablePhotos,
        compositeDataUrl: fullDataUrl, // Full color strip for phone QR & email
        thermalRasterDataUrl: dithered.previewDataUrl, // Crisp monochrome for thermal dispenser
        layout: currentLayout,
        themeId: thermalTheme.id,
        filter,
        eventTitle: digitalTheme.headerText,
        shareCode: shareId.toUpperCase(),
        shareUrl,
        printCopies: copies,
        thermalBrightness: printBrightness,
        stickers,
      };

      onFinalized(result, thermalCanvas);
    } finally {
      setIsRendering(false);
    }
  };

  const displayedThemes = themeMode === 'thermal'
    ? THERMAL_FRAME_THEMES.slice(0, 6)
    : DIGITAL_COLOR_THEMES.slice(0, 6);

  const activeCategoryObj =
    EMOJI_CATEGORIES.find((c) => c.id === activeStickerCategory) || EMOJI_CATEGORIES[0];

  const currentScaleVal = selectedSticker ? selectedSticker.scale : defaultItemScale;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col justify-between p-3 sm:p-4 bg-[#faf8f5] text-zinc-900 select-none overflow-hidden max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center mb-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            soundEffects.playTap();
            const next = logoTapCount + 1;
            if (next >= 4) {
              setLogoTapCount(0);
              onSecretAdminTap?.();
              return;
            }
            setLogoTapCount(next);
          }}
          className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs mb-0.5 cursor-pointer"
        >
          J
        </button>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 leading-tight">
          Looking great!
        </h1>
        <p className="text-[11px] sm:text-xs text-zinc-500">
          Pick your Gobble Haus frame, add stickers or custom text, then print
        </p>
      </div>

      {/* Main Layout: Left Photostrip Preview, Right Theme / Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center flex-1 min-h-0 overflow-hidden my-1">
        {/* Left Column: Photostrip Preview + Mode Toggle */}
        <div className="md:col-span-5 h-full min-h-0 flex flex-col items-center justify-between overflow-hidden">
          {/* Preview Mode Switcher (Thermal Print vs Digital Color & GIF) */}
          <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 rounded-full border border-zinc-300 mb-1 shrink-0">
            <button
              onClick={() => {
                soundEffects.playTap();
                setPreviewView('thermal');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                previewView === 'thermal'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-zinc-700 hover:text-black'
              }`}
            >
              <Printer className="w-3 h-3" />
              <span>🖨️ Thermal Print</span>
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                setPreviewView('digital');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                previewView === 'digital'
                  ? 'bg-sky-400 text-slate-950 font-bold shadow-xs'
                  : 'text-zinc-700 hover:text-black'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>📱 Digital Color & GIF</span>
            </button>
          </div>

          {/* Photostrip Canvas Frame */}
          <div
            ref={stripContainerRef}
            onClick={() => setSelectedStickerId(null)}
            className="relative rounded-2xl shadow-md overflow-hidden max-h-[32vh] sm:max-h-[36vh] flex items-center justify-center bg-white border border-zinc-200 select-none p-1 shrink-0"
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Photostrip Preview"
                className="max-h-[30vh] sm:max-h-[34vh] w-auto object-contain rounded-xl select-none pointer-events-none"
              />
            ) : (
              <div className="w-44 h-60 flex items-center justify-center text-zinc-400 font-mono text-xs">
                Rendering...
              </div>
            )}

            {/* Draggable Stickers & Custom Text Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {stickers.map((st) => {
                const isSelected = selectedStickerId === st.id;
                const isThermalPreview = previewView === 'thermal';
                const activeColor = isThermalPreview ? '#000000' : st.textColor || '#000000';
                const tStyle = st.textStyle || 'white_pill';

                return (
                  <div
                    key={st.id}
                    onPointerDown={(e) => handleStickerPointerDown(st.id, e)}
                    onPointerMove={(e) => handleStickerPointerMove(st.id, e)}
                    onPointerUp={(e) => handleStickerPointerUp(st.id, e)}
                    style={{
                      position: 'absolute',
                      left: `${st.x}%`,
                      top: `${st.y}%`,
                      transform: `translate(-50%, -50%) rotate(${st.rotation}deg) scale(${st.scale})`,
                      pointerEvents: 'auto',
                      touchAction: 'none',
                    }}
                    className={`select-none cursor-grab active:cursor-grabbing p-1 rounded-lg ${
                      isSelected ? 'ring-2 ring-black bg-black/10' : ''
                    }`}
                  >
                    {st.isText && st.text ? (
                      <span
                        style={
                          tStyle === 'white_pill'
                            ? {
                                backgroundColor: '#ffffff',
                                color: activeColor,
                                borderColor: activeColor,
                              }
                            : tStyle === 'black_pill'
                            ? {
                                backgroundColor: activeColor,
                                color: '#ffffff',
                                borderColor: '#ffffff',
                              }
                            : tStyle === 'outline'
                            ? {
                                color: activeColor,
                                textShadow:
                                  '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff',
                              }
                            : {
                                color: activeColor,
                              }
                        }
                        className={`inline-block whitespace-nowrap font-black text-xs sm:text-sm leading-tight select-none pointer-events-none ${
                          tStyle === 'white_pill' || tStyle === 'black_pill'
                            ? 'px-2 py-0.5 rounded-full border-2 shadow-2xs'
                            : ''
                        }`}
                      >
                        {st.text}
                      </span>
                    ) : (
                      <span className="text-2xl sm:text-3xl leading-none select-none pointer-events-none drop-shadow">
                        {st.emoji}
                      </span>
                    )}

                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSticker(st.id);
                        }}
                        className="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Size & Rotation Bar when a Sticker or Text item is selected */}
          {selectedSticker && (
            <div className="mt-1 px-2.5 py-1 bg-white border border-zinc-300 rounded-full shadow-2xs flex items-center gap-1.5 text-[10px] shrink-0">
              <span className="font-semibold text-zinc-700">Size:</span>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTap();
                  handleUpdateSelectedScale(selectedSticker.scale - 0.15);
                }}
                className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold cursor-pointer"
                title="Smaller"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0.4"
                max="2.6"
                step="0.05"
                value={selectedSticker.scale}
                onChange={(e) => handleUpdateSelectedScale(Number(e.target.value))}
                className="w-16 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTap();
                  handleUpdateSelectedScale(selectedSticker.scale + 0.15);
                }}
                className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold cursor-pointer"
                title="Larger"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="font-mono text-zinc-500 w-8 text-center">
                {Math.round(selectedSticker.scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleRotateSelected(-15)}
                className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 font-mono cursor-pointer"
                title="Rotate Left"
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => handleRotateSelected(15)}
                className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 font-mono cursor-pointer"
                title="Rotate Right"
              >
                ↻
              </button>
            </div>
          )}

          {/* Compact Bottom Controls under Preview */}
          <div className="mt-1 text-center space-y-1 shrink-0">
            <div className="flex items-center justify-center gap-2">
              {editablePhotos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundEffects.playTap();
                    setSelectedPhotoIndex(idx);
                    setShowReviewModal(true);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-zinc-200 hover:border-black transition active:scale-95 shadow-2xs cursor-pointer"
                  title={`Tap to mirror or retake Shot #${idx + 1} (${retakesLeft} left)`}
                >
                  <img src={p} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-0.5 flex-wrap">
              <button
                onClick={() => {
                  soundEffects.playTap();
                  setShowTextDrawer(false);
                  setShowStickersDrawer((s) => !s);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-2xs ${
                  showStickersDrawer
                    ? 'border-black bg-black text-white'
                    : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Smile className="w-3 h-3" />
                <span>Add stickers</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.playTap();
                  setShowStickersDrawer(false);
                  setShowTextDrawer((s) => !s);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-2xs ${
                  showTextDrawer
                    ? 'border-black bg-black text-white'
                    : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Type className="w-3 h-3" />
                <span>Add text</span>
              </button>

              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-[11px] font-medium transition cursor-pointer shadow-2xs"
              >
                <FlipHorizontal className="w-3 h-3" />
                <span>Mirror & Retake ({retakesLeft})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 6 Exclusive Gobble Haus Frame Cards (Zero-scroll 3x2 grid) */}
        <div className="md:col-span-7 h-full min-h-0 flex flex-col justify-between space-y-1.5 overflow-hidden">
          {/* High-level Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-200/60 rounded-2xl border border-zinc-200 text-xs shrink-0">
            <button
              onClick={() => {
                soundEffects.playTap();
                setThemeMode('thermal');
                setPreviewView('thermal');
              }}
              className={`py-1.5 px-2 rounded-xl font-medium transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                themeMode === 'thermal'
                  ? 'bg-white text-zinc-950 font-bold shadow-xs border border-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Frames (Thermal)</span>
            </button>
            <button
              onClick={() => {
                soundEffects.playTap();
                setThemeMode('digital');
                setPreviewView('digital');
              }}
              className={`py-1.5 px-2 rounded-xl font-medium transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                themeMode === 'digital'
                  ? 'bg-white text-zinc-950 font-bold shadow-xs border border-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Digital & GIF Colors</span>
            </button>
          </div>

          {/* Informational Subtext */}
          <div className="flex items-center justify-between gap-2 px-1 shrink-0">
            <div className="text-[10px] text-zinc-500 truncate">
              {themeMode === 'thermal'
                ? 'Centered photo with crisp black top & bottom frame drawings & texts'
                : 'Centered photo with colored top & bottom Gobble Haus frame art'}
            </div>
            <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full shrink-0">
              6 Gobble Haus Frames
            </span>
          </div>

          {/* MAIN RIGHT PANEL CONTENT: Either Full-Size Stickers Menu, Custom Text Menu, or 6 Gobble Haus Frames */}
          {showStickersDrawer ? (
            /* LARGE FULL-HEIGHT SCROLLABLE STICKERS MENU */
            <div
              data-kiosk-scrollable="true"
              data-admin-scrollable="true"
              className="flex-1 min-h-0 p-3 sm:p-4 bg-white rounded-2xl border-2 border-zinc-900/15 shadow-md animate-fadeIn flex flex-col gap-2.5 overflow-hidden"
            >
              {/* Top Header: Title + Sticker Size Controls + Scroll Up/Down + Done Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-extrabold text-zinc-900 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-amber-500" />
                    <span>Tap Stickers to Add</span>
                  </span>

                  {/* Adjustable Sticker Size Bar */}
                  <div className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1 rounded-full text-xs border border-zinc-200">
                    <span className="text-zinc-600 font-semibold">Size:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedScale(currentScaleVal - 0.15)}
                      className="w-6 h-6 rounded-full bg-white hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold cursor-pointer active:scale-90"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.4"
                      max="2.6"
                      step="0.05"
                      value={currentScaleVal}
                      onChange={(e) => handleUpdateSelectedScale(Number(e.target.value))}
                      className="w-20 sm:w-24 h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedScale(currentScaleVal + 0.15)}
                      className="w-6 h-6 rounded-full bg-white hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold cursor-pointer active:scale-90"
                    >
                      +
                    </button>
                    <span className="font-mono font-bold text-zinc-900 w-9 text-right">
                      {Math.round(currentScaleVal * 100)}%
                    </span>
                  </div>
                </div>

                {/* Scroll Up / Down Helper Buttons + Close Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      stickerGridScrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 text-xs font-bold cursor-pointer active:scale-95"
                    title="Scroll Up"
                  >
                    ▲ Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      stickerGridScrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 text-xs font-bold cursor-pointer active:scale-95"
                    title="Scroll Down"
                  >
                    ▼ Down
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      setShowStickersDrawer(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Done ✕
                  </button>
                </div>
              </div>

              {/* Large Category Tabs (Horizontal Touch Scrollable) */}
              <div
                data-kiosk-scrollable="true"
                data-admin-scrollable="true"
                style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0"
              >
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playTap();
                      setActiveStickerCategory(cat.id);
                      if (stickerGridScrollRef.current) {
                        stickerGridScrollRef.current.scrollTop = 0;
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeStickerCategory === cat.id
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200/80'
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Large Touch-Scrollable Sticker Grid */}
              <div
                ref={stickerGridScrollRef}
                data-kiosk-scrollable="true"
                data-admin-scrollable="true"
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 grid grid-cols-6 sm:grid-cols-7 gap-2 content-start"
              >
                {activeCategoryObj.emojis.map((emojiStr, i) => (
                  <button
                    key={`${activeCategoryObj.id}-${i}`}
                    type="button"
                    onClick={() => handleAddSticker(emojiStr)}
                    className="h-12 sm:h-14 text-2xl sm:text-3xl rounded-2xl border border-zinc-200/80 bg-zinc-50/90 hover:bg-amber-50 hover:border-amber-300 active:scale-90 transition cursor-pointer flex items-center justify-center shadow-2xs"
                  >
                    {emojiStr}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Zero-Scroll 3x2 Template Grid (All 6 Gobble Haus frames fit simultaneously) */
            <div className="grid grid-cols-3 gap-2 flex-1 min-h-0 overflow-hidden content-center">
              {displayedThemes.map((t) => {
                const isSelected = thermalTheme.id === t.id || digitalTheme.id === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      soundEffects.playTap();
                      const matchingThermal =
                        THERMAL_FRAME_THEMES.find((th) => th.id === t.id) || THERMAL_FRAME_THEMES[0];
                      const matchingDigital =
                        DIGITAL_COLOR_THEMES.find((dg) => dg.id === t.id) || DIGITAL_COLOR_THEMES[0];
                      setThermalTheme(matchingThermal);
                      setDigitalTheme(matchingDigital);
                      setPreviewView(themeMode);
                    }}
                    className={`p-2 rounded-2xl border text-center flex flex-col items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-black bg-white ring-2 ring-black/10 shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] leading-none">
                        {t.cornerIcon || '🥡'}
                      </span>
                      {isSelected ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-black text-white flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Mini graphic preview card showing Top Art + Centered Photo + Bottom Art */}
                    <div
                      style={{
                        backgroundColor: themeMode === 'thermal' ? '#ffffff' : t.background,
                      }}
                      className={`w-12 h-14 rounded-md border my-0.5 flex flex-col items-center justify-between p-1 shadow-2xs ${
                        themeMode === 'thermal' ? 'border-zinc-300' : 'border-zinc-300'
                      }`}
                    >
                      {/* Top Frame Drawing & Text Indicator */}
                      <div className="w-full border-b border-zinc-300 pb-0.5 flex items-center justify-center gap-0.5">
                        <span className="text-[6px] font-mono font-bold text-zinc-700 uppercase truncate">
                          {t.cornerIcon} TOP ART
                        </span>
                      </div>

                      {/* Centered Photo Slot */}
                      <div className="w-full h-5 bg-zinc-800 rounded-2xs flex items-center justify-center text-[5.5px] font-mono text-white tracking-tighter">
                        PHOTO
                      </div>

                      {/* Bottom Frame Drawing & Text Indicator */}
                      <div className="w-full border-t border-zinc-300 pt-0.5 text-[5px] font-mono font-bold text-zinc-600 truncate">
                        FRAME TEXT
                      </div>
                    </div>

                    <div className="font-semibold text-[11px] text-zinc-900 leading-tight truncate w-full">
                      {t.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Add Custom Text Drawer with Style, Color & Size Control */}
          {showTextDrawer && (
            <div
              data-kiosk-scrollable="true"
              data-admin-scrollable="true"
              className="p-3 bg-white rounded-2xl border-2 border-zinc-900/15 shadow-md animate-fadeIn shrink-0 space-y-2"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-zinc-900">Add Custom Text</span>
                  <div className="flex items-center gap-1 bg-zinc-100 px-2.5 py-0.5 rounded-full text-xs border border-zinc-200">
                    <span className="text-zinc-500">Size:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedScale(currentScaleVal - 0.15)}
                      className="w-5 h-5 rounded-full bg-white hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.4"
                      max="2.6"
                      step="0.05"
                      value={currentScaleVal}
                      onChange={(e) => handleUpdateSelectedScale(Number(e.target.value))}
                      className="w-16 h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedScale(currentScaleVal + 0.15)}
                      className="w-5 h-5 rounded-full bg-white hover:bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <span className="font-mono font-bold text-zinc-800 w-8 text-right">
                      {Math.round(currentScaleVal * 100)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTextDrawer(false)}
                  className="px-2.5 py-1 rounded-lg bg-black text-white text-xs font-bold cursor-pointer"
                >
                  Done ✕
                </button>
              </div>

              {/* Input Row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCustomText();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  maxLength={32}
                  value={customTextInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomTextInput(val);
                    if (selectedSticker && selectedSticker.isText) {
                      setStickers((prev) =>
                        prev.map((s) =>
                          s.id === selectedSticker.id ? { ...s, text: val || s.text } : s
                        )
                      );
                    }
                  }}
                  placeholder="Type caption, name, or message..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-black bg-zinc-50"
                />
                <button
                  type="submit"
                  disabled={!customTextInput.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  + Add Text
                </button>
              </form>

              {/* Style & Color Selector Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'white_pill', label: 'White Tag' },
                      { id: 'black_pill', label: 'Black Tag' },
                      { id: 'outline', label: 'Outline' },
                      { id: 'plain', label: 'Plain' },
                    ] as const
                  ).map((stOpt) => (
                    <button
                      key={stOpt.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        setCustomTextStyle(stOpt.id);
                        if (selectedSticker && selectedSticker.isText) {
                          setStickers((prev) =>
                            prev.map((s) =>
                              s.id === selectedSticker.id ? { ...s, textStyle: stOpt.id } : s
                            )
                          );
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                        customTextStyle === stOpt.id
                          ? 'bg-black text-white border-black'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                      }`}
                    >
                      {stOpt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {TEXT_COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        soundEffects.playTap();
                        setCustomTextColor(hex);
                        if (selectedSticker && selectedSticker.isText) {
                          setStickers((prev) =>
                            prev.map((s) =>
                              s.id === selectedSticker.id ? { ...s, textColor: hex } : s
                            )
                          );
                        }
                      }}
                      style={{ backgroundColor: hex }}
                      className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                        customTextColor === hex
                          ? 'ring-2 ring-black scale-110 border-white'
                          : 'border-zinc-300 opacity-80 hover:opacity-100'
                      }`}
                      title={`Text color ${hex}`}
                    />
                  ))}
                </div>
              </div>

              {/* Quick Text Presets */}
              <div
                data-kiosk-scrollable="true"
                data-admin-scrollable="true"
                style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
              >
                {QUICK_TEXT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddCustomText(preset)}
                    className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-bold whitespace-nowrap transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Pill Button: Print my photos (Always visible at bottom without scrolling) */}
      <div className="pt-1 flex flex-col items-center max-w-md mx-auto w-full space-y-1.5 shrink-0">
        <button
          disabled={isRendering}
          onClick={handleFinalizePrint}
          className="w-full py-3.5 rounded-full bg-black hover:bg-zinc-800 disabled:opacity-60 text-white font-medium text-sm sm:text-base tracking-wide shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>
            {isRendering ? 'Printing...' : 'Print my photos'}
          </span>
        </button>

        <button
          onClick={() => setShowRetakeConfirm(true)}
          className="text-[11px] text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
        >
          Start the shots over
        </button>
      </div>

      {/* Modal 1: Review Photos ("Love these?") */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#faf8f5] rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center shadow-xl border border-zinc-200">
            <div className="w-7 h-7 rounded bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2">
              J
            </div>
            <h2 className="text-xl font-bold text-zinc-950 mb-0.5">
              Love these?
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Retakes left: {retakesLeft}
            </p>

            {/* Selected Photo Preview */}
            <div className="relative w-48 h-56 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 shadow-sm mb-3 flex items-center justify-center">
              {editablePhotos[selectedPhotoIndex] && (
                <img
                  src={editablePhotos[selectedPhotoIndex]}
                  alt="Selected Shot"
                  className="w-full h-full object-cover"
                />
              )}
              {mirroredFlags[selectedPhotoIndex] && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                  Mirrored
                </span>
              )}
            </div>

            {/* Thumbnail row */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {editablePhotos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundEffects.playTap();
                    setSelectedPhotoIndex(idx);
                  }}
                  className={`w-10 h-10 rounded-lg overflow-hidden border transition cursor-pointer ${
                    selectedPhotoIndex === idx
                      ? 'border-black ring-2 ring-black/20 scale-105'
                      : 'border-zinc-200 opacity-60'
                  }`}
                >
                  <img src={p} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Actions: Working Mirror & Retake this one (Filters removed) */}
            <div className="flex items-center justify-center gap-3 text-xs mb-5 w-full">
              <button
                type="button"
                disabled={isMirroring}
                onClick={handleMirrorSelectedPhoto}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-medium transition active:scale-95 cursor-pointer ${
                  mirroredFlags[selectedPhotoIndex]
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-zinc-800 border-zinc-300 hover:border-black'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{mirroredFlags[selectedPhotoIndex] ? 'Mirrored' : 'Mirror'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playTap();
                  if (retakesLeft > 0) {
                    setRetakesLeft((r) => r - 1);
                    setShowReviewModal(false);
                    onRetake();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-300 bg-white text-zinc-800 hover:border-black font-medium transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake this one</span>
              </button>
            </div>

            {/* Use these photos button */}
            <button
              onClick={() => {
                soundEffects.playTap();
                setShowReviewModal(false);
              }}
              className="w-full py-3.5 rounded-full bg-black text-white font-medium text-sm shadow-md active:scale-98 transition cursor-pointer"
            >
              Use these photos
            </button>

            <button
              onClick={() => {
                setShowReviewModal(false);
                setShowRetakeConfirm(true);
              }}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Start the shots over
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Retake */}
      {showRetakeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-2">
              Start Shots Over?
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              This will return you to the camera booth to take fresh poses.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowRetakeConfirm(false)}
                className="px-4 py-2 rounded-full border border-zinc-300 text-zinc-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRetakeConfirm(false);
                  onRetake();
                }}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-medium"
              >
                Yes, Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
