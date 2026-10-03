/**
 * HYPERON-DEX EIP-6963 & Injected Multi-Provider Discovery Engine
 * Provides deterministic, deduplicated, order-independent Web3 wallet provider resolution.
 */

import { EIP1193Provider, EIP6963ProviderDetail, SupportedWalletType } from './types';

// Map of canonical RDNS identifiers to supported wallet types
export const RDNS_MAP: Record<string, SupportedWalletType> = {
  'io.metamask': 'metamask',
  'io.rabby': 'rabby',
  'com.coinbase.wallet': 'coinbase',
  'app.phantom': 'phantom',
  'com.okex.wallet': 'okx',
  'com.trustwallet.app': 'trust',
  'me.rainbow': 'rainbow',
  'com.bitget.web3': 'bitget',
  'io.zerion.wallet': 'zerion',
  'com.brave.wallet': 'brave',
  'io.safe': 'safe',
  'com.binance.w3w': 'binance',
  'com.kraken.wallet': 'kraken',
  'com.exodus': 'exodus',
  'app.backpack': 'backpack',
  'org.uniswap': 'uniswap',
  'so.onekey.app': 'onekey',
};

/**
 * Deduplicates and registers announced EIP-6963 providers.
 * Enforces stability using immutable provider uuid and rdns.
 */
export function registerAnnouncedProvider(
  existing: EIP6963ProviderDetail[],
  incoming: EIP6963ProviderDetail
): EIP6963ProviderDetail[] {
  if (!incoming?.info?.uuid || !incoming?.provider) return existing;

  const incomingUuid = incoming.info.uuid.toLowerCase();
  const incomingRdns = (incoming.info.rdns || '').toLowerCase();

  const isDuplicate = existing.some((p) => {
    const pUuid = p.info.uuid.toLowerCase();
    const pRdns = (p.info.rdns || '').toLowerCase();
    return pUuid === incomingUuid || (incomingRdns && pRdns === incomingRdns);
  });

  if (isDuplicate) return existing;
  return [...existing, incoming];
}

/**
 * Resolves the precise EIP-1193 provider instance for a requested wallet type.
 * Priority:
 * 1. EIP-6963 Discovered Provider by RDNS or Name match
 * 2. window.ethereum.providers multi-provider array
 * 3. Dedicated injected window globals (window.rabby, window.trustwallet, window.coinbaseWalletExtension, etc.)
 * 4. Fallback window.ethereum (only if matching requested type or generic injected)
 */
