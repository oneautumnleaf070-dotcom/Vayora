import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const DashboardLayout: React.FC = () => {
  // Keying by pathname remounts this wrapper on every navigation, replaying
  // the fade-up entrance (see .animate-route-in in src/index.css) so moving
  // between dashboard screens feels continuous instead of an abrupt cut.
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <ErrorBoundary>
            <div key={location.pathname} className="animate-route-in">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
