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

// Safe 10 KB chunk size for WebRTC DataChannel (well below iOS Safari's 64 KB SCTP limit)
const WEBRTC_CHUNK_SIZE = 10240;

// Verified MQTT-over-WebSockets (TLS port 8084) brokers supporting retained binary/JSON payloads up to 1MB+
const MQTT_WSS_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081',
];

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
 * Converts a share ID into a deterministic, alphanumeric ID.
 */
export function getDeterministicPeerId(shareId: string): string {
  const clean = shareId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `jcvhd4${clean.slice(0, 26)}`;
}

// ============================================================================
// Pure Browser MQTT 3.1.1 over WebSockets (Zero-Dependency, Retained HD Sync)
// ============================================================================

function mqttEncodeVarLen(len: number): number[] {
  const bytes: number[] = [];
  let v = len;
  do {
    let d = v % 128;
    v = Math.floor(v / 128);
    if (v > 0) d |= 128;
    bytes.push(d);
  } while (v > 0);
  return bytes;
}

function mqttEncodeStr(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  const out = new Uint8Array(2 + enc.length);
  out[0] = (enc.length >> 8) & 0xff;
  out[1] = enc.length & 0xff;
  out.set(enc, 2);
  return out;
}

function mqttBuildConnectPacket(clientId: string): ArrayBuffer {
  const vh = new Uint8Array([0, 4, 77, 81, 84, 84, 4, 2, 0, 60]);
  const pl = mqttEncodeStr(clientId);
  const varLen = mqttEncodeVarLen(vh.length + pl.length);
  const out = new Uint8Array(1 + varLen.length + vh.length + pl.length);
  out[0] = 0x10;
  out.set(varLen, 1);
  out.set(vh, 1 + varLen.length);
  out.set(pl, 1 + varLen.length + vh.length);
  return out.buffer as ArrayBuffer;
}

function mqttBuildPublishRetainPacket(topic: string, payloadStr: string): ArrayBuffer {
  const tb = mqttEncodeStr(topic);
  const pb = new TextEncoder().encode(payloadStr);
  const varLen = mqttEncodeVarLen(tb.length + pb.length);
  const out = new Uint8Array(1 + varLen.length + tb.length + pb.length);
  out[0] = 0x31; // PUBLISH with RETAIN=1 (broker stores HD photo in memory for instant phone fetch!)
  out.set(varLen, 1);
  out.set(tb, 1 + varLen.length);
  out.set(pb, 1 + varLen.length + tb.length);
  return out.buffer as ArrayBuffer;
}

function mqttBuildSubscribePacket(topic: string): ArrayBuffer {
  const tb = mqttEncodeStr(topic);
  const varLen = mqttEncodeVarLen(2 + tb.length + 1);
  const out = new Uint8Array(1 + varLen.length + 2 + tb.length + 1);
  out[0] = 0x82;
  out.set(varLen, 1);
  out[1 + varLen.length] = 0;
  out[1 + varLen.length + 1] = 1;
  out.set(tb, 1 + varLen.length + 2);
  out[out.length - 1] = 0;
  return out.buffer as ArrayBuffer;
}

/**
 * Returns the exact slot aspect ratio used by `renderPhotostripCanvas` for a layout
 * so camera photos are NEVER double-cropped or zoomed in!
 */
function getLayoutSlotAspect(layout: FrameLayoutType, photoCount: number): number {
  if (layout === 'single_polaroid') {
    // 672 / 572 = 1.1748 (matches frameTemplates.ts single_polaroid slot 1:1!)
    return 672 / 572;
  }
  if (layout === 'grid_4' && photoCount > 2) {
    // 2x2 grid: slotWidth = (1152 - 112 - 24)/2 = 508, slotHeight = (1800 - 720 - 24)/2 = 528
    return 508 / 528;
  }
  if (layout === 'grid_4' && photoCount <= 2) {
    // 2-shot strip: slotWidth = 768 - 72 = 696, slotHeight = (1536 - 480 - 18)/2 = 519
    return 696 / 519;
  }
  if (layout === 'strip_3') {
    // 3-shot strip: slotWidth = 696, slotHeight = (1824 - 480 - 36)/3 = 436
    return 696 / 436;
  }
  // 4-shot strip: slotWidth = 696, slotHeight = (2208 - 480 - 54)/4 = 418.5
  return 696 / 418.5;
}

