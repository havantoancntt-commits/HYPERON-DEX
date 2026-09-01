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
  LotterySyndicatePool,
  LotteryAnalytics,
} from '../types';
import { formatCurrency, shortenAddress } from '../lib/utils';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Lottery3DDrum } from '../components/Lottery3DDrum';
import { Lottery3DTicket } from '../components/Lottery3DTicket';
import { LotteryAnalyticsModal } from '../components/LotteryAnalyticsModal';
import { LotterySyndicateModal } from '../components/LotterySyndicateModal';
import { LotteryPrizeBreakdownModal } from '../components/LotteryPrizeBreakdownModal';
import { LotteryTicketScannerModal } from '../components/LotteryTicketScannerModal';
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
  Play,
  BarChart3,
  Users,
  Eye,
  Search,
  Cpu,
  Radio,
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
  const [syndicates, setSyndicates] = useState<LotterySyndicatePool[]>([]);
  const [analytics, setAnalytics] = useState<LotteryAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  // 3D Drum & Modals State
  const [is3DDrumOpen, setIs3DDrumOpen] = useState<boolean>(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSyndicateOpen, setIsSyndicateOpen] = useState<boolean>(false);
  const [isPrizeBreakdownOpen, setIsPrizeBreakdownOpen] = useState<boolean>(false);
  const [isTicketScannerOpen, setIsTicketScannerOpen] = useState<boolean>(false);
  const [powerPlayMultiplier, setPowerPlayMultiplier] = useState<number>(1);

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

  // Fetch Lottery Overview from backend with auto-retry
  const fetchLotteryData = async (retryCount = 0) => {
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
        setSyndicates(data.syndicates || []);
        setAnalytics(data.analytics || null);
      }
    } catch (err) {
      if (retryCount < 3) {
        setTimeout(() => fetchLotteryData(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        console.warn('[HYPERON-DEX] Lottery overview syncing in background...');
      }
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

  // Helper: Generate random 6 numbers
  const getRandomNumbers = () => Array.from({ length: 6 }).map(() => Math.floor(Math.random() * 10));

  // Helper: Generate AI Hot Numbers based on analytics
  const getHotNumbers = () => {
    const hotPool = analytics?.hotDigits && analytics.hotDigits.length > 0 ? analytics.hotDigits : [7, 3, 9, 8, 2, 4];
    return Array.from({ length: 6 }).map(() => {
      if (Math.random() < 0.7) {
        return hotPool[Math.floor(Math.random() * hotPool.length)];
      }
      return Math.floor(Math.random() * 10);
    });
  };

  // Helper: Generate Cold / Overdue Numbers
  const getColdNumbers = () => {
    const coldPool = analytics?.coldDigits && analytics.coldDigits.length > 0 ? analytics.coldDigits : [5, 0, 1, 6];
    return Array.from({ length: 6 }).map(() => {
      if (Math.random() < 0.65) {
        return coldPool[Math.floor(Math.random() * coldPool.length)];
      }
      return Math.floor(Math.random() * 10);
    });
  };

  // Update countdown & auto draw trigger
  useEffect(() => {
    if (!currentRound) return;
    const calculateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, currentRound.endTime - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });

      // Automatically trigger 3D drum draw when round reaches 0 or is in drawing state
      if ((diff === 0 || currentRound.status === 'DRAWING') && !isDrawing && !currentRound.winningNumbers) {
        handleTriggerDraw(currentRound.id);
      }
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [currentRound, isDrawing]);

  // Round progress percentage
  const roundProgressPercent = useMemo(() => {
    if (!currentRound) return 0;
    const total = currentRound.endTime - currentRound.startTime;
    if (total <= 0) return 100;
    const elapsed = Date.now() - currentRound.startTime;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [currentRound, timeLeft]);

  // Initialize/Regenerate Quick Pick tickets
  useEffect(() => {
    const tickets: number[][] = [];
    for (let i = 0; i < ticketCount; i++) {
      tickets.push(getRandomNumbers());
    }
    setGeneratedTickets(tickets);
  }, [ticketCount]);

  const handleRerollAll = (type: 'random' | 'hot' | 'cold' = 'random') => {
    soundManager.playRoll();
    const tickets: number[][] = [];
    for (let i = 0; i < ticketCount; i++) {
      if (type === 'hot') tickets.push(getHotNumbers());
      else if (type === 'cold') tickets.push(getColdNumbers());
      else tickets.push(getRandomNumbers());
    }
    setGeneratedTickets(tickets);
    addToast({
      title: type === 'hot' ? '🔥 Đã Tạo Bộ Số Hot' : type === 'cold' ? '❄️ Đã Tạo Bộ Số Cold' : '🎲 Đã Đổi Ngẫu Nhiên',
      message: `Đã cập nhật tự động ${ticketCount} dãy số theo thuật toán ${type.toUpperCase()}.`,
      type: 'info',
    });
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
    const multiplierSurcharge = powerPlayMultiplier > 1 ? (powerPlayMultiplier - 1) * 0.3 : 0;
    const baseWithMultiplier = currentRound.ticketPriceUsd * (1 + multiplierSurcharge);
    const unitPrice = baseWithMultiplier * (1 - netDiscount);
    const total = unitPrice * (buyMode === 'quick' ? ticketCount : 1);

    return {
      totalCostUsd: total,
      discountPercent: Math.round(netDiscount * 100),
      effectivePricePerTicket: unitPrice,
    };
  }, [currentRound, ticketCount, paymentToken, powerPlayMultiplier, buyMode]);

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
          multiplier: powerPlayMultiplier,
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
        title: '🎟️ Vé Số 3D Đã Mua Thành Công!',
        message: `Đã sở hữu ${ticketsToBuy.length} vé cho ${currentRound.poolName}. Chúc may mắn!`,
        type: 'success',
      });

      // Refresh data
      fetchLotteryData();
    } catch (err: any) {
      soundManager.playAlert();
      addToast({
        title: 'Giao Dịch Thất Bại',
        message: err?.message || 'Transaction could not be executed',
        type: 'error',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Join Syndicate Pool Handler
  const handleJoinSyndicate = async (syndicateId: string, shares: number) => {
    if (!isConnected || !address) {
      connectWallet();
      return;
    }

    const res = await fetch('/api/lottery/syndicate/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        syndicateId,
        sharesCount: shares,
        userAddress: address,
        paymentToken,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to join syndicate');

    addToast({
      title: '👥 Tham Gia Hồ Bơi Nhóm Thành Công!',
      message: `Đã mua ${shares} suất cổ phần vé số nhóm. Chúc cả guild chiến thắng!`,
      type: 'success',
    });

    fetchLotteryData();
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
        title: 'Số Tiền Không Hợp Lệ',
        message: 'Vui lòng nhập số tiền gửi hợp lệ',
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
        title: '🛡️ Đã Ký Gửi Tiết Kiệm Không Mất Gốc!',
        message: `Staked $${amt} USDC. Bạn nhận được ${Math.floor(amt / 10)} vé số miễn phí hàng tuần!`,
        type: 'success',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Ký Gửi Thất Bại',
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
        title: '💰 Đã Rút Thưởng Thành Công!',
        message: `Đã chuyển $${data.totalClaimedUsd} USD trực tiếp về ví của bạn!`,
        type: 'success',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Rút Thưởng Thất Bại',
        message: err?.message || 'Could not claim winnings',
        type: 'error',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Automated & On-Demand Provably Fair VRF 2.5 Draw Engine
  const handleTriggerDraw = async (roundId: number) => {
    if (isDrawing) return;
    try {
      setIsDrawing(true);
      setIs3DDrumOpen(true);
      soundManager.playDrumSpin();
      const res = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draw failed');

      soundManager.playJackpot();
      addToast({
        title: '🎲 Chainlink VRF 2.5 Tự Động Quay Thưởng Xong!',
        message: `Số trúng thưởng: [ ${data.closedRound.winningNumbers.join(' - ')} ] • Đã tự động đối soát & quyết toán.`,
        type: 'success',
      });
      fetchLotteryData();
    } catch (err: any) {
      addToast({
        title: 'Quay Thưởng Thất Bại',
        message: err?.message || 'Failed to execute draw',
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
            <div className="max-w-full inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-mono font-bold tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">CHAINLINK VRF 2.5 PROVABLY FAIR • 3D MEGA LOTTERY</span>
              <span className="sm:hidden font-semibold">VRF 2.5 PROVABLY FAIR • 3D LOTTERY</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight font-outfit">
              HYPERON <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">MEGA 3D JACKPOT</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-sans">
              Hệ thống xổ số blockchain 3D thế hệ mới: Lồng quay vật lý 3D chân thực, vé cào 3D Hologram, thuật toán chọn số AI lượng tử và hồ bơi vé số nhóm (Syndicates) chuẩn quốc tế.
            </p>

            {/* Quick Feature Chips & Action Triggers */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsAnalyticsOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-300 font-mono bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-xl border border-amber-500/35 font-bold cursor-pointer transition-all shadow"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Trợ Lý Chọn Số AI</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsPrizeBreakdownOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-yellow-300 font-mono bg-yellow-500/15 hover:bg-yellow-500/25 px-3 py-1.5 rounded-xl border border-yellow-500/35 font-bold cursor-pointer transition-all shadow"
              >
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                <span>Cơ Cấu Giải Thưởng & Xác Suất EV</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsTicketScannerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-cyan-300 font-mono bg-cyan-500/15 hover:bg-cyan-500/25 px-3 py-1.5 rounded-xl border border-cyan-500/35 font-bold cursor-pointer transition-all shadow"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Máy So Vé Số On-Chain</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsSyndicateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-indigo-300 font-mono bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-1.5 rounded-xl border border-indigo-500/35 font-bold cursor-pointer transition-all shadow"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vé Số Nhóm (Syndicate)</span>
              </button>

              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/25 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> VRF 2.5 Audit
              </span>
            </div>
          </div>

          {/* Mega Prize Pot Card */}
          <div className="w-full lg:w-96 shrink-0 bg-gradient-to-b from-amber-500/20 via-black/80 to-black/95 p-5 sm:p-6 rounded-3xl border border-amber-500/50 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Tổng Giải Thưởng Đang Chờ Nổ</span>
            </div>

            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 font-mono tracking-tight">
              ${(currentRound?.totalPotUsd || 647890).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>

            {/* Countdown Clock */}
            <div className="w-full bg-black/70 border border-white/10 rounded-2xl p-3 flex items-center justify-around font-mono">
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Giờ</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-amber-400">:</span>
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Phút</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-amber-400">:</span>
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-black text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Giây</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Kỳ Quay #{currentRound?.id} Khóa sổ đếm ngược</span>
            </div>
          </div>
        </div>

        {/* Global Stats Ribbon */}
        {stats && (
          <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Tổng Thưởng Đã Trả</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">${stats.totalDistributedUsd.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Vé Đã Phát Hành</div>
              <div className="text-base sm:text-lg font-bold text-cyan-400 font-mono mt-0.5">{stats.totalTicketsBoughtAllTime.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">HYPR Đã Đốt (Burn)</div>
              <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">${stats.totalBurnedHyprUsd.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 font-medium">Jackpot Kỷ Lục Đơn</div>
              <div className="text-base sm:text-lg font-bold text-yellow-300 font-mono mt-0.5">${stats.largestSingleJackpotUsd.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 3D LOTTERY DRUM ARENA (CENTRAL STAGE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dice5 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white font-outfit uppercase flex items-center gap-2">
              <span>Khán Đài Lồng Quay Xổ Số 3D Tự Động</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
          </div>

          <button
            onClick={() => setIs3DDrumOpen(!is3DDrumOpen)}
            className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            {is3DDrumOpen ? 'Thu Gọn 3D' : 'Mở Rộng 3D Arena'}
          </button>
        </div>

        {is3DDrumOpen && (
          <Lottery3DDrum
            isDrawing={isDrawing}
            winningNumbers={currentRound?.winningNumbers}
            onDrawComplete={async (drawn) => {
              setIsDrawing(false);
              addToast({
                title: '✨ 3D Drum Draw Tự Động Hoàn Tất!',
                message: `Kết quả quay số: [ ${drawn.join(' - ')} ] • Đã tự động đối soát & quyết toán.`,
                type: 'success',
              });
              // Refresh full lottery dataset automatically
              await fetchLotteryData();
            }}
            roundId={currentRound?.id}
            poolName={currentRound?.poolName}
            themeColor={selectedPoolId === 'hourly-lightning' ? 'cyan' : selectedPoolId === 'no-loss-savings' ? 'emerald' : 'gold'}
            timeLeft={timeLeft}
            roundStatus={currentRound?.status}
            vrfTxHash={currentRound?.vrfTxHash}
            vrfSeed={currentRound?.vrfSeed}
          />
        )}
      </div>

      {/* 3. UNCLAIMED WINNINGS BANNER (IF APPLICABLE) */}
      {pendingPrizeUsd > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-teal-950/80 border-2 border-emerald-500/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-300">🎉 Chúc Mừng! Bạn Có Tiền Trúng Thưởng Chưa Rút!</div>
              <div className="text-2xl font-black text-white font-mono">
                ${pendingPrizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
            </div>
          </div>

          <button
            onClick={handleClaimWinnings}
            disabled={isClaiming}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer font-outfit uppercase"
          >
            {isClaiming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            <span>Rút Toàn Bộ Thưởng Ngay</span>
          </button>
        </div>
      )}

      {/* 4. POOL SELECTION TABS */}
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
          <span className="font-outfit">Mega 6/45 Powerball</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'mega-daily' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            $5 / vé
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
          <span className="font-outfit">Lightning Rush Hàng Giờ</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'hourly-lightning' ? 'bg-black/20 text-black' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          }`}>
            $1 / vé
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
          <span className="font-outfit">Tiết Kiệm 100% Không Mất Gốc</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
            selectedPoolId === 'no-loss-savings' ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            An Toàn Tuyệt Đối
          </span>
        </button>
      </div>

      {/* 5. MAIN INTERACTIVE CONTENT AREA */}
      {selectedPoolId !== 'no-loss-savings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* LEFT: TICKET BUYING CONSOLE (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-outfit">
                    <Ticket className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Mua Vé Số Chuẩn Quốc Tế</span>
                  </h3>
                  <p className="text-xs text-slate-400">Chọn số thủ công, mua hàng loạt hoặc dùng Trợ Lý AI</p>
                </div>

                {/* Mode Selector & AI triggers */}
                <div className="flex items-center gap-2">
                  <div className="flex bg-black/60 p-1 rounded-xl border border-white/[0.08] shrink-0">
                    <button
                      onClick={() => setBuyMode('quick')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        buyMode === 'quick'
                          ? 'bg-amber-500 text-black shadow-md font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Chọn Nhanh (Bulk)
                    </button>
                    <button
                      onClick={() => setBuyMode('manual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        buyMode === 'manual'
                          ? 'bg-amber-500 text-black shadow-md font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tự Chọn Số
                    </button>
                  </div>
                </div>
              </div>

              {/* QUICK PICK MODE */}
              {buyMode === 'quick' && (
                <div className="space-y-5">
                  {/* Quantity selector presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Chọn Số Lượng Vé (Chiết khấu tự động lên đến 20%):
                      </label>
                      {discountPercent > 0 && (
                        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          Tiết kiệm {discountPercent}% khi mua sỉ
                        </span>
                      )}
                    </div>
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

                  {/* AI & Cryptographic Algorithm Selector Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.04]">
                    <span className="text-[11px] text-slate-400 font-mono">Tạo Số Tự Động:</span>
                    <button
                      onClick={() => handleRerollAll('random')}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all"
                    >
                      <Dice5 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>🎲 Ngẫu Nhiên Mật Mã</span>
                    </button>
                    <button
                      onClick={() => handleRerollAll('hot')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-mono flex items-center gap-1.5 border border-amber-500/30 cursor-pointer font-bold transition-all"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>🔥 Bộ Số Hot AI</span>
                    </button>
                    <button
                      onClick={() => handleRerollAll('cold')}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-mono flex items-center gap-1.5 border border-blue-500/30 cursor-pointer font-bold transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>❄️ Bộ Số Cold (Chờ Nổ)</span>
                    </button>
                  </div>

                  {/* Generated Ticket Preview Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Xem Trước Các Dãy Số ({generatedTickets.length} vé):</span>
                      <button
                        onClick={() => handleRerollAll('random')}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Đổi Toàn Bộ Số
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
                    </div>
                  </div>
                </div>
              )}

              {/* MANUAL CUSTOM PICK MODE */}
              {buyMode === 'manual' && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-xs text-slate-400 font-mono">Quay Chọn 6 Chữ Số May Mắn:</span>
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

                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        soundManager.playRoll();
                        setManualTicket(getRandomNumbers());
                      }}
                      className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer font-mono"
                    >
                      <Dice5 className="w-4 h-4 text-cyan-400" /> Ngẫu Nhiên
                    </button>

                    <button
                      onClick={() => {
                        soundManager.playRoll();
                        setManualTicket(getHotNumbers());
                      }}
                      className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-xl text-xs flex items-center gap-2 border border-amber-500/30 cursor-pointer font-mono font-bold"
                    >
                      <Flame className="w-4 h-4 text-amber-400" /> Số Hot AI
                    </button>

                    <button
                      onClick={() => {
                        soundManager.playTick();
                        setIsAnalyticsOpen(true);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs flex items-center gap-2 cursor-pointer font-bold font-mono shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" /> Trợ Lý AI & Chiêm Tinh
                    </button>
                  </div>
                </div>
              )}

              {/* POWERPLAY MULTIPLIER BOOST */}
              <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 font-mono">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hệ Số Nhân PowerPlay Multiplier (Nhân Giải Lên Đến 5x):</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Áp dụng các giải 1-5</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { mult: 1, label: '1x Thường', extra: '+0%' },
                    { mult: 2, label: '2x Double', extra: '+30%' },
                    { mult: 3, label: '3x Triple', extra: '+60%' },
                    { mult: 5, label: '5x Mega Win', extra: '+120%' },
                  ].map((p) => (
                    <button
                      key={p.mult}
                      onClick={() => {
                        soundManager.playTick();
                        setPowerPlayMultiplier(p.mult);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-mono ${
                        powerPlayMultiplier === p.mult
                          ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500 text-amber-300 font-black shadow-md'
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[9px] text-slate-500">{p.extra} phí</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PAYMENT TOKEN & PRICING SUMMARY */}
              <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-2 block">
                    Thanh Toán Bằng Token:
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
                    <span>Giá Gốc / Vé:</span>
                    <span>${currentRound?.ticketPriceUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Chiết Khấu Đã Áp Dụng:</span>
                    <span className="text-emerald-400 font-semibold">{discountPercent}% OFF</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Giá Thực Tế / Vé:</span>
                    <span className="text-slate-200">${effectivePricePerTicket.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.08]">
                    <span>Tổng Tiền Thanh Toán:</span>
                    <span className="text-amber-300 text-base font-bold">
                      ${(buyMode === 'quick' ? totalCostUsd : effectivePricePerTicket).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={handleBuyTickets}
                  disabled={isPurchasing}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit uppercase tracking-wider"
                >
                  {isPurchasing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Đang Gửi Giao Dịch Lên Blockchain...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" />
                      <span>Xác Nhận Mua {buyMode === 'quick' ? ticketCount : 1} Vé 3D</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AUTOMATED SYNCHRONIZED COUNTDOWN & VRF 2.5 SPIN ENGINE (RED CIRCLE REVOLUTION) */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#07131B] via-[#080E18] to-[#120D05] border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/40 space-y-4">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header: Status & Oracle verification badge */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shrink-0 shadow-lg shadow-cyan-500/20">
                    <Cpu className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-white font-outfit uppercase tracking-wide">
                        Hệ Thống Đếm Ngược & Mở Thưởng VRF 2.5
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> TỰ ĐỘNG A-Z
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Kỳ #{currentRound?.id} • Đồng bộ hóa thời gian thực với Chainlink Oracle & Lồng 3D
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-black/60 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>ORACLE LIVE</span>
                  </span>
                </div>
              </div>

              {/* Central Real-Time Countdown Timer Display */}
              <div className="relative z-10 bg-black/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                    <Clock className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="font-semibold">Tự Động Mở Thưởng Sau:</span>
                  </div>

                  {/* High Contrast Digital Countdown HUD */}
                  <div className="flex items-center gap-2 sm:gap-3 font-mono">
                    <div className="flex flex-col items-center bg-cyan-950/40 border border-cyan-500/40 px-3 py-1.5 rounded-xl min-w-[56px] text-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-cyan-200">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giờ</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400 animate-pulse">:</span>
                    <div className="flex flex-col items-center bg-cyan-950/40 border border-cyan-500/40 px-3 py-1.5 rounded-xl min-w-[56px] text-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-cyan-200">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Phút</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400 animate-pulse">:</span>
                    <div className="flex flex-col items-center bg-cyan-950/40 border border-cyan-500/40 px-3 py-1.5 rounded-xl min-w-[56px] text-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-amber-300">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giây</span>
                    </div>
                  </div>
                </div>

                {/* Live Progress Bar to Next Draw */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Tiến Trình Chu Kỳ Kỳ #{currentRound?.id}
                    </span>
                    <span className="font-bold text-cyan-400">{roundProgressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400 rounded-full transition-all duration-1000 shadow-lg shadow-cyan-500/40"
                      style={{ width: `${roundProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 4-Phase Lifecycle Workflow */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-[9px] shrink-0 text-cyan-300">1</span>
                    <span className="truncate">Tích Lũy Pot</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-cyan-500/20 text-slate-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[9px] shrink-0">2</span>
                    <span className="truncate">Khóa Sổ VRF</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-cyan-500/20 text-slate-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[9px] shrink-0">3</span>
                    <span className="truncate">Lồng 3D Quay</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-cyan-500/20 text-slate-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[9px] shrink-0">4</span>
                    <span className="truncate">Quyết Toán Tự Động</span>
                  </div>
                </div>
              </div>

              {/* 100% FULLY AUTOMATED AUTONOMOUS VRF 2.5 DRAW ENGINE & INSTANT SMART SETTLEMENT (NO MANUAL BUTTON REQUIRED) */}
              <div className="relative z-10 p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0A1622] to-amber-950/40 border border-cyan-500/40 shadow-xl shadow-cyan-950/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shrink-0 shadow-lg shadow-cyan-500/20">
                      {isDrawing ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
                      ) : (
                        <Cpu className="w-5 h-5 text-cyan-300" />
                      )}
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-white font-outfit uppercase tracking-wide flex items-center gap-1.5">
                          <span>{isDrawing ? 'Đang Tự Động Xổ Số & Quyết Toán...' : 'Chế Độ Xổ Số Tự Động 100% (Auto-Pilot)'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-amber-400" /> THÔNG MINH A-Z
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans">
                        {isDrawing
                          ? 'Đang lấy kết quả ngẫu nhiên Chainlink VRF 2.5, quay lồng 3D và tự động thanh toán...'
                          : 'Hệ thống tự động quay số & quyết toán ngay khi kết thúc đếm ngược mà không cần ấn nút.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        soundManager.playTick();
                        setIs3DDrumOpen(!is3DDrumOpen);
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>{is3DDrumOpen ? 'Thu Gọn Lồng 3D' : 'Xem Lồng 3D'}</span>
                    </button>
                  </div>
                </div>

                {/* 3 Intelligent Optimization Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/[0.08] text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Đối Soát Tự Động:
                    </span>
                    <span className="text-emerald-300 font-bold">
                      {userTickets.length > 0 ? `${userTickets.length} Vé Sẵn Sàng` : '0 Vé Đang Chờ'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tối Ưu Giải Thưởng:
                    </span>
                    <span className="text-amber-300 font-bold">Quyết Toán Tức Thì (Instant)</span>
                  </div>

                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" /> Bảo Mật Thuật Toán:
                    </span>
                    <span className="text-cyan-300 font-bold">VRF 2.5 Keccak256</span>
                  </div>
                </div>
              </div>

              {/* Informational reassurance footnote */}
              <div className="relative z-10 text-[11px] text-slate-400 font-sans flex items-center gap-1.5 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Hệ thống tự động vận hành liên tục 24/7. Giải thưởng trúng sẽ được cộng trực tiếp vào ví có thể rút bất kỳ lúc nào.
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: PRIZE TIERS & RECENT WINNERS (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Prize Distribution Tiers */}
            <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-outfit">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Cơ Cấu Giải Thưởng Tích Lũy</span>
                </h3>
                <button
                  onClick={() => setVrfModalRound(currentRound)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
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
                      <div className="text-xs font-sans font-bold">{tier.label}</div>
                      <div className="text-[10px] text-slate-500">{tier.allocationPercent}% Tổng Pot</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">
                        ${tier.poolAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tier.winnersCount > 0 ? `${tier.winnersCount} Người Trúng` : 'Chưa có người trúng'}
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
                <span>Bảng Vàng Trúng Thưởng Gần Nhất</span>
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
                          Trúng {win.matchedDigits}/6
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-0.5">Kỳ #{win.roundId} • {win.prizeToken}</div>
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
              <h2 className="text-2xl font-bold text-white font-outfit">Giao Thức Tiết Kiệm Nhận Vé Số Miễn Phí</h2>
              <p className="text-xs text-slate-300">
                Gửi USDC hoặc ETH vào Vault Staking lợi suất của Hyperon. Tiền gốc của bạn luôn an toàn 100% và có thể rút bất cứ lúc nào. Lợi suất sinh ra từ Aave v3 & Compound sẽ tự động mua vé số trúng thưởng hàng tuần!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tổng Vốn Staked Trong Vault:</span>
                <span className="text-emerald-400 font-bold">$1,285,000 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lợi Suất Staking Cơ Bản:</span>
                <span className="text-slate-200">12.4% APY qua Aave v3 & Compound</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Công Thức Tặng Vé:</span>
                <span className="text-amber-300">1 Vé Số Miễn Phí cho mỗi $10 Gửi Hàng Tuần</span>
              </div>
            </div>

            {/* Deposit Input */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-2">Số Tiền Gửi (USDC):</label>
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
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit uppercase tracking-wider"
              >
                {isDepositingSavings ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <span>Ký Gửi & Nhận Vé Số Miễn Phí Hàng Tuần</span>
              </button>
            </div>
          </div>

          {/* Right: User's Savings Position */}
          <div className="lg:col-span-5 bg-[#07090E] border border-white/[0.08] rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-outfit">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Vị Thế Tiết Kiệm Của Tôi</span>
            </h3>

            {userSavings.length > 0 ? (
              <div className="space-y-3">
                {userSavings.map((dep) => (
                  <div key={dep.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 font-mono text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>Đã Ký Gửi:</span>
                      <span className="text-emerald-400">${dep.valueUsd} {dep.stakedToken}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vé Miễn Phí Nhận Hàng Tuần:</span>
                      <span className="text-amber-300 font-bold">{dep.ticketsEarned} Vé Số</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2 text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">Chưa có vị thế ký gửi tiết kiệm nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. USER'S 3D HOLOGRAPHIC TICKETS SECTION */}
      <div className="bg-[#07090E] border border-white/[0.08] rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-outfit">
              <Ticket className="w-5 h-5 text-amber-400" />
              <span>Bộ Sưu Tập Vé Số 3D Hologram Của Tôi ({userTickets.length})</span>
            </h3>
            <p className="text-xs text-slate-400">Hiệu ứng nghiêng 3D Parallax • Lớp cào tráng bạc may mắn</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLotteryData}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs flex items-center gap-1.5 border border-white/10 cursor-pointer font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Đồng Bộ Vé
            </button>
          </div>
        </div>

        {userTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTickets.map((tkt) => (
              <Lottery3DTicket
                key={tkt.id}
                ticket={tkt}
                winningNumbers={currentRound?.winningNumbers}
                onClaim={handleClaimWinnings}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Ticket className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 font-medium">Bạn chưa sở hữu vé số nào cho địa chỉ ví này.</p>
            <p className="text-xs text-slate-500">Hãy chọn số ở trên để tham gia tranh giải thưởng Mega Jackpot $647,000+!</p>
          </div>
        )}
      </div>

      {/* 7. MODALS */}
      <LotteryAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        analytics={analytics}
        onApplyLuckyNumbers={(nums) => {
          setBuyMode('manual');
          setManualTicket(nums);
          addToast({
            title: '✨ Đã Áp Dụng Dãy Số May Mắn!',
            message: `Tổ hợp số: [ ${nums.join(' - ')} ]`,
            type: 'success',
          });
        }}
      />

      <LotterySyndicateModal
        isOpen={isSyndicateOpen}
        onClose={() => setIsSyndicateOpen(false)}
        syndicates={syndicates}
        onJoinSyndicate={handleJoinSyndicate}
      />

      <LotteryPrizeBreakdownModal
        isOpen={isPrizeBreakdownOpen}
        onClose={() => setIsPrizeBreakdownOpen(false)}
        round={currentRound || null}
      />

      <LotteryTicketScannerModal
        isOpen={isTicketScannerOpen}
        onClose={() => setIsTicketScannerOpen(false)}
        activeRound={currentRound || null}
        pastRounds={pastRounds}
        userTickets={userTickets}
      />

      {/* VRF AUDIT MODAL */}
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
                  <span>Bằng Chứng Toán Học Chainlink VRF 2.5</span>
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
                <span>Tính ngẫu nhiên đã được kiểm chứng trên on-chain. Không một validator hay miner nào có thể can thiệp hay dự đoán trước.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CELEBRATION MODAL */}
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
                <h3 className="text-2xl font-black text-white font-outfit uppercase">Mua Vé 3D Thành Công!</h3>
                <p className="text-xs text-slate-300">
                  Bạn đã ghi danh thành công {celebrationData.count} vé vào kỳ quay Mega Jackpot.
                </p>
              </div>

              <div className="bg-black/60 p-4 rounded-2xl border border-white/[0.08] text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Số Lượng Vé:</span>
                  <span className="text-white font-bold">{celebrationData.count} Vé Số 3D</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tổng Chi Phí:</span>
                  <span className="text-amber-300 font-bold">${celebrationData.totalCostUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Mã Giao Dịch (TxHash):</span>
                  <span className="text-cyan-400">{shortenAddress(celebrationData.txHash)}</span>
                </div>
              </div>

              <button
                onClick={() => setCelebrationData(null)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm rounded-2xl transition-all cursor-pointer font-outfit uppercase tracking-wider"
              >
                Xem Vé Số 3D Của Tôi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
