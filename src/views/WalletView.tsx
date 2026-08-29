import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS, SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress, formatCurrency } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
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
  Trash2
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const { address, balances, chainId, tokenApprovals, revokeApproval, isConnected, connectWallet, isDemoMode, toggleDemoMode } = useWallet();
  const { addToast } = useExchange();
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const handleRevoke = async (symbol: string) => {
    setRevokingToken(symbol);
    await new Promise((r) => setTimeout(r, 700));
    await revokeApproval(symbol);
    setRevokingToken(null);
    addToast({
      title: 'Token Allowance Revoked',
      message: `Allowance for ${symbol} set to 0. Smart contract can no longer spend this asset.`,
      type: 'success',
    });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    addToast({
      title: 'Address Copied',
      message: `${address} copied to clipboard.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Wallet Identity Card */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Non-Custodial Account</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                EIP-1193 CONNECTED
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
              <span className="text-slate-200 font-semibold">{address}</span>
              <button onClick={copyAddress} className="hover:text-slate-200 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDemoMode}
            className="px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#181818] text-slate-200 border border-white/5 text-xs font-semibold transition-colors cursor-pointer"
          >
            Mode: {isDemoMode ? 'Demo Sandbox' : 'Mainnet Injected'}
          </button>
        </div>
      </div>

      {/* Approvals Manager (Security Hardening) */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active Token Approvals & Permissions
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Review and revoke infinite smart contract spending permissions to eliminate exploit vectors.
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {Object.values(tokenApprovals).filter(Boolean).length} Active Approvals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase text-slate-400">
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Approved Spender Contract</th>
                <th className="py-2.5 px-3">Allowance Amount</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(tokenApprovals).map(([symbol, isApproved]) => (
                <tr key={symbol} className="hover:bg-[#121212] transition-colors">
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
                    {isApproved ? 'Unlimited (0xffffff...)' : '0.00 (Revoked)'}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      isApproved ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {isApproved ? 'ACTIVE SPENDER' : 'REVOKED (SECURE)'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isApproved ? (
                      <button
                        onClick={() => handleRevoke(symbol)}
                        disabled={revokingToken === symbol}
                        className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revokingToken === symbol ? 'Revoking...' : 'Revoke Permission'}
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Allowance Cleared</span>
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
