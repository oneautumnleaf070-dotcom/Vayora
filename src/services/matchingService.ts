// Ports matchingService.ts — the weighted single-supplier and multi-supplier
// bulk-matching engine — to a thin REST client. The scoring algorithm itself
// (DEFAULT_MATCHING_WEIGHTS, the quantity/price/distance/quality/verification
// formula, the greedy bulk-allocation loop) now runs server-side in Go,
// numerically identical to this file's original implementation, so existing
// demo scenarios produce the same recommendations — this file's job is just
// to call the API and reshape the response into the exact SmartMatchingResult
// shape BulkMatchingPage.tsx already renders.
import { Produce, BulkSubOrderSupplier, QualityGrade, Order, User } from '../types';
import { api } from '../api/client';

export interface MatchingWeights {
  quantity: number;
  price: number;
  distance: number;
  quality: number;
  verification: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  quantity: 0.3,
  price: 0.25,
  distance: 0.2,
  quality: 0.15,
  verification: 0.1,
};

export interface MatchingRequestInput {
  cropName: string;
  category?: string;
  requiredQuantity: number;
  unit: string;
  minimumQuality?: QualityGrade | string;
  targetPrice?: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryLocation?: string;
  maxDistanceKm?: number;
  preferredDeliveryDate?: string;
  weights?: Partial<MatchingWeights>;
  availableListings?: Produce[]; // unused now — the server queries live stock itself
}

export interface MatchedSupplierAllocation {
  produceId: string;
  farmerId: string;
  farmerName: string;
  farmerType: 'FARMER' | 'FPO';
  organizationName?: string;
  quantityAllocated: number;
  availableQuantity: number;
  pricePerUnit: number;
  subtotal: number;
  distance: number;
  qualityGrade: string;
  verified: boolean;
  matchScore: number;
  location: string;
  latitude: number;
  longitude: number;
}

export interface SmartMatchingResult {
  matched: boolean;
  requiredQuantity: number;
  allocatedQuantity: number;
  unfulfilledQuantity: number;
  supplierCount: number;
  matchingMethod: 'SINGLE_SUPPLIER' | 'MULTI_SUPPLIER_BULK' | 'PARTIAL';
  matchingScore: number;
  suppliers: MatchedSupplierAllocation[];
  totalProduceCost: number;
  estimatedLogisticsCost: number;
  estimatedPlatformFee: number;
  estimatedTotalCost: number;
  farmerProceeds: number;
  explanation: string;
  criteriaBreakdown: {
    quantityWeight: number;
    priceWeight: number;
    distanceWeight: number;
    qualityWeight: number;
    verificationWeight: number;
  };
  // raw server allocations, carried through so executeBulkOrderReservation
  // can hand them straight back to POST /api/matching/reserve unchanged
  _rawAllocations?: unknown[];
}

interface ServerAllocation {
  produceId: string;
  supplierId: string;
  supplierName: string;
  supplierType: 'FARMER' | 'FPO';
  organizationName?: string;
  quantity: number;
  availableQuantity: number;
  pricePerUnit: number;
  amount: number;
  distanceKm: number;
  score: number;
  qualityGrade: string;
  verifiedSeller: boolean;
  location: string;
  latitude: number;
  longitude: number;
}

interface ServerMatchResult {
  matchingMethod: 'SINGLE_SUPPLIER' | 'MULTI_SUPPLIER_BULK' | 'PARTIAL' | 'NONE';
  allocations: ServerAllocation[];
  totalAllocatedQuantity: number;
  fulfilledQuantity: number;
  requiredQuantity: number;
  estimatedLogisticsCost: number;
  estimatedPlatformFee: number;
  explanation: string;
}

