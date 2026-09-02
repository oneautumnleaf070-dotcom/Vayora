import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Layers,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FileUploadInput } from '../../components/auth/FileUploadInput';
import { submitLogisticsRegistration, LogisticsRegistrationData } from '../../services/registrationService';
import { useToast } from '../../context/ToastContext';

const DRAFT_KEY = 'vayora_logistics_registration_draft';

export const LogisticsRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<LogisticsRegistrationData>({
    fullName: '',
    phone: '',
    email: '',
    vehicleType: 'Pickup Truck (Tata Ace)',
    vehicleCapacityKg: 1000,
    vehicleRegNumber: '',
    location: 'Nashik, Maharashtra',
    serviceArea: 'Nashik - Mumbai - Pune Agricultural Corridor',
    languages: ['Hindi', 'Marathi'],
    availability: 'Full-time',
    idProofDoc: '',
    vehicleRcDoc: '',
    insuranceDoc: '',
    agreedToTerms: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.warn('Draft load error', e);
    }
  }, []);

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      showToast('info', 'Draft Saved', 'Your application progress has been saved locally.');
    } catch (e) {
      console.error('Draft save error', e);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
      if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
        newErrors.phone = 'Valid 10-digit mobile number required';
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        newErrors.email = 'Valid email address required';
      }
      if (!formData.vehicleRegNumber.trim()) {
        newErrors.vehicleRegNumber = 'Vehicle registration number required (e.g. MH 15 AB 1234)';
      }
      if (!formData.vehicleCapacityKg || formData.vehicleCapacityKg <= 0) {
        newErrors.vehicleCapacityKg = 'Please enter a valid payload capacity';
      }
    } else if (currentStep === 2) {
      if (!formData.location.trim()) newErrors.location = 'Current base location required';
      if (!formData.serviceArea.trim()) newErrors.serviceArea = 'Service corridor / area required';
      if (formData.languages.length === 0) newErrors.languages = 'Select at least one spoken language';
    } else if (currentStep === 3) {
      if (!formData.agreedToTerms) {
        newErrors.agreedToTerms = 'You must accept the Carrier Service Agreement';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      saveDraft();
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleLanguageToggle = (lang: string) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(lang);
      const next = exists ? prev.languages.filter((l) => l !== lang) : [...prev.languages, lang];
      return { ...prev, languages: next };
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setSubmitting(true);
    try {
      const res = await submitLogisticsRegistration(formData);
      setSubmittedAppId(res.applicationId);
      localStorage.removeItem(DRAFT_KEY);
      showToast('success', 'Application Submitted', 'Your registration is in the admin review queue.');
    } catch (e: any) {
      showToast('error', 'Submission Failed', e.message || 'Error submitting application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-mono font-bold">
          <Truck className="w-3.5 h-3.5" />
          <span>CARRIER ONBOARDING PORTAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Become a VAYORA Logistics Partner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Transport fresh farm harvests across direct mandi corridors with guaranteed escrow payment upon verified delivery.
        </p>
      </div>

      {/* Progress Stepper Bar */}
      {!submittedAppId && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-soft">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              { num: 1, label: 'Contact & Vehicle' },
              { num: 2, label: 'Service Territory' },
              { num: 3, label: 'KYC Documents' },
              { num: 4, label: 'Review & Submit' },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className={`flex flex-col items-center space-y-1 ${
                  s.num <= step ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step === s.num
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-100 font-extrabold shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[11px] font-bold truncate max-w-full ${step >= s.num ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Application Success Card */}
      {submittedAppId ? (
        <Card className="p-8 sm:p-10 text-center space-y-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-200 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-900">Application Submitted!</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Your carrier onboarding submission has been received under Application ID:
            </p>
            <span className="font-mono font-black text-emerald-900 text-base bg-emerald-100 px-3 py-1 rounded-xl inline-block">
              {submittedAppId}
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs text-slate-600 max-w-md mx-auto space-y-2 text-left">
            <div className="flex justify-between">
              <span>Primary Phone:</span>
              <span className="font-bold text-slate-900">{formData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span>Vehicle Type:</span>
              <span className="font-bold text-slate-900">{formData.vehicleType}</span>
            </div>
            <div className="flex justify-between">
              <span>Operational Corridor:</span>
              <span className="font-bold text-slate-900">{formData.serviceArea}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You will receive an SMS notification as soon as your KYC documents are approved. You can then sign in to the Logistics Console.
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <Link to="/logistics/login">
              <Button variant="primary" size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">
                Go to Partner Sign In
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Multi-Step Wizard Body */
        <Card className="p-6 sm:p-8 space-y-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Step 1: Driver & Vehicle Specifications</h3>
                <p className="text-xs text-slate-500">Provide your personal contact and vehicle details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Full Legal Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                  {errors.fullName && <p className="text-[11px] text-red-500 font-bold">{errors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Primary Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold font-mono outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                  {errors.phone && <p className="text-[11px] text-red-500 font-bold">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ramesh.patil@logistics.com"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Vehicle Type *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e: any) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="Pickup Truck (Tata Ace)">Pickup Truck (Tata Ace / Mahindra Bolero)</option>
                    <option value="3-wheeler (Auto)">3-Wheeler Auto (Piaggio / Bajaj)</option>
                    <option value="Medium Truck (14ft)">Medium Truck (14ft / 17ft Eicher)</option>
                    <option value="Heavy Multi-Axle">Heavy Multi-Axle Truck (10-16 wheels)</option>
                    <option value="Reefer (Cold Chain)">Reefer Insulated Van (Cold Chain)</option>
                    <option value="2-wheeler">2-Wheeler (Express Sample Courier)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Max Payload Capacity (kg) *</label>
                  <input
                    type="number"
                    step="100"
                    value={formData.vehicleCapacityKg}
                    onChange={(e) => setFormData({ ...formData, vehicleCapacityKg: Number(e.target.value) })}
                    placeholder="1000"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold font-mono outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                  {errors.vehicleCapacityKg && <p className="text-[11px] text-red-500 font-bold">{errors.vehicleCapacityKg}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    value={formData.vehicleRegNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleRegNumber: e.target.value.toUpperCase() })}
                    placeholder="MH 15 AB 1234"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono font-bold uppercase outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                  {errors.vehicleRegNumber && <p className="text-[11px] text-red-500 font-bold">{errors.vehicleRegNumber}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Step 2: Operating Territory & Availability</h3>
                <p className="text-xs text-slate-500">Define your primary service corridors and languages.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Base Location / Hub *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Nashik APMC Yard, Maharashtra"
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-amber-500"
                  />
                  {errors.location && <p className="text-[11px] text-red-500 font-bold">{errors.location}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Primary Service Corridor *</label>
                  <select
                    value={formData.serviceArea}
                    onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="Nashik - Mumbai - Pune Agricultural Corridor">Nashik - Mumbai - Pune Agricultural Corridor</option>
                    <option value="Nagpur - Amravati - Hyderabad Corridor">Nagpur - Amravati - Hyderabad Corridor</option>
                    <option value="Indore - Bhopal - Surat Freight Belt">Indore - Bhopal - Surat Freight Belt</option>
                    <option value="Bengaluru - Kolar - Chennai Fresh Belt">Bengaluru - Kolar - Chennai Fresh Belt</option>
                    <option value="Punjab - Haryana - Delhi NCR Mandi Corridor">Punjab - Haryana - Delhi NCR Mandi Corridor</option>
                    <option value="All-India Flexible Long-Haul">All-India Flexible Long-Haul</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">Languages Spoken *</label>
                  <div className="flex flex-wrap gap-2">
                    {['Hindi', 'English', 'Marathi', 'Telugu', 'Tamil', 'Kannada', 'Gujarati', 'Punjabi'].map((lang) => {
                      const isSelected = formData.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleLanguageToggle(lang)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-200 shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? `✓ ${lang}` : lang}
                        </button>
                      );
                    })}
                  </div>
                  {errors.languages && <p className="text-[11px] text-red-500 font-bold">{errors.languages}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Availability Commitment *</label>
                  <select
                    value={formData.availability}
                    onChange={(e: any) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="Full-time">Full-time (Dedicated Dedicated Fleet)</option>
                    <option value="Part-time">Part-time (Peak Morning / Evening Mandi Windows)</option>
                    <option value="Flexible Corridor">Flexible Corridor (On-Demand Dispatch)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Step 3: Verification & Regulatory Documents</h3>
                <p className="text-xs text-slate-500">Upload official documents for administrative KYC review.</p>
              </div>

              <div className="space-y-4">
                <FileUploadInput
                  label="1. Driver ID Proof (Aadhaar / Driving License)"
                  description="Clear photo of front & back of Aadhaar or Commercial DL"
                  onFileSelected={(data) => setFormData({ ...formData, idProofDoc: data })}
                />

                <FileUploadInput
                  label="2. Vehicle Registration Certificate (RC Book)"
                  description="Vehicle RC showing commercial / transport category"
                  onFileSelected={(data) => setFormData({ ...formData, vehicleRcDoc: data })}
                />

                <FileUploadInput
                  label="3. Commercial Goods Transit Insurance (Optional)"
                  description="Valid third-party or comprehensive cargo insurance policy"
                  onFileSelected={(data) => setFormData({ ...formData, insuranceDoc: data })}
                />

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreedToTerms}
                      onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-800 font-medium leading-relaxed">
                      I agree to the VAYORA Carrier Service Agreement, zero-tampering farm produce policy, and understand that freight payments are disbursed directly to my bank account upon QR/OTP delivery verification.
                    </span>
                  </label>
                  {errors.agreedToTerms && (
                    <p className="text-[11px] text-red-600 font-bold pl-6">{errors.agreedToTerms}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Step 4: Review Your Application Dossier</h3>
                <p className="text-xs text-slate-500">Confirm all information before sending to the approval queue.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Driver & Vehicle</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{formData.fullName}</p>
                  <p className="text-slate-600 font-mono">{formData.phone} • {formData.email}</p>
                  <p className="text-slate-700 mt-1 font-semibold">
                    {formData.vehicleType} • Payload: {formData.vehicleCapacityKg} kg • RC: {formData.vehicleRegNumber}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Service Operating Area</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formData.serviceArea}</p>
                  <p className="text-slate-600">Base: {formData.location} • Shift: {formData.availability}</p>
                  <p className="text-slate-600 mt-0.5">Languages: {formData.languages.join(', ')}</p>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">KYC Attachments</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {formData.idProofDoc ? '✓ ID Proof' : '✕ ID Missing'} •{' '}
                      {formData.vehicleRcDoc ? '✓ RC Book' : '✕ RC Missing'} •{' '}
                      {formData.insuranceDoc ? '✓ Insurance' : '– No Insurance'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    Terms Accepted
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="min-h-[44px] text-xs font-bold"
              >
                Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={saveDraft}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
            )}

            {step < 4 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20"
              >
                Continue to Step {step + 1}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                isLoading={submitting}
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20"
              >
                Submit Application for Approval
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
