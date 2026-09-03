// Ports internal/deliveries/*.go (src/services/deliveryService.ts) — the
// state machine, assignment, and QR/OTP handover verification flow. Two
// upgrades carried over from the Go version: createFromOrder is actually
// invoked for every order (the original app defined createDelivery() but
// never called it from anywhere), and QR/OTP verification is computed
// authoritatively server-side (SHA-256) instead of client-side.
//
// NOTE: this delivery/pickup OTP system is unrelated to login — it's the
// existing "Tamper-Proof Dual QR Code + 6-Digit OTP Delivery Verification"
// product feature and is untouched by the TOTP login change in auth.js.
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');
const util = require('../util');
const notifications = require('./notifications');

class DeliveryError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
const ErrNotFound = () => new DeliveryError('delivery not found', 'NOT_FOUND');
const ErrInvalidTransition = () => new DeliveryError('invalid status transition', 'BAD_REQUEST');
const ErrForbidden = () => new DeliveryError('not authorized for this delivery', 'FORBIDDEN');
const ErrNotArrived = () => new DeliveryError('delivery must be ARRIVED before it can be verified', 'BAD_REQUEST');
const ErrAlreadyVerified = () => new DeliveryError('delivery has already been verified', 'BAD_REQUEST');
const ErrBadCredential = () => new DeliveryError('QR code or OTP did not match', 'BAD_REQUEST');

const VALID_TRANSITIONS = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKUP_PENDING', 'CANCELLED'],
  PICKUP_PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};
const isValidTransition = (current, next) => (VALID_TRANSITIONS[current] || []).includes(next);

const COLS = `id, order_id, buyer_id, farmer_id, crop_name, quantity, unit, logistics_partner_id,
  logistics_partner_name, logistics_phone, driver_name, driver_phone, vehicle_type, vehicle_number,
  pickup_location, pickup_latitude, pickup_longitude, pickup_coords, delivery_location, delivery_latitude,
  delivery_longitude, delivery_coords, waypoints, optimized_route, distance_km, estimated_time_minutes,
  status, assigned_at, picked_up_at, in_transit_at, arrived_at, delivered_at, pickup_otp, delivery_otp,
  qr_code, qr_token, qr_token_hash, otp_hash, otp_expires_at, current_latitude, current_longitude,
  is_demo_route, verified_by, verified_at, verification_status, verification_method, created_at, updated_at`;

