import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS, DEX_SOURCES } from '../lib/constants';
import { Token, SwapQuote } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { TokenLogo, DexProtocolIcon } from '../components/CryptoIcon';
import {
  ArrowDownUp,
  ShieldCheck,
  Fuel,
  Sparkles,
  Settings,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Layers,
  Zap,
  Info,
  CheckCircle2,
  Lock,
  Search,
  Check
} from 'lucide-react';

export const SwapView: React.FC = () => {
  const { balances, isConnected, connectWallet, slippage, setSlippage, mevProtected, setMevProtected } = useWallet();
  const { selectedPair, setSelectedPair, setActiveSimulation, addToast, getLiveToken, liveTokens, isPriceLive } = useExchange();

  const [fromSymbol, setFromSymbol] = useState<string>(selectedPair.base?.symbol || 'ETH');
  const [toSymbol, setToSymbol] = useState<string>(selectedPair.quote?.symbol || 'USDC');
  
  const fromToken = getLiveToken(fromSymbol);
  const toToken = getLiveToken(toSymbol);

  const [fromAmount, setFromAmount] = useState<string>('1.0');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showFromSelect, setShowFromSelect] = useState<boolean>(false);
  const [showToSelect, setShowToSelect] = useState<boolean>(false);
  const [searchTokenQuery, setSearchTokenQuery] = useState<string>('');

  // Fetch real quote from server Smart Router
  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setIsLoadingQuote(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTokenSymbol: fromToken.symbol,
          toTokenSymbol: toToken.symbol,
          amount: fromAmount,
          slippage,
        }),
      });
      const data = await res.json();
      if (data.quote) {
        setQuote(data.quote);
      }
    } catch (err) {
      console.warn('Quote fetch error:', err);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [fromSymbol, toSymbol, fromAmount, slippage, fromToken.priceUsd, toToken.priceUsd]);

  const handleSwapTokens = () => {
    const temp = fromSymbol;
    setFromSymbol(toSymbol);
    setToSymbol(temp);
  };

  const handleInitiateSwap = async () => {
    if (!quote) return;
    try {
      const res = await fetch('/api/swaps/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote }),
      });
      const data = await res.json();
      if (data.simulation) {
        setActiveSimulation(data.simulation);
      }
    } catch (err) {
      addToast({
        title: 'Simulation Error',
        message: 'Could not connect to sandboxed RPC node for pre-flight simulation.',
        type: 'error',
      });
    }
  };

  const fromBalance = balances[fromToken.symbol] || 0;
  const toBalance = balances[toToken.symbol] || 0;

  const filteredSelectionTokens = liveTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTokenQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTokenQuery.toLowerCase())
  );

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-sans">
            Smart DEX Aggregator
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
              SPLIT ROUTING
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Optimized multi-hop route across Uniswap v3, Curve, Balancer & SushiSwap with zero MEV slippage.
          </p>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            showSettings ? 'bg-blue-600/20 text-cyan-300 border-blue-500/40 shadow-sm' : 'bg-[#0D111A] text-slate-400 border-white/[0.08] hover:text-white hover:bg-[#131926]'
          }`}
          title="Swap & Routing Parameters"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage & Routing Settings Panel */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-[#0D111A] border border-white/[0.08] space-y-3 animate-in fade-in zoom-in-95 duration-100 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-sans">Max Slippage Tolerance</span>
            <span className="text-[10px] font-mono text-cyan-400">Guaranteed Minimum Out</span>
          </div>
          <div className="flex items-center gap-2">
            {[0.1, 0.5, 1.0].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  slippage === s
                    ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                    : 'bg-[#131926] text-slate-300 border border-white/[0.06] hover:bg-[#1A2234]'
                }`}
              >
                {s}%
              </button>
            ))}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131926] border border-white/[0.06]">
              <span className="text-xs text-slate-400 font-medium">Custom:</span>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                className="w-12 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                step="0.1"
                min="0.05"
                max="10"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Private Flashbots MEV Shield</div>
                <div className="text-[10px] text-slate-400">Bypasses public mempool to prevent sandwich and front-running bots</div>
              </div>
            </div>
            <button
              onClick={() => setMevProtected(!mevProtected)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                mevProtected ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  mevProtected ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Main Swap Card Container */}
      <div className="rounded-3xl bg-[#0D111A] border border-white/[0.08] shadow-2xl overflow-hidden relative">
        {/* Card Subheader Bar */}
        <div className="bg-[#080C14] border-b border-white/[0.06] px-6 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Instant Execution
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-slate-300 font-mono font-medium">0.05% Aggregator Fee</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-3">
          {/* FROM Token Input Box */}
          <div className="bg-[#131926] p-4 sm:p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">You Pay</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-400">Balance: {fromBalance.toFixed(4)} {fromToken.symbol}</span>
                <button
                  onClick={() => setFromAmount(fromBalance.toString())}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/20 text-cyan-300 hover:bg-blue-500/30 font-bold uppercase transition-colors cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-3xl font-mono font-extrabold text-white placeholder-slate-600 focus:outline-none"
              />

              {/* Token Selector Button */}
              <button
                onClick={() => setShowFromSelect(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0D111A] hover:bg-[#172033] border border-white/10 shrink-0 text-white transition-all cursor-pointer shadow-md group"
              >
                <TokenLogo symbol={fromToken.symbol} name={fromToken.name} src={fromToken.logoUrl} chainId={fromToken.chainId} className="w-6 h-6" />
                <span className="font-bold text-sm">{fromToken.symbol}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>≈ {formatCurrency((parseFloat(fromAmount) || 0) * fromToken.priceUsd)} USD</span>
              <span className="text-slate-500">${fromToken.priceUsd.toFixed(2)} / {fromToken.symbol}</span>
            </div>
          </div>

          {/* Swap Direction Switcher */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-4 border-[#0D111A] rounded-full flex items-center justify-center text-white shadow-xl transition-all hover:rotate-180 duration-300 cursor-pointer"
              title="Reverse direction"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* TO Token Input Box */}
          <div className="bg-[#131926] p-4 sm:p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">You Receive (Estimated)</span>
              <span className="font-mono text-slate-400">Balance: {toBalance.toFixed(4)} {toToken.symbol}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-3xl font-mono font-extrabold text-white">
                {isLoadingQuote ? (
                  <span className="text-slate-500 animate-pulse flex items-center gap-2 text-2xl">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" /> Routing...
                  </span>
                ) : quote ? (
                  formatCrypto(quote.expectedOutput)
                ) : (
                  '0.00'
                )}
              </div>

              {/* Token Selector Button */}
              <button
                onClick={() => setShowToSelect(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0D111A] hover:bg-[#172033] border border-white/10 shrink-0 text-white transition-all cursor-pointer shadow-md group"
              >
                <TokenLogo symbol={toToken.symbol} name={toToken.name} src={toToken.logoUrl} chainId={toToken.chainId} className="w-6 h-6" />
                <span className="font-bold text-sm">{toToken.symbol}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>≈ {formatCurrency((quote?.expectedOutput || 0) * toToken.priceUsd)} USD</span>
              <span className="text-slate-500">${toToken.priceUsd.toFixed(2)} / {toToken.symbol}</span>
            </div>
          </div>

          {/* Route Splits Flowchart */}
          {quote && (
            <div className="pt-2 space-y-2.5">
              <div className="p-4 rounded-2xl bg-[#080C14] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-white font-bold">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Optimal Routing Graph
                  </span>
                  <span className="font-mono text-emerald-400 text-[10px] font-extrabold uppercase">
                    100% Split Route
                  </span>
                </div>

                <div className="space-y-1.5">
                  {quote.routeSplits.map((split, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#0D111A] border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <DexProtocolIcon dexId={split.dexName} name={split.dexName} className="w-6 h-6" />
                        <span className="font-mono text-cyan-400 font-bold">{split.percentage}%</span>
                        <span className="text-white font-semibold">{split.dexName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        {split.path.join(' → ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Parameter Checkpoints */}
              <div className="p-3.5 rounded-2xl bg-[#080C14] border border-white/[0.06] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Guaranteed Minimum Out</span>
                  <span className="font-bold text-white">{quote.minimumReceived} {toToken.symbol}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Price Impact</span>
                  <span className={`font-bold ${parseFloat(quote.priceImpactPercent) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {quote.priceImpactPercent}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Network Fee</span>
                  <span className="text-slate-200 font-bold flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-400" /> ~${quote.estimatedGasUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>MEV Settlement</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Private Flashbots Commit
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {isConnected ? (
              <button
                onClick={handleInitiateSwap}
                disabled={isLoadingQuote || !quote || parseFloat(fromAmount) <= 0}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Simulate & Execute Swap</span>
              </button>
            ) : (
              <button
                onClick={() => connectWallet('demo')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-900/30 transition-all cursor-pointer"
              >
                Connect Non-Custodial Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Token Select Modals */}
      {(showFromSelect || showToSelect) && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => {
            setShowFromSelect(false);
            setShowToSelect(false);
          }}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-[#0D111A] border border-white/10 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="font-bold text-base text-white font-sans">Select Verified Asset</div>
              <button
                onClick={() => {
                  setShowFromSelect(false);
                  setShowToSelect(false);
                }}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#171F30] rounded-xl hover:text-white font-mono cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search name or paste contract address..."
                value={searchTokenQuery}
                onChange={(e) => setSearchTokenQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#131926] border border-white/[0.08] rounded-xl text-xs font-sans text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 scrollbar-none">
              {filteredSelectionTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    if (showFromSelect) setFromSymbol(token.symbol);
                    if (showToSelect) setToSymbol(token.symbol);
                    setShowFromSelect(false);
                    setShowToSelect(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.05] text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol={token.symbol} name={token.name} src={token.logoUrl} chainId={token.chainId} className="w-8 h-8" />
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        {token.symbol}
                        <span className="text-[10px] font-normal text-slate-400">{token.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">Verified Protocol Token</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">${token.priceUsd.toLocaleString(undefined, { minimumFractionDigits: token.priceUsd < 10 ? 4 : 2 })}</div>
                    <div className={`text-[10px] font-bold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
