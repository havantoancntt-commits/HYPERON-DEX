import React from 'react';
import { useExchange, ProductView } from '../context/ExchangeContext';
import {
  ArrowLeftRight,
  Cpu,
  Wallet,
  Layers,
  LineChart,
  Rocket,
  Activity,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface FlowStep {
  id: ProductView;
  name: string;
  subtext: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  badge?: string;
}

export const EcosystemFlowBanner: React.FC = () => {
  const { activeView, setActiveView } = useExchange();

  const steps: FlowStep[] = [
    {
      id: 'ai-intelligence',
      name: '1. AI Market',
      subtext: 'Sentiment & Mood',
      icon: Cpu,
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/30',
      badge: 'Macro',
    },
    {
      id: 'ai-signals',
      name: '2. Alpha Signals',
      subtext: '94% Win Rate',
      icon: Sparkles,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badge: 'High Win-Rate',
    },
    {
      id: 'ai-risk-scanner',
      name: '3. AI Audit',
      subtext: 'Contract & Rug Guard',
      icon: CheckCircle2,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      badge: 'Zero-Trust',
    },
    {
      id: 'swap',
      name: '4. DEX Aggregator',
      subtext: 'Smart MEV Route',
      icon: ArrowLeftRight,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      badge: 'Best Price',
    },
    {
      id: 'perpetuals',
      name: '5. Perpetuals',
      subtext: '50x Pro Leverage',
      icon: LineChart,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      badge: 'Auto TP/SL',
    },
    {
      id: 'portfolio',
      name: '6. Auto Portfolio',
      subtext: 'Self-Balancing',
      icon: Wallet,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
    },
    {
      id: 'launchpad',
      name: '7. Launchpad',
      subtext: 'Audited Fair IDO',
      icon: Rocket,
      color: 'text-pink-400',
      borderColor: 'border-pink-500/30',
      badge: 'Anti-Rug',
    },
    {
      id: 'onchain-radar',
      name: '8. Whale Radar',
      subtext: 'Smart Money Inflow',
      icon: Activity,
      color: 'text-teal-400',
      borderColor: 'border-teal-500/30',
    },
    {
      id: 'payments',
      name: '9. Payments',
      subtext: 'Zero-Slippage Pay',
      icon: CreditCard,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
  ];

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#090D18] via-[#0A1020] to-[#090D18] border border-cyan-500/20 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header text */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            AI-DRIVEN DECENTRALIZED ECOSYSTEM ARCHITECTURE
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            DEX ➔ AI ➔ Wallet ➔ Aggregator ➔ Perpetuals ➔ Launchpad ➔ Whale Radar ➔ Payments
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          Mô hình thông minh khép kín: Người dùng đến vì <span className="text-cyan-300 font-bold">AI & Tín hiệu chuẩn xác</span> ➔ Giao dịch tức thì trong hệ sinh thái.
        </div>
      </div>

      {/* Flow Steps Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeView === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveView(step.id)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                isActive
                  ? `bg-gradient-to-b from-[#131E38] to-[#0C1425] ${step.borderColor} border-2 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40`
                  : 'bg-[#080C16]/80 hover:bg-[#0E1528] border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1 rounded-lg ${isActive ? 'bg-cyan-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                  <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                {step.badge && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                    {step.badge}
                  </span>
                )}
              </div>
              <div>
                <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                  {step.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {step.subtext}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
