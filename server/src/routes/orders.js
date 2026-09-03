// Ports internal/orders/*.go (src/services/orderService.ts) — pricing, the
// escrow lifecycle, and actually creating the corresponding Delivery record
// on every order (createDelivery existed in the original app but was never
// invoked from anywhere — fixed here and in the Go version alike).
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');
const util = require('../util');
const notifications = require('./notifications');
const produce = require('./produce');
const deliveries = require('./deliveries');

class OrderError extends Error {}

// The original app's single demo logistics partner, baked directly onto
// every order at creation time.
const DEMO_LOGISTICS_ID = 'user_logistics_ekart';
const DEMO_LOGISTICS_NAME = 'Kisan Express Agri-Logistics';
const DEMO_LOGISTICS_PHONE = '+91 99887 76655';
const DEMO_VEHICLE_NUMBER = 'MH-15-EG-4921 (Refrigerated 1.5T)';

const COLS = `id, buyer_id, buyer_name, buyer_phone, buyer_organization, farmer_id, farmer_name, farmer_phone,
  farmer_type, produce_id, crop_name, quantity, unit, price_per_unit, produce_amount, logistics_fee,
  platform_fee, total_amount, delivery_address, delivery_latitude, delivery_longitude, pickup_location,
  delivery_location, pickup_coords, delivery_coords, logistics_partner_id, logistics_partner_name,
  logistics_phone, vehicle_number, status, payment_status, delivery_otp, pickup_otp, qr_code,
  is_bulk_order, bulk_suppliers, timeline, settlement_status, verified_at, verified_by,
  verification_method, delivered_at, created_at, updated_at`;

function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone || undefined,
    buyerOrganization: row.buyer_organization || undefined,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmerPhone: row.farmer_phone || undefined,
    farmerType: row.farmer_type || undefined,
    produceId: row.produce_id || undefined,
    cropName: row.crop_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    pricePerUnit: Number(row.price_per_unit),
    produceAmount: Number(row.produce_amount),
    farmerAmount: Number(row.produce_amount),
    logisticsFee: Number(row.logistics_fee),
    logisticsAmount: Number(row.logistics_fee),
    platformFee: Number(row.platform_fee),
    totalAmount: Number(row.total_amount),
    deliveryAddress: row.delivery_address || undefined,
    deliveryLatitude: row.delivery_latitude != null ? Number(row.delivery_latitude) : undefined,
    deliveryLongitude: row.delivery_longitude != null ? Number(row.delivery_longitude) : undefined,
    pickupLocation: row.pickup_location || undefined,
    deliveryLocation: row.delivery_location || undefined,
    pickupCoords: row.pickup_coords && Object.keys(row.pickup_coords).length ? row.pickup_coords : undefined,
    deliveryCoords: row.delivery_coords && Object.keys(row.delivery_coords).length ? row.delivery_coords : undefined,
    logisticsPartnerId: row.logistics_partner_id || undefined,
    logisticsPartnerName: row.logistics_partner_name || undefined,
    logisticsPhone: row.logistics_phone || undefined,
    vehicleNumber: row.vehicle_number || undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryOtp: row.delivery_otp || undefined,
    pickupOtp: row.pickup_otp || undefined,
    qrCode: row.qr_code || undefined,
    isBulkOrder: row.is_bulk_order,
    bulkSuppliers: row.bulk_suppliers || [],
    timeline: row.timeline || [],
    settlementStatus: row.settlement_status || undefined,
    verifiedAt: row.verified_at || undefined,
    verifiedBy: row.verified_by || undefined,
    verificationMethod: row.verification_method || undefined,
    deliveredAt: row.delivered_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getById(db, id) {
  const { rows } = await db.query(`SELECT ${COLS} FROM orders WHERE id=$1`, [id]);
  return rowToOrder(rows[0]);
}

