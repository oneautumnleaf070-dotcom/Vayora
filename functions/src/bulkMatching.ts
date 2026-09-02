export interface BulkSupplierCandidate {
  supplierId: string;
  supplierName: string;
  supplierRole: 'FARMER' | 'FPO';
  produceId: string;
  quantity: number;
  availableQuantity: number;
  expectedPrice: number;
  qualityGrade: string;
  latitude: number;
  longitude: number;
  location: string;
  verified?: boolean;
}

export function performBulkMatching(
  cropName: string,
  requiredKg: number,
  buyerLat: number,
  buyerLng: number,
  candidates: BulkSupplierCandidate[]
) {
  if (!cropName || requiredKg <= 0) {
    throw new Error('Invalid crop name or required volume.');
  }

  // Matching Weights: Quantity: 30%, Price: 25%, Distance: 20%, Quality: 15%, Verification: 10%
  const WEIGHTS = {
    quantity: 0.30,
    price: 0.25,
    distance: 0.20,
    quality: 0.15,
    verification: 0.10,
  };

  const getQualityScore = (grade: string) => {
    const g = (grade || '').toLowerCase();
    if (g.includes('export') || g.includes('organic')) return 100;
    if (g.includes('grade a')) return 90;
    if (g.includes('grade b')) return 75;
    return 60;
  };

  const scored = (candidates || [])
    .filter((c) => c.availableQuantity > 0)
    .map((c) => {
      const dLat = (c.latitude - buyerLat) * 111;
      const dLng = (c.longitude - buyerLng) * 111 * Math.cos((buyerLat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      const quantityScore = Math.min(100, Math.round((c.availableQuantity / requiredKg) * 100));
      const priceScore = Math.max(30, 100 - c.expectedPrice * 1.1);
      const distanceScore = Math.max(0, Math.round(100 - (dist / 500) * 100));
      const qualityScore = getQualityScore(c.qualityGrade);
      const verificationScore = c.supplierRole === 'FPO' ? 100 : c.verified ? 90 : 60;

      const score = Math.round(
        quantityScore * WEIGHTS.quantity +
        priceScore * WEIGHTS.price +
        distanceScore * WEIGHTS.distance +
        qualityScore * WEIGHTS.quality +
        verificationScore * WEIGHTS.verification
      );

      return { ...c, distanceKm: Math.round(dist * 10) / 10, score };
    })
    .sort((a, b) => b.score - a.score);

  let remaining = requiredKg;
  const suppliers: any[] = [];
  let totalCost = 0;
  let maxDistance = 0;

  for (const item of scored) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, item.availableQuantity);
    const subtotal = allocated * item.expectedPrice;
    suppliers.push({
      produceId: item.produceId,
      farmerId: item.supplierId,
      farmerName: item.supplierName,
      farmerType: item.supplierRole,
      quantityAllocated: allocated,
      availableQuantity: item.availableQuantity,
      pricePerUnit: item.expectedPrice,
      subtotal,
      location: item.location,
      distance: item.distanceKm,
      qualityGrade: item.qualityGrade,
      matchScore: item.score,
    });
    remaining -= allocated;
    totalCost += subtotal;
    if (item.distanceKm > maxDistance) maxDistance = item.distanceKm;
  }

  const isFullyMatched = remaining === 0;
  const totalAllocated = requiredKg - remaining;
  const estimatedLogisticsCost = suppliers.length > 0
    ? Math.round(500 + (suppliers.length - 1) * 350 + maxDistance * 2.0)
    : 0;
  const estimatedPlatformFee = 100;

  return {
    matched: isFullyMatched,
    requiredQuantity: requiredKg,
    allocatedQuantity: totalAllocated,
    unfulfilledQuantity: Math.max(0, remaining),
    supplierCount: suppliers.length,
    matchingMethod: isFullyMatched ? 'MULTI_SUPPLIER_BULK' : 'PARTIAL',
    suppliers,
    totalProduceCost: totalCost,
    estimatedLogisticsCost,
    estimatedPlatformFee,
    estimatedTotalCost: totalCost + estimatedLogisticsCost + estimatedPlatformFee,
    farmerProceeds: totalCost,
    explanation: isFullyMatched
      ? `Selected ${suppliers.length} verified producers fulfilling 100% of ${requiredKg} kg requirement while minimizing multi-pickup freight complexity.`
      : `Partial fulfillment: ${totalAllocated} of ${requiredKg} kg available across ${suppliers.length} producers.`,
  };
}
