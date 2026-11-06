/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Tablet, X, WifiOff, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [offlineReadyToast, setOfflineReadyToast] = useState(false);
  const [showOfflineModeBanner, setShowOfflineModeBanner] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    try {
      // Detect standalone mode (already installed PWA or Android WebView)
      const isStandalone =
        (typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);

      // Detect iOS devices
      const userAgent = (window.navigator?.userAgent || '').toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    } catch {
      // Ignore in restricted WebViews
    }

    let offlineTimer: ReturnType<typeof setTimeout> | null = null;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShowOfflineModeBanner(true);
      offlineTimer = setTimeout(() => setShowOfflineModeBanner(false), 10000);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineModeBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineModeBanner(true);
      if (offlineTimer) clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => setShowOfflineModeBanner(false), 10000);
    };

    const handleOfflineReady = () => {
      setOfflineReadyToast(true);
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = setTimeout(() => setOfflineReadyToast(false), 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('jcv-offline-ready', handleOfflineReady);

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      if (readyTimer) clearTimeout(readyTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('jcv-offline-ready', handleOfflineReady);
    };
  }, []);

  const handleInstallClick = async () => {
    soundEffects.playTap();
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Cache Ready Toast (visible for 10 seconds) */}
      {offlineReadyToast && isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-emerald-950/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-emerald-100 shadow-xl border border-emerald-700/60 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span className="text-[11px] tracking-wide">Ready for offline use — camera, vouchers, frames &amp; printing cached.</span>
        </div>
      )}

      {/* Offline Mode Active Toast Indicator (visible for 10 seconds, then auto-hides) */}
      {!isOnline && showOfflineModeBanner && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-full bg-zinc-950/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-zinc-200 shadow-2xl border border-zinc-800 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <span className="text-[11px] tracking-wide">Offline mode active — camera, vouchers, frames &amp; printing ready.</span>
        </div>
      )}

      {/* In-App Tablet/Desktop PWA Install Prompt Banner */}
      {!isInstalled && !dismissedBanner && (deferredPrompt || isIOS) && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md max-w-sm text-zinc-100 animate-fadeIn">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Tablet className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-zinc-100 tracking-tight">Install Offline App</div>
            <div className="text-[10px] text-zinc-400">Run fullscreen & 100% offline without internet</div>
          </div>
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : (
            <button
              onClick={() => {
                soundEffects.playTap();
                setShowIOSGuide(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
            >
              How to Install
            </button>
          )}
          <button
            onClick={() => setDismissedBanner(true)}
            className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* iOS Safari Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-300 mb-2">Install Offline App on iPad / iPhone</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              1. Tap the Safari <span className="text-zinc-200 font-medium">Share</span> button in the browser bar.<br />
              2. Scroll down and tap <span className="text-zinc-200 font-medium">Add to Home Screen</span>.<br />
              3. Launch from your home screen for fullscreen offline operation.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-200 hover:bg-zinc-700 border border-zinc-700/60 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

