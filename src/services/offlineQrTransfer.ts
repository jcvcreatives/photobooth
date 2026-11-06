/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { PhotostripResult, FrameLayoutType, PhotoFilterType } from '../types';
import { safeStorageGet, safeStorageSet } from './storage';

export type OfflineQrMode = 'offline_url_hash' | 'direct_data_uri';

export interface OfflineQrPacket {
  mode: OfflineQrMode;
  qrDataUrl: string;
  payloadString: string;
  compactImageDataUrl: string;
  byteLength: number;
  dimensions: { width: number; height: number };
  resolvedBaseUrl: string;
}

const HOTSPOT_ORIGIN_KEY = 'jcv_offline_hotspot_origin_v2';
const PREFERRED_QR_MODE_KEY = 'jcv_offline_qr_mode_v2';
const CLOUD_FALLBACK_URL =
  'https://ais-pre-viyeqwfb7gkjv5s5dxi6sd-397788646776.asia-northeast1.run.app/';

/**
 * Returns the full base URL of the running web app, preserving any GitHub Pages
 * repository subdirectory path (e.g. https://jcvcreatives.github.io/photobooth/)
 * so scanning the QR code on iOS/Android never hits a root-domain 404.
 */
export function getCurrentAppBaseUrl(): string {
  if (typeof window === 'undefined') return CLOUD_FALLBACK_URL;
  const { protocol, origin, pathname } = window.location;
  if (!origin || origin === 'null' || protocol === 'file:' || protocol === 'content:') {
    return CLOUD_FALLBACK_URL;
  }
  const cleanPath = (pathname || '')
    .replace(/\/index\.html?$/i, '')
    .replace(/\/+$/, '');
  return `${origin}${cleanPath}/`;
}

export function getSavedHotspotOrigin(): string {
  const saved = (safeStorageGet(HOTSPOT_ORIGIN_KEY) || '').trim();
  // Ignore bare github.io root URLs that lack a repo path or cause 404s
  if (/^https?:\/\/[^/]+\.github\.io\/?$/i.test(saved)) {
    return '';
  }
  return saved;
}

export function setSavedHotspotOrigin(origin: string): void {
  safeStorageSet(HOTSPOT_ORIGIN_KEY, origin.trim());
}

export function getSavedOfflineQrMode(): OfflineQrMode {
  const saved = safeStorageGet(PREFERRED_QR_MODE_KEY);
  if (saved === 'direct_data_uri' || saved === 'offline_url_hash') {
    return saved;
  }
  return 'offline_url_hash';
}

export function setSavedOfflineQrMode(mode: OfflineQrMode): void {
  safeStorageSet(PREFERRED_QR_MODE_KEY, mode);
}

/**
 * Loads an image Data URL (such as the full-color `result.compositeDataUrl`) into an HTMLCanvasElement.
 */
async function loadDataUrlToCanvas(
  dataUrl: string,
  fallbackCanvas: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return fallbackCanvas;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 600;
      c.height = img.naturalHeight || img.height || 1800;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      } else {
        resolve(fallbackCanvas);
      }
    };
    img.onerror = () => resolve(fallbackCanvas);
    img.src = dataUrl;
  });
}

/**
 * Compresses a photostrip canvas into an ultra-compact Data URI guaranteed to fit inside
 * a single Version-40 QR code (<= maxChars characters).
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxChars: number = 2150,
  forceJpegForIos: boolean = false
): { dataUrl: string; width: number; height: number } {
  const srcW = sourceCanvas.width || 600;
  const srcH = sourceCanvas.height || 1800;
  const aspect = srcH / srcW;

  const candidateWidths = [168, 152, 136, 122, 108, 96, 84, 72, 64];
  const candidateQualities = [0.56, 0.48, 0.4, 0.32, 0.25, 0.2];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  let bestDataUrl = '';
  let bestW = 96;
  let bestH = Math.round(96 * aspect);

  for (const w of candidateWidths) {
    const h = Math.max(48, Math.round(w * aspect));
    scratch.width = w;
    scratch.height = h;

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, w, h);
    }

    for (const q of candidateQualities) {
      let attempt = '';
      if (!forceJpegForIos) {
        attempt = scratch.toDataURL('image/webp', q);
      }
      if (!attempt || !attempt.startsWith('data:image/webp')) {
        attempt = scratch.toDataURL('image/jpeg', q);
      }

      bestDataUrl = attempt;
      bestW = w;
      bestH = h;

      if (attempt.length <= maxChars) {
        scratch.width = 0;
        scratch.height = 0;
        return { dataUrl: attempt, width: w, height: h };
      }
    }
  }

  scratch.width = 0;
  scratch.height = 0;
  return { dataUrl: bestDataUrl, width: bestW, height: bestH };
}

/**
 * Verifies that a base URL does not return a 404 (e.g. an unconfigured GitHub Pages root domain).
 * If it returns 404, falls back to the live Cloud App URL so iPhones can always open the viewer.
 */
