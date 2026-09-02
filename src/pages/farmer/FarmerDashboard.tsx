import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Sprout,
  PlusCircle,
  Tag,
  Package,
  IndianRupee,
  Building,
  LayoutGrid,
  List,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Tractor,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ProduceStatusCard } from '../../components/farmer/ProduceStatusCard';
import { OfferSummaryRow } from '../../components/farmer/OfferSummaryRow';
import { PriceForecastWidget } from '../../components/farmer/PriceForecastWidget';
import { DemandChart } from '../../components/ai/DemandChart';
import { getProduceByFarmer, updateProduce } from '../../services/produceService';
import { getOffersByFarmer, updateOfferStatus } from '../../services/offerService';
import { getOrdersByUser } from '../../services/orderService';
import { getPriceRecommendation } from '../../services/aiService';
import { Produce, Offer, Order, AIPriceRecommendation } from '../../types';
import { formatINR, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

type ProduceTab = 'ACTIVE' | 'DRAFT' | 'EXPIRED_SOLD_OUT';

export const FarmerDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiData, setAiData] = useState<AIPriceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  // Status Tab & View Mode
  const [activeTab, setActiveTab] = useState<ProduceTab>('ACTIVE');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [showFeeBreakdownModal, setShowFeeBreakdownModal] = useState(false);
  const [counterModalOffer, setCounterModalOffer] = useState<Offer | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<number>(0);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  const isFPO = role === 'FPO';

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [prods, offs, ords] = await Promise.all([
        getProduceByFarmer(user.id),
        getOffersByFarmer(user.id),
        getOrdersByUser(user.id, role),
      ]);

      const safeProds = Array.isArray(prods) ? prods : [];
      setProduceList(safeProds);
      setOffers(Array.isArray(offs) ? offs : []);
      setOrders(Array.isArray(ords) ? ords : []);

      // Fetch AI price recommendation for primary crop
      const primaryCrop = safeProds.length > 0 ? safeProds[0].cropName : 'Tomato';
      try {
        const rec = await getPriceRecommendation({
          cropName: primaryCrop,
          category: 'VEGETABLES',
          quantity: 300,
          qualityGrade: 'Grade A',
          location: user.location || 'Maharashtra',
          harvestDate: '2026-08-28',
        });
        setAiData(rec);
      } catch (e) {
        console.warn('AI recommendation error in dashboard:', e);
      }
    } catch (err) {
      console.error('Error loading farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_produce_updated', loadData);
    window.addEventListener('vayora_offers_updated', loadData);
    window.addEventListener('vayora_orders_updated', loadData);
    return () => {
      window.removeEventListener('vayora_produce_updated', loadData);
      window.removeEventListener('vayora_offers_updated', loadData);
      window.removeEventListener('vayora_orders_updated', loadData);
    };
  }, [user]);

  // Produce status filter
  const activeProduce = produceList.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'AVAILABLE'
  );
  const draftProduce = produceList.filter((p) => p.status === 'DRAFT');
  const expiredOrSoldOutProduce = produceList.filter(
    (p) => p.status === 'SOLD_OUT' || p.status === 'EXPIRED' || p.status === 'CANCELLED'
  );

  const currentTabProduce =
    activeTab === 'ACTIVE'
      ? activeProduce
      : activeTab === 'DRAFT'
      ? draftProduce
      : expiredOrSoldOutProduce;

  // Toggle produce status (Delist / Re-activate)
  const handleToggleProduceStatus = async (produceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' || currentStatus === 'AVAILABLE' ? 'DRAFT' : 'ACTIVE';
    try {
      await updateProduce(produceId, { status: nextStatus });
      setProduceList((prev) =>
        prev.map((p) => (p.id === produceId ? { ...p, status: nextStatus } : p))
      );
      showToast(
        'info',
        'Status Updated',
        nextStatus === 'DRAFT' ? 'Listing set to Inactive (Draft).' : 'Listing is now Active for buyers.'
      );
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message || 'Could not update produce status.');
    }
  };

  // Inline Offer Actions
  const handleAcceptOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await updateOfferStatus(offerId, 'ACCEPTED');
      showToast(
        'success',
        language === 'hi' ? 'प्रस्ताव स्वीकार किया गया!' : 'Offer Accepted!',
        language === 'hi'
          ? 'सुरक्षित भुगतान के साथ ऑर्डर तैयार कर दिया गया है।'
          : 'Order created with guaranteed escrow lock. Buyer notified.'
      );
      await loadData();
    } catch (e: any) {
      showToast('error', 'Accept Failed', e.message || 'Could not accept offer.');
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleOpenCounterModal = (offer: Offer) => {
    setCounterModalOffer(offer);
    setCounterPriceInput(offer.offeredPrice + 2);
  };

  const handleSubmitCounterOffer = async () => {
    if (!counterModalOffer) return;
    if (counterPriceInput <= 0) {
      showToast('error', 'Invalid Price', 'Please enter a valid counter price per kg.');
      return;
    }

    setProcessingOfferId(counterModalOffer.id);
    try {
      await updateOfferStatus(counterModalOffer.id, 'COUNTERED', counterPriceInput);
      showToast(
        'success',
        'Counter-Offer Sent',
        `Proposed ₹${counterPriceInput}/kg to buyer ${counterModalOffer.buyerName}.`
      );
      setCounterModalOffer(null);
      await loadData();
    } catch (e: any) {
      showToast('error', 'Counter Failed', e.message || 'Could not send counter-offer.');
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await updateOfferStatus(offerId, 'REJECTED');
      showToast(
        'info',
        language === 'hi' ? 'प्रस्ताव अस्वीकार किया' : 'Offer Declined',
        language === 'hi' ? 'प्रस्ताव को अस्वीकार कर दिया गया है।' : 'Offer marked as declined.'
      );
      await loadData();
    } catch (e: any) {
      showToast('error', 'Decline Failed', e.message || 'Could not decline offer.');
    } finally {
      setProcessingOfferId(null);
    }
  };

  // KPIs
  const totalQuantityListed = activeProduce.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;
  const pendingOffersCount = offers.filter((o) => o.status === 'PENDING').length;
  const totalEarnings = orders
    .filter((o) => o.paymentStatus === 'RELEASED_TO_FARMER' || o.paymentStatus === 'HELD_IN_ESCROW')
    .reduce((acc, o) => acc + (o.produceAmount || 0), 0);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner & Profile Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt={user?.name || 'Farmer'}
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-emerald-500/20 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                {t.welcome}, {user?.name || 'Farmer'}
              </h1>
              {isFPO ? (
                <Badge variant="teal" size="md">{t.fpoHub}</Badge>
              ) : (
                <Badge variant="green" size="md">{t.verifiedProducer}</Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1 font-medium truncate">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              {user?.organizationName || (isFPO ? 'FPO Collective Producer Hub' : 'Farm Producer')} • {user?.location || 'India'}
            </p>
          </div>
        </div>

        {/* Action Controls & Language Selector */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-brand-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to English"
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                language === 'hi'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to Hindi"
            >
              हिंदी
            </button>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            isLoading={loading}
            aria-label="Refresh Dashboard Data"
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-600" />}
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Section: KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Earnings StatCard with Fee Breakdown Trigger */}
        <div
          onClick={() => setShowFeeBreakdownModal(true)}
          className="cursor-pointer group"
          title="Click to view 0% middleman transparent fee breakdown"
        >
          <StatCard
            title={t.totalPayoutsReleased}
            value={formatINR(totalEarnings)}
            subtitle="100% Direct Payout (Tap breakdown)"
            trend="up"
            icon={<IndianRupee className="w-6 h-6 text-teal-600 group-hover:scale-110 transition-transform" />}
            accentColor="teal"
          />
        </div>

        <StatCard
          title={t.activeHarvestListed}
          value={`${formatNumber(totalQuantityListed)} ${activeProduce[0]?.unit || 'kg'}`}
          change={`${activeProduce.length} Batches Active`}
          trend="up"
          icon={<Sprout className="w-6 h-6 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title={t.pendingBuyerOffers}
          value={pendingOffersCount.toString()}
          change={`${offers.length} Total Offers`}
          trend={pendingOffersCount > 0 ? 'up' : 'neutral'}
          icon={<Tag className="w-6 h-6 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title={t.ordersInTransit}
          value={activeOrdersCount.toString()}
          change={t.safePaymentProtected}
          trend="up"
          icon={<Package className="w-6 h-6 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* 3. Hero Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-brand-800 to-teal-900 text-white p-5 sm:p-7 rounded-3xl shadow-soft border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-emerald-200">
            {isFPO ? <Building className="w-3.5 h-3.5" /> : <Tractor className="w-3.5 h-3.5" />}
            <span>{isFPO ? 'FPO Collective Producer Hub' : 'Direct Producer Marketplace'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            {isFPO ? 'Manage Member Harvest & Bulk Sales' : t.listHarvest}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium">
            {t.listHarvestSub}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Link to="/farmer/produce/new" className="flex-1 sm:flex-none">
            <button
              type="button"
              className="w-full min-h-[48px] px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ {t.listHarvest}</span>
            </button>
          </Link>

          <Link to="/farmer/offers" className="flex-1 sm:flex-none">
            <button
              type="button"
              className="w-full min-h-[48px] px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Tag className="w-4 h-4 text-amber-300" />
              <span>{t.viewAllOffers}</span>
            </button>
          </Link>

          <Link to="/farmer/orders" className="flex-1 sm:flex-none">
            <button
              type="button"
              className="w-full min-h-[48px] px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4 text-emerald-300" />
              <span>Orders</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 4. Middle Section: Produce Status Tabs */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Active Crops</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'ACTIVE' ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
                {activeProduce.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DRAFT')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Drafts / Inactive</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'DRAFT' ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
                {draftProduce.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('EXPIRED_SOLD_OUT')}
              className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'EXPIRED_SOLD_OUT'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Expired / Sold Out</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'EXPIRED_SOLD_OUT' ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
                {expiredOrSoldOutProduce.length}
              </span>
            </button>
          </div>

          {/* View Mode Toggle & Add Button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
                aria-label="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <Link to="/farmer/produce/new">
              <Button variant="outline" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Add Crop
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        {currentTabProduce.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
            <Sprout className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'ACTIVE'
                ? 'No Active Harvest Batches'
                : activeTab === 'DRAFT'
                ? 'No Draft Listings'
                : 'No Expired or Sold Out Batches'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'ACTIVE'
                ? 'List your ready harvest to start receiving direct verified buyer offers.'
                : 'Crops saved as draft or delisted will appear here.'}
            </p>
            {activeTab === 'ACTIVE' && (
              <Link to="/farmer/produce/new">
                <Button variant="primary" size="md" className="mt-2">
                  + List Harvest Now
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTabProduce.map((p) => (
              <ProduceStatusCard
                key={p.id}
                produce={p}
                viewMode="grid"
                onToggleStatus={handleToggleProduceStatus}
                onViewOffers={() => navigate('/farmer/offers')}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {currentTabProduce.map((p) => (
              <ProduceStatusCard
                key={p.id}
                produce={p}
                viewMode="list"
                onToggleStatus={handleToggleProduceStatus}
                onViewOffers={() => navigate('/farmer/offers')}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Lower Section: Offers & Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Pending Offers List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {t.directBuyerOffers}
              </h3>
              {pendingOffersCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold animate-pulse">
                  {pendingOffersCount} Pending
                </span>
              )}
            </div>
            <Link to="/farmer/offers" className="text-xs sm:text-sm font-bold text-brand-700 hover:underline flex items-center gap-1">
              <span>{t.viewAllOffers}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {offers.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 text-xs space-y-2">
                <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">{t.noBuyerOffers}</p>
              </Card>
            ) : (
              offers.slice(0, 5).map((off) => (
                <OfferSummaryRow
                  key={off.id}
                  offer={off}
                  onAccept={handleAcceptOffer}
                  onCounter={handleOpenCounterModal}
                  onReject={handleRejectOffer}
                  processing={processingOfferId === off.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Orders Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Recent Dispatches & Orders ({orders.length})
            </h3>
            <Link to="/farmer/orders" className="text-xs sm:text-sm font-bold text-brand-700 hover:underline flex items-center gap-1">
              <span>View Orders</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <Card className="p-0 overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No Orders Placed Yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {orders.slice(0, 4).map((ord) => (
                  <div key={ord.id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                      <Badge
                        variant={
                          ord.status === 'DELIVERED'
                            ? 'green'
                            : ord.status === 'IN_TRANSIT'
                            ? 'amber'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{ord.cropName}</p>
                        <p className="text-[11px] text-slate-500">Buyer: {ord.buyerName}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-emerald-800 text-sm block">
                          {formatINR(ord.produceAmount || ord.totalAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ord.quantity} {ord.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 6. Bottom Section: AI Intelligence & Mandi Forecast */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {t.aiMarketAdvisory}
            </h3>
          </div>
          <Link to="/farmer/intelligence" className="text-xs sm:text-sm font-bold text-brand-700 hover:underline flex items-center gap-1">
            <span>{t.mandiIntelligence}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {aiData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <PriceForecastWidget
                data={aiData}
                onAdoptPrice={(price) => {
                  showToast('success', 'Price Applied', `Target price ₹${price}/kg staged for listing.`);
                  navigate('/farmer/produce/new');
                }}
              />
            </div>
            <div className="lg:col-span-4">
              <DemandChart data={aiData.demandForecast} cropName={aiData.cropName} />
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-6 h-6 text-brand-700 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold">Loading Live Mandi Projections...</p>
          </div>
        )}
      </div>

      {/* Counter-Offer Modal */}
      {counterModalOffer && (
        <Modal
          isOpen={!!counterModalOffer}
          onClose={() => setCounterModalOffer(null)}
          title="Propose Counter-Offer Rate"
          subtitle={`Countering ${counterModalOffer.buyerName}'s offer on ${counterModalOffer.cropName}`}
          maxWidth="sm"
        >
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Quantity:</span>
                <span className="font-bold text-slate-900">{counterModalOffer.quantity} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buyer's Current Offer:</span>
                <span className="font-bold font-mono text-slate-900">{formatINR(counterModalOffer.offeredPrice)} / kg</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Your Counter Asking Rate (₹ / kg) *
              </label>
              <div className="relative">
                <IndianRupee className="w-5 h-5 absolute left-3.5 top-3.5 text-emerald-700" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={counterPriceInput}
                  onChange={(e) => setCounterPriceInput(Number(e.target.value))}
                  className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-white rounded-2xl border-2 border-emerald-300 text-lg font-extrabold font-mono text-emerald-950 focus:ring-4 focus:ring-emerald-200 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Total payout at proposed counter rate: <strong>{formatINR(counterPriceInput * counterModalOffer.quantity)}</strong>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => setCounterModalOffer(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                onClick={handleSubmitCounterOffer}
                isLoading={processingOfferId === counterModalOffer.id}
              >
                Send Counter
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transparent Fee Breakdown Modal */}
      {showFeeBreakdownModal && (
        <Modal
          isOpen={showFeeBreakdownModal}
          onClose={() => setShowFeeBreakdownModal(false)}
          title="Transparent Earnings Breakdown"
          subtitle="How VAYORA calculates your 100% direct produce value"
          maxWidth="md"
        >
          <div className="space-y-5">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Zero Middleman Commission Policy</span>
              </div>
              <p className="text-emerald-900 leading-relaxed">
                Unlike traditional mandis where middlemen deduct 6-12% commission plus unrecorded handling cuts, VAYORA passes 100% of your produce asking price directly to your bank account.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800">Your Produce Realization</span>
                <span className="font-mono font-extrabold text-emerald-800 text-sm">100% Direct Payout</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Middleman / Brokerage Cut</span>
                <span className="font-mono font-bold text-emerald-700">₹0.00 (0%)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Freight / Logistics Transit</span>
                <span className="text-slate-500">Paid by Commercial Buyer</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Platform Operational Facilitation</span>
                <span className="text-slate-500">Covered in Buyer Order Fee</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-slate-900 font-bold">
                <span>Guaranteed Payment Release</span>
                <span className="text-emerald-800 font-mono">Instant upon QR/OTP Handover</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full min-h-[44px] bg-brand-700 hover:bg-brand-800 text-white font-bold"
              onClick={() => setShowFeeBreakdownModal(false)}
            >
              Close Breakdown
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
