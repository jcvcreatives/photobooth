/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FunCameraFilterId =
  | 'none'
  | 'baby_body'
  | 'alien_head'
  | 'muscle_body'
  | 'astronaut'
  | 'royal_king'
  | 'big_head'
  | 'tiny_pinch'
  | 'cyber_visor';

export interface FunCameraFilterMeta {
  id: FunCameraFilterId;
  name: string;
  shortLabel: string;
  emoji: string;
  description: string;
  hasWarp: boolean;
  hasOverlay: boolean;
  guideText?: string;
}

export const FUN_CAMERA_FILTERS: FunCameraFilterMeta[] = [
  {
    id: 'none',
    name: 'Normal Camera',
    shortLabel: 'Normal',
    emoji: '📸',
    description: 'Standard studio camera with no warp or body prop',
    hasWarp: false,
    hasOverlay: false,
  },
  {
    id: 'baby_body',
    name: 'Baby Body',
    shortLabel: 'Baby Body',
    emoji: '👶',
    description: 'Big baby head with cute tiny diaper body, bib & milk bottle',
    hasWarp: true,
    hasOverlay: true,
    guideText: 'Place your face inside the circle above the baby body!',
  },
  {
    id: 'alien_head',
    name: 'Alien Head',
    shortLabel: 'Alien Head',
    emoji: '👽',
    description: 'Warped extraterrestrial cranium, antennae, alien eyes & UFO',
    hasWarp: true,
    hasOverlay: true,
    guideText: 'Center your face for the Alien Head warp!',
  },
  {
    id: 'muscle_body',
    name: 'Muscle Champ',
    shortLabel: 'Muscle Body',
    emoji: '💪',
    description: 'Giant flexing bodybuilder torso, champion belt & 1000kg weights',
    hasWarp: false,
    hasOverlay: true,
    guideText: 'Place your head above the flexing muscle body!',
  },
  {
    id: 'astronaut',
    name: 'Space Suit',
    shortLabel: 'Astronaut',
    emoji: '👨‍🚀',
    description: 'Space helmet visor, astronaut suit & floating planets',
    hasWarp: false,
    hasOverlay: true,
    guideText: 'Place your face inside the astronaut helmet!',
  },
  {
    id: 'royal_king',
    name: 'Royal Majesty',
    shortLabel: 'Royal Crown',
    emoji: '👑',
    description: 'Jeweled gold crown, royal cape & golden scepter',
    hasWarp: false,
    hasOverlay: true,
    guideText: 'Fit your head under the Royal Crown!',
  },
  {
    id: 'big_head',
    name: 'Balloon Head',
    shortLabel: 'Big Head',
    emoji: '🤯',
    description: 'Hilarious fisheye big-head balloon warp',
    hasWarp: true,
    hasOverlay: false,
    guideText: 'Center your face for Big Head mode!',
  },
  {
    id: 'tiny_pinch',
    name: 'Tiny Face Pinch',
    shortLabel: 'Tiny Face',
    emoji: '🐿️',
    description: 'Squeezed miniature chipmunk face warp',
    hasWarp: true,
    hasOverlay: false,
    guideText: 'Center your face for Tiny Pinch mode!',
  },
  {
    id: 'cyber_visor',
    name: 'Cyber Mecha',
    shortLabel: 'Cyber Bot',
    emoji: '🤖',
    description: 'Futuristic robot armor, HUD visor & power core',
    hasWarp: false,
    hasOverlay: true,
    guideText: 'Align your face with the Cyber Visor!',
  },
];

export interface FunFilterTransformOptions {
  /** Horizontal center offset in normalized range (-0.35 to +0.35, default 0) */
  offsetX?: number;
  /** Vertical center offset in normalized range (-0.35 to +0.35, default 0) */
  offsetY?: number;
  /** Prop / warp scale multiplier (0.65 to 1.45, default 1.0) */
  scale?: number;
  /** Whether to draw the subtle face-positioning guide ring (true on live preview, false on final snapshot) */
  showGuide?: boolean;
}

// Cached LUTs for 60fps real-time pixel warping
const lutCache = new Map<string, Int32Array>();

