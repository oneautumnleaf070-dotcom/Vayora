# VAYORA AI Training & Configuration Guide

## Overview

VAYORA's AI system consists of three integrated components:
1. **Price Recommendation Engine** (Gemini API + Cloud Functions)
2. **Demand Forecasting** (Historical market data analysis)
3. **Bulk Matching Algorithm** (Optimal supplier allocation)

---

## 1. Setup: Gemini API Integration

### Step 1: Enable Gemini API in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your VAYORA Firebase project
3. Navigate to **APIs & Services** → **Library**
4. Search for **"Generative Language API"**
5. Click **Enable**

### Step 2: Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. Copy the API key
4. Add to Firebase `functions/.env`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### Step 3: Restrict API Key (Security)

1. In Credentials, click the new API key
2. Set **API restrictions** to "Generative Language API only"
3. Set **Application restrictions** to "Cloud Functions"

---

## 2. Setup: Firebase Cloud Functions

### File: `functions/src/aiPrice.ts`

This Cloud Function handles price recommendations:

```typescript
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebaseAdmin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface AIPriceInput {
  cropName: string;
  category: string;
  quantity: number;
  qualityGrade: string;
  location: string;
  harvestDate: string;
  farmerExpectedPrice?: number;
}

export const getPriceRecommendation = functions.https.onCall(
  async (input: AIPriceInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      // Get historical mandi prices from Firestore
      const mandiSnapshot = await db
        .collection('mandiPrices')
        .where('cropName', '==', input.cropName)
        .where('location', '==', input.location)
        .orderBy('date', 'desc')
        .limit(30)
        .get();

      const historicalData = mandiSnapshot.docs.map(doc => ({
        date: doc.data().date,
        price: doc.data().price,
        volume: doc.data().volume,
      }));

      // Prepare prompt for Gemini
      const prompt = `
        You are an agricultural market price analyst for the Indian agricultural marketplace VAYORA.
        
        Analyze the following data and provide a price recommendation:
        
        Crop: ${input.cropName}
        Category: ${input.category}
        Quality Grade: ${input.qualityGrade}
        Quantity: ${input.quantity} kg
        Location: ${input.location}
        Harvest Date: ${input.harvestDate}
        Farmer's Expected Price: ₹${input.farmerExpectedPrice || 'Not specified'}/kg
        
        Historical Mandi Prices (last 30 days):
        ${historicalData.map(d => `${d.date}: ₹${d.price}/kg (Volume: ${d.volume})`).join('\n')}
        
        Based on this data, provide:
        1. Recommended Price (₹/kg): Consider quality grade, current market trends, and supply-demand
        2. Price Range: Minimum to maximum expected price
        3. Confidence Score: 0-100% confidence in the recommendation
        4. Demand Level: HIGH / MEDIUM / LOW
        5. Recommendation: SELL NOW / HOLD / LIST FOR BULK
        6. Reasoning: Brief explanation
        
        Format your response as JSON.
      `;

      // Call Gemini API
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const recommendation = JSON.parse(jsonMatch[0]);

      // Store in Firestore for analytics
      await db.collection('aiRecommendations').add({
        userId: context.auth.uid,
        cropName: input.cropName,
        location: input.location,
        recommendation,
        createdAt: new Date(),
      });

      return recommendation;
    } catch (error) {
      console.error('Error in getPriceRecommendation:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate price recommendation'
      );
    }
  }
);

export const getDemandForecast = functions.https.onCall(
  async (input: AIPriceInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      // Get 90-day historical data
      const historySnapshot = await db
        .collection('mandiPrices')
        .where('cropName', '==', input.cropName)
        .where('location', '==', input.location)
        .orderBy('date', 'desc')
        .limit(90)
        .get();

      const dailyPrices = historySnapshot.docs.reverse().map(doc => ({
        date: doc.data().date,
        price: doc.data().price,
        volume: doc.data().volume,
      }));

      // Forecast 7 days ahead using Gemini
      const prompt = `
        Analyze this agricultural commodity price history and forecast the next 7 days:
        
        Crop: ${input.cropName}
        Location: ${input.location}
        
        Historical Daily Prices (last 90 days):
        ${dailyPrices.map(d => `${d.date}: ₹${d.price}/kg`).join('\n')}
        
        Provide a 7-day forecast as JSON with:
        {
          "forecast": [
            {"day": 1, "expectedPrice": number, "confidence": number},
            ...
          ],
          "peakDay": number,
          "peakPrice": number,
          "trend": "UP" | "DOWN" | "STABLE"
        }
      `;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error in getDemandForecast:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate demand forecast'
      );
    }
  }
);
```

