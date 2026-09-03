// Real-time layer mirroring the Go version's internal/ws/hub.go. Every
// domain route already dispatches a bare event name after a mutation
// (`vayora_produce_updated`, `vayora_orders_updated`, ...) — the hub
// broadcasts the same bare event *names* to every connected client, and the
// frontend's WS listener re-dispatches them as the identical window custom
// event, so zero page/component changes are needed.
const { WebSocketServer } = require('ws');
const { parseToken } = require('./middleware');

const EVENTS = {
  PRODUCE_UPDATED: 'vayora_produce_updated',
  OFFERS_UPDATED: 'vayora_offers_updated',
  ORDERS_UPDATED: 'vayora_orders_updated',
  DELIVERIES_UPDATED: 'vayora_deliveries_updated',
  NOTIFICATIONS_UPDATED: 'vayora_notifs_updated',
};

class Hub {
  constructor() {
    this.clients = new Set();
  }

  emit(event) {
    const msg = JSON.stringify({ type: event });
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(msg);
        } catch {
          // slow/broken consumer — drop rather than block
        }
      }
    }
  }
}

// attach mounts a WebSocket server on the given HTTP server at /api/ws,
// validating a JWT passed as ?token=... (browsers can't set Authorization
// headers on the WS handshake, so the token travels in the query string).
function attach(httpServer, jwtSecret) {
  const hub = new Hub();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/api/ws') return; // let other upgrade handlers (none currently) decide

    const token = url.searchParams.get('token') || '';
    try {
      parseToken(jwtSecret, token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      hub.clients.add(ws);
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.ping();
      }, 30000);
      ws.on('close', () => {
        clearInterval(pingInterval);
        hub.clients.delete(ws);
      });
      ws.on('error', () => {
        clearInterval(pingInterval);
        hub.clients.delete(ws);
      });
    });
  });

  return hub;
}

module.exports = { attach, EVENTS };
