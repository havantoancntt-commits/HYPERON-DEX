import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { formatCurrency, formatPercent, shortenAddress } from '../lib/utils';
import { Hyperon3DLogo, TokenLogo, ChainLogo } from '../components/CryptoIcon';
import { soundManager } from '../lib/sound';
import { GenesisDeployerModal } from '../components/GenesisDeployerModal';
import {
  getHyprContractAddress,
  DEFAULT_HYPR_ADDRESS,
  resetHyprContractAddress,
  isAuthorizedDeployer,
  AUTHORIZED_PROTOCOL_ADMINS,
  authenticateAdminPasskey,
  clearAdminSession,
  MASTER_ADMIN_PASSKEYS,
} from '../lib/hyprConfig';
import {
  Sparkles,
  Flame,
  Lock,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Coins,
  TrendingUp,
  Award,
  Zap,
  Layers,
  BarChart3,
  Percent,
  RefreshCw,
  Gift,
  ArrowUpRight,
  Check,
  ChevronRight,
  AlertCircle,
  Rocket,
  Code2,
  KeyRound,
  X,
  Unlock,
} from 'lucide-react';

interface TimeframeData {
  label: string;
  points: { time: string; price: number; volume: number }[];
}

const TIMEFRAMES: Record<string, { priceChange: number; points: { time: string; price: number; volume: number }[] }> = {
  '1H': {
    priceChange: 0.85,
    points: [
      { time: '12:00', price: 4.78, volume: 1800000 },
      { time: '12:15', price: 4.79, volume: 2200000 },
      { time: '12:30', price: 4.81, volume: 2900000 },
      { time: '12:45', price: 4.80, volume: 3100000 },
      { time: '13:00', price: 4.82, volume: 4200000 },
    ],
  },
  '24H': {
    priceChange: 18.65,
    points: [
      { time: '00:00', price: 4.06, volume: 12000000 },
      { time: '04:00', price: 4.15, volume: 16000000 },
      { time: '08:00', price: 4.38, volume: 28000000 },
      { time: '12:00', price: 4.62, volume: 38000000 },
      { time: '16:00', price: 4.75, volume: 44000000 },
      { time: '20:00', price: 4.82, volume: 52000000 },
    ],
  },
  '7D': {
    priceChange: 42.10,
    points: [
      { time: 'T-6', price: 3.39, volume: 45000000 },
      { time: 'T-5', price: 3.52, volume: 55000000 },
      { time: 'T-4', price: 3.84, volume: 68000000 },
      { time: 'T-3', price: 4.12, volume: 82000000 },
      { time: 'T-2', price: 4.45, volume: 105000000 },
      { time: 'T-1', price: 4.68, volume: 128000000 },
      { time: 'Hôm nay', price: 4.82, volume: 142580000 },
    ],
  },
  '30D': {
    priceChange: 124.5,
    points: [
      { time: 'Tuần 1', price: 2.15, volume: 180000000 },
      { time: 'Tuần 2', price: 2.68, volume: 220000000 },
      { time: 'Tuần 3', price: 3.45, volume: 310000000 },
      { time: 'Tuần 4', price: 4.82, volume: 480000000 },
    ],
  },
  'ALL': {
    priceChange: 487.8,
    points: [
      { time: 'Genesis', price: 0.82, volume: 50000000 },
      { time: 'Q1', price: 1.45, volume: 140000000 },
      { time: 'Q2', price: 2.30, volume: 320000000 },
      { time: 'Q3', price: 3.80, volume: 680000000 },
      { time: 'Hiện tại', price: 4.82, volume: 1250000000 },
    ],
  },
};

const CANONICAL_HYPR_ADDRESS = DEFAULT_HYPR_ADDRESS;

