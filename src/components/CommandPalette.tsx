import React, { useState, useEffect, useRef } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ProductView, ChainId } from '../types';
import { TokenLogo } from './CryptoIcon';
import { soundManager } from '../lib/sound';
import {
  Search,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  Sparkles,
  Wallet,
  Activity,
  Globe,
  Settings,
  Volume2,
  VolumeX,
  X,
  Command,
  ExternalLink,
  Zap,
  Compass,
  SlidersHorizontal,
  KeyRound,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  perform: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    activeView,
    setActiveView,
    liveTokens,
    setSelectedToken,
    addToast,
  } = useExchange();

  const { isConnected, openConnectModal, disconnectWallet, chainId, switchChain } = useWallet();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.getSoundEnabled());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build command catalogue
  const items: CommandItem[] = [];

  // 1. Navigation / Views
  const views: { id: ProductView; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'trade', label: 'Trade Terminal Pro', desc: 'Institutional multi-chart trading workstation', icon: <TrendingUp className="w-4 h-4 text-cyan-400" /> },
    { id: 'swap', label: 'Smart Swap & Split Router', desc: 'Multi-hop liquidity routing with zero slippage', icon: <Layers className="w-4 h-4 text-blue-400" /> },
    { id: 'markets', label: 'Global Markets Overview', desc: 'Real-time market tickers, volume & depth', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
    { id: 'portfolio', label: 'Portfolio Analytics', desc: 'Track asset distribution, PnL & historical yields', icon: <Wallet className="w-4 h-4 text-indigo-400" /> },
    { id: 'ai-intelligence', label: 'AI Intelligence Center', desc: 'Quantitative sentiment, predictive curves & signals', icon: <Sparkles className="w-4 h-4 text-cyan-300" /> },
    { id: 'ai-copilot', label: 'AI Portfolio Copilot', desc: 'Algorithmic risk diagnostic & delta-neutral hedging copilot', icon: <Compass className="w-4 h-4 text-cyan-400" /> },
    { id: 'onchain-radar', label: 'On-Chain Radar', desc: 'Smart money tracker, whale flows & mempool scanner', icon: <Activity className="w-4 h-4 text-amber-400" /> },
    { id: 'security-center', label: 'Security & Audit Center', desc: 'Bytecode risk scanner, MEV firewall & audit reports', icon: <Shield className="w-4 h-4 text-emerald-300" /> },
    { id: 'transactions', label: 'Activity & On-Chain History', desc: 'Confirmed transactions, blocks & gas telemetry', icon: <Activity className="w-4 h-4 text-slate-400" /> },
    { id: 'liquidity', label: 'Concentrated Liquidity (V3)', desc: 'Provide range-bound liquidity and earn protocol fees', icon: <Layers className="w-4 h-4 text-purple-400" /> },
    { id: 'cross-chain', label: 'Cross-Chain Bridge', desc: 'Atomic cross-chain swaps without wrapped counterparty risk', icon: <Globe className="w-4 h-4 text-teal-400" /> },
    { id: 'perpetuals', label: 'Perpetuals DEX (50x)', desc: 'Decentralized perps with deep shared liquidity', icon: <TrendingUp className="w-4 h-4 text-rose-400" /> },
    { id: 'hypr-coin', label: 'Hyperon (HYPR) Native Coin', desc: 'Tokenomics, genesis contract, burn & staking rewards', icon: <Zap className="w-4 h-4 text-cyan-400" /> },
    { id: 'admin-console', label: 'Admin Console & Protocol Governance', desc: 'Cổng quản trị toàn quyền Super Admin (Yêu cầu xác thực passkey)', icon: <SlidersHorizontal className="w-4 h-4 text-amber-400" /> },
    { id: 'settings', label: 'Terminal Settings', desc: 'Configure RPC, sound, layout density & language', icon: <Settings className="w-4 h-4 text-slate-300" /> },
  ];

  for (const v of views) {
    items.push({
      id: `view-${v.id}`,
      category: 'Views',
      title: v.label,
      subtitle: v.desc,
      icon: v.icon,
      badge: activeView === v.id ? 'CURRENT' : undefined,
      perform: () => {
        setActiveView(v.id);
        onClose();
      },
    });
  }

  // 2. Verified Tokens
  if (liveTokens && liveTokens.length > 0) {
    const matchedTokens = liveTokens.slice(0, 12);
    for (const t of matchedTokens) {
      items.push({
        id: `token-${t.symbol}`,
        category: 'Tokens',
        title: `${t.symbol} — ${t.name}`,
        subtitle: `$${t.priceUsd != null ? t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00'} (${(t.change24h ?? 0) >= 0 ? '+' : ''}${(t.change24h ?? 0).toFixed(2)}%)`,
        icon: (
          <TokenLogo
            symbol={t.symbol}
            name={t.name}
            src={t.logoUrl}
            chainId={t.chainId}
            className="w-5 h-5"
          />
        ),
        badge: t.isVerified ? 'VERIFIED' : 'UNVERIFIED',
        perform: () => {
          setSelectedToken(t);
          setActiveView('token-details');
          onClose();
        },
      });
    }
  }

  // 3. Execution Networks
  const networks: { id: ChainId; name: string }[] = [
    { id: 'ethereum', name: 'Ethereum Mainnet' },
    { id: 'arbitrum', name: 'Arbitrum One (L2)' },
    { id: 'optimism', name: 'Optimism (OP Mainnet)' },
    { id: 'base', name: 'Base (Coinbase L2)' },
    { id: 'polygon', name: 'Polygon PoS' },
    { id: 'bsc', name: 'BNB Smart Chain' },
  ];

  for (const net of networks) {
    items.push({
      id: `net-${net.id}`,
      category: 'Networks',
      title: `Switch to ${net.name}`,
      subtitle: `Chain ID: ${net.id}`,
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
      badge: chainId === net.id ? 'ACTIVE' : undefined,
      perform: () => {
        switchChain(net.id);
        onClose();
      },
    });
  }

  // 4. Quick Actions
  items.push({
    id: 'act-wallet',
    category: 'Actions',
    title: isConnected ? 'Disconnect Active Wallet' : 'Connect Web3 Wallet',
    subtitle: isConnected ? 'Terminate current session' : 'Connect MetaMask, Rabby, or WalletConnect',
    icon: <Wallet className="w-4 h-4 text-amber-400" />,
    perform: () => {
      if (isConnected) {
        disconnectWallet();
        addToast({ title: 'Wallet Disconnected', message: 'Session cleared successfully', type: 'info' });
      } else {
        openConnectModal();
      }
      onClose();
    },
  });

  items.push({
    id: 'act-sound',
    category: 'Actions',
    title: soundEnabled ? 'Mute Trading Audio FX' : 'Enable Trading Audio FX',
    subtitle: 'Institutional tactile click & execution feedback',
    icon: soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />,
    badge: soundEnabled ? 'ON' : 'MUTED',
    perform: () => {
      const next = soundManager.toggleSound();
      setSoundEnabled(next);
      onClose();
    },
  });

  // Filter items by query
  const filtered = query.trim() === ''
    ? items
    : items.filter(
        (it) =>
          it.title.toLowerCase().includes(query.toLowerCase()) ||
          it.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
          it.category.toLowerCase().includes(query.toLowerCase())
      );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#090D16] border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 p-3 sm:p-5 overflow-hidden flex flex-col max-h-[80vh] space-y-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[#0F1424] border border-white/[0.08] focus-within:border-cyan-500/50 transition-colors">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, token, market or view (e.g. 'swap', 'ETH', 'Base')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="font-mono text-[10px] bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded border border-white/10">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-[55vh]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No matching commands or assets found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                      : 'hover:bg-white/[0.03] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/[0.04] text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              item.badge === 'VERIFIED' || item.badge === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : item.badge === 'CURRENT'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-white/[0.06] text-slate-400 border border-white/10'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] font-sans text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] font-mono text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Zap className="w-3 h-3" />
            <span>INSTITUTIONAL QUICK ACCESS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
