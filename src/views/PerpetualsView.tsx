import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { PerpetualPosition } from '../types';
import { TokenLogo } from '../components/CryptoIcon';
import { formatCurrency, formatPercent } from '../lib/utils';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  Sliders,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  Layers,
  ChevronDown,
  RefreshCw,
  Info
} from 'lucide-react';

export const PerpetualsView: React.FC = () => {
  const { 
    selectedPair, 
    setSelectedPair, 
    selectedSignal, 
    livePrices, 
    getLiveToken, 
    getLivePrice, 
    addToast 
  } = useExchange();
  const { isConnected, connectWallet, address } = useWallet();

  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [leverage, setLeverage] = useState<number>(10);
  const [marginAmount, setMarginAmount] = useState<string>('500');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [positions, setPositions] = useState<PerpetualPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);

  const currentToken = selectedPair.base;
  const currentPrice = getLivePrice(currentToken.symbol) || 3420.50;

  // Sync with selectedSignal if provided
  useEffect(() => {
    if (selectedSignal) {
      setSide(selectedSignal.direction === 'LONG' || selectedSignal.direction === 'BUY' ? 'LONG' : 'SHORT');
      if (selectedSignal.recommendedLeverage) {
        setLeverage(selectedSignal.recommendedLeverage);
      }
      if (selectedSignal.takeProfit2) {
        setTpPrice(selectedSignal.takeProfit2.toString());
      }
      if (selectedSignal.stopLoss) {
        setSlPrice(selectedSignal.stopLoss.toString());
      }
      if (!limitPrice) {
        setLimitPrice(currentPrice.toFixed(2));
      }
    }
  }, [selectedSignal, currentPrice]);

  // Fetch active positions
  const fetchPositions = async () => {
    try {
      setLoadingPositions(true);
      const res = await fetch('/api/perpetuals/positions');
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // Calculated values
  const marginNum = parseFloat(marginAmount) || 0;
  const positionSizeUsd = marginNum * leverage;
  const positionTokens = currentPrice > 0 ? positionSizeUsd / currentPrice : 0;
  const estFeeUsd = positionSizeUsd * 0.0006; // 0.06% taker fee
  
  // Liquidation Price formula approx
  const maintenanceMargin = 0.01; // 1%
  const liqPrice = side === 'LONG'
    ? currentPrice * (1 - (1 / leverage) + maintenanceMargin)
    : currentPrice * (1 + (1 / leverage) - maintenanceMargin);

  const handleOpenPosition = () => {
    if (!isConnected) {
      addToast({
        title: 'Wallet Required',
        message: 'Please connect your Web3 wallet to submit perpetual contract orders.',
        type: 'warning',
      });
      connectWallet('demo');
      return;
    }

    if (marginNum <= 0) {
      addToast({
        title: 'Invalid Margin Amount',
        message: 'Please enter a valid margin deposit amount.',
        type: 'error',
      });
      return;
    }

    setExecuting(true);
    setTimeout(() => {
      const newPos: PerpetualPosition = {
        id: `perp-pos-${Date.now()}`,
        pair: `${currentToken.symbol}/USDC-PERP`,
        symbol: currentToken.symbol,
        side,
        entryPrice: currentPrice,
        markPrice: currentPrice,
        liquidationPrice: Number(liqPrice.toFixed(2)),
        sizeUsd: positionSizeUsd,
        marginUsd: marginNum,
        leverage,
        pnlUsd: 0,
        pnlPercent: 0,
        takeProfitPrice: tpPrice ? parseFloat(tpPrice) : undefined,
        stopLossPrice: slPrice ? parseFloat(slPrice) : undefined,
        fundingRate8hPercent: 0.0065,
        fundingEarnedUsd: 0,
        openedAt: Date.now(),
      };

      setPositions([newPos, ...positions]);
      setExecuting(false);

      addToast({
        title: `Lệnh ${side} ${currentToken.symbol} Thành Công!`,
        message: `Vị thế $${formatCurrency(positionSizeUsd)} (${leverage}x) đã khớp với giá Mark $${formatCurrency(currentPrice)}.`,
        type: 'success',
      });
    }, 1200);
  };

  const handleClosePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
    addToast({
      title: 'Đã Đóng Vị Thế Thành Công',
      message: 'Lợi nhuận và ký quỹ đã được giải ngân về ví phi tập trung của bạn.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <EcosystemFlowBanner />

      {/* Header & Market Stats Ribbon */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B1020] via-[#090D1A] to-[#070912] border border-cyan-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <TokenLogo
            symbol={currentToken.symbol}
            name={currentToken.name}
            src={currentToken.logoUrl}
            chainId="arbitrum"
            className="w-10 h-10 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{currentToken.symbol}/USDC-PERP</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                50x MAX LEVERAGE
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Arbitrum Nitro Liquidity Pool • Funding Rate: <strong className="text-emerald-400">+0.0062%/8h</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <div className="text-slate-500">Giá Hiện Tại (Mark)</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              ${formatCurrency(currentPrice)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Khối Lượng 24h</div>
            <div className="text-base font-bold text-white mt-0.5">$384,200,000</div>
          </div>
          <div>
            <div className="text-slate-500">Đếm Ngược Funding</div>
            <div className="text-base font-bold text-amber-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 02:44:18
            </div>
          </div>
        </div>
      </div>

      {/* Main Perpetuals Trading Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Pro Chart & Depth Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-[#080C16] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Biểu Đồ Kỹ Thuật Trực Tuyến & Độ Sâu Thanh Khoản
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {['15M', '1H', '4H', '1D'].map((tf) => (
                  <button
                    key={tf}
                    className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                      tf === '1H' ? 'bg-blue-600 text-white font-bold' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Visual Canvas Mock / Price Action */}
            <div className="h-72 rounded-xl bg-gradient-to-b from-[#0B1122] to-[#060A14] border border-white/5 p-4 flex flex-col justify-between relative overflow-hidden font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">MA(25): <strong className="text-amber-400">${(currentPrice * 0.995).toFixed(2)}</strong></span>
                <span className="text-slate-400">EMA(99): <strong className="text-cyan-400">${(currentPrice * 0.982).toFixed(2)}</strong></span>
                <span className="text-slate-400">RSI(14): <strong className="text-emerald-400">62.8</strong></span>
              </div>

              {/* Graphical Candlestick Simulation Wave */}
              <div className="relative h-44 flex items-end justify-between gap-1.5 px-2">
                {[45, 52, 48, 60, 58, 65, 62, 70, 68, 75, 72, 80, 78, 85, 82, 90, 88, 95, 92, 100].map((h, i) => {
                  const isUp = i % 3 !== 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className={`w-[1px] ${isUp ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`} style={{ height: `${h + 10}%` }} />
                      <div
                        className={`w-full rounded-sm ${isUp ? 'bg-emerald-500 shadow-emerald-900/40' : 'bg-rose-500 shadow-rose-900/40'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-2">
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span className="text-cyan-400 font-bold">Now: ${formatCurrency(currentPrice)}</span>
              </div>
            </div>
          </div>

          {/* Active Positions Table */}
          <div className="p-5 rounded-2xl bg-[#080C16] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Vị Thế Mở Hiện Tại (Active Positions)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {positions.length} Vị Thế
                </span>
              </div>
              <button
                onClick={fetchPositions}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Làm Mới
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Chưa có vị thế đòn bẩy nào. Hãy tạo lệnh bên phải hoặc chọn từ AI Alpha Signals!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px]">
                      <th className="pb-2">Cặp / Phe</th>
                      <th className="pb-2">Quy Mô / Đòn Bẩy</th>
                      <th className="pb-2">Giá Vào (Entry)</th>
                      <th className="pb-2">Giá Thanh Lý</th>
                      <th className="pb-2">Lợi Nhuận (PnL)</th>
                      <th className="pb-2 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {positions.map((pos) => {
                      const isProfit = pos.pnlUsd >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-white/[0.02]">
                          <td className="py-3">
                            <div className="font-bold text-white">{pos.pair}</div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              pos.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {pos.side}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-white font-bold">${formatCurrency(pos.sizeUsd)}</div>
                            <div className="text-[10px] text-cyan-400">{pos.leverage}x (Ký quỹ ${pos.marginUsd})</div>
                          </td>
                          <td className="py-3 text-slate-300">
                            ${formatCurrency(pos.entryPrice)}
                          </td>
                          <td className="py-3 text-rose-400 font-bold">
                            ${formatCurrency(pos.liquidationPrice)}
                          </td>
                          <td className="py-3">
                            <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${formatCurrency(pos.pnlUsd)} ({pos.pnlPercent}%)
                            </div>
                            {pos.takeProfitPrice && (
                              <div className="text-[10px] text-slate-500">TP: ${pos.takeProfitPrice} | SL: ${pos.stopLossPrice}</div>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/20 transition-all cursor-pointer"
                            >
                              Đóng Vị Thế
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Order Execution Form */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0C1224] to-[#070B16] border border-cyan-500/30 shadow-2xl space-y-5">
            {/* Long / Short Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#060912] border border-white/5 font-sans font-bold text-xs">
              <button
                onClick={() => setSide('LONG')}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  side === 'LONG'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Mở Long (Mua Lên)
              </button>
              <button
                onClick={() => setSide('SHORT')}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  side === 'SHORT'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Mở Short (Bán Xuống)
              </button>
            </div>

            {/* AI Signal Autofill Notification */}
            {selectedSignal && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Đồng bộ từ AI Signal: <strong>{selectedSignal.winRateProbability}% Win-Rate</strong></span>
                </div>
              </div>
            )}

            {/* Leverage Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Đòn Bẩy (Leverage):</span>
                <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {leverage}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1x</span>
                <span>10x</span>
                <span>25x</span>
                <span>50x Max</span>
              </div>
            </div>

            {/* Margin Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Tiền Ký Quỹ (Margin USDC):</label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#060912] border border-white/10 focus-within:border-cyan-500/50">
                <input
                  type="number"
                  value={marginAmount}
                  onChange={(e) => setMarginAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-white font-mono text-base font-bold outline-none w-full"
                />
                <span className="text-xs font-mono text-cyan-400 font-bold">USDC</span>
              </div>
            </div>

            {/* Auto Take Profit & Stop Loss */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-emerald-400">Chốt Lời (TP Price):</label>
                <input
                  type="number"
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  placeholder={`$${(currentPrice * 1.15).toFixed(2)}`}
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-emerald-500/20 text-white font-bold outline-none text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-rose-400">Cắt Lỗ (SL Price):</label>
                <input
                  type="number"
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  placeholder={`$${(currentPrice * 0.96).toFixed(2)}`}
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-rose-500/20 text-white font-bold outline-none text-xs"
                />
              </div>
            </div>

            {/* Order Summary & Calculations */}
            <div className="p-3 rounded-xl bg-[#060912] border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Quy mô vị thế:</span>
                <span className="text-white font-bold">${formatCurrency(positionSizeUsd)} ({positionTokens.toFixed(4)} {currentToken.symbol})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Giá thanh lý ước tính:</span>
                <span className="text-rose-400 font-bold">${formatCurrency(liqPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Phí mở lệnh (Taker):</span>
                <span className="text-slate-300">${formatCurrency(estFeeUsd)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleOpenPosition}
              disabled={executing}
              className={`w-full py-3.5 rounded-xl font-bold font-sans text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                side === 'LONG'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-900/40'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-900/40'
              }`}
            >
              {executing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang khớp lệnh MEV Shield...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Mở Vị Thế {side} {leverage}x ({currentToken.symbol})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
