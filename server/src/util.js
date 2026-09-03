// Small, pure helpers ported 1:1 from the Go version's internal/util/util.go
// (itself ported from src/utils/helpers.ts and src/services/qrService.ts),
// so the business math (pricing, distance, delivery OTP/QR generation)
// behaves identically. NOTE: generateOTP() here is the DELIVERY/PICKUP
// handover OTP system (6-digit codes shown on a QR pass, checked at
// handover) — a completely separate mechanism from login, which this
// rebuild moved to TOTP (see routes/auth.js). Nothing here changed because
// of that switch.
const crypto = require('crypto');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const r = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = r * c;
  return Math.round(d * 10) / 10;
}

function randomDigits(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += crypto.randomInt(0, 10);
  return out;
}

// generateOTP: 6-digit numeric code for the delivery/pickup handover system
// (crypto.randomInt-backed, not Math.random()).
function generateOTP() {
  return randomDigits(6);
}

// generateOrderId mirrors GenerateOrderID(): VYR-<6 digit ts>-<3 digit rand>.
function generateOrderId() {
  const ts = Date.now() % 1000000;
  return `VYR-${String(ts).padStart(6, '0')}-${randomDigits(3)}`;
}

function randomId(prefix) {
  const b = crypto.randomBytes(8).toString('hex').slice(0, 8);
  return `${prefix}_${Date.now()}_${b}`;
}

const newUserID = () => randomId('usr');
const newProduceID = () => randomId('prod');
const newOfferID = () => randomId('off');
const newDeliveryID = (orderId) => `del_${String(orderId).replace(/^ord_/, '')}`;
const newNotificationID = () => randomId('notif');

// generateSecureToken: cryptographically strong 32-char hex token, used for
// the delivery QR handover token.
function generateSecureToken() {
  return crypto.randomBytes(16).toString('hex');
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret).trim()).digest('hex');
}

// generateQRPayload mirrors GenerateQRPayload() exactly (same JSON shape +
// base64 "signature") so any client-side QR rendering code keeps working
// unmodified.
function generateQRPayload(orderId, deliveryOtp, totalAmount) {
  const payload = {
    app: 'VAYORA_AGRI_NETWORK',
    orderId,
    otp: deliveryOtp,
    totalAmount,
    timestamp: new Date().toISOString(),
    signature: Buffer.from(`vayora_verified_${orderId}_${deliveryOtp}`).toString('base64'),
  };
  return JSON.stringify(payload);
}

function generateDeliveryQRPayload(deliveryId, token) {
  return `VAYORA_DELIVERY:${deliveryId}:${token}`;
}

function parseDeliveryQRPayload(qrText) {
  const trimmed = String(qrText || '').trim();
  if (!trimmed.startsWith('VAYORA_DELIVERY:')) return { ok: false };
  const parts = trimmed.split(':');
  if (parts.length < 3) return { ok: false };
  return { deliveryId: parts[1], token: parts.slice(2).join(':'), ok: true };
}

function nowISO() {
  return new Date().toISOString();
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

module.exports = {
  calculateDistanceKm,
  generateOTP,
  generateOrderId,
  newUserID,
  newProduceID,
  newOfferID,
  newDeliveryID,
  newNotificationID,
  generateSecureToken,
  hashSecret,
  generateQRPayload,
  generateDeliveryQRPayload,
  parseDeliveryQRPayload,
  nowISO,
  round2,
};
