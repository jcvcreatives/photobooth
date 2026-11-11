/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 60fps GPU-Accelerated Canvas Confetti Engine
 * Renders a joyful mix of:
 *  - 3D Tumbling Paper Squares ('square')
 *  - Fluttering Paper Rectangles ('rect')
 *  - Twirling Corkscrew Party Streamers / Ribbons ('twirl')
 *  - Festive 5-Point Stars ('star')
 *  - Polka-Dot Confetti Circles ('circle')
 */

type ConfettiShape = 'square' | 'rect' | 'twirl' | 'star' | 'circle';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  size: number;
  color: string;
  altColor: string;
  shape: ConfettiShape;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  wobbleRadius: number;
  twirlPhase: number;
  twirlSpeed: number;
  twirlLength: number;
  opacity: number;
  decay: number;
}

const FUN_PALETTE: [string, string][] = [
  ['#FF3366', '#FF7597'], // Hot Pink / Rose
  ['#FFD100', '#FFF07C'], // Sunny Gold / Lemon
  ['#00E5FF', '#80F2FF'], // Electric Cyan / Sky
  ['#00E676', '#69F0AE'], // Emerald Mint / Lime
  ['#AA00FF', '#E040FB'], // Vivid Violet / Magenta
  ['#FF6D00', '#FFAB40'], // Tangerine / Amber
  ['#2979FF', '#82B1FF'], // Royal Blue / Periwinkle
  ['#FF1744', '#FF8A80'], // Coral Red / Salmon
];

const SHAPES: ConfettiShape[] = [
  'square',
  'square',
  'rect',
  'rect',
  'twirl',
  'twirl',
  'twirl',
  'star',
  'circle',
];

