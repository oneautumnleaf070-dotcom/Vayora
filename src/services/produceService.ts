// Ports produceService.ts from a localStorage-primary/Firestore-best-effort
// store to a thin REST client — Postgres is now simply the single source of
// truth, so there is no "which copy is authoritative" ambiguity to manage.
// Every exported function keeps its original name/signature/dispatch
// behaviour so no page needed to change.
import { Produce, ProduceCategory, QualityGrade, ProduceStatus } from '../types';
import { api } from '../api/client';

// getStoredProduce() used to be a synchronous localStorage read; it is now
// an async system-wide fetch (GET /api/produce, which the backend resolves
// to "everything" for ADMIN callers and "my own listings" otherwise). Call
// sites that used it synchronously have been updated to await it.
export async function getStoredProduce(): Promise<Produce[]> {
  try {
    return await api.get<Produce[]>('/produce');
  } catch (e) {
    console.error('Error fetching produce', e);
    return [];
  }
}

export function saveStoredProduce(_items: Produce[]): void {
  // No-op kept for backward compatibility with any lingering call sites —
  // Postgres is the single source of truth now, there is nothing to persist
  // locally. Still dispatches the event other components listen for.
  window.dispatchEvent(new Event('vayora_produce_updated'));
}

export async function getProduceByFarmer(farmerId: string): Promise<Produce[]> {
  try {
    return await api.get<Produce[]>(`/produce?farmerId=${encodeURIComponent(farmerId)}`);
  } catch (e) {
    console.error('Error fetching produce by farmer', e);
    return [];
  }
}

export async function getProduceById(id: string): Promise<Produce | undefined> {
  try {
    return await api.get<Produce>(`/produce/${id}`);
  } catch {
    return undefined;
  }
}

export interface NewProduceInput {
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerType: 'FARMER' | 'FPO';
  organizationName?: string;
  cropName: string;
  variety?: string;
  category: ProduceCategory;
  quantity: number;
  unit: 'kg' | 'quintal' | 'tonne' | 'crates';
  qualityGrade: QualityGrade;
  expectedPrice: number;
  aiRecommendedPrice?: number;
  aiMinimumPrice?: number;
  aiMaximumPrice?: number;
  demandLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  demandForecast?: { day: string; expectedDemand: number; projectedPrice: number }[];
  aiExplanation?: string;
  harvestDate: string;
  expiryDate: string;
  location: string;
  latitude: number;
  longitude: number;
  images: string[];
  status?: ProduceStatus;
  organicCertified?: boolean;
}

export async function addProduce(input: NewProduceInput): Promise<Produce> {
  const created = await api.post<Produce>('/produce', input);
  window.dispatchEvent(new Event('vayora_produce_updated'));
  return created;
}

export async function updateProduce(id: string, updates: Partial<Produce>): Promise<Produce | undefined> {
  try {
    const updated = await api.put<Produce>(`/produce/${id}`, updates);
    window.dispatchEvent(new Event('vayora_produce_updated'));
    return updated;
  } catch (e) {
    console.error('Error updating produce', e);
    return undefined;
  }
}

export async function deleteProduce(id: string): Promise<boolean> {
  try {
    await api.del(`/produce/${id}`);
    window.dispatchEvent(new Event('vayora_produce_updated'));
    return true;
  } catch (e) {
    console.error('Error deleting produce', e);
    return false;
  }
}

export async function updateProduceStatus(id: string, status: ProduceStatus): Promise<Produce | undefined> {
  return await updateProduce(id, { status });
}

// Stock deduction now happens atomically on the server as part of order
// creation (see orders.CreateNewOrder in the Go backend) — this client-side
// version is kept only so any lingering call site doesn't crash; it no
// longer needs to do anything since the server is the single source of truth
// and already dispatched the relevant events.
export function deductProduceQuantity(_produceId: string, _quantityDeducted: number): void {
  window.dispatchEvent(new Event('vayora_produce_updated'));
}

export function resetProduceSeedData(): void {
  // No-op — re-seeding now happens server-side via `npm run seed` (server/scripts/seed.js).
  window.dispatchEvent(new Event('vayora_produce_updated'));
}
