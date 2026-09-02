# VAYORA Bug Fix Plan for Antigravity

**Total Issues:** 10 (4 CRITICAL, 1 HIGH, 3 MEDIUM, 2 LOW)  
**Estimated Time:** 3-4 hours (CRITICAL + HIGH), 2 hours (MEDIUM + LOW)  
**Priority:** Fix in order listed below

---

## 🚨 CRITICAL FIXES (FIX FIRST - Security & Data Integrity)

### [CRITICAL FIX #1] QR Verification Bypass - Lines 434 & 80

**Files:**
- `src/services/deliveryService.ts:434`
- `functions/src/deliveryVerification.ts:80`

**Problem:**
The condition `tokenToTest.length >= 16` allows ANY string with 16+ characters to pass verification, completely bypassing QR hash validation. This enables fraudulent delivery confirmation and escrow release.

**Current Code (WRONG):**

```typescript
// In deliveryService.ts:434 and deliveryVerification.ts:80
const isDemoToken = tokenToTest.includes('demo') || tokenToTest.length >= 16;

if (!matchesHash && !matchesPlain && !isDemoToken) {
  throw new Error('Invalid QR code. Verification failed.');
}
// If isDemoToken is true, verification succeeds even with wrong token
```

**Fixed Code:**

```typescript
// Remove the length check entirely - it's a vulnerability
const isDemoToken = tokenToTest.includes('demo');

if (!matchesHash && !matchesPlain && !isDemoToken) {
  throw new Error('Invalid or tampered QR Code. Handover verification rejected.');
}
```

**Why This Works:**
- Only genuine demo tokens (containing `'demo'` string) bypass hash checks
- All production tokens must match stored `qrTokenHash` via cryptographic comparison
- No arbitrary length-based bypass possible

**Testing Steps:**
1. In dev console, try scanning/entering any random 16-char string (e.g., `abcd1234efgh5678`)
2. Verification should NOW FAIL (previously would pass)
3. Scan a valid QR code → should pass
4. Scan a tampered QR code → should fail

**Files to Modify:**
- [ ] `src/services/deliveryService.ts` (line 434)
- [ ] `functions/src/deliveryVerification.ts` (line 80)

---

### [CRITICAL FIX #2] Unawaited Promise in Checkout - Line 59

**File:**
- `src/pages/buyer/CheckoutPage.tsx:59`

**Problem:**
`createNewOrder` is async but called without `await`. The variable `newOrder` becomes an unresolved Promise, so `newOrder.id` is `undefined`. User redirects to `/orders/undefined/tracking` and order creation fails silently.

**Current Code (WRONG):**

```typescript
// CheckoutPage.tsx line 59
const handlePaymentSuccess = async (paymentResult: any) => {
  // ...
  const newOrder = createNewOrder({
    buyerId: user.id,
    produceId,
    quantity,
    // ...
  });
  
  // newOrder is a Promise here, not an Order object
  console.log('Order created:', newOrder.id); // prints Promise { <pending> }
  navigate(`/orders/${newOrder.id}/tracking`); // navigates to /orders/undefined/tracking
};
```

**Fixed Code:**

```typescript
// Add await
const handlePaymentSuccess = async (paymentResult: any) => {
  // ...
  const newOrder = await createNewOrder({
    buyerId: user.id,
    produceId,
    quantity,
    // ...
  });
  
  // newOrder is now an Order object with valid id
  console.log('Order created:', newOrder.id); // prints actual UUID
  navigate(`/orders/${newOrder.id}/tracking`); // navigates correctly
};
```

**Why This Works:**
- `await` pauses execution until Promise resolves
- `newOrder` now holds the actual Order object with valid `id`
- Navigation works correctly

**Testing Steps:**
1. Add produce to cart
2. Complete checkout → Should redirect to `/orders/[valid-uuid]/tracking`
3. Not `/orders/undefined/tracking`
4. Order should be visible in buyer's orders list

**Files to Modify:**
- [ ] `src/pages/buyer/CheckoutPage.tsx` (line 59, add `await` keyword)

---

### [CRITICAL FIX #3] User Self-Verification via Firestore Rules - Lines 27-29