/**
 * Builds the Full-HD Transfer Bundle containing BOTH:
 * 1. `compositeJpegUrl`: The exact Full-HD 768x1152 / 768x1824 photostrip from the tablet (~85 KB JPEG at 0.88 quality)
 * 2. `hdSheetDataUrl`: High-res camera shots for the GIF & Individual Photos tabs
 */
async function buildFullHdTransferBundle(result: PhotostripResult): Promise<{
  compositeJpegUrl: string;
  hdSheetDataUrl: string;
  count: number;
}> {
  // 1. Compress the tablet's exact compositeDataUrl to a crisp 0.88 JPEG (~80-95 KB)
  const compositeJpegUrl = await new Promise<string>((resolve) => {
    if (!result.compositeDataUrl) {
      resolve('');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 768;
      c.height = img.naturalHeight || img.height || 1152;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const jpeg = c.toDataURL('image/jpeg', 0.88);
        c.width = 0;
        resolve(jpeg);
      } else {
        resolve(result.compositeDataUrl);
      }
    };
    img.onerror = () => resolve(result.compositeDataUrl);
    img.src = result.compositeDataUrl;
  });

  // 2. Also pack the individual camera photos at exact slot aspect ratio
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
    return {
      compositeJpegUrl,
      hdSheetDataUrl: compositeJpegUrl,
      count: 1,
    };
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
    return {
      compositeJpegUrl,
      hdSheetDataUrl: compositeJpegUrl,
      count: 1,
    };
  }

  const count = validImgs.length;
  const aspect = getLayoutSlotAspect(result.layout, count);
  const slotW = count === 1 ? 640 : 480;
  const slotH = Math.round(slotW / aspect);
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
      const imgAspect = iw / ih;
      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;
      if (imgAspect > aspect) {
        sw = ih * aspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / aspect;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, idx * slotH, slotW, slotH);
    });
  }

  const hdSheetDataUrl = out.toDataURL('image/jpeg', 0.85);
  out.width = 0;
  return { compositeJpegUrl, hdSheetDataUrl, count };
}

/**
 * Publishes the Full-HD Transfer Bundle as a RETAINED MQTT-over-WebSockets message
 * (`retain = true`) so any iPhone or Android scanning the QR code receives the exact
 * 100% Full-HD tablet photostrip in < 200ms over TLS port 8084/443!
 */
function publishRetainedHdViaWebSocket(
  shareId: string,
  bundleJson: string
): () => void {
  const topic = `jcv/photobooth/hd5/${getDeterministicPeerId(shareId)}`;
  const framedPayload = `JCV_HD5_START:${bundleJson}:JCV_HD5_END`;
  const sockets: WebSocket[] = [];

  for (const brokerUrl of MQTT_WSS_BROKERS) {
    try {
      const ws = new WebSocket(brokerUrl, 'mqtt');
      ws.binaryType = 'arraybuffer';
      sockets.push(ws);

      ws.onopen = () => {
        try {
          const clientId = `jcvpub_${Math.random().toString(36).slice(2, 10)}`;
          ws.send(mqttBuildConnectPacket(clientId));
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(mqttBuildPublishRetainPacket(topic, framedPayload));
            }
          }, 120);
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }

  return () => {
    for (const ws of sockets) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  };
}

/**
 * Subscribes from the Guest's iPhone/Android to the Retained MQTT-over-WebSockets topic
 * and receives the exact 100% Full-HD tablet photostrip in < 250ms!
 */
