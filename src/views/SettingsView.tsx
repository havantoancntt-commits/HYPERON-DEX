import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { Settings, ShieldCheck, Fuel, Sliders, Globe, Moon, Lock, SlidersHorizontal, KeyRound } from 'lucide-react';
import { isAuthorizedDeployer } from '../lib/hyprConfig';

export const SettingsView: React.FC = () => {
  const { slippage, setSlippage, mevProtected, setMevProtected, gasSpeed, setGasSpeed, address } = useWallet();
  const { addToast, setActiveView } = useExchange();
  const isAdmin = isAuthorizedDeployer(address);

  const handleSave = () => {
    addToast({
      title: 'Preferences Saved',
      message: 'Network and trading configurations updated successfully.',
      type: 'success',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Settings className="w-5 h-5" />
            </span>
            Platform & Security Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure default slippage tolerance, gas estimation profiles, and private mempool protection.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-6 shadow-xl">
        {/* Slippage */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white">Default Swap Slippage Tolerance</div>
          <div className="flex items-center gap-2 font-mono text-xs">
            {[0.1, 0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  slippage === s
                    ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                    : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Gas Speed */}
        <div className="space-y-2 pt-4 border-t border-white/5">
          <div className="text-xs font-semibold text-white">Transaction Gas Priority</div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            {(['standard', 'fast', 'instant'] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => setGasSpeed(speed)}
                className={`py-2 rounded-xl transition-colors capitalize cursor-pointer ${
                  gasSpeed === speed
                    ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                    : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {speed} ({speed === 'standard' ? '18 Gwei' : speed === 'fast' ? '22 Gwei' : '30 Gwei'})
              </button>
            ))}
          </div>
        </div>

        {/* MEV Shield Toggle */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> Flashbots MEV Protection
            </div>
            <div className="text-[11px] text-slate-400">
              Transmit transaction payloads through private RPC builders to prevent front-running.
            </div>
          </div>
          <button
            onClick={() => setMevProtected(!mevProtected)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              mevProtected ? 'bg-blue-600' : 'bg-[#181818] border border-white/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                mevProtected ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Protocol Admin Portal Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#0E1322] to-[#121A2E] border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Cổng Quản Trị Hệ Thống (Protocol Admin Portal)</span>
                  {isAdmin ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-white/10">
                      SECURE GATE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Dành riêng cho Quản trị viên Super Admin để quản lý Treasury, Mainnet Deployer, Circuit Breaker và Tokenomics.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveView('admin-console')}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Mở Bảng Admin' : 'Truy Cập Cổng Admin'}</span>
            </button>
          </div>
        </div>

        {/* Disclaimers & Non-Custody Notice */}
        <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-2 text-xs text-slate-400 leading-relaxed">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" /> Non-Custodial Legal & Risk Notice
          </div>
          <p>
            HYPERON DEX is an institutional-grade open-source decentralized exchange aggregator and AI intelligence terminal. Smart contracts operate strictly without custody of your private cryptographic keys. All trading actions, liquidity provisions, and yield strategies are non-reversible once broadcast to finalized blockchain blocks.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};
