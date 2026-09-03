// Replaces src/services/aiService.ts's price-recommendation call. The
// original always threw (called an undeployed Firebase Cloud Function) — a
// genuine gap in the original app. This implements a real, deterministic,
// math-based pricing heuristic returning the exact AIPriceRecommendation
// shape the frontend expects. Ported 1:1 from internal/ai/ai.go, including
// every constant, so recommendations are numerically identical to the Go
// version.
const express = require('express');
const { asyncHandler } = require('../middleware');

const MANDI_BASELINE = {
  rice: 32, wheat: 24, tomato: 18, onion: 22, potato: 16,
  cotton: 65, sugarcane: 3.5, maize: 20, soybean: 45,
  chili: 60, banana: 15, mango: 40, grapes: 55, cabbage: 12,
  cauliflower: 18, brinjal: 16, okra: 25, groundnut: 55,
  turmeric: 75, ginger: 50, garlic: 80, carrot: 20, peas: 35,
};

// [startMonth, endMonth], 1-indexed, wrapping ranges allowed (e.g. wheat 11->3).
const IN_SEASON_MONTHS = {
  rice: [6, 11], wheat: [11, 3], tomato: [1, 12], onion: [1, 12],
  potato: [10, 3], cotton: [10, 2], sugarcane: [1, 12], maize: [6, 10],
  mango: [3, 6], grapes: [1, 4],
};

function baselinePrice(cropName) {
  const key = String(cropName || '').toLowerCase().trim();
  for (const [k, v] of Object.entries(MANDI_BASELINE)) {
    if (key.includes(k) || k.includes(key)) return { price: v, known: true };
  }
  return { price: 25, known: false };
}

function qualityPremiumPct(grade, organic) {
  let pct = 0;
  switch (String(grade || '').toUpperCase()) {
    case 'EXPORT':
    case 'ORGANIC':
      pct = 0.25;
      break;
    case 'A':
    case 'GRADE_A':
      pct = 0.15;
      break;
    case 'B':
    case 'GRADE_B':
      pct = 0.05;
      break;
  }
  if (organic) pct += 0.1;
  return pct;
}

function seasonalFactor(cropName) {
  const key = String(cropName || '').toLowerCase().trim();
  const month = new Date().getMonth() + 1;
  for (const [k, [start, end]] of Object.entries(IN_SEASON_MONTHS)) {
    if (key.includes(k)) {
      const inSeason = start <= end ? month >= start && month <= end : month >= start || month <= end;
      return inSeason ? 1.12 : 0.9;
    }
  }
  return 1.0;
}

const round2 = (v) => Math.round(v * 100) / 100;

function seasonNote(seasonal) {
  if (seasonal >= 1.1) return ', currently in peak season with strong demand';
  if (seasonal <= 0.9) return ', currently off-season with softer demand';
  return '';
}

function gradeLabel(grade) {
  return grade ? String(grade).toLowerCase() : 'standard';
}

// recommend computes a full AIPriceRecommendation deterministically — same
// numbers every time for the same inputs.
function recommend(input) {
  const { price: base, known } = baselinePrice(input.cropName);
  const seasonal = seasonalFactor(input.cropName);
  const qualityPct = qualityPremiumPct(input.qualityGrade, input.organicCertified);

  const mandiAverage = round2(base);
  const seasonAdjusted = round2(mandiAverage * seasonal);
  const qualityPremium = round2(seasonAdjusted * qualityPct);
  const directBuyerAdvantage = round2(mandiAverage * 0.15);
  const recommended = round2(seasonAdjusted + qualityPremium + directBuyerAdvantage);
  const minimum = round2(recommended * 0.9);
  const maximum = round2(recommended * 1.15);

  let demandLevel = 'MEDIUM';
  if (seasonal >= 1.1) demandLevel = 'HIGH';
  else if (seasonal <= 0.9) demandLevel = 'LOW';

  const confidence = known ? 88 : 65;

  const forecast = [];
  for (let i = 0; i < 4; i++) {
    const wobble = 1 + 0.03 * Math.sin(i + seasonal);
    forecast.push({ period: `Week ${i + 1}`, demand: round2(seasonAdjusted * wobble) });
  }

  const action = demandLevel === 'LOW' ? 'CONSIDER_WAITING' : 'LIST_NOW';

  const explanation =
    `${input.cropName} is trading around ₹${mandiAverage}/kg at nearby mandis this season` +
    `${seasonNote(seasonal)}. With your ${gradeLabel(input.qualityGrade)} grade, a recommended direct-to-buyer ` +
    `price of ₹${recommended}/kg captures the quality premium plus the margin a mandi middleman would ` +
    `otherwise have kept.`;

  return {
    cropName: input.cropName,
    recommendedPrice: recommended,
    minimumPrice: minimum,
    maximumPrice: maximum,
    mandiBenchmarkPrice: mandiAverage,
    demandLevel,
    seasonalFactor: seasonal,
    confidenceScore: confidence,
    demandForecast: forecast,
    explanation,
    suggestedAction: action,
    breakdown: {
      qualityPremium,
      mandiAverage,
      demandAdjustment: round2(seasonAdjusted - mandiAverage),
      directBuyerAdvantage,
    },
    source: 'DETERMINISTIC_ENGINE',
  };
}

function buildRouter() {
  const router = express.Router();

  router.post(
    '/price-recommendation',
    asyncHandler(async (req, res) => {
      res.json(recommend(req.body || {}));
    })
  );

  router.post(
    '/demand-forecast',
    asyncHandler(async (req, res) => {
      res.json(recommend(req.body || {}).demandForecast);
    })
  );

  return router;
}

module.exports = { recommend, buildRouter };