**File:**
- `firestore.rules:27-29`

**Problem:**
The rule only checks that `role` doesn't change, but doesn't restrict `verified` field. Any authenticated user can call `updateDoc(doc(db, 'users', uid), { verified: true })` from the browser to bypass KYC approval.

**Current Code (WRONG):**

```javascript
// firestore.rules lines 22-30
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isOwner(userId) && request.resource.data.role != 'ADMIN';
  allow update: if isOwner(userId) && (
    request.resource.data.role == resource.data.role || isAdmin()
  );
  allow delete: if isAdmin();
}
// Problem: verified field can be modified by owner without admin approval
```

**Fixed Code:**

```javascript
// firestore.rules lines 22-30
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isOwner(userId) && request.resource.data.role != 'ADMIN';
  allow update: if isOwner(userId) && (
    (request.resource.data.role == resource.data.role && 
     request.resource.data.verified == resource.data.verified) || 
    isAdmin()
  );
  allow delete: if isAdmin();
}
// Now: verified field can only change if admin, or if unchanged
```

**Why This Works:**
- Non-admin users can only update if `role` AND `verified` stay the same
- Only admins can change either field
- Prevents self-verification bypass

**Testing Steps:**
1. As a non-admin user, open browser DevTools console
2. Try: `updateDoc(doc(db, 'users', auth.currentUser.uid), { verified: true })`
3. Should now FAIL with permission error (previously would succeed)
4. As admin, same command should succeed
5. Deploy to Firebase console

**Files to Modify:**
- [ ] `firestore.rules` (lines 27-29, add `request.resource.data.verified == resource.data.verified` check)

---

### [CRITICAL FIX #4] Missing Cloud Function Export - Line 44

**File:**
- `functions/src/index.ts:44`

**Problem:**
`index.ts` imports and calls `verifyDeliveryCode` but `deliveryVerification.ts` only exports `verifyDeliverySecurely`. Function name mismatch causes runtime crash.

**Current Code (WRONG):**

```typescript
// functions/src/index.ts line 44
import { verifyDeliveryCode } from './deliveryVerification';

export const verifyDelivery = functions.https.onCall(async (data, context) => {
  return verifyDeliveryCode(data);  // ERROR: verifyDeliveryCode is not exported
});
```

**Fixed Code:**

```typescript
// functions/src/index.ts line 44
import { verifyDeliverySecurely } from './deliveryVerification';

export const verifyDelivery = functions.https.onCall(async (data, context) => {
  return verifyDeliverySecurely(data);  // Correct function name
});
```

**Why This Works:**
- Function name now matches what's exported from `deliveryVerification.ts`
- No runtime error when Cloud Function is invoked

**Testing Steps:**
1. Deploy Cloud Functions: `firebase deploy --only functions`
2. Check Firebase console Functions tab for deploy errors (should be none)
3. In Firestore emulator or staging, call `verifyDelivery` callable function
4. Should execute without `TypeError: verifyDeliveryCode is not a function`

**Files to Modify:**
- [ ] `functions/src/index.ts` (line 44, change function name from `verifyDeliveryCode` to `verifyDeliverySecurely`)

---

## 🔴 HIGH PRIORITY FIX (Fix After CRITICAL)

### [HIGH FIX #5] Double Inventory Deduction on Offer Acceptance - Lines 180 & 227

**Files:**
- `src/services/offerService.ts:180`
- `src/services/orderService.ts:227`

**Problem:**
When farmer accepts offer, stock is deducted TWICE:
1. Once in `offerService.ts` via explicit `deductProduceQuantity` call
2. Again in `orderService.ts` inside `createNewOrder` transaction

Result: 100 kg offer deducts 200 kg from inventory.

**Current Code (WRONG):**

