import React from 'react';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../../utils/helpers';

export interface PriceBreakdownCardProps {
  quantityKg: number;
  pricePerKg: number;
  produceAmount: number;
  logisticsFee: number;
  platformFee: number;
  totalAmount: number;
}

export const PriceBreakdownCard: React.FC<PriceBreakdownCardProps> = ({
  quantityKg,
  pricePerKg,
  produceAmount,
  logisticsFee,
  platformFee,
  totalAmount,
}) => {
  // Traditional APMC intermediary deduction (typically 30-40% cut)
  const traditionalIntermediaryCost = Math.round(produceAmount * 0.35);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          100% Price Transparency Breakdown
        </h4>
        <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
          Zero Intermediary Cut
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-600">
            Produce Value ({quantityKg} kg × {formatINR(pricePerKg)}/kg)
          </span>
          <span className="font-bold text-slate-900">{formatINR(produceAmount)}</span>
        </div>

        <div className="flex justify-between py-1 border-b border-slate-100">
          <div className="flex items-center gap-1 text-slate-600">
            <span>Direct Agri-Logistics & Handling</span>
          </div>
          <span className="font-semibold text-slate-800">{formatINR(logisticsFee)}</span>
        </div>

        <div className="flex justify-between py-1 border-b border-slate-100">
          <div className="flex items-center gap-1 text-slate-600">
            <span>VAYORA Platform Tech Maintenance</span>
          </div>
          <span className="font-semibold text-slate-800">{formatINR(platformFee)}</span>
        </div>

        {/* Total Buyer Cost */}
        <div className="flex justify-between items-baseline pt-2 text-sm font-extrabold text-slate-900">
          <span>Total Buyer Payable</span>
          <span className="text-lg font-mono text-brand-900">{formatINR(totalAmount)}</span>
        </div>
      </div>

      {/* Payout Transparency Callout */}
      <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
        <div className="flex items-center justify-between font-bold text-emerald-900">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Farmer / FPO Direct Realization:
          </span>
          <span className="text-sm font-mono text-emerald-800">{formatINR(produceAmount)}</span>
        </div>
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          The farmer receives <strong>100%</strong> of the produce value without broker commission or hidden mandi cuts.
        </p>
      </div>

      {/* Comparison against traditional multi-tier mandi */}
      <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">SIH26033 Value Impact: </span>
          In traditional multi-tier trading, intermediaries take approx{' '}
          <strong className="text-amber-800">{formatINR(traditionalIntermediaryCost)}</strong> on an order this size. VAYORA eliminates these cuts completely.
        </div>
      </div>
    </div>
  );
};