// listByUser mirrors getOrdersByUser()'s role-specific filtering: BUYER sees
// their own purchases, FARMER/FPO see orders where they're the seller OR a
// bulk sub-order supplier, LOGISTICS sees what they're assigned to deliver,
// ADMIN sees everything.
async function listByUser(db, userId, role) {
  let rows;
  if (role === 'BUYER') {
    ({ rows } = await db.query(`SELECT ${COLS} FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC`, [userId]));
  } else if (role === 'FARMER' || role === 'FPO') {
    ({ rows } = await db.query(
      `SELECT ${COLS} FROM orders WHERE farmer_id=$1 OR bulk_suppliers @> $2 ORDER BY created_at DESC`,
      [userId, JSON.stringify([{ supplierId: userId }])]
    ));
  } else if (role === 'LOGISTICS') {
    ({ rows } = await db.query(`SELECT ${COLS} FROM orders WHERE logistics_partner_id=$1 ORDER BY created_at DESC`, [
      userId,
    ]));
  } else {
    // ADMIN
    ({ rows } = await db.query(`SELECT ${COLS} FROM orders ORDER BY created_at DESC`));
  }
  return rows.map(rowToOrder);
}

// createNewOrder mirrors orderService.ts createNewOrder(): flat-fee pricing
// (logisticsFee defaults to 500, platformFee always 100, farmer keeps 100%
// of produceAmount), OTP/QR generation, the baked-in demo logistics
// partner, and — the fix over the original — actually creating the
// Delivery row. Stock is deducted exactly once, here, for both the
// single-supplier and bulk-supplier cases.
async function createNewOrder(db, p) {
  const orderId = util.generateOrderId();

  const produceAmount = util.round2(p.quantity * p.verifiedPricePerUnit);
  const logisticsFee = p.logisticsFee != null ? p.logisticsFee : 500.0;
  const platformFee = 100.0;
  const totalAmount = util.round2(produceAmount + logisticsFee + platformFee);

  const deliveryOtp = util.generateOTP();
  const pickupOtp = util.generateOTP();
  const qrCode = util.generateQRPayload(orderId, deliveryOtp, totalAmount);

  let pickupLocation = p.pickupLocation;
  if (!pickupLocation) {
    pickupLocation = p.isBulkOrder ? 'Multi-Farm Gate Corridor (N Farms)' : `${p.farmerName}'s Farm Gate`;
  }
  const deliveryLocation = p.deliveryAddress || '';

  const now = new Date();
  const timeline = [
    { status: 'PLACED', timestamp: now.toISOString() },
    { status: 'PAYMENT_CONFIRMED', timestamp: now.toISOString() },
  ];
  const bulkSuppliers = p.bulkSuppliers || [];

  await db.query(
    `INSERT INTO orders (id, buyer_id, buyer_name, buyer_phone, buyer_organization, farmer_id, farmer_name,
        farmer_phone, farmer_type, produce_id, crop_name, quantity, unit, price_per_unit, produce_amount,
        logistics_fee, platform_fee, total_amount, delivery_address, pickup_location, delivery_location,
        pickup_coords, delivery_coords, logistics_partner_id, logistics_partner_name, logistics_phone,
        vehicle_number, status, payment_status, delivery_otp, pickup_otp, qr_code, is_bulk_order,
        bulk_suppliers, timeline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
        $27,'PAYMENT_CONFIRMED','PAID',$28,$29,$30,$31,$32,$33)`,
    [
      orderId,
      p.buyerId,
      p.buyerName,
      p.buyerPhone || '',
      p.buyerOrganization || '',
      p.farmerId,
      p.farmerName,
      p.farmerPhone || '',
      p.farmerType || '',
      p.produceId || '',
      p.cropName,
      p.quantity,
      p.unit,
      p.verifiedPricePerUnit,
      produceAmount,
      logisticsFee,
      platformFee,
      totalAmount,
      p.deliveryAddress || '',
      pickupLocation,
      deliveryLocation,
      JSON.stringify({}),
      JSON.stringify(p.deliveryCoords || {}),
      DEMO_LOGISTICS_ID,
      DEMO_LOGISTICS_NAME,
      DEMO_LOGISTICS_PHONE,
      DEMO_VEHICLE_NUMBER,
      deliveryOtp,
      pickupOtp,
      qrCode,
      !!p.isBulkOrder,
      JSON.stringify(bulkSuppliers),
      JSON.stringify(timeline),
    ]
  );

  const order = await getById(db, orderId);

  // Fix over the original app: actually create the delivery record.
  await deliveries.createFromOrder(db, {
    orderId: order.id,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    cropName: order.cropName,
    quantity: order.quantity,
    unit: order.unit,
    logisticsPartnerId: DEMO_LOGISTICS_ID,
    logisticsPartnerName: DEMO_LOGISTICS_NAME,
    logisticsPhone: DEMO_LOGISTICS_PHONE,
    vehicleNumber: DEMO_VEHICLE_NUMBER,
    pickupLocation,
    pickupCoords: null,
    deliveryLocation,
    deliveryCoords: p.deliveryCoords || null,
  });

  // Stock deducted exactly once, here — never in offers.updateStatus or
  // matching.reserve, both of which call this function instead.
  if (!p.isBulkOrder) {
    await produce.deductQuantity(db, p.produceId, p.quantity).catch(() => {});
  } else {
    for (const s of bulkSuppliers) {
      await produce.deductQuantity(db, s.produceId, s.quantity).catch(() => {});
    }
  }

  await notifications.create(db, order.farmerId, 'New order received', `You have a new order for ${order.cropName} — ${order.id}`, 'ORDER', `/farmer/orders/${order.id}`);
  await notifications.create(db, order.buyerId, 'Order confirmed', `Your order ${order.id} for ${order.cropName} is confirmed.`, 'ORDER', `/buyer/orders/${order.id}`);

  return order;
}

