import React from 'react';
import { SwapQuote } from '../../types';
import { TokenLogo } from '../CryptoIcon';
import { shortenAddress } from '../../lib/utils';
import { SecurityBadge } from './SecurityBadge';
import { SecurityStatus, SimulationStatus, SIMULATION_STATUS_CONFIG } from '../../lib/designSystem';
import {
  ShieldCheck,
  Fuel,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
  Zap,
  Activity,
  ChevronRight,
} from 'lucide-react';

interface ConfirmationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quote: SwapQuote;
  simulationStatus: SimulationStatus;
  securityStatus: SecurityStatus;
  isBroadcasting?: boolean;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quote,
  simulationStatus,
  securityStatus,
  isBroadcasting = false,
}) => {
  if (!isOpen) return null;

  const simConfig = SIMULATION_STATUS_CONFIG[simulationStatus] || SIMULATION_STATUS_CONFIG.PASSED;
  const isSimFailed = simulationStatus === 'FAILED';

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#090D16] border border-white/[0.12] p-5 sm:p-6 shadow-2xl space-y-5 text-slate-200 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-extrabold text-base text-white tracking-tight">
                Review & Confirm Swap
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Pre-flight validation on {quote.chainId || 'Ethereum'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* You Pay vs You Receive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* You Pay */}
          <div className="p-3.5 rounded-2xl bg-[#0D121F] border border-white/[0.06] space-y-2">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">You Pay</div>
            <div className="flex items-center gap-2.5">
              <TokenLogo
                symbol={quote.fromToken.symbol}
                name={quote.fromToken.name}
                src={quote.fromToken.logoUrl}
                chainId={quote.fromToken.chainId}
                className="w-7 h-7"
              />
              <div>
                <div className="text-base font-extrabold text-white font-mono leading-none">
                  {quote.fromAmount ? quote.fromAmount.toLocaleString() : '1'} {quote.fromToken.symbol}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ≈ ${((quote.fromAmount || 1) * (quote.fromToken.priceUsd || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* You Receive */}
          <div className="p-3.5 rounded-2xl bg-[#0D121F] border border-cyan-500/20 space-y-2">
            <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">You Receive (Est.)</div>
            <div className="flex items-center gap-2.5">
              <TokenLogo
                symbol={quote.toToken.symbol}
                name={quote.toToken.name}
                src={quote.toToken.logoUrl}
                chainId={quote.toToken.chainId}
                className="w-7 h-7"
              />
              <div>
                <div className="text-base font-extrabold text-emerald-400 font-mono leading-none">
                  {quote.expectedOutput ? quote.expectedOutput.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'} {quote.toToken.symbol}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ≈ ${((quote.expectedOutput || 0) * (quote.toToken.priceUsd || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit & Pre-flight Invariants Table */}
        <div className="rounded-2xl bg-[#070A10] border border-white/[0.06] p-3.5 space-y-2.5 text-xs font-sans">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Exchange Rate</span>
            <span className="font-mono text-white font-semibold">
              1 {quote.fromToken.symbol} = {quote.executionPrice ? quote.executionPrice.toFixed(4) : '—'} {quote.toToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Minimum Received (Guaranteed)</span>
            <span className="font-mono text-slate-200 font-semibold">
              {quote.minimumReceived ? quote.minimumReceived.toFixed(4) : '—'} {quote.toToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Max Slippage Tolerance</span>
            <span className="font-mono text-slate-200 font-semibold">
              {quote.slippagePercent ? `${quote.slippagePercent}%` : '0.50%'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Price Impact</span>
            <span className={`font-mono font-bold ${parseFloat(quote.priceImpactBps || '0') > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {quote.priceImpactPercent ? `${quote.priceImpactPercent.toFixed(2)}%` : '< 0.05%'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Estimated Network Gas</span>
            <span className="font-mono text-slate-200 flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>${quote.estimatedGasUsd ? quote.estimatedGasUsd.toFixed(2) : '0.18'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Protocol Fee</span>
            <span className="font-mono text-slate-200 font-semibold">
              ${quote.routingFeeUsd ? quote.routingFeeUsd.toFixed(2) : '0.00'} (0.00%)
            </span>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-slate-400 font-medium">Security Validation</span>
            <SecurityBadge status={securityStatus} tokenSymbol={quote.toToken.symbol} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Pre-Flight Simulation</span>
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${simConfig.bg} ${simConfig.text} ${simConfig.border}`}>
              {simConfig.label}
            </span>
          </div>
        </div>

        {/* Warning if Simulation Failed */}
        {isSimFailed && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-rose-200">Simulation Reverted:</strong> The on-chain call reverted during pre-flight checks. Confirming this transaction will likely fail and waste network gas.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBroadcasting}
            className="flex-1 py-3 rounded-2xl border border-white/[0.08] hover:bg-white/[0.04] text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isBroadcasting || isSimFailed}
            className={`flex-2 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isSimFailed
                ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 hover:opacity-95 hover:shadow-cyan-500/30 active:scale-[0.99]'
            }`}
          >
            {isBroadcasting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Broadcasting to Network...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm & Sign in Wallet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
