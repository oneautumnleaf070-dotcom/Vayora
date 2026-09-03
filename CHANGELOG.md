# VAYORA — Backend Rebuild Changelog

## Summary

The frontend (React 19 + TypeScript + Tailwind + the entire component library and
design system) is **unchanged in look, feel and behaviour**. The backend has been
completely replaced: Firebase (Authentication + Cloud Firestore + Cloud Functions +
Cloud Storage) is gone, replaced by a self-hosted **Node.js 20 + Express 4 API +
PostgreSQL 16** stack that you run yourself with one command (`docker compose up`).
Phone login was also upgraded from SMS-style OTP to **TOTP** — standard 6-digit
authenticator-app codes (RFC 6238, the same mechanism behind Google Authenticator and
Authy).

Every role, page, and feature from the original app is preserved. Nothing was removed.

> **Note on the Go version:** an earlier iteration of this rebuild used Go +
> PostgreSQL instead of Node/Express. That backend has been fully replaced by this
> Node.js version — same REST API contract, same database schema, same business
> rules, different runtime. The "Why Node/Express" and bug-fix sections below apply to
> both; only the language/runtime and the login mechanism changed.

## Why Node.js + Express + PostgreSQL

- **Relational data, relational database.** Users, produce listings, offers, orders and
  deliveries are all foreign-key-related entities with real state machines (a delivery
  moves through `PENDING_ASSIGNMENT → ASSIGNED → PICKUP_PENDING → PICKED_UP →
  IN_TRANSIT → ARRIVED → DELIVERED`). Postgres models this directly with foreign keys,
  transactions and constraints; Firestore's document model made this implicit and
  harder to enforce.
- **A thin, predictable API layer.** Express puts almost nothing between an incoming
  request and the SQL that answers it — each route module reads like the business
  rule it implements, with no ORM abstraction or reflection overhead on hot paths like
  marketplace browse or the matching engine.
- **A natural fit for I/O-bound work.** A REST + WebSocket API that spends its time
  waiting on Postgres and pushing live updates to connected dashboards suits Node's
  single-threaded event loop well — no thread pool tuning, no blocking-call surprises.

## Why TOTP instead of SMS OTP

The original mock-OTP flow simulated an SMS code without ever sending one. This
rebuild replaces it with genuine RFC 6238 TOTP: the server issues a secret per phone
number (table `totp_secrets`) and the user's authenticator app (or, in dev mode, the
server itself) computes the current 6-digit code from it — no SMS provider, no
per-message cost, and it keeps working with zero signal. `OTP_MOCK_MODE=true` (the
default for local development) makes `/api/auth/otp/send` also return the code that is
valid right now, so a tester can type it straight from the API response or the login
screen without installing an authenticator app; turn it off in a real deployment and
the flow becomes an ordinary TOTP login with a QR code (`provisioningUri`) for
first-time setup.

## What moved where

| Original (Firebase) | Now (Node.js/Express + Postgres) |
|---|---|
| Firebase Phone Auth (SMS OTP) | TOTP endpoints (`/api/auth/otp/send`, `/api/auth/otp/verify`) — RFC 6238 authenticator-app codes; dev mode also returns the current code directly |
| Firestore `users` / `produce` / `offers` / `orders` / `deliveries` / `notifications` | Postgres tables of the same name, same shape, via the `pg` library (no ORM) |
| Firestore real-time listeners (`onSnapshot`) | A WebSocket hub (`/api/ws`, via `ws`) broadcasting `vayora_*_updated` events — the frontend's existing `window.addEventListener('vayora_produce_updated', ...)` calls work completely unchanged |
| Cloud Function `getPriceRecommendation` (called Gemini, was never deployed — always threw) | `server/src/routes/ai.js` — a deterministic, math-based pricing engine (mandi baseline × seasonality × quality premium × direct-buyer-advantage). Always returns a real answer. |
| Client-side matching engine (`matchingService.ts`) | `server/src/routes/matching.js` — the identical weighted-scoring formula (quantity 30% / price 25% / distance 20% / quality 15% / verification 10%), now running server-side against live stock |
| Firebase Storage (produce images) | Images are stored as Base64 data URLs directly in Postgres — no object storage service required |

## Bugs fixed along the way

These were genuine bugs in the original app, found and fixed during the rebuild —
none of them were introduced by the migration:

1. **`createDelivery()` was dead code.** It existed in `deliveryService.ts` but no page
   ever called it — the Logistics dashboard only ever showed seed data, and real orders
   never got a real delivery record. Fixed: `orders.createNewOrder` now automatically
   creates the matching delivery for every order, server-side, immediately after the
   order is inserted.
2. **AI price recommendation was permanently broken.** It called a Firebase Cloud
   Function that was never deployed, so every call threw an error. Fixed: replaced with
   a real, deterministic pricing engine that always returns a usable recommendation.
3. **Double stock-deduction risk on offer acceptance.** `offerService.ts` deducted
   produce quantity on offer-accept, and `orderService.ts` deducted it again in its
   fallback path. Fixed: stock is now deducted exactly once, inside the server's
   order-creation function (`orders.createNewOrder`) — offer acceptance and matching
   reservation both delegate to it rather than deducting themselves.
4. **Double stock-deduction risk in bulk matching.** A related risk in the
   multi-supplier reservation flow (`matching.reserve` deducting once, then order
   creation deducting again) was caught during the rebuild and fixed the same way —
   the matching step now only validates stock is still available; the order-creation
   step is the single place deduction happens.
5. **Client-authoritative pricing on direct "Buy Now" checkout.** The original app's
   Firestore writes trusted whatever price the browser sent. The `POST /api/orders`
   endpoint looks up the produce listing server-side and overrides the price and
   farmer identity for any non-bulk order, closing a price-tampering gap. Verified
   directly: a request that supplies a tampered `verifiedPricePerUnit` and a fake
   `farmerId` comes back with the server's own price and the real farmer's identity.

## Setup

See `README.md` → **Quick Start**. Short version: `docker compose up` starts Postgres +
the API; `npm install && npm run dev` starts the frontend. Demo phone numbers for every
role are listed in `README.md` and in `server/scripts/seed.js`'s header comment.

## Environment variables

- `.env` (frontend, Vite): `VITE_API_URL` — defaults to `http://localhost:5000/api`.
- `server/.env` (optional, not required for `docker compose up`): `PORT`,
  `DATABASE_URL`, `JWT_SECRET`, `OTP_MOCK_MODE`, `CORS_ORIGIN`, `ENVIRONMENT`. All have
  working defaults for local development — see `server/src/config.js`.

## What did NOT change

- Every page, route, and role dashboard.
- The full design system, Tailwind theme, and component library.
- All client-side pure logic (marketplace filtering/sorting, price-breakdown math,
  route optimisation, QR/OTP UI for delivery handover, the delivery state-machine
  constants used for optimistic UI).
- The delivery/pickup handover OTP system (the 6-digit codes on QR passes checked at
  physical handover between logistics and buyer/farmer) — this is unrelated to login
  and was not touched by the TOTP change.
- The `CreateOrderParams` / `MatchingRequestInput` / `SmartMatchingResult` /
  `AIPriceRecommendation` TypeScript interfaces — the service layer was rewritten to
  call the new API underneath, but every exported function keeps its original name,
  signature, and return shape, so no page component needed to change.
