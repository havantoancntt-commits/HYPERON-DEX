import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-rose-950/90 border-b border-rose-500/40 text-rose-200 px-4 py-2.5 text-xs font-mono flex items-center justify-center gap-3 backdrop-blur-md sticky top-0 z-50 animate-in fade-in duration-200 shadow-lg shadow-rose-950/50">
      <WifiOff className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
      <div className="flex items-center gap-2">
        <span className="font-bold text-white uppercase tracking-wider">Mất Kết Nối Mạng (Offline)</span>
        <span className="hidden sm:inline text-rose-300">|</span>
        <span className="text-rose-300 hidden sm:inline">
          Giao dịch, ký swap và cập nhật giá bị vô hiệu hóa an toàn (Fail-Closed) cho đến khi kết nối internet được khôi phục.
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-auto text-[10px] bg-rose-900/60 px-2 py-0.5 rounded border border-rose-400/30 text-rose-200 font-bold">
        <AlertTriangle className="w-3 h-3 text-rose-300" />
        <span>FAIL-CLOSED ACTIVE</span>
      </div>
    </div>
  );
};
