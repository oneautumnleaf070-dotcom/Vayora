import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  Bell,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  CheckCircle,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../../services/notificationService';
import { Notification } from '../../types';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getNotificationsByUser(user.id).then(setNotifs).catch(() => setNotifs([]));
    }
    const handleUpdate = () => {
      if (user) getNotificationsByUser(user.id).then(setNotifs).catch(() => setNotifs([]));
    };
    window.addEventListener('vayora_notifs_updated', handleUpdate);
    return () => window.removeEventListener('vayora_notifs_updated', handleUpdate);
  }, [user]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    setShowNotifMenu(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const roleNavLinks: Record<string, { label: string; path: string; highlight?: boolean }[]> = {
    FARMER: [
      { label: 'Dashboard', path: '/farmer/dashboard' },
      { label: '+ List Produce', path: '/farmer/produce/new', highlight: true },
      { label: 'Buyer Offers', path: '/farmer/offers' },
      { label: 'Orders', path: '/farmer/orders' },
      { label: 'AI Intelligence', path: '/farmer/intelligence' },
    ],
    FPO: [
      { label: 'FPO Hub', path: '/fpo/dashboard' },
      { label: '+ Bulk Listing', path: '/farmer/produce/new', highlight: true },
      { label: 'Member Produce', path: '/farmer/offers' },
      { label: 'Bulk Orders', path: '/farmer/orders' },
    ],
    BUYER: [
      { label: 'Marketplace', path: '/buyer/marketplace' },
      { label: 'Bulk Matcher', path: '/buyer/bulk-matching', highlight: true },
      { label: 'My Orders', path: '/buyer/orders' },
    ],
    LOGISTICS: [
      { label: 'Dispatches', path: '/logistics/dashboard' },
      { label: 'QR/OTP Verification', path: '/logistics/verify', highlight: true },
    ],
    ADMIN: [
      { label: 'Admin Center', path: '/admin/dashboard' },
      { label: 'User Management', path: '/admin/users', highlight: true },
      { label: 'Marketplace', path: '/buyer/marketplace' },
    ],
  };

  const publicNavLinks: { label: string; path: string; highlight?: boolean }[] = [
    { label: 'Marketplace', path: '/buyer/marketplace' },
    { label: 'How It Works', path: '/#how-it-works' },
    { label: 'For Farmers', path: '/#for-farmers' },
    { label: 'For Buyers', path: '/#for-buyers' },
    { label: 'About', path: '/about' },
  ];

  const navLinks = user ? roleNavLinks[role] || [] : publicNavLinks;

  const roleBadges = {
    FARMER: { label: 'Farmer', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <Tractor className="w-3 h-3" /> },
    FPO: { label: 'FPO Collective', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: <Sprout className="w-3 h-3" /> },
    BUYER: { label: 'Verified Buyer', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <ShoppingBag className="w-3 h-3" /> },
    LOGISTICS: { label: 'Logistics Partner', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Truck className="w-3 h-3" /> },
    ADMIN: { label: 'System Admin', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <ShieldCheck className="w-3 h-3" /> },
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-brand-900 block leading-tight">VAYORA</span>
              <p className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
                Direct Farmer Market & AI Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    link.highlight
                      ? 'bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200 shadow-2xs'
                      : isActive
                      ? 'bg-slate-100 text-brand-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Role Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${roleBadges[role].color}`}>
                  {roleBadges[role].icon}
                  <span>{roleBadges[role].label}</span>
                </span>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifMenu(!showNotifMenu);
                    setShowUserMenu(false);
                  }}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                        <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full font-semibold">
                          {unreadCount} unread
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead(user.id)}
                          className="text-xs text-brand-700 hover:text-brand-900 font-semibold"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifs.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500">No notifications</p>
                      ) : (
                        notifs.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !n.read ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs font-bold text-slate-900">{n.title}</h5>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-1"></span>}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifMenu(false);
                  }}
                  aria-label="Account menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={user.name}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-brand-500/30"
                  />
                  <span className="text-xs font-bold text-slate-800 hidden md:block max-w-[120px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-elevated border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.organizationName || user.location}</p>
                      <p className="text-[11px] text-brand-700 font-semibold mt-1">{user.phone}</p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <Link
                        to={roleNavLinks[role]?.[0]?.path || '/farmer/dashboard'}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        <UserIcon className="w-4 h-4 text-slate-500" />
                        My {role} Dashboard
                      </Link>

                      {role === 'ADMIN' && (
                        <Link
                          to="/admin/users"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-50 rounded-xl"
                        >
                          <Users className="w-4 h-4 text-purple-600" />
                          User Management
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* Unobtrusive secondary portals — small, muted, desktop-only */}
              <div className="hidden lg:flex items-center gap-2.5 pr-2.5 mr-1 border-r border-slate-200">
                <Link
                  to="/admin/login"
                  className="text-[11px] font-semibold text-slate-400 hover:text-purple-700 transition-colors"
                >
                  Admin
                </Link>
                <Link
                  to="/logistics/login"
                  className="text-[11px] font-semibold text-slate-400 hover:text-amber-700 transition-colors"
                >
                  Fleet Partner
                </Link>
              </div>

              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow-xs transition-all"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 xl:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-center text-sm font-bold text-slate-700 border border-slate-200 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-center text-sm font-bold bg-brand-700 text-white rounded-xl"
              >
                Get Started
              </Link>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  to="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-purple-700"
                >
                  Admin Portal
                </Link>
                <Link
                  to="/logistics/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-amber-700"
                >
                  Fleet Partner Login
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
