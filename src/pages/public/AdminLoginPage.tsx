import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { RolePortalLogin, RolePortalTheme } from '../../components/auth/RolePortalLogin';

const adminTheme: RolePortalTheme = {
  icon: <ShieldCheck className="w-7 h-7" />,
  gradient: 'bg-gradient-to-br from-purple-600 to-purple-900',
  buttonClass: 'bg-purple-700 hover:bg-purple-800 border-purple-800 focus:ring-purple-500',
  ring: 'focus:ring-purple-500/20 focus:border-purple-500',
  chipBg: 'bg-purple-50 border-purple-200',
  chipText: 'text-purple-900',
};

export const AdminLoginPage: React.FC = () => {
  return (
    <RolePortalLogin
      expectedRole="ADMIN"
      dashboardPath="/admin/dashboard"
      heading="VAYORA Control Center"
      subheading="Administrator Sign-in · Restricted Access"
      restrictedNote="Role-based security active: administrator access is granted only to promoted accounts, never self-assigned."
      theme={adminTheme}
      newAccountMessage={
        <>
          This phone number isn't linked to a VAYORA account yet. Administrator accounts
          can't be self-registered here — they're provisioned directly by whoever runs
          the platform (see <code className="text-purple-800 font-mono">server/scripts/seed.js</code>{' '}
          for the demo admin account, or insert a row with <code className="text-purple-800 font-mono">role='ADMIN'</code>{' '}
          in the database for a real deployment).
          If you're a farmer, buyer, or logistics partner, please register normally instead.
        </>
      }
    />
  );
};
