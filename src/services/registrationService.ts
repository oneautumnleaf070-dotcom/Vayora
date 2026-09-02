import { UserRole, User } from '../types';
import { db, isFirebaseConfigured } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { logAdminAction } from './adminService';
import { normalizePhoneNumber } from './authService';

export interface LogisticsRegistrationData {
  // Step 1
  fullName: string;
  phone: string;
  email: string;
  vehicleType: '2-wheeler' | '3-wheeler (Auto)' | 'Pickup Truck (Tata Ace)' | 'Medium Truck (14ft)' | 'Heavy Multi-Axle' | 'Reefer (Cold Chain)';
  vehicleCapacityKg: number;
  vehicleRegNumber: string;
  // Step 2
  location: string;
  serviceArea: string;
  languages: string[];
  availability: 'Full-time' | 'Part-time' | 'Flexible Corridor';
  // Step 3
  idProofDoc?: string;
  vehicleRcDoc?: string;
  insuranceDoc?: string;
  agreedToTerms: boolean;
}

export interface AdminInvitationData {
  fullName: string;
  phone: string;
  email: string;
  adminRole: 'SUPER_ADMIN' | 'REGIONAL_MODERATOR' | 'OPERATIONS_SUPPORT';
  permissions: {
    manageUsers: boolean;
    resolveDisputes: boolean;
    settlePayments: boolean;
    viewAnalytics: boolean;
    manageListings: boolean;
  };
  notes?: string;
}

const LOGISTICS_APPS_KEY = 'vayora_logistics_applications';
const ADMIN_INVITES_KEY = 'vayora_admin_invitations';

/**
 * Submit Logistics Partner Application
 */
export async function submitLogisticsRegistration(
  data: LogisticsRegistrationData
): Promise<{ applicationId: string; success: boolean }> {
  const normalizedPhone = normalizePhoneNumber(data.phone);
  const appId = `logapp_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  const applicationRecord = {
    id: appId,
    ...data,
    phone: normalizedPhone,
    status: 'PENDING_REVIEW',
    submittedAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'logistics_applications', appId), applicationRecord);
    } catch (e) {
      console.warn('Firestore write application fallback', e);
    }
  }

  // Save to local storage cache
  try {
    const saved = localStorage.getItem(LOGISTICS_APPS_KEY);
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem(LOGISTICS_APPS_KEY, JSON.stringify([applicationRecord, ...list]));
  } catch (e) {
    console.error('Error saving local application record', e);
  }

  return { applicationId: appId, success: true };
}

/**
 * Check Logistics Partner application review status by phone
 */
export async function checkLogisticsRegistrationStatus(
  phone: string
): Promise<{ exists: boolean; status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'; submittedAt?: string; name?: string }> {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'logistics_applications'), where('phone', '==', normalizedPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return {
          exists: true,
          status: d.status || 'PENDING_REVIEW',
          submittedAt: d.submittedAt,
          name: d.fullName,
        };
      }
    } catch (e) {
      console.warn('Firestore check application status fallback', e);
    }
  }

  // Check localStorage
  try {
    const saved = localStorage.getItem(LOGISTICS_APPS_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      const found = list.find((a: any) => a.phone === normalizedPhone);
      if (found) {
        return {
          exists: true,
          status: found.status || 'PENDING_REVIEW',
          submittedAt: found.submittedAt,
          name: found.fullName,
        };
      }
    }
  } catch (e) {
    console.error('Error reading local applications', e);
  }

  return { exists: false };
}

/**
 * Submit Super-Admin Invitation for new administrator
 */
export async function submitAdminInvitation(
  data: AdminInvitationData,
  adminActor?: { id: string; name: string }
): Promise<{ inviteId: string; inviteToken: string; success: boolean }> {
  const normalizedPhone = normalizePhoneNumber(data.phone);
  const inviteId = `inv_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const inviteToken = `vayora_admin_${Math.random().toString(36).substring(2, 12)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const inviteRecord = {
    id: inviteId,
    inviteToken,
    ...data,
    phone: normalizedPhone,
    status: 'ACTIVE_INVITE',
    createdBy: adminActor?.name || 'Super Admin',
    createdAt: now.toISOString(),
    expiresAt,
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'admin_invitations', inviteId), inviteRecord);
    } catch (e) {
      console.warn('Firestore admin invite write fallback', e);
    }
  }

  // Save to local cache
  try {
    const saved = localStorage.getItem(ADMIN_INVITES_KEY);
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem(ADMIN_INVITES_KEY, JSON.stringify([inviteRecord, ...list]));
  } catch (e) {
    console.error('Error saving local invite record', e);
  }

  // Log in Audit Trail
  await logAdminAction(
    adminActor?.id || 'admin_root',
    adminActor?.name || 'Super Admin',
    'BULK_ACTION',
    `Issued admin invitation to ${data.fullName} (${normalizedPhone}) for tier ${data.adminRole}`
  );

  return { inviteId, inviteToken, success: true };
}

/**
 * Fetch all active admin invitations
 */
export async function getAdminInvitations(): Promise<any[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(query(collection(db, 'admin_invitations'), orderBy('createdAt', 'desc')));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('Firestore get invitations fallback', e);
    }
  }

  try {
    const saved = localStorage.getItem(ADMIN_INVITES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading local invites', e);
  }
  return [];
}
