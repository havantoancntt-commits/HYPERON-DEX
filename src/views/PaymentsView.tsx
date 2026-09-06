import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { Web3MerchantInvoice } from '../types';
import { formatCurrency } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { addToast } = useExchange();
  const { isConnected, connectWallet, address, executeTransaction, chainId } = useWallet();

  const [invoices, setInvoices] = useState<Web3MerchantInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [payModalInvoice, setPayModalInvoice] = useState<Web3MerchantInvoice | null>(null);

  // New invoice form
  const [invTitle, setInvTitle] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('150.00');
  const [invToken, setInvToken] = useState<string>('USDC');
  const [invNote, setInvNote] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invTitle || !invAmount) {
      addToast({
        title: 'Thiếu Thông Tin',
        message: 'Vui lòng nhập tiêu đề hóa đơn và số tiền cần thanh toán.',
        type: 'error',
      });
      return;
    }

    setCreating(true);
    setTimeout(() => {
      const newInv: Web3MerchantInvoice = {
        id: `inv-${Date.now()}`,
        title: invTitle,
        recipientWallet: address || '0x3aC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        amountUsd: parseFloat(invAmount) || 0,
        preferredToken: invToken,
        status: 'PENDING',
        customerNote: invNote || 'Web3 Gateway instant settlement',
        createdAt: Date.now(),
        items: [{ description: invTitle, qty: 1, unitPrice: parseFloat(invAmount) || 0 }],
      };

      setInvoices([newInv, ...invoices]);
      setCreating(false);
      setCreateModalOpen(false);
      setInvTitle('');
      setInvAmount('150.00');
      setInvNote('');

      addToast({
        title: 'Tạo Hóa Đơn Thanh Toán Thành Công!',
        message: `Mã hóa đơn ${newInv.id} đã sẵn sàng nhận thanh toán qua QR Code hoặc Web3 Wallet.`,
        type: 'success',
      });
    }, 1000);
  };

  const handlePayInvoice = async () => {
    if (!isConnected) {
      addToast({
        title: 'Wallet Connection Required',
        message: 'Vui lòng kết nối ví Web3 để thanh toán hóa đơn.',
        type: 'warning',
      });
      connectWallet('sandbox');
      return;
    }

    if (!payModalInvoice) return;

    setPaying(true);
    try {
      const tx = await executeTransaction({
        chainId: chainId || 'ethereum',
        type: 'TRANSFER',
        fromToken: payModalInvoice.preferredToken || 'USDC',
        toToken: payModalInvoice.preferredToken || 'USDC',
        fromAmount: payModalInvoice.amountUsd,
        toAmount: payModalInvoice.amountUsd,
        gasSpentGwei: 15,
        gasSpentUsd: 1.25,
      });

      setInvoices(
        invoices.map((inv) =>
          inv.id === payModalInvoice.id
            ? {
                ...inv,
                status: 'PAID',
                txHash: tx.txHash,
              }
            : inv
        )
      );

      addToast({
        title: 'Thanh Toán Hóa Đơn Thành Công!',
        message: `Giao dịch đã được xác nhận. TX: ${tx.txHash.slice(0, 10)}...`,
        type: 'success',
      });
      setPayModalInvoice(null);
    } catch (err: any) {
      addToast({
        title: 'Thanh Toán Thất Bại',
        message: err?.message || 'Giao dịch không thể hoàn tất.',
        type: 'error',
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <EcosystemFlowBanner />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B1422] via-[#080F1C] to-[#060A14] border border-emerald-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/50">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  Web3 Payments & Cổng Thanh Toán Doanh Nghiệp
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Zero-Slippage Settlement
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Cổng thanh toán tiền mã hoá phi tập trung tức thì. Hỗ trợ thanh toán bằng bất kỳ loại token nào với cơ chế hoán đổi tức thời thành USDC cho người bán, không chịu rủi ro biến động giá.
              </p>
            </div>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-sans flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Hóa Đơn Thanh Toán Mới</span>
          </button>
        </div>

        {/* Feature Checkpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#060912] border border-white/5 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-white font-bold">Quyết Toán Tức Thì (Instant)</div>
              <div className="text-[10px] text-slate-400">Tiền về thẳng ví không qua trung gian</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#060912] border border-white/5 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-white font-bold">Chấp Nhận Mọi Token</div>
              <div className="text-[10px] text-slate-400">Tự động quy đổi USDC qua DEX router</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#060912] border border-white/5 flex items-center gap-2.5">
            <QrCode className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-white font-bold">QR Code Chuẩn EIP-681</div>
              <div className="text-[10px] text-slate-400">Tương thích Metamask, Trust, Phantom</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
            Danh Sách Hóa Đơn & Giao Dịch Thu Chi
          </h2>
          <span className="text-xs font-mono text-slate-400">{invoices.length} Hóa đơn</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {invoices.map((inv) => {
            const isPaid = inv.status === 'PAID';
            return (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#0C1224] to-[#070B16] border border-white/10 hover:border-emerald-500/40 shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-mono text-slate-500">Mã: #{inv.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {isPaid ? '✓ ĐÃ THANH TOÁN' : '⏳ CHỜ THANH TOÁN'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base mb-1">{inv.title}</h3>
                  <div className="text-xs text-slate-400 font-mono mb-4">{inv.customerNote}</div>

                  <div className="p-3 rounded-xl bg-[#060912] border border-white/5 space-y-1 text-xs font-mono mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số tiền:</span>
                      <span className="text-emerald-400 font-extrabold text-sm">${formatCurrency(inv.amountUsd)} USD</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Ví thụ hưởng:</span>
                      <span className="text-slate-300 truncate max-w-xs">{inv.recipientWallet}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </div>

                  {isPaid ? (
                    <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Biên lai đã khóa On-Chain
                    </span>
                  ) : (
                    <button
                      onClick={() => setPayModalInvoice(inv)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Thanh Toán Ngay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1020] border border-emerald-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Tạo Hóa Đơn Web3 Mới</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Tiêu Đề Dịch Vụ / Hàng Hóa:</label>
                <input
                  type="text"
                  value={invTitle}
                  onChange={(e) => setInvTitle(e.target.value)}
                  placeholder="Ví dụ: Nâng cấp gói AI Alpha Pro 1 Năm"
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Số Tiền (USD):</label>
                  <input
                    type="number"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white font-bold outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Token Nhận:</label>
                  <select
                    value={invToken}
                    onChange={(e) => setInvToken(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                  >
                    <option value="USDC">USDC (Khuyên Dùng)</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Ghi Chú Đơn Hàng:</label>
                <textarea
                  value={invNote}
                  onChange={(e) => setInvNote(e.target.value)}
                  placeholder="Thông tin thêm cho người thanh toán..."
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang khởi tạo mã hóa đơn...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tạo Hóa Đơn & QR Code Thanh Toán</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1020] border border-emerald-500/30 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Thanh Toán Hóa Đơn Web3</h3>
              </div>
              <button
                onClick={() => setPayModalInvoice(null)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR Mock */}
            <div className="p-4 rounded-2xl bg-white mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-lg">
              <QrCode className="w-36 h-36 text-black" />
              <span className="text-[10px] text-black font-mono font-bold mt-1">EIP-681 Pay Link</span>
            </div>

            <div className="space-y-1 font-mono">
              <div className="text-white font-bold text-base">{payModalInvoice.title}</div>
              <div className="text-xl font-extrabold text-emerald-400">${formatCurrency(payModalInvoice.amountUsd)} USD</div>
              <div className="text-[11px] text-slate-400 truncate">Nhận tại: {payModalInvoice.recipientWallet}</div>
            </div>

            <button
              onClick={handlePayInvoice}
              disabled={paying}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {paying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang thực hiện thanh toán Web3...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Xác Nhận Thanh Toán Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
