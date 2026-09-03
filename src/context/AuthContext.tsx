import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole } from '../types';
import { getToken, connectRealtime, disconnectRealtime } from '../api/client';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  createUserProfileInFirestore,
  getUserProfileFromFirestore,
  signOutUser,
  getSessionUser,
  RegisterUserInput,
  VerifyOtpResult,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  pendingPhoneUser: { uid: string; phone: string } | null;
  sendOtp: (
    phone: string,
    containerId?: string
  ) => Promise<{ success: boolean; message: string; devOtp?: string; provisioningUri?: string; secret?: string }>;
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
  // The mock-OTP flow (unlike Firebase's ConfirmationResult object) needs the
  // phone number again at verify time — sendOtp stashes it here.
  const pendingOtpPhoneRef = useRef<string>('');

  const refreshUser = useCallback(async () => {
    const token = getToken();
    const cached = getSessionUser();
    if (token && cached) {
      try {
        const fresh = await getUserProfileFromFirestore(cached.id);
        setUser(fresh || cached);
      } catch {
        setUser(cached);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Restore session from a persisted JWT on first mount (replaces Firebase's
  // onAuthStateChanged listener — a JWT is stateless, so "am I logged in?"
  // is just "do I have a valid token", checked once here).
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      connectRealtime();
    } else {
      disconnectRealtime();
    }
  }, [user]);

  const sendOtp = async (phone: string, _containerId?: string) => {
    pendingOtpPhoneRef.current = phone;
    return sendPhoneOtp(phone);
  };

  const verifyOtp = async (otp: string): Promise<VerifyOtpResult> => {
    const result = await verifyPhoneOtp(pendingOtpPhoneRef.current, otp);
    if (result.success && result.user) {
      setUser(result.user);
      setPendingPhoneUser(null);
    } else if (result.success && result.needsProfile && result.uid) {
      setPendingPhoneUser({ uid: result.uid, phone: result.phone || pendingOtpPhoneRef.current });
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
