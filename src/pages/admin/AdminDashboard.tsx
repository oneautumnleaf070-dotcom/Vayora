import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Sprout,
  ShoppingBag,
  Truck,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Building,
  RefreshCw,
  Tractor,
  Layers,
  BarChart3,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { getPlatformAnalytics } from '../../services/adminService';
import { getAllRegisteredUsers, setUserVerification } from '../../services/authService';
import { formatINR, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { User } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<any>(null);
  const [unverifiedUsers, setUnverifiedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, allUsers] = await Promise.all([
        getPlatformAnalytics(),
        getAllRegisteredUsers(),
      ]);
      setAnalytics(stats);
      setUnverifiedUsers(allUsers.filter((u) => !u.verified && u.role !== 'ADMIN'));
    } catch (e) {
      console.error('Error loading admin analytics', e);
      showToast('error', 'Fetch Error', 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_users_updated', loadData);
    window.addEventListener('vayora_orders_updated', loadData);
    return () => {
      window.removeEventListener('vayora_users_updated', loadData);
      window.removeEventListener('vayora_orders_updated', loadData);
    };
  }, []);

  const handleApproveKYC = async (user: User) => {
    try {
      await setUserVerification(user.id, true);
      setUnverifiedUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast('success', 'KYC Verified', `${user.name} (${user.role}) has been verified.`);
      loadData();
    } catch (err) {
      showToast('error', 'Action Failed', 'Could not verify user.');
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner & Quick Navigation */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-mono font-bold text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>VAYORA GOVERNANCE & CONTROL CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Platform Analytics & Executive Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Real-time telemetry across multi-role participants, APMC farm realization, escrow settlements, and logistics corridors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          <Link to="/admin/reports" className="flex-1 md:flex-none">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            >
              Export Reports
            </Button>
          </Link>

          <Link to="/admin/audit-logs" className="flex-1 md:flex-none">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
              leftIcon={<History className="w-4 h-4 text-purple-400" />}
            >
              Audit Logs
            </Button>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={loadData}
            isLoading={loading}
            className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <Link to="/admin/users" className="group">
          <StatCard
            title="Total Registered Users"
            value={analytics ? formatNumber(analytics.totalUsers) : '...'}
            subtitle={
              analytics
                ? `${analytics.roleCounts?.FARMER || 0}F • ${analytics.roleCounts?.BUYER || 0}B • ${analytics.roleCounts?.LOGISTICS || 0}L`
                : 'All Roles'
            }
            trend="up"
            icon={<Users className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />}
            accentColor="purple"
          />
        </Link>

        <StatCard
          title="Active Produce Listings"
          value={analytics ? formatNumber(analytics.activeProduceCount) : '...'}
          change="Available on Market"
          trend="up"
          icon={<Sprout className="w-6 h-6 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="Orders Completed"
          value={analytics ? formatNumber(analytics.totalOrdersCount) : '...'}
          change="100% Escrow Backed"
          trend="up"
          icon={<ShoppingBag className="w-6 h-6 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title="Platform Facilitation"
          value={analytics ? formatINR(analytics.platformRevenue) : '...'}
          change="1-2% Operational Fee"
          trend="up"
          icon={<IndianRupee className="w-6 h-6 text-amber-600" />}
          accentColor="amber"
        />

        <Link to="/admin/users?filter=UNVERIFIED" className="group">
          <StatCard
            title="Pending KYC Approvals"
            value={analytics ? formatNumber(analytics.unverifiedCount) : '...'}
            subtitle="Requires Verification"
            trend={analytics?.unverifiedCount > 0 ? 'down' : 'neutral'}
            icon={<ShieldAlert className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />}
            accentColor="red"
          />
        </Link>
      </div>

      {/* 3. Alerts & Quick Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {unverifiedUsers.length} Unverified Producers
              </h4>
              <p className="text-[11px] text-amber-800">Review APMC & FPO trade credentials</p>
            </div>
          </div>
          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="bg-white border-amber-300 text-xs font-bold">
              Review
            </Button>
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Active Logistics Corridors
              </h4>
              <p className="text-[11px] text-blue-800">Real-time GPS & QR dual verification</p>
            </div>
          </div>
          <Link to="/logistics/dashboard">
            <Button variant="outline" size="sm" className="bg-white border-blue-300 text-xs font-bold">
              Monitor
            </Button>
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-800">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Escrow Settlement Integrity
              </h4>
              <p className="text-[11px] text-emerald-800">100% of buyer funds locked safely</p>
            </div>
          </div>
          <Link to="/admin/reports">
            <Button variant="outline" size="sm" className="bg-white border-emerald-300 text-xs font-bold">
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* 4. Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Chart 1: 30-Day User Growth */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                30-Day Platform Adoption Growth
              </h3>
              <p className="text-xs text-slate-500">Cumulative onboarded farmers, buyers & carriers</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
              +142% MoM
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.growthData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="farmers"
                  name="Farmers & FPOs"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="buyers"
                  name="Commercial Buyers"
                  stroke="#0284c7"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="logistics"
                  name="Logistics Fleet"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Daily Order Volume Trend */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Weekly Order Volume & GMV
              </h3>
              <p className="text-xs text-slate-500">Daily transacted agricultural tonnage</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
              Active Trend
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.orderVolumeData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    name === 'volumeKg' ? `${value} kg` : `${value} Orders`,
                    name === 'volumeKg' ? 'Volume' : 'Count',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="orders" name="Order Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="volumeKg" name="Volume (kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Top Commodities by Demand */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Top Commodities by Demand vs Supply
              </h3>
              <p className="text-xs text-slate-500">Marketplace requirement in metric tons</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
              Mandi Benchmark
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={analytics?.cropDemandData || []}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  dataKey="crop"
                  type="category"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="demandTons" name="Buyer Demand (Tons)" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                <Bar dataKey="supplyTons" name="Farmer Supply (Tons)" fill="#22c55e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Escrow & Revenue Realization */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                100% Transparent Value Distribution
              </h3>
              <p className="text-xs text-slate-500">Gross Transacted Escrow Realization</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
              0% Middleman Cut
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.revenuePieData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(analytics?.revenuePieData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Amount']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 5. Pending KYC Verification Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-700" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Pending KYC Verification Queue ({unverifiedUsers.length})
            </h3>
          </div>
          <Link to="/admin/users" className="text-xs sm:text-sm font-bold text-purple-700 hover:underline flex items-center gap-1">
            <span>Manage All Users</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {unverifiedUsers.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700">All registered producers are verified</p>
            <p className="text-slate-400">Zero backlogged KYC applications in queue.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unverifiedUsers.slice(0, 6).map((u) => (
              <div
                key={u.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={u.name}
                      className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{u.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">{u.phone}</span>
                    </div>
                  </div>
                  <Badge variant={u.role === 'FPO' ? 'teal' : 'amber'} size="sm">
                    {u.role}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <p className="truncate"><strong>Org:</strong> {u.organizationName || 'Independent Farm'}</p>
                  <p className="truncate"><strong>Location:</strong> {u.location || 'Maharashtra'}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    onClick={() => handleApproveKYC(u)}
                  >
                    Approve KYC
                  </Button>
                  <Link to={`/admin/users/${u.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
