import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import {
  Sprout,
  PlusCircle,
  TrendingUp,
  Tag,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PriceRecommendationCard } from '../../components/ai/PriceRecommendationCard';
import { DemandChart } from '../../components/ai/DemandChart';
import { getProduceByFarmer } from '../../services/produceService';
import { getOffersByFarmer, updateOfferStatus } from '../../services/offerService';
import { getOrdersByUser } from '../../services/orderService';
import { getPriceRecommendation } from '../../services/aiService';
import { Produce, Offer, Order, AIPriceRecommendation } from '../../types';
import { formatINR, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const FarmerDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();
  const isFpo = role === 'FPO';

  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiData, setAiData] = useState<AIPriceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const prods = await getProduceByFarmer(user.id);
      setProduceList(Array.isArray(prods) ? prods : []);

      const offs = await getOffersByFarmer(user.id);
      setOffers(Array.isArray(offs) ? offs : []);

      const ords = await getOrdersByUser(user.id, role);
      setOrders(Array.isArray(ords) ? ords : []);

      // Fetch AI recommendation for primary crop (Tomatoes or user's first listing)
      const primaryCrop = prods && prods.length > 0 ? prods[0].cropName : 'Tomatoes (Hybrid Red)';
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
      } finally {
        setLoadingAi(false);
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

  const handleAcceptOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'ACCEPTED');
    showToast('success', 'Offer Accepted!', 'Buyer has been notified to complete escrow payment.');
    loadData();
  };

  const handleRejectOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'REJECTED');
    showToast('info', 'Offer Declined', 'Offer marked as declined.');
    loadData();
  };

  // Safe Aggregated KPIs
  const totalQuantityListed = (produceList || []).reduce((acc, p) => acc + (p.quantity || 0), 0);
  const activeOrdersCount = (orders || []).filter((o) => o.status !== 'DELIVERED').length;
  const pendingOffersCount = (offers || []).filter((o) => o.status === 'PENDING').length;
  const totalEarnings = (orders || [])
    .filter((o) => o.paymentStatus === 'RELEASED_TO_FARMER' || o.paymentStatus === 'HELD_IN_ESCROW')
    .reduce((acc, o) => acc + (o.produceAmount || 0), 0);

  // Plain-language AI price summary (Task 5) — the same aiData that feeds
  // PriceRecommendationCard/DemandChart, restated in one farmer-readable sentence.
  const demandWord = aiData
    ? aiData.demandLevel === 'HIGH'
      ? t('farmer_ai_demand_high')
      : aiData.demandLevel === 'LOW'
      ? t('farmer_ai_demand_low')
      : t('farmer_ai_demand_medium')
    : '';
  const aiPlainSummary = aiData
    ? t('farmer_ai_summary_template', {
        crop: aiData.cropName,
        min: formatNumber(aiData.minimumPrice),
        max: formatNumber(aiData.maximumPrice),
        demand: demandWord,
      })
    : t('farmer_ai_summary_loading');

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt={user?.name || 'Farmer'}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('farmer_greeting', { name: user?.name || 'Farmer' })}
              </h1>
              {isFpo ? (
                <Badge variant="teal" size="sm">{t('farmer_role_badge_fpo')}</Badge>
              ) : (
                <Badge variant="green" size="sm">{t('farmer_role_badge_farmer')}</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {user?.organizationName || 'Agricultural Producer'} • {user?.location || 'India'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Link to="/farmer/intelligence">
            <Button variant="outline" size="md" leftIcon={<TrendingUp className="w-4 h-4 text-brand-700" />}>
              Mandi Intelligence
            </Button>
          </Link>
          <Link to="/farmer/produce/new">
            <Button
              variant="primary"
              size="lg"
              className="bg-brand-700 hover:bg-brand-800"
              leftIcon={<PlusCircle className="w-5 h-5" />}
            >
              {t('farmer_hero_cta_button')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Guided "List My Harvest" hero card (Task 5) — big, unmissable, one clear action */}
      <Link
        to="/farmer/produce/new"
        aria-label={t('farmer_hero_cta_button')}
        className="group flex flex-col sm:flex-row items-center justify-between gap-5 bg-gradient-to-br from-brand-700 via-brand-800 to-emerald-900 text-white p-6 sm:p-7 rounded-3xl shadow-elevated hover:shadow-glow-green transition-shadow"
      >
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
            <Sprout className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold">{t('farmer_hero_cta_title')}</h2>
            <p className="text-sm text-emerald-100 mt-0.5 max-w-md">
              {isFpo ? t('farmer_hero_cta_body_fpo') : t('farmer_hero_cta_body')}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center justify-center gap-2 bg-white text-brand-800 font-extrabold text-base px-6 py-3.5 rounded-2xl shadow-sm group-hover:bg-emerald-50 transition-colors shrink-0 min-h-[48px]">
          {t('farmer_hero_cta_button')}
          <ArrowRight className="w-5 h-5" />
        </span>
      </Link>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-children">
        <StatCard
          title={t('farmer_kpi_harvest_title')}
          value={`${formatNumber(totalQuantityListed)} Quintals`}
          subtitle={`${produceList.length} Active Crop Batches`}
          icon={<Sprout className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title={t('farmer_kpi_offers_title')}
          value={pendingOffersCount.toString()}
          subtitle={`${offers.length} Total Received`}
          icon={<Tag className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title={t('farmer_kpi_orders_title')}
          value={activeOrdersCount.toString()}
          subtitle={t('farmer_kpi_orders_subtitle')}
          icon={<Package className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title={t('farmer_kpi_payouts_title')}
          value={formatINR(totalEarnings)}
          subtitle={t('farmer_kpi_payouts_subtitle')}
          icon={<ShieldCheck className="w-5 h-5 text-teal-600" />}
        />
      </div>

      {/* AI Intelligence Spotlight */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900">
              {t('farmer_ai_section_title')}
            </h3>
          </div>
          <Link to="/farmer/intelligence" className="text-xs font-bold text-brand-700 hover:underline">
            View Live Mandi Analysis →
          </Link>
        </div>

        {/* Plain-language summary — the same aiData, stated as one readable sentence */}
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <Zap className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-950 leading-relaxed">{aiPlainSummary}</p>
        </div>

        {aiData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <PriceRecommendationCard
                recommendation={aiData}
                onAcceptPrice={(price) => {
                  showToast('success', 'Price Applied', `Updated target asking price to ₹${price}/kg`);
                }}
              />
            </div>
            <div className="lg:col-span-5">
              <DemandChart data={aiData.demandForecast} cropName={aiData.cropName} />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-5 h-5 text-brand-700 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading AI Market Intelligence...</p>
          </div>
        )}
      </div>

      {/* Grid: My Produce Inventory & Buyer Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: My Produce Inventory */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{t('farmer_inventory_title')}</h3>
            <Link to="/farmer/produce/new" className="text-xs font-bold text-brand-700 hover:underline">
              + Add Produce
            </Link>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Crop Details</th>
                    <th className="p-4">Available Qty</th>
                    <th className="p-4">Asking Price</th>
                    <th className="p-4">Demand</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {produceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                        {t('farmer_inventory_empty')}
                      </td>
                    </tr>
                  ) : (
                    produceList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100'}
                            alt={p.cropName}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{p.cropName}</span>
                            <span className="text-[11px] text-slate-500">{p.qualityGrade}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {p.availableQuantity} / {p.quantity} {p.unit}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-800">
                          {formatINR(p.expectedPrice)}/{p.unit}
                        </td>
                        <td className="p-4">
                          <Badge variant={p.demandLevel === 'HIGH' ? 'green' : 'amber'} size="sm">
                            {p.demandLevel || 'MEDIUM'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Col: Incoming Buyer Offers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{t('farmer_offers_title')}</h3>
            <Link to="/farmer/offers" className="text-xs font-bold text-brand-700 hover:underline">
              View All ({offers.length})
            </Link>
          </div>

          <div className="space-y-3">
            {offers.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 text-sm">
                {t('farmer_offers_empty')}
              </Card>
            ) : (
              offers.slice(0, 3).map((off) => (
                <Card key={off.id} className="p-4 border border-slate-200 hover:shadow-soft transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{off.cropName}</span>
                        <Badge variant={off.status === 'PENDING' ? 'amber' : 'green'} size="sm">
                          {off.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Offer from: <strong>{off.buyerName}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-extrabold text-emerald-700 block">
                        {formatINR(off.offeredPrice)}/kg
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {off.quantity} kg
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {t('farmer_money_coming_label')}: {formatINR(off.offeredPrice * off.quantity)}
                      </span>
                    </div>
                  </div>

                  {off.status === 'PENDING' && (
                    <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAcceptOffer(off.id)}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        aria-label={`${t('farmer_offer_accept')} — ${off.cropName} offer from ${off.buyerName}`}
                      >
                        {t('farmer_offer_accept')}
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectOffer(off.id)}
                        leftIcon={<XCircle className="w-4 h-4" />}
                        aria-label={`${t('farmer_offer_decline')} — ${off.cropName} offer from ${off.buyerName}`}
                      >
                        {t('farmer_offer_decline')}
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
