import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, FileText, ExternalLink, Cpu, Terminal } from 'lucide-react';

export const SecurityCenterView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Institutional Security & Threat Model
          </h1>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Zero-Trust Architecture
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          HYPERON DEX is built around strict cryptographic non-custody. We enforce pre-flight bytecode sandboxing, private mempool transaction routing, and formal smart contract verification.
        </p>
      </div>

      {/* 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Lock className="w-4 h-4 text-emerald-400" />
            1. Zero-Custody Cryptographic Principle
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform never asks for, stores, or generates private keys or recovery seed phrases. All transactions are constructed as un-signed intents and submitted directly to your connected wallet (MetaMask, Rabby, Ledger) for explicit hardware/local confirmation.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-blue-400" />
            2. Pre-Flight Sandboxed Simulation
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every swap, stake, and liquidity deposit is simulated against a state-synced local VM before broadcasting to the mempool. If unexpected slippage, token transfer fees, or malicious re-entrancy are detected, the UI instantly halts execution.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            3. Flashbots MEV Sandwich Shield
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            User transactions are routed through private RPC endpoints (Flashbots Protect & Eden Network), hiding pending swaps from public mempool searcher bots and preventing front-running and sandwich attacks.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Cpu className="w-4 h-4 text-amber-400" />
            4. AI Agent Guardrails
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Autonomous trading models follow a strict 5-stage pipeline: READ_ONLY → ANALYZE → PROPOSE → USER_CONFIRM → EXECUTE. No algorithmic agent has key-signing rights or unconstrained balance authority.
          </p>
        </div>
      </div>

      {/* Formal Audit Reports Matrix */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl space-y-4">
        <div className="text-sm font-bold text-white pb-2 border-b border-white/5 flex items-center justify-between">
          <span>Security Audit Registry</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">0 Critical Vulnerabilities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">Trail of Bits</span>
              <span className="text-[10px] text-emerald-400 font-bold">PASSED</span>
            </div>
            <div className="text-[11px] text-slate-400">Universal Router v2.4 Audit</div>
            <div className="text-[10px] text-slate-500">Hash: 0x8a92...e41b</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">OpenZeppelin</span>
              <span className="text-[10px] text-emerald-400 font-bold">PASSED</span>
            </div>
            <div className="text-[11px] text-slate-400">Staking Vault Contracts</div>
            <div className="text-[10px] text-slate-500">Hash: 0x3f12...b94a</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">CertiK Skynet</span>
              <span className="text-[10px] text-emerald-400 font-bold">96.8/100</span>
            </div>
            <div className="text-[11px] text-slate-400">Continuous On-Chain Monitoring</div>
            <div className="text-[10px] text-slate-500">Live Telemetry Feed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
