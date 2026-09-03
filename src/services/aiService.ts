// Ports aiService.ts. The original always threw — it called an undeployed
// Firebase Cloud Function ("getPriceRecommendation") wired to Gemini, which
// was never actually deployed, so this feature was permanently broken in
// the original app. The Go backend replaces it with a real, deterministic,
// math-based pricing engine (mandi baseline + seasonality + quality premium
// + direct-buyer-advantage margin) that always returns a usable number.
// This file's job is just to call it and reshape the response into the
// exact AIPriceRecommendation shape PriceRecommendationCard/DemandChart
// already render, so no UI component needs to change.
import { AIPriceRecommendation } from '../types';
import { api } from '../api/client';

export interface AIPriceInput {
  cropName: string;
  category: string;
  quantity: number;
  qualityGrade: string;
  location: string;
  harvestDate: string;
  farmerExpectedPrice?: number;
}

export interface ExtendedAIRecommendation extends AIPriceRecommendation {
  source: 'VAYORA_ENGINE';
}

interface ServerForecastPoint {
  period: string;
  demand: number; // actually a projected price point, see note below
}

interface ServerBreakdown {
  qualityPremium: number;
  mandiAverage: number;
  demandAdjustment: number;
  directBuyerAdvantage: number;
}

interface ServerRecommendation {
  cropName: string;
  recommendedPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  mandiBenchmarkPrice: number;
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  seasonalFactor: number;
  confidenceScore: number; // 0-100
  demandForecast: ServerForecastPoint[];
  explanation: string;
  suggestedAction: 'LIST_NOW' | 'CONSIDER_WAITING';
  breakdown: ServerBreakdown;
  source: string;
}

const demandBaselineIndex: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
  HIGH: 78,
  MEDIUM: 55,
  LOW: 32,
};

function seasonalFactorLabel(seasonal: number, demandLevel: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  const pct = Math.round(Math.abs(seasonal - 1) * 100);
  if (seasonal >= 1.1) return `Peak season pricing — demand is running about ${pct}% above baseline right now.`;
  if (seasonal <= 0.9) return `Off-season pricing — demand is running about ${pct}% below baseline; consider timing your sale.`;
  return `Steady, in-line-with-baseline demand for this ${demandLevel.toLowerCase()}-demand window.`;
}

function suggestedActionLabel(
  action: 'LIST_NOW' | 'CONSIDER_WAITING',
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW'
): AIPriceRecommendation['suggestedAction'] {
  if (action === 'CONSIDER_WAITING') return 'Hold 2-3 Days';
  if (demandLevel === 'HIGH') return 'Sell Immediately (Peak Demand)';
  if (demandLevel === 'MEDIUM') return 'Moderate Market Demand';
  return 'List for Bulk Matching';
}

function toAIPriceRecommendation(server: ServerRecommendation): ExtendedAIRecommendation {
  const baseline = demandBaselineIndex[server.demandLevel] ?? 55;
  const demandForecast = server.demandForecast.map((point, i) => ({
    day: point.period,
    // wobble the demand index a little per period around the level's baseline,
    // driven by how each period's projected price compares to the mandi average
    expectedDemand: Math.max(
      0,
      Math.min(100, Math.round(baseline + (point.demand - server.mandiBenchmarkPrice) * 1.5 + (i - 1.5)))
    ),
    projectedPrice: point.demand,
  }));

  return {
    cropName: server.cropName,
    recommendedPrice: server.recommendedPrice,
    minimumPrice: server.minimumPrice,
    maximumPrice: server.maximumPrice,
    mandiBenchmarkPrice: server.mandiBenchmarkPrice,
    demandLevel: server.demandLevel,
    seasonalFactor: seasonalFactorLabel(server.seasonalFactor, server.demandLevel),
    confidenceScore: Math.round(server.confidenceScore) / 100,
    demandForecast,
    explanation: server.explanation,
    suggestedAction: suggestedActionLabel(server.suggestedAction, server.demandLevel),
    breakdown: server.breakdown,
    source: 'VAYORA_ENGINE',
  };
}

function toServerInput(input: AIPriceInput) {
  return {
    cropName: input.cropName,
    qualityGrade: input.qualityGrade,
    quantity: input.quantity,
  };
}

export async function getPriceRecommendation(input: AIPriceInput): Promise<ExtendedAIRecommendation> {
  try {
    const server = await api.post<ServerRecommendation>('/ai/price-recommendation', toServerInput(input));
    return toAIPriceRecommendation(server);
  } catch (e) {
    console.error('Price recommendation request failed:', e);
    throw new Error('Price recommendation is temporarily unavailable. Please try again.');
  }
}

export async function getDemandForecast(input: AIPriceInput) {
  try {
    return await api.post<{ period: string; demand: number }[]>('/ai/demand-forecast', toServerInput(input));
  } catch (e) {
    console.error('getDemandForecast request failed:', e);
    throw new Error('Demand forecasting is temporarily unavailable. Please try again.');
  }
}
