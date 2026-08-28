import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortenAddress, formatCurrency, formatTimeAgo } from '../lib/utils';
import { History, ExternalLink, CheckCircle2, Copy, Filter } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions } = useWallet();
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = transactions.filter((tx) => filterType === 'ALL' || tx.type === filterType);

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <History className="w-5 h-5" />
            </span>
            On-Chain Transaction Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time cryptographic execution ledger with block confirmation heights, gas expenses, and correlation IDs.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          {['ALL', 'SWAP', 'STAKE', 'ADD_LIQUIDITY', 'BRIDGE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                filterType === type
                  ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                  : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase text-slate-400">
              <th className="py-3 px-3">Tx Hash</th>
              <th className="py-3 px-3">Action Type</th>
              <th className="py-3 px-3">Transferred Assets</th>
              <th className="py-3 px-3">Network & Block</th>
              <th className="py-3 px-3">Gas Cost</th>
              <th className="py-3 px-3">Time</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#121212] transition-colors">
                <td className="py-3.5 px-3 font-semibold text-blue-400 flex items-center gap-1.5">
                  <span>{shortenAddress(tx.txHash, 8)}</span>
                </td>
                <td className="py-3.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#121212] border border-white/5 text-slate-200 font-bold text-[10px]">
                    {tx.type}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-slate-200">
                  {tx.fromAmount && `${tx.fromAmount} ${tx.fromToken || ''}`}
                  {tx.toAmount && ` → ${tx.toAmount} ${tx.toToken || ''}`}
                </td>
                <td className="py-3.5 px-3 text-slate-400">
                  <span className="uppercase text-slate-300">{tx.chainId}</span> #{tx.blockNumber}
                </td>
                <td className="py-3.5 px-3 text-slate-300">
                  ${tx.gasSpentUsd.toFixed(2)} ({tx.gasSpentGwei} Gwei)
                </td>
                <td className="py-3.5 px-3 text-slate-400">
                  {formatTimeAgo(tx.timestamp)}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    FINALIZED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
