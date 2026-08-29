import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { formatCurrency, formatPercent, formatCrypto } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Download,
  Sliders
} from 'lucide-react';

export const PortfolioView: React.FC = () => {
  const { balances } = useWallet();
  const { openSwapWithTokens, addToast, getLiveToken, tickDirections } = useExchange();

  const [activeNetworkFilter, setActiveNetworkFilter] = useState<string>('all');

  const holdings = [
    { token: getLiveToken('ETH'), amount: balances.ETH || 4.85, avgBuyPrice: 2890.00 },
    { token: getLiveToken('USDC'), amount: balances.USDC || 14250, avgBuyPrice: 1.00 },
    { token: getLiveToken('USDT'), amount: balances.USDT || 5600, avgBuyPrice: 1.00 },
    { token: getLiveToken('WBTC'), amount: balances.WBTC || 0.38, avgBuyPrice: 68400.00 },
    { token: getLiveToken('UNI'), amount: balances.UNI || 240, avgBuyPrice: 7.20 },
    { token: getLiveToken('HYPR'), amount: balances.HYPR || 2500, avgBuyPrice: 3.10 },
  ];

  const totalValue = holdings.reduce((sum, h) => sum + h.amount * h.token.priceUsd, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.amount * h.avgBuyPrice, 0);
  const unrealizedPnL = totalValue - totalCostBasis;
  const unrealizedPnLPercent = (unrealizedPnL / totalCostBasis) * 100;

  const exportCsv = () => {
    addToast({
      title: 'Ledger Exported',
      message: 'Cryptographic portfolio ledger downloaded as CSV for accounting.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="text-xs font-mono uppercase text-slate-400">Total Evaluated Net Worth</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
            {formatCurrency(totalValue)}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs font-mono">
            <span className="flex items-center gap-1 font-bold text-emerald-400">
              <ArrowUpRight className="w-4 h-4" /> +{formatCurrency(unrealizedPnL)} ({formatPercent(unrealizedPnLPercent)})
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Total Cost Basis: {formatCurrency(totalCostBasis)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Tax CSV
          </button>
          <button
            onClick={() => openSwapWithTokens('USDC', 'ETH')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Rebalance Portfolio
          </button>
        </div>
      </div>

      {/* Holdings Breakdown Table */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-400" /> Active Multi-Chain Assets
          </div>
          <span className="text-xs font-mono text-slate-400">{holdings.length} Assets Held</span>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase text-slate-400">
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Holding Balance</th>
                <th className="py-3 px-3">Current Price</th>
                <th className="py-3 px-3">Total Value</th>
                <th className="py-3 px-3">Unrealized PnL</th>
                <th className="py-3 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {holdings.map(({ token, amount, avgBuyPrice }, idx) => {
                const value = amount * token.priceUsd;
                const pnl = (token.priceUsd - avgBuyPrice) * amount;
                const pnlPercent = ((token.priceUsd - avgBuyPrice) / avgBuyPrice) * 100;
                return (
                  <tr key={`${token.chainId}-${token.symbol}-${idx}`} className="hover:bg-[#121212] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <TokenLogo symbol={token.symbol} name={token.name} src={token.logoUrl} chainId={token.chainId} className="w-7 h-7" />
                        <div>
                          <div className="font-bold text-white">{token.symbol}</div>
                          <div className="text-[11px] text-slate-400">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-200">
                      {formatCrypto(amount)} {token.symbol}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {formatCurrency(token.priceUsd)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">
                      {formatCurrency(value)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({formatPercent(pnlPercent)})
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => openSwapWithTokens(token.symbol, 'USDC')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Trade
                      </button>
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
