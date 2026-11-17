/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sliders,
  Maximize,
  Minimize,
  Download,
  Lock,
  ChevronUp,
} from 'lucide-react';
import { ScreenState, KioskTelemetry, RemoteKioskConfig } from '../types';
import { soundEffects } from '../services/soundEffects';
import { safeStorageGet, safeStorageSet } from '../services/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface KioskNavBarProps {
  currentScreen: ScreenState;
  onNavigateScreen: (screen: ScreenState) => void;
  telemetry: KioskTelemetry;
  config: RemoteKioskConfig;
  onRequestAdmin: () => void;
}

export function enterBrowserFullscreenApi(): void {
  try {
    const nav = navigator as any;
    if (nav?.wakeLock && typeof nav.wakeLock.request === 'function') {
      nav.wakeLock.request('screen').catch(() => {});
    }
  } catch {
    // Ignore if blocked by browser permissions
  }
}

export function exitBrowserFullscreenApi(): void {
  try {
    const nav = navigator as any;
    if (nav?.keyboard && typeof nav.keyboard.unlock === 'function') {
      nav.keyboard.unlock();
    }
    const doc = document as any;
    const isFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (isFs) {
      if (typeof doc?.exitFullscreen === 'function') {
        doc.exitFullscreen().catch(() => {});
      } else if (typeof doc?.webkitExitFullscreen === 'function') {
        doc.webkitExitFullscreen();
      } else if (typeof doc?.mozCancelFullScreen === 'function') {
        doc.mozCancelFullScreen();
      } else if (typeof doc?.msExitFullscreen === 'function') {
        doc.msExitFullscreen();
      }
    }
  } catch {
    // Ignore
  }
}

export function lockKioskFullscreen(hideMenu: boolean = true): void {
  safeStorageSet('jcv_fullscreen_locked', 'true');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jcv_fullscreen_lock_changed', {
        detail: { locked: true, hideMenu },
      })
    );
  }
}

export function unlockKioskFullscreen(): void {
  safeStorageSet('jcv_fullscreen_locked', 'false');
  exitBrowserFullscreenApi();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jcv_fullscreen_lock_changed', {
        detail: { locked: false, hideMenu: false },
      })
    );
  }
}

