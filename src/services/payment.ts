/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { FrameLayoutType, PaymentTransaction, Voucher } from '../types';
import { storageService } from './storage';
import { soundEffects } from './soundEffects';

export const LAYOUT_VOUCHER_META: Record<
  FrameLayoutType,
  {
    prefix: string;
    label: string;
    shortLabel: string;
    shots: number;
    defaultPrice: number;
  }
> = {
  single_polaroid: {
    prefix: '1',
    label: '1-Shot (Polaroid)',
    shortLabel: '1-Shot',
    shots: 1,
    defaultPrice: 20,
  },
  grid_4: {
    prefix: '2',
    label: '2-Shot (Grid)',
    shortLabel: '2-Shot',
    shots: 2,
    defaultPrice: 25,
  },
  strip_3: {
    prefix: '3',
    label: '3-Shot (Grid)',
    shortLabel: '3-Shot',
    shots: 3,
    defaultPrice: 30,
  },
  strip_4: {
    prefix: '4',
    label: '4-Shot (4-Cut Strip)',
    shortLabel: '4-Shot',
    shots: 4,
    defaultPrice: 40,
  },
};

export function inferLayoutFromPrefix(codeOrPrefix: string): FrameLayoutType | undefined {
  const digits = codeOrPrefix.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('1')) return 'single_polaroid';
  if (digits.startsWith('2')) return 'grid_4';
  if (digits.startsWith('3')) return 'strip_3';
  if (digits.startsWith('4')) return 'strip_4';
  return undefined;
}

const SEEDED_VOUCHERS: Voucher[] = [
  {
    code: '888888',
    discountPercent: 100,
    maxUses: 1000,
    usedCount: 0,
    description: 'VIP All-Access Free Photobooth Pass',
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    active: true,
  },
  {
    code: '202600',
    discountPercent: 100,
    maxUses: 250,
    usedCount: 0,
    description: 'Special Event Complimentary Voucher',
    expiresAt: Date.now() + 180 * 24 * 60 * 60 * 1000,
    active: true,
  },
  {
    code: '100100',
    discountPercent: 100,
    maxUses: 500,
    usedCount: 0,
    description: 'Event Guest Free Photo Session',
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
    active: true,
  },
  {
    code: '505050',
    discountPercent: 50,
    maxUses: 100,
    usedCount: 0,
    description: '50% Off Photo Session Promo',
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    active: true,
  },
];

const VOUCHER_CHARSET = '0123456789';

/**
 * Computes a deterministic single-digit numeric checksum ('0'..'9') for offline cashier voucher verification.
 */
function computeVoucherChecksum(payload: string): string {
  const clean = payload.replace(/\D/g, '');
  let hash = 29;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 37 + clean.charCodeAt(i) * (i + 3)) & 0xfffffff;
  }
  return VOUCHER_CHARSET[hash % 10];
}

/**
 * Verifies if an unknown code matches the JCV offline numeric cashier voucher checksum format (e.g. 6-10 digits).
 */
function isValidOfflineSignedCashierCode(code: string): boolean {
  const normalized = code.replace(/\D/g, '');
  if (!/^\d{6,10}$/.test(normalized)) return false;
  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  return computeVoucherChecksum(body) === checkDigit;
}

class PaymentService {
  private initialized = false;

  public async initVouchers(): Promise<void> {
    if (this.initialized) return;
    const existing = await storageService.getAllVouchers();
    // Clean up any legacy non-numeric voucher codes so all stored vouchers are numbers only
    for (const v of existing) {
      if (!/^\d+$/.test(v.code)) {
        await storageService.deleteVoucher(v.code);
      }
    }
    const remaining = await storageService.getAllVouchers();
    if (remaining.length === 0) {
      await storageService.saveVouchersBatch(SEEDED_VOUCHERS);
    }
    this.initialized = true;
  }

