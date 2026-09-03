// Data-access + business layer for produce listings, mirroring
// internal/produce/*.go (itself a port of src/services/produceService.ts).
// Postgres is the single source of truth — no localStorage fallback.
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');
const util = require('../util');

const ErrInsufficientStock = new Error('insufficient available quantity');

const COLS = `id, farmer_id, farmer_name, farmer_phone, farmer_type, organization_name, crop_name, variety,
  category, quantity, available_quantity, unit, quality_grade, expected_price, ai_recommended_price,
  ai_minimum_price, ai_maximum_price, mandi_benchmark_price, demand_level, demand_forecast, ai_explanation,
  harvest_date, expiry_date, location, latitude, longitude, images, status, organic_certified,
  verified_seller, created_at, updated_at`;

function rowToProduce(row) {
  if (!row) return null;
  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmerPhone: row.farmer_phone || undefined,
    farmerType: row.farmer_type,
    organizationName: row.organization_name || undefined,
    cropName: row.crop_name,
    variety: row.variety || undefined,
    category: row.category,
    quantity: Number(row.quantity),
    availableQuantity: Number(row.available_quantity),
    unit: row.unit,
    qualityGrade: row.quality_grade,
    expectedPrice: Number(row.expected_price),
    aiRecommendedPrice: row.ai_recommended_price != null ? Number(row.ai_recommended_price) : undefined,
    aiMinimumPrice: row.ai_minimum_price != null ? Number(row.ai_minimum_price) : undefined,
    aiMaximumPrice: row.ai_maximum_price != null ? Number(row.ai_maximum_price) : undefined,
    mandiBenchmarkPrice: row.mandi_benchmark_price != null ? Number(row.mandi_benchmark_price) : undefined,
    demandLevel: row.demand_level || undefined,
    demandForecast: row.demand_forecast || [],
    aiExplanation: row.ai_explanation || undefined,
    harvestDate: row.harvest_date || undefined,
    expiryDate: row.expiry_date || undefined,
    location: row.location,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    images: row.images || [],
    status: row.status,
    organicCertified: row.organic_certified,
    verifiedSeller: row.verified_seller,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getById(db, id) {
  const { rows } = await db.query(`SELECT ${COLS} FROM produce WHERE id=$1`, [id]);
  return rowToProduce(rows[0]);
}

async function listByFarmer(db, farmerId) {
  const { rows } = await db.query(`SELECT ${COLS} FROM produce WHERE farmer_id=$1 ORDER BY created_at DESC`, [farmerId]);
  return rows.map(rowToProduce);
}

async function listAll(db) {
  const { rows } = await db.query(`SELECT ${COLS} FROM produce ORDER BY created_at DESC`);
  return rows.map(rowToProduce);
}

async function listActive(db) {
  const { rows } = await db.query(
    `SELECT ${COLS} FROM produce WHERE status = 'ACTIVE' AND available_quantity > 0 ORDER BY created_at DESC`
  );
  return rows.map(rowToProduce);
}

async function create(db, id, input) {
  const images = JSON.stringify(input.images || []);
  await db.query(
    `INSERT INTO produce (id, farmer_id, farmer_name, farmer_phone, farmer_type, organization_name,
        crop_name, variety, category, quantity, available_quantity, unit, quality_grade, expected_price,
        harvest_date, expiry_date, location, latitude, longitude, images, organic_certified, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'ACTIVE')`,
    [
      id,
      input.farmerId,
      input.farmerName,
      input.farmerPhone || '',
      input.farmerType,
      input.organizationName || '',
      input.cropName,
      input.variety || '',
      input.category,
      input.quantity,
      input.unit,
      input.qualityGrade,
      input.expectedPrice,
      input.harvestDate || '',
      input.expiryDate || '',
      input.location || '',
      input.latitude || 0,
      input.longitude || 0,
      images,
      !!input.organicCertified,
    ]
  );
  return getById(db, id);
}

async function update(db, id, input) {
  await db.query(
    `UPDATE produce SET crop_name=$2, variety=$3, category=$4, quantity=$5, unit=$6, quality_grade=$7,
        expected_price=$8, harvest_date=$9, expiry_date=$10, location=$11, latitude=$12, longitude=$13,
        organic_certified=$14, updated_at=now()
     WHERE id=$1`,
    [
      id,
      input.cropName,
      input.variety || '',
      input.category,
      input.quantity,
      input.unit,
      input.qualityGrade,
      input.expectedPrice,
      input.harvestDate || '',
      input.expiryDate || '',
      input.location || '',
      input.latitude || 0,
      input.longitude || 0,
      !!input.organicCertified,
    ]
  );
  return getById(db, id);
}

async function updateStatus(db, id, status) {
  await db.query(`UPDATE produce SET status=$2, updated_at=now() WHERE id=$1`, [id, status]);
}

async function remove(db, id) {
  await db.query(`DELETE FROM produce WHERE id=$1`, [id]);
}

// deductQuantity mirrors DeductQuantity() — atomically decrements
// available_quantity and flips status to SOLD_OUT at zero. Used by exactly
// one call site: orders.createNewOrder (single deduction, no double-count).
async function deductQuantity(db, id, qty) {
  const { rowCount } = await db.query(
    `UPDATE produce SET
        available_quantity = available_quantity - $2,
        status = CASE WHEN available_quantity - $2 <= 0 THEN 'SOLD_OUT' ELSE status END,
        updated_at = now()
     WHERE id=$1 AND available_quantity >= $2`,
    [id, qty]
  );
  if (rowCount === 0) throw ErrInsufficientStock;
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      let farmerId = req.query.farmerId;
      if (!farmerId && req.role === 'ADMIN') {
        // Admin dashboards want the full system-wide list, not "produce
        // belonging to the admin user" (which is always empty).
        return res.json(await listAll(db));
      }
      if (!farmerId) farmerId = req.userId;
      res.json(await listByFarmer(db, farmerId));
    })
  );

  router.post(
    '/',
    requireRole('FARMER', 'FPO'),
    asyncHandler(async (req, res) => {
      const input = { ...req.body, farmerId: req.userId };
      const id = util.newProduceID();
      const p = await create(db, id, input);
      hub.emit('vayora_produce_updated');
      res.status(201).json(p);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const p = await getById(db, req.params.id);
      if (!p) return writeError(res, 404, 'produce not found');
      res.json(p);
    })
  );

  router.put(
    '/:id',
    requireRole('FARMER', 'FPO'),
    asyncHandler(async (req, res) => {
      const existing = await getById(db, req.params.id);
      if (!existing) return writeError(res, 404, 'produce not found');
      if (existing.farmerId !== req.userId && req.role !== 'ADMIN') {
        return writeError(res, 403, 'not your listing');
      }
      const p = await update(db, req.params.id, req.body);
      hub.emit('vayora_produce_updated');
      res.json(p);
    })
  );

  router.delete(
    '/:id',
    requireRole('FARMER', 'FPO'),
    asyncHandler(async (req, res) => {
      const existing = await getById(db, req.params.id);
      if (!existing) return writeError(res, 404, 'produce not found');
      if (existing.farmerId !== req.userId && req.role !== 'ADMIN') {
        return writeError(res, 403, 'not your listing');
      }
      await remove(db, req.params.id);
      hub.emit('vayora_produce_updated');
      res.json({ success: true });
    })
  );

  return router;
}

module.exports = {
  rowToProduce,
  getById,
  listByFarmer,
  listAll,
  listActive,
  create,
  update,
  updateStatus,
  remove,
  deductQuantity,
  ErrInsufficientStock,
  buildRouter,
};
