import { Produce, ProduceCategory, QualityGrade, ProduceStatus } from '../types';
import { SEED_PRODUCE } from '../data/seedData';
import { db, isFirebaseConfigured } from '../firebase/config';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const STORAGE_KEY = 'vayora_produce_items';

export function getStoredProduce(): Produce[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading produce from localStorage', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PRODUCE));
  return SEED_PRODUCE;
}

export function saveStoredProduce(items: Produce[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('vayora_produce_updated'));
  } catch (e) {
    console.error('Error saving produce', e);
  }
}

export async function getProduceByFarmer(farmerId: string): Promise<Produce[]> {
  // Try real Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, 'produce'),
        where('farmerId', '==', farmerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreList: Produce[] = [];
        snap.forEach((d) => {
          firestoreList.push(d.data() as Produce);
        });

        // Merge with local state to ensure instant responsiveness
        const localList = getStoredProduce();
        const nonFarmerProduce = localList.filter((p) => p.farmerId !== farmerId);
        saveStoredProduce([...firestoreList, ...nonFarmerProduce]);
        return firestoreList;
      }
    } catch (err) {
      console.warn('Failed to query Firestore /produce collection, using local cache', err);
    }
  }

  // Local storage fallback
  const list = getStoredProduce();
  return list.filter((p) => p.farmerId === farmerId);
}

export async function getProduceById(id: string): Promise<Produce | undefined> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'produce', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Produce;
      }
    } catch (e) {
      console.warn('Error reading single produce from Firestore', e);
    }
  }

  const list = getStoredProduce();
  return list.find((p) => p.id === id);
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
  verifiedSeller?: boolean;
}

export async function addProduce(input: NewProduceInput): Promise<Produce> {
  const currentList = getStoredProduce();
  const newId = `prod_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const nowISO = new Date().toISOString();

  const newProduce: Produce = {
    id: newId,
    ...input,
    availableQuantity: input.quantity,
    status: input.status || 'ACTIVE',
    createdAt: nowISO,
    updatedAt: nowISO,
    verifiedSeller: input.verifiedSeller ?? false,
  };

  // 1. Write to Firestore if connected
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'produce', newId), newProduce);
    } catch (err) {
      console.warn('Firestore setDoc failed for produce, local backup saved', err);
    }
  }

  // 2. Write to local cache & trigger event
  const updatedList = [newProduce, ...currentList];
  saveStoredProduce(updatedList);

  return newProduce;
}

export async function updateProduce(id: string, updates: Partial<Produce>): Promise<Produce | undefined> {
  const currentList = getStoredProduce();
  const nowISO = new Date().toISOString();
  let updatedItem: Produce | undefined;

  const updatedList = currentList.map((item) => {
    if (item.id === id) {
      updatedItem = {
        ...item,
        ...updates,
        updatedAt: nowISO,
      };
      return updatedItem;
    }
    return item;
  });

  saveStoredProduce(updatedList);

  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'produce', id), {
        ...updates,
        updatedAt: nowISO,
      });
    } catch (err) {
      console.warn('Firestore updateDoc error', err);
    }
  }

  return updatedItem;
}

export async function deleteProduce(id: string): Promise<boolean> {
  const currentList = getStoredProduce();
  const filtered = currentList.filter((item) => item.id !== id);
  saveStoredProduce(filtered);

  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'produce', id));
    } catch (err) {
      console.warn('Firestore deleteDoc error', err);
    }
  }

  return true;
}

export async function updateProduceStatus(id: string, status: ProduceStatus): Promise<Produce | undefined> {
  return await updateProduce(id, { status });
}

export function deductProduceQuantity(produceId: string, quantityDeducted: number): void {
  const currentList = getStoredProduce();
  const updated = currentList.map((item) => {
    if (item.id === produceId) {
      const newAvailable = Math.max(0, item.availableQuantity - quantityDeducted);
      const newStatus: ProduceStatus = newAvailable === 0 ? 'SOLD_OUT' : item.status;
      return {
        ...item,
        availableQuantity: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  saveStoredProduce(updated);

  if (isFirebaseConfigured() && db) {
    const target = updated.find((p) => p.id === produceId);
    if (target) {
      updateDoc(doc(db, 'produce', produceId), {
        availableQuantity: target.availableQuantity,
        status: target.status,
        updatedAt: target.updatedAt,
      }).catch((e) => console.warn('deductProduceQuantity firestore error', e));
    }
  }
}

export function resetProduceSeedData(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PRODUCE));
  window.dispatchEvent(new Event('vayora_produce_updated'));
}
