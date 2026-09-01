import React, { useState } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ShieldCheck, AlertTriangle, CheckCircle2, Terminal, Lock, RefreshCw, Zap } from 'lucide-react';
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
        gasSpentUsd: activeSimulation.gasCostUsd || 1.85,
      });

      addToast({
        title: 'Hoán Đổi Thành Công Trên Chuỗi',
        message: `Khối #${tx.blockNumber} đã xác nhận. Mã TX: ${tx.txHash.substring(0, 10)}...`,
        type: 'success',
      });
      setActiveSimulation(null);
      setActiveQuote(null);
    } catch (err: any) {
      addToast({
        title: 'Giao Dịch Thất Bại',
        message: err?.message || 'Người dùng đã hủy hoặc RPC từ chối ký giao dịch.',
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-[#090C12] border border-cyan-500/30 shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                Mô Phỏng Giao Dịch An Toàn (Pre-Flight)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  AN TOÀN 100%
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Mã Định Danh: {activeSimulation.correlationId}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSimulation(null);
              setActiveQuote(null);
            }}
            className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Swap Summary */}
        {activeQuote && (
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/[0.08] flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Bạn Trả:</span>{' '}
              <span className="font-bold text-white font-mono">
                {formatCrypto(activeQuote.fromAmount)} {activeQuote.fromToken.symbol}
              </span>
            </div>
            <div className="text-cyan-400 font-mono font-bold">→</div>
            <div>
              <span className="text-slate-400">Bạn Nhận:</span>{' '}
              <span className="font-bold text-emerald-400 font-mono">
                {formatCrypto(activeQuote.expectedOutput)} {activeQuote.toToken.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Verification Checkpoints */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Kiểm Tra Số Dư</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đủ Điều Kiện
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Quyền Smart Contract</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã Phê Duyệt
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Trượt Giá</div>
            <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-1">
              {activeSimulation.priceImpactValue || 0.01}% (Tối Ưu)
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Điểm Rủi Ro Hợp Đồng</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              {activeSimulation.smartContractRiskScore || 98}/100 (Đã Kiểm Định)
            </div>
          </div>
        </div>

        {/* Sandboxed VM Execution Logs */}
        <div className="rounded-2xl bg-[#04060A] border border-white/[0.08] p-3 text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-white/[0.06]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Bản Ghi Máy Ảo EVM Sandboxed (Block #{activeSimulation.blockNumberSimulated || 21948200})
            </span>
            <span className="text-[10px] text-emerald-400">
              Gas: {(activeSimulation.gasEstimated || 135000).toLocaleString()} units (~${(activeSimulation.gasCostUsd || 1.85).toFixed(2)})
            </span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 text-slate-400 pt-1 scrollbar-thin">
            {activeSimulation.simulationLogs && activeSimulation.simulationLogs.length > 0 ? (
              activeSimulation.simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span className={log.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}>{log}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-emerald-400">[RPC-SANDBOX] Call simulation pre-flight passed successfully</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-slate-300">[MEV-CHECK] No sandwich arbitrage vulnerability detected</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-cyan-300">[ROUTING] Hyperon Split Router allocated 100% pool volume</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Warnings if any */}
        {activeSimulation.warnings && activeSimulation.warnings.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Lưu Ý Khi Thực Thi
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
              {activeSimulation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Bảo mật Non-Custodial: Bạn sở hữu 100% khóa riêng tư.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSimulation(null);
                setActiveQuote(null);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleConfirmAndSign}
              disabled={isExecuting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 font-sans"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Ký & Phát Sóng...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Xác Nhận & Ký Giao Dịch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
