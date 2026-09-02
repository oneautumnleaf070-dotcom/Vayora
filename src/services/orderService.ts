import { Order, OrderStatus, PaymentStatus, BulkSubOrderSupplier, Produce } from '../types';
import { SEED_ORDERS } from '../data/seedData';
import { generateOTP, generateOrderId, generateQRPayload } from '../utils/helpers';
import { deductProduceQuantity, getProduceById } from './produceService';
import { addNotification } from './notificationService';
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
  runTransaction,
} from 'firebase/firestore';

const ORDERS_STORAGE_KEY = 'vayora_orders';

export function getStoredOrders(): Order[] {
  try {
    const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading orders from storage', e);
  }
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(SEED_ORDERS));
  return SEED_ORDERS;
}

export function saveStoredOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('vayora_orders_updated'));
  } catch (e) {
    console.error('Error saving orders', e);
  }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, 'orders', id));
      if (snap.exists()) {
        return snap.data() as Order;
      }
    } catch (e) {
      console.warn('Firestore getOrderById error', e);
    }
  }

  const list = getStoredOrders();
  return list.find((o) => o.id === id);
}

export async function getOrdersByUser(userId: string, role: string): Promise<Order[]> {
  if (isFirebaseConfigured() && db) {
    try {
      let q = query(collection(db, 'orders'));
      if (role === 'BUYER') {
        q = query(collection(db, 'orders'), where('buyerId', '==', userId));
      } else if (role === 'FARMER' || role === 'FPO') {
        q = query(collection(db, 'orders'), where('farmerId', '==', userId));
      } else if (role === 'LOGISTICS') {
        q = query(collection(db, 'orders'), where('logisticsPartnerId', '==', userId));
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Order[] = [];
        snap.forEach((d) => list.push(d.data() as Order));

        // Merge with local newly created orders
        const local = getStoredOrders();
        const nonDuplicate = local.filter((o) => !list.some((l) => l.id === o.id));
        return [...list, ...nonDuplicate];
      }
    } catch (e) {
      console.warn('Firestore getOrdersByUser error, using local orders', e);
    }
  }

  const list = getStoredOrders();
  if (role === 'BUYER') {
    return list.filter((o) => o.buyerId === userId);
  }
  if (role === 'FARMER' || role === 'FPO') {
    return list.filter(
      (o) =>
        o.farmerId === userId ||
        (o.bulkSuppliers && o.bulkSuppliers.some((s) => s.supplierId === userId))
    );
  }
  if (role === 'LOGISTICS') {
    return list.filter((o) => o.logisticsPartnerId === userId || !o.logisticsPartnerId);
  }
  return list; // Admin gets all
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
  pricePerUnit?: number; // Verified on server/service
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
  const orders = getStoredOrders();
  const orderId = generateOrderId();
  const deliveryOtp = generateOTP();
  const pickupOtp = generateOTP();
  const now = new Date().toISOString();

  // 1. Validation & Server-Side / Service Price & Stock Calculation
  let verifiedPricePerUnit = params.pricePerUnit || 30;
  let targetProduce: Produce | undefined;

  if (!params.isBulkOrder) {
    targetProduce = await getProduceById(params.produceId);
    if (targetProduce) {
      verifiedPricePerUnit = targetProduce.expectedPrice;
      if (targetProduce.availableQuantity < params.quantity) {
        throw new Error(
          `Insufficient stock available. Requested: ${params.quantity} ${params.unit}, Available: ${targetProduce.availableQuantity} ${params.unit}`
        );
      }
    }
  }

  // Exact Transparent Calculation
  const produceAmount = params.quantity * verifiedPricePerUnit;
  const logisticsFee = params.logisticsFee !== undefined ? params.logisticsFee : 500;
  const platformFee = 100; // Flat nominal facilitation fee
  const totalAmount = produceAmount + logisticsFee + platformFee;
  const farmerAmount = produceAmount; // 100% direct produce value!

  const qrCode = generateQRPayload(orderId, deliveryOtp, totalAmount);

  const newOrder: Order = {
    id: orderId,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    buyerPhone: params.buyerPhone,
    buyerOrganization: params.buyerOrganization,
    farmerId: params.farmerId,
    farmerName: params.farmerName,
    farmerPhone: params.farmerPhone,
    farmerType: params.farmerType,
    produceId: params.produceId,
    cropName: params.cropName,
    quantity: params.quantity,
    unit: params.unit,
    pricePerUnit: verifiedPricePerUnit,
    produceAmount,
    farmerAmount,
    logisticsFee,
    logisticsAmount: logisticsFee,
    platformFee,
    totalAmount,
    deliveryAddress: params.deliveryAddress,
    deliveryLatitude: params.deliveryCoords.lat,
    deliveryLongitude: params.deliveryCoords.lng,
    pickupLocation: params.pickupLocation,
    deliveryLocation: params.deliveryLocation,
    pickupCoords: params.pickupCoords,
    deliveryCoords: params.deliveryCoords,
    logisticsPartnerId: 'user_logistics_ekart',
    logisticsPartnerName: 'Kisan Express Agri-Logistics',
    logisticsPhone: '+91 99887 76655',
    vehicleNumber: 'MH-15-EG-4921 (Refrigerated 1.5T)',
    status: 'PAYMENT_CONFIRMED',
    paymentStatus: 'PAID',
    deliveryOtp,
    pickupOtp,
    qrCode,
    isBulkOrder: params.isBulkOrder || false,
    bulkSuppliers: params.bulkSuppliers,
    timeline: [
      { status: 'PLACED', timestamp: now, note: 'Order confirmed by buyer' },
      {
        status: 'PAYMENT_CONFIRMED',
        timestamp: now,
        note: `₹${totalAmount.toLocaleString('en-IN')} secured in VAYORA Smart Escrow (100% farmer value protected)`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // 2. Atomic Stock Reduction with Firestore Transaction (or local fallback)
  if (isFirebaseConfigured() && db && targetProduce) {
    try {
      const produceDocRef = doc(db, 'produce', params.produceId);
      await runTransaction(db, async (transaction) => {
        const prodDoc = await transaction.get(produceDocRef);
        if (!prodDoc.exists()) {
          throw new Error('Produce document does not exist.');
        }
        const currentQty = prodDoc.data().availableQuantity || 0;
        if (currentQty < params.quantity) {
          throw new Error('Stock unavailable in Firestore.');
        }
        const newQty = Math.max(0, currentQty - params.quantity);
        transaction.update(produceDocRef, {
          availableQuantity: newQty,
          status: newQty === 0 ? 'SOLD_OUT' : prodDoc.data().status,
          updatedAt: now,
        });
      });

      // Save order in Firestore
      await setDoc(doc(db, 'orders', orderId), newOrder);
    } catch (txErr: any) {
      if (txErr.message && (txErr.message.includes('Stock unavailable') || txErr.message.includes('does not exist'))) {
        throw new Error('This produce is out of stock or quantity is no longer available.');
      }
      console.warn('Firestore transaction error, updating local state', txErr);
      deductProduceQuantity(params.produceId, params.quantity);
    }
  } else {
    // Local state stock deduction
    if (params.isBulkOrder && params.bulkSuppliers) {
      params.bulkSuppliers.forEach((s) => {
        deductProduceQuantity(s.produceId, s.quantity);
      });
    } else {
      deductProduceQuantity(params.produceId, params.quantity);
    }
  }

  // 3. Save order to local storage
  const updatedOrders = [newOrder, ...orders];
  saveStoredOrders(updatedOrders);

  // 4. Notifications
  addNotification(
    params.farmerId,
    'New Order Confirmed!',
    `${params.buyerName} placed an order for ${params.quantity} ${params.unit} of ${params.cropName} (Total: ₹${totalAmount.toLocaleString('en-IN')}).`,
    'ORDER',
    '/farmer/orders'
  );

  addNotification(
    params.buyerId,
    'Order Placed Successfully!',
    `Your direct order #${orderId} for ${params.quantity} ${params.unit} of ${params.cropName} is confirmed.`,
    'ORDER',
    '/buyer/orders'
  );

  return newOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order | undefined> {
  const orders = getStoredOrders();
  let updatedOrder: Order | undefined;
  const now = new Date().toISOString();

  const updatedList = orders.map((order) => {
    if (order.id === orderId) {
      const isDelivered = newStatus === 'DELIVERED';
      updatedOrder = {
        ...order,
        status: newStatus,
        paymentStatus: isDelivered ? ('RELEASED_TO_FARMER' as PaymentStatus) : order.paymentStatus,
        updatedAt: now,
        timeline: [
          ...order.timeline,
          {
            status: newStatus,
            timestamp: now,
            note: note || `Status updated to ${newStatus}`,
          },
        ],
      };
      return updatedOrder;
    }
    return order;
  });

  saveStoredOrders(updatedList);

  if (isFirebaseConfigured() && db) {
    try {
      const isDelivered = newStatus === 'DELIVERED';
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        paymentStatus: isDelivered ? 'RELEASED_TO_FARMER' : undefined,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Firestore updateOrderStatus error', e);
    }
  }

  return updatedOrder;
}

export function resetOrdersSeedData(): void {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(SEED_ORDERS));
  window.dispatchEvent(new Event('vayora_orders_updated'));
}
