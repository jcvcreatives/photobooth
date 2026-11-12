/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  FlipHorizontal,
  Zap,
  ZapOff,
  Sun,
  Timer,
  Minus,
  Plus,
  ZoomIn,
} from 'lucide-react';
import { FrameLayoutType, PhotoFilterType } from '../types';
import { soundEffects } from '../services/soundEffects';
import { cameraStreamService } from '../services/cameraStreamService';
import { safeStorageGet } from '../services/storage';
import { enterBrowserFullscreenApi } from './KioskNavBar';

interface CaptureBoothProps {
  layout: FrameLayoutType;
  filter: PhotoFilterType;
  onCapturesComplete: (photos: string[]) => void;
  onCancel: () => void;
  onSecretAdminTap?: () => void;
}

const MIN_CAMERA_ZOOM = 1.0;
const MAX_CAMERA_ZOOM = 3.0;

function clampZoom(z: number): number {
  return Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, Number(z.toFixed(2))));
}

function clampPanForZoom(pan: { x: number; y: number }, zoom: number): { x: number; y: number } {
  const maxPan = Math.max(0, (zoom - 1) / 2);
  return {
    x: Math.max(-maxPan, Math.min(maxPan, pan.x)),
    y: Math.max(-maxPan, Math.min(maxPan, pan.y)),
  };
}

const POSE_PROMPTS = [
  { emoji: '✌️', subEmoji: '😄', label: 'Ready Pose!' },
  { emoji: '🫶', subEmoji: '✨', label: 'Ready Pose!' },
  { emoji: '🫰', subEmoji: '😎', label: 'Ready Pose!' },
  { emoji: '🤩', subEmoji: '💖', label: 'Ready Pose!' },
];

