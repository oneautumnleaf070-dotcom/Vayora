import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  /** True while the exit animation is playing, just before real removal. */
  leaving?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Matches .animate-toast-out's duration in src/index.css — the toast stays
// mounted (marked `leaving`) for this long so the exit animation can play
// instead of the card vanishing instantly.
const TOAST_EXIT_MS = 200;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_EXIT_MS);
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-white border-l-4 border-l-brand-500 border-slate-200 text-slate-900',
            error: 'bg-white border-l-4 border-l-red-500 border-slate-200 text-slate-900',
            warning: 'bg-white border-l-4 border-l-amber-500 border-slate-200 text-slate-900',
            info: 'bg-white border-l-4 border-l-blue-500 border-slate-200 text-slate-900',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-elevated border ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'} ${bgColors[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => !toast.leaving && removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
