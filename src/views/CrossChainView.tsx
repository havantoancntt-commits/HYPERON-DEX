import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { ChainId, CrossChainSwapQuote, CrossChainBridgeRoute, CrossChainExecutionStatus } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { ChainLogo, DexProtocolIcon, TokenLogo } from '../components/CryptoIcon';
import { CrossChainExecutionModal } from '../components/CrossChainExecutionModal';
import {
  GitFork,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Clock,
  Zap,
  CheckCircle2,
  ChevronDown,
  ArrowDownUp,
  Sparkles,
  Lock,
  RefreshCw,
  Sliders,
  Flame,
  Layers,
  Award,
} from 'lucide-react';

const CROSS_CHAIN_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum Native', decimals: 18, icon: 'ETH' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, icon: 'USDC' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, icon: 'USDT' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, icon: 'WBTC' },
  { symbol: 'HYPR', name: 'Hyperon Utility', decimals: 18, icon: 'HYPR' },
];

export const CrossChainView: React.FC = () => {
  const {
    chainId: walletChainId,
    switchChain,
    balances,
    executeTransaction,
    isConnected,
    openConnectModal,
    address,
  } = useWallet();
  const { addToast } = useExchange();

  const [fromChain, setFromChain] = useState<ChainId>(walletChainId || 'ethereum');
  const [toChain, setToChain] = useState<ChainId>('arbitrum');
  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>('ETH');
  const [toTokenSymbol, setToTokenSymbol] = useState<string>('ETH');
  const [amount, setAmount] = useState<string>('1.0');

  const [refuelGas, setRefuelGas] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [quote, setQuote] = useState<CrossChainSwapQuote | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CrossChainBridgeRoute | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Execution tracking modal
  const [executionStatus, setExecutionStatus] = useState<CrossChainExecutionStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Sync fromChain with wallet chain initially
  useEffect(() => {
    if (walletChainId && walletChainId !== toChain) {
      setFromChain(walletChainId);
    }
  }, [walletChainId]);

  const activeFromBalance = balances[fromTokenSymbol] || 0;

  const fetchQuote = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || fromChain === toChain) {
      setQuote(null);
      setSelectedRoute(null);
      return;
    }

    setIsLoadingQuote(true);
    try {
      const res = await fetch('/api/crosschain/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain,
          toChain,
          fromTokenSymbol,
          toTokenSymbol,
          amount: numAmount,
          slippagePercent: slippage,
          userAddress: address,
          refuelDestinationGasAmount: refuelGas ? 0.005 : 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quote) {
          setQuote(data.quote);
          // Default select the recommended route (Hyperon Quantum Tunnel or highest received)
          setSelectedRoute(data.quote.selectedRoute || data.quote.allRoutes[0]);
        }
      } else {
        const errData = await res.json();
        console.warn('Crosschain quote error:', errData);
      }
    } catch (err) {
      console.warn('Failed to fetch cross-chain quote:', err);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [fromChain, toChain, fromTokenSymbol, toTokenSymbol, amount, slippage, refuelGas, address]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleSwapChains = () => {
    const prevFrom = fromChain;
    const prevTo = toChain;
    setFromChain(prevTo);
    setToChain(prevFrom);
  };

  const handleExecuteBridge = async () => {
    if (!isConnected) {
      addToast({
        title: 'Cần kết nối ví',
        message: 'Vui lòng kết nối ví Web3 bằng nút Ví ở thanh điều hướng dưới cùng để thực hiện chuyển cầu.',
        type: 'warning',
      });
      openConnectModal();
      return;
    }

    if (!quote || !selectedRoute) {
      addToast({
        title: 'Quote Required',
        message: 'Please calculate a valid quote before executing transfer.',
        type: 'error',
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount > activeFromBalance) {
      addToast({
        title: 'Insufficient Balance',
        message: `Your balance of ${activeFromBalance} ${fromTokenSymbol} is less than ${numAmount} ${fromTokenSymbol}.`,
        type: 'error',
      });
      return;
    }

    setIsExecuting(true);
    try {
      // 1. Submit on-chain source transaction via WalletContext
      const tx = await executeTransaction({
        chainId: fromChain,
        type: 'BRIDGE',
        fromToken: fromTokenSymbol,
        toToken: toTokenSymbol,
        fromAmount: numAmount,
        toAmount: selectedRoute.receivedAmount,
        gasSpentGwei: 19,
        gasSpentUsd: selectedRoute.gasCostUsd,
      });

      // 2. Call backend cross-chain intent execution
      const execRes = await fetch('/api/crosschain/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: {
            ...quote,
            selectedRoute,
          },
          userAddress: address,
          sourceTxHash: tx.txHash,
        }),
      });

      if (execRes.ok) {
        const data = await execRes.json();
        if (data.status) {
          setExecutionStatus(data.status);
          setIsModalOpen(true);
          addToast({
            title: 'ZK Intent Broadcasted',
            message: `Initiated bridge transfer via ${selectedRoute.protocolName}. Tracking live status...`,
            type: 'success',
          });
        }
      } else {
        throw new Error('Failed to register cross-chain intent on relayer network.');
      }
    } catch (err: any) {
      addToast({
        title: 'Transfer Failed',
        message: err?.message || 'Transaction submission cancelled or failed.',
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Exclusive Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0C121E] via-[#0E1729] to-[#0A0F1A] border border-cyan-500/20 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-950/40">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Hyperon Quantum Tunnel™
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm">
                  PROPRIETARY ZK-ROUTING
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Atomic cross-chain settlement with zero-knowledge attestation & frontrunning protection
              </p>
            </div>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-slate-400 text-[10px]">AVG FINALITY</div>
            <div className="font-bold text-emerald-400 mt-0.5">&lt; 45 Seconds</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-slate-400 text-[10px]">MEV SHIELD</div>
            <div className="font-bold text-cyan-400 mt-0.5">100% Cryptographic</div>
          </div>
        </div>
      </div>

      {/* Main Bridge Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-[#0A0E17] border border-white/10 shadow-2xl space-y-4 relative">
            {/* Header / Slippage Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Cross-Chain Transfer Intent
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Bridge Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button
                  onClick={fetchQuote}
                  disabled={isLoadingQuote}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Quotes"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingQuote ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Settings Drawer */}
            {showSettings && (
              <div className="p-4 rounded-2xl bg-[#06080E] border border-white/10 space-y-3 animate-in fade-in duration-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Slippage Tolerance</span>
                  <div className="flex gap-1.5 font-mono">
                    {[0.1, 0.5, 1.0].map((val) => (
                      <button
                        key={val}
                        onClick={() => setSlippage(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          slippage === val
                            ? 'bg-cyan-500 text-slate-950 shadow'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    <span>Destination Gas Refuel (+0.005 ETH)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={refuelGas}
                    onChange={(e) => setRefuelGas(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-cyan-500 h-4 w-4 bg-black/40 border-white/20 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Source Network & Token Input */}
            <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">FROM NETWORK & ASSET</span>
                <span className="text-slate-400">
                  Balance: <span className="font-bold text-white">{activeFromBalance.toFixed(4)} {fromTokenSymbol}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Source Chain Select */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                  <ChainLogo chainId={fromChain} className="w-5 h-5 shrink-0" />
                  <select
                    value={fromChain}
                    onChange={(e) => {
                      const newChain = e.target.value as ChainId;
                      setFromChain(newChain);
                      if (newChain === toChain) {
                        setToChain(newChain === 'arbitrum' ? 'ethereum' : 'arbitrum');
                      }
                      if (isConnected) {
                        switchChain(newChain);
                      }
                    }}
                    className="w-full bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {Object.values(SUPPORTED_CHAINS).map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0B0F17] text-white">
                        {c.name} ({c.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Token Select */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                  <TokenLogo symbol={fromTokenSymbol} className="w-5 h-5 shrink-0" />
                  <select
                    value={fromTokenSymbol}
                    onChange={(e) => setFromTokenSymbol(e.target.value)}
                    className="w-full bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {CROSS_CHAIN_TOKENS.map((t) => (
                      <option key={t.symbol} value={t.symbol} className="bg-[#0B0F17] text-white">
                        {t.symbol} - {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div className="flex items-center justify-between pt-1">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  min="0.0001"
                  step="0.01"
                  className="w-full bg-transparent font-mono font-bold text-2xl sm:text-3xl text-white focus:outline-none"
                />
                <button
                  onClick={() => setAmount(activeFromBalance.toString())}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/20 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Invert Chains Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={handleSwapChains}
                className="p-2.5 rounded-xl bg-[#0F1422] border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white shadow-xl transition-all cursor-pointer"
                title="Reverse Bridge Direction"
              >
                <ArrowDownUp className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Destination Network & Token Input */}
            <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">TO DESTINATION NETWORK</span>
                <span className="text-cyan-400 font-bold">GUARANTEED INTENT SETTLEMENT</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Destination Chain Select */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                  <ChainLogo chainId={toChain} className="w-5 h-5 shrink-0" />
                  <select
                    value={toChain}
                    onChange={(e) => {
                      const newChain = e.target.value as ChainId;
                      setToChain(newChain);
                      if (newChain === fromChain) {
                        setFromChain(newChain === 'ethereum' ? 'arbitrum' : 'ethereum');
                      }
                    }}
                    className="w-full bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {Object.values(SUPPORTED_CHAINS).map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0B0F17] text-white">
                        {c.name} ({c.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Token Select */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                  <TokenLogo symbol={toTokenSymbol} className="w-5 h-5 shrink-0" />
                  <select
                    value={toTokenSymbol}
                    onChange={(e) => setToTokenSymbol(e.target.value)}
                    className="w-full bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {CROSS_CHAIN_TOKENS.map((t) => (
                      <option key={t.symbol} value={t.symbol} className="bg-[#0B0F17] text-white">
                        {t.symbol} - {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Output Amount Preview */}
              <div className="flex items-center justify-between pt-1">
                <div className="font-mono font-bold text-2xl sm:text-3xl text-cyan-400">
                  {isLoadingQuote ? (
                    <span className="text-slate-500 animate-pulse text-lg">Computing optimal route...</span>
                  ) : selectedRoute ? (
                    `${selectedRoute.receivedAmount} ${toTokenSymbol}`
                  ) : (
                    '—'
                  )}
                </div>
                {selectedRoute && (
                  <div className="text-[11px] font-mono text-slate-400 text-right">
                    Net Output Rate: ~{(selectedRoute.receivedAmount / (parseFloat(amount) || 1)).toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleExecuteBridge}
              disabled={isLoadingQuote || isExecuting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing ZK Bridge Relaying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Exclusive Cross-Chain Swap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Bridge Protocol Matrix Comparison */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-[#0A0E17] border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Multi-Bridge Comparison
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {quote?.allRoutes?.length || 0} Routes Evaluated
              </span>
            </div>

            {/* Route Cards */}
            <div className="space-y-2.5">
              {quote?.allRoutes?.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const isExclusive = route.isExclusive || route.badge === 'EXCLUSIVE';

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-600/15 border-cyan-400/60 shadow-lg shadow-cyan-950/30'
                        : 'bg-[#0F1422] border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Exclusive Gradient Line */}
                    {isExclusive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <DexProtocolIcon
                          dexId={route.protocolName}
                          name={route.protocolName}
                          className="w-7 h-7 rounded-xl"
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{route.protocolName}</span>
                            {route.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                  route.badge === 'EXCLUSIVE'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {route.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" /> ~{route.estimatedTimeMin} min
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400">{route.securityRating} Security</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Output */}
                      <div className="text-right font-mono shrink-0">
                        <div className="text-xs font-bold text-white">
                          {route.receivedAmount} {toTokenSymbol}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          <span>Fee: ${(route.bridgeFeeUsd + route.gasCostUsd).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features list */}
                    {route.features && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                        {route.features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Security Guarantee Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300 leading-relaxed font-mono">
                Attested by Hyperon Decentralized ZK-Relayers. Zero synthetic tokens, instant destination finality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Chain Live Execution Modal */}
      <CrossChainExecutionModal
        status={executionStatus}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
