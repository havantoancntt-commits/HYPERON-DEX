import React, { useState } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { Bell, Plus, Trash2, CheckCircle2, ShieldAlert, Fuel, DollarSign } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export const AlertsView: React.FC = () => {
  const { addToast } = useExchange();
  const [alerts, setAlerts] = useState([
    {
      id: 'alt-1',
      tokenSymbol: 'ETH',
      condition: 'ABOVE',
      targetPrice: 3500.00,
      active: true,
      channel: 'Push Notification + Mempool Webhook',
    },
    {
      id: 'alt-2',
      tokenSymbol: 'ETH',
      condition: 'BELOW',
      targetPrice: 3200.00,
      active: true,
      channel: 'Push Notification',
    },
    {
      id: 'alt-3',
      tokenSymbol: 'GAS',
      condition: 'BELOW',
      targetPrice: 15.00,
      active: true,
      channel: 'Telegram Webhook',
    },
  ]);

  const [newSymbol, setNewSymbol] = useState<string>('ETH');
  const [newCondition, setNewCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [newTarget, setNewTarget] = useState<string>('3600');

  const handleCreateAlert = () => {
    const target = parseFloat(newTarget);
    if (!target) return;
    const newAlert = {
      id: `alt-${Date.now()}`,
      tokenSymbol: newSymbol,
      condition: newCondition,
      targetPrice: target,
      active: true,
      channel: 'Web3 In-App Push',
    };
    setAlerts((prev) => [newAlert, ...prev]);
    addToast({
      title: 'Alert Configured',
      message: `Trigger set for ${newSymbol} ${newCondition} ${target}.`,
      type: 'success',
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Bell className="w-5 h-5" />
            </span>
            Price & Gas Trigger Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated price thresholds, gas fee triggers, and whale transfer alerts.
          </p>
        </div>
      </div>

      {/* Create Alert Form */}
      <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 max-w-xl mx-auto space-y-3 shadow-xl">
        <div className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
          <Plus className="w-4 h-4 text-blue-400" /> Create New Trigger
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[11px]">Asset</span>
            <select
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl bg-[#121212] border border-white/5 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {VERIFIED_TOKENS.map((t, idx) => (
                <option key={`${t.chainId}-${t.symbol}-${idx}`} value={t.symbol}>{t.symbol}</option>
              ))}
              <option value="GAS">ETH Gas (Gwei)</option>
            </select>
          </div>

          <div>
            <span className="text-slate-400 text-[11px]">Condition</span>
            <select
              value={newCondition}
              onChange={(e: any) => setNewCondition(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl bg-[#121212] border border-white/5 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ABOVE">Rises Above (&gt;)</option>
              <option value="BELOW">Drops Below (&lt;)</option>
            </select>
          </div>

          <div>
            <span className="text-slate-400 text-[11px]">Target Value</span>
            <input
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl bg-[#121212] border border-white/5 text-white font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleCreateAlert}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
        >
          Create Trigger
        </button>
      </div>

      {/* Active Alerts List */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl space-y-3">
        <div className="text-sm font-bold text-white pb-2 border-b border-white/5">
          Active Triggers ({alerts.length})
        </div>

        <div className="space-y-2">
          {alerts.map((alt) => (
            <div key={alt.id} className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {alt.tokenSymbol === 'GAS' ? <Fuel className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-white">
                    {alt.tokenSymbol} {alt.condition === 'ABOVE' ? '≥' : '≤'} {alt.tokenSymbol === 'GAS' ? `${alt.targetPrice} Gwei` : `$${alt.targetPrice.toLocaleString()}`}
                  </div>
                  <div className="text-[11px] text-slate-400">{alt.channel}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  ACTIVE
                </span>
                <button
                  onClick={() => handleDeleteAlert(alt.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
