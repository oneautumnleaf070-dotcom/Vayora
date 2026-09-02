import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Tag,
  Package,
  TrendingUp,
  Store,
  Layers,
  Truck,
  QrCode,
  ShieldCheck,
  Users,
  BarChart3,
  FileText,
  MapPin,
  Sprout,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

export const Sidebar: React.FC = () => {
  const { role, user } = useAuth();
  const location = useLocation();

  const getLinks = () => {
    switch (role) {
      case 'FARMER':
        return [
          { label: 'Farm Dashboard', path: '/farmer/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Manage Produce', path: '/farmer/produce', icon: <Sprout className="w-4 h-4" /> },
          { label: '+ List New Harvest', path: '/farmer/produce/new', icon: <PlusCircle className="w-4 h-4" />, highlight: true },
          { label: 'Buyer Offers', path: '/farmer/offers', icon: <Tag className="w-4 h-4" /> },
          { label: 'Confirmed Orders', path: '/farmer/orders', icon: <Package className="w-4 h-4" /> },
          { label: 'Earnings & Escrow', path: '/farmer/earnings', icon: <Wallet className="w-4 h-4" /> },
          { label: 'AI Market Intelligence', path: '/farmer/intelligence', icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case 'FPO':
        return [
          { label: 'FPO Collective Hub', path: '/fpo/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Member Inventory', path: '/farmer/produce', icon: <Sprout className="w-4 h-4" /> },
          { label: '+ Bulk Harvest Listing', path: '/farmer/produce/new', icon: <PlusCircle className="w-4 h-4" />, highlight: true },
          { label: 'Member Buyer Offers', path: '/farmer/offers', icon: <Tag className="w-4 h-4" /> },
          { label: 'Collective Orders', path: '/farmer/orders', icon: <Package className="w-4 h-4" /> },
          { label: 'Collective Financials', path: '/farmer/earnings', icon: <Wallet className="w-4 h-4" /> },
          { label: 'Aggregated Logistics', path: '/logistics/dashboard', icon: <Truck className="w-4 h-4" /> },
        ];
      case 'BUYER':
        return [
          { label: 'Produce Marketplace', path: '/buyer/marketplace', icon: <Store className="w-4 h-4" /> },
          { label: 'Smart Bulk Matcher', path: '/buyer/bulk-matching', icon: <Layers className="w-4 h-4" />, highlight: true },
          { label: 'My Placed Orders', path: '/buyer/orders', icon: <Package className="w-4 h-4" /> },
        ];
      case 'LOGISTICS':
        return [
          { label: 'Active Deliveries', path: '/logistics/dashboard', icon: <Truck className="w-4 h-4" /> },
          { label: 'QR / OTP Verification', path: '/logistics/verify', icon: <QrCode className="w-4 h-4" />, highlight: true },
        ];
      case 'ADMIN':
        return [
          { label: 'Overview & Metrics', path: '/admin/dashboard', icon: <BarChart3 className="w-4 h-4" /> },
          { label: 'User Directory', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
          { label: 'Live Marketplace', path: '/buyer/marketplace', icon: <Store className="w-4 h-4" /> },
          { label: 'Bulk Matcher Engine', path: '/buyer/bulk-matching', icon: <Layers className="w-4 h-4" /> },
          { label: 'Logistics Fleet', path: '/logistics/dashboard', icon: <Truck className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  const sectionLabel: Record<string, string> = {
    FARMER: 'Producer Navigation',
    FPO: 'Producer Navigation',
    BUYER: 'Buyer Tools',
    LOGISTICS: 'Fleet Operations',
    ADMIN: 'Administration',
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 p-4 hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate">{user?.name}</h4>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                {user?.location || 'Maharashtra, IN'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            {sectionLabel[role] || 'Navigation'}
          </p>
          {links.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                  isActive
                    ? 'bg-brand-700 text-white shadow-sm shadow-brand-700/20'
                    : item.highlight
                    ? 'bg-emerald-50 text-brand-900 hover:bg-emerald-100 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span className={cn(isActive ? 'text-white' : item.highlight ? 'text-brand-700' : 'text-slate-400')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-3.5 bg-gradient-to-br from-brand-900 to-slate-900 text-white rounded-2xl text-xs">
        <div className="flex items-center gap-2 text-brand-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>VAYORA Smart Escrow</span>
        </div>
        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
          100% fair price guarantee. Funds release automatically upon QR/OTP verified handover.
        </p>
      </div>
    </aside>
  );
};
