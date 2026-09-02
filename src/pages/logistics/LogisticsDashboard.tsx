import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Delivery, DeliveryStatus, Order } from '../../types';
import {
  getDeliveriesForLogisticsPartner,
  updateDeliveryStatus,
  getStoredDeliveries,
} from '../../services/deliveryService';
import { getStoredOrders } from '../../services/orderService';
import { optimizeRoute, RouteOptimizationResult } from '../../services/routeService';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Package,
  Layers,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { AgriMap } from '../../components/map/AgriMap';
import { DeliveryStatusStepper } from '../../components/orders/DeliveryStatusStepper';
import { formatINR, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const LogisticsDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [routeData, setRouteData] = useState<RouteOptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadDeliveries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find deliveries assigned to this logistics partner (or fallback to all deliveries)
      let list = await getDeliveriesForLogisticsPartner(user.id);
      if (list.length === 0) {
        list = getStoredDeliveries();
      }
      setDeliveries(list);

      if (list.length > 0) {
        const currentActive = list.find((d) => d.status !== 'DELIVERED') || list[0];
        setSelectedDelivery(currentActive);
      }
    } catch (e) {
      console.error('Error fetching logistics deliveries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    window.addEventListener('vayora_deliveries_updated', loadDeliveries);
    window.addEventListener('vayora_orders_updated', loadDeliveries);
    return () => {
      window.removeEventListener('vayora_deliveries_updated', loadDeliveries);
      window.removeEventListener('vayora_orders_updated', loadDeliveries);
    };
  }, [user]);

  useEffect(() => {
    if (selectedDelivery) {
      fetchRouteForDelivery(selectedDelivery);
    }
  }, [selectedDelivery]);

  const fetchRouteForDelivery = async (del: Delivery) => {
    const startLat = del.pickupLatitude || 13.0827;
    const startLng = del.pickupLongitude || 80.2707;
    const endLat = del.deliveryLatitude || 13.0400;
    const endLng = del.deliveryLongitude || 80.2100;
    const wpCoords: [number, number][] = (del.waypoints || []).map((w) => [w.latitude, w.longitude]);

    try {
      const res = await optimizeRoute(startLat, startLng, endLat, endLng, wpCoords);
      setRouteData(res);
    } catch (e) {
      console.error('Route fetch failed', e);
    }
  };

  // State Machine Action Handlers (Requirement 11, 12, 23)
  const handleTransition = async (nextStatus: DeliveryStatus, label: string) => {
    if (!selectedDelivery) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateDeliveryStatus(selectedDelivery.id, nextStatus, role);
      setSelectedDelivery(updated);
      showToast('success', `${label} Successful`, `Delivery #${updated.id} transitioned to ${nextStatus}.`);
      await loadDeliveries();
    } catch (err: any) {
      showToast('error', 'Transition Error', err.message || 'Could not update delivery status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Metrics (Requirement 3)
  const assignedCount = deliveries.filter((d) => d.status === 'ASSIGNED').length;
  const activeCount = deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'PICKUP_PENDING' || d.status === 'PICKED_UP').length;
  const completedCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const totalDistance = deliveries.reduce((acc, d) => acc + (d.distanceKm || d.estimatedDistanceKm || 50), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner with Logistics Partner Profile (Requirement 5 & 6) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-extrabold shadow-md shadow-amber-500/20">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {user?.name || 'Kisan Express'}
              </h1>
              <Badge variant="verified" size="sm">Verified Carrier</Badge>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                ● Available for Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {user?.organizationName || 'Kisan Express Fleet (Demo)'} • Vehicle: {user?.vehicleType || 'Small Truck (Refrigerated 1.5T)'} • Capacity: {user?.vehicleCapacity || 2000} kg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Carrier ID: #{user?.id || 'user_logistics_ekart'}
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metrics (Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Transit Missions"
          value={activeCount}
          subtitle="Currently on Route"
          icon={<Truck className="w-6 h-6" />}
          accentColor="amber"
        />
        <StatCard
          title="Assigned Deliveries"
          value={assignedCount}
          subtitle="Awaiting Farm Pickup"
          icon={<Package className="w-6 h-6" />}
          accentColor="blue"
        />
        <StatCard
          title="Completed Deliveries"
          value={completedCount}
          subtitle="Verified by Buyer Escrow"
          icon={<CheckCircle2 className="w-6 h-6" />}
          accentColor="green"
        />
        <StatCard
          title="Total Route Distance"
          value={`${Math.round(totalDistance)} km`}
          subtitle="Aggregated Transit Miles"
          icon={<Navigation className="w-6 h-6" />}
          accentColor="purple"
        />
      </div>

      {/* Main Active Delivery Operation Grid */}
      {selectedDelivery ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Active Order Card & State Machine Controls */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6 sm:p-7 space-y-5 border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                    ACTIVE DISPATCH OPERATION
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-lg font-extrabold text-slate-900 font-mono">
                      Delivery #{selectedDelivery.id}
                    </h3>
                    <Badge
                      variant={
                        selectedDelivery.status === 'ARRIVED'
                          ? 'purple'
                          : selectedDelivery.status === 'IN_TRANSIT'
                          ? 'amber'
                          : selectedDelivery.status === 'PICKED_UP'
                          ? 'blue'
                          : 'green'
                      }
                      size="sm"
                    >
                      {selectedDelivery.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Parent Order: <strong>#{selectedDelivery.orderId}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Transit Distance & Time</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">
                    ~{selectedDelivery.distanceKm || 45} km • ~{selectedDelivery.estimatedTimeMinutes || 60} mins
                  </span>
                </div>
              </div>

              {/* Waypoints / Multi-Pickup Points for Bulk Orders (Requirement 10 & 15) */}
              {selectedDelivery.waypoints && selectedDelivery.waypoints.length > 0 ? (
                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-teal-950 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-teal-700" />
                      Multi-Stop Consolidated Corridor ({selectedDelivery.waypoints.length} Farm Gates)
                    </span>
                    <span className="font-mono">{selectedDelivery.quantity || 1000} kg Total</span>
                  </div>

                  <div className="space-y-2">
                    {selectedDelivery.waypoints.map((wp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{wp.supplierName}</p>
                            <p className="text-[10px] text-slate-500">{wp.location}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-teal-900 text-xs">
                          {wp.quantity} kg
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-teal-200/60 flex items-center justify-between text-[11px] text-teal-900 font-medium">
                    <span>Unloading Bay: {selectedDelivery.deliveryLocation}</span>
                    <span className="font-bold">A ➔ B ➔ C ➔ Destination</span>
                  </div>
                </div>
              ) : (
                /* Single Pickup Details */
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Farm Origin</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedDelivery.pickupLocation}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Unloading Destination</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedDelivery.deliveryLocation}</span>
                  </div>
                </div>
              )}

              {/* Compact delivery status stepper (Task 4) */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-100">
                <DeliveryStatusStepper status={selectedDelivery.status} />
              </div>

              {/* State Machine Transition Actions (Requirement 11, 12, 23) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Workflow Actions
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Current: {selectedDelivery.status}</span>
                </div>

                <div className="space-y-2">
                  {selectedDelivery.status === 'PENDING_ASSIGNMENT' && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-blue-700 hover:bg-blue-800"
                      onClick={() => handleTransition('ASSIGNED', 'Accept Delivery')}
                      isLoading={updatingStatus}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      Accept Delivery Mission
                    </Button>
                  )}

                  {selectedDelivery.status === 'ASSIGNED' && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-teal-700 hover:bg-teal-800"
                      onClick={() => handleTransition('PICKUP_PENDING', 'Start Pickup')}
                      isLoading={updatingStatus}
                      leftIcon={<Truck className="w-4 h-4" />}
                    >
                      Start Pickup Route
                    </Button>
                  )}

                  {selectedDelivery.status === 'PICKUP_PENDING' && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                      onClick={() => handleTransition('PICKED_UP', 'Mark Picked Up')}
                      isLoading={updatingStatus}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Mark Picked Up at Farm Gate
                    </Button>
                  )}

                  {selectedDelivery.status === 'PICKED_UP' && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => handleTransition('IN_TRANSIT', 'Start Delivery')}
                      isLoading={updatingStatus}
                      leftIcon={<Navigation className="w-4 h-4" />}
                    >
                      Start Delivery Transit (In-Transit)
                    </Button>
                  )}

                  {selectedDelivery.status === 'IN_TRANSIT' && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-purple-700 hover:bg-purple-800"
                      onClick={() => handleTransition('ARRIVED', 'Mark Arrived')}
                      isLoading={updatingStatus}
                      leftIcon={<MapPin className="w-4 h-4" />}
                    >
                      Mark Arrived at Buyer Destination Bay
                    </Button>
                  )}

                  {selectedDelivery.status === 'ARRIVED' && (
                    <div className="p-4 bg-purple-50/90 rounded-2xl border-2 border-purple-300 text-purple-950 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-700" />
                          DELIVERY VERIFICATION REQUIRED
                        </span>
                        <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded-md text-[10px] font-bold">
                          At Destination Bay
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-900">
                        Physical produce inspection required. Scan the buyer's tamper-proof QR code or enter the 6-digit delivery OTP to complete handover.
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link to={`/logistics/delivery/${selectedDelivery.id}/verify`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full bg-teal-700 hover:bg-teal-800"
                            leftIcon={<QrCode className="w-3.5 h-3.5" />}
                          >
                            Scan QR
                          </Button>
                        </Link>

                        <Link to={`/logistics/delivery/${selectedDelivery.id}/verify`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                          >
                            Verify OTP
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {selectedDelivery.status === 'DELIVERED' && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-950 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>✓ Delivery Verified • Order Delivered</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Verified via {selectedDelivery.verificationMethod || 'QR Pass'}. Escrow released & settlement ready for producers.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: OpenStreetMap & Routing Telemetry (Requirement 7, 8, 9) */}
          <div className="lg:col-span-6 space-y-4">
            <AgriMap
              pickupLat={selectedDelivery.pickupLatitude || 13.0827}
              pickupLng={selectedDelivery.pickupLongitude || 80.2707}
              pickupLabel={selectedDelivery.pickupLocation}
              deliveryLat={selectedDelivery.deliveryLatitude || 13.0400}
              deliveryLng={selectedDelivery.deliveryLongitude || 80.2100}
              deliveryLabel={selectedDelivery.deliveryLocation}
              waypoints={selectedDelivery.waypoints}
              routeCoordinates={routeData?.coordinates}
              height="380px"
              isDemoRoute={selectedDelivery.isDemoRoute}
            />

            {/* Turn-by-Turn Navigation Steps */}
            {routeData && routeData.steps && routeData.steps.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  Optimized Route Telemetry
                </span>
                <p className="text-slate-600 font-mono text-[11px]">
                  {routeData.summary}
                </p>
                <div className="space-y-1 pt-1">
                  {routeData.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-600 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700">No active deliveries currently assigned.</p>
        </div>
      )}

      {/* Deliveries Queue Table (Requirement 11) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-700" />
            All Assigned Logistics Operations ({deliveries.length})
          </h3>
          <span className="text-xs text-slate-400">Click a mission to inspect route</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Delivery ID</th>
                <th className="px-5 py-3">Order / Commodity</th>
                <th className="px-5 py-3">Pickup Location</th>
                <th className="px-5 py-3">Destination</th>
                <th className="px-5 py-3">Distance & ETA</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((del) => (
                <tr
                  key={del.id}
                  onClick={() => setSelectedDelivery(del)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedDelivery?.id === del.id ? 'bg-teal-50/40' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                    #{del.id}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900 block">{del.cropName || 'Tomato'}</span>
                    <span className="text-[11px] text-slate-500">Order #{del.orderId}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {del.waypoints && del.waypoints.length > 0 ? (
                      <span className="font-bold text-teal-800">
                        {del.waypoints.length} Farm Gates (Bulk)
                      </span>
                    ) : (
                      del.pickupLocation
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {del.deliveryLocation}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-800">
                    ~{del.distanceKm || 45} km ({del.estimatedTimeMinutes || 60}m)
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        del.status === 'ARRIVED'
                          ? 'purple'
                          : del.status === 'IN_TRANSIT'
                          ? 'amber'
                          : del.status === 'PICKED_UP'
                          ? 'blue'
                          : 'green'
                      }
                      size="sm"
                    >
                      {del.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="outline" size="sm">
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
