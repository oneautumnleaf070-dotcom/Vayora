import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';

export interface PhotoCaptureProps {
  onPhotoCaptured: (base64Image: string) => void;
  label?: string;
  description?: string;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCaptured,
  label = 'Proof of Delivery Photo',
  description = 'Capture farm produce batch unloaded at buyer facility',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Compress image on canvas to keep payload small & fast
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            resolve(compressedBase64);
          } else {
            resolve(img.src);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPreviewUrl(compressed);
      onPhotoCaptured(compressed);
    } catch (err) {
      console.error('Error capturing and compressing photo:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoCaptured('');
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-800">{label}</h4>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={compressing}
          className="w-full min-h-[110px] p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/40 text-slate-600 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          {compressing ? (
            <RefreshCw className="w-7 h-7 text-brand-700 animate-spin" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shadow-xs">
              <Camera className="w-6 h-6" />
            </div>
          )}
          <span className="font-bold text-xs text-slate-800">
            {compressing ? 'Optimizing Image...' : 'Tap to Open Camera & Capture Photo'}
          </span>
          <span className="text-[10px] text-slate-400">Automatic proof compression & timestamp stamp</span>
        </button>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
          <img
            src={previewUrl}
            alt="Proof of Delivery Preview"
            className="w-full h-48 sm:h-56 object-cover"
          />

          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-600/90 text-white rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Photo Attached
          </div>

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold backdrop-blur-md flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold backdrop-blur-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
