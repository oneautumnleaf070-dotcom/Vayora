import React from 'react';
import { Truck } from 'lucide-react';
import { RolePortalLogin, RolePortalTheme } from '../../components/auth/RolePortalLogin';

const logisticsTheme: RolePortalTheme = {
  icon: <Truck className="w-7 h-7" />,
  gradient: 'bg-gradient-to-br from-amber-500 to-amber-700',
  buttonClass: 'bg-amber-600 hover:bg-amber-700 border-amber-700 focus:ring-amber-400',
  ring: 'focus:ring-amber-500/20 focus:border-amber-500',
  chipBg: 'bg-amber-50 border-amber-200',
  chipText: 'text-amber-900',
};

export const LogisticsLoginPage: React.FC = () => {
  return (
    <RolePortalLogin
      expectedRole="LOGISTICS"
      dashboardPath="/logistics/dashboard"
      heading="VAYORA Fleet Portal"
      subheading="Logistics Partner Sign-in"
      restrictedNote="Role-based security active: cross-role navigation is restricted to keep delivery data private."
      theme={logisticsTheme}
      newAccountMessage={
        <>
          This phone number isn't linked to a VAYORA account yet. Verify again and you'll
          be guided to set up your fleet profile — vehicle type, capacity, and depot location.
        </>
      }
    />
  );
};