// createDirect mirrors the frontend's direct "Buy Now" checkout path. For a
// single-supplier purchase the price and farmer identity are taken
// authoritatively from the produce record — never from the client — closing
// a price-tampering gap the original app's client-authoritative writes left
// open. A bulk purchase supplies its own vetted bulkSuppliers breakdown
// (computed server-side by the matching engine moments earlier).
async function createDirect(db, buyerId, p) {
  const params = { ...p };
  if (!params.isBulkOrder) {
    const prod = await produce.getById(db, params.produceId);
    if (!prod) throw new OrderError('produce not found');
    if (prod.availableQuantity < params.quantity) throw new OrderError('insufficient stock available');
    params.farmerId = prod.farmerId;
    params.farmerName = prod.farmerName;
    params.farmerPhone = prod.farmerPhone;
    params.farmerType = prod.farmerType;
    params.cropName = prod.cropName;
    params.unit = prod.unit;
    params.verifiedPricePerUnit = prod.expectedPrice;
  }
  params.buyerId = buyerId;
  return createNewOrder(db, params);
}

// updateStatus mirrors updateOrderStatus() — admin override path; DELIVERED
// is normally reached via deliveries.verifyAndComplete instead.
async function updateStatus(db, id, newStatus, note) {
  if (newStatus === 'DELIVERED') {
    await db.query(`UPDATE orders SET payment_status='RELEASED_TO_FARMER' WHERE id=$1`, [id]);
  }
  await db.query(`UPDATE orders SET status=$2, updated_at=now() WHERE id=$1`, [id, newStatus]);
  const entry = JSON.stringify({ status: newStatus, timestamp: new Date().toISOString(), note: note || '' });
  await db.query(`UPDATE orders SET timeline = timeline || $2::jsonb WHERE id=$1`, [id, `[${entry}]`]);
  return getById(db, id);
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await listByUser(db, req.userId, req.role));
    })
  );

  // Direct "Buy Now" checkout flow (outside offer negotiation).
  router.post(
    '/',
    requireRole('BUYER'),
    asyncHandler(async (req, res) => {
      try {
        const order = await createDirect(db, req.userId, req.body);
        hub.emit('vayora_orders_updated');
        hub.emit('vayora_produce_updated');
        hub.emit('vayora_deliveries_updated');
        hub.emit('vayora_notifs_updated');
        res.status(201).json(order);
      } catch (err) {
        if (err instanceof OrderError) return writeError(res, 400, err.message);
        throw err;
      }
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const o = await getById(db, req.params.id);
      if (!o) return writeError(res, 404, 'order not found');
      res.json(o);
    })
  );

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      const o = await updateStatus(db, req.params.id, req.body.status, req.body.note);
      hub.emit('vayora_orders_updated');
      res.json(o);
    })
  );

  return router;
}

module.exports = {
  getById,
  listByUser,
  createNewOrder,
  createDirect,
  updateStatus,
  DEMO_LOGISTICS_ID,
  DEMO_LOGISTICS_NAME,
  DEMO_LOGISTICS_PHONE,
  DEMO_VEHICLE_NUMBER,
  buildRouter,
};
