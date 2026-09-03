import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProduceById, getStoredProduce } from '../../services/produceService';
import { createOffer } from '../../services/offerService';
import { createNewOrder } from '../../services/orderService';
import { calculatePriceBreakdown } from '../../services/paymentService';
import { Produce } from '../../types';
import {
  Sprout,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  ShoppingBag,
  Tag,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Users,
  Building,
  Tractor,
  Info,
  CreditCard,
  Lock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DemandChart } from '../../components/ai/DemandChart';
import { formatINR, calculateDistanceKm } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const ProduceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<Produce | undefined>(undefined);
  const [alternativeSellers, setAlternativeSellers] = useState<Produce[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderQuantity, setOrderQuantity] = useState<number>(100);
  const [selectedImage, setSelectedImage] = useState(0);

  // Offer Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState<number>(30);
  const [offerQuantity, setOfferQuantity] = useState<number>(100);
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Buy Now / Instant Checkout State
  const [buyNowModalOpen, setBuyNowModalOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('Metro Fresh Central Warehouse, Sector 19, Vashi, Navi Mumbai');
  const [processingOrder, setProcessingOrder] = useState(false);

  const loadItem = async () => {
    if (id) {
      setLoading(true);
      try {
        const found = await getProduceById(id);
        if (found) {
          setItem(found);
          const defaultQty = Math.min(found.availableQuantity, 100);
          setOrderQuantity(defaultQty > 0 ? defaultQty : found.availableQuantity);
          setOfferQuantity(defaultQty > 0 ? defaultQty : found.availableQuantity);
          setOfferedPrice(found.expectedPrice);
        }
      } catch (e) {
        console.error('Error fetching produce detail', e);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadItem();
    window.addEventListener('vayora_produce_updated', loadItem);
    return () => window.removeEventListener('vayora_produce_updated', loadItem);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!item) {
      setAlternativeSellers([]);
      return;
    }
    const normCrop = item.cropName.toLowerCase().split(' ')[0];
    getStoredProduce()
      .then((allListings) => {
        if (cancelled) return;
        setAlternativeSellers(
          allListings
            .filter((p) => p.id !== item.id && p.cropName.toLowerCase().includes(normCrop) && p.availableQuantity > 0)
            .slice(0, 3)
        );
      })
      .catch((e) => console.error('Error fetching alternative sellers', e));
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (loading) {
    return (
      <div className="p-20 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading produce details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-16 text-center space-y-4 max-w-md mx-auto">
        <p className="text-slate-700 font-bold text-base">Produce lot not found.</p>
        <p className="text-xs text-slate-500">This batch may have been sold out or delisted by the seller.</p>
        <Link to="/buyer/marketplace">
          <Button variant="primary">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const buyerLat = user?.latitude || 19.076;
  const buyerLng = user?.longitude || 72.8777;
  const distanceKm = calculateDistanceKm(buyerLat, buyerLng, item.latitude, item.longitude);

  // Transparent Price Breakdown
  const produceAmount = orderQuantity * item.expectedPrice;
  const estimatedLogistics = Math.round(500 + distanceKm * 2.5);
  const platformFee = 100; // Flat direct trade platform facilitation
  const estimatedBuyerTotal = produceAmount + estimatedLogistics + platformFee;
  const farmerProceeds = produceAmount; // 100% direct produce value!

  // Submit Offer
  const handleOpenOfferModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setOfferQuantity(orderQuantity);
    setOfferedPrice(item.expectedPrice);
    setOfferModalOpen(true);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (offerQuantity <= 0 || offerQuantity > item.availableQuantity) {
      showToast('error', 'Invalid Quantity', `Quantity must be between 1 and ${item.availableQuantity} ${item.unit}.`);
      return;
    }
    if (offeredPrice <= 0) {
      showToast('error', 'Invalid Price', 'Offered price must be greater than ₹0.');
      return;
    }

    setSubmittingOffer(true);
    try {
      await createOffer({
        produceId: item.id,
        cropName: item.cropName,
        farmerId: item.farmerId,
        buyerId: user.id,
        buyerName: user.name,
        buyerOrganization: user.organizationName,
        buyerPhone: user.phone,
        offeredPrice,
        quantity: offerQuantity,
        message: offerMessage,
      });

      showToast('success', 'Offer Submitted to Seller!', `Offered ₹${offeredPrice}/${item.unit} for ${offerQuantity} ${item.unit}.`);
      setOfferModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Offer Failed', err.message || 'Could not submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Buy Now Flow with Instant Test Payment
  const handleDirectBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (orderQuantity <= 0 || orderQuantity > item.availableQuantity) {
      showToast('error', 'Invalid Quantity', `Stock available is ${item.availableQuantity} ${item.unit}.`);
      return;
    }

    setProcessingOrder(true);
    try {
      const order = await createNewOrder({
        buyerId: user.id,
        buyerName: user.name,
        buyerPhone: user.phone,
        buyerOrganization: user.organizationName,
        farmerId: item.farmerId,
        farmerName: item.farmerName,
        farmerPhone: item.farmerPhone,
        farmerType: item.farmerType,
        produceId: item.id,
        cropName: item.cropName,
        quantity: orderQuantity,
        unit: item.unit,
        pricePerUnit: item.expectedPrice,
        produceAmount,
        logisticsFee: estimatedLogistics,
        platformFee,
        totalAmount: estimatedBuyerTotal,
        deliveryAddress,
        deliveryLocation: user.location || 'Mumbai Hub',
        pickupLocation: item.location,
        pickupCoords: { lat: item.latitude, lng: item.longitude, address: item.location },
        deliveryCoords: { lat: buyerLat, lng: buyerLng, address: deliveryAddress },
      });

      showToast('success', 'Order Confirmed & Escrow Locked!', `Order #${order.id} created successfully.`);
      setBuyNowModalOpen(false);
      navigate('/buyer/orders');
    } catch (err: any) {
      showToast('error', 'Checkout Failed', err.message || 'Order creation failed.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const isFPO = item.farmerType === 'FPO';
  const minP = item.aiMinimumPrice || (item.aiRecommendedPrice ? Math.round(item.aiRecommendedPrice * 0.95) : 32);
  const maxP = item.aiMaximumPrice || (item.aiRecommendedPrice ? Math.round(item.aiRecommendedPrice * 1.05) : 34);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/buyer/marketplace" className="hover:text-brand-700 font-medium">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{item.category}</span>
        <span>/</span>
        <span className="text-slate-900 font-bold">{item.cropName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Photos & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Gallery */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 relative">
              <img
                src={item.images[selectedImage] || item.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                alt={item.cropName}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-3 py-1 bg-white/95 text-slate-900 rounded-full text-xs font-extrabold shadow-sm flex items-center gap-1.5">
                  {isFPO ? <Building className="w-3.5 h-3.5 text-teal-600" /> : <Tractor className="w-3.5 h-3.5 text-emerald-600" />}
                  {isFPO ? 'FPO Collective' : 'Individual Farmer'}
                </span>
                {item.verifiedSeller && (
                  <span className="px-2.5 py-1 bg-emerald-800 text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Selector */}
            {item.images.length > 1 && (
              <div className="flex gap-2">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === idx ? 'border-brand-600 ring-2 ring-brand-200' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Commodity Specifications Card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Produce Specifications
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{item.category}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Quality Grade</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{item.qualityGrade}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Available Stock</span>
                <span className="font-bold font-mono text-emerald-800 mt-0.5 block">
                  {item.availableQuantity} {item.unit}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Harvest Date</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{item.harvestDate}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Shelf Life Expiry</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{item.expiryDate || '14 Days'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Transit Distance</span>
                <span className="font-bold font-mono text-slate-900 mt-0.5 block">{distanceKm} km</span>
              </div>
            </div>

            {/* Farm Origin & Producer Details */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  {item.farmerName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{item.farmerName}</h4>
                  <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {item.organizationName ? `${item.organizationName} • ` : ''}{item.location}
                  </p>
                </div>
              </div>

              <Badge variant={isFPO ? 'teal' : 'green'} size="sm">
                {isFPO ? 'FPO Collective' : 'Verified Farmer'}
              </Badge>
            </div>
          </Card>

          {/* AI Indicative Price Guidance & Demand Chart */}
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-3xl border border-emerald-800/40 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-300">
                    AI-ASSISTED INDICATIVE PRICE
                  </span>
                </div>
                <Badge variant={item.demandLevel === 'HIGH' ? 'green' : 'amber'} size="sm">
                  {item.demandLevel || 'HIGH'} Demand
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {formatINR(minP)} – {formatINR(maxP)}
                </span>
                <span className="text-xs text-slate-300 font-medium">/ {item.unit}</span>
              </div>

              {item.aiExplanation ? (
                <p className="text-xs text-slate-300 leading-relaxed bg-black/25 p-3 rounded-xl border border-white/5">
                  <strong>AI Analysis:</strong> {item.aiExplanation}
                </p>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed bg-black/25 p-3 rounded-xl border border-white/5">
                  <strong>AI Analysis:</strong> Direct buyer demand is elevated. Elimination of 3 intermediary tiers yields fair farmer realization within this indicative range.
                </p>
              )}

              {/* Strict Legal Disclaimer */}
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-white/10">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  The <em>AI-assisted indicative price</em> is an analytical guideline based on mandi velocity, not a guaranteed contract price.
                </span>
              </div>
            </div>

            {/* 7-Day Wholesale Demand Forecast Chart */}
            {item.demandForecast && item.demandForecast.length > 0 && (
              <DemandChart data={item.demandForecast} cropName={item.cropName} />
            )}
          </div>
        </div>

        {/* Right Column: Transparent Price Breakdown, Checkout & Offers */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Placement Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft space-y-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Direct Seller Asking Price
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-mono text-slate-900">
                  {formatINR(item.expectedPrice)}
                </span>
                <span className="text-xs font-normal text-slate-500 font-sans">
                  per {item.unit}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Procurement Quantity</label>
                <span className="text-[11px] font-mono text-slate-500">
                  Max: {item.availableQuantity} {item.unit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="10"
                  max={item.availableQuantity}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-sm outline-none focus:bg-white focus:border-brand-500"
                />
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2.5 rounded-xl">
                  {item.unit}
                </span>
              </div>
            </div>

            {/* Transparent Price Breakdown (Requirement 6) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Transparent Cost Breakdown</span>
                <Badge variant="verified" size="sm">0% Middleman</Badge>
              </h4>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Seller Asking Price:</span>
                  <span className="font-mono">{formatINR(item.expectedPrice)} / {item.unit}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Requested Quantity:</span>
                  <span className="font-mono">{orderQuantity} {item.unit}</span>
                </div>

                <div className="flex justify-between items-center text-slate-800 font-bold border-t border-slate-200 pt-2">
                  <span>Estimated Produce Value:</span>
                  <span className="font-mono text-emerald-800">{formatINR(produceAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Estimated Logistics ({distanceKm} km):</span>
                  <span className="font-mono">{formatINR(estimatedLogistics)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Platform / Direct Service Fee:</span>
                  <span className="font-mono">{formatINR(platformFee)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                  <span>Estimated Buyer Total:</span>
                  <span className="font-mono text-slate-950">{formatINR(estimatedBuyerTotal)}</span>
                </div>

                <div className="p-2.5 bg-emerald-100/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-center justify-between">
                  <span className="font-bold">Farmer Net Proceeds:</span>
                  <span className="font-mono font-extrabold text-emerald-900">
                    {formatINR(farmerProceeds)} (100%)
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Estimated transparent calculations for direct farm trade (SIH26033).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
                onClick={() => setBuyNowModalOpen(true)}
              >
                Buy Now — {formatINR(estimatedBuyerTotal)}
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full"
                leftIcon={<Tag className="w-4 h-4 text-brand-700" />}
                onClick={handleOpenOfferModal}
              >
                Make a Custom Offer
              </Button>
            </div>
          </div>

          {/* Nearby Alternative Sellers Comparison (Requirement 5 & 18) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Compare Nearby Alternative Sellers
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Same Commodity</span>
            </div>

            {alternativeSellers.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-white rounded-2xl border border-slate-200">
                No alternative sellers for {item.cropName} currently listed.
              </p>
            ) : (
              <div className="space-y-2">
                {alternativeSellers.map((alt) => {
                  const altDist = calculateDistanceKm(buyerLat, buyerLng, alt.latitude, alt.longitude);
                  return (
                    <Link
                      key={alt.id}
                      to={`/buyer/produce/${alt.id}`}
                      className="block p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs group-hover:text-brand-700 transition-colors">
                            {alt.farmerName} ({alt.farmerType === 'FPO' ? 'FPO' : 'Farmer'})
                          </h5>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {alt.location} • {altDist} km away
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold font-mono text-emerald-800 block">
                            {formatINR(alt.expectedPrice)}/{alt.unit}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {alt.availableQuantity} {alt.unit} left
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Make an Offer Modal (Requirement 8) */}
      {offerModalOpen && (
        <Modal
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          title={`Make an Offer for ${item.cropName}`}
          subtitle={`Seller: ${item.farmerName} (${item.location})`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitOffer} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-950 block">Current Asking Price</span>
                <span className="text-base font-bold font-mono text-emerald-900">{formatINR(item.expectedPrice)} / {item.unit}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-950 block">AI Indicative Range</span>
                <span className="text-xs font-bold font-mono text-emerald-800">{formatINR(minP)} – {formatINR(maxP)} / {item.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Requested Quantity ({item.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  max={item.availableQuantity}
                  value={offerQuantity}
                  onChange={(e) => setOfferQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-xs outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Your Offered Price (₹/{item.unit}) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-xs outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-700">Total Offer Value:</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">{formatINR(offeredPrice * offerQuantity)}</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Optional Message to Farmer</label>
              <textarea
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="e.g. Can procure recurring weekly volume if quality matches Grade A sample."
                rows={2}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOfferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" isLoading={submittingOffer}>
                Submit Offer to Seller
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Buy Now & Test Payment Modal (Requirement 9 & 18) */}
      {buyNowModalOpen && (
        <Modal
          isOpen={buyNowModalOpen}
          onClose={() => setBuyNowModalOpen(false)}
          title="Direct Order Checkout & Escrow Lock"
          subtitle={`Procuring ${orderQuantity} ${item.unit} of ${item.cropName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Commodity Lot:</span>
                <span className="font-bold text-slate-900">{item.cropName} ({orderQuantity} {item.unit})</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Seller:</span>
                <span className="font-bold text-slate-900">{item.farmerName} ({item.location})</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Farmer Direct Proceeds:</span>
                <span className="font-mono font-bold text-emerald-800">{formatINR(produceAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Logistics & Operational Fee:</span>
                <span className="font-mono">{formatINR(estimatedLogistics + platformFee)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                <span>Total Payable:</span>
                <span className="font-mono text-brand-900">{formatINR(estimatedBuyerTotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Delivery Warehouse Address *</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:bg-white"
                required
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Sandbox Test Payment:</strong> Amount will be deposited into <strong>VAYORA Smart Escrow</strong>. Funds are released to the farmer only upon digital QR/OTP delivery verification.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setBuyNowModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={handleDirectBuyNow}
                isLoading={processingOrder}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Pay & Confirm Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