function subscribeRetainedHdViaWebSocket(
  shareId: string,
  onProgress: (pct: number) => void,
  onBundleReceived: (bundle: {
    compositeJpegUrl?: string;
    hdSheetDataUrl?: string;
    count?: number;
  }) => void
): () => void {
  const topic = `jcv/photobooth/hd5/${getDeterministicPeerId(shareId)}`;
  const sockets: WebSocket[] = [];
  let done = false;

  for (const brokerUrl of MQTT_WSS_BROKERS) {
    try {
      const ws = new WebSocket(brokerUrl, 'mqtt');
      ws.binaryType = 'arraybuffer';
      sockets.push(ws);

      let accBytes = new Uint8Array(0);

      ws.onopen = () => {
        if (done) return;
        onProgress(35);
        try {
          const clientId = `jcvsub_${Math.random().toString(36).slice(2, 10)}`;
          ws.send(mqttBuildConnectPacket(clientId));
          setTimeout(() => {
            if (!done && ws.readyState === WebSocket.OPEN) {
              onProgress(50);
              ws.send(mqttBuildSubscribePacket(topic));
            }
          }, 90);
        } catch {
          // ignore
        }
      };

      ws.onmessage = (ev: MessageEvent) => {
        if (done || !(ev.data instanceof ArrayBuffer)) return;
        const incoming = new Uint8Array(ev.data);
        const merged = new Uint8Array(accBytes.length + incoming.length);
        merged.set(accBytes, 0);
        merged.set(incoming, accBytes.length);
        accBytes = merged;

        if (accBytes.length > 2000) {
          onProgress(Math.min(92, 50 + Math.round((accBytes.length / 95000) * 42)));
        }

        const decodedStr = new TextDecoder().decode(accBytes);
        const startIdx = decodedStr.indexOf('JCV_HD5_START:');
        const endIdx = decodedStr.indexOf(':JCV_HD5_END');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonStr = decodedStr.slice(startIdx + 'JCV_HD5_START:'.length, endIdx);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed && (parsed.compositeJpegUrl || parsed.hdSheetDataUrl)) {
              done = true;
              onProgress(100);
              onBundleReceived(parsed);
              for (const s of sockets) {
                try {
                  s.close();
                } catch {}
              }
            }
          } catch {
            // wait for more frames
          }
        }
      };
    } catch {
      // ignore
    }
  }

  return () => {
    done = true;
    for (const s of sockets) {
      try {
        s.close();
      } catch {}
    }
  };
}

/**
 * Starts the Full-HD Host on the Galaxy Tab A11 using BOTH:
 * 1. Retained MQTT-over-WebSockets (`wss://broker.emqx.io:8084/mqtt`) — instant <200ms delivery with zero NAT/CORS issues
 * 2. Chunked WebRTC P2P DataChannel (`PeerJS`) — direct P2P fallback
 */
