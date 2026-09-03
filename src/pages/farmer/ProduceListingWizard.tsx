import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

export const ProduceListingWizard: React.FC = () => {
  const { user } = useAuth();
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
  const [location, setLocation] = useState(user?.location || 'Chennai');
  const [latitude, setLatitude] = useState(13.0827);
  const [longitude, setLongitude] = useState(80.2707);
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

  const handleAdoptAIPrice = (price: number) => {
    setExpectedPrice(price);
    showToast('success', 'AI Indicative Price Adopted', `Target asking price updated to ₹${price}/${unit}.`);
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
      errors.cropName = 'Crop name is required.';
    }
    if (!quantity || quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0.';
    }
    if (!expectedPrice || expectedPrice <= 0) {
      errors.expectedPrice = 'Expected price must be greater than ₹0.';
    }
    if (!harvestDate) {
      errors.harvestDate = 'Harvest date is required.';
    }
    if (!location.trim()) {
      errors.location = 'Farm/Pickup location is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitiateConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    } else {
      showToast('error', 'Form Incomplete', 'Please fix the highlighted fields before submitting.');
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
      });

      showToast(
        'success',
        'Produce Published Successfully!',
        `${newListing.cropName} (${newListing.quantity} ${newListing.unit}) is now ACTIVE and visible to verified buyers.`
      );

      setShowConfirmModal(false);
      navigate('/farmer/produce');
    } catch (err: any) {
      showToast('error', 'Publish Failed', err.message || 'Could not save listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFPO = user?.role === 'FPO';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sprout className="w-6 h-6 text-brand-700" />
              List New Harvest with AI-Assisted Indicative Pricing
            </h1>
            <Badge variant={isFPO ? 'teal' : 'green'} size="sm">
              {isFPO ? 'FPO Collective Producer' : 'Individual Farmer'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Publish produce directly to verified commercial buyers with real-time APMC Mandi benchmark analytics.
          </p>
        </div>

        {isFPO && (
          <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2 text-xs text-teal-900">
            <Building className="w-4 h-4 text-teal-700 shrink-0" />
            <span>FPO Mode: Produce will be tagged under <strong>{user?.organizationName || 'FPO Collective'}</strong>.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleInitiateConfirm} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Harvest & Commodity Details
              </h3>
              <span className="text-[11px] text-slate-400">* Required Fields</span>
            </div>

            {/* Crop Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Crop / Product Name *
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g. Tomato, Red Onion, Basmati Rice"
                className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none ${
                  validationErrors.cropName ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
                required
              />
              {validationErrors.cropName && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.cropName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProduceCategory)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="VEGETABLES">Vegetables</option>
                  <option value="FRUITS">Fruits</option>
                  <option value="GRAINS">Grains</option>
                  <option value="PULSES">Pulses</option>
                  <option value="SPICES">Spices</option>
                  <option value="ORGANIC">Organic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Quality Grade *</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value as QualityGrade)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="Grade A">Grade A (Standard Table)</option>
                  <option value="Grade A (Export)">Grade A (Export / Premium)</option>
                  <option value="Grade B">Grade B (Processing Grade)</option>
                  <option value="Grade C">Grade C (Local Consumption)</option>
                  <option value="Certified Organic">Certified Organic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Harvest Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-xs font-bold font-mono focus:bg-white focus:border-brand-500 outline-none ${
                    validationErrors.quantity ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {validationErrors.quantity && (
                  <p className="text-[11px] text-red-600">{validationErrors.quantity}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Unit of Measurement *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="quintal">Quintals (100 kg)</option>
                  <option value="crates">Crates (20 kg)</option>
                  <option value="tonne">Tonnes (1000 kg)</option>
                </select>
              </div>
            </div>

            {/* Produce Image Upload */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">
                  Produce Harvest Photos ({images.length} attached)
                </label>
                <span className="text-[11px] text-slate-400">Stored securely</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={img} alt="produce" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center">
                  <Upload className="w-4 h-4 text-slate-500 mb-1" />
                  <span className="text-[10px] font-bold text-slate-600">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Harvest Date *</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Estimated Shelf Life</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Expected Selling Price */}
            <div className="space-y-1.5 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-emerald-950">
                  Your Target Asking Price (₹/{unit}) *
                </label>
                {aiRecommendation && (
                  <button
                    type="button"
                    onClick={() => handleAdoptAIPrice(aiRecommendation.recommendedPrice)}
                    className="text-[11px] font-bold text-brand-700 hover:underline flex items-center gap-1"
                  >
                    Match AI: {formatINR(aiRecommendation.recommendedPrice)}
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <IndianRupee className="w-4 h-4 absolute left-3.5 top-3 text-emerald-700" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(Number(e.target.value))}
                  placeholder="30"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border text-base font-bold font-mono text-emerald-950 focus:ring-2 focus:ring-emerald-200 outline-none ${
                    validationErrors.expectedPrice ? 'border-red-400' : 'border-emerald-300'
                  }`}
                  required
                />
              </div>
              {validationErrors.expectedPrice && (
                <p className="text-[11px] text-red-600">{validationErrors.expectedPrice}</p>
              )}
            </div>

            {/* Location & GPS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Farm Gate Pickup Location *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border text-xs font-medium outline-none focus:bg-white ${
                    validationErrors.location ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span>Coordinates:</span>
                <span className="font-mono">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review & Confirm Listing
            </Button>
          </form>
        </div>

        {/* AI Indicative Price Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-700" />
              AI-Assisted Indicative Price Guidance
            </h3>
            {calculatingAi && (
              <span className="text-xs text-brand-700 animate-pulse font-medium">
                Recalculating APMC trends...
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
              Calculating AI Indicative Guidance...
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Do NOT create Firestore doc before user confirms */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Produce Listing"
          subtitle="Please review your lot details before publishing"
          maxWidth="md"
        >
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">Producer Identity:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  {isFPO ? <Building className="w-3.5 h-3.5 text-teal-600" /> : <Tractor className="w-3.5 h-3.5 text-emerald-600" />}
                  {user?.name} ({isFPO ? 'FPO Collective' : 'Individual Farmer'})
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Crop & Quality:</span>
                <span className="font-bold text-slate-900">{cropName} ({qualityGrade})</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Batch Quantity:</span>
                <span className="font-bold font-mono text-slate-900">{quantity} {unit}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Your Target Asking Price:</span>
                <span className="font-extrabold font-mono text-emerald-800 text-sm">{formatINR(expectedPrice)} / {unit}</span>
              </div>

              {aiRecommendation && (
                <div className="flex justify-between items-center bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-emerald-950 font-bold">AI Indicative Range:</span>
                  <span className="font-extrabold font-mono text-emerald-900">
                    {formatINR(aiRecommendation.minimumPrice)} – {formatINR(aiRecommendation.maximumPrice)} / kg
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pickup Location:</span>
                <span className="font-bold text-slate-900">{location}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Once confirmed, this lot will be saved and listed as <strong>ACTIVE</strong> for verified buyers on the VAYORA marketplace.
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                Back to Edit
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                onClick={handleFinalSubmit}
                isLoading={submitting}
              >
                Confirm & Publish Listing
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
