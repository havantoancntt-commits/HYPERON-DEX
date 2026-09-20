import React from 'react';
import { SwapQuote } from '../../types';
import { TokenLogo } from '../CryptoIcon';
import { shortenAddress } from '../../lib/utils';
import { SecurityBadge } from './SecurityBadge';
import { SecurityStatus, SimulationStatus, SIMULATION_STATUS_CONFIG } from '../../lib/designSystem';
import { SUPPORTED_CHAINS } from '../../lib/constants';
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
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react';

interface ConfirmationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quote: SwapQuote;
  simulationStatus: SimulationStatus;
  securityStatus: SecurityStatus;
  isBroadcasting?: boolean;
  executionStep?: string;
  executionTxHash?: string;
  isCompleted?: boolean;
  errorText?: string | null;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quote,
  simulationStatus,
  securityStatus,
  isBroadcasting = false,
  executionStep = 'IDLE',
  executionTxHash,
  isCompleted = false,
  errorText,
}) => {
  if (!isOpen) return null;

  const simConfig = SIMULATION_STATUS_CONFIG[simulationStatus] || SIMULATION_STATUS_CONFIG.PASSED;
  const isSimFailed = simulationStatus === 'FAILED';
  const isExpired = Boolean(quote.expiresAt && Date.now() > quote.expiresAt);
  const isBlocked = securityStatus === 'BLOCKED';

  const chainConfig = SUPPORTED_CHAINS[quote.chainId || 'ethereum'];
  const explorerUrl = executionTxHash && chainConfig?.explorerUrl
    ? `${chainConfig.explorerUrl}/tx/${executionTxHash}`
    : executionTxHash
    ? `https://etherscan.io/tx/${executionTxHash}`
    : undefined;

  const isErc20In = !quote.fromToken.isNative;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={!isBroadcasting ? onClose : undefined}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#090D16] border border-white/[0.12] p-5 sm:p-6 shadow-2xl space-y-5 text-slate-200 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
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
                {isCompleted ? 'Hoán Đổi Hoàn Tất (Verified)' : 'Xác Nhận & Ký Lệnh Hoán Đổi'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Giao dịch phi tập trung trên {chainConfig?.name || quote.chainId || 'Ethereum'}
              </p>
            </div>
          </div>
          {!isBroadcasting && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* You Pay vs You Receive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* You Pay */}
          <div className="p-3.5 rounded-2xl bg-[#0D121F] border border-white/[0.06] space-y-2">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Bạn Gửi Đi</div>
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
            <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Bạn Nhận Được (Ước tính)</div>
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

        {/* Execution Live Stepper (when broadcasting or completed) */}
        {(isBroadcasting || isCompleted) && (
          <div className="rounded-2xl bg-gradient-to-b from-blue-950/30 to-[#070A10] border border-cyan-500/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 font-sans uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Tiến Trình Thực Thi Trên Chuỗi
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                {isCompleted ? '100% ĐÃ XÁC THỰC' : 'ĐANG XỬ LÝ...'}
              </span>
            </div>

            <div className="space-y-2">
              {/* Step 1: Pre-flight */}
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-300">1. Mô phỏng & Kiểm tra bất biến số dư (Pre-flight Passed)</span>
              </div>

              {/* Step 2: Allowance (if ERC20) */}
              {isErc20In && (
                <div className="flex items-center gap-2.5 text-xs">
                  {executionStep === 'CHECKING_ALLOWANCE' || executionStep === 'APPROVING' ? (
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  ) : executionStep === 'APPROVAL_PENDING' ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <span className={executionStep === 'APPROVING' ? 'text-cyan-300 font-bold' : 'text-slate-300'}>
                    2. Phê duyệt chi tiêu {quote.fromToken.symbol} ({executionStep === 'APPROVING' ? 'Đang mở ví phê duyệt...' : executionStep === 'APPROVAL_PENDING' ? 'Chờ xác nhận khối...' : 'Đã phê duyệt'})
                  </span>
                </div>
              )}

              {/* Step 3: Swap Signature */}
              <div className="flex items-center gap-2.5 text-xs">
                {executionStep === 'SIGNING' ? (
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                ) : executionStep === 'BROADCASTING' || executionStep === 'CONFIRMING' || isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px]">
                    {isErc20In ? '3' : '2'}
                  </div>
                )}
                <span className={executionStep === 'SIGNING' ? 'text-cyan-300 font-bold' : 'text-slate-300'}>
                  {isErc20In ? '3' : '2'}. Ký cryptographic hash trong ví Web3
                </span>
              </div>

              {/* Step 4: Confirmation */}
              <div className="flex items-center gap-2.5 text-xs">
                {executionStep === 'CONFIRMING' ? (
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                ) : isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px]">
                    {isErc20In ? '4' : '3'}
                  </div>
                )}
                <span className={executionStep === 'CONFIRMING' ? 'text-cyan-300 font-bold' : isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {isErc20In ? '4' : '3'}. Khối xác nhận & Kiểm toán log sự kiện swap
                </span>
              </div>
            </div>

            {/* Block Explorer Link */}
            {explorerUrl && (
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Mã Giao Dịch (TxHash):</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 underline decoration-cyan-500/40 hover:decoration-cyan-400 font-bold cursor-pointer"
                >
                  <span>{shortenAddress(executionTxHash || '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Audit & Pre-flight Invariants Table */}
        {!isCompleted && (
          <div className="rounded-2xl bg-[#070A10] border border-white/[0.06] p-3.5 space-y-2.5 text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Tỷ Giá Hoán Đổi (Rate)</span>
              <span className="font-mono text-white font-semibold">
                1 {quote.fromToken.symbol} = {quote.executionPrice ? quote.executionPrice.toFixed(4) : '—'} {quote.toToken.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Lượng Nhận Tối Thiểu (Bảo đảm)</span>
              <span className="font-mono text-slate-200 font-semibold">
                {quote.minimumReceived ? quote.minimumReceived.toFixed(4) : '—'} {quote.toToken.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Trượt Giá Tối Đa (Max Slippage)</span>
              <span className="font-mono text-slate-200 font-semibold">
                {quote.slippagePercent ? `${quote.slippagePercent}%` : '0.50%'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Tác Động Giá (Price Impact)</span>
              <span className={`font-mono font-bold ${parseFloat(quote.priceImpactBps || '0') > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {quote.priceImpactPercent ? `${quote.priceImpactPercent.toFixed(2)}%` : '< 0.05%'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Phí Gas Ước Tính</span>
              <span className="font-mono text-slate-200 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span>${quote.estimatedGasUsd ? quote.estimatedGasUsd.toFixed(2) : '0.18'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Phí Định Tuyến Giao Thức</span>
              <span className="font-mono text-slate-200 font-semibold">
                ${quote.routingFeeUsd ? quote.routingFeeUsd.toFixed(2) : '0.00'} (0.00%)
              </span>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-400 font-medium">Kiểm Tra An Toàn Smart Contract</span>
              <SecurityBadge status={securityStatus} tokenSymbol={quote.toToken.symbol} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Mô Phỏng Tiền Kiểm Tra (Pre-flight)</span>
              <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${simConfig.bg} ${simConfig.text} ${simConfig.border}`}>
                {simConfig.label}
              </span>
            </div>
          </div>
        )}

        {/* Warning if Simulation Failed */}
        {isSimFailed && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-rose-200">Mô Phỏng Thất Bại:</strong> Lệnh gọi thử trên blockchain đã bị hoàn tác (revert). Ký giao dịch này có thể thất bại và lãng phí phí gas mạng.
            </div>
          </div>
        )}

        {/* Error text if any */}
        {errorText && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-rose-200">Lỗi Thực Thi:</strong> {errorText}
            </div>
          </div>
        )}

        {/* Warning if Quote Expired */}
        {isExpired && !isSimFailed && !isCompleted && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-200">Báo Giá Hết Hạn:</strong> Báo giá này đã quá thời gian hiệu lực. Vui lòng đóng và lấy báo giá mới để đảm bảo tính chính xác về tỷ giá.
            </div>
          </div>
        )}

        {/* Warning if Asset Blocked */}
        {isBlocked && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-rose-200">Giao Dịch Bị Chặn:</strong> Một trong hai token đã bị gắn cờ nguy hiểm hoặc không xác minh trong danh mục rủi ro.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {isCompleted ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Đóng & Xem Số Dư Mới</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isBroadcasting}
                className="flex-1 py-3.5 rounded-2xl border border-white/[0.08] hover:bg-white/[0.04] text-slate-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isBroadcasting || isSimFailed || isExpired || isBlocked}
                className={`flex-2 py-3.5 rounded-2xl font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSimFailed || isExpired || isBlocked
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 hover:opacity-95 hover:shadow-cyan-500/30 active:scale-[0.99]'
                }`}
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>
                      {executionStep === 'APPROVING'
                        ? 'Đang Phê Duyệt Token Trong Ví...'
                        : executionStep === 'APPROVAL_PENDING'
                        ? 'Đang Chờ Khối Phê Duyệt...'
                        : executionStep === 'SIGNING'
                        ? 'Đang Mở Ví Để Ký Lệnh...'
                        : executionStep === 'CONFIRMING'
                        ? 'Đang Khai Thác Khối...'
                        : 'Đang Phát Giao Dịch Lên Chuỗi...'}
                    </span>
                  </>
                ) : isExpired ? (
                  <span>Báo Giá Đã Hết Hạn</span>
                ) : isBlocked ? (
                  <span>Giao Dịch Bị Chặn An Toàn</span>
                ) : isSimFailed ? (
                  <span>Mô Phỏng Thất Bại</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Xác Nhận & Ký Trong Ví</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