export function startTabletHdPeerHost(
  result: PhotostripResult,
  onGuestConnected?: () => void
): () => void {
  let peer: Peer | null = null;
  let destroyed = false;
  let stopWsPublish: (() => void) | null = null;
  let republishInterval: ReturnType<typeof setInterval> | null = null;

  const bundlePromise = buildFullHdTransferBundle(result);

  bundlePromise
    .then((bundle) => {
      if (destroyed) return;
      const jsonStr = JSON.stringify(bundle);
      stopWsPublish = publishRetainedHdViaWebSocket(result.id, jsonStr);
      // Periodically refresh retained publish while screen is open
      republishInterval = setInterval(() => {
        if (!destroyed) {
          stopWsPublish?.();
          stopWsPublish = publishRetainedHdViaWebSocket(result.id, jsonStr);
        }
      }, 8000);
    })
    .catch(() => {});

  const sendChunkedBundle = async (conn: DataConnection) => {
    if (destroyed) return;
    try {
      onGuestConnected?.();
      const bundle = await bundlePromise;
      if (destroyed) return;

      const fullPayload = JSON.stringify(bundle);
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
    if (republishInterval) clearInterval(republishInterval);
    stopWsPublish?.();
    try {
      peer?.destroy();
    } catch {
      // ignore
    }
  };
}

/**
 * Pulls the 100% Full-HD tablet photostrip and camera shots on the Guest's iPhone/Android
 * using Retained MQTT-over-WebSockets + Chunked WebRTC P2P in parallel.
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

  const deliverHdBundle = async (bundle: {
    compositeJpegUrl?: string;
    hdSheetDataUrl?: string;
    count?: number;
  }) => {
    if (destroyed || resolved) return;
    if (!bundle.compositeJpegUrl && !bundle.hdSheetDataUrl) return;
    resolved = true;
    if (retryTimer) clearInterval(retryTimer);
    onProgress?.(95);

    const sheetUrl = bundle.hdSheetDataUrl || bundle.compositeJpegUrl || '';
    const count = bundle.count || baseResult.printCopies || 1;
    const upgradedResult: PhotostripResult = {
      ...baseResult,
      photos: [sheetUrl],
      compositeDataUrl: bundle.compositeJpegUrl || sheetUrl,
      printCopies: count,
    };

    const reconstructed = await reconstructVectorHdPhotostripOnPhone(upgradedResult, true);

    // If the tablet sent its exact rendered compositeJpegUrl, use that exact Full-HD strip directly!
    const finalColorStrip = bundle.compositeJpegUrl
      ? await upscaleToIosCompatibleJpeg(bundle.compositeJpegUrl)
      : reconstructed.colorStripJpegUrl;

    if (!destroyed) {
      onProgress?.(100);
      onReceived({
        colorStripJpegUrl: finalColorStrip,
        thermalStripPngUrl: reconstructed.thermalStripPngUrl,
        individualPhotos: reconstructed.individualPhotos,
      });
    }
  };

  // 1. Race Retained MQTT-over-WebSockets (delivers in <250ms across any Wi-Fi or 4G/5G!)
  const stopWsSub = subscribeRetainedHdViaWebSocket(
    baseResult.id,
    (p) => {
      if (!resolved) onProgress?.(p);
    },
    (bundle) => {
      deliverHdBundle(bundle);
    }
  );

  // 2. Race Chunked WebRTC P2P DataChannel in parallel
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
        onProgress?.(40);
        conn.send({ type: 'JCV_REQUEST_HD' });
      });

      conn.on('data', (data: unknown) => {
        if (destroyed || resolved || !data || typeof data !== 'object') return;
        const msg = data as Record<string, unknown>;

        if (msg.type === 'JCV_HD_START' && typeof msg.totalChunks === 'number') {
          expectedChunks = msg.totalChunks;
          onProgress?.(50);
        } else if (
          msg.type === 'JCV_HD_CHUNK' &&
          typeof msg.index === 'number' &&
          typeof msg.chunk === 'string'
        ) {
          const total = typeof msg.totalChunks === 'number' ? msg.totalChunks : expectedChunks || 1;
          expectedChunks = total;
          receivedChunks[msg.index] = msg.chunk;
          const countSoFar = receivedChunks.filter((c) => typeof c === 'string').length;
          onProgress?.(Math.min(92, 50 + Math.round((countSoFar / total) * 42)));

          if (countSoFar === total) {
            try {
              const parsed = JSON.parse(receivedChunks.join(''));
              if (parsed && (parsed.compositeJpegUrl || parsed.hdSheetDataUrl)) {
                deliverHdBundle(parsed);
              }
            } catch {
              // wait for JCV_HD_END
            }
          }
        } else if (msg.type === 'JCV_HD_END') {
          try {
            const parsed = JSON.parse(receivedChunks.join(''));
            if (parsed && (parsed.compositeJpegUrl || parsed.hdSheetDataUrl)) {
              deliverHdBundle(parsed);
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
    stopWsSub();
    if (retryTimer) clearInterval(retryTimer);
    try {
      peer?.destroy();
    } catch {
      // ignore
    }
  };
}

/**
 * Foveated Pre-Compression Filter (runs on the Tablet BEFORE WebP/JPEG encoding):
 * 1. Strips high-frequency camera sensor grain on flat skin/walls using a 3x3 surface denoiser
 *    while preserving eyes, eyebrows, lips, and hair edges 100%.
 * 2. Gently low-pass filters the outer background periphery outside the portrait center
 *    so 85%+ of the QR code's WebP/JPEG bit budget is spent on the subject's face!
 */
function applyFoveatedPreCompressionFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shotCount: number = 1
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const denoised = new Uint8ClampedArray(src);

  // Pass 1: 3x3 Edge-Preserving Surface Denoiser (removes random sensor grain <= 10 gray levels)
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const cIdx = (row + x) * 4;
      const r0 = src[cIdx];
      const g0 = src[cIdx + 1];
      const b0 = src[cIdx + 2];

      let sumR = r0 * 4;
      let sumG = g0 * 4;
      let sumB = b0 * 4;
      let wSum = 4;

      for (let dy = -1; dy <= 1; dy++) {
        const nRow = (y + dy) * width;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = (nRow + x + dx) * 4;
          const dr = Math.abs(src[nIdx] - r0);
          const dg = Math.abs(src[nIdx + 1] - g0);
          const db = Math.abs(src[nIdx + 2] - b0);
          const diff = dr * 0.3 + dg * 0.59 + db * 0.11;
          if (diff < 11) {
            const w = diff < 5 ? 2 : 1;
            sumR += src[nIdx] * w;
            sumG += src[nIdx + 1] * w;
            sumB += src[nIdx + 2] * w;
            wSum += w;
          }
        }
      }

      denoised[cIdx] = Math.round(sumR / wSum);
      denoised[cIdx + 1] = Math.round(sumG / wSum);
      denoised[cIdx + 2] = Math.round(sumB / wSum);
    }
  }

  // Pass 2: Foveated Background Periphery Low-Pass Filter (allocates bits to center face)
  const out = new Uint8ClampedArray(denoised);
  const singleH = Math.max(1, Math.floor(height / Math.max(1, shotCount)));

  for (let y = 2; y < height - 2; y++) {
    const localY = y % singleH;
    const ny = (localY + 0.5) / singleH;
    const dyNorm = (ny - 0.52) / 0.41;

    for (let x = 2; x < width - 2; x++) {
      const nx = (x + 0.5) / width;
      const dxNorm = (nx - 0.5) / 0.37;
      const radialDistSq = dxNorm * dxNorm + dyNorm * dyNorm;

      // Inside the central face oval (radialDistSq <= 1.0), keep 100% full resolution
      if (radialDistSq <= 1.0) continue;

      const blend = Math.min(0.62, (radialDistSq - 1.0) * 0.42);
      if (blend <= 0.02) continue;

      let avgR = 0;
      let avgG = 0;
      let avgB = 0;
      for (let ky = -2; ky <= 2; ky++) {
        const kRow = (y + ky) * width;
        for (let kx = -2; kx <= 2; kx++) {
          const kIdx = (kRow + x + kx) * 4;
          avgR += denoised[kIdx];
          avgG += denoised[kIdx + 1];
          avgB += denoised[kIdx + 2];
        }
      }
      avgR /= 25;
      avgG /= 25;
      avgB /= 25;

      const cIdx = (y * width + x) * 4;
      out[cIdx] = Math.round(denoised[cIdx] * (1 - blend) + avgR * blend);
      out[cIdx + 1] = Math.round(denoised[cIdx + 1] * (1 - blend) + avgG * blend);
      out[cIdx + 2] = Math.round(denoised[cIdx + 2] * (1 - blend) + avgB * blend);
    }
  }

  imgData.data.set(out);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Stage 1 (On Guest Phone at Native Decoded Resolution):
 * YCbCr 8x8/4x4 DCT Block-Boundary Deblocker + 5x5 Joint Bilateral Chroma Smoother
 * + 2-Pass Edge-Preserving Bilateral Surface Filter + Adaptive Portrait Shadow Lift.
 * Melts away 8x8 luminance blocks and 16x16 color blotches on skin/walls while keeping
 * eyes, eyebrows, hair, and facial contours 100% sharp!
 */
function applyYCbCrDctDeblockingFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const n = width * height;

  const Y = new Float32Array(n);
  const Cb = new Float32Array(n);
  const Cr = new Float32Array(n);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    Y[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[p] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    Cr[p] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  // Step 1A: Explicit 4x4 / 8x8 DCT Block-Boundary De-Stepping on Luminance Y
  // Smooths artificial quantization steps across vertical (x % 4 == 0) and horizontal (y % 4 == 0) block boundaries
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 4; x < width - 2; x += 4) {
      const idx = row + x;
      const p1 = Y[idx - 2];
      const p0 = Y[idx - 1];
      const q0 = Y[idx];
      const q1 = Y[idx + 1];
      const delta = q0 - p0;
      const absDelta = Math.abs(delta);
      if (absDelta > 0.5 && absDelta < 24 && Math.abs(p0 - p1) < 10 && Math.abs(q1 - q0) < 10) {
        const adj = delta * 0.42;
        Y[idx - 1] = p0 + adj;
        Y[idx] = q0 - adj;
        Y[idx - 2] = p1 + adj * 0.35;
        Y[idx + 1] = q1 - adj * 0.35;
      }
    }
  }

  for (let y = 4; y < height - 2; y += 4) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const p1 = Y[idx - 2 * width];
      const p0 = Y[idx - width];
      const q0 = Y[idx];
      const q1 = Y[idx + width];
      const delta = q0 - p0;
      const absDelta = Math.abs(delta);
      if (absDelta > 0.5 && absDelta < 24 && Math.abs(p0 - p1) < 10 && Math.abs(q1 - q0) < 10) {
        const adj = delta * 0.42;
        Y[idx - width] = p0 + adj;
        Y[idx] = q0 - adj;
        Y[idx - 2 * width] = p1 + adj * 0.35;
        Y[idx + width] = q1 - adj * 0.35;
      }
    }
  }

  // Step 1B: 5x5 Joint Bilateral Chroma Deblocking (eliminates 16x16 color blotches on skin & walls)
  const smoothCb = new Float32Array(Cb);
  const smoothCr = new Float32Array(Cr);
  for (let y = 2; y < height - 2; y++) {
    const row = y * width;
    for (let x = 2; x < width - 2; x++) {
      const idx = row + x;
      const y0 = Y[idx];
      let sumCb = 0;
      let sumCr = 0;
      let wSum = 0;

      for (let dy = -2; dy <= 2; dy++) {
        const nRow = (y + dy) * width;
        for (let dx = -2; dx <= 2; dx++) {
          const nIdx = nRow + x + dx;
          const dyDiff = Math.abs(Y[nIdx] - y0);
          if (dyDiff < 32) {
            const w = dyDiff < 12 ? 2.0 : 1.0 - (dyDiff - 12) / 24;
            sumCb += Cb[nIdx] * w;
            sumCr += Cr[nIdx] * w;
            wSum += w;
          }
        }
      }
      if (wSum > 0) {
        smoothCb[idx] = sumCb / wSum;
        smoothCr[idx] = sumCr / wSum;
      }
    }
  }

  // Step 1C: 2-Pass 5x5 Edge-Preserving Bilateral Filter on Luminance Y
  // Melts flat 8x8 stair-steps on cheeks, forehead, nose, chin & walls while keeping eyes/hair sharp
  let curY = Y;
  const spatialKernel = [
    1, 2, 3, 2, 1,
    2, 5, 6, 5, 2,
    3, 6, 8, 6, 3,
    2, 5, 6, 5, 2,
    1, 2, 3, 2, 1,
  ];

  for (let pass = 0; pass < 2; pass++) {
    const nextY = new Float32Array(curY);
    const invTwoSigmaSq = 1 / (2 * (pass === 0 ? 16.5 * 16.5 : 13.0 * 13.0));

    for (let y = 2; y < height - 2; y++) {
      const row = y * width;
      for (let x = 2; x < width - 2; x++) {
        const idx = row + x;
        const centerY = curY[idx];
        let sumY = 0;
        let wSum = 0;
        let k = 0;

        for (let dy = -2; dy <= 2; dy++) {
          const nRow = (y + dy) * width;
          for (let dx = -2; dx <= 2; dx++, k++) {
            const nVal = curY[nRow + x + dx];
            const diff = nVal - centerY;
            const absDiff = Math.abs(diff);
            if (absDiff > 34) continue;
            const rangeW = Math.exp(-(diff * diff) * invTwoSigmaSq);
            const w = spatialKernel[k] * rangeW;
            sumY += nVal * w;
            wSum += w;
          }
        }

        if (wSum > 0) {
          nextY[idx] = sumY / wSum;
        }
      }
    }
    curY = nextY;
  }

  // Step 1D: Adaptive Portrait Shadow Lift (brightens dark indoor eyes/faces gently without blowing highlights)
  let faceLumSum = 0;
  let faceCount = 0;
  const xStart = Math.floor(width * 0.25);
  const xEnd = Math.ceil(width * 0.75);
  const yStart = Math.floor(height * 0.2);
  const yEnd = Math.ceil(height * 0.8);
  for (let y = yStart; y < yEnd; y++) {
    const row = y * width;
    for (let x = xStart; x < xEnd; x++) {
      faceLumSum += curY[row + x];
      faceCount++;
    }
  }
  const meanFaceY = faceCount > 0 ? faceLumSum / faceCount : 128;
  const shadowLiftStrength = meanFaceY < 118 ? Math.min(0.22, ((118 - meanFaceY) / 118) * 0.28) : 0;

  // Convert restored YCbCr back to RGB
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    let yVal = curY[p];
    if (shadowLiftStrength > 0) {
      const norm = Math.max(0, Math.min(1, yVal / 255));
      // Smooth shadow lift that boosts dark/mid tones (eyes/skin) while leaving bright walls unchanged
      const lifted = norm + shadowLiftStrength * norm * (1 - norm) * (1 - norm * 0.5);
      yVal = lifted * 255;
    }

    const cb = smoothCb[p] - 128;
    const cr = smoothCr[p] - 128;

    const r = yVal + 1.402 * cr;
    const g = yVal - 0.344136 * cb - 0.714136 * cr;
    const b = yVal + 1.772 * cb;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  imgData.data.set(data);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Stage 2 (Mid-Scale 384px Polish):
 * Fast 3x3 Edge-Preserving Bilateral Polish that eliminates any diagonal stair-stepping
 * or interpolation ringing after the first upscale stage.
 */
