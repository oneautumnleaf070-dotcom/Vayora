-- VAYORA schema. Run idempotently at startup (CREATE TABLE IF NOT EXISTS) so
-- `docker compose up` always converges to the right shape with zero manual
-- migration steps for the hackathon judges / a fresh clone.

CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL UNIQUE,
  email                TEXT NOT NULL DEFAULT '',
  role                 TEXT NOT NULL,
  organization_name    TEXT NOT NULL DEFAULT '',
  location             TEXT NOT NULL DEFAULT '',
  latitude             DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude            DOUBLE PRECISION NOT NULL DEFAULT 0,
  verified             BOOLEAN NOT NULL DEFAULT TRUE,
  avatar               TEXT NOT NULL DEFAULT '',
  rating               DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  total_deals          INTEGER NOT NULL DEFAULT 0,
  vehicle_type         TEXT NOT NULL DEFAULT '',
  vehicle_capacity     DOUBLE PRECISION NOT NULL DEFAULT 0,
  availability_status  TEXT NOT NULL DEFAULT 'AVAILABLE',
  current_latitude     DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_longitude    DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Node/Express rebuild: login moved from mock-SMS-OTP to TOTP (RFC 6238,
-- Google-Authenticator-style). One row per phone number holding its base32
-- secret; `confirmed` flips true the first time a code from that secret is
-- verified. Kept keyed by phone (not by user id) so a brand-new phone number
-- can set up its authenticator *before* a user row exists for it (during
-- registration) — the same order of operations the old mock-OTP challenge
-- table supported.
CREATE TABLE IF NOT EXISTS totp_secrets (
  phone       TEXT PRIMARY KEY,
  secret      TEXT NOT NULL,
  confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produce (
  id                    TEXT PRIMARY KEY,
  farmer_id             TEXT NOT NULL REFERENCES users(id),
  farmer_name           TEXT NOT NULL,
  farmer_phone          TEXT NOT NULL DEFAULT '',
  farmer_type           TEXT NOT NULL,
  organization_name     TEXT NOT NULL DEFAULT '',
  crop_name             TEXT NOT NULL,
  variety               TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL,
  quantity              DOUBLE PRECISION NOT NULL,
  available_quantity    DOUBLE PRECISION NOT NULL,
  unit                  TEXT NOT NULL,
  quality_grade         TEXT NOT NULL,
  expected_price        DOUBLE PRECISION NOT NULL,
  ai_recommended_price  DOUBLE PRECISION,
  ai_minimum_price      DOUBLE PRECISION,
  ai_maximum_price      DOUBLE PRECISION,
  mandi_benchmark_price DOUBLE PRECISION,
  demand_level          TEXT NOT NULL DEFAULT 'MEDIUM',
  demand_forecast       JSONB NOT NULL DEFAULT '[]',
  ai_explanation        TEXT NOT NULL DEFAULT '',
  harvest_date          TEXT NOT NULL DEFAULT '',
  expiry_date           TEXT NOT NULL DEFAULT '',
  location              TEXT NOT NULL DEFAULT '',
  latitude              DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude             DOUBLE PRECISION NOT NULL DEFAULT 0,
  images                JSONB NOT NULL DEFAULT '[]',
  status                TEXT NOT NULL DEFAULT 'ACTIVE',
  organic_certified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_seller       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produce_farmer ON produce(farmer_id);
CREATE INDEX IF NOT EXISTS idx_produce_status ON produce(status);

CREATE TABLE IF NOT EXISTS offers (
  id                    TEXT PRIMARY KEY,
  produce_id            TEXT NOT NULL REFERENCES produce(id),
  crop_name             TEXT NOT NULL,
  farmer_id             TEXT NOT NULL REFERENCES users(id),
  buyer_id              TEXT NOT NULL REFERENCES users(id),
  buyer_name            TEXT NOT NULL,
  buyer_organization    TEXT NOT NULL DEFAULT '',
  buyer_phone           TEXT NOT NULL DEFAULT '',
  offered_price         DOUBLE PRECISION NOT NULL,
  quantity              DOUBLE PRECISION NOT NULL,
  requested_quantity    DOUBLE PRECISION NOT NULL,
  total_offered_amount  DOUBLE PRECISION NOT NULL,
  message               TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'PENDING',
  counter_price         DOUBLE PRECISION,
  distance_km           DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offers_farmer ON offers(farmer_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);

CREATE TABLE IF NOT EXISTS orders (
  id                     TEXT PRIMARY KEY,
  buyer_id               TEXT NOT NULL REFERENCES users(id),
  buyer_name             TEXT NOT NULL,
  buyer_phone            TEXT NOT NULL DEFAULT '',
  buyer_organization     TEXT NOT NULL DEFAULT '',
  farmer_id              TEXT NOT NULL,
  farmer_name            TEXT NOT NULL,
  farmer_phone           TEXT NOT NULL DEFAULT '',
  farmer_type            TEXT NOT NULL DEFAULT '',
  produce_id             TEXT NOT NULL DEFAULT '',
  crop_name              TEXT NOT NULL,
  quantity               DOUBLE PRECISION NOT NULL,
  unit                   TEXT NOT NULL,
  price_per_unit         DOUBLE PRECISION NOT NULL,
  produce_amount         DOUBLE PRECISION NOT NULL,
  logistics_fee          DOUBLE PRECISION NOT NULL,
  platform_fee           DOUBLE PRECISION NOT NULL,
  total_amount           DOUBLE PRECISION NOT NULL,
  delivery_address       TEXT NOT NULL DEFAULT '',
  delivery_latitude      DOUBLE PRECISION,
  delivery_longitude     DOUBLE PRECISION,
  pickup_location        TEXT NOT NULL DEFAULT '',
  delivery_location      TEXT NOT NULL DEFAULT '',
  pickup_coords          JSONB NOT NULL DEFAULT '{}',
  delivery_coords        JSONB NOT NULL DEFAULT '{}',
  logistics_partner_id   TEXT NOT NULL DEFAULT '',
  logistics_partner_name TEXT NOT NULL DEFAULT '',
  logistics_phone        TEXT NOT NULL DEFAULT '',
  vehicle_number         TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'PAYMENT_CONFIRMED',
  payment_status         TEXT NOT NULL DEFAULT 'PAID',
  delivery_otp           TEXT NOT NULL,
  pickup_otp             TEXT NOT NULL DEFAULT '',
  qr_code                TEXT NOT NULL DEFAULT '',
  is_bulk_order          BOOLEAN NOT NULL DEFAULT FALSE,
  bulk_suppliers         JSONB NOT NULL DEFAULT '[]',
  timeline               JSONB NOT NULL DEFAULT '[]',
  settlement_status      TEXT,
  verified_at            TIMESTAMPTZ,
  verified_by            TEXT,
  verification_method    TEXT,
  delivered_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_logistics ON orders(logistics_partner_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id                      TEXT PRIMARY KEY,
  order_id                TEXT NOT NULL REFERENCES orders(id),
  buyer_id                TEXT NOT NULL DEFAULT '',
  farmer_id               TEXT NOT NULL DEFAULT '',
  crop_name               TEXT NOT NULL DEFAULT '',
  quantity                DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit                    TEXT NOT NULL DEFAULT '',
  logistics_partner_id    TEXT NOT NULL DEFAULT '',
  logistics_partner_name  TEXT NOT NULL DEFAULT '',
  logistics_phone         TEXT NOT NULL DEFAULT '',
  driver_name             TEXT NOT NULL DEFAULT '',
  driver_phone            TEXT NOT NULL DEFAULT '',
  vehicle_type            TEXT NOT NULL DEFAULT '',
  vehicle_number          TEXT NOT NULL DEFAULT '',
  pickup_location         TEXT NOT NULL DEFAULT '',
  pickup_latitude         DOUBLE PRECISION,
  pickup_longitude        DOUBLE PRECISION,
  pickup_coords           JSONB NOT NULL DEFAULT '{}',
  delivery_location       TEXT NOT NULL DEFAULT '',
  delivery_latitude       DOUBLE PRECISION,
  delivery_longitude      DOUBLE PRECISION,
  delivery_coords         JSONB NOT NULL DEFAULT '{}',
  waypoints               JSONB NOT NULL DEFAULT '[]',
  optimized_route         JSONB NOT NULL DEFAULT '[]',
  distance_km             DOUBLE PRECISION NOT NULL DEFAULT 0,
  estimated_time_minutes  DOUBLE PRECISION NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  assigned_at             TIMESTAMPTZ,
  picked_up_at            TIMESTAMPTZ,
  in_transit_at           TIMESTAMPTZ,
  arrived_at              TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  pickup_otp              TEXT NOT NULL DEFAULT '',
  delivery_otp            TEXT NOT NULL DEFAULT '',
  qr_code                 TEXT NOT NULL DEFAULT '',
  qr_token                TEXT NOT NULL DEFAULT '',
  qr_token_hash           TEXT NOT NULL DEFAULT '',
  otp_hash                TEXT NOT NULL DEFAULT '',
  otp_expires_at          TIMESTAMPTZ,
  current_latitude        DOUBLE PRECISION,
  current_longitude       DOUBLE PRECISION,
  is_demo_route           BOOLEAN NOT NULL DEFAULT TRUE,
  verified_by             TEXT,
  verified_at             TIMESTAMPTZ,
  verification_status     TEXT NOT NULL DEFAULT 'PENDING',
  verification_method     TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_partner ON deliveries(logistics_partner_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  link        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
