/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KioskTelemetry } from '../types';
import { storageService } from './storage';

const INITIAL_TELEMETRY: KioskTelemetry = {
  totalSessions: 18,
  totalPrints: 24,
  paperRemainingPercent: 88,
  totalRevenue: 2700,
  currency: 'PHP',
  activeSince: Date.now() - 6 * 60 * 60 * 1000,
  popularFrames: {
    cyber_neon: 8,
    wedding_elegance: 6,
    retro_disco: 5,
    birthday_party: 3,
    minimal_noir: 2,
  },
  popularFilters: {
    none: 10,
    noir: 6,
    glamour: 5,
    cyber: 3,
  },
  deviceBatteryLevel: 94,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  queuedEmailsCount: 0,
  averageSessionDurationSec: 52,
};

class AnalyticsService {
  private currentTelemetry: KioskTelemetry = { ...INITIAL_TELEMETRY };
  private initialized = false;

  public async init(): Promise<KioskTelemetry> {
    if (this.initialized) return this.currentTelemetry;

    const saved = await storageService.getTelemetry();
    if (saved) {
      this.currentTelemetry = { ...INITIAL_TELEMETRY, ...saved };
    } else {
      await storageService.saveTelemetry(this.currentTelemetry);
    }

    // Monitor battery level if Android Chrome battery API available
    if ('getBattery' in navigator) {
      try {
        const batteryManager = await (navigator as unknown as { getBattery: () => Promise<{ level: number; addEventListener: (type: string, listener: () => void) => void }> }).getBattery();
        this.currentTelemetry.deviceBatteryLevel = Math.round(batteryManager.level * 100);
        batteryManager.addEventListener('levelchange', () => {
          this.currentTelemetry.deviceBatteryLevel = Math.round(batteryManager.level * 100);
          this.persist();
        });
      } catch {
        // Battery status not allowed
      }
    }

    this.initialized = true;
    return this.currentTelemetry;
  }

  public getTelemetry(): KioskTelemetry {
    this.currentTelemetry.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return this.currentTelemetry;
  }

  public async recordSessionComplete(options: {
    frameThemeId: string;
    filterId: string;
    durationSec: number;
    printed: boolean;
    printCopies?: number;
    revenueAdded: number;
  }): Promise<void> {
    await this.init();

    this.currentTelemetry.totalSessions += 1;
    this.currentTelemetry.totalRevenue += options.revenueAdded;

    // Frame stats
    this.currentTelemetry.popularFrames[options.frameThemeId] =
      (this.currentTelemetry.popularFrames[options.frameThemeId] || 0) + 1;

    // Filter stats
    this.currentTelemetry.popularFilters[options.filterId] =
      (this.currentTelemetry.popularFilters[options.filterId] || 0) + 1;

    // Session duration running average
    const n = this.currentTelemetry.totalSessions;
    this.currentTelemetry.averageSessionDurationSec = Math.round(
      (this.currentTelemetry.averageSessionDurationSec * (n - 1) + options.durationSec) / n
    );

    if (options.printed) {
      const copies = Math.max(1, Math.round(Number(options.printCopies) || 1));
      this.currentTelemetry.totalPrints += copies;
      this.currentTelemetry.lastPrintTimestamp = Date.now();
      // Deplete paper roll (~1.0% per photostrip copy)
      this.currentTelemetry.paperRemainingPercent = Math.max(
        0,
        Number((this.currentTelemetry.paperRemainingPercent - 1.0 * copies).toFixed(1))
      );
    }

    await this.persist();
  }

  public async resetPaperRoll(): Promise<void> {
    await this.init();
    this.currentTelemetry.paperRemainingPercent = 100;
    await this.persist();
  }

  public async resetStats(): Promise<KioskTelemetry> {
    await this.init();
    this.currentTelemetry = {
      ...this.currentTelemetry,
      totalSessions: 0,
      totalPrints: 0,
      paperRemainingPercent: 100,
      totalRevenue: 0,
      activeSince: Date.now(),
      lastPrintTimestamp: undefined,
      popularFrames: {},
      popularFilters: {},
      averageSessionDurationSec: 0,
    };
    await this.persist();
    return { ...this.currentTelemetry };
  }

  private async persist(): Promise<void> {
    await storageService.saveTelemetry(this.currentTelemetry);
  }
}

export const analyticsService = new AnalyticsService();