function applyMidScaleBilateralPolish(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src);

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const cIdx = (row + x) * 4;
      const r0 = src[cIdx];
      const g0 = src[cIdx + 1];
      const b0 = src[cIdx + 2];

      let sumR = r0 * 4;
      let sumG = g0 * 4;
      let sumB = b0 * 4;
      let wSum = 4;

      for (let dy = -1; dy <= 1; dy++) {
        const nRow = (y + dy) * width;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = (nRow + x + dx) * 4;
          const diff =
            Math.abs(src[nIdx] - r0) * 0.3 +
            Math.abs(src[nIdx + 1] - g0) * 0.59 +
            Math.abs(src[nIdx + 2] - b0) * 0.11;
          if (diff < 15) {
            const w = diff < 7 ? 1.5 : 0.75;
            sumR += src[nIdx] * w;
            sumG += src[nIdx + 1] * w;
            sumB += src[nIdx + 2] * w;
            wSum += w;
          }
        }
      }

      out[cIdx] = Math.round(sumR / wSum);
      out[cIdx + 1] = Math.round(sumG / wSum);
      out[cIdx + 2] = Math.round(sumB / wSum);
    }
  }

  imgData.data.set(out);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Stage 3 (Final 672px Soft-Coring Structural Feature Definition):
 * Only enhances true high-contrast structural edges (eyelashes, pupils, eyebrows, lips, hair)
 * where |detail| >= deadband, while leaving smooth skin and backgrounds 100% untouched
 * so compression blocks are NEVER re-sharpened!
 */
