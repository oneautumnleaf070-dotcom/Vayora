import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Sprout, ShieldAlert, LogOut, Home } from 'lucide-react';
import { Button } from '../common/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  // 1. Loading State - Wait for Firebase Auth initialization
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-700/20 animate-pulse">
          <Sprout className="w-8 h-8 text-white animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-extrabold text-slate-900">
            Verifying VAYORA Session...
          </h3>
          <p className="text-xs text-slate-500">
            Checking authenticated credentials & permissions
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Unauthorized Role Access State
  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleHomepaths: Record<UserRole, string> = {
      FARMER: '/farmer/dashboard',
      FPO: '/fpo/dashboard',
      BUYER: '/buyer/marketplace',
      LOGISTICS: '/logistics/dashboard',
      ADMIN: '/admin/dashboard',
    };

    const targetHome = roleHomepaths[role] || '/';

    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-soft text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            This section requires <strong>{allowedRoles.join(' or ')}</strong> privileges. You are currently signed in as{' '}
            <strong className="text-brand-800">{role}</strong> ({user.name}).
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
          Role-based security active: Cross-role navigation is restricted to maintain data privacy and integrity.
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link to={targetHome} className="w-full">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Go to My {role} Dashboard
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign In with a Different Account
          </Button>
        </div>
      </div>
    );
  }

  // 4. Authenticated & Authorized
  return <>{children}</>;
};
