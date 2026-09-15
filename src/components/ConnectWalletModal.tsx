import React, { useState, useEffect, useMemo } from 'react';
import { useWallet, SupportedWalletType, SandboxAccount } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import {
  X,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Laptop,
  Terminal,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lock,
  Search,
  Check,
  Copy,
  AlertTriangle,
  Download,
  KeyRound,
  Shield,
  Zap,
  History,
  Trash2,
  ArrowRightLeft
} from 'lucide-react';
import { shortenAddress } from '../lib/utils';

interface WalletMetadata {
  id: SupportedWalletType;
  name: string;
  description: string;
  badge?: string;
  iconUrl: string;
  installUrl: string;
  category: 'injected' | 'mobile' | 'sandbox';
  isInstalled: boolean;
}

export const ConnectWalletModal: React.FC = () => {
  const {
    isConnectModalOpen,
    closeConnectModal,
    connectWallet,
    switchWallet,
    discoveredProviders,
    recentAccounts,
    removeRecentAccount,
    sandboxAccounts,
    activeSandboxIndex,
    switchSandboxAccount,
  } = useWallet();
  const { addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<'wallets' | 'qr' | 'sandbox'>('wallets');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectingProviderDetail, setConnectingProviderDetail] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notInstalledWallet, setNotInstalledWallet] = useState<WalletMetadata | null>(null);

  // QR Code & WC v2 state
  const [wcUri, setWcUri] = useState<string>('');
  const [copiedWcUri, setCopiedWcUri] = useState(false);
  const [isWcPairing, setIsWcPairing] = useState(false);

  // Detect installed extensions
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const eth = win.ethereum;

    const detected: Record<string, boolean> = {
      metamask: Boolean(eth?.isMetaMask && !eth?.isRabby),
      rabby: Boolean(win.rabby || eth?.isRabby),
      coinbase: Boolean(win.coinbaseWalletExtension || eth?.isCoinbaseWallet),
      phantom: Boolean(win.phantom?.ethereum || eth?.isPhantom),
      okx: Boolean(win.okxwallet || eth?.isOkxWallet),
      trust: Boolean(win.trustwallet || eth?.isTrust),
      rainbow: Boolean(win.rainbow || eth?.isRainbow),
      bitget: Boolean(win.bitkeep?.ethereum || win.binancew3w),
      injected: Boolean(eth),
      walletconnect: true,
      sandbox: true,
    };

    // Also check EIP-6963 discovered providers
    discoveredProviders.forEach((dp) => {
      const rdns = dp.info.rdns.toLowerCase();
      if (rdns.includes('metamask')) detected.metamask = true;
      if (rdns.includes('rabby')) detected.rabby = true;
      if (rdns.includes('coinbase')) detected.coinbase = true;
      if (rdns.includes('phantom')) detected.phantom = true;
      if (rdns.includes('okx') || rdns.includes('okex')) detected.okx = true;
      if (rdns.includes('trust')) detected.trust = true;
      if (rdns.includes('rainbow')) detected.rainbow = true;
      if (rdns.includes('bitget') || rdns.includes('bitkeep')) detected.bitget = true;
    });

    setInstalledMap(detected);
  }, [isConnectModalOpen, discoveredProviders]);

  // Generate a realistic WalletConnect v2 pairing URI on modal open
  useEffect(() => {
    if (isConnectModalOpen) {
      const topic = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setWcUri(`wc:${topic}@2?relay-protocol=irn&symKey=${symKey}`);
      setErrorMessage(null);
      setNotInstalledWallet(null);
    }
  }, [isConnectModalOpen]);

  if (!isConnectModalOpen) return null;

  const allWallets: WalletMetadata[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'The world\'s most popular Web3 crypto wallet',
      badge: installedMap.metamask ? 'DETECTED' : 'POPULAR',
      iconUrl: 'https://assets.coingecko.com/markets/images/681/small/metamask.png',
      installUrl: 'https://metamask.io/download/',
      isInstalled: Boolean(installedMap.metamask),
      category: 'injected',
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      description: 'Game-changing wallet for DeFi users with pre-sign risk checks',
      badge: installedMap.rabby ? 'DETECTED' : 'DEFI PRO',
      iconUrl: 'https://assets.coingecko.com/markets/images/1284/small/rabby.png',
      installUrl: 'https://rabby.io/',
      isInstalled: Boolean(installedMap.rabby),
      category: 'injected',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Self-custody wallet & Smart Wallet with passkey support',
      badge: installedMap.coinbase ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/569/small/coinbase.png',
      installUrl: 'https://www.coinbase.com/wallet',
      isInstalled: Boolean(installedMap.coinbase),
      category: 'injected',
    },
    {
      id: 'okx',
      name: 'OKX Web3 Wallet',
      description: 'Universal multi-chain decentralized gateway with MPC support',
      badge: installedMap.okx ? 'DETECTED' : 'MULTI-CHAIN',
      iconUrl: 'https://assets.coingecko.com/markets/images/96/small/okx.png',
      installUrl: 'https://www.okx.com/web3',
      isInstalled: Boolean(installedMap.okx),
      category: 'injected',
    },
    {
      id: 'phantom',
      name: 'Phantom EVM',
      description: 'Ultra-fast multi-chain wallet for Ethereum, Base, and Solana',
      badge: installedMap.phantom ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/21800/small/phantom.png',
      installUrl: 'https://phantom.app/',
      isInstalled: Boolean(installedMap.phantom),
      category: 'injected',
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      description: 'Mobile & desktop multi-crypto wallet used by 70M+ users',
      badge: installedMap.trust ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/11085/small/Trust.png',
      installUrl: 'https://trustwallet.com/browser-extension',
      isInstalled: Boolean(installedMap.trust),
      category: 'injected',
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      description: 'Delightful Ethereum & L2 experience with points & rewards',
      badge: installedMap.rainbow ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: 'https://rainbow.me/',
      isInstalled: Boolean(installedMap.rainbow),
      category: 'injected',
    },
    {
      id: 'bitget',
      name: 'Bitget / Binance Web3',
      description: 'Comprehensive non-custodial crypto wallet & Swap terminal',
      badge: installedMap.bitget ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/825/small/bitget.png',
      installUrl: 'https://web3.bitget.com/',
      isInstalled: Boolean(installedMap.bitget),
      category: 'injected',
    },
    {
      id: 'injected',
      name: 'Browser Injected (EIP-1193)',
      description: 'Brave Wallet, Opera Crypto, or any installed Web3 extension',
      badge: 'UNIVERSAL',
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: 'https://ethereum.org/en/wallets/find-wallet/',
      isInstalled: Boolean(installedMap.injected),
      category: 'injected',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2 Protocol',
      description: 'Scan with 300+ mobile EVM wallets across iOS and Android',
      badge: 'QR CODE',
      iconUrl: 'https://assets.coingecko.com/coins/images/23307/small/walletconnect.png',
      installUrl: 'https://walletconnect.com/',
      isInstalled: true,
      category: 'mobile',
    },
    {
      id: 'sandbox',
      name: 'Institutional Sandbox / Testnet',
      description: 'Instant zero-risk testing with preloaded assets & faucets',
      badge: '1-CLICK TEST',
      iconUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      installUrl: '#',
      isInstalled: true,
      category: 'sandbox',
    },
  ];

  // Filtered wallet list based on search query
  const filteredWallets = useMemo(() => {
    if (!searchQuery.trim()) return allWallets;
    const query = searchQuery.toLowerCase();
    return allWallets.filter(
      (w) => w.name.toLowerCase().includes(query) || w.description.toLowerCase().includes(query)
    );
  }, [allWallets, searchQuery]);

  // Handle wallet selection
  const handleSelectWallet = async (wallet: WalletMetadata, customProvider?: any) => {
    setErrorMessage(null);
    setNotInstalledWallet(null);

    if (wallet.id === 'walletconnect') {
      setActiveTab('qr');
      return;
    }

    if (wallet.id === 'sandbox') {
      setActiveTab('sandbox');
      return;
    }

    // If wallet is not installed in browser and not EIP-6963 provider, show installation helper
    if (!wallet.isInstalled && !customProvider) {
      setNotInstalledWallet(wallet);
      return;
    }

    setConnectingId(wallet.id);
    try {
      await connectWallet(wallet.id, customProvider);
      addToast({
        title: 'Wallet Connected',
        message: `Successfully connected with ${wallet.name}. Non-custodial session initialized.`,
        type: 'success',
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Connection failed. Please unlock your wallet and approve the request.'
      );
    } finally {
      setConnectingId(null);
    }
  };

  // Copy WalletConnect URI
  const handleCopyWcUri = () => {
    if (!wcUri) return;
    navigator.clipboard.writeText(wcUri);
    setCopiedWcUri(true);
    addToast({
      title: 'Pairing Code Copied',
      message: 'WalletConnect v2 URI copied to clipboard.',
      type: 'info',
    });
    setTimeout(() => setCopiedWcUri(false), 2000);
  };

  // Simulate mobile wallet pairing
  const handleSimulateWcPair = () => {
    setIsWcPairing(true);
    setTimeout(async () => {
      setIsWcPairing(false);
      await connectWallet('demo');
      addToast({
        title: 'Mobile Wallet Paired',
        message: 'Established secure WalletConnect v2 session with mobile device.',
        type: 'success',
      });
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={closeConnectModal}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#090D14] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.08] bg-[#06090F]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Connect Web3 Wallet</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  EIP-6963 / EIP-1193
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Non-custodial connection. Your private keys never leave your device.
              </p>
            </div>
          </div>
          <button
            onClick={closeConnectModal}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] bg-[#070B12] px-6 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('wallets');
              setNotInstalledWallet(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'wallets'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> Popular Wallets
          </button>
          <button
            onClick={() => {
              setActiveTab('qr');
              setNotInstalledWallet(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> WalletConnect v2 (QR)
          </button>
          <button
            onClick={() => {
              setActiveTab('sandbox');
              setNotInstalledWallet(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Institutional Sandbox
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Global Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Not Installed Wallet Guider Card */}
          {notInstalledWallet && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Download className="w-4 h-4" />
                  <span>{notInstalledWallet.name} chưa được cài đặt</span>
                </div>
                <button
                  onClick={() => setNotInstalledWallet(null)}
                  className="text-amber-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Tiện ích mở rộng của <strong>{notInstalledWallet.name}</strong> không tìm thấy trong trình duyệt này. Bạn có thể tải ngay từ trang chủ chính thức, hoặc kết nối bằng cách quét mã QR qua ứng dụng di động:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={notInstalledWallet.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải {notInstalledWallet.name}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
                <button
                  onClick={() => setActiveTab('qr')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quét QR Mobile</span>
                </button>
                <button
                  onClick={() => setActiveTab('sandbox')}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dùng Sandbox</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Popular Wallets & EIP-6963 Discovery */}
          {activeTab === 'wallets' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search wallet (MetaMask, Rabby, OKX, Coinbase...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0F1420] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Recent Accounts Quick Connect */}
              {recentAccounts.length > 0 && !searchQuery && (
                <div className="p-3 rounded-2xl bg-[#0D121D] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <History className="w-3 h-3" /> Recent Accounts
                    </span>
                    <span>1-Click Switch</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {recentAccounts.slice(0, 4).map((acc) => (
                      <div
                        key={acc.address}
                        className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-colors group"
                      >
                        <button
                          onClick={async () => {
                            try {
                              await switchWallet(acc.type);
                              addToast({
                                title: 'Account Switched',
                                message: `Connected to ${shortenAddress(acc.address, 4)} via ${acc.type.toUpperCase()}`,
                                type: 'success',
                              });
                            } catch (e: any) {
                              addToast({
                                title: 'Switch Error',
                                message: e?.message || 'Failed to switch to account.',
                                type: 'error',
                              });
                            }
                          }}
                          className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1"
                        >
                          <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] font-bold text-white group-hover:text-cyan-300 truncate">
                              {shortenAddress(acc.address, 4)}
                            </div>
                            <div className="text-[9px] text-slate-400 capitalize">
                              {acc.name || acc.type}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => removeRecentAccount(acc.address)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EIP-6963 Auto-Discovered Extensions Section */}
              {discoveredProviders.length > 0 && !searchQuery && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Auto-Discovered Injected Wallets (EIP-6963)</span>
                  </div>
                  <div className="space-y-1.5">
                    {discoveredProviders.map((dp) => (
                      <button
                        key={dp.info.uuid}
                        onClick={() =>
                          handleSelectWallet(
                            {
                              id: 'injected',
                              name: dp.info.name,
                              description: `Discovered provider (${dp.info.rdns})`,
                              badge: 'DETECTED',
                              iconUrl: dp.info.icon,
                              installUrl: '',
                              isInstalled: true,
                              category: 'injected',
                            },
                            dp.provider
                          )
                        }
                        disabled={connectingId === dp.info.name}
                        className="w-full p-3 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center justify-between group cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={dp.info.icon}
                            alt={dp.info.name}
                            className="w-8 h-8 rounded-xl object-contain bg-white/5 p-1"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{dp.info.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                ACTIVE EXTENSION
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">{dp.info.rdns}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard List */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                  Supported Web3 Providers
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {filteredWallets.map((wallet) => {
                    const isConnecting = connectingId === wallet.id;
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => handleSelectWallet(wallet)}
                        disabled={isConnecting}
                        className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer text-left ${
                          wallet.isInstalled
                            ? 'bg-[#0F1422] hover:bg-[#141C30] border-white/[0.08] hover:border-cyan-500/40 shadow-sm'
                            : 'bg-[#0B0F17]/60 hover:bg-[#0F1420] border-white/[0.04] hover:border-white/10 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={wallet.iconUrl}
                            alt={wallet.name}
                            className="w-8 h-8 rounded-xl object-contain bg-white/5 p-1 shrink-0"
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{wallet.name}</span>
                              {wallet.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                    wallet.badge === 'DETECTED'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : wallet.badge === 'DEFI PRO'
                                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  }`}
                                >
                                  {wallet.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {wallet.description}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors ml-2">
                          {isConnecting ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WalletConnect v2 QR Code & Deep-links */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0F1420] border border-white/[0.08] flex flex-col items-center text-center space-y-4">
                {/* Visual SVG QR Code Matrix */}
                <div className="relative p-4 bg-white rounded-2xl shadow-2xl">
                  <svg className="w-48 h-48" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white" rx="4" />
                    {/* Corner Position Detection Patterns */}
                    <rect x="8" y="8" width="26" height="26" fill="#000" rx="3" />
                    <rect x="13" y="13" width="16" height="16" fill="#fff" rx="2" />
                    <rect x="16" y="16" width="10" height="10" fill="#000" rx="1.5" />

                    <rect x="66" y="8" width="26" height="26" fill="#000" rx="3" />
                    <rect x="71" y="13" width="16" height="16" fill="#fff" rx="2" />
                    <rect x="74" y="16" width="10" height="10" fill="#000" rx="1.5" />

                    <rect x="8" y="66" width="26" height="26" fill="#000" rx="3" />
                    <rect x="13" y="71" width="16" height="16" fill="#fff" rx="2" />
                    <rect x="16" y="74" width="10" height="10" fill="#000" rx="1.5" />

                    {/* Matrix Data Dots */}
                    <rect x="40" y="12" width="5" height="5" fill="#000" />
                    <rect x="50" y="12" width="5" height="5" fill="#000" />
                    <rect x="40" y="22" width="5" height="5" fill="#000" />
                    <rect x="52" y="28" width="5" height="5" fill="#000" />
                    <rect x="22" y="40" width="5" height="5" fill="#000" />
                    <rect x="32" y="40" width="5" height="5" fill="#000" />
                    <rect x="62" y="40" width="5" height="5" fill="#000" />
                    <rect x="72" y="40" width="5" height="5" fill="#000" />

                    {/* Center Brand Badge */}
                    <rect x="42" y="42" width="16" height="16" rx="4" fill="#0052FF" />
                    <path
                      d="M46 50 C48 46 52 46 54 50 C56 54 50 54 50 54"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <rect x="40" y="66" width="5" height="5" fill="#000" />
                    <rect x="50" y="72" width="5" height="5" fill="#000" />
                    <rect x="62" y="66" width="5" height="5" fill="#000" />
                    <rect x="72" y="72" width="5" height="5" fill="#000" />
                    <rect x="82" y="66" width="5" height="5" fill="#000" />
                  </svg>

                  {isWcPairing && (
                    <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-sm">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
                      <span className="text-xs font-bold">Pairing with Mobile...</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-white">Scan with your Mobile Wallet</div>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Open MetaMask, Rainbow, Trust Wallet, or Uniswap Wallet on your phone and tap the scanner icon.
                  </p>
                </div>

                {/* Copy URI Bar */}
                <div className="w-full flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[11px] font-mono text-slate-400 truncate flex-1 text-left">
                    {wcUri}
                  </span>
                  <button
                    onClick={handleCopyWcUri}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedWcUri ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Mobile Links */}
                <div className="w-full pt-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase mb-2 text-left">
                    Direct Mobile Deep-Links
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <a
                      href={`https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                      <span>MetaMask</span>
                    </a>
                    <a
                      href={`https://rnbwapp.com/wc?uri=${encodeURIComponent(wcUri)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                      <span>Rainbow</span>
                    </a>
                    <a
                      href={`https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                      <span>Trust</span>
                    </a>
                  </div>
                </div>

                {/* Instant Simulation Button */}
                <button
                  onClick={handleSimulateWcPair}
                  disabled={isWcPairing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant Desktop Pair Simulation</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Institutional Sandbox Mode */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0D131F] border border-cyan-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                    <Sparkles className="w-4 h-4" />
                    <span>Institutional Sandbox & Testnet Profiles</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    ZERO PRIVATE KEY RISK
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Trải nghiệm đầy đủ 100% tính năng giao dịch Smart Order Routing, Cross-chain Bridge, và Staking mà không cần extension hay nạp tiền thật:
                </p>

                {/* Profile Chooser */}
                <div className="space-y-2">
                  {sandboxAccounts.map((profile, idx) => (
                    <div
                      key={profile.address}
                      onClick={() => switchSandboxAccount(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeSandboxIndex === idx
                          ? 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                          : 'bg-black/30 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                              activeSandboxIndex === idx
                                ? 'border-cyan-400 bg-cyan-400'
                                : 'border-slate-500'
                            }`}
                          >
                            {activeSandboxIndex === idx && <div className="w-1 h-1 rounded-full bg-black" />}
                          </div>
                          <span className="text-xs font-bold text-white">{profile.name}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                          {profile.tag}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                        <span>{profile.address.slice(0, 10)}...{profile.address.slice(-8)}</span>
                        <span className="text-emerald-400 font-bold">
                          {(profile.balances.ETH || 0)} ETH + ${(profile.balances.USDC || 0).toLocaleString()} USDC
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    connectWallet('sandbox');
                    addToast({
                      title: 'Sandbox Activated',
                      message: `Active Profile: ${sandboxAccounts[activeSandboxIndex]?.name}`,
                      type: 'success',
                    });
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Launch Sandbox Session Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Security Guarantees */}
        <div className="px-6 py-3.5 bg-[#06090F] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Non-Custodial • EIP-6963 Standard</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> SSL Encrypted
            </span>
            <a
              href="https://ethereum.org/en/developers/docs/standards/tokens/erc-4361/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>SIWE Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
