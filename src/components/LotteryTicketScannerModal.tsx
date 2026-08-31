import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Dice5,
  Coins,
  Ticket,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { LotteryRound, LotteryTicket } from '../types';
import { soundManager } from '../lib/sound';

interface LotteryTicketScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRound: LotteryRound | null;
  pastRounds: LotteryRound[];
  userTickets: LotteryTicket[];
}

export const LotteryTicketScannerModal: React.FC<LotteryTicketScannerModalProps> = ({
  isOpen,
  onClose,
  activeRound,
  pastRounds,
  userTickets,
}) => {
  const [selectedRoundId, setSelectedRoundId] = useState<number>(activeRound?.id || 142);
  const [ticketDigits, setTicketDigits] = useState<number[]>([7, 3, 9, 2, 6, 4]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    roundId: number;
    status: 'WINNER' | 'NO_MATCH' | 'PENDING_DRAW';
    winningNumbers: number[] | null;
    matchedDigits: number;
    estimatedPrizeUsd: number;
    tierLabel: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleScan = async () => {
    try {
      setIsScanning(true);
      soundManager.playTick();
      const res = await fetch('/api/lottery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: selectedRoundId,
          numbers: ticketDigits,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan ticket');

      setScanResult(data);
      if (data.status === 'WINNER') {
        soundManager.playJackpot();
      } else {
        soundManager.playSuccess();
      }
    } catch (err: any) {
      soundManager.playAlert();
    } finally {
      setIsScanning(false);
    }
  };

  const allAvailableRounds = [activeRound, ...pastRounds].filter(Boolean) as LotteryRound[];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0F1424] via-[#090C16] to-[#04060C] border border-cyan-500/40 p-5 sm:p-7 shadow-2xl shadow-cyan-950/40 text-white scrollbar-thin"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-xs font-mono font-bold">
                <Search className="w-3.5 h-3.5" />
                <span>CÔNG CỤ QUÉT VÉ SỐ TỰ ĐỘNG & ĐỐI SOÁT TRÚNG THƯỞNG ON-CHAIN</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-outfit text-white">
                Máy So Vé Số Thông Minh (Ticket Scanner)
              </h2>
              <p className="text-xs text-slate-300">
                Nhập 6 con số trên vé của bạn hoặc chọn từ danh sách vé đã mua để hệ thống tính toán kết quả và mức trả thưởng chuẩn xác tuyệt đối.
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

          <div className="space-y-5 my-5">
            {/* Round Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block font-mono">
                Chọn Kỳ Quay Cần So Số:
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => {
                  soundManager.playTick();
                  setSelectedRoundId(Number(e.target.value));
                  setScanResult(null);
                }}
                className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-xs font-mono text-white focus:border-cyan-500 outline-none"
              >
                {allAvailableRounds.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    Kỳ #{r.id} - {r.poolName} ({r.status === 'OPEN' ? 'Đang Mở Bán' : 'Đã Quay Số'})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Pick From User's Existing Tickets */}
            {userTickets.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block font-mono">
                  Hoặc Chọn Nhanh Từ Vé Bạn Đang Sở Hữu:
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                  {userTickets.slice(0, 8).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        soundManager.playTick();
                        setTicketDigits(t.numbers);
                        setSelectedRoundId(t.roundId);
                        setScanResult(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5 text-cyan-400" />
                      <span>[ {t.numbers.join(' - ')} ]</span>
                      <span className="text-[10px] text-slate-500">#{t.roundId}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive 6-digit Custom Input */}
            <div className="space-y-2 text-center bg-black/50 p-4 rounded-2xl border border-white/[0.06]">
              <span className="text-xs font-mono text-slate-400">Dãy 6 Chữ Số Cần So Vé:</span>
              <div className="flex items-center justify-center gap-2 py-2">
                {ticketDigits.map((d, dIdx) => (
                  <div key={dIdx} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        soundManager.playTick();
                        setTicketDigits((prev) => {
                          const next = [...prev];
                          next[dIdx] = (next[dIdx] + 1) % 10;
                          return next;
                        });
                        setScanResult(null);
                      }}
                      className="w-8 sm:w-10 h-6 bg-white/[0.06] hover:bg-cyan-500/20 text-slate-300 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all"
                    >
                      ▲
                    </button>
                    <div className="w-8 sm:w-10 h-10 sm:h-12 rounded-xl bg-gradient-to-b from-cyan-500/20 to-black/90 border border-cyan-500/50 text-cyan-200 font-black font-mono text-lg sm:text-xl flex items-center justify-center shadow-md shadow-cyan-950/40">
                      {d}
                    </div>
                    <button
                      onClick={() => {
                        soundManager.playTick();
                        setTicketDigits((prev) => {
                          const next = [...prev];
                          next[dIdx] = (next[dIdx] + 9) % 10;
                          return next;
                        });
                        setScanResult(null);
                      }}
                      className="w-8 sm:w-10 h-6 bg-white/[0.06] hover:bg-cyan-500/20 text-slate-300 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all"
                    >
                      ▼
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black font-black text-sm rounded-xl font-outfit uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <span>Đang Đối Soát Dữ Liệu VRF...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Quét Và Đối Soát Kết Quả Ngay</span>
                </>
              )}
            </button>

            {/* Scan Results Display */}
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border ${
                  scanResult.status === 'WINNER'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : scanResult.status === 'PENDING_DRAW'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-white/[0.02] border-white/10 text-slate-300'
                } space-y-3 font-mono`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold font-sans">
                    {scanResult.status === 'WINNER' ? (
                      <>
                        <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />
                        <span className="text-emerald-300">🎉 XIN CHÚC MỪNG! VÉ TRÚNG THƯỞNG!</span>
                      </>
                    ) : scanResult.status === 'PENDING_DRAW' ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <span>Kỳ Quay Chưa Mở Thưởng (Đang Đếm Ngược)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                        <span>Rất Tiếc: Vé Chưa Trùng Khớp Trong Kỳ Này</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                    Kỳ #{scanResult.roundId}
                  </div>
                </div>

                {scanResult.winningNumbers && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                    <div className="text-[11px] text-slate-400">Kết Quả Quay Số Chính Thức:</div>
                    <div className="flex items-center gap-2">
                      {scanResult.winningNumbers.map((num, i) => {
                        const isMatch = ticketDigits[i] === num;
                        return (
                          <span
                            key={i}
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border ${
                              isMatch
                                ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                                : 'bg-black/60 text-slate-400 border-white/10'
                            }`}
                          >
                            {num}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.05]">
                    <div className="text-[10px] text-slate-400">Số Lượng Số Trùng Khớp:</div>
                    <div className="text-base font-bold text-white mt-0.5">{scanResult.matchedDigits}/6 Số</div>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.05]">
                    <div className="text-[10px] text-slate-400">Tiền Thưởng Ước Tính:</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      ${scanResult.estimatedPrizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              onClick={() => {
                soundManager.playTick();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono uppercase font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
