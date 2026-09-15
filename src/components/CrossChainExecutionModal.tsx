import React, { useEffect, useState } from 'react';
import { CrossChainExecutionStatus } from '../types';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress } from '../lib/utils';
import {
  X,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { ChainLogo } from './CryptoIcon';

interface CrossChainExecutionModalProps {
  status: CrossChainExecutionStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CrossChainExecutionModal: React.FC<CrossChainExecutionModalProps> = ({
  status: initialStatus,
  isOpen,
  onClose,
}) => {
  const [currentStatus, setCurrentStatus] = useState<CrossChainExecutionStatus | null>(initialStatus);

  useEffect(() => {
    setCurrentStatus(initialStatus);
  }, [initialStatus]);

  // Poll for live status progression if still in flight
  useEffect(() => {
    if (!isOpen || !currentStatus || currentStatus.status === 'COMPLETED' || currentStatus.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crosschain/track/${currentStatus.intentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setCurrentStatus(data.status);
          }
        }
      } catch {
        // Continue polling
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, currentStatus?.intentId, currentStatus?.status]);

  if (!isOpen || !currentStatus) return null;

  const fromChainInfo = SUPPORTED_CHAINS[currentStatus.fromChain] || SUPPORTED_CHAINS.ethereum;
  const toChainInfo = SUPPORTED_CHAINS[currentStatus.toChain] || SUPPORTED_CHAINS.arbitrum;

  const isCompleted = currentStatus.status === 'COMPLETED';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#0B0F17] border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#070A10]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isCompleted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/15 text-cyan-400 border border-blue-500/30'}`}>
              {isCompleted ? <Sparkles className="w-5 h-5" /> : <Zap className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>{isCompleted ? 'Cross-Chain Transfer Finalized' : 'Cross-Chain Pipeline In-Flight'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'}`}>
                  {currentStatus.protocolName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Intent ID: {currentStatus.intentId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Asset Flow Visualizer */}
        <div className="px-6 py-5 bg-[#090D15] border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            {/* Source */}
            <div className="flex items-center gap-3">
              <ChainLogo chainId={fromChainInfo.id} className="w-9 h-9" />
              <div>
                <div className="text-xs text-slate-400 font-mono">{fromChainInfo.name}</div>
                <div className="text-base font-bold text-white font-mono">
                  {currentStatus.fromAmount} {currentStatus.fromToken}
                </div>
              </div>
            </div>

            {/* Middle Pipeline Arrow */}
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-1 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <ArrowRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1">ZK Tunnel</span>
            </div>

            {/* Destination */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-xs text-slate-400 font-mono">{toChainInfo.name}</div>
                <div className="text-base font-bold text-cyan-400 font-mono">
                  {currentStatus.expectedToAmount} {currentStatus.toToken}
                </div>
              </div>
              <ChainLogo chainId={toChainInfo.id} className="w-9 h-9" />
            </div>
          </div>
        </div>

        {/* Multi-Stage Lifecycle Pipeline */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          <div className="space-y-3">
            {currentStatus.steps.map((step) => {
              const isStepCompleted = step.status === 'completed';
              const isStepActive = step.status === 'active';

              return (
                <div
                  key={step.stepIndex}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    isStepCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : isStepActive
                      ? 'bg-blue-500/10 border-blue-500/40 shadow-md shadow-blue-950/40'
                      : 'bg-[#0F1420] border-white/5 opacity-50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isStepCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isStepActive ? (
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-mono text-slate-400">
                        {step.stepIndex}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold ${isStepCompleted ? 'text-emerald-300' : isStepActive ? 'text-white' : 'text-slate-400'}`}>
                        {step.name}
                      </h4>
                      {step.explorerUrl && (
                        <a
                          href={step.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
                        >
                          <span>{shortenAddress(step.txHash || '', 4)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cryptographic Intent Commitment */}
          <div className="p-3.5 rounded-xl bg-[#080B10] border border-white/5 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Cryptographic Intent Hash:</span>
            </div>
            <span className="text-slate-300 font-bold">{shortenAddress(currentStatus.intentHash, 8)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#070A10] border-t border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Multi-Validator Attested</span>
          </div>

          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-900/30'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            {isCompleted ? 'Close & View Ledger' : 'Dismiss (Runs in Background)'}
          </button>
        </div>
      </div>
    </div>
  );
};
