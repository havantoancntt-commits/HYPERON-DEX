import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWallet, SupportedWalletType, SandboxAccount } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { ChainLogo } from './CryptoIcon';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  QrCode,
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
  ArrowRightLeft,
  LogOut,
  ShieldX,
  Globe,
  AlertCircle,
  ChevronRight,
  Smartphone,
  Radio,
  Layers,
  Cpu,
  Terminal
} from 'lucide-react';
import { ChainId } from '../types';

export interface WalletProviderInfo {
  id: SupportedWalletType;
  name: string;
  shortDesc: string;
  badge?: string;
  badgeType?: 'primary' | 'success' | 'warning' | 'info';
  iconUrl: string;
  installUrl: string;
  isPopular?: boolean;
  securityFeature: string;
}

export type ModalTab = 'providers' | 'networks' | 'qrcode' | 'session';

export const WalletConnectionModal: React.FC = () => {
  const {
    isConnectModalOpen,
    closeConnectModal,
    isConnected,
    address,
    walletType,
    chainId,
    balances,
    isDemoMode,
    isWatchOnly,
    connectWallet,
    switchWallet,
    disconnectWallet,
    switchChain,
    impersonateAddress,
    discoveredProviders,
    recentAccounts,
    removeRecentAccount,
    sandboxAccounts,
    activeSandboxIndex,
    switchSandboxAccount,
    authenticateSiwe,
    isSiweAuthenticated
  } = useWallet();

  const { addToast } = useExchange();
  const { t } = useI18n();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ModalTab>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Connection & Execution States
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectingStep, setConnectingStep] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [switchingChainId, setSwitchingChainId] = useState<ChainId | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedWcUri, setCopiedWcUri] = useState(false);
  const [wcUri, setWcUri] = useState<string>('');
  const [isWcPairing, setIsWcPairing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [manualAddressInput, setManualAddressInput] = useState('');
  const [showWatchOnlyInput, setShowWatchOnlyInput] = useState(false);

  // Detect installed browser extensions
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

    // Integrate EIP-6963 multi-provider discovery
    discoveredProviders.forEach((dp) => {
      const rdns = dp.info.rdns.toLowerCase();
      if (rdns.includes('metamask')) detected.metamask = true;
      if (rdns.includes('rabby')) detected.rabby = true;
      if (rdns.includes('coinbase')) detected.coinbase = true;
      if (rdns.includes('phantom')) detected.phantom = true;
      if (rdns.includes('okx') || rdns.includes('okex')) detected.okx = true;
      if (rdns.includes('trust')) detected.trust = true;
      if (rdns.includes('rainbow')) detected.rainbow = true;
    });

    setInstalledMap(detected);
  }, [isConnectModalOpen, discoveredProviders]);

  // Generate dynamic simulated WalletConnect v2 pairing URI on modal open
  useEffect(() => {
    if (isConnectModalOpen) {
      const topic = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setWcUri(`wc:${topic}@2?relay-protocol=irn&symKey=${symKey}`);
      setConnectionError(null);
      setConnectingId(null);
      setConnectingStep('');
      
      // If already connected, default tab to session management or providers
      if (isConnected) {
        setActiveTab('session');
      } else {
        setActiveTab('providers');
      }
    }
  }, [isConnectModalOpen, isConnected]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnectModalOpen) {
        closeConnectModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnectModalOpen, closeConnectModal]);

  // Providers list with primary support for MetaMask, WalletConnect, Coinbase, Rabby
  const providers: WalletProviderInfo[] = useMemo(() => [
    {
      id: 'metamask',
      name: 'MetaMask',
      shortDesc: 'The gold standard Web3 wallet with 30M+ active users',
      badge: installedMap.metamask ? 'INSTALLED' : 'MOST POPULAR',
      badgeType: installedMap.metamask ? 'success' : 'primary',
      iconUrl: 'https://assets.coingecko.com/markets/images/681/small/metamask.png',
      installUrl: 'https://metamask.io/download/',
      isPopular: true,
      securityFeature: 'EIP-1193 & Hardware Ledger Compatible',
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      shortDesc: 'Designed for DeFi users with instant pre-sign risk scanning',
      badge: installedMap.rabby ? 'INSTALLED' : 'DEFI SECURITY PRO',
      badgeType: installedMap.rabby ? 'success' : 'info',
      iconUrl: 'https://assets.coingecko.com/markets/images/1284/small/rabby.png',
      installUrl: 'https://rabby.io/',
      isPopular: true,
      securityFeature: 'Simulates transaction execution balance impact',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      shortDesc: 'Self-custody & Smart Wallet with passkey biometrics',
      badge: installedMap.coinbase ? 'INSTALLED' : 'PASSKEY READY',
      badgeType: installedMap.coinbase ? 'success' : 'warning',
      iconUrl: 'https://assets.coingecko.com/markets/images/569/small/coinbase.png',
      installUrl: 'https://www.coinbase.com/wallet',
      isPopular: true,
      securityFeature: 'Institutional MPC & Passkey Biometric Login',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2',
      shortDesc: 'Pair with 300+ mobile EVM wallets via QR code or universal link',
      badge: 'MOBILE QR',
      badgeType: 'info',
      iconUrl: 'https://assets.coingecko.com/coins/images/23307/small/walletconnect.png',
      installUrl: 'https://walletconnect.com/',
      isPopular: true,
      securityFeature: 'Encrypted relay-protocol with zero private key leak',
    },
    {
      id: 'okx',
      name: 'OKX Web3 Wallet',
      shortDesc: 'Multi-chain decentralized powerhouse with DEX aggregator',
      badge: installedMap.okx ? 'INSTALLED' : 'MULTI-CHAIN',
      badgeType: installedMap.okx ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/96/small/okx.png',
      installUrl: 'https://www.okx.com/web3',
      securityFeature: 'MPC Sharded key infrastructure',
    },
    {
      id: 'phantom',
      name: 'Phantom EVM',
      shortDesc: 'Ultra-fast multi-chain wallet for Ethereum, Base, and Solana',
      badge: installedMap.phantom ? 'INSTALLED' : undefined,
      badgeType: installedMap.phantom ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/21800/small/phantom.png',
      installUrl: 'https://phantom.app/',
      securityFeature: 'Real-time malicious contract blocker',
    },
    {
      id: 'rainbow',
      name: 'Rainbow Wallet',
      shortDesc: 'Fun, colorful and delightful Ethereum & L2 wallet experience',
      badge: installedMap.rainbow ? 'INSTALLED' : undefined,
      badgeType: installedMap.rainbow ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: 'https://rainbow.me/',
      securityFeature: 'Optimized for mobile DeFi & ENS profiles',
    },
    {
      id: 'sandbox',
      name: 'Simulated Sandbox Account',
      shortDesc: 'High-balance institutional test accounts with simulated gas & liquidity',
      badge: 'ZERO RISK',
      badgeType: 'warning',
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: '#',
      securityFeature: 'Full RPC sandbox simulation with 100+ ETH liquidity',
    },
  ], [installedMap]);

  // Filter providers by search query
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
    );
  }, [providers, searchQuery]);

  // Current chain configuration
  const currentChainConfig = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.ethereum;

  // Handle Provider Connect Execution
  const handleConnectProvider = async (provider: WalletProviderInfo) => {
    soundManager.playTick();
    setConnectionError(null);
    setConnectingId(provider.id);

    // If WalletConnect, open QR Code tab for visual guidance
    if (provider.id === 'walletconnect') {
      setActiveTab('qrcode');
      setConnectingId(null);
      return;
    }

    // If extension is not installed, open download link and show helpful notice
    if (
      provider.id !== 'sandbox' &&
      provider.id !== 'injected' &&
      !installedMap[provider.id as string] &&
      provider.installUrl !== '#'
    ) {
      setConnectingStep('Extension not detected. Opening download portal...');
      window.open(provider.installUrl, '_blank', 'noopener,noreferrer');
      setConnectingId(null);
      addToast({
        title: `${provider.name} Not Found`,
        message: `Vui lòng cài đặt tiện ích mở rộng ${provider.name} hoặc dùng Sandbox / WalletConnect.`,
        type: 'warning',
      });
      return;
    }

    try {
      setConnectingStep('Initializing EIP-1193 handshake...');
      await new Promise((r) => setTimeout(r, 400));

      setConnectingStep('Requesting account access & signature permission...');

      if (isConnected) {
        // If already connected, use seamless wallet switch
        await switchWallet(provider.id);
      } else {
        await connectWallet(provider.id);
      }

      soundManager.playSuccess();
      addToast({
        title: 'Kết nối ví thành công',
        message: `Đã liên kết an toàn với ${provider.name}.`,
        type: 'success',
      });
      closeConnectModal();
    } catch (err: any) {
      soundManager.playAlert();
      const msg = err?.message || 'Kết nối bị từ chối bởi người dùng.';
      setConnectionError(msg);
      addToast({
        title: 'Kết nối thất bại',
        message: msg,
        type: 'error',
      });
    } finally {
      setConnectingId(null);
      setConnectingStep('');
    }
  };

  // Handle Chain Switch
  const handleChainSwitch = async (targetChainId: ChainId) => {
    soundManager.playTick();
    if (targetChainId === chainId) return;

    setSwitchingChainId(targetChainId);
    try {
      await switchChain(targetChainId);
      soundManager.playSuccess();
      addToast({
        title: 'Chuyển mạng thành công',
        message: `Đã kết nối với ${SUPPORTED_CHAINS[targetChainId]?.name}.`,
        type: 'success',
      });
    } catch (err: any) {
      soundManager.playAlert();
      addToast({
        title: 'Không thể chuyển mạng',
        message: err?.message || 'Yêu cầu chuyển mạng bị từ chối trên ví.',
        type: 'error',
      });
    } finally {
      setSwitchingChainId(null);
    }
  };

  // Handle Wallet Disconnection
  const handleDisconnect = async (zeroTrust: boolean = false) => {
    soundManager.playTick();
    setIsDisconnecting(true);
    try {
      await disconnectWallet({ zeroTrust });
      soundManager.playSuccess();
      addToast({
        title: zeroTrust ? 'Zero-Trust Purge Hoàn Tất' : 'Đã ngắt kết nối ví',
        message: zeroTrust
          ? 'Đã thu hồi token approvals, xóa nonce chữ ký và làm sạch toàn bộ cache.'
          : 'Phiên làm việc Web3 đã đóng an toàn.',
        type: zeroTrust ? 'warning' : 'info',
      });
      closeConnectModal();
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Copy full wallet address
  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    soundManager.playTick();
    setTimeout(() => setCopiedAddress(false), 2000);
    addToast({
      title: 'Đã sao chép địa chỉ',
      message: `${address} đã lưu vào bộ nhớ tạm.`,
      type: 'info',
    });
  };

  // Copy simulated WalletConnect URI
  const handleCopyWcUri = () => {
    navigator.clipboard.writeText(wcUri);
    setCopiedWcUri(true);
    soundManager.playTick();
    setTimeout(() => setCopiedWcUri(false), 2000);
    addToast({
      title: 'URI Copied',
      message: 'WalletConnect pairing URI copied to clipboard.',
      type: 'info',
    });
  };

  // Simulate mobile scan pairing
  const handleSimulateWcPair = async () => {
    setIsWcPairing(true);
    soundManager.playTick();
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await connectWallet('walletconnect');
      soundManager.playSuccess();
      addToast({
        title: 'WalletConnect Paired',
        message: 'Mobile session paired via secure relay protocol.',
        type: 'success',
      });
      closeConnectModal();
    } finally {
      setIsWcPairing(false);
    }
  };

  if (!isConnectModalOpen) return null;

  const modalNode = (
    <div
      id="wallet-connection-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={closeConnectModal}
    >
      <div
        id="wallet-connection-modal-container"
        className="w-full max-w-2xl bg-[#090C15] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/70 overflow-hidden flex flex-col my-auto relative text-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Quantum Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#0C101C]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Web3 Wallet Gateway
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                  EIP-1193 & v2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isConnected
                  ? `Đang kết nối: ${shortenAddress(address, 5)} (${walletType?.toUpperCase() || 'EVM'})`
                  : 'Kết nối ví Web3 non-custodial để giao dịch bảo mật tuyệt đối'}
              </p>
            </div>
          </div>

          <button
            onClick={closeConnectModal}
            id="close-wallet-connection-modal-btn"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng cửa sổ (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION SUB-BAR (TABS) */}
        <div className="flex items-center px-5 sm:px-6 border-b border-white/[0.06] bg-[#070A11] gap-1 overflow-x-auto text-xs font-semibold py-2 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'providers'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Danh Sách Ví (Providers)</span>
          </button>

          <button
            onClick={() => setActiveTab('networks')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'networks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mạng Lưới (Chains)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
              {currentChainConfig.shortName}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('qrcode')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'qrcode'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Mã QR Mobile</span>
          </button>

          {isConnected && (
            <button
              onClick={() => setActiveTab('session')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto ${
                activeTab === 'session'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản Trị Phiên (Session)</span>
            </button>
          )}
        </div>

        {/* MODAL MAIN CONTENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* TAB 1: WALLET PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm ví (MetaMask, Rabby, OKX...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0E1322] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    EIP-6963 Auto-Detect
                  </span>
                  <span>•</span>
                  <span className="text-cyan-400 font-bold">{filteredProviders.length} Ví Khả Dụng</span>
                </div>
              </div>

              {/* Connecting Step Loading Indicator */}
              {connectingId && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Đang thực hiện bắt tay Web3...</div>
                    <div className="text-[11px] text-cyan-300 font-mono">{connectingStep || 'Chờ phê duyệt từ ví extension...'}</div>
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {connectionError && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-rose-300">Không thể hoàn tất kết nối</div>
                    <div className="text-rose-200/80 mt-0.5">{connectionError}</div>
                  </div>
                  <button
                    onClick={() => setConnectionError(null)}
                    className="text-rose-400 hover:text-rose-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Providers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProviders.map((provider) => {
                  const isCurrent = isConnected && walletType === provider.id;
                  const isPending = connectingId === provider.id;

                  return (
                    <div
                      key={provider.id}
                      onClick={() => !isPending && handleConnectProvider(provider)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                          : isPending
                          ? 'bg-blue-950/40 border-cyan-400 animate-pulse'
                          : 'bg-[#0B0F1B] border-white/5 hover:border-cyan-500/30 hover:bg-[#0E1526]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#060810] border border-white/10 p-2 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <img
                              src={provider.iconUrl}
                              alt={provider.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {provider.name}
                              </h3>
                              {provider.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                                    provider.badgeType === 'success'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : provider.badgeType === 'warning'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  }`}
                                >
                                  {provider.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {provider.shortDesc}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ĐANG DÙNG
                          </span>
                        ) : isPending ? (
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        )}
                      </div>

                      {/* Security Micro-Badge */}
                      <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Shield className="w-3 h-3 text-cyan-500/70" />
                          {provider.securityFeature}
                        </span>
                        <span className="text-cyan-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          {isConnected ? 'Chuyển ví →' : 'Kết nối →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sandbox Multi-Account Quick Selector */}
              <div className="p-4 rounded-2xl bg-[#0B0F1B] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white">Tài Khoản Sandbox Mô Phỏng Định Chế (Zero Risk)</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Testnet & Demo RPC</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {sandboxAccounts.map((acc, idx) => (
                    <button
                      key={acc.address}
                      onClick={() => {
                        switchSandboxAccount(idx);
                        connectWallet('sandbox');
                        soundManager.playSuccess();
                        addToast({
                          title: 'Sandbox Activated',
                          message: `Đã kích hoạt ví mô phỏng: ${acc.name}`,
                          type: 'success',
                        });
                        closeConnectModal();
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer ${
                        walletType === 'sandbox' && activeSandboxIndex === idx
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{acc.name}</span>
                        <span className="text-[9px] px-1 rounded bg-white/10">{acc.tag}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">{shortenAddress(acc.address, 4)}</div>
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        {acc.balances.ETH} ETH • ${acc.balances.USDC?.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Watch-Only Address & Recent Accounts */}
              <div className="p-4 rounded-2xl bg-[#0B0F1B] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">Chế Độ Xem Ví (Watch-Only Address)</h4>
                  </div>
                  <button
                    onClick={() => setShowWatchOnlyInput(!showWatchOnlyInput)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    {showWatchOnlyInput ? 'Ẩn' : '+ Nhập địa chỉ ví'}
                  </button>
                </div>

                {showWatchOnlyInput && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="0x... hoặc vitalik.eth"
                      value={manualAddressInput}
                      onChange={(e) => setManualAddressInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={() => {
                        if (!manualAddressInput.trim()) return;
                        impersonateAddress(manualAddressInput.trim(), 'Watch-Only Account');
                        soundManager.playSuccess();
                        addToast({
                          title: 'Chế độ xem kích hoạt',
                          message: `Đang theo dõi ví ${shortenAddress(manualAddressInput.trim(), 5)}`,
                          type: 'info',
                        });
                        setManualAddressInput('');
                        setShowWatchOnlyInput(false);
                        closeConnectModal();
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs cursor-pointer transition-all shrink-0"
                    >
                      Kết Nối Xem
                    </button>
                  </div>
                )}

                {recentAccounts.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Ví đã kết nối gần đây</div>
                    <div className="flex flex-wrap gap-2">
                      {recentAccounts.map((ra) => (
                        <div
                          key={ra.address}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono"
                        >
                          <button
                            onClick={() => {
                              impersonateAddress(ra.address, ra.name || 'Recent Account');
                              soundManager.playSuccess();
                              closeConnectModal();
                            }}
                            className="text-slate-300 hover:text-cyan-300 cursor-pointer"
                          >
                            {shortenAddress(ra.address, 4)} ({ra.type})
                          </button>
                          <button
                            onClick={() => removeRecentAccount(ra.address)}
                            className="text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                            title="Xóa khỏi danh sách"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK / CHAIN SWITCHING */}
          {activeTab === 'networks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    Tích Hợp Chuyển Đổi Mạng Lưới (Chain Switching)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ EIP-3326 & EIP-3085 để chuyển mạng tức thì và tự động thêm RPC vào ví.
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Mạng hiện tại: {currentChainConfig.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(SUPPORTED_CHAINS).map((chain) => {
                  const isCurrent = chainId === chain.id;
                  const isSwitching = switchingChainId === chain.id;

                  return (
                    <div
                      key={chain.id}
                      onClick={() => !isSwitching && handleChainSwitch(chain.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                          : isSwitching
                          ? 'bg-indigo-950/40 border-indigo-400 animate-pulse'
                          : 'bg-[#0B0F1B] border-white/5 hover:border-cyan-500/30 hover:bg-[#0E1526]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ChainLogo chainId={chain.id} className="w-9 h-9" />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{chain.name}</span>
                            {chain.isL2 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                                Layer 2
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>Gas: {chain.nativeCurrency.symbol}</span>
                            <span>•</span>
                            <span>Block: {chain.blockTimeSec}s</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> ACTIVE
                          </span>
                        ) : isSwitching ? (
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <button className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-semibold border border-white/10 transition-colors">
                            Chuyển sang →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: WALLETCONNECT QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center py-2">
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mx-auto flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Quét Bằng Bất Kỳ Ứng Dụng Ví EVM Mobile Nào</h3>
                <p className="text-xs text-slate-400">
                  Mở ứng dụng MetaMask, Rabby Mobile, Trust Wallet hoặc OKX trên điện thoại và quét mã QR WalletConnect v2 này:
                </p>
              </div>

              {/* Dynamic QR Display Box */}
              <div className="w-56 h-56 mx-auto p-4 rounded-3xl bg-white border-4 border-cyan-400/40 shadow-2xl flex flex-col items-center justify-center relative group">
                <div className="w-full h-full bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* High fidelity QR mock grid */}
                  <div className="w-full h-full border border-cyan-400/30 rounded-xl p-2 flex flex-col justify-between items-center text-cyan-400">
                    <div className="flex justify-between w-full">
                      <div className="w-7 h-7 border-4 border-cyan-400 rounded-lg p-1">
                        <div className="w-full h-full bg-cyan-400 rounded-sm" />
                      </div>
                      <div className="w-7 h-7 border-4 border-cyan-400 rounded-lg p-1">
                        <div className="w-full h-full bg-cyan-400 rounded-sm" />
                      </div>
                    </div>
                    <div className="p-1 text-center">
                      <QrCode className="w-10 h-10 text-cyan-300 mx-auto animate-pulse" />
                      <span className="text-[8px] font-mono text-cyan-400 tracking-tighter">WC v2 RELAY</span>
                    </div>
                    <div className="flex justify-between w-full">
                      <div className="w-7 h-7 border-4 border-cyan-400 rounded-lg p-1">
                        <div className="w-full h-full bg-cyan-400 rounded-sm" />
                      </div>
                      <div className="w-4 h-4 bg-cyan-400 rounded-sm self-end" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy URI and Simulate Pair Action Buttons */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyWcUri}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedWcUri ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedWcUri ? 'Đã sao chép Pairing URI' : 'Sao chép WalletConnect URI'}</span>
                  </button>

                  <button
                    onClick={handleSimulateWcPair}
                    disabled={isWcPairing}
                    className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-900/30 disabled:opacity-50"
                  >
                    {isWcPairing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>{isWcPairing ? 'Đang ghép đôi...' : 'Giả Lập Ghép Đôi'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Chuẩn kết nối mã hóa End-to-End Relay Protocol v2
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE SESSION & DISCONNECT / ZERO-TRUST */}
          {activeTab === 'session' && isConnected && (
            <div className="space-y-4">
              {/* Account Overview Header */}
              <div className="p-4 rounded-2xl bg-[#0B0F1B] border border-cyan-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-mono font-black text-black">
                      {address ? address.slice(2, 4).toUpperCase() : 'W3'}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-mono uppercase">Địa chỉ ví đang liên kết</div>
                      <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                        <span>{address}</span>
                        <button
                          onClick={handleCopyAddress}
                          className="p-1 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer"
                          title="Sao chép địa chỉ"
                        >
                          {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {walletType?.toUpperCase() || 'INJECTED'}
                  </span>
                </div>

                {/* Balances Snippet */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400">ETH Balance</div>
                    <div className="font-bold text-white">{balances.ETH?.toFixed(4) || '0.00'} ETH</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400">USDC Liquidity</div>
                    <div className="font-bold text-cyan-300">${balances.USDC?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400">SIWE Security</div>
                    <div className={`font-bold ${isSiweAuthenticated ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isSiweAuthenticated ? 'VERIFIED' : 'NOT SIGNED'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400">Mạng lưới</div>
                    <div className="font-bold text-indigo-300">{currentChainConfig.shortName}</div>
                  </div>
                </div>
              </div>

              {/* SIWE Authenticate Action if unsigned */}
              {!isSiweAuthenticated && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Xác thực SIWE (Sign-In with Ethereum)</div>
                      <div className="text-[11px] text-indigo-200">Ký nonce cryptographically để bảo vệ phiên làm việc và chống phishing.</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await authenticateSiwe();
                      if (ok) {
                        soundManager.playSuccess();
                        addToast({
                          title: 'SIWE Authenticated',
                          message: 'Chữ ký EIP-4361 hợp lệ đã được xác nhận.',
                          type: 'success',
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Ký Ngay
                  </button>
                </div>
              )}

              {/* DISCONNECT & PURGE SECTION */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Tùy Chọn Ngắt Kết Nối & Thanh Lọc Bảo Mật</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Standard Disconnect */}
                  <button
                    onClick={() => handleDisconnect(false)}
                    disabled={isDisconnecting}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="text-left">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <LogOut className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ngắt Kết Nối Tiêu Chuẩn</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Đóng phiên RPC, giữ nguyên các token approvals đã lưu.
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-white/10 font-mono">Clean Exit</span>
                  </button>

                  {/* Zero-Trust Purge */}
                  <button
                    onClick={() => handleDisconnect(true)}
                    disabled={isDisconnecting}
                    className="p-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="text-left">
                      <div className="font-bold text-rose-300 flex items-center gap-1.5">
                        <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                        <span>Xóa Phiên Zero-Trust</span>
                      </div>
                      <div className="text-[10px] text-rose-300/80 mt-0.5">
                        Thu hồi toàn bộ allowance, xóa chữ ký SIWE & sạch cache.
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                      Purge All
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/[0.08] bg-[#070A11] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Non-Custodial: Khóa riêng tư (private keys) không bao giờ rời khỏi thiết bị của bạn.</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-sans"
            >
              Tìm hiểu về ví Web3 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
