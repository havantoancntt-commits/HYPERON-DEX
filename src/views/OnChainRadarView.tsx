import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { OnChainWhaleTransaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  RefreshCw,
  ExternalLink,
  Eye,
  Flame,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  Compass
} from 'lucide-react';

export const OnChainRadarView: React.FC = () => {
  const { openTokenScannerWithAddress, openSwapWithTokens, addToast } = useExchange();
  const [transactions, setTransactions] = useState<OnChainWhaleTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSentiment, setFilterSentiment] = useState<string>('ALL');

  const fetchWhaleData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onchain/whales');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching whale data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhaleData();
    const interval = setInterval(fetchWhaleData, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredTxs = transactions.filter((tx) => {
    if (filterSentiment === 'ALL') return true;
    if (filterSentiment === 'BULLISH' && tx.aiSentiment === 'BULLISH') return true;
    if (filterSentiment === 'BEARISH' && tx.aiSentiment === 'BEARISH') return true;
    return true;
  });

  return (
    <div className="space-y-6">
      <EcosystemFlowBanner />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0A1224] via-[#080E1C] to-[#060914] border border-teal-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-lg shadow-teal-950/50">
              <Activity className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  On-Chain Whale Radar & Dòng Tiền Thông Minh
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Real-time Mempool Monitor
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Giám sát trực tiếp dòng dịch chuyển tài sản của các ví cá voi (Whales), quỹ đầu tư mạo hiểm (VCs), nhà tạo lập thị trường (Market Makers) và xu hướng rút ròng khỏi các sàn CEX.
              </p>
            </div>
          </div>

          <button
            onClick={fetchWhaleData}
            className="px-4 py-2.5 rounded-xl bg-[#10182E] hover:bg-[#162242] border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Quét Dòng Tiền Mới</span>
          </button>
        </div>

        {/* 24h Netflow Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10 font-mono">
          <div className="p-3 rounded-xl bg-[#060912] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Khối Lượng Cá Voi 24h</div>
            <div className="text-lg font-bold text-white mt-0.5">$148,500,000</div>
          </div>
          <div className="p-3 rounded-xl bg-[#060912] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Rút Ròng Khỏi Sàn CEX (Bullish)</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">-$89,200,000 USD</div>
          </div>
          <div className="p-3 rounded-xl bg-[#060912] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase">Tâm Lý Dòng Tiền Alpha</div>
            <div className="text-lg font-bold text-teal-300 mt-0.5">Gom Hàng Mạnh Mẽ (88%)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#080C16] border border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-teal-400" /> Tâm Lý:
          </span>
          {[
            { id: 'ALL', label: 'Tất Cả Giao Dịch' },
            { id: 'BULLISH', label: '🟢 Gom Hàng (Bullish)' },
            { id: 'BEARISH', label: '🔴 Xả Hàng (Bearish)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSentiment(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterSentiment === tab.id
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-[#101626] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Whale Transactions Feed */}
      <div className="space-y-4">
        {filteredTxs.map((tx) => {
          const isBullish = tx.aiSentiment === 'BULLISH';
          return (
            <div
              key={tx.id}
              className="p-5 rounded-2xl bg-gradient-to-r from-[#0C1224] to-[#070B16] border border-white/10 hover:border-teal-500/40 shadow-xl transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={tx.symbol} name={tx.symbol} className="w-9 h-9" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base font-sans">{tx.symbol}</span>
                      <span className="text-xs font-mono font-bold text-teal-300">
                        {tx.amountTokens.toLocaleString()} {tx.symbol}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-white">
                        (${formatCurrency(tx.valueUsd)})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Ví: <strong className="text-slate-200">{tx.walletLabel}</strong> ({tx.walletTier})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                    isBullish
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {tx.action} • {tx.aiSentiment}
                  </span>
                </div>
              </div>

              {/* AI Quantitative Interpretation */}
              <div className="p-3 rounded-xl bg-[#060912] border border-white/5 text-xs text-slate-300 font-mono">
                <div className="text-teal-400 font-bold text-[11px] mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Phân Tích Ý Đồ Cá Voi (AI Interpretation):
                </div>
                <p className="text-slate-300 leading-relaxed">{tx.aiInterpretation}</p>
              </div>

              {/* Action Links */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-xs">TxHash: {tx.txHash.slice(0, 18)}...</span>
                  <a
                    href={`https://etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Etherscan
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openTokenScannerWithAddress('0x...', tx.symbol)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    Quét Token An Toàn
                  </button>
                  <button
                    onClick={() => openSwapWithTokens('USDC', tx.symbol)}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Mua Theo Cá Voi
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