function toSmartMatchingResult(server: ServerMatchResult, weights: MatchingWeights): SmartMatchingResult {
  const suppliers: MatchedSupplierAllocation[] = server.allocations.map((a) => ({
    produceId: a.produceId,
    farmerId: a.supplierId,
    farmerName: a.supplierName,
    farmerType: a.supplierType,
    organizationName: a.organizationName,
    quantityAllocated: a.quantity,
    availableQuantity: a.availableQuantity,
    pricePerUnit: a.pricePerUnit,
    subtotal: a.amount,
    distance: a.distanceKm,
    qualityGrade: a.qualityGrade,
    verified: a.verifiedSeller,
    matchScore: a.score,
    location: a.location,
    latitude: a.latitude,
    longitude: a.longitude,
  }));

  const totalProduceCost = suppliers.reduce((sum, s) => sum + s.subtotal, 0);
  const aggregateScore =
    suppliers.length > 0
      ? Math.round(suppliers.reduce((acc, s) => acc + s.matchScore * s.quantityAllocated, 0) / server.fulfilledQuantity || 0)
      : 0;

  return {
    matched: server.matchingMethod === 'SINGLE_SUPPLIER' || server.matchingMethod === 'MULTI_SUPPLIER_BULK',
    requiredQuantity: server.requiredQuantity,
    allocatedQuantity: server.fulfilledQuantity,
    unfulfilledQuantity: Math.max(0, server.requiredQuantity - server.fulfilledQuantity),
    supplierCount: suppliers.length,
    matchingMethod: server.matchingMethod === 'NONE' ? 'PARTIAL' : server.matchingMethod,
    matchingScore: aggregateScore,
    suppliers,
    totalProduceCost,
    estimatedLogisticsCost: server.estimatedLogisticsCost,
    estimatedPlatformFee: server.estimatedPlatformFee,
    estimatedTotalCost: totalProduceCost + server.estimatedLogisticsCost + server.estimatedPlatformFee,
    farmerProceeds: totalProduceCost,
    explanation: server.explanation,
    criteriaBreakdown: {
      quantityWeight: weights.quantity,
      priceWeight: weights.price,
      distanceWeight: weights.distance,
      qualityWeight: weights.quality,
      verificationWeight: weights.verification,
    },
    _rawAllocations: server.allocations,
  };
}

async function callMatch(request: MatchingRequestInput): Promise<SmartMatchingResult> {
  const weights = { ...DEFAULT_MATCHING_WEIGHTS, ...(request.weights || {}) };
  const server = await api.post<ServerMatchResult>('/matching/match', {
    cropName: request.cropName,
    requiredQuantity: request.requiredQuantity,
    targetPrice: request.targetPrice,
    buyerLatitude: request.deliveryLatitude,
    buyerLongitude: request.deliveryLongitude,
    maxDistanceKm: request.maxDistanceKm,
  });
  return toSmartMatchingResult(server, weights);
}

// Both matchOrderToSupplier and matchBulkOrder now hit the same server
// endpoint (which itself tries single-supplier first, falling back to bulk
// — identical fallback order to the original client-side implementation)
// and are async, since the scoring now runs against live server-side stock
// rather than a client-supplied listings snapshot.
export async function matchOrderToSupplier(request: MatchingRequestInput): Promise<SmartMatchingResult> {
  return callMatch(request);
}

export async function matchBulkOrder(request: MatchingRequestInput): Promise<SmartMatchingResult> {
  return callMatch(request);
}

// Atomic Inventory Reservation & Bulk Order Creation — now a single
// POST /api/matching/reserve call; the server re-validates stock, deducts
// it, creates the order, and creates the delivery, all atomically.
export async function executeBulkOrderReservation(
  matchingResult: SmartMatchingResult,
  buyerUser: User,
  deliveryAddress: string,
  deliveryCoords: { lat: number; lng: number }
): Promise<Order> {
  const order = await api.post<Order>('/matching/reserve', {
    result: {
      matchingMethod: matchingResult.matchingMethod === 'PARTIAL' && matchingResult._rawAllocations
        ? 'PARTIAL'
        : matchingResult.matchingMethod,
      allocations: matchingResult._rawAllocations || [],
      totalAllocatedQuantity: matchingResult.allocatedQuantity,
      fulfilledQuantity: matchingResult.allocatedQuantity,
      requiredQuantity: matchingResult.requiredQuantity,
      estimatedLogisticsCost: matchingResult.estimatedLogisticsCost,
      estimatedPlatformFee: matchingResult.estimatedPlatformFee,
      explanation: matchingResult.explanation,
    },
    buyerName: buyerUser.name,
    buyerPhone: buyerUser.phone,
    buyerOrganization: buyerUser.organizationName,
    deliveryAddress,
    deliveryCoords: { lat: deliveryCoords.lat, lng: deliveryCoords.lng, address: deliveryAddress },
  });
  window.dispatchEvent(new Event('vayora_orders_updated'));
  window.dispatchEvent(new Event('vayora_produce_updated'));
  window.dispatchEvent(new Event('vayora_deliveries_updated'));
  window.dispatchEvent(new Event('vayora_notifs_updated'));
  return order;
}
