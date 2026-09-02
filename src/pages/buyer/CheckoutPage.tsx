import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNewOrder } from '../../services/orderService';
import { processTestPayment, calculatePriceBreakdown } from '../../services/paymentService';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  MapPin,
  Building,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PriceBreakdownCard } from '../../components/orders/PriceBreakdownCard';
import { formatINR } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const state = location.state || {};
  const isBulkOrder = state.isBulkOrder || false;

  const cropName = state.cropName || 'Tomatoes (Hybrid Red)';
  const quantity = state.quantity || 300;
  const unit = state.unit || 'kg';
  const pricePerUnit = state.pricePerUnit || 33;
  const farmerId = state.farmerId || 'user_farmer_ramesh';
  const farmerName = state.farmerName || 'Ramesh Patil';
  const farmerPhone = state.farmerPhone || '+91 98234 56789';
  const produceId = state.produceId || 'prod_tomato_ramesh';

  const [deliveryAddress, setDeliveryAddress] = useState(
    'Metro Fresh Central Distribution Center, Sector 19, Vashi APMC Hub, Navi Mumbai 400703'
  );
  const [deliveryCity, setDeliveryCity] = useState('Navi Mumbai, Maharashtra');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NET_BANKING' | 'CARD' | 'ESCROW_WALLET'>('UPI');
  const [processing, setProcessing] = useState(false);

  const breakdown = calculatePriceBreakdown(quantity, pricePerUnit, 165);

  const handleCompleteOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProcessing(true);

    try {
      // 1. Create order
      const newOrder = await createNewOrder({
        buyerId: user.id,
        buyerName: user.name,
        buyerPhone: user.phone,
        buyerOrganization: user.organizationName,
        farmerId: isBulkOrder ? 'multiple_suppliers' : farmerId,
        farmerName: isBulkOrder ? 'Multi-Supplier Agri Collective' : farmerName,
        farmerPhone,
        farmerType: isBulkOrder ? 'FPO' : state.farmerType || 'FARMER',
        produceId: isBulkOrder ? 'bulk_split' : produceId,
        cropName,
        quantity,
        unit,
        pricePerUnit,
        produceAmount: state.produceAmount || breakdown.produceAmount,
        logisticsFee: state.logisticsFee || breakdown.logisticsFee,
        platformFee: state.platformFee || breakdown.platformFee,
        totalAmount: state.totalAmount || breakdown.totalAmount,
        deliveryAddress,
        pickupLocation: state.pickupLocation || 'Patil Farm Gate, Nashik',
        deliveryLocation: deliveryCity,
        pickupCoords: state.pickupCoords || { lat: 19.9975, lng: 73.7898, address: 'Nashik Farm Gate' },
        deliveryCoords: { lat: 19.0760, lng: 72.8777, address: deliveryAddress },
        isBulkOrder,
        bulkSuppliers: state.bulkSuppliers,
      });

      // 2. Process sandbox payment
      await processTestPayment({
        orderId: newOrder.id,
        buyerId: user.id,
        farmerId,
        breakdown,
        paymentMethod,
      });

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
      });

      showToast(
        'success',
        'Payment & Order Confirmed!',
        `Order #${newOrder.id} has been created and held safely in Escrow.`
      );

      navigate(`/orders/${newOrder.id}/tracking`);
    } catch (e) {
      showToast('error', 'Payment Failed', 'Could not complete sandbox transaction.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-700" />
          Transparent Direct Checkout & Escrow
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Zero hidden intermediary commissions. Funds are securely locked in VAYORA Escrow until QR/OTP delivery verification.
        </p>
      </div>

      <form onSubmit={handleCompleteOrderAndPay} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Delivery & Payment Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Order Summary Item */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isBulkOrder ? 'Aggregated Bulk Batch' : 'Produce Information'}
            </h3>

            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{cropName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplier: <strong>{isBulkOrder ? 'Multi-Supplier Aggregated' : farmerName}</strong>
                </p>
                <p className="text-xs text-slate-600 font-mono mt-1">
                  {quantity} {unit} @ {formatINR(pricePerUnit)}/{unit}
                </p>
              </div>
              <span className="text-base font-extrabold font-mono text-emerald-800">
                {formatINR(state.produceAmount || breakdown.produceAmount)}
              </span>
            </div>
          </Card>

          {/* Delivery Location */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-700" />
              Delivery Destination Bay
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Detailed Address / Bay *</label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City / Terminal *</label>
                <input
                  type="text"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Payment Method Selector */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              VAYORA Sandbox Escrow Payment Method
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'UPI', label: 'Instant UPI / QR', icon: <QrCode className="w-4 h-4 text-emerald-700" /> },
                { key: 'NET_BANKING', label: 'Corporate RTGS / NEFT', icon: <Building className="w-4 h-4 text-blue-700" /> },
                { key: 'CARD', label: 'Credit / Debit Card', icon: <CreditCard className="w-4 h-4 text-purple-700" /> },
                { key: 'ESCROW_WALLET', label: 'VAYORA Escrow Wallet', icon: <ShieldCheck className="w-4 h-4 text-amber-700" /> },
              ].map((m) => (
                <div
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key as any)}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-2.5 text-xs font-bold transition-all ${
                    paymentMethod === m.key
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>SIH Hackathon Sandbox Active:</strong> Simulates seamless instantaneous payment without requiring real card credentials.
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Transparent Breakdown & Pay Button */}
        <div className="lg:col-span-5 space-y-6">
          <PriceBreakdownCard
            quantityKg={quantity}
            pricePerKg={pricePerUnit}
            produceAmount={state.produceAmount || breakdown.produceAmount}
            logisticsFee={state.logisticsFee || breakdown.logisticsFee}
            platformFee={state.platformFee || breakdown.platformFee}
            totalAmount={state.totalAmount || breakdown.totalAmount}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={processing}
            leftIcon={<Lock className="w-5 h-5" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Confirm & Pay {formatINR(state.totalAmount || breakdown.totalAmount)}
          </Button>

          <p className="text-[11px] text-center text-slate-400">
            By confirming, funds are locked in Escrow and released only after delivery verification.
          </p>
        </div>
      </form>
    </div>
  );
};
