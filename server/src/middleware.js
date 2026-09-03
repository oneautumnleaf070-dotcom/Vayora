// Cross-cutting HTTP concerns: JWT auth, role gating, error logging. Mirrors
// the Go version's internal/middleware/middleware.go.
const jwt = require('jsonwebtoken');

function issueToken(secret, userId, role, phone) {
  return jwt.sign({ userId, role, phone }, secret);
}

// parseToken validates a raw JWT string (used by the WS upgrade handler,
// which receives the token as a query param rather than a header).
function parseToken(secret, raw) {
  const claims = jwt.verify(raw, secret);
  return { userId: claims.userId, role: claims.role, phone: claims.phone };
}

// auth validates the Bearer JWT and injects userId/role/phone onto req.
// Requests with no/invalid token are rejected with 401.
function auth(secret) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return writeError(res, 401, 'missing bearer token');
    }
    const raw = header.slice('Bearer '.length);
    try {
      const claims = jwt.verify(raw, secret);
      req.userId = claims.userId;
      req.role = claims.role;
      req.phone = claims.phone;
      next();
    } catch (err) {
      return writeError(res, 401, 'invalid or expired token');
    }
  };
}

// requireRole gates a handler to one or more roles (ADMIN always allowed
// through, mirroring the original app's implicit admin-can-do-anything
// assumption).
function requireRole(...roles) {
  const allowed = new Set(['ADMIN', ...roles]);
  return (req, res, next) => {
    if (!allowed.has(req.role)) {
      return writeError(res, 403, 'insufficient role');
    }
    next();
  };
}

function writeError(res, status, message) {
  if (status >= 500) {
    console.error(`server error (${status}): ${message}`);
  }
  res.status(status).json({ error: message });
}

// asyncHandler wraps an async Express handler so a thrown/rejected error
// becomes a clean 500 JSON response instead of an unhandled rejection.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      if (!res.headersSent) writeError(res, 500, err.message || 'internal error');
    });
  };
}

module.exports = { issueToken, parseToken, auth, requireRole, writeError, asyncHandler };