export const KioskNavBar: React.FC<KioskNavBarProps> = ({
  currentScreen,
  config,
  onRequestAdmin,
}) => {
  // Fullscreen / Maximized Lock state (hides top menu bar cleanly without forcing native browser fullscreen blackout)
  const [isMaximizedLocked, setIsMaximizedLocked] = useState<boolean>(() => {
    return safeStorageGet('jcv_fullscreen_locked') === 'true';
  });
  // When maximized is toggled on, hide the top menu; swipe down from top reveals it again
  const [isTopMenuHidden, setIsTopMenuHidden] = useState<boolean>(() => {
    return safeStorageGet('jcv_fullscreen_locked') === 'true';
  });
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const swipeStartYRef = useRef<number | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const enterBrowserFullscreen = useCallback(() => {
    enterBrowserFullscreenApi();
  }, []);

  // Listen for external fullscreen lock changes (from Admin Dashboard toggle or Session Start auto-lock)
  useEffect(() => {
    const handleExternalLockChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ locked: boolean; hideMenu?: boolean }>;
      if (customEvt.detail) {
        setIsMaximizedLocked(Boolean(customEvt.detail.locked));
        setIsTopMenuHidden(
          customEvt.detail.hideMenu !== undefined
            ? Boolean(customEvt.detail.hideMenu)
            : Boolean(customEvt.detail.locked)
        );
      }
    };
    window.addEventListener('jcv_fullscreen_lock_changed', handleExternalLockChange);
    return () => window.removeEventListener('jcv_fullscreen_lock_changed', handleExternalLockChange);
  }, []);

  // Keep top menu hidden when navigating to another screen/tab while Maximized Lock is active
  useEffect(() => {
    if (isMaximizedLocked) {
      setIsTopMenuHidden(true);
    }
  }, [currentScreen, isMaximizedLocked]);

  useEffect(() => {
    if (secretTapCount === 0) return;
    const timer = setTimeout(() => setSecretTapCount(0), 2500);
    return () => clearTimeout(timer);
  }, [secretTapCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        soundEffects.playTap();
        unlockKioskFullscreen();
        onRequestAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRequestAdmin]);

  // Global iPadOS WebKit Fullscreen Swipe-Down Blocker (Capture Phase, 0px threshold)
  useEffect(() => {
    if (!isMaximizedLocked) return;

    const SWIPE_TOP_ZONE_PX = 36;
    const SWIPE_THRESHOLD_PX = 28;

    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const x = e.touches[0].clientX;
      lastTouchYRef.current = y;
      if (y <= SWIPE_TOP_ZONE_PX) {
        swipeStartYRef.current = y;
        swipeStartXRef.current = x;
      } else {
        swipeStartYRef.current = null;
        swipeStartXRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      lastTouchYRef.current = currentY;

      if (swipeStartYRef.current !== null) {
        const deltaY = currentY - swipeStartYRef.current;
        const deltaX = Math.abs(currentX - (swipeStartXRef.current ?? currentX));

        if (isTopMenuHidden && deltaY >= SWIPE_THRESHOLD_PX && deltaY > deltaX * 1.2) {
          swipeStartYRef.current = null;
          setIsTopMenuHidden(false);
          soundEffects.playTap();
        } else if (!isTopMenuHidden && deltaY <= -20) {
          swipeStartYRef.current = null;
          setIsTopMenuHidden(true);
        }
      }
    };

    const handleTouchEnd = () => {
      swipeStartYRef.current = null;
      swipeStartXRef.current = null;
      lastTouchYRef.current = null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.clientY <= SWIPE_TOP_ZONE_PX) {
        swipeStartYRef.current = e.clientY;
        swipeStartXRef.current = e.clientX;
      } else {
        swipeStartYRef.current = null;
        if (
          !isTopMenuHidden &&
          headerRef.current &&
          !headerRef.current.contains(e.target as Node) &&
          e.clientY > 48
        ) {
          setIsTopMenuHidden(true);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (swipeStartYRef.current === null) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) return;
      const deltaY = e.clientY - swipeStartYRef.current;
      const deltaX = Math.abs(e.clientX - (swipeStartXRef.current ?? e.clientX));

      if (isTopMenuHidden && deltaY >= SWIPE_THRESHOLD_PX && deltaY > deltaX * 1.2) {
        swipeStartYRef.current = null;
        setIsTopMenuHidden(false);
        soundEffects.playTap();
      } else if (!isTopMenuHidden && deltaY <= -20) {
        swipeStartYRef.current = null;
        setIsTopMenuHidden(true);
      }
    };

    const handlePointerUp = () => {
      swipeStartYRef.current = null;
      swipeStartXRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isMaximizedLocked, isTopMenuHidden]);

  useEffect(() => {
    try {
      const isStandalone =
        (typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
    } catch {
      // ignore
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const fsChange = () => {
      const doc = document as any;
      const activeFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsNativeFullscreen(activeFs);
    };
    document.addEventListener('fullscreenchange', fsChange);
    document.addEventListener('webkitfullscreenchange', fsChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', fsChange);
      document.removeEventListener('webkitfullscreenchange', fsChange);
    };
  }, [enterBrowserFullscreen]);

  const handleInstallApp = async () => {
    soundEffects.playTap();
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const toggleFullscreenLock = () => {
    soundEffects.playTap();
    if (!isMaximizedLocked) {
      lockKioskFullscreen(true);
    } else {
      unlockKioskFullscreen();
    }
  };

  // 4-tap secret gesture on the logo: unlocks maximize lock to minimize and opens Admin PIN modal
  const handleLogoSecretTap = () => {
    soundEffects.playTap();
    const next = secretTapCount + 1;
    if (next >= 4) {
      setSecretTapCount(0);
      unlockKioskFullscreen();
      onRequestAdmin();
      return;
    }
    setSecretTapCount(next);
  };

  return (
    <>
      {/* Top Menu Header: Normal in-flow when unlocked; slides down as overlay when swiped down in Maximized Lock mode */}
      <header
        ref={headerRef}
        className={`w-full bg-white/95 backdrop-blur-md border-b border-zinc-200 text-zinc-700 px-4 py-2.5 flex items-center justify-between text-xs select-none z-50 transition-all duration-300 ${
          isMaximizedLocked
            ? isTopMenuHidden
              ? 'fixed top-0 inset-x-0 -translate-y-full opacity-0 pointer-events-none shadow-none'
              : 'fixed top-0 inset-x-0 translate-y-0 opacity-100 shadow-lg'
            : 'relative translate-y-0 opacity-100'
        }`}
      >
        {/* Left: Kiosk Branding (4 rapid taps unlocks to minimize & opens hidden Admin PIN prompt) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-no-fullscreen-enforce="true"
            onClick={handleLogoSecretTap}
            className="flex items-center gap-2.5 text-zinc-900 hover:opacity-80 transition tracking-wider cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              J
            </div>
            <span className="font-semibold tracking-wide text-xs text-zinc-900">
              JCVcreatives <span className="text-zinc-500 font-normal">Photobooth</span>
            </span>
          </button>
        </div>

        {/* Right Controls: Install App + Hide Bar (when maximized) + Fullscreen Lock Toggle + Optional Admin */}
        <div className="flex items-center gap-1.5">
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallApp}
              title="Install Offline App"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black hover:bg-zinc-800 text-white text-[11px] font-medium transition cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* When Maximized Lock is active and user swiped down to show menu, allow hiding menu again with 1 tap */}
          {isMaximizedLocked && !isTopMenuHidden && (
            <button
              type="button"
              onClick={() => {
                soundEffects.playTap();
                setIsTopMenuHidden(true);
              }}
              title="Hide Top Menu (Swipe down from top to show again)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 text-[11px] font-medium transition cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hide Bar</span>
            </button>
          )}

          <button
            type="button"
            data-no-fullscreen-enforce="true"
            onClick={toggleFullscreenLock}
            title={
              isMaximizedLocked
                ? 'Fullscreen Locked (Tap to Unlock & Minimize)'
                : 'Lock Fullscreen & Hide Top Menu (Swipe down from top to reveal)'
            }
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition cursor-pointer ${
              isMaximizedLocked || isNativeFullscreen
                ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {isMaximizedLocked ? (
              <>
                <Lock className="w-3 h-3 text-amber-400" />
                <Minimize className="w-3.5 h-3.5" />
              </>
            ) : (
              <Maximize className="w-3.5 h-3.5" />
            )}
          </button>

          {config.showAdminInMenu && (
            <button
              type="button"
              data-no-fullscreen-enforce="true"
              onClick={() => {
                soundEffects.playTap();
                unlockKioskFullscreen();
                onRequestAdmin();
              }}
              title="Admin Settings & Kiosk Diagnostics"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                currentScreen === 'admin'
                  ? 'bg-black text-white border-black font-medium'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};