function rowToDelivery(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    buyerId: row.buyer_id || undefined,
    farmerId: row.farmer_id || undefined,
    cropName: row.crop_name || undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unit: row.unit || undefined,
    logisticsPartnerId: row.logistics_partner_id || undefined,
    logisticsPartnerName: row.logistics_partner_name || undefined,
    logisticsPhone: row.logistics_phone || undefined,
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    vehicleType: row.vehicle_type || undefined,
    vehicleNumber: row.vehicle_number || undefined,
    pickupLocation: row.pickup_location || undefined,
    pickupCoords: row.pickup_coords && Object.keys(row.pickup_coords).length ? row.pickup_coords : undefined,
    deliveryLocation: row.delivery_location || undefined,
    deliveryCoords: row.delivery_coords && Object.keys(row.delivery_coords).length ? row.delivery_coords : undefined,
    waypoints: row.waypoints || [],
    optimizedRoute: row.optimized_route || [],
    distanceKm: row.distance_km != null ? Number(row.distance_km) : undefined,
    estimatedTimeMinutes: row.estimated_time_minutes != null ? Number(row.estimated_time_minutes) : undefined,
    status: row.status,
    assignedAt: row.assigned_at || undefined,
    pickedUpAt: row.picked_up_at || undefined,
    inTransitAt: row.in_transit_at || undefined,
    arrivedAt: row.arrived_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    pickupOtp: row.pickup_otp || undefined,
    deliveryOtp: row.delivery_otp || undefined,
    qrCode: row.qr_code || undefined,
    qrToken: row.qr_token || undefined,
    qrTokenHash: row.qr_token_hash || undefined,
    otpHash: row.otp_hash || undefined,
    otpExpiresAt: row.otp_expires_at || undefined,
    currentLatitude: row.current_latitude != null ? Number(row.current_latitude) : undefined,
    currentLongitude: row.current_longitude != null ? Number(row.current_longitude) : undefined,
    isDemoRoute: row.is_demo_route,
    verifiedBy: row.verified_by || undefined,
    verifiedAt: row.verified_at || undefined,
    verificationStatus: row.verification_status,
    verificationMethod: row.verification_method || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getById(db, id) {
  const { rows } = await db.query(`SELECT ${COLS} FROM deliveries WHERE id=$1`, [id]);
  return rowToDelivery(rows[0]);
}

async function getByOrderId(db, orderId) {
  const { rows } = await db.query(`SELECT ${COLS} FROM deliveries WHERE order_id=$1`, [orderId]);
  return rowToDelivery(rows[0]);
}

async function listAll(db) {
  const { rows } = await db.query(`SELECT ${COLS} FROM deliveries ORDER BY created_at DESC`);
  return rows.map(rowToDelivery);
}

async function listForPartner(db, partnerId) {
  const { rows } = await db.query(
    `SELECT ${COLS} FROM deliveries WHERE logistics_partner_id=$1 ORDER BY created_at DESC`,
    [partnerId]
  );
  return rows.map(rowToDelivery);
}

const roundTo1 = (v) => Math.round(v * 10) / 10;
const roundTo0 = (v) => Math.round(v);

// createFromOrder mirrors deliveryService.ts createDelivery(), actually
// invoked (from orders.createNewOrder) for every order — fixing the
// original app's dead-code gap.
async function createFromOrder(db, p) {
  const id = util.newDeliveryID(p.orderId);

  let distanceKm = 45.0;
  let etaMinutes = 60.0;
  if (p.pickupCoords && p.deliveryCoords) {
    const haversine = util.calculateDistanceKm(
      p.pickupCoords.lat,
      p.pickupCoords.lng,
      p.deliveryCoords.lat,
      p.deliveryCoords.lng
    );
    distanceKm = roundTo1(haversine * 1.2);
    etaMinutes = roundTo0((distanceKm / 45) * 60);
  }

  const token = util.generateSecureToken();
  const tokenHash = util.hashSecret(token);
  const qrCode = util.generateDeliveryQRPayload(id, token);
  const otp = util.generateOTP();
  const otpHash = util.hashSecret(otp);

  let status = 'PENDING_ASSIGNMENT';
  let assignedAt = null;
  if (p.logisticsPartnerId) {
    status = 'ASSIGNED';
    assignedAt = new Date();
  }

  await db.query(
    `INSERT INTO deliveries (id, order_id, buyer_id, farmer_id, crop_name, quantity, unit,
        logistics_partner_id, logistics_partner_name, logistics_phone, vehicle_number,
        pickup_location, pickup_coords, delivery_location, delivery_coords,
        distance_km, estimated_time_minutes, status, assigned_at,
        delivery_otp, otp_hash, qr_code, qr_token, qr_token_hash, is_demo_route, verification_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,TRUE,'PENDING')`,
    [
      id,
      p.orderId,
      p.buyerId,
      p.farmerId,
      p.cropName,
      p.quantity,
      p.unit,
      p.logisticsPartnerId || '',
      p.logisticsPartnerName || '',
      p.logisticsPhone || '',
      p.vehicleNumber || '',
      p.pickupLocation || '',
      JSON.stringify(p.pickupCoords || {}),
      p.deliveryLocation || '',
      JSON.stringify(p.deliveryCoords || {}),
      distanceKm,
      etaMinutes,
      status,
      assignedAt,
      otp,
      otpHash,
      qrCode,
      token,
      tokenHash,
    ]
  );
  return getById(db, id);
}

async function appendOrderTimeline(db, orderId, status, note) {
  const entry = JSON.stringify({ status, timestamp: new Date().toISOString(), note: note || '' });
  await db.query(`UPDATE orders SET timeline = timeline || $2::jsonb WHERE id=$1`, [orderId, `[${entry}]`]);
}

function humanize(status) {
  switch (status) {
    case 'PICKED_UP':
      return 'picked up';
    case 'IN_TRANSIT':
      return 'in transit';
    case 'ARRIVED':
      return 'arriving now';
    default:
      return status;
  }
}

// updateStatus mirrors updateDeliveryStatus(): LOGISTICS/ADMIN only, direct
// transition to DELIVERED forbidden (must go through verify), transitions
// validated, per-status timestamps set, parent order synced.
async function updateStatus(db, deliveryId, newStatus, callerId, callerRole) {
  if (newStatus === 'DELIVERED') {
    throw new DeliveryError('direct transition to DELIVERED is forbidden — use the verify endpoint', 'BAD_REQUEST');
  }
  const d = await getById(db, deliveryId);
  if (!d) throw ErrNotFound();
  if (callerRole !== 'ADMIN' && d.logisticsPartnerId && d.logisticsPartnerId !== callerId) {
    throw ErrForbidden();
  }
  if (!isValidTransition(d.status, newStatus)) throw ErrInvalidTransition();

  const timestampCol = { ASSIGNED: 'assigned_at', PICKED_UP: 'picked_up_at', IN_TRANSIT: 'in_transit_at', ARRIVED: 'arrived_at' }[
    newStatus
  ];

  if (timestampCol) {
    if (newStatus === 'ARRIVED') {
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.query(
        `UPDATE deliveries SET status=$2, ${timestampCol}=now(), otp_expires_at=$3, updated_at=now() WHERE id=$1`,
        [deliveryId, newStatus, otpExpiresAt]
      );
    } else {
      await db.query(`UPDATE deliveries SET status=$2, ${timestampCol}=now(), updated_at=now() WHERE id=$1`, [
        deliveryId,
        newStatus,
      ]);
    }
  } else {
    await db.query(`UPDATE deliveries SET status=$2, updated_at=now() WHERE id=$1`, [deliveryId, newStatus]);
  }

  if (['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(newStatus)) {
    await appendOrderTimeline(db, d.orderId, newStatus, '');
    await db.query(`UPDATE orders SET status=$2, updated_at=now() WHERE id=$1`, [d.orderId, newStatus]);
    await notifications.create(db, d.buyerId, 'Delivery update', `Your order ${d.orderId} is now ${humanize(newStatus)}.`, 'ORDER', `/buyer/orders/${d.orderId}`);
    await notifications.create(db, d.farmerId, 'Delivery update', `Order ${d.orderId} is now ${humanize(newStatus)}.`, 'ORDER', `/farmer/orders/${d.orderId}`);
  }

  return getById(db, deliveryId);
}

// verifyAndComplete mirrors verifyAndCompleteDelivery()'s flow: role check,
// partner-assignment check, must be ARRIVED, anti-replay check, QR/OTP
// credential check (SHA-256 server-side), atomic transition to DELIVERED,
// parent order settlement sync, notifications.
async function verifyAndComplete(db, deliveryId, method, credential, callerId, callerRole) {
  if (callerRole !== 'LOGISTICS' && callerRole !== 'ADMIN') throw ErrForbidden();
  const d = await getById(db, deliveryId);
  if (!d) throw ErrNotFound();
  if (callerRole !== 'ADMIN' && d.logisticsPartnerId !== callerId) throw ErrForbidden();
  if (d.status !== 'ARRIVED') throw ErrNotArrived();
  if (d.verificationStatus === 'VERIFIED') throw ErrAlreadyVerified();

  let ok = false;
  if (method === 'QR') {
    const parsed = util.parseDeliveryQRPayload(credential);
    const candidate = parsed.ok ? parsed.token : credential;
    if (util.hashSecret(candidate) === d.qrTokenHash || candidate === d.qrToken) ok = true;
  } else if (method === 'OTP') {
    if (d.otpExpiresAt && new Date() > new Date(d.otpExpiresAt)) {
      throw new DeliveryError('OTP has expired — ask the driver to refresh it on arrival', 'BAD_REQUEST');
    }
    if (util.hashSecret(credential) === d.otpHash || credential === d.deliveryOtp) ok = true;
  } else {
    throw new DeliveryError('method must be QR or OTP', 'BAD_REQUEST');
  }
  if (!ok) throw ErrBadCredential();

  const now = new Date();
  await db.query(
    `UPDATE deliveries SET status='DELIVERED', delivered_at=$2, verification_status='VERIFIED',
        verification_method=$3, verified_by=$4, verified_at=$2, updated_at=now()
     WHERE id=$1`,
    [deliveryId, now, method, callerId]
  );

  await appendOrderTimeline(db, d.orderId, 'DELIVERED', `Verified via ${method}`);
  await db.query(
    `UPDATE orders SET status='DELIVERED', payment_status='RELEASED_TO_FARMER',
        settlement_status='READY_FOR_SETTLEMENT', verified_at=$2, verified_by=$3,
        verification_method=$4, delivered_at=$2, updated_at=now()
     WHERE id=$1`,
    [d.orderId, now, callerId, method]
  );

  await notifications.create(db, d.buyerId, 'Delivery completed', `Your order ${d.orderId} has been delivered and verified.`, 'ORDER', `/buyer/orders/${d.orderId}`);
  await notifications.create(db, d.farmerId, 'Payment released', `Order ${d.orderId} was delivered — payment has been released to you.`, 'ORDER', `/farmer/orders/${d.orderId}`);
  await notifications.create(db, callerId, 'Delivery verified', `You verified delivery for order ${d.orderId}.`, 'DELIVERY', `/logistics/deliveries/${deliveryId}`);

  return getById(db, deliveryId);
}

async function assign(db, deliveryId, partnerId, partnerName, partnerPhone, vehicleNumber) {
  await db.query(
    `UPDATE deliveries SET logistics_partner_id=$2, logistics_partner_name=$3, logistics_phone=$4,
        vehicle_number=$5, status='ASSIGNED', assigned_at=now(), updated_at=now()
     WHERE id=$1`,
    [deliveryId, partnerId, partnerName, partnerPhone, vehicleNumber]
  );
  return getById(db, deliveryId);
}

async function updateLocation(db, deliveryId, lat, lng) {
  await db.query(`UPDATE deliveries SET current_latitude=$2, current_longitude=$3, updated_at=now() WHERE id=$1`, [
    deliveryId,
    lat,
    lng,
  ]);
}

function handleErr(res, err) {
  if (err instanceof DeliveryError) {
    const status = { NOT_FOUND: 404, FORBIDDEN: 403, BAD_REQUEST: 400 }[err.code] || 500;
    writeError(res, status, err.message);
    return true;
  }
  return false;
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const partnerId = req.query.partnerId;
      if (!partnerId && req.role === 'ADMIN') {
        return res.json(await listAll(db));
      }
      res.json(await listForPartner(db, partnerId || req.userId));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const d = await getById(db, req.params.id);
      if (!d) return writeError(res, 404, 'delivery not found');
      res.json(d);
    })
  );

  router.patch(
    '/:id/status',
    requireRole('LOGISTICS'),
    asyncHandler(async (req, res) => {
      try {
        const d = await updateStatus(db, req.params.id, req.body.status, req.userId, req.role);
        hub.emit('vayora_deliveries_updated');
        hub.emit('vayora_orders_updated');
        hub.emit('vayora_notifs_updated');
        res.json(d);
      } catch (err) {
        if (!handleErr(res, err)) throw err;
      }
    })
  );

  router.post(
    '/:id/verify',
    requireRole('LOGISTICS'),
    asyncHandler(async (req, res) => {
      try {
        const d = await verifyAndComplete(db, req.params.id, req.body.method, req.body.credential, req.userId, req.role);
        hub.emit('vayora_deliveries_updated');
        hub.emit('vayora_orders_updated');
        hub.emit('vayora_notifs_updated');
        res.json(d);
      } catch (err) {
        if (!handleErr(res, err)) throw err;
      }
    })
  );

  router.patch(
    '/:id/location',
    requireRole('LOGISTICS'),
    asyncHandler(async (req, res) => {
      await updateLocation(db, req.params.id, req.body.latitude, req.body.longitude);
      hub.emit('vayora_deliveries_updated');
      res.json({ success: true });
    })
  );

  return router;
}

module.exports = {
  getById,
  getByOrderId,
  listAll,
  listForPartner,
  createFromOrder,
  updateStatus,
  verifyAndComplete,
  assign,
  updateLocation,
  buildRouter,
};
