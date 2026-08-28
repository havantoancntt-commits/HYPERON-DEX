import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS, DEX_SOURCES } from '../lib/constants';
import { Token, SwapQuote } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
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
  CheckCircle2
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

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Smart DEX Aggregator
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
              SPLIT ROUTE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Optimal liquidity aggregation across Uniswap, Curve, Balancer & SushiSwap with zero-custody.
          </p>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            showSettings ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-[#0A0A0A] text-slate-400 border-white/5 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage & Routing Settings Panel */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-3 animate-in fade-in duration-100">
          <div className="text-xs font-semibold text-slate-200">Slippage Tolerance Configuration</div>
          <div className="flex items-center gap-2">
            {[0.1, 0.5, 1.0].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  slippage === s
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#121212] text-slate-300 border border-white/5 hover:bg-[#181818]'
                }`}
              >
                {s}%
              </button>
            ))}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121212] border border-white/5">
              <span className="text-xs text-slate-400">Custom:</span>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                className="w-12 bg-transparent text-xs font-mono text-white focus:outline-none"
                step="0.1"
                min="0.05"
                max="10"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">Flashbots MEV Shield</div>
                <div className="text-[11px] text-slate-400">Route tx via private mempool to prevent sandwich attacks</div>
              </div>
            </div>
            <button
              onClick={() => setMevProtected(!mevProtected)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                mevProtected ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  mevProtected ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Swap Card Container */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl overflow-hidden relative">
        {/* Card Subheader */}
        <div className="bg-[#0C0C0C] border-b border-white/5 h-12 px-6 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">DEX Aggregator</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-400 font-mono">0.05% Routing Fee</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* FROM Token Input */}
          <div className="bg-[#121212] p-5 sm:p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-400 font-medium">You Pay</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span>Balance: {fromBalance.toFixed(4)} {fromToken.symbol}</span>
                <button
                  onClick={() => setFromAmount(fromBalance.toString())}
                  className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-bold uppercase transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-3xl font-mono font-bold text-white placeholder-slate-700 focus:outline-none"
              />

              {/* Token Selector Button */}
              <button
                onClick={() => setShowFromSelect(!showFromSelect)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-white/5 shrink-0 text-white transition-colors cursor-pointer"
              >
                <img src={fromToken.logoUrl} alt={fromToken.name} className="w-6 h-6 rounded-full" />
                <span className="font-bold text-sm">{fromToken.symbol}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              ≈ {formatCurrency((parseFloat(fromAmount) || 0) * fromToken.priceUsd)}
            </div>
          </div>

          {/* Swap Switch Button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 border-4 border-[#0A0A0A] rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* TO Token Input */}
          <div className="bg-[#121212] p-5 sm:p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-400 font-medium">You Receive (Estimated)</span>
              <span className="font-mono">Balance: {toBalance.toFixed(4)} {toToken.symbol}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-3xl font-mono font-bold text-white">
                {isLoadingQuote ? (
                  <span className="text-slate-600 animate-pulse">Routing...</span>
                ) : quote ? (
                  formatCrypto(quote.expectedOutput)
                ) : (
                  '0.00'
                )}
              </div>

              {/* Token Selector Button */}
              <button
                onClick={() => setShowToSelect(!showToSelect)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-white/5 shrink-0 text-white transition-colors cursor-pointer"
              >
                <img src={toToken.logoUrl} alt={toToken.name} className="w-6 h-6 rounded-full" />
                <span className="font-bold text-sm">{toToken.symbol}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              ≈ {formatCurrency((quote?.expectedOutput || 0) * toToken.priceUsd)}
            </div>
          </div>

          {/* Route Visualization & Pricing Details */}
          {quote && (
            <div className="pt-2 space-y-3">
              {/* Split Route Flowchart */}
              <div className="p-4 rounded-2xl bg-[#080808] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Smart Multi-Route
                  </span>
                  <span className="font-mono text-emerald-400 text-[10px]">Optimal Path</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {quote.routeSplits.map((split, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#121212] border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-400 font-semibold">{split.percentage}%</span>
                        <span className="text-white">{split.dexName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        {split.path.join(' → ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Parameter Checkpoints */}
              <div className="p-3.5 rounded-2xl bg-[#080808] border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Minimum Received ({slippage}% slippage)</span>
                  <span className="font-mono text-white">{quote.minimumReceived} {toToken.symbol}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Price Impact</span>
                  <span className="font-mono text-emerald-400 font-medium">{quote.priceImpactPercent}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Network Fee</span>
                  <span className="font-mono text-slate-200 flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-400" /> ~${quote.estimatedGasUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>MEV Protection</span>
                  <span className="font-mono text-blue-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Nexus Private Mempool
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
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Simulate & Execute Swap</span>
              </button>
            ) : (
              <button
                onClick={() => connectWallet('demo')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
              >
                Connect Non-Custodial Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Token Select Modals */}
      {(showFromSelect || showToSelect) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0C0C] border border-white/10 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
              <div className="font-bold text-sm text-white">Select Verified Asset</div>
              <button
                onClick={() => {
                  setShowFromSelect(false);
                  setShowToSelect(false);
                }}
                className="text-slate-400 text-xs px-2 py-1 bg-[#181818] rounded-lg hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1">
              {liveTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    if (showFromSelect) setFromSymbol(token.symbol);
                    if (showToSelect) setToSymbol(token.symbol);
                    setShowFromSelect(false);
                    setShowToSelect(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={token.logoUrl} alt={token.name} className="w-7 h-7 rounded-full" />
                    <div>
                      <div className="font-semibold text-xs text-white">{token.symbol}</div>
                      <div className="text-[11px] text-slate-400">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-white">${token.priceUsd.toLocaleString()}</div>
                    <div className={`text-[10px] ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h}%
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
