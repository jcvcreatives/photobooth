/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import Peer, { DataConnection } from 'peerjs';
import {
  PhotostripResult,
  FrameLayoutType,
  PhotoFilterType,
  StickerItem,
} from '../types';
import {
  DIGITAL_COLOR_THEMES,
  THERMAL_FRAME_THEMES,
  FRAME_THEMES,
  renderPhotostripCanvas,
} from './frameTemplates';
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
 * Converts a share ID into a deterministic, alphanumeric PeerJS ID.
 */
export function getDeterministicPeerId(shareId: string): string {
  const clean = shareId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `jcvhd99${clean.slice(0, 28)}`;
}

/**
 * Starts a WebRTC P2P Host on the Galaxy Tab A11 so any iPhone or Android scanning the QR code
 * automatically receives the 100% uncompressed, full-resolution original camera photos & strip.
 */
export function startTabletHdPeerHost(
  result: PhotostripResult,
  onGuestConnected?: () => void
): () => void {
  let peer: Peer | null = null;
  let destroyed = false;

  try {
    const peerId = getDeterministicPeerId(result.id);
    peer = new Peer(peerId, {
      debug: 0,
    });

    peer.on('connection', (conn: DataConnection) => {
      conn.on('open', () => {
        if (destroyed) return;
        onGuestConnected?.();
        conn.send({
          type: 'JCV_FULL_HD_PHOTO',
          id: result.id,
          layout: result.layout,
          themeId: result.themeId,
          filter: result.filter,
          eventTitle: result.eventTitle,
          compositeDataUrl: result.compositeDataUrl,
          thermalRasterDataUrl: result.thermalRasterDataUrl,
          photos: result.photos,
          stickers: result.stickers || [],
        });
      });
    });

    peer.on('error', () => {
      // Ignore signaling errors when tablet is completely air-gapped offline
    });
  } catch {
    // Ignore WebRTC init errors
  }

  return () => {
    destroyed = true;
    try {
      peer?.destroy();
    } catch {
      // ignore
    }
  };
}

/**
 * Connects from the Guest's iPhone/Android to the Galaxy Tab A11's WebRTC P2P Host
 * to pull the 100% uncompressed Full-HD photostrip and raw camera photos.
 */
export function fetchFullHdFromTabletPeer(
  shareId: string,
  onReceived: (hdResult: Partial<PhotostripResult>) => void
): () => void {
  let peer: Peer | null = null;
  let destroyed = false;

  try {
    const hostPeerId = getDeterministicPeerId(shareId);
    peer = new Peer({ debug: 0 });

    peer.on('open', () => {
      if (destroyed || !peer) return;
      const conn = peer.connect(hostPeerId, { reliable: true });
      conn.on('data', (data: unknown) => {
        if (destroyed || !data || typeof data !== 'object') return;
        const msg = data as Record<string, unknown>;
        if (msg.type === 'JCV_FULL_HD_PHOTO' && typeof msg.compositeDataUrl === 'string') {
          onReceived({
            id: String(msg.id || shareId),
            layout: (msg.layout as FrameLayoutType) || 'single_polaroid',
            themeId: String(msg.themeId || 'gobble_pokemon_card'),
            filter: (msg.filter as PhotoFilterType) || 'none',
            eventTitle: String(msg.eventTitle || 'Gobble Haus Photo Booth'),
            compositeDataUrl: msg.compositeDataUrl,
            thermalRasterDataUrl:
              typeof msg.thermalRasterDataUrl === 'string'
                ? msg.thermalRasterDataUrl
                : msg.compositeDataUrl,
            photos: Array.isArray(msg.photos) ? (msg.photos as string[]) : [msg.compositeDataUrl],
            stickers: Array.isArray(msg.stickers) ? (msg.stickers as StickerItem[]) : [],
          });
        }
      });
    });

    peer.on('error', () => {
      // Silent fallback to offline vector-reconstructed strip
    });
  } catch {
    // Ignore
  }

  return () => {
    destroyed = true;
    try {
      peer?.destroy();
    } catch {
      // ignore
    }
  };
}