function getOrCreateWarpLut(
  width: number,
  height: number,
  filterId: FunCameraFilterId,
  offsetX: number,
  offsetY: number,
  scale: number
): Int32Array {
  const key = `${width}x${height}_${filterId}_${offsetX.toFixed(2)}_${offsetY.toFixed(2)}_${scale.toFixed(2)}`;
  const existing = lutCache.get(key);
  if (existing) return existing;

  // Keep cache bounded
  if (lutCache.size > 24) {
    const firstKey = lutCache.keys().next().value;
    if (firstKey) lutCache.delete(firstKey);
  }

  const lut = new Int32Array(width * height);
  const minDim = Math.min(width, height);

  // Default face anchor center
  const baseAnchorY =
    filterId === 'baby_body' ? 0.34 : filterId === 'alien_head' ? 0.44 : 0.46;
  const cx = width * (0.5 + offsetX);
  const cy = height * (baseAnchorY + offsetY);

  const radius = minDim * 0.42 * scale;
  const radiusSq = radius * radius;

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      let srcX = x;
      let srcY = y;

      if (filterId === 'big_head' || filterId === 'baby_body') {
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const norm = dist / radius; // 0..1
          // Smooth spherical bulge: strength > 0 magnifies the center (big head)
          const strength = filterId === 'baby_body' ? 0.36 : 0.54;
          const factor = 1 - strength * Math.pow(1 - norm * norm, 1.6);
          srcX = Math.round(cx + dx * factor);
          srcY = Math.round(cy + dy * factor);
        }
      } else if (filterId === 'tiny_pinch') {
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const norm = dist / radius; // 0..1
          // Smooth inward pinch: samples further out to shrink the center features
          const factor = 1 + 0.85 * Math.pow(1 - norm, 1.7);
          srcX = Math.round(cx + dx * factor);
          srcY = Math.round(cy + dy * factor);
        }
      } else if (filterId === 'alien_head') {
        // Extraterrestrial pear-shaped cranium warp:
        // Upper head (dy < 0) bulges wide & tall; lower jaw/chin (dy > 0) pinches narrow
        const normX = dx / (radius * 1.15);
        const normY = dy / (radius * 1.25);
        const ellipSq = normX * normX + normY * normY;
        if (ellipSq < 1.0) {
          const falloff = Math.pow(1 - ellipSq, 1.5);
          if (dy < 0) {
            // Expand upper cranium & forehead
            const expandX = 1 - 0.42 * falloff * (-normY);
            const expandY = 1 - 0.32 * falloff;
            srcX = Math.round(cx + dx * expandX);
            srcY = Math.round(cy + dy * expandY);
          } else {
            // Pinch lower jaw & chin into a pointed alien chin
            const pinchX = 1 + 0.68 * falloff * normY;
            const pinchY = 1 - 0.12 * falloff;
            srcX = Math.round(cx + dx * pinchX);
            srcY = Math.round(cy + dy * pinchY);
          }
        }
      }

      if (srcX < 0) srcX = 0;
      else if (srcX >= width) srcX = width - 1;
      if (srcY < 0) srcY = 0;
      else if (srcY >= height) srcY = height - 1;

      lut[rowOffset + x] = srcY * width + srcX;
    }
  }

  lutCache.set(key, lut);
  return lut;
}

// Reusable offscreen buffer for pixel warping so we never allocate per frame
let offscreenWarpCanvas: HTMLCanvasElement | null = null;

/**
 * Applies the selected Fun Camera Filter (both real-time 2D pixel warp AND character body/head artwork)
 * onto the target 2D canvas context.
 */
