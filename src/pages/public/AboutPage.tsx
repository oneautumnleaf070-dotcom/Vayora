import React from 'react';
import { Sprout, ShieldCheck, Cpu, GitMerge, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-900 border border-brand-200 rounded-full text-xs font-bold">
          <Sprout className="w-3.5 h-3.5 text-brand-700" />
          Direct Farmer Market & AI Intelligence
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          About VAYORA
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          A farmer-centric direct agricultural marketplace connecting smallholder producers and FPOs directly with verified commercial buyers through AI-assisted pricing intelligence, smart multi-supplier aggregation, and transparent logistics.
        </p>
      </div>

      {/* Mission Card */}
      <Card className="p-8 bg-gradient-to-br from-slate-900 to-brand-950 text-white space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Sprout className="w-6 h-6" />
          <h2 className="text-xl font-extrabold">Our Mission: Direct Value for Indian Agriculture</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          In traditional agricultural supply chains, farmers often receive only a fraction of the final consumer value due to multiple fragmented intermediary layers. VAYORA empowers producers with direct marketplace access, reference market intelligence, and end-to-end fulfillment verification.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-2">
            <h4 className="text-sm font-bold text-red-300">Traditional Multi-Tier Mandi</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Farmer ➔ Village Agent ➔ Primary Wholesaler ➔ Secondary Distributor ➔ Local Merchant ➔ End Buyer.
            </p>
            <p className="text-xs font-bold text-red-400">Result: Multiple intermediary fees, delayed payouts, limited price transparency.</p>
          </div>

          <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 space-y-2">
            <h4 className="text-sm font-bold text-emerald-300">VAYORA Direct Trade</h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              Farmer / FPO ➔ AI Price Intelligence ➔ Verified Commercial Buyer ➔ Optimized Freight ➔ Verified Handover.
            </p>
            <p className="text-xs font-bold text-emerald-300">Result: Direct producer proceeds, transparent pricing, verified delivery.</p>
          </div>
        </div>
      </Card>

      {/* Platform Architecture */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">Platform Core Capabilities</h3>
          <p className="text-xs text-slate-500">Built on modern cloud architecture and geospatial intelligence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block">AI Market Intelligence</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI-assisted indicative price benchmarks and 7-day demand forecasts to assist producers in setting fair listing prices.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">Smart Bulk Matching</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated multi-supplier aggregation algorithm that combines lots from adjacent farmers and FPOs to fulfill enterprise-scale bulk orders.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Verified Delivery</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-stop pickup route optimization with cryptographic QR and OTP handover verification at farm gates and buyer unloading bays.
            </p>
          </div>
        </div>
      </div>

      {/* Direct Call to Action */}
      <div className="text-center space-y-4 pt-6">
        <Link to="/buyer/marketplace">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Explore Produce Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
};
