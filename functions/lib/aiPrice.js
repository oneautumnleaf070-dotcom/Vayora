"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAIPriceInput = validateAIPriceInput;
exports.calculateAIPriceRecommendation = calculateAIPriceRecommendation;
exports.calculateDemandForecast = calculateDemandForecast;
const generative_ai_1 = require("@google/generative-ai");
function validateAIPriceInput(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Input data must be an object.');
    }
    if (!data.cropName || typeof data.cropName !== 'string' || data.cropName.trim() === '') {
        throw new Error('Valid cropName is required.');
    }
    if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
        throw new Error('Quantity must be a positive number.');
    }
    if (!data.qualityGrade || typeof data.qualityGrade !== 'string') {
        throw new Error('Quality grade is required.');
    }
    if (!data.location || typeof data.location !== 'string') {
        throw new Error('Location is required.');
    }
    return {
        cropName: data.cropName.trim(),
        category: data.category || 'VEGETABLES',
        quantity: Number(data.quantity),
        qualityGrade: data.qualityGrade,
        location: data.location.trim(),
        harvestDate: data.harvestDate || new Date().toISOString().split('T')[0],
        farmerExpectedPrice: data.farmerExpectedPrice ? Number(data.farmerExpectedPrice) : undefined,
    };
}
async function calculateAIPriceRecommendation(rawInput) {
    const data = validateAIPriceInput(rawInput);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not configured on server.');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    });
    const prompt = `You are the VAYORA Agri-Intelligence Pricing Engine for Smart India Hackathon 2026.
Calculate an AI-assisted indicative price range (in Indian Rupees per kg/unit) directly connecting farmers with bulk buyers, bypassing middleman markups.

Inputs:
- Commodity Crop: ${data.cropName}
- Category: ${data.category}
- Batch Quantity: ${data.quantity}
- Quality Specification: ${data.qualityGrade}
- Farm/Delivery Location: ${data.location}
- Harvest Date: ${data.harvestDate}
- Farmer Asking Target: ₹${data.farmerExpectedPrice || 'Open'}/unit

Respond with strictly valid JSON matching this schema:
{
  "recommendedPrice": number,
  "minimumPrice": number,
  "maximumPrice": number,
  "mandiBenchmarkPrice": number,
  "demandLevel": "HIGH" | "MEDIUM" | "LOW",
  "seasonalFactor": string,
  "confidenceScore": number,
  "explanation": string,
  "suggestedAction": "Sell Immediately (Peak Demand)" | "Hold 2-3 Days" | "List for Bulk Matching",
  "demandForecast": [
    { "day": "Day 1", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 2", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 3", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 4", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 5", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 6", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 7", "expectedDemand": number, "projectedPrice": number }
  ]
}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
}
async function calculateDemandForecast(rawInput) {
    const data = validateAIPriceInput(rawInput);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not configured on server.');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    });
    const prompt = `Provide a 7-day wholesale demand projection in Indian Mandis and urban clusters for:
- Crop: ${data.cropName}
- Location: ${data.location}
- Quality: ${data.qualityGrade}

Return strictly valid JSON:
{
  "demandLevel": "HIGH" | "MEDIUM" | "LOW",
  "explanation": string,
  "forecast": [
    { "day": "Day 1", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 2", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 3", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 4", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 5", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 6", "expectedDemand": number, "projectedPrice": number },
    { "day": "Day 7", "expectedDemand": number, "projectedPrice": number }
  ]
}`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
}
//# sourceMappingURL=aiPrice.js.map