// Ports orderService.ts to a thin REST client. Pricing math, OTP/QR
// generation, stock deduction, and the automatic delivery creation now all
// happen authoritatively on the server (see orders.CreateNewOrder /
// orders.CreateDirect in the Go backend) — this file's job is just to shape
// requests and keep dispatching the same window events pages already listen
// for.
import { Order, OrderStatus, BulkSubOrderSupplier } from '../types';
import { api } from '../api/client';

export function getStoredOrders(): Order[] {
  // Kept for backward compatibility; nothing reads this synchronously
  // anymore now that the server is the single source of truth.
  return [];
}

export function saveStoredOrders(_orders: Order[]): void {
  window.dispatchEvent(new Event('vayora_orders_updated'));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  try {
    return await api.get<Order>(`/orders/${id}`);
  } catch {
    return undefined;
  }
}

export async function getOrdersByUser(_userId: string, _role: string): Promise<Order[]> {
  try {
    return await api.get<Order[]>('/orders');
  } catch (e) {
    console.error('Error fetching orders', e);
    return [];
  }
}

export interface CreateOrderParams {
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerOrganization?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerType?: 'FARMER' | 'FPO';
  produceId: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit?: number;
  produceAmount?: number;
  logisticsFee?: number;
  platformFee?: number;
  totalAmount?: number;
  deliveryAddress: string;
  deliveryLocation: string;
  pickupLocation: string;
  pickupCoords: { lat: number; lng: number; address: string };
  deliveryCoords: { lat: number; lng: number; address: string };
  isBulkOrder?: boolean;
  bulkSuppliers?: BulkSubOrderSupplier[];
}

export async function createNewOrder(params: CreateOrderParams): Promise<Order> {
  const order = await api.post<Order>('/orders', {
    farmerId: params.farmerId,
    farmerName: params.farmerName,
    farmerPhone: params.farmerPhone,
    farmerType: params.farmerType,
    produceId: params.produceId,
    cropName: params.cropName,
    quantity: params.quantity,
    unit: params.unit,
    verifiedPricePerUnit: params.pricePerUnit,
    logisticsFee: params.logisticsFee,
    deliveryAddress: params.deliveryAddress,
    deliveryCoords: params.deliveryCoords,
    pickupLocation: params.pickupLocation,
    isBulkOrder: params.isBulkOrder,
    bulkSuppliers: params.bulkSuppliers,
  });
  window.dispatchEvent(new Event('vayora_orders_updated'));
  window.dispatchEvent(new Event('vayora_produce_updated'));
  window.dispatchEvent(new Event('vayora_deliveries_updated'));
  window.dispatchEvent(new Event('vayora_notifs_updated'));
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order | undefined> {
  try {
    const updated = await api.patch<Order>(`/orders/${orderId}/status`, { status: newStatus, note });
    window.dispatchEvent(new Event('vayora_orders_updated'));
    return updated;
  } catch (e) {
    console.error('Error updating order status', e);
    return undefined;
  }
}

export function resetOrdersSeedData(): void {
  // No-op — re-seeding now happens server-side via `npm run seed` (server/scripts/seed.js).
  window.dispatchEvent(new Event('vayora_orders_updated'));
}
