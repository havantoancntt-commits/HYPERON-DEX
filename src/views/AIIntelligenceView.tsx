import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { AIMarketIntelligence, TechnicalIndicators, AITradingSignal } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  Cpu,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Layers,
  Fuel,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight,
  BarChart2,
  Gauge,
  Sliders,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock
} from 'lucide-react';

export const AIIntelligenceView: React.FC = () => {
  const { openSwapWithTokens, getLiveToken, getLivePrice } = useExchange();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [intelligence, setIntelligence] = useState<AIMarketIntelligence | null>(null);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [signals, setSignals] = useState<AITradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'signals'>('overview');

  const activeToken = getLiveToken(selectedSymbol);
  const livePrice = getLivePrice(selectedSymbol);

  const fetchAllData = async (symbol: string, tf: string) => {
    setIsLoading(true);
    try {
      const [intelRes, indRes, sigRes] = await Promise.all([
        fetch(`/api/ai/market-intelligence?symbol=${symbol}`),
        fetch(`/api/markets/indicators?symbol=${symbol}&timeframe=${tf}`),
        fetch(`/api/ai/signals`),
      ]);

      if (intelRes.ok) {
        const data = await intelRes.json();
        setIntelligence(data);
      }
      if (indRes.ok) {
        const indData = await indRes.json();
        setIndicators(indData);
      }
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setSignals(sigData.signals || []);
      }
    } catch (err) {
      console.warn('Failed to load AI market intelligence & indicators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(selectedSymbol, timeframe);
    const interval = setInterval(() => fetchAllData(selectedSymbol, timeframe), 4000);
    return () => clearInterval(interval);
  }, [selectedSymbol, timeframe]);

  const uniqueTokens = Array.from(new Set(VERIFIED_TOKENS.map((t) => t.symbol))).filter(
    (s) => s !== 'USDC' && s !== 'USDT'
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                AI Market Intelligence & Quantitative Analytics
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Institutional quantitative market analysis combining real-time multi-exchange price oracles, RSI(14), MACD(12,26,9), Bollinger Bands, ATR volatility regimes, and classical support/resistance pivot points.
            </p>
          </div>

          {/* Controls: Asset Selector & Refresh */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-[#121212] p-1 rounded-xl border border-white/5">
              {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    timeframe === tf ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAllData(selectedSymbol, timeframe)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-300 transition-colors cursor-pointer"
              title="Refresh live telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Asset Selection Bar */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {uniqueTokens.map((sym) => {
            const isSelected = selectedSymbol === sym;
            const price = getLivePrice(sym);
            return (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30'
                    : 'bg-[#121212] text-slate-400 border border-white/5 hover:bg-[#181818] hover:text-slate-200'
                }`}
              >
                <TokenLogo symbol={sym} className="w-4 h-4" />
                <span>{sym}</span>
                <span className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {price != null ? `$${price < 10 ? price.toFixed(4) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Market Overview & Structure
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'technical' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-blue-400" /> Quantitative Technical Suite
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'signals' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Live AI Trading Signals ({signals.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && intelligence && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* AI Composite Score & Trend (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Quantitative Health Score</span>
                <span className="text-blue-400 font-bold">{selectedSymbol} ({timeframe})</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-5xl font-extrabold text-white font-mono">{intelligence.marketScore}</span>
                <span className="text-sm font-mono text-slate-500">/ 100</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    intelligence.trend.includes('Bullish')
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : intelligence.trend.includes('Bearish')
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      : 'bg-slate-500/15 text-slate-300 border-slate-500/20'
                  }`}
                >
                  {intelligence.trend}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
                  <span className="text-slate-400">Momentum Vector</span>
                  <span className="font-semibold text-emerald-400">{intelligence.momentum}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
                  <span className="text-slate-400">Volatility Regime</span>
                  <span className="font-semibold text-blue-300">{intelligence.volatility}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
                  <span className="text-slate-400">Whale Activity</span>
                  <span className="font-semibold text-cyan-400">{intelligence.whaleActivityLevel}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
                  <span className="text-slate-400">Statistical Calibration</span>
                  <span className="font-mono text-slate-200">{intelligence.confidenceScore}% (Low Variance)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openSwapWithTokens('USDC', selectedSymbol)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Execute Smart DEX Order for {selectedSymbol}
            </button>
          </div>

          {/* Deep Qualitative Insights & On-Chain Telemetry (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Key Real-Time Market Observations
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Live Synced: {new Date(intelligence.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-3 pt-3">
                {intelligence.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-start gap-3 text-xs leading-relaxed text-slate-300"
                  >
                    <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              {/* On-Chain Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">ACTIVE ADDRESSES (24H)</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {intelligence.onChainMetrics.activeAddresses24h.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">LARGE TRANSFERS</div>
                  <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                    {intelligence.onChainMetrics.largeTransactionsCount.toLocaleString()} txs
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">CEX NET FLOW</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {formatCurrency(intelligence.onChainMetrics.exchangeNetInflowUsd, 1)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">AVG BASE GAS</div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {intelligence.onChainMetrics.gasFeeAverageGwei} Gwei
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-300/80 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{intelligence.disclaimer}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TECHNICAL INDICATORS SUITE */}
      {activeTab === 'technical' && indicators && (
        <div className="space-y-4">
          {/* Top Confluence Summary Bar */}
          <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-slate-400">OVERALL TECHNICAL CONFLUENCE RATING</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold text-white font-mono">{indicators.overallRating.replace('_', ' ')}</span>
                  <span className="text-sm font-mono text-slate-400">Score: {indicators.overallScore}/100</span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Timeframe: {indicators.timeframe}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono text-slate-400">LIVE SPOT ORACLE PRICE</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {indicators.currentPrice != null ? `$${indicators.currentPrice < 10 ? indicators.currentPrice.toFixed(4) : indicators.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-300 bg-[#121212] p-3 rounded-xl border border-white/5 leading-relaxed">
              {indicators.summary}
            </p>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. RSI (14) */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-blue-400" /> Relative Strength Index (RSI 14)
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    indicators.rsiSignal === 'OVERSOLD'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : indicators.rsiSignal === 'OVERBOUGHT'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {indicators.rsiSignal}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-white">{indicators.rsi}</span>
                <span className="text-xs font-mono text-slate-400">30 (Oversold) — 70 (Overbought)</span>
              </div>

              <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full w-[30%]" title="Oversold" />
                <div className="bg-blue-500 h-full w-[40%]" title="Neutral" />
                <div className="bg-rose-500 h-full w-[30%]" title="Overbought" />
              </div>
            </div>

            {/* 2. MACD (12, 26, 9) */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-purple-400" /> MACD (12, 26, 9)
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    indicators.macd.trend.includes('BULLISH')
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {indicators.macd.trend.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">MACD LINE</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">{indicators.macd.macdLine}</div>
                </div>
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">SIGNAL LINE</div>
                  <div className="text-xs font-mono font-bold text-slate-300 mt-1">{indicators.macd.signalLine}</div>
                </div>
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">HISTOGRAM</div>
                  <div
                    className={`text-xs font-mono font-bold mt-1 ${
                      indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {indicators.macd.histogram > 0 ? '+' : ''}{indicators.macd.histogram}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Moving Averages */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Exponential Moving Averages
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {indicators.maTrend.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">EMA 20</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">${indicators.ema20}</div>
                </div>
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">EMA 50</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">${indicators.ema50}</div>
                </div>
                <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">EMA 200</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">${indicators.ema200}</div>
                </div>
              </div>
            </div>

            {/* 4. Bollinger Bands */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" /> Bollinger Bands (20, 2)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {indicators.bollingerBands.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">Upper Band (+2σ)</span>
                  <span className="font-bold text-rose-400">${indicators.bollingerBands.upper}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">Middle Band (SMA 20)</span>
                  <span className="font-bold text-slate-200">${indicators.bollingerBands.middle}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">Lower Band (-2σ)</span>
                  <span className="font-bold text-emerald-400">${indicators.bollingerBands.lower}</span>
                </div>
              </div>
            </div>

            {/* 5. Pivot Points Support & Resistance */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-cyan-400" /> Standard Classical Pivots
                </span>
                <span className="text-[10px] font-mono text-slate-400">Floor/Ceilings</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-[#121212] border border-white/5">
                  <div className="text-[10px] text-rose-400 font-bold">R1 RESISTANCE</div>
                  <div className="font-bold text-white mt-0.5">${indicators.pivotPoints.r1}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#121212] border border-white/5">
                  <div className="text-[10px] text-emerald-400 font-bold">S1 SUPPORT</div>
                  <div className="font-bold text-white mt-0.5">${indicators.pivotPoints.s1}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#121212] border border-white/5 col-span-2 text-center">
                  <div className="text-[10px] text-blue-400 font-bold">CENTRAL PIVOT</div>
                  <div className="font-bold text-white mt-0.5">${indicators.pivotPoints.pivot}</div>
                </div>
              </div>
            </div>

            {/* 6. Volume & Volatility Regimes */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Volume & Volatility
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  ATR {indicators.volatilityRegime}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">Buying Pressure</span>
                  <span className="font-bold text-emerald-400">{indicators.volumeMetrics.buyingPressurePercent}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">Volume / 20-SMA</span>
                  <span className="font-bold text-white">{indicators.volumeMetrics.volumeSmaRatio}x</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#121212]">
                  <span className="text-slate-400">ATR(14) Range</span>
                  <span className="font-bold text-slate-200">${indicators.atr} ({indicators.atrPercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE AI SIGNALS */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Quantitative Confluence Signals & Statistical Backtest Records
            </h2>
            <span className="text-xs font-mono text-slate-400">Non-Custodial Alpha Models</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals.map((sig) => (
              <div
                key={sig.id}
                className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-4 hover:border-white/15 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TokenLogo symbol={sig.symbol} className="w-6 h-6" />
                    <div>
                      <div className="text-sm font-bold text-white">{sig.pair}</div>
                      <div className="text-[10px] font-mono text-slate-400">{sig.name} • {sig.timeframe} Frame</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border ${
                        sig.direction === 'LONG' || sig.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {sig.direction}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-[#121212] px-2 py-1 rounded-lg border border-white/5">
                      R:R {sig.riskRewardRatio}
                    </span>
                  </div>
                </div>

                {/* Entry / TP / SL Matrix */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <div className="text-[10px] text-slate-400">ENTRY ZONE</div>
                    <div className="font-bold text-white mt-1">
                      ${sig.entryZoneMin} - ${sig.entryZoneMax}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <div className="text-[10px] text-emerald-400">TARGET (TP2)</div>
                    <div className="font-bold text-emerald-400 mt-1">
                      ${sig.takeProfit2} (+{sig.potentialGainPercent}%)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <div className="text-[10px] text-rose-400">STOP LOSS</div>
                    <div className="font-bold text-rose-400 mt-1">
                      ${sig.stopLoss} (-{sig.maxLossPercent}%)
                    </div>
                  </div>
                </div>

                {/* Confluence Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    RSI: {sig.indicatorsConfluence.rsi}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    MACD: {sig.indicatorsConfluence.macd}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    Flow: {sig.indicatorsConfluence.whaleFlowUsd}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Win Rate: {sig.backtestStats.historicalWinRate.toFixed(1)}% ({sig.backtestStats.sampleTradesCount} tests)
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed bg-[#121212] p-3 rounded-xl border border-white/5">
                  {sig.aiRationale}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openSwapWithTokens('USDC', sig.symbol)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" /> Execute Swap via HYPERON Router
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
