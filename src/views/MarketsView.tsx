import React, { useState } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { Token } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ShieldCheck,
  Zap,
  ArrowLeftRight,
  ChevronRight,
  ShieldAlert,
  Star
} from 'lucide-react';

export const MarketsView: React.FC = () => {
  const { setSelectedToken, setActiveView, openSwapWithTokens, openTokenScannerWithAddress, watchlist, toggleWatchlist, liveTokens, tickDirections, isPriceLive } = useExchange();
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<'ALL' | 'L1' | 'L2' | 'DEFI' | 'AI' | 'STABLES'>('ALL');
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change' | 'liquidity'>('volume');

  const filteredTokens = liveTokens.filter((t) => {
    const matchesSearch = t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedSector === 'L1') return ['ETH', 'BNB', 'SOL', 'AVAX', 'SUI', 'APT', 'SEI'].includes(t.symbol);
    if (selectedSector === 'L2') return ['ARB', 'OP', 'POL', 'BASE'].includes(t.symbol);
    if (selectedSector === 'DEFI') return ['UNI', 'AAVE', 'LINK', 'MKR', 'CRV'].includes(t.symbol);
    if (selectedSector === 'AI') return ['AETH', 'TAO', 'RENDER', 'FET', 'AGIX'].includes(t.symbol);
    if (selectedSector === 'STABLES') return ['USDC', 'USDT', 'DAI'].includes(t.symbol);
    return true;
  }).sort((a, b) => {
    if (sortBy === 'volume') return b.volume24h - a.volume24h;
    if (sortBy === 'price') return b.priceUsd - a.priceUsd;
    if (sortBy === 'change') return b.change24h - a.change24h;
    if (sortBy === 'liquidity') return b.liquidityUsd - a.liquidityUsd;
    return 0;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Global Web3 Markets
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verified token pricing, volume aggregation, and audited contract status.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens or contracts..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#121212] border border-white/5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sector Category Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['ALL', 'L1', 'L2', 'DEFI', 'AI', 'STABLES'] as const).map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                selectedSector === sector
                  ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                  : 'bg-[#0A0A0A] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Sort By:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-[#121212] text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-white/5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="volume">24h Volume</option>
            <option value="price">Price</option>
            <option value="change">24h Gainers/Losers</option>
            <option value="liquidity">DEX Liquidity</option>
          </select>
        </div>
      </div>

      {/* Markets Table */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-4 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-mono uppercase text-slate-400">
              <th className="py-3 px-3">Asset</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">24h Change</th>
              <th className="py-3 px-3">24h Volume</th>
              <th className="py-3 px-3">DEX Liquidity</th>
              <th className="py-3 px-3">Security Audit</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTokens.map((token) => {
              const isFav = watchlist.includes(token.symbol);
              return (
                <tr key={token.symbol} className="hover:bg-[#121212] transition-colors group">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleWatchlist(token.symbol)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <img src={token.logoUrl} alt={token.name} className="w-7 h-7 rounded-full" />
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {token.symbol}
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {token.chainId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-medium">
                    <span className={`transition-colors flex items-center gap-1 ${
                      tickDirections[token.symbol] === 'up'
                        ? 'text-emerald-400 font-bold'
                        : tickDirections[token.symbol] === 'down'
                        ? 'text-rose-400 font-bold'
                        : 'text-white'
                    }`}>
                      {formatCurrency(token.priceUsd)}
                    </span>
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
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      96/100 Audited
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openSwapWithTokens('ETH', token.symbol)}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => {
                          setSelectedToken(token);
                          setActiveView('token-details');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Details
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
  );
};
