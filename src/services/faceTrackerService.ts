/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DetectedFaceState {
  /** Whether a face is currently detected in the camera stream */
  detected: boolean;
  /** Normalized horizontal center of the face (0.0 = left edge, 0.5 = center, 1.0 = right edge) */
  centerX: number;
  /** Normalized vertical center of the face (0.0 = top edge, 0.5 = center, 1.0 = bottom edge) */
  centerY: number;
  /** Normalized face width relative to min(width, height) */
  faceSizeNorm: number;
  /** Computed filter scale multiplier based on how close/far the user's face is (0.7 to 1.45) */
  recommendedScale: number;
  /** Head tilt angle in degrees (-25 to +25) */
  rollAngleDeg: number;
  /** Detection engine currently active ('native_facedetector' | 'cv_tracker' | 'simulation') */
  engine: 'native_facedetector' | 'cv_tracker' | 'simulation';
  /** Confidence score (0..1) */
  confidence: number;
}

interface NativeFaceDetectorResult {
  boundingBox: DOMRectReadOnly;
  landmarks?: Array<{
    type: string;
    locations: Array<{ x: number; y: number }>;
  }>;
}

interface NativeFaceDetector {
  detect: (image: HTMLCanvasElement | HTMLVideoElement) => Promise<NativeFaceDetectorResult[]>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: {
      fastMode?: boolean;
      maxDetectedFaces?: number;
    }) => NativeFaceDetector;
  }
}

const ANALYSIS_W = 160;
const ANALYSIS_H = 120;
const REFERENCE_FACE_SIZE = 0.29; // Reference normalized face diameter for scale = 1.0

export class FaceTrackerService {
  private nativeDetector: NativeFaceDetector | null = null;
  private nativeDetectorFailed = false;
  private nativeDetectBusy = false;

  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;

  // Integral image buffers (Summed Area Tables) allocated once for zero GC overhead
  private satSkin = new Int32Array((ANALYSIS_W + 1) * (ANALYSIS_H + 1));
  private satEdge = new Int32Array((ANALYSIS_W + 1) * (ANALYSIS_H + 1));
  private prevLuma = new Uint8Array(ANALYSIS_W * ANALYSIS_H);

  // Raw target state from latest detection pass
  private targetState: DetectedFaceState = {
    detected: false,
    centerX: 0.5,
    centerY: 0.42,
    faceSizeNorm: REFERENCE_FACE_SIZE,
    recommendedScale: 1.0,
    rollAngleDeg: 0,
    engine: 'cv_tracker',
    confidence: 0,
  };

  // Smoothed 60fps interpolated state
  private smoothState: DetectedFaceState = { ...this.targetState };
  private lastDetectionTimestamp = 0;
  private missedFramesCount = 0;

