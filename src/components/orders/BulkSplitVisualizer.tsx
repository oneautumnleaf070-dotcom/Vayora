import React from 'react';
import { BulkMatchResult } from '../../types';
import { Layers, Users, MapPin, CheckCircle, TrendingDown, ArrowRight } from 'lucide-react';
import { formatINR, formatNumber } from '../../utils/helpers';
import { Badge } from '../common/Badge';

export interface BulkSplitVisualizerProps {
  matchResult: BulkMatchResult;
  onProceedToCheckout?: () => void;
}

export const BulkSplitVisualizer: React.FC<BulkSplitVisualizerProps> = ({
  matchResult,
  onProceedToCheckout,
}) => {
  const {
    cropName,
    requiredQuantity,
    totalSuppliedQuantity,
    unit,
    suppliers,
    estimatedTotalProduceCost,
    averagePricePerKg,
    combinedLogisticsSavingsEstimate,
    isFullyMatched,
  } = matchResult;

  const fulfillmentPercentage = Math.min(
    100,
    Math.round((totalSuppliedQuantity / requiredQuantity) * 100)
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Combined Bulk Order Aggregation
            </h3>
            <p className="text-xs text-slate-500">
              Aggregating {formatNumber(requiredQuantity)} {unit} of {cropName} across nearby verified suppliers
            </p>
          </div>
        </div>

        <Badge variant={isFullyMatched ? 'green' : 'amber'} size="md">
          {fulfillmentPercentage}% Fulfilled ({totalSuppliedQuantity} / {requiredQuantity} {unit})
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
          {suppliers.map((s, idx) => {
            const widthPct = (s.quantity / requiredQuantity) * 100;
            const bgColors = ['bg-emerald-600', 'bg-teal-600', 'bg-blue-600', 'bg-amber-600'];
            return (
              <div
                key={s.supplierId + idx}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${bgColors[idx % bgColors.length]} transition-all duration-500`}
                title={`${s.supplierName}: ${s.quantity} ${s.unit}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
          <span>0 {unit}</span>
          <span>Target Requirement: {formatNumber(requiredQuantity)} {unit}</span>
        </div>
      </div>

      {/* Multi-Supplier Breakdown List */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Aggregated Supplier Breakdown ({suppliers.length} Partners)
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {suppliers.map((s, index) => (
            <div
              key={s.produceId + index}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-2xs">
                  #{index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-900">{s.supplierName}</h5>
                    <Badge variant={s.supplierRole === 'FPO' ? 'green' : 'blue'} size="sm">
                      {s.supplierRole}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {s.location} ({s.distanceKm} km away)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {s.quantity} {s.unit}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    @{formatINR(s.pricePerUnit)}/{s.unit}
                  </span>
                </div>
                <div className="min-w-[70px]">
                  <span className="text-xs font-bold text-emerald-800 font-mono">
                    {formatINR(s.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary KPI Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Total Combined Cost:</span>
          <span className="text-base font-extrabold text-slate-900 font-mono">
            {formatINR(estimatedTotalProduceCost)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Weighted Avg Price:</span>
          <span className="text-base font-extrabold text-emerald-800 font-mono">
            {formatINR(averagePricePerKg)} / {unit}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Route Freight Savings:</span>
          <span className="text-base font-extrabold text-teal-800 font-mono flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-teal-600 inline" />
            ~{formatINR(combinedLogisticsSavingsEstimate)} saved
          </span>
        </div>
      </div>
    </div>
  );
};
