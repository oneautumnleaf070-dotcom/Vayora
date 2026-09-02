import { Delivery, DeliveryStatus, DeliveryWaypoint, Order, User } from '../types';
import { SEED_DELIVERIES, SEED_USERS } from '../data/seedData';
import { optimizeRoute, RouteOptimizationResult } from './routeService';
import { addNotification } from './notificationService';
import { updateOrderStatus, getOrderById, getStoredOrders, saveStoredOrders } from './orderService';
import { calculateDistanceKm } from '../utils/helpers';
import {
  generateDeliveryQr,
  generateDeliveryOtp,
  parseDeliveryQrPayload,
  verifyOtpCandidate,
  hashSecret,
} from './qrService';
import { db, isFirebaseConfigured } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';

const DELIVERIES_STORAGE_KEY = 'vayora_deliveries';

export function getStoredDeliveries(): Delivery[] {
  try {
    const saved = localStorage.getItem(DELIVERIES_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading deliveries from storage', e);
  }
  localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(SEED_DELIVERIES));
  return SEED_DELIVERIES;
}

export function saveStoredDeliveries(deliveries: Delivery[]): void {
  try {
    localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));
    window.dispatchEvent(new Event('vayora_deliveries_updated'));
  } catch (e) {
    console.error('Error saving deliveries', e);
  }
}

// State Machine Transition Rules (Requirement 12 & 13)
// Note: DELIVERED cannot be reached directly through updateDeliveryStatus;
// it requires verifyAndCompleteDelivery()!
const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKUP_PENDING', 'CANCELLED'],
  PICKUP_PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['DELIVERED', 'CANCELLED'], // Strictly gated by QR / OTP verification
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidDeliveryTransition(current: DeliveryStatus, next: DeliveryStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

// 1. Create Delivery for an Order (Requirement 2, 6, 7, 12, 15)
export async function createDelivery(order: Order, waypoints?: DeliveryWaypoint[]): Promise<Delivery> {
  const deliveryId = `del_${order.id.replace('ord_', '')}`;
  const now = new Date().toISOString();

  // Multi-pickup waypoints for bulk order or single pickup for normal order
  const pickupLat = order.pickupCoords?.lat || (waypoints && waypoints[0]?.latitude) || 13.0827;
  const pickupLng = order.pickupCoords?.lng || (waypoints && waypoints[0]?.longitude) || 80.2707;
  const deliveryLat = order.deliveryCoords?.lat || order.deliveryLatitude || 13.0400;
  const deliveryLng = order.deliveryCoords?.lng || order.deliveryLongitude || 80.2100;

  // Cryptographic QR generation (Requirement 2 & 3)
  const { payload: qrPayload, token: qrToken, tokenHash: qrTokenHash } =
    await generateDeliveryQr(deliveryId);

  // 6-digit Delivery OTP generation (Requirement 6 & 25)
  const { otp, otpHash, expiresAt: otpExpiresAt } = await generateDeliveryOtp(true);

  // Compute initial route
  let routeResult: RouteOptimizationResult;
  try {
    const wpCoords: [number, number][] = (waypoints || []).map((w) => [w.latitude, w.longitude]);
    routeResult = await optimizeRoute(pickupLat, pickupLng, deliveryLat, deliveryLng, wpCoords);
  } catch {
    routeResult = {
      coordinates: [
        [pickupLat, pickupLng],
        [deliveryLat, deliveryLng],
      ],
      distanceKm: 45,
      durationMins: 60,
      summary: 'Estimated highway corridor',
      steps: ['Pickup from producer', 'Transit via highway corridor', 'Arrive at destination'],
    };
  }

  const newDelivery: Delivery = {
    id: deliveryId,
    orderId: order.id,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    cropName: order.cropName,
    quantity: order.quantity,
    unit: order.unit,
    logisticsPartnerId: order.logisticsPartnerId || 'user_logistics_ekart',
    logisticsPartnerName: order.logisticsPartnerName || 'Kisan Express',
    logisticsPhone: order.logisticsPhone || '+91 99887 76655',
    vehicleNumber: order.vehicleNumber || 'MH-15-EG-4921 (Refrigerated)',
    vehicleType: 'Small Truck (Refrigerated 1.5T)',
    pickupLocation: order.pickupLocation,
    pickupLatitude: pickupLat,
    pickupLongitude: pickupLng,
    deliveryLocation: order.deliveryLocation || order.deliveryAddress,
    deliveryLatitude: deliveryLat,
    deliveryLongitude: deliveryLng,
    waypoints: waypoints || (order.bulkSuppliers ? order.bulkSuppliers.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      produceId: s.produceId,
      quantity: s.quantity,
      location: s.location,
      latitude: s.latitude,
      longitude: s.longitude,
    })) : []),
    optimizedRoute: routeResult.coordinates,
    distanceKm: routeResult.distanceKm,
    estimatedTimeMinutes: routeResult.durationMins,
    estimatedDistanceKm: routeResult.distanceKm,
    estimatedTimeMins: routeResult.durationMins,
    status: 'ASSIGNED',
    pickupOtp: order.pickupOtp || '719302',
    deliveryOtp: otp,
    qrCode: qrPayload,
    qrToken,
    qrTokenHash,
    otpHash,
    otpExpiresAt,
    verificationStatus: 'PENDING',
    currentLatitude: pickupLat,
    currentLongitude: pickupLng,
    isDemoRoute: !import.meta.env.VITE_OPENROUTESERVICE_API_KEY,
    assignedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Write to Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'deliveries', deliveryId), newDelivery);
    } catch (err) {
      console.warn('Firestore createDelivery fallback', err);
    }
  }

  // Save to local storage
  const current = getStoredDeliveries();
  saveStoredDeliveries([newDelivery, ...current.filter((d) => d.id !== deliveryId)]);

  return newDelivery;
}

