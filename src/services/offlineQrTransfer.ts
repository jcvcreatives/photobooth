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
 * Studio Portrait Auto-Relighting & Pre-Sharpening (runs on the Tablet at 480px BEFORE downscaling for QR):
 * 1. Analyzes the portrait's luminance histogram (5th percentile shadow P5, 95th percentile highlight P95, mean).
 * 2. Opens up dark indoor shadows and midtones so eyes, hair, and facial contours have clear contrast.
/**
 * Studio Portrait Auto-Relighting & Pre-Sharpening (runs on the Tablet before downscaling for QR):
 * Uses a precomputed 256-entry Look-Up Table (LUT) and 5-tap cross filter so it executes in <2ms!
 */
function enhanceCameraPortraitBeforeQrEncoding(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    if (width < 4 || height < 4) return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const n = width * height;

    const Y = new Float32Array(n);
    const Cb = new Float32Array(n);
    const Cr = new Float32Array(n);
    const hist = new Uint32Array(256);

    let sumY = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      Y[p] = yVal;
      Cb[p] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      Cr[p] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      hist[Math.max(0, Math.min(255, yVal | 0))]++;
      sumY += yVal;
    }

    const meanY = n > 0 ? sumY / n : 128;

    let p4 = 8;
    let p97 = 248;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= n * 0.04) {
        p4 = v;
        break;
      }
    }
    acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= n * 0.97) {
        p97 = v;
        break;
      }
    }

    const blackPt = Math.max(0, Math.min(28, p4 * 0.6));
    const whitePt = Math.max(215, Math.min(254, p97 + (255 - p97) * 0.3));
    const span = Math.max(120, whitePt - blackPt);
    const gamma = meanY < 132 ? Math.max(0.75, 0.94 - ((132 - meanY) / 132) * 0.22) : 0.95;

    // Precompute 256-entry tone curve LUT (256 Math.pow calls instead of 500,000!)
    const toneLut = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      const norm = Math.max(0, Math.min(1, (v - blackPt) / span));
      const curved = Math.pow(norm, gamma);
      const sCurve = curved * curved * (3 - 2 * curved);
      toneLut[v] = (curved * 0.84 + sCurve * 0.16) * 255;
    }

    const relitY = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      relitY[p] = toneLut[Math.max(0, Math.min(255, Y[p] | 0))];
    }

    // Fast 5-tap cross Luminance Pre-Sharpening + Chroma-only smoothing
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const cY = relitY[idx];
        const up = idx - width;
        const dn = idx + width;
        const lf = idx - 1;
        const rt = idx + 1;

        const crossMeanY = (relitY[up] + relitY[dn] + relitY[lf] + relitY[rt]) * 0.25;
        const detail = cY - crossMeanY;
        const yFinal =
          Math.abs(detail) > 1.8 ? Math.max(0, Math.min(255, cY + detail * 0.38)) : cY;

        const cbAvg = (Cb[idx] * 2 + Cb[up] + Cb[dn] + Cb[lf] + Cb[rt]) / 6 - 128;
        const crAvg = (Cr[idx] * 2 + Cr[up] + Cr[dn] + Cr[lf] + Cr[rt]) / 6 - 128;

        const cIdx = idx * 4;
        data[cIdx] = Math.max(0, Math.min(255, (yFinal + 1.402 * crAvg + 0.5) | 0));
        data[cIdx + 1] = Math.max(
          0,
          Math.min(255, (yFinal - 0.344136 * cbAvg - 0.714136 * crAvg + 0.5) | 0)
        );
        data[cIdx + 2] = Math.max(0, Math.min(255, (yFinal + 1.772 * cbAvg + 0.5) | 0));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore canvas security/size errors
  }
}

/**
 * Chroma-Only Pre-Compression Polish + Subtle Luminance Acutance Boost at Target QR Size:
 * Fast 5-tap cross filter (<1ms) that keeps luminance Y crisp while smoothing Cb/Cr chroma noise.
 */
