import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, QueryConstraint } from 'firebase/firestore';

export interface AIRecommendationMetric {
  userId: string;
  cropName: string;
  location: string;
  recommendedPrice: number;
  actualPrice?: number;
  confidence: number;
  demandLevel: string;
  suggestion: string;
  wasAccepted: boolean;
  accuracy?: number;
  createdAt: string;
}

export interface MatchingMetric {
  buyerId: string;
  cropName: string;
  totalQuantityRequested: number;
  supplierCount: number;
  matchSuccess: boolean;
  totalQuantityMatched?: number;
  averagePrice?: number;
  createdAt: string;
}

export interface LogisticsMetric {
  logisticsPartnerId: string;
  deliveriesCompleted: number;
  onTimeRate: number;
  averageRating: number;
  totalEarnings: number;
  period: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
}

// AI Recommendations Analytics
export async function logAIRecommendation(metric: AIRecommendationMetric): Promise<void> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const metricsCollection = collection(db, 'analytics_ai_recommendations');
    await addDoc(metricsCollection, {
      ...metric,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging AI recommendation:', error);
  }
}

export async function getAIRecommendationAccuracy(days: number = 30): Promise<{
  accuracy: number;
  totalRecommendations: number;
  acceptanceRate: number;
  averageConfidence: number;
}> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const metricsCollection = collection(db, 'analytics_ai_recommendations');
    const q = query(metricsCollection, where('createdAt', '>=', dateThreshold.toISOString()));
    const snapshot = await getDocs(q);

    const metrics = snapshot.docs.map(doc => doc.data() as AIRecommendationMetric);

    const acceptedMetrics = metrics.filter(m => m.wasAccepted);
    const accurateMetrics = acceptedMetrics.filter(m => m.accuracy && m.accuracy > 0.8);

    return {
      accuracy: acceptedMetrics.length > 0 ? (accurateMetrics.length / acceptedMetrics.length) * 100 : 0,
      totalRecommendations: metrics.length,
      acceptanceRate: metrics.length > 0 ? (acceptedMetrics.length / metrics.length) * 100 : 0,
      averageConfidence: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length : 0,
    };
  } catch (error) {
    console.error('Error getting AI recommendation accuracy:', error);
    return { accuracy: 0, totalRecommendations: 0, acceptanceRate: 0, averageConfidence: 0 };
  }
}

// Bulk Matching Analytics
export async function logMatchingEvent(metric: MatchingMetric): Promise<void> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const matchingCollection = collection(db, 'analytics_matching');
    await addDoc(matchingCollection, {
      ...metric,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging matching event:', error);
  }
}

export async function getMatchingSuccessRate(days: number = 30): Promise<{
  successRate: number;
  totalMatches: number;
  averageSupplierCount: number;
  totalOrdersMatched: number;
}> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const matchingCollection = collection(db, 'analytics_matching');
    const q = query(matchingCollection, where('createdAt', '>=', dateThreshold.toISOString()));
    const snapshot = await getDocs(q);

    const metrics = snapshot.docs.map(doc => doc.data() as MatchingMetric);

    const successfulMatches = metrics.filter(m => m.matchSuccess);
    const totalMatched = metrics.reduce((sum, m) => sum + (m.totalQuantityMatched || 0), 0);

    return {
      successRate: metrics.length > 0 ? (successfulMatches.length / metrics.length) * 100 : 0,
      totalMatches: metrics.length,
      averageSupplierCount: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.supplierCount, 0) / metrics.length : 0,
      totalOrdersMatched: totalMatched,
    };
  } catch (error) {
    console.error('Error getting matching success rate:', error);
    return { successRate: 0, totalMatches: 0, averageSupplierCount: 0, totalOrdersMatched: 0 };
  }
}

// Logistics Analytics
export async function logLogisticsMetric(metric: LogisticsMetric): Promise<void> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const logisticsCollection = collection(db, 'analytics_logistics');
    await addDoc(logisticsCollection, {
      ...metric,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging logistics metric:', error);
  }
}

export async function getLogisticsMetrics(days: number = 30): Promise<{
  totalDeliveries: number;
  averageOnTimeRate: number;
  averageRating: number;
  totalEarnings: number;
  topPerformers: Array<{ partnerId: string; score: number }>;
}> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const logisticsCollection = collection(db, 'analytics_logistics');
    const q = query(logisticsCollection, where('createdAt', '>=', dateThreshold.toISOString()));
    const snapshot = await getDocs(q);

    const metrics = snapshot.docs.map(doc => doc.data() as LogisticsMetric);

    const totalDeliveries = metrics.reduce((sum, m) => sum + m.deliveriesCompleted, 0);
    const avgOnTime = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.onTimeRate, 0) / metrics.length : 0;
    const avgRating = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.averageRating, 0) / metrics.length : 0;
    const totalEarnings = metrics.reduce((sum, m) => sum + m.totalEarnings, 0);

    // Top performers by on-time rate and rating
    const performers = metrics
      .map(m => ({
        partnerId: m.logisticsPartnerId,
        score: m.onTimeRate * 0.6 + (m.averageRating / 5) * 100 * 0.4,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalDeliveries,
      averageOnTimeRate: avgOnTime,
      averageRating: avgRating,
      totalEarnings,
      topPerformers: performers,
    };
  } catch (error) {
    console.error('Error getting logistics metrics:', error);
    return {
      totalDeliveries: 0,
      averageOnTimeRate: 0,
      averageRating: 0,
      totalEarnings: 0,
      topPerformers: [],
    };
  }
}

// Platform-wide Analytics
export async function getPlatformAnalytics(days: number = 30): Promise<{
  aiAccuracy: number;
  matchingSuccessRate: number;
  logisticsPerformance: number;
  overallPlatformHealth: number;
}> {
  try {
    const aiMetrics = await getAIRecommendationAccuracy(days);
    const matchingMetrics = await getMatchingSuccessRate(days);
    const logisticsMetrics = await getLogisticsMetrics(days);

    const overallHealth = (aiMetrics.accuracy + matchingMetrics.successRate + logisticsMetrics.averageOnTimeRate) / 3;

    return {
      aiAccuracy: aiMetrics.accuracy,
      matchingSuccessRate: matchingMetrics.successRate,
      logisticsPerformance: logisticsMetrics.averageOnTimeRate,
      overallPlatformHealth: overallHealth,
    };
  } catch (error) {
    console.error('Error getting platform analytics:', error);
    return {
      aiAccuracy: 0,
      matchingSuccessRate: 0,
      logisticsPerformance: 0,
      overallPlatformHealth: 0,
    };
  }
}
