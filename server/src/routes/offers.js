// Ports internal/offers/*.go (src/services/offerService.ts). Stock is
// deducted exactly once, inside orders.createNewOrder (called here on
// ACCEPTED) — never here — avoiding the original app's double-deduction
// risk (offerService.ts deducted on ACCEPTED, then orderService.ts's
// fallback path deducted again).
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');
const util = require('../util');
const notifications = require('./notifications');
const produce = require('./produce');

class OfferError extends Error {}
const ErrNotFound = () => new OfferError('offer not found');

const COLS = `id, produce_id, crop_name, farmer_id, buyer_id, buyer_name, buyer_organization, buyer_phone,
  offered_price, quantity, requested_quantity, total_offered_amount, message, status, counter_price,
  distance_km, created_at, updated_at`;

function rowToOffer(row) {
  if (!row) return null;
  return {
    id: row.id,
    produceId: row.produce_id,
    cropName: row.crop_name,
    farmerId: row.farmer_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerOrganization: row.buyer_organization || undefined,
    buyerPhone: row.buyer_phone || undefined,
    offeredPrice: Number(row.offered_price),
    quantity: Number(row.quantity),
    requestedQuantity: Number(row.requested_quantity),
    totalOfferedAmount: Number(row.total_offered_amount),
    message: row.message || undefined,
    status: row.status,
    counterPrice: row.counter_price != null ? Number(row.counter_price) : undefined,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getById(db, id) {
  const { rows } = await db.query(`SELECT ${COLS} FROM offers WHERE id=$1`, [id]);
  return rowToOffer(rows[0]);
}

async function listByFarmer(db, farmerId) {
  const { rows } = await db.query(`SELECT ${COLS} FROM offers WHERE farmer_id=$1 ORDER BY created_at DESC`, [farmerId]);
  return rows.map(rowToOffer);
}

async function listByBuyer(db, buyerId) {
  const { rows } = await db.query(`SELECT ${COLS} FROM offers WHERE buyer_id=$1 ORDER BY created_at DESC`, [buyerId]);
  return rows.map(rowToOffer);
}

// create mirrors createOffer(): computes totalOfferedAmount, carries a
// placeholder distanceKm (real distance is only known once a concrete
// delivery route exists — the original hardcodes 125 here too), notifies
// the farmer.
async function create(db, input) {
  const p = await produce.getById(db, input.produceId);
  if (!p) throw new OfferError('produce not found');
  const id = util.newOfferID();
  const totalOfferedAmount = util.round2(input.offeredPrice * input.quantity);

  await db.query(
    `INSERT INTO offers (id, produce_id, crop_name, farmer_id, buyer_id, buyer_name, buyer_organization,
        buyer_phone, offered_price, quantity, requested_quantity, total_offered_amount, message,
        status, distance_km)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,'PENDING',125)`,
    [
      id,
      input.produceId,
      p.cropName,
      p.farmerId,
      input.buyerId,
      input.buyerName,
      input.buyerOrganization || '',
      input.buyerPhone || '',
      input.offeredPrice,
      input.quantity,
      totalOfferedAmount,
      input.message || '',
    ]
  );

  await notifications.create(
    db,
    p.farmerId,
    'New offer received',
    `${input.buyerName} offered ₹${input.offeredPrice}/${p.unit} for ${input.quantity} ${p.unit} of ${p.cropName}`,
    'OFFER',
    `/farmer/offers/${id}`
  );

  return getById(db, id);
}

// The original hardcodes a fallback buyer phone and a Mumbai APMC delivery
// destination when the buyer hasn't supplied their own delivery details yet.
const FALLBACK_BUYER_PHONE = '+91 98234 11223';
const FALLBACK_DELIVERY_ADDR = 'Mumbai APMC Facility';
const FALLBACK_DELIVERY_LAT = 19.076;
const FALLBACK_DELIVERY_LNG = 72.8777;

// updateStatus mirrors updateOfferStatus(): on ACCEPTED, creates the order
// (which itself deducts stock and creates the delivery) and notifies the
// buyer; on REJECTED, notifies the buyer only; COUNTERED just updates the
// counter price. Returns { offer, order } — order is null unless this call
// caused one to be created.
async function updateStatus(db, id, newStatus, counterPrice) {
  // orders is required lazily to avoid a require() cycle (orders.js doesn't
  // import offers.js, so this is safe, but keeping it lazy mirrors the
  // acyclic-dependency discipline of the Go packages this was ported from).
  const orders = require('./orders');

  let o = await getById(db, id);
  if (!o) throw ErrNotFound();

  if (newStatus === 'COUNTERED') {
    await db.query(`UPDATE offers SET status=$2, counter_price=$3, updated_at=now() WHERE id=$1`, [id, newStatus, counterPrice]);
    o = await getById(db, id);
    return { offer: o, order: null };
  }

  await db.query(`UPDATE offers SET status=$2, updated_at=now() WHERE id=$1`, [id, newStatus]);

  let order = null;
  if (newStatus === 'ACCEPTED') {
    const p = await produce.getById(db, o.produceId);
    if (!p) throw new OfferError('produce not found');
    const buyerPhone = o.buyerPhone || FALLBACK_BUYER_PHONE;
    order = await orders.createNewOrder(db, {
      buyerId: o.buyerId,
      buyerName: o.buyerName,
      buyerPhone,
      buyerOrganization: o.buyerOrganization,
      farmerId: o.farmerId,
      farmerName: p.farmerName,
      farmerPhone: p.farmerPhone,
      farmerType: p.farmerType,
      produceId: o.produceId,
      cropName: o.cropName,
      quantity: o.quantity,
      unit: p.unit,
      verifiedPricePerUnit: o.offeredPrice,
      deliveryAddress: FALLBACK_DELIVERY_ADDR,
      deliveryCoords: { lat: FALLBACK_DELIVERY_LAT, lng: FALLBACK_DELIVERY_LNG, address: FALLBACK_DELIVERY_ADDR },
    });
    await notifications.create(db, o.buyerId, 'Offer accepted!', `Your offer for ${o.cropName} was accepted. Order ${order.id} has been placed.`, 'OFFER', `/buyer/orders/${order.id}`);
  } else if (newStatus === 'REJECTED') {
    await notifications.create(db, o.buyerId, 'Offer declined', `Your offer for ${o.cropName} was declined by the farmer.`, 'OFFER', '/buyer/marketplace');
  }

  o = await getById(db, id);
  return { offer: o, order };
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const items = req.role === 'BUYER' ? await listByBuyer(db, req.userId) : await listByFarmer(db, req.userId);
      res.json(items);
    })
  );

  router.post(
    '/',
    requireRole('BUYER'),
    asyncHandler(async (req, res) => {
      const input = { ...req.body, buyerId: req.userId };
      const o = await create(db, input);
      hub.emit('vayora_offers_updated');
      hub.emit('vayora_notifs_updated');
      res.status(201).json(o);
    })
  );

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      try {
        const { offer, order } = await updateStatus(db, req.params.id, req.body.status, req.body.counterPrice);
        hub.emit('vayora_offers_updated');
        hub.emit('vayora_notifs_updated');
        if (order) {
          hub.emit('vayora_orders_updated');
          hub.emit('vayora_produce_updated');
          hub.emit('vayora_deliveries_updated');
        }
        res.json({ offer, order });
      } catch (err) {
        if (err instanceof OfferError && err.message === 'offer not found') {
          return writeError(res, 404, 'offer not found');
        }
        throw err;
      }
    })
  );

  return router;
}

module.exports = { getById, listByFarmer, listByBuyer, create, updateStatus, buildRouter };