export function resolveProviderForWallet(
  type: SupportedWalletType,
  discoveredProviders: EIP6963ProviderDetail[],
  customProvider?: EIP1193Provider
): EIP1193Provider | null {
  if (customProvider) return customProvider;
  if (typeof window === 'undefined') return null;

  const win = window as any;

  // 1. EIP-6963 Priority Search
  if (type && discoveredProviders.length > 0) {
    const match = discoveredProviders.find((dp) => {
      const rdns = (dp.info.rdns || '').toLowerCase();
      const name = (dp.info.name || '').toLowerCase();

      if (type === 'metamask' && (rdns.includes('metamask') || name.includes('metamask'))) return true;
      if (type === 'rabby' && (rdns.includes('rabby') || name.includes('rabby'))) return true;
      if (type === 'coinbase' && (rdns.includes('coinbase') || name.includes('coinbase'))) return true;
      if (type === 'phantom' && (rdns.includes('phantom') || name.includes('phantom'))) return true;
      if (type === 'okx' && (rdns.includes('okx') || rdns.includes('okex') || name.includes('okx'))) return true;
      if (type === 'trust' && (rdns.includes('trust') || name.includes('trust'))) return true;
      if (type === 'rainbow' && (rdns.includes('rainbow') || name.includes('rainbow'))) return true;
      if (type === 'bitget' && (rdns.includes('bitget') || rdns.includes('bitkeep') || name.includes('bitget'))) return true;
      if (type === 'zerion' && (rdns.includes('zerion') || name.includes('zerion'))) return true;
      if (type === 'brave' && (rdns.includes('brave') || name.includes('brave'))) return true;
      if (type === 'safe' && (rdns.includes('safe') || name.includes('safe'))) return true;
      if (type === 'binance' && (rdns.includes('binance') || name.includes('binance'))) return true;
      if (type === 'kraken' && (rdns.includes('kraken') || name.includes('kraken'))) return true;
      if (type === 'exodus' && (rdns.includes('exodus') || name.includes('exodus'))) return true;
      if (type === 'backpack' && (rdns.includes('backpack') || name.includes('backpack'))) return true;
      if (type === 'uniswap' && (rdns.includes('uniswap') || name.includes('uniswap'))) return true;
      if (type === 'onekey' && (rdns.includes('onekey') || name.includes('onekey'))) return true;
      return false;
    });

    if (match?.provider) return match.provider;
  }

  // 2. Multi-provider array in window.ethereum.providers
  const providers = win.ethereum?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    if (type === 'metamask') {
      const p = providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isBraveWallet && !p.isPhantom);
      if (p) return p;
    }
    if (type === 'rabby') {
      const p = providers.find((p: any) => p.isRabby);
      if (p) return p;
    }
    if (type === 'coinbase') {
      const p = providers.find((p: any) => p.isCoinbaseWallet);
      if (p) return p;
    }
    if (type === 'phantom') {
      const p = providers.find((p: any) => p.isPhantom);
      if (p) return p;
    }
    if (type === 'okx') {
      const p = providers.find((p: any) => p.isOkxWallet);
      if (p) return p;
    }
    if (type === 'trust') {
      const p = providers.find((p: any) => p.isTrust || p.isTrustWallet || p.isTrustWalletExtension);
      if (p) return p;
    }
    if (type === 'rainbow') {
      const p = providers.find((p: any) => p.isRainbow);
      if (p) return p;
    }
    if (type === 'bitget') {
      const p = providers.find((p: any) => p.isBitKeep || p.isBitget);
      if (p) return p;
    }
    if (type === 'binance') {
      const p = providers.find((p: any) => p.isBinance || p.isBinanceW3W || p.isBinanceWallet);
      if (p) return p;
    }
    if (type === 'zerion') {
      const p = providers.find((p: any) => p.isZerion);
      if (p) return p;
    }
    if (type === 'brave') {
      const p = providers.find((p: any) => p.isBraveWallet);
      if (p) return p;
    }
  }

  // 3. Dedicated window globals
  switch (type) {
    case 'trust':
      return win.trustwallet || win.trustWallet || (win.ethereum?.isTrust || win.ethereum?.isTrustWallet ? win.ethereum : null) || null;
    case 'rabby':
      return win.rabby || (win.ethereum?.isRabby ? win.ethereum : null) || null;
    case 'coinbase':
      return win.coinbaseWalletExtension || (win.ethereum?.isCoinbaseWallet ? win.ethereum : null) || null;
    case 'phantom':
      return win.phantom?.ethereum || (win.ethereum?.isPhantom ? win.ethereum : null) || null;
    case 'okx':
      return win.okxwallet || (win.ethereum?.isOkxWallet ? win.ethereum : null) || null;
    case 'rainbow':
      return win.rainbow || (win.ethereum?.isRainbow ? win.ethereum : null) || null;
    case 'bitget':
      return win.bitkeep?.ethereum || win.bitkeep || null;
    case 'binance':
      return win.binancew3w?.ethereum || win.BinanceChain || win.binance || (win.ethereum?.isBinance ? win.ethereum : null) || null;
    case 'kraken':
      return win.kraken?.ethereum || win.kraken || null;
    case 'exodus':
      return win.exodus?.ethereum || win.exodus || null;
    case 'backpack':
      return win.backpack?.ethereum || win.backpack || null;
    case 'uniswap':
      return win.uniswap?.ethereum || win.uniswap || null;
    case 'onekey':
      return win.$onekey?.ethereum || win.onekey || null;
    case 'zerion':
      return win.zerionWallet || (win.ethereum?.isZerion ? win.ethereum : null) || null;
    case 'brave':
      return win.braveEthereum || (win.ethereum?.isBraveWallet ? win.ethereum : null) || null;
    case 'safe':
      return win.safe || (win.ethereum?.isSafe ? win.ethereum : null) || null;
    case 'metamask':
      if (win.ethereum?.isMetaMask && !win.ethereum?.isRabby) return win.ethereum;
      return win.ethereum || null;
    case 'injected':
      return win.ethereum || null;
    default:
      return win.ethereum || null;
  }
}

/**
 * Accurately determines if a specific Web3 wallet extension is installed and available in the browser.
 */
