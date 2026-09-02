import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProduceCategory, QualityGrade, AIPriceRecommendation } from '../../types';
import { getPriceRecommendation, ExtendedAIRecommendation } from '../../services/aiService';
import { addProduce } from '../../services/produceService';
import { uploadProduceImage, getPresetImageForCrop } from '../../services/storageService';
import {
  Sprout,
  Sparkles,
  CheckCircle2,
  Upload,
  Calendar,
  IndianRupee,
  MapPin,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Info,
  X,
  AlertCircle,
  Building,
  Users,
  Tractor,
  Check,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PriceRecommendationCard } from '../../components/ai/PriceRecommendationCard';
import { formatINR } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

// Standard Indian agricultural production locations with preset coordinates
const LOCATION_PRESETS: Record<string, { lat: number; lng: number }> = {
  'Chennai, Tamil Nadu': { lat: 13.0827, lng: 80.2707 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Nashik, Maharashtra': { lat: 19.9975, lng: 73.7898 },
  'Nashik': { lat: 19.9975, lng: 73.7898 },
  'Dindori, Nashik': { lat: 20.2033, lng: 73.8344 },
  'Lasalgaon, Maharashtra': { lat: 20.1472, lng: 74.2274 },
  'Karnal, Haryana': { lat: 29.6857, lng: 76.9905 },
  'Pune, Maharashtra': { lat: 18.5204, lng: 73.8567 },
  'Mumbai, Maharashtra': { lat: 19.076, lng: 72.8777 },
};

const COMMON_CROP_PRESETS = [
  { name: 'Tomato', category: 'VEGETABLES' as ProduceCategory, defaultPrice: 30, unit: 'kg' },
  { name: 'Red Onion', category: 'VEGETABLES' as ProduceCategory, defaultPrice: 26, unit: 'kg' },
  { name: 'Potato', category: 'VEGETABLES' as ProduceCategory, defaultPrice: 22, unit: 'kg' },
  { name: 'Basmati Rice', category: 'GRAINS' as ProduceCategory, defaultPrice: 48, unit: 'kg' },
  { name: 'Wheat (Sharbati)', category: 'GRAINS' as ProduceCategory, defaultPrice: 32, unit: 'kg' },
  { name: 'Green Chilli', category: 'VEGETABLES' as ProduceCategory, defaultPrice: 45, unit: 'kg' },
  { name: 'Organic Turmeric', category: 'SPICES' as ProduceCategory, defaultPrice: 110, unit: 'kg' },
  { name: 'Soybean', category: 'PULSES' as ProduceCategory, defaultPrice: 42, unit: 'kg' },
];

export const ProduceListingWizard: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Form Fields
  const [cropName, setCropName] = useState('Tomato');
  const [variety, setVariety] = useState('Hybrid Red F1');
  const [category, setCategory] = useState<ProduceCategory>('VEGETABLES');
  const [quantity, setQuantity] = useState<number>(300);
  const [unit, setUnit] = useState<'kg' | 'quintal' | 'tonne' | 'crates'>('kg');
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('Grade A');
  const [expectedPrice, setExpectedPrice] = useState<number>(30);
  const [harvestDate, setHarvestDate] = useState('2026-08-28');
  const [expiryDate, setExpiryDate] = useState('2026-09-10');
  const [location, setLocation] = useState(user?.location || 'Nashik, Maharashtra');
  const [latitude, setLatitude] = useState(19.9975);
  const [longitude, setLongitude] = useState(73.7898);
  const [organicCertified, setOrganicCertified] = useState(false);

  // Images state
  const [images, setImages] = useState<string[]>(getPresetImageForCrop('tomatoes'));
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // AI Pricing State
  const [aiRecommendation, setAiRecommendation] = useState<ExtendedAIRecommendation | null>(null);
  const [calculatingAi, setCalculatingAi] = useState(false);

  // Form Validation & Confirmation Modal
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync coordinates when location changes
  useEffect(() => {
    const matched = Object.entries(LOCATION_PRESETS).find(
      ([loc]) => location.toLowerCase().includes(loc.toLowerCase())
    );
    if (matched) {
      setLatitude(matched[1].lat);
      setLongitude(matched[1].lng);
    }
  }, [location]);

  // Real-time AI Indicative Price fetching
  const fetchAIPrice = async () => {
    if (!cropName || quantity <= 0) return;
    setCalculatingAi(true);
    try {
      const rec = await getPriceRecommendation({
        cropName,
        category,
        quantity,
        qualityGrade,
        location,
        harvestDate,
        farmerExpectedPrice: expectedPrice,
      });
      setAiRecommendation(rec);
    } catch (e) {
      console.warn('AI calculation fallback active', e);
    } finally {
      setCalculatingAi(false);
    }
  };

  useEffect(() => {
    fetchAIPrice();
    setImages(getPresetImageForCrop(cropName));
  }, [cropName, qualityGrade, quantity, location]);

  const handleSelectPreset = (preset: typeof COMMON_CROP_PRESETS[0]) => {
    setCropName(preset.name);
    setCategory(preset.category);
    setExpectedPrice(preset.defaultPrice);
    showToast('info', 'Crop Selected', `${preset.name} loaded with recommended presets.`);
  };

  const handleAdoptAIPrice = (price: number) => {
    setExpectedPrice(price);
    showToast('success', 'AI Suggested Price Adopted', `Your asking price is updated to ₹${price}/${unit}.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      setUploadedFiles((prev) => [...prev, file]);

      // Instant local preview
      const previewUrl = URL.createObjectURL(file);
      setImages((prev) => [previewUrl, ...prev]);
      showToast('success', 'Photo Attached', 'Produce image staged for upload.');
    } catch (err) {
      showToast('error', 'Upload Error', 'Could not stage image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
    setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== index));
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!cropName.trim()) {
      errors.cropName = 'Please enter or select a crop name.';
    }
    if (!quantity || quantity <= 0) {
      errors.quantity = 'Quantity must be at least 1.';
    }
    if (!expectedPrice || expectedPrice <= 0) {
      errors.expectedPrice = 'Please enter your asking price.';
    }
    if (!harvestDate) {
      errors.harvestDate = 'Harvest date is required.';
    }
    if (!location.trim()) {
      errors.location = 'Please provide farm pickup location.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitiateConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    } else {
      showToast('error', 'Please Complete Highlighted Fields', 'Fill in the required details to list your crop.');
    }
  };

  // Final confirmation: Uploads images and writes to Firestore /produce
  const handleFinalSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const produceTempId = `prod_${Date.now()}`;
      let finalImageUrls = [...images];

      // Upload newly attached files to Firebase Storage path: /produce/{farmerId}/{produceId}/
      if (uploadedFiles.length > 0) {
        try {
          const uploadPromises = uploadedFiles.map((file) =>
            uploadProduceImage(file, user.id, produceTempId)
          );
          const uploadedUrls = await Promise.all(uploadPromises);
          finalImageUrls = [...uploadedUrls, ...images.filter((img) => !img.startsWith('blob:'))];
        } catch (storageErr) {
          console.warn('Storage upload fallback', storageErr);
        }
      }

      // Filter out any local blob URLs
      finalImageUrls = finalImageUrls.filter((url) => !url.startsWith('blob:'));
      if (finalImageUrls.length === 0) {
        finalImageUrls = getPresetImageForCrop(cropName);
      }

      // Create Firestore document in /produce/{produceId}
      const newListing = await addProduce({
        farmerId: user.id,
        farmerName: user.name,
        farmerPhone: user.phone,
        farmerType: user.role === 'FPO' ? 'FPO' : 'FARMER',
        organizationName: user.organizationName,
        cropName,
        variety,
        category,
        quantity,
        unit,
        qualityGrade,
        expectedPrice,
        aiRecommendedPrice: aiRecommendation?.recommendedPrice,
        aiMinimumPrice: aiRecommendation?.minimumPrice,
        aiMaximumPrice: aiRecommendation?.maximumPrice,
        demandLevel: aiRecommendation?.demandLevel,
        demandForecast: aiRecommendation?.demandForecast,
        aiExplanation: aiRecommendation?.explanation,
        harvestDate,
        expiryDate,
        location,
        latitude,
        longitude,
        images: finalImageUrls,
        status: 'ACTIVE',
        organicCertified,
        verifiedSeller: user.verified ?? false,
      });

      showToast(
        'success',
        language === 'hi' ? 'फसल सफलतापूर्वक दर्ज की गई!' : 'Produce Published Successfully!',
        `${newListing.cropName} (${newListing.quantity} ${newListing.unit}) is now live for verified commercial buyers.`
      );

      setShowConfirmModal(false);
      navigate('/farmer/produce');
    } catch (err: any) {
      showToast('error', 'Publish Failed', err.message || 'Could not save listing to Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFPO = user?.role === 'FPO';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              {isFPO ? <Building className="w-5 h-5" /> : <Tractor className="w-5 h-5" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isFPO ? 'List Collective Member Harvest' : 'List My Harvest for Direct Buyer Sale'}
            </h1>
            <Badge variant={isFPO ? 'teal' : 'green'} size="sm">
              {isFPO ? 'FPO Collective Producer' : 'Individual Farmer'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Publish harvest batches directly to verified commercial buyers with live Mandi price advisory.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Farmer Friendly Listing Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleInitiateConfirm} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                1. Crop & Harvest Details
              </h3>
              <span className="text-xs text-slate-400 font-semibold">* Required</span>
            </div>

            {/* Quick Crop Selector Chips */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Quick Select Common Crops (Tap to pick)
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_CROP_PRESETS.map((preset) => {
                  const isSelected = cropName.toLowerCase() === preset.name.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Crop Name Custom Input */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Crop / Product Name *
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g. Tomato, Red Onion, Basmati Rice"
                className={`w-full min-h-[48px] px-4 py-3 bg-slate-50 rounded-2xl border text-sm font-bold focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none ${
                  validationErrors.cropName ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
                required
              />
              {validationErrors.cropName && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.cropName}
                </p>
              )}
            </div>

            {/* Category & Quality Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Crop Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProduceCategory)}
                  className="w-full min-h-[48px] px-3.5 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="VEGETABLES">Vegetables (सब्जियां)</option>
                  <option value="FRUITS">Fruits (फल)</option>
                  <option value="GRAINS">Grains / Cereals (अनाज)</option>
                  <option value="PULSES">Pulses (दालें)</option>
                  <option value="SPICES">Spices (मसाले)</option>
                  <option value="ORGANIC">Certified Organic (जैविक)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Quality Grade *</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value as QualityGrade)}
                  className="w-full min-h-[48px] px-3.5 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="Grade A">Grade A (Standard Table Grade)</option>
                  <option value="Grade A (Export)">Grade A (Export / Premium)</option>
                  <option value="Grade B">Grade B (Processing Grade)</option>
                  <option value="Grade C">Grade C (Local Consumption)</option>
                  <option value="Certified Organic">Certified Organic</option>
                </select>
              </div>
            </div>

            {/* Harvest Quantity & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Harvest Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className={`w-full min-h-[48px] px-4 py-3 bg-slate-50 rounded-2xl border text-base font-bold font-mono focus:bg-white focus:border-brand-500 outline-none ${
                    validationErrors.quantity ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {validationErrors.quantity && (
                  <p className="text-xs text-red-600 font-semibold">{validationErrors.quantity}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Unit of Measurement *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full min-h-[48px] px-3.5 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="quintal">Quintals (100 kg)</option>
                  <option value="crates">Crates (20 kg)</option>
                  <option value="tonne">Tonnes (1000 kg)</option>
                </select>
              </div>
            </div>

            {/* Produce Photos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <label className="font-bold text-slate-800">
                  Produce Photos ({images.length} attached)
                </label>
                <span className="text-xs text-slate-400">Optional</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group">
                    <img src={img} alt="produce" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs font-bold text-slate-700">
                    {uploadingImage ? 'Uploading...' : '+ Add Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Harvest Date *</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">Estimated Shelf Life</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Target Price Section (High-Contrast Hero Input) */}
            <div className="space-y-2 p-5 bg-emerald-50/80 rounded-3xl border-2 border-emerald-300">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label className="block text-xs sm:text-sm font-extrabold text-emerald-950">
                  Your Target Asking Price (₹/{unit}) *
                </label>
                {aiRecommendation && (
                  <button
                    type="button"
                    onClick={() => handleAdoptAIPrice(aiRecommendation.recommendedPrice)}
                    className="min-h-[36px] px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Adopt AI Price: {formatINR(aiRecommendation.recommendedPrice)}</span>
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <IndianRupee className="w-5 h-5 absolute left-4 top-3.5 text-emerald-700" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(Number(e.target.value))}
                  placeholder="30"
                  className={`w-full min-h-[52px] pl-11 pr-4 py-3 bg-white rounded-2xl border-2 text-xl font-extrabold font-mono text-emerald-950 focus:ring-4 focus:ring-emerald-200 outline-none ${
                    validationErrors.expectedPrice ? 'border-red-400' : 'border-emerald-400'
                  }`}
                  required
                />
              </div>
              <p className="text-xs text-emerald-900 font-medium">
                💡 <strong>Fair Price Tip:</strong> 100% of this price goes directly to your bank account without middlemen fees.
              </p>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Farm Gate / Village Pickup Location *
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nashik, Maharashtra"
                  className={`w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border text-sm font-medium outline-none focus:bg-white ${
                    validationErrors.location ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[52px] px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-brand-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              aria-label="Review & Confirm Listing"
            >
              <span>Review & Confirm Listing</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Right Column: AI Indicative Price Guidance */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Live Mandi Price Guidance
            </h3>
            {calculatingAi && (
              <span className="text-xs text-emerald-700 animate-pulse font-bold">
                Recalculating...
              </span>
            )}
          </div>

          {aiRecommendation ? (
            <div className="space-y-6">
              <PriceRecommendationCard
                recommendation={aiRecommendation}
                expectedPrice={expectedPrice}
                onAcceptPrice={handleAdoptAIPrice}
                showForecastChart={true}
              />
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Calculating AI Mandi Guidance...
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Produce Listing"
          subtitle="Please review your lot details before publishing"
          maxWidth="md"
        >
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Producer:</span>
                <span className="font-bold text-slate-900">
                  {user?.name} ({isFPO ? 'FPO Collective' : 'Individual Farmer'})
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Crop & Quality:</span>
                <span className="font-bold text-slate-900">{cropName} ({qualityGrade})</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Harvest Quantity:</span>
                <span className="font-bold font-mono text-slate-900">{quantity} {unit}</span>
              </div>

              <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-emerald-950 font-bold">Your Target Price:</span>
                <span className="font-extrabold font-mono text-emerald-900 text-base">{formatINR(expectedPrice)} / {unit}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Pickup Location:</span>
                <span className="font-bold text-slate-900">{location}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Once confirmed, this crop will be visible as <strong>ACTIVE</strong> to verified commercial buyers across India.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 min-h-[48px]"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                Back to Edit
              </Button>

              <Button
                variant="primary"
                size="md"
                className="flex-1 min-h-[48px] bg-brand-700 hover:bg-brand-800 text-white font-bold"
                onClick={handleFinalSubmit}
                isLoading={submitting}
              >
                Confirm & Publish
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
