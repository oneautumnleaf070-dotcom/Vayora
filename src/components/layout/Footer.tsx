import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-900 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-900/40">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight">VAYORA</span>
                <p className="text-[11px] text-slate-400 font-medium">
                  Direct Farmer Market & AI Intelligence
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Connecting farmers and FPOs directly with verified commercial buyers through AI-assisted pricing, smart multi-supplier matching, and transparent logistics.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-brand-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct Agricultural Marketplace Platform</span>
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-3.5 md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Product</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/buyer/marketplace" className="hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/buyer/bulk-matching" className="hover:text-white transition-colors">
                  Bulk Matcher
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/logistics/dashboard" className="hover:text-white transition-colors">
                  Smart Logistics
                </Link>
              </li>
            </ul>
          </div>

          {/* For Stakeholders Col */}
          <div className="space-y-3.5 md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">For</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/farmer/dashboard" className="hover:text-white transition-colors">
                  Farmers & FPOs
                </Link>
              </li>
              <li>
                <Link to="/buyer/marketplace" className="hover:text-white transition-colors">
                  Buyers & Retailers
                </Link>
              </li>
              <li>
                <Link to="/logistics/dashboard" className="hover:text-white transition-colors">
                  Logistics Partners
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-white transition-colors">
                  System Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Col */}
          <div className="space-y-3.5 md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Company</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About VAYORA
                </Link>
              </li>
              <li>
                <a href="mailto:support@vayora.agri" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Join Platform
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VAYORA Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors">Terms of Trade</span>
            <span className="hover:text-slate-400 transition-colors">Producer Code</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
