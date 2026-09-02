import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { normalizePhoneNumber } from '../../services/authService';
import { Phone, KeyRound, ArrowRight, Lock, Home, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';

// Shared visual + redirect config for every role-specific login portal.
// Keeping this in one place means AdminLoginPage / LogisticsLoginPage stay
// tiny wrappers that only declare *what* differs between the two portals.
export interface RolePortalTheme {
  icon: React.ReactNode;
  gradient: string; // header badge background
  buttonClass: string; // primary CTA button
  ring: string; // focus ring / accents
  chipBg: string; // small info chip background
  chipText: string;
}

interface RolePortalLoginProps {
  expectedRole: UserRole;
  dashboardPath: string;
  heading: string;
  subheading: string;
  restrictedNote: string;
  theme: RolePortalTheme;
  /** Shown when the phone number verifies but has no VAYORA account yet. */
  newAccountMessage: React.ReactNode;
}

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  FARMER: '/farmer/dashboard',
  FPO: '/fpo/dashboard',
  BUYER: '/buyer/marketplace',
  LOGISTICS: '/logistics/dashboard',
  ADMIN: '/admin/dashboard',
};

export const RolePortalLogin: React.FC<RolePortalLoginProps> = ({
  expectedRole,
  dashboardPath,
  heading,
  subheading,
  restrictedNote,
  theme,
  newAccountMessage,
}) => {
  const { user, sendOtp, verifyOtp, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [mismatchRole, setMismatchRole] = useState<UserRole | null>(null);
  const [noAccountFound, setNoAccountFound] = useState(false);

  // If already signed in, route them correctly instead of re-prompting for OTP.
  useEffect(() => {
    if (user) {
      if (user.role === expectedRole) {
        navigate(dashboardPath, { replace: true });
      } else {
        setMismatchRole(user.role);
      }
    }
  }, [user]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = normalizePhoneNumber(phone);
    if (!formatted || formatted.length < 10) {
      showToast('error', 'Invalid Phone', 'Please enter a valid mobile number with country code (e.g. +91 98765 43210).');
      return;
    }

    setPhone(formatted);
    setLoading(true);
    try {
      const res = await sendOtp(formatted);
      if (res.success) {
        setStep('otp');
        showToast('info', 'OTP Sent', res.message);
      } else {
        showToast('error', 'Failed to Send OTP', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Authentication Error', err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      showToast('error', 'Invalid Code', 'Please enter the 6-digit verification code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(otp);
      if (result.success) {
        if (result.needsProfile) {
          // No VAYORA profile yet for this number.
          if (expectedRole === 'ADMIN') {
            // Never route an unknown number into general registration from the
            // Admin portal — admin accounts are promoted, never self-created.
            setNoAccountFound(true);
          } else {
            showToast('info', 'Profile Setup Required', 'Please complete your name and depot/fleet details.');
            navigate('/complete-profile');
          }
        } else if (result.user) {
          if (result.user.role === expectedRole) {
            showToast('success', 'Authentication Successful', `Welcome back, ${result.user.name}!`);
            navigate(dashboardPath, { replace: true });
          } else {
            setMismatchRole(result.user.role);
          }
        }
      } else {
        showToast('error', 'Verification Failed', result.error || 'The verification code is incorrect. Please try again.');
      }
    } catch (err: any) {
      showToast('error', 'Verification Error', err.message || 'The verification code is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Restricted state: verified, but the account holds a different role ----
  if (mismatchRole) {
    const targetHome = ROLE_HOME_PATHS[mismatchRole] || '/';
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-soft p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              This portal is for <strong>{expectedRole}</strong> accounts only. Your account is registered as{' '}
              <strong className="text-brand-800">{mismatchRole}</strong>.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
            {restrictedNote}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link to={targetHome} className="w-full">
              <Button variant="primary" size="md" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
                Go to My {mismatchRole} Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                setMismatchRole(null);
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign In with a Different Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- No account found for this number on a restricted (Admin) portal ----
  if (noAccountFound) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-soft p-8 text-center space-y-6">
          <div className={`w-14 h-14 rounded-2xl ${theme.chipBg} ${theme.chipText} flex items-center justify-center mx-auto`}>
            {theme.icon}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">No Admin Account Found</h2>
            <div className="text-xs text-slate-600 leading-relaxed">{newAccountMessage}</div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link to="/register" className="w-full">
              <Button variant="outline" size="md" className="w-full">
                Register a Regular Account
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setNoAccountFound(false);
                setStep('phone');
                setOtp('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Try a Different Number
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className={`w-12 h-12 rounded-2xl ${theme.gradient} flex items-center justify-center text-white mx-auto shadow-md`}>
            {theme.icon}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{heading}</h2>
          <p className="text-xs text-slate-500">{subheading}</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-8 space-y-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Mobile Number (with country code)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    aria-label="Mobile number with country code"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  We will send a 6-digit verification code via SMS to this mobile number.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`w-full font-bold ${theme.buttonClass}`}
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${theme.chipBg} ${theme.chipText}`}>
                <span>Sent SMS code to <strong>{phone}</strong></span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Enter the 6-digit verification code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="● ● ● ● ● ●"
                    aria-label="6-digit verification code"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${theme.ring} transition-all text-center`}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`w-full font-bold ${theme.buttonClass}`}
                isLoading={loading}
              >
                Verify & Sign In
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted Firebase Authentication Session</span>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          <span>Not a {expectedRole === 'ADMIN' ? 'system administrator' : 'logistics partner'}? </span>
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Go to the standard sign-in
          </Link>
        </div>
      </div>
    </div>
  );
};
