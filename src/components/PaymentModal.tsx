/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Check,
  Ticket,
} from 'lucide-react';
import { RemoteKioskConfig, PaymentTransaction } from '../types';
import { paymentService } from '../services/payment';
import { soundEffects } from '../services/soundEffects';

interface PaymentModalProps {
  config: RemoteKioskConfig;
  onPaymentSuccess: (transaction: PaymentTransaction) => void;
  onCancel: () => void;
  onSecretAdminTap?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  config,
  onPaymentSuccess,
  onCancel,
  onSecretAdminTap,
}) => {
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [voucherError, setVoucherError] = useState<string>('');
  const [voucherSuccess, setVoucherSuccess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    paymentService.initVouchers();
  }, []);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const t = setTimeout(() => setLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [logoTapCount]);

  const handleLogoSecretTap = () => {
    soundEffects.playTap();
    const next = logoTapCount + 1;
    if (next >= 4) {
      setLogoTapCount(0);
      onSecretAdminTap?.();
      return;
    }
    setLogoTapCount(next);
  };

  const handleRedeemVoucher = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voucherCode.trim()) {
      setVoucherError('Please enter a voucher code');
      return;
    }
    setIsProcessing(true);
    setVoucherError('');
    setVoucherSuccess('');
    soundEffects.playTap();

    const res = await paymentService.redeemVoucher(voucherCode.trim(), config.kioskId);
    setIsProcessing(false);

    if (res.success && res.transaction) {
      setVoucherSuccess(res.message);
      setPaymentReceived(true);
      soundEffects.playSuccessChime();
      setTimeout(() => {
        onPaymentSuccess(res.transaction!);
      }, 1500);
    } else {
      setVoucherError(res.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#faf8f5] text-zinc-900 select-none">
      {paymentReceived ? (
        <div className="flex flex-col items-center justify-center text-center animate-fadeIn py-12">
          {/* Brand square logo */}
          <button
            type="button"
            data-no-fullscreen-enforce="true"
            onClick={handleLogoSecretTap}
            className="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-bold text-sm mb-6 shadow-xs cursor-pointer"
          >
            J
          </button>

          {/* Green checkmark circle */}
          <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-1">
            Voucher redeemed
          </h2>
          <p className="text-xs text-zinc-500">
            Get ready!
          </p>
        </div>
      ) : (
        /* Voucher-Only Payment Screen */
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          {/* Brand square logo (4 rapid taps unlocks to minimize & opens Admin) */}
          <button
            type="button"
            data-no-fullscreen-enforce="true"
            onClick={handleLogoSecretTap}
            className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm cursor-pointer"
          >
            J
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] uppercase font-mono tracking-widest text-zinc-600 mb-3">
            <Ticket className="w-3.5 h-3.5 text-zinc-700" />
            <span>1 Voucher = 1 Print Copy</span>
          </div>

          {/* Session Title & Price */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight mb-1">
            Enter Layout Voucher Code
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Enter your single-use cashier voucher for 1-Shot, 2-Shot, 3-Shot, or 4-Shot
          </p>

          {/* Layout Price Summary Chips */}
          <div className="grid grid-cols-4 gap-1.5 w-full mb-4 text-[10px]">
            {[
              { id: 'single_polaroid' as const, label: '1-Shot', fallback: 20 },
              { id: 'grid_4' as const, label: '2-Shot', fallback: 25 },
              { id: 'strip_3' as const, label: '3-Shot', fallback: 30 },
              { id: 'strip_4' as const, label: '4-Shot', fallback: 40 },
            ].map((item) => (
              <div
                key={item.id}
                className="py-1.5 px-1 rounded-xl bg-white border border-zinc-200 flex flex-col items-center shadow-2xs"
              >
                <span className="font-bold text-zinc-800">{item.label}</span>
                <span className="font-mono text-zinc-500">
                  P{config.layoutPrices?.[item.id] ?? item.fallback}
                </span>
              </div>
            ))}
          </div>

          {/* Voucher Code Entry Form */}
          <form onSubmit={handleRedeemVoucher} className="w-full space-y-3 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={voucherCode}
              onChange={(e) => {
                setVoucherCode(e.target.value.replace(/\D/g, ''));
                setVoucherError('');
              }}
              placeholder="ENTER NUMERIC VOUCHER CODE..."
              autoFocus
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-center uppercase tracking-widest font-mono text-base font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black transition"
            />

            {voucherError && (
              <p className="text-xs font-medium text-rose-500">{voucherError}</p>
            )}
            {voucherSuccess && (
              <p className="text-xs font-medium text-emerald-600">{voucherSuccess}</p>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-full bg-black hover:bg-zinc-800 active:scale-98 text-white font-semibold text-sm transition cursor-pointer shadow-sm"
            >
              {isProcessing ? 'Validating...' : 'Redeem Voucher (1 Print Copy)'}
            </button>
          </form>

          {/* Bottom Cancel Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playTap();
              onCancel();
            }}
            className="mt-6 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

