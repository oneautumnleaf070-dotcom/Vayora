import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Lock,
  CheckCircle2,
  Building,
  KeyRound,
  ShieldAlert,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { OtpInput } from '../../components/auth/OtpInput';
import { useToast } from '../../context/ToastContext';
import { sendPhoneOtp, verifyPhoneOtp } from '../../services/authService';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('9811122334'); // Pre-fill default demo admin phone
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Timer & Attempt Tracking
  const [countdown, setCountdown] = useState(285); // 4:45 timer
  const [resendCooldown, setResendCooldown] = useState(30);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(300); // 5 mins lockout
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Confirmation result reference for Firebase Phone Auth
  const confirmationResultRef = useRef<any>(null);

  // Redirect if already logged in as ADMIN
  useEffect(() => {
    if (user && role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, role, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'OTP') return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Lockout timer effect
  useEffect(() => {
    if (!isLockedOut) return;
    const lockTimer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setFailedAttempts(0);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(lockTimer);
  }, [isLockedOut]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {

      const fullNumber = `${countryCode}${cleanPhone}`;
      const confirmationResult = await sendPhoneOtp(fullNumber);
      confirmationResultRef.current = confirmationResult;

      setStep('OTP');
      setCountdown(285);
      setResendCooldown(30);
      showToast('success', 'Verification Code Sent', `Enter the 6-digit code sent to ${fullNumber}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      if (err.message?.includes('reCAPTCHA')) {
        setError('reCAPTCHA verification failed. Please refresh the page and try again.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your internet connection and retry.');
      } else {
        setError('Failed to send verification code. Please check your number or try Demo Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;

    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullNumber = `${countryCode}${cleanPhone}`;

      // In sandbox/demo mode, allow '123456' or '482915'
      const isDemo = otp === '123456' || otp === '482915';

      const verifyRes = await verifyPhoneOtp(fullNumber, otp);
      if (!verifyRes.success || !verifyRes.user) {
        setError('OTP verification failed. Please try again.');
        return;
      }

      const userProfile = verifyRes.user;
      if (userProfile.role !== 'ADMIN') {
        setError('This phone number is not registered as an admin account. Contact super-admin to request access.');
        setShowSupportModal(true);
        setLoading(false);
        return;
      }

      showToast('success', 'Authenticated Successfully', 'Welcome to VAYORA Control Center.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);

      if (newFails >= 3) {
        setIsLockedOut(true);
        setError('Too many failed attempts. Login locked for 5 minutes.');
      } else {
        setError(`Invalid OTP code. ${3 - newFails} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setOtp('');
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = `${countryCode}${cleanPhone}`;

    try {
      const confirmationResult = await sendPhoneOtp(fullNumber);
      confirmationResultRef.current = confirmationResult;
      setCountdown(285);
      setResendCooldown(30);
      showToast('info', 'Code Resent', `New code sent to ${fullNumber}`);
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  // Demo shortcut login
  const handleQuickDemoAdminLogin = async () => {
    setLoading(true);
    try {
      // Set demo OTP and verify
      setOtp('123456');
      setStep('OTP');
      showToast('success', 'Demo Mode', 'Use OTP: 123456');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Badge & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-purple-950 text-purple-400 border border-purple-800/60 flex items-center justify-center mx-auto shadow-xl shadow-purple-950/40 ring-4 ring-purple-500/10">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider">
              Restricted Access • Governance & Oversight
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              VAYORA Control Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Administrator Sign In & Operational Console
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 font-semibold">{error}</div>
              </div>

              {error.includes('not registered') && (
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-purple-700 font-bold underline pl-6 block cursor-pointer"
                >
                  Contact Super-Admin for Access ➔
                </button>
              )}
            </div>
          )}

          {/* STEP 1: Phone Submission */}
          {step === 'PHONE' && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Registered Administrator Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="+91">🇮🇳 +91 (India)</option>
                    <option value="+1">🇺🇸 +1 (USA)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                  </select>

                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9811122334"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold font-mono text-slate-900 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-100 outline-none"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  An encrypted 6-digit OTP will be dispatched via SMS.
                </p>
              </div>

              {/* Invisible / Explicit reCAPTCHA Anchor */}
              <div id="admin-recaptcha-container" />

              <Button
                variant="primary"
                size="lg"
                type="submit"
                className="w-full min-h-[48px] bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-sm shadow-md shadow-purple-700/20"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Verification Code
              </Button>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'OTP' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit verification code sent to
                </p>
                <p className="font-mono font-black text-slate-900 text-sm">
                  {countryCode} {phone}
                </p>
              </div>

              {/* Reusable 6-Digit OtpInput */}
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (val.length === 6) {
                    setTimeout(() => handleVerifyOtp(), 100);
                  }
                }}
                disabled={loading || isLockedOut}
                hasError={!!error}
              />

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-mono">
                  Code expires in: <strong className="text-slate-900">{formatTimer(countdown)}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLockedOut}
                  className={`font-bold transition-colors cursor-pointer ${
                    resendCooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-purple-700 hover:underline'
                  }`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              {/* Verify Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleVerifyOtp()}
                disabled={otp.length !== 6 || isLockedOut}
                isLoading={loading}
                className="w-full min-h-[48px] bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-sm shadow-md"
              >
                {isLockedOut ? `Locked (${formatTimer(lockoutSeconds)})` : 'Verify & Enter Control Center'}
              </Button>

              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 block mx-auto cursor-pointer"
              >
                ← Change Phone Number
              </button>
            </div>
          )}

          {/* Quick Demo One-Tap Override */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <button
              type="button"
              onClick={handleQuickDemoAdminLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-2xl border border-purple-200 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-700" />
              <span>⚡ One-Tap Demo Super-Admin Login</span>
            </button>
            <p className="text-[10px] text-slate-400">
              For evaluation: bypasses SMS delivery and loads full admin permissions.
            </p>
          </div>
        </div>

        {/* Support Modal for Unregistered Admin */}
        {showSupportModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">Request Administrator Access</h3>
                <p className="text-xs text-slate-500">
                  Administrative access is restricted to verified VAYORA governance personnel.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <p className="text-slate-700">
                  To request admin role provisioning for <strong>{countryCode} {phone}</strong>, please contact:
                </p>
                <div className="font-mono font-bold text-purple-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>governance@vayora.agri</span>
                </div>
              </div>

              <Button variant="primary" className="w-full bg-purple-700 hover:bg-purple-800" onClick={() => setShowSupportModal(false)}>
                Understood
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
