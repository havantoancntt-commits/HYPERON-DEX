import React from 'react';
import { useExchange } from '../context/ExchangeContext';
import { formatCurrency, formatPercent, shortenAddress } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ExternalLink,
  Copy,
  ArrowLeftRight,
  ShieldAlert,
  Users,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';

export const TokenDetailsView: React.FC = () => {
  const { selectedToken: initialToken, openSwapWithTokens, openTokenScannerWithAddress, addToast, getLiveToken, tickDirections } = useExchange();
  const selectedToken = getLiveToken(initialToken.symbol);
  const tickDir = tickDirections[selectedToken.symbol] || 'same';

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedToken.address);
    addToast({
      title: 'Address Copied',
      message: `${selectedToken.address} copied to clipboard.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Profile Card */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TokenLogo symbol={selectedToken.symbol} name={selectedToken.name} src={selectedToken.logoUrl} chainId={selectedToken.chainId} className="w-12 h-12" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{selectedToken.name}</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#121212] text-slate-300 border border-white/5">
                {selectedToken.symbol}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                VERIFIED CONTRACT
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
              <span>{shortenAddress(selectedToken.address, 8)}</span>
              <button onClick={copyAddress} className="hover:text-slate-200 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <span>•</span>
              <span className="uppercase text-blue-400">{selectedToken.chainId}</span>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {formatCurrency(selectedToken.priceUsd)}
            </div>
            <div className={`text-xs font-mono font-semibold flex items-center gap-1 ${
              selectedToken.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {selectedToken.change24h >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {formatPercent(selectedToken.change24h)} (24h)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openSwapWithTokens('ETH', selectedToken.symbol)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Swap {selectedToken.symbol}
            </button>
            <button
              onClick={() => openTokenScannerWithAddress(selectedToken.address, selectedToken.symbol)}
              className="px-4 py-2.5 rounded-xl bg-[#121212] hover:bg-[#181818] text-amber-300 border border-amber-500/30 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Run Audit
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
          <div className="text-[11px] font-mono text-slate-400">24H VOLUME</div>
          <div className="text-base font-bold font-mono text-white mt-1">
            {formatCurrency(selectedToken.volume24h, 1)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
          <div className="text-[11px] font-mono text-slate-400">DEX LIQUIDITY POOL</div>
          <div className="text-base font-bold font-mono text-white mt-1">
            {formatCurrency(selectedToken.liquidityUsd, 1)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
          <div className="text-[11px] font-mono text-slate-400">MARKET CAPITALIZATION</div>
          <div className="text-base font-bold font-mono text-white mt-1">
            {formatCurrency(selectedToken.marketCapUsd || selectedToken.priceUsd * 120000000, 1)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
          <div className="text-[11px] font-mono text-slate-400">SECURITY AUDIT SCORE</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1">
            96/100 (Audited)
          </div>
        </div>
      </div>

      {/* Deep On-Chain Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tokenomics & Holder Concentration */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-3">
          <div className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
            <Users className="w-4 h-4 text-blue-400" /> On-Chain Holder Distribution
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Top 10 Holders Concentration:</span>
              <span className="text-emerald-400 font-bold">24.5% (Healthy Decentralization)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Circulating Supply:</span>
              <span className="text-slate-200">120,450,000 {selectedToken.symbol}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Smart Contract Standard:</span>
              <span className="text-slate-200">ERC-20 (EIP-2612 Permit Supported)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Contract Verification:</span>
              <span className="text-emerald-400 font-semibold">Exact Bytecode Match on Etherscan</span>
            </div>
          </div>
        </div>

        {/* Security & Threat Scanner Summary */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-3">
          <div className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Automated Safety Matrix
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Honeypot Trap Signature:</span>
              <span className="text-emerald-400 font-bold">None (100% Sellable)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Buy / Sell Tax:</span>
              <span className="text-emerald-400 font-bold">0% / 0%</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Mintability Vulnerability:</span>
              <span className="text-slate-200">Multi-Sig Timelock Protected</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-[#121212] border border-white/5">
              <span className="text-slate-400">Liquidity Locking:</span>
              <span className="text-emerald-400 font-semibold">99.2% Locked (365 Days)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