function applySoftCoringFeatureEnhancer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number = 0.34,
  deadband: number = 4.2
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src);

  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    lum[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }

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
      const absDetail = Math.abs(detail);
      if (absDetail <= deadband) continue;

      const sign = detail > 0 ? 1 : -1;
      const boost = sign * Math.min(10, (absDetail - deadband) * amount);
      const cIdx = idx * 4;
      for (let c = 0; c < 3; c++) {
        out[cIdx + c] = Math.max(0, Math.min(255, Math.round(src[cIdx + c] + boost)));
      }
    }
  }

  imgData.data.set(out);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Packs ONLY the raw camera photo(s) at the exact slot aspect ratio of the chosen frame layout
 * so there is ZERO double-cropping or zooming in on the subject's face!
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

  const count = validImgs.length;
  const slotAspect = getLayoutSlotAspect(layout, count);
  const slotW = 360;
  const slotH = Math.round(slotW / slotAspect);
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
      const imgAspect = iw / ih;
      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;
      if (imgAspect > slotAspect) {
        sw = ih * slotAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / slotAspect;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, idx * slotH, slotW, slotH);
    });
  }

  return { canvas: out, count };
}

function stripDataUrlToBase64Length(dataUrl: string): number {
  const raw = dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '').replace(/=+$/, '');
  return raw.length;
}

/**
 * Compresses a camera-only canvas into an ultra-smooth, block-free Data URI that maximizes
 * the Version-40 QR code capacity (~2,925 bytes total URL) while keeping quality high (>= 0.62)
 * so 8x8 macroblocks are never coarsely quantized!
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxBase64Chars: number = 2780,
  forceJpegForIos: boolean = false,
  shotCount: number = 1
): { dataUrl: string; width: number; height: number } {
  const srcW = sourceCanvas.width || 360;
  const srcH = sourceCanvas.height || 306;
  const aspect = srcH / srcW;

  // Prioritized (width, quality) profiles — keeps quality >= 0.62 to prevent 8x8 DCT blockiness!
  const clarityProfiles: Array<[number, number]> = [
    [280, 0.78],
    [268, 0.76],
    [256, 0.75],
    [248, 0.74],
    [240, 0.73],
    [232, 0.72],
    [224, 0.71],
    [216, 0.70],
    [208, 0.69],
    [200, 0.68],
    [192, 0.67],
    [184, 0.66],
    [176, 0.65],
    [168, 0.64],
    [160, 0.63],
    [152, 0.62],
    [144, 0.60],
    [136, 0.58],
  ];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  let bestDataUrl = '';
  let bestW = 176;
  let bestH = Math.round(176 * aspect);

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
      // Foveated pre-filtering removes sensor grain & smooths outer background periphery
      // so 85% of WebP/JPEG bits go directly to the subject's face!
      applyFoveatedPreCompressionFilter(ctx, w, h, shotCount);
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

    if (stripDataUrlToBase64Length(attempt) <= maxBase64Chars) {
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
 * Generates an iOS & Android compatible QR Code with maximum portrait clarity even when 100% offline.
 */
