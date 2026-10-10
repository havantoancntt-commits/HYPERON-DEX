/**
 * HYPERON-DEX Master Protocol Fee Treasury Configuration
 * Single Source of Truth for on-chain fee collection across all supported blockchains.
 *
 * Official verified protocol fee recipient addresses:
 * 1. Bitcoin: bc1qxs6c23cv4hpexp0vnrfwgdtzhpjz7j4nhwkhm8
 * 2. Ethereum: 0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892
 * 3. Solana: 4GrHndZVMiu6N8xC2aYj6ay6EZN6AUs1CrPpi2PbCZWX
 * 4. BNB Smart Chain: 0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892
 * 5. Tron: TQ1AP8Kah45mgHQdJqewhQ9i7nbnfA4B7v
 * 6. Arbitrum: 0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892
 * 7. TON: UQCMupNgeeNvXxcS2DdhoMmDelysndJFO7mnLmtTcYpLyOsN
 * 8. Base / Optimism / Polygon: 0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892
 */

export type BlockchainArchitecture = 'EVM' | 'Solana' | 'Tron' | 'Bitcoin' | 'TON';

export interface FeeRecipientConfig {
  chainId: string;
  name: string;
  shortName: string;
  architecture: BlockchainArchitecture;
  address: string;
  explorerUrl: string;
  explorerName: string;
  iconSymbol: string;
  color: string;
  feeSharePercent: number; // Percentage of protocol fee routed (default 100%)
  status: 'ACTIVE' | 'VERIFIED';
}

