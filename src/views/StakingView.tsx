import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SAMPLE_STAKING_VAULTS, SAMPLE_RESTAKING_STRATEGIES } from '../lib/constants';
import { StakingVault, RestakingStrategy } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Zap,
  RefreshCw,
  Layers,
  Calculator,
  TrendingUp,
  Cpu,
  Coins,
  ShieldAlert,
  Flame,
  Activity,
  ArrowUpRight,
  Info,
  Server
} from 'lucide-react';

type StakingTab = 'vaults' | 'liquid-restaking' | 'calculator' | 'validators';

export const StakingView: React.FC = () => {
  const { balances, executeTransaction } = useWallet();
  const { addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<StakingTab>('vaults');
  const [vaults, setVaults] = useState<StakingVault[]>(SAMPLE_STAKING_VAULTS);
  const [restakingStrategies, setRestakingStrategies] = useState<RestakingStrategy[]>(SAMPLE_RESTAKING_STRATEGIES);
  const [selectedVault, setSelectedVault] = useState<StakingVault>(SAMPLE_STAKING_VAULTS[0]);
  const [selectedRestake, setSelectedRestake] = useState<RestakingStrategy>(SAMPLE_RESTAKING_STRATEGIES[0]);
  const [stakeAmount, setStakeAmount] = useState<string>('500');
  const [lockDurationDays, setLockDurationDays] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Calculator state
  const [calcPrincipal, setCalcPrincipal] = useState<string>('10000');
  const [calcApy, setCalcApy] = useState<number>(35.8);
  const [calcPeriodDays, setCalcPeriodDays] = useState<number>(365);

  // Computed User Staking Portfolio
  const stakingSummary = useMemo(() => {
    let totalStakedUsd = 0;
    let totalPendingRewardsUsd = 0;
    let activeVaultsCount = 0;

    vaults.forEach((v) => {
      const stakedAmt = v.userStaked?.stakedAmount || v.userStakedBalance || 0;
      const price = v.asset?.priceUsd || (v.stakeToken ? v.stakeToken.priceUsd : 1);
      if (stakedAmt > 0) {
        totalStakedUsd += stakedAmt * price;
        activeVaultsCount++;
      }
      const rewards = v.userStaked?.pendingRewards || v.userPendingRewards || 0;
      totalPendingRewardsUsd += rewards * (v.rewardToken.priceUsd || 1);
    });

    restakingStrategies.forEach((r) => {
      if (r.userStakedAmount > 0) {
        totalStakedUsd += r.userStakedAmount * r.asset.priceUsd;
        activeVaultsCount++;
      }
    });

    return { totalStakedUsd, totalPendingRewardsUsd, activeVaultsCount };
  }, [vaults, restakingStrategies]);

  // Handle Stake into Vault
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) return;

    setIsProcessing(true);
    const tokenSymbol = selectedVault.asset?.symbol || selectedVault.stakeToken?.symbol || 'HYPR';

    await executeTransaction({
      chainId: selectedVault.chainId,
      type: 'STAKE',
      fromToken: tokenSymbol,
      fromAmount: amount,
      gasSpentGwei: 19,
      gasSpentUsd: 3.80,
    });

    setVaults((prev) =>
      prev.map((v) => {
        if (v.id === selectedVault.id) {
          const currentStaked = v.userStaked?.stakedAmount || 0;
          return {
            ...v,
            userStaked: {
              stakedAmount: currentStaked + amount,
              stakedUsd: (currentStaked + amount) * (v.asset?.priceUsd || 4.82),
              pendingRewards: v.userStaked?.pendingRewards || 0,
              unlockTimestamp: Date.now() + lockDurationDays * 86400000,
            },
          };
        }
        return v;
      })
    );

    setIsProcessing(false);
    addToast({
      title: 'Staking Deposit Confirmed',
      message: `Locked ${amount} ${tokenSymbol} into ${selectedVault.protocolName || selectedVault.name} for ${lockDurationDays} days earning ${selectedVault.totalApyPercent || selectedVault.aprPercent}% APY.`,
      type: 'success',
    });
  };

  // Handle Restaking Deposit
  const handleRestake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) return;

    setIsProcessing(true);
    await executeTransaction({
      chainId: 'ethereum',
      type: 'RESTAKE',
      fromToken: selectedRestake.asset.symbol,
      toToken: selectedRestake.derivativeTokenSymbol,
      fromAmount: amount,
      toAmount: amount * 0.998,
      gasSpentGwei: 22,
      gasSpentUsd: 4.20,
    });

    setRestakingStrategies((prev) =>
      prev.map((r) => {
        if (r.id === selectedRestake.id) {
          return {
            ...r,
            userStakedAmount: r.userStakedAmount + amount,
          };
        }
        return r;
      })
    );

    setIsProcessing(false);
    addToast({
      title: 'Restaking Mint Completed',
      message: `Deposited ${amount} ${selectedRestake.asset.symbol} and minted ${selectedRestake.derivativeTokenSymbol} at ${selectedRestake.totalApyPercent}% total APY.`,
      type: 'success',
    });
  };

  // Handle Claim Rewards
  const handleClaimRewards = async (vault: StakingVault) => {
    const rewards = vault.userStaked?.pendingRewards || vault.userPendingRewards || 45.2;
    await executeTransaction({
      chainId: vault.chainId,
      type: 'CLAIM_REWARDS',
      toToken: vault.rewardToken.symbol,
      toAmount: rewards,
      gasSpentGwei: 14,
      gasSpentUsd: 2.80,
    });

    setVaults((prev) =>
      prev.map((v) => {
        if (v.id === vault.id) {
          return {
            ...v,
            userStaked: v.userStaked ? { ...v.userStaked, pendingRewards: 0 } : undefined,
            userPendingRewards: 0,
          };
        }
        return v;
      })
    );

    addToast({
      title: 'Rewards Claimed',
      message: `Claimed ${rewards.toFixed(2)} ${vault.rewardToken.symbol} to wallet.`,
      type: 'success',
    });
  };

  // 1-Click AI Harvest & Compound All
  const handleHarvestAndCompoundAll = async () => {
    setIsProcessing(true);
    await executeTransaction({
      chainId: 'ethereum',
      type: 'CLAIM_REWARDS',
      toToken: 'HYPR',
      toAmount: 142.3,
      gasSpentGwei: 18,
      gasSpentUsd: 3.50,
    });
    setIsProcessing(false);

    addToast({
      title: 'AI Auto-Compound Executed',
      message: 'All accrued staking yields have been harvested and auto-reinvested at peak APY with batch gas optimization.',
      type: 'success',
    });
  };

  // Calculator projections
  const calcProjections = useMemo(() => {
    const principal = parseFloat(calcPrincipal) || 0;
    const rate = calcApy / 100;
    const days = calcPeriodDays;

    const dailyRate = rate / 365;
    const dailyReturn = principal * dailyRate;
    const monthlyReturn = principal * (Math.pow(1 + dailyRate, 30) - 1);
    const yearlyReturn = principal * (Math.pow(1 + dailyRate, 365) - 1);
    const customReturn = principal * (Math.pow(1 + dailyRate, days) - 1);
    const totalEnding = principal + customReturn;

    return { dailyReturn, monthlyReturn, yearlyReturn, customReturn, totalEnding };
  }, [calcPrincipal, calcApy, calcPeriodDays]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B0F19] via-[#101728] to-[#0B0F19] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner">
                <Lock className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Hyper-Smart Staking & Auto-Yield Vaults
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    UP TO 35.8% APY
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Institutional non-custodial validator staking, EigenLayer restaking AVS, and delta-neutral auto-compounding.
                </p>
              </div>
            </div>
          </div>

          {/* Staking Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#080B11]/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 font-mono">
            <div className="px-2">
              <div className="text-[10px] text-slate-400">YOUR TOTAL STAKED</div>
              <div className="text-sm sm:text-base font-bold text-white">{formatCurrency(stakingSummary.totalStakedUsd)}</div>
            </div>
            <div className="px-2 border-l border-white/5">
              <div className="text-[10px] text-slate-400">CLAIMABLE REWARDS</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">{formatCurrency(stakingSummary.totalPendingRewardsUsd)}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 px-2 flex items-center">
              <button
                disabled={isProcessing}
                onClick={handleHarvestAndCompoundAll}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Compound All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
        {[
          { id: 'vaults', label: 'Institutional Yield Vaults', icon: Lock },
          { id: 'liquid-restaking', label: 'EigenLayer & Restaking AVS', icon: Layers },
          { id: 'calculator', label: 'Compound Yield Calculator', icon: Calculator },
          { id: 'validators', label: 'Proof-of-Stake Validator Health', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StakingTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600/20 to-teal-500/15 text-white border border-emerald-500/30 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Vaults Grid & Staking Action Panel */}
      {activeTab === 'vaults' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {vaults.map((vault) => {
              const token = vault.asset || vault.stakeToken || vault.rewardToken;
              const apy = vault.totalApyPercent || vault.aprPercent || 0;
              const stakedAmt = vault.userStaked?.stakedAmount || vault.userStakedBalance || 0;
              const rewards = vault.userStaked?.pendingRewards || vault.userPendingRewards || 0;
              const isSelected = selectedVault.id === vault.id;

              return (
                <div
                  key={vault.id}
                  onClick={() => setSelectedVault(vault)}
                  className={`p-6 rounded-3xl bg-[#090C13] border transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xl ${
                    isSelected
                      ? 'border-emerald-500/50 shadow-emerald-950/40 bg-gradient-to-b from-[#0F1622] to-[#090C13]'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AUDITED: {vault.riskRating || 'A+'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Lock: {vault.lockDurationDays === 0 ? 'Flexible' : `${vault.lockDurationDays} Days`}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <TokenLogo
                        symbol={token.symbol}
                        name={token.name}
                        src={token.logoUrl}
                        chainId={vault.chainId}
                        className="w-10 h-10"
                      />
                      <div>
                        <div className="font-extrabold text-base text-white">{vault.protocolName || vault.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{vault.chainId.toUpperCase()} Network</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400">ESTIMATED APY (AUTO-COMPOUND)</div>
                      <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
                        {apy}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1">
                        <span>Base: {vault.baseAprPercent || (apy * 0.4).toFixed(1)}%</span>
                        <span>Boost: {vault.rewardAprPercent || (apy * 0.6).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono text-slate-400 pt-1">
                      <div className="flex justify-between">
                        <span>Total Deposited TVL:</span>
                        <span className="text-slate-200 font-bold">{formatCurrency(vault.totalStakedUsd || vault.tvlUsd || 0, 1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Your Staked Balance:</span>
                        <span className="text-white font-bold">{stakedAmt} {token.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending Rewards:</span>
                        <span className="text-emerald-400 font-bold">{rewards.toFixed(2)} {vault.rewardToken.symbol}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    {rewards > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimRewards(vault);
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono transition-colors cursor-pointer"
                      >
                        Claim {rewards.toFixed(2)} {vault.rewardToken.symbol}
                      </button>
                    ) : (
                      <div className="text-center text-xs font-mono text-cyan-400 font-bold py-1">
                        {isSelected ? '✓ Currently Selected' : 'Click to Select Vault'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staking Execution Terminal */}
          <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] max-w-2xl mx-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <TokenLogo
                  symbol={selectedVault.asset?.symbol || selectedVault.stakeToken?.symbol || 'HYPR'}
                  className="w-7 h-7"
                />
                <div>
                  <h3 className="text-base font-bold text-white">Deposit & Stake in {selectedVault.protocolName || selectedVault.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Real-time reward accrual compounded every block</p>
                </div>
              </div>
              <span className="text-sm font-mono font-extrabold text-emerald-400">
                {selectedVault.totalApyPercent || selectedVault.aprPercent}% APY
              </span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Deposit Amount ({selectedVault.asset?.symbol || selectedVault.stakeToken?.symbol || 'HYPR'})</span>
                  <span>Balance: {(balances[selectedVault.asset?.symbol || selectedVault.stakeToken?.symbol || 'HYPR'] || 0).toLocaleString()}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-[#0F1420] border border-white/10 text-white font-mono text-xl font-bold focus:outline-none focus:border-emerald-500 pr-24"
                  />
                  <button
                    onClick={() => {
                      const bal = balances[selectedVault.asset?.symbol || selectedVault.stakeToken?.symbol || 'HYPR'] || 1000;
                      setStakeAmount(String(bal));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-slate-400">Lock Tier Multiplier</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { days: 0, label: 'Flexible', mult: '1.0x' },
                    { days: 30, label: '30 Days', mult: '1.25x' },
                    { days: 90, label: '90 Days', mult: '1.6x' },
                    { days: 365, label: '365 Days', mult: '2.5x' },
                  ].map((tier) => (
                    <button
                      key={tier.days}
                      onClick={() => setLockDurationDays(tier.days)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        lockDurationDays === tier.days
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 font-bold shadow-md'
                          : 'bg-[#0F1420] text-slate-400 hover:text-white border-white/5'
                      }`}
                    >
                      <div className="text-xs font-bold">{tier.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{tier.mult} Yield</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Daily Earnings:</span>
                  <span className="text-emerald-400 font-bold">
                    +{( (parseFloat(stakeAmount) || 0) * ((selectedVault.totalApyPercent || selectedVault.aprPercent || 0) / 100) / 365 ).toFixed(4)} {selectedVault.rewardToken.symbol} / day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Early Exit Penalty:</span>
                  <span className="text-slate-200">0% (Standard 7d cooldown)</span>
                </div>
              </div>

              <button
                disabled={isProcessing || !parseFloat(stakeAmount)}
                onClick={handleStake}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-mono text-sm uppercase tracking-wider transition-all cursor-pointer shadow-xl"
              >
                {isProcessing ? 'Processing Stake...' : `Confirm Deposit & Stake`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Liquid Restaking (EigenLayer & Symbiotic) */}
      {activeTab === 'liquid-restaking' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" /> Liquid Restaking Derivatives (LRT)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Restake ETH or HYPR into Actively Validated Services (AVSs) to earn dual rewards while keeping 100% liquidity.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                0-DAY UNBONDING WITH INSTANT SWAP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {restakingStrategies.map((strat) => {
                const isSelected = selectedRestake.id === strat.id;
                return (
                  <div
                    key={strat.id}
                    onClick={() => setSelectedRestake(strat)}
                    className={`p-5 rounded-3xl bg-[#0F1420] border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/40' : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {strat.protocol}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{strat.slashingRiskScore}/100 Security</span>
                      </div>

                      <div>
                        <div className="font-bold text-white text-base">{strat.name}</div>
                        <div className="text-xs font-mono text-cyan-400 mt-0.5">Mint &rarr; {strat.derivativeTokenSymbol}</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#080B11] border border-white/5 space-y-1 font-mono">
                        <div className="text-[10px] text-slate-400">TOTAL COMBINED RESTAKING APY</div>
                        <div className="text-2xl font-extrabold text-emerald-400">{strat.totalApyPercent}%</div>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                          <span>Base: {strat.baseStakingApy}%</span>
                          <span>AVS Yield: +{strat.restakingRewardApy}%</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>Securing AVSs:</span>
                          <span className="text-slate-200 font-bold">{strat.avsCount} Autonomous Services</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy TVL:</span>
                          <span className="text-slate-200 font-bold">{formatCurrency(strat.tvlUsd, 1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Your Balance:</span>
                          <span className="text-cyan-300 font-bold">{strat.userStakedAmount} {strat.derivativeTokenSymbol}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleRestake()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600/30 hover:to-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Mint {strat.derivativeTokenSymbol}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Yield Calculator */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" /> Compounding Growth Calculator
            </h3>
            <p className="text-xs text-slate-400">
              Calculate projected compounding yield over time with flexible lock multipliers and token appreciation.
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400">Initial Principal ($ USD)</label>
                <input
                  type="number"
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#0F1420] border border-white/10 text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Target APY:</span>
                  <span className="text-emerald-400 font-bold">{calcApy}%</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="80"
                  step="0.5"
                  value={calcApy}
                  onChange={(e) => setCalcApy(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Duration:</span>
                  <span className="text-white font-bold">{calcPeriodDays} Days ({ (calcPeriodDays / 365).toFixed(1) } Years)</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="1095"
                  step="7"
                  value={calcPeriodDays}
                  onChange={(e) => setCalcPeriodDays(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
                Projected Returns Matrix
              </h4>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400">Daily Compounding</div>
                  <div className="text-lg font-bold text-emerald-400">+{formatCurrency(calcProjections.dailyReturn)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400">Monthly Projection</div>
                  <div className="text-lg font-bold text-emerald-400">+{formatCurrency(calcProjections.monthlyReturn)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400">1 Year Projection</div>
                  <div className="text-lg font-bold text-emerald-400">+{formatCurrency(calcProjections.yearlyReturn)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400">Total Profit in {calcPeriodDays}d</div>
                  <div className="text-lg font-bold text-cyan-300">+{formatCurrency(calcProjections.customReturn)}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/20 font-mono text-center space-y-1">
                <div className="text-xs text-slate-300">ESTIMATED FINAL PORTFOLIO VALUE</div>
                <div className="text-3xl font-extrabold text-white">{formatCurrency(calcProjections.totalEnding)}</div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('vaults')}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              Start Staking Now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Validator Node Health */}
      {activeTab === 'validators' && (
        <div className="p-6 rounded-3xl bg-[#090C13] border border-white/[0.08] shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-400" /> Decentralized Validator Cluster Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time node performance, block proposal attestations, and MEV boost distribution.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              99.98% GLOBAL UPTIME
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
              <div className="text-slate-400 text-[10px]">Active Node Operators</div>
              <div className="text-xl font-bold text-white">14,280 Nodes</div>
              <div className="text-emerald-400 text-[10px]">100% Slashing-Free</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
              <div className="text-slate-400 text-[10px]">Average Attestation Rate</div>
              <div className="text-xl font-bold text-emerald-400">99.94%</div>
              <div className="text-slate-500 text-[10px]">Target: &gt; 99.0%</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
              <div className="text-slate-400 text-[10px]">MEV Block Boost APR</div>
              <div className="text-xl font-bold text-cyan-400">+2.45%</div>
              <div className="text-slate-500 text-[10px]">Flashbots Relay</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/5 space-y-1">
              <div className="text-slate-400 text-[10px]">Hardware Distribution</div>
              <div className="text-xl font-bold text-slate-200">54 Global Regions</div>
              <div className="text-emerald-400 text-[10px]">Zero Cloud Monopoly</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
