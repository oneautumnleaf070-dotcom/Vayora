import { Produce, ProduceCategory, QualityGrade } from '../types';
import { getStoredProduce } from './produceService';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { calculateDistanceKm } from '../utils/helpers';

export interface MarketplaceFilterParams {
  searchQuery: string;
  category?: ProduceCategory | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  qualityGrade?: QualityGrade | 'ALL';
  farmerType?: 'ALL' | 'FPO' | 'FARMER';
  maxDistanceKm?: number; // e.g. 25, 50, 100, 250, Infinity
  sortBy: 'BEST_VALUE' | 'PRICE_LOW' | 'PRICE_HIGH' | 'DISTANCE' | 'QUANTITY';
}

export async function getActiveMarketplaceProduce(): Promise<Produce[]> {
  // Try Firestore if real Firebase is configured
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, 'produce'),
        where('status', 'in', ['ACTIVE', 'AVAILABLE'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Produce[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Produce);
        });

        // Merge with local newly created listings if any
        const local = getStoredProduce().filter(
          (p) => (p.status === 'ACTIVE' || p.status === 'AVAILABLE') && !list.some((l) => l.id === p.id)
        );
        return [...list, ...local];
      }
    } catch (err) {
      console.warn('Firestore active produce query error, using local fallback', err);
    }
  }

  // Local storage / Demo mode fallback
  const allProduce = getStoredProduce();
  return allProduce.filter((p) => p.status === 'ACTIVE' || p.status === 'AVAILABLE');
}

export function filterAndSortMarketplaceProduce(
  items: Produce[],
  filters: MarketplaceFilterParams,
  buyerCoords: { lat: number; lng: number } = { lat: 19.076, lng: 72.8777 } // default Mumbai
): Produce[] {
  let result = [...items];

  // 1. Text Search (Crop, Category, Farmer/FPO, Location)
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.cropName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        (p.organizationName && p.organizationName.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q)
    );
  }

  // 2. Category Filter
  if (filters.category && filters.category !== 'ALL') {
    result = result.filter((p) => p.category === filters.category);
  }

  // 3. Quality Grade Filter
  if (filters.qualityGrade && filters.qualityGrade !== 'ALL') {
    result = result.filter((p) => p.qualityGrade === filters.qualityGrade);
  }

  // 4. Producer Type Filter (FPO vs Farmer)
  if (filters.farmerType && filters.farmerType !== 'ALL') {
    result = result.filter((p) => p.farmerType === filters.farmerType);
  }

  // 5. Price Range Filter
  if (filters.minPrice !== undefined) {
    result = result.filter((p) => p.expectedPrice >= (filters.minPrice || 0));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    result = result.filter((p) => p.expectedPrice <= (filters.maxPrice || Infinity));
  }

  // 6. Minimum Quantity Filter
  if (filters.minQuantity !== undefined && filters.minQuantity > 0) {
    result = result.filter((p) => p.availableQuantity >= (filters.minQuantity || 0));
  }

  // 7. Distance Filter
  if (filters.maxDistanceKm && filters.maxDistanceKm < Infinity) {
    result = result.filter((p) => {
      const dist = calculateDistanceKm(buyerCoords.lat, buyerCoords.lng, p.latitude, p.longitude);
      return dist <= filters.maxDistanceKm!;
    });
  }

  // 8. Sorting
  result.sort((a, b) => {
    const distA = calculateDistanceKm(buyerCoords.lat, buyerCoords.lng, a.latitude, a.longitude);
    const distB = calculateDistanceKm(buyerCoords.lat, buyerCoords.lng, b.latitude, b.longitude);

    switch (filters.sortBy) {
      case 'PRICE_LOW':
        return a.expectedPrice - b.expectedPrice;
      case 'PRICE_HIGH':
        return b.expectedPrice - a.expectedPrice;
      case 'DISTANCE':
        return distA - distB;
      case 'QUANTITY':
        return b.availableQuantity - a.availableQuantity;
      case 'BEST_VALUE':
      default: {
        // Best Value considers:
        // - Quality grade tier weight (Export: 1.25, Grade A: 1.1, Grade B: 0.95)
        // - Price competitiveness vs benchmark
        // - Distance factor
        // - Verified seller boost
        const gradeScore = (grade: string) =>
          grade.includes('Export') || grade.includes('Organic') ? 1.25 : grade.includes('Grade A') ? 1.1 : 0.95;
        const scoreA = (100 / a.expectedPrice) * gradeScore(a.qualityGrade) * (a.verifiedSeller ? 1.15 : 1.0) - distA * 0.05;
        const scoreB = (100 / b.expectedPrice) * gradeScore(b.qualityGrade) * (b.verifiedSeller ? 1.15 : 1.0) - distB * 0.05;
        return scoreB - scoreA;
      }
    }
  });

  return result;
}

export async function getNearbyAlternativeSellers(
  targetProduce: Produce,
  allActiveProduce: Produce[]
): Promise<Produce[]> {
  const normCrop = targetProduce.cropName.toLowerCase().split(' ')[0];
  return allActiveProduce
    .filter(
      (p) =>
        p.id !== targetProduce.id &&
        p.cropName.toLowerCase().includes(normCrop) &&
        p.availableQuantity > 0
    )
    .slice(0, 3);
}
