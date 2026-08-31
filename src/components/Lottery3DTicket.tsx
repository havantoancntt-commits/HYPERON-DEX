import React, { useState, useRef, useEffect } from 'react';
import { LotteryTicket } from '../types';
import { soundManager } from '../lib/sound';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Lock,
  Eye,
  QrCode,
  Share2,
  Zap,
  Gift,
  ShieldCheck,
} from 'lucide-react';

interface Lottery3DTicketProps {
  ticket: LotteryTicket;
  winningNumbers?: number[] | null;
  onClaim?: (ticketId: string) => void;
}

const BALL_COLORS = [
  { bg: '#EF4444', text: '#FFFFFF' },
  { bg: '#F97316', text: '#FFFFFF' },
  { bg: '#EAB308', text: '#000000' },
  { bg: '#10B981', text: '#FFFFFF' },
  { bg: '#06B6D4', text: '#000000' },
  { bg: '#3B82F6', text: '#FFFFFF' },
  { bg: '#8B5CF6', text: '#FFFFFF' },
  { bg: '#EC4899', text: '#FFFFFF' },
  { bg: '#F59E0B', text: '#000000' },
  { bg: '#14B8A6', text: '#000000' },
];

export const Lottery3DTicket: React.FC<Lottery3DTicketProps> = ({
  ticket,
  winningNumbers = null,
  onClaim,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; shineX: number; shineY: number }>({
    x: 0,
    y: 0,
    shineX: 50,
    shineY: 50,
  });

  const [isScratched, setIsScratched] = useState<boolean>(ticket.isScratchRevealed || false);
  const [scratchProgress, setScratchProgress] = useState<number>(ticket.isScratchRevealed ? 100 : 0);

  // 3D Parallax Mouse Tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // tilt max 12 deg
    const rotateY = ((x - centerX) / centerX) * 12;

    setTilt({
      x: rotateX,
      y: rotateY,
      shineX: (x / rect.width) * 100,
      shineY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, shineX: 50, shineY: 50 });
  };

  const handleRevealScratch = () => {
    if (isScratched) return;
    soundManager.playFoilScratch();
    setIsScratched(true);
    setScratchProgress(100);

    if (ticket.status === 'WON') {
      soundManager.playJackpot();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const isWinner = ticket.status === 'WON' || (ticket.matchedDigitsCount && ticket.matchedDigitsCount > 0);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative select-none perspective-1000 transition-transform duration-100 ease-out"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`relative w-full rounded-2xl overflow-hidden border ${
          isWinner
            ? 'border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] bg-gradient-to-br from-[#1C160C] via-[#0E0C0A] to-[#2B1E08]'
            : 'border-white/[0.12] shadow-xl bg-gradient-to-br from-[#111522] via-[#0A0D16] to-[#05070D]'
        } p-4 sm:p-5 flex flex-col justify-between min-h-[220px]`}
      >
        {/* Holographic Rainbow Foil Layer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-35 mix-blend-color-dodge transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255,255,255,0.8) 0%, rgba(255,0,128,0.3) 25%, rgba(0,255,255,0.3) 50%, rgba(255,215,0,0.3) 75%, transparent 100%)`,
          }}
        />

        {/* Diagonal Gold Watermark Stripes */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:24px_24px] pointer-events-none" />

        {/* Top Stub Header */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                isWinner ? 'bg-amber-500 text-black shadow-md' : 'bg-white/10 text-white'
              }`}
            >
              {isWinner ? <Trophy className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-cyan-400" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-outfit text-white uppercase tracking-wider">
                  HYPERON 3D VIP TICKET
                </span>
                {ticket.tierQuality && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {ticket.tierQuality}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                Round #{ticket.roundId} • ID: {ticket.id.slice(-8)}
              </p>
            </div>
          </div>

          <div className="text-right">
            {ticket.status === 'WON' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                <Trophy className="w-3 h-3" /> +${ticket.wonPrizeUsd?.toLocaleString()} USD
              </span>
            ) : ticket.status === 'ACTIVE' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                LIVE IN POT
              </span>
            ) : ticket.status === 'CLAIMED' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                CLAIMED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                NOT MATCHED
              </span>
            )}
          </div>
        </div>

        {/* Middle: 6 Numbers Balls / Foil Scratch */}
        <div className="relative z-10 my-3">
          {!isScratched ? (
            <div
              onClick={handleRevealScratch}
              className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-amber-600/40 via-yellow-500/30 to-amber-600/40 border border-amber-500/50 backdrop-blur-md flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-amber-400 transition-all shadow-inner"
            >
              <div className="flex items-center gap-2 text-amber-300 font-outfit font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Cào Mở Số May Mắn (Scratch to Reveal)</span>
              </div>
              <p className="text-[10px] font-mono text-slate-300">
                Nhấn vào đây để mở lớp tráng bạc 3D Hologram
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {ticket.numbers.map((digit, idx) => {
                const col = BALL_COLORS[digit];
                const isMatched = winningNumbers && winningNumbers[idx] === digit;

                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black text-lg transition-all shadow-md relative overflow-hidden ${
                      isMatched
                        ? 'border-2 border-white text-white ring-2 ring-amber-400 animate-pulse'
                        : 'border border-white/20 text-white'
                    }`}
                    style={{
                      backgroundColor: col.bg,
                      color: col.text,
                    }}
                  >
                    {/* Digit */}
                    <span>{digit}</span>
                    {/* Index Subtext */}
                    <span className="text-[8px] font-mono opacity-70">#{idx + 1}</span>

                    {/* Matched Star Marker */}
                    {isMatched && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 text-black flex items-center justify-center text-[7px] font-black rounded-bl">
                        ★
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Stub Perforated Line & Meta */}
        <div className="relative z-10 pt-2.5 border-t border-dashed border-white/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[150px]">Tx: {ticket.txHash.slice(0, 10)}...</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold">
              ${ticket.purchasePriceUsd.toFixed(2)} {ticket.purchasedWithToken}
            </span>

            {ticket.status === 'WON' && onClaim && (
              <button
                onClick={() => onClaim(ticket.id)}
                className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-[11px] rounded-lg shadow-md transition-all cursor-pointer font-outfit uppercase"
              >
                Claim Payout
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
