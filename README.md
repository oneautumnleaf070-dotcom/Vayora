# VAYORA – Direct Agricultural Marketplace & AI Intelligence
**Smart India Hackathon 2026 (SIH26033)**

> **Problem Statement (SIH26033):** Multiple intermediaries reduce farmers' earnings and increase consumer prices.
> **Solution:** A farmer-centric direct agricultural marketplace connecting Farmers & FPOs directly with Verified Bulk Buyers through indicative pricing, multi-supplier bulk aggregation, and QR/OTP tamper-proof delivery verification.

This is the **self-hosted rebuild** of VAYORA: the original React frontend and its entire
UI/UX are preserved exactly, and the backend has been rewritten from Firebase
(Auth + Firestore + Cloud Functions + Storage) to a **self-hosted Node.js + Express +
PostgreSQL** stack, with phone login upgraded to **TOTP authenticator-app codes**
(RFC 6238 — Google Authenticator/Authy-compatible) instead of SMS — see `CHANGELOG.md`
for the full rationale and a list of every bug fixed along the way.

---

## 🌟 Key Innovations & Value Proposition

1. **AI-Assisted Indicative Price Intelligence & Demand Forecasting:**
   - Indicative price bounds (₹XX – ₹YY/kg) computed by a deterministic pricing engine
     (mandi baseline + seasonality + quality grade + a direct-buyer-advantage margin) —
     runs entirely on your own server, no external API key required.
   - 4-week demand forecast curve for the listed crop.
2. **Multi-Supplier Bulk Order Matching (Signature SIH Innovation):**
   - When a buyer requires more than any single farmer has in stock, VAYORA's matching
     engine dynamically splits the order across multiple nearby FPOs and farmers into a
     single consolidated order with shared logistics.
3. **100% Transparent Direct Price Breakdown:**
   - Every transaction shows: Produce Amount + Fair Logistics + Nominal Platform Fee = Total Buyer Payable.
   - **Zero hidden broker commissions or middleman markups.** Farmer receives 100% of the agreed produce value.
   - Prices are computed and verified **server-side** — a buyer can no longer tamper with
     the price by editing client-side requests.
4. **Tamper-Proof Dual QR Code + 6-Digit OTP Delivery Verification:**
   - Handover between driver and buyer requires cryptographic QR scan or 6-digit OTP verification.
   - Automatically marks order as `DELIVERED` and instantly releases escrow payment to the farmer.
5. **TOTP Authenticator-App Login:**
   - Sign-in uses standard 6-digit time-based codes (the same kind Google
     Authenticator/Authy generate for any other app) instead of SMS — no SMS provider,
     no per-message cost, and it keeps working with no signal.
6. **Real-Time Live Updates:**
   - A WebSocket connection pushes live produce/offer/order/delivery/notification updates
     to every open dashboard — no polling, no manual refresh.

---

## 🏗️ Architecture & Tech Stack

```
Frontend (React 19 + Vite + TypeScript + Tailwind CSS + Lucide React + Leaflet OSM)
         │  REST + WebSocket (JWT bearer auth)
         ▼
Backend  (Node.js 20 + Express 4)
         ├── TOTP (RFC 6238) phone authentication — authenticator-app codes,
         │   dev mode also returns the current code directly (no app needed to test)
         ├── Deterministic AI price-recommendation engine
         ├── Multi-supplier bulk-matching engine
         ├── Delivery state machine + QR/OTP cryptographic verification
         ├── WebSocket hub (ws) broadcasting live entity-updated events
         └── PostgreSQL 16 (raw SQL via `pg`, no ORM) — users / produce / offers /
             orders / deliveries / notifications / totp_secrets
```

**Why Node/Express + Postgres?** The marketplace is fundamentally relational —
users → produce → offers → orders → deliveries, all with foreign-key relationships and
state machines — which Postgres models far more honestly than Firestore's document
store. Express keeps the API surface close to the metal (no heavyweight framework
between routes and SQL), and the single-threaded event loop is a natural fit for an
I/O-bound REST + WebSocket API like this one, backed by Postgres for the relational
integrity the domain actually needs.

> A previous iteration of this rebuild used Go instead of Node — the REST API
> contract, database schema, and every business rule are identical either way. This
> version replaces that Go backend entirely; see `CHANGELOG.md`.

---

## 👥 5 Role-Protected Dashboards

| Role | Persona | Key Features |
|---|---|---|
| **FARMER** | Ramesh Patil (Nashik) | List produce, AI indicative pricing, demand chart, buyer offers, farm-gate pickup pass |
| **FPO** | Deccan Farmers FPO | Bulk produce listing, member aggregation, collective logistics |
| **BUYER** | Anita / Metro Fresh | Filtered marketplace, smart bulk matcher, transparent checkout, delivery QR pass |
| **LOGISTICS** | Kisan Express Agri-Logistics | Assigned delivery queue, route view, QR camera scanner & OTP verifier |
| **ADMIN** | VAYORA Directorate | KYC user verification queue, platform-wide orders/produce/deliveries, analytics |

---

## 💻 Quick Start

### Option A — Docker Compose (recommended, one command)

```bash
docker compose up
```

This starts PostgreSQL and the Node/Express API together (`http://localhost:5000`).
Then, in a second terminal, run the frontend:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Option B — Run natively (no Docker)

```bash
# 1. Start PostgreSQL 16 locally and create a database/user matching
#    server/.env (or the defaults in server/src/config.js):
#    user=postgres password=vayora_dev db=vayora on localhost:5432

# 2. Install deps and run the API (schema auto-applies on startup)
cd server
npm install
npm start

# 3. Seed demo accounts + produce listings (idempotent, safe to re-run)
npm run seed

# 4. In a second terminal, run the frontend
cd ..
npm install
npm run dev
```

### Demo accounts (seeded by `server/scripts/seed.js`)

Login uses **TOTP** (an authenticator-app code, RFC 6238 — the same standard behind
Google Authenticator/Authy): request a code for any of these phone numbers and, in dev
mode, the currently-valid 6-digit code is returned directly in the API response and
shown on screen — no authenticator app required for local testing. Scan the QR/
`otpauth://` URI shown on first setup to also use a real authenticator app.

| Role | Phone |
|---|---|
| ADMIN | `+919000000001` |
| FARMER (Ramesh Patil) | `+919000000002` |
| FPO (Deccan Farmers) | `+919000000003` |
| BUYER (Anita) | `+919000000004` |
| LOGISTICS (Kisan Express) | `+919988776655` |

---

## 📄 More detail

See `CHANGELOG.md` for the full list of what changed in this rebuild, the pre-existing
bugs it fixes, and setup/deployment notes.
