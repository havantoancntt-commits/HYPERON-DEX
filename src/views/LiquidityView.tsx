import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SAMPLE_POOLS } from '../lib/constants';
import { LiquidityPool } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  Layers,
  Plus,
  ArrowDownUp,
  Percent,
  Sparkles,
  Calculator,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';

export const LiquidityView: React.FC = () => {
  const { isConnected, connectWallet, executeTransaction } = useWallet();
  const { addToast } = useExchange();

  const [pools, setPools] = useState<LiquidityPool[]>(SAMPLE_POOLS);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCalcModal, setShowCalcModal] = useState<boolean>(false);
  const [depositAmountA, setDepositAmountA] = useState<string>('1.0');
  const [depositAmountB, setDepositAmountB] = useState<string>('3420.50');

  // Impermanent loss calculator inputs
  const [tokenPriceChangeA, setTokenPriceChangeA] = useState<number>(50); // +50%
  const [tokenPriceChangeB, setTokenPriceChangeB] = useState<number>(0);  // 0% (e.g. stablecoin)

  // IL Formula: 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  const priceRatio = (1 + tokenPriceChangeA / 100) / (1 + tokenPriceChangeB / 100);
  const impermanentLossPercent = (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;

  const handleAddLiquidity = async () => {
    if (!selectedPool) return;
    await executeTransaction({
      chainId: 'ethereum',
      type: 'ADD_LIQUIDITY',
      fromToken: selectedPool.token0.symbol,
      toToken: selectedPool.token1.symbol,
      fromAmount: parseFloat(depositAmountA),
      toAmount: parseFloat(depositAmountB),
      gasSpentGwei: 22,
      gasSpentUsd: 4.60,
    });

    addToast({
      title: 'Liquidity Position Minted',
      message: `Minted concentrated LP NFT in ${selectedPool.name} pool earning ${selectedPool.feeTierPercent}% fees.`,
      type: 'success',
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0D111A] border border-white/[0.08] shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-blue-500/10 text-cyan-400 border border-blue-500/20 shadow-md">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans">
              Concentrated Liquidity Pools
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provide concentrated liquidity across verified multi-chain pairs, capture dynamic LP swap fees, and farm protocol yield.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCalcModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1A2234] border border-white/[0.08] text-xs font-bold text-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Calculator className="w-4 h-4 text-cyan-400" /> Impermanent Loss Simulator
          </button>
        </div>
      </div>

      {/* Pools Table Card */}
      <div className="rounded-3xl bg-[#0D111A] border border-white/[0.08] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="text-sm font-extrabold text-white font-sans">Active High-Yield Liquidity Pools</div>
          <span className="text-xs font-mono text-cyan-400 font-bold">{pools.length} Pools Available</span>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <th className="py-3 px-3">Pool Pair</th>
                <th className="py-3 px-3">Fee Tier</th>
                <th className="py-3 px-3">Total Value Locked (TVL)</th>
                <th className="py-3 px-3">24h Volume</th>
                <th className="py-3 px-3">24h Fee Revenue</th>
                <th className="py-3 px-3">Estimated APR</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {pools.map((pool) => (
                <tr key={pool.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <TokenLogo symbol={pool.token0.symbol} name={pool.token0.name} src={pool.token0.logoUrl} chainId={pool.token0.chainId} className="w-7 h-7 border-2 border-[#0D111A] shadow" />
                        <TokenLogo symbol={pool.token1.symbol} name={pool.token1.name} src={pool.token1.logoUrl} chainId={pool.token1.chainId} className="w-7 h-7 border-2 border-[#0D111A] shadow" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{pool.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{pool.chainId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#131926] border border-white/[0.06] text-cyan-300 font-bold text-[10px]">
                      {pool.feeTierPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-white">
                    {formatCurrency(pool.tvlUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 font-medium">
                    {formatCurrency(pool.volume24hUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 font-medium">
                    {formatCurrency(pool.fees24hUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> {pool.aprPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedPool(pool);
                        setShowAddModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer border border-blue-500/30 shadow-sm"
                    >
                      + Deposit LP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Liquidity Modal */}
      {showAddModal && selectedPool && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-[#0D111A] border border-white/10 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="font-bold text-base text-white flex items-center gap-2 font-sans">
                <Plus className="w-5 h-5 text-cyan-400" /> Add Liquidity to {selectedPool.name}
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#171F30] hover:bg-[#1f2a40] border border-white/5 rounded-xl cursor-pointer font-mono"
              >
                ESC
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5 bg-[#131926] p-3.5 rounded-2xl border border-white/[0.06]">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span className="font-bold text-white">Deposit {selectedPool.token0.symbol}</span>
                  <span>Balance: 4.85</span>
                </div>
                <input
                  type="number"
                  value={depositAmountA}
                  onChange={(e) => setDepositAmountA(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0D111A] border border-white/[0.08] font-mono text-white text-base font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5 bg-[#131926] p-3.5 rounded-2xl border border-white/[0.06]">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span className="font-bold text-white">Deposit {selectedPool.token1.symbol}</span>
                  <span>Balance: 14,250.00</span>
                </div>
                <input
                  type="number"
                  value={depositAmountB}
                  onChange={(e) => setDepositAmountB(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0D111A] border border-white/[0.08] font-mono text-white text-base font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#080C14] border border-white/[0.06] space-y-2 text-slate-300 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Fee Tier:</span>
                  <span className="text-cyan-300 font-bold">{selectedPool.feeTierPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Annual Yield (APR):</span>
                  <span className="text-emerald-400 font-bold text-sm">{selectedPool.aprPercent}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddLiquidity}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-900/30 transition-all cursor-pointer font-sans"
            >
              Confirm Deposit & Mint LP Position
            </button>
          </div>
        </div>
      )}

      {/* Impermanent Loss Calculator Modal */}
      {showCalcModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowCalcModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-[#0D111A] border border-white/10 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="font-bold text-base text-white flex items-center gap-2 font-sans">
                <Calculator className="w-5 h-5 text-cyan-400" /> Impermanent Loss Simulator
              </div>
              <button
                onClick={() => setShowCalcModal(false)}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#171F30] hover:bg-[#1f2a40] border border-white/5 rounded-xl cursor-pointer font-mono"
              >
                ESC
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2 bg-[#131926] p-4 rounded-2xl border border-white/[0.06]">
                <div className="flex justify-between text-slate-300 font-mono">
                  <span className="font-bold">Token A (ETH) Price Movement:</span>
                  <span className="font-bold text-emerald-400">+{tokenPriceChangeA}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="400"
                  value={tokenPriceChangeA}
                  onChange={(e) => setTokenPriceChangeA(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-2 bg-[#131926] p-4 rounded-2xl border border-white/[0.06]">
                <div className="flex justify-between text-slate-300 font-mono">
                  <span className="font-bold">Token B (USDC) Price Movement:</span>
                  <span className="font-bold text-slate-200">{tokenPriceChangeB}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={tokenPriceChangeB}
                  onChange={(e) => setTokenPriceChangeB(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Result Callout */}
              <div className="p-5 rounded-2xl bg-[#080C14] border border-white/[0.06] space-y-2 text-center">
                <div className="text-slate-400 font-mono text-[11px] font-bold uppercase">Estimated Impermanent Loss vs HODL:</div>
                <div className="text-3xl font-extrabold font-mono text-amber-400">
                  {impermanentLossPercent.toFixed(2)}%
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  If the pool's fee APR ({SAMPLE_POOLS[0].aprPercent}%) exceeds this divergence loss over the holding period, your LP position remains net profitable.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
