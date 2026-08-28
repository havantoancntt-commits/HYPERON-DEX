import React from 'react';
import { useExchange, ProductView } from '../context/ExchangeContext';
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

  const sections: NavSection[] = [
    {
      title: 'CORE TRADING',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'swap', label: 'DEX Aggregator', icon: ArrowLeftRight, badge: 'Split Route', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { id: 'trade', label: 'Trade Terminal', icon: LineChart, badge: 'Pro', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { id: 'markets', label: 'Markets', icon: TrendingUp },
        { id: 'token-details', label: 'Token Explorer', icon: Coins },
      ],
    },
    {
      title: 'AI INTELLIGENCE',
      items: [
        { id: 'ai-intelligence', label: 'Market Mood', icon: Cpu, badge: 'Gemini', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { id: 'ai-risk-scanner', label: 'Token Risk Scanner', icon: ShieldAlert, badge: 'Audit', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { id: 'ai-copilot', label: 'Portfolio Copilot', icon: BrainCircuit },
        { id: 'ai-agent', label: 'AI Trading Agent', icon: Bot, badge: 'Permissioned', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      ],
    },
    {
      title: 'LIQUIDITY & DEFI',
      items: [
        { id: 'liquidity', label: 'Liquidity Pools', icon: Layers },
        { id: 'staking', label: 'Staking & Yield', icon: Lock, badge: '35% APY', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'cross-chain', label: 'Cross-Chain Bridge', icon: GitFork },
      ],
    },
    {
      title: 'PORTFOLIO & ANALYTICS',
      items: [
        { id: 'portfolio', label: 'Portfolio', icon: PieChart },
        { id: 'transactions', label: 'Tx Explorer', icon: History },
        { id: 'watchlist', label: 'Watchlist', icon: Star },
        { id: 'alerts', label: 'Price Alerts', icon: Bell },
      ],
    },
    {
      title: 'SECURITY & SYSTEM',
      items: [
        { id: 'security-center', label: 'Security Center', icon: ShieldCheck, badge: 'Zero-Trust', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { id: 'developer-api', label: 'Developer API & SDK', icon: Code2 },
        { id: 'admin-console', label: 'Admin Console', icon: SlidersHorizontal },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/5 bg-[#080808] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-1 font-sans">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/10 text-white font-semibold border border-blue-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* AI Market Intelligence Preview Card (from Design HTML) */}
        <div className="pt-2">
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-slate-400 font-medium">Market Mood</span>
              <span className="text-lg font-bold text-blue-400 font-mono">78/100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[78%]"></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Bullish momentum detected. High confidence in Layer 2 liquidity expansion over 24h.
            </p>
          </div>
        </div>

        {/* Risk Alert Widget (from Design HTML) */}
        <div className="pb-2">
          <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">RISK ALERT</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              High whale concentration monitored in 3 liquidity pools. Slippage guards active.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/10 px-2 py-2 flex items-center justify-around">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
          { id: 'trade', label: 'Trade', icon: LineChart },
          { id: 'ai-intelligence', label: 'AI Suite', icon: Cpu },
          { id: 'portfolio', label: 'Portfolio', icon: PieChart },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ProductView)}
              className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-colors ${
                isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
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
