import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Truck,
  IndianRupee,
  Clock,
  Star,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { getLogisticsAnalytics, LogisticsAnalytics } from '../../services/logisticsService';
import { getStoredDeliveries } from '../../services/deliveryService';
import { formatINR, formatNumber, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { Delivery } from '../../types';

export const LogisticsAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [analytics, setAnalytics] = useState<LogisticsAnalytics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, list] = await Promise.all([
        getLogisticsAnalytics(user?.id),
        getStoredDeliveries(),
      ]);
      setAnalytics(stats);
      setDeliveries(list);
    } catch (e) {
      console.error('Error loading analytics', e);
      showToast('error', 'Fetch Error', 'Failed to load fleet performance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/logistics/dashboard" className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-600" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Fleet Performance & Earnings Analytics
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            Corridor delivery telemetry, on-time rate benchmarks, driver earnings, and customer rating distribution.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Deliveries Completed"
          value={analytics ? `${analytics.completedThisMonth}` : '32'}
          change="This Month"
          trend="up"
          icon={<Truck className="w-6 h-6 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title="On-Time Delivery Rate"
          value={analytics ? `${analytics.onTimeRate}%` : '98.6%'}
          change="+1.2% vs Benchmark"
          trend="up"
          icon={<Clock className="w-6 h-6 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="Driver Trust Rating"
          value={analytics ? `${analytics.averageRating} ⭐` : '4.9 ⭐'}
          change="54 Reviews"
          trend="up"
          icon={<Star className="w-6 h-6 text-amber-500 fill-amber-500" />}
          accentColor="amber"
        />

        <StatCard
          title="Total Earnings Realized"
          value={analytics ? formatINR(analytics.totalEarnings) : '₹48,500'}
          change="100% Cleared Escrow"
          trend="up"
          icon={<IndianRupee className="w-6 h-6 text-teal-600" />}
          accentColor="teal"
        />
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Chart 1: Weekly Volume */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Weekly Shipment Volume & Tonnage
              </h3>
              <p className="text-xs text-slate-500">Daily transacted loads across agricultural corridors</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
              Peak Corridor
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.volumeHistory || []}>
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
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="deliveries" name="Shipments" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="tonnageKg" name="Tonnage (kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Time Performance vs Expected */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Corridor Transit: Expected vs Actual Time
              </h3>
              <p className="text-xs text-slate-500">Average minutes elapsed per 100km corridor</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
              Fast Transit
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.timePerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} mins`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="expectedMins"
                  name="Estimated ETA"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="actualMins"
                  name="Actual Transit Time"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Earnings Breakdown */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Logistics Earnings Realization
              </h3>
              <p className="text-xs text-slate-500">Mileage, aggregation bonus, and performance incentives</p>
            </div>
            <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full font-bold text-[10px]">
              Direct Settlement
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.earningsBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(analytics?.earningsBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Earnings']}
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

        {/* Chart 4: Rating Distribution */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Customer & Producer Rating Distribution
              </h3>
              <p className="text-xs text-slate-500">Reviews across completed delivery handovers</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
              4.9 ⭐ Overall
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={analytics?.ratingDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="stars" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Reviews" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Delivery History Table */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
          Shipment Telemetry History ({deliveries.length})
        </h3>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Shipment ID</th>
                  <th className="p-4">Crop & Volume</th>
                  <th className="p-4">Corridor Nodes</th>
                  <th className="p-4">Distance & ETA</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {deliveries.slice(0, 8).map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      #{del.id.slice(-8)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{del.cropName || 'Produce'}</p>
                      <p className="text-[10px] text-slate-400">{del.quantity || 300} {del.unit || 'kg'}</p>
                    </td>
                    <td className="p-4">
                      <p className="truncate max-w-[140px] text-slate-700">{del.pickupLocation}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">➔ {del.deliveryLocation}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono font-bold">{del.distanceKm || 165} km</span>
                      <span className="text-slate-400 block text-[10px]">~{del.estimatedTimeMinutes || 180} mins</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <Badge
                        variant={
                          del.status === 'DELIVERED'
                            ? 'green'
                            : del.status === 'IN_TRANSIT'
                            ? 'amber'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {del.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/logistics/routes/${del.id}`}
                        className="px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold text-[10px] transition-colors inline-block"
                      >
                        Route Map
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
