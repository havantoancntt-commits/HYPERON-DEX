import React, { useState } from 'react';
import { SecurityStatus, SECURITY_STATUS_CONFIG } from '../../lib/designSystem';
import { ShieldCheck, ShieldAlert, ShieldX, HelpCircle, CheckCircle2, AlertTriangle, Lock, Info } from 'lucide-react';

interface SecurityBadgeProps {
  status: SecurityStatus;
  tokenSymbol?: string;
  isVerified?: boolean;
  hasHoneypot?: boolean;
  transferTaxPercent?: number;
  liquidityLocked?: boolean;
  className?: string;
  showDetailsButton?: boolean;
  onOpenAuditModal?: () => void;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  status,
  tokenSymbol = 'Asset',
  isVerified,
  hasHoneypot,
  transferTaxPercent,
  liquidityLocked,
  className = '',
  showDetailsButton = true,
  onOpenAuditModal,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const cfg = SECURITY_STATUS_CONFIG[status] || SECURITY_STATUS_CONFIG.UNKNOWN;
  const isStatusUnknown = status === 'UNKNOWN';

  // Strict: if status is UNKNOWN, default attributes MUST reflect unverified state
  const effectiveVerified = isVerified !== undefined ? isVerified : !isStatusUnknown;
  const effectiveHoneypot = hasHoneypot !== undefined ? hasHoneypot : false;
  const effectiveTax = transferTaxPercent !== undefined ? transferTaxPercent : 0;
  const effectiveLocked = liquidityLocked !== undefined ? liquidityLocked : !isStatusUnknown;

  const renderIcon = () => {
    switch (status) {
      case 'SAFE':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'WARNING':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'HIGH RISK':
      case 'BLOCKED':
        return <ShieldX className="w-3.5 h-3.5 text-rose-400" />;
      case 'UNKNOWN':
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-90 shadow-sm`}
        title={cfg.description}
      >
        {renderIcon()}
        <span>{cfg.label}</span>
      </button>

      {/* Interactive Security Inspection Popover */}
      {showPopover && (
        <div
          className="absolute left-0 bottom-full mb-2 w-72 p-3 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-2xl text-xs z-50 animate-in fade-in zoom-in-95 pointer-events-auto"
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              {renderIcon()}
              <span className="font-bold text-white font-sans">{tokenSymbol} Security Audit</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>

          <div className="space-y-1.5 font-sans text-slate-300 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Source Verification:</span>
              <span className={isStatusUnknown ? 'text-slate-400 font-semibold' : effectiveVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isStatusUnknown ? 'Pending Static Analysis' : effectiveVerified ? 'Canonical & Verified' : 'Unverified Bytecode'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Honeypot Test:</span>
              <span className={isStatusUnknown ? 'text-slate-400 font-semibold' : !effectiveHoneypot ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {isStatusUnknown ? 'Pending On-Chain Simulation' : !effectiveHoneypot ? 'Verified Simulation Safe' : 'Detected Honeypot!'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transfer Fee / Tax:</span>
              <span className={isStatusUnknown ? 'text-slate-400 font-semibold' : effectiveTax === 0 ? 'text-slate-200' : effectiveTax > 3 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                {isStatusUnknown ? 'Unverified' : `${effectiveTax}%`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Liquidity Custody:</span>
              <span className={isStatusUnknown ? 'text-slate-400 font-semibold' : effectiveLocked ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isStatusUnknown ? 'Unverified Pool' : effectiveLocked ? 'Time-Locked Pool' : 'Standard AMM'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 leading-tight">
            {cfg.description}
          </div>

          {showDetailsButton && onOpenAuditModal && (
            <button
              onClick={() => {
                setShowPopover(false);
                onOpenAuditModal();
              }}
              className="mt-2.5 w-full py-1.5 rounded-lg bg-white/[0.06] hover:bg-cyan-500/15 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-white font-medium text-[11px] transition-colors cursor-pointer text-center"
            >
              Open Full Security Center
            </button>
          )}
        </div>
      )}
    </div>
  );
};