function createParticle(
  originX: number,
  originY: number,
  angleRad: number,
  speed: number,
  isTopShower: boolean
): ConfettiParticle {
  const [color, altColor] = FUN_PALETTE[Math.floor(Math.random() * FUN_PALETTE.length)];
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

  return {
    x: originX,
    y: originY,
    vx: Math.cos(angleRad) * speed + (Math.random() - 0.5) * 2.5,
    vy: Math.sin(angleRad) * speed + (isTopShower ? Math.random() * 2 : 0),
    gravity: shape === 'twirl' ? 0.14 : 0.18 + Math.random() * 0.06,
    drag: shape === 'twirl' ? 0.985 : 0.982,
    size:
      shape === 'twirl'
        ? 6 + Math.random() * 4
        : shape === 'star'
        ? 9 + Math.random() * 6
        : 8 + Math.random() * 8,
    color,
    altColor,
    shape,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.14,
    tilt: Math.random() * Math.PI * 2,
    tiltSpeed: 0.08 + Math.random() * 0.14,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.05 + Math.random() * 0.07,
    wobbleRadius: 1.2 + Math.random() * 2.2,
    twirlPhase: Math.random() * Math.PI * 2,
    twirlSpeed: 0.16 + Math.random() * 0.12,
    twirlLength: 26 + Math.random() * 22,
    opacity: 1,
    decay: 0.0022 + Math.random() * 0.0025,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    const ox = Math.cos(outerAngle) * r;
    const oy = Math.sin(outerAngle) * r;
    const ix = Math.cos(innerAngle) * (r * 0.45);
    const iy = Math.sin(innerAngle) * (r * 0.45);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

export function launchFun60FpsConfetti(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.style.transform = 'translateZ(0)';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  let width = window.innerWidth;
  let height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const particles: ConfettiParticle[] = [];

  // Wave 1: Left & Right Party Cannons + Top Confetti Shower
  const spawnCannonWave = (countPerSide: number) => {
    for (let i = 0; i < countPerSide; i++) {
      // Left cannon shooting up-right
      const leftAngle = -Math.PI * (0.28 + Math.random() * 0.22);
      const leftSpeed = 12 + Math.random() * 14;
      particles.push(createParticle(width * 0.06, height * 0.72, leftAngle, leftSpeed, false));

      // Right cannon shooting up-left
      const rightAngle = -Math.PI * (0.5 + Math.random() * 0.22);
      const rightSpeed = 12 + Math.random() * 14;
      particles.push(createParticle(width * 0.94, height * 0.72, rightAngle, rightSpeed, false));
    }
  };

  const spawnTopShower = (count: number) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = -20 - Math.random() * 120;
      const angle = Math.PI * (0.35 + Math.random() * 0.3);
      const speed = 2.5 + Math.random() * 5.5;
      particles.push(createParticle(x, y, angle, speed, true));
    }
  };

  // Immediate big celebration burst
  spawnCannonWave(42);
  spawnTopShower(65);

  // Secondary fun burst at 450ms
  const wave2Timer = setTimeout(() => {
    spawnCannonWave(30);
    spawnTopShower(50);
  }, 450);

  // Third joyful flutter shower at 1050ms
  const wave3Timer = setTimeout(() => {
    spawnTopShower(45);
  }, 1050);

  let rafId = 0;
  let lastTime = performance.now();
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    // Normalize delta time to 60fps (16.667ms per frame) for locked 60fps physics
    const dt = Math.min(2.2, Math.max(0.5, (now - lastTime) / 16.667));
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    let aliveCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0.02 || p.y > height + 80) continue;
      aliveCount++;

      // Physics update (60fps normalized)
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
      p.wobble += p.wobbleSpeed * dt;
      p.x += (p.vx + Math.sin(p.wobble) * p.wobbleRadius) * dt;
      p.y += p.vy * dt;

      p.rotation += p.rotationSpeed * dt;
      p.tilt += p.tiltSpeed * dt;
      p.twirlPhase += p.twirlSpeed * dt;

      if (p.y > height * 0.65) {
        p.opacity -= p.decay * 1.8 * dt;
      } else {
        p.opacity -= p.decay * 0.35 * dt;
      }

      const flipScaleY = Math.cos(p.tilt);
      const isBackside = flipScaleY < 0;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'square') {
        // 3D tumbling paper square
        ctx.scale(1, Math.max(0.18, Math.abs(flipScaleY)));
        ctx.fillStyle = isBackside ? p.altColor : p.color;
        const half = p.size * 0.55;
        ctx.fillRect(-half, -half, p.size * 1.1, p.size * 1.1);
      } else if (p.shape === 'rect') {
        // 3D fluttering paper rectangle strip
        ctx.scale(1, Math.max(0.15, Math.abs(flipScaleY)));
        ctx.fillStyle = isBackside ? p.altColor : p.color;
        const w = p.size * 1.45;
        const h = p.size * 0.68;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      } else if (p.shape === 'twirl') {
        // Twirling corkscrew ribbon streamer
        const segments = 7;
        const segLen = p.twirlLength / segments;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let s = 0; s < segments; s++) {
          const t0 = s / segments;
          const t1 = (s + 1) / segments;
          const y0 = (t0 - 0.5) * p.twirlLength;
          const y1 = (t1 - 0.5) * p.twirlLength;
          const phase0 = p.twirlPhase + s * 0.95;
          const phase1 = p.twirlPhase + (s + 1) * 0.95;
          const x0 = Math.sin(phase0) * p.size;
          const x1 = Math.sin(phase1) * p.size;

          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = Math.cos(phase0) >= 0 ? p.color : p.altColor;
          ctx.lineWidth = Math.max(2.2, p.size * 0.48 * (0.55 + 0.45 * Math.abs(Math.cos(phase0))));
          ctx.stroke();
        }
      } else if (p.shape === 'star') {
        ctx.scale(1, Math.max(0.25, Math.abs(flipScaleY)));
        ctx.fillStyle = isBackside ? p.altColor : p.color;
        drawStar(ctx, p.size * 0.7);
      } else {
        // Polka-dot circle confetti
        ctx.scale(1, Math.max(0.22, Math.abs(flipScaleY)));
        ctx.fillStyle = isBackside ? p.altColor : p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (aliveCount > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      cleanup();
    }
  };

  const cleanup = () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(wave2Timer);
    clearTimeout(wave3Timer);
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.remove();
  };

  rafId = requestAnimationFrame(tick);
  return cleanup;
}
