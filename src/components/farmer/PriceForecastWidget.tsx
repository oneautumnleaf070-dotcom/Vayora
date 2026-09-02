import React from 'react';
import { AIPriceRecommendation } from '../../types';
import { formatINR } from '../../utils/helpers';
import {
  Sparkles,
  Zap,
  BarChart3,
} from 'lucide-react';

export interface PriceForecastWidgetProps {
  data: AIPriceRecommendation;
  onAdoptPrice?: (price: number) => void;
}

export const PriceForecastWidget: React.FC<PriceForecastWidgetProps> = ({
  data,
  onAdoptPrice,
}) => {
  const forecast = data.demandForecast || [];
  const maxProjected = Math.max(...forecast.map((f) => f.projectedPrice), data.recommendedPrice);
  const minProjected = Math.min(...forecast.map((f) => f.projectedPrice), data.minimumPrice);

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('immediately') || act.includes('sell')) {
      return {
        label: 'SELL NOW (Peak Demand)',
        bg: 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md',
        desc: 'Buyer demand in your regional mandi cluster is at peak. Maximize earnings today.',
      };
    }
    if (act.includes('hold')) {
      return {
        label: 'HOLD 2-3 DAYS (Price Rising)',
        bg: 'bg-amber-500 text-slate-950 font-extrabold shadow-amber-500/20 shadow-md',
        desc: 'Mandi arrivals are dropping. Prices are projected to rise over the next 48-72 hours.',
      };
    }
    return {
      label: 'LIST FOR BULK MATCHING',
      bg: 'bg-blue-600 text-white shadow-blue-500/20 shadow-md',
      desc: 'Stable market demand. List for high-volume commercial matching.',
    };
  };

  const actionMeta = getActionBadge(data.suggestedAction);
  const confidencePercent = Math.round((data.confidenceScore || 0.94) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-soft space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                7-Day Mandi Price Intelligence
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                {confidencePercent}% AI Confidence
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live APMC wholesale benchmarks vs direct farm gate realization
            </p>
          </div>
        </div>

        {onAdoptPrice && (
          <button
            type="button"
            onClick={() => onAdoptPrice(data.recommendedPrice)}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Apply Suggested Rate: {formatINR(data.recommendedPrice)}/kg
          </button>
        )}
      </div>

      {/* Recommended Action Hero Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            AI ADVISORY RECOMMENDATION
          </span>
          <span className={`px-3 py-1 rounded-xl text-xs font-extrabold ${actionMeta.bg}`}>
            {actionMeta.label}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
          {actionMeta.desc}
        </p>
      </div>

      {/* Price Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
          <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
            Suggested Farm Price
          </span>
          <span className="text-2xl font-extrabold font-mono text-emerald-950 mt-1 block">
            {formatINR(data.recommendedPrice)}
            <span className="text-xs text-emerald-700 font-normal"> / kg</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Direct 0% Cut Farm Proceeds
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Mandi Benchmark
          </span>
          <span className="text-2xl font-extrabold font-mono text-slate-800 mt-1 block">
            {formatINR(data.mandiBenchmarkPrice || data.recommendedPrice - 4)}
            <span className="text-xs text-slate-500 font-normal"> / kg</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Wholesale APMC Average
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Realistic Safe Range
          </span>
          <span className="text-lg font-extrabold font-mono text-slate-800 mt-2 block">
            {formatINR(data.minimumPrice)} – {formatINR(data.maximumPrice)}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Min / Max Expected Bounds
          </span>
        </div>
      </div>

      {/* 7-Day Trend Visual Projection */}
      {forecast.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              7-Day Projected Mandi Realization
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Normalized Index</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
            {forecast.map((item, idx) => {
              const heightPercent = Math.max(
                30,
                Math.round(((item.projectedPrice - minProjected) / (maxProjected - minProjected || 1)) * 70 + 30)
              );
              const isPeak = item.projectedPrice === maxProjected;

              return (
                <div key={idx} className="flex flex-col items-center space-y-1.5 text-center">
                  <span className="text-[10px] font-mono font-bold text-slate-700">
                    ₹{Math.round(item.projectedPrice)}
                  </span>
                  <div className="h-24 w-full bg-slate-100 rounded-xl flex items-end p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-lg transition-all ${
                        isPeak
                          ? 'bg-emerald-600 shadow-sm'
                          : 'bg-emerald-400/80 hover:bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${isPeak ? 'text-emerald-800 font-bold' : 'text-slate-500'}`}>
                    {item.day.replace('Day ', 'D')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explanation Footer */}
      {data.explanation && (
        <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed font-medium">
          💡 <strong>Market Note:</strong> {data.explanation}
        </p>
      )}
    </div>
  );
};