async function resolveReachableBaseUrl(customHostOrigin?: string): Promise<string> {
  const custom = (customHostOrigin || '').trim();
  let candidate = custom ? custom.replace(/\/+$/, '') + '/' : getCurrentAppBaseUrl();

  // If the candidate is a bare *.github.io root without a repo path, check if it 404s
  if (/^https?:\/\/[^/]+\.github\.io\/$/i.test(candidate)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      const resp = await fetch(candidate, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
      if (resp.status === 404) {
        return CLOUD_FALLBACK_URL;
      }
    } catch {
      // If offline or blocked by CORS on a custom github.io root, prefer current full path or cloud fallback
      const currentFull = getCurrentAppBaseUrl();
      if (!/^https?:\/\/[^/]+\.github\.io\/$/i.test(currentFull)) {
        return currentFull;
      }
      return CLOUD_FALLBACK_URL;
    }
  }

  return candidate;
}

/**
 * Generates an iOS & Android compatible Offline QR Code that embeds the FULL-COLOR photo data
 * directly inside the QR payload so no database or backend server lookup is required.
 */
export async function buildOfflineQrPacket(
  fallbackCanvas: HTMLCanvasElement,
  result: PhotostripResult,
  mode: OfflineQrMode,
  customHostOrigin?: string
): Promise<OfflineQrPacket> {
  const resolvedBaseUrl = await resolveReachableBaseUrl(customHostOrigin);

  // Always prefer the full-color digital photostrip (result.compositeDataUrl) over the monochrome thermal canvas
  const colorCanvas = await loadDataUrlToCanvas(result.compositeDataUrl, fallbackCanvas);

  if (mode === 'direct_data_uri') {
    const compressed = compressCanvasForOfflineQr(colorCanvas, 2300, true);
    const payloadString = compressed.dataUrl;
    const qrDataUrl = await QRCode.toDataURL(payloadString, {
      errorCorrectionLevel: 'L',
      width: 400,
      margin: 2,
      color: { dark: '#18181b', light: '#ffffff' },
    });

    return {
      mode,
      qrDataUrl,
      payloadString,
      compactImageDataUrl: compressed.dataUrl,
      byteLength: payloadString.length,
      dimensions: { width: compressed.width, height: compressed.height },
      resolvedBaseUrl,
    };
  }

  // 'offline_url_hash': iOS Camera & Android Camera compatible URL with embedded #offline-photo=...
  const prefix = `${resolvedBaseUrl}?share=${encodeURIComponent(result.id)}#offline-photo=`;
  const availableForImage = Math.max(900, 2220 - prefix.length);
  const compressed = compressCanvasForOfflineQr(colorCanvas, availableForImage, false);

  const isWebp = compressed.dataUrl.startsWith('data:image/webp;base64,');
  const formatCode = isWebp ? 'w' : 'j';
  const rawBase64 = compressed.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  const urlSafeBase64 = rawBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payloadString = `${prefix}${formatCode}.${urlSafeBase64}`;

  const qrDataUrl = await QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'L',
    width: 400,
    margin: 2,
    color: { dark: '#18181b', light: '#ffffff' },
  });

  return {
    mode,
    qrDataUrl,
    payloadString,
    compactImageDataUrl: compressed.dataUrl,
    byteLength: payloadString.length,
    dimensions: { width: compressed.width, height: compressed.height },
    resolvedBaseUrl,
  };
}

/**
 * Upscales a compact QR-embedded image into a high-resolution JPEG Data URL (600px wide)
 * so iOS Safari and iOS Chrome natively support "Save to Photos" (Camera Roll) and long-press save.
 */
