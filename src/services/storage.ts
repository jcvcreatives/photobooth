/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PhotostripResult,
  PaymentTransaction,
  Voucher,
  EmailQueueItem,
  RemoteKioskConfig,
  KioskTelemetry,
} from '../types';

const DB_NAME = 'snapkiosk_db';
const DB_VERSION = 1;

// Safe in-memory fallback when Android WebView / file:// / drive.usercontent.google.com restricts storage
const memoryKV = new Map<string, string>();

export const safeStorageGet = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Restricted storage in Android WebView or sandboxed origin
  }
  return memoryKV.get(key) ?? null;
};

export const safeStorageSet = (key: string, value: string): void => {
  memoryKV.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Quota or SecurityError ignored; memoryKV retains value for session
  }
};

export const safeStorageRemove = (key: string): void => {
  memoryKV.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore SecurityError
  }
};

/**
 * Resizes and compresses an image file to fit within reasonable memory and storage quotas.
 * Converts large multi-megabyte photos to high-definition ~60KB web-friendly JPEG data URLs.
 */
export const compressImageFile = (file: File, maxWidth = 1000, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export class StorageService {
  private dbPromise: Promise<IDBDatabase | null>;

  // In-memory fallback stores for Android WebView / restricted origins where IndexedDB is disabled
  private memCaptures = new Map<string, PhotostripResult>();
  private memTransactions = new Map<string, PaymentTransaction>();
  private memVouchers = new Map<string, Voucher>();
  private memEmailQueue = new Map<string, EmailQueueItem>();
  private memConfig = new Map<string, unknown>();
  private memTelemetry = new Map<string, KioskTelemetry>();

  constructor() {
    this.hydrateVouchersFromLocalBackup();
    this.dbPromise = this.initDB();
  }

  private hydrateVouchersFromLocalBackup(): void {
    try {
      const raw = safeStorageGet('jcv_vouchers_backup');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.code === 'string') {
            const code = item.code.toUpperCase();
            this.memVouchers.set(code, { ...item, code });
          }
        }
      }
    } catch {
      // Ignore malformed backup
    }
  }

  private syncVouchersToLocalBackup(): void {
    try {
      const list = Array.from(this.memVouchers.values());
      safeStorageSet('jcv_vouchers_backup', JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
          resolve(null);
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('captures')) {
              db.createObjectStore('captures', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('transactions')) {
              db.createObjectStore('transactions', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('vouchers')) {
              db.createObjectStore('vouchers', { keyPath: 'code' });
            }
            if (!db.objectStoreNames.contains('emailQueue')) {
              db.createObjectStore('emailQueue', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('telemetry')) {
              db.createObjectStore('telemetry', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('config')) {
              db.createObjectStore('config', { keyPath: 'key' });
            }
          } catch {
            // Ignore upgrade errors on restricted WebViews
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          resolve(null);
        };

        request.onblocked = () => {
          resolve(null);
        };
      } catch {
        // SecurityError when opening IndexedDB on file://, content://, or sandboxed origins
        resolve(null);
      }
    });
  }

  // --- Captures (Ring-buffer capped for 9–12h continuous Galaxy Tab A11 operation) ---
  public async saveCapture(capture: PhotostripResult): Promise<void> {
    this.memCaptures.set(capture.id, capture);
    // Keep at most 25 recent captures in RAM so base64 strings never exhaust tablet memory over 12 hours
    if (this.memCaptures.size > 25) {
      const oldestKey = this.memCaptures.keys().next().value;
      if (oldestKey) {
        this.memCaptures.delete(oldestKey);
      }
    }
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('captures', 'readwrite');
        const store = tx.objectStore('captures');
        store.put(capture);
        // Prune IndexedDB captures beyond the latest 60 sessions
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const list = (getAllReq.result || []) as PhotostripResult[];
          if (list.length > 60) {
            list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const toDelete = list.slice(0, list.length - 60);
            for (const oldItem of toDelete) {
              if (oldItem?.id) store.delete(oldItem.id);
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getCapture(id: string): Promise<PhotostripResult | null> {
    const db = await this.dbPromise;
    if (!db) return this.memCaptures.get(id) || null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('captures', 'readonly');
        const req = tx.objectStore('captures').get(id);
        req.onsuccess = () => resolve(req.result || this.memCaptures.get(id) || null);
        req.onerror = () => resolve(this.memCaptures.get(id) || null);
      } catch {
        resolve(this.memCaptures.get(id) || null);
      }
    });
  }

  public async getAllCaptures(): Promise<PhotostripResult[]> {
    const db = await this.dbPromise;
    if (!db) return Array.from(this.memCaptures.values()).reverse();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('captures', 'readonly');
        const req = tx.objectStore('captures').getAll();
        req.onsuccess = () => resolve((req.result || []).reverse());
        req.onerror = () => resolve(Array.from(this.memCaptures.values()).reverse());
      } catch {
        resolve(Array.from(this.memCaptures.values()).reverse());
      }
    });
  }

  // --- Transactions ---
  public async saveTransaction(txData: PaymentTransaction): Promise<void> {
    this.memTransactions.set(txData.id, txData);
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('transactions', 'readwrite');
        tx.objectStore('transactions').put(txData);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getAllTransactions(): Promise<PaymentTransaction[]> {
    const db = await this.dbPromise;
    if (!db) return Array.from(this.memTransactions.values());
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('transactions', 'readonly');
        const req = tx.objectStore('transactions').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(Array.from(this.memTransactions.values()));
      } catch {
        resolve(Array.from(this.memTransactions.values()));
      }
    });
  }

  // --- Vouchers ---
  public async getVoucher(code: string): Promise<Voucher | null> {
    const key = code.trim().toUpperCase();
    const memItem = this.memVouchers.get(key) || null;
    const db = await this.dbPromise;
    if (!db) return memItem;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readonly');
        const req = tx.objectStore('vouchers').get(key);
        req.onsuccess = () => {
          const dbItem = req.result as Voucher | undefined;
          if (dbItem && memItem) {
            const preferred = (memItem.usedCount ?? 0) >= (dbItem.usedCount ?? 0) ? memItem : dbItem;
            this.memVouchers.set(key, preferred);
            resolve(preferred);
          } else {
            const found = dbItem || memItem || null;
            if (found) this.memVouchers.set(key, found);
            resolve(found);
          }
        };
        req.onerror = () => resolve(memItem);
      } catch {
        resolve(memItem);
      }
    });
  }

  public async saveVoucher(voucher: Voucher): Promise<void> {
    const normalized = { ...voucher, code: voucher.code.trim().toUpperCase() };
    this.memVouchers.set(normalized.code, normalized);
    this.syncVouchersToLocalBackup();
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readwrite');
        tx.objectStore('vouchers').put(normalized);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async saveVouchersBatch(vouchers: Voucher[]): Promise<void> {
    if (!vouchers.length) return;
    const normalizedList = vouchers.map((v) => ({
      ...v,
      code: v.code.trim().toUpperCase(),
    }));
    for (const item of normalizedList) {
      this.memVouchers.set(item.code, item);
    }
    this.syncVouchersToLocalBackup();
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readwrite');
        const store = tx.objectStore('vouchers');
        for (const item of normalizedList) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async deleteVoucher(code: string): Promise<void> {
    const key = code.trim().toUpperCase();
    this.memVouchers.delete(key);
    this.syncVouchersToLocalBackup();
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readwrite');
        tx.objectStore('vouchers').delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearUsedVouchers(): Promise<void> {
    const all = await this.getAllVouchers();
    const usedCodes = all
      .filter((v) => v.maxUses > 0 && v.usedCount >= v.maxUses)
      .map((v) => v.code.toUpperCase());

    for (const code of usedCodes) {
      this.memVouchers.delete(code);
    }
    this.syncVouchersToLocalBackup();
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readwrite');
        const store = tx.objectStore('vouchers');
        for (const code of usedCodes) {
          store.delete(code);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getAllVouchers(): Promise<Voucher[]> {
    const db = await this.dbPromise;
    if (!db) return Array.from(this.memVouchers.values());
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vouchers', 'readonly');
        const req = tx.objectStore('vouchers').getAll();
        req.onsuccess = () => {
          const dbItems: Voucher[] = Array.isArray(req.result) ? req.result : [];
          for (const item of dbItems) {
            if (item && item.code) {
              const key = item.code.toUpperCase();
              const existing = this.memVouchers.get(key);
              if (!existing || (item.usedCount ?? 0) > (existing.usedCount ?? 0)) {
                this.memVouchers.set(key, { ...item, code: key });
              }
            }
          }
          this.syncVouchersToLocalBackup();
          resolve(Array.from(this.memVouchers.values()));
        };
        req.onerror = () => resolve(Array.from(this.memVouchers.values()));
      } catch {
        resolve(Array.from(this.memVouchers.values()));
      }
    });
  }

  // --- Email Queue ---
  public async queueEmail(emailItem: EmailQueueItem): Promise<void> {
    this.memEmailQueue.set(emailItem.id, emailItem);
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('emailQueue', 'readwrite');
        tx.objectStore('emailQueue').put(emailItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getQueuedEmails(): Promise<EmailQueueItem[]> {
    const db = await this.dbPromise;
    if (!db) return Array.from(this.memEmailQueue.values());
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('emailQueue', 'readonly');
        const req = tx.objectStore('emailQueue').getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memEmailQueue.values()));
        req.onerror = () => resolve(Array.from(this.memEmailQueue.values()));
      } catch {
        resolve(Array.from(this.memEmailQueue.values()));
      }
    });
  }

  public async updateEmailStatus(id: string, status: 'sent' | 'failed'): Promise<void> {
    const existing = this.memEmailQueue.get(id);
    if (existing) {
      this.memEmailQueue.set(id, { ...existing, status });
    }
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('emailQueue', 'readwrite');
        const store = tx.objectStore('emailQueue');
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            req.result.status = status;
            store.put(req.result);
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- Config & Telemetry ---
  public async getConfig(): Promise<RemoteKioskConfig | null> {
    const db = await this.dbPromise;
    if (!db) return (this.memConfig.get('kiosk_config') as RemoteKioskConfig) || null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('config', 'readonly');
        const req = tx.objectStore('config').get('kiosk_config');
        req.onsuccess = () =>
          resolve(req.result ? req.result.data : (this.memConfig.get('kiosk_config') as RemoteKioskConfig) || null);
        req.onerror = () => resolve((this.memConfig.get('kiosk_config') as RemoteKioskConfig) || null);
      } catch {
        resolve((this.memConfig.get('kiosk_config') as RemoteKioskConfig) || null);
      }
    });
  }

  public async saveConfig(config: RemoteKioskConfig): Promise<void> {
    this.memConfig.set('kiosk_config', config);
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('config', 'readwrite');
        tx.objectStore('config').put({ key: 'kiosk_config', data: config });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- Home Screen Custom Strip Photos ---
  public async getAttractPhotos(): Promise<string[]> {
    const db = await this.dbPromise;
    if (!db) {
      const mem = this.memConfig.get('attract_photos');
      return Array.isArray(mem) ? (mem as string[]) : [];
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('config', 'readonly');
        const req = tx.objectStore('config').get('attract_photos');
        req.onsuccess = () => resolve(Array.isArray(req.result?.data) ? req.result.data : []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async saveAttractPhotos(photos: string[]): Promise<void> {
    this.memConfig.set('attract_photos', photos);
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('config', 'readwrite');
        tx.objectStore('config').put({ key: 'attract_photos', data: photos });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearAttractPhotos(): Promise<void> {
    this.memConfig.delete('attract_photos');
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('config', 'readwrite');
        tx.objectStore('config').delete('attract_photos');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getTelemetry(): Promise<KioskTelemetry | null> {
    const db = await this.dbPromise;
    if (!db) return this.memTelemetry.get('stats') || null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('telemetry', 'readonly');
        const req = tx.objectStore('telemetry').get('stats');
        req.onsuccess = () => resolve(req.result ? req.result.data : this.memTelemetry.get('stats') || null);
        req.onerror = () => resolve(this.memTelemetry.get('stats') || null);
      } catch {
        resolve(this.memTelemetry.get('stats') || null);
      }
    });
  }

  public async saveTelemetry(telemetry: KioskTelemetry): Promise<void> {
    this.memTelemetry.set('stats', telemetry);
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('telemetry', 'readwrite');
        tx.objectStore('telemetry').put({ key: 'stats', data: telemetry });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearAllData(): Promise<void> {
    this.memCaptures.clear();
    this.memTransactions.clear();
    this.memEmailQueue.clear();
    this.memTelemetry.clear();
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const storeNames = ['captures', 'transactions', 'emailQueue', 'telemetry'];
        const tx = db.transaction(storeNames, 'readwrite');
        storeNames.forEach((name) => tx.objectStore(name).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const storageService = new StorageService();