```typescript
// offerService.ts line 170-180
export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus,
  counterPrice?: number
) {
  // ... validation ...
  
  if (newStatus === 'ACCEPTED') {
    // FIRST DEDUCTION HERE
    await deductProduceQuantity(produce.id, updatedOffer.quantity);
    
    // THEN createNewOrder DEDUCTS AGAIN INSIDE TRANSACTION
    await createNewOrder({
      buyerId: updatedOffer.buyerId,
      produceId: produce.id,
      quantity: updatedOffer.quantity,
      // ...
    });
  }
}

// orderService.ts line 227
export async function createNewOrder(params: OrderParams): Promise<Order> {
  return transaction(async (tx) => {
    // Deduct stock AGAIN here
    const produce = tx.get(produceRef);
    if (produce.availableQuantity < params.quantity) {
      throw new Error('Insufficient stock');
    }
    tx.update(produceRef, {
      availableQuantity: produce.availableQuantity - params.quantity,
    });
    // ...
  });
}
```

**Fixed Code:**

```typescript
// offerService.ts line 170-180
export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus,
  counterPrice?: number
) {
  // ... validation ...
  
  if (newStatus === 'ACCEPTED') {
    // REMOVE explicit deductProduceQuantity call
    // Let createNewOrder handle atomic deduction in transaction
    
    await createNewOrder({
      buyerId: updatedOffer.buyerId,
      produceId: produce.id,
      quantity: updatedOffer.quantity,
      // ...
    });
    
    // Update offer status after order created
    await updateDoc(doc(db, 'offers', offerId), {
      status: 'ACCEPTED',
      // ...
    });
  }
}

// orderService.ts line 227 - NO CHANGES NEEDED (keep deduction here)
// This is the single source of truth for inventory changes
```

**Why This Works:**
- Single deduction point in atomic transaction
- No race conditions or double-deduction possible
- Consistent with bulk order flow which also uses `createNewOrder`

**Testing Steps:**
1. Create produce listing with 300 kg available
2. Send offer for 100 kg from buyer
3. Farmer accepts offer
4. Check produce document: should show 200 kg available (not 100 kg)
5. Create second offer for 150 kg on same produce
6. Should fail (only 200 kg left, not 300)

**Files to Modify:**
- [ ] `src/services/offerService.ts` (line 180, remove `deductProduceQuantity` call)

---

## 🟡 MEDIUM PRIORITY FIXES (Fix This Sprint)

### [MEDIUM FIX #6] Auto-Verified New Users Bypass KYC Queue - Lines 280 & 130

**Files:**
- `src/services/authService.ts:280`
- `src/services/produceService.ts:130`

**Problem:**
All new users created with `verified: true` hardcoded, bypassing KYC approval queue. All produce gets `verifiedSeller: true` regardless of farmer verification status.

**Current Code (WRONG):**

```typescript
// authService.ts line 280
export async function createUserProfileInFirestore(input: RegisterUserInput): Promise<User> {
  const newUser: User = {
    id: input.uid,
    name: input.name,
    phone: input.phone,
    email: input.email,
    role: input.role,
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    verified: true,  // ❌ WRONG: All new users auto-verified
    avatar: input.avatar,
    createdAt: new Date().toISOString(),
  };
  
  await setDoc(doc(db, 'users', input.uid), newUser);
  return newUser;
}

// produceService.ts line 130
export async function addProduce(
  farmerId: string,
  produceData: Omit<Produce, 'id' | 'farmerId' | 'createdAt'>
): Promise<Produce> {
  const newProduce: Produce = {
    ...produceData,
    id: doc(collection(db, 'produce')).id,
    farmerId,
    verifiedSeller: true,  // ❌ WRONG: Always true, ignores user.verified
    createdAt: new Date().toISOString(),
  };
  
  await setDoc(doc(db, 'produce', newProduce.id), newProduce);
  return newProduce;
}
```

**Fixed Code:**

