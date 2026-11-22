import React from 'react';
import { createRoot } from 'react-dom/client';
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

const OFFLINE_CACHE_NAME = 'jcv-kiosk-offline-v30';

export async function warmKioskOfflineCache(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    // Native Android file:// APK already has all HTML/CSS/JS/images embedded locally inside the APK
    window.dispatchEvent(new Event('jcv-offline-ready'));
    return 1;
  }

  try {
    const cache = await window.caches.open(OFFLINE_CACHE_NAME);
    const urlsToCache = new Set<string>([
      '/',
      './',
      './index.html',
      window.location.href.split('#')[0],
      './manifest.webmanifest',
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
    ]);

    if (typeof document !== 'undefined') {
      document
        .querySelectorAll<HTMLScriptElement>('script[src]')
        .forEach((el) => el.src && urlsToCache.add(el.src));
      document
        .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href], link[rel="manifest"][href]')
        .forEach((el) => el.href && urlsToCache.add(el.href));
      document
        .querySelectorAll<HTMLImageElement>('img[src]')
        .forEach((el) => el.src && !el.src.startsWith('data:') && urlsToCache.add(el.src));
    }

    let cachedCount = 0;
    await Promise.all(
      Array.from(urlsToCache).map(async (url) => {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          if (res && (res.ok || res.type === 'opaque')) {
            await cache.put(url, res);
            cachedCount++;
          }
        } catch {
          // Ignore individual offline or cross-origin asset errors
        }
      })
    );

    if (cachedCount > 0) {
      window.dispatchEvent(new Event('jcv-offline-ready'));
    }
    return cachedCount;
  } catch {
    return 0;
  }
}

// Register offline Service Worker on http/https so the installed app/WebAPK launches 100% offline after force-close
try {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    (window.location.protocol === 'https:' || window.location.protocol === 'http:')
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .then(() => {
          if (navigator.onLine) {
            window.setTimeout(() => {
              warmKioskOfflineCache().catch(() => {});
            }, 1200);
          }
        })
        .catch(() => {});
    });
  }
} catch {
  // Ignore in restricted WebViews
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
