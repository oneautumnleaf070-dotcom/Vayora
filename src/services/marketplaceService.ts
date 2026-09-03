// Ports marketplaceService.ts. filterAndSortMarketplaceProduce and
// getNearbyAlternativeSellers are pure functions with no Firebase/localStorage
// dependency — confirmed during the port — so they are carried over
// unchanged. Only getActiveMarketplaceProduce's fetch moves from
// Firestore/localStorage to the Go backend's marketplace endpoint.
import { Produce, ProduceCategory, QualityGrade } from '../types';
import { api } from '../api/client';
import { calculateDistanceKm } from '../utils/helpers';

export interface MarketplaceFilterParams {
  searchQuery: string;
  category?: ProduceCategory | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  qualityGrade?: QualityGrade | 'ALL';
  farmerType?: 'ALL' | 'FPO' | 'FARMER';
  maxDistanceKm?: number;
  sortBy: 'BEST_VALUE' | 'PRICE_LOW' | 'PRICE_HIGH' | 'DISTANCE' | 'QUANTITY';
}

export async function getActiveMarketplaceProduce(): Promise<Produce[]> {
  try {
    return await api.get<Produce[]>('/marketplace');
  } catch (e) {
    console.error('Error fetching marketplace produce', e);
    return [];
  }
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
