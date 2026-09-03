// Owns the Postgres connection pool and idempotent schema migration. Raw
// SQL via `pg` — deliberately no ORM, mirroring the Go version's
// database/sql + lib/pq approach and its reasoning (full control over the
// JSONB columns, zero reflection/mapping overhead on hot query paths like
// the marketplace browse and matching engine).
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// connect opens the pool, retries the initial ping (docker-compose can start
// the api container slightly before postgres finishes accepting
// connections), then applies the schema. Safe to call on every boot —
// CREATE TABLE IF NOT EXISTS means a second run is a no-op.
async function connect(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 25,
    idleTimeoutMillis: 30 * 60 * 1000,
  });

  let lastErr;
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      console.log(`db: waiting for postgres (attempt ${i + 1}/10): ${err.message}`);
      await sleep(2000);
    }
  }
  if (lastErr) {
    throw new Error(`ping db after retries: ${lastErr.message}`);
  }

  await pool.query(schemaSQL);
  console.log('db: connected and schema is up to date');
  return pool;
}

module.exports = { connect };
