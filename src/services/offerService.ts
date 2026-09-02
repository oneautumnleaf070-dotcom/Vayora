import { Offer, OfferStatus, Order } from '../types';
import { SEED_OFFERS } from '../data/seedData';
import { createNewOrder } from './orderService';
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

const OFFERS_STORAGE_KEY = 'vayora_offers';

export function getStoredOffers(): Offer[] {
  try {
    const saved = localStorage.getItem(OFFERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading offers from storage', e);
  }
  localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(SEED_OFFERS));
  return SEED_OFFERS;
}

export function saveStoredOffers(offers: Offer[]): void {
  try {
    localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(offers));
    window.dispatchEvent(new Event('vayora_offers_updated'));
  } catch (e) {
    console.error('Error saving offers', e);
  }
}

export async function getOffersByFarmer(farmerId: string): Promise<Offer[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'offers'), where('farmerId', '==', farmerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Offer[] = [];
        snap.forEach((d) => list.push(d.data() as Offer));
        return list;
      }
    } catch (e) {
      console.warn('Firestore getOffersByFarmer fallback', e);
    }
  }
  return getStoredOffers().filter((o) => o.farmerId === farmerId);
}

export async function getOffersByBuyer(buyerId: string): Promise<Offer[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'offers'), where('buyerId', '==', buyerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Offer[] = [];
        snap.forEach((d) => list.push(d.data() as Offer));
        return list;
      }
    } catch (e) {
      console.warn('Firestore getOffersByBuyer fallback', e);
    }
  }
  return getStoredOffers().filter((o) => o.buyerId === buyerId);
}

export interface CreateOfferInput {
  produceId: string;
  cropName: string;
  farmerId: string;
  buyerId: string;
  buyerName: string;
  buyerOrganization?: string;
  buyerPhone?: string;
  offeredPrice: number;
  quantity: number;
  message?: string;
}

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  const currentOffers = getStoredOffers();
  const newOfferId = `off_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const nowISO = new Date().toISOString();

  const newOffer: Offer = {
    id: newOfferId,
    produceId: input.produceId,
    cropName: input.cropName,
    farmerId: input.farmerId,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    buyerOrganization: input.buyerOrganization,
    buyerPhone: input.buyerPhone,
    offeredPrice: input.offeredPrice,
    quantity: input.quantity,
    requestedQuantity: input.quantity,
    totalOfferedAmount: input.offeredPrice * input.quantity,
    message: input.message,
    status: 'PENDING',
    distanceKm: 125,
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  // 1. Write to Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'offers', newOfferId), newOffer);
    } catch (err) {
      console.warn('Firestore createOffer error, saved locally', err);
    }
  }

  // 2. Save locally
  saveStoredOffers([newOffer, ...currentOffers]);

  // 3. Notify farmer
  addNotification(
    input.farmerId,
    'New Buyer Offer Received!',
    `${input.buyerName} offered ₹${input.offeredPrice}/kg for ${input.quantity} kg of ${input.cropName}.`,
    'OFFER',
    '/farmer/offers'
  );

  return newOffer;
}

export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus,
  counterPrice?: number
): Promise<Offer | undefined> {
  const currentOffers = getStoredOffers();
  const nowISO = new Date().toISOString();
  let updatedOffer: Offer | undefined;

  const updatedList = currentOffers.map((off) => {
    if (off.id === offerId) {
      updatedOffer = {
        ...off,
        status: newStatus,
        counterPrice: counterPrice !== undefined ? counterPrice : off.counterPrice,
        updatedAt: nowISO,
      };
      return updatedOffer;
    }
    return off;
  });

  saveStoredOffers(updatedList);

  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: newStatus,
        counterPrice: counterPrice || null,
        updatedAt: nowISO,
      });
    } catch (err) {
      console.warn('Firestore updateOfferStatus error', err);
    }
  }

  if (updatedOffer) {
    // If offer was accepted, automatically create order & deduct stock
    if (newStatus === 'ACCEPTED') {
      try {
        const produce = await getProduceById(updatedOffer.produceId);
        if (produce) {
          // Create confirmed order (createNewOrder performs atomic inventory deduction)
          await createNewOrder({
            buyerId: updatedOffer.buyerId,
            buyerName: updatedOffer.buyerName,
            buyerPhone: updatedOffer.buyerPhone || '+91 98234 11223',
            farmerId: updatedOffer.farmerId,
            farmerName: produce.farmerName,
            produceId: updatedOffer.produceId,
            cropName: updatedOffer.cropName,
            quantity: updatedOffer.quantity,
            unit: produce.unit,
            pricePerUnit: updatedOffer.offeredPrice,
            deliveryAddress: 'Buyer Distribution Hub, Maharashtra',
            deliveryLocation: 'Mumbai APMC Facility',
            deliveryCoords: { lat: 19.076, lng: 72.8777, address: 'Mumbai Hub' },
            pickupLocation: produce.location,
            pickupCoords: { lat: produce.latitude, lng: produce.longitude, address: produce.location },
          });
        }
      } catch (orderErr) {
        console.error('Failed to auto-generate order on offer acceptance', orderErr);
      }

      addNotification(
        updatedOffer.buyerId,
        'Offer Accepted by Farmer!',
        `Your offer of ₹${updatedOffer.offeredPrice}/kg for ${updatedOffer.cropName} was accepted! An order has been created.`,
        'OFFER',
        '/buyer/orders'
      );
    } else if (newStatus === 'REJECTED') {
      addNotification(
        updatedOffer.buyerId,
        'Offer Declined',
        `Your offer on ${updatedOffer.cropName} was declined by the producer.`,
        'OFFER',
        '/buyer/marketplace'
      );
    }
  }

  return updatedOffer;
}
