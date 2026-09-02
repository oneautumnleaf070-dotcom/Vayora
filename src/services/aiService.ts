import { AIPriceRecommendation } from '../types';
import { httpsCallable } from 'firebase/functions';
import { functions, isFirebaseConfigured } from '../firebase/config';

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
  source: 'LIVE_GEMINI' | 'UNAVAILABLE';
}

export async function getPriceRecommendation(input: AIPriceInput): Promise<ExtendedAIRecommendation> {
  if (isFirebaseConfigured() && functions) {
    try {
      const getAiPriceFn = httpsCallable<AIPriceInput, any>(functions, 'getPriceRecommendation');
      const result = await getAiPriceFn(input);
      if (result.data) {
        return {
          cropName: input.cropName,
          source: 'LIVE_GEMINI',
          ...result.data,
        };
      }
    } catch (e) {
      console.error('Firebase Cloud Function call for Gemini AI failed:', e);
      throw new Error('Price recommendation is temporarily unavailable. Please try again.');
    }
  }

  throw new Error('Price recommendation is temporarily unavailable. Please configure Firebase Cloud Functions and Gemini API.');
}

export async function getDemandForecast(input: AIPriceInput) {
  if (isFirebaseConfigured() && functions) {
    try {
      const getForecastFn = httpsCallable<AIPriceInput, any>(functions, 'getDemandForecast');
      const result = await getForecastFn(input);
      if (result.data) return result.data;
    } catch (e) {
      console.error('getDemandForecast Cloud Function failed:', e);
      throw new Error('Demand forecasting is temporarily unavailable. Please try again.');
    }
  }

  throw new Error('Demand forecasting is temporarily unavailable. Please configure Cloud Functions.');
}