export const CaptureBooth: React.FC<CaptureBoothProps> = ({
  layout,
  onCapturesComplete,
  onSecretAdminTap,
}) => {
  const targetShotCount =
    layout === 'single_polaroid' ? 1 : layout === 'grid_4' ? 2 : layout === 'strip_3' ? 3 : 4;

  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPreparingPose, setIsPreparingPose] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [facingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(() =>
    cameraStreamService.hasLiveStream('user')
  );
  const [brightness, setBrightness] = useState<number>(100);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState<3 | 5 | 10>(3);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isGestureActive, setIsGestureActive] = useState<boolean>(false);
  const [showZoomHud, setShowZoomHud] = useState<boolean>(false);
  const [logoTapCount, setLogoTapCount] = useState(0);

  const currentPose = POSE_PROMPTS[currentShotIndex % POSE_PROMPTS.length];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const zoomHudTimeoutRef = useRef<number | null>(null);

  // Multi-pointer tracking for pinch-to-zoom & framing pan
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialMidX: number;
    initialMidY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const triggerZoomHud = () => {
    setShowZoomHud(true);
    if (zoomHudTimeoutRef.current !== null) {
      window.clearTimeout(zoomHudTimeoutRef.current);
    }
    zoomHudTimeoutRef.current = window.setTimeout(() => {
      setShowZoomHud(false);
    }, 1800);
  };

  const applyZoomAndClampPan = (nextZoomRaw: number, customPan?: { x: number; y: number }) => {
    const nextZoom = clampZoom(nextZoomRaw);
    setZoomLevel(nextZoom);
    setPanOffset((prevPan) => clampPanForZoom(customPan ?? prevPan, nextZoom));
    triggerZoomHud();
  };

  useEffect(() => {
    return () => {
      if (zoomHudTimeoutRef.current !== null) {
        window.clearTimeout(zoomHudTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);

  // Attach persistent camera stream (never stops tracks on unmount so permission stays alive)
  useEffect(() => {
    let isMounted = true;

    async function attachPersistentCamera() {
      try {
        const cached = cameraStreamService.getCachedStream(facingMode);
        if (cached && videoRef.current) {
          videoRef.current.srcObject = cached;
          videoRef.current.play().catch(() => {});
          setIsCameraActive(true);
          setCameraError(null);
          return;
        }

        const stream = await cameraStreamService.getOrStartStream(facingMode);
        if (!isMounted) return;

        if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
          enterBrowserFullscreenApi();
        }

        if (stream) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsCameraActive(true);
          setCameraError(null);
        } else {
          setIsCameraActive(false);
          setCameraError('Camera access unavailable. Using studio simulation.');
        }
      } catch {
        if (!isMounted) return;
        setIsCameraActive(false);
        setCameraError('Camera access unavailable. Using studio simulation.');
      }
    }

    attachPersistentCamera();

    return () => {
      isMounted = false;
    };
  }, [facingMode]);

  // Attach native non-passive wheel listener to viewfinder for smooth trackpad pinch / wheel zoom
  useEffect(() => {
    const el = viewfinderRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * (e.ctrlKey ? 0.01 : 0.0025);
      if (Math.abs(delta) < 0.001) return;

      setZoomLevel((prevZoom) => {
        const nextZoom = clampZoom(prevZoom + delta);
        setPanOffset((prevPan) => clampPanForZoom(prevPan, nextZoom));
        return nextZoom;
      });
      triggerZoomHud();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Multi-touch Pinch-to-Zoom + Framing Pan on Viewfinder
  const handleViewfinderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length >= 2) {
      // Two-finger Pinch-to-Zoom + Two-Finger Pan
      const [p1, p2] = pointers;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      pinchStateRef.current = {
        initialDistance: Math.max(24, dist),
        initialZoom: zoomLevel,
        initialMidX: midX,
        initialMidY: midY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
      dragStateRef.current = null;
      setIsGestureActive(true);
      triggerZoomHud();
      return;
    }

    if (pointers.length === 1 && zoomLevel > 1.01) {
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y,
      };
      setIsGestureActive(true);
      triggerZoomHud();
    }
  };

  const handleViewfinderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointersRef.current.values());
    const rect = e.currentTarget.getBoundingClientRect();
    const viewW = Math.max(200, rect.width);
    const viewH = Math.max(200, rect.height);

    // Handle 2-finger pinch-to-zoom & midpoint pan
    if (pointers.length >= 2 && pinchStateRef.current) {
      const [p1, p2] = pointers;
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentMidX = (p1.x + p2.x) / 2;
      const currentMidY = (p1.y + p2.y) / 2;

      const scaleRatio = currentDist / pinchStateRef.current.initialDistance;
      const nextZoom = clampZoom(pinchStateRef.current.initialZoom * scaleRatio);

      const deltaMidX = (currentMidX - pinchStateRef.current.initialMidX) / viewW;
      const deltaMidY = (currentMidY - pinchStateRef.current.initialMidY) / viewH;

      const rawPan = {
        x: pinchStateRef.current.initialPanX + deltaMidX,
        y: pinchStateRef.current.initialPanY + deltaMidY,
      };

      setZoomLevel(nextZoom);
      setPanOffset(clampPanForZoom(rawPan, nextZoom));
      triggerZoomHud();
      return;
    }

    // Handle 1-finger drag when zoomed in to pan framing
    if (pointers.length === 1 && dragStateRef.current) {
      const dx = (e.clientX - dragStateRef.current.startX) / viewW;
      const dy = (e.clientY - dragStateRef.current.startY) / viewH;

      setPanOffset(
        clampPanForZoom(
          {
            x: dragStateRef.current.origX + dx,
            y: dragStateRef.current.origY + dy,
          },
          zoomLevel
        )
      );
      triggerZoomHud();
    }
  };

  const handleViewfinderPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const remaining = Array.from(activePointersRef.current.values());
    if (remaining.length < 2) {
      pinchStateRef.current = null;
    }
    if (remaining.length === 1 && zoomLevel > 1.01) {
      // Smoothly transition from 2-finger pinch to 1-finger pan if one finger remains down
      const [p1] = remaining;
      dragStateRef.current = {
        startX: p1.x,
        startY: p1.y,
        origX: panOffset.x,
        origY: panOffset.y,
      };
    } else if (remaining.length === 0) {
      dragStateRef.current = null;
      setIsGestureActive(false);
    }
  };

  // Toggle horizontal camera mirror
  const toggleCameraMirror = () => {
    soundEffects.playTap();
    setIsMirrored((prev) => !prev);
  };

  // Start Countdown Sequence
  const startCountdown = () => {
    if (countdown !== null || isPreparingPose) return;
    if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
      enterBrowserFullscreenApi();
    }
    soundEffects.playCountdownBeep(false);
    setCountdown(timerDuration);
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 1) {
      const timer = setTimeout(() => {
        soundEffects.playCountdownBeep(false);
        setCountdown((c) => (c ? c - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 1) {
      const timer = setTimeout(() => {
        soundEffects.playCountdownBeep(true);
        takeSnapshot();
        setCountdown(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Capture Snapshot (preserving pinch-to-zoom & pan framing)
  const takeSnapshot = () => {
    soundEffects.playShutter();
    if (flashEnabled) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 220);
    }

    let dataUrl = '';

    if (isCameraActive && videoRef.current && videoRef.current.videoWidth) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const targetW = 800;
      const targetH = 600;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.save();
        ctx.filter = `brightness(${brightness}%)`;
        ctx.translate(
          targetW / 2 + panOffset.x * targetW,
          targetH / 2 + panOffset.y * targetH
        );
        ctx.scale(isMirrored ? -zoomLevel : zoomLevel, zoomLevel);

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scaleCover = Math.max(targetW / vw, targetH / vh);
        const drawW = vw * scaleCover;
        const drawH = vh * scaleCover;
        ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      }
    } else {
      // High-quality artistic fallback canvas (also respects pinch-to-zoom & pan framing)
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;

      const hue = (currentShotIndex * 50 + 20) % 360;
      ctx.fillStyle = `hsl(${hue}, 20%, 93%)`;
      ctx.fillRect(0, 0, 800, 600);

      ctx.save();
      ctx.translate(400 + panOffset.x * 800, 300 + panOffset.y * 600);
      ctx.scale(isMirrored ? -zoomLevel : zoomLevel, zoomLevel);
      ctx.translate(-400, -300);

      // Face silhouette
      ctx.fillStyle = '#f1c27d';
      ctx.beginPath();
      ctx.arc(400, 230, 105, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(360, 210, 10, 0, Math.PI * 2);
      ctx.arc(440, 210, 10, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(400, 245, 48, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PHOTO ${currentShotIndex + 1}`, 400, 480);
      ctx.restore();

      dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    }

    const nextPhotos = [...capturedPhotos, dataUrl];
    setCapturedPhotos(nextPhotos);

    const nextIndex = currentShotIndex + 1;
    if (nextIndex < targetShotCount) {
      setCurrentShotIndex(nextIndex);
      setIsPreparingPose(true);
      setTimeout(() => {
        setIsPreparingPose(false);
        soundEffects.playCountdownBeep(false);
        setCountdown(timerDuration);
      }, 1600);
    } else {
      soundEffects.playSuccessChime();
      setTimeout(() => {
        onCapturesComplete(nextPhotos);
      }, 600);
    }
  };

  return (
    <div className="relative flex-1 h-full min-h-0 flex flex-col items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-3 bg-[#faf8f5] text-zinc-900 select-none overflow-hidden max-w-3xl lg:max-w-4xl mx-auto w-full">
      {/* Flash effect overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Top Header Row + Non-Overlapping Ready Pose Banner */}
      <div className="w-full flex flex-col items-center gap-1.5 shrink-0 z-10">
        <div className="w-full flex items-center justify-between">
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
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              J
            </span>
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-bold text-zinc-950 leading-none">
                Photo {Math.min(currentShotIndex + 1, targetShotCount)} of {targetShotCount}
              </h1>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                {countdown !== null
                  ? `Capturing in ${countdown}...`
                  : isPreparingPose
                  ? 'Get ready for next shot...'
                  : zoomLevel > 1.01
                  ? `${zoomLevel.toFixed(1)}x Zoom • Drag to adjust frame`
                  : 'Pinch to zoom • Tap shutter when ready'}
              </p>
            </div>
          </button>

          {/* Contained, Non-Overlapping Ready Pose Card */}
          <div
            className={`px-3.5 py-1 sm:px-5 sm:py-1.5 rounded-2xl border-2 shadow-sm flex items-center gap-2.5 transition-colors duration-200 overflow-hidden ${
              countdown !== null || isPreparingPose
                ? 'bg-zinc-900 text-white border-amber-400 shadow-md'
                : 'bg-white text-zinc-900 border-zinc-300'
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                countdown !== null || isPreparingPose ? 'bg-white/10' : 'bg-zinc-100'
              }`}
            >
              <span className="text-xl sm:text-2xl leading-none inline-block animate-pose-emoji select-none">
                {currentPose.emoji}
              </span>
            </div>
            <div className="flex flex-col text-left pr-1">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider leading-none ${
                  countdown !== null || isPreparingPose ? 'text-amber-300' : 'text-zinc-500'
                }`}
              >
                Shot #{Math.min(currentShotIndex + 1, targetShotCount)} {currentPose.subEmoji}
              </span>
              <span className="text-xs sm:text-base font-black tracking-wide uppercase leading-tight whitespace-nowrap mt-0.5">
                {currentPose.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCameraMirror}
            title={isMirrored ? 'Mirror On (Tap to Un-Mirror)' : 'Mirror Off (Tap to Mirror)'}
            className={`p-2.5 rounded-full transition cursor-pointer flex items-center justify-center shrink-0 ${
              isMirrored
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'bg-zinc-200/80 hover:bg-zinc-300/80 text-zinc-700'
            }`}
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Full-Size Camera Viewfinder with Pinch-to-Zoom & Pan Framing */}
      <div
        ref={viewfinderRef}
        onPointerDown={handleViewfinderPointerDown}
        onPointerMove={handleViewfinderPointerMove}
        onPointerUp={handleViewfinderPointerEnd}
        onPointerCancel={handleViewfinderPointerEnd}
        style={{ touchAction: 'none' }}
        className={`relative flex-1 w-full min-h-0 rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-200 shadow-lg flex items-center justify-center ${
          zoomLevel > 1.01 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: `translate3d(${panOffset.x * 100}%, ${panOffset.y * 100}%, 0) scaleX(${
              isMirrored ? -zoomLevel : zoomLevel
            }) scaleY(${zoomLevel})`,
            filter: `brightness(${brightness}%)`,
          }}
          className={`w-full h-full object-cover ${
            isGestureActive ? 'transition-none' : 'transition-transform duration-150 ease-out'
          }`}
        />

        {/* Live Pinch-to-Zoom Indicator & Quick Reset HUD */}
        {(showZoomHud || zoomLevel > 1.01) && countdown === null && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white border border-white/20 shadow-md text-xs font-mono transition-opacity duration-200"
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-bold">{zoomLevel.toFixed(2).replace(/\.00$/, '.0')}x</span>
            {zoomLevel > 1.01 && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTap();
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="ml-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[10px] font-sans font-bold uppercase tracking-wider cursor-pointer transition"
                title="Reset Zoom & Framing to 1.0x"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Countdown Number Only inside Camera Screen */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30 animate-fadeIn pointer-events-none">
            <span className="font-sans font-light text-8xl sm:text-9xl text-white drop-shadow-lg animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Brightness / Exposure Slider */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-2.5 inset-x-6 z-20 flex items-center justify-center"
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xs max-w-xs w-full">
            <Sun className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <input
              type="range"
              min="70"
              max="130"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>

        {/* Camera fallback message */}
        {cameraError && !isCameraActive && (
          <div className="absolute inset-0 bg-zinc-100 flex flex-col items-center justify-center p-4 text-center z-10 text-zinc-800">
            <Camera className="w-8 h-8 text-zinc-400 mb-2" />
            <p className="text-xs text-zinc-500 mb-3">{cameraError}</p>
            <button
              onClick={startCountdown}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium cursor-pointer"
            >
              Snap Simulated Photo #{currentShotIndex + 1}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Timer Bar */}
      <div className="w-full max-w-xl flex items-center justify-between px-3 pt-0.5 shrink-0">
        {/* Left: Flash + Timer Selector Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              soundEffects.playTap();
              setFlashEnabled((f) => !f);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
              flashEnabled
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-100 text-zinc-400'
            }`}
            title="Toggle Screen Flash"
          >
            {flashEnabled ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1 text-xs">
            <Timer className="w-3.5 h-3.5 text-zinc-400 hidden sm:inline" />
            {([3, 5, 10] as const).map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  soundEffects.playTap();
                  setTimerDuration(sec);
                }}
                className={`px-2.5 py-1 rounded-full font-medium text-[11px] transition cursor-pointer ${
                  timerDuration === sec
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Center: Big Circular Shutter Button */}
        <button
          onClick={() => {
            soundEffects.playTap();
            startCountdown();
          }}
          disabled={countdown !== null || capturedPhotos.length >= targetShotCount}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-zinc-300 p-1 flex items-center justify-center transition active:scale-90 cursor-pointer disabled:opacity-40"
          title="Take Photo"
        >
          <div className="w-full h-full rounded-full bg-black hover:bg-zinc-800 transition" />
        </button>

        {/* Right: Shot Progress + Interactive Zoom Control */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 mr-0.5">
            {Array.from({ length: targetShotCount }).map((_, idx) => {
              const isDone = idx < capturedPhotos.length;
              const isCurrent = idx === currentShotIndex;
              return (
                <span
                  key={idx}
                  className={
                    isCurrent
                      ? 'text-zinc-950 font-black scale-110'
                      : isDone
                      ? 'text-zinc-950 font-semibold'
                      : 'text-zinc-400'
                  }
                >
                  {idx + 1}
                </span>
              );
            })}
          </div>

          <div className="flex items-center bg-zinc-100 rounded-full p-0.5 border border-zinc-200/80">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTap();
                applyZoomAndClampPan(zoomLevel - 0.25);
              }}
              disabled={zoomLevel <= MIN_CAMERA_ZOOM}
              className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-200 disabled:opacity-35 cursor-pointer transition"
              title="Zoom Out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.playTap();
                const nextPreset =
                  zoomLevel < 1.25
                    ? 1.5
                    : zoomLevel < 1.9
                    ? 2.0
                    : zoomLevel < 2.8
                    ? 3.0
                    : 1.0;
                applyZoomAndClampPan(nextPreset, nextPreset === 1.0 ? { x: 0, y: 0 } : undefined);
              }}
              className="px-2 py-1 text-zinc-900 text-[11px] font-mono font-bold cursor-pointer"
              title="Tap to cycle zoom presets or pinch camera feed"
            >
              {zoomLevel.toFixed(1)}x
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.playTap();
                applyZoomAndClampPan(zoomLevel + 0.25);
              }}
              disabled={zoomLevel >= MAX_CAMERA_ZOOM}
              className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-200 disabled:opacity-35 cursor-pointer transition"
              title="Zoom In"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