---

## 3. Training Data: Seed Mandi Prices

Create a Cloud Function to populate historical mandi prices:

```typescript
export const seedMandiPrices = functions.https.onCall(async (_, context) => {
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const crops = [
    { name: 'Tomato', basePrice: 25, volatility: 0.15 },
    { name: 'Onion', basePrice: 20, volatility: 0.12 },
    { name: 'Potato', basePrice: 15, volatility: 0.08 },
    { name: 'Cucumber', basePrice: 18, volatility: 0.10 },
  ];

  const locations = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu'];

  // Generate 90 days of mock data
  const today = new Date();
  const batch = db.batch();

  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    for (const crop of crops) {
      for (const location of locations) {
        // Simulate price fluctuations
        const randomVariation = (Math.random() - 0.5) * crop.volatility * crop.basePrice;
        const seasonalVariation = Math.sin((365 - i) / 365 * Math.PI) * crop.basePrice * 0.1;
        const price = Math.max(
          crop.basePrice + randomVariation + seasonalVariation,
          crop.basePrice * 0.7
        );

        const docRef = db.collection('mandiPrices').doc();
        batch.set(docRef, {
          cropName: crop.name,
          location,
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
          volume: Math.floor(Math.random() * 500) + 100,
          source: 'DEMO_DATA',
        });
      }
    }
  }

  await batch.commit();
  return { message: '90 days of mandi price data seeded successfully' };
});
```

---

## 4. Bulk Matching Algorithm

### File: `src/services/matchingService.ts`

The matching algorithm finds optimal supplier combinations:

```typescript
export interface MatchingInput {
  buyerRequirements: {
    cropName: string;
    totalQuantity: number;
    targetPrice: number;
    location: string;
    deliveryDate: string;
  };
}

export async function findOptimalSuppliers(input: MatchingInput) {
  const { buyerRequirements } = input;

  // Get all active produce matching criteria
  const produceSnapshot = await db
    .collection('produce')
    .where('cropName', '==', buyerRequirements.cropName)
    .where('status', '==', 'ACTIVE')
    .where('availableQuantity', '>', 0)
    .get();

  // Score each supplier
  const scoredSuppliers = produceSnapshot.docs.map(doc => {
    const produce = doc.data();
    const distance = calculateDistance(
      { lat: buyerRequirements.location, lng: buyerRequirements.location },
      { lat: produce.latitude, lng: produce.longitude }
    );

    const priceScore = Math.max(0, 100 - Math.abs(produce.expectedPrice - buyerRequirements.targetPrice) / buyerRequirements.targetPrice * 100);
    const distanceScore = Math.max(0, 100 - distance / 1000 * 10);
    const verificationScore = produce.verifiedSeller ? 100 : 50;
    const ratingScore = (produce.rating || 3) / 5 * 100;

    const totalScore = (priceScore * 0.4 + distanceScore * 0.2 + verificationScore * 0.2 + ratingScore * 0.2);

    return {
      produceId: doc.id,
      farmerId: produce.farmerId,
      farmerName: produce.farmerName,
      quantity: Math.min(produce.availableQuantity, buyerRequirements.totalQuantity),
      price: produce.expectedPrice,
      totalAmount: Math.min(produce.availableQuantity, buyerRequirements.totalQuantity) * produce.expectedPrice,
      distance,
      score: totalScore,
      verified: produce.verifiedSeller,
      rating: produce.rating || 3,
    };
  });

  // Sort by score and select optimal combination
  const sorted = scoredSuppliers.sort((a, b) => b.score - a.score);

  // Greedy allocation: pick highest-scoring suppliers until quantity met
  const selected = [];
  let remainingQuantity = buyerRequirements.totalQuantity;

  for (const supplier of sorted) {
    if (remainingQuantity <= 0) break;

    const allocatedQuantity = Math.min(supplier.quantity, remainingQuantity);
    selected.push({
      ...supplier,
      allocatedQuantity,
      allocatedAmount: allocatedQuantity * supplier.price,
    });

    remainingQuantity -= allocatedQuantity;
  }

  return {
    suppliers: selected,
    totalQuantityAllocated: buyerRequirements.totalQuantity - remainingQuantity,
    totalAmount: selected.reduce((sum, s) => sum + s.allocatedAmount, 0),
    isFeasible: remainingQuantity === 0,
  };
}
```

