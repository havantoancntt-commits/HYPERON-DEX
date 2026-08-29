import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';
import { ChainId } from '../types';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { ChainLogo, TokenLogo, Hyperon3DLogo } from './CryptoIcon';
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
  RefreshCw
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    isConnected, 
    address, 
    chainId, 
    switchChain, 
    balances, 
    connectWallet, 
    disconnectWallet, 
    isDemoMode,
    toggleDemoMode,
    mevProtected,
    setMevProtected 
  } = useWallet();

  const { 
    setActiveView, 
    setSelectedToken, 
    liveTokens, 
    getLiveToken, 
    isPriceLive, 
    tickDirections,
    addToast 
  } = useExchange();

  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

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

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      addToast({
        title: 'Address Copied',
        message: 'Wallet address copied to clipboard.',
        type: 'info',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
                    ${t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: t.priceUsd < 10 ? 4 : 2 })}
                  </span>
                  <span className={`text-[10px] flex items-center ${t.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
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

          {isDemoMode && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-bold tracking-wider">
              SANDBOX SIMULATION
            </span>
          )}
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
          {/* Quick Mode Shortcuts */}
          <div className="hidden xl:flex items-center gap-1 bg-[#0D111A] p-1 rounded-xl border border-white/[0.06] text-xs font-medium">
            <button
              onClick={() => setActiveView('swap')}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Swap
            </button>
            <button
              onClick={() => setActiveView('trade')}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Trade Pro
            </button>
            <button
              onClick={() => setActiveView('markets')}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Markets
            </button>
            <button
              onClick={() => setActiveView('ai-intelligence')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold hover:border-cyan-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Intelligence</span>
            </button>
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

          {/* Non-Custodial Wallet Pill */}
          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/30 font-mono"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm" />
                <span>{shortenAddress(address, 4)}</span>
                <span className="hidden sm:inline text-blue-200 text-[11px] font-normal border-l border-blue-400/30 pl-2">
                  ${totalWalletApprox.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              </button>

              {showWalletMenu && (
                <div 
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0D111A] border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Non-Custodial Account</div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-2 mt-1">
                        <span>{shortenAddress(address, 6)}</span>
                        <button
                          onClick={handleCopyAddress}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Full Address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
                          Secured
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio breakdown */}
                  <div className="py-3 space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">
                      <span>Live Balances</span>
                      <span className="text-cyan-400">${totalWalletApprox.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                    </div>

                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between py-1.5 px-2.5 rounded-xl bg-[#080B12] border border-white/[0.06]">
                        <span className="text-slate-400">ETH Balance</span>
                        <span className="text-white font-bold">{ethBalance.toFixed(4)} ETH (${(ethBalance * ethPrice).toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between py-1.5 px-2.5 rounded-xl bg-[#080B12] border border-white/[0.06]">
                        <span className="text-slate-400">USDC Liquidity</span>
                        <span className="text-white font-bold">${usdcBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 px-2.5 rounded-xl bg-[#080B12] border border-white/[0.06]">
                        <span className="text-slate-400">HYPR Token</span>
                        <span className="text-cyan-400 font-bold">{(balances.HYPR || balances.AETH || 2500).toLocaleString()} HYPR</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Navigation */}
                  <div className="pt-2 border-t border-white/[0.08] space-y-1">
                    <button
                      onClick={() => {
                        setActiveView('portfolio');
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.05] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-blue-400" /> Full Portfolio Ledger
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        toggleDemoMode();
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-amber-400 hover:bg-amber-500/10 transition-colors font-mono cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Toggle Mode: {isDemoMode ? 'Demo Sandbox' : 'Live RPC'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <LogOut className="w-3.5 h-3.5" /> Disconnect Session
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => connectWallet('demo')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/30 font-sans"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Quick Search Modal (Cmd+K) */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150"
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="w-full max-w-xl rounded-2xl bg-[#0D111A] border border-white/15 shadow-2xl p-5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <Search className="w-4 h-4 text-cyan-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search token by name, ticker, address or pair..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-[#171F30] font-mono cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-96 overflow-y-auto space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 font-bold flex items-center justify-between">
                <span>Verified Cross-Chain Assets</span>
                <span className="text-cyan-400">INSTANT SWAP / TRADE</span>
              </div>
              {filteredTokens.map((token, idx) => (
                <button
                  key={`${token.chainId}-${token.address}-${token.symbol}-${idx}`}
                  onClick={() => {
                    setSelectedToken(token);
                    setActiveView('token-details');
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol={token.symbol} name={token.name} src={token.logoUrl} chainId={token.chainId} className="w-7 h-7" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        {token.symbol}
                        <span className="text-[10px] font-normal text-slate-400">{token.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {shortenAddress(token.address, 6)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">${token.priceUsd.toLocaleString(undefined, { minimumFractionDigits: token.priceUsd < 10 ? 4 : 2 })}</div>
                    <div className={`text-[11px] font-semibold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
