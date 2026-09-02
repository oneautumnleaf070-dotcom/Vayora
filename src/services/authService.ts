import { User, UserRole } from '../types';
import { auth, db } from '../firebase/config';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
    grecaptcha?: any;
  }
}

// Memory cache for active Firebase Phone confirmation result
let currentConfirmationResult: ConfirmationResult | null = null;

// Normalize phone number to international E.164 format (+919026284557)
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

// ----------------------------------------------------
// 1. GLOBAL RECAPTCHA SINGLETON SETUP
// ----------------------------------------------------
export function setupRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier | null {
  if (!auth) {
    console.error('Firebase Auth is not initialized. Please verify your .env configuration.');
    return null;
  }

  // Requirement 3 & 4: Before creating a new verifier, check window.recaptchaVerifier and reuse it!
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  try {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    // Requirement 1 & 6: Create only ONE RecaptchaVerifier instance for the entire app
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Please retry verification.');
      },
    });

    return window.recaptchaVerifier;
  } catch (error: any) {
    console.error('Failed to initialize global RecaptchaVerifier:', error);
    return null;
  }
}

export function clearRecaptcha(): void {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // ignore
    }
    window.recaptchaVerifier = null;
  }
}

// ----------------------------------------------------
// 2. SEND PHONE OTP (REAL FIREBASE PHONE AUTH)
// ----------------------------------------------------
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier?: RecaptchaVerifier | null
): Promise<{ success: boolean; message: string }> {
  const cleanPhone = normalizePhoneNumber(phoneNumber);

  if (!auth) {
    return {
      success: false,
      message: 'Firebase is not initialized. Please verify your .env configuration.',
    };
  }

  try {
    // Reuse existing singleton
    const appVerifier = verifier || window.recaptchaVerifier || setupRecaptcha();
    if (!appVerifier) {
      throw new Error('reCAPTCHA verifier could not be initialized.');
    }

    currentConfirmationResult = await signInWithPhoneNumber(auth, cleanPhone, appVerifier);
    return {
      success: true,
      message: `Verification code sent via SMS to ${cleanPhone}.`,
    };
  } catch (error: any) {
    console.error('Firebase signInWithPhoneNumber technical error:', error);

    // Reset grecaptcha so the same verifier instance can be reused on retry
    try {
      if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
        window.grecaptcha.reset();
      }
    } catch (e) {
      // ignore
    }

    let userMessage = 'Unable to send verification code. Please try again.';

    if (error.code === 'auth/billing-not-enabled') {
      userMessage = 'SMS sending requires testing registration on Spark plan. In Firebase Console -> Authentication -> Sign-in method -> Phone, please add your number under "Phone numbers for testing" (e.g. +91 81730 03375 with test code 123456).';
    } else if (error.code === 'auth/operation-not-allowed') {
      userMessage = 'Phone sign-in is disabled in Firebase Console. Please enable Phone provider under Authentication -> Sign-in method.';
    } else if (error.code === 'auth/unauthorized-domain') {
      userMessage = 'This domain/IP is not authorized. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.';
    } else if (error.code === 'auth/quota-exceeded') {
      userMessage = 'SMS quota exceeded for this project. In Firebase Console, add this number under "Phone numbers for testing".';
    } else if (error.code === 'auth/invalid-phone-number') {
      userMessage = 'Invalid phone number format. Please enter a valid 10-digit mobile number with country code (e.g. +91 90262 84557).';
    } else if (error.code === 'auth/too-many-requests') {
      userMessage = 'Too many requests. Please wait a few minutes before trying again.';
    } else if (error.code === 'auth/captcha-check-failed') {
      userMessage = 'reCAPTCHA verification failed. Please refresh the page and try again.';
    } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      userMessage = 'Invalid Firebase API Key. Please verify VITE_FIREBASE_API_KEY in your .env file.';
    } else if (error.message) {
      userMessage = error.message;
    }

    return {
      success: false,
      message: userMessage,
    };
  }
}

