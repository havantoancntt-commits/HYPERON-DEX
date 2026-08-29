import React, { useState } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { TokenSecurityReport } from '../types';
import { shortenAddress } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Percent,
  Users,
  Code,
  Zap,
  Info
} from 'lucide-react';

export const AIRiskScannerView: React.FC = () => {
  const { selectedToken, openSwapWithTokens } = useExchange();
  const [tokenAddress, setTokenAddress] = useState<string>(selectedToken.address);
  const [tokenSymbol, setTokenSymbol] = useState<string>(selectedToken.symbol);
  const [report, setReport] = useState<TokenSecurityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const scanToken = async (addr: string, sym: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/token-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, symbol: sym, chainId: 'ethereum' }),
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.warn('Failed to audit token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    scanToken(tokenAddress, tokenSymbol);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                AI Smart Contract Forensic Risk Scanner
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Automated bytecode decompiler and AI security auditor checking for honeypots, reentrancy vulnerabilities, hidden transfer taxes, and owner privileges.
            </p>
          </div>
        </div>

        {/* Search & Audit Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Paste ERC-20 contract address (0x...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121212] border border-white/5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => scanToken(tokenAddress, tokenSymbol)}
            disabled={isLoading || !tokenAddress}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Decompiling & Auditing...' : 'Run Forensic Audit'}
          </button>
        </div>

        {/* Quick select presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Audit Presets:</span>
          {VERIFIED_TOKENS.slice(0, 5).map((t, idx) => (
            <button
              key={`${t.chainId}-${t.symbol}-${idx}`}
              onClick={() => {
                setTokenAddress(t.address);
                setTokenSymbol(t.symbol);
                scanToken(t.address, t.symbol);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-300 font-mono text-[11px] transition-colors cursor-pointer"
            >
              <TokenLogo symbol={t.symbol} className="w-3.5 h-3.5" />
              <span>{t.symbol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Audit Report Result */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Security Score Overview (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-mono uppercase text-slate-400">Security Score</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  report.riskLevel === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {report.riskLevel} RISK
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold font-mono ${
                  report.securityScore > 80 ? 'text-emerald-400' : report.securityScore > 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {report.securityScore}
                </span>
                <span className="text-sm font-mono text-slate-500">/ 100</span>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-[#121212] border border-white/5 space-y-2 text-xs">
                <div className="text-slate-400 font-mono text-[11px]">Audit Summary</div>
                <p className="text-slate-300 leading-relaxed">{report.riskSummary}</p>
              </div>
            </div>

            <button
              onClick={() => openSwapWithTokens('USDC', report.tokenSymbol)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" /> Proceed to Trade {report.tokenSymbol}
            </button>
          </div>

          {/* Detailed Security Checkpoints Matrix (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 space-y-4">
            <div className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-white/5">
              <span>Forensic Security Checkpoints</span>
              <span className="text-xs font-mono text-slate-400">{shortenAddress(report.tokenAddress, 8)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Honeypot Check */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${!report.isHoneypot ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {!report.isHoneypot ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-white">Honeypot Check</div>
                    <div className="text-[11px] text-slate-400">Can all token holders sell freely?</div>
                  </div>
                </div>
                <span className={`font-mono font-bold ${!report.isHoneypot ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {!report.isHoneypot ? 'PASSED (0%)' : 'HONEYPOT DETECTED'}
                </span>
              </div>

              {/* Buy / Sell Tax */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Buy / Sell Tax</div>
                    <div className="text-[11px] text-slate-400">Hidden fee-on-transfer rate</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-white">
                  {report.buyTaxPercent}% / {report.sellTaxPercent}%
                </span>
              </div>

              {/* Mint Function Privilege */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Mintability</div>
                    <div className="text-[11px] text-slate-400">Can owner mint unlimited supply?</div>
                  </div>
                </div>
                <span className={`font-mono font-bold ${!report.isMintable ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {!report.isMintable ? 'NO (Fixed Supply)' : 'CONTROLLED'}
                </span>
              </div>

              {/* Liquidity Lock */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Liquidity Lock</div>
                    <div className="text-[11px] text-slate-400">DEX pool rug-pull insulation</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {report.liquidityLockedPercent}% ({report.liquidityLockDurationDays}d)
                </span>
              </div>

              {/* Top 10 Holders Concentration */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Top 10 Concentration</div>
                    <div className="text-[11px] text-slate-400">Whale dump vulnerability</div>
                  </div>
                </div>
                <span className={`font-mono font-bold ${report.top10HoldersPercent < 35 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {report.top10HoldersPercent}% (Decentralized)
                </span>
              </div>

              {/* Proxy Contract Check */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Proxy Pattern</div>
                    <div className="text-[11px] text-slate-400">Upgradeable implementation logic</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-white">
                  {report.isProxyContract ? 'ERC-1967 Proxy' : 'Immutable'}
                </span>
              </div>
            </div>

            {/* Suspicious Permissions Alert */}
            {report.suspiciousPermissions.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Flagged Governance Privileges
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-200">
                  {report.suspiciousPermissions.map((perm, i) => (
                    <li key={i}>{perm}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
