/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Sliders,
  ZoomIn,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  X,
  Scroll,
  SunMedium,
} from 'lucide-react';
import { ThermalPrinterConfig } from '../types';
import { thermalPrinterService, PrinterDeviceStatus } from '../services/thermalPrinter';
import { soundEffects } from '../services/soundEffects';

interface ThermalPrintPreviewModalProps {
  sourceCanvas: HTMLCanvasElement;
  currentConfig: ThermalPrinterConfig;
  onConfirmPrint: (adjustedCanvas: HTMLCanvasElement, adjustedConfig: ThermalPrinterConfig) => void;
  onClose: () => void;
}

export const ThermalPrintPreviewModal: React.FC<ThermalPrintPreviewModalProps> = ({
  sourceCanvas,
  currentConfig,
  onConfirmPrint,
  onClose,
}) => {
  const [paperWidthMm, setPaperWidthMm] = useState<58 | 80>(currentConfig.paperWidthMm || 58);
  const [printCopies, setPrintCopies] = useState<number>(
    Math.max(1, Math.min(20, Math.round(Number(currentConfig.printCopies) || 1)))
  );
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [scale, setScale] = useState<number>(100);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(currentConfig.contrast ?? 50);
  const [gamma, setGamma] = useState<number>(currentConfig.gamma ?? 0.68);
  const [invertThermal, setInvertThermal] = useState(false);
  const [autoCut, setAutoCut] = useState(currentConfig.autoCut ?? true);
  const [topPadding, setTopPadding] = useState<number>(12);
  const [bottomPadding, setBottomPadding] = useState<number>(16);

  const [ditheredPreviewUrl, setDitheredPreviewUrl] = useState<string>('');
  const [energyReadout, setEnergyReadout] = useState<{
    effectiveGamma: number;
    minActivationEnergyPct: number;
    maxSaturationEnergyPct: number;
    exposureState: 'underexposed' | 'balanced' | 'overexposed';
  }>({
    effectiveGamma: currentConfig.gamma ?? 0.68,
    minActivationEnergyPct: 7,
    maxSaturationEnergyPct: 83,
    exposureState: 'balanced',
  });
  const [estimatedLengthMm, setEstimatedLengthMm] = useState<number>(150);
  const [printerStatus, setPrinterStatus] = useState<PrinterDeviceStatus>(thermalPrinterService.getStatus());
  const adjustedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return thermalPrinterService.subscribe(setPrinterStatus);
  }, []);

  useEffect(() => {
    const targetWidthDots = paperWidthMm === 80 ? 576 : 384;
    const workingCanvas = document.createElement('canvas');

    const scaleFactor = scale / 100;
    const srcRatio = sourceCanvas.height / sourceCanvas.width;
    const scaledWidth = targetWidthDots * scaleFactor;
    const scaledHeight = scaledWidth * srcRatio;

    const totalHeightDots = Math.round(scaledHeight + topPadding + bottomPadding);
    workingCanvas.width = targetWidthDots;
    workingCanvas.height = totalHeightDots % 8 === 0 ? totalHeightDots : totalHeightDots + (8 - (totalHeightDots % 8));

    const ctx = workingCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, workingCanvas.width, workingCanvas.height);

    let drawX = 0;
    if (alignment === 'left') {
      drawX = 0 + offsetX;
    } else if (alignment === 'center') {
      drawX = (targetWidthDots - scaledWidth) / 2 + offsetX;
    } else {
      drawX = targetWidthDots - scaledWidth + offsetX;
    }

    const drawY = topPadding + offsetY;
    ctx.drawImage(sourceCanvas, drawX, drawY, scaledWidth, scaledHeight);

    if (invertThermal) {
      const imgData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 255 - imgData.data[i];
        imgData.data[i + 1] = 255 - imgData.data[i + 1];
        imgData.data[i + 2] = 255 - imgData.data[i + 2];
      }
      ctx.putImageData(imgData, 0, 0);
    }

    adjustedCanvasRef.current = workingCanvas;

    const contrastMultiplier = contrast / 45;
    const dithered = thermalPrinterService.generateDitheredRaster(
      workingCanvas,
      targetWidthDots,
      contrastMultiplier,
      0,
      {
        ...currentConfig,
        gamma,
      }
    );
    setDitheredPreviewUrl(dithered.previewDataUrl);
    setEnergyReadout(dithered.energyProfile);

    const lengthMm = Math.round(workingCanvas.height / 8);
    setEstimatedLengthMm(lengthMm);
  }, [sourceCanvas, currentConfig, paperWidthMm, alignment, scale, offsetX, offsetY, contrast, gamma, invertThermal, topPadding, bottomPadding]);

  const handleConfirm = () => {
    soundEffects.playTap();
    if (!adjustedCanvasRef.current) return;

    const updatedConfig: ThermalPrinterConfig = {
      ...currentConfig,
      paperWidthMm,
      dotsPerLine: paperWidthMm === 80 ? 576 : 384,
      contrast,
      gamma,
      autoCut,
      printCopies,
    };

    onConfirmPrint(adjustedCanvasRef.current, updatedConfig);
  };

  const handleResetAdjustments = () => {
    soundEffects.playTap();
    setScale(100);
    setOffsetX(0);
    setOffsetY(0);
    setAlignment('center');
    setContrast(50);
    setGamma(0.68);
    setInvertThermal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4 text-zinc-950" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100">
                Print Alignment & Thermal Layout
              </h2>
              <p className="text-[11px] text-zinc-400">
                Adjust 58mm/80mm roll width, horizontal margins, and dithering contrast
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left Controls, Right Real-time Roll Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 flex-1 overflow-y-auto items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Paper Roll Width Selection */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-zinc-400" />
                <span>Paper Width Format</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    soundEffects.playTap();
                    setPaperWidthMm(58);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    paperWidthMm === 58
                      ? 'border-zinc-300 bg-zinc-900 text-white shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">58mm (2-inch)</div>
                    <div className="text-[10px] text-zinc-400">384 Dots / Line</div>
                  </div>
                  {paperWidthMm === 58 && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </button>

                <button
                  onClick={() => {
                    soundEffects.playTap();
                    setPaperWidthMm(80);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    paperWidthMm === 80
                      ? 'border-zinc-300 bg-zinc-900 text-white shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">80mm (3-inch)</div>
                    <div className="text-[10px] text-zinc-400">576 Dots / Line</div>
                  </div>
                  {paperWidthMm === 80 && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </button>
              </div>
            </div>

            {/* 2. Alignment Selection */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Paper Margin Alignment</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    soundEffects.playTap();
                    setAlignment('left');
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    alignment === 'left'
                      ? 'border-zinc-300 bg-zinc-900 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Left</span>
                </button>
                <button
                  onClick={() => {
                    soundEffects.playTap();
                    setAlignment('center');
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    alignment === 'center'
                      ? 'border-zinc-300 bg-zinc-900 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                  <span>Center</span>
                </button>
                <button
                  onClick={() => {
                    soundEffects.playTap();
                    setAlignment('right');
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    alignment === 'right'
                      ? 'border-zinc-300 bg-zinc-900 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                  <span>Right</span>
                </button>
              </div>
            </div>

            {/* 3. Crop, Zoom & Pan Sliders */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Image Scale</span>
                </span>
                <span className="text-xs font-mono text-zinc-400">{scale}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="140"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />

              {/* Offset X / Y */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Offset X</span>
                    <span className="font-mono">{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Offset Y</span>
                    <span className="font-mono">{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 4. Thermal Head Contrast, Gamma (γ) & Energy Mapping */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <SunMedium className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Print Head Gamma Correction (γ)</span>
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  γ = {gamma.toFixed(2)} (Eff: {energyReadout.effectiveGamma.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.45"
                max="1.35"
                step="0.02"
                value={gamma}
                onChange={(e) => setGamma(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                <span>
                  Head Energy: {energyReadout.minActivationEnergyPct}%–{energyReadout.maxSaturationEnergyPct}%
                </span>
                <span className="uppercase text-zinc-300">
                  Auto-Exposure: {energyReadout.exposureState}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <span>Midtone S-Curve Contrast</span>
                </span>
                <span className="text-xs font-mono text-zinc-400">{contrast}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={invertThermal}
                    onChange={(e) => setInvertThermal(e.target.checked)}
                    className="rounded accent-zinc-400"
                  />
                  <span>Negative Invert</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={autoCut}
                    onChange={(e) => setAutoCut(e.target.checked)}
                    className="rounded accent-zinc-400"
                  />
                  <span>Auto Paper Cut (`GS V`)</span>
                </label>
              </div>
            </div>

            {/* Quick Reset */}
            <button
              onClick={handleResetAdjustments}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Right Column: Live Simulated Thermal Roll Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
            <div className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-400 mb-2 px-1">
              <span>THERMAL STRIP MOCKUP</span>
              <span>~{estimatedLengthMm} MM</span>
            </div>

            {/* Simulated Receipt Roll slot */}
            <div className="relative p-2 rounded-xl bg-zinc-950 border border-zinc-800 max-h-[50vh] overflow-y-auto shadow-inner flex flex-col items-center">
              {ditheredPreviewUrl ? (
                <img
                  src={ditheredPreviewUrl}
                  alt="Dithered Thermal Preview"
                  className="w-auto max-h-[44vh] object-contain rounded border border-zinc-800"
                  style={{
                    maxWidth: paperWidthMm === 58 ? '200px' : '250px',
                  }}
                />
              ) : (
                <div className="w-44 h-60 flex items-center justify-center text-zinc-500 text-xs font-mono">
                  Computing 1-bit raster...
                </div>
              )}
            </div>

            {/* Printer target status */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
              <span>Target: {printerStatus.deviceName}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              soundEffects.playTap();
              onClose();
            }}
            className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-xs font-medium transition"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-sm tracking-wide shadow-sm active:scale-95 transition"
          >
            <Printer className="w-4 h-4 text-zinc-950" />
            <span>Confirm & Print to Thermal Head</span>
          </button>
        </div>
      </div>
    </div>
  );
};
