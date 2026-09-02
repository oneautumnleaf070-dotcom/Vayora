import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Delivery, Order } from '../../types';
import {
  getDeliveryWithFullRoute,
  updateWaypointStatus,
  updateDeliveryGpsLocation,
} from '../../services/logisticsService';
import { updateDeliveryStatus } from '../../services/deliveryService';
import { MapWithRoute } from '../../components/logistics/MapWithRoute';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Phone,
  Layers,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Truck,
  ExternalLink,
  RefreshCw,
  Building,
  User,
  Check,
} from 'lucide-react';
import { formatINR, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const RouteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingWaypoint, setUpdatingWaypoint] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  const loadData = async (deliveryId: string) => {
    setLoading(true);
    try {
      const res = await getDeliveryWithFullRoute(deliveryId);
      setDelivery(res.delivery);
      if (res.order) setOrder(res.order);
      if (res.delivery.currentLatitude && res.delivery.currentLongitude) {
        setCurrentGps({
          lat: res.delivery.currentLatitude,
          lng: res.delivery.currentLongitude,
        });
      }
    } catch (e: any) {
      console.error('Error loading route detail', e);
      showToast('error', 'Error', 'Failed to load route telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  // Live GPS tracking toggle
  const handleEnableGps = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Geolocation Unavailable', 'Your browser does not support GPS tracking.');
      return;
    }

    setGpsActive(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentGps({ lat: latitude, lng: longitude });
        if (delivery) {
          await updateDeliveryGpsLocation(delivery.id, latitude, longitude);
          showToast('success', 'GPS Updated', 'Live coordinates synchronized to corridor tracking.');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showToast('error', 'GPS Error', 'Please allow location permission in your browser.');
        setGpsActive(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleToggleWaypoint = async (supplierId: string, currentPickedUp?: boolean) => {
    if (!delivery) return;
    setUpdatingWaypoint(supplierId);
    try {
      const updated = await updateWaypointStatus(delivery.id, supplierId, !currentPickedUp);
      setDelivery(updated);
      showToast(
        'success',
        !currentPickedUp ? 'Waypoint Picked Up' : 'Waypoint Reset',
        'Multi-supplier collection status updated.'
      );
    } catch (e) {
      showToast('error', 'Update Failed', 'Failed to update waypoint state.');
    } finally {
      setUpdatingWaypoint(null);
    }
  };

  const handleUpdateStatus = async (nextStatus: any) => {
    if (!delivery || !user) return;
    try {
      await updateDeliveryStatus(delivery.id, nextStatus, user.id, role);
      setDelivery({ ...delivery, status: nextStatus });
      showToast('success', 'Status Updated', `Shipment is now ${nextStatus.replace(/_/g, ' ')}.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message || 'Error updating status.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Computing route corridor...</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="p-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Shipment Route Not Found</h2>
        <Link to="/logistics/dashboard">
          <Button variant="primary">Return to Deliveries</Button>
        </Link>
      </div>
    );
  }

  // Coordinates resolution
  const startLat = delivery.pickupCoords?.lat || delivery.pickupLatitude || 19.9975;
  const startLng = delivery.pickupCoords?.lng || delivery.pickupLongitude || 73.7898;
  const endLat = delivery.deliveryCoords?.lat || delivery.deliveryLatitude || 19.076;
  const endLng = delivery.deliveryCoords?.lng || delivery.deliveryLongitude || 72.8777;
  const waypoints = delivery.waypoints || [];

  // Google Maps navigation deep link URL
  const waypointsQuery = waypoints
    .map((w) => `${w.latitude},${w.longitude}`)
    .join('|');
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}${
    waypointsQuery ? `&waypoints=${encodeURIComponent(waypointsQuery)}` : ''
  }&travelmode=driving`;

  const isInTransit = delivery.status === 'IN_TRANSIT';
  const isArrived = delivery.status === 'ARRIVED';
  const isDelivered = delivery.status === 'DELIVERED';

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-3">
          <Link
            to="/logistics/dashboard"
            className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Corridor Navigation #{delivery.id.slice(-8)}
              </h1>
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
                {delivery.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {delivery.cropName || 'Produce'} • {delivery.quantity || 300} {delivery.unit || 'kg'} • ~{delivery.distanceKm || 165} km
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Launch GPS App</span>
          </a>

          <Button
            variant="outline"
            size="md"
            onClick={handleEnableGps}
            className={`min-h-[44px] text-xs font-bold ${
              gpsActive ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : ''
            }`}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${gpsActive ? 'animate-spin' : ''}`} />}
          >
            {gpsActive ? 'Live GPS Active' : 'Sync Current GPS'}
          </Button>

          {isArrived && (
            <Link to={`/logistics/delivery/${delivery.id}/verify`}>
              <Button
                variant="primary"
                size="md"
                className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
                leftIcon={<QrCode className="w-4 h-4" />}
              >
                Verify Pass
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Map & Waypoints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Full Leaflet Route Map */}
        <div className="lg:col-span-7 space-y-4">
          <MapWithRoute
            startLat={startLat}
            startLng={startLng}
            startLabel={delivery.pickupLocation || 'Farm Gate Origin'}
            endLat={endLat}
            endLng={endLng}
            endLabel={delivery.deliveryLocation || 'Buyer Commercial Facility'}
            waypoints={waypoints}
            currentLat={currentGps?.lat}
            currentLng={currentGps?.lng}
            className="h-[450px] sm:h-[550px] w-full rounded-3xl overflow-hidden shadow-soft border border-slate-200"
          />

          {/* Quick Stepper Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Driver Milestone Actions:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {delivery.status === 'ASSIGNED' || delivery.status === 'PICKUP_PENDING' ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-brand-700 hover:bg-brand-800 font-bold text-xs"
                  onClick={() => handleUpdateStatus('IN_TRANSIT')}
                >
                  Confirm Loaded & Start Transit
                </Button>
              ) : isInTransit ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800 font-bold text-xs"
                  onClick={() => handleUpdateStatus('ARRIVED')}
                >
                  Confirm Arrival at Buyer Gate
                </Button>
              ) : isArrived ? (
                <Link to={`/logistics/delivery/${delivery.id}/verify`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
                    leftIcon={<QrCode className="w-4 h-4" />}
                  >
                    Scan QR Handover
                  </Button>
                </Link>
              ) : (
                <span className="text-xs text-emerald-700 font-bold">✓ Shipment Handover Complete</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Waypoint Checklist & Order Dossier */}
        <div className="lg:col-span-5 space-y-6">
          {/* Multi-Stop Waypoint Checklist (if multi-supplier) */}
          {waypoints.length > 0 && (
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Multi-Supplier Collection Stops ({waypoints.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {waypoints.filter((w) => w.pickedUp).length}/{waypoints.length} Loaded
                </span>
              </div>

              <div className="space-y-3">
                {waypoints.map((wp, idx) => (
                  <div
                    key={wp.supplierId || idx}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                      wp.pickedUp
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{wp.supplierName}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {wp.quantity} kg • {wp.location}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleWaypoint(wp.supplierId, wp.pickedUp)}
                        disabled={updatingWaypoint === wp.supplierId}
                        className={`min-h-[36px] px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                          wp.pickedUp
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {wp.pickedUp ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Loaded</span>
                          </>
                        ) : (
                          <span>Pick Up</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Location & Contact Details */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
              Corridor Nodes & Contacts
            </h3>

            {/* Farm Origin */}
            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1 text-xs">
              <span className="text-emerald-800 font-bold block uppercase text-[10px]">
                Farm Origin Pickup
              </span>
              <p className="font-bold text-slate-900">{delivery.pickupLocation || 'Nashik Farm Gate'}</p>
              <div className="flex items-center gap-3 text-slate-600 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {order?.farmerName || 'Farmer Producer'}
                </span>
                <span className="font-mono font-bold">
                  {order?.farmerPhone || '+91 98234 11223'}
                </span>
              </div>
            </div>

            {/* Buyer Destination */}
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1 text-xs">
              <span className="text-blue-800 font-bold block uppercase text-[10px]">
                Buyer Delivery Destination
              </span>
              <p className="font-bold text-slate-900">{delivery.deliveryLocation || 'Mumbai APMC Hub'}</p>
              <div className="flex items-center gap-3 text-slate-600 pt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  {order?.buyerName || 'Commercial Buyer'}
                </span>
                <span className="font-mono font-bold">
                  {order?.buyerPhone || '+91 98450 44556'}
                </span>
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Dual QR/OTP scan unlocks instant escrow freight payout upon handover.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