export function applyFunCameraFilterToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterId: FunCameraFilterId,
  options: FunFilterTransformOptions = {}
): void {
  if (filterId === 'none') return;

  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const scale = options.scale ?? 1.0;
  const showGuide = options.showGuide ?? false;

  const meta = FUN_CAMERA_FILTERS.find((f) => f.id === filterId);
  if (!meta) return;

  // 1. Apply 60fps LUT pixel warp if this filter has a geometric face/head distortion
  if (meta.hasWarp) {
    try {
      const srcImgData = ctx.getImageData(0, 0, width, height);
      if (!offscreenWarpCanvas) {
        offscreenWarpCanvas = document.createElement('canvas');
      }
      if (offscreenWarpCanvas.width !== width || offscreenWarpCanvas.height !== height) {
        offscreenWarpCanvas.width = width;
        offscreenWarpCanvas.height = height;
      }
      const dstImgData = ctx.createImageData(width, height);
      const src32 = new Uint32Array(srcImgData.data.buffer);
      const dst32 = new Uint32Array(dstImgData.data.buffer);
      const lut = getOrCreateWarpLut(width, height, filterId, offsetX, offsetY, scale);
      const len = dst32.length;

      for (let i = 0; i < len; i++) {
        dst32[i] = src32[lut[i]];
      }

      // Subtle Martian tint inside the alien head zone
      if (filterId === 'alien_head') {
        const d = dstImgData.data;
        const cx = width * (0.5 + offsetX);
        const cy = height * (0.44 + offsetY);
        const r = Math.min(width, height) * 0.42 * scale;
        const rSq = r * r;

        for (let y = 0; y < height; y += 1) {
          const dy = y - cy;
          const row = y * width;
          for (let x = 0; x < width; x += 1) {
            const dx = x - cx;
            const distSq = dx * dx + dy * dy;
            if (distSq < rSq) {
              const idx = (row + x) * 4;
              const blend = (1 - distSq / rSq) * 0.28;
              d[idx] = Math.round(d[idx] * (1 - blend) + 90 * blend);
              d[idx + 1] = Math.min(255, Math.round(d[idx + 1] * (1 + blend * 0.45)));
              d[idx + 2] = Math.round(d[idx + 2] * (1 - blend * 0.2) + 140 * blend);
            }
          }
        }
      }

      ctx.putImageData(dstImgData, 0, 0);
    } catch {
      // Ignore security/tainted canvas fallback
    }
  }

  // 2. Draw Character Body / Head / Prop Artwork Overlay
  if (meta.hasOverlay) {
    drawCharacterFilterArtwork(ctx, width, height, filterId, offsetX, offsetY, scale);
  }

  // 3. Optional subtle live viewfinder alignment ring so guests know where to place their face
  if (showGuide) {
    drawFaceAlignmentGuide(ctx, width, height, filterId, offsetX, offsetY, scale);
  }
}

function drawFaceAlignmentGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterId: FunCameraFilterId,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const minDim = Math.min(width, height);
  const anchorY =
    filterId === 'baby_body'
      ? 0.33
      : filterId === 'muscle_body'
      ? 0.31
      : filterId === 'astronaut'
      ? 0.38
      : filterId === 'royal_king'
      ? 0.42
      : 0.44;

  const cx = width * (0.5 + offsetX);
  const cy = height * (anchorY + offsetY);
  const rx = minDim * 0.19 * scale;
  const ry = minDim * 0.23 * scale;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = Math.max(2, minDim * 0.004);
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * High-contrast, comic-studio vector artwork for each character filter.
 * Uses bold black outlines and bright solid shading so it looks awesome in Digital Color
 * AND prints with 100% clarity on 58mm/80mm Thermal Receipt paper!
 */
