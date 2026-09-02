import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/config';
import { UserRole } from '../../types';
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
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const CompleteProfilePage: React.FC = () => {
  const { user, pendingPhoneUser, completeProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [role, setRole] = useState<UserRole>('FARMER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [location, setLocation] = useState('Nashik, Maharashtra');
  const [latitude, setLatitude] = useState(19.9975);
  const [longitude, setLongitude] = useState(73.7898);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pendingPhoneUser) {
      setPhone(pendingPhoneUser.phone);
    } else if (user) {
      // User already has profile -> redirect
      redirectUser(user.role);
    }
  }, [pendingPhoneUser, user]);

  const redirectUser = (userRole: UserRole) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveUid = pendingPhoneUser?.uid || (auth?.currentUser?.uid || '');
    if (!effectiveUid) {
      showToast('error', 'Authentication Required', 'Please verify your mobile number first.');
      navigate('/login');
      return;
    }

    if (!name || !phone) {
      showToast('error', 'Missing Information', 'Please provide your full name and phone number.');
      return;
    }

    setLoading(true);
    try {
      const createdUser = await completeProfile({
        uid: effectiveUid,
        name: name.trim(),
        phone,
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@vayora.in`,
        role,
        organizationName: orgName.trim(),
        location: location.trim(),
        latitude,
        longitude,
      });

      showToast('success', 'Profile Created', `Welcome to VAYORA, ${createdUser.name}!`);
      redirectUser(createdUser.role);
    } catch (err: any) {
      showToast('error', 'Profile Setup Failed', err.message || 'Could not save Firestore profile.');
    } finally {
      setLoading(false);
    }
  };

  // Normal users cannot self-register as ADMIN
  const allowedRoles: { key: UserRole; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: 'FARMER',
      title: 'Individual Farmer',
      desc: 'Sell your crops directly without middlemen.',
      icon: <Tractor className="w-5 h-5 text-emerald-700" />,
    },
    {
      key: 'FPO',
      title: 'Farmer Producer Org (FPO)',
      desc: 'Aggregate and sell member produce in bulk.',
      icon: <Users className="w-5 h-5 text-teal-700" />,
    },
    {
      key: 'BUYER',
      title: 'Bulk Buyer / Retailer',
      desc: 'Procure farm-fresh produce with price transparency.',
      icon: <ShoppingBag className="w-5 h-5 text-blue-700" />,
    },
    {
      key: 'LOGISTICS',
      title: 'Logistics Fleet Partner',
      desc: 'Transport produce with route optimization.',
      icon: <Truck className="w-5 h-5 text-amber-700" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center mx-auto shadow-md">
          <Sprout className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Complete Your VAYORA Profile
        </h2>
        <p className="text-xs text-slate-500">
          Phone Verified via Firebase: <strong className="text-slate-800">{phone || 'Verified'}</strong>
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Select Your Role</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allowedRoles.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setRole(opt.key)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    role === opt.key
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon}
                    <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Mobile Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98234 56789"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Organization / Farm Name</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Patil Organic Farms"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Location / City *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nashik, Maharashtra"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            size="lg"
            isLoading={loading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Save Profile & Access {role} Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};
