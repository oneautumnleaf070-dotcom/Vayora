import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Truck,
  QrCode,
  Layers,
  Sparkles,
  CheckCircle2,
  Users,
  Building2,
  Lock,
  ChevronRight,
  MapPin,
  Check,
  Scale,
  RefreshCw,
  Clock,
  CircleDollarSign,
  Store,
  Navigation,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AgriMap } from '../../components/map/AgriMap';
import { DemandChart } from '../../components/ai/DemandChart';
import { formatINR, formatNumber } from '../../utils/helpers';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'farmer' | 'buyer'>('farmer');

  const handleStartSelling = () => {
    if (user?.role === 'FARMER' || user?.role === 'FPO') {
      navigate('/farmer/produce/new');
    } else {
      navigate('/register');
    }
  };

  const handleStartBuying = () => {
    navigate('/buyer/marketplace');
  };

  // Demo forecast data for the 7-day demand chart
  const sampleForecastData = [
    { day: 'Day 1', expectedDemand: 82, projectedPrice: 32 },
    { day: 'Day 2', expectedDemand: 86, projectedPrice: 33 },
    { day: 'Day 3', expectedDemand: 91, projectedPrice: 34 },
    { day: 'Day 4', expectedDemand: 88, projectedPrice: 33.5 },
    { day: 'Day 5', expectedDemand: 94, projectedPrice: 34 },
    { day: 'Day 6', expectedDemand: 89, projectedPrice: 33 },
    { day: 'Day 7', expectedDemand: 95, projectedPrice: 34.5 },
  ];

  // Bulk matching sample suppliers
  const bulkSuppliers = [
    { name: 'FPO Sahyadri Collective', qty: 500, price: 32, location: 'Dindori, Nashik', pct: 50, color: 'bg-emerald-600' },
    { name: 'Farmer Ramesh Patil', qty: 300, price: 33, location: 'Pimpalgaon, Nashik', pct: 30, color: 'bg-teal-600' },
    { name: 'Green Valley FPO', qty: 200, price: 31, location: 'Sinnar, Nashik', pct: 20, color: 'bg-brand-600' },
  ];

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 text-slate-900 bg-white selection:bg-brand-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-6 sm:pt-12 lg:pt-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              {/* Production Platform Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                <span>Direct Agricultural Marketplace & AI Intelligence</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-extrabold text-slate-950 tracking-tight leading-[1.08]">
                Sell Direct.<br />
                <span className="text-brand-700">Earn More.</span><br />
                Buy Fresh.
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
                VAYORA connects farmers and FPOs directly with verified buyers through AI-assisted pricing, smart multi-supplier matching, and transparent logistics.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartSelling}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-bold shadow-md shadow-brand-700/20"
                >
                  Start Selling as Farmer / FPO →
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleStartBuying}
                  className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold"
                >
                  Procure as Bulk Buyer
                </Button>
              </div>

              {/* Three Restrained Trust Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-brand-50 rounded-lg text-brand-700 mt-0.5">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Direct farmer/FPO</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Zero intermediary layers</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-brand-50 rounded-lg text-brand-700 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">AI-assisted market</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Indicative pricing & trends</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-brand-50 rounded-lg text-brand-700 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">QR/OTP verified</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Secure delivery handover</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual: Field Image with Floating AI Market Intelligence Card */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-100">
                {/* Authentic Indian Farmland Image */}
                <div className="relative h-[440px] sm:h-[500px] w-full">
                  <img
                    src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80"
                    alt="Indian agricultural farmland with healthy crops"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent"></div>
                </div>

                {/* Floating AI Market Intelligence Card */}
                <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/80 shadow-xl space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-brand-100 rounded-lg text-brand-800">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                          AI Assisted Indicative Price
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Tomato • Grade A • <span className="text-slate-700">Nashik, Maharashtra</span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                      Demand: HIGH
                    </span>
                  </div>

                  {/* Pricing Comparison */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Traditional Mandi Price
                      </span>
                      <span className="text-lg font-extrabold font-mono text-slate-700 mt-0.5 block">
                        ₹24.00 / kg
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        VAYORA Indicative Price
                      </span>
                      <span className="text-lg font-extrabold font-mono text-emerald-800 mt-0.5 block">
                        ₹32 – ₹34 / kg
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Demand Sparkline */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                      <span>7-Day Demand Trend:</span>
                      <span className="text-brand-800 font-bold">+15.8% Projected Urban Pull</span>
                    </div>
                    <div className="h-10 w-full flex items-end gap-1.5 px-1 py-1 bg-slate-50 rounded-lg border border-slate-200/60">
                      {[65, 70, 78, 85, 82, 92, 98].map((val, idx) => (
                        <div key={idx} className="flex-1 bg-brand-600/30 rounded-t hover:bg-brand-600 transition-colors relative group" style={{ height: `${val}%` }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {val}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Capability Tags */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-700 font-medium">
                    <div className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>AI Forecasting</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Smart Matching</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Verified Buyers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Transparent Trade</span>
                    </div>
                  </div>

                  {/* Card Footer Tagline */}
                  <div className="pt-2 border-t border-slate-200/60 text-center">
                    <p className="text-[11px] font-semibold text-slate-600">
                      VAYORA is powering the future of Indian agriculture.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. WHY VAYORA? — SIX CLEAN FEATURE BLOCKS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Built For Indian Agri-Trade
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            WHY VAYORA?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Eliminating unnecessary intermediaries to deliver better realization for farmers and consistent quality for buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <Sprout className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Direct Trade</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect directly with farmers & FPOs without multiple commission agents, village aggregators, or broker cuts.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">AI Powered</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI-assisted pricing & demand forecasting benchmarks help producers evaluate fair market bounds with confidence.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Smart Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-supplier matching aggregates lots from nearby farmers to satisfy large commercial bulk orders effortlessly.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Smart Logistics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Optimized routes & delivery tracking coordinate multi-farm gate pickups and transparent transit milestones.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Trusted Delivery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              QR/OTP verified handover ensures physical quality inspection before the carrier can mark a shipment completed.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Transparent Settlement</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clear pricing and settlement tracking provide transparent audit records for both producers and commercial buyers.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW VAYORA WORKS — SIX-STEP CONNECTED WORKFLOW */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="bg-slate-50/80 py-16 sm:py-24 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
              Connected Direct Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How VAYORA Works
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              A transparent 6-stage lifecycle connecting farm harvest directly to destination unloading bays.
            </p>
          </div>

          {/* 6-Step Workflow Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative">
            {[
              {
                step: '01',
                title: 'List Produce',
                desc: 'Farmer lists crop, quantity, and grade with AI assistance.',
                icon: <Sprout className="w-4 h-4" />,
              },
              {
                step: '02',
                title: 'AI Price + Demand',
                desc: 'Indicative pricing bounds & demand forecast generated.',
                icon: <Sparkles className="w-4 h-4" />,
              },
              {
                step: '03',
                title: 'Verified Buyer',
                desc: 'Verified buyers discover produce or post bulk orders.',
                icon: <Store className="w-4 h-4" />,
              },
              {
                step: '04',
                title: 'Smart Matching',
                desc: 'Multi-supplier algorithm combines nearby producers.',
                icon: <Layers className="w-4 h-4" />,
              },
              {
                step: '05',
                title: 'Logistics & Delivery',
                desc: 'Optimized highway route and multi-stop farm pickup.',
                icon: <Truck className="w-4 h-4" />,
              },
              {
                step: '06',
                title: 'QR/OTP Verification',
                desc: 'Tamper-proof digital handover releases settlement.',
                icon: <ShieldCheck className="w-4 h-4" />,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 relative group hover:border-brand-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono font-extrabold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. AI MARKET INTELLIGENCE SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Description */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transparent Price Guidance</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              AI Market Intelligence & Indicative Pricing
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              VAYORA analyzes real-time APMC arrivals, localized historical mandi spreads, crop grades, and urban demand indices to provide farmers and buyers with fair price benchmarks.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="p-1 bg-brand-100 rounded text-brand-800 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block">7-Day Demand Forecasting</strong>
                  <span className="text-slate-500">Helps farmers schedule harvest timings during high-demand windows.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="p-1 bg-brand-100 rounded text-brand-800 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block">Quality Grade Normalization</strong>
                  <span className="text-slate-500">Separates Grade A premium produce from standard bulk lots.</span>
                </div>
              </div>
            </div>

            {/* Clear Disclaimer (Requirement) */}
            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
              <span className="font-bold block flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Important Price Disclaimer:
              </span>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                AI-assisted indicative price. Not a guaranteed market price. VAYORA empowers farmers with reference intelligence, while producers retain 100% autonomy over their final listing price.
              </p>
            </div>
          </div>

          {/* Right AI Card & Chart */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Tomato (Nashik Hybrid)</h3>
                  <p className="text-xs text-slate-500">Quality: <strong className="text-slate-700">Grade A</strong> • 300 kg Harvest Lot</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-semibold block">AI Indicative Price:</span>
                  <span className="text-xl font-mono font-extrabold text-emerald-800">₹32 – ₹34 / kg</span>
                </div>
              </div>

              {/* 7-Day Chart */}
              <div className="pt-2">
                <DemandChart data={sampleForecastData} cropName="Tomatoes (Grade A)" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SMART BULK MATCHING SECTION */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-slate-50/60 via-emerald-50/30 to-slate-50/60 py-16 sm:py-24 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              High-Capacity Procurement Innovation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              One Order. Multiple Suppliers. One Smart Match.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              When commercial buyers need bulk volume, VAYORA’s multi-supplier engine automatically aggregates verified harvests from nearby farmers and FPOs into a single coordinated shipment.
            </p>
          </div>

          {/* Visual Scenario Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
            {/* Buyer Requirement */}
            <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Buyer Requirement</span>
                  <h4 className="text-base font-bold text-slate-900">1,000 kg Tomato • Grade A</h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                  100% FULLY MATCHED (1,000 / 1,000 kg)
                </span>
              </div>
            </div>

            {/* Split Supplier Allocation */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Automated Multi-Supplier Allocation:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bulkSuppliers.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 hover:border-brand-400 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{s.name}</span>
                      <span className="text-xs font-mono font-extrabold text-brand-800">{s.qty} kg</span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {s.location}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-500">Agreed Price:</span>
                      <span className="font-bold text-slate-900">₹{s.price}/kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Allocation Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Consolidated Harvest Fulfillment:</span>
                <span className="text-emerald-800 font-bold">1,000 kg (100%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-600 h-full" style={{ width: '50%' }} title="FPO Sahyadri (500kg)"></div>
                <div className="bg-teal-600 h-full" style={{ width: '30%' }} title="Farmer Ramesh (300kg)"></div>
                <div className="bg-brand-600 h-full" style={{ width: '20%' }} title="Green Valley FPO (200kg)"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>FPO Sahyadri (500 kg)</span>
                <span>Farmer Ramesh (300 kg)</span>
                <span>Green Valley FPO (200 kg)</span>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-600">
                Total Produce Proceeds: <strong className="text-slate-900 font-mono">₹32,100</strong> (100% directly realized by producers).
              </p>
              <Link to="/buyer/bulk-matching">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Try Smart Bulk Matcher
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. LOGISTICS SECTION — "FROM FARM GATE TO BUYER" */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Smart Agri-Corridor Routing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Farm Gate to Buyer
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Consolidating multiple farm pickups into optimized transit routes using OpenStreetMap and OpenRouteService telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Map Component Container */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden p-2">
              <AgriMap
                pickupLat={20.0059}
                pickupLng={73.79}
                pickupLabel="Farm Gate 1: Sahyadri FPO (Nashik)"
                deliveryLat={19.076}
                deliveryLng={72.8777}
                deliveryLabel="Buyer Unloading Bay (Mumbai Fresh Terminal)"
                currentLat={19.6}
                currentLng={73.35}
                waypoints={[
                  { lat: 20.0059, lng: 73.79, label: 'Pickup 1: Sahyadri FPO (500 kg)', order: 1, completed: true },
                  { lat: 20.15, lng: 73.9, label: 'Pickup 2: Farmer Ramesh (300 kg)', order: 2, completed: true },
                  { lat: 19.85, lng: 73.95, label: 'Pickup 3: Green Valley FPO (200 kg)', order: 3, completed: true },
                ]}
                status="IN_TRANSIT"
                distanceKm={273.7}
                durationMins={410}
              />
            </div>

            {/* Logistics Highlights */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Navigation className="w-4 h-4 text-brand-700" />
                  <h4>Multi-Stop Pickup Optimization</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sequences collection waypoints to minimize deadhead kilometers and reduce transit spoilage.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <h4>Verified Carrier Fleet</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Assigned only to verified rural transport partners with appropriate vehicle payload capacity.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h4>Live Telemetry Milestones</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Strict state machine progresses from ASSIGNED → PICKED_UP → IN_TRANSIT → ARRIVED.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. TRUSTED DELIVERY SECTION — QR & OTP VERIFICATION */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Cryptographic Handover Integrity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Trusted Delivery & Verified Settlement
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Carriers cannot simply click "Mark Delivered". Orders require physical dual verification before settlement is unlocked.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto font-bold">
                1
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">ARRIVED</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Carrier vehicle positions at the buyer's destination unloading bay.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto font-bold">
                2
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">QR OR OTP VERIFICATION</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buyer presents tamper-proof QR code pass or 6-digit confirmation OTP.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-bold">
                3
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">DELIVERED</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Backend validates cryptographic signature and locks against replays.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto font-bold">
                4
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">SETTLEMENT READY</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escrow is unblocked and direct payout records are finalized for producers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. VALUE PILLARS FOR FARMERS & BUYERS */}
      {/* ========================================================================= */}
      <section id="for-farmers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Tailored For Ecosystem Stakeholders
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Producers and Commercial Buyers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="for-buyers">
          {/* Farmers & FPOs */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">For Farmers & FPO Collectives</h3>
                <p className="text-xs text-slate-500">Fair Realization & Direct Digital Independence</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Receive AI-assisted price bounds to avoid selling at depressed village distress rates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Direct visibility to verified commercial buyers across major urban consumption hubs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero commission cuts — 100% of agreed produce price realized directly.</span>
              </li>
            </ul>

            <Button
              variant="primary"
              size="md"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleStartSelling}
            >
              Start Listing Produce as Farmer →
            </Button>
          </div>

          {/* Commercial Buyers */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">For Bulk Buyers & Retailers</h3>
                <p className="text-xs text-slate-500">Direct Farm Freshness & Reliable Aggregation</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Source directly from verified farm gates with full traceability and batch quality grading.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Automated multi-supplier smart matching for 1,000+ kg bulk commercial procurement.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Escrow security with physical QR/OTP handover verification before payment release.</span>
              </li>
            </ul>

            <Button
              variant="outline"
              size="md"
              className="w-full border-blue-300 text-blue-900 hover:bg-blue-50"
              onClick={handleStartBuying}
            >
              Explore Verified Marketplace →
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-950 text-white rounded-3xl p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-xl border border-brand-900">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Build a fairer agricultural supply chain.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect directly. Trade transparently. Move produce smarter.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartSelling}
              className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold"
            >
              Start Selling
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleStartBuying}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Buy Direct
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
