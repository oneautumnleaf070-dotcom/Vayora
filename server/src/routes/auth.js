// Authentication: phone number + TOTP (RFC 6238, Google-Authenticator-style)
// login, replacing the mock-SMS-OTP flow of the Go version by explicit
// request (the user chose TOTP over Twilio/MSG91/mock-SMS for this
// Node/Express rebuild).
//
// How it differs from a plain mock-OTP flow: there is no "send an SMS" step
// — instead, the first time a phone number is seen, the server generates a
// TOTP secret for it and hands back a `provisioningUri` (an otpauth:// URL)
// the frontend can render as a QR code for the user to scan into Google
// Authenticator / Authy, plus the base32 `secret` for manual entry. Because
// this is still a dev-friendly demo backend (OTP_MOCK_MODE=true by
// default), every /otp/send response ALSO returns `devOtp`: the code that
// is valid RIGHT NOW for that phone's secret — so a tester without a real
// authenticator app set up can just type the code shown on screen, exactly
// like the old mock-OTP flow. Once OTP_MOCK_MODE is turned off in a real
// deployment, stop showing devOtp/secret and the flow is a completely
// ordinary TOTP login.
//
// The two endpoint names/shapes (`/otp/send`, `/otp/verify`) and the
// `needsProfile` / `uid` / registration hand-off are kept identical to the
// Go version so the frontend's authService.ts needs no structural changes —
// only its copy (see CHANGELOG.md).
const express = require('express');
const { authenticator } = require('otplib');
const { writeError, asyncHandler, issueToken, auth } = require('../middleware');
const users = require('./users');
const util = require('../util');

authenticator.options = { window: 1, step: 30 }; // ±30s clock-drift tolerance

const NON_DIGITS = /\D/g;

// normalizePhoneNumber mirrors authService.ts normalizePhoneNumber: strips
// non-digits, applies an India (+91) default for bare 10-digit numbers.
function normalizePhoneNumber(raw) {
  const digits = String(raw || '').replace(NON_DIGITS, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

async function getTotpRow(db, phone) {
  const { rows } = await db.query(`SELECT phone, secret, confirmed FROM totp_secrets WHERE phone=$1`, [phone]);
  return rows[0] || null;
}

function buildRouter(db, cfg) {
  const router = express.Router();

  router.post(
    '/otp/send',
    asyncHandler(async (req, res) => {
      const phoneRaw = req.body && req.body.phone;
      if (!phoneRaw) return writeError(res, 400, 'phone is required');
      const phone = normalizePhoneNumber(phoneRaw);

      let row = await getTotpRow(db, phone);
      let isFirstSetup = false;
      if (!row) {
        const secret = authenticator.generateSecret();
        await db.query(
          `INSERT INTO totp_secrets (phone, secret, confirmed) VALUES ($1,$2,FALSE)
           ON CONFLICT (phone) DO NOTHING`,
          [phone, secret]
        );
        row = await getTotpRow(db, phone);
        isFirstSetup = true;
      }
      isFirstSetup = isFirstSetup || !row.confirmed;

      const currentCode = authenticator.generate(row.secret);

      const resp = {
        success: true,
        message: isFirstSetup
          ? 'Scan the QR code with an authenticator app (Google Authenticator, Authy), or use the dev code below.'
          : 'Enter the current code from your authenticator app.',
      };
      if (cfg.otpMockMode) resp.devOtp = currentCode;
      if (isFirstSetup) {
        resp.provisioningUri = authenticator.keyuri(phone, 'VAYORA', row.secret);
        resp.secret = row.secret;
      }
      res.json(resp);
    })
  );

  router.post(
    '/otp/verify',
    asyncHandler(async (req, res) => {
      const { phone: phoneRaw, otp } = req.body || {};
      if (!phoneRaw || !otp) return writeError(res, 400, 'phone and otp are required');
      const phone = normalizePhoneNumber(phoneRaw);

      const row = await getTotpRow(db, phone);
      if (!row) return writeError(res, 400, 'no authenticator was set up for this number — request a code first');

      const ok = authenticator.check(String(otp), row.secret);
      if (!ok) return writeError(res, 400, 'incorrect code');

      if (!row.confirmed) {
        await db.query(`UPDATE totp_secrets SET confirmed=TRUE WHERE phone=$1`, [phone]);
      }

      const existing = await users.getByPhone(db, phone);
      if (existing) {
        const token = issueToken(cfg.jwtSecret, existing.id, existing.role, existing.phone);
        return res.json({ needsProfile: false, token, user: existing, uid: existing.id });
      }

      // No profile yet — hand back a fresh UID the frontend carries into
      // /auth/register via CompleteProfilePage.
      res.json({ needsProfile: true, uid: util.newUserID() });
    })
  );

  // Register mirrors authService.ts createUserProfileInFirestore, including
  // the business rule: self-registration as ADMIN is force-downgraded to
  // FARMER — ADMIN accounts only ever exist via the seed script.
  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const input = { ...req.body };
      if (!input.uid || !input.phone || !input.name || !input.role) {
        return writeError(res, 400, 'uid, phone, name and role are required');
      }
      input.phone = normalizePhoneNumber(input.phone);
      if (input.role === 'ADMIN') input.role = 'FARMER';

      const user = await users.create(db, input);
      const token = issueToken(cfg.jwtSecret, user.id, user.role, user.phone);
      res.status(201).json({ needsProfile: false, token, user, uid: user.id });
    })
  );

  // /me and /logout are the only auth.* routes that require a bearer token
  // (send/verify/register happen before the caller has a session).
  const requireAuth = auth(cfg.jwtSecret);

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await users.getById(db, req.userId);
      if (!user) return writeError(res, 404, 'user not found');
      res.json(user);
    })
  );

  // JWT auth is stateless — logout is a client-side token discard. Kept as
  // a real endpoint so the frontend's signOutUser() call has something to hit.
  router.post('/logout', requireAuth, (req, res) => res.json({ success: true }));

  return router;
}

module.exports = { normalizePhoneNumber, buildRouter };
