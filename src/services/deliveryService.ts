// Ports deliveryService.ts to a thin REST client. The state machine, QR/OTP
// cryptographic verification, and order-settlement sync now all happen
// authoritatively on the server (see the Go backend's deliveries package) —
// notably including createDelivery, which the original app defined but
// never actually called from any page (LogisticsDashboard only ever showed
// seed data). The server now calls its equivalent automatically from
// orders.CreateNewOrder, so every real order gets a real delivery record.
import { Delivery, DeliveryStatus, DeliveryWaypoint, Order, User } from '../types';
import { api } from '../api/client';

export function getStoredDeliveries(): Delivery[] {
  // Kept for backward compatibility; nothing reads this synchronously
  // anymore now that the server is the single source of truth.
  return [];
}

export function saveStoredDeliveries(_deliveries: Delivery[]): void {
  window.dispatchEvent(new Event('vayora_deliveries_updated'));
}

// State machine kept client-side too (for optimistic UI decisions like
// disabling buttons) — must stay numerically identical to models.go's
// ValidTransitions, which is the actual source of truth enforced server-side.
const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKUP_PENDING', 'CANCELLED'],
  PICKUP_PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidDeliveryTransition(current: DeliveryStatus, next: DeliveryStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

// createDelivery is no longer something the frontend needs to call — the
// server creates it automatically as part of order creation. Kept exported
// (fetching the delivery that already exists for the order) so it remains a
// safe no-crash call for any lingering reference.
export async function createDelivery(order: Order, _waypoints?: DeliveryWaypoint[]): Promise<Delivery | undefined> {
  return getDelivery(order.id);
}

// assignLogisticsPartner is now a no-op — every order already carries the
// baked-in demo logistics partner from creation (see orders.CreateNewOrder),
// matching the original app's own single-demo-partner assumption.
export async function assignLogisticsPartner(
  _deliveryId: string,
  _requiredCapacityKg: number = 1000,
  _pickupLat: number = 13.0827,
  _pickupLng: number = 80.2707
): Promise<User | undefined> {
  return undefined;
}

export async function getDeliveriesForLogisticsPartner(partnerId: string): Promise<Delivery[]> {
  try {
    return await api.get<Delivery[]>(`/deliveries?partnerId=${encodeURIComponent(partnerId)}`);
  } catch (e) {
    console.error('Error fetching deliveries for logistics partner', e);
    return [];
  }
}

export async function getDelivery(deliveryId: string): Promise<Delivery | undefined> {
  try {
    // Accept either a delivery id or an order id, mirroring the original's
    // lookup-by-either behaviour.
    const id = deliveryId.startsWith('del_') ? deliveryId : `del_${deliveryId.replace('ord_', '')}`;
    return await api.get<Delivery>(`/deliveries/${id}`);
  } catch {
    try {
      return await api.get<Delivery>(`/deliveries/${deliveryId}`);
    } catch {
      return undefined;
    }
  }
}

export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: DeliveryStatus,
  _userRole: string = 'LOGISTICS'
): Promise<Delivery> {
  return await api.patch<Delivery>(`/deliveries/${deliveryId}/status`, { status: newStatus }).then((d) => {
    window.dispatchEvent(new Event('vayora_deliveries_updated'));
    window.dispatchEvent(new Event('vayora_orders_updated'));
    window.dispatchEvent(new Event('vayora_notifs_updated'));
    return d;
  });
}

export async function verifyAndCompleteDelivery(
  deliveryId: string,
  method: 'QR' | 'OTP',
  tokenOrOtp: string,
  _callerUid: string,
  _callerRole: string = 'LOGISTICS'
): Promise<{ success: boolean; delivery: Delivery; message: string }> {
  const delivery = await api.post<Delivery>(`/deliveries/${deliveryId}/verify`, {
    method,
    credential: tokenOrOtp,
  });
  window.dispatchEvent(new Event('vayora_deliveries_updated'));
  window.dispatchEvent(new Event('vayora_orders_updated'));
  window.dispatchEvent(new Event('vayora_notifs_updated'));
  return {
    success: true,
    delivery,
    message: `Delivery #${deliveryId} successfully verified via ${method}. Escrow released (Settlement ready).`,
  };
}

export async function getDeliveriesForPartner(partnerId: string): Promise<Delivery[]> {
  return getDeliveriesForLogisticsPartner(partnerId);
}

// Admin-only: every delivery across every partner. The server only honours
// this for an ADMIN-authenticated caller (GET /deliveries with no
// partnerId) — anyone else gets their own partner-scoped list instead.
export async function getAllDeliveries(): Promise<Delivery[]> {
  try {
    return await api.get<Delivery[]>('/deliveries');
  } catch (e) {
    console.error('Error fetching all deliveries', e);
    return [];
  }
}