/**
 * Packs ONLY the raw camera photo(s) into a clean 4:3 vertical contact sheet
 * so 0 bytes of the QR code are wasted on frame borders or text!
 * (The frame, borders, and text like GOBBLE-CHU HP 999 are reconstructed at 100% HD vector quality on the iPhone!)
 */
async function buildCameraPhotosOnlyCanvas(
  photos: string[],
  layout: FrameLayoutType,
  fallbackCanvas: HTMLCanvasElement
): Promise<{ canvas: HTMLCanvasElement; count: number }> {
  const maxCount =
    layout === 'single_polaroid' ? 1 : layout === 'grid_4' && photos.length <= 2 ? 2 : layout === 'strip_3' ? 3 : 4;
  const targetUrls = (photos || []).slice(0, maxCount).filter((u) => u && u.startsWith('data:image/'));

  if (targetUrls.length === 0) {
    return { canvas: fallbackCanvas, count: 1 };
  }

  const loadedImgs = await Promise.all(
    targetUrls.map(
      (src) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        })
    )
  );

  const validImgs = loadedImgs.filter((i): i is HTMLImageElement => i !== null);
  if (validImgs.length === 0) {
    return { canvas: fallbackCanvas, count: 1 };
  }

  // Each slot is 4:3 aspect ratio (e.g. 240 x 180 per photo)
  const slotW = 240;
  const slotH = 180;
  const count = validImgs.length;
  const out = document.createElement('canvas');
  out.width = slotW;
  out.height = slotH * count;
  const ctx = out.getContext('2d');

  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    validImgs.forEach((img, idx) => {
      const iw = img.naturalWidth || img.width || 640;
      const ih = img.naturalHeight || img.height || 480;
      const targetAspect = slotW / slotH;
      const imgAspect = iw / ih;
      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;
      if (imgAspect > targetAspect) {
        sw = ih * targetAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / targetAspect;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, idx * slotH, slotW, slotH);
    });
  }

  return { canvas: out, count };
}

/**
 * Compresses a camera-only canvas into an ultra-compact Data URI that fits inside a Version-40 QR code.
 * Because there is no text or sharp borders in the camera-only canvas, WebP/JPEG allocates 100% of bits to the face!
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxChars: number = 2150,
  forceJpegForIos: boolean = false
): { dataUrl: string; width: number; height: number } {
  const srcW = sourceCanvas.width || 240;
  const srcH = sourceCanvas.height || 180;
  const aspect = srcH / srcW;

  // Higher resolution candidates for smooth 4:3 portraits
  const candidateWidths = [220, 200, 184, 168, 152, 140, 128, 116, 104, 92];
  const candidateQualities = [0.68, 0.58, 0.5, 0.42, 0.35, 0.28];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  let bestDataUrl = '';
  let bestW = 128;
  let bestH = Math.round(128 * aspect);

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
 */
