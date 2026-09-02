import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building,
  Sprout,
  Package,
  Truck,
  Tag,
  Calendar,
  Layers,
  CircleDollarSign,
  AlertCircle,
  Edit,
  UserX,
  UserCheck,
  SlidersHorizontal,
  Bell,
  Star,
  FileText,
  History,
  Send,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { User, Produce, Order, Offer, Delivery, UserRole } from '../../types';
import { getUserProfileFromFirestore, setUserVerification } from '../../services/authService';
import { getProduceByFarmer } from '../../services/produceService';
import { getOrdersByUser } from '../../services/orderService';
import { getOffersByFarmer, getOffersByBuyer } from '../../services/offerService';
import { getDeliveriesForPartner } from '../../services/deliveryService';
import {
  updateUserStatus,
  updateUserRoleAdmin,
  updateUserProfileAdmin,
  logAdminAction,
  getAuditLogs,
  AuditLogEntry,
} from '../../services/adminService';
import { addNotification } from '../../services/notificationService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { formatDateTime, formatINR } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

type TabKey = 'profile' | 'orders' | 'ratings' | 'verification' | 'history';

export const AdminUserDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentAdmin } = useAuth();

  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // User activity data
  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Form inputs
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [suspendReason, setSuspendReason] = useState('Terms of service violation');
  const [customSuspendText, setCustomSuspendText] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('FARMER');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      const profile = await getUserProfileFromFirestore(userId);
      setUserProfile(profile);

      if (profile) {
        setEditName(profile.name || '');
        setEditPhone(profile.phone || '');
        setEditEmail(profile.email || '');
        setEditOrg(profile.organizationName || '');
        setEditLocation(profile.location || '');
        setTargetRole(profile.role);

        // Fetch user specific collections
        if (profile.role === 'FARMER' || profile.role === 'FPO') {
          const [prods, ords, offs] = await Promise.all([
            getProduceByFarmer(userId),
            getOrdersByUser(userId, profile.role),
            getOffersByFarmer(userId),
          ]);
          setProduceList(prods);
          setOrders(ords);
          setOffers(offs);
        } else if (profile.role === 'BUYER') {
          const [ords, offs] = await Promise.all([
            getOrdersByUser(userId, 'BUYER'),
            getOffersByBuyer(userId),
          ]);
          setOrders(ords);
          setOffers(offs);
        } else if (profile.role === 'LOGISTICS') {
          const dels = await getDeliveriesForPartner(userId);
          setDeliveries(dels);
        }

        // Fetch audit history for this specific user
        const logs = await getAuditLogs({ targetUserId: userId });
        setAuditHistory(logs);
      }
    } catch (err: any) {
      showToast('error', 'Fetch Error', 'Could not load user profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!uid) return;
    loadUserData(uid);
  }, [uid]);

  // Admin Actions
  const handleToggleVerification = async () => {
    if (!userProfile) return;
    const newStatus = !userProfile.verified;
    try {
      await setUserVerification(userProfile.id, newStatus);
      setUserProfile({ ...userProfile, verified: newStatus });
      await logAdminAction(
        currentAdmin?.id || 'admin_root',
        currentAdmin?.name || 'Super Admin',
        newStatus ? 'USER_VERIFIED' : 'USER_UNVERIFIED',
        newStatus
          ? `Verified KYC credentials for ${userProfile.name}`
          : `Revoked verification status for ${userProfile.name}`,
        userProfile.id,
        userProfile.name
      );
      showToast('success', 'Verification Updated', `${userProfile.name} is now ${newStatus ? 'Verified' : 'Unverified'}.`);
      loadUserData(userProfile.id);
    } catch (e) {
      showToast('error', 'Update Failed', 'Failed to update verification status.');
    }
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    try {
      const updatedFields: Partial<User> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        organizationName: editOrg.trim(),
        location: editLocation.trim(),
      };
      await updateUserProfileAdmin(userProfile.id, updatedFields);
      setUserProfile({ ...userProfile, ...updatedFields });
      await logAdminAction(
        currentAdmin?.id || 'admin_root',
        currentAdmin?.name || 'Super Admin',
        'PROFILE_EDITED',
        `Admin edited contact/profile metadata for ${userProfile.name}`,
        userProfile.id,
        userProfile.name
      );
      showToast('success', 'Profile Saved', 'User information updated successfully.');
      setShowEditProfileModal(false);
    } catch (e: any) {
      showToast('error', 'Save Failed', e.message || 'Error updating user.');
    }
  };

  const handleConfirmSuspension = async () => {
    if (!userProfile) return;
    const isSuspended = (userProfile as any).status === 'SUSPENDED';
    const nextStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';
    const finalReason = customSuspendText.trim() || suspendReason;

    try {
      await updateUserStatus(userProfile.id, nextStatus, isSuspended ? undefined : finalReason);
      setUserProfile({ ...userProfile, ...({ status: nextStatus, suspensionReason: isSuspended ? undefined : finalReason } as any) });
      await logAdminAction(
        currentAdmin?.id || 'admin_root',
        currentAdmin?.name || 'Super Admin',
        isSuspended ? 'USER_UNSUSPENDED' : 'USER_SUSPENDED',
        isSuspended
          ? `Reinstated active access for ${userProfile.name}`
          : `Suspended account for ${userProfile.name}. Reason: ${finalReason}`,
        userProfile.id,
        userProfile.name
      );
      showToast(
        'success',
        isSuspended ? 'Account Reinstated' : 'Account Suspended',
        `${userProfile.name} is now ${nextStatus.toLowerCase()}.`
      );
      setShowSuspendModal(false);
    } catch (e: any) {
      showToast('error', 'Action Failed', e.message || 'Error updating account status.');
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!userProfile) return;
    try {
      await updateUserRoleAdmin(userProfile.id, targetRole);
      setUserProfile({ ...userProfile, role: targetRole });
      await logAdminAction(
        currentAdmin?.id || 'admin_root',
        currentAdmin?.name || 'Super Admin',
        'ROLE_CHANGED',
        `Changed role of ${userProfile.name} to ${targetRole}`,
        userProfile.id,
        userProfile.name
      );
      showToast('success', 'Role Changed', `User role changed to ${targetRole}.`);
      setShowRoleModal(false);
    } catch (e: any) {
      showToast('error', 'Role Change Failed', e.message || 'Could not update role.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !messageTitle.trim() || !messageText.trim()) return;
    try {
      addNotification(userProfile.id, {
        title: messageTitle.trim(),
        message: messageText.trim(),
        type: 'SYSTEM',
      });
      showToast('success', 'Notification Dispatched', `Message sent to ${userProfile.name}'s notification inbox.`);
      setShowMessageModal(false);
      setMessageTitle('');
      setMessageText('');
    } catch (e: any) {
      showToast('error', 'Send Failed', e.message || 'Could not dispatch message.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Loading user dossier...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">User Profile Not Found</h2>
        <Link to="/admin/users">
          <Button variant="primary">Return to Directory</Button>
        </Link>
      </div>
    );
  }

  const isSuspended = (userProfile as any).status === 'SUSPENDED';

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {userProfile.name}
              </h1>
              <Badge variant={userProfile.role === 'FPO' ? 'teal' : 'green'} size="sm">
                {userProfile.role}
              </Badge>
              {isSuspended && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                  Suspended
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">UID: {userProfile.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMessageModal(true)}
            leftIcon={<Bell className="w-4 h-4 text-purple-600" />}
          >
            Send Notice
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowEditProfileModal(true)}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Main 3-Column / Tabbed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: User Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft space-y-6">
            <div className="text-center space-y-3">
              <img
                src={userProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                alt={userProfile.name}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-purple-100 mx-auto shadow-md"
              />
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{userProfile.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {userProfile.organizationName || 'Independent Participant'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {userProfile.verified ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    KYC Verified
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono font-bold">{userProfile.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{userProfile.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{userProfile.location || 'Maharashtra, India'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Registered: {formatDateTime(userProfile.createdAt)}</span>
              </div>
            </div>

            {/* Admin Quick Action Controls */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                Administrative Governance Controls
              </span>

              <Button
                variant={userProfile.verified ? 'outline' : 'primary'}
                className={`w-full text-xs font-bold ${!userProfile.verified ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                onClick={handleToggleVerification}
                leftIcon={userProfile.verified ? <XCircle className="w-4 h-4 text-slate-500" /> : <ShieldCheck className="w-4 h-4" />}
              >
                {userProfile.verified ? 'Revoke KYC Verification' : 'Approve KYC Verification'}
              </Button>

              <Button
                variant="outline"
                className="w-full text-xs font-bold"
                onClick={() => setShowRoleModal(true)}
                leftIcon={<SlidersHorizontal className="w-4 h-4 text-purple-600" />}
              >
                Change Role ({userProfile.role})
              </Button>

              <Button
                variant="outline"
                className={`w-full text-xs font-bold ${
                  isSuspended
                    ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                    : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
                onClick={() => setShowSuspendModal(true)}
                leftIcon={isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              >
                {isSuspended ? 'Reinstate Account Access' : 'Suspend Account'}
              </Button>
            </div>
          </div>
        </div>

        {/* Center/Right Column: 5 Tabs Container */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('profile')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Profile & Bio
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'ratings'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ratings & Trust
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              KYC Docs
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Audit History ({auditHistory.length})
            </button>
          </div>

          {/* TAB 1: Profile & Meta */}
          {activeTab === 'profile' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Account Profile Details</h3>
                <Button variant="outline" size="sm" onClick={() => setShowEditProfileModal(true)}>
                  Edit Info
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{userProfile.name}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Phone</span>
                  <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">{userProfile.phone}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{userProfile.email || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Organization / FPO</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{userProfile.organizationName || 'None'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Farm / Business Location</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{userProfile.location}</span>
                </div>
              </div>

              {/* Active produce listings if farmer */}
              {produceList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">Active Listed Produce ({produceList.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {produceList.map((p) => (
                      <div key={p.id} className="p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100'}
                          alt={p.cropName}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{p.cropName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {p.quantity} {p.unit} • {formatINR(p.expectedPrice)}/kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: Orders */}
          {activeTab === 'orders' && (
            <Card className="p-0 overflow-hidden">
              {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Orders Recorded</p>
                  <p className="text-xs">This user has not made or fulfilled any orders yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {orders.map((ord) => (
                    <div key={ord.id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                        <Badge variant="blue" size="sm">{ord.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{ord.cropName} ({ord.quantity} {ord.unit})</p>
                          <p className="text-[11px] text-slate-500">Buyer: {ord.buyerName} • Seller: {ord.farmerName}</p>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-800 text-sm">
                          {formatINR(ord.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: Ratings & Trust */}
          {activeTab === 'ratings' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Participant Trust & Rating</h3>
                  <p className="text-xs text-slate-500">Calculated across fulfilled contracts and buyer confirmations</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-800 font-extrabold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{userProfile.rating || 5.0} / 5.0</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Deals</span>
                  <span className="text-xl font-mono font-extrabold text-slate-900 mt-1 block">
                    {userProfile.totalDeals || orders.length}
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">On-Time Delivery</span>
                  <span className="text-xl font-mono font-extrabold text-emerald-950 mt-1 block">98.5%</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <span className="text-blue-700 block text-[10px] uppercase font-bold">Quality Adherence</span>
                  <span className="text-xl font-mono font-extrabold text-blue-950 mt-1 block">99.2%</span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: KYC Verification Docs */}
          {activeTab === 'verification' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Submitted KYC Credentials</h3>
                  <p className="text-xs text-slate-500">APMC Trader License, Aadhaar, Land Record (7/12)</p>
                </div>
                <Button
                  variant={userProfile.verified ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleVerification}
                  className={!userProfile.verified ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
                >
                  {userProfile.verified ? 'Revoke Status' : 'Approve KYC'}
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="font-bold text-slate-900">Government Identity / Aadhaar Pass</p>
                      <p className="text-[11px] text-slate-400 font-mono">Linked with Phone: {userProfile.phone}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    Verified
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building className="w-6 h-6 text-teal-600" />
                    <div>
                      <p className="font-bold text-slate-900">APMC Mandi Trader / Farm License</p>
                      <p className="text-[11px] text-slate-400 font-mono">{userProfile.organizationName || 'District Mandi Pass'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    Verified
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 5: Audit History */}
          {activeTab === 'history' && (
            <Card className="p-0 overflow-hidden">
              {auditHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Administrative Actions Logged</p>
                  <p className="text-xs">No suspensions, role modifications, or manual overrides recorded for this account.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {auditHistory.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950 font-mono text-[11px]">{log.action}</span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</span>
                      </div>
                      <p className="text-slate-700">{log.details}</p>
                      <p className="text-[10px] text-slate-400">Admin: <strong>{log.adminName}</strong></p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <Modal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          title="Edit User Profile (Admin Override)"
          subtitle={`Modifying profile for ${userProfile.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveProfileEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Full Name *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Organization / FPO Name</label>
              <input
                type="text"
                value={editOrg}
                onChange={(e) => setEditOrg(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Location Address *</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditProfileModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <Modal
          isOpen={showSuspendModal}
          onClose={() => setShowSuspendModal(false)}
          title={isSuspended ? 'Reinstate Account Access' : 'Suspend User Account'}
          subtitle={
            isSuspended
              ? `Restore active market participation for ${userProfile.name}`
              : `Revoke active access and prevent new trades for ${userProfile.name}`
          }
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            {!isSuspended && (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Suspension Reason</label>
                  <select
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="Terms of service violation">Terms of service violation</option>
                    <option value="Fraudulent produce quality reporting">Fraudulent produce quality reporting</option>
                    <option value="Payment / Escrow dispute violation">Payment / Escrow dispute violation</option>
                    <option value="Failed KYC documentation">Failed KYC documentation</option>
                    <option value="Other">Other (specify below)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Custom Notes / Reference</label>
                  <textarea
                    rows={3}
                    placeholder="Enter additional details for the audit log..."
                    value={customSuspendText}
                    onChange={(e) => setCustomSuspendText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSuspendModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className={`flex-1 font-bold ${
                  isSuspended
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                onClick={handleConfirmSuspension}
              >
                {isSuspended ? 'Confirm Reinstate' : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <Modal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          title="Change User Account Role"
          subtitle={`Assign new role permissions for ${userProfile.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Target Account Role *</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none"
              >
                <option value="FARMER">FARMER (Direct Producer)</option>
                <option value="FPO">FPO (Producer Collective)</option>
                <option value="BUYER">BUYER (Commercial Enterprise)</option>
                <option value="LOGISTICS">LOGISTICS (Fleet Partner)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold"
                onClick={handleConfirmRoleChange}
              >
                Apply Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Send Message / Notice Modal */}
      {showMessageModal && (
        <Modal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          title="Send Administrative Notice"
          subtitle={`Dispatch system notification to ${userProfile.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Notice Title *</label>
              <input
                type="text"
                placeholder="e.g. KYC Documentation Approved / Action Required"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Notice Content *</label>
              <textarea
                rows={4}
                placeholder="Type your official administrative communication..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                required
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowMessageModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Notice
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
