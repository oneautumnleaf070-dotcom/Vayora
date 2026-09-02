import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Truck,
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Lock,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Clock,
  UserPlus,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { OtpInput } from '../../components/auth/OtpInput';
import { useToast } from '../../context/ToastContext';
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtp } from '../../services/authService';
import { checkLogisticsRegistrationStatus } from '../../services/registrationService';

export const LogisticsLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, login } = useAuth();
  const { showToast } = useToast();

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('9833344556'); // Pre-fill default demo logistics phone
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Timer & Attempt Tracking
  const [countdown, setCountdown] = useState(285);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(300);

  // Pending KYC Status Modal
  const [statusModalData, setStatusModalData] = useState<{
    visible: boolean;
    name?: string;
    submittedAt?: string;
    status?: string;
  }>({ visible: false });

  const confirmationResultRef = useRef<any>(null);

  useEffect(() => {
    if (user && (role === 'LOGISTICS' || role === 'ADMIN')) {
      navigate('/logistics/dashboard', { replace: true });
    }
  }, [user, role, navigate]);

  useEffect(() => {
    if (step !== 'OTP') return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

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
      try {
        setupRecaptcha('logistics-recaptcha-container');
      } catch (recaptchaErr) {
        console.warn('reCAPTCHA setup warning:', recaptchaErr);
      }

      const fullNumber = `${countryCode}${cleanPhone}`;
      const confirmationResult = await sendPhoneOtp(fullNumber);
      confirmationResultRef.current = confirmationResult;

      setStep('OTP');
      setCountdown(285);
      setResendCooldown(30);
      showToast('success', 'OTP Sent', `Verification code sent to ${fullNumber}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      if (err.message?.includes('reCAPTCHA')) {
        setError('reCAPTCHA verification failed. Please refresh the page.');
      } else {
        setError('Failed to send verification code. Try demo login or check number.');
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
      const isDemo = otp === '123456' || otp === '482915';

      let userProfile;
      if (!isDemo) {
        const verifyRes = await verifyPhoneOtp(otp);
        if (verifyRes.success && verifyRes.user) {
          userProfile = verifyRes.user;
        } else {
          userProfile = await login(fullNumber, 'LOGISTICS');
        }
      } else {
        userProfile = await login(fullNumber, 'LOGISTICS');
      }

      if (userProfile.role !== 'LOGISTICS' && userProfile.role !== 'ADMIN') {
        // Check if there is an active application pending
        const appStatus = await checkLogisticsRegistrationStatus(fullNumber);
        if (appStatus.exists) {
          setStatusModalData({
            visible: true,
            name: appStatus.name,
            submittedAt: appStatus.submittedAt,
            status: appStatus.status,
          });
        } else {
          setError('This phone number is not registered as a logistics partner.');
        }
        setLoading(false);
        return;
      }

      showToast('success', 'Signed In', 'Welcome to VAYORA Fleet Operations.');
      navigate('/logistics/dashboard', { replace: true });
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

  const handleQuickDemoLogisticsLogin = async () => {
    setLoading(true);
    try {
      await login('+919833344556', 'LOGISTICS');
      showToast('success', 'Demo Carrier Access', 'Signed in as VAYORA Logistics Partner.');
      navigate('/logistics/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-950 text-amber-400 border border-amber-800/60 flex items-center justify-center mx-auto shadow-xl shadow-amber-950/40 ring-4 ring-amber-500/10">
            <Truck className="w-9 h-9" />
          </div>
          <div>
            <span className="px-3 py-1 bg-amber-100 text-amber-950 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider">
              Fleet Operations & Corridor Logistics
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              VAYORA Logistics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Carrier Partner Sign In & Corridor Management
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 font-semibold">{error}</div>
              </div>

              {error.includes('not registered') && (
                <div className="pt-2 border-t border-red-200/60 flex items-center justify-between">
                  <span className="text-slate-600 text-[11px]">Ready to transport produce?</span>
                  <Link
                    to="/logistics/register"
                    className="font-extrabold text-brand-700 hover:underline flex items-center gap-1"
                  >
                    <span>Register as Partner</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Phone Submission */}
          {step === 'PHONE' && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Registered Driver / Partner Mobile Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="+91">🇮🇳 +91 (India)</option>
                    <option value="+1">🇺🇸 +1 (USA)</option>
                  </select>

                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9833344556"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold font-mono text-slate-900 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-100 outline-none"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  We'll send a 6-digit confirmation PIN via SMS.
                </p>
              </div>

              <div id="logistics-recaptcha-container" />

              <Button
                variant="primary"
                size="lg"
                type="submit"
                className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-500/20"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Verification Code
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  New carrier or truck owner?{' '}
                  <Link to="/logistics/register" className="font-extrabold text-brand-700 hover:underline">
                    Register as Logistics Partner ➔
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Entry */}
          {step === 'OTP' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code sent to
                </p>
                <p className="font-mono font-black text-slate-900 text-sm">
                  {countryCode} {phone}
                </p>
              </div>

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
                      : 'text-amber-700 hover:underline'
                  }`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => handleVerifyOtp()}
                disabled={otp.length !== 6 || isLockedOut}
                isLoading={loading}
                className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-md"
              >
                {isLockedOut ? `Locked (${formatTimer(lockoutSeconds)})` : 'Verify & Open Fleet Console'}
              </Button>

              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 block mx-auto cursor-pointer"
              >
                ← Change Mobile Number
              </button>
            </div>
          )}

          {/* Quick Demo Partner Login */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <button
              type="button"
              onClick={handleQuickDemoLogisticsLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-2xl border border-amber-200 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              <span>⚡ One-Tap Demo Fleet Partner Login</span>
            </button>
          </div>
        </div>

        {/* Pending Review Status Modal */}
        {statusModalData.visible && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">Application Under Review</h3>
                <p className="text-xs text-slate-500">
                  Welcome {statusModalData.name || 'Partner'}! Your registration documents are being verified by VAYORA Administration.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-amber-700">PENDING KYC REVIEW</span>
                </div>
                {statusModalData.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applied On:</span>
                    <span className="font-mono text-slate-800">
                      {new Date(statusModalData.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-600 pt-1">
                  You will receive an SMS confirmation as soon as your fleet credentials are approved.
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                onClick={() => setStatusModalData({ visible: false })}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