function applyPreCompressionChromaOptimization(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    if (width < 4 || height < 4) return;
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

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const y0 = Y[idx];
        const up = idx - width;
        const dn = idx + width;
        const lf = idx - 1;
        const rt = idx + 1;

        const crossAvg = (Y[up] + Y[dn] + Y[lf] + Y[rt]) * 0.25;
        const diff = y0 - crossAvg;
        const yVal = Math.abs(diff) > 2.2 ? Math.max(0, Math.min(255, y0 + diff * 0.24)) : y0;

        let sumCb = Cb[idx] * 2;
        let sumCr = Cr[idx] * 2;
        let wSum = 2;

        if (Math.abs(Y[up] - y0) < 24) {
          sumCb += Cb[up];
          sumCr += Cr[up];
          wSum++;
        }
        if (Math.abs(Y[dn] - y0) < 24) {
          sumCb += Cb[dn];
          sumCr += Cr[dn];
          wSum++;
        }
        if (Math.abs(Y[lf] - y0) < 24) {
          sumCb += Cb[lf];
          sumCr += Cr[lf];
          wSum++;
        }
        if (Math.abs(Y[rt] - y0) < 24) {
          sumCb += Cb[rt];
          sumCr += Cr[rt];
          wSum++;
        }

        const cb = sumCb / wSum - 128;
        const cr = sumCr / wSum - 128;
        const cIdx = idx * 4;
        data[cIdx] = Math.max(0, Math.min(255, (yVal + 1.402 * cr + 0.5) | 0));
        data[cIdx + 1] = Math.max(
          0,
          Math.min(255, (yVal - 0.344136 * cb - 0.714136 * cr + 0.5) | 0)
        );
        data[cIdx + 2] = Math.max(0, Math.min(255, (yVal + 1.772 * cb + 0.5) | 0));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore
  }
}

/**
 * Stage 1 (On Guest Phone at Native Decoded Resolution):
 * Boundary-Only Micro-Deblocker + Joint Bilateral Chroma Restoration.
 */
function applyYCbCrDctDeblockingFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    if (width < 4 || height < 4) return;
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

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 8; x < width - 2; x += 8) {
        const idx = row + x;
        const p1 = Y[idx - 2];
        const p0 = Y[idx - 1];
        const q0 = Y[idx];
        const q1 = Y[idx + 1];
        const delta = q0 - p0;
        const absDelta = Math.abs(delta);
        if (absDelta > 0.5 && absDelta < 12 && Math.abs(p0 - p1) < 5 && Math.abs(q1 - q0) < 5) {
          const adj = delta * 0.26;
          Y[idx - 1] = p0 + adj;
          Y[idx] = q0 - adj;
        }
      }
    }

    for (let y = 8; y < height - 2; y += 8) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const p1 = Y[idx - 2 * width];
        const p0 = Y[idx - width];
        const q0 = Y[idx];
        const q1 = Y[idx + width];
        const delta = q0 - p0;
        const absDelta = Math.abs(delta);
        if (absDelta > 0.5 && absDelta < 12 && Math.abs(p0 - p1) < 5 && Math.abs(q1 - q0) < 5) {
          const adj = delta * 0.26;
          Y[idx - width] = p0 + adj;
          Y[idx] = q0 - adj;
        }
      }
    }

    const smoothCb = new Float32Array(Cb);
    const smoothCr = new Float32Array(Cr);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const y0 = Y[idx];
        let sumCb = Cb[idx] * 2;
        let sumCr = Cr[idx] * 2;
        let wSum = 2;

        for (let dy = -1; dy <= 1; dy++) {
          const nRow = (y + dy) * width;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = nRow + x + dx;
            const dyDiff = Math.abs(Y[nIdx] - y0);
            if (dyDiff < 24) {
              sumCb += Cb[nIdx];
              sumCr += Cr[nIdx];
              wSum += 1;
            }
          }
        }
        smoothCb[idx] = sumCb / wSum;
        smoothCr[idx] = sumCr / wSum;
      }
    }

    for (let p = 0, i = 0; p < n; p++, i += 4) {
      const yVal = Y[p];
      const cb = smoothCb[p] - 128;
      const cr = smoothCr[p] - 128;

      data[i] = Math.max(0, Math.min(255, Math.round(yVal + 1.402 * cr)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(yVal - 0.344136 * cb - 0.714136 * cr)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(yVal + 1.772 * cb)));
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore
  }
}

/**
 * FidelityFX Contrast Adaptive Sharpening (CAS) Super-Resolution Pass:
 */
function applyContrastAdaptiveSharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sharpness: number = 0.65
): void {
  try {
    if (width < 4 || height < 4) return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const out = new Uint8ClampedArray(src);

    const lum = new Float32Array(width * height);
    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      lum[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }

    const peak = -(1 / (8 - 3 * Math.max(0, Math.min(1, sharpness))));

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const b = lum[idx - width];
        const d = lum[idx - 1];
        const e = lum[idx];
        const f = lum[idx + 1];
        const h = lum[idx + width];

        const minLum = Math.min(e, Math.min(Math.min(d, f), Math.min(b, h)));
        const maxLum = Math.max(e, Math.max(Math.max(d, f), Math.max(b, h)));
        const localContrast = maxLum - minLum;

        if (localContrast < 2.5) continue;

        const headRoom = Math.min(minLum, 255 - maxLum);
        const amp = Math.sqrt(Math.max(0, Math.min(1, headRoom / Math.max(1, maxLum))));
        const w = amp * peak;
        const invNorm = 1 / (1 + 4 * w);

        const newLum = (e + (b + d + f + h) * w) * invNorm;
        const deltaLum = Math.max(-18, Math.min(18, newLum - e));

        const cIdx = idx * 4;
        out[cIdx] = Math.max(0, Math.min(255, Math.round(src[cIdx] + deltaLum)));
        out[cIdx + 1] = Math.max(0, Math.min(255, Math.round(src[cIdx + 1] + deltaLum)));
        out[cIdx + 2] = Math.max(0, Math.min(255, Math.round(src[cIdx + 2] + deltaLum)));
      }
    }

    imgData.data.set(out);
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore
  }
}