// ----------------------------------------------------
// 3. VERIFY PHONE OTP (REAL FIREBASE CONFIRMATION)
// ----------------------------------------------------
export interface VerifyOtpResult {
  success: boolean;
  user: User | null;
  needsProfile: boolean;
  uid?: string;
  phone?: string;
  error?: string;
}

export async function verifyPhoneOtp(otp: string): Promise<VerifyOtpResult> {
  const cleanOtp = otp.trim();

  if (!currentConfirmationResult) {
    return {
      success: false,
      user: null,
      needsProfile: false,
      error: 'No active verification session found. Please request a new verification code.',
    };
  }

  try {
    const userCredential = await currentConfirmationResult.confirm(cleanOtp);
    const fbUser: FirebaseUser = userCredential.user;
    const uid = fbUser.uid;
    const phone = fbUser.phoneNumber || '';

    // Check if user profile already exists in Firestore /users/{uid}
    const existingProfile = await getUserProfileFromFirestore(uid);
    if (existingProfile) {
      return {
        success: true,
        user: existingProfile,
        needsProfile: false,
        uid,
        phone,
      };
    }

    // Profile does not exist yet -> New user needs to complete profile
    return {
      success: true,
      user: null,
      needsProfile: true,
      uid,
      phone,
    };
  } catch (error: any) {
    console.error('Firebase OTP confirmation error:', error);
    let errMsg = 'The verification code entered is incorrect. Please check your SMS and try again.';
    if (error.code === 'auth/code-expired') {
      errMsg = 'The verification code has expired. Please request a new code.';
    } else if (error.code === 'auth/invalid-verification-code') {
      errMsg = 'Incorrect verification code. Please check your SMS and try again.';
    }
    return {
      success: false,
      user: null,
      needsProfile: false,
      error: errMsg,
    };
  }
}

// ----------------------------------------------------
// 4. FIRESTORE USER PROFILE OPERATIONS (/users/{uid})
// ----------------------------------------------------
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  if (!db) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
  } catch (e) {
    console.error('Error fetching user profile from Firestore:', e);
  }

  return null;
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

export async function createUserProfileInFirestore(input: RegisterUserInput): Promise<User> {
  const validatedRole: UserRole = input.role === 'ADMIN' ? 'FARMER' : input.role;

  const newUser: User = {
    id: input.uid,
    name: input.name.trim(),
    phone: normalizePhoneNumber(input.phone),
    email: input.email.trim(),
    role: validatedRole,
    organizationName: input.organizationName?.trim() || '',
    location: input.location.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    verified: false,
    rating: 5.0,
    totalDeals: 0,
    createdAt: new Date().toISOString(),
  };

  if (db) {
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
    } catch (err) {
      console.error('Error saving user profile to Firestore:', err);
      throw err;
    }
  }

  return newUser;
}

export async function updateUserProfileInFirestore(
  uid: string,
  data: Partial<User>
): Promise<void> {
  if (!db) return;

  try {
    const cleanData = { ...data };
    delete cleanData.id;
    await updateDoc(doc(db, 'users', uid), {
      ...cleanData,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error updating user profile in Firestore:', err);
    throw err;
  }
}

// ----------------------------------------------------
// 5. ADMIN USER MANAGEMENT OPERATIONS
// ----------------------------------------------------
export async function getAllRegisteredUsers(): Promise<User[]> {
  if (!db) return [];

  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    if (!snap.empty) {
      const users: User[] = [];
      snap.forEach((d) => {
        users.push(d.data() as User);
      });
      return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (e) {
    console.error('Error fetching all users from Firestore:', e);
  }

  return [];
}

export async function setUserVerification(userId: string, isVerified: boolean): Promise<void> {
  if (!db) return;

  try {
    await updateDoc(doc(db, 'users', userId), {
      verified: isVerified,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error setting user verification in Firestore:', err);
    throw err;
  }
}

// ----------------------------------------------------
// 6. SIGN OUT
// ----------------------------------------------------
export async function signOutUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out from Firebase Auth:', e);
    }
  }
  currentConfirmationResult = null;
  clearRecaptcha();
}
