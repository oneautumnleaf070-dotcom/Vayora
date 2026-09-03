// Ports authService.ts from Firebase Phone Auth + Firestore to the
// Node.js/Express backend's TOTP (RFC 6238, Google-Authenticator-style) +
// JWT login flow. Every exported function keeps its original name and shape
// so the handful of pages that import from this file (AuthContext,
// RolePortalLogin, LoginPage, RegisterPage, the Admin pages) need zero
// structural changes beyond dropping the now-unused Recaptcha helpers.
//
// There is no SMS step: sendPhoneOtp() provisions (or reuses) a TOTP secret
// for the phone number server-side and returns the code that is valid right
// now as `devOtp` (dev-mode only, so testers can type it straight from the
// screen instead of scanning a QR code into an authenticator app). On first
// setup for a phone number it also returns `provisioningUri` (an otpauth://
// URL — render it as a QR code to add the account to Google
// Authenticator/Authy) and the raw base32 `secret` for manual entry.
import { User, UserRole } from '../types';
import { api, setToken, clearToken, cacheUser, getCachedUser, disconnectRealtime } from '../api/client';

// Normalize phone number to international E.164 format (+919026284557).
// Kept byte-for-byte identical in behaviour to the original so existing
// phone-entry UX (RolePortalLogin, LoginPage, RegisterPage) needs no changes.
export function normalizePhoneNumber(raw: string): string {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return `+91${digits}`;
}

export interface RegisterUserInput {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  organizationName?: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface VerifyOtpResult {
  success: boolean;
  user: User | null;
  needsProfile: boolean;
  uid?: string;
  phone?: string;
  error?: string;
  devOtp?: string; // dev-mode only: surfaced so the UI can show it directly, no SMS provider needed
}

// ----------------------------------------------------
// TOTP + JWT flow (replaces Firebase Phone Auth)
// ----------------------------------------------------
export async function sendPhoneOtp(
  phoneNumber: string
): Promise<{ success: boolean; message: string; devOtp?: string; provisioningUri?: string; secret?: string }> {
  const cleanPhone = normalizePhoneNumber(phoneNumber);
  try {
    const res = await api.post<{
      success: boolean;
      message: string;
      devOtp?: string;
      provisioningUri?: string;
      secret?: string;
    }>('/auth/otp/send', { phone: cleanPhone }, { auth: false });
    return res;
  } catch (err: any) {
    return { success: false, message: err.message || 'Unable to generate a verification code. Please try again.' };
  }
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const cleanPhone = normalizePhoneNumber(phone);
  const cleanOtp = otp.trim();

  try {
    const res = await api.post<{
      needsProfile: boolean;
      token?: string;
      user?: User;
      uid: string;
    }>('/auth/otp/verify', { phone: cleanPhone, otp: cleanOtp }, { auth: false });

    if (!res.needsProfile && res.token && res.user) {
      setToken(res.token);
      cacheUser(res.user);
      return { success: true, user: res.user, needsProfile: false, uid: res.uid, phone: cleanPhone };
    }

    return { success: true, user: null, needsProfile: true, uid: res.uid, phone: cleanPhone };
  } catch (error: any) {
    return {
      success: false,
      user: null,
      needsProfile: false,
      error: error.message || 'The verification code entered is incorrect. Please check and try again.',
    };
  }
}

// ----------------------------------------------------
// User profile operations (now REST calls against Postgres, not Firestore)
// ----------------------------------------------------
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  try {
    return await api.get<User>(`/users/${uid}`);
  } catch {
    return null;
  }
}

// createUserProfileInFirestore is kept named for backward compatibility with
// AuthContext's completeProfile() call site; it now hits POST /auth/register.
// The server independently re-enforces the ADMIN self-registration
// force-downgrade rule, so this is defence in depth, not the source of truth.
export async function createUserProfileInFirestore(input: RegisterUserInput): Promise<User> {
  const validatedRole: UserRole = input.role === 'ADMIN' ? 'FARMER' : input.role;

  const res = await api.post<{ token: string; user: User }>(
    '/auth/register',
    {
      uid: input.uid,
      name: input.name.trim(),
      phone: normalizePhoneNumber(input.phone),
      email: input.email.trim(),
      role: validatedRole,
      organizationName: input.organizationName?.trim() || '',
      location: input.location.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
    },
    { auth: false }
  );

  setToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export async function updateUserProfileInFirestore(uid: string, data: Partial<User>): Promise<void> {
  await api.put(`/users/${uid}`, data);
}

// ----------------------------------------------------
// Admin user management
// ----------------------------------------------------
export async function getAllRegisteredUsers(): Promise<User[]> {
  try {
    return await api.get<User[]>('/users');
  } catch (e) {
    console.error('Error fetching all users:', e);
    return [];
  }
}

export async function setUserVerification(userId: string, isVerified: boolean): Promise<void> {
  await api.patch(`/users/${userId}/verify`, { verified: isVerified });
}

// ----------------------------------------------------
// Sign out
// ----------------------------------------------------
export async function signOutUser(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // stateless JWT — logout succeeds locally even if the network call fails
  }
  clearToken();
  disconnectRealtime();
}

// Restores a cached session on page reload (a JWT survives a refresh; the
// original app relied on Firebase's own onAuthStateChanged for this).
export function getSessionUser(): User | null {
  return getCachedUser<User>();
}