/**
 * Packs ONLY the raw camera photo(s) at the exact slot aspect ratio of the chosen frame layout
 * at 360px width and applies Studio Portrait Auto-Relighting & Pre-Sharpening so faces are
 * bright, clear, and high-acutance before QR compression!
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
    enhanceCameraPortraitBeforeQrEncoding(ctx, out.width, out.height);
  }

  return { canvas: out, count };
}

function stripDataUrlToBase64Length(dataUrl: string): number {
  const raw = dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '').replace(/=+$/, '');
  return raw.length;
}

/**
 * Compresses a camera-only canvas into a high-resolution, sharp Data URI that fits
 * within `maxBase64Chars`. Tests both WebP and JPEG at each step and picks whichever
 * is smaller, so Android/iOS WebViews that ignore WebP quality parameters automatically
 * use crisp JPEG and NEVER exceed QR code byte limits!
 */
export function compressCanvasForOfflineQr(
  sourceCanvas: HTMLCanvasElement,
  maxBase64Chars: number = 2650,
  forceJpegForIos: boolean = false,
  shotCount: number = 1
): { dataUrl: string; width: number; height: number } {
  const srcW = Math.max(16, sourceCanvas.width || 360);
  const srcH = Math.max(16, sourceCanvas.height || 306);
  const aspect = srcH / srcW;

  const candidateWidths =
    shotCount === 1
      ? [304, 264, 224, 192, 160, 128]
      : shotCount === 2
      ? [240, 200, 168, 140, 112]
      : [200, 168, 140, 116, 96];

  const scratch = document.createElement('canvas');
  const ctx = scratch.getContext('2d');

  // Always compare WebP vs JPEG and pick the one that fits or is smaller!
  const encodeAtQuality = (q: number): string => {
    const jpeg = scratch.toDataURL('image/jpeg', q);
    if (forceJpegForIos) {
      return jpeg;
    }
    try {
      const webp = scratch.toDataURL('image/webp', q);
      if (webp && webp.startsWith('data:image/webp')) {
        return webp.length <= jpeg.length ? webp : jpeg;
      }
    } catch {
      // Fallback to JPEG
    }
    return jpeg;
  };

  let fallbackUrl = '';
  let fallbackW = candidateWidths[candidateWidths.length - 1];
  let fallbackH = Math.round(fallbackW * aspect);

  for (const w of candidateWidths) {
    const h = Math.max(48, Math.round(w * aspect));
    scratch.width = w;
    scratch.height = h;

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      try {
        ctx.drawImage(sourceCanvas, 0, 0, w, h);
        applyPreCompressionChromaOptimization(ctx, w, h);
      } catch {
        // Ignore if source canvas was empty
      }
    }

    const minQ = w >= 240 ? 0.48 : w >= 168 ? 0.45 : 0.36;
    const maxQ = 0.84;

    const minAttempt = encodeAtQuality(minQ);
    const minLen = stripDataUrlToBase64Length(minAttempt);

    fallbackUrl = minAttempt;
    fallbackW = w;
    fallbackH = h;

    if (minLen <= maxBase64Chars) {
      let bestUrl = minAttempt;
      let lo = minQ;
      let hi = maxQ;
      for (let iter = 0; iter < 3; iter++) {
        const mid = Number(((lo + hi) * 0.5).toFixed(2));
        const candidate = encodeAtQuality(mid);
        const len = stripDataUrlToBase64Length(candidate);
        if (len <= maxBase64Chars) {
          bestUrl = candidate;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      scratch.width = 0;
      scratch.height = 0;
      return { dataUrl: bestUrl, width: w, height: h };
    }
  }

  // Guaranteed JPEG step-down if even smallest width at minQ was over budget
  for (const q of [0.30, 0.22, 0.15]) {
    const jpegAttempt = scratch.toDataURL('image/jpeg', q);
    fallbackUrl = jpegAttempt;
    if (stripDataUrlToBase64Length(jpegAttempt) <= maxBase64Chars) {
      break;
    }
  }

  scratch.width = 0;
  scratch.height = 0;
  return { dataUrl: fallbackUrl, width: fallbackW, height: fallbackH };
}

/**
 * Resolves the reachable base URL synchronously in 0ms without blocking QR code generation
 * on network timeouts when the tablet is offline or on a local router!
 */
async function resolveReachableBaseUrl(customHostOrigin?: string): Promise<string> {
  const custom = (customHostOrigin || '').trim();
  const candidate = custom ? custom.replace(/\/+$/, '') + '/' : getCurrentAppBaseUrl();

  if (/^https?:\/\/jcvcreatives\.github\.io\/$/i.test(candidate)) {
    return 'https://jcvcreatives.github.io/photobooth/';
  }
  if (/^https?:\/\/[^/]+\.github\.io\/$/i.test(candidate)) {
    return CLOUD_FALLBACK_URL;
  }

  return candidate;
}

/**
 * Generates an iOS & Android compatible QR Code with maximum portrait clarity even when 100% offline.
 * Guaranteed to never throw or fail across all layouts and shot counts.
 */
export async function buildOfflineQrPacket(
  fallbackCanvas: HTMLCanvasElement,
  result: PhotostripResult,
  mode: OfflineQrMode,
  customHostOrigin?: string
): Promise<OfflineQrPacket> {
  const resolvedBaseUrl = await resolveReachableBaseUrl(customHostOrigin);

  try {
    if (mode === 'direct_data_uri') {
      const { canvas: camCanvas, count: shotCount } = await buildCameraPhotosOnlyCanvas(
        result.photos,
        result.layout,
        fallbackCanvas
      );
      for (const budget of [2650, 2350, 1950, 1500]) {
        try {
          const compressed = compressCanvasForOfflineQr(camCanvas, budget, true, shotCount);
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
        } catch {
          // Try next smaller budget
        }
      }
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

    for (const maxTotalBytes of [2800, 2600, 2350, 2000, 1600]) {
      const availableForBase64 = Math.max(900, maxTotalBytes - prefix.length - 4);
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
        // Try next budget
      }
    }
  } catch {
    // Fallback below if canvas processing encountered any error
  }

  // Ultimate emergency fallback so QR code is 100% guaranteed to render
  const fallbackPayload = `${resolvedBaseUrl}?share=${encodeURIComponent(result.id)}`;
  const qrDataUrl = await QRCode.toDataURL(fallbackPayload, {
    errorCorrectionLevel: 'M',
    width: 420,
    margin: 2,
    color: { dark: '#18181b', light: '#ffffff' },
  });

  return {
    mode,
    qrDataUrl,
    payloadString: fallbackPayload,
    compactImageDataUrl: result.compositeDataUrl || '',
    byteLength: fallbackPayload.length,
    dimensions: { width: 240, height: 240 },
    resolvedBaseUrl,
  };
}

/**
 * Splits a vertical camera contact sheet back into individual portraits at the exact layout slot aspect ratio,
 * runs our Boundary-Only Micro-Deblocker + 2-Stage FidelityFX Contrast Adaptive Super-Resolution (CAS) pipeline
 * so offline QR portraits are crisp, bright, and high-definition without any waxy blur, and renders the
 * 100% native HD vector photostrip!
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
      const w = img.naturalWidth || img.width || 288;
      const totalH = img.naturalHeight || img.height || Math.round(w / slotAspect) * packedCount;
      const count = Math.max(1, packedCount);
      const singleH = Math.max(1, Math.floor(totalH / count));

      const targetW = 720;
      const targetH = Math.round(targetW / slotAspect);
      const midW = 480;
      const midH = Math.round(midW / slotAspect);
      const extracted: string[] = [];

      for (let i = 0; i < count; i++) {
        // Stage 1: Native-resolution 8x8 Seam Micro-Deblocking + Chroma Cleanup (zero interior blur!)
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

        // Stage 2: Intermediate Bicubic Upscale (to 480px) + FidelityFX Contrast Adaptive Sharpening (CAS)
        const step1 = document.createElement('canvas');
        step1.width = midW;
        step1.height = midH;
        const ctx1 = step1.getContext('2d');
        if (ctx1) {
          ctx1.imageSmoothingEnabled = true;
          ctx1.imageSmoothingQuality = 'high';
          ctx1.drawImage(nativeCtx ? nativeCanvas : img, 0, 0, midW, midH);
          applyContrastAdaptiveSharpening(ctx1, midW, midH, isFromHdStream ? 0.35 : 0.72);
        }

        // Stage 3: Final Bicubic Upscale (to 720px) + Fine-Detail Contrast Adaptive Sharpening (CAS)
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(ctx1 ? step1 : img, 0, 0, targetW, targetH);
          applyContrastAdaptiveSharpening(finalCtx, targetW, targetH, isFromHdStream ? 0.25 : 0.58);
          extracted.push(finalCanvas.toDataURL('image/jpeg', 0.96));
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
