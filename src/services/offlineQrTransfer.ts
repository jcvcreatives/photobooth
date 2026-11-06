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
}

const HOTSPOT_ORIGIN_KEY = 'jcv_offline_hotspot_origin';
const PREFERRED_QR_MODE_KEY = 'jcv_offline_qr_mode';

export function getSavedHotspotOrigin(): string {
  return safeStorageGet(HOTSPOT_ORIGIN_KEY) || '';
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
 * Compresses a photostrip canvas into an ultra-compact WebP (or JPEG fallback) Data URI
 * guaranteed to fit inside a single Version-40 QR code (<= maxChars characters).
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxChars: number = 2150
): { dataUrl: string; width: number; height: number } {
  const srcW = sourceCanvas.width || 600;
  const srcH = sourceCanvas.height || 1800;
  const aspect = srcH / srcW;

  // Candidate widths from highest detail to ultra-compact fallback
  const candidateWidths = [160, 144, 128, 114, 100, 88, 76, 64];
  const candidateQualities = [0.52, 0.44, 0.36, 0.28, 0.22, 0.18];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  let bestDataUrl = '';
  let bestW = 88;
  let bestH = Math.round(88 * aspect);

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
      // Prefer image/webp because WebP headers are ~70% smaller than JPEG headers
      let attempt = scratch.toDataURL('image/webp', q);
      if (!attempt.startsWith('data:image/webp')) {
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
 * Generates an Offline QR Code that embeds the photo data directly inside the QR payload
 * so no internet or cloud server is needed when scanning.
 */
export async function buildOfflineQrPacket(
  sourceCanvas: HTMLCanvasElement,
  result: PhotostripResult,
  mode: OfflineQrMode,
  customHostOrigin?: string
): Promise<OfflineQrPacket> {
  const rawOrigin = (customHostOrigin || '').trim() || window.location.origin;
  const cleanOrigin = rawOrigin.replace(/\/+$/, '');

  if (mode === 'direct_data_uri') {
    // Pure Data URI inside the QR code (zero URL wrapper, pure image data URI)
    const compressed = compressCanvasForOfflineQr(sourceCanvas, 2350);
    const payloadString = compressed.dataUrl;
    const qrDataUrl = await QRCode.toDataURL(payloadString, {
      errorCorrectionLevel: 'L',
      width: 380,
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
    };
  }

  // 'offline_url_hash': Self-decoding URL hash (#offline-photo=...)
  // Works offline via cached PWA or when connected to the tablet's local Wi-Fi Hotspot
  const prefix = `${cleanOrigin}/?share=${encodeURIComponent(result.id)}#offline-photo=`;
  // Keep total URL length under 2350 chars so Version-40 Low ECC QR encodes cleanly
  const availableForImage = Math.max(900, 2250 - prefix.length);
  const compressed = compressCanvasForOfflineQr(sourceCanvas, availableForImage);

  // Strip the "data:image/webp;base64," or "data:image/jpeg;base64," prefix to save ~23 chars & avoid %2F URL-encoding bloat
  const isWebp = compressed.dataUrl.startsWith('data:image/webp;base64,');
  const formatCode = isWebp ? 'w' : 'j';
  const rawBase64 = compressed.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  // Convert standard base64 to URL-safe base64 (- and _ instead of + and /) so no percent-encoding expansion occurs
  const urlSafeBase64 = rawBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payloadString = `${cleanOrigin}/?share=${encodeURIComponent(result.id)}#offline-photo=${formatCode}.${urlSafeBase64}`;

  const qrDataUrl = await QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'L',
    width: 380,
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
  };
}

/**
 * Decodes an `#offline-photo=...` hash from `window.location.hash` into a `PhotostripResult`
 * so the guest's phone can view and save the photostrip 100% offline with zero server/DB lookup.
 */
export function decodeOfflinePhotoFromLocation(
  search: string,
  hash: string
): PhotostripResult | null {
  try {
    if (!hash || !hash.includes('offline-photo=')) return null;

    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const hashParams = new URLSearchParams(cleanHash);
    const encodedPhoto = hashParams.get('offline-photo');
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
 * Converts a Data URL into a File object for Web Share API Level 2 (Quick Share / Nearby Share / Bluetooth).
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

/**
 * Triggers native Android Quick Share / Nearby Share / Bluetooth / AirDrop file transfer
 * directly from the Galaxy Tab A11 at 100% full uncompressed resolution without needing internet.
 */
export async function shareOfflineViaQuickShare(
  result: PhotostripResult,
  canvas?: HTMLCanvasElement | null
): Promise<{ shared: boolean; message: string }> {
  try {
    const fullDataUrl = canvas
      ? canvas.toDataURL('image/png', 1.0)
      : result.compositeDataUrl;

    const stripFile = dataUrlToFile(
      fullDataUrl,
      `GobbleHaus-Photostrip-${result.id}.png`
    );

    const filesToShare: File[] = [stripFile];
    if (result.photos && result.photos.length > 1) {
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
      if (typeof nav.canShare === 'function' && nav.canShare({ files: filesToShare })) {
        await nav.share({
          title: 'Gobble Haus Photo Booth',
          text: `Session #${result.id} — Full Resolution Photostrip`,
          files: filesToShare,
        });
        return {
          shared: true,
          message: 'Full-resolution photos shared via Quick Share / Bluetooth!',
        };
      } else if (typeof nav.canShare === 'function' && nav.canShare({ files: [stripFile] })) {
        await nav.share({
          title: 'Gobble Haus Photo Booth',
          text: `Session #${result.id} — Full Resolution Photostrip`,
          files: [stripFile],
        });
        return {
          shared: true,
          message: 'Photostrip shared via Quick Share / Bluetooth!',
        };
      }
    }

    // Fallback if Web Share API Level 2 is not supported on this browser: trigger direct local file download
    const link = document.createElement('a');
    link.href = fullDataUrl;
    link.download = `GobbleHaus-Photostrip-${result.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      shared: true,
      message: 'Full-resolution photostrip saved to device Downloads!',
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { shared: false, message: 'Share cancelled.' };
    }
    return {
      shared: false,
      message: 'Unable to open system share sheet on this browser.',
    };
  }
}
