import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  Truck,
  Building,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { getAllRegisteredUsers, setUserVerification } from '../../services/authService';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');

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
      showToast('success', 'Verification Updated', `${user.name} is now ${newStatus ? 'Verified' : 'Unverified'}.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', 'Could not update verification status.');
    }
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
    const matchesVerif =
      selectedVerification === 'ALL' ||
      (selectedVerification === 'VERIFIED' && u.verified) ||
      (selectedVerification === 'PENDING' && !u.verified);

    return matchesSearch && matchesRole && matchesVerif;
  });

  const countByRole = (role: UserRole) => users.filter((u) => u.role === role).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-700" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              User Management & Access Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time directory of registered Farmers, FPOs, Commercial Buyers, and Logistics Carriers.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadUsers}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Directory
        </Button>
      </div>

      {/* Role Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
          <span className="text-xl font-mono font-extrabold text-slate-900 mt-1 block">{users.length}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Farmers</span>
          <span className="text-xl font-mono font-extrabold text-emerald-800 mt-1 block">{countByRole('FARMER')}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">FPO Hubs</span>
          <span className="text-xl font-mono font-extrabold text-teal-800 mt-1 block">{countByRole('FPO')}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Buyers</span>
          <span className="text-xl font-mono font-extrabold text-blue-800 mt-1 block">{countByRole('BUYER')}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Carriers</span>
          <span className="text-xl font-mono font-extrabold text-amber-800 mt-1 block">{countByRole('LOGISTICS')}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, mobile, email, or hub..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            aria-label="Filter by platform role"
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="FARMER">Farmers</option>
            <option value="FPO">FPO Hubs</option>
            <option value="BUYER">Buyers</option>
            <option value="LOGISTICS">Logistics Partners</option>
            <option value="ADMIN">Admins</option>
          </select>

          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            aria-label="Filter by verification status"
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Verification</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Organization / Location</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading registered users...' : 'No users found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={u.name}
                          className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email || u.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          u.role === 'FARMER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'FPO'
                            ? 'bg-teal-100 text-teal-800'
                            : u.role === 'BUYER'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'LOGISTICS'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600">
                      <p className="font-semibold text-slate-900">{u.organizationName || 'Individual'}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {u.location}
                      </p>
                    </td>

                    <td className="p-4 font-mono text-slate-700">
                      {u.phone}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleVerification(u)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          u.verified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Click to toggle verification"
                      >
                        {u.verified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{u.verified ? 'Verified' : 'Pending'}</span>
                      </button>
                    </td>

                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {u.createdAt ? formatDateTime(u.createdAt) : 'Registered'}
                    </td>

                    <td className="p-4 text-right">
                      <Link to={`/admin/users/${u.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
