import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Offer } from '../../types';
import { getOffersByFarmer, updateOfferStatus } from '../../services/offerService';
import { getProduceById } from '../../services/produceService';
import {
  Tag,
  CheckCircle2,
  XCircle,
  MessageSquare,
  MapPin,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatINR, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const OffersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadOffers = async () => {
    if (user) {
      setLoading(true);
      try {
        const list = await getOffersByFarmer(user.id);
        setOffers(list);
      } catch (err) {
        console.error('Error fetching farmer offers', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOffers();
    window.addEventListener('vayora_offers_updated', loadOffers);
    return () => window.removeEventListener('vayora_offers_updated', loadOffers);
  }, [user]);

  const handleAction = async (offerId: string, action: 'ACCEPTED' | 'REJECTED') => {
    setProcessingId(offerId);
    try {
      await updateOfferStatus(offerId, action);
      showToast(
        action === 'ACCEPTED' ? 'success' : 'info',
        action === 'ACCEPTED' ? 'Offer Accepted & Order Generated!' : 'Offer Declined',
        action === 'ACCEPTED'
          ? 'Confirmed order created in your Orders queue with Escrow protection.'
          : 'Offer marked as declined.'
      );
      await loadOffers();
    } catch (e: any) {
      showToast('error', 'Action Failed', e.message || 'Could not update offer status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-700" />
            Buyer Offer Negotiation Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming direct procurement offers from verified retail buyers and commercial networks.
          </p>
        </div>

        <span className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <strong>{offers.filter((o) => o.status === 'PENDING').length}</strong> Pending Decision
        </span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
          <RefreshCw className="w-5 h-5 text-brand-700 animate-spin mx-auto" />
          <p className="text-xs">Loading offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
          <Tag className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No buyer offers received yet.</p>
          <p className="text-xs text-slate-500">
            Active produce listings on the marketplace will receive buyer offers here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offers.map((offer) => {
            const isPending = offer.status === 'PENDING';
            const totalValue = offer.offeredPrice * (offer.requestedQuantity || offer.quantity);

            return (
              <Card key={offer.id} className="p-6 space-y-4 border-slate-200">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-slate-500" />
                      {offer.buyerName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {offer.buyerOrganization || 'Verified Commercial Buyer'}
                    </p>
                  </div>

                  <Badge
                    variant={
                      offer.status === 'ACCEPTED'
                        ? 'green'
                        : offer.status === 'REJECTED'
                        ? 'red'
                        : 'amber'
                    }
                    size="md"
                  >
                    {offer.status}
                  </Badge>
                </div>

                {/* Offer Details Grid */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Produce Lot:</span>
                    <span className="font-bold text-slate-900">{offer.cropName}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Requested Quantity:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {offer.requestedQuantity || offer.quantity} kg
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Offered Price:</span>
                    <span className="font-mono font-extrabold text-emerald-800 text-sm">
                      {formatINR(offer.offeredPrice)}/kg
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 font-bold border-t border-slate-200 pt-2">
                    <span>Total Deal Value:</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {formatINR(totalValue)}
                    </span>
                  </div>

                  {offer.distanceKm && (
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>Buyer Transit Distance:</span>
                      <span className="font-mono">~{offer.distanceKm} km</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Submitted On:</span>
                    <span>{formatDateTime(offer.createdAt)}</span>
                  </div>
                </div>

                {/* Message */}
                {offer.message && (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-slate-600 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-700 shrink-0 mt-0.5" />
                    <span>"{offer.message}"</span>
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleAction(offer.id, 'ACCEPTED')}
                      disabled={processingId === offer.id}
                      isLoading={processingId === offer.id}
                    >
                      Accept & Create Order
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      leftIcon={<XCircle className="w-4 h-4" />}
                      onClick={() => handleAction(offer.id, 'REJECTED')}
                      disabled={processingId === offer.id}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
