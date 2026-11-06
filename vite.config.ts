import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const ANDROID7_POLYFILL_BANNER = `(function(){
  if (typeof window !== "undefined") {
    if (typeof window.globalThis === "undefined") { window.globalThis = window; }
    if (!Object.getOwnPropertyDescriptors) {
      Object.getOwnPropertyDescriptors = function(obj) {
        if (obj === null || obj === undefined) throw new TypeError("Cannot convert undefined or null to object");
        var O = Object(obj);
        var keys = Object.getOwnPropertyNames(O);
        if (Object.getOwnPropertySymbols) keys = keys.concat(Object.getOwnPropertySymbols(O));
        var descriptors = {};
        for (var i = 0; i < keys.length; i++) {
          var d = Object.getOwnPropertyDescriptor(O, keys[i]);
          if (d !== undefined) descriptors[keys[i]] = d;
        }
        return descriptors;
      };
    }
    if (!Object.entries) {
      Object.entries = function(obj) {
        var ownProps = Object.keys(obj), i = ownProps.length, resArray = new Array(i);
        while (i--) resArray[i] = [ownProps[i], obj[ownProps[i]]];
        return resArray;
      };
    }
    if (!Object.values) {
      Object.values = function(obj) {
        var ownProps = Object.keys(obj), i = ownProps.length, resArray = new Array(i);
        while (i--) resArray[i] = obj[ownProps[i]];
        return resArray;
      };
    }
    if (!Object.fromEntries) {
      Object.fromEntries = function(iter) {
        var obj = {};
        var arr = Array.from ? Array.from(iter) : iter;
        for (var i = 0; i < arr.length; i++) {
          if (arr[i]) obj[arr[i][0]] = arr[i][1];
        }
        return obj;
      };
    }
    if (!String.prototype.padStart) {
      String.prototype.padStart = function(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(typeof padString !== "undefined" ? padString : " ");
        if (this.length >= targetLength) return String(this);
        targetLength = targetLength - this.length;
        if (targetLength > padString.length) {
          padString += padString.repeat(Math.ceil(targetLength / padString.length));
        }
        return padString.slice(0, targetLength) + String(this);
      };
    }
    if (!Array.prototype.includes) {
      Array.prototype.includes = function(searchElement, fromIndex) {
        return this.indexOf(searchElement, fromIndex) !== -1;
      };
    }
    if (!Array.prototype.flat) {
      Array.prototype.flat = function(depth) {
        var d = depth === undefined ? 1 : Number(depth);
        var result = [];
        (function flatten(arr, cur) {
          for (var i = 0; i < arr.length; i++) {
            if (Array.isArray(arr[i]) && cur > 0) flatten(arr[i], cur - 1);
            else result.push(arr[i]);
          }
        })(this, d);
        return result;
      };
    }
    if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
      Promise.prototype.finally = function(cb) {
        var P = this.constructor;
        return this.then(
          function(value) { return P.resolve(cb()).then(function() { return value; }); },
          function(reason) { return P.resolve(cb()).then(function() { throw reason; }); }
        );
      };
    }
    if (typeof window.ResizeObserver === "undefined") {
      window.ResizeObserver = function(cb) {
        this.observe = function() {};
        this.unobserve = function() {};
        this.disconnect = function() {};
      };
    }
    if (typeof NodeList !== "undefined" && NodeList.prototype && !NodeList.prototype.forEach) {
      NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (!window.AudioContext && window.webkitAudioContext) {
      window.AudioContext = window.webkitAudioContext;
    }
  }
})();\n`;

function oklchToRgbStr(match: string, inner: string): string {
  try {
    const parts = inner.trim().split('/');
    const lch = parts[0].trim().split(/\s+/);
    if (lch.length < 3) return match;
    let L = parseFloat(lch[0]);
    if (lch[0].includes('%')) L = L / 100;
    const C = parseFloat(lch[1]);
    const H = parseFloat(lch[2]) * (Math.PI / 180);
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const toSrgb = (c: number) => {
      const clamped = Math.max(0, Math.min(1, c));
      return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const R = Math.round(toSrgb(r) * 255);
    const G = Math.round(toSrgb(g) * 255);
    const B = Math.round(toSrgb(bl) * 255);

    if (parts[1] !== undefined) {
      let alpha = parts[1].trim();
      if (alpha.endsWith('%')) alpha = (parseFloat(alpha) / 100).toFixed(3);
      return `rgba(${R}, ${G}, ${B}, ${alpha})`;
    }
    return `rgb(${R}, ${G}, ${B})`;
  } catch {
    return match;
  }
}

function unwrapAtBlocks(css: string, prefixRegex: RegExp): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const rest = css.slice(i);
    const m = rest.match(prefixRegex);
    if (!m || m.index === undefined) {
      out += rest;
      break;
    }
    out += rest.slice(0, m.index);
    const openIdx = i + m.index + m[0].length - 1;
    let depth = 1;
    let j = openIdx + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    out += css.slice(openIdx + 1, j - 1);
    i = j;
  }
  return out;
}

