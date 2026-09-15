import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '../context/WalletContext';
import { useExchange, ProductView } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { shortenAddress } from '../lib/utils';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { ChainId } from '../types';
import {
  Wallet,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  ArrowRightLeft,
  ShieldCheck,
  X,
  Sliders,
  Globe
} from 'lucide-react';

interface MobileWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileWalletDrawer: React.FC<MobileWalletDrawerProps> = ({ isOpen, onClose }) => {
  const {
    isConnected,
    address,
    chainId,
    balances,
    walletType,
    isDemoMode,
    isWatchOnly,
    disconnectWallet,
    switchChain,
    openConnectModal,
    openAccountModal
  } = useWallet();

  const { setActiveView, addToast } = useExchange();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentChain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.arbitrum;
  const ethBalance = balances.ETH ?? 0;
  const usdcBalance = balances.USDC ?? 0;
  const hyprBalance = (balances.HYPR ?? balances.AETH) ?? 2500;
  const totalWalletApprox = ethBalance * 3200 + usdcBalance;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    addToast({
      title: 'Đã sao chép',
      message: 'Địa chỉ ví đã được sao chép vào clipboard.',
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchChain = async (targetChainId: ChainId) => {
    if (targetChainId === chainId) return;
    setIsSwitchingChain(targetChainId);
    try {
      await switchChain(targetChainId);
      addToast({
        title: 'Đổi mạng thành công',
        message: `Đã kết nối với ${SUPPORTED_CHAINS[targetChainId]?.name || targetChainId}`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Đổi mạng thất bại',
        message: 'Vui lòng xác nhận yêu cầu trên ví Web3.',
        type: 'error',
      });
    } finally {
      setIsSwitchingChain(null);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    onClose();
    addToast({
      title: 'Đã ngắt kết nối ví',
      message: 'Phiên Web3 đã được ngắt kết nối an toàn.',
      type: 'info',
    });
  };

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Card */}
      <div className="relative w-full max-w-lg bg-[#0A0E17] border-t border-x border-cyan-500/25 rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom-full duration-250 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        {/* Drag Pill Handle */}
        <div className="flex justify-center -mt-1">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>{isWatchOnly ? 'Watch-Only Account' : 'Web3 Wallet Hub'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                  {isDemoMode ? 'Sandbox' : 'Active'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Trung tâm kết nối & kiểm soát ví Web3 độc quyền
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isConnected ? (
          /* Disconnected View in Drawer */
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Chưa kết nối ví Web3</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Kết nối ví phi tập trung để thực hiện giao dịch, swap token và bảo mật tài sản.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                openConnectModal();
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-extrabold rounded-2xl cursor-pointer transition-all shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 border border-cyan-400/30 active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>{t('trade.connect_wallet') || 'Kết nối ví ngay'}</span>
            </button>
          </div>
        ) : (
          /* Connected View in Drawer */
          <>
            {/* Address & Explorer Card */}
            <div className="p-3.5 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Địa chỉ ví Web3
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold capitalize border border-cyan-500/25">
                  {walletType}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-white">
                <span className="font-bold truncate">{shortenAddress(address, 8)}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Sao chép địa chỉ ví"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                  {currentChain?.explorerUrl && (
                    <a
                      href={`${currentChain.explorerUrl}/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                      title="Xem trên Blockchain Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Khám phá</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Zero Trust Status */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero-Trust MEV Shield
                </span>
                <span className="text-slate-500">Flashbots RPC Active</span>
              </div>
            </div>

            {/* Live Balances Snapshot */}
            <div className="p-3.5 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                <span>Ước tính số dư</span>
                <span className="text-cyan-400 font-bold text-xs">
                  ${totalWalletApprox.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-slate-400">ETH</div>
                  <div className="text-xs font-bold text-white mt-0.5">{ethBalance.toFixed(3)}</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-slate-400">USDC</div>
                  <div className="text-xs font-bold text-white mt-0.5">${usdcBalance.toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-slate-400">HYPR</div>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5">{hyprBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Network Switcher Pills */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" /> Mạng lưới đang hoạt động
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['arbitrum', 'base', 'ethereum', 'optimism', 'polygon', 'bsc'] as ChainId[]).map((cId) => {
                  const c = SUPPORTED_CHAINS[cId];
                  if (!c) return null;
                  const isActive = chainId === cId;
                  const isSwitching = isSwitchingChain === cId;
                  return (
                    <button
                      key={cId}
                      onClick={() => handleSwitchChain(cId)}
                      disabled={isActive || isSwitching}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/25 border-blue-500/50 text-white font-bold shadow-sm'
                          : 'bg-[#0F1422] border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{c.shortName || c.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  openConnectModal();
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span>{t('wallet.switch') || 'Chuyển đổi ví'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  openAccountModal();
                }}
                className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Quản trị Ví & Faucet</span>
              </button>
            </div>

            {/* Portfolio Link */}
            <button
              onClick={() => {
                setActiveView('portfolio' as ProductView);
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Xem Sổ cái Danh mục (Portfolio)</span>
            </button>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>{t('wallet.disconnect') || 'Ngắt kết nối an toàn'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};
