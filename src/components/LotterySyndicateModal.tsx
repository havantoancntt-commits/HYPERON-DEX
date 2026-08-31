import React, { useState } from 'react';
import { LotterySyndicatePool } from '../types';
import { soundManager } from '../lib/sound';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Users,
  ShieldCheck,
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Plus,
  Minus,
} from 'lucide-react';

interface LotterySyndicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  syndicates: LotterySyndicatePool[];
  onJoinSyndicate: (syndicateId: string, shares: number) => Promise<void>;
}

export const LotterySyndicateModal: React.FC<LotterySyndicateModalProps> = ({
  isOpen,
  onClose,
  syndicates,
  onJoinSyndicate,
}) => {
  const [selectedSyndicate, setSelectedSyndicate] = useState<LotterySyndicatePool | null>(
    syndicates[0] || null
  );
  const [sharesCount, setSharesCount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!selectedSyndicate) return;
    try {
      setIsSubmitting(true);
      await onJoinSyndicate(selectedSyndicate.id, sharesCount);
      soundManager.playJackpot();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      onClose();
    } catch (err) {
      soundManager.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl rounded-3xl bg-[#0C101A] border border-amber-500/30 p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-outfit uppercase">
                Hồ Bơi Vé Số Nhóm (Syndicates & Guilds)
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Gộp quỹ vé số tập thể • Tăng xác suất trúng Jackpot lên 100x
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playTick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Syndicate Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 my-4 pr-1">
          {syndicates.map((syn) => {
            const isSelected = selectedSyndicate?.id === syn.id;
            const progress = Math.min(100, (syn.currentTickets / syn.targetTickets) * 100);

            return (
              <div
                key={syn.id}
                onClick={() => {
                  soundManager.playTick();
                  setSelectedSyndicate(syn);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black font-outfit text-white">{syn.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {syn.currentTickets}/{syn.targetTickets} Vé
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">{syn.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-amber-300">
                      ${syn.pricePerShareUsd > 0 ? `${syn.pricePerShareUsd} USD` : 'FREE YIELD'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">/ 1 Suất Cổ Phần</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{syn.participantCount} thành viên đã tham gia</span>
                    <span>Đã gom {progress.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Syndicate Participation Controls */}
        {selectedSyndicate && (
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400">Số lượng suất cổ phần:</span>
                <div className="text-sm font-black font-outfit text-white">
                  {sharesCount * (selectedSyndicate.poolId === 'mega-daily' ? 5 : 1)} Vé Số Nhóm
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.06] p-1.5 rounded-xl border border-white/10">
                <button
                  onClick={() => {
                    soundManager.playTick();
                    setSharesCount((prev) => Math.max(1, prev - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-black font-mono text-amber-300 w-8 text-center">
                  {sharesCount}
                </span>
                <button
                  onClick={() => {
                    soundManager.playTick();
                    setSharesCount((prev) => prev + 1);
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
              <div>
                <span className="text-[11px] font-mono text-slate-400">Tổng thanh toán:</span>
                <div className="text-lg font-black font-mono text-amber-400">
                  ${(sharesCount * selectedSyndicate.pricePerShareUsd).toFixed(2)} USD
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer font-outfit uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Đang Xử Lý Giao Dịch...' : 'Tham Gia Hồ Bơi Nhóm'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
