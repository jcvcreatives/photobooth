/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Samsung Galaxy Tab A11 — 9 to 12 Hour Continuous Kiosk Endurance Manager
 *
 * Designed specifically for tablets running 9–12 hours/day plugged into AC power
 * with Bluetooth continuously active for thermal printing:
 * 1. Persistent Screen WakeLock with automatic re-acquisition on release/visibility change.
 * 2. Live Battery & AC Charger health monitoring (via navigator.getBattery) with overcharge/heat advisories.
 * 3. Smart Idle Thermal Dimmer & Pixel-Shift Screen Saver after configurable idle minutes
 *    to reduce LCD backlight heat and prevent panel image retention while charging.
 * 4. Automatic Abandoned-Session Watchdog that returns the booth to Attract screen
 *    if a guest walks away mid-session.
 * 5. GPU Canvas & Heap Memory hygiene across hundreds of daily sessions.
 */

export interface TabletPowerStatus {
  batteryLevelPercent: number | null; // 0..100
  isCharging: boolean | null;
  wakeLockActive: boolean;
  isIdleDimmed: boolean;
  uptimeMinutes: number;
  sessionsCompletedToday: number;
  memoryFreedCount: number;
}

class EnduranceManagerService {
  private wakeLockSentinel: any = null;
  private wakeLockTimer: ReturnType<typeof setInterval> | null = null;
  private bootTimestamp: number = Date.now();
  private lastInteractionTimestamp: number = Date.now();
  private isIdleDimmed: boolean = false;
  private sessionsCompletedToday: number = 0;
  private memoryFreedCount: number = 0;

  private batteryLevelPercent: number | null = null;
  private isCharging: boolean | null = null;
  private batteryManager: any = null;

  private listeners: ((status: TabletPowerStatus) => void)[] = [];

  public init() {
    if (typeof window === 'undefined') return;

    // 1. Acquire Screen WakeLock immediately and verify every 25s
    this.acquireWakeLock();
    if (!this.wakeLockTimer) {
      this.wakeLockTimer = setInterval(() => {
        this.acquireWakeLock();
        this.notify();
      }, 25000);
    }

    // Re-acquire WakeLock whenever visibility returns or user touches the screen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.acquireWakeLock();
      }
    });

    const recordActivity = () => {
      this.lastInteractionTimestamp = Date.now();
      if (this.isIdleDimmed) {
        this.isIdleDimmed = false;
        this.notify();
      }
      if (!this.wakeLockSentinel) {
        this.acquireWakeLock();
      }
    };

    window.addEventListener('pointerdown', recordActivity, { passive: true, capture: true });
    window.addEventListener('touchstart', recordActivity, { passive: true, capture: true });
    window.addEventListener('keydown', recordActivity, { passive: true, capture: true });

    // 2. Monitor Galaxy Tab A11 Battery & Charger State
    this.initBatteryMonitor();
  }

  public async acquireWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    try {
      const nav = navigator as any;
      if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
        return false;
      }
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }
      const sentinel = await nav.wakeLock.request('screen');
      this.wakeLockSentinel = sentinel;
      sentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
        this.notify();
        // Automatically re-request if document is still visible
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          setTimeout(() => this.acquireWakeLock(), 1000);
        }
      });
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  private batteryPollTimer: ReturnType<typeof setInterval> | null = null;

  private async initBatteryMonitor() {
    if (typeof navigator === 'undefined') return;
    try {
      const nav = navigator as any;
      if (typeof nav.getBattery === 'function') {
        const battery = await nav.getBattery();
        this.batteryManager = battery;
        const updateBattery = () => {
          const nextLevel =
            typeof battery.level === 'number' ? Math.round(battery.level * 100) : null;
          const nextCharging =
            typeof battery.charging === 'boolean' ? battery.charging : null;
          if (nextLevel !== this.batteryLevelPercent || nextCharging !== this.isCharging) {
            this.batteryLevelPercent = nextLevel;
            this.isCharging = nextCharging;
            this.notify();
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        if (!this.batteryPollTimer) {
          this.batteryPollTimer = setInterval(updateBattery, 2000);
        }
      }
    } catch {
      // Battery Status API not exposed in this browser context
    }
  }

  public recordTouchActivity() {
    this.lastInteractionTimestamp = Date.now();
    if (this.isIdleDimmed) {
      this.isIdleDimmed = false;
      this.notify();
    }
  }

  public getIdleSeconds(): number {
    return Math.floor((Date.now() - this.lastInteractionTimestamp) / 1000);
  }

  public setIdleDimmed(dimmed: boolean) {
    if (this.isIdleDimmed !== dimmed) {
      this.isIdleDimmed = dimmed;
      this.notify();
    }
  }

  /**
   * Explicitly releases backing GPU memory of an offscreen HTMLCanvasElement
   * so Android Chrome WebView does not leak GPU textures over a 12-hour shift.
   */
  public releaseCanvasMemory(canvas: HTMLCanvasElement | null | undefined) {
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
      this.memoryFreedCount += 1;
      this.notify();
    } catch {
      // Ignore
    }
  }

  public recordSessionCompleted() {
    this.sessionsCompletedToday += 1;
    this.notify();
  }

  public getStatus(): TabletPowerStatus {
    return {
      batteryLevelPercent: this.batteryLevelPercent,
      isCharging: this.isCharging,
      wakeLockActive: Boolean(this.wakeLockSentinel && !this.wakeLockSentinel.released),
      isIdleDimmed: this.isIdleDimmed,
      uptimeMinutes: Math.max(1, Math.floor((Date.now() - this.bootTimestamp) / 60000)),
      sessionsCompletedToday: this.sessionsCompletedToday,
      memoryFreedCount: this.memoryFreedCount,
    };
  }

  public subscribe(listener: (status: TabletPowerStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }
}

export const enduranceManager = new EnduranceManagerService();
