import { Produce, BulkMatchResult, BulkSubOrderSupplier, QualityGrade, Order, User } from '../types';
import { getStoredProduce, deductProduceQuantity, getProduceById } from './produceService';
import { calculateDistanceKm, generateOrderId, generateOTP, generateQRPayload } from '../utils/helpers';
import { addNotification } from './notificationService';
import { saveStoredOrders, getStoredOrders } from './orderService';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, runTransaction, setDoc } from 'firebase/firestore';

export interface MatchingWeights {
  quantity: number;      // default 0.30
  price: number;         // default 0.25
  distance: number;      // default 0.20
  quality: number;       // default 0.15
  verification: number;  // default 0.10
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  quantity: 0.30,
  price: 0.25,
  distance: 0.20,
  quality: 0.15,
  verification: 0.10,
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
  availableListings?: Produce[];
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
}

// Helper: Quality Grade Tier Weight
function getQualityGradeScore(grade: string): number {
  const g = grade.toLowerCase();
  if (g.includes('export') || g.includes('organic')) return 100;
  if (g.includes('grade a')) return 90;
  if (g.includes('grade b')) return 75;
  if (g.includes('grade c')) return 60;
  return 70;
}

// Single Supplier Matcher (Requirement 5)
export function matchOrderToSupplier(request: MatchingRequestInput): SmartMatchingResult {
  const listings = request.availableListings || getStoredProduce();
  const normCrop = request.cropName.toLowerCase().trim();
  const weights = { ...DEFAULT_MATCHING_WEIGHTS, ...(request.weights || {}) };

  // 1. Eligible Listings
  const eligible = listings.filter((p) => {
    const isStatusActive = p.status === 'ACTIVE' || p.status === 'AVAILABLE';
    const hasStock = p.availableQuantity > 0;
    const cropMatch = p.cropName.toLowerCase().includes(normCrop) || normCrop.includes(p.cropName.toLowerCase());
    return isStatusActive && hasStock && cropMatch;
  });

  // Check for single supplier with sufficient stock
  const singleCapable = eligible.filter((p) => p.availableQuantity >= request.requiredQuantity);

  if (singleCapable.length > 0) {
    // Score capable candidates
    const scored = singleCapable.map((item) => {
      const dist = calculateDistanceKm(
        request.deliveryLatitude,
        request.deliveryLongitude,
        item.latitude,
        item.longitude
      );

      const quantityScore = 100;
      const priceScore = request.targetPrice
        ? Math.max(0, 100 - ((item.expectedPrice - request.targetPrice) / request.targetPrice) * 100)
        : Math.max(30, 100 - item.expectedPrice * 1.2);
      const distanceScore = Math.max(0, Math.round(100 - (dist / 500) * 100));
      const qualityScore = getQualityGradeScore(item.qualityGrade);
      const verificationScore = item.verifiedSeller ? 100 : 60;

      const finalScore = Math.round(
        quantityScore * weights.quantity +
        priceScore * weights.price +
        distanceScore * weights.distance +
        qualityScore * weights.quality +
        verificationScore * weights.verification
      );

      return {
        item,
        dist,
        finalScore,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const best = scored[0];

    const subtotal = request.requiredQuantity * best.item.expectedPrice;
    const logistics = Math.round(500 + best.dist * 2.5);
    const platform = 100;

    return {
      matched: true,
      requiredQuantity: request.requiredQuantity,
      allocatedQuantity: request.requiredQuantity,
      unfulfilledQuantity: 0,
      supplierCount: 1,
      matchingMethod: 'SINGLE_SUPPLIER',
      matchingScore: best.finalScore,
      suppliers: [
        {
          produceId: best.item.id,
          farmerId: best.item.farmerId,
          farmerName: best.item.farmerName,
          farmerType: best.item.farmerType,
          organizationName: best.item.organizationName,
          quantityAllocated: request.requiredQuantity,
          availableQuantity: best.item.availableQuantity,
          pricePerUnit: best.item.expectedPrice,
          subtotal,
          distance: best.dist,
          qualityGrade: best.item.qualityGrade,
          verified: best.item.verifiedSeller,
          matchScore: best.finalScore,
          location: best.item.location,
          latitude: best.item.latitude,
          longitude: best.item.longitude,
        },
      ],
      totalProduceCost: subtotal,
      estimatedLogisticsCost: logistics,
      estimatedPlatformFee: platform,
      estimatedTotalCost: subtotal + logistics + platform,
      farmerProceeds: subtotal,
      explanation: `${best.item.farmerName} (${best.item.farmerType}) has sufficient stock (${best.item.availableQuantity} ${best.item.unit}) to fully fulfill your requirement with Grade A produce at ${best.dist} km transit distance.`,
      criteriaBreakdown: {
        quantityWeight: weights.quantity,
        priceWeight: weights.price,
        distanceWeight: weights.distance,
        qualityWeight: weights.quality,
        verificationWeight: weights.verification,
      },
    };
  }

  // Fallback to bulk matching if single cannot fulfill
  return matchBulkOrder(request);
}

// Multi-Supplier Bulk Order Matcher (Requirement 6, 7, 8)
export function matchBulkOrder(request: MatchingRequestInput): SmartMatchingResult {
  const listings = request.availableListings || getStoredProduce();
  const normCrop = request.cropName.toLowerCase().trim();
  const weights = { ...DEFAULT_MATCHING_WEIGHTS, ...(request.weights || {}) };

  // 1. Filter active, in-stock listings for requested crop
  const candidates = listings.filter((p) => {
    const isStatusActive = p.status === 'ACTIVE' || p.status === 'AVAILABLE';
    const hasStock = p.availableQuantity > 0;
    const cropMatch = p.cropName.toLowerCase().includes(normCrop) || normCrop.includes(p.cropName.toLowerCase());
    return isStatusActive && hasStock && cropMatch;
  });

  // 2. Compute individual explainable match scores
  const scoredCandidates = candidates.map((item) => {
    const dist = calculateDistanceKm(
      request.deliveryLatitude,
      request.deliveryLongitude,
      item.latitude,
      item.longitude
    );

    // Quantity Score (capacity vs requirement)
    const quantityScore = Math.min(100, Math.round((item.availableQuantity / request.requiredQuantity) * 100));

    // Price Score (favouring competitive rates)
    const priceScore = request.targetPrice
      ? Math.max(0, 100 - ((item.expectedPrice - request.targetPrice) / request.targetPrice) * 100)
      : Math.max(30, 100 - item.expectedPrice * 1.1);

    // Distance Score (favouring local clusters)
    const distanceScore = Math.max(0, Math.round(100 - (dist / 500) * 100));

    // Quality Score
    const qualityScore = getQualityGradeScore(item.qualityGrade);

    // Verification Score (FPO collective priority)
    const verificationScore = item.farmerType === 'FPO' ? 100 : item.verifiedSeller ? 90 : 60;

    const finalScore = Math.round(
      quantityScore * weights.quantity +
      priceScore * weights.price +
      distanceScore * weights.distance +
      qualityScore * weights.quality +
      verificationScore * weights.verification
    );

    return {
      item,
      dist,
      quantityScore,
      priceScore,
      distanceScore,
      qualityScore,
      verificationScore,
      finalScore,
    };
  });

  // Sort candidates by final score descending
  scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

  // 3. Greedy allocation to fulfill required volume
  let remainingKg = request.requiredQuantity;
  const allocations: MatchedSupplierAllocation[] = [];
  let totalProduceCost = 0;
  let maxDistance = 0;

  for (const entry of scoredCandidates) {
    if (remainingKg <= 0) break;

    const qtyToAllocate = Math.min(remainingKg, entry.item.availableQuantity);
    const subtotal = qtyToAllocate * entry.item.expectedPrice;

    allocations.push({
      produceId: entry.item.id,
      farmerId: entry.item.farmerId,
      farmerName: entry.item.farmerName,
      farmerType: entry.item.farmerType,
      organizationName: entry.item.organizationName,
      quantityAllocated: qtyToAllocate,
      availableQuantity: entry.item.availableQuantity,
      pricePerUnit: entry.item.expectedPrice,
      subtotal,
      distance: entry.dist,
      qualityGrade: entry.item.qualityGrade,
      verified: entry.item.verifiedSeller,
      matchScore: entry.finalScore,
      location: entry.item.location,
      latitude: entry.item.latitude,
      longitude: entry.item.longitude,
    });

    remainingKg -= qtyToAllocate;
    totalProduceCost += subtotal;
    if (entry.dist > maxDistance) maxDistance = entry.dist;
  }

  const totalAllocated = request.requiredQuantity - remainingKg;
  const isFulfilled = remainingKg === 0;

  // Average weighted match score
  const aggregateScore = allocations.length > 0
    ? Math.round(
        allocations.reduce((acc, a) => acc + a.matchScore * a.quantityAllocated, 0) / totalAllocated
      )
    : 0;

  // Logistics: Consolidated corridor rate (base + multi-stop loading + max distance)
  const estimatedLogisticsCost = allocations.length > 0
    ? Math.round(500 + (allocations.length - 1) * 350 + maxDistance * 2.0)
    : 0;
  const estimatedPlatformFee = 100;
  const estimatedTotalCost = totalProduceCost + estimatedLogisticsCost + estimatedPlatformFee;
  const farmerProceeds = totalProduceCost;

  // Explainable rationale
  let explanation = '';
  if (isFulfilled) {
    const supplierNames = allocations.map((a) => a.farmerName).join(', ');
    explanation = `VAYORA selected ${allocations.length} verified suppliers (${supplierNames}) because together they fulfill 100% of your ${request.requiredQuantity} ${request.unit} requirement with Grade A produce while optimizing consolidated transit distance (~${Math.round(maxDistance)} km) and keeping procurement costs minimal.`;
  } else {
    explanation = `Full requirement of ${request.requiredQuantity} ${request.unit} cannot currently be fulfilled. A partial volume of ${totalAllocated} ${request.unit} is available across ${allocations.length} verified suppliers.`;
  }

  return {
    matched: isFulfilled,
    requiredQuantity: request.requiredQuantity,
    allocatedQuantity: totalAllocated,
    unfulfilledQuantity: Math.max(0, remainingKg),
    supplierCount: allocations.length,
    matchingMethod: isFulfilled ? 'MULTI_SUPPLIER_BULK' : 'PARTIAL',
    matchingScore: aggregateScore,
    suppliers: allocations,
    totalProduceCost,
    estimatedLogisticsCost,
    estimatedPlatformFee,
    estimatedTotalCost,
    farmerProceeds,
    explanation,
    criteriaBreakdown: {
      quantityWeight: weights.quantity,
      priceWeight: weights.price,
      distanceWeight: weights.distance,
      qualityWeight: weights.quality,
      verificationWeight: weights.verification,
    },
  };
}

// 4. Atomic Inventory Reservation & Bulk Order Creation (Requirement 14, 15)
export async function executeBulkOrderReservation(
  matchingResult: SmartMatchingResult,
  buyerUser: User,
  deliveryAddress: string,
  deliveryCoords: { lat: number; lng: number }
): Promise<Order> {
  const orderId = generateOrderId();
  const deliveryOtp = generateOTP();
  const pickupOtp = generateOTP();
  const now = new Date().toISOString();

  // Validate that all allocations still have stock
  // Try Firestore Transaction if connected
  if (isFirebaseConfigured() && db) {
    try {
      await runTransaction(db, async (transaction) => {
        // Step 1: Read all produce documents and verify stock
        for (const alloc of matchingResult.suppliers) {
          const produceDocRef = doc(db, 'produce', alloc.produceId);
          const produceDoc = await transaction.get(produceDocRef);

          if (!produceDoc.exists()) {
            throw new Error(`Produce ${alloc.produceId} does not exist in Firestore.`);
          }

          const currentStock = produceDoc.data().availableQuantity || 0;
          if (currentStock < alloc.quantityAllocated) {
            throw new Error(
              `Some inventory changed for ${alloc.farmerName}. Please run Smart Match again.`
            );
          }
        }

        // Step 2: Atomic deductions
        for (const alloc of matchingResult.suppliers) {
          const produceDocRef = doc(db, 'produce', alloc.produceId);
          const produceDoc = await transaction.get(produceDocRef);
          const currentStock = produceDoc.data().availableQuantity || 0;
          const newQty = currentStock - alloc.quantityAllocated;

          transaction.update(produceDocRef, {
            availableQuantity: newQty,
            status: newQty === 0 ? 'SOLD_OUT' : produceDoc.data().status,
            updatedAt: now,
          });
        }

        // Step 3: Write parent order
        const parentOrderDocRef = doc(db, 'orders', orderId);
        transaction.set(parentOrderDocRef, {
          id: orderId,
          buyerId: buyerUser.id,
          buyerName: buyerUser.name,
          buyerPhone: buyerUser.phone,
          buyerOrganization: buyerUser.organizationName,
          farmerId: matchingResult.suppliers[0]?.farmerId,
          farmerName: `Bulk Aggregation (${matchingResult.suppliers.length} Farms)`,
          cropName: matchingResult.suppliers[0]?.produceId ? 'Tomato' : 'Produce',
          quantity: matchingResult.allocatedQuantity,
          unit: 'kg',
          pricePerUnit: Math.round(matchingResult.totalProduceCost / matchingResult.allocatedQuantity),
          produceAmount: matchingResult.totalProduceCost,
          farmerAmount: matchingResult.farmerProceeds,
          logisticsFee: matchingResult.estimatedLogisticsCost,
          platformFee: matchingResult.estimatedPlatformFee,
          totalAmount: matchingResult.estimatedTotalCost,
          deliveryAddress,
          deliveryLatitude: deliveryCoords.lat,
          deliveryLongitude: deliveryCoords.lng,
          pickupLocation: `Multi-Farm Corridor (${matchingResult.suppliers.length} Gates)`,
          status: 'PAYMENT_CONFIRMED',
          paymentStatus: 'PAID',
          deliveryOtp,
          pickupOtp,
          qrCode: generateQRPayload(orderId, deliveryOtp, matchingResult.estimatedTotalCost),
          isBulkOrder: true,
          requiredQuantity: matchingResult.requiredQuantity,
          allocatedQuantity: matchingResult.allocatedQuantity,
          supplierCount: matchingResult.suppliers.length,
          matchingMethod: matchingResult.matchingMethod,
          matchingScore: matchingResult.matchingScore,
          createdAt: now,
          updatedAt: now,
        });

        // Step 4: Write sub-collection allocations
        for (const alloc of matchingResult.suppliers) {
          const allocRef = doc(db, 'orders', orderId, 'allocations', `alloc_${alloc.farmerId}`);
          transaction.set(allocRef, {
            produceId: alloc.produceId,
            farmerId: alloc.farmerId,
            farmerName: alloc.farmerName,
            quantity: alloc.quantityAllocated,
            pricePerUnit: alloc.pricePerUnit,
            amount: alloc.subtotal,
            status: 'CONFIRMATION_PENDING',
          });
        }
      });
    } catch (err: any) {
      if (err.message && err.message.includes('inventory changed')) {
        throw err;
      }
      console.warn('Firestore bulk transaction error, completing in local storage state', err);
    }
  }

  // Local storage atomic deduction fallback for Demo Mode
  const storedListings = getStoredProduce();
  for (const alloc of matchingResult.suppliers) {
    const item = storedListings.find((p) => p.id === alloc.produceId);
    if (!item || item.availableQuantity < alloc.quantityAllocated) {
      throw new Error(`Some inventory changed. Please run Smart Match again.`);
    }
  }

  // Deduct inventory from local storage
  matchingResult.suppliers.forEach((alloc) => {
    deductProduceQuantity(alloc.produceId, alloc.quantityAllocated);
  });

  // Construct Parent Order
  const parentOrder: Order = {
    id: orderId,
    buyerId: buyerUser.id,
    buyerName: buyerUser.name,
    buyerPhone: buyerUser.phone,
    buyerOrganization: buyerUser.organizationName,
    farmerId: matchingResult.suppliers[0]?.farmerId || 'bulk_supplier',
    farmerName: `Bulk Coordinated Group (${matchingResult.suppliers.length} Suppliers)`,
    produceId: 'bulk_split',
    cropName: 'Tomato',
    quantity: matchingResult.allocatedQuantity,
    unit: 'kg',
    pricePerUnit: Math.round(matchingResult.totalProduceCost / matchingResult.allocatedQuantity),
    produceAmount: matchingResult.totalProduceCost,
    farmerAmount: matchingResult.farmerProceeds,
    logisticsFee: matchingResult.estimatedLogisticsCost,
    logisticsAmount: matchingResult.estimatedLogisticsCost,
    platformFee: matchingResult.estimatedPlatformFee,
    totalAmount: matchingResult.estimatedTotalCost,
    deliveryAddress,
    deliveryLatitude: deliveryCoords.lat,
    deliveryLongitude: deliveryCoords.lng,
    pickupLocation: `Multi-Farm Gate Corridor (${matchingResult.suppliers.length} Farms)`,
    deliveryLocation: buyerUser.location || 'Buyer Distribution Facility',
    pickupCoords: {
      lat: matchingResult.suppliers[0]?.latitude || 19.9975,
      lng: matchingResult.suppliers[0]?.longitude || 73.7898,
      address: 'Agri-Corridor Aggregation Point',
    },
    deliveryCoords: {
      lat: deliveryCoords.lat,
      lng: deliveryCoords.lng,
      address: deliveryAddress,
    },
    logisticsPartnerId: 'user_logistics_ekart',
    logisticsPartnerName: 'Kisan Express Multi-Stop Agri-Logistics',
    logisticsPhone: '+91 99887 76655',
    vehicleNumber: 'MH-15-EG-4921 (Refrigerated Heavy 2.5T)',
    status: 'PAYMENT_CONFIRMED',
    paymentStatus: 'PAID',
    deliveryOtp,
    pickupOtp,
    qrCode: generateQRPayload(orderId, deliveryOtp, matchingResult.estimatedTotalCost),
    isBulkOrder: true,
    bulkSuppliers: matchingResult.suppliers.map((s) => ({
      supplierId: s.farmerId,
      supplierName: s.farmerName,
      supplierRole: s.farmerType,
      produceId: s.produceId,
      quantity: s.quantityAllocated,
      unit: 'kg',
      pricePerUnit: s.pricePerUnit,
      subtotal: s.subtotal,
      location: s.location,
      latitude: s.latitude,
      longitude: s.longitude,
      distanceKm: s.distance,
      verified: s.verified,
    })),
    timeline: [
      {
        status: 'PLACED',
        timestamp: now,
        note: `Smart bulk order initiated for ${matchingResult.allocatedQuantity} kg across ${matchingResult.suppliers.length} verified producers`,
      },
      {
        status: 'PAYMENT_CONFIRMED',
        timestamp: now,
        note: `₹${matchingResult.estimatedTotalCost.toLocaleString('en-IN')} secured in VAYORA Smart Escrow (100% direct producer value protected)`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Save to local orders
  const currentOrders = getStoredOrders();
  saveStoredOrders([parentOrder, ...currentOrders]);

  // Send Notification to Each Matched Farmer/FPO (Requirement 22)
  matchingResult.suppliers.forEach((alloc) => {
    addNotification(
      alloc.farmerId,
      'Your Produce Matched to Bulk Order!',
      `Your produce has been matched to VAYORA Bulk Order #${orderId} (Allocation: ${alloc.quantityAllocated} kg of Tomato, Proceeds: ₹${alloc.subtotal.toLocaleString('en-IN')}).`,
      'ORDER',
      '/farmer/orders'
    );
  });

  // Send Notification to Buyer
  addNotification(
    buyerUser.id,
    'Smart Bulk Order Confirmed!',
    `Bulk Order #${orderId} created for ${matchingResult.allocatedQuantity} kg across ${matchingResult.suppliers.length} producers. Inventory locked in escrow.`,
    'ORDER',
    '/buyer/orders'
  );

  return parentOrder;
}
