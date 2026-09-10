import React, { useState } from 'react';
import { useExchange, ProductView } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  LineChart,
  Coins,
  Cpu,
  ShieldAlert,
  Bot,
  BrainCircuit,
  PieChart,
  History,
  Star,
  Bell,
  GitFork,
  ShieldCheck,
  Code2,
  SlidersHorizontal,
  Settings,
  Layers,
  Sparkles,
  Lock,
  ChevronRight,
  Flame,
  Zap,
  Activity,
  Rocket,
  CreditCard,
  Landmark,
  Ticket,
  Trophy
} from 'lucide-react';

interface NavItem {
  id: ProductView;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Navigation: React.FC = () => {
  const { activeView, setActiveView } = useExchange();
  const { t } = useI18n();

  const sections: NavSection[] = [
    {
      title: t('nav.section.ai'),
      items: [
        { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { id: 'ai-signals', label: t('nav.ai_signals'), icon: Sparkles, badge: '94% Win', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'onchain-radar', label: t('nav.whale_radar'), icon: Activity, badge: 'Smart Money', badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { id: 'ai-intelligence', label: t('nav.intelligence'), icon: Cpu },
        { id: 'ai-risk-scanner', label: t('nav.risk_scanner'), icon: ShieldAlert, badge: 'Audit', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { id: 'ai-copilot', label: t('nav.copilot'), icon: BrainCircuit },
        { id: 'ai-agent', label: t('nav.ai_agent'), icon: Bot, badge: 'Active', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      ],
    },
    {
      title: t('nav.section.trade'),
      items: [
        { id: 'swap', label: t('nav.swap'), icon: ArrowLeftRight, badge: 'Best MEV', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { id: 'perpetuals', label: t('nav.perpetuals'), icon: LineChart, badge: '50x', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { id: 'trade', label: t('nav.trade'), icon: TrendingUp },
        { id: 'markets', label: t('nav.markets'), icon: TrendingUp },
        { id: 'token-details', label: t('nav.token_details'), icon: Coins },
      ],
    },
    {
      title: t('nav.section.defi'),
      items: [
        { id: 'lottery', label: t('nav.lottery'), icon: Trophy, badge: '$647K Pot', badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
        { id: 'launchpad', label: t('nav.launchpad'), icon: Rocket, badge: 'Anti-Rug', badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
        { id: 'lending', label: t('nav.lending'), icon: Landmark, badge: 'AI Radar', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { id: 'staking', label: t('nav.staking'), icon: Lock, badge: '35% APY', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'liquidity', label: t('nav.liquidity'), icon: Layers },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard, badge: '0% Slip', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'cross-chain', label: t('nav.bridge'), icon: GitFork },
      ],
    },
    {
      title: t('nav.section.portfolio'),
      items: [
        { id: 'portfolio', label: t('nav.portfolio'), icon: PieChart },
        { id: 'transactions', label: t('nav.explorer'), icon: History },
        { id: 'watchlist', label: t('nav.watchlist'), icon: Star },
        { id: 'alerts', label: t('nav.alerts'), icon: Bell },
      ],
    },
    {
      title: t('nav.section.system'),
      items: [
        { id: 'security-center', label: t('nav.security'), icon: ShieldCheck, badge: 'Zero-Trust', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'developer-api', label: t('nav.developer'), icon: Code2 },
        { id: 'admin-console', label: t('nav.admin_console'), icon: SlidersHorizontal },
        { id: 'settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/[0.08] bg-[#07090E] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-4 space-y-6 select-none scrollbar-none">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-3 py-1 font-mono">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-white font-bold border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* AI Market Intelligence Live Gauge Card */}
        <div className="pt-2">
          <div 
            onClick={() => setActiveView('ai-intelligence')}
            className="p-4 bg-gradient-to-br from-[#0D1424] to-[#080D1A] border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl space-y-2.5 cursor-pointer transition-all group shadow-lg"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Market Mood
              </span>
              <span className="text-sm font-extrabold text-cyan-300 font-mono">78/100</span>
            </div>
            <div className="w-full bg-[#141C2E] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[78%] rounded-full"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Strong Bullish
              </span>
              <span className="font-mono text-slate-400 group-hover:text-white flex items-center gap-0.5">
                Explore <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Zero-Trust Security Shield Badge */}
        <div className="pb-4">
          <div 
            onClick={() => setActiveView('security-center')}
            className="p-3 bg-[#0D111A] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl space-y-1.5 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ZERO-TRUST MEMPOOL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Flashbots Private RPC & HoneyPot Firewall active for all routing.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07090E]/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 flex items-center justify-around">
        {[
          { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
          { id: 'swap', label: t('nav.swap'), icon: ArrowLeftRight },
          { id: 'trade', label: t('nav.trade'), icon: LineChart },
          { id: 'ai-intelligence', label: t('nav.analytics'), icon: Activity },
          { id: 'portfolio', label: t('nav.portfolio'), icon: PieChart },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ProductView)}
              className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
