import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateAIPriceRecommendation, calculateDemandForecast } from './aiPrice';
import { performBulkMatching } from './bulkMatching';
import { calculateOptimizedRoute } from './routeOptimization';
import { verifyDeliverySecurely } from './deliveryVerification';
import { verifyPaymentTransaction } from './paymentVerification';

admin.initializeApp();

// 1. AI Price Recommendation Endpoint
export const getPriceRecommendation = functions.https.onCall(async (data: any) => {
  try {
    return await calculateAIPriceRecommendation(data);
  } catch (error: any) {
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

// 2. AI Demand Forecast Endpoint
export const getDemandForecast = functions.https.onCall(async (data: any) => {
  try {
    return await calculateDemandForecast(data);
  } catch (error: any) {
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

// 3. Multi-Supplier Bulk Matcher Endpoint
export const matchBulkOrder = functions.https.onCall(async (data: any) => {
  const { cropName, requiredKg, buyerLat, buyerLng, candidates } = data;
  return performBulkMatching(cropName, requiredKg, buyerLat, buyerLng, candidates);
});

// 4. Route Optimization Endpoint
export const optimizeDeliveryRoute = functions.https.onCall(async (data: any) => {
  const { startCoords, endCoords, waypoints } = data;
  return await calculateOptimizedRoute(startCoords, endCoords, waypoints);
});

// 5. Delivery QR & OTP Verification Endpoint
export const verifyDelivery = functions.https.onCall(async (data: any) => {
  return verifyDeliverySecurely(data);
});

// 6. Payment Verification & Escrow Initialization Endpoint
export const verifyPayment = functions.https.onCall(async (data: any) => {
  return verifyPaymentTransaction(data);
});