async function resolveReachableBaseUrl(customHostOrigin?: string): Promise<string> {
  const custom = (customHostOrigin || '').trim();
  const candidate = custom ? custom.replace(/\/+$/, '') + '/' : getCurrentAppBaseUrl();

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
 * Generates an iOS & Android compatible Offline QR Code:
 * - Stores ONLY the camera portrait(s) in the QR bitmap (so 0 bytes are wasted on the frame/text!).
 * - Stores the themeId, layout, filter, and photo count in compact URL parameters so the iPhone
 *   reconstructs the entire Gobble-Chu / Gobble Haus frame in 100% razor-sharp HD vector resolution!
 */
export async function buildOfflineQrPacket(
  fallbackCanvas: HTMLCanvasElement,
  result: PhotostripResult,
  mode: OfflineQrMode,
  customHostOrigin?: string
): Promise<OfflineQrPacket> {
  const resolvedBaseUrl = await resolveReachableBaseUrl(customHostOrigin);

  if (mode === 'direct_data_uri') {
    const { canvas: camCanvas } = await buildCameraPhotosOnlyCanvas(
      result.photos,
      result.layout,
      fallbackCanvas
    );
    const compressed = compressCanvasForOfflineQr(camCanvas, 2300, true);
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

  // Build camera-only contact sheet so 100% of QR bytes go to the portrait(s)
  const { canvas: camCanvas, count: photoCount } = await buildCameraPhotosOnlyCanvas(
    result.photos,
    result.layout,
    fallbackCanvas
  );

  // Compact metadata in hash so the iPhone reconstructs the 100% HD vector frame locally
  const metaPrefix = `t=${encodeURIComponent(result.themeId)}&l=${encodeURIComponent(
    result.layout
  )}&f=${encodeURIComponent(result.filter)}&c=${photoCount}&offline-photo=`;

  const prefix = `${resolvedBaseUrl}?share=${encodeURIComponent(result.id)}#${metaPrefix}`;
  const availableForImage = Math.max(1000, 2320 - prefix.length);
  const compressed = compressCanvasForOfflineQr(camCanvas, availableForImage, false);

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
 * Splits a vertical camera contact sheet back into individual 4:3 deblocked, smoothed portrait Data URLs
 * and reconstructs the 100% native HD vector photostrip (768x1152 / 768x1824) using `renderPhotostripCanvas`!
 */
export async function reconstructVectorHdPhotostripOnPhone(
  result: PhotostripResult
): Promise<{
  colorStripJpegUrl: string;
  thermalStripPngUrl: string;
  individualPhotos: string[];
}> {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(cleanHash);
  const packedCount = Math.max(1, parseInt(hashParams.get('c') || '1', 10) || 1);

  // If result already has a full-HD composite (> 40KB) from WebRTC or local storage, just ensure it's JPEG
  if (result.compositeDataUrl && result.compositeDataUrl.length > 45000) {
    const jpegUrl = await upscaleToIosCompatibleJpeg(result.compositeDataUrl);
    return {
      colorStripJpegUrl: jpegUrl,
      thermalStripPngUrl: result.thermalRasterDataUrl || jpegUrl,
      individualPhotos: result.photos && result.photos.length > 0 ? result.photos : [jpegUrl],
    };
  }

  const packedDataUrl = result.photos[0] || result.compositeDataUrl;
  const individualPhotos: string[] = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 160;
      const totalH = img.naturalHeight || img.height || 120 * packedCount;
      const singleH = Math.max(1, Math.floor(totalH / packedCount));

      // Upscale each individual 4:3 camera shot to 640x480 with multi-step smoothing + subtle deblocking
      const targetW = 640;
      const targetH = 480;
      const extracted: string[] = [];

      for (let i = 0; i < packedCount; i++) {
        // Step 1: Intermediate 2x canvas with slight 0.6px blur to erase 8x8 DCT block boundaries
        const midCanvas = document.createElement('canvas');
        midCanvas.width = 320;
        midCanvas.height = 240;
        const midCtx = midCanvas.getContext('2d');
        if (midCtx) {
          midCtx.imageSmoothingEnabled = true;
          midCtx.imageSmoothingQuality = 'high';
          if (typeof midCtx.filter === 'string') {
            midCtx.filter = 'blur(0.55px) contrast(1.04) saturate(1.05)';
          }
          midCtx.drawImage(img, 0, i * singleH, w, singleH, 0, 0, 320, 240);
          midCtx.filter = 'none';
        }

        // Step 2: Final 640x480 high-DPI canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(midCtx ? midCanvas : img, 0, 0, targetW, targetH);
          extracted.push(finalCanvas.toDataURL('image/jpeg', 0.92));
        }
        midCanvas.width = 0;
        finalCanvas.width = 0;
      }

      resolve(extracted.length > 0 ? extracted : [packedDataUrl]);
    };
    img.onerror = () => resolve([packedDataUrl]);
    img.src = packedDataUrl;
  });

  // Look up the exact Digital Color Theme and Thermal Theme so all text, borders, and Gobble-Chu art render in 100% HD vector quality!
  const digitalTheme =
    DIGITAL_COLOR_THEMES.find((t) => t.id === result.themeId) ||
    FRAME_THEMES.find((t) => t.id === result.themeId) ||
    DIGITAL_COLOR_THEMES[0];

  const thermalTheme =
    THERMAL_FRAME_THEMES.find((t) => t.id === result.themeId) ||
    THERMAL_FRAME_THEMES[0];

  try {
    const colorCanvas = await renderPhotostripCanvas({
      photos: individualPhotos,
      layout: result.layout || 'single_polaroid',
      theme: digitalTheme,
      filter: result.filter || 'none',
      eventTitle: digitalTheme.headerText,
      eventSubtitle: digitalTheme.footerText,
      stickers: result.stickers || [],
      drawings: [],
      isThermalMode: false,
    });

    const thermalCanvas = await renderPhotostripCanvas({
      photos: individualPhotos,
      layout: result.layout || 'single_polaroid',
      theme: thermalTheme,
      filter: result.filter || 'none',
      eventTitle: thermalTheme.headerText,
      eventSubtitle: thermalTheme.footerText,
      stickers: result.stickers || [],
      drawings: [],
      isThermalMode: true,
    });

    const colorStripJpegUrl = colorCanvas.toDataURL('image/jpeg', 0.95);
    const thermalStripPngUrl = thermalCanvas.toDataURL('image/jpeg', 0.92);
    colorCanvas.width = 0;
    thermalCanvas.width = 0;

    return {
      colorStripJpegUrl,
      thermalStripPngUrl,
      individualPhotos,
    };
  } catch {
    const fallbackJpeg = await upscaleToIosCompatibleJpeg(packedDataUrl);
    return {
      colorStripJpegUrl: fallbackJpeg,
      thermalStripPngUrl: fallbackJpeg,
      individualPhotos,
    };
  }
}

