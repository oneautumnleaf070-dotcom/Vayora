import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Camera, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseAndVerifyQRPayload, verifyOTPOnly, VerificationResult } from '../../services/qrService';
import confetti from 'canvas-confetti';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  expectedOtp?: string;
  onVerificationSuccess: (result: VerificationResult) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  orderId,
  expectedOtp = '',
  onVerificationSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'otp'>('qr');
  const [otpInput, setOtpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const qrReaderRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'qr') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const startScanner = async () => {
    setErrorMsg('');
    setCameraPermissionError(false);
    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode('reader-element');
      }

      await qrReaderRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRDecoded(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
      setIsScanning(true);
    } catch (e) {
      console.warn('Camera could not be started or permission denied.', e);
      setCameraPermissionError(true);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrReaderRef.current && isScanning) {
      try {
        await qrReaderRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsScanning(false);
    }
  };

  const handleQRDecoded = (decodedText: string) => {
    stopScanner();
    const result = parseAndVerifyQRPayload(decodedText, orderId);
    if (result.isValid) {
      triggerSuccess(result);
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleManualOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
      return;
    }
    const result = verifyOTPOnly(otpInput, expectedOtp, orderId);
    if (result.isValid) {
      triggerSuccess(result);
    } else {
      setErrorMsg(result.message);
    }
  };

  const triggerSuccess = (result: VerificationResult) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    onVerificationSuccess(result);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delivery Handover Verification" maxWidth="md">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'qr'
                ? 'border-brand-600 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('otp')}
            className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'otp'
                ? 'border-brand-600 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Enter 6-Digit OTP</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Live QR Scanner */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-slate-200 aspect-square max-w-[280px] mx-auto flex items-center justify-center text-white">
              <div id="reader-element" className="w-full h-full"></div>
              {cameraPermissionError && (
                <div className="absolute inset-0 bg-slate-900 p-4 flex flex-col items-center justify-center text-center space-y-2">
                  <Camera className="w-8 h-8 text-slate-400" />
                  <p className="text-xs text-slate-300">
                    Camera permission unavailable or denied.
                  </p>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    Please switch to the 6-Digit OTP tab above.
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Align the recipient's VAYORA QR code within the camera viewfinder.
            </p>
          </div>
        )}

        {/* Tab 2: Manual OTP Input */}
        {activeTab === 'otp' && (
          <form onSubmit={handleManualOTPSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Enter Buyer's 6-Digit Handover Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="● ● ● ● ● ●"
                className="w-full text-center text-2xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none bg-white"
                autoFocus
              />
            </div>

            <Button type="submit" variant="primary" className="w-full bg-brand-700 hover:bg-brand-800" size="lg">
              Verify Handover Code
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};