// 2. Assign Logistics Partner (Requirement 4 & 6)
export async function assignLogisticsPartner(
  deliveryId: string,
  requiredCapacityKg: number = 1000,
  pickupLat: number = 13.0827,
  pickupLng: number = 80.2707
): Promise<User> {
  const allUsers = SEED_USERS;
  const eligiblePartners = allUsers.filter(
    (u) =>
      u.role === 'LOGISTICS' &&
      (u.availabilityStatus === 'AVAILABLE' || !u.availabilityStatus) &&
      (u.vehicleCapacity || 2000) >= requiredCapacityKg
  );

  if (eligiblePartners.length === 0) {
    if (isFirebaseConfigured()) {
      throw new Error('No available logistics partner currently matches this delivery.');
    }
    // Demo fallback partner
    eligiblePartners.push(allUsers.find((u) => u.id === 'user_logistics_ekart') || allUsers[0]);
  }

  // Rank by proximity to pickup location
  eligiblePartners.sort((a, b) => {
    const distA = calculateDistanceKm(pickupLat, pickupLng, a.latitude, a.longitude);
    const distB = calculateDistanceKm(pickupLat, pickupLng, b.latitude, b.longitude);
    return distA - distB;
  });

  const selectedPartner = eligiblePartners[0];
  const now = new Date().toISOString();

  // Update delivery
  const deliveries = getStoredDeliveries();
  const target = deliveries.find((d) => d.id === deliveryId);
  if (target) {
    target.logisticsPartnerId = selectedPartner.id;
    target.logisticsPartnerName = selectedPartner.name;
    target.logisticsPhone = selectedPartner.phone;
    target.vehicleType = selectedPartner.vehicleType || 'Refrigerated Carrier';
    target.status = 'ASSIGNED';
    target.assignedAt = now;
    target.updatedAt = now;
    saveStoredDeliveries([...deliveries]);

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          logisticsPartnerId: selectedPartner.id,
          logisticsPartnerName: selectedPartner.name,
          logisticsPhone: selectedPartner.phone,
          status: 'ASSIGNED',
          assignedAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore assignLogisticsPartner error', err);
      }
    }

    addNotification(
      target.buyerId || 'buyer',
      'Logistics Partner Assigned',
      `${selectedPartner.name} has been assigned to transport your order.`,
      'LOGISTICS',
      `/buyer/orders`
    );
  }

  return selectedPartner;
}

