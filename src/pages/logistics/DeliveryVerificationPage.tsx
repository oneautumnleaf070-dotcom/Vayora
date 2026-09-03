import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Delivery, Order } from '../../types';
import {
  getDelivery,
  getDeliveriesForLogisticsPartner,
  verifyAndCompleteDelivery,
} from '../../services/deliveryService';
import { getOrderById } from '../../services/orderService';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  KeyRound,
  Camera,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { QRScannerModal } from '../../components/qr/QRScannerModal';
import { formatINR } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';

export const DeliveryVerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'QR' | 'OTP'>('QR');
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{ method: string; time: string } | null>(null);

  const loadDeliveryData = async () => {
    setLoading(true);
    try {
      let target: Delivery | undefined;
      if (id) {
        target = await getDelivery(id);
      }
      if (!target && user) {
        // No explicit delivery id in the URL — land on this partner's most
        // relevant delivery (prefer one already ARRIVED and ready to verify).
        const list = await getDeliveriesForLogisticsPartner(user.id);
        target = list.find((d) => d.status === 'ARRIVED') || list[0];
      }

      if (target) {
        setDelivery(target);
        if (target.orderId) {
          const ord = await getOrderById(target.orderId);
          if (ord) setOrder(ord);
        }
        if (target.status === 'DELIVERED') {
          setVerificationSuccess(true);
          setVerifiedResult({
            method: target.verificationMethod || 'QR',
            time: target.verifiedAt || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Error loading delivery for verification', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryData();
  }, [id]);

  const handleVerify = async (method: 'QR' | 'OTP', tokenOrOtp: string) => {
    if (!delivery || !user) return;
    setVerifying(true);
    try {
      const result = await verifyAndCompleteDelivery(
        delivery.id,
        method,
        tokenOrOtp,
        user.id,
        role
      );

      setDelivery(result.delivery);
      setVerificationSuccess(true);
      setVerifiedResult({
        method,
        time: result.delivery.verifiedAt || new Date().toISOString(),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast('success', 'Handover Verified!', result.message);
    } catch (err: any) {
      showToast('error', 'Verification Failed', err.message || 'Could not verify delivery.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-mono">Loading delivery verification terminal...</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">No Arrived Delivery Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          There is no active delivery waiting in ARRIVED status. Please advance an assigned delivery to ARRIVED from the Logistics Dashboard.
        </p>
        <Link to="/logistics/dashboard">
          <Button variant="primary">Return to Logistics Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/logistics/dashboard"
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-400">
          Terminal Session: #{delivery.id}
        </span>
      </div>

      {/* Main Verification Card */}
      <Card className="p-6 sm:p-8 space-y-6 border-slate-200 shadow-soft">
        {/* Top Status & Commodity Meta */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              FINAL PHYSICAL HANDOVER & ESCROW CLEARANCE
            </span>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
                Delivery #{delivery.id}
              </h1>
              <Badge
                variant={verificationSuccess || delivery.status === 'DELIVERED' ? 'green' : 'amber'}
                size="md"
              >
                {verificationSuccess || delivery.status === 'DELIVERED'
                  ? 'DELIVERED ✓'
                  : 'ARRIVED — VERIFICATION REQUIRED'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Commodity: <strong>{delivery.cropName || order?.cropName || 'Tomato'}</strong> •{' '}
              {delivery.quantity || order?.quantity || 1000} {delivery.unit || order?.unit || 'kg'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Escrow Protected Value</span>
            <span className="text-lg font-mono font-extrabold text-emerald-800">
              {formatINR(order?.totalAmount || 33740)}
            </span>
            <span className="text-[11px] text-teal-700 font-semibold block">
              100% Direct Farmer Realization
            </span>
          </div>
        </div>

        {/* Success Confirmation State */}
        {verificationSuccess ? (
          <div className="p-6 bg-emerald-50/80 rounded-3xl border border-emerald-200 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-emerald-950">
                Handover Successfully Verified!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Delivery confirmed via{' '}
                <strong>{verifiedResult?.method === 'QR' ? 'QR Scan Pass' : 'Buyer Handover OTP'}</strong>.{' '}
                Escrow funds have been unblocked and marked <strong>Settlement Ready</strong> for direct farmer disbursement.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 text-xs font-mono text-emerald-900 inline-block text-left space-y-1">
              <div>Status: <strong>DELIVERED</strong></div>
              <div>Verification Method: <strong>{verifiedResult?.method}</strong></div>
              <div>Carrier Verified: <strong>{user?.name || 'Kisan Express'}</strong></div>
              <div>Settlement State: <strong>READY_FOR_SETTLEMENT</strong></div>
            </div>

            <div className="pt-2">
              <Link to="/logistics/dashboard">
                <Button variant="primary" size="md">
                  Return to Active Fleet Operations
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Verification Form */
          <div className="space-y-6">
            {/* Delivery Location Specs */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700 font-bold">
                <span>Buyer Unloading Destination Bay:</span>
                <span className="font-mono text-slate-900">Order #{delivery.orderId}</span>
              </div>
              <p className="font-medium text-slate-900">{delivery.deliveryLocation}</p>
              {delivery.waypoints && delivery.waypoints.length > 0 && (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-teal-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Consolidated Agri-Corridor: {delivery.waypoints.length} Farm Gate Lots Loaded</span>
                </div>
              )}
            </div>

            {/* Verification Method Tabs */}
            <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('QR')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'QR'
                    ? 'bg-white text-slate-900 shadow-soft'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-teal-700" />
                <span>OPTION A: QR SCAN PASS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('OTP')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'OTP'
                    ? 'bg-white text-slate-900 shadow-soft'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>OPTION B: 6-DIGIT OTP</span>
              </button>
            </div>

            {/* TAB 1: QR Verification */}
            {activeTab === 'QR' && (
              <div className="space-y-4 text-center py-2">
                <div className="p-6 border-2 border-dashed border-teal-300 rounded-3xl bg-teal-50/30 space-y-4">
                  <QrCode className="w-12 h-12 text-teal-700 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Scan Recipient Handover Pass
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Ask the receiving bay manager or buyer to present their VAYORA Delivery Pass QR on their screen.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setCameraModalOpen(true)}
                      leftIcon={<Camera className="w-4 h-4" />}
                      className="bg-teal-700 hover:bg-teal-800"
                    >
                      Open Optical Camera Scanner
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Protected with single-use cryptographic token hashes & anti-replay locks.
                </p>
              </div>
            )}

            {/* TAB 2: OTP Verification */}
            {activeTab === 'OTP' && (
              <div className="space-y-4 py-2">
                <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-200/80 space-y-4 text-center">
                  <KeyRound className="w-10 h-10 text-amber-700 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Enter 6-Digit Buyer Handover OTP
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Request the 6-digit confirmation code shown on the buyer's handover pass screen.
                    </p>
                  </div>

                  {/* Formatted OTP Input */}
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="● ● ● ● ● ●"
                      className="w-full text-center text-2xl font-mono font-extrabold tracking-widest px-4 py-3 rounded-2xl border-2 border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 outline-hidden bg-white shadow-2xs"
                    />
                  </div>

                  <div>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full max-w-xs mx-auto bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => handleVerify('OTP', otpInput)}
                      disabled={otpInput.length !== 6 || verifying}
                      isLoading={verifying}
                      leftIcon={<Lock className="w-4 h-4" />}
                    >
                      Verify Handover & Release Escrow
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Delivery OTP expires in 10 minutes. Requires authorized carrier verification.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Optical Camera Modal */}
      {cameraModalOpen && (
        <QRScannerModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          orderId={delivery.orderId}
          expectedOtp={delivery.deliveryOtp}
          onVerificationSuccess={(result) => {
            setCameraModalOpen(false);
            handleVerify(
              result.method === 'OTP_ENTRY' ? 'OTP' : 'QR',
              result.deliveryId || delivery.qrCode || ''
            );
          }}
        />
      )}
    </div>
  );
};
