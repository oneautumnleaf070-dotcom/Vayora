import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import { getOrdersByUser } from '../../services/orderService';
import { Package, QrCode, ArrowRight, ShieldCheck, Truck, Clock, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QRDisplay } from '../../components/qr/QRDisplay';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { Link } from 'react-router-dom';
import { formatINR, formatDateTime } from '../../utils/helpers';

export const BuyerOrders: React.FC = () => {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<{ orderId: string; otp: string; qrCode: string } | null>(null);
  const [selectedTimelineOrder, setSelectedTimelineOrder] = useState<Order | null>(null);

  const loadOrders = async () => {
    if (user) {
      setLoading(true);
      try {
        const list = await getOrdersByUser(user.id, role);
        setOrders(list);
      } catch (err) {
        console.error('Error fetching buyer orders', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOrders();
    window.addEventListener('vayora_orders_updated', loadOrders);
    return () => window.removeEventListener('vayora_orders_updated', loadOrders);
  }, [user]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-700" />
            My Placed Orders & Delivery Handover Passes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your digital verification QR passes and monitor direct farm-to-warehouse shipments.
          </p>
        </div>

        <Link to="/buyer/marketplace">
          <Button variant="outline" size="sm">
            + Procure More Produce
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
          <RefreshCw className="w-5 h-5 text-brand-700 animate-spin mx-auto" />
          <p className="text-xs">Loading orders from Cloud Firestore...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 space-y-3">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">You haven't placed any orders yet.</p>
              <p className="text-xs text-slate-500">Discover verified produce from farmers and FPOs.</p>
              <Link to="/buyer/marketplace">
                <Button variant="primary" size="sm">
                  Browse Produce Marketplace
                </Button>
              </Link>
            </Card>
          ) : (
            orders.map((o) => (
              <Card key={o.id} className="p-6 space-y-4 border-slate-200/80">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 font-mono">
                        Order #{o.id}
                      </span>
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
                      {o.status === 'DELIVERED' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                          ✓ Delivery Completed ({o.verificationMethod ? `${o.verificationMethod}` : 'QR'})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seller: <strong>{o.farmerName}</strong> • Placed on {formatDateTime(o.createdAt)}
                      {o.status === 'DELIVERED' && o.deliveredAt && (
                        <span className="text-emerald-700 font-bold ml-2">
                          • Delivered: {formatDateTime(o.deliveredAt)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Total Amount Paid:</span>
                    <span className="text-xl font-mono font-extrabold text-slate-900">
                      {formatINR(o.totalAmount)}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 block">
                      {o.paymentStatus === 'RELEASED_TO_FARMER' || o.settlementStatus === 'READY_FOR_SETTLEMENT'
                        ? '✓ Delivered & Settlement Ready'
                        : '🔒 Secured in Escrow'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block text-[11px]">Commodity Lot</span>
                    <p className="font-bold text-slate-900">
                      {o.quantity} {o.unit} of {o.cropName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block text-[11px]">Assigned Carrier</span>
                    <p className="font-bold text-slate-900">{o.logisticsPartnerName || 'Kisan Express Agri-Logistics'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block text-[11px]">Handover Verification OTP</span>
                    <p className="font-mono font-bold text-emerald-800 text-sm">
                      OTP: {o.deliveryOtp}
                    </p>
                  </div>
                </div>

                {o.isBulkOrder && o.bulkSuppliers && o.bulkSuppliers.length > 0 && (
                  <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-teal-950 font-bold">
                      <span>Coordinated Bulk Suppliers ({o.bulkSuppliers.length} Producers)</span>
                      <span>{o.quantity} / {o.quantity} kg fulfilled (100%)</span>
                    </div>
                    <div className="w-full bg-teal-200/60 rounded-full h-2 overflow-hidden flex">
                      {o.bulkSuppliers.map((s, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${(s.quantity / o.quantity) * 100}%` }}
                          className="bg-teal-700 h-full border-r border-white/40"
                          title={`${s.supplierName}: ${s.quantity} kg`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {o.bulkSuppliers.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white rounded-lg border border-teal-200 text-[11px] text-teal-900 font-medium">
                          {s.supplierName}: <strong>{s.quantity} {s.unit}</strong> @ {formatINR(s.pricePerUnit)}/{s.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedQR({
                          orderId: o.id,
                          otp: o.deliveryOtp,
                          qrCode: o.qrCode,
                        })
                      }
                      leftIcon={<QrCode className="w-4 h-4 text-brand-700" />}
                    >
                      View QR Pass
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTimelineOrder(o)}
                      leftIcon={<Clock className="w-4 h-4 text-slate-500" />}
                    >
                      Order Timeline
                    </Button>
                  </div>

                  <Link to={`/orders/${o.id}/tracking`}>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Track Live Map & Driver
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* QR Code Delivery Pass Modal */}
      {selectedQR && (
        <Modal
          isOpen={!!selectedQR}
          onClose={() => setSelectedQR(null)}
          title={`Delivery Handover Pass • #${selectedQR.orderId}`}
          subtitle="Show this QR to the logistics partner upon unloading at your bay"
          maxWidth="sm"
        >
          <QRDisplay
            orderId={selectedQR.orderId}
            otp={selectedQR.otp}
            payload={selectedQR.qrCode}
          />
        </Modal>
      )}

      {/* Order Timeline Modal */}
      {selectedTimelineOrder && (
        <Modal
          isOpen={!!selectedTimelineOrder}
          onClose={() => setSelectedTimelineOrder(null)}
          title={`Timeline • Order #${selectedTimelineOrder.id}`}
          subtitle={`${selectedTimelineOrder.quantity} ${selectedTimelineOrder.unit} ${selectedTimelineOrder.cropName}`}
          maxWidth="md"
        >
          <OrderTimeline
            currentStatus={selectedTimelineOrder.status}
            timeline={selectedTimelineOrder.timeline || []}
          />
        </Modal>
      )}
    </div>
  );
};
