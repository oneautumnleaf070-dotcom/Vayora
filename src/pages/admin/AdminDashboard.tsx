import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllRegisteredUsers, setUserVerification } from '../../services/authService';
import { getStoredOrders } from '../../services/orderService';
import { getStoredProduce } from '../../services/produceService';
import { getStoredDeliveries } from '../../services/deliveryService';
import { User, Order, Produce, Delivery } from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Tractor,
  ShoppingBag,
  Truck,
  TrendingUp,
  Package,
  CheckCircle2,
  BarChart3,
  Search,
  ArrowRight,
  RefreshCw,
  MapPin,
  CircleDollarSign,
  Layers,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatINR, formatNumber, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [produce, setProduce] = useState<Produce[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // NOTE (flagged per Task 3, not changed): users come from Firestore via
      // getAllRegisteredUsers(), but orders/produce/deliveries currently read
      // from localStorage via getStored*(). This means admin metrics reflect
      // this browser's local demo state, not a shared server source of truth.
      // Unifying all four on Firestore is a deliberate follow-up decision,
      // not made here without explicit approval.
      const [u, o, p, d] = await Promise.all([
        getAllRegisteredUsers(),
        Promise.resolve(getStoredOrders()),
        Promise.resolve(getStoredProduce()),
        Promise.resolve(getStoredDeliveries()),
      ]);
      setUsers(u);
      setOrders(o);
      setProduce(p);
      setDeliveries(d);
    } catch (e) {
      console.error('Error loading admin dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_auth_changed', loadData);
    window.addEventListener('vayora_orders_updated', loadData);
    window.addEventListener('vayora_deliveries_updated', loadData);
    return () => {
      window.removeEventListener('vayora_auth_changed', loadData);
      window.removeEventListener('vayora_orders_updated', loadData);
      window.removeEventListener('vayora_deliveries_updated', loadData);
    };
  }, []);

  // Real Metric Computations (Requirements 26, 27)
  const totalUsersCount = users.length;
  const farmersCount = users.filter((u) => u.role === 'FARMER').length;
  const fpoCount = users.filter((u) => u.role === 'FPO').length;
  const buyersCount = users.filter((u) => u.role === 'BUYER').length;
  const logisticsCount = users.filter((u) => u.role === 'LOGISTICS').length;

  const activeProduceCount = produce.filter((p) => p.status === 'ACTIVE').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;
  const bulkOrdersCount = orders.filter((o) => o.isBulkOrder).length;
  const activeDeliveriesCount = deliveries.filter((d) => d.status !== 'DELIVERED').length;
  const completedDeliveriesCount = deliveries.filter((d) => d.status === 'DELIVERED').length;

  const settlementReadyVolume = orders
    .filter((o) => o.status === 'DELIVERED' || o.settlementStatus === 'READY_FOR_SETTLEMENT')
    .reduce((sum, o) => sum + (o.produceAmount || 0), 0);

  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // KYC / verification queue (Requirement: surfaced governance action)
  const pendingVerificationUsers = users.filter((u) => !u.verified);
  const pendingVerificationCount = pendingVerificationUsers.length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-700" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Platform Administration & Oversight
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Central operational governance for users, marketplace lots, smart bulk matches, and logistics telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/users">
            <Button
              variant="primary"
              size="sm"
              className="bg-purple-700 hover:bg-purple-800"
              leftIcon={<Users className="w-4 h-4" />}
            >
              Manage Users ({users.length})
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards (Requirement 27) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Users"
          value={totalUsersCount}
          icon={<Users className="w-4 h-4 text-purple-700" />}
          subtitle={`${farmersCount} Farmers • ${fpoCount} FPOs`}
        />
        <StatCard
          title="Active Produce"
          value={activeProduceCount}
          icon={<Package className="w-4 h-4 text-emerald-700" />}
          subtitle="Live marketplace lots"
        />
        <StatCard
          title="Active Orders"
          value={activeOrdersCount}
          icon={<TrendingUp className="w-4 h-4 text-blue-700" />}
          subtitle={`${bulkOrdersCount} Bulk Orders`}
        />
        <StatCard
          title="Active Transit"
          value={activeDeliveriesCount}
          icon={<Truck className="w-4 h-4 text-amber-700" />}
          subtitle={`${logisticsCount} Carriers registered`}
        />
        <StatCard
          title="Completed Deliveries"
          value={completedDeliveriesCount}
          icon={<CheckCircle2 className="w-4 h-4 text-teal-700" />}
          subtitle="QR/OTP verified"
        />
        <StatCard
          title="Settlement Ready"
          value={formatINR(settlementReadyVolume)}
          icon={<CircleDollarSign className="w-4 h-4 text-emerald-800" />}
          subtitle="100% producer proceeds"
        />
      </div>

      {/* User Management Banner & Fast Links */}
      <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-6 rounded-3xl shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h3 className="text-base font-bold">User Directory & Verification Governance</h3>
            {pendingVerificationCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-400/90 text-amber-950 rounded-full text-[10px] font-extrabold">
                {pendingVerificationCount} pending
              </span>
            )}
          </div>
          <p className="text-xs text-purple-200">
            View registered user dossiers, manage roles, audit activity history, and verify credentials.
          </p>
        </div>
        <Link to="/admin/users">
          <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open User Directory
          </Button>
        </Link>
      </div>

      {/* Pending Verification Queue — surfaced governance action (Task 3) */}
      {pendingVerificationCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-950">
                Pending KYC Verification ({pendingVerificationCount})
              </h3>
            </div>
            <Link to="/admin/users">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Review Queue
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingVerificationUsers.slice(0, 6).map((u) => (
              <Link
                key={u.id}
                to={`/admin/users/${u.id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-amber-200 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                {u.name}
                <span className="text-[10px] text-amber-600 font-mono">{u.role}</span>
              </Link>
            ))}
            {pendingVerificationCount > 6 && (
              <span className="flex items-center px-3 py-1.5 text-xs font-semibold text-amber-700">
                +{pendingVerificationCount - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders Overview */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-700" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Recent Marketplace Orders & Settlements
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Total Volume: {formatINR(totalGMV)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Produce Details</th>
                <th className="p-3">Status</th>
                <th className="p-3">Settlement</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">#{o.id}</td>
                    <td className="p-3 text-slate-700">{o.buyerName}</td>
                    <td className="p-3 text-slate-700">{o.farmerName}</td>
                    <td className="p-3 text-slate-600">
                      {o.quantity} {o.unit} of {o.cropName}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          o.status === 'DELIVERED'
                            ? 'green'
                            : o.status === 'IN_TRANSIT'
                            ? 'amber'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {o.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-semibold text-emerald-800">
                        {o.status === 'DELIVERED' || o.settlementStatus === 'READY_FOR_SETTLEMENT'
                          ? '✓ Settlement Ready'
                          : 'Escrow Locked'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(o.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deliveries & Multi-Corridor Tracking */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              National Logistics & Delivery Verification History
            </h3>
          </div>
          <Badge variant="green" size="sm">OpenStreetMap Telemetry</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">Mission ID</th>
                <th className="p-3">Carrier</th>
                <th className="p-3">Origin / Pickups</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Verification Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No active deliveries in transit.
                  </td>
                </tr>
              ) : (
                deliveries.slice(0, 5).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">#{d.id}</td>
                    <td className="p-3 text-slate-700">{d.logisticsPartnerName || 'Kisan Express'}</td>
                    <td className="p-3 text-slate-600">
                      {d.waypoints && d.waypoints.length > 0 ? (
                        <span className="text-teal-800 font-bold">{d.waypoints.length} Farm Gates (Bulk)</span>
                      ) : (
                        d.pickupLocation
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{d.deliveryLocation}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          d.status === 'DELIVERED'
                            ? 'green'
                            : d.status === 'ARRIVED'
                            ? 'purple'
                            : d.status === 'IN_TRANSIT'
                            ? 'amber'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {d.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {d.status === 'DELIVERED'
                        ? `${d.verificationMethod || 'QR'} Verified`
                        : 'Pending Handover'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