---

## 5. Testing AI Features

### Test Case 1: Price Recommendation

```bash
# Call from Farmer Dashboard
curl -X POST https://localhost:5173/api/getPriceRecommendation \
  -H "Content-Type: application/json" \
  -d '{
    "cropName": "Tomato",
    "category": "VEGETABLES",
    "quantity": 500,
    "qualityGrade": "Grade A",
    "location": "Maharashtra",
    "harvestDate": "2026-09-02"
  }'
```

**Expected Response:**
```json
{
  "cropName": "Tomato",
  "recommendedPrice": 26,
  "priceRange": { "min": 22, "max": 32 },
  "confidence": 92,
  "demandLevel": "HIGH",
  "recommendation": "SELL_NOW",
  "reasoning": "Peak demand period with limited supply",
  "source": "LIVE_GEMINI"
}
```

### Test Case 2: Bulk Matching

```bash
curl -X POST https://localhost:5173/api/findOptimalSuppliers \
  -d '{
    "buyerRequirements": {
      "cropName": "Tomato",
      "totalQuantity": 1000,
      "targetPrice": 25,
      "location": "Delhi",
      "deliveryDate": "2026-09-05"
    }
  }'
```

**Expected Response:**
```json
{
  "suppliers": [
    {
      "farmerId": "farmer1",
      "farmerName": "Raj Kumar",
      "allocatedQuantity": 500,
      "allocatedAmount": 13000,
      "price": 26,
      "distance": 45,
      "score": 95.2,
      "verified": true
    }
  ],
  "totalQuantityAllocated": 1000,
  "totalAmount": 26000,
  "isFeasible": true
}
```

---

## 6. Monitoring & Analytics

### Dashboard Endpoints

1. **AI Recommendations Tracking**
   - Path: `/admin/analytics/ai-recommendations`
   - Shows: Accuracy of price predictions vs actual market prices
   - Metric: Confidence scores vs actual outcomes

2. **Demand Forecast Accuracy**
   - Shows: Historical forecast vs actual prices
   - Helps refine AI model over time

3. **Bulk Matching Success Rate**
   - Shows: Orders successfully filled vs failed matches
   - Optimization target: >95% success rate

---

## 7. Deployment Checklist

- [ ] Gemini API enabled in Google Cloud
- [ ] API key created and stored in `.env`
- [ ] Cloud Functions deployed (`deployFunc`)
- [ ] Mandi price data seeded (90+ days historical)
- [ ] AI recommendations tested end-to-end
- [ ] Demand forecasts validated
- [ ] Bulk matching algorithm tested with 10+ scenarios
- [ ] Analytics dashboard accessible to admins
- [ ] Error handling tested (API failures, timeouts)
- [ ] Rate limiting applied (avoid API quota exhaustion)
- [ ] Monitoring set up for API calls and response times

---

## 8. Best Practices

1. **Cache Results** — Cache price recommendations for 1 hour to reduce API calls
2. **Gradual Rollout** — Enable AI for 10% of users first, monitor accuracy
3. **Feedback Loop** — Track farmer acceptance rates; adjust recommendations
4. **Regular Training** — Update historical data daily for better forecasts
5. **Error Fallback** — If Gemini API fails, use rule-based price calculations
6. **Cost Control** — Monitor API usage; set daily limits in Google Cloud

---

## Commands

### Deploy Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Test AI Service (Local)
```bash
npm run dev
# Navigate to Farmer Dashboard, add produce, AI section auto-loads
```

### Monitor API Usage
```bash
# Google Cloud Console → APIs & Services → Quotas
# Track: "Generative Language API" usage
```

---

**Status:** ✅ Ready for AI-powered market intelligence!