const MULTICHAIN_DEPLOYMENTS = [
  {
    chainId: 'ethereum',
    name: 'Ethereum Mainnet',
    type: 'Canonical Native ERC-20',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://etherscan.io/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
  {
    chainId: 'arbitrum',
    name: 'Arbitrum One',
    type: 'LayerZero OFT v2 (Arbitrum L2)',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://arbiscan.io/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
  {
    chainId: 'base',
    name: 'Base',
    type: 'LayerZero OFT v2 (Coinbase L2)',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://basescan.org/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
  {
    chainId: 'optimism',
    name: 'OP Mainnet',
    type: 'Superchain Native Bridge',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://optimistic.etherscan.io/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
  {
    chainId: 'polygon',
    name: 'Polygon PoS',
    type: 'PoS State Bridge & OFT',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://polygonscan.com/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
  {
    chainId: 'bsc',
    name: 'BNB Smart Chain',
    type: 'BEP-20 Omnichain Fungible',
    address: CANONICAL_HYPR_ADDRESS,
    explorer: `https://bscscan.com/token/${CANONICAL_HYPR_ADDRESS}`,
    verified: true,
  },
];

export const HyprCoinView: React.FC = () => {
  const { address, balances, isConnected, openConnectModal, addTokenToWallet } = useWallet();
  const { getLiveToken, openSwapWithTokens, setActiveView, addToast } = useExchange();
  const { t } = useI18n();

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24H');
  const [copied, setCopied] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPasskey, setAdminPasskey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authVersion, setAuthVersion] = useState(0);
  const [currentContractAddress, setCurrentContractAddress] = useState(getHyprContractAddress());

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Smart & Professional Governance Admin Permission Verification
  const isAdmin = useMemo(() => isAuthorizedDeployer(address), [address, authVersion]);

  const handleActivateAdmin = async (e?: React.FormEvent, customKey?: string) => {
    if (e) e.preventDefault();
    const keyToUse = customKey !== undefined ? customKey : adminPasskey;
    const cleanPasskey = keyToUse.trim().replace(/^["']|["']$/g, '');
    const isGenesisWallet = Boolean(address && AUTHORIZED_PROTOCOL_ADMINS.includes(address.toLowerCase()));

    if (!cleanPasskey && !isGenesisWallet) {
      setAuthError('Vui lòng nhập mật mã quản trị viên.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await authenticateAdminPasskey(cleanPasskey || 'HYPR_GENESIS_CORE_2026', address || undefined);
      if (result.success) {
        setAuthVersion((v) => v + 1);
        setIsAdminAuthModalOpen(false);
        setAdminPasskey('');
        setAuthError(null);
        soundManager.playSuccess();
        addToast({
          title: 'Xác Thực Quản Trị Thành Công',
          message: 'Quyền hạn Genesis Deployer đã được kích hoạt cho phiên làm việc.',
          type: 'success',
        });
      } else {
        soundManager.playError();
        setAuthError(result.error || 'Mã khóa Quản trị viên không hợp lệ. Vui lòng kiểm tra lại.');
      }
    } catch {
      soundManager.playError();
      setAuthError('Lỗi trong quá trình xác thực. Vui lòng thử lại.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRevokeAdmin = () => {
    clearAdminSession();
    setAuthVersion((v) => v + 1);
    setIsAdminAuthModalOpen(false);
    soundManager.playTick();
    addToast({
      title: 'Đăng Xuất Admin',
      message: 'Giao diện đã quay trở lại chế độ người dùng công khai.',
      type: 'info',
    });
  };

  useEffect(() => {
    const handleAddressChange = (e: any) => {
      if (e.detail) setCurrentContractAddress(e.detail);
    };
    window.addEventListener('hypr-address-updated', handleAddressChange);
    return () => window.removeEventListener('hypr-address-updated', handleAddressChange);
  }, []);

  const isCustomContract = currentContractAddress.toLowerCase() !== DEFAULT_HYPR_ADDRESS.toLowerCase();

  const hyprToken = getLiveToken('HYPR');
  const hyprPrice = hyprToken?.priceUsd || 4.82;
  const hyprChange = hyprToken?.change24h || 18.65;
  const userHyprBalance = balances.HYPR ?? 2500;
  const userHyprValueUsd = userHyprBalance * hyprPrice;

  // VIP Tier calculation
  const vipTier = useMemo(() => {
    if (userHyprBalance >= 10000) return { level: 3, name: 'VIP Gold', discount: '100% (Phí 0%)', nextThreshold: 0 };
    if (userHyprBalance >= 2500) return { level: 2, name: 'VIP Silver', discount: '60% Giảm Phí', nextThreshold: 10000 };
    if (userHyprBalance >= 500) return { level: 1, name: 'VIP Bronze', discount: '30% Giảm Phí', nextThreshold: 2500 };
    return { level: 0, name: 'Tiêu Chuẩn', discount: '0% Giảm Phí', nextThreshold: 500 };
  }, [userHyprBalance]);

  const copyContractAddress = () => {
    navigator.clipboard.writeText(currentContractAddress);
    setCopied(true);
    soundManager.playTick();
    addToast({
      title: 'Đã Sao Chép Hợp Đồng',
      message: `${shortenAddress(currentContractAddress, 8)} đã lưu vào khay nhớ tạm.`,
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddTokenToWallet = async () => {
    if (!isConnected) {
      openConnectModal();
      return;
    }
    setIsAddingWallet(true);
    soundManager.playTick();
    try {
      await addTokenToWallet({
        address: currentContractAddress,
        symbol: 'HYPR',
        decimals: 18,
        image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0/logo.png',
      });
      addToast({
        title: 'Thành Công',
        message: 'Đã gửi yêu cầu thêm đồng HYPR vào ví Web3 của bạn.',
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Thông Báo Ví',
        message: err?.message || 'Không thể tự động thêm token vào ví. Bạn có thể thêm thủ công bằng địa chỉ hợp đồng.',
        type: 'info',
      });
    } finally {
      setIsAddingWallet(false);
    }
  };

  // SVG Chart Calculation
  const activeChart = TIMEFRAMES[selectedTimeframe] || TIMEFRAMES['24H'];
  const minPrice = Math.min(...activeChart.points.map((p) => p.price));
  const maxPrice = Math.max(...activeChart.points.map((p) => p.price));
  const priceRange = maxPrice - minPrice || 1;

  const chartPointsSvg = activeChart.points
    .map((p, idx) => {
      const x = (idx / (activeChart.points.length - 1)) * 600;
      const y = 200 - ((p.price - minPrice) / priceRange) * 160;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Grand Hero Showcase Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B101D] via-[#070A12] to-[#04060A] border border-cyan-500/20 p-6 sm:p-10 shadow-2xl">
        {/* Quantum Background Lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left: Coin Profile Branding */}
          <div className="flex items-start sm:items-center gap-5 sm:gap-7">
            {/* Coin Logo Button - Interactive Admin Access */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTick();
                setIsAdminAuthModalOpen(true);
              }}
              className="relative shrink-0 group cursor-pointer text-left focus:outline-none rounded-2xl active:scale-95 transition-transform"
              title="Chạm vào đây để mở bảng Xác thực Quyền Admin & Quản trị On-Chain"
            >
              <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr p-0.5 border shadow-xl flex items-center justify-center transition-all ${
                isAdmin
                  ? 'from-amber-500/30 via-orange-600/40 to-rose-600/30 border-amber-400/70 shadow-amber-500/20'
                  : 'from-cyan-500/20 via-blue-600/30 to-purple-600/20 border-cyan-400/40 shadow-cyan-500/10 group-hover:border-cyan-400'
              }`}>
                <Hyperon3DLogo className="w-16 h-16 sm:w-24 sm:h-24 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform" />
              </div>
              <span className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider font-mono shadow-md flex items-center gap-1 ${
                isAdmin
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black border border-amber-300'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black'
              }`}>
                {isAdmin ? (
                  <>
                    <KeyRound className="w-2.5 h-2.5" /> ADMIN
                  </>
                ) : (
                  'NATIVE COIN'
                )}
              </span>
            </button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Hyperon <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">HYPR</span>
                </h1>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold">
                  $HYPR
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% CERTIK AUDITED
                </span>

                {/* Direct Admin Access Button right at the top header */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setIsAdminAuthModalOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    isAdmin
                      ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 hover:bg-amber-500/30 shadow-sm'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-amber-300'
                  }`}
                  title="Nhấp vào để mở bảng Quản trị & Xác thực Admin"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isAdmin ? 'text-amber-400' : 'text-slate-400'}`} />
                  {isAdmin ? 'ADMIN ACTIVE' : 'ADMIN ACCESS'}
                </button>
              </div>

              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                Đồng coin cốt lõi cung cấp năng lượng cho toàn bộ hệ sinh thái <strong>HYPERON-DEX</strong>: giảm tới 100% phí hoán đổi giao dịch, chia sẻ doanh thu giao thức on-chain, mở khóa AI Copilot lượng tử và quản trị DAO đa chuỗi.
              </p>

              {/* Verified Smart Contract Pill */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400 font-mono">
                <span className="text-slate-400">Smart Contract (Omnichain):</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-cyan-300 hover:border-cyan-500/40 transition-colors">
                  <span>{shortenAddress(currentContractAddress, 8)}</span>
                  <button
                    onClick={copyContractAddress}
                    className="p-0.5 hover:text-white transition-colors cursor-pointer"
                    title="Sao chép địa chỉ hợp đồng"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {isCustomContract ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    HỢP ĐỒNG ON-CHAIN CHÍNH CHỦ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px]">
                    CANONICAL TESTNET
                  </span>
                )}
                {isCustomContract && (
                  <button
                    onClick={() => {
                      resetHyprContractAddress();
                      soundManager.playTick();
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                    title="Khôi phục địa chỉ mặc định"
                  >
                    Đặt lại mặc định
                  </button>
                )}
                <a
                  href={`https://etherscan.io/token/${currentContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
                >
                  Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right: Live Price & Fast Action Suite */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-start sm:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-white/10">
            <div className="text-left sm:text-right">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold flex items-center sm:justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                GIÁ THỜI GIAN THỰC (USD)
              </div>
              <div className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight mt-1">
                {formatCurrency(hyprPrice)}
              </div>
              <div className="flex items-center sm:justify-end gap-2 mt-1">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{formatPercent(hyprChange)} (24h)
                </span>
                <span className="text-xs text-slate-400 font-mono">ATH: $7.45</span>
              </div>
            </div>

            {/* Main CTA Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {isAdmin && (
                <button
                  onClick={() => setIsDeployModalOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                  title="Quyền Admin: Tạo và deploy token HYPR thật on-chain lên Sepolia, Base, Arbitrum"
                >
                  <Rocket className="w-4 h-4" /> [Admin] Deploy On-Chain
                </button>
              )}

              <button
                onClick={handleAddTokenToWallet}
                disabled={isAddingWallet}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                title="Thêm token HYPR vào MetaMask / Rabby / OKX Wallet theo chuẩn EIP-747"
              >
                <Plus className="w-4 h-4" /> Thêm Vào Ví Web3
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playTick();
                  setIsAdminAuthModalOpen(true);
                }}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isAdmin 
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-300' 
                    : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-slate-200 hover:text-white'
                }`}
                title="Mở bảng xác thực và bảng điều khiển Quản trị viên (Admin)"
              >
                <KeyRound className={`w-4 h-4 ${isAdmin ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{isAdmin ? 'Quản Trị Token (Active)' : 'Cổng Admin Token'}</span>
              </button>

              <button
                onClick={() => openSwapWithTokens('ETH', 'HYPR')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" /> Swap HYPR Ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5 PROMINENT ON-CHAIN GENESIS DEPLOYMENT / VERIFIED CANONICAL BANNER */}
      {isAdmin ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-purple-950/40 border border-amber-400/40 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-600/30 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-md">
                <Rocket className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Protocol Admin Genesis Launch Studio
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                    ADMIN AUTHENTICATED
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Ví của bạn được xác thực quyền <strong>Protocol Treasury Deployer</strong>. Bạn có thẩm quyền triển khai hợp đồng Genesis Token HYPR thật lên các mạng EVM chính thức hoặc Testnet.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsAdminAuthModalOpen(true);
                }}
                className="px-3.5 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Quản lý phiên Quản trị viên"
              >
                <KeyRound className="w-3.5 h-3.5" /> Quản Lý Admin
              </button>
              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsDeployModalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Rocket className="w-4 h-4" /> Mở Studio Deploy Token
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/30 via-[#0B1020] to-[#070913] border border-cyan-500/20 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Hợp Đồng HYPR Canonical Được Xác Thực 100%
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                    CANONICAL OFFICIAL
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Đồng coin HYPR đã được cố định theo địa chỉ hợp đồng gốc trên hệ sinh thái đa chuỗi. Cơ chế bảo vệ Genesis nghiêm ngặt ngăn chặn các hành vi tạo token giả mạo hoặc pha loãng nguồn cung.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                onClick={copyContractAddress}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4 text-cyan-400" /> {shortenAddress(currentContractAddress, 6)}
              </button>
              <button
                onClick={() => {
                  soundManager.playTick();
                  setIsAdminAuthModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 text-slate-400 hover:text-amber-300 font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Dành cho Quản trị viên dự án: Xác thực quyền Deploy & Quản trị"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400/80" /> Xác Thực Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Key Economic & Supply Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#090D17] border border-white/[0.07] hover:border-cyan-500/30 transition-colors">
          <div className="text-[11px] font-mono text-slate-400 uppercase">VỐN HÓA THỊ TRƯỜNG</div>
          <div className="text-base sm:text-lg font-bold text-white font-mono mt-1">$4,820,000,000</div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">+18.6% hôm nay</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D17] border border-white/[0.07] hover:border-cyan-500/30 transition-colors">
          <div className="text-[11px] font-mono text-slate-400 uppercase">KHỐI LƯỢNG 24H</div>
          <div className="text-base sm:text-lg font-bold text-cyan-400 font-mono mt-1">$142,580,000</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Trên 7 chuỗi DEX</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D17] border border-white/[0.07] hover:border-cyan-500/30 transition-colors">
          <div className="text-[11px] font-mono text-slate-400 uppercase">TỔNG CUNG TỐI ĐA</div>
          <div className="text-base sm:text-lg font-bold text-white font-mono mt-1">1,000,000,000</div>
          <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Fixed Hard Cap (No-Mint)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D17] border border-white/[0.07] hover:border-cyan-500/30 transition-colors">
          <div className="text-[11px] font-mono text-slate-400 uppercase">LƯU HÀNH THỊ TRƯỜNG</div>
          <div className="text-base sm:text-lg font-bold text-white font-mono mt-1">385,420,000</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">38.54% tổng cung</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D17] border border-rose-500/20 hover:border-rose-500/40 transition-colors">
          <div className="text-[11px] font-mono text-rose-400 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400 animate-pulse" /> ĐÃ ĐỐT ON-CHAIN
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-300 font-mono mt-1">18,420,195</div>
          <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">~$88.78M từ phí DEX</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D17] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <div className="text-[11px] font-mono text-emerald-400 uppercase flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" /> APY STAKING LIQUID
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-300 font-mono mt-1">18.6% APY</div>
          <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">Dual Yield (ETH+HYPR)</div>
        </div>
      </div>

      {/* 3. Interactive Price Chart & User Holding VIP Tier status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Candlestick / Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#090D17] border border-white/[0.07] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Biểu Đồ Giá Lượng Tử HYPR/USD
              </h2>
              <p className="text-xs text-slate-400">Dữ liệu tổng hợp từ các cặp thanh khoản Uniswap v3, Curve & SushiSwap</p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
              {(['1H', '24H', '7D', '30D', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setSelectedTimeframe(tf);
                    soundManager.playTick();
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                    selectedTimeframe === tf
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Vector Chart */}
          <div className="w-full h-64 relative pt-4">
            <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="50" x2="600" y2="50" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />

              {/* Area Under Curve */}
              <polygon
                points={`0,200 ${chartPointsSvg} 600,200`}
                fill="url(#chartGradient)"
              />

              {/* Price Line */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartPointsSvg}
              />

              {/* Data points */}
              {activeChart.points.map((p, idx) => {
                const x = (idx / (activeChart.points.length - 1)) * 600;
                const y = 200 - ((p.price - minPrice) / priceRange) * 160;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#080C14"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    className="hover:scale-150 transition-transform cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/[0.06] pt-3">
            <span>Khoảng dao động: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</span>
            <span className="text-cyan-400">Thay đổi chu kỳ: +{activeChart.priceChange}%</span>
            <span>Khối lượng: ${(activeChart.points[activeChart.points.length - 1].volume / 1e6).toFixed(1)}M USD</span>
          </div>
        </div>

        {/* Right 1 Col: User VIP Tier & Holding Status */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0C1220] to-[#080B12] border border-cyan-500/25 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" /> CẤP BẬC VIP TRADER
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-extrabold border border-cyan-400/30">
                {vipTier.name}
              </span>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="text-xs text-slate-400">Số Dư HYPR Trong Ví Của Bạn</div>
              <div className="text-2xl font-black text-white font-mono">
                {userHyprBalance.toLocaleString()} <span className="text-sm font-normal text-cyan-400">HYPR</span>
              </div>
              <div className="text-xs font-mono text-emerald-400">
                ≈ {formatCurrency(userHyprValueUsd)}
              </div>
            </div>

            {/* VIP Tier Benefits list */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Ưu đãi phí hoán đổi:
                </span>
                <span className="font-bold text-cyan-300 font-mono">{vipTier.discount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Tín hiệu AI Alpha:
                </span>
                <span className="font-bold text-emerald-400 font-mono">Đang Mở Khóa (Tier {vipTier.level})</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Chống MEV Private Relay:
                </span>
                <span className="font-bold text-emerald-400 font-mono">Ưu Tiên Tối Đa</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveView('staking')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" /> Stake HYPR Nhận 18.6% APY
            </button>

            <button
              onClick={() => openSwapWithTokens('ETH', 'HYPR')}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4 text-cyan-400" /> Mua Thêm HYPR Để Nâng Cấp VIP
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tokenomics & Deflationary Furnace Engine */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090D17] border border-white/[0.07] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" /> Cơ Chế Giảm Phát & Tokenomics Đẳng Cấp
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Mô hình kinh tế phi tập trung chuẩn mực với cơ chế tự động đốt (Hyperon Furnace) và phân bổ minh bạch.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs font-bold flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 animate-pulse text-rose-400" /> Đốt 30% Phí Toàn Giao Thức
          </div>
        </div>

        {/* Visual Tokenomics Allocation Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Phân Bổ Token Genesis (1,000,000,000 HYPR)</span>
            <span className="text-cyan-400 font-bold">100% Cố Định</span>
          </div>
          <div className="h-4 w-full rounded-full bg-black/50 overflow-hidden flex p-0.5 gap-0.5 border border-white/10">
            <div className="h-full bg-cyan-500 rounded-l-full" style={{ width: '40%' }} title="Staking & Phần Thưởng Cộng Đồng (40%)" />
            <div className="h-full bg-blue-600" style={{ width: '25%' }} title="Thanh Khoản Sàn DEX (25%)" />
            <div className="h-full bg-indigo-600" style={{ width: '15%' }} title="Nghiên Cứu & Đội Ngũ Cốt Lõi (15%)" />
            <div className="h-full bg-purple-600" style={{ width: '12%' }} title="Kho Quỹ Dự Trữ DAO (12%)" />
            <div className="h-full bg-emerald-500 rounded-r-full" style={{ width: '8%' }} title="Public Liquidity Genesis (8%)" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
              <span>40% Staking & Reward</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
              <span>25% DEX Liquidity</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
              <span>15% Core Research</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
              <span>12% DAO Treasury</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>8% Public Genesis</span>
            </div>
          </div>
        </div>

        {/* 4 Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
          <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Giảm Phí Đến 100%</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nắm giữ HYPR giúp chiết khấu phí định tuyến DEX trên tất cả 7 mạng lưới từ 30% đến hoàn toàn miễn phí.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Mua Lại & Đốt Định Kỳ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              30% toàn bộ phí giao thức được smart contract tự động mua lại HYPR từ thị trường và chuyển vào ví Dead vô thời hạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Mở Khóa AI Copilot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sử dụng các mô hình học máy DeepSeek & Gemini lượng tử phân tích on-chain và cảnh báo cá voi thời gian thực.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Quản Trị DAO Đa Chuỗi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bỏ phiếu phê duyệt router DEX mới, điều chỉnh tỷ lệ phần thưởng staking và cấu trúc thanh khoản chuỗi chéo.
            </p>
          </div>
        </div>

        {/* Multi-chain fee collection addresses feeding the buyback & burn engine */}
        <div className="p-4 rounded-2xl bg-black/40 border border-rose-500/20 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Dòng Chảy Doanh Thu Giao Thức (6 Địa Chỉ On-Chain Thu Phí Quyết Toán)</span>
            </div>
            <span className="text-[10px] text-slate-400">
              30% được trích lập tự động cho quỹ Mua Lại & Đốt HYPR
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { name: 'Ethereum Mainnet', short: 'ETH', addr: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', exp: 'https://etherscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', color: '#627EEA' },
              { name: 'Solana Network', short: 'SOL', addr: '5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4', exp: 'https://solscan.io/account/5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4', color: '#14F195' },
              { name: 'BNB Smart Chain', short: 'BSC', addr: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', exp: 'https://bscscan.com/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', color: '#F3BA2F' },
              { name: 'TRON (TRC-20)', short: 'TRX', addr: 'TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj', exp: 'https://tronscan.org/#/address/TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj', color: '#FF0013' },
              { name: 'Arbitrum One', short: 'ARB', addr: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', exp: 'https://arbiscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', color: '#28A0F0' },
              { name: 'Base L2', short: 'BASE', addr: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', exp: 'https://basescan.org/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9', color: '#0052FF' },
            ].map((chain) => (
              <div
                key={chain.short}
                className="p-2.5 rounded-xl bg-[#090D18] border border-white/5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
                    <span className="text-white font-bold text-[11px] truncate">{chain.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate" title={chain.addr}>
                    {chain.addr.slice(0, 6)}...{chain.addr.slice(-4)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(chain.addr);
                      addToast({
                        title: 'Đã Sao Chép',
                        message: `Địa chỉ thu phí ${chain.short}: ${chain.addr}`,
                        type: 'success',
                      });
                    }}
                    className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                    title="Sao chép"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <a
                    href={chain.exp}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-cyan-400"
                    title="Mở Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Multi-Chain Deployments & Smart Contracts Verification */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090D17] border border-white/[0.07] space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" /> Hệ Sinh Thái Triển Khai Đa Chuỗi (Omnichain OFT)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            HYPR hỗ trợ giao thức LayerZero Omnichain Fungible Token (OFT v2) cho phép luân chuyển 1:1 không slippage giữa các mạng.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-3 font-semibold">MẠNG LƯỚI</th>
                <th className="pb-3 font-semibold">LOẠI HỢP ĐỒNG</th>
                <th className="pb-3 font-semibold">ĐỊA CHỈ HỢP ĐỒNG</th>
                <th className="pb-3 font-semibold">KIỂM TOÁN</th>
                <th className="pb-3 font-semibold text-right">TRÌNH KHÁM PHÁ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {MULTICHAIN_DEPLOYMENTS.map((dep) => (
                <tr key={dep.chainId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 flex items-center gap-2.5 text-white font-bold font-sans">
                    <ChainLogo chainId={dep.chainId} className="w-5 h-5" />
                    <span>{dep.name}</span>
                  </td>
                  <td className="py-3.5 text-slate-400">{dep.type}</td>
                  <td className="py-3.5 text-cyan-300">
                    <span className="bg-black/40 px-2 py-1 rounded border border-white/5">
                      {shortenAddress(dep.address, 6)}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% Passed
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <a
                      href={dep.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Xem Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Genesis Launch Studio Modal */}
      <GenesisDeployerModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />

      {/* Protocol Admin Authentication Modal */}
      {isAdminAuthModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-lg rounded-3xl bg-[#0B1020] border border-amber-400/40 p-6 sm:p-7 shadow-2xl space-y-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Xác Thực Quyền Admin HYPR
                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                        ACTIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cơ chế bảo vệ Genesis & Quyền hạn Triển khai On-Chain
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdminAuthModalOpen(false);
                  setAuthError(null);
                }}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Info */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Ví đang kết nối:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {address ? shortenAddress(address, 8) : 'Chưa kết nối ví'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Ví Treasury Chính Thức:</span>
                <span className="font-mono text-amber-300">
                  {shortenAddress(AUTHORIZED_PROTOCOL_ADMINS[0], 8)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5">
                <span>Trạng thái thẩm quyền:</span>
                <span className={`font-bold flex items-center gap-1 ${isAdmin ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" /> Quản Trị Viên (Đã Xác Thực)
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> Khách Hàng (Chỉ Đọc)
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Methods */}
            {isAdmin ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed">
                  Phiên làm việc của bạn đang ở trạng thái <strong>Admin Authenticated</strong>. Bạn có toàn quyền mở Studio triển khai hợp đồng token HYPR, tương tác deploy và quản trị hệ sinh thái.
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsAdminAuthModalOpen(false);
                      setIsDeployModalOpen(true);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Rocket className="w-4 h-4" /> Mở Studio Deploy Token
                  </button>
                  <button
                    onClick={handleRevokeAdmin}
                    className="py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Đăng Xuất Admin
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleActivateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Nhập Mã Khóa Quản Trị (Master Passkey):</span>
                    <span className="text-[11px] text-amber-400/80 font-mono">Bảo Mật Dự Án</span>
                  </label>
                  <input
                    type="password"
                    value={adminPasskey}
                    onChange={(e) => {
                      setAdminPasskey(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Nhập mã khóa quản trị..."
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-amber-400 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                  {authError && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {authError}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Passkey Mặc Định:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminPasskey('HYPR_GENESIS_CORE_2026');
                          setAuthError(null);
                          soundManager.playTick();
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                      >
                        Dán passkey
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleActivateAdmin(undefined, 'HYPR_GENESIS_CORE_2026')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                      >
                        Đăng nhập 1-chạm
                      </button>
                    </div>
                  </div>
                </div>

                {Boolean(address && AUTHORIZED_PROTOCOL_ADMINS.includes(address.toLowerCase())) && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="text-xs text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ví Genesis Admin On-Chain đã kết nối!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleActivateAdmin(undefined, 'HYPR_GENESIS_CORE_2026')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase cursor-pointer transition-all"
                    >
                      Kích Hoạt Ngay
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  💡 <strong>Gợi ý:</strong> Bạn có thể kết nối trực tiếp ví Treasury <code>{shortenAddress(AUTHORIZED_PROTOCOL_ADMINS[0], 6)}</code> để tự động nhận quyền, hoặc nhập Master Key để ủy quyền ngay cho ví hiện tại.
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminAuthModalOpen(false);
                      setAuthError(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    <span>Kích Hoạt Quyền Admin</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
