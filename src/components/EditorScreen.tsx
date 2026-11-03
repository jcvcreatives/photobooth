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
  FUN_STICKERS,
  THEME_GROUPS,
  THERMAL_BRIGHTNESS_PRESETS,
  renderPhotostripCanvas,
} from '../services/frameTemplates';
import { thermalPrinterService } from '../services/thermalPrinter';
import { soundEffects } from '../services/soundEffects';

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

  const [filter, setFilter] = useState<PhotoFilterType>(initialFilter);
  const [printBrightness, setPrintBrightness] = useState<number>(brightness ?? 45);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [themePage, setThemePage] = useState<number>(0);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);

  // Modals for the clean kiosk flows
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showStickersDrawer, setShowStickersDrawer] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(3);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);

  const stripContainerRef = useRef<HTMLDivElement | null>(null);
  const activeStickerDragRef = useRef<{ id: string; startX: number; startY: number; stickerX: number; stickerY: number } | null>(null);

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
          photos,
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
  }, [photos, currentLayout, thermalTheme, digitalTheme, filter, previewView, printBrightness]);

  // Add Sticker to strip
  const handleAddSticker = (emoji: string) => {
    soundEffects.playTap();
    const newSticker: StickerItem = {
      id: `st-${Date.now()}-${Math.random()}`,
      emoji,
      x: 40 + Math.random() * 20,
      y: 20 + Math.random() * 50,
      scale: 1.0,
      rotation: Math.round((Math.random() - 0.5) * 15),
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
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
        photos,
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
        photos,
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
        photos,
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
          Pick your Gobble Haus frame style, then print
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
            className="relative rounded-2xl shadow-md overflow-hidden max-h-[34vh] sm:max-h-[38vh] flex items-center justify-center bg-white border border-zinc-200 select-none p-1 shrink-0"
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Photostrip Preview"
                className="max-h-[32vh] sm:max-h-[36vh] w-auto object-contain rounded-xl select-none pointer-events-none"
              />
            ) : (
              <div className="w-44 h-60 flex items-center justify-center text-zinc-400 font-mono text-xs">
                Rendering...
              </div>
            )}

            {/* Draggable Stamps Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {stickers.map((st) => {
                const isSelected = selectedStickerId === st.id;
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
                    <span className="text-2xl sm:text-3xl leading-none select-none pointer-events-none drop-shadow">
                      {st.emoji}
                    </span>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSticker(st.id);
                        }}
                        className="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Bottom Controls under Preview */}
          <div className="mt-1 text-center space-y-1 shrink-0">
            <div className="flex items-center justify-center gap-2">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundEffects.playTap();
                    setSelectedPhotoIndex(idx);
                    setShowReviewModal(true);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-zinc-200 hover:border-black transition active:scale-95 shadow-2xs cursor-pointer"
                  title={`Tap to retake Shot #${idx + 1} (${retakesLeft} left)`}
                >
                  <img src={p} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 pt-0.5">
              <button
                onClick={() => setShowStickersDrawer((s) => !s)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-[11px] font-medium transition cursor-pointer shadow-2xs"
              >
                <Smile className="w-3 h-3" />
                <span>Add stickers</span>
              </button>

              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-[11px] font-medium transition cursor-pointer shadow-2xs"
              >
                <Sliders className="w-3 h-3" />
                <span>Filters & Retake ({retakesLeft})</span>
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

          {/* Zero-Scroll 3x2 Template Grid (All 6 Gobble Haus frames fit simultaneously) */}
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

          {/* Stickers Drawer (if opened) */}
          {showStickersDrawer && (
            <div className="p-2 bg-white rounded-2xl border border-zinc-200 shadow-sm animate-fadeIn shrink-0">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-100 text-xs">
                <span className="font-semibold text-zinc-900">Tap a Sticker to Add</span>
                <button
                  onClick={() => setShowStickersDrawer(false)}
                  className="text-zinc-400 hover:text-zinc-900"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-lg">
                {FUN_STICKERS.slice(0, 18).map((emojiStr, i) => (
                  <button
                    key={i}
                    onClick={() => handleAddSticker(emojiStr)}
                    className="p-0.5 hover:scale-125 transition cursor-pointer shrink-0"
                  >
                    {emojiStr}
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

      {/* Modal 1: Review Photos & Filters */}
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
              {photos[selectedPhotoIndex] && (
                <img
                  src={photos[selectedPhotoIndex]}
                  alt="Selected Shot"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Thumbnail row */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-10 h-10 rounded-lg overflow-hidden border transition ${
                    selectedPhotoIndex === idx
                      ? 'border-black ring-2 ring-black/20 scale-105'
                      : 'border-zinc-200 opacity-60'
                  }`}
                >
                  <img src={p} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Actions: Mirror & Retake this one */}
            <div className="flex items-center gap-4 text-xs text-zinc-600 mb-4">
              <button
                onClick={() => soundEffects.playTap()}
                className="flex items-center gap-1 hover:text-zinc-900"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Mirror</span>
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  soundEffects.playTap();
                  if (retakesLeft > 0) {
                    setRetakesLeft((r) => r - 1);
                    setShowReviewModal(false);
                    onRetake();
                  }
                }}
                className="flex items-center gap-1 hover:text-zinc-900"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake this one</span>
              </button>
            </div>

            {/* Filter Slider Section */}
            <div className="w-full mb-5 text-left">
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 block mb-1.5">
                FILTER
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVAILABLE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      soundEffects.playTap();
                      setFilter(f.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      filter === f.id
                        ? 'bg-black text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Use these photos button */}
            <button
              onClick={() => {
                soundEffects.playTap();
                setShowReviewModal(false);
              }}
              className="w-full py-3.5 rounded-full bg-black text-white font-medium text-sm shadow-md active:scale-98 transition"
            >
              Use these photos
            </button>

            <button
              onClick={() => {
                setShowReviewModal(false);
                setShowRetakeConfirm(true);
              }}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-900"
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
