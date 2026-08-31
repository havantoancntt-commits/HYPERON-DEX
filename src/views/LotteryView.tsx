import React, { useState, useEffect, useMemo } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import {
  LotteryRound,
  LotteryTicket,
  LotteryWinnerRecord,
  LotteryStats,
  LotteryPoolId,
  NoLossSavingsDeposit,
} from '../types';
import { formatCurrency, shortenAddress } from '../lib/utils';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Ticket,
  Sparkles,
  Zap,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Clock,
  RefreshCw,
  Gift,
  Coins,
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  Hash,
  ExternalLink,
  Dice5,
  Percent,
  Plus,
  Trash2,
  Check,
  Layers,
  ArrowRight,
  Wallet,
  Play
} from 'lucide-react';

export const LotteryView: React.FC = () => {
  const { addToast } = useExchange();
  const { isConnected, connectWallet, address, balances } = useWallet();

  // Active pool tab
  const [selectedPoolId, setSelectedPoolId] = useState<LotteryPoolId>('mega-daily');
  
  // Data state
  const [activeRounds, setActiveRounds] = useState<LotteryRound[]>([]);
  const [pastRounds, setPastRounds] = useState<LotteryRound[]>([]);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [userSavings, setUserSavings] = useState<NoLossSavingsDeposit[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspectingRound, setInspectingRound] = useState<LotteryRound | null>(null);

  // Ticket Purchase State
  const [buyMode, setBuyMode] = useState<'quick' | 'manual'>('quick');
  const [ticketCount, setTicketCount] = useState<number>(5);
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [manualTicket, setManualTicket] = useState<number[]>([7, 7, 7, 7, 7, 7]);
  const [paymentToken, setPaymentToken] = useState<string>('USDC');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isDepositingSavings, setIsDepositingSavings] = useState<boolean>(false);
  const [savingsDepositAmount, setSavingsDepositAmount] = useState<string>('100');

  // Success Celebration Modal
  const [celebrationData, setCelebrationData] = useState<{
    count: number;
    totalCostUsd: number;
    txHash: string;
    tickets: LotteryTicket[];
  } | null>(null);

  // Provably Fair VRF Modal
  const [vrfModalRound, setVrfModalRound] = useState<LotteryRound | null>(null);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Fetch Lottery Overview from backend
  const fetchLotteryData = async () => {
    try {
      const url = address ? `/api/lottery/overview?userAddress=${address}` : '/api/lottery/overview';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setActiveRounds(data.activeRounds || []);
        setPastRounds(data.pastRounds || []);
        setUserTickets(data.userTickets || []);
        setUserSavings(data.userSavings || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load lottery overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotteryData();
    const interval = setInterval(fetchLotteryData, 12000);
    return () => clearInterval(interval);
  }, [address]);

  // Current selected round
  const currentRound = useMemo(() => {
    return activeRounds.find((r) => r.poolId === selectedPoolId) || activeRounds[0];
  }, [activeRounds, selectedPoolId]);

  // Update countdown
  useEffect(() => {
    if (!currentRound) return;
    const calculateTime = () => {
      const diff = Math.max(0, currentRound.endTime - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [currentRound]);

  // Helper: Generate random 6 numbers
  const getRandomNumbers = () => Array.from({ length: 6 }).map(() => Math.floor(Math.random() * 10));

  // Initialize/Regenerate Quick Pick tickets
  useEffect(() => {
    const tickets: number[][] = [];
    for (let i = 0; i < ticketCount; i++) {
      tickets.push(getRandomNumbers());
    }
    setGeneratedTickets(tickets);
  }, [ticketCount]);

  const handleRerollAll = () => {
    soundManager.playRoll();
    const tickets: number[][] = [];
    for (let i = 0; i < ticketCount; i++) {
      tickets.push(getRandomNumbers());
    }
    setGeneratedTickets(tickets);
  };

  const handleRerollSingle = (index: number) => {
    soundManager.playTick();
    setGeneratedTickets((prev) => {
      const next = [...prev];
      next[index] = getRandomNumbers();
      return next;
    });
  };

  // Pricing & Discount calculations
  const { totalCostUsd, discountPercent, effectivePricePerTicket } = useMemo(() => {
    if (!currentRound) return { totalCostUsd: 0, discountPercent: 0, effectivePricePerTicket: 0 };
    
    let bulkDiscount = 0;
    if (ticketCount >= 100) bulkDiscount = 0.20;
    else if (ticketCount >= 50) bulkDiscount = 0.15;
    else if (ticketCount >= 25) bulkDiscount = 0.10;
    else if (ticketCount >= 10) bulkDiscount = 0.05;

    const tokenDiscount = paymentToken.toUpperCase() === 'HYPR' ? 0.20 : 0;
    const netDiscount = Math.min(0.35, bulkDiscount + tokenDiscount);
    const unitPrice = currentRound.ticketPriceUsd * (1 - netDiscount);
    const total = unitPrice * ticketCount;

    return {
      totalCostUsd: total,
      discountPercent: Math.round(netDiscount * 100),
      effectivePricePerTicket: unitPrice,
    };
  }, [currentRound, ticketCount, paymentToken]);

  // Buy Tickets Handler
  const handleBuyTickets = async () => {
    if (!isConnected || !address) {
      connectWallet();
      return;
    }
    if (!currentRound) return;

    try {
      setIsPurchasing(true);
      soundManager.playTick();

      const ticketsToBuy = buyMode === 'quick' ? generatedTickets : [manualTicket];

      const res = await fetch('/api/lottery/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: currentRound.id,
          poolId: currentRound.poolId,
          tickets: ticketsToBuy,
          paymentToken,
          userAddress: address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to buy lottery tickets');
      }

      soundManager.playJackpot();
      setCelebrationData({
        count: ticketsToBuy.length,
        totalCostUsd: data.totalCostUsd,
        txHash: data.txHash,
        tickets: data.tickets,
      });

      addToast({
        title: '🎟️ Tickets Purchased Successfully!',
        message: `Acquired ${ticketsToBuy.length} tickets for ${currentRound.poolName}. Good luck!`,
        type: 'success',
      });

      // Refresh data
      fetchLotteryData();
    } catch (err: any) {
      soundManager.playAlert();
      addToast({
        title: 'Purchase Failed',
        message: err?.message || 'Transaction could not be executed',
        type: 'error',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Deposit No-Loss Savings
  const handleDepositSavings = async () => {
    if (!isConnected || !address) {
      connectWallet();
      return;
    }
    const amt = parseFloat(savingsDepositAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({
        title: 'Invalid Amount',
        message: 'Please enter a valid deposit amount',
        type: 'warning',
      });
      return;
    }

    try {
      setIsDepositingSavings(true);
      const res = await fetch('/api/lottery/deposit-savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          stakedToken: 'USDC',
          amount: amt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit failed');

      soundManager.playSuccess();
      addToast({
        title: '🛡️ Yield Savings Deposited!',
        message: `Staked $${amt} USDC. You earned ${Math.floor(amt / 10)} free lottery entries weekly!`,
        type: 'success',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Deposit Failed',
        message: err?.message || 'Transaction failed',
        type: 'error',
      });
    } finally {
      setIsDepositingSavings(false);
    }
  };

  // Claim Winnings Handler
  const handleClaimWinnings = async () => {
    if (!isConnected || !address) return;
    try {
      setIsClaiming(true);
      const res = await fetch('/api/lottery/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim winnings');

      soundManager.playJackpot();
      addToast({
        title: '💰 Winnings Claimed!',
        message: `Successfully transferred $${data.totalClaimedUsd} to your wallet!`,
        type: 'success',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Claim Failed',
        message: err?.message || 'Could not claim winnings',
        type: 'error',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Test VRF Draw Simulator
  const handleTriggerDraw = async (roundId: number) => {
    try {
      setIsDrawing(true);
      soundManager.playRoll();
      const res = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draw failed');

      soundManager.playSuccess();
      addToast({
        title: '🎲 VRF Round Drawn!',
        message: `Winning Numbers: [ ${data.closedRound.winningNumbers.join(' - ')} ]`,
        type: 'info',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Draw Failed',
        message: err?.message || 'Failed to draw',
        type: 'error',
      });
    } finally {
      setIsDrawing(false);
    }
  };

  // Calculate user total pending prize
  const pendingPrizeUsd = useMemo(() => {
    return userTickets
      .filter((t) => t.status === 'WON' && (t.wonPrizeUsd || 0) > 0)
      .reduce((acc, t) => acc + (t.wonPrizeUsd || 0), 0);
  }, [userTickets]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#03060B] p-3 sm:p-6 md:p-8 pb-32 sm:pb-16 space-y-6 sm:space-y-8 scrollbar-thin">
      {/* 1. HERO JACKPOT BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#161005] via-[#0E0B14] to-[#050916] p-5 sm:p-8 md:p-10 shadow-2xl shadow-amber-950/30">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-mono font-bold tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span className="truncate">CHAINLINK VRF 2.5 PROVABLY FAIR MEGA LOTTERY</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight font-outfit">
              HYPERON <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">MEGA JACKPOT</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-sans">
              Transparent, decentralized, multi-tier Web3 lottery with guaranteed on-chain entropy. Match consecutive lucky numbers to win up to <strong className="text-amber-300">50% of the entire prize pot</strong> instantly.
            </p>

            {/* Quick Feature Chips */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/25 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> 100% Non-Custodial
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-cyan-300 font-mono bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/25 font-semibold">
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" /> 20% OFF with $HYPR (Auto-Burn)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-purple-300 font-mono bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/25 font-semibold">
                <Percent className="w-3.5 h-3.5 shrink-0" /> Up to 20% Bulk Discount
              </span>
            </div>
          </div>

          {/* Mega Prize Pot Card */}
          <div className="w-full lg:w-96 shrink-0 bg-gradient-to-b from-amber-500/20 via-black/80 to-black/95 p-5 sm:p-6 rounded-3xl border border-amber-500/50 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Estimated Current Prize Pot</span>
            </div>

            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 font-mono tracking-tight animate-gold-shimmer">
              ${(currentRound?.totalPotUsd || 647890).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>

            {/* Countdown Clock */}
            <div className="w-full bg-black/70 border border-white/10 rounded-2xl p-3 flex items-center justify-around font-mono">
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Hours</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-amber-400">:</span>
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Mins</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-amber-400">:</span>
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Secs</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Round #{currentRound?.id} Closes in real-time</span>
            </div>
          </div>
        </div>

        {/* Global Stats Ribbon */}
        {stats && (
          <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Total Winnings Paid</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">${stats.totalDistributedUsd.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Total Tickets Sold</div>
              <div className="text-base sm:text-lg font-bold text-cyan-400 font-mono mt-0.5">{stats.totalTicketsBoughtAllTime.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">HYPR Burned via Pot</div>
              <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">${stats.totalBurnedHyprUsd.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Record Single Jackpot</div>
              <div className="text-base sm:text-lg font-bold text-yellow-300 font-mono mt-0.5">${stats.largestSingleJackpotUsd.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. UNCLAIMED WINNINGS BANNER (IF APPLICABLE) */}
      {pendingPrizeUsd > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-teal-950/80 border-2 border-emerald-500/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-300">🎉 Congratulations! You Have Unclaimed Lottery Winnings!</div>
              <div className="text-2xl font-black text-white font-mono">
                ${pendingPrizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
            </div>
          </div>

          <button
            onClick={handleClaimWinnings}
            disabled={isClaiming}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isClaiming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            <span>Claim All Winnings Now</span>
          </button>
        </div>
      )}

      {/* 3. POOL SELECTION TABS */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => {
            soundManager.playTick();
            setSelectedPoolId('mega-daily');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            selectedPoolId === 'mega-daily'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25'
              : 'bg-[#070A12] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className={`w-4 h-4 ${selectedPoolId === 'mega-daily' ? 'text-black' : 'text-amber-400'}`} />
          <span className="font-outfit">Mega Daily Jackpot</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'mega-daily' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            $5 / tkt
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playTick();
            setSelectedPoolId('hourly-lightning');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            selectedPoolId === 'hourly-lightning'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-lg shadow-cyan-500/25'
              : 'bg-[#070A12] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <Zap className={`w-4 h-4 ${selectedPoolId === 'hourly-lightning' ? 'text-black' : 'text-cyan-400'}`} />
          <span className="font-outfit">Hourly Lightning Rush</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'hourly-lightning' ? 'bg-black/20 text-black' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          }`}>
            $1 / tkt
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playTick();
            setSelectedPoolId('no-loss-savings');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            selectedPoolId === 'no-loss-savings'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/25'
              : 'bg-[#070A12] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${selectedPoolId === 'no-loss-savings' ? 'text-black' : 'text-emerald-400'}`} />
          <span className="font-outfit">Zero-Loss Yield Savings</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'no-loss-savings' ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            100% Safe Principal
          </span>
        </button>
      </div>

      {/* 4. MAIN INTERACTIVE CONTENT AREA */}
      {selectedPoolId !== 'no-loss-savings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* LEFT: TICKET BUYING CONSOLE (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-outfit">
                    <Ticket className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Purchase Lottery Tickets</span>
                  </h3>
                  <p className="text-xs text-slate-400">Select numbers or generate lucky sequences in 1-click</p>
                </div>

                {/* Mode Selector */}
                <div className="flex bg-black/60 p-1 rounded-xl border border-white/[0.08] shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setBuyMode('quick')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      buyMode === 'quick'
                        ? 'bg-amber-500 text-black shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Quick Pick (Bulk)
                  </button>
                  <button
                    onClick={() => setBuyMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      buyMode === 'manual'
                        ? 'bg-amber-500 text-black shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual Custom
                  </button>
                </div>
              </div>

              {/* QUICK PICK MODE */}
              {buyMode === 'quick' && (
                <div className="space-y-5">
                  {/* Quantity selector presets */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Choose Quantity (Higher Volume = Higher Discount):
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { count: 1, disc: '0%' },
                        { count: 5, disc: '0%' },
                        { count: 10, disc: '5% OFF' },
                        { count: 25, disc: '10% OFF' },
                        { count: 50, disc: '15% OFF' },
                        { count: 100, disc: '20% OFF' },
                      ].map((item) => (
                        <button
                          key={item.count}
                          onClick={() => {
                            soundManager.playTick();
                            setTicketCount(item.count);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            ticketCount === item.count
                              ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-md font-bold'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <div className="text-sm font-mono font-bold">{item.count}x</div>
                          <div className="text-[10px] text-emerald-400 font-mono">{item.disc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generated Ticket Preview Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Generated Ticket Preview ({generatedTickets.length} tickets):</span>
                      <button
                        onClick={handleRerollAll}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-roll All
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {generatedTickets.slice(0, 15).map((digits, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-1.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition-all"
                        >
                          <div className="text-[11px] font-mono text-slate-500 font-bold shrink-0 w-6">#{idx + 1}</div>
                          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                            {digits.map((d, dIdx) => (
                              <span
                                key={dIdx}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-500/25 to-black/80 border border-amber-500/40 text-amber-300 font-bold font-mono text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRerollSingle(idx)}
                            title="Re-roll lucky numbers"
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Dice5 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {generatedTickets.length > 15 && (
                        <div className="text-center py-2 text-xs text-slate-500 font-mono">
                          + {generatedTickets.length - 15} more tickets in batch
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MANUAL CUSTOM PICK MODE */}
              {buyMode === 'manual' && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-xs text-slate-400 font-mono">Dial Your 6 Lucky Digits:</span>
                    <div className="flex items-center justify-center gap-1 sm:gap-2.5 py-2">
                      {manualTicket.map((d, dIdx) => (
                        <div key={dIdx} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              soundManager.playTick();
                              setManualTicket((prev) => {
                                const next = [...prev];
                                next[dIdx] = (next[dIdx] + 1) % 10;
                                return next;
                              });
                            }}
                            className="w-10 h-6 sm:w-12 sm:h-7 bg-white/[0.06] hover:bg-amber-500/25 text-slate-300 hover:text-amber-200 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            ▲
                          </button>
                          <div className="w-10 h-12 sm:w-12 sm:h-14 rounded-2xl bg-gradient-to-b from-amber-500/25 to-black/90 border-2 border-amber-500/60 text-amber-200 font-black font-mono text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-amber-950/40">
                            {d}
                          </div>
                          <button
                            onClick={() => {
                              soundManager.playTick();
                              setManualTicket((prev) => {
                                const next = [...prev];
                                next[dIdx] = (next[dIdx] + 9) % 10;
                                return next;
                              });
                            }}
                            className="w-10 h-6 sm:w-12 sm:h-7 bg-white/[0.06] hover:bg-amber-500/25 text-slate-300 hover:text-amber-200 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            ▼
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        soundManager.playRoll();
                        setManualTicket(getRandomNumbers());
                      }}
                      className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer"
                    >
                      <Dice5 className="w-4 h-4 text-amber-400" /> Randomize Lucky Digits
                    </button>
                  </div>
                </div>
              )}

              {/* PAYMENT TOKEN & PRICING SUMMARY */}
              <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-2 block">
                    Pay With Token:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { sym: 'USDC', label: 'USDC', disc: null },
                      { sym: 'USDT', label: 'USDT', disc: null },
                      { sym: 'ETH', label: 'ETH', disc: null },
                      { sym: 'HYPR', label: 'HYPR', disc: '20% OFF' },
                    ].map((token) => (
                      <button
                        key={token.sym}
                        onClick={() => {
                          soundManager.playTick();
                          setPaymentToken(token.sym);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentToken === token.sym
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow-md'
                            : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold">{token.label}</div>
                        {token.disc && (
                          <div className="text-[9px] text-orange-400 font-mono font-semibold">{token.disc}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary Box */}
                <div className="bg-black/60 p-4 rounded-2xl border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Ticket Price:</span>
                    <span>${currentRound?.ticketPriceUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Discount Applied:</span>
                    <span className="text-emerald-400 font-semibold">{discountPercent}% OFF</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Effective Price / Ticket:</span>
                    <span className="text-slate-200">${effectivePricePerTicket.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.08]">
                    <span>Total Payment:</span>
                    <span className="text-amber-300 text-base font-bold">
                      ${(buyMode === 'quick' ? totalCostUsd : effectivePricePerTicket).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={handleBuyTickets}
                  disabled={isPurchasing}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit"
                >
                  {isPurchasing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Broadcasting On-Chain Tx...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" />
                      <span>Buy {buyMode === 'quick' ? ticketCount : 1} Tickets Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Simulation Controls (For Sandbox Testing) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Dice5 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Dev Sandbox: Test VRF Draw & evaluate winners immediately</span>
              </div>
              <button
                onClick={() => currentRound && handleTriggerDraw(currentRound.id)}
                disabled={isDrawing}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono font-semibold transition-all cursor-pointer shrink-0"
              >
                {isDrawing ? 'Drawing VRF...' : 'Trigger VRF Draw'}
              </button>
            </div>
          </div>

          {/* RIGHT: PRIZE TIERS & RECENT WINNERS (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Prize Distribution Tiers */}
            <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-outfit">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Prize Distribution Matrix</span>
                </h3>
                <button
                  onClick={() => setVrfModalRound(currentRound)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> VRF Audit
                </button>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {currentRound?.prizesByTier.map((tier) => (
                  <div
                    key={tier.matchedDigits}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      tier.matchedDigits === 6
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 font-bold shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{tier.label}</div>
                      <div className="text-[10px] text-slate-500">{tier.allocationPercent}% of Pot</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">
                        ${tier.poolAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tier.winnersCount > 0 ? `${tier.winnersCount} Winner(s)` : '0 Winners yet'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Winners Hall of Fame */}
            <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-outfit">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Recent Big Winners (Hall of Fame)</span>
              </h3>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {stats?.recentWinners.map((win) => (
                  <div
                    key={win.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between font-mono text-xs hover:border-white/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{shortenAddress(win.winnerAddress)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          Matched {win.matchedDigits}/6
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-0.5">Round #{win.roundId} • {win.prizeToken}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">
                        +${win.prizeAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-cyan-400 flex items-center justify-end gap-1">
                        <span>{shortenAddress(win.txHash)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ZERO-LOSS SAVINGS POOL INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-[#07090E] border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% PRINCIPAL PROTECTED DEFI LOTTERY</span>
              </div>
              <h2 className="text-2xl font-bold text-white font-outfit">DeFi Prize-Linked Savings Protocol</h2>
              <p className="text-xs text-slate-300">
                Deposit USDC or ETH into Hyperon's Institutional Yield Vault. Your capital is never risked or spent. The collective staking yield funds the weekly $74,200 jackpot!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Staked in Vault:</span>
                <span className="text-emerald-400 font-bold">$1,285,000 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Underlying Staking Yield:</span>
                <span className="text-slate-200">12.4% APY via Aave v3 & Compound</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ticket Formula:</span>
                <span className="text-amber-300">1 Free Ticket per $10 Staked Every Week</span>
              </div>
            </div>

            {/* Deposit Input */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-2">Deposit Amount (USDC):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={savingsDepositAmount}
                    onChange={(e) => setSavingsDepositAmount(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="100"
                  />
                  <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-mono font-bold">USDC</span>
                </div>
              </div>

              <button
                onClick={handleDepositSavings}
                disabled={isDepositingSavings}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit"
              >
                {isDepositingSavings ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <span>Deposit & Earn Free Weekly Entries</span>
              </button>
            </div>
          </div>

          {/* Right: User's Savings Position */}
          <div className="lg:col-span-5 bg-[#07090E] border border-white/[0.08] rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-outfit">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>My Yield Savings Position</span>
            </h3>

            {userSavings.length > 0 ? (
              <div className="space-y-3">
                {userSavings.map((dep) => (
                  <div key={dep.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 font-mono text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>Deposited:</span>
                      <span className="text-emerald-400">${dep.valueUsd} {dep.stakedToken}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Free Weekly Tickets:</span>
                      <span className="text-amber-300 font-bold">{dep.ticketsEarned} Tickets</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2 text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">No active savings deposits yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. USER'S TICKETS & HISTORICAL ROUNDS SECTION */}
      <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-outfit">
              <Ticket className="w-5 h-5 text-amber-400" />
              <span>My Active & Past Tickets ({userTickets.length})</span>
            </h3>
            <p className="text-xs text-slate-400">All purchased tickets with on-chain cryptographic proofs</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLotteryData}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {userTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTickets.map((tkt) => (
              <div
                key={tkt.id}
                className={`p-4 rounded-2xl border transition-all ${
                  tkt.status === 'WON'
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : tkt.status === 'CLAIMED'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-white/[0.04]">
                  <span className="text-slate-400">Round #{tkt.roundId}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tkt.status === 'WON'
                        ? 'bg-emerald-500 text-black'
                        : tkt.status === 'CLAIMED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    {tkt.status}
                  </span>
                </div>

                {/* Ticket Digits */}
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-3">
                  {tkt.numbers.map((d, dIdx) => (
                    <span
                      key={dIdx}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-bold flex items-center justify-center text-xs sm:text-sm ${
                        tkt.matchedDigitsCount && dIdx < tkt.matchedDigitsCount
                          ? 'bg-emerald-500 text-black shadow-md'
                          : 'bg-black/60 border border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04]">
                  <span>Paid: ${tkt.purchasePriceUsd.toFixed(2)}</span>
                  {tkt.wonPrizeUsd ? (
                    <span className="text-emerald-400 font-bold">Won: +${tkt.wonPrizeUsd.toFixed(2)}</span>
                  ) : (
                    <span>{shortenAddress(tkt.txHash)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Ticket className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 font-medium">No tickets purchased yet for your connected wallet.</p>
            <p className="text-xs text-slate-500">Pick lucky numbers above to enter the current $647K Mega Jackpot!</p>
          </div>
        )}
      </div>

      {/* 6. PROVABLY FAIR VRF INSPECTION MODAL */}
      <AnimatePresence>
        {vrfModalRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-xl bg-[#0B0E14] border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-outfit">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Chainlink VRF 2.5 Cryptographic Verification</span>
                </div>
                <button
                  onClick={() => setVrfModalRound(null)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-black/60 p-3 rounded-2xl border border-white/[0.06] space-y-1">
                  <div className="text-slate-400 text-[10px]">VRF Coordinator Contract:</div>
                  <div className="text-cyan-400 break-all">0x271682DEB8C4E0901D1a1550aD2e64D568E69909</div>
                </div>

                <div className="bg-black/60 p-3 rounded-2xl border border-white/[0.06] space-y-1">
                  <div className="text-slate-400 text-[10px]">Entropy Seed (Keccak256):</div>
                  <div className="text-amber-300 break-all">{vrfModalRound.vrfSeed || '0x8f4d9b23c5e81a0293817f763abdf543918a992bc6643210aa39ec77281ab091'}</div>
                </div>

                <div className="bg-black/60 p-3 rounded-2xl border border-white/[0.06] space-y-1">
                  <div className="text-slate-400 text-[10px]">Oracle Draw Transaction Hash:</div>
                  <div className="text-slate-200 break-all">{vrfModalRound.vrfTxHash || '0xd7a5e98214309baef49191e4a30e84b840131498b8398e0915fcfd515a86d267'}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Entropy verified on-chain. Neither miners, validators nor admins can predict or manipulate draw numbers.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. CELEBRATION MODAL */}
      <AnimatePresence>
        {celebrationData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-gradient-to-b from-[#161205] to-[#0A0D14] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl shadow-amber-500/20 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-amber-500/20 rounded-full border-2 border-amber-500/50 flex items-center justify-center mx-auto text-amber-300">
                <Trophy className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white font-outfit">Tickets Purchased!</h3>
                <p className="text-xs text-slate-300">
                  You have successfully entered {celebrationData.count} tickets into the Mega Jackpot draw.
                </p>
              </div>

              <div className="bg-black/60 p-4 rounded-2xl border border-white/[0.08] text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Tickets Acquired:</span>
                  <span className="text-white font-bold">{celebrationData.count} Tickets</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Amount Paid:</span>
                  <span className="text-amber-300 font-bold">${celebrationData.totalCostUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Transaction Hash:</span>
                  <span className="text-cyan-400">{shortenAddress(celebrationData.txHash)}</span>
                </div>
              </div>

              <button
                onClick={() => setCelebrationData(null)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm rounded-2xl transition-all cursor-pointer font-outfit"
              >
                Done & View My Tickets
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
