import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../common/Button';

export interface QRDisplayProps {
  payload: string;
  orderId: string;
  otp: string;
  size?: number;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({
  payload,
  orderId,
  otp,
  size = 180,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOTP = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft flex flex-col items-center text-center space-y-4">
      {/* Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>VAYORA Tamper-Proof Delivery Pass</span>
      </div>

      {/* QR Code Graphic */}
      <div className="p-3 bg-white border-2 border-dashed border-emerald-300 rounded-2xl shadow-inner">
        <QRCodeSVG
          value={payload}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/leaf.svg',
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            excavate: true,
          }}
        />
      </div>

      {/* Delivery OTP Box */}
      <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Buyer Handover OTP
        </p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-2xl font-mono font-extrabold tracking-widest text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
            {otp}
          </span>
          <button
            onClick={handleCopyOTP}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Copy OTP"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Show this QR or share the 6-digit OTP only upon physical inspection of produce.
        </p>
      </div>
    </div>
  );
};
