import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LocaleProvider } from './context/LocaleContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { CompleteProfilePage } from './pages/public/CompleteProfilePage';
import { AdminLoginPage } from './pages/public/AdminLoginPage';
import { LogisticsLoginPage } from './pages/public/LogisticsLoginPage';

// Farmer / FPO Pages
import { FarmerDashboard } from './pages/farmer/FarmerDashboard';
import { ProduceListingWizard } from './pages/farmer/ProduceListingWizard';
import { ProduceManagementPage } from './pages/farmer/ProduceManagementPage';
import { OffersPage } from './pages/farmer/OffersPage';
import { FarmerOrders } from './pages/farmer/FarmerOrders';
import { FarmerEarningsPage } from './pages/farmer/FarmerEarningsPage';
import { AIIntelligencePage } from './pages/farmer/AIIntelligencePage';

// Buyer Pages
import { BuyerMarketplace } from './pages/buyer/BuyerMarketplace';
import { ProduceDetailPage } from './pages/buyer/ProduceDetailPage';
import { BulkMatchingPage } from './pages/buyer/BulkMatchingPage';
import { CheckoutPage } from './pages/buyer/CheckoutPage';
import { BuyerOrders } from './pages/buyer/BuyerOrders';

// Logistics Pages
import { LogisticsDashboard } from './pages/logistics/LogisticsDashboard';
import { DeliveryVerificationPage } from './pages/logistics/DeliveryVerificationPage';

// Tracking Page
import { LiveOrderTrackingPage } from './pages/tracking/LiveOrderTrackingPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';

// Smart Dashboard Role Redirector
const DashboardRedirect: React.FC = () => {
  const { user, role, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading Workspace...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  switch (role) {
    case 'FARMER':
      return <Navigate to="/farmer/dashboard" replace />;
    case 'FPO':
      return <Navigate to="/fpo/dashboard" replace />;
    case 'BUYER':
      return <Navigate to="/buyer/marketplace" replace />;
    case 'LOGISTICS':
      return <Navigate to="/logistics/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/farmer/dashboard" replace />;
  }
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <LocaleProvider>
        <AuthProvider>
          <Routes>
            {/* Public Layout Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/logistics/login" element={<LogisticsLoginPage />} />
              <Route path="/orders/:id/tracking" element={<LiveOrderTrackingPage />} />
            </Route>

            {/* Dashboard Protected Routes */}
            <Route element={<DashboardLayout />}>
              {/* Universal /dashboard Redirect Route */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/farmer" element={<Navigate to="/farmer/dashboard" replace />} />
              <Route path="/fpo" element={<Navigate to="/fpo/dashboard" replace />} />
              <Route path="/buyer" element={<Navigate to="/buyer/marketplace" replace />} />
              <Route path="/buyer/dashboard" element={<Navigate to="/buyer/marketplace" replace />} />
              <Route path="/logistics" element={<Navigate to="/logistics/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Farmer & FPO Routes */}
              <Route
                path="/farmer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fpo/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/produce"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <ProduceManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/produce/new"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <ProduceListingWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/offers"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <OffersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/orders"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <FarmerOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/earnings"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <FarmerEarningsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/intelligence"
                element={
                  <ProtectedRoute allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
                    <AIIntelligencePage />
                  </ProtectedRoute>
                }
              />

              {/* Buyer Routes */}
              <Route
                path="/buyer/marketplace"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN', 'FARMER', 'FPO']}>
                    <BuyerMarketplace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/produce/:id"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN', 'FARMER', 'FPO']}>
                    <ProduceDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/bulk-matching"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN', 'FPO', 'FARMER']}>
                    <BulkMatchingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/checkout"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/orders"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
                    <BuyerOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['BUYER', 'ADMIN', 'FARMER', 'FPO', 'LOGISTICS']}>
                    <LiveOrderTrackingPage />
                  </ProtectedRoute>
                }
              />

              {/* Logistics Routes */}
              <Route
                path="/logistics/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICS', 'ADMIN', 'FPO']}>
                    <LogisticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/verify"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICS', 'ADMIN']}>
                    <DeliveryVerificationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/delivery/:id/verify"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICS', 'ADMIN']}>
                    <DeliveryVerificationPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:uid"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUserDetailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        </LocaleProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
