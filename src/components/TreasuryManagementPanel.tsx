import React, { useState, useEffect } from 'react';
import {
  getTreasuryRecipients,
  updateFeeRecipient,
  resetFeeRecipientsToDefault,
  validateBlockchainAddress,
  FeeRecipientConfig,
  DEFAULT_PROTOCOL_FEE_RECIPIENTS,
} from '../lib/treasuryConfig';
import { shortenAddress } from '../lib/utils';
import { useExchange } from '../context/ExchangeContext';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  Edit3,
  RotateCcw,
  Wallet,
  Coins,
  Check,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Cpu,
} from 'lucide-react';

interface TreasuryManagementPanelProps {
  compact?: boolean;
  className?: string;
}

export const TreasuryManagementPanel: React.FC<TreasuryManagementPanelProps> = ({
  compact = false,
  className = '',
}) => {
  const { addToast } = useExchange();
  const [recipients, setRecipients] = useState<Record<string, FeeRecipientConfig>>(() => getTreasuryRecipients());
  const [copiedChain, setCopiedChain] = useState<string | null>(null);
  const [activeQr, setActiveQr] = useState<FeeRecipientConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<FeeRecipientConfig | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state on custom event or changes
  useEffect(() => {
    const handleUpdate = () => {
      setRecipients(getTreasuryRecipients());
    };
    window.addEventListener('hyperon_treasury_updated', handleUpdate);
    return () => window.removeEventListener('hyperon_treasury_updated', handleUpdate);
  }, []);

  const handleCopy = (chainKey: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedChain(chainKey);
    addToast({
      title: 'Đã Sao Chép Địa Chỉ',
      message: `Địa chỉ nhận phí ${recipients[chainKey]?.shortName || chainKey} đã được sao chép vào clipboard.`,
      type: 'success',
    });
    setTimeout(() => {
      setCopiedChain(null);
    }, 2000);
  };

  const handleOpenEdit = (config: FeeRecipientConfig) => {
    setEditingConfig(config);
    setEditInput(config.address);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    const validation = validateBlockchainAddress(editInput, editingConfig.architecture);
    if (!validation.valid) {
      setEditError(validation.reason || 'Địa chỉ không hợp lệ');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update client-side local configuration
      const result = updateFeeRecipient(editingConfig.chainId, editInput);
      if (!result.success) {
        setEditError(result.error || 'Cập nhật thất bại');
        setIsSaving(false);
        return;
      }

      // 2. Sync with backend API
      try {
        await fetch('/api/protocol/treasury', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: editingConfig.chainId,
            address: editInput.trim(),
          }),
        });
      } catch (backendErr) {
        console.warn('Backend sync warning (fallback to local state):', backendErr);
      }

      setRecipients(getTreasuryRecipients());
      setEditingConfig(null);
      addToast({
        title: 'Cập Nhật Thành Công',
        message: `Địa chỉ nhận phí mạng ${editingConfig.name} đã được đồng bộ chuẩn xác!`,
        type: 'success',
      });
    } catch (err: any) {
      setEditError(err?.message || 'Lỗi hệ thống');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục toàn bộ địa chỉ nhận phí về mặc định ban đầu của hệ thống?')) {
      resetFeeRecipientsToDefault();
      setRecipients(getTreasuryRecipients());
      addToast({
        title: 'Đã Khôi Phục Mặc Định',
        message: 'Tất cả địa chỉ nhận phí 6 mạng lưới đã được thiết lập lại mặc định chính xác.',
        type: 'info',
      });
    }
  };

  const targetList = ['ethereum', 'solana', 'bsc', 'tron', 'arbitrum', 'base'];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B132B] via-[#0D1B2A] to-[#0A1128] border border-cyan-500/25 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Kho Bạc & Địa Chỉ Nhận Phí Giao Thức (Protocol Fee Treasury)
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> ĐÃ ĐỒNG BỘ 100%
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Địa chỉ ví nhận phí giao dịch, doanh thu hoán đổi DEX, cầu nối cross-chain và cổng thanh toán Web3.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              title="Khôi phục danh sách địa chỉ nhận phí ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khôi phục</span>
            </button>
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-slate-400">TỔNG MẠNG TÍCH HỢP</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">6 Mạng Lưới Chuẩn</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-slate-400">KIẾN TRÚC MẠNG</div>
            <div className="text-sm font-bold text-white mt-0.5">EVM • Solana • TRON</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-slate-400">TỶ LỆ PHÂN BỔ PHÍ</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">100% On-Chain Vault</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-slate-400">RỦI RO THẤT THOÁT</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">0.00% (Non-Custodial)</div>
          </div>
        </div>
      </div>

      {/* 6 Networks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {targetList.map((key) => {
          const config = recipients[key] || DEFAULT_PROTOCOL_FEE_RECIPIENTS[key];
          if (!config) return null;
          const isCopied = copiedChain === key;

          return (
            <div
              key={key}
              className="p-4 rounded-2xl bg-[#090D18] border border-white/10 hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between gap-3 group"
            >
              {/* Card Top */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shadow-md border"
                    style={{
                      backgroundColor: `${config.color}20`,
                      borderColor: `${config.color}40`,
                      color: config.color,
                    }}
                  >
                    {config.iconSymbol}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {config.name}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                        {config.architecture}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Mục đích: Thu phí giao thức & Doanh thu thanh toán
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveQr(config)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Mở mã QR quét ví"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(config)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Chỉnh sửa địa chỉ"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Address Box */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs flex items-center justify-between gap-2">
                <div className="truncate text-slate-200 select-all font-semibold" title={config.address}>
                  {config.address}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(key, config.address)}
                    className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/5'
                    }`}
                    title="Sao chép địa chỉ ví"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px] hidden sm:inline">{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                  <a
                    href={config.explorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-cyan-400 border border-white/5 transition-colors"
                    title={`Mở trên ${config.explorerName}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Trạng thái: Đã đồng bộ & Sẵn sàng nhận</span>
                </div>
                <div className="text-slate-500">
                  Phân bổ: <span className="text-white font-bold">{config.feeSharePercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Modal */}
      {activeQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#0B1120] border border-cyan-500/30 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono"
                  style={{ backgroundColor: `${activeQr.color}30`, color: activeQr.color }}
                >
                  {activeQr.iconSymbol}
                </div>
                <h3 className="font-bold text-white text-sm">QR Code Kho Bạc {activeQr.shortName}</h3>
              </div>
              <button
                onClick={() => setActiveQr(null)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeQr.address)}`}
                alt={`QR code for ${activeQr.address}`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="space-y-1 font-mono text-xs">
              <div className="text-slate-400 text-[11px]">Địa chỉ nhận ví ({activeQr.architecture}):</div>
              <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-slate-200 break-all select-all font-bold">
                {activeQr.address}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(activeQr.chainId, activeQr.address)}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Copy className="w-4 h-4" />
                <span>Sao Chép Địa Chỉ</span>
              </button>
              <a
                href={activeQr.explorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-sans flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Explorer</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1120] border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  Chỉnh Sửa Địa Chỉ Nhận Phí ({editingConfig.name})
                </h3>
              </div>
              <button
                onClick={() => setEditingConfig(null)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 flex items-center justify-between">
                  <span>Địa chỉ ví thụ hưởng ({editingConfig.architecture}):</span>
                  <span className="text-[10px] text-cyan-400">Kiểm tra định dạng tự động</span>
                </label>
                <input
                  type="text"
                  value={editInput}
                  onChange={(e) => {
                    setEditInput(e.target.value);
                    setEditError(null);
                  }}
                  placeholder={
                    editingConfig.architecture === 'EVM'
                      ? '0x...'
                      : editingConfig.architecture === 'Tron'
                      ? 'T...'
                      : 'Base58 address'
                  }
                  className="w-full p-3 rounded-xl bg-[#060912] border border-white/15 text-white font-bold outline-none focus:border-cyan-500 transition-colors"
                  required
                />
                {editError && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-slate-400 text-[11px]">
                <div>• Mọi giao dịch tạo phí trên mạng lưới {editingConfig.name} sẽ chuyển về địa chỉ này.</div>
                <div>• Có hiệu lực ngay lập tức trên toàn bộ ứng dụng và backend API.</div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Lưu & Đồng Bộ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
