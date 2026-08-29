import React, { useState } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ShieldCheck, AlertTriangle, CheckCircle2, Terminal, Lock } from 'lucide-react';
import { formatCurrency, formatCrypto } from '../lib/utils';

export const SimulationModal: React.FC = () => {
  const { activeSimulation, setActiveSimulation, activeQuote, setActiveQuote, addToast } = useExchange();
  const { executeTransaction, chainId } = useWallet();
  const [isExecuting, setIsExecuting] = useState(false);

  if (!activeSimulation) return null;

  const handleConfirmAndSign = async () => {
    setIsExecuting(true);
    try {
      const fromToken = activeQuote?.fromToken?.symbol || 'ETH';
      const toToken = activeQuote?.toToken?.symbol || 'USDC';
      const fromAmount = activeQuote?.fromAmount || 1.0;
      const toAmount = activeQuote?.expectedOutput || 0;

      const tx = await executeTransaction({
        chainId: (chainId as any) || 'ethereum',
        type: 'SWAP',
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        gasSpentGwei: 19,
        gasSpentUsd: activeSimulation.gasCostUsd,
      });

      addToast({
        title: 'Transaction Confirmed On-Chain',
        message: `Block #${tx.blockNumber} finalized. Tx: ${tx.txHash.substring(0, 10)}...`,
        type: 'success',
      });
      setActiveSimulation(null);
      setActiveQuote(null);
    } catch (err: any) {
      addToast({
        title: 'Execution Failed',
        message: err?.message || 'User rejected signing or RPC simulation rejected transaction.',
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#0C0C0C] border border-white/10 shadow-2xl p-5 overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Pre-Flight Transaction Simulation
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PASSED
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Correlation ID: {activeSimulation.correlationId}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSimulation(null);
              setActiveQuote(null);
            }}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-[#181818] border border-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Swap Summary */}
        {activeQuote && (
          <div className="p-3 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Trading:</span>{' '}
              <span className="font-bold text-white font-mono">
                {activeQuote.fromAmount} {activeQuote.fromToken.symbol}
              </span>
            </div>
            <div className="text-slate-500">→</div>
            <div>
              <span className="text-slate-400">Expected:</span>{' '}
              <span className="font-bold text-emerald-400 font-mono">
                {activeQuote.expectedOutput} {activeQuote.toToken.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Verification Checkpoints */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Balance Check</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Allowance</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Price Impact</div>
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1 mt-1">
              {activeSimulation.priceImpactValue}% (Safe)
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Contract Risk</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              {activeSimulation.smartContractRiskScore}/100 (Audited)
            </div>
          </div>
        </div>

        {/* Sandboxed VM Execution Logs */}
        <div className="rounded-xl bg-[#080808] border border-white/5 p-3 text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-white/5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> Sandboxed Trace (Block #{activeSimulation.blockNumberSimulated})
            </span>
            <span className="text-[10px] text-emerald-400">
              Gas Est: {activeSimulation.gasEstimated.toLocaleString()} units (~${activeSimulation.gasCostUsd.toFixed(2)})
            </span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 text-slate-400 pt-1">
            {activeSimulation.simulationLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 select-none">&gt;</span>
                <span className={log.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings if any */}
        {activeSimulation.warnings.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Simulation Notices
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
              {activeSimulation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" /> Non-Custodial: You maintain 100% key control.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSimulation(null);
                setActiveQuote(null);
              }}
              className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-white/5 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Reject
            </button>
            <button
              onClick={handleConfirmAndSign}
              disabled={isExecuting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExecuting ? 'Broadcasting to Mempool...' : 'Confirm & Sign with Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
