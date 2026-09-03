import React from 'react';
import { AIPriceRecommendation } from '../../types';
import { Sparkles, TrendingUp, ShieldCheck, ArrowUpRight, Info, BarChart2 } from 'lucide-react';
import { formatINR } from '../../utils/helpers';
import { DemandChart } from './DemandChart';

export interface PriceRecommendationCardProps {
  recommendation: AIPriceRecommendation & { source?: 'VAYORA_ENGINE' | 'LIVE_GEMINI' | 'DEMO_AI_INSIGHT' | 'UNAVAILABLE' };
  expectedPrice?: number;
  onAcceptPrice?: (price: number) => void;
  showForecastChart?: boolean;
}

export const PriceRecommendationCard: React.FC<PriceRecommendationCardProps> = ({
  recommendation,
  expectedPrice,
  onAcceptPrice,
  showForecastChart = true,
}) => {
  const demandColors = {
    HIGH: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
    MEDIUM: { bg: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
    LOW: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' },
  };

  const isLive = recommendation.source === 'VAYORA_ENGINE' || recommendation.source === 'LIVE_GEMINI';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-950 via-brand-950 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-800/40 relative overflow-hidden space-y-6">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/20 border border-brand-400/30 text-brand-400">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-300">
                  AI-ASSISTED INDICATIVE PRICE
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    isLive
                      ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {recommendation.source === 'LIVE_GEMINI' ? 'Gemini 1.5 Flash AI' : isLive ? 'VAYORA Pricing Engine' : 'Unavailable'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Analytical market intelligence (direct farm-to-buyer price bounds)
              </p>
            </div>
          </div>

          {/* Demand Level Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              demandColors[recommendation.demandLevel]?.bg || demandColors.HIGH.bg
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                demandColors[recommendation.demandLevel]?.dot || demandColors.HIGH.dot
              }`}
            />
            <span>Demand: {recommendation.demandLevel}</span>
          </div>
        </div>

        {/* Main Indicative Price Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="sm:col-span-2 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Indicative Price Range
            </p>
            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                  {formatINR(recommendation.minimumPrice)} – {formatINR(recommendation.maximumPrice)}
                </span>
                <span className="text-lg text-slate-300 font-medium">/ kg</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Optimal Mid-Point Target:{' '}
                <span className="font-bold text-emerald-300">
                  {formatINR(recommendation.recommendedPrice)} / kg
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                APMC Mandi Base: {formatINR(recommendation.mandiBenchmarkPrice)}/kg
              </span>
              <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-200">
                +18% to +35% Direct Gain
              </span>
            </div>
          </div>

          {/* Strategic Action Card */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Strategic Action
              </p>
              <h4 className="text-sm font-bold text-white mt-1">
                {recommendation.suggestedAction || 'Sell Immediately (Peak Demand)'}
              </h4>
            </div>
            <div className="text-[11px] text-slate-300 bg-black/20 p-2.5 rounded-xl border border-white/5 leading-relaxed">
              {recommendation.seasonalFactor}
            </div>
            {onAcceptPrice && (
              <button
                type="button"
                onClick={() => onAcceptPrice(recommendation.recommendedPrice)}
                className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Adopt Recommended: {formatINR(recommendation.recommendedPrice)}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AI Explanation */}
        <div className="bg-black/30 p-4 rounded-2xl border border-white/5 relative z-10 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">AI Analysis: </span>
            {recommendation.explanation}
          </div>
        </div>

        {/* Strict Legal Notice */}
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>Legal Notice:</strong> The <em>AI-assisted indicative price</em> is an analytical guideline, not a guaranteed market price. Farmers and FPOs maintain full autonomy over their final asking price.
          </span>
        </div>
      </div>

      {/* 7-Day Demand Forecast Chart */}
      {showForecastChart && recommendation.demandForecast && (
        <DemandChart
          data={recommendation.demandForecast}
          cropName={recommendation.cropName || 'Produce'}
        />
      )}
    </div>
  );
};
