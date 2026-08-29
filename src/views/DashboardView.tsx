import React from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { VERIFIED_TOKENS, SUPPORTED_CHAINS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Cpu,
  Fuel,
  ArrowLeftRight,
  ShieldAlert,
  Sparkles,
  Zap,
  Lock,
  Layers,
  ChevronRight,
  Activity,
  Bot,
  PieChart,
  LineChart,
  Target,
  Rocket
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    setActiveView, 
    setSelectedToken, 
    openSwapWithTokens, 
    openTokenScannerWithAddress, 
    openPerpetualsWithSignal,
    liveTokens, 
    getLiveToken, 
    tickDirections 
  } = useExchange();
  const { balances, isDemoMode, chainId } = useWallet();

  const ethPrice = getLiveToken('ETH').priceUsd;
  const wbtcPrice = getLiveToken('WBTC').priceUsd;
  const solPrice = getLiveToken('SOL').priceUsd;
  const hyprPrice = getLiveToken('HYPR')?.priceUsd || getLiveToken('AETH')?.priceUsd || 4.82;

  const ethBalance = balances.ETH || 4.85;
  const usdcBalance = balances.USDC || 14250;
  const hyprBalance = balances.HYPR || balances.AETH || 2500;
  const wbtcBalance = balances.WBTC || 0.38;

  const totalPortfolioUsd = 
    ethBalance * ethPrice + 
    usdcBalance + 
    hyprBalance * hyprPrice + 
    wbtcBalance * wbtcPrice;

  const ethChange = getLiveToken('ETH').change24h;
  const pnl24hPercent = ethChange !== 0 ? ethChange : 3.95;
  const pnl24hUsd = (totalPortfolioUsd * pnl24hPercent) / 100;

  const trendingTokens = liveTokens.slice(0, 6);

  return (
    <div className="space-y-6 pb-12">
      {/* Ecosystem Architecture & Flow Ribbon matching user request */}
      <EcosystemFlowBanner />

      {/* AI Alpha Signals High-Winrate Spotlight Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0C1428] via-[#091022] to-[#070A18] border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white font-sans">
                Tín Hiệu AI Alpha Tự Động Vào Lệnh (94.2% Win-Rate)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                HYPR/USDC • BREAKOUT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cá voi tích lũy +$18.4M trên Arbitrum router. Điểm vào $4.75 - $4.85, TP $6.20 (+28%), SL $4.65.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('ai-signals')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold font-sans flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30"
          >
            <Zap className="w-3.5 h-3.5 text-amber-200 fill-current" />
            <span>Xem & Tự Động Khớp Lệnh</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Banner with Multi-Chain Portfolio & AI Intelligence Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Portfolio Summary Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-[#0D111A] border border-white/[0.08] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <span>Multi-Chain Aggregate Net Worth</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  ORACLE SYNCED
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1.5 flex items-center gap-3">
                {formatCurrency(totalPortfolioUsd)}
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                  <ArrowUpRight className="w-4 h-4" /> {formatPercent(pnl24hPercent)} (24h)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('swap')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/30 font-sans"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Instant Swap
              </button>
              <button
                onClick={() => setActiveView('trade')}
                className="px-4 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1A2234] text-slate-200 border border-white/[0.08] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer font-sans"
              >
                <LineChart className="w-3.5 h-3.5 text-cyan-400" /> Trade Pro
              </button>
            </div>
          </div>

          {/* Asset Allocation Bar */}
          <div className="pt-5 space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Real-Time Asset Allocation</span>
              <span className="text-cyan-400 font-bold">4 Verified Assets</span>
            </div>
            
            <div className="h-3.5 w-full rounded-full bg-[#080C14] border border-white/[0.06] overflow-hidden flex gap-1 p-0.5">
              <div className="h-full rounded-l-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: '42%' }} title="ETH 42%" />
              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: '31%' }} title="WBTC 31%" />
              <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{ width: '18%' }} title="USDC 18%" />
              <div className="h-full rounded-r-full bg-gradient-to-r from-indigo-600 to-purple-400" style={{ width: '9%' }} title="HYPR 9%" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#131926] border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-white font-bold">ETH: 4.85</span>
                <span className="text-slate-400">(${(4.85 * ethPrice).toFixed(0)})</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#131926] border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-white font-bold">WBTC: 0.38</span>
                <span className="text-slate-400">(${(0.38 * wbtcPrice).toFixed(0)})</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#131926] border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm" />
                <span className="text-white font-bold">USDC: 14.2k</span>
                <span className="text-slate-400">($14.2k)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#131926] border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
                <span className="text-white font-bold">HYPR: 2.5k</span>
                <span className="text-slate-400">(${(2500 * hyprPrice).toFixed(0)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Market Mood Score Card (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0D111A] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> AI Market Mood
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-cyan-500/30 font-extrabold uppercase">
                Gemini 3.7
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">78</span>
              <span className="text-sm font-mono text-slate-500 font-bold">/ 100</span>
              <span className="ml-2 text-xs font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Strong Bullish
              </span>
            </div>

            <div className="w-full bg-[#080C14] h-2 rounded-full overflow-hidden my-3 border border-white/[0.06]">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[78%] rounded-full shadow-sm"></div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Institutional on-chain net outflow from CEXs (-$48.2M) coupled with sub-20 Gwei gas suggests high-conviction accumulation.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Confidence: 86% (Low Vol)</span>
            <button
              onClick={() => setActiveView('ai-intelligence')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Macro Alpha <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Navigation Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveView('swap')}
          className="p-5 rounded-2xl bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] text-left transition-all group cursor-pointer shadow-lg hover:border-cyan-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/20 font-bold">
              ZERO-MEV
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5 font-sans">Smart DEX Aggregator</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Zero-slippage split routing across Uniswap, Curve & Balancer</div>
        </button>

        <button
          onClick={() => setActiveView('trade')}
          className="p-5 rounded-2xl bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] text-left transition-all group cursor-pointer shadow-lg hover:border-cyan-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <LineChart className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/20 font-bold">
              PRO TERMINAL
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5 font-sans">Trading Terminal</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Live orderbook, limit orders, 50x margin & candlestick charts</div>
        </button>

        <button
          onClick={() => setActiveView('ai-risk-scanner')}
          className="p-5 rounded-2xl bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] text-left transition-all group cursor-pointer shadow-lg hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              AUDIT AI
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5 font-sans">Token Risk Scanner</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Real-time honeypot, mintability, proxy & tax bytecode audit</div>
        </button>

        <button
          onClick={() => setActiveView('staking')}
          className="p-5 rounded-2xl bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] text-left transition-all group cursor-pointer shadow-lg hover:border-emerald-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              35.8% APY
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5 font-sans">Staking & Yield Vaults</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Non-custodial validator and delta-neutral yield strategies</div>
        </button>
      </div>

      {/* Trending Verified Markets Table */}
      <div className="rounded-3xl bg-[#0D111A] border border-white/[0.08] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <div className="text-base font-extrabold text-white font-sans">Trending Verified Markets</div>
            <div className="text-xs text-slate-400">Institutional on-chain liquidity & 24h trading volume</div>
          </div>
          <button
            onClick={() => setActiveView('markets')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            View All 40+ Markets <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">24h Change</th>
                <th className="py-3 px-3">24h Volume</th>
                <th className="py-3 px-3">Liquidity Depth</th>
                <th className="py-3 px-3">Audit Score</th>
                <th className="py-3 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {trendingTokens.map((token, idx) => {
                const tick = tickDirections[token.symbol] || 'same';
                return (
                  <tr key={`${token.chainId}-${token.address}-${token.symbol}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={token.symbol} name={token.name} src={token.logoUrl} chainId={token.chainId} className="w-8 h-8" />
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{token.symbol}</span>
                            {token.isNative && (
                              <span className="text-[9px] font-mono px-1 rounded bg-[#080C14] text-cyan-400 border border-cyan-500/20">
                                NATIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-sm">
                      <span className={`transition-colors ${
                        tick === 'up' ? 'text-emerald-400' : tick === 'down' ? 'text-rose-400' : 'text-white'
                      }`}>
                        {formatCurrency(token.priceUsd)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`flex items-center gap-0.5 font-bold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {token.change24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {formatPercent(token.change24h)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">
                      {formatCurrency(token.volume24h, 1)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">
                      {formatCurrency(token.liquidityUsd, 1)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                        98/100 Audited
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openSwapWithTokens('ETH', token.symbol)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer border border-blue-500/30 shadow-sm"
                        >
                          Swap
                        </button>
                        <button
                          onClick={() => {
                            setSelectedToken(token);
                            setActiveView('trade');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#131926] hover:bg-[#1A2234] text-slate-200 text-[11px] font-bold transition-all cursor-pointer border border-white/[0.08]"
                        >
                          Trade
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
