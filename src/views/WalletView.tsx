import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { VERIFIED_TOKENS, SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { TokenLogo, ChainLogo } from '../components/CryptoIcon';
import {
  Wallet,
  ShieldCheck,
  Key,
  Lock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Trash2,
  LogOut,
  ArrowRightLeft,
  ShieldX,
  Check,
  Sparkles,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

const POPULAR_PROVIDERS = [
  { id: 'metamask', name: 'MetaMask', symbol: 'MM', tag: 'EIP-1193 Extension' },
  { id: 'rabby', name: 'Rabby Wallet', symbol: 'RB', tag: 'DeFi Security Native' },
  { id: 'okx', name: 'OKX Web3', symbol: 'OKX', tag: 'Multi-Chain Pro' },
  { id: 'phantom', name: 'Phantom EVM', symbol: 'PH', tag: 'EVM & Solana' },
  { id: 'rainbow', name: 'Rainbow', symbol: 'RBW', tag: 'Mobile & Web3' },
  { id: 'sandbox', name: 'Sandbox Demo', symbol: 'SB', tag: 'Institutional Simulated' },
];

export const WalletView: React.FC = () => {
  const {
    address,
    balances,
    chainId,
    tokenApprovals,
    revokeApproval,
    isConnected,
    connectWallet,
    disconnectWallet,
    switchWallet,
    openConnectModal,
    openAccountModal,
    walletType,
    isDemoMode,
    isWatchOnly,
    toggleDemoMode,
    sandboxAccounts,
    activeSandboxIndex,
    switchSandboxAccount
  } = useWallet();
  const { addToast } = useExchange();
  const { t } = useI18n();

  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState<string | null>(null);

  const currentChain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.ethereum;

  const handleRevoke = async (symbol: string) => {
    setRevokingToken(symbol);
    await new Promise((r) => setTimeout(r, 700));
    await revokeApproval(symbol);
    setRevokingToken(null);
    addToast({
      title: 'Token Allowance Revoked',
      message: `Quyền chi tiêu cho ${symbol} đã bị thu hồi hoàn toàn.`,
      type: 'success',
    });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({
      title: 'Address Copied',
      message: `${address} đã được sao chép vào bộ nhớ tạm.`,
      type: 'info',
    });
  };

  const handleStandardDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      addToast({
        title: 'Đã ngắt kết nối ví',
        message: 'Phiên làm việc Web3 đã được đóng an toàn.',
        type: 'info',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleZeroTrustDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet({ zeroTrust: true });
      addToast({
        title: 'Zero-Trust Purge Hoàn Tất',
        message: 'Đã hủy toàn bộ cấp phép hợp đồng, xóa nonce chữ ký và dọn dẹp cache.',
        type: 'warning',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSwitchProvider = async (targetId: string) => {
    setSwitchingProvider(targetId);
    try {
      await switchWallet(targetId as any);
      addToast({
        title: 'Chuyển đổi ví thành công',
        message: `Đã kết nối với ví ${targetId.toUpperCase()}.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Chuyển đổi thất bại',
        message: err?.message || 'Không thể chuyển đổi nhà cung cấp ví.',
        type: 'error',
      });
    } finally {
      setSwitchingProvider(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-cyan-900/30">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Chưa Kết Nối Ví Web3</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Kết nối ví tiền mã hóa non-custodial của bạn để quản lý tài sản, chuyển đổi ví hoặc kiểm soát cấp phép token an toàn.
          </p>
        </div>
        <button
          onClick={openConnectModal}
          className="px-6 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-cyan-900/40 transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
        >
          <Wallet className="w-4 h-4" />
          <span>{t('trade.connect_wallet') || 'Kết Nối Ví Ngay'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* 1. WALLET IDENTITY & HIGH-LEVEL ACTIONS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#090D15] border border-cyan-500/20 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-900/30 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-[#080C14] rounded-[14px] flex items-center justify-center text-cyan-400 font-mono font-black text-lg">
              {address ? address.slice(2, 4).toUpperCase() : 'W3'}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {isWatchOnly ? 'Ví Chế Độ Xem (Watch-Only)' : 'Ví Web3 Đang Hoạt Động'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {walletType ? walletType.toUpperCase() : 'CONNECTED'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1">
                <ChainLogo chainId={currentChain.id} className="w-3 h-3" />
                {currentChain.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
              <span className="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-md">{address}</span>
              <button
                onClick={copyAddress}
                className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                title="Sao chép địa chỉ"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`${currentChain.explorerUrl}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
                title="Xem trên Blockchain Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS: SWITCH & DISCONNECT */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.08]">
          {/* Switch Wallet Button */}
          <button
            onClick={openConnectModal}
            id="walletview-switch-btn"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            <span>{t('wallet.switch') || 'Chuyển đổi ví'}</span>
          </button>

          {/* Standard Disconnect Button */}
          <button
            onClick={handleStandardDisconnect}
            disabled={isDisconnecting}
            id="walletview-disconnect-btn"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/35 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{t('wallet.disconnect') || 'Ngắt kết nối ví'}</span>
          </button>

          {/* Zero-Trust Disconnect Button */}
          <button
            onClick={handleZeroTrustDisconnect}
            disabled={isDisconnecting}
            id="walletview-zerotrust-btn"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Xóa bỏ quyền Token Approvals, hủy chữ ký SIWE và làm sạch toàn bộ cache"
          >
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Xóa Phiên Zero-Trust</span>
          </button>
        </div>
      </div>

      {/* 2. 1-CLICK QUICK SWITCH PROVIDER GRID */}
      <div className="rounded-3xl bg-[#090D15] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Chuyển Đổi Nhanh Nhà Cung Cấp Ví (1-Click Switch)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Tự động hủy listeners cũ & gắn kết nối mới</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POPULAR_PROVIDERS.map((provider) => {
            const isCurrent = walletType === provider.id && !isWatchOnly;
            const isSwitching = switchingProvider === provider.id;

            return (
              <div
                key={provider.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-md shadow-cyan-950/30'
                    : 'bg-[#06090F] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-mono shadow-inner ${
                      isCurrent ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'
                    }`}
                  >
                    {provider.symbol}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{provider.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{provider.tag}</div>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đang dùng
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitchProvider(provider.id)}
                    disabled={isSwitching}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSwitching ? 'Đang đổi...' : 'Đổi sang ví này'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TOKEN APPROVALS & SECURITY MANAGER */}
      <div className="rounded-3xl bg-[#090D15] border border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Quản Lý Cấp Phép Chi Tiêu Smart Contract (Token Approvals)</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Kiểm tra và thu hồi các quyền chi tiêu không giới hạn của smart contract để ngăn ngừa rủi ro bảo mật.
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            {Object.values(tokenApprovals).filter(Boolean).length} Token Đang Cấp Phép
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-slate-400">
                <th className="py-2.5 px-3">Tài sản (Token)</th>
                <th className="py-2.5 px-3">Hợp đồng được cấp phép</th>
                <th className="py-2.5 px-3">Hạn mức chi tiêu</th>
                <th className="py-2.5 px-3">Trạng thái an ninh</th>
                <th className="py-2.5 px-3 text-right">Hành động bảo mật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {Object.entries(tokenApprovals).map(([symbol, isApproved], idx) => (
                <tr key={`${symbol}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <TokenLogo symbol={symbol} className="w-6 h-6" />
                      <span className="font-bold text-white">{symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    Hyperon Universal Router (0x3fC9...7FAD)
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {isApproved ? 'Không giới hạn (0xffffff...)' : '0.00 (Đã thu hồi)'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isApproved
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isApproved ? 'CÓ HIỆU LỰC' : 'AN TOÀN (THU HỒI)'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isApproved ? (
                      <button
                        onClick={() => handleRevoke(symbol)}
                        disabled={revokingToken === symbol}
                        className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revokingToken === symbol ? 'Đang thu hồi...' : 'Thu hồi quyền'}
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Đã khóa quyền</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