/**
 * Ensures any Data URL is exported as a clean, full-resolution standard JPEG for iOS Photos compatibility.
 */
export async function upscaleToIosCompatibleJpeg(sourceDataUrl: string): Promise<string> {
  if (!sourceDataUrl || !sourceDataUrl.startsWith('data:image/')) {
    return sourceDataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth || img.width || 600;
      const srcH = img.naturalHeight || img.height || 1152;
      const targetW = Math.max(768, srcW);
      const targetH = Math.round(targetW * (srcH / srcW));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const outCtx = outCanvas.getContext('2d');
      if (outCtx) {
        outCtx.fillStyle = '#ffffff';
        outCtx.fillRect(0, 0, targetW, targetH);
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(img, 0, 0, targetW, targetH);
        const jpegDataUrl = outCanvas.toDataURL('image/jpeg', 0.95);
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
 * into a `PhotostripResult` with full frame theme and layout metadata.
 */
export function decodeOfflinePhotoFromLocation(
  search: string,
  hash: string
): PhotostripResult | null {
  try {
    let encodedPhoto: string | null = null;
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const hashParams = new URLSearchParams(cleanHash);
    const searchParams = new URLSearchParams(search);

    if (hash && hash.includes('offline-photo=')) {
      encodedPhoto = hashParams.get('offline-photo');
    }
    if (!encodedPhoto && search && search.includes('offline-photo=')) {
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

    const shareId = searchParams.get('share') || `OFFLINE-${Date.now().toString(36).toUpperCase()}`;
    const themeId = hashParams.get('t') || searchParams.get('t') || 'gobble_pokemon_card';
    const layout = (hashParams.get('l') || searchParams.get('l') || 'single_polaroid') as FrameLayoutType;
    const filter = (hashParams.get('f') || searchParams.get('f') || 'none') as PhotoFilterType;

    return {
      id: shareId,
      createdAt: Date.now(),
      photos: [dataUrl],
      compositeDataUrl: dataUrl,
      thermalRasterDataUrl: dataUrl,
      layout,
      themeId,
      filter,
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
