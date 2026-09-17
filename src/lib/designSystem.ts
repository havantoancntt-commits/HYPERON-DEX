/**
 * HYPERON-DEX Global Institutional Design System Tokens & Presets
 * Standardizes typography, colors, radii, shadows, borders, micro-interactions,
 * status badges, security ratings, and component state classes.
 */

export const DESIGN_TOKENS = {
  colors: {
    bg: {
      root: '#03060B',
      tape: '#04060A',
      surface: '#070A10',
      panel: '#0B0F19',
      card: '#0E1321',
      cardHover: '#141B2D',
      input: '#070A12',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.14)',
      hover: 'rgba(0, 245, 255, 0.35)',
      focus: 'rgba(59, 130, 246, 0.6)',
      accent: 'rgba(0, 245, 255, 0.5)',
    },
    brand: {
      cyan: '#00F5FF',
      cyanGlow: 'rgba(0, 245, 255, 0.25)',
      blue: '#3B82F6',
      indigo: '#6366F1',
      purple: '#8B5CF6',
    },
    semantic: {
      success: '#0ECB81',
      successGlow: 'rgba(14, 203, 129, 0.2)',
      danger: '#F6465D',
      dangerGlow: 'rgba(246, 70, 93, 0.2)',
      warning: '#F59E0B',
      warningGlow: 'rgba(245, 158, 11, 0.2)',
      info: '#00F5FF',
      infoGlow: 'rgba(0, 245, 255, 0.2)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      inverse: '#03060B',
    },
  },
  typography: {
    fontSans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.25rem',// 20px
    full: '9999px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '220ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '350ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type SecurityStatus = 'SAFE' | 'WARNING' | 'HIGH RISK' | 'BLOCKED' | 'UNKNOWN';
export type SimulationStatus = 'SIMULATING' | 'PASSED' | 'FAILED' | 'WARNING';

export const SECURITY_STATUS_CONFIG: Record<
  SecurityStatus,
  { label: string; bg: string; text: string; border: string; iconColor: string; description: string }
> = {
  SAFE: {
    label: 'SAFE',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    iconColor: '#0ECB81',
    description: 'Contract is fully verified with clear bytecode, 0 honeypot flags, and passed formal simulation.',
  },
  WARNING: {
    label: 'WARNING',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    iconColor: '#F59E0B',
    description: 'Minor non-standard traits detected (e.g. transfer tax > 2% or proxy implementation change).',
  },
  'HIGH RISK': {
    label: 'HIGH RISK',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/35',
    iconColor: '#F6465D',
    description: 'Unverified bytecode, blacklisting capability, or dangerous fee manipulation detected.',
  },
  BLOCKED: {
    label: 'BLOCKED',
    bg: 'bg-red-950/40',
    text: 'text-red-400 font-black',
    border: 'border-red-500/50',
    iconColor: '#EF4444',
    description: 'Execution blocked by circuit breaker or confirmed honeypot. Trading disabled for protection.',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    bg: 'bg-slate-800/40',
    text: 'text-slate-400',
    border: 'border-slate-700/50',
    iconColor: '#94A3B8',
    description: 'Insufficient on-chain telemetry available. Heuristic analysis pending. Treat with extreme caution.',
  },
};

export const SIMULATION_STATUS_CONFIG: Record<
  SimulationStatus,
  { label: string; bg: string; text: string; border: string; pulse: boolean }
> = {
  SIMULATING: {
    label: 'SIMULATING',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/25',
    pulse: true,
  },
  PASSED: {
    label: 'PASSED',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    pulse: false,
  },
  WARNING: {
    label: 'WARNING',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    pulse: false,
  },
  FAILED: {
    label: 'FAILED',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/35',
    pulse: false,
  },
};
