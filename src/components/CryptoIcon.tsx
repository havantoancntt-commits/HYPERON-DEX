import React, { useState } from 'react';

// ============================================================================
// Deterministic Color Generator for Unknown Tokens
// ============================================================================
const getDeterministicGradient = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 75%, 45%) 0%, hsl(${hue2}, 85%, 35%) 100%)`;
};

// ============================================================================
// Built-in Authentic High-DPI Vector SVGs for Major Tokens
// ============================================================================
export const TokenVectorIcon: React.FC<{ symbol: string; className?: string }> = ({ symbol, className = 'w-full h-full' }) => {
  const sym = symbol?.toUpperCase()?.trim() || '';

  switch (sym) {
    case 'ETH':
    case 'WETH':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFFFFF" fillRule="nonzero">
            <path fillOpacity="0.602" d="M16.498 4v8.87l7.497 3.35z" />
            <path d="M16.498 4L9 16.22l7.498-3.35z" />
            <path fillOpacity="0.602" d="M16.498 21.968v6.027L24 17.616z" />
            <path d="M16.498 27.995v-6.028L9 17.616z" />
            <path fillOpacity="0.2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
            <path fillOpacity="0.602" d="M9 16.22l7.498 4.353v-7.701z" />
          </g>
        </svg>
      );

    case 'USDC':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            d="M16 6.5C10.753 6.5 6.5 10.753 6.5 16s4.253 9.5 9.5 9.5 9.5-4.253 9.5-9.5S21.247 6.5 16 6.5zm0 17.3c-4.3 0-7.8-3.5-7.8-7.8s3.5-7.8 7.8-7.8 7.8 3.5 7.8 7.8-3.5 7.8-7.8 7.8z"
            fill="#FFFFFF"
            fillOpacity="0.4"
          />
          <path
            d="M14.2 13.1c0-1.1.9-1.9 2.2-1.9 1.2 0 2 .7 2.1 1.6h1.5c-.2-1.6-1.5-2.7-3.1-2.9V8.5h-1.4v1.4c-1.8.2-3.1 1.5-3.1 3.1 0 1.9 1.4 2.7 3.2 3.1 1.4.3 2.1.8 2.1 1.7 0 1.1-.9 1.9-2.3 1.9-1.4 0-2.3-.8-2.4-1.9H9c.1 1.8 1.5 3 3.3 3.2v1.5h1.4v-1.5c1.9-.3 3.3-1.6 3.3-3.2 0-2-1.4-2.8-3.3-3.2-1.4-.4-2.5-.8-2.5-1.6z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'USDT':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            d="M17.922 17.383c-.11.008-.68.04-1.922.04-1.04 0-1.685-.032-1.875-.04-3.83-.17-6.702-.828-6.702-1.62 0-.792 2.872-1.45 6.702-1.62v2.544c.19.014.842.048 1.883.048 1.234 0 1.804-.034 1.914-.048v-2.544c3.82.17 6.685.828 6.685 1.62 0 .792-2.864 1.45-6.685 1.62zm0-3.565V11.25h5.513V8.5H8.565v2.75H14.1v2.568c-4.408.204-7.728 1.054-7.728 2.074 0 1.02 3.32 1.87 7.728 2.074v6.534h3.822V17.99c4.398-.204 7.708-1.054 7.708-2.074 0-1.02-3.31-1.87-7.708-2.074v-.024z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'WBTC':
    case 'BTC':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783-1.728-.431-.709 2.839c-.376-.086-.745-.17-1.104-.26l.002-.007-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.384-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.148.986-5.32.695l.95-3.805c1.17.292 4.929.87 4.37 3.11zm.535-5.568c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.12.696 3.61 2.733z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'UNI':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#FF007A" />
          <path
            d="M21.5 8c-.6 0-1.8.8-2.2 1.3-.9-1-2.2-1.7-3.7-1.7-2.9 0-5.2 2.4-5.2 5.3 0 1.2.4 2.3 1.1 3.2L9 21.5l1.6 1.6 3.5-3.5c1 .7 2.1 1.1 3.4 1.1 3.5 0 6.3-2.8 6.3-6.3 0-1.7-.7-3.3-1.8-4.4.4-.7 1.3-1.5 2-1.5.3 0 .5.1.8.2.2-.4.1-.7-.3-.7h-4zm-3.9 10.8c-2.3 0-4.1-1.8-4.1-4.1 0-2.3 1.8-4.1 4.1-4.1s4.1 1.8 4.1 4.1c0 2.3-1.8 4.1-4.1 4.1z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'HYPR':
    case 'HYPERON':
    case 'AETH':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hyprCirRim" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.2" stopColor="#00F5FF" />
              <stop offset="0.5" stopColor="#2563EB" />
              <stop offset="0.8" stopColor="#7C3AED" />
              <stop offset="1" stopColor="#00F5FF" />
            </linearGradient>
            <radialGradient id="hyprDarkCanvas" cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0B152B" />
              <stop offset="0.6" stopColor="#050914" />
              <stop offset="1" stopColor="#020408" />
            </radialGradient>
            <radialGradient id="hyprAuraCenter" cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00F5FF" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="hyprPillarL" x1="12" y1="8" x2="20" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.2" stopColor="#67E8F9" />
              <stop offset="0.5" stopColor="#00F5FF" />
              <stop offset="0.8" stopColor="#0284C7" />
              <stop offset="1" stopColor="#0C4A6E" />
            </linearGradient>
            <linearGradient id="hyprPillarR" x1="28" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.2" stopColor="#E879F9" />
              <stop offset="0.5" stopColor="#C084FC" />
              <stop offset="0.8" stopColor="#7C3AED" />
              <stop offset="1" stopColor="#4C1D95" />
            </linearGradient>
            <linearGradient id="hyprCoreDia" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.3" stopColor="#67E8F9" />
              <stop offset="0.7" stopColor="#00F5FF" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <filter id="hyprShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#00F5FF" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Master Circular Bezel */}
          <circle cx="24" cy="24" r="23" stroke="url(#hyprCirRim)" strokeWidth="1.4" />
          <circle cx="24" cy="24" r="21.5" fill="url(#hyprDarkCanvas)" />
          <circle cx="24" cy="24" r="21.5" fill="url(#hyprAuraCenter)" />

          {/* Precision Micro Range Ticks */}
          <circle cx="24" cy="24" r="18.5" stroke="#00F5FF" strokeOpacity="0.3" strokeWidth="0.5" strokeDasharray="2 3" />
          <circle cx="24" cy="24" r="15" stroke="#7C3AED" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="1 4" />
          <line x1="24" y1="2.5" x2="24" y2="5.5" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="24" y1="42.5" x2="24" y2="45.5" stroke="#A855F7" strokeWidth="1" />
          <line x1="2.5" y1="24" x2="5.5" y2="24" stroke="#00F5FF" strokeWidth="1" />
          <line x1="42.5" y1="24" x2="45.5" y2="24" stroke="#00F5FF" strokeWidth="1" />

          {/* 3D Polyhedral Floating "H" Monolith */}
          <g filter="url(#hyprShadow)">
            {/* Left Pillar Outer Facet */}
            <polygon points="10,12 14,9 14,39 10,36" fill="#0369A1" />
            {/* Left Pillar Front Facet */}
            <polygon points="14,9 19,7 19,41 14,39" fill="url(#hyprPillarL)" />
            <polygon points="10,12 14,9 19,7 15,10" fill="#FFFFFF" fillOpacity="0.95" />

            {/* Right Pillar Front Facet */}
            <polygon points="29,7 34,9 34,39 29,41" fill="url(#hyprPillarR)" />
            {/* Right Pillar Outer Facet */}
            <polygon points="34,9 38,12 38,36 34,39" fill="#6D28D9" />
            <polygon points="29,7 34,9 38,12 33,10" fill="#FFFFFF" fillOpacity="0.95" />

            {/* Central Octagonal Nexus Reactor */}
            <polygon points="24,17 28,19 30,24 28,29 24,31 20,29 18,24 20,19" fill="url(#hyprCoreDia)" />
            <polygon points="24,17 24,24 20,19" fill="#FFFFFF" fillOpacity="0.95" />
            <polygon points="24,17 28,19 24,24" fill="#A5F3FC" fillOpacity="0.9" />
            <polygon points="28,19 30,24 24,24" fill="#00F5FF" fillOpacity="0.9" />
            <polygon points="30,24 28,29 24,24" fill="#2563EB" fillOpacity="0.9" />
            <polygon points="28,29 24,31 24,24" fill="#1D4ED8" fillOpacity="0.9" />
            <polygon points="24,31 20,29 24,24" fill="#0284C7" fillOpacity="0.9" />
            <polygon points="20,29 18,24 24,24" fill="#38BDF8" fillOpacity="0.9" />
            <circle cx="24" cy="24" r="1.5" fill="#FFFFFF" />

            {/* Specular Razor Ridge Lines */}
            <line x1="19" y1="7" x2="19" y2="41" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.95" />
            <line x1="29" y1="7" x2="29" y2="41" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.95" />
          </g>

          {/* Micro Diamond Flare at Apex */}
          <g transform="translate(19, 7)">
            <ellipse rx="3" ry="0.6" fill="#FFFFFF" />
            <ellipse rx="0.6" ry="3" fill="#FFFFFF" />
            <circle r="1" fill="#FFFFFF" />
          </g>
          <g transform="translate(29, 7)">
            <ellipse rx="3" ry="0.6" fill="#FFFFFF" />
            <ellipse rx="0.6" ry="3" fill="#FFFFFF" />
            <circle r="1" fill="#FFFFFF" />
          </g>

          {/* Specular Star Flare at Center */}
          <g transform="translate(24, 24)">
            <ellipse rx="6" ry="1" fill="#FFFFFF" fillOpacity="0.95" />
            <ellipse rx="1" ry="6" fill="#FFFFFF" fillOpacity="0.95" />
            <circle r="1.8" fill="#FFFFFF" />
            <circle r="3.5" fill="#00F5FF" fillOpacity="0.5" />
          </g>
        </svg>
      );

    case 'LINK':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#375BD2" />
          <path
            d="M16 7.5l-6.5 3.75v7.5L16 22.5l6.5-3.75v-7.5L16 7.5zm4 9.2l-4 2.3-4-2.3v-4.6l4-2.3 4 2.3v4.6z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'AAVE':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="aaveGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#B6509E" />
              <stop offset="1" stopColor="#2EBAC6" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="url(#aaveGrad)" />
          <path
            d="M16 8.5L9.5 23.5h3.2l1.6-4h3.4l1.6 4h3.2L16 8.5zm-.8 8.6l1.3-3.6 1.3 3.6h-2.6z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'ARB':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#28A0F0" />
          <path
            d="M16.03 7.82l-5.8 13.98h3.33l1.52-3.78 4.7 3.78h4.05l-7.8-13.98zm-.05 4.67l2.5 4.51-2.92-2.35.42-2.16z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'OP':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#FF0420" />
          <path
            d="M10.8 19.5c-2.3 0-3.8-1.5-3.8-3.5 0-2.1 1.5-3.5 3.8-3.5s3.8 1.5 3.8 3.5c0 2.1-1.5 3.5-3.8 3.5zm0-1.8c1.1 0 1.9-.8 1.9-1.8s-.8-1.8-1.9-1.8-1.9.8-1.9 1.8.8 1.8 1.9 1.8zm7.4 1.7h-1.9v-7h3.6c2.1 0 3.3 1 3.3 2.5 0 1.5-1.2 2.5-3.3 2.5h-1.7v2zm0-3.7h1.6c1 0 1.5-.4 1.5-1s-.6-1-1.5-1h-1.6v2z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'BNB':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path
            d="M16 6.5l3.8 3.8-3.8 3.8-3.8-3.8L16 6.5zm-5.7 5.7l3.8 3.8-3.8 3.8-3.8-3.8 3.8-3.8zm11.4 0l3.8 3.8-3.8 3.8-3.8-3.8 3.8-3.8zM16 17.9l3.8 3.8-3.8 3.8-3.8-3.8 3.8-3.8zm0-3.8l2-2-2-2-2 2 2 2z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'POL':
    case 'MATIC':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path
            d="M21.2 13.6c-.7-.4-1.6-.4-2.3 0l-3.3 1.9-2.2 1.3-3.3 1.9c-.7.4-1.6.4-2.3 0l-2.6-1.5c-.7-.4-1.1-1.1-1.1-1.9s.4-1.5 1.1-1.9l2.6-1.5c.7-.4 1.6-.4 2.3 0l2.6 1.5 2.2-1.3-2.6-1.5c-1.8-1-4-1-5.7 0L4.1 12c-1.8 1-2.9 3-2.9 5.1s1.1 4 2.9 5.1l2.6 1.5c1.8 1 4 1 5.7 0l3.3-1.9 2.2-1.3 3.3-1.9c.7-.4 1.6-.4 2.3 0l2.6 1.5c.7.4 1.1 1.1 1.1 1.9s-.4 1.5-1.1 1.9l-2.6 1.5c-.7.4-1.6.4-2.3 0l-2.6-1.5-2.2 1.3 2.6 1.5c1.8 1 4 1 5.7 0l2.6-1.5c1.8-1 2.9-3 2.9-5.1s-1.1-4-2.9-5.1l-2.6-1.5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'SOL':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="solGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14F195" />
              <stop offset="0.5" stopColor="#00C2FF" />
              <stop offset="1" stopColor="#9945FF" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="#0D0D12" />
          <path
            d="M8.5 21.8l2.2-2.2h12.8l-2.2 2.2H8.5zm0-5.8l2.2-2.2h12.8l-2.2 2.2H8.5zm2.2-5.8L8.5 8h12.8l2.2 2.2H10.7z"
            fill="url(#solGrad)"
          />
        </svg>
      );

    case 'DAI':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F5AC37" />
          <path
            d="M10 9h6.2c3.4 0 5.8 2.2 6.3 5.4H24v1.5h-1.6c-.1 3.2-2.6 5.6-6.1 5.6H10V18h11c-.3-1.6-1.6-2.5-3.5-2.5H10v-1.5h7.5c1.9 0 3.2-.9 3.5-2.5H10V9z"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return (
        <div
          className={`flex items-center justify-center rounded-full text-white font-mono font-black select-none ${className}`}
          style={{ background: getDeterministicGradient(sym) }}
        >
          <span className="text-[40%] leading-none uppercase">{sym.slice(0, 3)}</span>
        </div>
      );
  }
};

// ============================================================================
// Built-in Authentic Vector SVGs for Supported Blockchains
// ============================================================================
export const ChainVectorIcon: React.FC<{ chainId: string; className?: string }> = ({ chainId, className = 'w-full h-full' }) => {
  const cid = chainId?.toLowerCase()?.trim() || '';

  switch (cid) {
    case 'ethereum':
    case 'eth':
      return <TokenVectorIcon symbol="ETH" className={className} />;

    case 'base':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#0052FF" />
          <path
            d="M16 7C11.029 7 7 11.029 7 16s4.029 9 9 9 9-4.029 9-9-4.029-9-9-9zm4.7 10.3h-9.4v-2.6h9.4v2.6z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'arbitrum':
    case 'arb':
      return <TokenVectorIcon symbol="ARB" className={className} />;

    case 'optimism':
    case 'op':
      return <TokenVectorIcon symbol="OP" className={className} />;

    case 'bsc':
    case 'bnb':
    case 'binance':
      return <TokenVectorIcon symbol="BNB" className={className} />;

    case 'polygon':
    case 'matic':
    case 'pol':
      return <TokenVectorIcon symbol="POL" className={className} />;

    case 'solana':
    case 'sol':
      return <TokenVectorIcon symbol="SOL" className={className} />;

    default:
      return (
        <div
          className={`flex items-center justify-center rounded-full text-white font-mono font-bold select-none ${className}`}
          style={{ background: getDeterministicGradient(cid) }}
        >
          <span className="text-[40%] leading-none uppercase">{cid.slice(0, 3)}</span>
        </div>
      );
  }
};

// ============================================================================
// Robust Multi-Tier Token Logo with Vector Fallback & Chain Badge
// ============================================================================
export interface TokenLogoProps {
  symbol?: string;
  name?: string;
  src?: string;
  className?: string;
  chainId?: string;
  showChainBadge?: boolean;
}

export const TokenLogo: React.FC<TokenLogoProps> = ({
  symbol = 'TOKEN',
  name = '',
  src,
  className = 'w-7 h-7',
  chainId,
  showChainBadge = false,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // If no src or known failure, render crisp native vector directly
  const shouldRenderVector = !src || loadFailed;

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${className}`}>
      {shouldRenderVector ? (
        <TokenVectorIcon symbol={symbol} className="w-full h-full rounded-full shadow-sm" />
      ) : (
        <>
          {/* Subtle instant placeholder vector underneath while image loads */}
          {!imgLoaded && (
            <div className="absolute inset-0">
              <TokenVectorIcon symbol={symbol} className="w-full h-full rounded-full opacity-60" />
            </div>
          )}
          <img
            src={src}
            alt={name || symbol}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setLoadFailed(true)}
            className={`w-full h-full rounded-full object-cover shadow-sm transition-opacity duration-200 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}

      {/* Optional Chain Mini-Badge in Bottom Right */}
      {showChainBadge && chainId && chainId !== 'ethereum' && (
        <div className="absolute -bottom-0.5 -right-0.5 w-[42%] h-[42%] rounded-full ring-2 ring-[#0D111A] bg-[#0D111A] overflow-hidden shadow">
          <ChainVectorIcon chainId={chainId} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Robust Multi-Tier Chain Logo
// ============================================================================
export interface ChainLogoProps {
  chainId: string;
  name?: string;
  src?: string;
  className?: string;
}

export const ChainLogo: React.FC<ChainLogoProps> = ({
  chainId,
  name = '',
  src,
  className = 'w-5 h-5',
}) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const shouldRenderVector = !src || loadFailed;

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${className}`}>
      {shouldRenderVector ? (
        <ChainVectorIcon chainId={chainId} className="w-full h-full rounded-full shadow-sm" />
      ) : (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0">
              <ChainVectorIcon chainId={chainId} className="w-full h-full rounded-full opacity-60" />
            </div>
          )}
          <img
            src={src}
            alt={name || chainId}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setLoadFailed(true)}
            className={`w-full h-full rounded-full object-cover shadow-sm transition-opacity duration-200 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
};

// ============================================================================
// Stylized DEX Protocol Icon
// ============================================================================
export const DexProtocolIcon: React.FC<{
  dexId?: string;
  name?: string;
  logo?: string;
  className?: string;
}> = ({ dexId, name, logo, className = 'w-6 h-6' }) => {
  const id = dexId?.toLowerCase() || '';

  if (id.includes('uniswap')) {
    return (
      <div className={`rounded-lg bg-pink-500/10 border border-pink-500/20 p-1 flex items-center justify-center ${className}`}>
        <TokenVectorIcon symbol="UNI" className="w-full h-full" />
      </div>
    );
  }

  if (id.includes('curve')) {
    return (
      <div className={`rounded-lg bg-blue-500/10 border border-blue-500/20 p-1 flex items-center justify-center text-cyan-400 font-bold ${className}`}>
        <span className="text-base select-none">🌀</span>
      </div>
    );
  }

  if (id.includes('balancer')) {
    return (
      <div className={`rounded-lg bg-slate-500/10 border border-slate-500/20 p-1 flex items-center justify-center text-slate-300 font-bold ${className}`}>
        <span className="text-base select-none">⚖️</span>
      </div>
    );
  }

  if (id.includes('sushi')) {
    return (
      <div className={`rounded-lg bg-rose-500/10 border border-rose-500/20 p-1 flex items-center justify-center text-rose-400 font-bold ${className}`}>
        <span className="text-base select-none">🍣</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-white/5 border border-white/10 p-1 flex items-center justify-center text-white ${className}`}>
      <span className="text-sm select-none">{logo || '⚡'}</span>
    </div>
  );
};