  /**
   * Batch generates single-use numeric layout vouchers (1 Voucher = 1 Print Copy) that work 100% offline.
   */
  public async generateCashierVouchersBatch(options: {
    count: number;
    prefix?: string;
    discountPercent?: number;
    maxUses?: number;
    batchName?: string;
    expiryDays?: number;
    layoutType?: FrameLayoutType;
  }): Promise<Voucher[]> {
    await this.initVouchers();
    const count = Math.max(1, Math.min(500, Math.floor(options.count || 1)));
    const layoutMeta = options.layoutType ? LAYOUT_VOUCHER_META[options.layoutType] : undefined;
    const defaultPrefix = layoutMeta ? layoutMeta.prefix : '3';
    const rawPrefix = (options.prefix || defaultPrefix).replace(/\D/g, '');
    const prefix = rawPrefix.slice(0, 4) || defaultPrefix;
    const discountPercent = options.discountPercent ?? 100;
    const maxUses = options.maxUses ?? 1; // 1 Voucher = 1 Print Copy (Single-Use)
    const expiryDays = options.expiryDays ?? 365;
    const now = Date.now();
    const batchName =
      options.batchName?.trim() ||
      (layoutMeta
        ? `${layoutMeta.label} • 1 Print Copy`
        : `Cashier Batch (${new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })})`);

    const existingList = await storageService.getAllVouchers();
    const existingCodes = new Set(existingList.map((v) => v.code));

    const generated: Voucher[] = [];
    let attempts = 0;

    while (generated.length < count && attempts < count * 20) {
      attempts++;
      let randPart = '';
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(Math.random() * VOUCHER_CHARSET.length);
        randPart += VOUCHER_CHARSET[idx];
      }
      const checkDigit = computeVoucherChecksum(`${prefix}${randPart}`);
      const fullCode = `${prefix}${randPart}${checkDigit}`;

      if (!existingCodes.has(fullCode)) {
        existingCodes.add(fullCode);
        generated.push({
          code: fullCode,
          discountPercent,
          maxUses,
          usedCount: 0,
          description: batchName,
          expiresAt: now + expiryDays * 24 * 60 * 60 * 1000,
          active: true,
          createdAt: now,
          batchName,
          isCashierTicket: true,
          layoutType: options.layoutType || inferLayoutFromPrefix(prefix),
        });
      }
    }

