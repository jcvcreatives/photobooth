import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Signal to standalone/WebView bootstrapper that React bundle has started mounting
(window as unknown as { __JCV_MOUNTED__?: boolean }).__JCV_MOUNTED__ = true;

// Polyfill navigator.mediaDevices.getUserMedia for older Android 7 WebViews
try {
  if (typeof navigator !== 'undefined') {
    const nav = navigator as any;
    if (!nav.mediaDevices) {
      nav.mediaDevices = {};
    }
    if (!nav.mediaDevices.getUserMedia) {
      const legacyGetUserMedia =
        nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia;
      if (legacyGetUserMedia) {
        nav.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
          new Promise((resolve, reject) => {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
          });
      }
    }
  }
} catch {
  // Ignore in restricted environments
}

// Suppress native browser window.print() popup modal so kiosk printing is always 100% silent
try {
  if (typeof window !== 'undefined') {
    window.print = () => {
      // Kiosk silent print lock: prevents native browser print preview dialog from blocking the screen
    };
  }
} catch {
  // Ignore
}

// Critical booth assets to warm in CacheStorage for 9–12 hour offline operation
const CRITICAL_OFFLINE_ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './apple-touch-icon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
  './assets/aistudio/02_tapa_and_garlic_rice_77785a88.png',
  './assets/aistudio/03_hotdogs_and_scrambled_egg_28f526aa.png',
  './assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
  './assets/aistudio/06_beef_and_egg_rice_062af470.png',
  './assets/aistudio/07_luncheon_meat_rice_8770438d.png',
  './assets/aistudio/08_beef_and_scrambled_egg_177c915a.png',
  './assets/aistudio/09_creamy_chicken_and_egg_rice_bfe9e7b2.png',
];

export async function warmKioskOfflineCache(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const cache = await caches.open('jcv-kiosk-offline-shell-v1');
    let cachedCount = 0;

    // Cache all loaded script & stylesheet URLs on the page plus critical assets
    const resourceUrls = new Set<string>(CRITICAL_OFFLINE_ASSETS);
    document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((el) => {
      const src = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
      if (src && src.startsWith(window.location.origin)) {
        resourceUrls.add(src);
      }
    });

    await Promise.allSettled(
      Array.from(resourceUrls).map(async (url) => {
        try {
          const req = new Request(url, { cache: 'reload' });
          const res = await fetch(req);
          if (res && (res.ok || res.type === 'opaque')) {
            await cache.put(url, res);
            cachedCount += 1;
          }
        } catch {
          // Already cached or offline
        }
      })
    );

    window.dispatchEvent(
      new CustomEvent('jcv-offline-ready', { detail: { cachedCount } })
    );
    return cachedCount;
  } catch {
    return 0;
  }
}

// Register Service Worker for 100% offline 9–12 hour booth operation
try {
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('jcv-offline-ready'));
    },
    onRegisteredSW(_swUrl, registration) {
      // Warm critical kiosk assets in CacheStorage as soon as SW is registered
      warmKioskOfflineCache().catch(() => {});
      // Request persistent storage on Galaxy Tab A11 so Android never evicts the offline cache
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        navigator.storage.persist().catch(() => {});
      }
      if (registration) {
        window.dispatchEvent(new CustomEvent('jcv-offline-ready'));
      }
    },
    onNeedRefresh() {
      // Auto-apply new service worker in the background
      updateSW(true).catch(() => {});
    },
  });
} catch {
  // Fallback in environments where virtual SW registration is unavailable
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      warmKioskOfflineCache().catch(() => {});
    });
  }
}


class KioskErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#faf8f5] text-zinc-900 p-6 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-sky-300 text-slate-950 flex items-center justify-center font-bold text-xl mb-3 shadow-md">
            J
          </div>
          <h1 className="text-xl font-bold mb-1">JCVcreatives Photobooth</h1>
          <p className="text-xs text-zinc-500 mb-4">Tap below to refresh the studio display</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-3 rounded-full bg-sky-300 text-slate-950 font-bold text-sm shadow-md"
          >
            Tap to Start Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <KioskErrorBoundary>
      <App />
    </KioskErrorBoundary>
  );
}
