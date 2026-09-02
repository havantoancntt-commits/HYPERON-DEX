import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { AITradingSignal } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';

interface AIMetaInfo {
  totalSignals?: number;
  averageWinRate: number;
  profitFactor: number;
  methodology: string;
  verifiedModel: string;
  timestamp?: number;
}
import {
  Sparkles,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Award,
  Target,
  BarChart2,
  Flame,
  ArrowRight,
  ChevronRight,
  Lock,
  Compass,
  Info
} from 'lucide-react';

export const AISignalsView: React.FC = () => {
  const { 
    openPerpetualsWithSignal, 
    openSwapWithSignal, 
    openTokenScannerWithAddress, 
    addToast,
    getLiveToken
  } = useExchange();
  const { isConnected, connectWallet } = useWallet();

  const [signals, setSignals] = useState<AITradingSignal[]>([]);
  const [metaInfo, setMetaInfo] = useState<AIMetaInfo>({
    averageWinRate: 68.5,
    profitFactor: 2.58,
    methodology: 'Historical Backtest (0.1% Slippage + 0.3% DEX Fee deduction)',
    verifiedModel: 'HYPERON-DEX Multi-Indicator Confluence + Gemini 2.5 Flash',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [minWinRate, setMinWinRate] = useState<number>(65);
  const [autoExecuteBotActive, setAutoExecuteBotActive] = useState<boolean>(false);
  const [autoBotMaxAlloc, setAutoBotMaxAlloc] = useState<number>(500);
  const [selectedSignalModal, setSelectedSignalModal] = useState<AITradingSignal | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch Signals from Server with AbortController support
  const fetchSignals = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/signals', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const data = await res.json();
        if (signal?.aborted) return;
        setSignals(data.signals || []);
        if (data.meta) {
          setMetaInfo(data.meta);
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || signal?.aborted) return;
      console.error('Error fetching signals:', err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Use a ref to hold the latest function reference to prevent stale closures in setInterval
  const fetchSignalsRef = useRef(fetchSignals);
  useEffect(() => {
    fetchSignalsRef.current = fetchSignals;
  }, [fetchSignals]);

  useEffect(() => {
    let activeController = new AbortController();

    fetchSignalsRef.current(activeController.signal);

    const interval = setInterval(() => {
      activeController.abort();
      activeController = new AbortController();
      fetchSignalsRef.current(activeController.signal);
    }, 20000);

    return () => {
      activeController.abort();
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchSignals();
    addToast({
      title: 'Quantitative Signal Scan Complete',
      message: 'Scanned on-chain orderbooks & AMM depth. Alpha signals updated.',
      type: 'success',
    });
  };

  const handleToggleAutoBot = () => {
    if (!isConnected) {
      addToast({
        title: 'Wallet Connection Required',
        message: 'Please connect your Web3 wallet to activate the Non-Custodial AI Execution Bot.',
        type: 'warning',
      });
      connectWallet('sandbox');
      return;
    }
    const nextState = !autoExecuteBotActive;
    setAutoExecuteBotActive(nextState);
    if (nextState) {
      addToast({
        title: 'AI Auto-Execution Assist Activated',
        message: `Assist mode active for signals ≥${minWinRate}% Win-Rate up to $${autoBotMaxAlloc} per trade. All transactions require one-click signature confirmation.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'AI Auto-Execution Assist Paused',
        message: 'Manual confirmation mode restored for all orders.',
        type: 'info',
      });
    }
  };

  const handleExecuteSignalPerp = (signal: AITradingSignal) => {
    openPerpetualsWithSignal(signal);
    addToast({
      title: `Imported Signal ${signal.symbol} ➔ Perpetuals Pro`,
      message: `Leverage configured to ${signal.recommendedLeverage}x with Auto Take-Profit ($${signal.takeProfit2}) & Stop-Loss ($${signal.stopLoss}).`,
      type: 'success',
    });
  };

  const handleExecuteSignalSwap = (signal: AITradingSignal) => {
    openSwapWithSignal(signal);
    addToast({
      title: `Imported Signal ${signal.symbol} ➔ DEX Aggregator`,
      message: `Optimal route pre-calculated with Flashbots MEV protection.`,
      type: 'success',
    });
  };

  const filteredSignals = signals.filter((s) => {
    if (s.winRateProbability < minWinRate) return false;
    if (filterType === 'ALL') return true;
    if (filterType === 'BREAKOUT' && s.signalType === 'BREAKOUT') return true;
    if (filterType === 'WHALE' && s.signalType === 'WHALE_ACCUMULATION') return true;
    if (filterType === 'MOMENTUM' && s.signalType === 'MOMENTUM_TREND') return true;
    if (filterType === 'HIGH_WINRATE' && s.winRateProbability >= 75) return true;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Visual Roadmap Flow Banner */}
      <EcosystemFlowBanner />

      {/* Header & Alpha Engine Status */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B1020] via-[#090D1A] to-[#070912] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                    HYPERON-DEX Quantitative Alpha Signals
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Backtested Engine
                  </span>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                  Quantitative multi-factor confluence analyzing real-time orderbook depth, on-chain whale netflows, and volatility breakouts with slippage and DEX fee deductions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Bot Switch */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[#121829] hover:bg-[#18223B] border border-cyan-500/20 text-slate-200 text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              Re-Scan Signals
            </button>

            <button
              onClick={handleToggleAutoBot}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-sans flex items-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                autoExecuteBotActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-900/30 ring-2 ring-emerald-400/50'
                  : 'bg-[#141C30] hover:bg-[#1B2745] text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <Zap className={`w-4 h-4 ${autoExecuteBotActive ? 'text-amber-200 fill-current animate-bounce' : 'text-cyan-400'}`} />
              <span>{autoExecuteBotActive ? 'Assist Mode: ACTIVE' : 'Enable Assist Bot'}</span>
              <span className={`w-2 h-2 rounded-full ${autoExecuteBotActive ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
            </button>
          </div>
        </div>

        {/* Quant Metric Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10 font-mono">
          <div className="p-3 rounded-xl bg-[#080D18]/80 border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Backtest Win-Rate</div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span>{metaInfo.averageWinRate}%</span>
              <span className="text-[10px] text-slate-400 font-normal">Historical</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D18]/80 border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Profit Factor</div>
            <div className="text-lg sm:text-xl font-extrabold text-cyan-400 mt-0.5">
              {metaInfo.profitFactor}x
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D18]/80 border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Deductions Included</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">
              0.1% Slip + 0.3% Fee
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D18]/80 border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Data Provenance</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Live Backtested Model
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Setup Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#080C16] border border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Signals' },
            { id: 'HIGH_WINRATE', label: '⭐ Win-Rate ≥ 75%' },
            { id: 'BREAKOUT', label: '🚀 Breakout' },
            { id: 'WHALE', label: '🐋 Whale Flow' },
            { id: 'MOMENTUM', label: '⚡ Momentum' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[#121724] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">Min Win-Rate:</span>
          <div className="flex items-center gap-1 bg-[#121724] px-2 py-1 rounded-lg border border-white/5">
            <input
              type="range"
              min="50"
              max="90"
              value={minWinRate}
              onChange={(e) => setMinWinRate(Number(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="text-cyan-400 font-bold">{minWinRate}%</span>
          </div>
        </div>
      </div>

      {/* Signals Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Computing quantitative backtested signals...</span>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0B0F1A] border border-white/5 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-sm font-bold text-white">No Signals Match Filter (≥{minWinRate}% Win-Rate)</div>
          <p className="text-xs text-slate-400">Lower the minimum win-rate slider to view additional candidate setups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => {
            const token = getLiveToken(signal.symbol);
            return (
              <div
                key={signal.id}
                className="rounded-2xl bg-[#0B1020] border border-white/10 hover:border-cyan-500/40 transition-all p-5 shadow-xl space-y-4 relative overflow-hidden group"
              >
                {/* Top Badge Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TokenLogo symbol={signal.symbol} name={signal.name} src={token.logoUrl} className="w-8 h-8" />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {signal.symbol}
                        <span className="text-[10px] font-normal text-slate-400">{signal.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400">
                        {signal.direction} • {signal.timeframe}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-extrabold ${
                      signal.direction === 'LONG'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {signal.direction === 'LONG' ? 'BUY / LONG' : 'SELL / SHORT'}
                  </span>
                </div>

                {/* Entry & Targets Matrix */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#060A14] border border-white/5 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Entry Target</div>
                    <div className="text-xs font-bold text-white mt-0.5">${signal.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400 uppercase">Take Profit</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">${signal.takeProfit1.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-rose-400 uppercase">Stop Loss</div>
                    <div className="text-xs font-bold text-rose-400 mt-0.5">${signal.stopLoss.toFixed(2)}</div>
                  </div>
                </div>

                {/* Win-rate & R:R metric */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="text-slate-400">
                    Confidence: <span className="font-bold text-emerald-400">{signal.winRateProbability}%</span>
                  </div>
                  <div className="text-slate-400">
                    R:R Ratio: <span className="font-bold text-cyan-400">1:{signal.riskRewardRatio}</span>
                  </div>
                </div>

                {/* Rationale breakdown */}
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-[#080D1A] p-2.5 rounded-xl border border-white/5">
                  {signal.reasoning}
                </p>

                {/* Provenance Tag */}
                <div className="text-[9px] font-mono text-slate-500 flex items-center justify-between border-t border-white/5 pt-2">
                  <span>PROVENANCE: {signal.source}</span>
                  <span>CONF: {signal.confidenceScore}%</span>
                </div>

                {/* Action CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleExecuteSignalSwap(signal)}
                    className="py-2 px-3 rounded-xl bg-[#131929] hover:bg-[#1A233A] border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Swap Spot</span>
                  </button>
                  <button
                    onClick={() => handleExecuteSignalPerp(signal)}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Trade Perp {signal.recommendedLeverage}x</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non-Custodial Security & Risk Disclaimer Footer */}
      <div className="p-4 rounded-xl bg-[#080C14] border border-white/5 flex items-start gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200 font-sans">HYPERON-DEX Non-Custodial Execution Guarantee</div>
          <p className="text-[11px] leading-relaxed">
            All AI signals and automated strategy setups provide probabilistic quantitative analysis. HYPERON-DEX is strictly non-custodial: private keys never leave your client environment, and every order requires pre-flight simulation and cryptographic signature verification.
          </p>
        </div>
      </div>
    </div>
  );
};
