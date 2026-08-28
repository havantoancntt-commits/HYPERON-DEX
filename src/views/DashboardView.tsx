import React from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { VERIFIED_TOKENS, SUPPORTED_CHAINS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/utils';
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
  Bot
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveView, setSelectedToken, openSwapWithTokens, openTokenScannerWithAddress, liveTokens, getLiveToken, tickDirections } = useExchange();
  const { balances, isDemoMode, chainId } = useWallet();

  const ethPrice = getLiveToken('ETH').priceUsd;
  const wbtcPrice = getLiveToken('WBTC').priceUsd;
  const solPrice = getLiveToken('SOL').priceUsd;
  const aethPrice = getLiveToken('AETH').priceUsd;

  const ethBalance = balances.ETH || 4.85;
  const usdcBalance = balances.USDC || 14250;
  const aethBalance = balances.AETH || 2500;
  const wbtcBalance = balances.WBTC || 0.38;

  const totalPortfolioUsd = 
    ethBalance * ethPrice + 
    usdcBalance + 
    aethBalance * aethPrice + 
    wbtcBalance * wbtcPrice;

  const ethChange = getLiveToken('ETH').change24h;
  const pnl24hPercent = ethChange !== 0 ? ethChange : 3.95;
  const pnl24hUsd = (totalPortfolioUsd * pnl24hPercent) / 100;

  const topGainers = [...liveTokens].sort((a, b) => b.change24h - a.change24h).slice(0, 4);
  const trendingTokens = liveTokens.slice(0, 6);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with AI Market Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Portfolio Summary Card */}
        <div className="lg:col-span-8 rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/5">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">Total Net Worth (Multi-Chain)</div>
              <div className="text-3xl font-bold text-white font-mono mt-1 flex items-center gap-3">
                {formatCurrency(totalPortfolioUsd)}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {formatPercent(pnl24hPercent)} (24h)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('swap')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-900/20"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Instant Swap
              </button>
              <button
                onClick={() => setActiveView('ai-copilot')}
                className="px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Copilot
              </button>
            </div>
          </div>

          {/* Asset Allocation Bar */}
          <div className="pt-5 space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-slate-400 font-medium">Asset Allocation Breakdown</span>
              <span className="font-mono text-slate-400 text-[11px]">4 Active Assets</span>
            </div>
            
            <div className="h-3 w-full rounded-full bg-[#121212] border border-white/5 overflow-hidden flex gap-0.5 p-0.5">
              <div className="h-full rounded-l-full bg-blue-500" style={{ width: '42%' }} title="ETH 42%" />
              <div className="h-full bg-amber-500" style={{ width: '31%' }} title="WBTC 31%" />
              <div className="h-full bg-cyan-500" style={{ width: '18%' }} title="USDC 18%" />
              <div className="h-full rounded-r-full bg-purple-500" style={{ width: '9%' }} title="AETH 9%" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121212] border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-200">ETH: 4.85</span>
                <span className="text-slate-500">($16.5k)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121212] border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-200">WBTC: 0.38</span>
                <span className="text-slate-500">($33.2k)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121212] border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-200">USDC: 14.2k</span>
                <span className="text-slate-500">($14.2k)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121212] border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-200">AETH: 2.5k</span>
                <span className="text-slate-500">($12.0k)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Market Score Card */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> AI Market Mood
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                GEMINI 3.7
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">78</span>
              <span className="text-sm font-mono text-slate-500">/ 100</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Strong Bullish
              </span>
            </div>

            <div className="w-full bg-[#121212] h-1.5 rounded-full overflow-hidden my-3 border border-white/5">
              <div className="bg-blue-500 h-full w-[78%]"></div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional on-chain net outflow from CEXs (-$48.2M) coupled with sub-20 Gwei gas suggests institutional accumulation phase.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">Confidence: 84% (Low Vol)</span>
            <button
              onClick={() => setActiveView('ai-intelligence')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Deep Analysis <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveView('swap')}
          className="p-5 rounded-2xl bg-[#0A0A0A] hover:bg-[#0e0e0e] border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              MEV SHIELD
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5">Smart DEX Aggregator</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Zero-slippage split routing across Uniswap, Curve & Balancer</div>
        </button>

        <button
          onClick={() => setActiveView('trade')}
          className="p-5 rounded-2xl bg-[#0A0A0A] hover:bg-[#0e0e0e] border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              PRO TERMINAL
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5">Advanced Trading</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Live orderbook, limit orders, stop-loss & candlestick charts</div>
        </button>

        <button
          onClick={() => setActiveView('ai-risk-scanner')}
          className="p-5 rounded-2xl bg-[#0A0A0A] hover:bg-[#0e0e0e] border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              AUDIT AI
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5">AI Token Risk Scanner</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Real-time honeypot, mintability, proxy & tax detection</div>
        </button>

        <button
          onClick={() => setActiveView('staking')}
          className="p-5 rounded-2xl bg-[#0A0A0A] hover:bg-[#0e0e0e] border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              35.8% APY
            </span>
          </div>
          <div className="font-bold text-sm text-white mt-3.5">Staking & Yield Vaults</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">Non-custodial validator and delta-neutral yield strategies</div>
        </button>
      </div>

      {/* Markets & Top Movers Table */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <div className="text-sm font-bold text-white">Trending Verified Markets</div>
            <div className="text-xs text-slate-400">Institutional on-chain liquidity & 24h trading volume</div>
          </div>
          <button
            onClick={() => setActiveView('markets')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            View All 40+ Markets <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">24h Change</th>
                <th className="py-3 px-3">24h Volume</th>
                <th className="py-3 px-3">Liquidity</th>
                <th className="py-3 px-3">Security Score</th>
                <th className="py-3 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trendingTokens.map((token) => (
                <tr key={token.symbol} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <img src={token.logoUrl} alt={token.name} className="w-7 h-7 rounded-full" />
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {token.symbol}
                          {token.isNative && (
                            <span className="text-[9px] font-mono px-1 rounded bg-[#121212] text-blue-400 border border-blue-500/20">
                              NATIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-medium text-white">
                    {formatCurrency(token.priceUsd)}
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className={`flex items-center gap-0.5 font-semibold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {formatPercent(token.change24h)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">
                    {formatCurrency(token.volume24h, 1)}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">
                    {formatCurrency(token.liquidityUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                      96/100 Audited
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openSwapWithTokens('ETH', token.symbol)}
                        className="px-3 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[11px] font-semibold transition-colors cursor-pointer border border-blue-500/20"
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => openTokenScannerWithAddress(token.address, token.symbol)}
                        className="px-3 py-1 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] text-slate-300 text-[11px] font-medium transition-colors cursor-pointer border border-white/5"
                      >
                        Audit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
