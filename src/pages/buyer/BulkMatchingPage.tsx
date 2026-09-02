import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  matchBulkOrder,
  executeBulkOrderReservation,
  SmartMatchingResult,
} from '../../services/matchingService';
import { getStoredProduce } from '../../services/produceService';
import {
  Layers,
  Sparkles,
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Building,
  Tractor,
  MapPin,
  Clock,
  Lock,
  Info,
  DollarSign,
  Package,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatINR, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const PROGRESS_STEPS = [
  'Searching verified suppliers...',
  'Checking available quantity...',
  'Comparing prices...',
  'Calculating distance...',
  'Optimizing supplier combination...',
];

export const BulkMatchingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Procurement Inputs
  const [cropName, setCropName] = useState('Tomato');
  const [requiredKg, setRequiredKg] = useState<number>(1000);
  const [minimumGrade, setMinimumGrade] = useState('Grade A');
  const [deliveryLocation, setDeliveryLocation] = useState(user?.location || 'Chennai');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(300);

  // Matching & Progress Animation State
  const [isMatching, setIsMatching] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [matchResult, setMatchResult] = useState<SmartMatchingResult | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Buyer coordinates
  const buyerLat = user?.latitude || 13.0827; // Default Chennai
  const buyerLng = user?.longitude || 80.2707;

  const runSmartMatcher = () => {
    setIsMatching(true);
    setCurrentStepIndex(0);

    // Step-by-step professional progress sequence (Requirement 10)
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) {
        setCurrentStepIndex(step);
      } else {
        clearInterval(interval);
        // Execute explainable algorithm
        const listings = getStoredProduce();
        const result = matchBulkOrder({
          cropName,
          requiredQuantity: requiredKg,
          unit: 'kg',
          minimumQuality: minimumGrade,
          deliveryLatitude: buyerLat,
          deliveryLongitude: buyerLng,
          deliveryLocation,
          maxDistanceKm,
          availableListings: listings,
        });

        setMatchResult(result);
        setIsMatching(false);
      }
    }, 280);
  };

  useEffect(() => {
    runSmartMatcher();
  }, []);

  const handleConfirmReservation = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!matchResult || matchResult.suppliers.length === 0) return;

    setConfirmingOrder(true);
    try {
      const order = await executeBulkOrderReservation(
        matchResult,
        user,
        `${deliveryLocation} Regional Warehouse Distribution Terminal`,
        { lat: buyerLat, lng: buyerLng }
      );

      showToast(
        'success',
        'Smart Bulk Order Created & Inventory Locked!',
        `Order #${order.id} confirmed with ${matchResult.suppliers.length} suppliers in Smart Escrow.`
      );
      setConfirmModalOpen(false);
      navigate('/buyer/orders');
    } catch (err: any) {
      showToast('error', 'Reservation Failed', err.message || 'Inventory changed. Please run matcher again.');
      // Refresh matching
      runSmartMatcher();
    } finally {
      setConfirmingOrder(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-soft border border-teal-800/50 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-full text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SIH INNOVATION: MULTI-SUPPLIER SMART MATCHING</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Smart Bulk Order Matching Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Procuring large wholesale volumes? When no single farmer has enough stock, VAYORA’s explainable algorithm dynamically matches, coordinates, and combines multiple verified Farmers and FPOs into a single bulk delivery with consolidated freight.
        </p>
      </div>

      {/* Matching Input Configurator (Requirement 9) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-700" />
            Commercial Procurement Parameters
          </h3>
          <span className="text-xs text-slate-400 font-mono">Algorithm: Deterministic Multi-Criteria</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Commodity</label>
            <select
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:bg-white outline-none"
            >
              <option value="Tomato">Tomato (Farm Fresh)</option>
              <option value="Red Onions">Red Onions (Garwa)</option>
              <option value="Potatoes">Potatoes (Table Grade)</option>
              <option value="Basmati Rice">1121 Basmati Rice</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Required Quantity (kg)</label>
            <input
              type="number"
              min="100"
              step="50"
              value={requiredKg}
              onChange={(e) => setRequiredKg(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold font-mono focus:bg-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Minimum Quality Grade</label>
            <select
              value={minimumGrade}
              onChange={(e) => setMinimumGrade(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:bg-white outline-none"
            >
              <option value="Grade A">Grade A (Standard)</option>
              <option value="Grade A (Export)">Grade A (Export / Premium)</option>
              <option value="Grade B">Grade B (Processing)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Delivery Location</label>
            <input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:bg-white outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Search Radius: <strong>{maxDistanceKm} km</strong></span>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-36 accent-teal-700 cursor-pointer"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={runSmartMatcher}
            disabled={isMatching}
            isLoading={isMatching}
            leftIcon={<Sparkles className="w-4 h-4 text-emerald-300" />}
            className="bg-teal-700 hover:bg-teal-800"
          >
            Find Best Suppliers
          </Button>
        </div>
      </div>

      {/* Matching Animation Sequence (Requirement 10) */}
      {isMatching && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full border-4 border-teal-700 border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">VAYORA Smart Matching Active</h4>
            <p className="text-xs text-teal-700 font-semibold animate-pulse">
              {PROGRESS_STEPS[currentStepIndex]}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Match Result Card (Requirements 11, 12, 13, 14, 26) */}
      {!isMatching && matchResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-6">
            {/* Header with Fulfillment Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-teal-800">
                      VAYORA SMART MATCH
                    </span>
                    <Badge variant={matchResult.matched ? 'green' : 'amber'} size="sm">
                      {matchResult.matched ? '✓ Requirement Fulfilled' : '⚠️ Partial Fulfillment Available'}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatNumber(matchResult.allocatedQuantity)} / {formatNumber(matchResult.requiredQuantity)} kg Allocated
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Matching Score</span>
                <span className="text-2xl font-extrabold font-mono text-emerald-800">
                  {matchResult.matchingScore} / 100
                </span>
              </div>
            </div>

            {/* Visual Allocation Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                {matchResult.suppliers.map((s, idx) => {
                  const widthPct = (s.quantityAllocated / matchResult.requiredQuantity) * 100;
                  const bgColors = ['bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-blue-600'];
                  return (
                    <div
                      key={s.produceId + idx}
                      style={{ width: `${widthPct}%` }}
                      className={`h-full ${bgColors[idx % bgColors.length]} transition-all duration-500`}
                      title={`${s.farmerName}: ${s.quantityAllocated} kg`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>0 kg</span>
                <span>
                  {matchResult.matched ? '100% Fulfilled' : `${Math.round((matchResult.allocatedQuantity / matchResult.requiredQuantity) * 100)}% Available`}
                </span>
                <span>Target: {formatNumber(matchResult.requiredQuantity)} kg</span>
              </div>
            </div>

            {/* Multi-Supplier Breakdown List (Requirement 11) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Matched Coordinated Suppliers ({matchResult.suppliers.length} Producers)
              </h4>

              <div className="space-y-2.5">
                {matchResult.suppliers.map((s, idx) => (
                  <div
                    key={s.produceId + idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-2xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-900">{s.farmerName}</h5>
                          {s.farmerType === 'FPO' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-800 text-white flex items-center gap-1">
                              <Building className="w-3 h-3 text-teal-300" />
                              FPO Collective
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-800 text-white flex items-center gap-1">
                              <Tractor className="w-3 h-3 text-emerald-300" />
                              Farmer
                            </span>
                          )}
                          {s.verified && (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {s.location} • ~{Math.round(s.distance)} km away
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-xs font-mono text-slate-500 block">
                          Allocation / Available
                        </span>
                        <span className="text-sm font-extrabold font-mono text-slate-900">
                          {s.quantityAllocated} / {s.availableQuantity} kg
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-mono text-slate-500 block">Unit Price</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-800">
                          {formatINR(s.pricePerUnit)}/kg
                        </span>
                      </div>

                      <div className="min-w-[80px]">
                        <span className="text-xs font-mono text-slate-500 block">Total Subtotal</span>
                        <span className="text-sm font-extrabold font-mono text-slate-900">
                          {formatINR(s.subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Summary (Requirement 12) */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Consolidated Cost Breakdown</span>
                <span className="text-[11px] font-normal text-slate-500 italic">
                  * Logistics & platform values are estimated
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Produce Cost</span>
                  <span className="font-extrabold font-mono text-slate-900 text-sm mt-0.5 block">
                    {formatINR(matchResult.totalProduceCost)}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Estimated Logistics</span>
                  <span className="font-extrabold font-mono text-slate-900 text-sm mt-0.5 block">
                    {formatINR(matchResult.estimatedLogisticsCost)}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Platform / Facilitation</span>
                  <span className="font-extrabold font-mono text-slate-900 text-sm mt-0.5 block">
                    {formatINR(matchResult.estimatedPlatformFee)}
                  </span>
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                  <span className="text-teal-950 font-bold block text-[11px]">Farmer Net Proceeds</span>
                  <span className="font-extrabold font-mono text-teal-900 text-sm mt-0.5 block">
                    {formatINR(matchResult.farmerProceeds)} (100%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900">
                <span className="font-bold text-sm">Estimated Total Buyer Payable:</span>
                <span className="font-extrabold font-mono text-xl text-teal-950">
                  {formatINR(matchResult.estimatedTotalCost)}
                </span>
              </div>
            </div>

            {/* Transparent Explanation Box (Requirement 13) */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
              <h5 className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-700" />
                Why VAYORA Selected These Suppliers
              </h5>
              <p className="text-emerald-900 leading-relaxed">
                {matchResult.explanation}
              </p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-emerald-800 font-mono">
                <span>Weights: Quantity 30%</span>
                <span>• Price 25%</span>
                <span>• Distance 20%</span>
                <span>• Quality 15%</span>
                <span>• Verification 10%</span>
              </div>
            </div>

            {/* Bottom Action Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                <span>Guaranteed Direct Farm Gate Escrow Protection</span>
              </div>

              <div className="flex items-center gap-3">
                {!matchResult.matched && (
                  <span className="text-xs text-amber-700 font-bold">
                    Partial order available for {matchResult.allocatedQuantity} kg
                  </span>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={matchResult.suppliers.length === 0}
                  className="bg-teal-700 hover:bg-teal-800"
                  leftIcon={<Layers className="w-4 h-4" />}
                >
                  {matchResult.matched
                    ? `Confirm Smart Match & Lock Inventory (${formatINR(matchResult.estimatedTotalCost)})`
                    : `Procure Available ${matchResult.allocatedQuantity} kg`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Escrow Lock Modal (Requirement 14 & 15) */}
      {confirmModalOpen && matchResult && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Smart Bulk Order & Lock Inventory"
          subtitle={`Procuring ${matchResult.allocatedQuantity} kg ${cropName} across ${matchResult.suppliers.length} verified producers`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Total Volume:</span>
                <span className="font-bold text-slate-900">{matchResult.allocatedQuantity} kg</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Producers Involved:</span>
                <span className="font-bold text-slate-900">{matchResult.suppliers.length} Suppliers</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Direct Farmer Value:</span>
                <span className="font-mono font-bold text-emerald-800">{formatINR(matchResult.totalProduceCost)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Consolidated Freight & Platform:</span>
                <span className="font-mono">{formatINR(matchResult.estimatedLogisticsCost + matchResult.estimatedPlatformFee)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-2 text-slate-900">
                <span>Total Escrow Lock:</span>
                <span className="font-mono text-teal-900">{formatINR(matchResult.estimatedTotalCost)}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Atomic Inventory Reservation:</strong> Upon confirmation, Firestore will atomically deduct stock across all {matchResult.suppliers.length} producers. Funds will be deposited into <strong>VAYORA Smart Escrow</strong>.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 bg-teal-700 hover:bg-teal-800"
                onClick={handleConfirmReservation}
                isLoading={confirmingOrder}
              >
                Confirm & Create Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
