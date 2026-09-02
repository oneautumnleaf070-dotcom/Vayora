import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { normalizePhoneNumber } from '../../services/authService';
import {
  Sprout,
  User,
  Phone,
  Building,
  MapPin,
  Tractor,
  Users,
  ShoppingBag,
  Truck,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const { sendOtp, verifyOtp, completeProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedUid, setVerifiedUid] = useState<string>('');

  // Profile fields
  const [role, setRole] = useState<UserRole>('FARMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [location, setLocation] = useState('Nashik, Maharashtra');
  const [latitude, setLatitude] = useState(19.9975);
  const [longitude, setLongitude] = useState(73.7898);
  const [loading, setLoading] = useState(false);

  // Step 1: Send Real Firebase Phone OTP
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
      showToast('error', 'Error', err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Real Firebase SMS OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      showToast('error', 'Invalid Code', 'Please enter the 6-digit verification code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(otp);
      if (res.success) {
        setVerifiedUid(res.uid || '');
        setStep('profile');
        showToast('success', 'Phone Verified', 'Please complete your profile details.');
      } else {
        showToast('error', 'Verification Failed', res.error || 'The verification code is incorrect. Please try again.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'The verification code is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Profile & Create Firestore Document (/users/{uid})
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Missing Name', 'Please enter your full name.');
      return;
    }

    if (!verifiedUid) {
      showToast('error', 'Session Expired', 'Please verify your phone number first.');
      setStep('phone');
      return;
    }

    setLoading(true);
    try {
      const newUser = await completeProfile({
        uid: verifiedUid,
        name: name.trim(),
        phone: normalizePhoneNumber(phone),
        email: email.trim(),
        role,
        organizationName: orgName.trim(),
        location: location.trim(),
        latitude,
        longitude,
      });

      showToast('success', 'Registration Successful', `Welcome to VAYORA, ${newUser.name}!`);

      switch (newUser.role) {
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
        default:
          navigate('/');
      }
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white mx-auto shadow-md shadow-brand-700/20">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create your VAYORA Account
          </h2>
          <p className="text-xs text-slate-500">
            Join India's AI-Powered Direct Agricultural Marketplace
          </p>
        </div>

        {/* Multi-step Registration Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-8 space-y-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-bold text-slate-400">
            <span className={step === 'phone' ? 'text-brand-700 font-extrabold' : ''}>1. Mobile Number</span>
            <span>→</span>
            <span className={step === 'otp' ? 'text-brand-700 font-extrabold' : ''}>2. Verification</span>
            <span>→</span>
            <span className={step === 'profile' ? 'text-brand-700 font-extrabold' : ''}>3. Profile Details</span>
          </div>

          {step === 'phone' && (
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
                  We will send a 6-digit verification code via SMS to confirm your phone number.
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
                Send Verification Code
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-200 text-xs text-brand-900 flex items-center justify-between">
                <span>Sent SMS code to <strong>{phone}</strong></span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-brand-700 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Enter the 6-digit verification code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="● ● ● ● ● ●"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-center"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-brand-700 hover:bg-brand-800 font-bold"
                isLoading={loading}
              >
                Verify Code & Continue
              </Button>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleCompleteRegistration} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Your Platform Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: 'FARMER', label: 'Farmer', icon: <Tractor className="w-4 h-4" /> },
                    { key: 'FPO', label: 'FPO Hub', icon: <Sprout className="w-4 h-4" /> },
                    { key: 'BUYER', label: 'Buyer', icon: <ShoppingBag className="w-4 h-4" /> },
                    { key: 'LOGISTICS', label: 'Logistics', icon: <Truck className="w-4 h-4" /> },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRole(item.key as UserRole)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        role === item.key
                          ? 'border-brand-600 bg-brand-50/80 text-brand-900 font-bold shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className={role === item.key ? 'text-brand-700' : 'text-slate-500'}>
                        {item.icon}
                      </div>
                      <span className="text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@agri.in"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Organization / Farm Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={role === 'FPO' ? 'Sahyadri Farmers Co-op' : 'Patil Organic Farms'}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Location / Hub</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Nashik, Maharashtra"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-brand-700 hover:bg-brand-800 font-bold mt-2"
                isLoading={loading}
              >
                Complete Registration & Launch Workspace
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted Firebase Authentication & Firestore Profile Persistence</span>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          <span>Already have an account? </span>
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Sign In with Mobile OTP
          </Link>
        </div>
      </div>
    </div>
  );
};