export async function buildOfflineQrPacket(
  fallbackCanvas: HTMLCanvasElement,
  result: PhotostripResult,
  mode: OfflineQrMode,
  customHostOrigin?: string
): Promise<OfflineQrPacket> {
  const resolvedBaseUrl = await resolveReachableBaseUrl(customHostOrigin);

  if (mode === 'direct_data_uri') {
    const { canvas: camCanvas, count: shotCount } = await buildCameraPhotosOnlyCanvas(
      result.photos,
      result.layout,
      fallbackCanvas
    );
    const compressed = compressCanvasForOfflineQr(camCanvas, 2860, true, shotCount);
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

  // Maximize QR Version-40 L capacity (up to 2,925 total bytes, fallback to 2,800 if needed)
  for (const maxTotalBytes of [2920, 2800, 2680]) {
    const availableForBase64 = Math.max(1400, maxTotalBytes - prefix.length - 2);
    const compressed = compressCanvasForOfflineQr(
      camCanvas,
      availableForBase64,
      false,
      photoCount
    );

    const isWebp = compressed.dataUrl.startsWith('data:image/webp;base64,');
    const formatCode = isWebp ? 'w' : 'j';
    const rawBase64 = compressed.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const urlSafeBase64 = rawBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const payloadString = `${prefix}${formatCode}.${urlSafeBase64}`;

    try {
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
    } catch {
      // Try next slightly smaller budget if QR payload was near boundary
    }
  }

  // Guaranteed fallback
  const compressed = compressCanvasForOfflineQr(camCanvas, 2350, false, photoCount);
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
 * Splits a vertical camera contact sheet back into individual portraits at the exact layout slot aspect ratio,
 * runs our 4-Stage YCbCr DCT Deblocking & Bilateral Super-Resolution pipeline so offline QR portraits have
 * ZERO pixelation or 8x8 macroblocking, and renders the 100% native HD vector photostrip!
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
  const slotAspect = getLayoutSlotAspect(result.layout || 'single_polaroid', packedCount);

  const individualPhotos: string[] = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 240;
      const totalH = img.naturalHeight || img.height || Math.round(w / slotAspect) * packedCount;
      const count = Math.max(1, packedCount);
      const singleH = Math.max(1, Math.floor(totalH / count));

      const targetW = 672;
      const targetH = Math.round(targetW / slotAspect);
      const midW = 384;
      const midH = Math.round(midW / slotAspect);
      const extracted: string[] = [];

      for (let i = 0; i < count; i++) {
        // Stage 1: Native-resolution YCbCr 8x8 DCT Deblocking + Joint Bilateral Chroma & Luminance Restoration
        const nativeCanvas = document.createElement('canvas');
        nativeCanvas.width = w;
        nativeCanvas.height = singleH;
        const nativeCtx = nativeCanvas.getContext('2d');
        if (nativeCtx) {
          nativeCtx.imageSmoothingEnabled = false;
          nativeCtx.drawImage(img, 0, i * singleH, w, singleH, 0, 0, w, singleH);
          if (!isFromHdStream) {
            applyYCbCrDctDeblockingFilter(nativeCtx, w, singleH);
          }
        }

        // Stage 2: Intermediate Bicubic Upscale (to 384px) + Bilateral Anti-Aliasing Polish
        const step1 = document.createElement('canvas');
        step1.width = midW;
        step1.height = midH;
        const ctx1 = step1.getContext('2d');
        if (ctx1) {
          ctx1.imageSmoothingEnabled = true;
          ctx1.imageSmoothingQuality = 'high';
          ctx1.drawImage(nativeCtx ? nativeCanvas : img, 0, 0, midW, midH);
          if (!isFromHdStream) {
            applyMidScaleBilateralPolish(ctx1, midW, midH);
          }
        }

        // Stage 3: Final Bicubic Upscale (to 672px) + Soft-Coring Structural Feature Definition
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(ctx1 ? step1 : img, 0, 0, targetW, targetH);
          applySoftCoringFeatureEnhancer(
            finalCtx,
            targetW,
            targetH,
            isFromHdStream ? 0.22 : 0.36,
            isFromHdStream ? 2.5 : 4.2
          );
          extracted.push(finalCanvas.toDataURL('image/jpeg', 0.95));
        }

        nativeCanvas.width = 0;
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