function android7CompatPlugin(): Plugin {
  return {
    name: 'android7-compat-plugin',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunkOrAsset.type === 'asset') {
          let css = String(chunkOrAsset.source);
          // 1. Strip bare @layer statements and unwrap @layer { ... } blocks for Android 7 (Chrome 51)
          css = css.replace(/@layer\s+[a-zA-Z0-9_.,\s-]+;/g, '');
          while (/@layer\s+[a-zA-Z0-9_.-]*\s*\{/.test(css)) {
            css = unwrapAtBlocks(css, /@layer\s+[a-zA-Z0-9_.-]*\s*\{/);
          }
          // 2. Unwrap Tailwind v4 @supports (((-webkit-hyphens:none)) ...) property initialization block
          while (/@supports\s*\(\(\(-webkit-hyphens:none\)\)[^\{]*\{/.test(css)) {
            css = unwrapAtBlocks(css, /@supports\s*\(\(\(-webkit-hyphens:none\)\)[^\{]*\{/);
          }
          // 3. Convert oklch(...) colors to rgb(...) / rgba(...)
          css = css.replace(/oklch\(([^)]+)\)/g, oklchToRgbStr);
          // 4. Add 100vh fallback before 100dvh
          css = css.replace(/height:\s*100dvh/g, 'height:100vh;height:100dvh');
          css = css.replace(/min-height:\s*100dvh/g, 'min-height:100vh;min-height:100dvh');
          // 5. Add standard transform fallbacks for individual translate/scale/rotate properties
          css = css.replace(
            /translate:\s*var\(--tw-translate-x\)\s*var\(--tw-translate-y\)/g,
            'transform:translate(var(--tw-translate-x,0),var(--tw-translate-y,0));translate:var(--tw-translate-x) var(--tw-translate-y)'
          );
          css = css.replace(
            /scale:\s*var\(--tw-scale-x\)\s*var\(--tw-scale-y\)/g,
            'transform:scale(var(--tw-scale-x,1),var(--tw-scale-y,1));scale:var(--tw-scale-x) var(--tw-scale-y)'
          );
          // 6. Run esbuild CSS downleveling for Chrome 51 (converts #rrggbbaa to rgba, inset to top/right/bottom/left)
          const res = esbuild.transformSync(css, {
            loader: 'css',
            target: ['chrome51'],
            minify: true,
          });
          chunkOrAsset.source = res.code;
        } else if (fileName.endsWith('.js') && chunkOrAsset.type === 'chunk') {
          const res = esbuild.transformSync(chunkOrAsset.code, {
            loader: 'js',
            target: ['es2015', 'chrome51'],
            format: 'iife',
            minify: true,
          });
          chunkOrAsset.code = ANDROID7_POLYFILL_BANNER + res.code;
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Convert <script type="module" crossorigin src="..."> to <script defer src="...">
        // and remove crossorigin from <link rel="stylesheet"> so Android 7 WebView and file:// APK load cleanly
        return html
          .replace(/<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          .replace(/<script\s+type="module"\s+src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          .replace(/<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)">/g, '<link rel="stylesheet" href="$1">')
          .replace(/min-height:100dvh/g, 'min-height:100vh;min-height:100dvh');
      },
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    build: {
      target: 'es2015',
      cssTarget: 'chrome61',
      modulePreload: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      android7CompatPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'JCV-AutoPrint-Setup.bat',
          'assets/aistudio/*.png',
        ],
        manifest: {
          id: '/',
          name: 'JCVcreatives Photobooth',
          short_name: 'JCV Booth',
          description:
            'Offline-capable photo booth kiosk with Bluetooth/USB thermal printing, voucher system, and custom frames.',
          theme_color: '#faf8f5',
          background_color: '#faf8f5',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,webmanifest,bat}'],
          globIgnores: ['**/*.apk', '**/downloads/**', '**/*.mov', '**/*.mp4'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // 1. App Navigation & HTML Routes — NetworkFirst with 3s timeout fallback to cached shell
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'jcv-pages-navigation-cache-v5',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 25,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // 2. JS, CSS & Web Worker Bundles — StaleWhileRevalidate for instant offline boot
              urlPattern: ({ request }) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'worker',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'jcv-static-assets-cache-v5',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // 3. Stickers, Frames, Logos & UI Images — CacheFirst for zero-latency 9–12h booth rendering
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'jcv-images-cache-v5',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // 4. Google Fonts Stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // 5. Google Fonts Webfont Files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // 6. Front-Screen Loop Media & Audio Assets
              urlPattern: /\.(?:mp4|webm|ogg|mp3|wav)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'jcv-media-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});


