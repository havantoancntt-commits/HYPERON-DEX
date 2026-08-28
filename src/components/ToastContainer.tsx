import React from 'react';
import { useExchange } from '../context/ExchangeContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useExchange();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          error: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
        };

        const borderColors = {
          success: 'border-emerald-500/30 bg-[#0A0A0A]/95',
          warning: 'border-amber-500/30 bg-[#0A0A0A]/95',
          error: 'border-rose-500/30 bg-[#0A0A0A]/95',
          info: 'border-blue-500/30 bg-[#0A0A0A]/95',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 text-xs transition-all animate-in slide-in-from-bottom-2 ${
              borderColors[toast.type]
            }`}
          >
            <div className="flex items-start gap-2.5">
              {icons[toast.type]}
              <div>
                <div className="font-semibold text-white">{toast.title}</div>
                <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">{toast.message}</div>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
