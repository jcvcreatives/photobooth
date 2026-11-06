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

const HOTSPOT_ORIGIN_KEY = 'jcv_offline_hotspot_origin_v3';
const PREFERRED_QR_MODE_KEY = 'jcv_offline_qr_mode_v3';
const CLOUD_FALLBACK_URL =
  'https://ais-pre-viyeqwfb7gkjv5s5dxi6sd-397788646776.asia-northeast1.run.app/';

// Safe 10 KB chunk size (well below iOS Safari & Chrome's 64 KB WebRTC SCTP limit)
const WEBRTC_CHUNK_SIZE = 10240;

// Fast STUN servers (no dead openrelay TURN servers that stall iOS WebKit ICE gathering)
const PEER_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

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
  return `jcvhd4${clean.slice(0, 26)}`;
}

/**
 * Builds a crisp Full-HD Camera Portrait Contact Sheet (560x420 per shot, JPEG 0.85, ~28–45 KB total)
 * so WebRTC and HTTPS Relay transfer in < 400ms instead of stalling on a 2.5 MB bundle!
 */
async function buildHdCameraSheetDataUrl(result: PhotostripResult): Promise<{
  hdSheetDataUrl: string;
  count: number;
}> {
  const maxCount =
    result.layout === 'single_polaroid'
      ? 1
      : result.layout === 'grid_4' && result.photos.length <= 2
      ? 2
      : result.layout === 'strip_3'
      ? 3
      : 4;

  const targetUrls = (result.photos || [])
    .slice(0, maxCount)
    .filter((u) => u && u.startsWith('data:image/'));

  if (targetUrls.length === 0) {
    return { hdSheetDataUrl: result.compositeDataUrl, count: 1 };
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
    return { hdSheetDataUrl: result.compositeDataUrl, count: 1 };
  }

  const count = validImgs.length;
  const slotW = count === 1 ? 600 : 480;
  const slotH = Math.round(slotW * 0.75);
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

  const hdSheetDataUrl = out.toDataURL('image/jpeg', 0.85);
  out.width = 0;
  return { hdSheetDataUrl, count };
}

/**
 * Uploads the ~30 KB HD Camera Portrait Sheet in 3.2 KB CORS-Simple-Request POST chunks (no custom headers,
 * zero OPTIONS preflight!) so any iPhone or Android on Wi-Fi or 5G can pull it in < 500ms.
 */
async function uploadFullHdToHttpsRelay(result: PhotostripResult): Promise<void> {
  try {
    const { hdSheetDataUrl, count } = await buildHdCameraSheetDataUrl(result);
    const topic = `jcv_hd4_${getDeterministicPeerId(result.id)}`;
    const chunkSize = 3100;
    const total = Math.ceil(hdSheetDataUrl.length / chunkSize);

    for (let idx = 0; idx < total; idx++) {
      const slice = hdSheetDataUrl.slice(idx * chunkSize, (idx + 1) * chunkSize);
      const packet = JSON.stringify({
        i: idx,
        n: total,
        c: count,
        d: slice,
      });
      // Simple POST with default text/plain body — zero CORS preflight!
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body: packet,
      });
    }
  } catch {
    // Ignore when offline
  }
}

/**
 * Fetches and reassembles the HD Camera Portrait Sheet from the HTTPS relay, updating live progress.
 */
async function fetchFullHdFromHttpsRelay(
  shareId: string,
  onProgress?: (pct: number) => void
): Promise<{ hdSheetDataUrl: string; count: number } | null> {
  const topic = `jcv_hd4_${getDeterministicPeerId(shareId)}`;
  const chunks: string[] = [];
  let expectedTotal = 0;
  let photoCount = 1;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (typeof event?.message === 'string' && event.message.startsWith('{')) {
              const msg = JSON.parse(event.message);
              if (
                typeof msg.i === 'number' &&
                typeof msg.n === 'number' &&
                typeof msg.d === 'string'
              ) {
                expectedTotal = msg.n;
                if (typeof msg.c === 'number') photoCount = msg.c;
                chunks[msg.i] = msg.d;
              }
            }
          } catch {
            // ignore non-chunk line
          }
        }

        if (expectedTotal > 0) {
          const receivedCount = chunks.filter((c) => typeof c === 'string').length;
          onProgress?.(Math.min(95, 25 + Math.round((receivedCount / expectedTotal) * 70)));
          if (receivedCount === expectedTotal) {
            onProgress?.(100);
            return {
              hdSheetDataUrl: chunks.join(''),
              count: photoCount,
            };
          }
        }
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  return null;
}