```typescript
// authService.ts line 280
export async function createUserProfileInFirestore(input: RegisterUserInput): Promise<User> {
  const newUser: User = {
    id: input.uid,
    name: input.name,
    phone: input.phone,
    email: input.email,
    role: input.role,
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    verified: false,  // ✅ CORRECT: New users start unverified
    avatar: input.avatar,
    createdAt: new Date().toISOString(),
  };
  
  await setDoc(doc(db, 'users', input.uid), newUser);
  return newUser;
}

// produceService.ts line 130
export async function addProduce(
  farmerId: string,
  produceData: Omit<Produce, 'id' | 'farmerId' | 'createdAt'>,
  userVerified: boolean  // Accept farmer's verification status
): Promise<Produce> {
  const newProduce: Produce = {
    ...produceData,
    id: doc(collection(db, 'produce')).id,
    farmerId,
    verifiedSeller: userVerified,  // ✅ CORRECT: Inherit from user.verified
    createdAt: new Date().toISOString(),
  };
  
  await setDoc(doc(db, 'produce', newProduce.id), newProduce);
  return newProduce;
}

// Update call sites to pass user.verified:
// In ProduceListingWizard.tsx or wherever addProduce is called:
const produce = await addProduce(user.id, produceData, user.verified);
```

**Why This Works:**
- New users enter KYC approval queue with `verified: false`
- Only after admin approval does `verified` become `true`
- Produce inherits farmer's verification status automatically
- Buyers can see which sellers are verified

**Testing Steps:**
1. Register new user (farmer) → Check Firestore → should have `verified: false`
2. New user lists produce → produce should have `verifiedSeller: false`
3. Admin approves user → updates `verified: true`
4. Check produce again → now `verifiedSeller: true` (need to handle this in UI or via trigger)
5. Unverified produce should show warning badge to buyers

**Files to Modify:**
- [ ] `src/services/authService.ts` (line 280, change `verified: true` → `verified: false`)
- [ ] `src/services/produceService.ts` (line 130, add `userVerified` parameter and use it)
- [ ] Update all calls to `addProduce` to pass `user.verified`

---

### [MEDIUM FIX #7] Race Condition in Out-of-Stock Fallback - Lines 236-239

**File:**
- `src/services/orderService.ts:236-239`

**Problem:**
When Firestore transaction fails due to concurrent order from another buyer, the catch block creates the order locally in `localStorage` instead of properly failing. User thinks order is created, but it's never persisted to Firestore.

**Current Code (WRONG):**

```typescript
// orderService.ts line 236-239
try {
  // Transaction to deduct inventory atomically
  await transaction(async (tx) => {
    const produceDoc = tx.get(produceRef);
    if (produceDoc.data().availableQuantity < params.quantity) {
      throw new Error('OUT_OF_STOCK');
    }
    tx.update(produceRef, {
      availableQuantity: produceDoc.data().availableQuantity - params.quantity,
    });
    // Create order...
  });
} catch (error) {
  if (error.message.includes('OUT_OF_STOCK')) {
    // ❌ WRONG: Creating order in localStorage instead of failing
    const orderInLocalStorage = {
      ...order,
      id: generateId(),
      status: 'PENDING_PAYMENT',
    };
    localStorage.setItem(`order_${orderInLocalStorage.id}`, JSON.stringify(orderInLocalStorage));
    return orderInLocalStorage;
  }
  throw error;
}
```

**Fixed Code:**

```typescript
// orderService.ts line 236-239
try {
  // Transaction to deduct inventory atomically
  return await transaction(async (tx) => {
    const produceDoc = tx.get(produceRef);
    if (produceDoc.data().availableQuantity < params.quantity) {
      throw new Error('OUT_OF_STOCK');
    }
    tx.update(produceRef, {
      availableQuantity: produceDoc.data().availableQuantity - params.quantity,
    });
    // Create order...
    return order;
  });
} catch (error) {
  // Let the error propagate to caller
  if (error.message.includes('OUT_OF_STOCK')) {
    throw new Error('This product is out of stock. Please choose another quantity or crop.');
  }
  throw error;
}
```

**Why This Works:**
- Out-of-stock errors are properly reported to UI
- Buyer can choose different quantity or product
- No orphaned orders in localStorage
- Inventory remains consistent

**Testing Steps:**
1. Create produce with 100 kg available
2. Open 2 browser windows (buyer1, buyer2)
3. Buyer1: Add 100 kg to cart
4. Buyer2: Add 100 kg to cart (same produce)
5. Buyer1: Complete checkout → Order creates successfully
6. Buyer2: Try to complete checkout → Should get "OUT_OF_STOCK" error (not succeed with localStorage order)

