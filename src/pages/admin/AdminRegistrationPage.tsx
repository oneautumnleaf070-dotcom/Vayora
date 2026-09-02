import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Copy,
  Check,
  AlertCircle,
  Key,
  Shield,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  submitAdminInvitation,
  getAdminInvitations,
  AdminInvitationData,
} from '../../services/registrationService';
import { useToast } from '../../context/ToastContext';

export const AdminRegistrationPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<AdminInvitationData>({
    fullName: '',
    phone: '',
    email: '',
    adminRole: 'REGIONAL_MODERATOR',
    permissions: {
      manageUsers: true,
      resolveDisputes: true,
      settlePayments: false,
      viewAnalytics: true,
      manageListings: true,
    },
    notes: '',
  });

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [createdInvite, setCreatedInvite] = useState<{ inviteToken: string; phone: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const loadInvites = async () => {
    try {
      const list = await getAdminInvitations();
      setInvitations(list);
    } catch (e) {
      console.warn('Error loading invites', e);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handlePermissionToggle = (key: keyof AdminInvitationData['permissions']) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Valid 10-digit phone number is required';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Valid email is required';
    }
    if (!agreed) {
      errs.agreed = 'You must acknowledge the Super-Admin Delegation Policy';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await submitAdminInvitation(formData, {
        id: user?.id || 'super_admin_root',
        name: user?.name || 'Super Administrator',
      });

      setCreatedInvite({
        inviteToken: res.inviteToken,
        phone: formData.phone,
      });

      showToast('success', 'Invitation Dispatched', `Admin invite generated for ${formData.fullName}`);
      loadInvites();

      // Reset form
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        adminRole: 'REGIONAL_MODERATOR',
        permissions: {
          manageUsers: true,
          resolveDisputes: true,
          settlePayments: false,
          viewAnalytics: true,
          manageListings: true,
        },
        notes: '',
      });
      setAgreed(false);
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Failed to generate invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!createdInvite) return;
    const link = `${window.location.origin}/admin/login?invite=${createdInvite.inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('info', 'Copied to Clipboard', 'Invitation link copied.');
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-700" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Super-Admin Governance Provisioning
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 pl-8">
              Issue role-gated administrative credentials and audit delegate permissions.
            </p>
          </div>
        </div>

        <Link to="/admin/audit-logs">
          <Button variant="outline" size="sm">
            View Audit Log
          </Button>
        </Link>
      </div>

      {/* Success Invitation Modal/Card */}
      {createdInvite && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border-purple-200 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Admin Invitation Link Generated
                </h3>
                <p className="text-xs text-slate-600">
                  Invite token for <strong>{createdInvite.phone}</strong> (Expires in 7 days)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedInvite(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-purple-200 flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-bold text-purple-950 truncate">
              {window.location.origin}/admin/login?invite={createdInvite.inviteToken}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInviteLink}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
      )}

      {/* Invitation Form & Active Invites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Provision Form */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-7 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Add New Administrator
              </h3>
              <p className="text-xs text-slate-500">
                Authorized administrators will receive an invitation to authenticate with Phone OTP.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Dr. Anjali Mehta"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                  {errors.fullName && <p className="text-[11px] text-red-500 font-bold">{errors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98111 22334"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold font-mono outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                  {errors.phone && <p className="text-[11px] text-red-500 font-bold">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Official Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="anjali.mehta@vayora.agri"
                  className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
                {errors.email && <p className="text-[11px] text-red-500 font-bold">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Admin Governance Tier *</label>
                <select
                  value={formData.adminRole}
                  onChange={(e: any) => setFormData({ ...formData, adminRole: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold outline-none"
                >
                  <option value="REGIONAL_MODERATOR">Regional APMC Moderator (KYC & Produce Verifications)</option>
                  <option value="OPERATIONS_SUPPORT">Operations Support (Dispute Resolution & Logistics Telemetry)</option>
                  <option value="SUPER_ADMIN">Super Administrator (Full System & Escrow Permissions)</option>
                </select>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-800">
                  Assigned Administrative Permissions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: 'manageUsers', label: 'Manage Users & Approvals' },
                    { key: 'manageListings', label: 'Produce Listings Moderation' },
                    { key: 'resolveDisputes', label: 'Escrow Dispute Adjudication' },
                    { key: 'settlePayments', label: 'Manual Escrow Release Override' },
                    { key: 'viewAnalytics', label: 'Access Audit Logs & Reports' },
                  ].map((perm: any) => {
                    const isChecked = (formData.permissions as any)[perm.key];
                    return (
                      <div
                        key={perm.key}
                        onClick={() => handlePermissionToggle(perm.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-purple-700"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agreement */}
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-purple-700 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-medium leading-relaxed">
                    I confirm that this user is authorized to perform governance mutations on the VAYORA agricultural platform. All actions will be attributed and logged in the immutable audit trail.
                  </span>
                </label>
                {errors.agreed && <p className="text-[11px] text-red-600 font-bold pl-6">{errors.agreed}</p>}
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={submitting}
                className="w-full min-h-[48px] bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-sm shadow-md shadow-purple-700/20"
              >
                Dispatch Administrator Invitation
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Active Invitations & Protocol Guide */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
              Active Admin Invitations ({invitations.length})
            </h3>

            {invitations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active invitations pending.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {invitations.slice(0, 5).map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{inv.fullName}</span>
                      <Badge variant="purple" size="sm">
                        {inv.adminRole.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-500 font-mono text-[11px]">{inv.phone} • {inv.email}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span>By: {inv.createdBy}</span>
                      <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6 space-y-3 bg-slate-900 text-white">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Shield className="w-4 h-4" />
              <span>Governance Security Policy</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              New administrators authenticate via Phone OTP against the authorized invitation phone number. Role permissions can be modified or revoked at any time from the User Directory.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
