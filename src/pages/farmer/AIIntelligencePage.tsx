import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Sparkles, Zap, MapPin, Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { PriceRecommendationCard } from '../../components/ai/PriceRecommendationCard';
import { DemandChart } from '../../components/ai/DemandChart';
import { getPriceRecommendation } from '../../services/aiService';
import { AIPriceRecommendation } from '../../types';
import { Button } from '../../components/common/Button';

export const AIIntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState('Tomatoes (Hybrid Red)');
  const [grade, setGrade] = useState('Grade A');
  const [data, setData] = useState<AIPriceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPriceRecommendation({
        cropName: selectedCrop,
        category: 'VEGETABLES',
        quantity: 500,
        qualityGrade: grade,
        location: user?.location || 'Nashik, Maharashtra',
        harvestDate: '2026-08-28',
      });
      setData(res);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Price recommendation is temporarily unavailable. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [selectedCrop, grade]);

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Zap className="w-6 h-6 text-brand-700" />
          AI Market Intelligence & Indicative Benchmarks
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time Gemini AI agricultural price analytics, urban demand curves, and direct buyer liquidity.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Commodity:</span>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white outline-none"
          >
            <option value="Tomatoes (Hybrid Red)">Tomatoes (Hybrid Red)</option>
            <option value="Red Onions (Garwa Storage Grade)">Red Onions (Garwa Storage Grade)</option>
            <option value="1121 Traditional Basmati Rice">1121 Traditional Basmati Rice</option>
            <option value="Kufri Jyoti Potatoes">Kufri Jyoti Potatoes</option>
            <option value="Alphonso Mangoes (Ratnagiri Export)">Alphonso Mangoes (Ratnagiri Export)</option>
            <option value="Sharbati Golden Wheat">Sharbati Golden Wheat</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Grade:</span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white outline-none"
          >
            <option value="Grade A (Export)">Grade A (Export / Premium)</option>
            <option value="Grade A">Grade A (Standard)</option>
            <option value="Grade B">Grade B (Processing)</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="ml-auto"
        >
          Refresh Market AI
        </Button>
      </div>

      {/* Intelligence Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Fetching indicative market intelligence...
        </div>
      ) : errorMessage ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-amber-200 shadow-soft space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Service Notice</h3>
          <p className="text-xs text-slate-600">{errorMessage}</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          <PriceRecommendationCard recommendation={data} />
          <DemandChart data={data.demandForecast} cropName={data.cropName} />
        </div>
      ) : null}
    </div>
  );
};
