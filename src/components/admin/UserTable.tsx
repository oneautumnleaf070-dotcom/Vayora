import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatDateTime } from '../../utils/helpers';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Phone,
  Mail,
  Building,
  UserCheck,
  UserX,
  RefreshCw,
  Tractor,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';

export interface UserTableProps {
  users: User[];
  onToggleVerification?: (user: User) => void;
  onBulkAction?: (
    uids: string[],
    action: 'APPROVE' | 'SUSPEND' | 'UNSUSPEND' | 'CHANGE_ROLE',
    payload?: { role?: UserRole; reason?: string }
  ) => void;
  loading?: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onToggleVerification,
  onBulkAction,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [bulkRoleSelection, setBulkRoleSelection] = useState<UserRole>('FARMER');

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organizationName?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'VERIFIED') matchesStatus = !!u.verified;
      if (statusFilter === 'UNVERIFIED') matchesStatus = !u.verified;
      if (statusFilter === 'SUSPENDED') matchesStatus = (u as any).status === 'SUSPENDED';
      if (statusFilter === 'ACTIVE') matchesStatus = (u as any).status !== 'SUSPENDED';

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Checkbox handlers
  const isAllSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((u) => selectedUids.includes(u.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const paginatedIds = paginatedUsers.map((u) => u.id);
      setSelectedUids((prev) => prev.filter((id) => !paginatedIds.includes(id)));
    } else {
      const newIds = paginatedUsers.map((u) => u.id);
      setSelectedUids((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleToggleRow = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleBulkActionTrigger = (action: 'APPROVE' | 'SUSPEND' | 'UNSUSPEND' | 'CHANGE_ROLE', payload?: any) => {
    if (selectedUids.length === 0 || !onBulkAction) return;
    onBulkAction(selectedUids, action, payload);
    setSelectedUids([]);
    setShowRoleModal(false);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'FARMER':
        return <Tractor className="w-3.5 h-3.5 text-emerald-600" />;
      case 'FPO':
        return <Building className="w-3.5 h-3.5 text-teal-600" />;
      case 'BUYER':
        return <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />;
      case 'LOGISTICS':
        return <Truck className="w-3.5 h-3.5 text-amber-600" />;
      case 'ADMIN':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, email, mandi..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-200 outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="FARMER">Farmers</option>
            <option value="FPO">FPOs</option>
            <option value="BUYER">Commercial Buyers</option>
            <option value="LOGISTICS">Logistics Carriers</option>
            <option value="ADMIN">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="UNVERIFIED">KYC Pending</option>
            <option value="ACTIVE">Active Users</option>
            <option value="SUSPENDED">Suspended Users</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
            <span className="px-2">Per Page:</span>
            {[10, 25, 50].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-xl cursor-pointer ${
                  pageSize === size ? 'bg-white text-purple-900 shadow-2xs font-extrabold' : ''
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (When >= 1 item selected) */}
      {selectedUids.length > 0 && (
        <div className="bg-purple-950 text-white p-3.5 rounded-2xl shadow-lg border border-purple-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-purple-800 text-purple-200 rounded-full font-mono font-bold text-xs">
              {selectedUids.length} selected
            </span>
            <span className="text-xs text-purple-200 font-medium">Bulk Governance Operations:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkActionTrigger('APPROVE')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Approve KYC</span>
            </button>

            <button
              onClick={() => setShowRoleModal(true)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Change Role</span>
            </button>

            <button
              onClick={() => handleBulkActionTrigger('SUSPEND', { reason: 'Administrative suspension via bulk governance' })}
              className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>

            <button
              onClick={() => setSelectedUids([])}
              className="px-2.5 py-1.5 text-purple-300 hover:text-white font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base">
              Change Role for {selectedUids.length} Users
            </h3>
            <p className="text-xs text-slate-500">
              Select the new account privilege role to assign to the selected users:
            </p>
            <select
              value={bulkRoleSelection}
              onChange={(e) => setBulkRoleSelection(e.target.value as UserRole)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none"
            >
              <option value="FARMER">FARMER (Direct Producer)</option>
              <option value="FPO">FPO (Producer Collective)</option>
              <option value="BUYER">BUYER (Commercial Enterprise)</option>
              <option value="LOGISTICS">LOGISTICS (Fleet Partner)</option>
            </select>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
                onClick={() => handleBulkActionTrigger('CHANGE_ROLE', { role: bulkRoleSelection })}
              >
                Apply Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>
                <th className="p-4">User & Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4">Location</th>
                <th className="p-4">KYC Status</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-700" />
                    Loading user directory...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 space-y-1">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700">No users found</p>
                    <p className="text-[11px]">Try adjusting your search criteria or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isSelected = selectedUids.includes(u.id);
                  const isSuspended = (u as any).status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(u.id)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          aria-label={`Select ${u.name}`}
                        />
                      </td>

                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={u.name}
                            className="w-10 h-10 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/admin/users/${u.id}`}
                              className="font-extrabold text-slate-900 hover:text-purple-700 transition-colors block truncate"
                            >
                              {u.name}
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>{u.phone}</span>
                              {u.organizationName && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px] font-sans font-medium text-slate-600">
                                    {u.organizationName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 font-bold text-[11px]">
                          {getRoleIcon(u.role)}
                          <span>{u.role}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="p-4 text-slate-500">
                        <span className="truncate block max-w-[140px]">{u.location || 'India'}</span>
                      </td>

                      {/* KYC Verified */}
                      <td className="p-4">
                        {u.verified ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            Pending KYC
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="p-4">
                        {isSuspended ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        {onToggleVerification && u.role !== 'ADMIN' && (
                          <button
                            onClick={() => onToggleVerification(u)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-colors cursor-pointer ${
                              u.verified
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {u.verified ? 'Unverify' : 'Approve'}
                          </button>
                        )}

                        <Link
                          to={`/admin/users/${u.id}`}
                          className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing <strong>{filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of{' '}
            <strong>{filteredUsers.length}</strong> users
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
