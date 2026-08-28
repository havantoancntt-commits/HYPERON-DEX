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

    case 'AETH':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="aethGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00F2FE" />
              <stop offset="1" stopColor="#4FACFE" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="url(#aethGrad)" />
          <path
            d="M16 6L23.5 13.5L16 26L8.5 13.5L16 6Z"
            fill="#060913"
            fillOpacity="0.85"
          />
          <path
            d="M16 8.5L21 13.5L16 23.5L11 13.5L16 8.5Z"
            fill="#FFFFFF"
          />
          <circle cx="16" cy="15" r="2" fill="#00F2FE" />
          <circle cx="16" cy="6" r="1.5" fill="#FFFFFF" />
          <circle cx="23.5" cy="13.5" r="1.5" fill="#FFFFFF" />
          <circle cx="8.5" cy="13.5" r="1.5" fill="#FFFFFF" />
          <circle cx="16" cy="26" r="1.5" fill="#FFFFFF" />
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
