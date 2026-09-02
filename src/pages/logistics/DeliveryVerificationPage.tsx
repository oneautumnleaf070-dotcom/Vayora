import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Delivery, Order } from '../../types';
import {
  getDelivery,
  getStoredDeliveries,
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
  PenTool,
  IndianRupee,
  Check,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { QRScannerModal } from '../../components/qr/QRScannerModal';
import { PhotoCapture } from '../../components/logistics/PhotoCapture';
import { SignatureCanvas } from '../../components/logistics/SignatureCanvas';
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

  // New POD (Proof of Delivery) additions
  const [podPhoto, setPodPhoto] = useState<string>('');
  const [receiverSignature, setReceiverSignature] = useState<string>('');
  const [goodsCondition, setGoodsCondition] = useState<'GOOD' | 'MINOR_DAMAGE' | 'REJECTED'>('GOOD');
  const [conditionNotes, setConditionNotes] = useState<string>('');

  const loadDeliveryData = async () => {
    setLoading(true);
    try {
      let target: Delivery | undefined;
      if (id) {
        target = await getDelivery(id);
      }
      if (!target) {
        const list = getStoredDeliveries();
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
        time: new Date().toISOString(),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast(
        'success',
        'Handover Verified & Payment Released!',
        `Cryptographic dual verification passed. Escrow funds unlocked for producer & freight.`
      );
    } catch (e: any) {
      showToast(
        'error',
        'Verification Failed',
        e.message || 'Invalid QR code or OTP. Handover could not be authenticated.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      showToast('error', 'Invalid OTP', 'Please enter a valid 6-digit delivery OTP.');
      return;
    }
    handleVerify('OTP', otpInput.trim());
  };

  const handleScanSuccess = (decodedText: string) => {
    setCameraModalOpen(false);
    handleVerify('QR', decodedText);
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Loading delivery credentials...</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="p-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Delivery Record Not Found</h2>
        <Link to="/logistics/dashboard">
          <Button variant="primary">Return to Logistics</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/logistics/dashboard"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Delivery Handover & Escrow Settlement
            </h1>
            <p className="text-xs text-slate-500">
              Shipment #{delivery.id.slice(-8)} • {delivery.cropName || 'Produce'} ({delivery.quantity || 300} {delivery.unit || 'kg'})
            </p>
          </div>
        </div>

        <Link to={`/logistics/routes/${delivery.id}`}>
          <Button variant="outline" size="sm" leftIcon={<Truck className="w-4 h-4 text-amber-600" />}>
            Route Map
          </Button>
        </Link>
      </div>

      {/* Verification Success Celebration Banner */}
      {verificationSuccess ? (
        <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-200 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-900">
              Delivery Successfully Verified!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Cryptographic handover authenticated via{' '}
              <strong>{verifiedResult?.method === 'QR' ? 'QR Code Pass' : '6-Digit OTP'}</strong> at{' '}
              {verifiedResult?.time ? new Date(verifiedResult.time).toLocaleTimeString() : 'now'}.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 max-w-md mx-auto text-xs space-y-2 text-left">
            <div className="flex justify-between items-center text-slate-600">
              <span>Producer Direct Payout:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatINR(order?.produceAmount || 42000)} (100% Direct)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Freight Carrier Fee:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatINR(order?.logisticsFee || 2500)} (Settled)
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-2 font-bold text-slate-900">
              <span>Escrow Status:</span>
              <span className="text-emerald-700">RELEASED & CLEARED</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link to="/logistics/dashboard">
              <Button variant="primary" size="lg" className="bg-brand-700 hover:bg-brand-800 font-extrabold">
                Next Active Shipment
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Handover Methods Tabs */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Dual Verification Handover
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scan the buyer's screen QR code or request their 6-digit confirmation OTP
                  </p>
                </div>
              </div>
            </div>

            {/* Method Switcher */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('QR')}
                className={`min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'QR'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Scan Buyer QR Pass</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('OTP')}
                className={`min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'OTP'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Enter 6-Digit OTP</span>
              </button>
            </div>

            {/* QR Scan Tab */}
            {activeTab === 'QR' && (
              <div className="text-center space-y-4 py-4">
                <div className="p-6 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 max-w-sm mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Ready to Scan Buyer's Screen
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      The buyer holds the signed cryptographic QR token on their order tracking page.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md"
                    onClick={() => setCameraModalOpen(true)}
                    isLoading={verifying}
                    leftIcon={<Camera className="w-5 h-5" />}
                  >
                    Open Handover Camera Scanner
                  </Button>

                  {/* Demo test button */}
                  <button
                    type="button"
                    onClick={() => handleVerify('QR', delivery.qrToken || `VAYORA_DELIVERY:${delivery.id}:demo_pass`)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline block mx-auto cursor-pointer"
                  >
                    ⚡ Test One-Tap Verification (Demo Pass)
                  </button>
                </div>
              </div>
            )}

            {/* OTP Entry Tab */}
            {activeTab === 'OTP' && (
              <form onSubmit={handleOtpSubmit} className="max-w-sm mx-auto space-y-4 py-4">
                <div className="space-y-2 text-center">
                  <label className="block text-xs font-bold text-slate-800">
                    Enter Buyer Handover OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full min-h-[56px] text-center text-3xl font-mono font-extrabold tracking-[0.4em] bg-slate-50 rounded-2xl border-2 border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400">
                    Ask the receiving representative at buyer destination for their 6-digit PIN.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-md"
                  isLoading={verifying}
                >
                  Verify Handover Code
                </Button>
              </form>
            )}
          </Card>

          {/* New POD (Proof of Delivery) & Condition Card */}
          <Card className="p-6 space-y-6">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <span>Proof of Delivery & Goods Condition (POD)</span>
            </h3>

            {/* Photo Capture */}
            <PhotoCapture
              onPhotoCaptured={(img) => setPodPhoto(img)}
              label="Unloaded Produce Batch Photo"
              description="Capture high-resolution photo of crates/bags at buyer receiving bay"
            />

            {/* Goods Condition */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-800">Goods Receiving Condition</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGoodsCondition('GOOD')}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    goodsCondition === 'GOOD'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  ✓ Good Condition
                </button>
                <button
                  type="button"
                  onClick={() => setGoodsCondition('MINOR_DAMAGE')}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    goodsCondition === 'MINOR_DAMAGE'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  ⚠️ Minor Damage
                </button>
                <button
                  type="button"
                  onClick={() => setGoodsCondition('REJECTED')}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    goodsCondition === 'REJECTED'
                      ? 'bg-red-50 border-red-400 text-red-800 ring-2 ring-red-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  ✕ Damaged Batch
                </button>
              </div>
            </div>

            {/* Condition Notes */}
            {goodsCondition !== 'GOOD' && (
              <div className="space-y-1 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-800">Discrepancy / Damage Notes</label>
                <textarea
                  rows={2}
                  placeholder="Note specific details (e.g. 2 boxes damaged during transit)..."
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
            )}

            {/* B2B Signature Pad */}
            <SignatureCanvas
              onSignatureChange={(sig) => setReceiverSignature(sig)}
              label="Buyer Receiver Digital Sign-Off"
            />
          </Card>
        </div>
      )}

      {/* QR Scanner Camera Modal */}
      {cameraModalOpen && (
        <QRScannerModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onScanSuccess={handleScanSuccess}
          title="Scan Handover QR Code"
        />
      )}
    </div>
  );
};