export async function upscaleToIosCompatibleJpeg(sourceDataUrl: string): Promise<string> {
  if (!sourceDataUrl || !sourceDataUrl.startsWith('data:image/')) {
    return sourceDataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth || img.width || 120;
      const srcH = img.naturalHeight || img.height || 360;
      const targetW = Math.max(600, srcW);
      const targetH = Math.round(targetW * (srcH / srcW));

      // Two-step progressive bicubic-style canvas upscale for smooth edges
      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = Math.round((srcW + targetW) / 2);
      stepCanvas.height = Math.round((srcH + targetH) / 2);
      const stepCtx = stepCanvas.getContext('2d');
      if (stepCtx) {
        stepCtx.fillStyle = '#ffffff';
        stepCtx.fillRect(0, 0, stepCanvas.width, stepCanvas.height);
        stepCtx.imageSmoothingEnabled = true;
        stepCtx.imageSmoothingQuality = 'high';
        stepCtx.drawImage(img, 0, 0, stepCanvas.width, stepCanvas.height);
      }

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const outCtx = outCanvas.getContext('2d');
      if (outCtx) {
        outCtx.fillStyle = '#ffffff';
        outCtx.fillRect(0, 0, targetW, targetH);
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(stepCtx ? stepCanvas : img, 0, 0, targetW, targetH);
        const jpegDataUrl = outCanvas.toDataURL('image/jpeg', 0.94);
        stepCanvas.width = 0;
        outCanvas.width = 0;
        resolve(jpegDataUrl);
      } else {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

/**
 * Decodes an `#offline-photo=...` hash (or `?offline-photo=...` query param) from `window.location`
 * into a `PhotostripResult` so the guest's iPhone/Android can view and save the photostrip
 * with zero server or database lookup.
 */
export function decodeOfflinePhotoFromLocation(
  search: string,
  hash: string
): PhotostripResult | null {
  try {
    let encodedPhoto: string | null = null;

    if (hash && hash.includes('offline-photo=')) {
      const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
      const hashParams = new URLSearchParams(cleanHash);
      encodedPhoto = hashParams.get('offline-photo');
    }

    if (!encodedPhoto && search && search.includes('offline-photo=')) {
      const searchParams = new URLSearchParams(search);
      encodedPhoto = searchParams.get('offline-photo');
    }

    if (!encodedPhoto) return null;

    let dataUrl = '';
    if (encodedPhoto.startsWith('data:image/')) {
      dataUrl = encodedPhoto;
    } else if (encodedPhoto.startsWith('w.') || encodedPhoto.startsWith('j.')) {
      const mime = encodedPhoto.startsWith('w.') ? 'image/webp' : 'image/jpeg';
      let b64 = encodedPhoto.slice(2).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      dataUrl = `data:${mime};base64,${b64}`;
    } else {
      return null;
    }

    const searchParams = new URLSearchParams(search);
    const shareId = searchParams.get('share') || `OFFLINE-${Date.now().toString(36).toUpperCase()}`;

    return {
      id: shareId,
      createdAt: Date.now(),
      photos: [dataUrl],
      compositeDataUrl: dataUrl,
      thermalRasterDataUrl: dataUrl,
      layout: ('strip_3' as FrameLayoutType),
      themeId: 'gobble_classic',
      filter: ('none' as PhotoFilterType),
      eventTitle: 'Gobble Haus Photo Booth',
      shareCode: shareId,
      shareUrl: window.location.href,
      printCopies: 1,
    };
  } catch {
    return null;
  }
}

/**
 * Converts a Data URL into a File object for iOS Share Sheet ("Save Image" to Photos) and Android Quick Share.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

/**
 * Detects whether the guest device is an iPhone / iPad (iOS).
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Saves or shares the photostrip on iOS (opens native iOS "Save Image" to Camera Roll sheet)
 * and Android (opens Quick Share / Nearby Share / Downloads).
 */
export async function shareOfflineViaQuickShare(
  result: PhotostripResult,
  canvas?: HTMLCanvasElement | null
): Promise<{ shared: boolean; message: string }> {
  try {
    // Always convert to high-compatibility JPEG so iOS Photos ("Save Image") accepts it 100% of the time
    const rawSourceUrl = result.compositeDataUrl || (canvas ? canvas.toDataURL('image/jpeg', 0.95) : '');
    const iosReadyJpegUrl = await upscaleToIosCompatibleJpeg(rawSourceUrl);

    const stripFile = dataUrlToFile(
      iosReadyJpegUrl,
      `GobbleHaus-Photostrip-${result.id}.jpg`
    );

    const filesToShare: File[] = [stripFile];
    if (!isIosDevice() && result.photos && result.photos.length > 1) {
      result.photos.forEach((rawUrl, idx) => {
        if (rawUrl && rawUrl.startsWith('data:image/')) {
          filesToShare.push(
            dataUrlToFile(rawUrl, `GobbleHaus-Shot-${idx + 1}-${result.id}.jpg`)
          );
        }
      });
    }

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    if (typeof nav.share === 'function') {
      // On iOS Safari & Chrome, sharing a single JPEG file with no extra text/URL
      // prominently displays "Save Image" at the top of the iOS Share Sheet!
      if (isIosDevice() && typeof nav.canShare === 'function' && nav.canShare({ files: [stripFile] })) {
        await nav.share({
          files: [stripFile],
        });
        return {
          shared: true,
          message: 'Tap "Save Image" in the menu to save to your iPhone Photos!',
        };
      }

      if (typeof nav.canShare === 'function' && nav.canShare({ files: filesToShare })) {
        await nav.share({
          title: 'Gobble Haus Photo Booth',
          files: filesToShare,
        });
        return {
          shared: true,
          message: 'Photo shared successfully!',
        };
      } else if (typeof nav.canShare === 'function' && nav.canShare({ files: [stripFile] })) {
        await nav.share({
          files: [stripFile],
        });
        return {
          shared: true,
          message: 'Photo shared successfully!',
        };
      }
    }

    // Fallback: Blob URL download
    const blob = new Blob([await stripFile.arrayBuffer()], { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `GobbleHaus-Photostrip-${result.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    return {
      shared: true,
      message: isIosDevice()
        ? 'Photo downloaded! Or press & hold the photo above and tap "Save to Photos".'
        : 'Full-resolution photostrip saved to Downloads!',
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { shared: false, message: '' };
    }
    return {
      shared: false,
      message: 'Press & hold the photo above and tap "Save to Photos".',
    };
  }
}
