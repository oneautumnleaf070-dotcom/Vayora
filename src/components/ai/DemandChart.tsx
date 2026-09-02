import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, Zap } from 'lucide-react';
import { formatINR } from '../../utils/helpers';

export interface DemandChartProps {
  data: {
    day: string;
    expectedDemand: number; // 0-100
    projectedPrice: number; // INR
  }[];
  cropName: string;
}

export const DemandChart: React.FC<DemandChartProps> = ({ data, cropName }) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">7-Day Wholesale Demand & Price Trend</h4>
            <p className="text-xs text-slate-500">Forecasting for {cropName} across urban buyer clusters</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
            <span className="text-slate-600 font-medium">Demand Index</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 font-medium">Projected Price (₹)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="demandColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#15803d" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="priceColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
              }}
              formatter={(value: any, name: any) => [
                name === 'expectedDemand' ? `${value} / 100 Index` : `₹${value}/kg`,
                name === 'expectedDemand' ? 'Demand Score' : 'Projected Price',
              ]}
            />
            <Area
              type="monotone"
              dataKey="expectedDemand"
              stroke="#15803d"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#demandColor)"
            />
            <Area
              type="monotone"
              dataKey="projectedPrice"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#priceColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Optimal Selling Window: <strong>Next 48 Hours</strong>
        </span>
        <span className="text-emerald-700 font-bold">
          High Buyer Liquidity Expected
        </span>
      </div>
    </div>
  );
};