// ============================================================================
// HYPERON DEX 3D Ultra-Sharp International Standard Master Logo
// ============================================================================
export interface Hyperon3DLogoProps {
  className?: string;
  size?: number;
  variant?: 'icon' | 'full' | 'glow' | 'badge' | 'hero';
  animate?: boolean;
}

export const Hyperon3DLogo: React.FC<Hyperon3DLogoProps> = ({
  className = 'w-11 h-11',
  size,
  variant = 'icon',
  animate = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className} ${
        animate ? 'group cursor-pointer' : ''
      }`}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* 1. Multi-Layered Quantum Volumetric Ambient Lighting */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400/40 via-blue-600/30 to-fuchsia-600/40 blur-xl group-hover:blur-2xl opacity-80 group-hover:opacity-100 transition-all duration-700 -z-10 scale-95 group-hover:scale-110" />
      <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md -z-10 animate-pulse" />

      {/* 2. Master Ultra-Detailed 3D Sovereign Medallion */}
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full drop-shadow-[0_10px_30px_rgba(0,245,255,0.5)] transition-all duration-500 ease-out group-hover:scale-[1.06]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Multi-Stop Hyper Metallic Bezel Gradients */}
          <linearGradient id="hypRingBezelGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="12%" stopColor="#A5F3FC" />
            <stop offset="25%" stopColor="#00F5FF" />
            <stop offset="42%" stopColor="#2563EB" />
            <stop offset="65%" stopColor="#7C3AED" />
            <stop offset="82%" stopColor="#EC4899" />
            <stop offset="92%" stopColor="#00F5FF" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          <radialGradient id="hypInnerBezelCavity" cx="60" cy="60" r="58" gradientUnits="userSpaceOnUse">
            <stop offset="70%" stopColor="#030712" />
            <stop offset="88%" stopColor="#0F172A" />
            <stop offset="95%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </radialGradient>

          <radialGradient id="hypObsidianMirror" cx="60" cy="52" r="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#111C38" />
            <stop offset="45%" stopColor="#070C1B" />
            <stop offset="85%" stopColor="#03050C" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>

          {/* Central Reactor Nebula Aura */}
          <radialGradient id="hypPlasmaCore" cx="60" cy="60" r="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="18%" stopColor="#00F5FF" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="75%" stopColor="#7C3AED" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Left Wing Facet 3D Gradients */}
          <linearGradient id="facetPillarLeft1" x1="28" y1="22" x2="48" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="15%" stopColor="#67E8F9" />
            <stop offset="45%" stopColor="#00F5FF" />
            <stop offset="80%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0C4A6E" />
          </linearGradient>

          <linearGradient id="facetPillarLeft2" x1="22" y1="26" x2="38" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0369A1" />
            <stop offset="100%" stopColor="#082F49" />
          </linearGradient>

          <linearGradient id="facetPillarLeft3" x1="18" y1="32" x2="30" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Right Wing Facet 3D Gradients */}
          <linearGradient id="facetPillarRight1" x1="72" y1="22" x2="92" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="15%" stopColor="#E879F9" />
            <stop offset="45%" stopColor="#C084FC" />
            <stop offset="80%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>

          <linearGradient id="facetPillarRight2" x1="82" y1="26" x2="98" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#2E1065" />
          </linearGradient>

          <linearGradient id="facetPillarRight3" x1="90" y1="32" x2="102" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="60%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Hyper-Prism Central Octagonal Diamond */}
          <linearGradient id="octaDiamondGrad" x1="42" y1="42" x2="78" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#A5F3FC" />
            <stop offset="60%" stopColor="#00F5FF" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="octaDiamondFacetTop" x1="60" y1="44" x2="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#67E8F9" />
          </linearGradient>

          <linearGradient id="octaDiamondFacetBottom" x1="60" y1="60" x2="60" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="laserGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#00F5FF" floodOpacity="0.8" />
          </filter>

          <filter id="deepHShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.95" />
          </filter>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* Layer 1: Multi-Ring Diamond-Cut Sovereign Outer Bezel         */}
        {/* ------------------------------------------------------------- */}
        {/* Outer Laser Chroma Ring */}
        <circle cx="60" cy="60" r="57.5" stroke="url(#hypRingBezelGrad)" strokeWidth="2.2" />
        
        {/* Secondary Concentric Polished Titanium Ring */}
        <circle cx="60" cy="60" r="55" stroke="#00F5FF" strokeWidth="0.6" strokeOpacity="0.6" />

        {/* Outer Bezel Cavity */}
        <circle cx="60" cy="60" r="53.5" fill="url(#hypInnerBezelCavity)" />

        {/* Obsidian Glass Canvas */}
        <circle cx="60" cy="60" r="50.5" fill="url(#hypObsidianMirror)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

        {/* Reactor Core Background Aura */}
        <circle cx="60" cy="60" r="48" fill="url(#hypPlasmaCore)" />

        {/* ------------------------------------------------------------- */}
        {/* Layer 2: Precision Micro-Engravings & Geodetic Compass Lines  */}
        {/* ------------------------------------------------------------- */}
        <g stroke="#00F5FF" strokeOpacity="0.28" strokeWidth="0.6">
          {/* Sub-Millimeter Scale Calibration Circles */}
          <circle cx="60" cy="60" r="46" strokeDasharray="3 4" />
          <circle cx="60" cy="60" r="42" strokeDasharray="1 6" strokeOpacity="0.4" />
          <circle cx="60" cy="60" r="37" strokeOpacity="0.15" />

          {/* 12-Point Precision Chrono-Dial Index Ticks */}
          <line x1="60" y1="10" x2="60" y2="15" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="60" y1="105" x2="60" y2="110" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="10" y1="60" x2="15" y2="60" stroke="#00F5FF" strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="105" y1="60" x2="110" y2="60" stroke="#00F5FF" strokeWidth="1.2" strokeOpacity="0.9" />

          <line x1="25" y1="25" x2="29" y2="29" stroke="#00F5FF" strokeOpacity="0.5" />
          <line x1="95" y1="25" x2="91" y2="29" stroke="#C084FC" strokeOpacity="0.5" />
          <line x1="25" y1="95" x2="29" y2="91" stroke="#00F5FF" strokeOpacity="0.5" />
          <line x1="95" y1="95" x2="91" y2="91" stroke="#C084FC" strokeOpacity="0.5" />

          {/* Diagonal Micro Cross-Hair Marks */}
          <path d="M57 14H63M60 11V17" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.8" />
          <path d="M57 106H63M60 103V109" stroke="#C084FC" strokeOpacity="0.6" strokeWidth="0.8" />
        </g>

        {/* ------------------------------------------------------------- */}
        {/* Layer 3: Ultra-Sharp Master 3D Polyhedral "H" Monolith        */}
        {/* ------------------------------------------------------------- */}
        <g id="polyhedral-master-h" filter="url(#deepHShadow)">
          {/* --- LEFT MULTI-FACETED CRYSTAL PILLAR --- */}
          {/* Outer Chamfer Edge 3 */}
          <polygon points="18,34 26,27 26,93 18,86" fill="url(#facetPillarLeft3)" />
          {/* Middle Transition Facet 2 */}
          <polygon points="26,27 36,21 36,99 26,93" fill="url(#facetPillarLeft2)" />
          {/* Front Light Reflection Facet 1 */}
          <polygon points="36,21 47,17 47,103 36,99" fill="url(#facetPillarLeft1)" />

          {/* Top Crown Chamfer (Mirror Polish) */}
          <polygon points="18,34 26,27 36,21 47,17 38,23 28,30" fill="#FFFFFF" fillOpacity="0.95" />
          {/* Bottom Foot Chamfer */}
          <polygon points="18,86 26,93 36,99 47,103 38,97 28,90" fill="#0284C7" fillOpacity="0.8" />

          {/* --- RIGHT MULTI-FACETED CRYSTAL PILLAR --- */}
          {/* Front Light Reflection Facet 1 */}
          <polygon points="73,17 84,21 84,99 73,103" fill="url(#facetPillarRight1)" />
          {/* Middle Transition Facet 2 */}
          <polygon points="84,21 94,27 94,93 84,99" fill="url(#facetPillarRight2)" />
          {/* Outer Chamfer Edge 3 */}
          <polygon points="94,27 102,34 102,86 94,93" fill="url(#facetPillarRight3)" />

          {/* Top Crown Chamfer (Mirror Polish) */}
          <polygon points="73,17 84,21 94,27 102,34 92,30 82,23" fill="#FFFFFF" fillOpacity="0.95" />
          {/* Bottom Foot Chamfer */}
          <polygon points="73,103 84,99 94,93 102,86 92,90 82,97" fill="#7C3AED" fillOpacity="0.8" />

          {/* --- CENTER HYPER-PRISM CONNECTOR & OCTAGONAL REACTOR CORE --- */}
          {/* Upper Bridge Wing */}
          <polygon points="47,48 60,42 73,48 60,54" fill="url(#octaDiamondFacetTop)" />
          {/* Lower Bridge Wing */}
          <polygon points="47,72 60,78 73,72 60,66" fill="url(#octaDiamondFacetBottom)" />

          {/* Left/Right Bridge Struts */}
          <polygon points="47,48 47,72 54,66 54,54" fill="#0284C7" fillOpacity="0.9" />
          <polygon points="73,48 73,72 66,66 66,54" fill="#7C3AED" fillOpacity="0.9" />

          {/* Master 3D Floating Octagonal Quantum Reactor */}
          <polygon
            points="60,44 71,49 76,60 71,71 60,76 49,71 44,60 49,49"
            fill="url(#octaDiamondGrad)"
            filter="url(#laserGlowFilter)"
          />

          {/* Inner Facet Star Refraction of the Diamond */}
          <polygon points="60,44 60,60 49,49" fill="#FFFFFF" fillOpacity="0.95" />
          <polygon points="60,44 71,49 60,60" fill="#E0F2FE" fillOpacity="0.85" />
          <polygon points="71,49 76,60 60,60" fill="#67E8F9" fillOpacity="0.75" />
          <polygon points="76,60 71,71 60,60" fill="#00F5FF" fillOpacity="0.9" />
          <polygon points="71,71 60,76 60,60" fill="#2563EB" fillOpacity="0.9" />
          <polygon points="60,76 49,71 60,60" fill="#1D4ED8" fillOpacity="0.85" />
          <polygon points="49,71 44,60 60,60" fill="#0284C7" fillOpacity="0.85" />
          <polygon points="44,60 49,49 60,60" fill="#38BDF8" fillOpacity="0.95" />

          {/* Core Singularity Point */}
          <circle cx="60" cy="60" r="3.2" fill="#FFFFFF" />
          <circle cx="60" cy="60" r="1.6" fill="#00F5FF" />

          {/* --- ULTRA-SHARP SPECULAR RAZOR RIDGES --- */}
          {/* Main Ridge Specular Bevels */}
          <line x1="47" y1="17" x2="47" y2="103" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.95" />
          <line x1="36" y1="21" x2="36" y2="99" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="26" y1="27" x2="26" y2="93" stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.7" />

          <line x1="73" y1="17" x2="73" y2="103" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.95" />
          <line x1="84" y1="21" x2="84" y2="99" stroke="#F3E8FF" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="94" y1="27" x2="94" y2="93" stroke="#C084FC" strokeWidth="0.8" strokeOpacity="0.7" />
        </g>

        {/* ------------------------------------------------------------- */}
        {/* Layer 4: Multi-Point Diamond Optical Glints & Flares          */}
        {/* ------------------------------------------------------------- */}
        {/* Top Left Apex Starburst */}
        <g transform="translate(47, 17)">
          <ellipse rx="8" ry="1.2" fill="#FFFFFF" fillOpacity="0.95" />
          <ellipse rx="1.2" ry="8" fill="#FFFFFF" fillOpacity="0.95" />
          <circle r="2.4" fill="#FFFFFF" />
          <circle r="6" fill="#00F5FF" fillOpacity="0.6" />
        </g>

        {/* Top Right Apex Starburst */}
        <g transform="translate(73, 17)">
          <ellipse rx="8" ry="1.2" fill="#FFFFFF" fillOpacity="0.95" />
          <ellipse rx="1.2" ry="8" fill="#FFFFFF" fillOpacity="0.95" />
          <circle r="2.4" fill="#FFFFFF" />
          <circle r="6" fill="#E879F9" fillOpacity="0.6" />
        </g>

        {/* Center Reactor Master Flare */}
        <g transform="translate(60, 60)">
          <ellipse rx="14" ry="1.8" fill="#FFFFFF" fillOpacity="0.98" />
          <ellipse rx="1.8" ry="14" fill="#FFFFFF" fillOpacity="0.98" />
          <circle r="4" fill="#FFFFFF" />
          <circle r="9" fill="#00F5FF" fillOpacity="0.65" />
        </g>

        {/* Bottom Vertex Glints */}
        <circle cx="47" cy="103" r="2.2" fill="#00F5FF" />
        <circle cx="47" cy="103" r="4.5" fill="#00F5FF" fillOpacity="0.5" />
        <circle cx="73" cy="103" r="2.2" fill="#C084FC" />
        <circle cx="73" cy="103" r="4.5" fill="#A855F7" fillOpacity="0.5" />

        {/* ------------------------------------------------------------- */}
        {/* Layer 5: Dynamic Quantum Orbital Rings & Laser Sheen          */}
        {/* ------------------------------------------------------------- */}
        {/* Primary Orbital Ellipse */}
        <ellipse
          cx="60"
          cy="60"
          rx="50"
          ry="21"
          stroke="url(#hypRingBezelGrad)"
          strokeWidth="0.8"
          strokeDasharray="5 7"
          strokeOpacity="0.5"
          transform="rotate(-28 60 60)"
        />
        {/* Orbital Quantum Particle Nodes */}
        <circle cx="23" cy="41" r="2" fill="#FFFFFF" />
        <circle cx="23" cy="41" r="4" fill="#00F5FF" fillOpacity="0.5" />
        <circle cx="97" cy="79" r="2" fill="#E879F9" />
        <circle cx="97" cy="79" r="4" fill="#C084FC" fillOpacity="0.5" />

        {/* Ultra-Fine Diagonal Glass Glare Sweep */}
        <path
          d="M12 24L108 96"
          stroke="url(#octaDiamondGrad)"
          strokeWidth="0.4"
          strokeOpacity="0.25"
          strokeDasharray="10 16"
        />
      </svg>
    </div>
  );
};