/**
 * Starts a Chunked WebRTC P2P Host (10 KB chunks for iOS WebKit compatibility) + Simple-POST HTTPS Relay
 * on the Galaxy Tab A11 so any iPhone or Android scanning the QR code receives the crisp HD portrait sheet.
 */
export function startTabletHdPeerHost(
  result: PhotostripResult,
  onGuestConnected?: () => void
): () => void {
  let peer: Peer | null = null;
  let destroyed = false;
  let cachedHdSheetPromise: Promise<{ hdSheetDataUrl: string; count: number }> | null = null;

  const getHdSheet = () => {
    if (!cachedHdSheetPromise) {
      cachedHdSheetPromise = buildHdCameraSheetDataUrl(result);
    }
    return cachedHdSheetPromise;
  };

  // Push to HTTPS relay immediately in background
  uploadFullHdToHttpsRelay(result).catch(() => {});

  const sendChunkedBundle = async (conn: DataConnection) => {
    if (destroyed) return;
    try {
      onGuestConnected?.();
      const { hdSheetDataUrl, count } = await getHdSheet();
      if (destroyed) return;

      const fullPayload = JSON.stringify({
        hdSheetDataUrl,
        count,
      });

      const totalChunks = Math.ceil(fullPayload.length / WEBRTC_CHUNK_SIZE);
      conn.send({
        type: 'JCV_HD_START',
        totalChunks,
        totalBytes: fullPayload.length,
      });

      for (let i = 0; i < totalChunks; i++) {
        const slice = fullPayload.slice(i * WEBRTC_CHUNK_SIZE, (i + 1) * WEBRTC_CHUNK_SIZE);
        conn.send({
          type: 'JCV_HD_CHUNK',
          index: i,
          totalChunks,
          chunk: slice,
        });
      }

      conn.send({
        type: 'JCV_HD_END',
        totalChunks,
      });
    } catch {
      // Ignore send errors
    }
  };

  try {
    const peerId = getDeterministicPeerId(result.id);
    peer = new Peer(peerId, {
      debug: 0,
      config: {
        iceServers: PEER_ICE_SERVERS,
      },
    });

    peer.on('connection', (conn: DataConnection) => {
      let sent = false;
      const triggerSend = () => {
        if (sent || destroyed) return;
        sent = true;
        sendChunkedBundle(conn);
      };

      conn.on('open', () => {
        setTimeout(triggerSend, 60);
      });

      conn.on('data', (data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          (data as Record<string, unknown>).type === 'JCV_REQUEST_HD'
        ) {
          sent = false;
          triggerSend();
        }
      });
    });

    peer.on('error', () => {
      // Ignore signaling errors when tablet is offline
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
 * Connects from the Guest's iPhone/Android to the Galaxy Tab A11's Chunked WebRTC P2P Host
 * AND HTTPS Relay in parallel to pull the crisp HD Camera Portrait Sheet and reconstruct the HD photostrip.
 */
export function fetchFullHdFromTabletPeer(
  baseResult: PhotostripResult,
  onReceived: (hdResult: {
    colorStripJpegUrl: string;
    thermalStripPngUrl: string;
    individualPhotos: string[];
  }) => void,
  onProgress?: (pct: number) => void
): () => void {
  let peer: Peer | null = null;
  let destroyed = false;
  let resolved = false;
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  const deliverHdSheet = async (hdSheetDataUrl: string, count: number) => {
    if (destroyed || resolved || !hdSheetDataUrl) return;
    resolved = true;
    if (retryTimer) clearInterval(retryTimer);
    onProgress?.(92);

    const upgradedResult: PhotostripResult = {
      ...baseResult,
      photos: [hdSheetDataUrl],
      compositeDataUrl: hdSheetDataUrl,
      printCopies: count,
    };
    const reconstructed = await reconstructVectorHdPhotostripOnPhone(upgradedResult, true);
    if (!destroyed) {
      onProgress?.(100);
      onReceived(reconstructed);
    }
  };

  // 1. Race HTTPS Relay in parallel
  fetchFullHdFromHttpsRelay(baseResult.id, (p) => {
    if (!resolved) onProgress?.(p);
  })
    .then((relayData) => {
      if (relayData && relayData.hdSheetDataUrl) {
        deliverHdSheet(relayData.hdSheetDataUrl, relayData.count);
      }
    })
    .catch(() => {});

  // 2. Race Chunked WebRTC P2P DataChannel (only ~3 chunks of 10 KB!)
  try {
    const hostPeerId = getDeterministicPeerId(baseResult.id);
    peer = new Peer({
      debug: 0,
      config: {
        iceServers: PEER_ICE_SERVERS,
      },
    });

    const connectAttempt = () => {
      if (destroyed || resolved || !peer || peer.disconnected) return;
      const conn = peer.connect(hostPeerId, { reliable: true });
      const receivedChunks: string[] = [];
      let expectedChunks = 0;

      conn.on('open', () => {
        if (destroyed || resolved) return;
        onProgress?.(35);
        conn.send({ type: 'JCV_REQUEST_HD' });
      });

      conn.on('data', (data: unknown) => {
        if (destroyed || resolved || !data || typeof data !== 'object') return;
        const msg = data as Record<string, unknown>;

        if (msg.type === 'JCV_HD_START' && typeof msg.totalChunks === 'number') {
          expectedChunks = msg.totalChunks;
          onProgress?.(45);
        } else if (
          msg.type === 'JCV_HD_CHUNK' &&
          typeof msg.index === 'number' &&
          typeof msg.chunk === 'string'
        ) {
          const total = typeof msg.totalChunks === 'number' ? msg.totalChunks : expectedChunks || 1;
          expectedChunks = total;
          receivedChunks[msg.index] = msg.chunk;
          const countSoFar = receivedChunks.filter((c) => typeof c === 'string').length;
          onProgress?.(Math.min(90, 45 + Math.round((countSoFar / total) * 45)));

          if (countSoFar === total) {
            try {
              const parsed = JSON.parse(receivedChunks.join('')) as {
                hdSheetDataUrl?: string;
                count?: number;
              };
              if (parsed?.hdSheetDataUrl) {
                deliverHdSheet(parsed.hdSheetDataUrl, parsed.count || 1);
              }
            } catch {
              // wait for JCV_HD_END
            }
          }
        } else if (msg.type === 'JCV_HD_END') {
          try {
            const parsed = JSON.parse(receivedChunks.join('')) as {
              hdSheetDataUrl?: string;
              count?: number;
            };
            if (parsed?.hdSheetDataUrl) {
              deliverHdSheet(parsed.hdSheetDataUrl, parsed.count || 1);
            }
          } catch {
            // ignore
          }
        }
      });
    };

    peer.on('open', () => {
      connectAttempt();
      retryTimer = setInterval(() => {
        if (!resolved && !destroyed) {
          connectAttempt();
        }
      }, 1800);
    });

    peer.on('error', () => {
      // Silent fallback
    });
  } catch {
    // Ignore
  }

  return () => {
    destroyed = true;
    if (retryTimer) clearInterval(retryTimer);
    try {
      peer?.destroy();
    } catch {
      // ignore
    }
  };
}

/**
 * Luminance-Channel Unsharp Mask + Local Contrast Clarity Filter.
 * Sharpens eyes, hair, facial contours, and glasses without introducing color noise or halos.
 */
function applyPortraitClarityEnhancer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number = 0.65
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src);

  // Compute luminance plane
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    lum[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }

  // 3x3 Gaussian blur kernel on luminance to extract high-frequency facial detail
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const blurLum =
        (lum[idx - width - 1] +
          lum[idx - width] * 2 +
          lum[idx - width + 1] +
          lum[idx - 1] * 2 +
          lum[idx] * 4 +
          lum[idx + 1] * 2 +
          lum[idx + width - 1] +
          lum[idx + width] * 2 +
          lum[idx + width + 1]) /
        16;

      const detail = lum[idx] - blurLum;
      // Suppress tiny quantization noise (< 1.5) while boosting real facial edges
      const boost = Math.abs(detail) < 1.5 ? 0 : detail * amount;
      // Gentle S-curve midtone contrast
      const cIdx = idx * 4;
      for (let c = 0; c < 3; c++) {
        const v = src[cIdx + c] + boost;
        const norm = Math.max(0, Math.min(255, v)) / 255;
        const contrasted = (norm - 0.5) * 1.05 + 0.5;
        out[cIdx + c] = Math.max(0, Math.min(255, Math.round(contrasted * 255)));
      }
    }
  }

  imgData.data.set(out);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Packs ONLY the raw camera photo(s) into a clean 4:3 vertical contact sheet
 * so 0 bytes of the QR code are wasted on frame borders or text!
 */
