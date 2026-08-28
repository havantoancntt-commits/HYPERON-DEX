import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';
import { ChainId, CrossChainBridgeRoute } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import {
  GitFork,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Clock,
  Zap,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export const CrossChainView: React.FC = () => {
  const { balances, executeTransaction } = useWallet();
  const { addToast } = useExchange();

  const [fromChain, setFromChain] = useState<ChainId>('ethereum');
  const [toChain, setToChain] = useState<ChainId>('arbitrum');
  const [amount, setAmount] = useState<string>('1.0');
  const [routes, setRoutes] = useState<CrossChainBridgeRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CrossChainBridgeRoute | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBridgeRoutes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/crosschain/routes?fromChain=${fromChain}&toChain=${toChain}&amount=${amount}`);
      const data = await res.json();
      setRoutes(data.routes || []);
      if (data.routes && data.routes.length > 0) {
        setSelectedRoute(data.routes[0]);
      }
    } catch (err) {
      console.warn('Bridge route error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBridgeRoutes();
  }, [fromChain, toChain, amount]);

  const handleBridge = async () => {
    if (!selectedRoute) return;
    await executeTransaction({
      chainId: fromChain,
      type: 'BRIDGE',
      fromToken: 'ETH',
      toToken: 'ETH',
      fromAmount: parseFloat(amount),
      toAmount: selectedRoute.receivedAmount,
      gasSpentGwei: 19,
      gasSpentUsd: selectedRoute.gasCostUsd,
    });

    addToast({
      title: 'Cross-Chain Transfer Initiated',
      message: `Bridging ${amount} ETH from ${SUPPORTED_CHAINS[fromChain].name} to ${SUPPORTED_CHAINS[toChain].name} via ${selectedRoute.protocolName}. Est. completion: ${selectedRoute.estimatedTimeMin} min.`,
      type: 'success',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <GitFork className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Cross-Chain Bridge Aggregator
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Universal liquidity routing across Ethereum, Layer-2 rollups, and Alt-L1s via Stargate, Across, and Hop.
          </p>
        </div>
      </div>

      {/* Network Selectors & Amount Input Card */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Source Chain */}
          <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-2">
            <div className="text-xs font-mono text-slate-400">Source Network</div>
            <select
              value={fromChain}
              onChange={(e: any) => setFromChain(e.target.value)}
              className="w-full bg-transparent font-bold text-white text-sm focus:outline-none cursor-pointer"
            >
              {Object.values(SUPPORTED_CHAINS).map((c) => (
                <option key={c.id} value={c.id} className="bg-[#121212] text-white">
                  {c.name} ({c.isL2 ? 'Layer 2' : 'L1'})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Chain */}
          <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-2">
            <div className="text-xs font-mono text-slate-400">Destination Network</div>
            <select
              value={toChain}
              onChange={(e: any) => setToChain(e.target.value)}
              className="w-full bg-transparent font-bold text-white text-sm focus:outline-none cursor-pointer"
            >
              {Object.values(SUPPORTED_CHAINS).map((c) => (
                <option key={c.id} value={c.id} className="bg-[#121212] text-white">
                  {c.name} ({c.isL2 ? 'Layer 2' : 'L1'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transfer Amount */}
        <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>Send Amount (ETH)</span>
            <span>Balance: 4.85 ETH</span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent font-mono font-bold text-2xl text-white focus:outline-none"
          />
        </div>

        {/* Bridge Quotes Comparison */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-slate-300">Available Bridge Routes</div>
          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-4 ${
                selectedRoute?.id === route.id
                  ? 'bg-blue-600/10 border-blue-500/40 shadow-md shadow-blue-950/40'
                  : 'bg-[#121212] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{route.logo}</span>
                <div>
                  <div className="font-bold text-xs text-white">{route.protocolName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> ~{route.estimatedTimeMin} min</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Security: {route.securityRating}</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs font-bold text-white">
                  Receive: {formatCrypto(route.receivedAmount)} ETH
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
                  <Fuel className="w-3 h-3 text-amber-400" /> Total Fee: ${ (route.bridgeFeeUsd + route.gasCostUsd).toFixed(2) }
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleBridge}
          disabled={!selectedRoute || isLoading}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xl shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-50"
        >
          Confirm & Initiate Cross-Chain Transfer
        </button>
      </div>
    </div>
  );
};
