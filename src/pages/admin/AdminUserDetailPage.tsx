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
  ShoppingBag,
} from 'lucide-react';
import { User, Produce, Order, Offer, Delivery } from '../../types';
import { getUserProfileFromFirestore, setUserVerification } from '../../services/authService';
import { getProduceByFarmer } from '../../services/produceService';
import { getOrdersByUser } from '../../services/orderService';
import { getOffersByFarmer, getOffersByBuyer } from '../../services/offerService';
import { getDeliveriesForPartner } from '../../services/deliveryService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatDateTime, formatINR } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const AdminUserDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // User-specific activity data
  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!uid) return;
    loadUserData(uid);
  }, [uid]);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      const profile = await getUserProfileFromFirestore(userId);
      setUserProfile(profile);

      if (profile) {
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
      }
    } catch (err: any) {
      showToast('error', 'Fetch Error', 'Could not load user profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async () => {
    if (!userProfile) return;
    const newStatus = !userProfile.verified;
    try {
      await setUserVerification(userProfile.id, newStatus);
      setUserProfile({ ...userProfile, verified: newStatus });
      showToast('success', 'Verification Updated', `${userProfile.name} is now ${newStatus ? 'Verified' : 'Unverified'}.`);
    } catch (e) {
      showToast('error', 'Update Failed', 'Failed to update verification status.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading user dossier...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">User Profile Not Found</h3>
        <p className="text-xs text-slate-500">No user record exists with this ID.</p>
        <Link to="/admin/users">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Directory</span>
        </Link>

        <Button
          variant={userProfile.verified ? 'outline' : 'primary'}
          size="sm"
          onClick={handleToggleVerification}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
          className={!userProfile.verified ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
        >
          {userProfile.verified ? 'Revoke Verification' : 'Grant Verified Status'}
        </Button>
      </div>

      {/* User Profile Dossier Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <img
              src={userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={userProfile.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">{userProfile.name}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                    userProfile.role === 'FARMER'
                      ? 'bg-emerald-100 text-emerald-800'
                      : userProfile.role === 'FPO'
                      ? 'bg-teal-100 text-teal-800'
                      : userProfile.role === 'BUYER'
                      ? 'bg-blue-100 text-blue-800'
                      : userProfile.role === 'LOGISTICS'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {userProfile.role}
                </span>
                {userProfile.verified ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">UID: {userProfile.id}</p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
            <p>Member Since: <strong>{formatDateTime(userProfile.createdAt)}</strong></p>
            <p>Reputation Rating: <strong className="text-emerald-700">⭐ {userProfile.rating || '5.0'}</strong></p>
          </div>
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {userProfile.phone || 'Not provided'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {userProfile.email || 'None'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Organization</span>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {userProfile.organizationName || 'Individual Entity'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Location / Coordinates</span>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {userProfile.location}
            </p>
          </div>
        </div>
      </div>

      {/* Role-Specific Live Activity Feed */}
      {(userProfile.role === 'FARMER' || userProfile.role === 'FPO') && (
        <div className="space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-700" />
            <span>Active Produce Listings ({produceList.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {produceList.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-3">No active produce listings found for this producer.</p>
            ) : (
              produceList.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-900">{p.cropName}</h4>
                    <Badge variant={p.status === 'ACTIVE' ? 'green' : 'blue'} size="sm">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {p.quantity} {p.unit} • Grade: {p.qualityGrade}
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-800">
                    Asking: {formatINR(p.expectedPrice)}/{p.unit}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Orders Section */}
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pt-4">
            <Package className="w-5 h-5 text-teal-700" />
            <span>Fulfillment Orders ({orders.length})</span>
          </h3>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Buyer</th>
                  <th className="p-3.5">Produce</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Settlement Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">No orders recorded for this producer yet.</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3.5 font-mono font-bold text-slate-900">#{o.id}</td>
                      <td className="p-3.5 text-slate-700">{o.buyerName}</td>
                      <td className="p-3.5">{o.quantity} {o.unit} of {o.cropName}</td>
                      <td className="p-3.5">
                        <Badge variant={o.status === 'DELIVERED' ? 'green' : 'blue'} size="sm">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                        {formatINR(o.produceAmount || o.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userProfile.role === 'BUYER' && (
        <div className="space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-700" />
            <span>Placed Orders & Procurement ({orders.length})</span>
          </h3>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Lot Specs</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">No procurement orders recorded.</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3.5 font-mono font-bold text-slate-900">#{o.id}</td>
                      <td className="p-3.5 text-slate-700">{o.farmerName}</td>
                      <td className="p-3.5">{o.quantity} {o.unit} of {o.cropName}</td>
                      <td className="p-3.5">
                        <Badge variant={o.status === 'DELIVERED' ? 'green' : 'blue'} size="sm">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatINR(o.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userProfile.role === 'LOGISTICS' && (
        <div className="space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-700" />
            <span>Assigned Delivery Missions ({deliveries.length})</span>
          </h3>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Delivery ID</th>
                  <th className="p-3.5">Origin</th>
                  <th className="p-3.5">Destination</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">No deliveries assigned to this logistics carrier.</td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="p-3.5 font-mono font-bold text-slate-900">#{d.id}</td>
                      <td className="p-3.5 text-slate-600">{d.pickupLocation}</td>
                      <td className="p-3.5 text-slate-600">{d.deliveryLocation}</td>
                      <td className="p-3.5">
                        <Badge variant={d.status === 'DELIVERED' ? 'green' : 'amber'} size="sm">
                          {d.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-slate-800">
                        {d.status === 'DELIVERED' ? `${d.verificationMethod || 'QR'} Verified` : 'Pending Handover'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
