// Populates a fresh database with demo accounts and listings so a tester
// can log in immediately. Safe to re-run — every insert is
// ON CONFLICT DO NOTHING/UPDATE. Ported 1:1 from cmd/seed/main.go.
//
// Seeded accounts (all use the TOTP login flow — request a code for the
// phone below; the server prints the current code directly in dev mode, no
// authenticator app required for testing):
//
//   ADMIN      +91 90000 00001
//   FARMER     +91 90000 00002  (Ramesh — Nashik, tomatoes + onions)
//   FPO        +91 90000 00003  (Deccan Farmers FPO — Pune, wheat)
//   BUYER      +91 90000 00004  (Anita — Mumbai)
//   LOGISTICS  +91 99887 76655  (Kisan Express — matches the demo partner
//              baked into every order/delivery: user_logistics_ekart)
const config = require('../src/config');
const db = require('../src/db');

async function seedUser(pool, id, name, phone, role, org, location, lat, lng, vehicleType, vehicleCap) {
  try {
    await pool.query(
      `INSERT INTO users (id, name, phone, role, organization_name, location, latitude, longitude,
          verified, vehicle_type, vehicle_capacity, availability_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,'AVAILABLE')
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, organization_name=EXCLUDED.organization_name,
          location=EXCLUDED.location, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
          vehicle_type=EXCLUDED.vehicle_type, vehicle_capacity=EXCLUDED.vehicle_capacity`,
      [id, name, phone, role, org, location, lat, lng, vehicleType, vehicleCap]
    );
  } catch (err) {
    console.error(`seed user ${id}: ${err.message}`);
  }
}

async function seedProduce(pool, id, farmerId, farmerName, farmerType, cropName, category, qty, unit, grade, price, location, lat, lng) {
  try {
    await pool.query(
      `INSERT INTO produce (id, farmer_id, farmer_name, farmer_type, crop_name, category, quantity,
          available_quantity, unit, quality_grade, expected_price, location, latitude, longitude, status,
          verified_seller)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,'ACTIVE',TRUE)
       ON CONFLICT (id) DO UPDATE SET quantity=EXCLUDED.quantity, available_quantity=EXCLUDED.available_quantity,
          expected_price=EXCLUDED.expected_price`,
      [id, farmerId, farmerName, farmerType, cropName, category, qty, unit, grade, price, location, lat, lng]
    );
  } catch (err) {
    console.error(`seed produce ${id}: ${err.message}`);
  }
}

async function main() {
  const pool = await db.connect(config.databaseUrl);

  await seedUser(pool, 'usr_admin_demo', 'VAYORA Admin', '+919000000001', 'ADMIN', '', 'Mumbai', 19.076, 72.8777, '', 0);
  await seedUser(pool, 'usr_farmer_demo', 'Ramesh Patil', '+919000000002', 'FARMER', '', 'Nashik', 19.9975, 73.7898, '', 0);
  await seedUser(pool, 'usr_fpo_demo', 'Deccan Farmers FPO', '+919000000003', 'FPO', 'Deccan Farmers Producer Company', 'Pune', 18.5204, 73.8567, '', 0);
  await seedUser(pool, 'usr_buyer_demo', 'Anita Sharma', '+919000000004', 'BUYER', 'Sharma Wholesale Traders', 'Mumbai', 19.076, 72.8777, '', 0);
  await seedUser(pool, 'user_logistics_ekart', 'Suresh (Kisan Express)', '+919988776655', 'LOGISTICS', 'Kisan Express Agri-Logistics', 'Nashik', 19.9975, 73.7898, 'Refrigerated Truck 1.5T', 1500);

  await seedProduce(pool, 'prod_demo_tomato', 'usr_farmer_demo', 'Ramesh Patil', 'FARMER', 'Tomato', 'VEGETABLE', 1200, 'kg', 'A', 18, 'Nashik', 19.9975, 73.7898);
  await seedProduce(pool, 'prod_demo_onion', 'usr_farmer_demo', 'Ramesh Patil', 'FARMER', 'Onion', 'VEGETABLE', 2000, 'kg', 'B', 14, 'Nashik', 19.9975, 73.7898);
  await seedProduce(pool, 'prod_demo_wheat', 'usr_fpo_demo', 'Deccan Farmers FPO', 'FPO', 'Wheat', 'GRAIN', 5000, 'kg', 'A', 24, 'Pune', 18.5204, 73.8567);

  console.log('seed: complete. Demo phone numbers are documented in scripts/seed.js\'s header comment.');
  await pool.end();
}

main().catch((err) => {
  console.error('seed: fatal error:', err);
  process.exit(1);
});
