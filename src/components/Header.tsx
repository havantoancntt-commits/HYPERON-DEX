import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';
import { ChainId } from '../types';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { ChainLogo, TokenLogo, Hyperon3DLogo } from './CryptoIcon';
import { soundManager } from '../lib/sound';
import { CommandPalette } from './CommandPalette';
import { 
  ShieldCheck, 
  Fuel, 
  Wallet, 
  ChevronDown, 
  Sparkles, 
  Search, 
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sliders,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Radio,
  Zap,
  Copy,
  RefreshCw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Terminal,
  Languages,
  ArrowRightLeft,
  Shield,
  ShieldAlert,
  ShieldX,
  Eye,
  Check,
  Layers
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    isConnected, 
    address, 
    chainId, 
    walletType,
    switchChain, 
    balances, 
    connectWallet, 
    disconnectWallet, 
    switchWallet,
    isWatchOnly,
    recentAccounts,
    tokenApprovals,
    mevProtected,
    setMevProtected,
    openConnectModal,
    openAccountModal,
    isSiweAuthenticated,
  } = useWallet();

  const { 
    activeView,
    setActiveView, 
    setSelectedToken, 
    liveTokens, 
    getLiveToken, 
    isPriceLive, 
    tickDirections,
    addToast 
  } = useExchange();

  const { language, setLanguage, languageMeta, supportedLanguages, t, theme, setTheme } = useI18n();

  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundActive, setSoundActive] = useState(soundManager.getSoundEnabled());

  const toggleSound = () => {
    const next = soundManager.toggleSound();
    setSoundActive(next);
    addToast({
      title: next ? 'Tactile Audio Enabled' : 'Audio Muted',
      message: next ? 'Institutional synthetic sound effects active.' : 'Synthetic sound effects muted.',
      type: 'info'
    });
  };

  const currentChain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.ethereum;
  const ethBalance = balances.ETH || 0;
  const usdcBalance = balances.USDC || 0;
  const ethPrice = getLiveToken('ETH').priceUsd;
  const totalWalletApprox = ethBalance * ethPrice + usdcBalance;

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTokens = liveTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07090E]/95 backdrop-blur-xl">
      {/* Top Real-Time Global Market & Gas Tape */}
      <div className="hidden lg:flex items-center justify-between px-6 py-1 text-[11px] font-mono text-slate-400 border-b border-white/[0.05] bg-[#04060A]">
        {/* Left: Live Market Ticker */}
        <div className="flex items-center gap-5 overflow-x-auto py-0.5 scrollbar-none">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-white tracking-wider text-[10px] font-bold">HYPERON QUANTUM ORACLE</span>
          </div>

          <button
            onClick={() => setActiveView('hypr-coin')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 transition-all text-xs font-mono font-bold cursor-pointer shrink-0 shadow-sm shadow-cyan-500/10"
            title="Xem chi tiết đồng coin HYPR Native"
          >
            <Hyperon3DLogo className="w-3.5 h-3.5" />
            <span>HYPR $4.82</span>
            <span className="text-emerald-400 text-[10px] font-bold">+18.6%</span>
          </button>

          <div className="h-3 w-px bg-white/10 shrink-0" />

          {/* Quick Real-Time Asset Stream */}
          <div className="flex items-center gap-4 text-xs font-mono">
            {liveTokens.slice(0, 6).map((t, idx) => {
              const tick = tickDirections[t.symbol] || 'same';
              return (
                <button
                  key={`${t.chainId}-${t.symbol}-${idx}`}
                  onClick={() => {
                    setSelectedToken(t);
                    setActiveView('trade');
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group"
                >
                  <span className="text-slate-400 group-hover:text-slate-200 font-bold">{t.symbol}</span>
                  <span className={`transition-colors font-medium ${
                    tick === 'up' ? 'text-emerald-400 font-bold' : tick === 'down' ? 'text-rose-400 font-bold' : 'text-slate-200'
                  }`}>
                    {t.priceUsd != null ? `$${t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: t.priceUsd < 10 ? 4 : 2 })}` : '—'}
                  </span>
                  <span className={`text-[10px] flex items-center ${(t.change24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.change24h != null ? `${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(1)}%` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Network Health & Flashbots MEV */}
        <div className="flex items-center gap-5 shrink-0 text-[11px]">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Fuel className="w-3 h-3 text-amber-400" />
              <span>ETH Gas: <strong className="text-white">14 Gwei</strong></span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Arbitrum: <strong className="text-cyan-400">0.01 Gwei</strong></span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Base: <strong className="text-blue-400">0.002 Gwei</strong></span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          <button
            onClick={() => setMevProtected(!mevProtected)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            title="Toggle Flashbots Private Mempool Routing"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              {mevProtected ? 'MEV SHIELD: ON' : 'MEV SHIELD: OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Global Search */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3.5 group cursor-pointer focus:outline-none"
          >
            <Hyperon3DLogo className="w-11 h-11 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold tracking-tight text-white flex items-center gap-2 text-xl font-sans leading-none">
                HYPERON<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 font-black">DEX</span>
                <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-blue-500/20 to-purple-500/20 text-cyan-300 border border-cyan-400/40 uppercase tracking-widest shadow-sm shadow-cyan-500/10">
                  AI PRO
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold uppercase mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                <span>QUANTUM SUPER EXCHANGE</span>
              </div>
            </div>
          </button>

          {/* Quick Search Trigger Bar */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] hover:border-blue-500/30 text-xs text-slate-400 transition-all w-80 justify-between group cursor-pointer shadow-inner"
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span className="text-slate-400 group-hover:text-slate-200">Search tokens, pools, AI agents...</span>
            </span>
            <kbd className="font-mono text-[10px] bg-[#171F30] text-slate-400 group-hover:text-cyan-300 px-2 py-0.5 rounded border border-white/10 shadow-sm">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Navigation Quick Badges */}
        <div className="flex items-center gap-3">
          {/* Institutional Primary Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-1 bg-[#090C14] p-1 rounded-2xl border border-white/[0.08] text-xs font-medium shadow-inner">
            <button
              onClick={() => setActiveView('hypr-coin')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'hypr-coin'
                  ? 'bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                  : 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10'
              }`}
            >
              <Hyperon3DLogo className="w-3.5 h-3.5" />
              <span>HYPR Coin</span>
            </button>
            <button
              onClick={() => setActiveView('trade')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'trade'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Trade
            </button>
            <button
              onClick={() => setActiveView('swap')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'swap'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveView('markets')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'markets'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Markets
            </button>
            <button
              onClick={() => setActiveView('portfolio')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'portfolio'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveView('onchain-radar')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'onchain-radar'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveView('security-center')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'security-center'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveView('transactions')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'transactions'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveView('ai-intelligence')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'ai-intelligence'
                  ? 'bg-gradient-to-r from-blue-600/30 via-cyan-500/30 to-indigo-600/30 text-cyan-300 font-bold border border-cyan-400/40'
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Terminal</span>
            </button>

            {/* Dropdown More */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <div className="text-[10px] font-mono uppercase text-slate-400 px-2.5 py-1 font-bold">
                    HYPERON ECOSYSTEM
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      { id: 'perpetuals', label: 'Perpetuals (50x)', icon: TrendingUp },
                      { id: 'onchain-radar', label: 'Smart Money Radar', icon: Radio },
                      { id: 'launchpad', label: 'Anti-Rug Launchpad', icon: Zap },
                      { id: 'lending', label: 'Institutional Lending', icon: Sliders },
                      { id: 'staking', label: 'DeFi Staking', icon: ShieldCheck },
                      { id: 'liquidity', label: 'Concentrated Liquidity', icon: Layers },
                      { id: 'cross-chain', label: 'Cross-Chain Bridge', icon: ArrowRightLeft },
                      { id: 'developer-api', label: 'Developer API (SDK)', icon: Terminal },
                      { id: 'admin-console', label: 'Admin Terminal', icon: Sliders },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as any)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                          activeView === item.id ? 'bg-cyan-500/15 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sound FX Toggle Button */}
          <button
            onClick={toggleSound}
            className={`hidden lg:flex p-2 rounded-xl border transition-all cursor-pointer ${
              soundActive 
                ? 'bg-[#0D111A] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 shadow-sm shadow-cyan-500/10' 
                : 'bg-[#0D111A] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
            title={soundActive ? 'Tactile Audio Feedback ON (Click to mute)' : 'Tactile Audio Feedback MUTED (Click to enable)'}
          >
            {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Switcher */}
          <div className="relative hidden md:block">
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowLangMenu(false);
                setShowChainMenu(false);
              }}
              className="p-2 rounded-xl border border-white/[0.08] bg-[#0D111A] hover:bg-[#131926] text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
              title={`Theme: ${theme === 'dark' ? 'Quantum Midnight' : theme === 'light' ? 'Titanium Light' : 'Cyberpunk'}`}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-cyan-400" />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Terminal className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {showThemeMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0D111A] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowThemeMenu(false)}
              >
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2.5 py-1 font-bold">
                  {t('theme.mode')}
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                      theme === 'dark' ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Moon className="w-3.5 h-3.5 text-cyan-400" /> {t('theme.dark')}
                    </span>
                    {theme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                      theme === 'light' ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5 text-amber-400" /> {t('theme.light')}
                    </span>
                    {theme === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                  <button
                    onClick={() => setTheme('cyberpunk')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                      theme === 'cyberpunk' ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" /> {t('theme.cyber')}
                    </span>
                    {theme === 'cyberpunk' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Internationalization Language Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowThemeMenu(false);
                setShowChainMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] hover:border-blue-500/30 rounded-xl text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
              title="Change Interface Language"
            >
              <span className="text-sm">{languageMeta.flag}</span>
              <span className="font-mono text-xs uppercase text-slate-300">{language}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0D111A] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowLangMenu(false)}
              >
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2.5 py-1 font-bold flex items-center justify-between">
                  <span>{t('lang.select')}</span>
                  <span className="text-cyan-400 text-[9px]">GLOBAL i18n</span>
                </div>
                <div className="space-y-1 mt-1 max-h-64 overflow-y-auto pr-1">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        lang.code === language
                          ? 'bg-blue-600/15 text-cyan-300 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-sans">{lang.nativeName}</span>
                      </span>
                      {lang.code === language && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution Chain Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowChainMenu(!showChainMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] hover:border-blue-500/30 rounded-xl text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <ChainLogo chainId={currentChain.id} name={currentChain.name} src={currentChain.logo} className="w-4 h-4" />
              <span className="font-mono text-white text-xs">{currentChain.shortName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showChainMenu ? 'rotate-180' : ''}`} />
            </button>

            {showChainMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D111A] border border-white/10 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowChainMenu(false)}
              >
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 font-bold tracking-wider flex items-center justify-between">
                  <span>Execution Network</span>
                  <span className="text-emerald-400 text-[9px] font-bold">MULTI-CHAIN ROUTING</span>
                </div>
                <div className="space-y-1 mt-1">
                  {Object.values(SUPPORTED_CHAINS).map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => switchChain(chain.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        chain.id === chainId
                          ? 'bg-blue-600/15 text-cyan-300 font-bold border border-blue-500/30 shadow-sm'
                          : 'hover:bg-white/[0.04] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ChainLogo chainId={chain.id} name={chain.name} src={chain.logo} className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold text-white">{chain.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {chain.isL2 ? 'Layer-2 Rollup' : 'Layer-1 Mainnet'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                        {chain.id === 'arbitrum' ? '4ms' : chain.id === 'base' ? '3ms' : chain.id === 'polygon' ? '6ms' : '14ms'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Top Header Web3 Wallet Connect Button */}
          {!isConnected ? (
            <button
              onClick={openConnectModal}
              id="top-header-connect-wallet-btn"
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-900/40 cursor-pointer active:scale-95 border border-cyan-400/30 shrink-0"
              title="Mở cổng kết nối ví Web3 (Trust Wallet, MetaMask, OKX, Binance...)"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Kết Nối Ví</span>
              <span className="sm:hidden">Ví Web3</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0D111A] border border-cyan-500/30 rounded-xl p-1 shadow-sm shrink-0">
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Quản trị ví & số dư"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{shortenAddress(address, 4)}</span>
                {walletType === 'trust' && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 text-[10px] font-sans font-bold">Trust</span>
                )}
              </button>
              <button
                onClick={openConnectModal}
                className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer font-sans"
                title="Đổi sang ví khác (Trust Wallet, MetaMask, OKX...)"
              >
                Đổi Ví
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Institutional Command Palette (Cmd+K) */}
      <CommandPalette 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </header>
  );
};
