import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Produce, ProduceCategory, QualityGrade } from '../../types';
import {
  getActiveMarketplaceProduce,
  filterAndSortMarketplaceProduce,
  MarketplaceFilterParams,
} from '../../services/marketplaceService';
import {
  Store,
  Search,
  Filter,
  Layers,
  MapPin,
  ShieldCheck,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  Building,
  Tractor,
  Calendar,
  IndianRupee,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatINR, calculateDistanceKm } from '../../utils/helpers';

export const BuyerMarketplace: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allProduce, setAllProduce] = useState<Produce[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProduceCategory | 'ALL'>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<QualityGrade | 'ALL'>('ALL');
  const [selectedSellerType, setSelectedSellerType] = useState<'ALL' | 'FPO' | 'FARMER'>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [minQuantity, setMinQuantity] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(Infinity);
  const [sortBy, setSortBy] = useState<'BEST_VALUE' | 'PRICE_LOW' | 'PRICE_HIGH' | 'DISTANCE' | 'QUANTITY'>('BEST_VALUE');

  // Buyer coordinates (defaults to Mumbai APMC hub if not set)
  const buyerCoords = {
    lat: user?.latitude || 19.076,
    lng: user?.longitude || 72.8777,
  };

  const loadProduce = async () => {
    setLoading(true);
    try {
      const activeListings = await getActiveMarketplaceProduce();
      setAllProduce(activeListings);
    } catch (err) {
      console.error('Failed to load active marketplace produce', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduce();
    window.addEventListener('vayora_produce_updated', loadProduce);
    return () => window.removeEventListener('vayora_produce_updated', loadProduce);
  }, []);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedGrade('ALL');
    setSelectedSellerType('ALL');
    setMaxPrice(200);
    setMinQuantity(0);
    setMaxDistance(Infinity);
    setSortBy('BEST_VALUE');
  };

  // Filter and Sort produce client-side on active listings
  const filteredListings = filterAndSortMarketplaceProduce(
    allProduce,
    {
      searchQuery,
      category: selectedCategory,
      qualityGrade: selectedGrade,
      farmerType: selectedSellerType,
      maxPrice,
      minQuantity,
      maxDistanceKm: maxDistance,
      sortBy,
    },
    buyerCoords
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-soft flex flex-wrap items-center justify-between gap-6 border border-emerald-900/60">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>DIRECT FARM PROCUREMENT • 100% PRICE TRANSPARENCY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Verified Agricultural Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Procure directly from verified Farmers and FPO Producer Collectives. Zero broker commissions, AI-assisted indicative pricing, and guaranteed delivery escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/buyer/bulk-matching">
            <Button
              variant="accent"
              size="lg"
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Smart Bulk Matcher
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by crop (Tomato, Onion), category, producer name, or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="FRUITS">Fruits</option>
              <option value="GRAINS">Grains</option>
              <option value="PULSES">Pulses</option>
              <option value="SPICES">Spices</option>
              <option value="ORGANIC">Organic</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
            >
              <option value="BEST_VALUE">Sort: Best Value (AI Score)</option>
              <option value="PRICE_LOW">Sort: Lowest Price</option>
              <option value="PRICE_HIGH">Sort: Highest Price</option>
              <option value="DISTANCE">Sort: Closest First</option>
              <option value="QUANTITY">Sort: Highest Quantity</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Seller Type Pill */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedSellerType('ALL')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedSellerType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Sellers
              </button>
              <button
                onClick={() => setSelectedSellerType('FPO')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  selectedSellerType === 'FPO' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-3 h-3" />
                FPO Collectives
              </button>
              <button
                onClick={() => setSelectedSellerType('FARMER')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  selectedSellerType === 'FARMER' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tractor className="w-3 h-3" />
                Farmers
              </button>
            </div>

            {/* Quality Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-[11px] outline-none"
            >
              <option value="ALL">All Grades</option>
              <option value="Grade A (Export)">Grade A (Export / Premium)</option>
              <option value="Grade A">Grade A (Standard)</option>
              <option value="Grade B">Grade B (Processing)</option>
              <option value="Certified Organic">Certified Organic</option>
            </select>

            {/* Distance Filter */}
            <select
              value={maxDistance === Infinity ? 'ANY' : String(maxDistance)}
              onChange={(e) => setMaxDistance(e.target.value === 'ANY' ? Infinity : Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-[11px] outline-none"
            >
              <option value="ANY">Any Distance</option>
              <option value="50">&lt; 50 km (Local)</option>
              <option value="100">&lt; 100 km (Regional)</option>
              <option value="250">&lt; 250 km (Agri Corridor)</option>
            </select>
          </div>

          {/* Active count & Clear Button */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Found <strong>{filteredListings.length}</strong> active lots
            </span>

            <button
              onClick={handleClearFilters}
              className="px-3 py-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Produce Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 animate-pulse">
              <div className="h-48 bg-slate-100 rounded-2xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No matching produce found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Try adjusting your search term, clearing category filters, or expanding the distance radius.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((p) => {
            const distance = calculateDistanceKm(buyerCoords.lat, buyerCoords.lng, p.latitude, p.longitude);
            const isFPO = p.farmerType === 'FPO';
            const minP = p.aiMinimumPrice || (p.aiRecommendedPrice ? Math.round(p.aiRecommendedPrice * 0.95) : null);
            const maxP = p.aiMaximumPrice || (p.aiRecommendedPrice ? Math.round(p.aiRecommendedPrice * 1.05) : null);

            return (
              <Card
                key={p.id}
                className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between border-slate-200/80"
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    <img
                      src={p.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'}
                      alt={p.cropName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* FPO vs Farmer Badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      {isFPO ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-800 text-white shadow-md flex items-center gap-1">
                          <Building className="w-3 h-3 text-teal-300" />
                          FPO Collective
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-800 text-white shadow-md flex items-center gap-1">
                          <Tractor className="w-3 h-3 text-emerald-300" />
                          Individual Farmer
                        </span>
                      )}

                      {p.verifiedSeller && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-emerald-800 backdrop-blur-md shadow-xs flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {/* Demand Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge variant={p.demandLevel === 'HIGH' ? 'green' : 'amber'} size="sm">
                        {p.demandLevel || 'MEDIUM'} Demand
                      </Badge>
                    </div>

                    {/* Distance Pill */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white rounded-lg text-[10px] font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{distance} km away</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                          {p.category} • {p.qualityGrade}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Harvest: {p.harvestDate}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 mt-1 line-clamp-1">
                        {p.cropName}
                      </h3>

                      <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                        By {p.farmerName} {p.organizationName ? `(${p.organizationName})` : ''} • {p.location}
                      </p>
                    </div>

                    {/* Price & AI Indicative Container */}
                    <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Direct Seller Price
                        </span>
                        <span className="text-xl font-extrabold font-mono text-slate-900">
                          {formatINR(p.expectedPrice)}
                          <span className="text-xs font-normal text-slate-500 font-sans">/{p.unit}</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                          AI Indicative Price
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          {minP && maxP
                            ? `${formatINR(minP)} – ${formatINR(maxP)}`
                            : p.aiRecommendedPrice
                            ? formatINR(p.aiRecommendedPrice)
                            : 'Benchmark Active'}{' '}
                          /{p.unit}
                        </span>
                      </div>
                    </div>

                    {/* Stock level */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <span>Available Stock:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {p.availableQuantity} {p.unit} available
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-5 pt-0">
                  <Link to={`/buyer/produce/${p.id}`} className="w-full block">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      View Details & Order
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
