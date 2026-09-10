import React, { useState } from 'react';
import { LotteryAnalytics } from '../types';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BarChart3,
  Flame,
  Snowflake,
  TrendingUp,
  Cpu,
  Compass,
  CheckCircle2,
  X,
  Shuffle,
  Zap,
} from 'lucide-react';

interface LotteryAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: LotteryAnalytics | null;
  onApplyLuckyNumbers: (numbers: number[]) => void;
}

const ZODIAC_SIGNS = [
  { name: 'Bạch Dương (Aries)', icon: '♈', lucky: [7, 9, 3, 1, 8, 4] },
  { name: 'Kim Ngưu (Taurus)', icon: '♉', lucky: [6, 2, 8, 4, 0, 7] },
  { name: 'Song Tử (Twins)', icon: '♊', lucky: [5, 3, 7, 1, 9, 2] },
  { name: 'Cự Giải (Cancer)', icon: '♋', lucky: [2, 7, 4, 8, 6, 3] },
  { name: 'Sư Tử (Leo)', icon: '♌', lucky: [1, 9, 5, 8, 7, 3] },
  { name: 'Xử Nữ (Virgo)', icon: '♍', lucky: [5, 2, 8, 6, 0, 4] },
  { name: 'Thiên Bình (Libra)', icon: '♎', lucky: [6, 4, 9, 2, 7, 1] },
  { name: 'Bọ Cạp (Scorpio)', icon: '♏', lucky: [8, 0, 3, 7, 9, 5] },
  { name: 'Nhân Mã (Sagittarius)', icon: '♐', lucky: [3, 9, 7, 1, 5, 8] },
  { name: 'Ma Kết (Capricorn)', icon: '♑', lucky: [8, 4, 2, 6, 0, 9] },
  { name: 'Bảo Bình (Aquarius)', icon: '♒', lucky: [4, 7, 1, 9, 8, 3] },
  { name: 'Song Ngư (Pisces)', icon: '♓', lucky: [7, 3, 6, 2, 8, 5] },
];

export const LotteryAnalyticsModal: React.FC<LotteryAnalyticsModalProps> = ({
  isOpen,
  onClose,
  analytics,
  onApplyLuckyNumbers,
}) => {
  const [selectedTab, setSelectedTab] = useState<'heatmap' | 'ai_picker' | 'zodiac'>('heatmap');
  const [selectedZodiac, setSelectedZodiac] = useState<number>(0);

  if (!isOpen) return null;

  const handleApply = (numbers: number[]) => {
    soundManager.playCoin();
    onApplyLuckyNumbers(numbers);
    onClose();
  };

  // Generate Smart Fibonacci Sequence
  const generateFibonacci = () => {
    const fib = [1, 2, 3, 5, 8, 4];
    handleApply(fib);
  };

  // Generate Hot Momentum Numbers
  const generateHotMomentum = () => {
    if (!analytics) return;
    const hot = [...analytics.hotDigits, 7, 8, 3, 9, 2, 1].slice(0, 6);
    handleApply(hot);
  };

  // Generate Cold Reversion Numbers
  const generateColdReversion = () => {
    if (!analytics) return;
    const cold = [...analytics.coldDigits, 5, 0, 4, 6, 2, 8].slice(0, 6);
    handleApply(cold);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl rounded-3xl bg-[#0C101A] border border-amber-500/30 p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-outfit uppercase">
                Phân Tích Thống Kê & Trợ Lý Chọn Số AI 3D
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Dữ liệu tần suất 141 kỳ quay • Thuật toán xác suất lượng tử
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 my-4 p-1 bg-black/50 rounded-2xl border border-white/[0.08] shrink-0">
          <button
            onClick={() => {
              soundManager.playTick();
              setSelectedTab('heatmap');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedTab === 'heatmap'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Tần Suất Số Hot / Cold</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTick();
              setSelectedTab('ai_picker');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedTab === 'ai_picker'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Smart Selector</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTick();
              setSelectedTab('zodiac');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedTab === 'zodiac'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Chiêm Tinh 12 Cung</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {selectedTab === 'heatmap' && analytics && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Top Số Hot</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white mt-1">
                    {analytics.hotDigits.join(' • ')}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Top Số Cold</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white mt-1">
                    {analytics.coldDigits.join(' • ')}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                  <div className="text-xs font-mono font-bold text-purple-300">
                    Tỷ Lệ Chẵn / Lẻ
                  </div>
                  <div className="text-xl font-black font-mono text-white mt-1">
                    {analytics.oddEvenRatio.even}% / {analytics.oddEvenRatio.odd}%
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    Tổng Điểm Trung Bình
                  </div>
                  <div className="text-xl font-black font-mono text-white mt-1">
                    {analytics.averageSum} pts
                  </div>
                </div>
              </div>

              {/* 0-9 Digit Frequency Matrix */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Ma Trận Tần Suất Xuất Hiện (0 - 9)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {analytics.digitFrequencies.map((f) => (
                    <div
                      key={f.digit}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                        f.isHot
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                          : f.isCold
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                          : 'bg-white/[0.03] border-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-mono text-white">{f.digit}</span>
                        {f.isHot ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            HOT
                          </span>
                        ) : f.isCold ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            COLD
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full ${f.isHot ? 'bg-amber-400' : 'bg-cyan-400'}`}
                            style={{ width: `${Math.min(100, f.percentage * 5)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{f.count} lần ({f.percentage}%)</span>
                          <span>{f.lastDrawnRoundsAgo} kỳ trước</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'ai_picker' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-outfit font-black text-sm uppercase">
                    <Flame className="w-4 h-4" />
                    <span>Chiến Thuật Hot Momentum</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">
                    Chọn tổ hợp các con số có tần suất xuất hiện cao nhất trong 30 kỳ gần nhất.
                  </p>
                </div>
                <button
                  onClick={generateHotMomentum}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer font-outfit uppercase shrink-0"
                >
                  Áp Dụng Tổ Hợp Hot
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-300 font-outfit font-black text-sm uppercase">
                    <Snowflake className="w-4 h-4" />
                    <span>Chiến Thuật Cold Reversion</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">
                    Chọn các con số lâu chưa xuất hiện theo định luật hồi quy xác suất lớn.
                  </p>
                </div>
                <button
                  onClick={generateColdReversion}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer font-outfit uppercase shrink-0"
                >
                  Áp Dụng Tổ Hợp Cold
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-purple-500/15 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-purple-300 font-outfit font-black text-sm uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>Tỷ Lệ Vàng Fibonacci Golden Ratio</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">
                    Thuật toán dãy số vàng tự nhiên phân bổ cân bằng hình học tối ưu xác suất.
                  </p>
                </div>
                <button
                  onClick={generateFibonacci}
                  className="px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer font-outfit uppercase shrink-0"
                >
                  Áp Dụng Dãy Fibonacci
                </button>
              </div>
            </div>
          )}

          {selectedTab === 'zodiac' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ZODIAC_SIGNS.map((z, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      soundManager.playTick();
                      setSelectedZodiac(idx);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      selectedZodiac === idx
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{z.icon}</span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {z.lucky.join(' • ')}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white truncate">{z.name}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Dãy số may mắn đã chọn:</div>
                  <div className="text-xl font-black font-mono text-amber-300">
                    {ZODIAC_SIGNS[selectedZodiac].lucky.join(' - ')}
                  </div>
                </div>
                <button
                  onClick={() => handleApply(ZODIAC_SIGNS[selectedZodiac].lucky)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer font-outfit uppercase tracking-wide"
                >
                  Điền Số Cung Hoàng Đạo
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
