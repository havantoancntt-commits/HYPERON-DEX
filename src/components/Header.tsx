import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';
import { ChainId } from '../types';
import { shortenAddress, formatCurrency } from '../lib/utils';
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
  Sliders
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
    mevProtected 
  } = useWallet();

  const { setActiveView, setSelectedToken, liveTokens, getLiveToken, isPriceLive } = useExchange();
  const [showChainMenu, setShowChainMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentChain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.ethereum;
  const ethBalance = balances.ETH || 0;
  const usdcBalance = balances.USDC || 0;
  const ethPrice = getLiveToken('ETH').priceUsd;
  const totalWalletApprox = ethBalance * ethPrice + usdcBalance;

  const filteredTokens = liveTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0A]">
      {/* Top micro ticker for gas and system status */}
      <div className="hidden lg:flex items-center justify-between px-6 py-1 text-[11px] font-mono text-slate-400 border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-200">NEXUS AI ENGINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Zero-Trust Mempool Active</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" /> ETH: 18 Gwei ($3.85)
            </span>
            <span>BASE: 0.002 Gwei</span>
            <span>ARB: 0.01 Gwei</span>
            <span>OP: 0.015 Gwei</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Private RPC: {mevProtected ? 'Nexus Flashbots' : 'Standard'}</span>
          </div>
          {isDemoMode && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-medium tracking-wide">
              TESTNET ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Search */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/20">
              X
            </div>
            <div className="text-left">
              <div className="font-semibold tracking-tight text-white flex items-center gap-2 text-base">
                NEXUS<span className="text-blue-500 font-bold">AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-semibold">
                  PRO
                </span>
              </div>
            </div>
          </button>

          {/* Quick Search Bar */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 text-xs text-slate-400 transition-colors w-72 justify-between"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search tokens, pairs, contracts...</span>
            </span>
            <kbd className="font-mono text-[10px] bg-[#1a1a1a] text-slate-400 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          {/* AI Intelligence Score Pill */}
          <button
            onClick={() => setActiveView('ai-intelligence')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Mood: <strong className="text-blue-300 font-mono">78/100</strong> (Bullish)</span>
          </button>

          {/* Chain Switcher Dropdown (Pill Style) */}
          <div className="relative">
            <button
              onClick={() => setShowChainMenu(!showChainMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-white/5 rounded-full text-xs font-medium text-slate-200 transition-colors hover:border-white/15"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <img src={currentChain.logo} alt={currentChain.name} className="w-3.5 h-3.5 rounded-full" />
              <span className="font-mono text-emerald-400 text-xs uppercase">{currentChain.shortName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showChainMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0C0C0C] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowChainMenu(false)}
              >
                <div className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 font-bold tracking-wider">Select Execution Network</div>
                {Object.values(SUPPORTED_CHAINS).map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => switchChain(chain.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      chain.id === chainId
                        ? 'bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20'
                        : 'hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={chain.logo} alt={chain.name} className="w-4 h-4 rounded-full" />
                      <span>{chain.name}</span>
                    </div>
                    {chain.isL2 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5 font-mono">L2</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Non-Custodial Wallet Pill */}
          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="flex items-center gap-2.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors shadow-lg shadow-blue-900/20 font-mono"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono">{shortenAddress(address, 5)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>

              {showWalletMenu && (
                <div 
                  className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0C0C0C] border border-white/10 shadow-2xl p-3.5 z-50"
                  onClick={() => setShowWalletMenu(false)}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Connected Account</div>
                      <div className="text-xs font-mono font-semibold text-white flex items-center gap-1.5 mt-0.5">
                        {shortenAddress(address, 6)}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Balances summary */}
                  <div className="py-3 space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Primary Assets</div>
                    <div className="flex justify-between text-xs py-1.5 px-2 rounded-lg bg-[#121212] border border-white/5">
                      <span className="text-slate-400">ETH Balance</span>
                      <span className="font-mono text-white font-medium">{ethBalance.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 px-2 rounded-lg bg-[#121212] border border-white/5">
                      <span className="text-slate-400">USDC Balance</span>
                      <span className="font-mono text-white font-medium">${usdcBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 px-2 rounded-lg bg-[#121212] border border-white/5">
                      <span className="text-slate-400">AETH (Nexus)</span>
                      <span className="font-mono text-blue-400 font-medium">{(balances.AETH || 0).toLocaleString()} AETH</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <button
                      onClick={() => setActiveView('wallet')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2"><Sliders className="w-3.5 h-3.5" /> Token Approvals & Assets</span>
                    </button>
                    <button
                      onClick={toggleDemoMode}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition-colors font-mono"
                    >
                      <span>Toggle Mode ({isDemoMode ? 'Demo' : 'Live RPC'})</span>
                    </button>
                    <button
                      onClick={disconnectWallet}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <span className="flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Disconnect Wallet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => connectWallet('demo')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors shadow-lg shadow-blue-900/20"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Quick Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0C0C] border border-white/10 shadow-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Search className="w-4 h-4 text-blue-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search token, symbol, contract address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-[#181818]"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 font-bold">Verified Assets</div>
              {filteredTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    setSelectedToken(token);
                    setActiveView('token-details');
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={token.logoUrl} alt={token.name} className="w-6 h-6 rounded-full" />
                    <div>
                      <div className="text-xs font-semibold text-white">{token.symbol}</div>
                      <div className="text-[11px] text-slate-400">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-medium text-white">${token.priceUsd.toLocaleString()}</div>
                    <div className={`text-[11px] font-mono ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h}%
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