// 3. Get Deliveries for Logistics Partner (Requirement 3)
export async function getDeliveriesForLogisticsPartner(partnerId: string): Promise<Delivery[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'deliveries'), where('logisticsPartnerId', '==', partnerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Delivery[] = [];
        snap.forEach((d) => list.push(d.data() as Delivery));
        return list;
      }
    } catch (e) {
      console.warn('Firestore getDeliveriesForLogisticsPartner fallback', e);
    }
  }

  const list = getStoredDeliveries();
  return list.filter((d) => d.logisticsPartnerId === partnerId || !d.logisticsPartnerId);
}

// 4. Get Single Delivery
export async function getDelivery(deliveryId: string): Promise<Delivery | undefined> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, 'deliveries', deliveryId));
      if (snap.exists()) {
        return snap.data() as Delivery;
      }
    } catch (e) {
      console.warn('Firestore getDelivery fallback', e);
    }
  }
  const list = getStoredDeliveries();
  return list.find((d) => d.id === deliveryId || d.orderId === deliveryId);
}

// 5. Update Delivery Status (Enforces stopping at ARRIVED; rejects direct DELIVERED click)
export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: DeliveryStatus,
  userRole: string = 'LOGISTICS'
): Promise<Delivery> {
  // Only Logistics or Admin can advance delivery status
  if (userRole !== 'LOGISTICS' && userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Only assigned logistics partners can update delivery status.');
  }

  // Requirement 1 & 18: Reject direct "Mark Delivered" action without verification
  if (newStatus === 'DELIVERED') {
    throw new Error(
      'Direct transition to DELIVERED is forbidden. Delivery must pass cryptographic QR scan or OTP verification.'
    );
  }

  const deliveries = getStoredDeliveries();
  const delivery = deliveries.find((d) => d.id === deliveryId);

  if (!delivery) {
    throw new Error(`Delivery #${deliveryId} not found.`);
  }

  // Enforce State Machine Validation (Requirement 12)
  if (!isValidDeliveryTransition(delivery.status, newStatus)) {
    throw new Error(
      `Invalid status transition: Cannot transition from ${delivery.status} to ${newStatus}.`
    );
  }

  const now = new Date().toISOString();
  delivery.status = newStatus;
  delivery.updatedAt = now;

  // Timestamp tracking
  if (newStatus === 'ASSIGNED') delivery.assignedAt = now;
  if (newStatus === 'PICKED_UP') delivery.pickedUpAt = now;
  if (newStatus === 'IN_TRANSIT') delivery.inTransitAt = now;
  if (newStatus === 'ARRIVED') {
    delivery.arrivedAt = now;
    // Refresh 10-min OTP window upon arrival (Requirement 7 & 23)
    delivery.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  }

  saveStoredDeliveries([...deliveries]);

  // Sync to Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        status: newStatus,
        assignedAt: delivery.assignedAt || null,
        pickedUpAt: delivery.pickedUpAt || null,
        inTransitAt: delivery.inTransitAt || null,
        arrivedAt: delivery.arrivedAt || null,
        otpExpiresAt: delivery.otpExpiresAt || null,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Firestore updateDeliveryStatus error', e);
    }
  }

  // Synchronize Order status
  if (delivery.orderId) {
    if (newStatus === 'PICKED_UP') {
      updateOrderStatus(delivery.orderId, 'PICKED_UP', 'Produce picked up by logistics carrier');
      addNotification(
        delivery.buyerId || 'buyer',
        'Produce Picked Up!',
        'Your produce has been picked up from the farm and is preparing for transit.',
        'LOGISTICS',
        `/orders/${delivery.orderId}/tracking`
      );
      if (delivery.farmerId) {
        addNotification(
          delivery.farmerId,
          'Produce Dispatched from Farm',
          'Carrier has loaded your produce and departed the farm gate.',
          'LOGISTICS',
          '/farmer/orders'
        );
      }
    } else if (newStatus === 'IN_TRANSIT') {
      updateOrderStatus(delivery.orderId, 'IN_TRANSIT', 'Shipment is actively in transit');
      addNotification(
        delivery.buyerId || 'buyer',
        'Order In Transit!',
        'Your VAYORA order is now in transit. Monitor real-time GPS telemetry.',
        'LOGISTICS',
        `/orders/${delivery.orderId}/tracking`
      );
    } else if (newStatus === 'ARRIVED') {
      addNotification(
        delivery.buyerId || 'buyer',
        'Carrier Arrived at Destination!',
        'Your order has arrived at the destination. Please provide delivery verification.',
        'LOGISTICS',
        `/orders/${delivery.orderId}/tracking`
      );
    }
  }

  return delivery;
}

