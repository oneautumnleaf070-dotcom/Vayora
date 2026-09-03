import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { normalizePhoneNumber } from '../../services/authService';
import {
  Sprout,
  Phone,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { user, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [isFirstSetup, setIsFirstSetup] = useState(false);

  // If user is already logged in, redirect to their home
  useEffect(() => {
    if (user) {
      redirectUser(user.role);
    }
  }, [user]);

  const redirectUser = (userRole: UserRole) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }

    switch (userRole) {
      case 'FARMER':
        navigate('/farmer/dashboard');
        break;
      case 'FPO':
        navigate('/fpo/dashboard');
        break;
      case 'BUYER':
        navigate('/buyer/marketplace');
        break;
      case 'LOGISTICS':
        navigate('/logistics/dashboard');
        break;
      case 'ADMIN':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

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
        setDevOtp(res.devOtp);
        setIsFirstSetup(!!res.provisioningUri);
        setStep('otp');
        showToast('info', 'Authenticator Code Ready', res.message);
      } else {
        showToast('error', 'Could Not Generate Code', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Authentication Error', err.message || 'Unable to generate a verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      showToast('error', 'Invalid Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(otp);
      if (result.success) {
        if (result.needsProfile) {
          showToast('info', 'Profile Setup Required', 'Please complete your name, role, and location.');
          navigate('/complete-profile');
        } else if (result.user) {
          showToast('success', 'Authentication Successful', `Welcome back, ${result.user.name}!`);
          redirectUser(result.user.role);
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white mx-auto shadow-md shadow-brand-700/20">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to VAYORA
          </h2>
          <p className="text-xs text-slate-500">
            Direct Agricultural Marketplace & AI Intelligence
          </p>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  We use an authenticator app (Google Authenticator, Authy, etc.) to generate your 6-digit sign-in code — no SMS required.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-brand-700 hover:bg-brand-800 font-bold"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-200 text-xs text-brand-900 flex items-center justify-between">
                <span>
                  {isFirstSetup ? 'Authenticator set up for ' : 'Authenticator code for '}
                  <strong>{phone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-brand-700 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              {devOtp && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                  <p className="font-bold">Dev mode — current authenticator code</p>
                  <p className="font-mono text-lg tracking-widest mt-1">{devOtp}</p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    In production this is generated by your authenticator app, not shown here.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Enter the 6-digit code from your authenticator app
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-center"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-brand-700 hover:bg-brand-800 font-bold"
                isLoading={loading}
              >
                Verify & Sign In
              </Button>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted VAYORA Authentication Session</span>
          </div>
        </div>

        {/* Join CTA */}
        <div className="text-center text-xs text-slate-600">
          <span>New to VAYORA? </span>
          <Link to="/register" className="font-bold text-brand-700 hover:underline">
            Register as Farmer, FPO, Buyer, or Logistics Partner
          </Link>
        </div>
      </div>
    </div>
  );
};
