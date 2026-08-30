import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SAMPLE_LENDING_MARKETS, SAMPLE_FLASH_LOANS } from '../lib/constants';
import { LendingMarketAsset, FlashLoanOpportunity, UserLendingHealth } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { soundManager } from '../lib/sound';
import {
  Landmark,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  Info,
  DollarSign,
  Activity,
  ArrowRight,
  Cpu,
  Flame
} from 'lucide-react';

type LendingTab = 'markets' | 'interest-rates' | 'flash-loans' | 'isolated-pools';
type ActionType = 'supply' | 'borrow' | 'repay' | 'withdraw';

export const LendingView: React.FC = () => {
  const { balances, executeTransaction } = useWallet();
  const { addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<LendingTab>('markets');
  const [markets, setMarkets] = useState<LendingMarketAsset[]>(SAMPLE_LENDING_MARKETS);
  const [selectedAsset, setSelectedAsset] = useState<LendingMarketAsset>(SAMPLE_LENDING_MARKETS[1]); // USDC default
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('500');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [flashCrashSimulation, setFlashCrashSimulation] = useState<number>(0); // 0%, -15%, -30%
  const [rateSimUtilization, setRateSimUtilization] = useState<number>(75);
  const [filterMarket, setFilterMarket] = useState<'all' | 'supplied' | 'borrowed'>('all');

  // Custom Flash Loan state
  const [flashToken, setFlashToken] = useState<string>('USDC');
  const [flashAmount, setFlashAmount] = useState<string>('1000000');
  const [flashTarget, setFlashTarget] = useState<string>('Uniswap v3 -> Curve Arbitrage');

  // Compute live user lending health
  const userHealth: UserLendingHealth = useMemo(() => {
    let totalCollateral = 0;
    let totalBorrowed = 0;
    let totalWeightedCollateral = 0;
    let totalSupplyEarnings = 0;
    let totalBorrowInterest = 0;

    markets.forEach((m) => {
      const price = m.token.priceUsd;
      const suppliedVal = m.userSuppliedAmount * price;
      const borrowedVal = m.userBorrowedAmount * price;

      if (m.isCollateralActive && suppliedVal > 0) {
        // Adjust for simulated flash crash
        const adjustedPrice = price * (1 - flashCrashSimulation / 100);
        const adjustedSuppliedVal = m.userSuppliedAmount * adjustedPrice;
        totalCollateral += adjustedSuppliedVal;
        totalWeightedCollateral += adjustedSuppliedVal * (m.maxLtvPercent / 100);
      }

      totalBorrowed += borrowedVal;
      totalSupplyEarnings += suppliedVal * (m.supplyApyPercent / 100);
      totalBorrowInterest += borrowedVal * (m.borrowAprPercent / 100);
    });

    const currentLtv = totalCollateral > 0 ? (totalBorrowed / totalCollateral) * 100 : 0;
    const maxBorrowCap = totalWeightedCollateral;
    const borrowPowerUsed = maxBorrowCap > 0 ? Math.min(100, (totalBorrowed / maxBorrowCap) * 100) : 0;
    
    // Health factor = totalWeightedCollateral / totalBorrowed
    let hf = totalBorrowed > 0 ? totalWeightedCollateral / totalBorrowed : 99.9;
    hf = Number(hf.toFixed(2));

    let riskTier: 'SAFE' | 'MODERATE' | 'ELEVATED' | 'CRITICAL' | 'LIQUIDATION' = 'SAFE';
    let advice = 'All loan-to-value metrics are within institutional grade safe thresholds.';
    let aiDeleverage = false;

    if (hf < 1.0) {
      riskTier = 'LIQUIDATION';
      advice = 'CRITICAL: Account is eligible for liquidation. Repay debt or supply collateral immediately.';
      aiDeleverage = true;
    } else if (hf < 1.15) {
      riskTier = 'CRITICAL';
      advice = 'HIGH RISK: Impending liquidation zone. 1-click AI Auto-Shield is strongly recommended.';
      aiDeleverage = true;
    } else if (hf < 1.45) {
      riskTier = 'ELEVATED';
      advice = 'MODERATE RISK: Volatility buffer is narrow. Monitor closely or reduce leverage.';
    } else if (hf < 2.0) {
      riskTier = 'MODERATE';
      advice = 'Balanced leverage position with healthy collateral backing.';
    }

    const netApy = totalCollateral > 0 ? ((totalSupplyEarnings - totalBorrowInterest) / totalCollateral) * 100 : 0;

    return {
      totalCollateralUsd: totalCollateral,
      totalBorrowedUsd: totalBorrowed,
      currentLtvPercent: currentLtv,
      maxBorrowCapacityUsd: maxBorrowCap,
      borrowPowerUsedPercent: borrowPowerUsed,
      healthFactor: hf,
      netApyPercent: netApy,
      liquidationRiskTier: riskTier,
      aiDeleverageRecommended: aiDeleverage,
      aiAdvice: advice,
    };
  }, [markets, flashCrashSimulation]);

  // Macro aggregated statistics
  const macroStats = useMemo(() => {
    const totalSupplied = markets.reduce((sum, m) => sum + m.totalSupplyUsd, 0);
    const totalBorrowed = markets.reduce((sum, m) => sum + m.totalBorrowUsd, 0);
    const availableLiq = totalSupplied - totalBorrowed;
    const avgUtil = (totalBorrowed / totalSupplied) * 100;
    return { totalSupplied, totalBorrowed, availableLiq, avgUtil };
  }, [markets]);

  // Handle Collateral Toggle
  const handleToggleCollateral = (marketId: string) => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id === marketId) {
          const nextState = !m.isCollateralActive;
          addToast({
            title: nextState ? 'Collateral Activated' : 'Collateral Disabled',
            message: `${m.token.symbol} is now ${nextState ? 'backing your loans' : 'unlocked from borrowing power'}.`,
            type: 'info',
          });
          return { ...m, isCollateralActive: nextState };
        }
        return m;
      })
    );
  };

  // Handle Execution (Supply, Borrow, Repay, Withdraw)
  const handleExecuteAction = async () => {
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0 || !selectedAsset || !activeAction) return;

    setIsProcessing(true);

    let txType: any = 'SUPPLY';
    if (activeAction === 'borrow') txType = 'BORROW';
    if (activeAction === 'repay') txType = 'REPAY';
    if (activeAction === 'withdraw') txType = 'WITHDRAW_LENDING';

    await executeTransaction({
      chainId: selectedAsset.chainId,
      type: txType,
      fromToken: activeAction === 'supply' || activeAction === 'repay' ? selectedAsset.token.symbol : undefined,
      toToken: activeAction === 'borrow' || activeAction === 'withdraw' ? selectedAsset.token.symbol : undefined,
      fromAmount: amount,
      toAmount: amount,
      gasSpentGwei: 21,
      gasSpentUsd: 3.40,
    });

    // Update local state
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id === selectedAsset.id) {
          let updated = { ...m };
          if (activeAction === 'supply') {
            updated.userSuppliedAmount += amount;
            updated.isCollateralActive = true;
          } else if (activeAction === 'withdraw') {
            updated.userSuppliedAmount = Math.max(0, updated.userSuppliedAmount - amount);
          } else if (activeAction === 'borrow') {
            updated.userBorrowedAmount += amount;
          } else if (activeAction === 'repay') {
            updated.userBorrowedAmount = Math.max(0, updated.userBorrowedAmount - amount);
          }
          return updated;
        }
        return m;
      })
    );

    setIsProcessing(false);
    setActiveAction(null);
    setActionAmount('');

    const actionNames: Record<ActionType, string> = {
      supply: 'Supplied',
      borrow: 'Borrowed',
      repay: 'Repaid',
      withdraw: 'Withdrawn',
    };

    soundManager.playSuccess();
    addToast({
      title: `${actionNames[activeAction]} Successfully`,
      message: `${amount} ${selectedAsset.token.symbol} processed on ${selectedAsset.chainId.toUpperCase()} with 0% slippage.`,
      type: 'success',
    });
  };

  // Handle Flash Loan Trigger
  const handleExecuteFlashLoan = async (opp: FlashLoanOpportunity) => {
    setIsProcessing(true);
    await executeTransaction({
      chainId: 'ethereum',
      type: 'FLASH_LOAN',
      fromToken: opp.token.symbol,
      toToken: opp.token.symbol,
      fromAmount: 500000,
      toAmount: 500000 + opp.estimatedNetProfitUsd / opp.token.priceUsd,
      gasSpentGwei: 35,
      gasSpentUsd: 12.50,
    });
    setIsProcessing(false);
    soundManager.playSuccess();

    addToast({
      title: 'Atomic Flash Loan Executed',
      message: `Captured ${formatCurrency(opp.estimatedNetProfitUsd)} net arbitrage profit via ${opp.targetDEXA} & ${opp.targetDEXB}.`,
      type: 'success',
    });
  };

  // Filtered markets
  const displayedMarkets = useMemo(() => {
    if (filterMarket === 'supplied') return markets.filter((m) => m.userSuppliedAmount > 0);
    if (filterMarket === 'borrowed') return markets.filter((m) => m.userBorrowedAmount > 0);
    return markets;
  }, [markets, filterMarket]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0A0D14] via-[#0E1526] to-[#0A0D14] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-inner">
                <Landmark className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Hyper-Smart Money Market & Lending
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse">
                    AI RISK SHIELD
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Algorithmic interest rate curves, autonomous liquidation radar, and 0-collateral flash loans.
                </p>
              </div>
            </div>
          </div>

          {/* Macro Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#080B11]/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 font-mono">
            <div className="px-2">
              <div className="text-[10px] text-slate-400">TOTAL SUPPLIED</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">{formatCurrency(macroStats.totalSupplied, 1)}</div>
            </div>
            <div className="px-2 border-l border-white/5">
              <div className="text-[10px] text-slate-400">TOTAL BORROWED</div>
              <div className="text-sm sm:text-base font-bold text-cyan-400">{formatCurrency(macroStats.totalBorrowed, 1)}</div>
            </div>
            <div className="px-2 border-l border-white/5">
              <div className="text-[10px] text-slate-400">AVAIL. LIQUIDITY</div>
              <div className="text-sm sm:text-base font-bold text-slate-200">{formatCurrency(macroStats.availableLiq, 1)}</div>
            </div>
            <div className="px-2 border-l border-white/5">
              <div className="text-[10px] text-slate-400">GLOBAL UTILIZATION</div>
              <div className="text-sm sm:text-base font-bold text-amber-400">{macroStats.avgUtil.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Health & AI Liquidation Shield Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* User Balance Overview */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Your Position Summary</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Net Earn APY:</span>
              <span className={`font-bold px-2 py-0.5 rounded-lg ${userHealth.netApyPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {userHealth.netApyPercent > 0 ? '+' : ''}{userHealth.netApyPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Total Collateral Supplied</span>
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-white">
                {formatCurrency(userHealth.totalCollateralUsd)}
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                Backed by {markets.filter(m => m.userSuppliedAmount > 0).length} active assets
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Total Active Borrowed</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-white">
                {formatCurrency(userHealth.totalBorrowedUsd)}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Max Capacity: {formatCurrency(userHealth.maxBorrowCapacityUsd)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Borrow Limit Used</span>
                <Activity className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400">
                {userHealth.borrowPowerUsedPercent.toFixed(1)}%
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    userHealth.borrowPowerUsedPercent > 85 ? 'bg-rose-500' : userHealth.borrowPowerUsedPercent > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, userHealth.borrowPowerUsedPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Flash Crash Stress Test Slider */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0F1420] to-[#0A0D15] border border-cyan-500/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>AI Market Stress-Test Simulator</span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                Simulated Market Drop: -{flashCrashSimulation}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-400">Current</span>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={flashCrashSimulation}
                onChange={(e) => setFlashCrashSimulation(Number(e.target.value))}
                className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-rose-400">-50% Flash Crash</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1">
              <span>Simulated Collateral: <strong className="text-white">{formatCurrency(userHealth.totalCollateralUsd)}</strong></span>
              <span>Simulated Health Factor: <strong className={userHealth.healthFactor >= 1.5 ? 'text-emerald-400' : userHealth.healthFactor >= 1.1 ? 'text-amber-400' : 'text-rose-400'}>{userHealth.healthFactor >= 90 ? '> 99.0' : userHealth.healthFactor}</strong></span>
            </div>
          </div>
        </div>

        {/* Health Factor Gauge Card */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Health Factor Radar
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              userHealth.healthFactor >= 1.8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              userHealth.healthFactor >= 1.2 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
            }`}>
              {userHealth.liquidationRiskTier}
            </span>
          </div>

          {/* Large Gauge Display */}
          <div className="flex flex-col items-center justify-center py-2 text-center space-y-2">
            <div className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
              userHealth.healthFactor >= 1.8 ? 'text-emerald-400' :
              userHealth.healthFactor >= 1.2 ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {userHealth.healthFactor >= 90 ? '∞' : userHealth.healthFactor}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Liquidation Threshold: <span className="text-rose-400 font-bold">&lt; 1.00</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0F1420] border border-white/5 text-[11px] leading-relaxed text-slate-300 space-y-1">
            <div className="font-bold text-cyan-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> AI Safety Recommendation
            </div>
            <p className="text-slate-400 text-[10px]">{userHealth.aiAdvice}</p>
          </div>

          {userHealth.aiDeleverageRecommended && (
            <button
              onClick={() => {
                addToast({
                  title: 'AI Auto-Shield Triggered',
                  message: 'Repaying debt using idle stablecoin reserves to restore Health Factor above 2.0.',
                  type: 'warning',
                });
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Zap className="w-4 h-4" /> 1-Click AI Auto-Deleverage Shield
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'markets', label: 'Lending & Borrow Markets', icon: Landmark },
            { id: 'interest-rates', label: 'AI Rate Curves', icon: Sliders },
            { id: 'flash-loans', label: '0-Collateral Flash Loans', icon: Zap },
            { id: 'isolated-pools', label: 'Isolated RWA Pools', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LendingTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/15 text-white border border-blue-500/30 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'markets' && (
          <div className="flex items-center gap-1.5 p-1 bg-[#090C13] rounded-xl border border-white/5 text-xs font-mono">
            <button
              onClick={() => setFilterMarket('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMarket === 'all' ? 'bg-blue-600/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Assets ({markets.length})
            </button>
            <button
              onClick={() => setFilterMarket('supplied')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMarket === 'supplied' ? 'bg-emerald-600/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Supplied ({markets.filter((m) => m.userSuppliedAmount > 0).length})
            </button>
            <button
              onClick={() => setFilterMarket('borrowed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMarket === 'borrowed' ? 'bg-cyan-600/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Borrows ({markets.filter((m) => m.userBorrowedAmount > 0).length})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: Markets Table */}
      {activeTab === 'markets' && (
        <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Supply APY</th>
                  <th className="py-3 px-3">Borrow APR</th>
                  <th className="py-3 px-3">Total Liquidity</th>
                  <th className="py-3 px-3 text-center">Utilization</th>
                  <th className="py-3 px-3 text-center">Collateral</th>
                  <th className="py-3 px-3">Your Supplied</th>
                  <th className="py-3 px-3">Your Borrowed</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                {displayedMarkets.map((m) => {
                  const isSupplied = m.userSuppliedAmount > 0;
                  const isBorrowed = m.userBorrowedAmount > 0;
                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Token info */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <TokenLogo
                            symbol={m.token.symbol}
                            name={m.token.name}
                            src={m.token.logoUrl}
                            chainId={m.chainId}
                            className="w-8 h-8"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{m.token.symbol}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 uppercase">
                                {m.chainId}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{m.token.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Supply APY */}
                      <td className="py-4 px-3">
                        <div className="text-emerald-400 font-extrabold text-sm">{m.supplyApyPercent.toFixed(2)}%</div>
                        <div className="text-[10px] text-slate-500">Max LTV: {m.maxLtvPercent}%</div>
                      </td>

                      {/* Borrow APR */}
                      <td className="py-4 px-3">
                        <div className="text-cyan-400 font-bold text-sm">{m.borrowAprPercent.toFixed(2)}%</div>
                        <div className="text-[10px] text-slate-500">Stable: {m.stableBorrowAprPercent.toFixed(2)}%</div>
                      </td>

                      {/* Total Liquidity */}
                      <td className="py-4 px-3">
                        <div className="text-slate-200 font-semibold">{formatCurrency(m.availableLiquidityUsd, 1)}</div>
                        <div className="text-[10px] text-slate-500">Total: {formatCurrency(m.totalSupplyUsd, 1)}</div>
                      </td>

                      {/* Utilization */}
                      <td className="py-4 px-3 text-center">
                        <div className="text-slate-300 font-bold">{m.utilizationRatePercent.toFixed(1)}%</div>
                        <div className="w-16 mx-auto bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${m.utilizationRatePercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Collateral Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => handleToggleCollateral(m.id)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            m.isCollateralActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-800/40 text-slate-500 border-white/5 hover:border-white/20'
                          }`}
                          title="Toggle asset as collateral backing"
                        >
                          {m.isCollateralActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* User Supplied */}
                      <td className="py-4 px-3">
                        {isSupplied ? (
                          <div>
                            <div className="text-white font-bold">{m.userSuppliedAmount} {m.token.symbol}</div>
                            <div className="text-[10px] text-slate-400">{formatCurrency(m.userSuppliedAmount * m.token.priceUsd)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* User Borrowed */}
                      <td className="py-4 px-3">
                        {isBorrowed ? (
                          <div>
                            <div className="text-cyan-400 font-bold">{m.userBorrowedAmount} {m.token.symbol}</div>
                            <div className="text-[10px] text-slate-400">{formatCurrency(m.userBorrowedAmount * m.token.priceUsd)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAsset(m);
                              setActiveAction('supply');
                              setActionAmount(String(balances[m.token.symbol] ? (balances[m.token.symbol] * 0.5).toFixed(2) : '100'));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                          >
                            Supply
                          </button>

                          {isSupplied && (
                            <button
                              onClick={() => {
                                setSelectedAsset(m);
                                setActiveAction('withdraw');
                                setActionAmount(String((m.userSuppliedAmount * 0.5).toFixed(2)));
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-white/5 text-xs font-bold transition-all cursor-pointer"
                            >
                              Withdraw
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedAsset(m);
                              setActiveAction('borrow');
                              setActionAmount('500');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                          >
                            Borrow
                          </button>

                          {isBorrowed && (
                            <button
                              onClick={() => {
                                setSelectedAsset(m);
                                setActiveAction('repay');
                                setActionAmount(String(m.userBorrowedAmount));
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Repay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AI Dynamic Interest Rate Curves */}
      {activeTab === 'interest-rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" /> Dynamic Kink Interest Rate Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizing multi-slope algorithmic yield adaptation as pool liquidity utilization fluctuates.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">Target U_opt = 80%</span>
            </div>

            {/* Simulation Slider */}
            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Adjust Pool Utilization:</span>
                <span className="text-lg font-bold text-cyan-300">{rateSimUtilization}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="98"
                value={rateSimUtilization}
                onChange={(e) => setRateSimUtilization(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0% (Idle Liquidity)</span>
                <span>80% (Optimal Kink Point)</span>
                <span>100% (Maximum Debt Strain)</span>
              </div>
            </div>

            {/* Computed Rates Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400">Simulated Borrow APR</div>
                <div className="text-2xl font-extrabold text-cyan-400">
                  {(rateSimUtilization <= 80 ? 2.5 + (rateSimUtilization / 80) * 6.5 : 9.0 + ((rateSimUtilization - 80) / 20) * 35).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500">Base + Dynamic Slope</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400">Simulated Supply APY</div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {((rateSimUtilization / 100) * (rateSimUtilization <= 80 ? 2.5 + (rateSimUtilization / 80) * 6.5 : 9.0 + ((rateSimUtilization - 80) / 20) * 35) * 0.9).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500">After 10% Reserve Cut</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400">Protocol Health State</div>
                <div className={`text-xl font-bold ${rateSimUtilization > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {rateSimUtilization > 85 ? 'High Debt Strain' : 'Optimal Liquidity'}
                </div>
                <div className="text-[10px] text-slate-500">Auto-Rebalancing Active</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Algorithmic Formula
            </h4>
            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 font-mono text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <div className="text-cyan-300 font-bold">Slope 1 (U &le; 80%):</div>
              <p className="text-slate-400">R_borrow = Base + (U / U_opt) &times; Slope_1</p>
              <div className="text-amber-300 font-bold pt-2">Slope 2 (U &gt; 80% - Penalty Zone):</div>
              <p className="text-slate-400">R_borrow = Base + Slope_1 + ((U - U_opt) / (1 - U_opt)) &times; Slope_2</p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> MEV Protection Guaranteed
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Interest accruals are compounded per-block with zero front-running vulnerability via private builder auctions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Flash Loan Hub */}
      {activeTab === 'flash-loans' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Atomic Uncollateralized Flash Loans
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Borrow up to $50,000,000 in a single block with 0.05% fee, provided loan is returned in same transaction.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                0% COLLATERAL REQUIRED
              </span>
            </div>

            {/* Curated Arbitrage Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_FLASH_LOANS.map((opp) => (
                <div
                  key={opp.id}
                  className="p-5 rounded-2xl bg-[#0F1420] border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={opp.token.symbol} name={opp.token.name} src={opp.token.logoUrl} className="w-7 h-7" />
                        <span className="font-bold text-white text-sm">{opp.token.symbol} Flash Pool</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {opp.aiConfidenceScore}% CONFIDENCE
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#080B11] border border-white/5 space-y-1 font-mono text-xs">
                      <div className="text-[10px] text-slate-400">ESTIMATED NET PROFIT</div>
                      <div className="text-xl font-extrabold text-emerald-400">{formatCurrency(opp.estimatedNetProfitUsd)}</div>
                      <div className="text-[10px] text-slate-500">Spread: +{opp.spreadPercent}% &bull; Fee: {opp.protocolFeePercent}%</div>
                    </div>

                    <div className="space-y-1 text-xs font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Route A:</span>
                        <span className="text-slate-200">{opp.targetDEXA}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Route B:</span>
                        <span className="text-slate-200">{opp.targetDEXB}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pool Capacity:</span>
                        <span className="text-cyan-400">{formatCurrency(opp.maxAvailableUsd, 1)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isProcessing}
                    onClick={() => handleExecuteFlashLoan(opp)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Execute 1-Click Flash Arbitrage</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Isolated Pools */}
      {activeTab === 'isolated-pools' && (
        <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Isolated Risk & Real-World Asset (RWA) Lending Pools
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Isolated borrowing vaults protect main pool solvency from tail-risk volatility or illiquid collateral assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Flame className="w-5 h-5 text-amber-400" /> US Treasury Bill Tokenized (USTB)
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  RWA ISOLATED
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supply institutional Short-Term US Treasury tokens to earn 5.25% risk-free APY with 90% borrow LTV against USDC.
              </p>
              <div className="flex justify-between items-center pt-2 font-mono text-xs">
                <span className="text-slate-400">TVL: <strong>$142,000,000</strong></span>
                <span className="text-emerald-400 font-bold">Supply APY: 5.42%</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F1420] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Cpu className="w-5 h-5 text-cyan-400" /> AI GPU Compute Credits (DEPIN)
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AI DEPIN ISOLATED
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Borrow against tokenized H100 cluster contracts with dynamic borrow rate caps and automated oracle circuit breakers.
              </p>
              <div className="flex justify-between items-center pt-2 font-mono text-xs">
                <span className="text-slate-400">TVL: <strong>$38,500,000</strong></span>
                <span className="text-emerald-400 font-bold">Supply APY: 16.80%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL (Supply, Borrow, Repay, Withdraw) */}
      {activeAction && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0C101A] border border-cyan-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <TokenLogo
                  symbol={selectedAsset.token.symbol}
                  name={selectedAsset.token.name}
                  src={selectedAsset.token.logoUrl}
                  className="w-7 h-7"
                />
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    {activeAction} {selectedAsset.token.symbol}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Market APY: {activeAction === 'supply' ? `${selectedAsset.supplyApyPercent}%` : `${selectedAsset.borrowAprPercent}%`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveAction(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input Amount Box */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Amount to {activeAction}</span>
                <span>
                  Available:{' '}
                  {activeAction === 'supply'
                    ? `${(balances[selectedAsset.token.symbol] || 0).toLocaleString()} ${selectedAsset.token.symbol}`
                    : activeAction === 'withdraw'
                    ? `${selectedAsset.userSuppliedAmount} ${selectedAsset.token.symbol}`
                    : activeAction === 'repay'
                    ? `${selectedAsset.userBorrowedAmount} ${selectedAsset.token.symbol}`
                    : `${formatCurrency(userHealth.maxBorrowCapacityUsd - userHealth.totalBorrowedUsd)}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 rounded-2xl bg-[#141A29] border border-white/10 font-mono text-xl font-bold text-white focus:outline-none focus:border-cyan-500 pr-24"
                />
                <button
                  onClick={() => {
                    if (activeAction === 'supply') {
                      setActionAmount(String(balances[selectedAsset.token.symbol] || 100));
                    } else if (activeAction === 'withdraw') {
                      setActionAmount(String(selectedAsset.userSuppliedAmount));
                    } else if (activeAction === 'repay') {
                      setActionAmount(String(selectedAsset.userBorrowedAmount));
                    } else {
                      const maxBorrow = (userHealth.maxBorrowCapacityUsd - userHealth.totalBorrowedUsd) / selectedAsset.token.priceUsd;
                      setActionAmount(String(Math.max(0, maxBorrow * 0.8).toFixed(2)));
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Transaction Impact Preview */}
            <div className="p-4 rounded-2xl bg-[#141A29] border border-white/5 space-y-2 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Collateral Factor:</span>
                <span className="text-white font-bold">{selectedAsset.maxLtvPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Health Factor:</span>
                <span className="text-emerald-400 font-bold">{userHealth.healthFactor >= 90 ? '> 99.0' : userHealth.healthFactor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Network Gas:</span>
                <span className="text-slate-200">~$3.40 (21 Gwei)</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              disabled={isProcessing || !parseFloat(actionAmount)}
              onClick={handleExecuteAction}
              className={`w-full py-4 rounded-2xl font-bold font-mono text-sm uppercase tracking-wider transition-all cursor-pointer shadow-xl ${
                activeAction === 'supply'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  : activeAction === 'borrow'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
              }`}
            >
              {isProcessing ? 'Confirming Transaction...' : `Confirm ${activeAction} ${selectedAsset.token.symbol}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
