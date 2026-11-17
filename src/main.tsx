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

export async function warmKioskOfflineCache(): Promise<number> {
  return 0;
}

// Clean up any stale service workers in dev/preview mode so fresh code always runs without freezing
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
} catch {
  // Ignore
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
