// Shared data-access layer for the users table (auth, admin user
// management) plus its admin-only HTTP routes. Mirrors internal/users/*.go.
const express = require('express');
const { writeError, asyncHandler, requireRole } = require('../middleware');

const SELECT_COLS = `id, name, phone, email, role, organization_name, location, latitude, longitude,
  verified, avatar, rating, total_deals, vehicle_type, vehicle_capacity, availability_status,
  current_latitude, current_longitude, created_at`;

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    role: row.role,
    organizationName: row.organization_name || undefined,
    location: row.location,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    verified: row.verified,
    avatar: row.avatar || undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    totalDeals: row.total_deals != null ? Number(row.total_deals) : undefined,
    vehicleType: row.vehicle_type || undefined,
    vehicleCapacity: row.vehicle_capacity != null ? Number(row.vehicle_capacity) : undefined,
    availabilityStatus: row.availability_status || undefined,
    currentLatitude: row.current_latitude != null ? Number(row.current_latitude) : undefined,
    currentLongitude: row.current_longitude != null ? Number(row.current_longitude) : undefined,
    createdAt: row.created_at,
  };
}

async function getById(db, id) {
  const { rows } = await db.query(`SELECT ${SELECT_COLS} FROM users WHERE id = $1`, [id]);
  return rowToUser(rows[0]);
}

async function getByPhone(db, phone) {
  const { rows } = await db.query(`SELECT ${SELECT_COLS} FROM users WHERE phone = $1`, [phone]);
  return rowToUser(rows[0]);
}

// create mirrors authService.ts createUserProfileInFirestore. The caller
// (auth route) is responsible for the ADMIN->FARMER self-registration
// downgrade rule.
async function create(db, input) {
  const id = input.uid;
  await db.query(
    `INSERT INTO users (id, name, phone, email, role, organization_name, location, latitude, longitude,
        vehicle_type, vehicle_capacity, verified, availability_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, TRUE, 'AVAILABLE')
     ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, role = EXCLUDED.role, email = EXCLUDED.email,
        organization_name = EXCLUDED.organization_name, location = EXCLUDED.location,
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        vehicle_type = EXCLUDED.vehicle_type, vehicle_capacity = EXCLUDED.vehicle_capacity,
        updated_at = now()`,
    [
      id,
      input.name,
      input.phone,
      input.email || '',
      input.role,
      input.organizationName || '',
      input.location || '',
      input.latitude || 0,
      input.longitude || 0,
      input.vehicleType || '',
      input.vehicleCapacity || 0,
    ]
  );
  return getById(db, id);
}

async function setVerification(db, id, verified) {
  await db.query(`UPDATE users SET verified=$2, updated_at=now() WHERE id=$1`, [id, verified]);
}

async function listAll(db) {
  const { rows } = await db.query(`SELECT ${SELECT_COLS} FROM users ORDER BY created_at DESC`);
  return rows.map(rowToUser);
}

async function listByRole(db, role) {
  const { rows } = await db.query(`SELECT ${SELECT_COLS} FROM users WHERE role = $1 ORDER BY created_at DESC`, [role]);
  return rows.map(rowToUser);
}

function buildRouter(db) {
  const router = express.Router();

  // List returns every registered user — mirrors getAllRegisteredUsers(),
  // used by the Admin dashboard's user table. Admin-only.
  router.get(
    '/',
    requireRole('ADMIN'),
    asyncHandler(async (req, res) => {
      const role = req.query.role;
      const out = role ? await listByRole(db, role) : await listAll(db);
      res.json(out);
    })
  );

  // Admin-only. Registered before the /:id catch-all so it matches first.
  router.patch(
    '/:id/verify',
    requireRole('ADMIN'),
    asyncHandler(async (req, res) => {
      await setVerification(db, req.params.id, !!req.body.verified);
      const u = await getById(db, req.params.id);
      res.json(u);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const u = await getById(db, req.params.id);
      if (!u) return writeError(res, 404, 'user not found');
      res.json(u);
    })
  );

  return router;
}

module.exports = { rowToUser, getById, getByPhone, create, setVerification, listAll, listByRole, buildRouter };
