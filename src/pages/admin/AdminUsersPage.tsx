import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  Truck,
  Building,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  History,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { getAllRegisteredUsers, setUserVerification } from '../../services/authService';
import { bulkUpdateUsers } from '../../services/adminService';
import { UserTable } from '../../components/admin/UserTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllRegisteredUsers();
      setUsers(data);
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to fetch registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleVerification = async (user: User) => {
    try {
      const newStatus = !user.verified;
      await setUserVerification(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, verified: newStatus } : u))
      );
      showToast(
        'success',
        'Verification Updated',
        `${user.name} is now ${newStatus ? 'Verified' : 'Unverified'}.`
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', 'Could not update verification status.');
    }
  };

  const handleBulkAction = async (
    uids: string[],
    action: 'APPROVE' | 'SUSPEND' | 'UNSUSPEND' | 'CHANGE_ROLE',
    payload?: { role?: UserRole; reason?: string }
  ) => {
    setLoading(true);
    try {
      const res = await bulkUpdateUsers(uids, action, payload);
      showToast(
        'success',
        'Bulk Action Complete',
        `Successfully applied ${action} to ${res.modifiedCount} users.`
      );
      await loadUsers();
    } catch (e: any) {
      showToast('error', 'Bulk Action Failed', e.message || 'Error processing bulk action.');
    } finally {
      setLoading(false);
    }
  };

  const countByRole = (role: UserRole) => users.filter((u) => u.role === role).length;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard" className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-700" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                User Management & Access Governance
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            Manage KYC verification, role privileges, and account suspensions across all {users.length} registered accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/reports">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            >
              Export CSV
            </Button>
          </Link>
          <Link to="/admin/audit-logs">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<History className="w-4 h-4 text-purple-600" />}
            >
              Audit Logs
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Role Counts Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
            <Tractor className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Farmers</span>
            <span className="text-lg font-extrabold font-mono text-emerald-950">{countByRole('FARMER')}</span>
          </div>
        </div>

        <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-600 text-white">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-teal-800 uppercase block">FPOs</span>
            <span className="text-lg font-extrabold font-mono text-teal-950">{countByRole('FPO')}</span>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Buyers</span>
            <span className="text-lg font-extrabold font-mono text-blue-950">{countByRole('BUYER')}</span>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600 text-white">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Logistics</span>
            <span className="text-lg font-extrabold font-mono text-amber-950">{countByRole('LOGISTICS')}</span>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-800 uppercase block">Admins</span>
            <span className="text-lg font-extrabold font-mono text-purple-950">{countByRole('ADMIN')}</span>
          </div>
        </div>
      </div>

      {/* Reusable User Table with Multi-Filter & Bulk Operations */}
      <UserTable
        users={users}
        onToggleVerification={handleToggleVerification}
        onBulkAction={handleBulkAction}
        loading={loading}
      />
    </div>
  );
};