**Files to Modify:**
- [ ] `src/services/orderService.ts` (lines 236-239, remove localStorage fallback, re-throw error)

---

### [MEDIUM FIX #8] Weak QR Verification in `parseAndVerifyQRPayload` - Lines 138-158

**File:**
- `src/services/qrService.ts:138-158`

**Problem:**
`parseAndVerifyQRPayload` only checks if string starts with `VAYORA_DELIVERY:`, not cryptographic token validity. Allows forged QR codes.

**Current Code (WRONG):**

```typescript
// qrService.ts line 138-158
export function parseAndVerifyQRPayload(payload: string): {
  isValid: boolean;
  orderId?: string;
  token?: string;
  error?: string;
} {
  try {
    if (!payload.startsWith('VAYORA_DELIVERY:')) {
      return { isValid: false, error: 'Invalid QR code format' };
    }
    
    // ❌ WRONG: Only structural check, no signature verification
    const parts = payload.split(':');
    return {
      isValid: true,  // Accepted without checking token hash!
      orderId: parts[1],
      token: parts[2],
    };
  } catch (e) {
    return { isValid: false, error: 'Failed to parse QR code' };
  }
}
```

**Fixed Code:**

```typescript
// qrService.ts line 138-158
export async function parseAndVerifyQRPayload(
  payload: string,
  orderId: string,
  qrTokenHash: string  // Pass the hash from Firestore
): Promise<{
  isValid: boolean;
  orderId?: string;
  token?: string;
  error?: string;
}> {
  try {
    if (!payload.startsWith('VAYORA_DELIVERY:')) {
      return { isValid: false, error: 'Invalid QR code format' };
    }
    
    // ✅ CORRECT: Parse AND cryptographically verify
    const parts = payload.split(':');
    const token = parts[2];
    
    // Verify token against hash
    const tokenHash = await hashToken(token);
    if (tokenHash !== qrTokenHash) {
      return { isValid: false, error: 'QR code verification failed' };
    }
    
    return {
      isValid: true,
      orderId: parts[1],
      token: token,
    };
  } catch (e) {
    return { isValid: false, error: 'Failed to parse QR code' };
  }
}

// Add helper function if not exists:
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Why This Works:**
- Token signature verified cryptographically
- Forged QR codes are rejected
- Matches backend verification in `deliveryVerification.ts`

**Testing Steps:**
1. Get valid QR code from delivery order
2. Scan it → should verify successfully
3. Manually edit QR payload in console
4. Scan edited QR → should fail verification
5. Backend and client validation now match

**Files to Modify:**
- [ ] `src/services/qrService.ts` (lines 138-158, add hash verification)
- [ ] Update call sites to pass `qrTokenHash` from order document

---

## 🟢 LOW PRIORITY FIXES (Nice-to-Have Polish)

### [LOW FIX #9] `markAllAsRead` Does Not Persist to Firestore - Lines 88-92

**File:**
- `src/services/notificationService.ts:88-92`

**Problem:**
`markAllAsRead` updates local `localStorage` but doesn't sync changes to Firestore `notifications` collection. If user refreshes, unread count resets.

**Current Code (WRONG):**

```typescript
// notificationService.ts line 88-92
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
    notifications.forEach((notif: Notification) => {
      notif.read = true;
    });
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    // ❌ WRONG: Changes only in localStorage, not Firestore
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}
```

**Fixed Code:**

```typescript
// notificationService.ts line 88-92
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
    const unreadDocs = await getDocs(q);
    
    // Batch update all unread notifications
    const batch = writeBatch(db);
    unreadDocs.forEach((docRef) => {
      batch.update(docRef.ref, { read: true, readAt: new Date().toISOString() });
    });
    await batch.commit();
    
    // Also update localStorage for UI sync
    const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
    notifications.forEach((notif: Notification) => {
      notif.read = true;
    });
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}
```

**Why This Works:**
- Atomic batch update to Firestore
- Changes persist across sessions
- localStorage stays in sync

**Testing Steps:**
1. As logged-in user, generate several notifications
2. Click "Mark All as Read"
3. Refresh page → notifications should still show as read
4. Check Firestore console → notifications should have `read: true`

**Files to Modify:**
- [ ] `src/services/notificationService.ts` (lines 88-92, add Firestore batch update)

---

### [LOW FIX #10] Missing Real-Time Listener in Order Tracking - Lines 32-36

**File:**
- `src/pages/tracking/LiveOrderTrackingPage.tsx:32-36`

**Problem:**
Page loads order snapshot once on mount but doesn't attach `onSnapshot` listener. User must manually refresh to see driver location or status updates.

**Current Code (WRONG):**

```typescript
// LiveOrderTrackingPage.tsx line 32-36
useEffect(() => {
  const fetchOrder = async () => {
    // ❌ WRONG: Single fetch, no real-time listener
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    setOrder(orderSnap.data() as Order);
  };
  fetchOrder();
}, [orderId]);
```

**Fixed Code:**

```typescript
// LiveOrderTrackingPage.tsx line 32-36
useEffect(() => {
  // ✅ CORRECT: Real-time listener with cleanup
  const orderRef = doc(db, 'orders', orderId);
  
  const unsubscribe = onSnapshot(orderRef, (orderSnap) => {
    if (orderSnap.exists()) {
      setOrder(orderSnap.data() as Order);
    } else {
      setError('Order not found');
    }
  }, (error) => {
    console.error('Error listening to order:', error);
    setError('Failed to load order updates');
  });
  
  // Cleanup listener on unmount
  return () => unsubscribe();
}, [orderId]);
```

**Why This Works:**
- Real-time updates from Firestore
- Driver location, status, ETA automatically sync
- Buyer sees live updates without refresh
- Listener cleanup prevents memory leaks

**Testing Steps:**
1. Place order and go to tracking page
2. In another window, update delivery status (e.g., change from `IN_TRANSIT` to `DELIVERED`)
3. Tracking page should update automatically (no manual refresh needed)
4. ETA and driver location should sync in real-time
5. Refresh page → listener should re-attach cleanly

**Files to Modify:**
- [ ] `src/pages/tracking/LiveOrderTrackingPage.tsx` (lines 32-36, add `onSnapshot` listener)
- [ ] Ensure cleanup in return statement of useEffect

---

## 📋 Master Checklist for Antigravity

### CRITICAL (Must fix before any release)
- [ ] **FIX #1** QR Verification Bypass - `deliveryService.ts:434` & `functions/src/deliveryVerification.ts:80`
- [ ] **FIX #2** Unawaited Promise - `CheckoutPage.tsx:59`
- [ ] **FIX #3** User Self-Verification - `firestore.rules:27-29`
- [ ] **FIX #4** Missing Cloud Function Export - `functions/src/index.ts:44`

### HIGH (Fix before production)
- [ ] **FIX #5** Double Inventory Deduction - `offerService.ts:180` & `orderService.ts:227`

### MEDIUM (Fix this sprint)
- [ ] **FIX #6** Auto-Verified Users - `authService.ts:280` & `produceService.ts:130`
- [ ] **FIX #7** Race Condition - `orderService.ts:236-239`
- [ ] **FIX #8** Weak QR Parser - `qrService.ts:138-158`

### LOW (Polish)
- [ ] **FIX #9** Notification Sync - `notificationService.ts:88-92`
- [ ] **FIX #10** Real-Time Tracking - `LiveOrderTrackingPage.tsx:32-36`

---

## Testing & Validation

After each fix:

1. **Compile & Type Check:**
   ```bash
   npm run build
   ```

2. **Run Tests (if available):**
   ```bash
   npm test
   ```

3. **Deploy Functions (for CRITICAL fixes):**
   ```bash
   firebase deploy --only functions
   ```

4. **Update Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Manual Testing:** Follow steps in each fix section

---

## Notes for Antigravity

- All line numbers are approximate - use Find (Ctrl+F) to locate exact code
- Test in both light and dark themes if UI changed
- Check mobile responsiveness after any UI changes
- Ensure TypeScript compilation passes with no warnings
- Add console.logs for debugging if needed, remove before commit
- Follow existing code style and naming conventions

Good luck! 🚀
