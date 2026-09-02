import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Delivery, DeliveryStatus } from '../../types';
import {
  getDeliveriesForLogisticsPartner,
  updateDeliveryStatus,
  getStoredDeliveries,
} from '../../services/deliveryService';
import { getLogisticsAnalytics, LogisticsAnalytics } from '../../services/logisticsService';
import {
  Truck,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Package,
  Layers,
  Check,
  RefreshCw,
  QrCode,
  KeyRound,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  IndianRupee,
  ChevronRight,
  ExternalLink,
  Map,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { formatINR, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

type TabStatus = 'ALL' | 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

const STATUS_TABS: { key: TabStatus; label: string }[] = [
  { key: 'ALL', label: 'All Shipments' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_TRANSIT', label: 'In-Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'PENDING_ASSIGNMENT', label: 'Pending' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export const LogisticsDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [analytics, setAnalytics] = useState<LogisticsAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>('ASSIGNED');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let list = await getDeliveriesForLogisticsPartner(user.id);
      if (list.length === 0) {
        list = getStoredDeliveries();
      }
      setDeliveries(list);

      const stats = await getLogisticsAnalytics(user.id);
      setAnalytics(stats);
    } catch (e) {
      console.error('Error fetching logistics deliveries', e);
      showToast('error', 'Error', 'Failed to fetch deliveries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_deliveries_updated', loadData);
    window.addEventListener('vayora_orders_updated', loadData);
    return () => {
      window.removeEventListener('vayora_deliveries_updated', loadData);
      window.removeEventListener('vayora_orders_updated', loadData);
    };
  }, [user]);

  // Filter deliveries by active tab
  const filteredDeliveries = deliveries.filter((d) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_TRANSIT') return d.status === 'IN_TRANSIT' || d.status === 'ARRIVED' || d.status === 'PICKED_UP';
    if (activeTab === 'ASSIGNED') return d.status === 'ASSIGNED' || d.status === 'PICKUP_PENDING';
    return d.status === activeTab;
  });

  const getStatusCount = (tab: TabStatus) => {
    if (tab === 'ALL') return deliveries.length;
    if (tab === 'IN_TRANSIT') return deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'ARRIVED' || d.status === 'PICKED_UP').length;
    if (tab === 'ASSIGNED') return deliveries.filter((d) => d.status === 'ASSIGNED' || d.status === 'PICKUP_PENDING').length;
    return deliveries.filter((d) => d.status === tab).length;
  };

  const handleQuickStatusTransition = async (delivery: Delivery, nextStatus: DeliveryStatus) => {
    if (!user) return;
    setUpdatingId(delivery.id);
    try {
      await updateDeliveryStatus(delivery.id, nextStatus, user.id, role);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === delivery.id ? { ...d, status: nextStatus } : d))
      );
      showToast('success', 'Status Updated', `Delivery updated to ${nextStatus.replace(/_/g, ' ')}.`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Error updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner & Quick Actions */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-amber-700/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-mono font-bold text-amber-300">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>VAYORA FLEET DISPATCH & CORRIDOR OPS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Logistics Transport Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Optimized multi-supplier farm pickups, live GPS corridor tracking, and dual QR/OTP buyer handover verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          <Link to="/logistics/verify" className="flex-1 md:flex-none">
            <Button
              variant="primary"
              size="md"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20"
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              Verify Delivery Pass
            </Button>
          </Link>

          <Link to="/logistics/analytics" className="flex-1 md:flex-none">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
              leftIcon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            >
              Fleet Analytics
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            isLoading={loading}
            className="flex-1 md:flex-none bg-white/10 text-white border-white/20 text-xs"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Active Shipments Today"
          value={analytics ? `${analytics.deliveriesToday}` : '...'}
          change={`${deliveries.filter((d) => d.status === 'IN_TRANSIT').length} In-Transit`}
          trend="up"
          icon={<Truck className="w-6 h-6 text-amber-600" />}
          accentColor="amber"
        />

        <StatCard
          title="On-Time Delivery Rate"
          value={analytics ? `${analytics.onTimeRate}%` : '98.6%'}
          change="APMC SLA Adherence"
          trend="up"
          icon={<Clock className="w-6 h-6 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="Earnings Realized Today"
          value={analytics ? formatINR(analytics.earningsToday) : '...'}
          change="Instant Escrow Settlement"
          trend="up"
          icon={<IndianRupee className="w-6 h-6 text-teal-600" />}
          accentColor="teal"
        />

        <StatCard
          title="Pending Gate Handover"
          value={analytics ? `${analytics.pendingVerifications}` : '...'}
          change="Requires QR/OTP Stamp"
          trend={analytics?.pendingVerifications ? 'up' : 'neutral'}
          icon={<QrCode className="w-6 h-6 text-blue-600" />}
          accentColor="blue"
        />
      </div>

      {/* 3. Delivery Status Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const count = getStatusCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Delivery List Cards */}
        {filteredDeliveries.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              No Shipments in {activeTab.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Assigned corridor dispatches will appear here automatically as commercial orders are confirmed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDeliveries.map((del) => {
              const waypointsCount = del.waypoints?.length || 0;
              const isMultiSupplier = waypointsCount > 0;
              const isInTransit = del.status === 'IN_TRANSIT';
              const isArrived = del.status === 'ARRIVED';
              const isDelivered = del.status === 'DELIVERED';
              const isPickupPending = del.status === 'PICKUP_PENDING' || del.status === 'ASSIGNED';

              return (
                <div
                  key={del.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  {/* Top Meta */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          Shipment #{del.id.slice(-8)}
                        </span>
                        <Badge
                          variant={
                            isDelivered
                              ? 'green'
                              : isInTransit
                              ? 'amber'
                              : isArrived
                              ? 'teal'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {del.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {del.cropName || 'Agricultural Produce'} • {del.quantity || 300} {del.unit || 'kg'}
                      </p>
                    </div>

                    {isMultiSupplier && (
                      <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {waypointsCount} Multi-Pickups
                      </span>
                    )}
                  </div>

                  {/* Route Corridor Nodes */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0 ring-4 ring-emerald-100" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                          Origin / First Farm Gate
                        </span>
                        <p className="font-bold text-slate-900 truncate">
                          {del.pickupLocation || 'Nashik Farm Belt'}
                        </p>
                      </div>
                    </div>

                    <div className="border-l-2 border-dashed border-slate-300 ml-1.5 h-3" />

                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mt-0.5 shrink-0 ring-4 ring-blue-100" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                          Final Buyer Destination
                        </span>
                        <p className="font-bold text-slate-900 truncate">
                          {del.deliveryLocation || 'Mumbai Commercial Facility'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Distance & ETA Bar */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Corridor Distance</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {del.distanceKm || 165} km
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Transit</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        ~{del.estimatedTimeMinutes || 180} mins
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {/* Primary Route Detail Trigger */}
                    <Link to={`/logistics/routes/${del.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="md"
                        className="w-full min-h-[44px] text-xs font-bold"
                        leftIcon={<Map className="w-4 h-4 text-emerald-700" />}
                      >
                        Full Route Map
                      </Button>
                    </Link>

                    {/* Status Stepper Action */}
                    {isPickupPending && (
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1 min-h-[44px] bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs"
                        isLoading={updatingId === del.id}
                        onClick={() => handleQuickStatusTransition(del, 'IN_TRANSIT')}
                      >
                        Start Transit
                      </Button>
                    )}

                    {isInTransit && (
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                        isLoading={updatingId === del.id}
                        onClick={() => handleQuickStatusTransition(del, 'ARRIVED')}
                      >
                        Mark Arrived
                      </Button>
                    )}

                    {isArrived && (
                      <Link to={`/logistics/delivery/${del.id}/verify`} className="flex-1">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20"
                          leftIcon={<QrCode className="w-4 h-4" />}
                        >
                          Verify & Settle
                        </Button>
                      </Link>
                    )}

                    {isDelivered && (
                      <div className="flex-1 min-h-[44px] px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Handover Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
