import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const PublicLayout: React.FC = () => {
  // Keying by pathname remounts this wrapper on every navigation, replaying
  // the fade-up entrance (see .animate-route-in in src/index.css) so page
  // switches feel like one continuous motion instead of an abrupt cut.
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <div key={location.pathname} className="animate-route-in">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};
