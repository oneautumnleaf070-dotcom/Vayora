import React from 'react';
import { DeliveryStatus } from '../../types';
import { Check, Truck, Package, MapPin, Navigation, ShieldCheck, XCircle } from 'lucide-react';

export interface DeliveryStatusStepperProps {
  status: DeliveryStatus;
}

// Compact horizontal stepper for the logistics workflow state machine
// (Task 4): ASSIGNED -> PICKUP_PENDING -> PICKED_UP -> IN_TRANSIT -> ARRIVED -> DELIVERED.
const STEPS: { status: DeliveryStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'ASSIGNED', label: 'Assigned', icon: <Package className="w-3.5 h-3.5" /> },
  { status: 'PICKUP_PENDING', label: 'Pickup', icon: <Truck className="w-3.5 h-3.5" /> },
  { status: 'PICKED_UP', label: 'Picked Up', icon: <MapPin className="w-3.5 h-3.5" /> },
  { status: 'IN_TRANSIT', label: 'In Transit', icon: <Navigation className="w-3.5 h-3.5" /> },
  { status: 'ARRIVED', label: 'Arrived', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { status: 'DELIVERED', label: 'Delivered', icon: <Check className="w-3.5 h-3.5" /> },
];

export const DeliveryStatusStepper: React.FC<DeliveryStatusStepperProps> = ({ status }) => {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
        <XCircle className="w-4 h-4" />
        Mission Cancelled
      </div>
    );
  }

  // PENDING_ASSIGNMENT sits before step 0 — nothing is "reached" yet.
  const currentIndex = status === 'PENDING_ASSIGNMENT' ? -1 : STEPS.findIndex((s) => s.status === status);

  return (
    <div
      role="list"
      aria-label="Delivery progress"
      className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1"
    >
      {STEPS.map((step, idx) => {
        const isPassed = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === STEPS.length - 1;

        return (
          <React.Fragment key={step.status}>
            <div
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-col items-center gap-1 shrink-0 min-w-[52px]"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isPassed ? <Check className="w-3.5 h-3.5" /> : step.icon}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                  isCurrent ? 'text-amber-700' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 w-4 sm:w-6 shrink-0 rounded-full ${
                  idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
