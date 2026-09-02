import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById } from '../../services/orderService';
import { optimizeRoute, RouteOptimizationResult } from '../../services/routeService';
import { Order } from '../../types';
import {
  Truck,
  ShieldCheck,
  Phone,
  MapPin,
  Clock,
  QrCode,
  CheckCircle2,
  Navigation,
  ArrowLeft,
  Layers,
  Building,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { AgriMap } from '../../components/map/AgriMap';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { QRDisplay } from '../../components/qr/QRDisplay';
import { formatINR } from '../../utils/helpers';

import { db, isFirebaseConfigured } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

export const LiveOrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [routeData, setRouteData] = useState<RouteOptimizationResult | null>(null);

  const fetchRoute = async (o: Order) => {
    const startLat = o.pickupCoords?.lat || (o.bulkSuppliers && o.bulkSuppliers[0]?.latitude) || 13.0827;
    const startLng = o.pickupCoords?.lng || (o.bulkSuppliers && o.bulkSuppliers[0]?.longitude) || 80.2707;
    const endLat = o.deliveryCoords?.lat || o.deliveryLatitude || 13.0400;
    const endLng = o.deliveryCoords?.lng || o.deliveryLongitude || 80.2100;
    const wpCoords: [number, number][] = (o.bulkSuppliers || []).map((s) => [s.latitude, s.longitude]);

    try {
      const res = await optimizeRoute(startLat, startLng, endLat, endLng, wpCoords);
      setRouteData(res);
    } catch (e) {
      console.warn('Error computing live route:', e);
    }
  };

  const loadOrder = async (orderId: string) => {
    const found = await getOrderById(orderId);
    if (found) {
      setOrder(found);
      fetchRoute(found);
    }
  };

  useEffect(() => {
    if (!id) return;

    loadOrder(id);

    const handleLocalUpdate = () => loadOrder(id);
    window.addEventListener('vayora_orders_updated', handleLocalUpdate);

    let unsubscribeFirestore: (() => void) | undefined;
    if (isFirebaseConfigured() && db) {
      try {
        const orderRef = doc(db, 'orders', id);
        unsubscribeFirestore = onSnapshot(orderRef, (snap) => {
          if (snap.exists()) {
            const liveOrder = snap.data() as Order;
            setOrder(liveOrder);
            fetchRoute(liveOrder);
          }
        }, (err) => {
          console.warn('Firestore tracking onSnapshot error:', err);
        });
      } catch (e) {
        console.warn('Could not attach Firestore onSnapshot listener:', e);
      }
    }

    return () => {
      window.removeEventListener('vayora_orders_updated', handleLocalUpdate);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [id]);

  if (!order) {
    return (
      <div className="p-16 text-center space-y-4">
        <p className="text-slate-500 text-sm">Order #{id} not found.</p>
        <Link to="/buyer/orders">
          <Button variant="primary">Return to Orders</Button>
        </Link>
      </div>
    );
  }

  const pickupLat = order.pickupCoords?.lat || (order.bulkSuppliers && order.bulkSuppliers[0]?.latitude) || 13.0827;
  const pickupLng = order.pickupCoords?.lng || (order.bulkSuppliers && order.bulkSuppliers[0]?.longitude) || 80.2707;
  const deliveryLat = order.deliveryCoords?.lat || order.deliveryLatitude || 13.0400;
  const deliveryLng = order.deliveryCoords?.lng || order.deliveryLongitude || 80.2100;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 sm:px-6 pb-20">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/buyer/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
                Order #{order.id}
              </h1>
              {order.isBulkOrder && (
                <span className="px-2.5 py-0.5 bg-teal-800 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-teal-300" />
                  Multi-Farm Bulk Corridor
                </span>
              )}
              <Badge
                variant={
                  order.status === 'DELIVERED'
                    ? 'green'
                    : order.status === 'IN_TRANSIT'
                    ? 'amber'
                    : 'blue'
                }
                size="md"
              >
                {order.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Cold-Chain Tracking & OpenStreetMap Telemetry
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Total Escrow Value:</span>
          <span className="text-xl font-mono font-extrabold text-emerald-800">
            {formatINR(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Map & Live Route (Requirements 7, 8, 9, 10, 14, 15) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-teal-700" />
            OpenStreetMap Highway Corridor Telemetry
          </span>
          {routeData && (
            <span className="font-mono font-bold text-slate-700">
              ~{routeData.distanceKm} km • ~{routeData.durationMins} mins ETA
            </span>
          )}
        </div>

        <AgriMap
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          pickupLabel={order.pickupLocation || 'Origin / Primary Farm Gate'}
          deliveryLat={deliveryLat}
          deliveryLng={deliveryLng}
          deliveryLabel={order.deliveryAddress || 'Buyer Warehouse Terminal'}
          waypoints={order.bulkSuppliers}
          routeCoordinates={routeData?.coordinates}
          height="380px"
          isDemoRoute={!import.meta.env.VITE_OPENROUTESERVICE_API_KEY}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline & Driver Card */}
        <div className="lg:col-span-7 space-y-6">
          <OrderTimeline currentStatus={order.status} timeline={order.timeline || []} />

          {/* Multi-Supplier Pickups Card for Bulk Orders (Requirement 10 & 15) */}
          {order.isBulkOrder && order.bulkSuppliers && (
            <Card className="p-5 space-y-3 border-teal-200/80 bg-teal-50/40">
              <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-700" />
                Coordinated Farm Gate Pickups ({order.bulkSuppliers.length} Producers)
              </h4>
              <div className="space-y-2 text-xs">
                {order.bulkSuppliers.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{s.supplierName}</p>
                        <p className="text-[10px] text-slate-500">{s.location}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-teal-900">
                      {s.quantity} {s.unit} @ {formatINR(s.pricePerUnit)}/{s.unit}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Assigned Driver / Logistics Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {order.logisticsPartnerName || 'Kisan Express'}
                  </h4>
                  <p className="text-xs text-slate-500">{order.vehicleNumber || 'Small Truck (Refrigerated 1.5T)'}</p>
                </div>
              </div>
              <a
                href={`tel:${order.logisticsPhone || '+919988776655'}`}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-brand-700" />
                <span>Call Driver</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Transit Status</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{order.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cold Chain Temp</span>
                <span className="font-bold font-mono text-emerald-800 mt-0.5 block">4.2°C (Optimal)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Handover Pass & Details */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                DELIVERY BAY HANDOVER PASS
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                Digital Verification Pass
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Show this QR pass or provide OTP to carrier upon arrival at your bay.
              </p>
            </div>

            <div className="flex justify-center">
              <QRDisplay
                orderId={order.id}
                otp={order.deliveryOtp}
                payload={order.qrCode}
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-bold">Smart Escrow Protection</span>
              </div>
              <span className="font-mono text-emerald-800 font-bold">{formatINR(order.totalAmount)}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
