/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Maximize,
  Minimize,
  Download,
  Lock,
  ChevronUp,
  ChevronDown,
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
    const doc = document as any;
    const isFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFs && typeof document !== 'undefined') {
      const el = (document.documentElement || document.body) as any;
      if (el) {
        if (typeof el.requestFullscreen === 'function') {
          el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
            try {
              el.requestFullscreen().catch(() => {});
            } catch {
              // Ignore if blocked by iframe/browser policy
            }
          });
        } else if (typeof el.webkitRequestFullscreen === 'function') {
          el.webkitRequestFullscreen();
        } else if (typeof el.webkitEnterFullscreen === 'function') {
          el.webkitEnterFullscreen();
        } else if (typeof el.mozRequestFullScreen === 'function') {
          el.mozRequestFullScreen();
        } else if (typeof el.msRequestFullscreen === 'function') {
          el.msRequestFullscreen();
        }
      }
    }

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
  enterBrowserFullscreenApi();
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
  const [isMaximizedLocked, setIsMaximizedLocked] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const doc = document as any;
      const activeFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      if (!activeFs) {
        safeStorageSet('jcv_fullscreen_locked', 'false');
        return false;
      }
    }
    return safeStorageGet('jcv_fullscreen_locked') === 'true';
  });
  const [isTopMenuHidden, setIsTopMenuHidden] = useState<boolean>(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isAndroidWebView =
    typeof window !== 'undefined' && Boolean((window as unknown as { AndroidPrinter?: unknown }).AndroidPrinter);

  const headerRef = useRef<HTMLElement | null>(null);
  const wasNativeFsRef = useRef<boolean>(false);

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

  useEffect(() => {
    if (isMaximizedLocked) {
      setIsTopMenuHidden(true);
    } else {
      setIsTopMenuHidden(false);
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
      if (wasNativeFsRef.current && !activeFs) {
        // User pressed Esc or exited native browser fullscreen
        safeStorageSet('jcv_fullscreen_locked', 'false');
        setIsMaximizedLocked(false);
        setIsTopMenuHidden(false);
        window.dispatchEvent(
          new CustomEvent('jcv_fullscreen_lock_changed', {
            detail: { locked: false, hideMenu: false },
          })
        );
      }
      wasNativeFsRef.current = activeFs;
    };
    document.addEventListener('fullscreenchange', fsChange);
    document.addEventListener('webkitfullscreenchange', fsChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', fsChange);
      document.removeEventListener('webkitfullscreenchange', fsChange);
    };
  }, []);

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
      {/* Subtle Top-Right Reveal Pill when Maximized & Top Menu Hidden */}
      {isMaximizedLocked && isTopMenuHidden && (
        <button
          type="button"
          onClick={() => {
            soundEffects.playTap();
            setIsTopMenuHidden(false);
          }}
          title="Show Top Bar"
          className="fixed top-2 right-2 z-50 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-xs backdrop-blur-xs flex items-center gap-1 text-[10px] font-medium cursor-pointer transition"
        >
          <ChevronDown className="w-3 h-3" />
          <span>Menu</span>
        </button>
      )}

      {/* Top Menu Header */}
      {(!isMaximizedLocked || !isTopMenuHidden) && (
        <header
          ref={headerRef}
          className="w-full shrink-0 bg-white/95 backdrop-blur-md border-b border-zinc-200 text-zinc-700 px-4 py-2 flex items-center justify-between text-xs select-none z-50"
        >
          {/* Left: Kiosk Branding (4 rapid taps opens Admin PIN prompt) */}
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

          {/* Right Controls: Download .APK + Install App + Hide Bar (when maximized) + Maximize Toggle + Optional Admin */}
          <div className="flex items-center gap-1.5">
            {!isAndroidWebView && (
              <a
                href="./JCVcreatives-Photobooth.apk"
                download="JCVcreatives-Photobooth.apk"
                data-no-fullscreen-enforce="true"
                onClick={() => soundEffects.playTap()}
                title="Download Offline Android 7+ APK (JCVcreatives-Photobooth.apk)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .APK</span>
              </a>
            )}

            {!isInstalled && deferredPrompt && (
              <button
                onClick={handleInstallApp}
                title="Install Offline App"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-[11px] font-medium transition cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {isMaximizedLocked && !isTopMenuHidden && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTap();
                  setIsTopMenuHidden(true);
                }}
                title="Hide Top Menu"
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
                  ? 'Maximized (Tap to Restore Top Bar)'
                  : 'Maximize & Hide Top Bar'
              }
              className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition cursor-pointer ${
                isMaximizedLocked || isNativeFullscreen
                  ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {isMaximizedLocked ? (
                <>
                  <Lock className="w-3 h-3 text-zinc-300" />
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
      )}
    </>
  );
};