export function isWalletInstalled(
  type: SupportedWalletType,
  discoveredProviders: EIP6963ProviderDetail[] = []
): boolean {
  if (type === 'walletconnect') return true;
  if (typeof window === 'undefined') return false;

  const win = window as any;

  // 1. Check EIP-6963 discovered providers
  if (type && discoveredProviders.length > 0) {
    const hasEip6963 = discoveredProviders.some((dp) => {
      const rdns = (dp.info.rdns || '').toLowerCase();
      const name = (dp.info.name || '').toLowerCase();
      if (type === 'metamask' && (rdns.includes('metamask') || name.includes('metamask'))) return true;
      if (type === 'rabby' && (rdns.includes('rabby') || name.includes('rabby'))) return true;
      if (type === 'coinbase' && (rdns.includes('coinbase') || name.includes('coinbase'))) return true;
      if (type === 'phantom' && (rdns.includes('phantom') || name.includes('phantom'))) return true;
      if (type === 'okx' && (rdns.includes('okx') || rdns.includes('okex') || name.includes('okx'))) return true;
      if (type === 'trust' && (rdns.includes('trust') || name.includes('trust'))) return true;
      if (type === 'rainbow' && (rdns.includes('rainbow') || name.includes('rainbow'))) return true;
      if (type === 'bitget' && (rdns.includes('bitget') || rdns.includes('bitkeep') || name.includes('bitget'))) return true;
      if (type === 'zerion' && (rdns.includes('zerion') || name.includes('zerion'))) return true;
      if (type === 'brave' && (rdns.includes('brave') || name.includes('brave'))) return true;
      if (type === 'safe' && (rdns.includes('safe') || name.includes('safe'))) return true;
      if (type === 'binance' && (rdns.includes('binance') || name.includes('binance'))) return true;
      if (type === 'kraken' && (rdns.includes('kraken') || name.includes('kraken'))) return true;
      if (type === 'exodus' && (rdns.includes('exodus') || name.includes('exodus'))) return true;
      if (type === 'backpack' && (rdns.includes('backpack') || name.includes('backpack'))) return true;
      if (type === 'uniswap' && (rdns.includes('uniswap') || name.includes('uniswap'))) return true;
      if (type === 'onekey' && (rdns.includes('onekey') || name.includes('onekey'))) return true;
      return false;
    });
    if (hasEip6963) return true;
  }

  // 2. Check multi-provider array in window.ethereum.providers
  const providers = win.ethereum?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    if (type === 'metamask' && providers.some((p: any) => p.isMetaMask && !p.isRabby && !p.isBraveWallet && !p.isPhantom)) return true;
    if (type === 'rabby' && providers.some((p: any) => p.isRabby)) return true;
    if (type === 'coinbase' && providers.some((p: any) => p.isCoinbaseWallet)) return true;
    if (type === 'phantom' && providers.some((p: any) => p.isPhantom)) return true;
    if (type === 'okx' && providers.some((p: any) => p.isOkxWallet)) return true;
    if (type === 'trust' && providers.some((p: any) => p.isTrust || p.isTrustWallet || p.isTrustWalletExtension)) return true;
    if (type === 'rainbow' && providers.some((p: any) => p.isRainbow)) return true;
    if (type === 'bitget' && providers.some((p: any) => p.isBitKeep || p.isBitget)) return true;
    if (type === 'binance' && providers.some((p: any) => p.isBinance || p.isBinanceW3W || p.isBinanceWallet)) return true;
    if (type === 'zerion' && providers.some((p: any) => p.isZerion)) return true;
    if (type === 'brave' && providers.some((p: any) => p.isBraveWallet)) return true;
  }

  // 3. Check dedicated window globals
  switch (type) {
    case 'trust':
      return Boolean(win.trustwallet || win.trustWallet || win.ethereum?.isTrust || win.ethereum?.isTrustWallet);
    case 'rabby':
      return Boolean(win.rabby || win.ethereum?.isRabby);
    case 'coinbase':
      return Boolean(win.coinbaseWalletExtension || win.ethereum?.isCoinbaseWallet);
    case 'phantom':
      return Boolean(win.phantom?.ethereum || win.ethereum?.isPhantom);
    case 'okx':
      return Boolean(win.okxwallet || win.ethereum?.isOkxWallet);
    case 'rainbow':
      return Boolean(win.rainbow || win.ethereum?.isRainbow);
    case 'bitget':
      return Boolean(win.bitkeep?.ethereum || win.bitkeep);
    case 'binance':
      return Boolean(win.binancew3w?.ethereum || win.BinanceChain || win.binance || win.ethereum?.isBinance);
    case 'kraken':
      return Boolean(win.kraken?.ethereum || win.kraken);
    case 'exodus':
      return Boolean(win.exodus?.ethereum || win.exodus);
    case 'backpack':
      return Boolean(win.backpack?.ethereum || win.backpack);
    case 'uniswap':
      return Boolean(win.uniswap?.ethereum || win.uniswap);
    case 'onekey':
      return Boolean(win.$onekey?.ethereum || win.onekey);
    case 'zerion':
      return Boolean(win.zerionWallet || win.ethereum?.isZerion);
    case 'brave':
      return Boolean(win.braveEthereum || win.ethereum?.isBraveWallet);
    case 'safe':
      return Boolean(win.safe || win.ethereum?.isSafe);
    case 'metamask':
      return Boolean(win.ethereum?.isMetaMask && !win.ethereum?.isRabby);
    case 'injected':
      return Boolean(win.ethereum);
    default:
      return false;
  }
}

