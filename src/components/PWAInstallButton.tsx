import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundManager } from '../lib/sound';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed and running in standalone mode, suppress button
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, suppress button
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    soundManager.playTick();
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await install();
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 hover:from-cyan-900/60 hover:to-blue-900/60 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all shadow-sm shadow-cyan-950/40 cursor-pointer animate-pulse hover:animate-none"
        title="Cài đặt HYPERON-DEX Web3 Trading Terminal dưới dạng ứng dụng PWA Native"
      >
        <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Cài App PWA</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* iOS Safari Guided Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0B101B] border border-cyan-500/30 p-6 shadow-2xl relative space-y-4 font-sans text-slate-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cài đặt trên iOS / Safari</h3>
                <p className="text-xs text-slate-400 font-mono">HYPERON-DEX Web3 PWA</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-black/40 rounded-2xl p-4 border border-white/5 font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Mở terminal trong trình duyệt <strong className="text-white">Safari</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Nhấn nút <Share2 className="w-4 h-4 text-cyan-400 inline" /> <strong className="text-white">Chia sẻ</strong> (Share) trên thanh điều hướng.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Cuộn xuống chọn <PlusSquare className="w-4 h-4 text-cyan-400 inline" /> <strong className="text-white">Thêm vào MH chính</strong> (Add to Home Screen).
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer hover:opacity-95"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