function drawCharacterFilterArtwork(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterId: FunCameraFilterId,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const minDim = Math.min(width, height);
  const s = (minDim / 600) * scale;
  const cx = width * (0.5 + offsetX);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (filterId === 'baby_body') {
    const headCy = height * (0.33 + offsetY);
    const neckY = headCy + 118 * s;

    // 1. Cute Baby Bonnet & Curly Hair Tuft at top of head
    const crownY = headCy - 125 * s;
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3, 5 * s);

    // Scalloped baby bonnet frill arch over top of head
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(cx, headCy - 10 * s, 142 * s, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.arc(cx, headCy - 10 * s, 118 * s, Math.PI * 1.88, Math.PI * 1.12, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute curly baby hair lock in center of forehead
    ctx.beginPath();
    ctx.moveTo(cx, crownY + 12 * s);
    ctx.bezierCurveTo(
      cx + 28 * s,
      crownY - 20 * s,
      cx - 26 * s,
      crownY - 26 * s,
      cx - 6 * s,
      crownY + 4 * s
    );
    ctx.stroke();

    // Safety pin decoration on bonnet
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(cx + 95 * s, crownY + 25 * s, 34 * s, 14 * s, 7 * s);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Tiny Chubby Baby Body below the real chin!
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // Chubby baby shoulders & torso (pastel onesie)
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(cx - 68 * s, neckY);
    ctx.bezierCurveTo(
      cx - 115 * s,
      neckY + 20 * s,
      cx - 105 * s,
      neckY + 145 * s,
      cx - 72 * s,
      neckY + 175 * s
    );
    ctx.lineTo(cx + 72 * s, neckY + 175 * s);
    ctx.bezierCurveTo(
      cx + 105 * s,
      neckY + 145 * s,
      cx + 115 * s,
      neckY + 20 * s,
      cx + 68 * s,
      neckY
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left Chubby Baby Arm holding a Milk Bottle
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(
      cx - 112 * s,
      neckY + 68 * s,
      46 * s,
      26 * s,
      -0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // Milk Bottle in left hand
    ctx.save();
    ctx.translate(cx - 154 * s, neckY + 36 * s);
    ctx.rotate(-0.28);
    // Bottle body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-22 * s, -15 * s, 44 * s, 76 * s, 12 * s);
    ctx.fill();
    ctx.stroke();
    // Measurement lines on milk bottle
    ctx.lineWidth = Math.max(2, 3 * s);
    for (let m = 0; m < 3; m++) {
      const my = 4 * s + m * 16 * s;
      ctx.beginPath();
      ctx.moveTo(-8 * s, my);
      ctx.lineTo(10 * s, my);
      ctx.stroke();
    }
    // Bottle collar
    ctx.lineWidth = Math.max(3, 4.5 * s);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-25 * s, -27 * s, 50 * s, 14 * s, 6 * s);
    ctx.fill();
    ctx.stroke();
    // Bottle nipple
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-12 * s, -27 * s);
    ctx.quadraticCurveTo(0, -56 * s, 12 * s, -27 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Chubby Baby Arm holding a Baby Rattle
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(
      cx + 112 * s,
      neckY + 68 * s,
      46 * s,
      26 * s,
      0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // Baby Rattle in right hand
    ctx.save();
    ctx.translate(cx + 155 * s, neckY + 32 * s);
    ctx.rotate(0.32);
    // Rattle handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-7 * s, 0, 14 * s, 55 * s, 6 * s);
    ctx.fill();
    ctx.stroke();
    // Rattle head
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -16 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Star inside rattle
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(24 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, -15 * s);
    ctx.restore();

    // Big White Baby Bib right under the chin ("BABY BOSS")
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, neckY + 26 * s, 74 * s, -0.15 * Math.PI, 1.15 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner dashed stitch line on bib
    ctx.save();
    ctx.setLineDash([6 * s, 5 * s]);
    ctx.lineWidth = Math.max(1.5, 2.5 * s);
    ctx.beginPath();
    ctx.arc(cx, neckY + 26 * s, 63 * s, 0.05 * Math.PI, 0.95 * Math.PI, false);
    ctx.stroke();
    ctx.restore();

    // "BABY BOSS" text on bib
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(21 * s)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BABY BOSS', cx, neckY + 55 * s);
    ctx.font = `800 ${Math.round(14 * s)}px monospace`;
    ctx.fillText('♥ 100% CUTIE ♥', cx, neckY + 76 * s);

    // Puffy White Diaper with Giant Safety Pins
    const diaperY = neckY + 140 * s;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 86 * s, diaperY);
    ctx.quadraticCurveTo(cx, diaperY + 12 * s, cx + 86 * s, diaperY);
    ctx.bezierCurveTo(
      cx + 104 * s,
      diaperY + 56 * s,
      cx + 58 * s,
      diaperY + 95 * s,
      cx,
      diaperY + 92 * s
    );
    ctx.bezierCurveTo(
      cx - 58 * s,
      diaperY + 95 * s,
      cx - 104 * s,
      diaperY + 56 * s,
      cx - 86 * s,
      diaperY
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Diaper safety pins (Left & Right)
    [-56, 56].forEach((pinOffsetX) => {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(cx + (pinOffsetX - 18) * s, diaperY + 18 * s, 36 * s, 14 * s, 7 * s);
      ctx.fill();
      ctx.stroke();
    });

    // Chubby Kicking Baby Legs & Booties at bottom
    [-58, 58].forEach((legOffsetX, idx) => {
      const dir = idx === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(cx + legOffsetX * s, diaperY + 86 * s);
      ctx.rotate(dir * 0.25);
      // Chubby leg
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(0, 18 * s, 28 * s, 36 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Cute baby bootie sock
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(dir * 8 * s, 46 * s, 30 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  } else if (filterId === 'alien_head') {
    const headCy = height * (0.44 + offsetY);
    const topY = headCy - 155 * s;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // 1. Two Springy Martian Antennae on top of the Alien Cranium
    [-68, 68].forEach((antX, idx) => {
      const dir = idx === 0 ? -1 : 1;
      const baseX = cx + antX * s;
      const baseY = topY + 24 * s;
      const tipX = cx + (antX + dir * 38) * s;
      const tipY = topY - 58 * s;

      // Antenna stalk
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + dir * 40 * s, baseY - 40 * s, tipX, tipY);
      ctx.stroke();

      // Glowing Alien Orb at tip
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 20 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Specular highlight inside orb
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tipX - 6 * s, tipY - 6 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Classic Giant Slanted Almond Alien Eyes (semi-translucent with starlight glare)
    [-66, 66].forEach((eyeOffsetX, idx) => {
      const dir = idx === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(cx + eyeOffsetX * s, headCy - 12 * s);
      ctx.rotate(dir * 0.28);

      ctx.fillStyle = 'rgba(10, 15, 20, 0.86)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 52 * s, 32 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy white starlight reflections
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-16 * s, -10 * s, 14 * s, 8 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18 * s, 8 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 3. Forehead Cosmic Third-Eye / Galactic Emblem
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(cx, headCy - 95 * s);
    ctx.lineTo(cx + 18 * s, headCy - 72 * s);
    ctx.lineTo(cx, headCy - 49 * s);
    ctx.lineTo(cx - 18 * s, headCy - 72 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Hovering Mini UFO Flying Saucer in top corner
    const ufoX = cx + 185 * s;
    const ufoY = topY - 10 * s;
    ctx.save();
    ctx.translate(ufoX, ufoY);
    ctx.rotate(0.15);
    // Tractor beam rays
    ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
    ctx.beginPath();
    ctx.moveTo(-24 * s, 12 * s);
    ctx.lineTo(-56 * s, 95 * s);
    ctx.lineTo(56 * s, 95 * s);
    ctx.lineTo(24 * s, 12 * s);
    ctx.closePath();
    ctx.fill();
    // UFO glass dome
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(0, -4 * s, 28 * s, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // UFO metallic saucer disc
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, 4 * s, 54 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Galactic Alien Collar at bottom
    const collarY = headCy + 148 * s;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx - 135 * s, collarY + 55 * s);
    ctx.lineTo(cx - 75 * s, collarY - 10 * s);
    ctx.lineTo(cx, collarY + 22 * s);
    ctx.lineTo(cx + 75 * s, collarY - 10 * s);
    ctx.lineTo(cx + 135 * s, collarY + 55 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = `900 ${Math.round(18 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('★ AREA 51 VIP ★', cx, collarY + 44 * s);

    ctx.restore();
  } else if (filterId === 'muscle_body') {
    const headCy = height * (0.31 + offsetY);
    const neckY = headCy + 115 * s;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // 1. Champion Sweatband across forehead
    const bandY = headCy - 105 * s;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(cx - 102 * s, bandY, 204 * s, 28 * s, 12 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(15 * s)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ BEAST MODE ★', cx, bandY + 14 * s);

    // 2. Giant Muscular Bodybuilder Torso & Double-Biceps Pose
    ctx.fillStyle = '#fbbf24';
    // Main V-taper muscular chest & lats
    ctx.beginPath();
    ctx.moveTo(cx - 115 * s, neckY);
    ctx.lineTo(cx + 115 * s, neckY);
    ctx.bezierCurveTo(
      cx + 145 * s,
      neckY + 50 * s,
      cx + 100 * s,
      neckY + 150 * s,
      cx + 78 * s,
      neckY + 210 * s
    );
    ctx.lineTo(cx - 78 * s, neckY + 210 * s);
    ctx.bezierCurveTo(
      cx - 100 * s,
      neckY + 150 * s,
      cx - 145 * s,
      neckY + 50 * s,
      cx - 115 * s,
      neckY
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left & Right Huge Flexing Biceps & Forearms
    [-1, 1].forEach((dir) => {
      ctx.fillStyle = '#fbbf24';
      // Shoulder deltoid
      ctx.beginPath();
      ctx.arc(cx + dir * 126 * s, neckY + 28 * s, 42 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Peak bicep bulge
      ctx.beginPath();
      ctx.arc(cx + dir * 175 * s, neckY + 18 * s, 44 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Forearm raised vertically
      ctx.beginPath();
      ctx.ellipse(
        cx + dir * 212 * s,
        neckY - 32 * s,
        28 * s,
        48 * s,
        dir * -0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();

      // Heavy 1000KG Dumbbell in each hand
      const handX = cx + dir * 216 * s;
      const handY = neckY - 82 * s;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(handX - 42 * s, handY - 12 * s, 84 * s, 24 * s, 6 * s);
      ctx.fill();
      ctx.stroke();

      // Weight plates
      [-38, 24].forEach((wx) => {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(handX + wx * s, handY - 28 * s, 16 * s, 56 * s, 5 * s);
        ctx.fill();
        ctx.stroke();
      });
    });

    // Sculpted Pecs & 6-Pack Abs Comic Lines
    ctx.beginPath();
    // Pecs
    ctx.moveTo(cx - 88 * s, neckY + 58 * s);
    ctx.quadraticCurveTo(cx - 42 * s, neckY + 86 * s, cx - 4 * s, neckY + 58 * s);
    ctx.moveTo(cx + 88 * s, neckY + 58 * s);
    ctx.quadraticCurveTo(cx + 42 * s, neckY + 86 * s, cx + 4 * s, neckY + 58 * s);
    // Center ab line
    ctx.moveTo(cx, neckY + 58 * s);
    ctx.lineTo(cx, neckY + 175 * s);
    // 6-pack horizontal ridges
    [95, 125, 152].forEach((ay) => {
      ctx.moveTo(cx - 46 * s, neckY + ay * s);
      ctx.lineTo(cx + 46 * s, neckY + ay * s);
    });
    ctx.stroke();

    // Golden World Champion Belt around waist
    const beltY = neckY + 175 * s;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(cx - 86 * s, beltY, 172 * s, 48 * s, 10 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(cx, beltY + 24 * s, 54 * s, 26 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(15 * s)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAMPION', cx, beltY + 24 * s);

    ctx.restore();
  } else if (filterId === 'astronaut') {
    const headCy = height * (0.38 + offsetY);
    const helmetR = 148 * s;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // 1. Outer Astronaut Space Helmet Ring (leaves face cutout clear in center)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, headCy, helmetR, 0, Math.PI * 2, false);
    ctx.arc(cx, headCy, helmetR - 28 * s, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Helmet ear comms pods
    [-1, 1].forEach((dir) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(
        cx + (dir === -1 ? -helmetR - 18 * s : helmetR - 4 * s),
        headCy - 32 * s,
        22 * s,
        64 * s,
        8 * s
      );
      ctx.fill();
      ctx.stroke();
    });

    // Curved glass visor reflection highlight
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = Math.max(4, 7 * s);
    ctx.beginPath();
    ctx.arc(cx, headCy, helmetR - 46 * s, Math.PI * 1.15, Math.PI * 1.42);
    ctx.stroke();
    ctx.restore();

    // 2. Astronaut Spacesuit Torso below helmet
    const suitY = headCy + helmetR - 12 * s;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx - 140 * s, suitY, 280 * s, 185 * s, 38 * s);
    ctx.fill();
    ctx.stroke();

    // Metallic neck ring
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(cx - 92 * s, suitY - 10 * s, 184 * s, 24 * s, 10 * s);
    ctx.fill();
    ctx.stroke();

    // Chest Control Pack
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(cx - 68 * s, suitY + 34 * s, 136 * s, 88 * s, 12 * s);
    ctx.fill();
    ctx.stroke();

    // Mission Badge & Buttons
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(cx - 34 * s, suitY + 64 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(cx + 8 * s, suitY + 50 * s, 42 * s, 22 * s, 5 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(14 * s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SPACE CREW', cx, suitY + 104 * s);

    ctx.restore();
  } else if (filterId === 'royal_king') {
    const headCy = height * (0.42 + offsetY);
    const crownY = headCy - 120 * s;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // 1. Grand Jeweled Golden Crown on top of head
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 110 * s, crownY + 15 * s);
    ctx.lineTo(cx - 122 * s, crownY - 68 * s);
    ctx.lineTo(cx - 60 * s, crownY - 22 * s);
    ctx.lineTo(cx, crownY - 88 * s);
    ctx.lineTo(cx + 60 * s, crownY - 22 * s);
    ctx.lineTo(cx + 122 * s, crownY - 68 * s);
    ctx.lineTo(cx + 110 * s, crownY + 15 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crown jewels
    [
      { x: 0, y: -32, color: '#e11d48', r: 14 },
      { x: -64, y: -6, color: '#0284c7', r: 10 },
      { x: 64, y: -6, color: '#16a34a', r: 10 },
    ].forEach((gem) => {
      ctx.fillStyle = gem.color;
      ctx.beginPath();
      ctx.arc(cx + gem.x * s, crownY + gem.y * s, gem.r * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 2. Royal Ermine Fur Collar & Velvet Cape below chin
    const capeY = headCy + 132 * s;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(cx - 105 * s, capeY);
    ctx.lineTo(cx + 105 * s, capeY);
    ctx.lineTo(cx + 165 * s, capeY + 160 * s);
    ctx.lineTo(cx - 165 * s, capeY + 160 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White royal ermine fur collar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx - 122 * s, capeY - 12 * s, 244 * s, 46 * s, 22 * s);
    ctx.fill();
    ctx.stroke();

    // Golden Royal Medallion
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, capeY + 38 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(20 * s)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', cx, capeY + 39 * s);

    ctx.restore();
  } else if (filterId === 'cyber_visor') {
    const headCy = height * (0.42 + offsetY);

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3.5, 5.5 * s);

    // 1. Futuristic Cyber Laser Visor Glasses across eyes
    const visorY = headCy - 24 * s;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(cx - 128 * s, visorY - 18 * s);
    ctx.lineTo(cx + 128 * s, visorY - 18 * s);
    ctx.lineTo(cx + 112 * s, visorY + 28 * s);
    ctx.lineTo(cx + 22 * s, visorY + 28 * s);
    ctx.lineTo(cx, visorY + 8 * s);
    ctx.lineTo(cx - 22 * s, visorY + 28 * s);
    ctx.lineTo(cx - 112 * s, visorY + 28 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor glare stripe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 95 * s, visorY - 10 * s);
    ctx.lineTo(cx - 45 * s, visorY - 10 * s);
    ctx.lineTo(cx - 65 * s, visorY + 18 * s);
    ctx.lineTo(cx - 105 * s, visorY + 18 * s);
    ctx.closePath();
    ctx.fill();

    // 2. Cybernetic Mecha Armor Shoulders & Glowing Power Core below chin
    const armorY = headCy + 132 * s;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(cx - 165 * s, armorY + 15 * s);
    ctx.lineTo(cx - 85 * s, armorY - 15 * s);
    ctx.lineTo(cx + 85 * s, armorY - 15 * s);
    ctx.lineTo(cx + 165 * s, armorY + 15 * s);
    ctx.lineTo(cx + 135 * s, armorY + 145 * s);
    ctx.lineTo(cx - 135 * s, armorY + 145 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Arc Reactor Core in center of chest
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, armorY + 58 * s, 38 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, armorY + 58 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}
