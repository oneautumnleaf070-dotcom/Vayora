import { PaymentTransaction, PaymentStatus } from '../types';
import { generateTransactionId } from '../utils/helpers';

export interface PriceBreakdownResult {
  produceAmount: number;
  logisticsFee: number;
  platformFee: number;
  totalAmount: number;
  farmerPayout: number;
  traditionalMandiIntermediaryCut: number;
  directSavingsPercentage: number;
}

export function calculatePriceBreakdown(
  quantityKg: number,
  pricePerKg: number,
  distanceKm: number = 120
): PriceBreakdownResult {
  const produceAmount = Math.round(quantityKg * pricePerKg);
  
  // Fair, standardized freight calculation based on distance & weight
  const baseFreight = 250;
  const distanceRate = distanceKm * 2.2;
  const weightFactor = Math.max(1, quantityKg / 250);
  const logisticsFee = Math.round(baseFreight + (distanceRate * 0.7 * Math.sqrt(weightFactor)));
  
  // Transparent platform maintenance fee
  const platformFee = Math.min(100, Math.max(50, Math.round(produceAmount * 0.01)));
  
  const totalAmount = produceAmount + logisticsFee + platformFee;
  const farmerPayout = produceAmount;

  // Intermediary comparison metric
  const traditionalMandiIntermediaryCut = Math.round(produceAmount * 0.35);
  const directSavingsPercentage = Math.round((traditionalMandiIntermediaryCut / (totalAmount + traditionalMandiIntermediaryCut)) * 100);

  return {
    produceAmount,
    logisticsFee,
    platformFee,
    totalAmount,
    farmerPayout,
    traditionalMandiIntermediaryCut,
    directSavingsPercentage,
  };
}

export interface ProcessPaymentParams {
  orderId: string;
  buyerId: string;
  farmerId: string;
  breakdown: PriceBreakdownResult;
  paymentMethod: 'UPI' | 'NET_BANKING' | 'CARD' | 'ESCROW_WALLET';
  upiId?: string;
  cardNumber?: string;
}

export async function processTestPayment(params: ProcessPaymentParams): Promise<PaymentTransaction> {
  const txn: PaymentTransaction = {
    id: `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    orderId: params.orderId,
    buyerId: params.buyerId,
    farmerId: params.farmerId,
    amount: params.breakdown.totalAmount,
    platformFee: params.breakdown.platformFee,
    farmerAmount: params.breakdown.produceAmount,
    logisticsFee: params.breakdown.logisticsFee,
    paymentMethod: params.paymentMethod,
    paymentStatus: 'HELD_IN_ESCROW',
    transactionId: generateTransactionId(),
    gatewayReference: `ESCROW_LOCKED_${params.paymentMethod}`,
    createdAt: new Date().toISOString(),
  };

  return txn;
}

export function releaseEscrowToFarmer(txn: PaymentTransaction): PaymentTransaction {
  return {
    ...txn,
    paymentStatus: 'RELEASED_TO_FARMER' as PaymentStatus,
    releasedAt: new Date().toISOString(),
  };
}
