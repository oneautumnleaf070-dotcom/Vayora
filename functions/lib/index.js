"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.verifyDelivery = exports.optimizeDeliveryRoute = exports.matchBulkOrder = exports.getDemandForecast = exports.getPriceRecommendation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const aiPrice_1 = require("./aiPrice");
const bulkMatching_1 = require("./bulkMatching");
const routeOptimization_1 = require("./routeOptimization");
const deliveryVerification_1 = require("./deliveryVerification");
const paymentVerification_1 = require("./paymentVerification");
admin.initializeApp();
// 1. AI Price Recommendation Endpoint
exports.getPriceRecommendation = functions.https.onCall(async (data) => {
    try {
        return await (0, aiPrice_1.calculateAIPriceRecommendation)(data);
    }
    catch (error) {
        throw new functions.https.HttpsError('invalid-argument', error.message);
    }
});
// 2. AI Demand Forecast Endpoint
exports.getDemandForecast = functions.https.onCall(async (data) => {
    try {
        return await (0, aiPrice_1.calculateDemandForecast)(data);
    }
    catch (error) {
        throw new functions.https.HttpsError('invalid-argument', error.message);
    }
});
// 3. Multi-Supplier Bulk Matcher Endpoint
exports.matchBulkOrder = functions.https.onCall(async (data) => {
    const { cropName, requiredKg, buyerLat, buyerLng, candidates } = data;
    return (0, bulkMatching_1.performBulkMatching)(cropName, requiredKg, buyerLat, buyerLng, candidates);
});
// 4. Route Optimization Endpoint
exports.optimizeDeliveryRoute = functions.https.onCall(async (data) => {
    const { startCoords, endCoords, waypoints } = data;
    return await (0, routeOptimization_1.calculateOptimizedRoute)(startCoords, endCoords, waypoints);
});
// 5. Delivery QR & OTP Verification Endpoint
exports.verifyDelivery = functions.https.onCall(async (data) => {
    return (0, deliveryVerification_1.verifyDeliverySecurely)(data);
});
// 6. Payment Verification & Escrow Initialization Endpoint
exports.verifyPayment = functions.https.onCall(async (data) => {
    return (0, paymentVerification_1.verifyPaymentTransaction)(data);
});
//# sourceMappingURL=index.js.map