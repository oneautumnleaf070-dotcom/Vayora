// Ports internal/matching/matching.go (src/services/matchingService.ts) —
// the weighted single-supplier and multi-supplier bulk-matching engine.
// Weights and scoring formulas are kept numerically identical to the
// original so existing demo scenarios produce the same recommendations.
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');
const util = require('../util');
const notifications = require('./notifications');
const produce = require('./produce');

const WEIGHTS = { quantity: 0.3, price: 0.25, distance: 0.2, quality: 0.15, verification: 0.1 };

function qualityGradeScore(grade) {
  switch (String(grade || '').toUpperCase()) {
    case 'EXPORT':
    case 'ORGANIC':
      return 100;
    case 'A':
    case 'GRADE_A':
      return 90;
    case 'B':
    case 'GRADE_B':
      return 75;
    case 'C':
    case 'GRADE_C':
      return 60;
    default:
      return 70;
  }
}

const clamp0100 = (v) => Math.max(0, Math.min(100, v));

function cropMatches(a, b) {
  a = String(a || '').toLowerCase().trim();
  b = String(b || '').toLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

async function eligibleListings(db, cropName) {
  const all = await produce.listActive(db);
  return all.filter((p) => p.availableQuantity > 0 && cropMatches(p.cropName, cropName));
}

function priceScore(expectedPrice, targetPrice) {
  if (targetPrice != null && targetPrice > 0) {
    const diffPct = (Math.abs(expectedPrice - targetPrice) / targetPrice) * 100;
    return clamp0100(100 - diffPct);
  }
  return clamp0100(100 - expectedPrice * 1.2);
}

const distanceScore = (distKm) => clamp0100(100 - (distKm / 500) * 100);
const verificationScoreSingle = (p) => (p.verifiedSeller ? 100 : 60);
const verificationScoreBulk = (p) => (p.farmerType === 'FPO' ? 100 : p.verifiedSeller ? 90 : 60);

const round2 = util.round2;

function allocationFromProduce(p, quantity, distKm, score) {
  return {
    produceId: p.id,
    supplierId: p.farmerId,
    supplierName: p.farmerName,
    supplierType: p.farmerType,
    organizationName: p.organizationName,
    quantity,
    availableQuantity: p.availableQuantity,
    pricePerUnit: p.expectedPrice,
    amount: round2(quantity * p.expectedPrice),
    distanceKm: distKm,
    score: round2(score),
    qualityGrade: p.qualityGrade,
    verifiedSeller: p.verifiedSeller,
    location: p.location,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

// match mirrors matchOrderToSupplier(), falling back to matchBulk() when no
// single listing has sufficient stock.
async function match(db, req) {
  const listings = await eligibleListings(db, req.cropName);

  const singleCandidates = [];
  for (const p of listings) {
    if (p.availableQuantity < req.requiredQuantity) continue;
    const dist = util.calculateDistanceKm(req.buyerLatitude, req.buyerLongitude, p.latitude, p.longitude);
    if (req.maxDistanceKm != null && dist > req.maxDistanceKm) continue;
    const score =
      100 * WEIGHTS.quantity +
      priceScore(p.expectedPrice, req.targetPrice) * WEIGHTS.price +
      distanceScore(dist) * WEIGHTS.distance +
      qualityGradeScore(p.qualityGrade) * WEIGHTS.quality +
      verificationScoreSingle(p) * WEIGHTS.verification;
    singleCandidates.push({ p, dist, score });
  }

  if (singleCandidates.length > 0) {
    singleCandidates.sort((a, b) => b.score - a.score);
    const best = singleCandidates[0];
    const logistics = Math.round(500 + best.dist * 2.5);
    return {
      matchingMethod: 'SINGLE_SUPPLIER',
      allocations: [allocationFromProduce(best.p, req.requiredQuantity, best.dist, best.score)],
      totalAllocatedQuantity: req.requiredQuantity,
      fulfilledQuantity: req.requiredQuantity,
      requiredQuantity: req.requiredQuantity,
      estimatedLogisticsCost: logistics,
      estimatedPlatformFee: 100,
      explanation: `${best.p.farmerName} can fulfil the full ${req.requiredQuantity} ${best.p.unit} order for ${req.cropName} at ₹${best.p.expectedPrice}/${best.p.unit}.`,
    };
  }

  return matchBulk(listings, req);
}

// matchBulk mirrors matchBulkOrder(): scores every eligible listing, sorts
// descending, greedily allocates until the requirement is met or
// candidates run out.
function matchBulk(listings, req) {
  const candidates = [];
  for (const p of listings) {
    const dist = util.calculateDistanceKm(req.buyerLatitude, req.buyerLongitude, p.latitude, p.longitude);
    if (req.maxDistanceKm != null && dist > req.maxDistanceKm) continue;
    const qtyScore = clamp0100((p.availableQuantity / req.requiredQuantity) * 100);
    const score =
      qtyScore * WEIGHTS.quantity +
      priceScore(p.expectedPrice, req.targetPrice) * WEIGHTS.price +
      distanceScore(dist) * WEIGHTS.distance +
      qualityGradeScore(p.qualityGrade) * WEIGHTS.quality +
      verificationScoreBulk(p) * WEIGHTS.verification;
    candidates.push({ p, dist, score });
  }
  candidates.sort((a, b) => b.score - a.score);

  const allocations = [];
  let remaining = req.requiredQuantity;
  let maxDist = 0;
  for (const c of candidates) {
    if (remaining <= 0) break;
    const qty = Math.min(remaining, c.p.availableQuantity);
    if (qty <= 0) continue;
    allocations.push(allocationFromProduce(c.p, qty, c.dist, c.score));
    remaining -= qty;
    if (c.dist > maxDist) maxDist = c.dist;
  }

  const fulfilled = req.requiredQuantity - remaining;
  let method = 'PARTIAL';
  if (remaining <= 0.0001) method = 'MULTI_SUPPLIER_BULK';
  if (allocations.length === 0) method = 'NONE';

  let logisticsCost = 0;
  if (allocations.length > 0) {
    logisticsCost = Math.round(500 + (allocations.length - 1) * 350 + maxDist * 2.0);
  }

  const explanation = buildExplanation(method, allocations, req);

  return {
    matchingMethod: method,
    allocations,
    totalAllocatedQuantity: fulfilled,
    fulfilledQuantity: fulfilled,
    requiredQuantity: req.requiredQuantity,
    estimatedLogisticsCost: logisticsCost,
    estimatedPlatformFee: 100,
    explanation,
  };
}

function buildExplanation(method, allocations, req) {
  if (method === 'NONE') return `No suppliers currently have ${req.cropName} available near you.`;
  const verb = method === 'PARTIAL' ? 'partially fulfilled from' : 'consolidated from';
  return `${req.cropName} order ${verb} ${allocations.length} supplier(s) across a single logistics corridor.`;
}

async function cropNameFromAllocations(db, allocations) {
  if (allocations.length === 0) return '';
  const p = await produce.getById(db, allocations[0].produceId);
  return p ? p.cropName : '';
}

// reserve mirrors executeBulkOrderReservation(): validates stock is still
// available for every allocation (deduction happens exactly once, inside
// orders.createNewOrder, called just below — not here, avoiding the
// original app's double-deduction risk), then creates the parent order.
async function reserve(db, result, buyerId, buyerName, buyerPhone, buyerOrg, deliveryAddress, deliveryCoords) {
  const orders = require('./orders');

  if (!result.allocations || result.allocations.length === 0) {
    throw new Error('no allocations to reserve');
  }
  let totalQty = 0;
  let totalAmount = 0;
  const bulkSuppliers = [];
  for (const a of result.allocations) {
    const current = await produce.getById(db, a.produceId);
    if (!current) throw new Error('produce not found');
    if (current.availableQuantity < a.quantity) {
      throw new Error('stock changed since matching — please re-run matching and try again');
    }
    totalQty += a.quantity;
    totalAmount += a.amount;
    bulkSuppliers.push({
      supplierId: a.supplierId,
      supplierName: a.supplierName,
      produceId: a.produceId,
      quantity: a.quantity,
      pricePerUnit: a.pricePerUnit,
      amount: a.amount,
    });
  }
  const avgPrice = totalAmount / totalQty;
  const isBulk = result.allocations.length > 1;
  const first = result.allocations[0];

  const order = await orders.createNewOrder(db, {
    buyerId,
    buyerName,
    buyerPhone,
    buyerOrganization: buyerOrg,
    farmerId: first.supplierId,
    farmerName: first.supplierName,
    produceId: first.produceId,
    cropName: await cropNameFromAllocations(db, result.allocations),
    quantity: totalQty,
    unit: 'kg',
    verifiedPricePerUnit: avgPrice,
    deliveryAddress,
    deliveryCoords,
    logisticsFee: result.estimatedLogisticsCost,
    isBulkOrder: isBulk,
    bulkSuppliers,
  });

  for (const a of result.allocations) {
    await notifications.create(db, a.supplierId, 'Bulk order allocation', `You were allocated ${a.quantity} units in bulk order ${order.id}.`, 'ORDER', `/farmer/orders/${order.id}`);
  }
  await notifications.create(db, buyerId, 'Bulk order placed', `Your bulk order ${order.id} across ${result.allocations.length} supplier(s) has been placed.`, 'ORDER', `/buyer/orders/${order.id}`);

  return order;
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.post(
    '/match',
    requireRole('BUYER'),
    asyncHandler(async (req, res) => {
      const result = await match(db, req.body || {});
      res.json(result);
    })
  );

  router.post(
    '/reserve',
    requireRole('BUYER'),
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      try {
        const order = await reserve(
          db,
          body.result || {},
          req.userId,
          body.buyerName,
          body.buyerPhone,
          body.buyerOrganization,
          body.deliveryAddress,
          body.deliveryCoords
        );
        hub.emit('vayora_orders_updated');
        hub.emit('vayora_produce_updated');
        hub.emit('vayora_deliveries_updated');
        hub.emit('vayora_notifs_updated');
        res.status(201).json(order);
      } catch (err) {
        writeError(res, 500, err.message);
      }
    })
  );

  return router;
}

module.exports = { match, reserve, buildRouter };
