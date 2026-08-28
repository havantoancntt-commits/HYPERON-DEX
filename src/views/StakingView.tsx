import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SAMPLE_STAKING_VAULTS } from '../lib/constants';
import { StakingVault } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { Lock, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export const StakingView: React.FC = () => {
  const { balances, executeTransaction } = useWallet();
  const { addToast } = useExchange();

  const [vaults, setVaults] = useState<StakingVault[]>(SAMPLE_STAKING_VAULTS);
  const [selectedVault, setSelectedVault] = useState<StakingVault>(SAMPLE_STAKING_VAULTS[0]);
  const [stakeAmount, setStakeAmount] = useState<string>('500');
  const [lockDurationDays, setLockDurationDays] = useState<number>(90);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) return;

    await executeTransaction({
      chainId: 'ethereum',
      type: 'STAKE',
      fromToken: selectedVault.stakeToken.symbol,
      fromAmount: amount,
      gasSpentGwei: 19,
      gasSpentUsd: 4.10,
    });

    addToast({
      title: 'Staking Deposit Confirmed',
      message: `Locked ${amount} ${selectedVault.stakeToken.symbol} in ${selectedVault.name} for ${lockDurationDays} days earning ${selectedVault.aprPercent}% APY.`,
      type: 'success',
    });
  };

  const handleClaimRewards = async (vault: StakingVault) => {
    await executeTransaction({
      chainId: 'ethereum',
      type: 'CLAIM_REWARDS',
      toToken: vault.rewardToken.symbol,
      toAmount: vault.userPendingRewards || 45.2,
      gasSpentGwei: 14,
      gasSpentUsd: 2.80,
    });

    addToast({
      title: 'Rewards Claimed',
      message: `Claimed ${vault.userPendingRewards || 45.2} ${vault.rewardToken.symbol} to wallet.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Institutional Staking & Yield Vaults
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Non-custodial validator staking and delta-neutral yield strategies with up to 35.8% APY.
          </p>
        </div>
      </div>

      {/* Vaults Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vaults.map((vault) => (
          <div
            key={vault.id}
            onClick={() => setSelectedVault(vault)}
            className={`p-5 rounded-2xl bg-[#0A0A0A] border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              selectedVault.id === vault.id
                ? 'border-blue-500/50 shadow-lg shadow-blue-950/40'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SECURITY: {vault.securityScore}
                </span>
                <span className="text-xs font-mono text-slate-400">Lock: {vault.lockDurationDays}d</span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <TokenLogo symbol={vault.stakeToken.symbol} name={vault.stakeToken.name} src={vault.stakeToken.logoUrl} chainId={vault.stakeToken.chainId} className="w-8 h-8" />
                <div>
                  <div className="font-bold text-sm text-white">{vault.name}</div>
                  <div className="text-[11px] text-slate-400">{vault.protocol}</div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[#121212] border border-white/5 space-y-1">
                <div className="text-[10px] font-mono text-slate-400">ANNUAL PERCENTAGE YIELD</div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                  {vault.aprPercent}%
                </div>
              </div>

              <div className="space-y-1.5 pt-3 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Total Deposited TVL:</span>
                  <span className="text-slate-200">{formatCurrency(vault.tvlUsd, 1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Staked Balance:</span>
                  <span className="text-slate-200">{vault.userStakedBalance || 0} {vault.stakeToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Claimable Rewards:</span>
                  <span className="text-blue-400 font-bold">{vault.userPendingRewards || 0} {vault.rewardToken.symbol}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              {vault.userPendingRewards && vault.userPendingRewards > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaimRewards(vault);
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  Claim {vault.userPendingRewards} {vault.rewardToken.symbol}
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 font-mono">Select to Stake</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Staking Action Panel */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 max-w-2xl mx-auto space-y-4 shadow-xl">
        <div className="text-sm font-bold text-white pb-2 border-b border-white/5 flex items-center justify-between">
          <span>Deposit into {selectedVault.name}</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">{selectedVault.aprPercent}% APY</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Stake Amount ({selectedVault.stakeToken.symbol})</span>
              <span>Balance: {(balances[selectedVault.stakeToken.symbol] || 0).toLocaleString()}</span>
            </div>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#121212] border border-white/5 font-mono text-white text-lg font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-mono">Lock Tier Duration</span>
            <div className="grid grid-cols-4 gap-2 font-mono">
              {[0, 30, 90, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setLockDurationDays(d)}
                  className={`py-2 rounded-xl transition-colors cursor-pointer ${
                    lockDurationDays === d
                      ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                      : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {d === 0 ? 'Flexible' : `${d} Days`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleStake}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
        >
          Confirm Non-Custodial Stake Deposit
        </button>
      </div>
    </div>
  );
};
