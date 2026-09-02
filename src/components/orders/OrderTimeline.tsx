import React from 'react';
import { OrderStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ShieldCheck,
  MapPin,
  CheckCheck,
} from 'lucide-react';
import { formatDateTime } from '../../utils/helpers';

export interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timeline: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
}

const STEPS: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'PLACED', label: 'Order Placed', icon: <Package className="w-4 h-4" /> },
  { status: 'PAYMENT_CONFIRMED', label: 'Payment Escrowed', icon: <ShieldCheck className="w-4 h-4" /> },
  { status: 'FARMER_CONFIRMED', label: 'Farmer Prepared', icon: <CheckCircle2 className="w-4 h-4" /> },
  { status: 'LOGISTICS_ASSIGNED', label: 'Logistics Assigned', icon: <Truck className="w-4 h-4" /> },
  { status: 'PICKED_UP', label: 'Produce Picked Up', icon: <MapPin className="w-4 h-4" /> },
  { status: 'IN_TRANSIT', label: 'In Transit', icon: <Truck className="w-4 h-4" /> },
  { status: 'DELIVERED', label: 'Verified & Delivered', icon: <CheckCheck className="w-4 h-4" /> },
];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ currentStatus, timeline }) => {
  const getStepIndex = (status: OrderStatus) => {
    return STEPS.findIndex((s) => s.status === status);
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-700" />
          Live Order & Verification Timeline
        </h4>
        <span className="text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
          Status: {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {STEPS.map((step, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const matchedTimelineItem = timeline.find((t) => t.status === step.status);

          return (
            <div key={step.status} className="relative flex items-start gap-4">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isCurrent
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 animate-pulse'
                    : isPassed
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>

              {/* Step Details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h5
                    className={`text-xs font-bold ${
                      isPassed ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </h5>
                  {matchedTimelineItem && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatDateTime(matchedTimelineItem.timestamp)}
                    </span>
                  )}
                </div>

                {matchedTimelineItem?.note && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {matchedTimelineItem.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
