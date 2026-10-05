import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Flame, 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  ArrowUpRight,
  PieChart,
  Percent,
  Clock,
  Sparkles,
  Download
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useExchange } from '../../context/ExchangeContext';
import { getHyprContractAddress, setCustomHyprContractAddress, resetHyprContractAddress } from '../../lib/hyprConfig';
import { shortenAddress } from '../../lib/utils';
import { soundManager } from '../../lib/sound';

export const HyprTokenManagerPanel: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { addToast } = useExchange();

  const [hyprAddress, setHyprAddress] = useState<string>(getHyprContractAddress());
  const [customInput, setCustomInput] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live Governance Parameters
  const [govConfig, setGovConfig] = useState({
    name: 'Hyperon',
    symbol: 'HYPR',
    decimals: 18,
    totalCap: '1,000,000,000 HYPR',
    protocolFeeShareBps: 50, // 0.5%
    antiWhaleMaxTxBps: 100, // 1%
    timelockDelayHours: 24,
    stakingApyMultiplier: 1.0,
    burnRateBps: 25, // 0.25%
    treasuryAddress: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    burnAddress: '0x000000000000000000000000000000000000dEaD',
    stakingVaultAddress: '0x71C8A66D268eCBE77E136125027581a94fa4F67a',
    isEmergencyPaused: false,
    lastUpdated: Date.now(),
  });

  // Token Supply Breakdown Metrics
  const [supplyStats, setSupplyStats] = useState({
    totalSupply: 1000000000,
    circulating: 185000000,
    treasuryReserve: 450000000,
    ecosystemStaking: 250000000,
    burnedTokens: 115000000,
    currentPriceUsd: 0.185,
    marketCapUsd: 185000000 * 0.185,
  });

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hypr/governance');
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.config) {
          setGovConfig(data.config);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    const handleUpdate = () => setHyprAddress(getHyprContractAddress());
    window.addEventListener('hypr-address-updated', handleUpdate);
    return () => window.removeEventListener('hypr-address-updated', handleUpdate);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    soundManager.playTick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveGovernance = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/hypr/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(govConfig),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cập nhật tham số thất bại');

      soundManager.playSuccess();
      addToast({
        title: 'Cập Nhật Quản Trị Thành Công',
        message: 'Các tham số kinh tế học và bảo mật của token HYPR đã được ghi nhận.',
        type: 'success',
      });
    } catch (err: any) {
      soundManager.playError();
      addToast({
        title: 'Lỗi Cập Nhật',
        message: err.message || 'Không thể lưu tham số quản trị',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetCustomAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.startsWith('0x') || customInput.length !== 42) {
      addToast({ title: 'Địa Chỉ Không Hợp Lệ', message: 'Địa chỉ token phải có định dạng 42 ký tự EVM 0x...', type: 'error' });
      return;
    }
    setCustomHyprContractAddress(customInput);
    setHyprAddress(customInput);
    setCustomInput('');
    soundManager.playSuccess();
    addToast({ title: 'Đã Cập Nhật Token', message: 'Địa chỉ HYPR mới đã được kích hoạt trên toàn giao thức.', type: 'success' });
  };

  const handleResetAddress = () => {
    resetHyprContractAddress();
    setHyprAddress(getHyprContractAddress());
    soundManager.playTick();
    addToast({ title: 'Đã Đặt Lại', message: 'Đã khôi phục địa chỉ token HYPR gốc.', type: 'info' });
  };

  const handleExportSafeBatch = () => {
    const safeBatch = {
      version: '1.0',
      chainId: '8453',
      createdAt: Date.now(),
      meta: {
        name: 'HYPERON HYPR Governance Update',
        description: 'Multi-Sig batch proposal for updating protocol fee share and timelock parameters.',
      },
      transactions: [
        {
          to: govConfig.treasuryAddress,
          value: '0',
          data: null,
          contractMethod: {
            name: 'setProtocolFeeShareBps',
            inputs: [{ name: 'feeShareBps', type: 'uint256' }],
          },
          contractInputsValues: {
            feeShareBps: govConfig.protocolFeeShareBps.toString(),
          },
        },
      ],
    };

    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeBatch, null, 2));
    const exportFileDefaultName = `hypr-governance-proposal-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    soundManager.playSuccess();
    addToast({
      title: 'Đã Xuất Gnosis Safe Batch',
      message: 'File JSON đề xuất Multi-Sig đã sẵn sàng để import vào Gnosis Safe / Timelock.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#140E06] via-[#1A1208] to-[#0D0B07] border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Coins className="w-7 h-7" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Quản Trị Token HYPR (Protocol Utility & Governance)
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                  CANONICAL ASSET
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Quản lý tham số tokenomics, cơ chế Buyback & Burn, tỷ lệ chia sẻ phí giao dịch, và an ninh chống cá mập.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportSafeBatch}
              className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Gnosis Safe Proposal</span>
            </button>
            <button
              onClick={fetchConfig}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-[#090D15] border border-white/10 shadow-lg">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>TỔNG CUNG CỐ ĐỊNH (MAX CAP)</span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1.5">
            {supplyStats.totalSupply.toLocaleString()} HYPR
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">100% Minted tại Genesis (Zero Inflation)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D15] border border-white/10 shadow-lg">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>ĐÃ ĐỐT (PROOF-OF-BURN)</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-400 mt-1.5">
            {supplyStats.burnedTokens.toLocaleString()} HYPR
          </div>
          <div className="text-[10px] text-slate-400 mt-1">11.5% tổng cung bị thiêu hủy vĩnh viễn</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D15] border border-white/10 shadow-lg">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>VỐN HÓA LƯU HÀNH (MARKET CAP)</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-cyan-300 mt-1.5">
            ${(supplyStats.marketCapUsd / 1e6).toFixed(2)}M USD
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Giá tham chiếu: ${supplyStats.currentPriceUsd}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D15] border border-white/10 shadow-lg">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>QUỸ TREASURY DỰ TRỮ</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-300 mt-1.5">
            {supplyStats.treasuryReserve.toLocaleString()} HYPR
          </div>
          <div className="text-[10px] text-slate-400 mt-1">45% phân bổ theo Timelock 36 tháng</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Governance Slider Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Điều Chỉnh Tham Số Tokenomics & Cơ Chế Phí Giao Thức
            </h3>

            {/* Parameter 1: Protocol Fee Share to Stakers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Chia sẻ phí giao dịch cho HYPR Stakers:</span>
                <span className="font-mono text-amber-400 font-bold">{(govConfig.protocolFeeShareBps / 100).toFixed(2)}% ({(govConfig.protocolFeeShareBps)} BPS)</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="5"
                value={govConfig.protocolFeeShareBps}
                onChange={(e) => setGovConfig({ ...govConfig, protocolFeeShareBps: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Tỷ lệ phần trăm tổng phí swap của toàn sàn được tự động trích ra để phân bổ lại cho người khóa HYPR vào staking vaults.
              </p>
            </div>

            {/* Parameter 2: Fee Burn Rate */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Tỷ lệ tự động đốt (Auto-Burn Rate):</span>
                <span className="font-mono text-rose-400 font-bold">{(govConfig.burnRateBps / 100).toFixed(2)}% ({govConfig.burnRateBps} BPS)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={govConfig.burnRateBps}
                onChange={(e) => setGovConfig({ ...govConfig, burnRateBps: Number(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Số lượng HYPR được mua lại và chuyển vĩnh viễn tới địa chỉ <code>0x...dEaD</code> ở mỗi chu kỳ thanh toán.
              </p>
            </div>

            {/* Parameter 3: Anti-Whale Limit */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Hạn mức giao dịch tối đa (Anti-Whale Cap):</span>
                <span className="font-mono text-cyan-400 font-bold">{(govConfig.antiWhaleMaxTxBps / 100).toFixed(1)}% Tổng Cung</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={govConfig.antiWhaleMaxTxBps}
                onChange={(e) => setGovConfig({ ...govConfig, antiWhaleMaxTxBps: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Ngăn chặn thao túng giá từ cá mập: mỗi lệnh swap không thể vượt quá {(govConfig.antiWhaleMaxTxBps / 100).toFixed(1)}% thanh khoản trong 1 khối.
              </p>
            </div>

            {/* Parameter 4: Timelock Delay */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Thời gian trì hoãn Timelock (Timelock Delay):</span>
                <span className="font-mono text-white font-bold">{govConfig.timelockDelayHours} Giờ</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[12, 24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setGovConfig({ ...govConfig, timelockDelayHours: hours })}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      govConfig.timelockDelayHours === hours
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-black/30 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {hours}h Delay
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleSaveGovernance}
                disabled={saving}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Lưu & Đồng Bộ Tham Số Quản Trị On-Chain</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Contract Pointer & Canonical Pools */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Contract Pointer */}
          <div className="p-5 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-white/5">
              <span>Địa Chỉ Smart Contract HYPR Hiện Tại</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                ERC-20 + PERMIT
              </span>
            </h3>

            <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2 text-xs font-mono">
              <div className="text-slate-400 text-[11px]">Contract Address (Active):</div>
              <div className="text-amber-300 font-bold break-all flex items-center justify-between">
                <span>{hyprAddress}</span>
                <button
                  onClick={() => handleCopy(hyprAddress, 'hypr_addr')}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedKey === 'hypr_addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Custom Address Setter */}
            <form onSubmit={handleSetCustomAddress} className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300">Gán Địa Chỉ Hợp Đồng HYPR Mới (Sau Khi Deploy Mainnet):</div>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Nhập địa chỉ contract mới 0x..."
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all"
                >
                  Kích Hoạt Địa Chỉ Mới
                </button>
                <button
                  type="button"
                  onClick={handleResetAddress}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold cursor-pointer transition-all"
                >
                  Khôi Phục Gốc
                </button>
              </div>
            </form>
          </div>

          {/* Canonical Liquidity Pools */}
          <div className="p-5 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-2 border-b border-white/5">
              <span>Thanh Khoản Canonical Pools</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Uniswap V3</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>HYPR / WETH</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Fee Tier 0.3%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">TVL: $4,250,000 | 24h Vol: $890,000</div>
                </div>
                <span className="text-emerald-400 text-[11px] font-bold">Active</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>HYPR / USDC</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Base L2 (0.05%)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">TVL: $2,840,000 | 24h Vol: $560,000</div>
                </div>
                <span className="text-emerald-400 text-[11px] font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
