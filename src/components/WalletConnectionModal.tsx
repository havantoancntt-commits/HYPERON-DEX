import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet, SupportedWalletType } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { isWalletInstalled } from '../lib/wallet/providerDiscovery';
import { walletConnectManager } from '../lib/wallet/walletConnectManager';
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
  Globe,
  AlertCircle,
  ChevronRight,
  Smartphone,
  Radio,
  Layers,
  Cpu,
  Terminal,
  ChevronLeft
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
  deepLinkUrl?: string;
  isPopular?: boolean;
  securityFeature: string;
  category: 'popular' | 'mobile' | 'institutional' | 'extension';
}

export type ModalTab = 'providers' | 'networks' | 'qrcode' | 'watch_only' | 'session';

export const WalletConnectionModal: React.FC = () => {
  const {
    isConnectModalOpen,
    closeConnectModal,
    isConnected,
    address,
    walletType,
    chainId,
    balances,
    isWatchOnly,
    connectWallet,
    switchWallet,
    disconnectWallet,
    switchChain,
    connectWatchOnly,
    discoveredProviders,
    recentAccounts,
    removeRecentAccount,
    authenticateSiwe,
    isSiweAuthenticated
  } = useWallet();

  const { addToast } = useExchange();
  const { t } = useI18n();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ModalTab>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'installed' | 'popular' | 'mobile'>('all');
  const [selectedAssistantWallet, setSelectedAssistantWallet] = useState<WalletProviderInfo | null>(null);
  
  // Connection & Execution States
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectingStep, setConnectingStep] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [switchingChainId, setSwitchingChainId] = useState<ChainId | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedWcUri, setCopiedWcUri] = useState(false);
  const [wcUri, setWcUri] = useState<string>('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [manualAddressInput, setManualAddressInput] = useState('');

  // Detect installed browser extensions via EIP-6963 discovery + window globals
  const installedMap = useMemo<Record<string, boolean>>(() => {
    const detected: Record<string, boolean> = {
      walletconnect: true,
      injected: Boolean(typeof window !== 'undefined' && (window as any).ethereum),
    };
    const supportedList: SupportedWalletType[] = [
      'rabby', 'metamask', 'trust', 'coinbase', 'okx', 'phantom',
      'binance', 'rainbow', 'bitget', 'brave', 'safe', 'kraken',
      'exodus', 'backpack', 'uniswap', 'onekey', 'zerion'
    ];
    supportedList.forEach((t) => {
      detected[t as string] = isWalletInstalled(t, discoveredProviders);
    });
    return detected;
  }, [discoveredProviders]);

  // Real WalletConnect v2 pairing URI generation & session listeners
  useEffect(() => {
    if (isConnectModalOpen) {
      setConnectionError(null);
      setConnectingId(null);
      setConnectingStep('');
      setSelectedAssistantWallet(null);
      setActiveTab(isConnected ? 'session' : 'providers');

      // Proactively prepare real WalletConnect pairing URI from relay
      walletConnectManager.initiatePairing((uri) => {
        setWcUri(uri);
      }).catch((err) => {
        console.warn('WalletConnect pairing initiation:', err);
      });
    }
  }, [isConnectModalOpen, isConnected]);

  // Listen to broadcast WalletConnect events
  useEffect(() => {
    const handleUri = (e: any) => {
      if (e.detail?.uri) {
        setWcUri(e.detail.uri);
      }
    };
    window.addEventListener('hyperon:wc_uri', handleUri);
    return () => window.removeEventListener('hyperon:wc_uri', handleUri);
  }, []);

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

  // Master Providers Registry (100% Real Web3 Wallets, ZERO simulation)
  const providers: WalletProviderInfo[] = useMemo(() => [
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      shortDesc: 'Ví DeFi bảo mật hàng đầu với tính năng mô phỏng rủi ro trước khi ký giao dịch',
      badge: installedMap.rabby ? 'ĐÃ CÀI ĐẶT' : 'KHUYÊN DÙNG CHO DEFI',
      badgeType: installedMap.rabby ? 'success' : 'primary',
      iconUrl: 'https://assets.coingecko.com/markets/images/1284/small/rabby.png',
      installUrl: 'https://rabby.io/',
      isPopular: true,
      category: 'popular',
      securityFeature: 'Mô phỏng thay đổi số dư và phát hiện mã độc smart contract trước khi ký',
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      shortDesc: 'Ví Web3 tiêu chuẩn toàn cầu trên di động và tiện ích mở rộng trình duyệt',
      badge: installedMap.metamask ? 'ĐÃ CÀI ĐẶT' : 'PHỔ BIẾN TOÀN CẦU',
      badgeType: installedMap.metamask ? 'success' : 'primary',
      iconUrl: 'https://assets.coingecko.com/markets/images/681/small/metamask.png',
      installUrl: 'https://metamask.io/download/',
      deepLinkUrl: typeof window !== 'undefined' ? `https://metamask.app.link/dapp/${window.location.host + window.location.pathname}` : undefined,
      isPopular: true,
      category: 'popular',
      securityFeature: 'Chuẩn EIP-1193 & Tương thích ví phần cứng Ledger / Trezor',
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      shortDesc: 'Ví Web3 phi tập trung chính thức đa chuỗi 70M+ người dùng, bảo mật tuyệt đối',
      badge: installedMap.trust ? 'ĐÃ CÀI ĐẶT' : 'TOP MOBILE',
      badgeType: installedMap.trust ? 'success' : 'info',
      iconUrl: 'https://assets.coingecko.com/coins/images/11085/small/Trust.png',
      installUrl: 'https://trustwallet.com/download',
      deepLinkUrl: typeof window !== 'undefined' ? `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}` : undefined,
      isPopular: true,
      category: 'popular',
      securityFeature: 'Bảo mật 100% Non-Custodial, mã hóa sinh trắc học & kiểm toán CertiK',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet & Smart Wallet',
      shortDesc: 'Ví tự lưu ký thế hệ mới với công nghệ Passkey sinh trắc học FaceID/Vân tay',
      badge: installedMap.coinbase ? 'ĐÃ CÀI ĐẶT' : 'PASSKEY READY',
      badgeType: installedMap.coinbase ? 'success' : 'warning',
      iconUrl: 'https://assets.coingecko.com/markets/images/569/small/coinbase.png',
      installUrl: 'https://www.coinbase.com/wallet',
      deepLinkUrl: typeof window !== 'undefined' ? `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}` : undefined,
      isPopular: true,
      category: 'popular',
      securityFeature: 'Đăng nhập sinh trắc học Passkey chuẩn ERC-4337 Account Abstraction',
    },
    {
      id: 'binance',
      name: 'Binance Web3 Wallet',
      shortDesc: 'Cổng kết nối phi tập trung chính thức từ Binance với bảo mật phân mảnh MPC',
      badge: installedMap.binance ? 'ĐÃ CÀI ĐẶT' : 'MPC SECURITY',
      badgeType: installedMap.binance ? 'success' : 'primary',
      iconUrl: 'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
      installUrl: 'https://www.binance.com/vi/web3wallet',
      isPopular: true,
      category: 'popular',
      securityFeature: 'Công nghệ Multi-Party Computation không lưu khóa riêng lẻ',
    },
    {
      id: 'okx',
      name: 'OKX Web3 Wallet',
      shortDesc: 'Hệ sinh thái ví Web3 đa chuỗi mạnh mẽ hàng đầu cho DeFi và NFT',
      badge: installedMap.okx ? 'ĐÃ CÀI ĐẶT' : undefined,
      badgeType: installedMap.okx ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/96/small/okx.png',
      installUrl: 'https://www.okx.com/web3',
      deepLinkUrl: typeof window !== 'undefined' ? `okx://wallet/dapp/details?dappUrl=${encodeURIComponent(window.location.href)}` : undefined,
      isPopular: true,
      category: 'popular',
      securityFeature: 'MPC Sharded key & phát hiện mã độc hợp đồng thông minh',
    },
    {
      id: 'phantom',
      name: 'Phantom EVM',
      shortDesc: 'Trải nghiệm đa chuỗi siêu tốc cho Ethereum, Base, Polygon và Solana',
      badge: installedMap.phantom ? 'ĐÃ CÀI ĐẶT' : undefined,
      badgeType: installedMap.phantom ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/21800/small/phantom.png',
      installUrl: 'https://phantom.app/',
      deepLinkUrl: typeof window !== 'undefined' ? `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.host)}` : undefined,
      category: 'popular',
      securityFeature: 'Chặn giao dịch lừa đảo thời gian thực & cảnh báo mã độc',
    },
    {
      id: 'rainbow',
      name: 'Rainbow Wallet',
      shortDesc: 'Giao diện mượt mà, tối ưu hàng đầu cho Ethereum & các giải pháp Layer 2',
      badge: installedMap.rainbow ? 'ĐÃ CÀI ĐẶT' : undefined,
      badgeType: installedMap.rainbow ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: 'https://rainbow.me/',
      deepLinkUrl: typeof window !== 'undefined' ? `https://rnbwapp.com/ul/dapp?url=${encodeURIComponent(window.location.href)}` : undefined,
      category: 'mobile',
      securityFeature: 'Tối ưu hóa ENS và quản lý tài sản L2 tốc độ cao',
    },
    {
      id: 'bitget',
      name: 'Bitget Wallet (BitKeep)',
      shortDesc: 'Ví phi tập trung toàn cầu với hơn 19M người dùng và swap cross-chain',
      badge: installedMap.bitget ? 'ĐÃ CÀI ĐẶT' : undefined,
      badgeType: installedMap.bitget ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/825/small/bitget.png',
      installUrl: 'https://web3.bitget.com/',
      deepLinkUrl: typeof window !== 'undefined' ? `https://bkcode.vip?action=dapp&url=${encodeURIComponent(window.location.href)}` : undefined,
      category: 'popular',
      securityFeature: 'Quỹ bảo vệ tài sản $300M & kiểm toán bảo mật hợp đồng',
    },
    {
      id: 'brave',
      name: 'Brave Wallet',
      shortDesc: 'Ví nguyên bản tích hợp trực tiếp vào nhân trình duyệt Brave',
      badge: installedMap.brave ? 'ĐÃ CÀI ĐẶT' : undefined,
      badgeType: installedMap.brave ? 'success' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/677/small/basic-attention-token.png',
      installUrl: 'https://brave.com/wallet/',
      category: 'extension',
      securityFeature: 'Chạy trực tiếp ở nhân C++, miễn nhiễm mã độc extension',
    },
    {
      id: 'safe',
      name: 'Safe Multisig (Gnosis)',
      shortDesc: 'Ví hợp đồng thông minh đa chữ ký tiêu chuẩn cho tổ chức và quỹ đầu tư',
      badge: installedMap.safe ? 'ĐÃ CÀI ĐẶT' : 'DOANH NGHIỆP',
      badgeType: 'warning',
      iconUrl: 'https://assets.coingecko.com/coins/images/28148/small/safe.png',
      installUrl: 'https://app.safe.global/',
      category: 'institutional',
      securityFeature: 'Yêu cầu M-of-N chữ ký xác thực, bảo vệ quỹ tuyệt đối',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2 Protocol',
      shortDesc: 'Ghép nối qua mã QR với hơn 300+ ví di động trên iOS và Android',
      badge: 'QUÉT QR / MOBILE',
      badgeType: 'info',
      iconUrl: 'https://assets.coingecko.com/coins/images/23307/small/walletconnect.png',
      installUrl: 'https://walletconnect.com/',
      isPopular: true,
      category: 'mobile',
      securityFeature: 'Mã hóa đầu cuối End-to-End Encryption không bao giờ rò rỉ khóa',
    },
    {
      id: 'injected',
      name: 'Trình Duyệt Web3 Mặc Định',
      shortDesc: 'Tự động phát hiện bất kỳ tiện ích hoặc ứng dụng Web3 nào đang hoạt động',
      badge: 'TỰ ĐỘNG',
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      installUrl: 'https://ethereum.org/en/wallets/find-wallet/',
      category: 'extension',
      securityFeature: 'Tuân thủ nghiêm ngặt tiêu chuẩn EIP-6963 và EIP-1193',
    },
  ], [installedMap]);

  // Split into: Installed & Ready (at the top) vs Available
  const { installedProviders, otherProviders } = useMemo(() => {
    let list = providers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDesc.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          p.securityFeature?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'installed') {
      return {
        installedProviders: list.filter((p) => installedMap[p.id as string]),
        otherProviders: [],
      };
    } else if (selectedCategory === 'popular') {
      list = list.filter((p) => p.isPopular);
    } else if (selectedCategory === 'mobile') {
      list = list.filter((p) => p.category === 'mobile' || p.deepLinkUrl || p.id === 'walletconnect');
    }

    const installed = list.filter((p) => p.id !== 'walletconnect' && installedMap[p.id as string]);
    const others = list.filter((p) => p.id === 'walletconnect' || !installedMap[p.id as string]);

    return { installedProviders: installed, otherProviders: others };
  }, [providers, installedMap, searchQuery, selectedCategory]);

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

    // If this wallet extension is not detected in browser, show intelligent assistant
    if (
      provider.id !== 'injected' &&
      !installedMap[provider.id as string]
    ) {
      setSelectedAssistantWallet(provider);
      setConnectingId(null);
      return;
    }

    try {
      setConnectingStep(`Đang yêu cầu kết nối với ${provider.name}...`);
      await new Promise((r) => setTimeout(r, 150));

      setConnectingStep('Vui lòng xác nhận quyền truy cập trong tiện ích ví của bạn...');

      if (isConnected) {
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
      const msg = err?.message || 'Kết nối bị từ chối';
      
      // Friendly handling for user cancel or timeout
      if (err?.code === 4001 || msg.includes('hủy') || msg.includes('User rejected')) {
        soundManager.playTick();
        setConnectionError('Yêu cầu kết nối đã bị hủy trong ví của bạn.');
      } else if (err?.code === -32002 || msg.includes('chờ phê duyệt')) {
        setConnectionError('Yêu cầu kết nối đang chờ xác nhận trong ví. Vui lòng mở tiện ích ví của bạn.');
      } else if (
        msg.includes('chưa được cài đặt') ||
        msg.includes('Không tìm thấy') ||
        msg.includes('not installed')
      ) {
        setSelectedAssistantWallet(provider);
      } else {
        soundManager.playAlert();
        setConnectionError(msg);
      }
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
        title: 'Chuyển mạng thất bại',
        message: err?.message || 'Không thể chuyển mạng blockchain.',
        type: 'error',
      });
    } finally {
      setSwitchingChainId(null);
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    soundManager.playTick();
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyWc = () => {
    if (!wcUri) return;
    navigator.clipboard.writeText(wcUri);
    setCopiedWcUri(true);
    soundManager.playTick();
    setTimeout(() => setCopiedWcUri(false), 2000);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      soundManager.playTick();
      addToast({
        title: 'Đã ngắt kết nối',
        message: 'Ví Web3 đã được ngắt kết nối an toàn.',
        type: 'info',
      });
      closeConnectModal();
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!isConnectModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-3xl bg-[#080C14] border border-cyan-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#06090F] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {isConnected ? 'Quản Lý Kết Nối Ví' : 'Kết Nối Ví Web3'}
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
                  NON-CUSTODIAL
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isConnected
                  ? `Đang kết nối: ${shortenAddress(address, 6)} trên ${currentChainConfig.name}`
                  : 'Hỗ trợ EIP-6963 đa ví, mã hóa đầu cuối và private mempool Flashbots'}
              </p>
            </div>
          </div>

          <button
            onClick={closeConnectModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2 border-b border-white/[0.06] bg-black/40 text-xs font-mono relative z-10 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'providers', label: 'Danh Sách Ví', icon: Wallet },
              { id: 'qrcode', label: 'Quét Mã QR (WalletConnect)', icon: QrCode },
              { id: 'networks', label: 'Mạng Blockchain', icon: Globe },
              { id: 'watch_only', label: 'Theo Dõi Ví (Watch-Only)', icon: Lock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ModalTab);
                  setSelectedAssistantWallet(null);
                  soundManager.playTick();
                }}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {isConnected && (
            <div className="flex items-center gap-2 pl-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-emerald-400 font-bold hidden sm:inline">ONLINE</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 relative z-10">
          {/* Connecting Active Overlay */}
          {connectingId && (
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-3.5 text-xs animate-in fade-in">
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-white">Đang Khởi Tạo Kết Nối Web3...</div>
                <div className="text-slate-300 text-[11px] mt-0.5">{connectingStep || 'Vui lòng kiểm tra và phê duyệt trong cửa sổ ví của bạn.'}</div>
              </div>
            </div>
          )}

          {/* Connection Error Notice */}
          {connectionError && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{connectionError}</span>
              </div>
              <button
                onClick={() => setConnectionError(null)}
                className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}

          {/* TAB 1: PROVIDERS LIST */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Smart Assistant Sheet (When user clicked an uninstalled wallet) */}
              {selectedAssistantWallet && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B1526] to-[#080D18] border border-cyan-500/40 shadow-xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedAssistantWallet.iconUrl}
                        alt={selectedAssistantWallet.name}
                        className="w-8 h-8 rounded-xl object-contain bg-white/5 p-1"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          Kết Nối {selectedAssistantWallet.name}
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                            HƯỚNG DẪN KẾT NỐI
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Chưa phát hiện tiện ích mở rộng của ví này trong trình duyệt hiện tại.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAssistantWallet(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Option 1: Official Download */}
                    <a
                      href={selectedAssistantWallet.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div>Tải Tiện Ích Mở Rộng</div>
                          <div className="text-[10px] text-slate-400 font-normal">Trang chủ chính thức của ví</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                    </a>

                    {/* Option 2: Scan QR via WalletConnect */}
                    <button
                      onClick={() => {
                        setSelectedAssistantWallet(null);
                        setActiveTab('qrcode');
                      }}
                      className="p-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <QrCode className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div>Quét QR Bằng Ứng Dụng Di Động</div>
                          <div className="text-[10px] text-cyan-200/70 font-normal">Ghép nối qua WalletConnect v2</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Option 3: Deep Link on Mobile */}
                    {selectedAssistantWallet.deepLinkUrl && (
                      <a
                        href={selectedAssistantWallet.deepLinkUrl}
                        className="p-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between sm:col-span-2 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <div>
                            <div>Mở Trực Tiếp Trên Ứng Dụng Di Động</div>
                            <div className="text-[10px] text-slate-400 font-normal">Tự động kích hoạt dApp trên điện thoại</div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm ví (MetaMask, Rabby, Trust, OKX, Phantom...)"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'installed', label: 'Đã Cài Đặt' },
                    { id: 'popular', label: 'Phổ biến' },
                    { id: 'mobile', label: 'Mobile' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-2.5 py-2 rounded-xl transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION A: DETECTED & READY WALLETS (AT THE VERY TOP) */}
              {installedProviders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ví Đã Phát Hiện & Sẵn Sàng Kết Nối ({installedProviders.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {installedProviders.map((provider) => {
                      const isCurrent = isConnected && walletType === provider.id;
                      const isPending = connectingId === provider.id;

                      return (
                        <button
                          key={provider.id}
                          onClick={() => handleConnectProvider(provider)}
                          disabled={isPending}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden ${
                            isCurrent
                              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                              : 'bg-gradient-to-r from-emerald-950/10 via-[#0B1522] to-black/40 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-950/25 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={provider.iconUrl}
                              alt={provider.name}
                              className="w-9 h-9 rounded-xl object-contain bg-black/40 p-1 border border-white/10 shrink-0"
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {provider.name}
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold">
                                  SẴN SÀNG
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {provider.shortDesc}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ĐANG DÙNG
                            </span>
                          ) : isPending ? (
                            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                          ) : (
                            <span className="text-emerald-400 text-xs font-mono font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
                              Kết Nối →
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION B: OTHER WALLETS & PROTOCOLS */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between px-1">
                  <span>Các Ví Web3 & Giao Thức Khác</span>
                  <span className="text-[10px] text-slate-500">{otherProviders.length} tùy chọn</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {otherProviders.map((provider) => {
                    const isPending = connectingId === provider.id;

                    return (
                      <button
                        key={provider.id}
                        onClick={() => handleConnectProvider(provider)}
                        disabled={isPending}
                        className="p-3 rounded-2xl bg-black/30 hover:bg-white/5 border border-white/5 hover:border-cyan-500/30 text-left transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={provider.iconUrl}
                            alt={provider.name}
                            className="w-8 h-8 rounded-xl object-contain bg-black/40 p-1 border border-white/10 shrink-0"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              {provider.name}
                              {provider.badge && (
                                <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono text-[9px]">
                                  {provider.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {provider.shortDesc}
                            </div>
                          </div>
                        </div>

                        {isPending ? (
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: RECENT ACCOUNTS (REAL ON-CHAIN ONLY) */}
              {recentAccounts.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 space-y-2.5 text-xs font-mono">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-cyan-400" />
                      Ví Đã Kết Nối Gần Đây (On-Chain)
                    </span>
                    <span className="text-slate-500">{recentAccounts.length} ví</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentAccounts.map((ra) => (
                      <div
                        key={ra.address}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[11px] hover:border-cyan-500/30 transition-colors"
                      >
                        <button
                          onClick={() => {
                            connectWatchOnly(ra.address, ra.name || 'Recent Wallet');
                            soundManager.playSuccess();
                            closeConnectModal();
                          }}
                          className="text-cyan-300 hover:text-white font-bold cursor-pointer"
                        >
                          {shortenAddress(ra.address, 6)}
                        </button>
                        <button
                          onClick={() => removeRecentAccount(ra.address)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer p-0.5"
                          title="Xóa khỏi lịch sử"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WALLETCONNECT QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="max-w-md mx-auto py-2 space-y-5 text-center">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  Quét Mã QR Bằng Ứng Dụng Ví Di Động
                </h3>
                <p className="text-xs text-slate-400">
                  Mở ứng dụng Trust Wallet, MetaMask Mobile, Rainbow hoặc bất kỳ ví Web3 nào hỗ trợ WalletConnect v2 để quét mã.
                </p>
              </div>

              {/* Dynamic Crisp Genuine QR Code Frame */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white mx-auto w-64 h-64 flex items-center justify-center shadow-2xl relative">
                {wcUri ? (
                  <QRCodeSVG
                    value={wcUri}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#06090F"
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-800">
                    <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
                    <span className="text-xs font-mono font-bold text-slate-800">Đang khởi tạo mã QR...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Copy URI and Mobile Direct Open */}
              <div className="space-y-2.5">
                <button
                  onClick={handleCopyWc}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                >
                  {copiedWcUri ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWcUri ? 'Đã Sao Chép Mã Ghép Nối URI' : 'Sao Chép Mã Ghép Nối (Copy URI)'}</span>
                </button>

                <p className="text-[11px] text-slate-500 font-mono">
                  Giao thức IRN Relay Relay-Protocol • Mã hóa End-to-End không thể can thiệp
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: NETWORKS MATRIX */}
          {activeTab === 'networks' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Chuyển Đổi Mạng Blockchain On-Chain
                </h3>
                <p className="text-xs text-slate-400">
                  HYPERON-DEX hỗ trợ chuyển đổi mạng tức thì qua chuẩn `wallet_switchEthereumChain`.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                {Object.values(SUPPORTED_CHAINS).map((chain) => {
                  const isCurrent = chainId === chain.id;
                  const isSwitching = switchingChainId === chain.id;

                  return (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSwitch(chain.id as ChainId)}
                      disabled={isSwitching}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-md shadow-cyan-950/40'
                          : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ChainLogo chainId={chain.id as any} className="w-7 h-7 rounded-full" />
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            {chain.name}
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[9px]">
                                ĐANG DÙNG
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Native: {chain.nativeCurrency?.symbol || 'ETH'}
                          </div>
                        </div>
                      </div>

                      {isSwitching ? (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                      ) : isCurrent ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <span className="text-[10px] text-slate-500 group-hover:text-white">Chuyển →</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WATCH-ONLY AUDIT MODE */}
          {activeTab === 'watch_only' && (
            <div className="max-w-md mx-auto py-2 space-y-4">
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  Chế Độ Theo Dõi Danh Mục (Watch-Only)
                </h3>
                <p className="text-xs text-slate-400">
                  Nhập địa chỉ ví EVM hoặc ENS bất kỳ để theo dõi số dư tài sản, thanh khoản và lịch sử giao dịch on-chain mà không cần khóa riêng.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Địa chỉ ví EVM (0x...) hoặc ENS:</label>
                <input
                  type="text"
                  placeholder="0x71C8A66D268eCBE77E136125027581a94fa4F67a hoặc vitalik.eth"
                  value={manualAddressInput}
                  onChange={(e) => setManualAddressInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-400 text-white font-mono text-xs focus:outline-none transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <ShieldCheck className="w-4 h-4" /> Nguyên tắc an toàn:
                </div>
                <p className="text-[11px] text-slate-300">
                  Chế độ Watch-only chỉ dùng để đọc dữ liệu on-chain. Giao thức sẽ từ chối mọi yêu cầu ký hoặc phát sóng giao dịch ở chế độ này để đảm bảo an toàn tuyệt đối.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!manualAddressInput.trim()) return;
                  try {
                    connectWatchOnly(manualAddressInput.trim(), 'Watch-Only Portfolio');
                    soundManager.playSuccess();
                    addToast({
                      title: 'Chế độ theo dõi kích hoạt',
                      message: `Đang xem danh mục của ${shortenAddress(manualAddressInput.trim(), 6)}`,
                      type: 'info',
                    });
                    setManualAddressInput('');
                    closeConnectModal();
                  } catch (err: any) {
                    addToast({ title: 'Địa chỉ không hợp lệ', message: err?.message, type: 'error' });
                  }
                }}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <span>Kích Hoạt Theo Dõi Danh Mục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ACTIVE CONNECTED ACCOUNT DETAILS (IF CONNECTED) */}
          {isConnected && activeTab === 'session' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>ĐỊA CHỈ VÍ ĐANG KẾT NỐI</span>
                  <span className="text-emerald-400 font-bold">ACTIVE EIP-1193</span>
                </div>

                <div className="text-sm font-bold text-white break-all flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span>{address}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Sao chép địa chỉ"
                    >
                      {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`${currentChainConfig.explorerUrl || 'https://etherscan.io'}/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Xem trên Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[#090D15] border border-white/5">
                    <div className="text-slate-500">Mạng Kết Nối:</div>
                    <div className="font-bold text-cyan-300 mt-0.5">{currentChainConfig.name}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090D15] border border-white/5">
                    <div className="text-slate-500">Loại Ví:</div>
                    <div className="font-bold text-amber-300 uppercase mt-0.5">{walletType || 'Injected'}</div>
                  </div>
                </div>
              </div>

              {/* Balances Quick Breakdown */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/5 space-y-2">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>SỐ DƯ ON-CHAIN THỜI GIAN THỰC</span>
                  <span className="text-cyan-400">Live RPC</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-500">ETH</div>
                    <div className="font-bold text-white text-xs mt-0.5">{(balances.ETH || 0).toFixed(4)}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-500">USDC</div>
                    <div className="font-bold text-white text-xs mt-0.5">${(balances.USDC || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-500">HYPR</div>
                    <div className="font-bold text-cyan-400 text-xs mt-0.5">{(balances.HYPR || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Disconnect Action */}
              <div className="pt-2">
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Ngắt Kết Nối Ví (Disconnect)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Security Badges */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#04070D] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500 relative z-10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>EIP-6963 Auto-Detected</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zero-Gas Permit Enabled</span>
            </span>
          </div>

          <div className="text-slate-400">
            HYPERON-DEX Web3 Protocol V4.2
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
