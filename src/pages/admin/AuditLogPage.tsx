import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  ArrowLeft,
  ShieldCheck,
  UserX,
  UserCheck,
  SlidersHorizontal,
  CreditCard,
  AlertCircle,
  Download,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { getAuditLogs, exportToCsv, AuditLogEntry } from '../../services/adminService';
import { formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const AuditLogPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        action: actionFilter,
        searchTerm,
      });
      setLogs(data);
    } catch (e) {
      console.error('Error fetching audit logs', e);
      showToast('error', 'Fetch Error', 'Failed to fetch administrative audit history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const handleExportAuditCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Admin Name', 'Action Type', 'Target User', 'Target User ID', 'Details'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.adminName,
      l.action,
      l.targetUserName || '',
      l.targetUserId || '',
      l.details,
    ]);
    exportToCsv('vayora_admin_audit_trail', headers, rows);
    showToast('success', 'Export Generated', 'Audit log history exported to CSV.');
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'USER_VERIFIED':
        return <Badge variant="green" size="sm">KYC Approved</Badge>;
      case 'USER_UNVERIFIED':
        return <Badge variant="amber" size="sm">KYC Revoked</Badge>;
      case 'USER_SUSPENDED':
        return <Badge variant="red" size="sm">Suspended</Badge>;
      case 'USER_UNSUSPENDED':
        return <Badge variant="teal" size="sm">Reinstated</Badge>;
      case 'ROLE_CHANGED':
        return <Badge variant="purple" size="sm">Role Changed</Badge>;
      case 'PAYMENT_MANUALLY_RELEASED':
        return <Badge variant="blue" size="sm">Escrow Released</Badge>;
      case 'PROFILE_EDITED':
        return <Badge variant="slate" size="sm">Profile Edited</Badge>;
      default:
        return <Badge variant="slate" size="sm">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard" className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-purple-700" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Governance Audit Logs
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            Immutable log trail of all administrator approvals, user suspensions, role modifications, and manual overrides.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAuditCsv}
            leftIcon={<Download className="w-4 h-4 text-purple-600" />}
          >
            Export Logs (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by admin, user name, action, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-200 outline-none"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500">Action Filter:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="USER_VERIFIED">KYC Approvals</option>
            <option value="USER_SUSPENDED">Suspensions</option>
            <option value="USER_UNSUSPENDED">Reinstatements</option>
            <option value="ROLE_CHANGED">Role Changes</option>
            <option value="PAYMENT_MANUALLY_RELEASED">Escrow Overrides</option>
            <option value="PROFILE_EDITED">Profile Edits</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Admin Actor</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Target User</th>
                <th className="p-4">Action Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-700" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 space-y-1">
                    <History className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700">No audit events match your query</p>
                    <p className="text-[11px]">Adjust your search keyword or action filter.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                      {log.adminName}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-4">
                      {log.targetUserName ? (
                        <Link
                          to={`/admin/users/${log.targetUserId}`}
                          className="font-bold text-purple-700 hover:underline block truncate max-w-[140px]"
                        >
                          {log.targetUserName}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">System Wide</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">
                      <p className="line-clamp-2 leading-relaxed">{log.details}</p>
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
