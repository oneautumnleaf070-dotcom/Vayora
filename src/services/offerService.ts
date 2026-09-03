// Ports offerService.ts to a thin REST client. The business logic this file
// used to own client-side — computing totalOfferedAmount, and on ACCEPTED,
// deducting stock then creating the order — now lives server-side (see the
// Go backend's offers.Create / offers.UpdateStatus), which closes a real
// bug the original had: it deducted produce stock twice (once here, once
// again inside orderService.createNewOrder's own fallback path). The server
// now deducts exactly once, atomically, alongside order creation.
import { Offer, OfferStatus, Order } from '../types';
import { api } from '../api/client';

export function getStoredOffers(): Offer[] {
  // Kept for backward compatibility; nothing reads this synchronously
  // anymore now that the server is the single source of truth.
  return [];
}

export function saveStoredOffers(_offers: Offer[]): void {
  window.dispatchEvent(new Event('vayora_offers_updated'));
}

export async function getOffersByFarmer(farmerId: string): Promise<Offer[]> {
  try {
    return await api.get<Offer[]>('/offers');
  } catch (e) {
    console.error('Error fetching offers by farmer', e);
    return [];
  }
}

export async function getOffersByBuyer(buyerId: string): Promise<Offer[]> {
  try {
    return await api.get<Offer[]>('/offers');
  } catch (e) {
    console.error('Error fetching offers by buyer', e);
    return [];
  }
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
  const created = await api.post<Offer>('/offers', {
    produceId: input.produceId,
    buyerName: input.buyerName,
    buyerOrganization: input.buyerOrganization,
    buyerPhone: input.buyerPhone,
    offeredPrice: input.offeredPrice,
    quantity: input.quantity,
    message: input.message,
  });
  window.dispatchEvent(new Event('vayora_offers_updated'));
  window.dispatchEvent(new Event('vayora_notifs_updated'));
  return created;
}

export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus,
  counterPrice?: number
): Promise<Offer | undefined> {
  try {
    const res = await api.patch<{ offer: Offer; order: Order | null }>(`/offers/${offerId}/status`, {
      status: newStatus,
      counterPrice,
    });
    window.dispatchEvent(new Event('vayora_offers_updated'));
    window.dispatchEvent(new Event('vayora_notifs_updated'));
    if (res.order) {
      window.dispatchEvent(new Event('vayora_orders_updated'));
      window.dispatchEvent(new Event('vayora_produce_updated'));
      window.dispatchEvent(new Event('vayora_deliveries_updated'));
    }
    return res.offer;
  } catch (e) {
    console.error('Error updating offer status', e);
    return undefined;
  }
}
