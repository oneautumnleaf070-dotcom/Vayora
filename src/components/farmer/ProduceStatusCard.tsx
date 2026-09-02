import React from 'react';
import { Link } from 'react-router-dom';
import { Produce } from '../../types';
import { Button } from '../common/Button';
import { formatINR } from '../../utils/helpers';
import {
  Edit,
  EyeOff,
  Eye,
  TrendingUp,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export interface ProduceStatusCardProps {
  produce: Produce;
  viewMode?: 'grid' | 'list';
  onToggleStatus?: (produceId: string, currentStatus: string) => void;
  onViewOffers?: (produceId: string) => void;
}

export const ProduceStatusCard: React.FC<ProduceStatusCardProps> = ({
  produce,
  viewMode = 'grid',
  onToggleStatus,
  onViewOffers,
}) => {
  const isAvailable = produce.status === 'ACTIVE' || produce.status === 'AVAILABLE';
  const isDraft = produce.status === 'DRAFT';
  const isSoldOut = produce.status === 'SOLD_OUT';

  const defaultImg =
    produce.images?.[0] ||
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400';

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-soft transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Thumbnail & Commodity Meta */}
        <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
          <img
            src={defaultImg}
            alt={produce.cropName}
            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-slate-100 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {produce.cropName}
              </h4>
              {produce.variety && (
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  ({produce.variety})
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isAvailable
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isDraft
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : isSoldOut
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {produce.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="font-semibold text-slate-700">
                {produce.qualityGrade}
              </span>
              <span>•</span>
              <span className="font-mono font-bold text-slate-900">
                {produce.availableQuantity} / {produce.quantity} {produce.unit}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {produce.location}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Price & Quick Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
              Target Price
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-800">
              {formatINR(produce.expectedPrice)}/{produce.unit}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                type="button"
                onClick={() => onToggleStatus(produce.id, produce.status)}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                title={isAvailable ? 'Delist / Mark Inactive' : 'Activate Listing'}
                aria-label={isAvailable ? 'Delist' : 'Activate'}
              >
                {isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-700" />}
              </button>
            )}

            <Link to={`/farmer/produce`}>
              <Button variant="outline" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>
                Edit
              </Button>
            </Link>

            {onViewOffers && (
              <Button
                variant="primary"
                size="sm"
                className="bg-brand-700 hover:bg-brand-800"
                onClick={() => onViewOffers(produce.id)}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Offers
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid View Card (Default)
  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-soft transition-all flex flex-col justify-between">
      {/* Top Image & Floating Status */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={defaultImg}
          alt={produce.cropName}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase backdrop-blur-md shadow-xs ${
              isAvailable
                ? 'bg-emerald-600/90 text-white'
                : isDraft
                ? 'bg-slate-800/90 text-white'
                : isSoldOut
                ? 'bg-blue-600/90 text-white'
                : 'bg-red-600/90 text-white'
            }`}
          >
            {produce.status}
          </span>
          {produce.demandLevel === 'HIGH' && (
            <span className="px-2.5 py-1 bg-amber-500/90 text-slate-950 font-extrabold text-[10px] rounded-full flex items-center gap-1 backdrop-blur-md">
              <TrendingUp className="w-3 h-3" />
              High Demand
            </span>
          )}
        </div>

        {produce.verifiedSeller && (
          <div className="absolute top-3 right-3 bg-white/95 text-emerald-800 p-1.5 rounded-full shadow-xs" title="Verified Producer Batch">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base leading-tight">
              {produce.cropName}
            </h4>
            {produce.variety && (
              <p className="text-xs text-slate-500 mt-0.5">{produce.variety}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Grade</span>
              <span className="font-bold text-slate-800">{produce.qualityGrade}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Available</span>
              <span className="font-bold font-mono text-slate-900">
                {produce.availableQuantity} {produce.unit}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Your Price
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-800">
                {formatINR(produce.expectedPrice)}/{produce.unit}
              </span>
            </div>
            {produce.aiRecommendedPrice && (
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-600 font-bold block flex items-center gap-1 justify-end">
                  <Sparkles className="w-3 h-3" /> AI Target
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {formatINR(produce.aiRecommendedPrice)}/kg
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          {onToggleStatus && (
            <button
              type="button"
              onClick={() => onToggleStatus(produce.id, produce.status)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center text-xs font-semibold cursor-pointer"
              title={isAvailable ? 'Delist this crop' : 'Make available'}
              aria-label={isAvailable ? 'Delist' : 'Activate'}
            >
              {isAvailable ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-emerald-700" />}
            </button>
          )}

          <Link to="/farmer/produce" className="flex-1">
            <Button
              variant="outline"
              size="md"
              className="w-full min-h-[44px] font-bold text-xs"
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          </Link>

          {onViewOffers && (
            <Button
              variant="primary"
              size="md"
              className="flex-1 min-h-[44px] bg-brand-700 hover:bg-brand-800 font-bold text-xs"
              onClick={() => onViewOffers(produce.id)}
            >
              Offers
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
