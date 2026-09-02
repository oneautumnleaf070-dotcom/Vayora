export type UserRole = 'FARMER' | 'FPO' | 'BUYER' | 'LOGISTICS' | 'ADMIN';

export type ProduceCategory = 'VEGETABLES' | 'FRUITS' | 'GRAINS' | 'PULSES' | 'SPICES' | 'ORGANIC';

export type QualityGrade = 'Grade A (Export)' | 'Grade A' | 'Grade B' | 'Grade C' | 'Certified Organic';

export type ProduceStatus = 
  | 'DRAFT' 
  | 'ACTIVE' 
  | 'SOLD_OUT' 
  | 'EXPIRED' 
  | 'INACTIVE' 
  | 'AVAILABLE' 
  | 'UNDER_NEGOTIATION' 
  | 'DELISTED';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'EXPIRED' | 'CANCELLED';

export type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED' 
  | 'FARMER_CONFIRMATION_PENDING'
  | 'CONFIRMED'
  | 'LOGISTICS_ASSIGNED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'CANCELLED'
  | 'PLACED' 
  | 'FARMER_CONFIRMED';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAID'
  | 'HELD_IN_ESCROW' 
  | 'RELEASED_TO_FARMER' 
  | 'REFUNDED' 
  | 'FAILED';

export interface LocationCoords {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  organizationName?: string;
  location: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  avatar?: string;
  rating?: number;
  totalDeals?: number;
  // Logistics specific fields (Phase 5)
  vehicleType?: string;
  vehicleCapacity?: number;
  availabilityStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentLatitude?: number;
  currentLongitude?: number;
  createdAt: string;
}

export interface Farm {
  id: string;
  farmerId: string;
  farmName: string;
  location: string;
  latitude: number;
  longitude: number;
  acreage: number;
  soilType?: string;
  irrigationType?: string;
  primaryCrops: string[];
}

export interface Produce {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerType: 'FARMER' | 'FPO';
  organizationName?: string;
  cropName: string;
  variety?: string;
  category: ProduceCategory;
  quantity: number; // in kg/quintals
  availableQuantity: number;
  unit: 'kg' | 'quintal' | 'tonne' | 'crates';
  qualityGrade: QualityGrade;
  expectedPrice: number; // in INR per unit
  aiRecommendedPrice?: number;
  aiMinimumPrice?: number;
  aiMaximumPrice?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  mandiBenchmarkPrice?: number;
  demandLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  demandForecast?: {
    day: string;
    expectedDemand: number;
    projectedPrice: number;
  }[];
  aiExplanation?: string;
  harvestDate: string;
  expiryDate: string;
  location: string;
  latitude: number;
  longitude: number;
  images: string[];
  status: ProduceStatus;
  organicCertified?: boolean;
  createdAt: string;
  updatedAt?: string;
  verifiedSeller: boolean;
}

