import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SAMPLE_POOLS } from '../lib/constants';
import { LiquidityPool } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import {
  Layers,
  Plus,
  ArrowDownUp,
  Percent,
  Sparkles,
  Calculator,
  ShieldCheck,
  Zap,
  CheckCircle2
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
      title: 'Liquidity Position Created',
      message: `Minted LP NFT in ${selectedPool.name} pool earning ${selectedPool.feeTierPercent}% fees.`,
      type: 'success',
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Concentrated Liquidity Pools
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provide liquidity across verified multi-chain pairs, earn LP swap fees, and farm protocol rewards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCalcModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" /> IL Calculator
          </button>
        </div>
      </div>

      {/* Pools Table */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="text-sm font-bold text-white">Active High-Yield Liquidity Pools</div>
          <span className="text-xs font-mono text-slate-400">{pools.length} Pools Available</span>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase text-slate-400">
                <th className="py-3 px-3">Pool Pair</th>
                <th className="py-3 px-3">Fee Tier</th>
                <th className="py-3 px-3">Total Value Locked (TVL)</th>
                <th className="py-3 px-3">24h Volume</th>
                <th className="py-3 px-3">24h Fee Revenue</th>
                <th className="py-3 px-3">Estimated APR</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pools.map((pool) => (
                <tr key={pool.id} className="hover:bg-[#121212] transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex -space-x-1.5">
                        <img src={pool.token0.logoUrl} alt={pool.token0.symbol} className="w-6 h-6 rounded-full border border-black" />
                        <img src={pool.token1.logoUrl} alt={pool.token1.symbol} className="w-6 h-6 rounded-full border border-black" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{pool.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{pool.chainId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-[#121212] border border-white/5 text-slate-300 text-[10px]">
                      {pool.feeTierPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-200">
                    {formatCurrency(pool.tvlUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300">
                    {formatCurrency(pool.volume24hUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300">
                    {formatCurrency(pool.fees24hUsd, 1)}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-emerald-400 font-extrabold text-sm">
                      {pool.aprPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedPool(pool);
                        setShowAddModal(true);
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[11px] font-semibold transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> Add Liquidity to {selectedPool.name}
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#121212] hover:bg-[#181818] border border-white/5 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Deposit {selectedPool.token0.symbol}</span>
                  <span>Balance: 4.85</span>
                </div>
                <input
                  type="number"
                  value={depositAmountA}
                  onChange={(e) => setDepositAmountA(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#121212] border border-white/5 font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Deposit {selectedPool.token1.symbol}</span>
                  <span>Balance: 14,250.00</span>
                </div>
                <input
                  type="number"
                  value={depositAmountB}
                  onChange={(e) => setDepositAmountB(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#121212] border border-white/5 font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#121212] border border-white/5 space-y-1 text-slate-400 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Fee Tier:</span>
                  <span className="text-slate-200">{selectedPool.feeTierPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Annual Yield (APR):</span>
                  <span className="text-emerald-400 font-bold">{selectedPool.aprPercent}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddLiquidity}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
            >
              Confirm Deposit & Mint LP Position
            </button>
          </div>
        </div>
      )}

      {/* Impermanent Loss Calculator Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" /> Impermanent Loss Simulator
              </div>
              <button
                onClick={() => setShowCalcModal(false)}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#121212] hover:bg-[#181818] border border-white/5 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Token A (e.g. ETH) Price Change:</span>
                  <span className="font-bold text-emerald-400">+{tokenPriceChangeA}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="400"
                  value={tokenPriceChangeA}
                  onChange={(e) => setTokenPriceChangeA(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Token B (e.g. USDC) Price Change:</span>
                  <span className="font-bold text-slate-200">{tokenPriceChangeB}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={tokenPriceChangeB}
                  onChange={(e) => setTokenPriceChangeB(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Result Callout */}
              <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-2 text-center">
                <div className="text-slate-400 font-mono text-[11px]">Estimated Impermanent Loss vs HODL:</div>
                <div className="text-3xl font-extrabold font-mono text-amber-400">
                  {impermanentLossPercent.toFixed(2)}%
                </div>
                <p className="text-[11px] text-slate-400">
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
