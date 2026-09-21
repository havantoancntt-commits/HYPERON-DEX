import React from 'react';
import { SwapQuote, RouteSplit } from '../../types';
import { TokenLogo, DexProtocolIcon } from '../CryptoIcon';
import { shortenAddress } from '../../lib/utils';
import { getFeeRecipientConfig } from '../../lib/treasuryConfig';
import { ArrowRight, Sparkles, ShieldCheck, Zap, GitBranch, Layers, Coins, ExternalLink } from 'lucide-react';

interface RouteVisualizationProps {
  quote: SwapQuote;
  className?: string;
  interactive?: boolean;
}

export const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  quote,
  className = '',
  interactive = true,
}) => {
  const splits: RouteSplit[] = quote.routeSplits && quote.routeSplits.length > 0
    ? quote.routeSplits
    : quote.sources && quote.sources.length > 0
    ? quote.sources.map((src) => ({
        dexName: src.name,
        percentage: src.sharePercent,
        fromToken: quote.fromToken.symbol,
        toToken: quote.toToken.symbol,
        path: [quote.fromToken.symbol, quote.toToken.symbol],
        feeTierBps: Math.round(src.poolFeePercent * 100),
      }))
    : [
        {
          dexName: quote.protocol || 'Uniswap v3',
          percentage: 100,
          fromToken: quote.fromToken.symbol,
          toToken: quote.toToken.symbol,
          path: [quote.fromToken.symbol, quote.toToken.symbol],
          poolAddress: quote.poolAddress,
          feeTierBps: quote.feeTierBps || 30,
        },
      ];

  const isMultiRoute = splits.length > 1;

  return (
    <div
      className={`rounded-2xl bg-[#090C14] border border-white/[0.08] p-4 text-xs font-sans select-none relative overflow-hidden ${className}`}
    >
      {/* Route Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Hyperon Smart Dynamic Route</span>
              {isMultiRoute && (
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {splits.length}-Way Split
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Gas-optimized multi-hop execution on {quote.chainId || 'Ethereum'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quote.mevProtected && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
              <ShieldCheck className="w-3 h-3" /> MEV SHIELD
            </span>
          )}
          {quote.savingsPercent != null && quote.savingsPercent > 0 && (
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
              +{quote.savingsPercent.toFixed(2)}% Output
            </span>
          )}
        </div>
      </div>

      {/* Interactive Visual Graph: From Token -> [Splits / Hops] -> To Token */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative py-2">
        {/* Source Token Node */}
        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-[#0E1321] border border-white/[0.08] min-w-[110px] shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <TokenLogo
              symbol={quote.fromToken.symbol}
              name={quote.fromToken.name}
              src={quote.fromToken.logoUrl}
              chainId={quote.fromToken.chainId}
              className="w-6 h-6"
            />
            <span className="font-bold text-white font-mono text-xs">{quote.fromToken.symbol}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 text-right sm:text-center">
            {quote.fromAmount ? quote.fromAmount.toLocaleString() : '1'} {quote.fromToken.symbol}
          </div>
        </div>

        {/* Split Connectors & Intermediate Venue Nodes */}
        <div className="flex-1 flex flex-col gap-2.5 px-1">
          {splits.map((split, idx) => {
            const hasIntermediates = split.path && split.path.length > 2;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0D121F]/90 border border-cyan-500/15 hover:border-cyan-500/35 transition-all text-[11px] group relative"
              >
                {/* Allocation Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {split.percentage}%
                  </span>
                  <div className="flex items-center gap-1.5">
                    <DexProtocolIcon name={split.dexName} className="w-4 h-4" />
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {split.dexName}
                    </span>
                  </div>
                </div>

                {/* Path Hops */}
                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 overflow-x-auto">
                  {split.path && split.path.length > 1 ? (
                    split.path.map((sym, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className={`px-1.5 py-0.5 rounded ${sIdx === 0 || sIdx === split.path.length - 1 ? 'bg-white/[0.04] text-slate-300' : 'bg-blue-500/10 text-cyan-300 font-semibold'}`}>
                          {sym}
                        </span>
                        {sIdx < split.path.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <span>Direct Pool</span>
                  )}
                </div>

                {/* Pool Fee Tier & Address */}
                <div className="text-right shrink-0 font-mono text-[10px] text-slate-400">
                  {split.feeTierBps ? (
                    <span className="text-slate-400">Fee {(split.feeTierBps / 100).toFixed(2)}%</span>
                  ) : (
                    <span>0.30%</span>
                  )}
                  {split.poolAddress && (
                    <div className="text-[9px] text-slate-400">
                      {shortenAddress(split.poolAddress, 4)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Destination Token Node */}
        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-[#0E1321] border border-white/[0.08] min-w-[110px] shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <TokenLogo
              symbol={quote.toToken.symbol}
              name={quote.toToken.name}
              src={quote.toToken.logoUrl}
              chainId={quote.toToken.chainId}
              className="w-6 h-6"
            />
            <span className="font-bold text-white font-mono text-xs">{quote.toToken.symbol}</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 font-bold text-right sm:text-center">
            ~{quote.expectedOutput ? quote.expectedOutput.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>Min Received: <strong className="text-slate-200">${quote.minimumReceived ? quote.minimumReceived.toFixed(2) : '—'}</strong></span>
          <span>Price Impact: <strong className={parseFloat(quote.priceImpactBps || '0') > 100 ? 'text-amber-400' : 'text-emerald-400'}>
            {quote.priceImpactPercent ? `${quote.priceImpactPercent.toFixed(2)}%` : '< 0.05%'}
          </strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Est. Gas: <strong className="text-slate-200">${quote.estimatedGasUsd ? quote.estimatedGasUsd.toFixed(2) : '0.18'}</strong></span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400 font-medium">Latency: {quote.calculationLatencyMs || 14}ms</span>
        </div>
      </div>

      {/* Protocol Fee Routing Transparency */}
      {(() => {
        const chainKey = quote.chainId || 'ethereum';
        const feeConf = getFeeRecipientConfig(chainKey);
        return (
          <div className="mt-2 pt-1.5 border-t border-white/[0.03] flex items-center justify-between text-[9px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-cyan-500" />
              <span>Phí định tuyến (0.10%) chuyển về kho bạc {feeConf.shortName}:</span>
              <span className="text-slate-300 font-bold">{shortenAddress(feeConf.address, 4)}</span>
            </div>
            <a
              href={feeConf.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-400/80 hover:text-cyan-300 flex items-center gap-0.5"
            >
              <span>On-Chain Verified</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        );
      })()}
    </div>
  );
};