export interface Offer {
  id: string;
  produceId: string;
  cropName: string;
  farmerId: string;
  buyerId: string;
  buyerName: string;
  buyerOrganization?: string;
  buyerPhone?: string;
  offeredPrice: number; // in INR per unit
  quantity: number;
  requestedQuantity?: number;
  totalOfferedAmount: number;
  message?: string;
  status: OfferStatus;
  counterPrice?: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BulkSubOrderSupplier {
  supplierId: string;
  supplierName: string;
  supplierRole: 'FARMER' | 'FPO';
  produceId: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  location: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  verified: boolean;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerOrganization?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerType?: 'FARMER' | 'FPO';
  produceId: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  
  // 100% Transparent Price Breakdown
  produceAmount: number;    // Amount directly for the farmer
  farmerAmount?: number;    // Alias for produceAmount
  logisticsFee: number;     // Fair logistics rate
  logisticsAmount?: number; // Alias for logisticsFee
  platformFee: number;      // Fixed minimal operational fee (e.g. ₹100 or 1-2%)
  totalAmount: number;      // What the buyer pays (sum of the above, NO middleman cut)
  
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  pickupLocation: string;
  deliveryLocation: string;
  pickupCoords: LocationCoords;
  deliveryCoords: LocationCoords;
  
  logisticsPartnerId?: string;
  logisticsPartnerName?: string;
  logisticsPhone?: string;
  vehicleNumber?: string;
  
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  // Security & Verification
  deliveryOtp: string; // 6-digit OTP given to buyer, entered by logistics
  pickupOtp?: string;  // OTP given to farmer
  qrCode: string;      // Signed QR payload for scanner handoff
  
  // Multi-Supplier Bulk Aggregation
  isBulkOrder?: boolean;
  bulkSuppliers?: BulkSubOrderSupplier[];
  
  timeline: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  settlementStatus?: 'ESCROW_LOCKED' | 'READY_FOR_SETTLEMENT' | 'SETTLED';
  verifiedAt?: string;
  verifiedBy?: string;
  verificationMethod?: 'QR' | 'OTP' | 'QR_SCAN' | 'OTP_ENTRY' | 'DUAL_VERIFIED';
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  farmerId: string;
  amount: number;
  platformFee: number;
  farmerAmount: number;
  logisticsFee: number;
  paymentMethod: 'UPI' | 'NET_BANKING' | 'CARD' | 'ESCROW_WALLET';
  paymentStatus: PaymentStatus;
  transactionId: string;
  gatewayReference?: string;
  createdAt: string;
  releasedAt?: string;
}

export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'PICKUP_PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryWaypoint {
  supplierId: string;
  supplierName: string;
  produceId: string;
  quantity: number;
  location: string;
  latitude: number;
  longitude: number;
  pickedUp?: boolean;
  pickedUpAt?: string;
  pickupOtp?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  buyerId?: string;
  farmerId?: string;
  cropName?: string;
  quantity?: number;
  unit?: string;
  logisticsPartnerId: string;
  logisticsPartnerName?: string;
  logisticsPhone?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  vehicleNumber?: string;

  pickupLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupCoords?: LocationCoords;

  deliveryLocation: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryCoords?: LocationCoords;

  waypoints?: DeliveryWaypoint[]; // Multi-supplier pickup corridor A -> B -> C -> D

  optimizedRoute?: any;
  distanceKm: number;
  estimatedTimeMinutes: number;
  estimatedDistanceKm?: number;
  estimatedTimeMins?: number;

  status: DeliveryStatus;

  assignedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;

  pickupOtp?: string;
  deliveryOtp?: string;
  qrCode?: string;

  currentLatitude?: number;
  currentLongitude?: number;
  isDemoRoute?: boolean;

  createdAt?: string;
  updatedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED';
  verificationMethod?: 'QR' | 'OTP' | 'QR_SCAN' | 'OTP_ENTRY' | 'DUAL_VERIFIED';
  qrToken?: string;
  qrTokenHash?: string;
  otpHash?: string;
  otpExpiresAt?: string;
}

export interface AIPriceRecommendation {
  cropName: string;
  recommendedPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  mandiBenchmarkPrice: number;
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  seasonalFactor: string;
  confidenceScore: number; // e.g. 0.94
  demandForecast: {
    day: string;
    expectedDemand: number; // 0-100 index
    projectedPrice: number;
  }[];
  explanation: string;
  suggestedAction: 'Sell Immediately (Peak Demand)' | 'Hold 2-3 Days' | 'List for Bulk Matching' | 'Moderate Market Demand';
  breakdown: {
    qualityPremium: number;
    mandiAverage: number;
    demandAdjustment: number;
    directBuyerAdvantage: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'OFFER' | 'PRICE_ALERT' | 'LOGISTICS' | 'PAYMENT' | 'SYSTEM';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface BulkMatchResult {
  cropName: string;
  requiredQuantity: number;
  unit: string;
  isFullyMatched: boolean;
  totalSuppliedQuantity: number;
  suppliers: BulkSubOrderSupplier[];
  estimatedTotalProduceCost: number;
  averagePricePerKg: number;
  combinedLogisticsSavingsEstimate: number;
  estimatedTransitDistanceKm: number;
}
