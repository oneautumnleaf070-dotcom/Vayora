import React from 'react';
import { Offer } from '../../types';
import { Badge } from '../common/Badge';
import { formatINR, formatNumber } from '../../utils/helpers';
import {
  CheckCircle2,
  XCircle,
  Building,
  User,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface OfferSummaryRowProps {
  offer: Offer;
  onAccept: (offerId: string) => void;
  onCounter: (offer: Offer) => void;
  onReject: (offerId: string) => void;
  processing?: boolean;
}

export const OfferSummaryRow: React.FC<OfferSummaryRowProps> = ({
  offer,
  onAccept,
  onCounter,
  onReject,
  processing = false,
}) => {
  const isPending = offer.status === 'PENDING';
  const isAccepted = offer.status === 'ACCEPTED';
  const isCountered = offer.status === 'COUNTERED';

  // Highlight high-value offers (e.g. large volume or above average rate)
  const isHighValue = offer.totalOfferedAmount >= 10000 || offer.offeredPrice >= 35;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isHighValue
          ? 'bg-gradient-to-r from-emerald-50/50 to-white border-emerald-200 shadow-2xs'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Crop & Buyer Details */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
              {offer.cropName}
            </span>
            <Badge
              variant={
                isAccepted
                  ? 'green'
                  : isPending
                  ? 'amber'
                  : isCountered
                  ? 'blue'
                  : 'slate'
              }
              size="sm"
            >
              {offer.status}
            </Badge>

            {isHighValue && isPending && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Priority Offer
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              {offer.buyerOrganization ? (
                <Building className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400" />
              )}
              {offer.buyerName} {offer.buyerOrganization ? `(${offer.buyerOrganization})` : ''}
            </span>
            <span>•</span>
            <span className="font-mono font-semibold text-slate-700">
              {formatNumber(offer.quantity)} kg requested
            </span>
            {offer.distanceKm && (
              <>
                <span>•</span>
                <span className="text-slate-400">~{offer.distanceKm} km away</span>
              </>
            )}
          </div>

          {offer.message && (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-1">
              "{offer.message}"
            </p>
          )}

          {offer.counterPrice && isCountered && (
            <div className="text-xs text-blue-700 font-semibold flex items-center gap-1">
              <span>Counter-Offer Proposed: <strong>{formatINR(offer.counterPrice)}/kg</strong></span>
            </div>
          )}
        </div>

        {/* Center: Financial Value */}
        <div className="flex items-baseline lg:flex-col lg:items-end justify-between w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-mono font-extrabold text-emerald-900">
              {formatINR(offer.offeredPrice)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ kg</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            Total: {formatINR(offer.totalOfferedAmount || offer.offeredPrice * offer.quantity)}
          </span>
        </div>

        {/* Right: Inline Actions */}
        {isPending && (
          <div className="flex items-center gap-2 w-full lg:w-auto pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => onAccept(offer.id)}
              disabled={processing}
              className="flex-1 lg:flex-none min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              aria-label={`Accept offer for ${offer.cropName}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept</span>
            </button>

            <button
              type="button"
              onClick={() => onCounter(offer)}
              disabled={processing}
              className="flex-1 lg:flex-none min-h-[44px] px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              aria-label={`Counter offer for ${offer.cropName}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Counter</span>
            </button>

            <button
              type="button"
              onClick={() => onReject(offer.id)}
              disabled={processing}
              className="min-h-[44px] px-3 py-2.5 text-slate-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
              aria-label={`Decline offer for ${offer.cropName}`}
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Decline</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
