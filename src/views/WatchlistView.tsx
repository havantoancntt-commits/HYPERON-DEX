import React from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/utils';
import { Star, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Trash2 } from 'lucide-react';

export const WatchlistView: React.FC = () => {
  const { watchlist, toggleWatchlist, openSwapWithTokens, setSelectedToken, setActiveView } = useExchange();

  const watchedTokens = VERIFIED_TOKENS.filter((t) => watchlist.includes(t.symbol));

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="w-5 h-5 fill-amber-400" />
            </span>
            Custom Watchlist
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pinned assets with real-time price alerts, liquidity depth, and fast execution routing.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">{watchedTokens.length} Tokens Pinned</span>
      </div>

      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-mono uppercase text-slate-400">
              <th className="py-3 px-3">Asset</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">24h Change</th>
              <th className="py-3 px-3">24h Volume</th>
              <th className="py-3 px-3">DEX Liquidity</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {watchedTokens.map((token) => (
              <tr key={token.symbol} className="hover:bg-[#121212] transition-colors">
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-3">
                    <img src={token.logoUrl} alt={token.name} className="w-7 h-7 rounded-full" />
                    <div>
                      <div className="font-bold text-white">{token.symbol}</div>
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
                <td className="py-3.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openSwapWithTokens('USDC', token.symbol)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Swap
                    </button>
                    <button
                      onClick={() => toggleWatchlist(token.symbol)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
