import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ShieldAlert, Cpu, Activity, Lock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';

export const AdminConsoleView: React.FC = () => {
  const { addToast } = useExchange();
  const [selectedRole, setSelectedRole] = useState<'SUPER_ADMIN' | 'SECURITY_ADMIN' | 'FINANCE_ADMIN' | 'ANALYST'>('SECURITY_ADMIN');
  const [metrics, setMetrics] = useState<any>(null);
  const [circuitBreakerTriggered, setCircuitBreakerTriggered] = useState<boolean>(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.warn('Failed to load admin metrics:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const toggleEmergencyPause = () => {
    setCircuitBreakerTriggered(!circuitBreakerTriggered);
    addToast({
      title: circuitBreakerTriggered ? 'Global Circuit Breaker Cleared' : 'EMERGENCY PAUSE ENGAGED',
      message: circuitBreakerTriggered ? 'Normal trading routes resumed.' : 'All incoming routing halted by Security Admin.',
      type: circuitBreakerTriggered ? 'success' : 'error',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            Admin Console & Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System health observability, RPC node latencies, RBAC roles, and emergency circuit breakers.
          </p>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-500 mr-1">Active RBAC:</span>
          {(['SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'ANALYST'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] cursor-pointer ${
                selectedRole === role
                  ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30'
                  : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {role.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <div className="text-[10px] text-slate-500">SYSTEM UPTIME</div>
            <div className="text-base font-bold text-emerald-400 mt-1">{metrics.uptimePercent}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <div className="text-[10px] text-slate-500">24H ROUTED VOLUME</div>
            <div className="text-base font-bold text-white mt-1">${(metrics.totalVolume24hUsd / 1e6).toFixed(1)}M</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <div className="text-[10px] text-slate-500">AVG QUOTE LATENCY</div>
            <div className="text-base font-bold text-blue-400 mt-1">{metrics.averageQuoteLatencyMs} ms</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <div className="text-[10px] text-slate-500">AI GEMINI 3.7 USAGE</div>
            <div className="text-base font-bold text-slate-200 mt-1">{metrics.aiModelQuotaUsage.requests24h} reqs</div>
          </div>
        </div>
      )}

      {/* RPC Latency & Failover Matrix */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl space-y-3">
        <div className="text-sm font-bold text-white flex items-center justify-between pb-2 border-b border-white/5">
          <span>Multi-Chain RPC Node Health & Redundancy</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">6/6 Operational</span>
        </div>

        {metrics?.rpcNodeLatencies && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(metrics.rpcNodeLatencies).map(([chain, status]: [string, any]) => (
              <div key={chain} className="p-2.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <span className="uppercase text-slate-300 font-semibold">{chain}</span>
                <span className="text-emerald-400 text-[11px]">{status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Circuit Breakers (Security Admin) */}
      <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-rose-500/30 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Emergency Circuit Breaker (Kill Switch)
          </div>
          <span className="text-[11px] font-mono text-rose-400">Requires 3/5 Multi-Sig Approval</span>
        </div>

        <p className="text-xs text-rose-200/80 leading-relaxed">
          Triggering emergency pause halts smart contract router callbacks and stops all autonomous agent execution intents in the event of an upstream oracle or bridge anomaly.
        </p>

        <button
          onClick={toggleEmergencyPause}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
            circuitBreakerTriggered
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          {circuitBreakerTriggered ? 'Clear Emergency Pause' : 'Engage Emergency Circuit Breaker'}
        </button>
      </div>
    </div>
  );
};
