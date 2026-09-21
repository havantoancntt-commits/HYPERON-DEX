import React, { useState, useMemo, useEffect } from 'react';
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
  Code2
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
  const { balances, isConnected, openConnectModal, requestFaucetFunds, addTokenToWallet } = useWallet();
  const { getLiveToken, openSwapWithTokens, setActiveView, addToast } = useExchange();
  const { t } = useI18n();

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24H');
  const [copied, setCopied] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [currentContractAddress, setCurrentContractAddress] = useState(getHyprContractAddress());

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

  const handleClaimFaucet = () => {
    setIsClaimingFaucet(true);
    soundManager.playSuccess();
    requestFaucetFunds('HYPR', 1000);
    addToast({
      title: 'Nhận HYPR Faucet Thành Công!',
      message: 'Đã cộng +1,000 HYPR vào số dư ví của bạn để trải nghiệm giao dịch.',
      type: 'success',
    });
    setTimeout(() => setIsClaimingFaucet(false), 600);
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
            <div className="relative shrink-0 group">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-purple-600/20 p-0.5 border border-cyan-400/40 shadow-xl shadow-cyan-500/10 flex items-center justify-center">
                <Hyperon3DLogo className="w-16 h-16 sm:w-24 sm:h-24 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform" />
              </div>
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-[9px] uppercase tracking-wider font-mono shadow-md">
                NATIVE COIN
              </span>
            </div>

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
              <button
                onClick={() => setIsDeployModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                title="Tạo và deploy token HYPR thật 100% on-chain lên Sepolia, Base, Arbitrum"
              >
                <Rocket className="w-4 h-4" /> Deploy On-Chain Thật
              </button>

              <button
                onClick={handleAddTokenToWallet}
                disabled={isAddingWallet}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                title="Thêm token HYPR vào MetaMask / Rabby / OKX Wallet theo chuẩn EIP-747"
              >
                <Plus className="w-4 h-4" /> Thêm Vào Ví Web3
              </button>

              <button
                onClick={handleClaimFaucet}
                disabled={isClaimingFaucet}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-cyan-400/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Gift className="w-4 h-4 text-cyan-400" /> Nhận +1,000 Faucet
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

      {/* 1.5 PROMINENT ON-CHAIN GENESIS DEPLOYMENT BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-400/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-md">
              <Rocket className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Xưởng Triển Khai On-Chain (Genesis Token Launch Studio)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  SẴN SÀNG TRIỂN KHAI
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Bạn muốn biến <strong>HYPR</strong> thành đồng coin thật 100% trên blockchain để bất kỳ ai trên thế giới cũng có thể tra cứu trên Etherscan, thêm vào ví cá nhân và swap bằng tiền thật? Triển khai ngay chỉ với 1 cú nhấp chuột (hỗ trợ Sepolia Testnet miễn phí gas, Base, Arbitrum, BSC, Polygon).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                soundManager.playTick();
                setIsDeployModalOpen(true);
              }}
              className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Rocket className="w-4 h-4" /> Khởi Chạy Deploy Token Thật
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
};
