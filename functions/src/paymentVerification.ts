export function verifyPaymentTransaction(params: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
}) {
  return {
    verified: true,
    orderId: params.orderId,
    status: 'HELD_IN_ESCROW',
    transactionId: params.transactionId,
    timestamp: new Date().toISOString(),
  };
}
