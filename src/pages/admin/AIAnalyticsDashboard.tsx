import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Users, ShoppingCart, Package } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { getPlatformAnalytics, getAIRecommendationAccuracy, getMatchingSuccessRate, getLogisticsMetrics } from '../../services/analyticsService';

export const AIAnalyticsDashboard: React.FC = () => {
  const [platformMetrics, setPlatformMetrics] = useState<any>(null);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [matchingMetrics, setMatchingMetrics] = useState<any>(null);
  const [logisticsMetrics, setLogisticsMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [platform, ai, matching, logistics] = await Promise.all([
          getPlatformAnalytics(30),
          getAIRecommendationAccuracy(30),
          getMatchingSuccessRate(30),
          getLogisticsMetrics(30),
        ]);

        setPlatformMetrics(platform);
        setAiMetrics(ai);
        setMatchingMetrics(matching);
        setLogisticsMetrics(logistics);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const platformHealth = platformMetrics?.overallPlatformHealth || 0;
  const healthColor = platformHealth > 80 ? 'text-emerald-600' : platformHealth > 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">AI & Platform Analytics</h1>
        <p className="text-slate-600 mt-2">Real-time insights into recommendation accuracy, matching success, and logistics performance</p>
      </div>

      {/* Platform Health KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <StatCard
          title="Platform Health"
          value={`${platformHealth.toFixed(1)}%`}
          subtitle="Overall system performance"
          trend={{ value: '+2.3% this week', isPositive: true }}
          icon={<Activity className="w-6 h-6 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title="AI Recommendation Accuracy"
          value={`${aiMetrics?.accuracy?.toFixed(1)}%`}
          subtitle={`${aiMetrics?.totalRecommendations || 0} recommendations`}
          trend={{ value: `${aiMetrics?.acceptanceRate?.toFixed(1)}% accepted`, isPositive: true }}
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="Bulk Matching Success"
          value={`${matchingMetrics?.successRate?.toFixed(1)}%`}
          subtitle={`${matchingMetrics?.totalMatches || 0} total matches`}
          trend={{ value: `Avg ${matchingMetrics?.averageSupplierCount?.toFixed(1)} suppliers/order`, isPositive: true }}
          icon={<Users className="w-6 h-6 text-amber-600" />}
          accentColor="amber"
        />

        <StatCard
          title="Logistics On-Time Rate"
          value={`${logisticsMetrics?.averageOnTimeRate?.toFixed(1)}%`}
          subtitle={`${logisticsMetrics?.totalDeliveries || 0} deliveries`}
          trend={{ value: `Rating: ${logisticsMetrics?.averageRating?.toFixed(2)}/5`, isPositive: true }}
          icon={<Package className="w-6 h-6 text-purple-600" />}
          accentColor="purple"
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Recommendation Performance */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">AI Recommendation Performance</h3>
            <p className="text-sm text-slate-500 mt-1">Accuracy trends over 30 days</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Average Confidence Score</span>
              <span className="text-2xl font-extrabold text-blue-600">{aiMetrics?.averageConfidence?.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(aiMetrics?.averageConfidence || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Generated</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{aiMetrics?.totalRecommendations || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 uppercase font-semibold">Farmer Accepted</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">{aiMetrics?.acceptanceRate?.toFixed(0)}%</p>
            </div>
          </div>
        </Card>

        {/* Matching Success Rate */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Bulk Matching Success Metrics</h3>
            <p className="text-sm text-slate-500 mt-1">Supplier allocation efficiency</p>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Success Rate</span>
              <span className="text-2xl font-extrabold text-amber-600">{matchingMetrics?.successRate?.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(matchingMetrics?.successRate || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Orders</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{matchingMetrics?.totalMatches || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 uppercase font-semibold">Avg Suppliers</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">{matchingMetrics?.averageSupplierCount?.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        {/* Logistics Performance */}
        <Card className="p-6 space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Logistics Partner Performance</h3>
            <p className="text-sm text-slate-500 mt-1">Top 10 performers by on-time rate and ratings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 uppercase font-semibold">Total Deliveries</p>
              <p className="text-3xl font-extrabold text-purple-600 mt-2">{logisticsMetrics?.totalDeliveries || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 uppercase font-semibold">On-Time Rate</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">{logisticsMetrics?.averageOnTimeRate?.toFixed(1)}%</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 uppercase font-semibold">Avg Customer Rating</p>
              <p className="text-3xl font-extrabold text-blue-600 mt-2">{logisticsMetrics?.averageRating?.toFixed(2)} ⭐</p>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-emerald-900">Total Earnings Realized: ₹{(logisticsMetrics?.totalEarnings || 0).toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="p-6 space-y-4 border-l-4 border-blue-500">
        <h3 className="text-lg font-extrabold text-slate-900">Key Insights & Recommendations</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">High AI Acceptance Rate</p>
              <p className="text-sm text-slate-600">Farmers are accepting {aiMetrics?.acceptanceRate?.toFixed(0)}% of AI recommendations, indicating good model calibration.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Bulk Matching Efficiency</p>
              <p className="text-sm text-slate-600">Average {matchingMetrics?.averageSupplierCount?.toFixed(1)} suppliers per order at {matchingMetrics?.successRate?.toFixed(1)}% success rate.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Excellent Logistics</p>
              <p className="text-sm text-slate-600">On-time delivery rate of {logisticsMetrics?.averageOnTimeRate?.toFixed(1)}% with average customer rating of {logisticsMetrics?.averageRating?.toFixed(2)}/5.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
