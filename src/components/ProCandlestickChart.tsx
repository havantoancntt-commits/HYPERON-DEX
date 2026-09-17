import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CandleData } from '../types';
import {
  TrendingUp,
  LineChart,
  BarChart3,
  Maximize2,
  Minimize2,
  RotateCcw,
  Activity,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export interface ProCandlestickChartProps {
  candles: CandleData[];
  symbol: string;
  currentPrice: number;
  tickDirection?: 'up' | 'down' | 'same';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  onTimeframeChange: (tf: '1m' | '5m' | '15m' | '1h' | '4h' | '1D') => void;
  high24h?: number;
  low24h?: number;
  spreadPercent?: number;
  className?: string;
}

type ChartType = 'candles' | 'hollow' | 'line';

interface IndicatorState {
  ema: boolean;
  vol: boolean;
  rsi: boolean;
  macd: boolean;
}

export const ProCandlestickChart: React.FC<ProCandlestickChartProps> = ({
  candles,
  symbol,
  currentPrice,
  tickDirection = 'same',
  timeframe,
  onTimeframeChange,
  high24h,
  low24h,
  spreadPercent = 0.04,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // User Interactive State
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicators, setIndicators] = useState<IndicatorState>({
    ema: true,
    vol: true,
    rsi: false,
    macd: false,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [isTouchActive, setIsTouchActive] = useState(false);

  // Technical Indicators Calculation
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);

  const ema7Series = useMemo(() => {
    if (closes.length < 7) return [];
    const k = 2 / (7 + 1);
    const result: number[] = [closes[0]];
    for (let i = 1; i < closes.length; i++) {
      result.push((closes[i] - result[i - 1]) * k + result[i - 1]);
    }
    return result;
  }, [closes]);

  const ema25Series = useMemo(() => {
    if (closes.length < 25) return [];
    const k = 2 / (25 + 1);
    const result: number[] = [closes[0]];
    for (let i = 1; i < closes.length; i++) {
      result.push((closes[i] - result[i - 1]) * k + result[i - 1]);
    }
    return result;
  }, [closes]);

  // RSI(14)
  const rsi14 = useMemo(() => {
    if (closes.length < 15) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= 14; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / 14;
    let avgLoss = losses / 14;
    for (let i = 15; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * 13 + diff) / 14;
        avgLoss = (avgLoss * 13) / 14;
      } else {
        avgGain = (avgGain * 13) / 14;
        avgLoss = (avgLoss * 13 + Math.abs(diff)) / 14;
      }
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
  }, [closes]);

  // MACD (12, 26, 9)
  const macdValues = useMemo(() => {
    if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 };
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    let ema12 = closes[0];
    let ema26 = closes[0];
    const macdLine: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      ema12 = (closes[i] - ema12) * k12 + ema12;
      ema26 = (closes[i] - ema26) * k26 + ema26;
      macdLine.push(ema12 - ema26);
    }
    const k9 = 2 / (9 + 1);
    let signal = macdLine[0];
    for (let i = 1; i < macdLine.length; i++) {
      signal = (macdLine[i] - signal) * k9 + signal;
    }
    const lastMacd = macdLine[macdLine.length - 1];
    return {
      macd: Number(lastMacd.toFixed(2)),
      signal: Number(signal.toFixed(2)),
      hist: Number((lastMacd - signal).toFixed(2)),
    };
  }, [closes]);

  // Current active candle for HUD
  const activeCandle = useMemo(() => {
    if (hoveredIndex !== null && candles[hoveredIndex]) {
      return candles[hoveredIndex];
    }
    return candles.length > 0 ? candles[candles.length - 1] : null;
  }, [hoveredIndex, candles]);

  const activeEma7 = useMemo(() => {
    if (hoveredIndex !== null && ema7Series[hoveredIndex] !== undefined) {
      return ema7Series[hoveredIndex];
    }
    return ema7Series.length > 0 ? ema7Series[ema7Series.length - 1] : null;
  }, [hoveredIndex, ema7Series]);

  const activeEma25 = useMemo(() => {
    if (hoveredIndex !== null && ema25Series[hoveredIndex] !== undefined) {
      return ema25Series[hoveredIndex];
    }
    return ema25Series.length > 0 ? ema25Series[ema25Series.length - 1] : null;
  }, [hoveredIndex, ema25Series]);

  // Format Price smartly
  const formatPrice = useCallback((price: number): string => {
    if (price === 0) return '0.00';
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 1) {
      return price.toFixed(price >= 10 ? 2 : 4);
    }
    if (price >= 0.0001) {
      return price.toFixed(6);
    }
    return price.toPrecision(4);
  }, []);

  // Format Time for Time Axis
  const formatTime = useCallback(
    (timestamp: number): string => {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      if (timeframe === '1D') {
        return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
      }
      if (timeframe === '4h' || timeframe === '1h') {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${date.getDate()}/${date.getMonth() + 1} ${hours}:${minutes}`;
      }
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    },
    [timeframe]
  );

  // Full Timestamp for Tooltip / HUD
  const formatFullTime = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} ${date.toLocaleTimeString('en-US', { hour12: false })}`;
  }, []);

  // Core Canvas Drawing Routine
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width === 0 || height === 0) return;

    // Scale canvas for high-DPI retina display
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Layout Dimensions
    const rightAxisWidth = width < 480 ? 60 : 70;
    const bottomAxisHeight = 26;
    const topPadding = 12;
    const leftPadding = 8;

    const chartWidth = width - rightAxisWidth - leftPadding;
    const fullChartHeight = height - bottomAxisHeight - topPadding;

    if (chartWidth <= 10 || fullChartHeight <= 10) {
      ctx.restore();
      return;
    }

    // Split Price Chart and Volume Chart
    const showVol = indicators.vol;
    const volHeight = showVol ? Math.min(Math.max(fullChartHeight * 0.18, 36), 65) : 0;
    const priceChartHeight = showVol ? fullChartHeight - volHeight - 6 : fullChartHeight;
    const volChartTop = topPadding + priceChartHeight + 6;

    // Background Fill
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, width, height);

    // Right & Bottom Axis Backgrounds
    ctx.fillStyle = '#0B101D';
    ctx.fillRect(chartWidth + leftPadding, 0, rightAxisWidth, height);
    ctx.fillRect(0, height - bottomAxisHeight, width, bottomAxisHeight);

    // Axis Divider Borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Vertical right gutter line
    ctx.beginPath();
    ctx.moveTo(chartWidth + leftPadding, 0);
    ctx.lineTo(chartWidth + leftPadding, height);
    ctx.stroke();

    // Horizontal bottom gutter line
    ctx.beginPath();
    ctx.moveTo(0, height - bottomAxisHeight);
    ctx.lineTo(width, height - bottomAxisHeight);
    ctx.stroke();

    if (candles.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Đang tải dữ liệu nến On-chain...', chartWidth / 2 + leftPadding, fullChartHeight / 2);
      ctx.restore();
      return;
    }

    // Price Extents with buffer
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    if (currentPrice > 0) {
      highs.push(currentPrice);
      lows.push(currentPrice);
    }
    const rawMax = Math.max(...highs);
    const rawMin = Math.min(...lows);
    const padding = (rawMax - rawMin) * 0.08 || rawMax * 0.02 || 1;
    const maxPrice = rawMax + padding;
    const minPrice = Math.max(rawMin - padding, 0.000001);
    const priceRange = maxPrice - minPrice;

    // Max Volume for Volume chart
    const maxVol = Math.max(...candles.map((c) => c.volume || 1), 1);

    // Helper functions for coordinate mapping
    const priceToY = (price: number): number => {
      const pct = (price - minPrice) / priceRange;
      return topPadding + priceChartHeight - pct * priceChartHeight;
    };

    const yToPrice = (y: number): number => {
      const clampedY = Math.max(topPadding, Math.min(topPadding + priceChartHeight, y));
      const pct = (topPadding + priceChartHeight - clampedY) / priceChartHeight;
      return minPrice + pct * priceRange;
    };

    // Number of slots
    const n = candles.length;
    const slotWidth = chartWidth / n;
    const candleWidth = Math.max(Math.min(slotWidth * 0.72, 14), 2.5);

    // 1. Grid Lines & Right Price Scale Ticks
    const numPriceTicks = height < 400 ? 5 : 7;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numPriceTicks; i++) {
      const frac = i / numPriceTicks;
      const p = minPrice + frac * priceRange;
      const y = Math.round(priceToY(p)) - 0.5;

      // Horizontal subtle grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(chartWidth + leftPadding, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis price label
      ctx.fillStyle = '#64748B';
      ctx.fillText(formatPrice(p), chartWidth + leftPadding + 6, y);
    }

    // 2. Vertical Time Grid & Bottom Axis Labels
    const maxTimeLabels = Math.max(Math.floor(chartWidth / 70), 3);
    const step = Math.max(Math.floor(n / maxTimeLabels), 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < n; i += step) {
      const candle = candles[i];
      const cx = Math.round(leftPadding + i * slotWidth + slotWidth / 2) - 0.5;

      // Vertical subtle grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, topPadding);
      ctx.lineTo(cx, topPadding + priceChartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Time label on bottom axis
      const label = formatTime(candle.time);
      if (label) {
        ctx.fillStyle = '#64748B';
        ctx.fillText(label, cx, height - bottomAxisHeight + 7);
      }
    }

    // 3. Volume Sub-Chart (Histogram)
    if (showVol && volHeight > 0) {
      // Volume baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftPadding, volChartTop);
      ctx.lineTo(chartWidth + leftPadding, volChartTop);
      ctx.stroke();

      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const isUp = c.close >= c.open;
        const cx = leftPadding + i * slotWidth + slotWidth / 2;
        const barLeft = Math.round(cx - candleWidth / 2);
        const barWidth = Math.max(Math.round(candleWidth), 1);

        const vFrac = Math.min((c.volume || 1) / maxVol, 1);
        const barH = Math.max(vFrac * (volHeight - 4), 2);
        const barY = volChartTop + volHeight - barH;

        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(barLeft, barY, barWidth, barH);
      }
    }

    // 4. Candlesticks / Line Chart Rendering
    if (chartType === 'line') {
      // Area Line Chart with Glowing Gradient
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const cx = leftPadding + i * slotWidth + slotWidth / 2;
        const cy = priceToY(candles[i].close);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }

      // Stroke Line
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Area Fill
      const lastX = leftPadding + (n - 1) * slotWidth + slotWidth / 2;
      const firstX = leftPadding + slotWidth / 2;
      const bottomY = topPadding + priceChartHeight;

      ctx.lineTo(lastX, bottomY);
      ctx.lineTo(firstX, bottomY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, topPadding, 0, bottomY);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.00)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glowing dot at last price
      const lastCy = priceToY(candles[n - 1].close);
      ctx.beginPath();
      ctx.arc(lastX, lastCy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastCy, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.fill();
    } else {
      // Candlesticks (Solid or Hollow)
      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const isUp = c.close >= c.open;
        const cx = leftPadding + i * slotWidth + slotWidth / 2;
        const wickX = Math.round(cx) - 0.5;

        const yHigh = priceToY(c.high);
        const yLow = priceToY(c.low);
        const yOpen = priceToY(c.open);
        const yClose = priceToY(c.close);

        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);
        const bodyLeft = Math.round(cx - candleWidth / 2);
        const bodyW = Math.max(Math.round(candleWidth), 2);

        const bullColor = '#0ECB81';
        const bearColor = '#F6465D';

        // Draw Wick
        ctx.strokeStyle = isUp ? bullColor : bearColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wickX, yHigh);
        ctx.lineTo(wickX, bodyTop);
        ctx.moveTo(wickX, bodyTop + bodyHeight);
        ctx.lineTo(wickX, yLow);
        ctx.stroke();

        // Draw Body
        if (chartType === 'hollow' && isUp) {
          // Hollow Green
          ctx.strokeStyle = bullColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bodyLeft + 0.5, bodyTop, bodyW - 1, bodyHeight);
        } else {
          // Solid Candle
          ctx.fillStyle = isUp ? bullColor : bearColor;
          ctx.fillRect(bodyLeft, bodyTop, bodyW, bodyHeight);
        }

        // Highlight if hovered
        if (hoveredIndex === i) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bodyLeft - 1, bodyTop - 1, bodyW + 2, bodyHeight + 2);
        }
      }
    }

    // 5. Technical Indicators Overlays (EMA 7 & EMA 25)
    if (indicators.ema) {
      // EMA 7 (Amber)
      if (ema7Series.length > 0) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const val = ema7Series[i];
          if (val === undefined) continue;
          const cx = leftPadding + i * slotWidth + slotWidth / 2;
          const cy = priceToY(val);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }

      // EMA 25 (Purple)
      if (ema25Series.length > 0) {
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const val = ema25Series[i];
          if (val === undefined) continue;
          const cx = leftPadding + i * slotWidth + slotWidth / 2;
          const cy = priceToY(val);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    }

    // 6. Live Current Price Line & Right Axis Tag
    if (currentPrice > 0) {
      const curY = Math.round(priceToY(currentPrice)) - 0.5;

      // Dashed horizontal price track line
      ctx.strokeStyle = tickDirection === 'up' ? '#10B981' : tickDirection === 'down' ? '#EF4444' : '#3B82F6';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(leftPadding, curY);
      ctx.lineTo(chartWidth + leftPadding, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right Axis Price Badge
      const badgeHeight = 20;
      const badgeY = curY - badgeHeight / 2;
      const badgeBg = tickDirection === 'up' ? '#059669' : tickDirection === 'down' ? '#DC2626' : '#2563EB';

      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(chartWidth + leftPadding + 2, badgeY, rightAxisWidth - 4, badgeHeight, 4);
      ctx.fill();

      // Beacon circle on badge
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(chartWidth + leftPadding + 8, curY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(currentPrice), chartWidth + leftPadding + 14, curY);
    }

    // 7. Interactive Crosshair & Cursor Badges
    if (crosshairPos && crosshairPos.x >= leftPadding && crosshairPos.x <= chartWidth + leftPadding) {
      const snapIndex = Math.max(
        0,
        Math.min(n - 1, Math.floor((crosshairPos.x - leftPadding) / slotWidth))
      );
      const snapX = Math.round(leftPadding + snapIndex * slotWidth + slotWidth / 2) - 0.5;
      const snapY = Math.round(Math.max(topPadding, Math.min(topPadding + priceChartHeight, crosshairPos.y))) - 0.5;

      // Crosshair Dashed Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(snapX, topPadding);
      ctx.lineTo(snapX, height - bottomAxisHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(leftPadding, snapY);
      ctx.lineTo(chartWidth + leftPadding, snapY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair Price Badge on Y-axis
      const hoveredPrice = yToPrice(snapY);
      const chBadgeH = 18;
      const chBadgeY = snapY - chBadgeH / 2;

      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chartWidth + leftPadding + 2, chBadgeY, rightAxisWidth - 4, chBadgeH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(hoveredPrice), chartWidth + leftPadding + rightAxisWidth / 2, snapY);

      // Crosshair Time Badge on X-axis
      const snapCandle = candles[snapIndex];
      if (snapCandle) {
        const timeLabel = formatFullTime(snapCandle.time);
        ctx.font = '9px JetBrains Mono, monospace';
        const textWidth = ctx.measureText(timeLabel).width + 12;
        const timeBadgeX = Math.max(leftPadding, Math.min(chartWidth + leftPadding - textWidth, snapX - textWidth / 2));

        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(timeBadgeX, height - bottomAxisHeight + 3, textWidth, 18, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeLabel, timeBadgeX + textWidth / 2, height - bottomAxisHeight + 12);
      }
    }

    ctx.restore();
  }, [
    candles,
    currentPrice,
    tickDirection,
    chartType,
    indicators,
    hoveredIndex,
    crosshairPos,
    timeframe,
    ema7Series,
    ema25Series,
    formatPrice,
    formatTime,
    formatFullTime,
  ]);

  // RequestAnimationFrame Hook
  useEffect(() => {
    let animId = requestAnimationFrame(drawChart);
    return () => cancelAnimationFrame(animId);
  }, [drawChart]);

  // Window & Container Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      drawChart();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawChart]);

  // Mouse & Touch Event Handlers
  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const leftPadding = 8;
    const rightAxisWidth = canvas.clientWidth < 480 ? 60 : 70;
    const chartWidth = canvas.clientWidth - rightAxisWidth - leftPadding;

    if (x >= leftPadding && x <= chartWidth + leftPadding && candles.length > 0) {
      const slotWidth = chartWidth / candles.length;
      const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((x - leftPadding) / slotWidth)));
      setHoveredIndex(idx);
      setCrosshairPos({ x, y });
    } else {
      setHoveredIndex(null);
      setCrosshairPos(null);
    }
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
    setCrosshairPos(null);
    setIsTouchActive(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#080C14] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      } ${className}`}
    >
      {/* Top Pro Toolbar: Timeframes, Chart Styles & Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-[#0B101D] border-b border-white/[0.06]">
        {/* Left: Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-[#131926] p-1 rounded-xl border border-white/[0.04]">
          {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Middle: Chart Type Switcher & Technical Indicators */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Chart Types */}
          <div className="flex items-center gap-0.5 bg-[#131926] p-1 rounded-xl border border-white/[0.04]">
            <button
              onClick={() => setChartType('candles')}
              title="Nến Nhật (Candlesticks)"
              className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'candles'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Nến</span>
            </button>
            <button
              onClick={() => setChartType('hollow')}
              title="Nến Rỗng (Hollow Candles)"
              className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                chartType === 'hollow'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[11px] font-bold">Rỗng</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              title="Biểu Đồ Đường (Area Line)"
              className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                chartType === 'line'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LineChart className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Đường</span>
            </button>
          </div>

          {/* Indicators Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIndicators((prev) => ({ ...prev, ema: !prev.ema }))}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                indicators.ema
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-[#131926] text-slate-400 border-white/[0.06] hover:text-white'
              }`}
            >
              EMA
            </button>
            <button
              onClick={() => setIndicators((prev) => ({ ...prev, vol: !prev.vol }))}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                indicators.vol
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-[#131926] text-slate-400 border-white/[0.06] hover:text-white'
              }`}
            >
              VOL
            </button>
            <button
              onClick={() => setIndicators((prev) => ({ ...prev, rsi: !prev.rsi }))}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                indicators.rsi
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-[#131926] text-slate-400 border-white/[0.06] hover:text-white'
              }`}
            >
              RSI
            </button>
            <button
              onClick={() => setIndicators((prev) => ({ ...prev, macd: !prev.macd }))}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                indicators.macd
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-[#131926] text-slate-400 border-white/[0.06] hover:text-white'
              }`}
            >
              MACD
            </button>
          </div>
        </div>

        {/* Right Tools: Reset & Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setHoveredIndex(null);
              setCrosshairPos(null);
              drawChart();
            }}
            title="Khôi phục trạng thái chuẩn"
            className="p-1.5 rounded-lg bg-[#131926] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/[0.04]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            className="p-1.5 rounded-lg bg-[#131926] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/[0.04]"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Real-time OHLCV HUD & Technical Indicator Status */}
      <div className="px-3 py-1.5 bg-[#090E17] border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono">
        {/* OHLCV metrics for active/hovered candle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {activeCandle ? (
            <>
              <span className="text-slate-400 font-bold">{symbol}/USDC</span>
              <span className="text-slate-500 hidden md:inline">{formatFullTime(activeCandle.time)}</span>
              <span>
                <span className="text-slate-500 mr-1">O</span>
                <span className="text-white font-bold">${formatPrice(activeCandle.open)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">H</span>
                <span className="text-emerald-400 font-bold">${formatPrice(activeCandle.high)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">L</span>
                <span className="text-rose-400 font-bold">${formatPrice(activeCandle.low)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">C</span>
                <span
                  className={`font-bold ${
                    activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${formatPrice(activeCandle.close)}
                </span>
              </span>
              {activeCandle.open > 0 && (
                <span
                  className={`font-bold flex items-center ${
                    activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeCandle.close >= activeCandle.open ? '+' : ''}
                  {(((activeCandle.close - activeCandle.open) / activeCandle.open) * 100).toFixed(2)}%
                </span>
              )}
              {indicators.vol && (
                <span className="hidden sm:inline">
                  <span className="text-slate-500 mr-1">Vol</span>
                  <span className="text-cyan-300 font-semibold">{activeCandle.volume.toLocaleString()}</span>
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-medium">Đang nhận dữ liệu trực tiếp...</span>
          )}
        </div>

        {/* Dynamic Indicator Values Legend */}
        <div className="flex items-center gap-2.5 text-[10px]">
          {indicators.ema && (
            <>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-2 h-0.5 bg-amber-400" />
                EMA(7): {activeEma7 !== null ? `$${formatPrice(activeEma7)}` : '—'}
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-bold">
                <span className="w-2 h-0.5 bg-purple-400" />
                EMA(25): {activeEma25 !== null ? `$${formatPrice(activeEma25)}` : '—'}
              </span>
            </>
          )}
          {indicators.rsi && (
            <span
              className={`font-bold px-1.5 py-0.2 rounded border ${
                rsi14 >= 70
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : rsi14 <= 30
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              RSI(14): {rsi14} {rsi14 >= 70 ? '(Quá mua)' : rsi14 <= 30 ? '(Quá bán)' : ''}
            </span>
          )}
          {indicators.macd && (
            <span className="text-slate-400 hidden lg:inline">
              MACD: <strong className="text-cyan-300">{macdValues.macd}</strong> Signal:{' '}
              <strong className="text-amber-300">{macdValues.signal}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main High-Performance Canvas Display */}
      <div className={`relative flex-1 w-full ${isFullscreen ? 'h-full' : 'h-[360px] sm:h-[420px]'}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseLeave={handlePointerLeave}
          onTouchStart={(e) => {
            setIsTouchActive(true);
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handlePointerLeave}
        />

        {/* Mobile touch active floating hint */}
        {isTouchActive && crosshairPos && (
          <div className="absolute top-2 left-2 pointer-events-none bg-black/80 backdrop-blur-sm border border-cyan-500/40 rounded-lg px-2.5 py-1 text-[10px] text-cyan-300 font-mono">
            Chạm & Kéo để dò nến
          </div>
        )}
      </div>

      {/* Bottom Professional Market Bar */}
      <div className="px-3 py-2 bg-[#0B101D] border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            24h Low: <strong className="text-slate-200">${formatPrice(low24h ?? currentPrice * 0.98)}</strong>
          </span>
          <span className="hidden sm:inline">
            24h High: <strong className="text-slate-200">${formatPrice(high24h ?? currentPrice * 1.02)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Spread: {spreadPercent.toFixed(4)}%
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            ORACLE 60FPS
          </span>
        </div>
      </div>
    </div>
  );
};
