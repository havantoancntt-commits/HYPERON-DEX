import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { AIAgentIntent } from '../types';
import { Bot, Play, Pause, ShieldCheck, CheckCircle2, ArrowRight, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export const AITradingAgentView: React.FC = () => {
  const { isConnected, connectWallet, executeTransaction } = useWallet();
  const { setActiveSimulation, addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<'agents' | 'proposals' | 'logs'>('agents');
  const [agents, setAgents] = useState([
    {
      id: 'agent-dca',
      name: 'Smart DCA Accumulator',
      strategy: 'DCA (Gas & Volatility-Weighted)',
      status: 'active',
      targetPair: 'ETH/USDC',
      frequency: 'Every 24 Hours',
      maxGasLimit: 25,
      totalExecutedUsd: 12400,
      pnlPercent: 8.4,
      description: 'Accumulates ETH during cyclical gas fee lows (<20 Gwei) and local RSI consolidation.',
    },
    {
      id: 'agent-arb',
      name: 'Multi-DEX Delta-Neutral Arbitrageur',
      strategy: 'Flash Arbitrage (Mempool Scanner)',
      status: 'active',
      targetPair: 'USDC/USDT',
      frequency: 'Continuous Block Event',
      maxGasLimit: 35,
      totalExecutedUsd: 48000,
      pnlPercent: 3.2,
      description: 'Scans Uniswap v3 and Curve pool price divergences and proposes atomic rebalancing.',
    },
    {
      id: 'agent-rebal',
      name: 'Institutional 60/40 Portfolio Rebalancer',
      strategy: 'Threshold Rebalancer',
      status: 'idle',
      targetPair: 'ETH/USDC',
      frequency: 'Weekly Drift Check (>5%)',
      maxGasLimit: 20,
      totalExecutedUsd: 8500,
      pnlPercent: 5.1,
      description: 'Rebalances asset weights when Layer 1 concentration drifts more than 5% from target.',
    },
  ]);

  const [pendingProposals, setPendingProposals] = useState<AIAgentIntent[]>([
    {
      id: 'intent-901',
      agentId: 'agent-dca',
      agentName: 'Smart DCA Accumulator',
      type: 'SWAP',
      targetPair: 'ETH/USDC',
      suggestedAmount: 500,
      action: 'BUY',
      rationale: 'Mainnet base gas is currently 18 Gwei (30-day low). ETH 4-hour RSI is 44.2 (neutral accumulation zone).',
      estimatedProfitUsd: 14.50,
      confidenceScore: 88,
      simulationPassed: true,
      requiresUserSignature: true,
      timestamp: Date.now() - 600000,
    },
    {
      id: 'intent-902',
      agentId: 'agent-arb',
      agentName: 'Multi-DEX Delta-Neutral Arbitrageur',
      type: 'REBALANCE',
      targetPair: 'USDC/Vault',
      suggestedAmount: 2000,
      action: 'DEPOSIT',
      rationale: 'Curve 3pool APY surged to 14.2% due to temporary borrowing demand spike.',
      estimatedProfitUsd: 28.00,
      confidenceScore: 92,
      simulationPassed: true,
      requiresUserSignature: true,
      timestamp: Date.now() - 1800000,
    },
  ]);

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'active' ? 'idle' : 'active' } : a
      )
    );
    addToast({
      title: 'Agent Strategy Updated',
      message: `Agent configuration updated. State: ${agents.find(a => a.id === id)?.status === 'active' ? 'Paused' : 'Active'}`,
      type: 'info',
    });
  };

  const handleApproveProposal = async (intent: AIAgentIntent) => {
    await executeTransaction({
      chainId: 'ethereum',
      type: 'SWAP',
      fromToken: 'USDC',
      toToken: 'ETH',
      fromAmount: intent.suggestedAmount,
      toAmount: intent.suggestedAmount / 3420.50,
      gasSpentGwei: 18,
      gasSpentUsd: 3.80,
    });

    setPendingProposals((prev) => prev.filter((p) => p.id !== intent.id));
    addToast({
      title: 'Agent Intent Executed On-Chain',
      message: `Successfully executed proposal #${intent.id} with zero-trust validation.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Bot className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Permissioned AI Trading Agents
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                Non-Custodial
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Automated algorithmic strategies operating under strict Zero-Trust constraints: <strong className="text-blue-400 font-mono">READ_ONLY → ANALYZE → PROPOSE → USER_CONFIRM → EXECUTE</strong>.
            </p>
          </div>
        </div>

        {/* Security Pillars Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-white">No Private Key Access</div>
              <div className="text-[11px] text-slate-400">Agents never possess or sign with user keys.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-white">Pre-Flight Simulation</div>
              <div className="text-[11px] text-slate-400">All intents are sandboxed on-chain first.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-white">Gas & Slippage Guards</div>
              <div className="text-[11px] text-slate-400">Enforces strict maximum fee & loss thresholds.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'agents' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Strategies ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'proposals' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Pending Proposals
          {pendingProposals.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingProposals.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Agents List */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {agent.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className="p-1.5 rounded-lg bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-300 transition-colors cursor-pointer"
                  >
                    {agent.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="font-bold text-sm text-white mt-3">{agent.name}</div>
                <div className="text-[11px] font-mono text-blue-400 mt-0.5">{agent.strategy}</div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{agent.description}</p>

                <div className="space-y-1.5 pt-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Pair:</span>
                    <span className="text-slate-200 font-semibold">{agent.targetPair}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Frequency:</span>
                    <span className="text-slate-200">{agent.frequency}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Historical ROI:</span>
                    <span className="text-emerald-400 font-bold">+{agent.pnlPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Total Executed: {formatCurrency(agent.totalExecutedUsd)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Pending Proposals */}
      {activeTab === 'proposals' && (
        <div className="space-y-3">
          {pendingProposals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0A0A0A] border border-white/5 text-center text-xs text-slate-400">
              No pending proposals at this time. All agent conditions are waiting for market trigger points.
            </div>
          ) : (
            pendingProposals.map((intent) => (
              <div
                key={intent.id}
                className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{intent.agentName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      Confidence: {intent.confidenceScore}%
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      Pre-Flight Sim: PASS
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium">
                    Proposed Action: <strong className="text-emerald-400">{intent.action}</strong> ${(intent.suggestedAmount ?? 0).toLocaleString()} into <strong className="text-blue-400">{intent.targetPair}</strong>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                    <strong>AI Rationale:</strong> {intent.rationale}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPendingProposals((prev) => prev.filter((p) => p.id !== intent.id))}
                    className="px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-xs text-slate-400 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleApproveProposal(intent)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Confirm & Sign <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
