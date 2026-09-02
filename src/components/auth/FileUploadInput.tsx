import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileText, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export interface FileUploadInputProps {
  onFileSelected: (base64Data: string, fileName: string) => void;
  label: string;
  description?: string;
  accept?: string;
  maxSizeMb?: number;
  required?: boolean;
}

export const FileUploadInput: React.FC<FileUploadInputProps> = ({
  onFileSelected,
  label,
  description = 'PNG, JPG or PDF up to 5MB',
  accept = 'image/png,image/jpeg,image/jpg,application/pdf',
  maxSizeMb = 5,
  required = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileProcess = (file: File) => {
    setError(null);

    // Validate size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds the ${maxSizeMb}MB maximum limit.`);
      return;
    }

    setProcessing(true);
    setFileName(file.name);
    const isPdfFile = file.type === 'application/pdf';
    setIsPdf(isPdfFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      onFileSelected(result, file.name);
      setProcessing(false);
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
      setProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleClear = () => {
    setFileName(null);
    setPreviewUrl(null);
    setIsPdf(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelected('', '');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {fileName && (
          <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!fileName ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/30 text-slate-600 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          {processing ? (
            <RefreshCw className="w-6 h-6 text-brand-700 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
          )}
          <div className="text-center">
            <span className="font-bold text-xs text-slate-800 block">
              {processing ? 'Processing Document...' : 'Click to Upload or Drag & Drop'}
            </span>
            <span className="text-[10px] text-slate-400">{description}</span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isPdf ? (
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs truncate">{fileName}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">Document attached successfully</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
            aria-label="Remove document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};
