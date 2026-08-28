import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { AIMarketIntelligence } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  Cpu,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Layers,
  Fuel,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const AIIntelligenceView: React.FC = () => {
  const { openSwapWithTokens } = useExchange();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH');
  const [intelligence, setIntelligence] = useState<AIMarketIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchIntelligence = async (symbol: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/market-intelligence?symbol=${symbol}`);
      const data = await res.json();
      setIntelligence(data);
    } catch (err) {
      console.warn('Failed to load AI market intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence(selectedSymbol);
  }, [selectedSymbol]);

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
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                AI Market Intelligence Engine
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                Gemini 3.7
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Institutional quantitative market structure synthesis combining Layer-1/2 on-chain settlement telemetry, exchange order flow, and mempool sentiment.
            </p>
          </div>

          {/* Asset Selector */}
          <div className="flex items-center gap-2">
            {VERIFIED_TOKENS.slice(0, 5).map((t) => (
              <button
                key={t.symbol}
                onClick={() => setSelectedSymbol(t.symbol)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                  selectedSymbol === t.symbol
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/20'
                    : 'bg-[#121212] text-slate-400 border border-white/5 hover:bg-[#181818] hover:text-slate-200'
                }`}
              >
                <TokenLogo symbol={t.symbol} className="w-3.5 h-3.5" />
                <span>{t.symbol}</span>
              </button>
            ))}
            <button
              onClick={() => fetchIntelligence(selectedSymbol)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Intelligence Cards */}
      {intelligence && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* AI Composite Score & Trend (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400">Composite AI Health Score</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-5xl font-extrabold text-white font-mono">{intelligence.marketScore}</span>
                <span className="text-sm font-mono text-slate-500">/ 100</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
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
                  <span className="text-slate-400">Confidence Calibration</span>
                  <span className="font-mono text-slate-200">{intelligence.confidenceScore}% (Low Variance)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openSwapWithTokens('USDC', selectedSymbol)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Execute AI-Routed Order for {selectedSymbol}
            </button>
          </div>

          {/* Deep Qualitative Insights & On-Chain Telemetry (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Key Structural Observations
                </div>
                <span className="text-[11px] font-mono text-slate-500">Updated: {new Date(intelligence.generatedAt).toLocaleTimeString()}</span>
              </div>

              <div className="space-y-3 pt-3">
                {intelligence.keyInsights.map((insight, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-start gap-3 text-xs leading-relaxed text-slate-300">
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
                  <div className="text-[10px] font-mono text-slate-500">WHALE TRANSFERS</div>
                  <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                    {intelligence.onChainMetrics.largeTransactionsCount.toLocaleString()} txs
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">CEX NET FLOW</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {formatCurrency(intelligence.onChainMetrics.exchangeNetInflowUsd, 1)} (Outflow)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121212] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500">AVG GAS BASE</div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {intelligence.onChainMetrics.gasFeeAverageGwei} Gwei (Efficient)
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/80 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{intelligence.disclaimer}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
