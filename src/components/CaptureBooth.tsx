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

const POSE_PROMPTS = [
  { emoji: '✌️', subEmoji: '😄', label: 'Ready Pose!' },
  { emoji: '🫶', subEmoji: '✨', label: 'Ready Pose!' },
  { emoji: '🫰', subEmoji: '😎', label: 'Ready Pose!' },
  { emoji: '🤩', subEmoji: '💖', label: 'Ready Pose!' },
];

export const CaptureBooth: React.FC<CaptureBoothProps> = ({
  layout,
  filter,
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
  const [logoTapCount, setLogoTapCount] = useState(0);

  const currentPose = POSE_PROMPTS[currentShotIndex % POSE_PROMPTS.length];

  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        // 1. Check if stream is already live in memory for instant 0ms attachment
        const cached = cameraStreamService.getCachedStream(facingMode);
        if (cached && videoRef.current) {
          videoRef.current.srcObject = cached;
          videoRef.current.play().catch(() => {});
          setIsCameraActive(true);
          setCameraError(null);
          return;
        }

        // 2. Otherwise acquire/reuse from cameraStreamService
        const stream = await cameraStreamService.getOrStartStream(facingMode);
        if (!isMounted) return;

        // Re-assert fullscreen lock immediately after camera permission resolves
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
      // Intentionally DO NOT stop camera tracks on unmount so permission & stream stay active
    };
  }, [facingMode]);

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

  // Capture Snapshot
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.save();
        // Brightness adjustments
        ctx.filter = `brightness(${brightness}%)`;

        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      }
    } else {
      // High-quality artistic fallback canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;

      const hue = (currentShotIndex * 50 + 20) % 360;
      ctx.fillStyle = `hsl(${hue}, 20%, 93%)`;
      ctx.fillRect(0, 0, 800, 600);

      // Face silhouette
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(400, 260, 110, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(360, 240, 10, 0, Math.PI * 2);
      ctx.arc(440, 240, 10, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(400, 275, 50, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PHOTO ${currentShotIndex + 1}`, 400, 480);

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
    <div className="relative flex-1 h-full min-h-0 flex flex-col items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3 bg-[#faf8f5] text-zinc-900 select-none overflow-hidden max-w-3xl lg:max-w-4xl mx-auto w-full">
      {/* Flash effect overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Top Header Row + Non-Overlapping Ready Pose Banner */}
      <div className="w-full flex flex-col items-center gap-2 shrink-0 z-10">
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
                  : 'Tap shutter when ready'}
              </p>
            </div>
          </button>

          {/* Contained, Non-Overlapping Ready Pose Card */}
          <div
            className={`px-4 py-1.5 sm:px-6 sm:py-2 rounded-2xl border-2 shadow-sm flex items-center gap-2.5 sm:gap-3 transition-colors duration-200 overflow-hidden ${
              countdown !== null || isPreparingPose
                ? 'bg-zinc-900 text-white border-amber-400 shadow-md'
                : 'bg-white text-zinc-900 border-zinc-300'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                countdown !== null || isPreparingPose ? 'bg-white/10' : 'bg-zinc-100'
              }`}
            >
              <span className="text-2xl sm:text-3xl leading-none inline-block animate-pose-emoji select-none">
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
              <span className="text-sm sm:text-lg md:text-xl font-black tracking-wide uppercase leading-tight whitespace-nowrap mt-0.5">
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

      {/* Expanded Full-Size Camera Viewfinder (flex-1 min-h-0 prevents vertical overlap on any tablet screen) */}
      <div className="relative flex-1 w-full min-h-0 rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-200 shadow-lg flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: `${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoomLevel})`,
            filter: `brightness(${brightness}%)`,
          }}
          className="w-full h-full object-cover transition-all duration-200"
        />

        {/* Countdown Number Only inside Camera Screen */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30 animate-fadeIn pointer-events-none">
            <span className="font-sans font-light text-8xl sm:text-9xl text-white drop-shadow-lg animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Brightness / Exposure Slider */}
        <div className="absolute bottom-3 inset-x-6 z-20 flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xs max-w-xs w-full">
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
            <p className="text-xs text-zinc-500 mb-3">Camera simulated for this kiosk session</p>
            <button
              onClick={startCountdown}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium"
            >
              Snap Simulated Photo #{currentShotIndex + 1}
            </button>
          </div>
        )}
      </div>

      {/* Shot Progress Numbers: 1 2 3 4 */}
      <div className="flex items-center justify-center gap-6 my-1 text-xs font-medium text-zinc-400 shrink-0">
        {Array.from({ length: targetShotCount }).map((_, idx) => {
          const isDone = idx < capturedPhotos.length;
          const isCurrent = idx === currentShotIndex;
          return (
            <span
              key={idx}
              className={`transition-colors font-mono ${
                isCurrent
                  ? 'text-zinc-950 font-bold scale-110'
                  : isDone
                  ? 'text-zinc-950 font-semibold'
                  : 'text-zinc-400'
              }`}
            >
              {idx + 1}
            </span>
          );
        })}
      </div>

      {/* Shutter Row Controls */}
      <div className="w-full max-w-xl flex items-center justify-between px-6 pt-0.5 shrink-0">
        {/* Flash Toggle */}
        <button
          onClick={() => {
            soundEffects.playTap();
            setFlashEnabled((f) => !f);
          }}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
            flashEnabled
              ? 'bg-zinc-200 text-zinc-900'
              : 'bg-zinc-100 text-zinc-400'
          }`}
          title="Toggle Screen Flash"
        >
          {flashEnabled ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
        </button>

        {/* Big Circular iOS Shutter Button */}
        <button
          onClick={() => {
            soundEffects.playTap();
            startCountdown();
          }}
          disabled={countdown !== null || capturedPhotos.length >= targetShotCount}
          className="w-18 h-18 rounded-full border-4 border-zinc-300 p-1 flex items-center justify-center transition active:scale-90 cursor-pointer disabled:opacity-40"
          title="Take Photo"
        >
          <div className="w-full h-full rounded-full bg-black hover:bg-zinc-800 transition" />
        </button>

        {/* Zoom Indicator / Toggle */}
        <button
          onClick={() => {
            soundEffects.playTap();
            setZoomLevel((z) => (z === 1.0 ? 1.25 : z === 1.25 ? 1.5 : 1.0));
          }}
          className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-mono font-medium transition cursor-pointer"
          title="Zoom Level"
        >
          <span>{zoomLevel.toFixed(1)}x</span>
        </button>
      </div>

      {/* Timer Selector Pills: 3s 5s 10s */}
      <div className="flex items-center gap-2 mt-1.5 text-xs shrink-0">
        <Timer className="w-3.5 h-3.5 text-zinc-400" />
        {([3, 5, 10] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => {
              soundEffects.playTap();
              setTimerDuration(sec);
            }}
            className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
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
  );
};