async function buildCameraPhotosOnlyCanvas(
  photos: string[],
  layout: FrameLayoutType,
  fallbackCanvas: HTMLCanvasElement
): Promise<{ canvas: HTMLCanvasElement; count: number }> {
  const maxCount =
    layout === 'single_polaroid'
      ? 1
      : layout === 'grid_4' && photos.length <= 2
      ? 2
      : layout === 'strip_3'
      ? 3
      : 4;
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

  const slotW = 320;
  const slotH = 240;
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
 * Compresses a camera-only canvas into an ultra-crisp Data URI that fits inside a Version-40 QR code.
 * Prioritizes high compression quality (q >= 0.56) so faces never suffer from q=0.30 macroblock blur!
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxChars: number = 2580,
  forceJpegForIos: boolean = false
): { dataUrl: string; width: number; height: number } {
  const srcW = sourceCanvas.width || 320;
  const srcH = sourceCanvas.height || 240;
  const aspect = srcH / srcW;

  // Ordered by highest visual facial clarity (high quality + balanced resolution first, never dropping to 0.30 at high res)
  const clarityProfiles: Array<[number, number]> = [
    [248, 0.76],
    [232, 0.74],
    [220, 0.72],
    [208, 0.70],
    [196, 0.68],
    [184, 0.66],
    [176, 0.64],
    [168, 0.62],
    [160, 0.60],
    [152, 0.58],
    [144, 0.56],
    [136, 0.54],
    [128, 0.52],
    [116, 0.50],
  ];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  let bestDataUrl = '';
  let bestW = 160;
  let bestH = Math.round(160 * aspect);

  for (const [w, q] of clarityProfiles) {
    const h = Math.max(48, Math.round(w * aspect));
    scratch.width = w;
    scratch.height = h;

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, w, h);
      // Pre-sharpen facial features slightly before encoding so WebP/JPEG retains crisp eye/hair edges
      applyPortraitClarityEnhancer(ctx, w, h, 0.38);
    }

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
 * Generates an iOS & Android compatible QR Code with maximum portrait clarity.
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
    const compressed = compressCanvasForOfflineQr(camCanvas, 2650, true);
    const payloadString = compressed.dataUrl;
    const qrDataUrl = await QRCode.toDataURL(payloadString, {
      errorCorrectionLevel: 'L',
      width: 420,
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

  const { canvas: camCanvas, count: photoCount } = await buildCameraPhotosOnlyCanvas(
    result.photos,
    result.layout,
    fallbackCanvas
  );

  const metaPrefix = `t=${encodeURIComponent(result.themeId)}&l=${encodeURIComponent(
    result.layout
  )}&f=${encodeURIComponent(result.filter)}&c=${photoCount}&offline-photo=`;

  const prefix = `${resolvedBaseUrl}?share=${encodeURIComponent(result.id)}#${metaPrefix}`;
  // Version-40 QR Level L supports up to 2,953 bytes; 2,740 total chars leaves safe margin while maximizing portrait quality
  const availableForImage = Math.max(1250, 2740 - prefix.length);
  const compressed = compressCanvasForOfflineQr(camCanvas, availableForImage, false);

  const isWebp = compressed.dataUrl.startsWith('data:image/webp;base64,');
  const formatCode = isWebp ? 'w' : 'j';
  const rawBase64 = compressed.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  const urlSafeBase64 = rawBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payloadString = `${prefix}${formatCode}.${urlSafeBase64}`;

  const qrDataUrl = await QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'L',
    width: 420,
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
 * Splits a vertical camera contact sheet back into individual 4:3 portraits with multi-step
 * bicubic upscaling + luminance unsharp masking, and renders the 100% native HD vector photostrip!
 */
export async function reconstructVectorHdPhotostripOnPhone(
  result: PhotostripResult,
  isFromHdStream: boolean = false
): Promise<{
  colorStripJpegUrl: string;
  thermalStripPngUrl: string;
  individualPhotos: string[];
}> {
  const packedCount =
    result.layout === 'single_polaroid'
      ? 1
      : result.layout === 'strip_3'
      ? 3
      : result.printCopies && result.printCopies > 1
      ? result.printCopies
      : 1;

  // If result already has a pre-composited full-HD strip (e.g. opened directly on the booth tablet)
  if (
    !isFromHdStream &&
    result.compositeDataUrl &&
    result.compositeDataUrl.length > 55000 &&
    result.photos.length > 1
  ) {
    const jpegUrl = await upscaleToIosCompatibleJpeg(result.compositeDataUrl);
    return {
      colorStripJpegUrl: jpegUrl,
      thermalStripPngUrl: result.thermalRasterDataUrl || jpegUrl,
      individualPhotos: result.photos,
    };
  }

  const packedDataUrl = result.photos[0] || result.compositeDataUrl;
  const individualPhotos: string[] = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 220;
      const totalH = img.naturalHeight || img.height || 165 * packedCount;
      const inferredCount = Math.max(1, Math.round(totalH / (w * 0.75)));
      const count = packedCount > 1 ? packedCount : inferredCount;
      const singleH = Math.max(1, Math.floor(totalH / count));

      const targetW = 720;
      const targetH = 540;
      const extracted: string[] = [];

      for (let i = 0; i < count; i++) {
        // Step 1: Intermediate 2x bicubic upscale (no blur!)
        const step1 = document.createElement('canvas');
        step1.width = 400;
        step1.height = 300;
        const ctx1 = step1.getContext('2d');
        if (ctx1) {
          ctx1.imageSmoothingEnabled = true;
          ctx1.imageSmoothingQuality = 'high';
          ctx1.drawImage(img, 0, i * singleH, w, singleH, 0, 0, 400, 300);
          applyPortraitClarityEnhancer(ctx1, 400, 300, isFromHdStream ? 0.35 : 0.72);
        }

        // Step 2: Final 720x540 upscale + fine edge clarity pass
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(ctx1 ? step1 : img, 0, 0, targetW, targetH);
          applyPortraitClarityEnhancer(finalCtx, targetW, targetH, isFromHdStream ? 0.25 : 0.45);
          extracted.push(finalCanvas.toDataURL('image/jpeg', 0.95));
        }
        step1.width = 0;
        finalCanvas.width = 0;
      }

      resolve(extracted.length > 0 ? extracted : [packedDataUrl]);
    };
    img.onerror = () => resolve([packedDataUrl]);
    img.src = packedDataUrl;
  });

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
      const srcW = img.naturalWidth || img.width || 768;
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
 * into a `PhotostripResult` AND immediately hides the ugly URL query/hash from the browser bar!
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
    const packedCount = Math.max(1, parseInt(hashParams.get('c') || '1', 10) || 1);

    // Immediately hide the long QR query & hash from the phone's browser address bar!
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        // ignore
      }
    }

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
      shareUrl: '',
      printCopies: packedCount,
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
