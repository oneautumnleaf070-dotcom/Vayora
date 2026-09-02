import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import { getOrdersByUser } from '../../services/orderService';
import {
  TrendingUp,
  ShieldCheck,
  Building,
  CreditCard,
  Download,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { formatINR, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const FarmerEarningsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  const loadData = async () => {
    if (user) {
      const list = await getOrdersByUser(user.id, role);
      setOrders(Array.isArray(list) ? list : []);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_orders_updated', loadData);
    return () => window.removeEventListener('vayora_orders_updated', loadData);
  }, [user]);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalEarnings = safeOrders.reduce((acc, o) => acc + (o.produceAmount || 0), 0);
  const releasedEarnings = safeOrders
    .filter((o) => o.paymentStatus === 'RELEASED_TO_FARMER')
    .reduce((acc, o) => acc + (o.produceAmount || 0), 0);
  const escrowLockedEarnings = safeOrders
    .filter((o) => o.paymentStatus === 'HELD_IN_ESCROW')
    .reduce((acc, o) => acc + (o.produceAmount || 0), 0);

  // Traditional Mandi intermediary loss eliminated
  const middlemanCommissionSaved = Math.round(totalEarnings * 0.35);

  const handleDownloadInvoice = (orderId: string) => {
    showToast(
      'success',
      'Invoice Downloaded',
      `Direct Farmer Sale Certificate #${orderId} generated.`
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Direct Farmer Earnings & Escrow Ledger
            </h1>
            <Badge variant="verified" size="sm">100% Direct Payouts</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent real-time financial ledger with direct RTGS/UPI bank settlements.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Zero Broker Deduction:</strong> 100% of the produce value is transferred to your account.
          </span>
        </div>
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Farmer Realization"
          value={formatINR(totalEarnings)}
          subtitle="Lifetime Direct Produce Sales"
          icon={<TrendingUp className="w-6 h-6" />}
          accentColor="green"
        />
        <StatCard
          title="Released to Bank"
          value={formatINR(releasedEarnings)}
          subtitle="Verified & Settled Payouts"
          icon={<Building className="w-6 h-6" />}
          accentColor="blue"
        />
        <StatCard
          title="Held in VAYORA Escrow"
          value={formatINR(escrowLockedEarnings)}
          subtitle="Releases upon QR Delivery"
          icon={<Lock className="w-6 h-6" />}
          accentColor="amber"
        />
        <StatCard
          title="Middleman Commission Saved"
          value={formatINR(middlemanCommissionSaved)}
          subtitle="+35% Margin Gain vs Mandi"
          icon={<ShieldCheck className="w-6 h-6" />}
          accentColor="purple"
          trend={{ value: 'Extra Earned', isPositive: true }}
        />
      </div>

      {/* Direct Trade Financial Comparison Banner */}
      <Card className="p-6 bg-gradient-to-r from-emerald-900 via-brand-900 to-slate-900 text-white space-y-4">
        <div className="flex items-center gap-2.5 text-emerald-300">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            VAYORA Price Transparency Guarantee (SIH26033)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
            <span className="text-slate-300 block text-[11px]">Produce Price to Farmer:</span>
            <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
              100% Direct Payout
            </span>
            <p className="text-[10px] text-slate-300 mt-1">No commission or hidden deductions.</p>
          </div>

          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
            <span className="text-slate-300 block text-[11px]">Logistics & Freight:</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              Paid by Buyer
            </span>
            <p className="text-[10px] text-slate-300 mt-1">Direct temperature-controlled transit.</p>
          </div>

          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
            <span className="text-slate-300 block text-[11px]">Escrow Release SLA:</span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              &lt; 30 Seconds
            </span>
            <p className="text-[10px] text-slate-300 mt-1">Instant release upon QR/OTP scan.</p>
          </div>
        </div>
      </Card>

      {/* Transaction History Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Direct Order Payouts Ledger</h3>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-4">Transaction / Order</th>
                  <th className="p-4">Buyer Organization</th>
                  <th className="p-4">Commodity Lot</th>
                  <th className="p-4">Total Realization</th>
                  <th className="p-4">Escrow Status</th>
                  <th className="p-4">Settlement Date</th>
                  <th className="p-4 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No order payouts recorded yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">#{o.id}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{o.buyerName}</span>
                        <span className="text-[11px] text-slate-500">{o.deliveryLocation}</span>
                      </td>
                      <td className="p-4">
                        {o.quantity} {o.unit} of {o.cropName}
                      </td>
                      <td className="p-4 font-mono font-extrabold text-emerald-800 text-sm">
                        {formatINR(o.produceAmount)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            o.paymentStatus === 'RELEASED_TO_FARMER'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {o.paymentStatus === 'RELEASED_TO_FARMER' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Bank Settled
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-amber-700" />
                              Escrow Locked
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {formatDateTime(o.updatedAt || o.createdAt)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoice(o.id)}
                          className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Download Direct Trade Certificate"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