  constructor() {
    if (typeof window !== 'undefined' && typeof window.FaceDetector === 'function') {
      try {
        this.nativeDetector = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 3,
        });
      } catch {
        this.nativeDetector = null;
      }
    }
  }

  private ensureAnalysisCanvas(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!this.analysisCanvas) {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCanvas.width = ANALYSIS_W;
      this.analysisCanvas.height = ANALYSIS_H;
      this.analysisCtx = this.analysisCanvas.getContext('2d', {
        willReadFrequently: true,
      });
    }
    return this.analysisCtx;
  }

  /**
   * Processes the current video/canvas frame (already mirrored & zoomed as displayed)
   * and returns the smoothly tracked 60fps face coordinates and scale.
   */
  public updateFromFrame(
    sourceCanvas: HTMLCanvasElement,
    isCameraActive: boolean
  ): DetectedFaceState {
    const now = performance.now();

    if (!isCameraActive) {
      // Gentle breathing animation in simulation mode so user can see auto-tracking working
      const t = now * 0.0018;
      this.targetState = {
        detected: true,
        centerX: 0.5 + Math.sin(t) * 0.03,
        centerY: 0.38 + Math.cos(t * 1.3) * 0.02,
        faceSizeNorm: REFERENCE_FACE_SIZE,
        recommendedScale: 1.0,
        rollAngleDeg: Math.sin(t * 0.9) * 3,
        engine: 'simulation',
        confidence: 0.98,
      };
      return this.stepSmoothing();
    }

    // Run detection every ~45ms (~22Hz) while interpolating smoothly at 60fps every frame
    if (now - this.lastDetectionTimestamp >= 45) {
      this.lastDetectionTimestamp = now;

      // 1. Try hardware-accelerated native browser FaceDetector first if supported
      if (this.nativeDetector && !this.nativeDetectorFailed && !this.nativeDetectBusy) {
        this.runNativeFaceDetector(sourceCanvas);
      }

      // 2. Always run fast 160x120 Integral-Image CV Face Detector if native detector is unavailable or failed
      if (!this.nativeDetector || this.nativeDetectorFailed) {
        this.runComputerVisionFaceDetector(sourceCanvas);
      }
    }

    return this.stepSmoothing();
  }

  private async runNativeFaceDetector(sourceCanvas: HTMLCanvasElement): Promise<void> {
    if (!this.nativeDetector) return;
    this.nativeDetectBusy = true;
    try {
      const faces = await this.nativeDetector.detect(sourceCanvas);
      const sw = sourceCanvas.width || 640;
      const sh = sourceCanvas.height || 480;
      const minDim = Math.min(sw, sh);

      if (faces && faces.length > 0) {
        // Pick the largest / most central face
        let bestFace = faces[0];
        let bestScore = -1;
        for (const f of faces) {
          const bb = f.boundingBox;
          const fcx = (bb.x + bb.width * 0.5) / sw;
          const fcy = (bb.y + bb.height * 0.5) / sh;
          const distFromCenter = Math.hypot(fcx - 0.5, fcy - 0.45);
          const areaScore = (bb.width * bb.height) / (sw * sh);
          const score = areaScore * 3.0 - distFromCenter * 0.4;
          if (score > bestScore) {
            bestScore = score;
            bestFace = f;
          }
        }

        const bb = bestFace.boundingBox;
        const normX = Math.max(0.15, Math.min(0.85, (bb.x + bb.width * 0.5) / sw));
        const normY = Math.max(0.15, Math.min(0.82, (bb.y + bb.height * 0.48) / sh));
        const sizeNorm = Math.max(0.14, Math.min(0.65, ((bb.width + bb.height) * 0.5) / minDim));

        // Calculate head roll angle if eye landmarks are provided
        let rollDeg = 0;
        if (bestFace.landmarks && bestFace.landmarks.length >= 2) {
          const eyes = bestFace.landmarks.filter((l) => l.type === 'eye' && l.locations?.[0]);
          if (eyes.length >= 2) {
            const e1 = eyes[0].locations[0];
            const e2 = eyes[1].locations[0];
            const leftEye = e1.x < e2.x ? e1 : e2;
            const rightEye = e1.x < e2.x ? e2 : e1;
            rollDeg = Math.max(
              -25,
              Math.min(
                25,
                (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI
              )
            );
          }
        }

        const scale = Math.max(0.72, Math.min(1.42, sizeNorm / REFERENCE_FACE_SIZE));

        this.missedFramesCount = 0;
        this.targetState = {
          detected: true,
          centerX: normX,
          centerY: normY,
          faceSizeNorm: sizeNorm,
          recommendedScale: scale,
          rollAngleDeg: rollDeg,
          engine: 'native_facedetector',
          confidence: 0.96,
        };
      } else {
        // Fallback to CV tracker if native FaceDetector returned empty on this frame
        this.runComputerVisionFaceDetector(sourceCanvas);
      }
    } catch {
      // Many desktop/mobile browsers expose window.FaceDetector stub that rejects; switch seamlessly to CV tracker
      this.nativeDetectorFailed = true;
      this.runComputerVisionFaceDetector(sourceCanvas);
    } finally {
      this.nativeDetectBusy = false;
    }
  }

  /**
   * O(1) Summed-Area-Table (Integral Image) Computer Vision Face Detector:
   * Combines YCbCr skin-chrominance segmentation, horizontal eye-socket/bridge contrast gradient,
   * and temporal continuity to track the user's face in < 1.2ms on any device offline.
   */
  private runComputerVisionFaceDetector(sourceCanvas: HTMLCanvasElement): void {
    const ctx = this.ensureAnalysisCanvas();
    if (!ctx) return;

    ctx.drawImage(sourceCanvas, 0, 0, ANALYSIS_W, ANALYSIS_H);
    const imgData = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H);
    const d = imgData.data;

    const stride = ANALYSIS_W + 1;
    const satSkin = this.satSkin;
    const satEdge = this.satEdge;
    const prevLuma = this.prevLuma;

    satSkin.fill(0);
    satEdge.fill(0);

    for (let y = 0; y < ANALYSIS_H; y++) {
      let rowSkinSum = 0;
      let rowEdgeSum = 0;
      const satRow = (y + 1) * stride;
      const satPrevRow = y * stride;
      const imgRow = y * ANALYSIS_W;

      for (let x = 0; x < ANALYSIS_W; x++) {
        const idx = (imgRow + x) * 4;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];

        // Luminance & YCbCr chrominance
        const yLuma = (77 * r + 150 * g + 29 * b) >> 8;
        const cb = 128 + ((-43 * r - 85 * g + 128 * b) >> 8);
        const cr = 128 + ((128 * r - 107 * g - 21 * b) >> 8);

        // Inclusive skin-tone chrominance rule across fair, medium, olive, and deep skin tones
        const isSkin =
          yLuma > 32 &&
          yLuma < 245 &&
          cb >= 76 &&
          cb <= 136 &&
          cr >= 130 &&
          cr <= 186 &&
          r > g * 0.85 &&
          r > b * 0.9;

        // Horizontal + vertical facial feature contrast (eyes, eyebrows, nostrils, mouth)
        const prevXIdx = x > 0 ? idx - 4 : idx;
        const horizDiff = Math.abs(r - d[prevXIdx]) + Math.abs(g - d[prevXIdx + 1]);
        const motionDiff = Math.abs(yLuma - prevLuma[imgRow + x]);
        prevLuma[imgRow + x] = yLuma;

        const skinScore = isSkin ? (motionDiff > 6 ? 135 : 100) : 0;
        const edgeScore = horizDiff > 24 ? 1 : 0;

        rowSkinSum += skinScore;
        rowEdgeSum += edgeScore;

        satSkin[satRow + x + 1] = satSkin[satPrevRow + x + 1] + rowSkinSum;
        satEdge[satRow + x + 1] = satEdge[satPrevRow + x + 1] + rowEdgeSum;
      }
    }

    // Helper to query rectangle sum in O(1) from Summed Area Table
    const rectSum = (sat: Int32Array, x0: number, y0: number, x1: number, y1: number): number => {
      const cx0 = Math.max(0, Math.min(ANALYSIS_W, x0));
      const cy0 = Math.max(0, Math.min(ANALYSIS_H, y0));
      const cx1 = Math.max(cx0 + 1, Math.min(ANALYSIS_W, x1));
      const cy1 = Math.max(cy0 + 1, Math.min(ANALYSIS_H, y1));
      return (
        sat[cy1 * stride + cx1] -
        sat[cy0 * stride + cx1] -
        sat[cy1 * stride + cx0] +
        sat[cy0 * stride + cx0]
      );
    };

    // Multi-scale sliding window search for the best face candidate
    const candidateRadii = [16, 20, 25, 30, 36, 42];
    let bestScore = 0;
    let bestCx = ANALYSIS_W * 0.5;
    let bestCy = ANALYSIS_H * 0.42;
    let bestR = 25;

    const prevCx = this.smoothState.centerX * ANALYSIS_W;
    const prevCy = this.smoothState.centerY * ANALYSIS_H;

    for (const r of candidateRadii) {
      const rx = r;
      const ry = Math.round(r * 1.22); // Faces are slightly taller than wide
      const area = 2 * rx * (2 * ry);
      const step = Math.max(3, Math.round(r * 0.22));

      for (let cy = ry + 4; cy <= ANALYSIS_H - ry - 4; cy += step) {
        for (let cx = rx + 6; cx <= ANALYSIS_W - rx - 6; cx += step) {
          // 1. Core face box skin density
          const faceSkin = rectSum(satSkin, cx - rx, cy - ry, cx + rx, cy + ry) / area;
          if (faceSkin < 38) continue;

          // 2. Eye-band contrast density (upper-middle horizontal band of the face)
          const eyeBandY0 = cy - Math.round(ry * 0.55);
          const eyeBandY1 = cy + Math.round(ry * 0.08);
          const eyeArea = Math.max(1, 2 * rx * (eyeBandY1 - eyeBandY0));
          const eyeEdgeDensity =
            rectSum(satEdge, cx - rx, eyeBandY0, cx + rx, eyeBandY1) / eyeArea;

          // 3. Surrounding background contrast (head should be surrounded by non-skin background at sides/top)
          const leftBgArea = Math.max(1, Math.round(rx * 0.6) * (2 * ry));
          const leftBgSkin =
            rectSum(satSkin, cx - Math.round(rx * 1.6), cy - ry, cx - rx, cy + ry) / leftBgArea;
          const rightBgSkin =
            rectSum(satSkin, cx + rx, cy - ry, cx + Math.round(rx * 1.6), cy + ry) / leftBgArea;
          const topBgArea = Math.max(1, 2 * rx * Math.round(ry * 0.5));
          const topBgSkin =
            rectSum(satSkin, cx - rx, cy - Math.round(ry * 1.5), cx + rx, cy - ry) / topBgArea;

          const bgSeparation = Math.max(0, faceSkin - (leftBgSkin + rightBgSkin + topBgSkin) / 3);

          // 4. Temporal continuity & gentle center-frame bias
          const distPrev = Math.hypot(cx - prevCx, cy - prevCy) / ANALYSIS_W;
          const temporalBonus = Math.max(0, 1 - distPrev * 2.2) * 18;
          const centerPrior =
            Math.max(
              0,
              1 - Math.hypot(cx / ANALYSIS_W - 0.5, cy / ANALYSIS_H - 0.44) * 1.3
            ) * 12;

          const totalScore =
            faceSkin * 0.65 +
            bgSeparation * 0.55 +
            eyeEdgeDensity * 55 +
            temporalBonus +
            centerPrior;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestCx = cx;
            bestCy = cy;
            bestR = r;
          }
        }
      }
    }

    if (bestScore >= 52) {
      // Refine center-of-mass within the winning face bounding box for sub-pixel precision
      const rx = bestR;
      const ry = Math.round(bestR * 1.2);
      const x0 = Math.max(0, Math.round(bestCx - rx));
      const x1 = Math.min(ANALYSIS_W - 1, Math.round(bestCx + rx));
      const y0 = Math.max(0, Math.round(bestCy - ry));
      const y1 = Math.min(ANALYSIS_H - 1, Math.round(bestCy + ry));

      let sumW = 0;
      let sumX = 0;
      let sumY = 0;

      for (let y = y0; y <= y1; y++) {
        const row = y * ANALYSIS_W;
        for (let x = x0; x <= x1; x++) {
          const idx = (row + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];
          const cb = 128 + ((-43 * r - 85 * g + 128 * b) >> 8);
          const cr = 128 + ((128 * r - 107 * g - 21 * b) >> 8);
          if (cb >= 76 && cb <= 136 && cr >= 130 && cr <= 186) {
            sumW += 1;
            sumX += x;
            sumY += y;
          }
        }
      }

      const refinedCx = sumW > 20 ? sumX / sumW : bestCx;
      const refinedCy = sumW > 20 ? sumY / sumW : bestCy;

      const normX = Math.max(0.18, Math.min(0.82, refinedCx / ANALYSIS_W));
      const normY = Math.max(0.18, Math.min(0.78, refinedCy / ANALYSIS_H));
      const sizeNorm = Math.max(0.18, Math.min(0.55, (bestR * 2.15) / ANALYSIS_H));
      const scale = Math.max(0.75, Math.min(1.38, sizeNorm / REFERENCE_FACE_SIZE));

      this.missedFramesCount = 0;
      this.targetState = {
        detected: true,
        centerX: normX,
        centerY: normY,
        faceSizeNorm: sizeNorm,
        recommendedScale: scale,
        rollAngleDeg: 0,
        engine: 'cv_tracker',
        confidence: Math.min(0.99, bestScore / 130),
      };
    } else {
      this.missedFramesCount += 1;
      // Hold last known face lock briefly (up to ~12 cycles) before gently drifting back to default center
      if (this.missedFramesCount > 12) {
        this.targetState = {
          ...this.targetState,
          detected: false,
          centerX: 0.5,
          centerY: 0.39,
          recommendedScale: 1.0,
          rollAngleDeg: 0,
          confidence: 0,
        };
      }
    }
  }

  /**
   * Advances the 60fps Exponential Moving Average (EMA) state toward the latest detected face target.
   */
  private stepSmoothing(): DetectedFaceState {
    const alphaPos = 0.24;
    const alphaScale = 0.16;
    const alphaAngle = 0.2;

    this.smoothState = {
      detected: this.targetState.detected,
      centerX:
        this.smoothState.centerX + (this.targetState.centerX - this.smoothState.centerX) * alphaPos,
      centerY:
        this.smoothState.centerY + (this.targetState.centerY - this.smoothState.centerY) * alphaPos,
      faceSizeNorm:
        this.smoothState.faceSizeNorm +
        (this.targetState.faceSizeNorm - this.smoothState.faceSizeNorm) * alphaScale,
      recommendedScale:
        this.smoothState.recommendedScale +
        (this.targetState.recommendedScale - this.smoothState.recommendedScale) * alphaScale,
      rollAngleDeg:
        this.smoothState.rollAngleDeg +
        (this.targetState.rollAngleDeg - this.smoothState.rollAngleDeg) * alphaAngle,
      engine: this.targetState.engine,
      confidence: this.targetState.confidence,
    };

    return this.smoothState;
  }

  public getCurrentState(): DetectedFaceState {
    return this.smoothState;
  }
}

export const faceTrackerService = new FaceTrackerService();
