import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import { getOrdersByUser } from '../../services/orderService';
import { Package, Truck, ArrowRight, ShieldCheck, CheckCircle2, Layers, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Link } from 'react-router-dom';
import { formatINR, formatDateTime } from '../../utils/helpers';

export const FarmerOrders: React.FC = () => {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (user) {
      setLoading(true);
      try {
        const list = await getOrdersByUser(user.id, role);
        setOrders(list);
      } catch (err) {
        console.error('Error fetching farmer orders', err);
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
            Confirmed Direct Orders & Allocations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor incoming orders, coordinated bulk allocations, and escrow releases directly from buyers.
          </p>
        </div>

        <span className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <strong>{orders.length}</strong> Total Orders & Allocations
        </span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
          <RefreshCw className="w-5 h-5 text-brand-700 animate-spin mx-auto" />
          <p className="text-xs">Loading orders from Cloud Firestore...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No confirmed orders yet.</p>
              <p className="text-xs text-slate-500">
                Buyer orders and Smart Bulk Match allocations will appear here.
              </p>
            </Card>
          ) : (
            orders.map((o) => {
              const isBulk = o.isBulkOrder;
              const myAllocation = o.bulkSuppliers?.find((s) => s.supplierId === user?.id);
              const allocatedQty = myAllocation ? myAllocation.quantity : o.quantity;
              const myPayout = myAllocation ? myAllocation.subtotal : (o.farmerAmount || o.produceAmount);

              return (
                <Card key={o.id} className="p-6 space-y-4 border-slate-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          Order #{o.id}
                        </span>
                        {isBulk && (
                          <span className="px-2.5 py-0.5 bg-teal-800 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                            <Layers className="w-3 h-3 text-teal-300" />
                            Smart Bulk Allocation
                          </span>
                        )}
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
                            {o.verificationMethod ? `${o.verificationMethod} Verified` : 'Verified ✓'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Placed on {formatDateTime(o.createdAt)} • Buyer: <strong>{o.buyerName}</strong>
                        {o.status === 'DELIVERED' && o.deliveredAt && (
                          <span className="text-emerald-700 font-bold ml-2">
                            • Delivered at {formatDateTime(o.deliveredAt)}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">
                        {isBulk ? 'Your Allocation Proceeds:' : 'Farmer Direct Proceeds:'}
                      </span>
                      <span className="text-xl font-mono font-extrabold text-emerald-800">
                        {formatINR(myPayout)}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 block">
                        {o.paymentStatus === 'RELEASED_TO_FARMER' || o.settlementStatus === 'READY_FOR_SETTLEMENT'
                          ? '✓ Settlement Ready (Escrow Released)'
                          : '🔒 Secured in Escrow'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-500 block text-[11px]">
                        {isBulk ? 'Your Allocation' : 'Harvest Specs'}
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {allocatedQty} {o.unit} of {o.cropName}
                      </p>
                      {isBulk && (
                        <p className="text-[11px] text-teal-800 font-medium">
                          Total Buyer Demand: {o.requiredQuantity || o.quantity} kg
                        </p>
                      )}
                      <p className="text-[11px] text-slate-600">Rate: {formatINR(o.pricePerUnit)}/{o.unit}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-500 block text-[11px]">Assigned Carrier & ETA</span>
                      <p className="font-bold text-slate-900">{o.logisticsPartnerName || 'Kisan Express'}</p>
                      <p className="text-[11px] text-teal-800 font-medium">Status: {o.status.replace(/_/g, ' ')} • ~45 min ETA</p>
                      <p className="text-[10px] text-slate-500">{o.vehicleNumber || 'Refrigerated Carrier (1.5T)'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-500 block text-[11px]">Farm Gate Loading Pass</span>
                      <p className="font-mono font-bold text-slate-900 text-sm">
                        OTP: {o.pickupOtp || '719302'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {o.status === 'PLACED' || o.status === 'PAYMENT_CONFIRMED' || o.status === 'ASSIGNED'
                          ? 'Awaiting carrier arrival at farm gate'
                          : 'Produce successfully loaded & departed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Escrow release guaranteed upon single digital QR scan at delivery terminal.</span>
                    </div>
                    <Link
                      to={`/orders/${o.id}/tracking`}
                      className="text-xs font-bold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
                    >
                      Live Map & Fleet Tracking <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
