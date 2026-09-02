# VAYORA — Admin Access Setup

## Why this is a manual step (by design)
VAYORA deliberately does **not** let anyone sign themselves up as an administrator.
Two safeguards enforce this:

1. **`src/services/authService.ts`** — `createUserProfileInFirestore()` force-downgrades
   any `ADMIN` role chosen at registration back to `FARMER`:
   ```ts
   const validatedRole: UserRole = input.role === 'ADMIN' ? 'FARMER' : input.role;
   ```
2. **`firestore.rules`** — a user may create/update their own profile but **cannot** set or
   elevate their own role to `ADMIN`:
   ```
   allow create: if isOwner(userId) && request.resource.data.role != 'ADMIN';
   allow update: if isOwner(userId) && (
     request.resource.data.role == resource.data.role || isAdmin()
   );
   ```

So an admin is created by promoting an **already-registered** user, from a trusted place
(the Firebase Console or the Admin SDK) that is not bound by the client security rules.
**Do not** weaken these rules to allow self-promotion.

---

## Method A — Firebase Console (recommended, ~1 minute)

1. **Register the user normally first.** In the app, go to `/register`, complete phone-OTP
   sign-up, and finish the profile (any role — e.g. Farmer). This creates the Auth user and
   the `users/{uid}` document. Note the phone number you used.

2. **Find the user's UID.**
   - Firebase Console → **Authentication → Users** → find the row by phone number → copy the **User UID**.
   - (Or Console → **Firestore Database → `users`** and locate the document whose `phone` matches.)

3. **Set the role to ADMIN.**
   - Firestore Database → **`users`** collection → open the document whose **document ID = that UID**.
   - Edit the **`role`** field → set its value to exactly `ADMIN` (string, uppercase) → **Update**.

4. **Sign in as admin.** In the app, sign out if needed, then sign in via `/login` with that
   phone number and OTP. On success you'll be routed to **`/admin/dashboard`**.
   (Once the dedicated Admin portal is added, use **`/admin/login`** instead — same account.)

That's it. The Firestore rules' `isAdmin()` helper already accepts a user whose
`users/{uid}.role == 'ADMIN'`, so no further change is required.

---

## Method B — Custom auth claim (optional, more robust)

The rules also accept an admin via a Firebase Auth **custom claim** (`request.auth.token.role == 'ADMIN'`).
This is stronger because the claim rides in the ID token rather than requiring a Firestore read.
Run this once with a service-account key (Node + `firebase-admin`):

```js
// promote-admin.js  —  run with: node promote-admin.js
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });

const uid = 'PASTE_THE_USER_UID_HERE';

(async () => {
  // 1) custom claim used by firestore.rules isAdmin()
  await admin.auth().setCustomUserClaims(uid, { role: 'ADMIN' });
  // 2) keep the Firestore profile in sync so the app UI shows ADMIN
  await admin.firestore().doc(`users/${uid}`).update({ role: 'ADMIN' });
  console.log(`User ${uid} promoted to ADMIN.`);
  process.exit(0);
})();
```

Notes:
- Get `serviceAccountKey.json` from Console → **Project settings → Service accounts → Generate new private key**. Keep it out of git (already covered by `.gitignore` patterns for secrets).
- After setting a custom claim, the user must **sign out and back in** (or the client must call
  `getIdToken(true)`) for the new token to take effect.
- Setting **both** the claim and the Firestore `role` is recommended: the claim satisfies the
  security rules efficiently, and the Firestore `role` is what `AuthContext` reads to render the
  admin UI and redirect to `/admin/dashboard`.

---

## Verifying admin access
- After promotion + re-login, you should land on **`/admin/dashboard`** (Platform Administration).
- The header shows the **System Admin** purple badge; the sidebar exposes **User Directory**,
  **Live Marketplace**, **Bulk Matcher Engine**, and **Logistics Fleet**.
- You can verify other users (KYC) via **`/admin/users`** — this calls `setUserVerification()`,
  which requires an admin per the rules.

## To revoke admin
Reverse the change: set `users/{uid}.role` back to the user's real role (e.g. `FARMER`), and if you
used Method B, clear the claim with `admin.auth().setCustomUserClaims(uid, { role: null })`, then
have them re-login.

## Security reminders
- Only promote accounts you control. An ADMIN can read all users, verify accounts, and (per rules)
  write payments and update any order/delivery.
- Never add a client-side path that lets a user assign themselves `ADMIN`.
- Keep the service-account key and any `.env` secrets out of the repository.
