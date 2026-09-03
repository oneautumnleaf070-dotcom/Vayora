// VAYORA backend entrypoint (Node.js + Express). Boots the DB connection
// (applying the idempotent schema), wires every domain module's routes onto
// a single Express app, and starts the WebSocket hub for real-time
// delivery/order/offer updates. Route table mirrors the Go version's
// cmd/api/main.go 1:1 so the frontend's API surface is unchanged.
const http = require('http');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const db = require('./db');
const { auth, requireRole } = require('./middleware');
const wsHub = require('./ws');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const produceRoutes = require('./routes/produce');
const marketplaceRoutes = require('./routes/marketplace');
const offersRoutes = require('./routes/offers');
const ordersRoutes = require('./routes/orders');
const matchingRoutes = require('./routes/matching');
const deliveriesRoutes = require('./routes/deliveries');
const notificationsRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');

async function main() {
  const cfg = config;
  const pool = await db.connect(cfg.databaseUrl);

  const app = express();
  app.use(
    cors({
      origin: cfg.corsOrigin === '*' ? true : cfg.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  const httpServer = http.createServer(app);
  const hub = wsHub.attach(httpServer, cfg.jwtSecret);

  const requireAuth = auth(cfg.jwtSecret);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Auth: /otp/send, /otp/verify, /register are public; /me, /logout
  // require a bearer token (enforced inside auth.js itself, matching
  // main.go's mixed mounting for this one route group).
  app.use('/api/auth', authRoutes.buildRouter(pool, cfg));

  app.use('/api/users', requireAuth, usersRoutes.buildRouter(pool));

  app.use('/api/produce', requireAuth, produceRoutes.buildRouter(pool, hub));

  app.use('/api/marketplace', requireAuth, marketplaceRoutes.buildRouter(pool));

  app.use('/api/offers', requireAuth, offersRoutes.buildRouter(pool, hub));

  app.use('/api/orders', requireAuth, ordersRoutes.buildRouter(pool, hub));

  app.use('/api/matching', requireAuth, matchingRoutes.buildRouter(pool, hub));

  app.use('/api/deliveries', requireAuth, deliveriesRoutes.buildRouter(pool, hub));

  app.use('/api/notifications', requireAuth, notificationsRoutes.buildRouter(pool, hub));

  app.use('/api/ai', requireAuth, aiRoutes.buildRouter());

  // Fallback 404/error handlers.
  app.use((req, res) => res.status(404).json({ error: 'not found' }));
  app.use((err, req, res, next) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'internal error' });
  });

  httpServer.listen(cfg.port, () => {
    console.log(`VAYORA API listening on :${cfg.port} (env=${cfg.environment}, otpMockMode=${cfg.otpMockMode})`);
  });
}

main().catch((err) => {
  console.error('server: fatal startup error:', err);
  process.exit(1);
});
