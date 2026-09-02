import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  createUserProfileInFirestore,
  getUserProfileFromFirestore,
  signOutUser,
  RegisterUserInput,
  VerifyOtpResult,
  setupRecaptcha,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  pendingPhoneUser: { uid: string; phone: string } | null;
  sendOtp: (phone: string, containerId?: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (otp: string) => Promise<VerifyOtpResult>;
  completeProfile: (input: RegisterUserInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingPhoneUser, setPendingPhoneUser] = useState<{ uid: string; phone: string } | null>(null);

  const refreshUser = useCallback(async () => {
    if (auth && auth.currentUser) {
      const profile = await getUserProfileFromFirestore(auth.currentUser.uid);
      if (profile) {
        setUser(profile);
      } else {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const profile = await getUserProfileFromFirestore(fbUser.uid);
            if (profile) {
              setUser(profile);
              setPendingPhoneUser(null);
            } else {
              // User is authenticated via Phone OTP but profile not created yet in Firestore
              setPendingPhoneUser({ uid: fbUser.uid, phone: fbUser.phoneNumber || '' });
              setUser(null);
            }
          } catch (e) {
            console.error('Error retrieving user profile from Firestore:', e);
            setUser(null);
          }
        } else {
          setUser(null);
          setPendingPhoneUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const sendOtp = async (phone: string, containerId: string = 'recaptcha-container') => {
    const verifier = setupRecaptcha(containerId);
    return sendPhoneOtp(phone, verifier);
  };

  const verifyOtp = async (otp: string): Promise<VerifyOtpResult> => {
    const result = await verifyPhoneOtp(otp);
    if (result.success && result.user) {
      setUser(result.user);
      setPendingPhoneUser(null);
    } else if (result.success && result.needsProfile && result.uid) {
      setPendingPhoneUser({ uid: result.uid, phone: result.phone || '' });
    }
    return result;
  };

  const completeProfile = async (input: RegisterUserInput): Promise<User> => {
    const newUser = await createUserProfileInFirestore(input);
    setUser(newUser);
    setPendingPhoneUser(null);
    return newUser;
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
    setPendingPhoneUser(null);
  };

  const role: UserRole = user?.role || 'FARMER';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        loading,
        pendingPhoneUser,
        sendOtp,
        verifyOtp,
        completeProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