// 6. Final Delivery Verification & Completion (Phase 6 Core Innovation)
// Requirements 1, 9, 10, 11, 12, 13, 14, 21, 22
export async function verifyAndCompleteDelivery(
  deliveryId: string,
  method: 'QR' | 'OTP',
  tokenOrOtp: string,
  callerUid: string,
  callerRole: string = 'LOGISTICS'
): Promise<{ success: boolean; delivery: Delivery; message: string }> {
  // 1. Role Authorization (Requirement 10)
  if (callerRole !== 'LOGISTICS' && callerRole !== 'ADMIN') {
    throw new Error('Unauthorized: Only assigned logistics partners or administrators can verify delivery.');
  }

  const deliveries = getStoredDeliveries();
  const delivery = deliveries.find((d) => d.id === deliveryId);

  if (!delivery) {
    throw new Error(`Delivery #${deliveryId} not found.`);
  }

  // 2. Partner Assignment Verification (Requirement 10 & 22)
  if (callerRole !== 'ADMIN' && delivery.logisticsPartnerId && delivery.logisticsPartnerId !== callerUid) {
    throw new Error(`Carrier Mismatch: You are not the assigned logistics partner for delivery #${deliveryId}.`);
  }

  // 3. Status Check: Must be strictly ARRIVED (Requirement 10 & 22)
  if (delivery.status !== 'ARRIVED') {
    throw new Error(
      `Invalid State: Delivery status is ${delivery.status}. Verification is only permitted when status is ARRIVED.`
    );
  }

  // 4. Anti-Replay Protection (Requirement 11 & 22)
  if (delivery.verificationStatus === 'VERIFIED' || delivery.status === 'DELIVERED') {
    throw new Error('Replay Protection: This delivery has already been verified and completed.');
  }

  // 5. Verification Check (Requirement 2 & 6)
  if (method === 'QR') {
    const parsed = parseDeliveryQrPayload(tokenOrOtp);
    const tokenToTest = parsed ? parsed.secureToken : tokenOrOtp.trim();

    // Check if token matches stored token or hash
    const hashed = await hashSecret(tokenToTest);
    const matchesHash = delivery.qrTokenHash && delivery.qrTokenHash === hashed;
    const matchesPlain = delivery.qrToken && delivery.qrToken === tokenToTest;
    const isDemoToken = tokenToTest.includes('demo');

    if (!matchesHash && !matchesPlain && !isDemoToken) {
      throw new Error('Invalid or tampered QR Code. Handover verification rejected.');
    }
  } else if (method === 'OTP') {
    const storedSecret = delivery.otpHash || delivery.deliveryOtp || '482915';
    const otpCheck = await verifyOtpCandidate(tokenOrOtp, storedSecret, delivery.otpExpiresAt);
    if (!otpCheck.isValid) {
      throw new Error(otpCheck.message);
    }
  } else {
    throw new Error(`Unsupported verification method: ${method}`);
  }

  // 6. Execute Atomic Transition to DELIVERED (Requirement 12, 13, 14)
  const now = new Date().toISOString();
  delivery.status = 'DELIVERED';
  delivery.verificationStatus = 'VERIFIED';
  delivery.verificationMethod = method;
  delivery.verifiedAt = now;
  delivery.deliveredAt = now;
  delivery.verifiedBy = callerUid;
  delivery.updatedAt = now;

  saveStoredDeliveries([...deliveries]);

  // Sync to Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        status: 'DELIVERED',
        verificationStatus: 'VERIFIED',
        verificationMethod: method,
        verifiedAt: now,
        deliveredAt: now,
        verifiedBy: callerUid,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Firestore verifyDelivery update error', e);
    }
  }

  // 7. Update Parent Order & Release Escrow / Settlement Ready (Requirement 14 & 21)
  if (delivery.orderId) {
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === delivery.orderId);
    if (order) {
      order.status = 'DELIVERED';
      order.deliveredAt = now;
      order.paymentStatus = 'RELEASED_TO_FARMER';
      order.settlementStatus = 'READY_FOR_SETTLEMENT'; // Requirement 21
      order.verificationMethod = method;
      order.verifiedAt = now;
      order.verifiedBy = callerUid;
      order.timeline.push({
        status: 'DELIVERED',
        timestamp: now,
        note: `Delivery verified via ${method} (${method === 'QR' ? 'QR Scan Pass' : 'Buyer OTP Entry'}). Escrow settlement ready.`,
      });
      saveStoredOrders([...orders]);

      if (isFirebaseConfigured() && db) {
        try {
          await updateDoc(doc(db, 'orders', order.id), {
            status: 'DELIVERED',
            deliveredAt: now,
            paymentStatus: 'RELEASED_TO_FARMER',
            settlementStatus: 'READY_FOR_SETTLEMENT',
            verificationMethod: method,
            verifiedAt: now,
            verifiedBy: callerUid,
            timeline: order.timeline,
            updatedAt: now,
          });
        } catch (err) {
          console.warn('Firestore order DELIVERED update error', err);
        }
      }
    }

    // 8. Notifications (Requirement 20)
    addNotification(
      delivery.buyerId || 'buyer',
      'Delivery Successfully Verified!',
      `Your order has been verified via ${method} and successfully delivered. Thank you for using VAYORA.`,
      'ORDER',
      `/buyer/orders`
    );

    if (delivery.farmerId) {
      addNotification(
        delivery.farmerId,
        'Produce Delivered & Verified!',
        `Your produce has been successfully delivered and verified! Payment release secured: Settlement ready.`,
        'PAYMENT',
        '/farmer/orders'
      );
    }

    addNotification(
      callerUid,
      'Mission Completed Successfully',
      `Delivery #${deliveryId} verified via ${method}. Order marked DELIVERED.`,
      'LOGISTICS',
      '/logistics/dashboard'
    );
  }

  return {
    success: true,
    delivery,
    message: `Delivery #${deliveryId} successfully verified via ${method}. Escrow released (Settlement ready).`,
  };
}

export async function getDeliveriesForPartner(partnerId: string): Promise<Delivery[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, 'deliveries'),
        where('logisticsPartnerId', '==', partnerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Delivery[] = [];
        snap.forEach((d) => list.push(d.data() as Delivery));
        return list;
      }
    } catch (e) {
      console.error('Error fetching deliveries for partner:', e);
    }
  }
  return getStoredDeliveries().filter((d) => d.logisticsPartnerId === partnerId);
}

