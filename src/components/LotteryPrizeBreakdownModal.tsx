import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  X,
  ShieldCheck,
  Flame,
  Zap,
  TrendingUp,
  Percent,
  Sparkles,
  Info,
  CheckCircle2,
  Coins,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { LotteryRound } from '../types';
import { soundManager } from '../lib/sound';

interface LotteryPrizeBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: LotteryRound | null;
}

export const LotteryPrizeBreakdownModal: React.FC<LotteryPrizeBreakdownModalProps> = ({
  isOpen,
  onClose,
  round,
}) => {
  if (!isOpen || !round) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0F1322] via-[#0A0D18] to-[#04060C] border border-amber-500/40 p-5 sm:p-7 shadow-2xl shadow-amber-950/40 text-white scrollbar-thin"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>CHÍNH SÁCH CƠ CẤU GIẢI THƯỞNG QUỐC TẾ & XÁC SUẤT TOÁN HỌC</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-outfit text-white">
                Bảng Phân Bổ Giải Thưởng & Xác Suất {round.poolName}
              </h2>
              <p className="text-xs text-slate-300">
                100% minh bạch on-chain: Công thức phân bổ doanh thu, cơ chế Rollover bảo lưu và cơ hội trúng bất kỳ giải nào lên tới 41.8%.
              </p>
            </div>
            <button
              onClick={() => {
                soundManager.playTick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Key Distribution Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">Tổng Quỹ Thưởng</div>
              <div className="text-lg sm:text-xl font-black font-mono text-white mt-0.5">
                ${round.totalPotUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-[10px] uppercase font-mono text-yellow-400 font-bold">Rollover Kỳ Trước</div>
              <div className="text-lg sm:text-xl font-black font-mono text-yellow-300 mt-0.5">
                ${(round.rolloverAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30">
              <div className="text-[10px] uppercase font-mono text-orange-400 font-bold">Đốt HYPR Giảm Lạm Phát</div>
              <div className="text-lg sm:text-xl font-black font-mono text-orange-300 mt-0.5">
                ${(round.burnAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (4%)
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Quỹ Bảo Hiểm & Stakers</div>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-300 mt-0.5">
                ${(round.reserveFundUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (3%)
              </div>
            </div>
          </div>

          {/* Detailed Tier Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>Bảng Chi Tiết Hạng Giải, Tỷ Lệ Chia & Xác Suất Toán Học</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.04] text-slate-400">
                    <th className="p-3">Hạng Giải</th>
                    <th className="p-3">Trùng Khớp</th>
                    <th className="p-3">Tỷ Lệ Quỹ</th>
                    <th className="p-3">Quỹ Giải Hiện Tại</th>
                    <th className="p-3">Xác Suất Trúng</th>
                    <th className="p-3">Bảo Hiểm Tối Thiểu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {round.prizesByTier.map((tier) => (
                    <tr
                      key={tier.matchedDigits}
                      className={tier.matchedDigits === 6 ? 'bg-amber-500/15 font-bold text-amber-200' : 'hover:bg-white/[0.02]'}
                    >
                      <td className="p-3 font-sans font-bold flex items-center gap-2">
                        {tier.matchedDigits === 6 && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
                        <span>{tier.label}</span>
                      </td>
                      <td className="p-3 font-bold">{tier.matchedDigits > 0 ? `${tier.matchedDigits}/6 số đầu` : 'Cơ chế Protocol'}</td>
                      <td className="p-3 text-emerald-400">{tier.allocationPercent}%</td>
                      <td className="p-3 font-bold text-amber-300">
                        ${tier.poolAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-cyan-400">{tier.oddsRatio}</td>
                      <td className="p-3 text-slate-300">
                        {tier.guaranteedMinUsd ? `$${tier.guaranteedMinUsd.toLocaleString()}` : 'Theo tỷ lệ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rollover & Deflationary Mechanics Explained */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Cơ Chế Rollover Tích Lũy Vô Tận (No-Cap)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                Nếu trong kỳ quay hiện tại không có vé số nào trùng khớp chính xác 6/6 chữ số, toàn bộ 50% quỹ thưởng Jackpot sẽ được cộng dồn (Rollover) 100% sang kỳ quay tiếp theo mà không bị khấu trừ bất kỳ khoản phí nào!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Đốt HYPR Giảm Lượng Lưu Hành Tức Thì</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                4% từ mọi kỳ quay Mega được tự động chuyển đến ví đốt vĩnh viễn (0x0000...dEaD), tạo áp lực giảm phát liên tục cho token HYPR và tăng giá trị nội tại cho toàn bộ hệ sinh thái HYPERON DEX.
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              onClick={() => {
                soundManager.playTick();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Đã Hiểu & Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