    await storageService.saveVouchersBatch(generated);
    return generated;
  }

  /**
   * Generates a QR Code Data URL for payment
   */
  public async generatePaymentQR(options: {
    transactionId: string;
    amount: number;
    currency: string;
    kioskId: string;
    method: 'pix' | 'cashapp' | 'generic';
  }): Promise<{ qrDataUrl: string; paymentUrl: string }> {
    const { transactionId, amount, currency, kioskId, method } = options;
    let paymentUrl = '';

    if (method === 'pix') {
      paymentUrl = `pix://payment?tx=${transactionId}&val=${amount.toFixed(2)}&kiosk=${kioskId}`;
    } else if (method === 'cashapp') {
      paymentUrl = `https://cash.app/$SnapKiosk/${amount}?note=PhotoSession_${transactionId}`;
    } else {
      paymentUrl = `https://pay.snapkiosk.io/checkout?tx=${transactionId}&amt=${amount}&cur=${currency}&kiosk=${kioskId}`;
    }

    const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return { qrDataUrl, paymentUrl };
  }

  /**
   * Validate and consume a numeric voucher code (supports exact numeric match and offline signed cashier codes)
   * Note: 1 Voucher = 1 Print Copy. Once used, a single-use voucher is marked as spent.
   */
  public async redeemVoucher(
    code: string,
    kioskId: string,
    expectedLayout?: FrameLayoutType
  ): Promise<{
    success: boolean;
    discountPercent: number;
    message: string;
    layoutType?: FrameLayoutType;
    transaction?: PaymentTransaction;
  }> {
    await this.initVouchers();
    const cleanCode = code.replace(/\D/g, '');
    if (!cleanCode) {
      return {
        success: false,
        discountPercent: 0,
        message: 'Please enter a numeric voucher code.',
      };
    }

    let voucher = await storageService.getVoucher(cleanCode);

    if (!voucher) {
      const allVouchers = await storageService.getAllVouchers();
      const matched = allVouchers.find((v) => v.code.replace(/\D/g, '') === cleanCode);
      if (matched) {
        voucher = matched;
      }
    }

    // If still not in local storage, check if it is a valid offline-signed numeric cashier voucher generated on another station
    if (!voucher && isValidOfflineSignedCashierCode(cleanCode)) {
      const inferredLayout = inferLayoutFromPrefix(cleanCode);
      const existingCanonical = await storageService.getVoucher(cleanCode);
      if (existingCanonical) {
        voucher = existingCanonical;
      } else {
        const meta = inferredLayout ? LAYOUT_VOUCHER_META[inferredLayout] : undefined;
        voucher = {
          code: cleanCode,
          discountPercent: 100,
          maxUses: 1,
          usedCount: 0,
          description: meta ? `${meta.label} • 1 Print Copy` : 'Cashier Paid Session Voucher',
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          active: true,
          createdAt: Date.now(),
          isCashierTicket: true,
          layoutType: inferredLayout,
        };
      }
    }

    if (!voucher) {
      return {
        success: false,
        discountPercent: 0,
        message: 'Invalid voucher code. Please check and try again.',
      };
    }

    if (!voucher.active) {
      return {
        success: false,
        discountPercent: 0,
        message: 'This voucher has been deactivated.',
      };
    }

    if (voucher.expiresAt && Date.now() > voucher.expiresAt) {
      return {
        success: false,
        discountPercent: 0,
        message: 'This voucher has expired.',
      };
    }

    if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses) {
      return {
        success: false,
        discountPercent: 0,
        message: 'This voucher has already been spent. Please buy a new voucher from the cashier.',
      };
    }

    const voucherLayout = voucher.layoutType || inferLayoutFromPrefix(voucher.code);

    // If expectedLayout is specified (e.g., on the "Print Another Copy" screen or layout-specific check), verify match
    if (expectedLayout && voucherLayout && voucherLayout !== expectedLayout) {
      const vMeta = LAYOUT_VOUCHER_META[voucherLayout];
      const eMeta = LAYOUT_VOUCHER_META[expectedLayout];
      return {
        success: false,
        discountPercent: 0,
        message: `This voucher is for ${vMeta.label}. Please enter a ${eMeta.label} voucher.`,
      };
    }

    // Update voucher usage count & timestamp (mark as spent)
    voucher.usedCount += 1;
    voucher.lastUsedAt = Date.now();
    if (voucherLayout && !voucher.layoutType) {
      voucher.layoutType = voucherLayout;
    }
    await storageService.saveVoucher(voucher);

    // Record transaction
    const tx: PaymentTransaction = {
      id: `TX-VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      method: 'voucher',
      amount: 0,
      currency: 'PHP',
      status: 'completed',
      timestamp: Date.now(),
      voucherCode: voucher.code,
      layoutType: voucherLayout,
      kioskId,
    };

    await storageService.saveTransaction(tx);
    soundEffects.playSuccessChime();

    const layoutBadge = voucherLayout ? ` (${LAYOUT_VOUCHER_META[voucherLayout].label} • 1 Print Copy)` : ' (1 Print Copy)';

    return {
      success: true,
      discountPercent: voucher.discountPercent,
      layoutType: voucherLayout,
      message: `Voucher redeemed!${layoutBadge}`,
      transaction: tx,
    };
  }

  /**
   * Process a QR Payment completion
   */
  public async completeQRPayment(
    transactionId: string,
    amount: number,
    currency: string,
    kioskId: string,
    method: 'qr_mock' | 'qr_pix' | 'qr_cashapp'
  ): Promise<PaymentTransaction> {
    const tx: PaymentTransaction = {
      id: transactionId,
      method,
      amount,
      currency,
      status: 'completed',
      timestamp: Date.now(),
      kioskId,
    };

    await storageService.saveTransaction(tx);
    soundEffects.playSuccessChime();
    return tx;
  }
}

export const paymentService = new PaymentService();