export const DEFAULT_PROTOCOL_FEE_RECIPIENTS: Record<string, FeeRecipientConfig> = {
  bitcoin: {
    chainId: 'bitcoin',
    name: 'Bitcoin Network',
    shortName: 'BTC',
    architecture: 'Bitcoin',
    address: 'bc1qxs6c23cv4hpexp0vnrfwgdtzhpjz7j4nhwkhm8',
    explorerUrl: 'https://mempool.space/address/bc1qxs6c23cv4hpexp0vnrfwgdtzhpjz7j4nhwkhm8',
    explorerName: 'Mempool Space',
    iconSymbol: 'BTC',
    color: '#F7931A',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  ethereum: {
    chainId: 'ethereum',
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://etherscan.io/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'Etherscan',
    iconSymbol: 'ETH',
    color: '#627EEA',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  solana: {
    chainId: 'solana',
    name: 'Solana Network',
    shortName: 'SOL',
    architecture: 'Solana',
    address: '4GrHndZVMiu6N8xC2aYj6ay6EZN6AUs1CrPpi2PbCZWX',
    explorerUrl: 'https://solscan.io/account/4GrHndZVMiu6N8xC2aYj6ay6EZN6AUs1CrPpi2PbCZWX',
    explorerName: 'Solscan',
    iconSymbol: 'SOL',
    color: '#14F195',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  bsc: {
    chainId: 'bsc',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://bscscan.com/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'BscScan',
    iconSymbol: 'BNB',
    color: '#F3BA2F',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  tron: {
    chainId: 'tron',
    name: 'TRON Network (TRC-20)',
    shortName: 'TRX',
    architecture: 'Tron',
    address: 'TQ1AP8Kah45mgHQdJqewhQ9i7nbnfA4B7v',
    explorerUrl: 'https://tronscan.org/#/address/TQ1AP8Kah45mgHQdJqewhQ9i7nbnfA4B7v',
    explorerName: 'Tronscan',
    iconSymbol: 'TRX',
    color: '#FF0013',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  arbitrum: {
    chainId: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'ARB',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://arbiscan.io/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'Arbiscan',
    iconSymbol: 'ARB',
    color: '#28A0F0',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  base: {
    chainId: 'base',
    name: 'Base L2 (Coinbase)',
    shortName: 'BASE',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://basescan.org/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'Basescan',
    iconSymbol: 'BASE',
    color: '#0052FF',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  ton: {
    chainId: 'ton',
    name: 'The Open Network',
    shortName: 'TON',
    architecture: 'TON',
    address: 'UQCMupNgeeNvXxcS2DdhoMmDelysndJFO7mnLmtTcYpLyOsN',
    explorerUrl: 'https://tonscan.org/address/UQCMupNgeeNvXxcS2DdhoMmDelysndJFO7mnLmtTcYpLyOsN',
    explorerName: 'TonScan',
    iconSymbol: 'TON',
    color: '#0098EA',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  optimism: {
    chainId: 'optimism',
    name: 'OP Mainnet',
    shortName: 'OP',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://optimistic.etherscan.io/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'OP Etherscan',
    iconSymbol: 'OP',
    color: '#FF0420',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  polygon: {
    chainId: 'polygon',
    name: 'Polygon PoS',
    shortName: 'POL',
    architecture: 'EVM',
    address: '0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerUrl: 'https://polygonscan.com/address/0x5b97c3De7F387EbEbE0cCe3CaE888448c4832892',
    explorerName: 'PolygonScan',
    iconSymbol: 'POL',
    color: '#8247E5',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
};

const STORAGE_KEY = 'hyperon_treasury_fee_recipients_v1';

/**
 * Validates blockchain address format according to network architecture.
 */
export const validateBlockchainAddress = (
  address: string,
  architecture: BlockchainArchitecture
): { valid: boolean; reason?: string } => {
  if (!address || typeof address !== 'string') {
    return { valid: false, reason: 'Địa chỉ không được để trống.' };
  }
  const clean = address.trim();

  switch (architecture) {
    case 'EVM': {
      const isEvm = /^0x[a-fA-F0-9]{40}$/.test(clean);
      if (!isEvm) return { valid: false, reason: 'Địa chỉ EVM phải bắt đầu bằng 0x và có đúng 40 ký tự hex.' };
      return { valid: true };
    }
    case 'Solana': {
      const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
      if (!isSol) return { valid: false, reason: 'Địa chỉ Solana Base58 phải có từ 32 đến 44 ký tự hợp lệ.' };
      return { valid: true };
    }
    case 'Tron': {
      const isTron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean);
      if (!isTron) return { valid: false, reason: 'Địa chỉ Tron phải bắt đầu bằng ký tự T và có đúng 34 ký tự Base58.' };
      return { valid: true };
    }
    case 'Bitcoin': {
      const isBtc = /^(bc1[a-z0-9]{38,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(clean);
      if (!isBtc) return { valid: false, reason: 'Địa chỉ Bitcoin không hợp lệ (hỗ trợ Native SegWit bc1 hoặc Legacy 1/3).' };
      return { valid: true };
    }
    case 'TON': {
      const isTon = /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/.test(clean);
      if (!isTon) return { valid: false, reason: 'Địa chỉ TON phải bắt đầu bằng EQ hoặc UQ và có đúng 48 ký tự Base64.' };
      return { valid: true };
    }
    default:
      return { valid: false, reason: 'Kiến trúc mạng không được hỗ trợ.' };
  }
};

/**
 * Retrieves the canonical verified fee recipients.
 * LocalStorage cannot override canonical protocol security parameters for transactions.
 */
export const getTreasuryRecipients = (): Record<string, FeeRecipientConfig> => {
  return DEFAULT_PROTOCOL_FEE_RECIPIENTS;
};

/**
 * Returns the exact verified fee recipient address for a given chain or network name.
 * Fail Closed: Throws if network is unsupported. NEVER fall back to another chain silently!
 */
export const getFeeRecipientForChain = (chainOrNetwork: string): string => {
  if (!chainOrNetwork) {
    throw new Error('INVALID_CHAIN: Chuỗi mạng không được để trống.');
  }
  const normalized = chainOrNetwork.toLowerCase().trim();
  const all = DEFAULT_PROTOCOL_FEE_RECIPIENTS;

  if (all[normalized]) {
    return all[normalized].address;
  }

  // Exact aliases mapping
  if (normalized === 'btc' || normalized === 'bitcoin') return all.bitcoin.address;
  if (normalized === 'ton') return all.ton.address;
  if (normalized === 'sol' || normalized === 'solana') return all.solana.address;
  if (normalized === 'tron' || normalized === 'trx') return all.tron.address;
  if (normalized === 'bsc' || normalized === 'binance' || normalized === '56') return all.bsc.address;
  if (normalized === 'arb' || normalized === 'arbitrum' || normalized === '42161') return all.arbitrum.address;
  if (normalized === 'base' || normalized === '8453') return all.base.address;
  if (normalized === 'op' || normalized === 'optimism' || normalized === '10') return all.optimism.address;
  if (normalized === 'poly' || normalized === 'polygon' || normalized === 'matic' || normalized === '137') return all.polygon.address;
  if (normalized === 'eth' || normalized === 'ethereum' || normalized === '1') return all.ethereum.address;

  throw new Error(`INVALID_CHAIN: Không tìm thấy địa chỉ treasury hợp lệ cho mạng '${chainOrNetwork}'. Giao dịch bị chặn để bảo vệ tài sản.`);
};

/**
 * Validates that a fee transaction candidate address strictly matches the canonical treasury.
 */
export const verifyTreasuryAddress = (chainOrNetwork: string, candidateAddress: string): boolean => {
  try {
    const verified = getFeeRecipientForChain(chainOrNetwork);
    return verified.toLowerCase() === candidateAddress.trim().toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Returns full configuration object for a chain's treasury.
 */
export const getFeeRecipientConfig = (chainOrNetwork: string): FeeRecipientConfig => {
  const normalized = (chainOrNetwork || 'ethereum').toLowerCase().trim();
  const all = getTreasuryRecipients();
  if (all[normalized]) return all[normalized];

  const addr = getFeeRecipientForChain(chainOrNetwork);
  return {
    ...DEFAULT_PROTOCOL_FEE_RECIPIENTS.ethereum,
    chainId: normalized,
    name: chainOrNetwork,
    address: addr,
  };
};

/**
 * Updates a fee recipient address with persistence and event notification.
 */
export const updateFeeRecipient = (
  chainId: string,
  newAddress: string
): { success: boolean; error?: string } => {
  const target = (chainId || '').toLowerCase().trim();
  const currentAll = getTreasuryRecipients();
  const existing = currentAll[target] || DEFAULT_PROTOCOL_FEE_RECIPIENTS[target];

  if (!existing) {
    return { success: false, error: `Không tìm thấy cấu hình cho chuỗi ${chainId}` };
  }

  const check = validateBlockchainAddress(newAddress, existing.architecture);
  if (!check.valid) {
    return { success: false, error: check.reason };
  }

  const updatedConfig: FeeRecipientConfig = {
    ...existing,
    address: newAddress.trim(),
    explorerUrl: existing.architecture === 'Solana'
      ? `https://solscan.io/account/${newAddress.trim()}`
      : existing.architecture === 'Tron'
      ? `https://tronscan.org/#/address/${newAddress.trim()}`
      : existing.architecture === 'Bitcoin'
      ? `https://mempool.space/address/${newAddress.trim()}`
      : existing.architecture === 'TON'
      ? `https://tonscan.org/address/${newAddress.trim()}`
      : existing.explorerUrl.split('/address/')[0] + `/address/${newAddress.trim()}`,
  };

  const nextAll = {
    ...currentAll,
    [target]: updatedConfig,
  };

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAll));
      window.dispatchEvent(
        new CustomEvent('hyperon_treasury_updated', {
          detail: { chainId: target, config: updatedConfig },
        })
      );
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi lưu trữ cục bộ' };
  }
};

/**
 * Resets all fee recipients to the official institutional default addresses.
 */
export const resetFeeRecipientsToDefault = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hyperon_treasury_updated', { detail: DEFAULT_PROTOCOL_FEE_RECIPIENTS }));
  }
};
