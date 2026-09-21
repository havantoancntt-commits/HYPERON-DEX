/**
 * HYPERON-DEX Master Protocol Fee Treasury Configuration
 * Single Source of Truth for on-chain fee collection across all supported blockchains.
 *
 * Official verified protocol fee recipient addresses:
 * 1. Ethereum: 0x87743246e8cfBc3760a82dAAD00987b1d971a5A9
 * 2. Solana: 5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4
 * 3. BNB Smart Chain: 0x87743246e8cfBc3760a82dAAD00987b1d971a5A9
 * 4. Tron: TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj
 * 5. Arbitrum: 0x87743246e8cfBc3760a82dAAD00987b1d971a5A9
 * 6. Base: 0x87743246e8cfBc3760a82dAAD00987b1d971a5A9
 */

export type BlockchainArchitecture = 'EVM' | 'Solana' | 'Tron';

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
  ethereum: {
    chainId: 'ethereum',
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    architecture: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://etherscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
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
    address: '5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
    explorerUrl: 'https://solscan.io/account/5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
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
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://bscscan.com/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
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
    address: 'TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
    explorerUrl: 'https://tronscan.org/#/address/TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
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
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://arbiscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
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
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://basescan.org/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerName: 'Basescan',
    iconSymbol: 'BASE',
    color: '#0052FF',
    feeSharePercent: 100,
    status: 'VERIFIED',
  },
  optimism: {
    chainId: 'optimism',
    name: 'OP Mainnet',
    shortName: 'OP',
    architecture: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://optimistic.etherscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
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
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://polygonscan.com/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
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
    default:
      return { valid: false, reason: 'Kiến trúc mạng không được hỗ trợ.' };
  }
};

/**
 * Retrieves the current configured fee recipients, merging localStorage updates with defaults.
 */
export const getTreasuryRecipients = (): Record<string, FeeRecipientConfig> => {
  if (typeof window === 'undefined') {
    return DEFAULT_PROTOCOL_FEE_RECIPIENTS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROTOCOL_FEE_RECIPIENTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROTOCOL_FEE_RECIPIENTS,
      ...parsed,
    };
  } catch (err) {
    console.warn('Failed to parse treasury fee recipients from storage, using defaults:', err);
    return DEFAULT_PROTOCOL_FEE_RECIPIENTS;
  }
};

/**
 * Returns the exact fee recipient address for a given chain or network name.
 */
export const getFeeRecipientForChain = (chainOrNetwork: string): string => {
  const normalized = (chainOrNetwork || 'ethereum').toLowerCase().trim();
  const all = getTreasuryRecipients();

  if (all[normalized]) {
    return all[normalized].address;
  }

  // Common aliases mapping
  if (normalized.includes('sol')) return all['solana']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.solana.address;
  if (normalized.includes('tron') || normalized.includes('trx')) return all['tron']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.tron.address;
  if (normalized.includes('bsc') || normalized.includes('binance')) return all['bsc']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.bsc.address;
  if (normalized.includes('arb')) return all['arbitrum']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.arbitrum.address;
  if (normalized.includes('base')) return all['base']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.base.address;
  if (normalized.includes('op') || normalized.includes('optimism')) return all['optimism']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.optimism.address;
  if (normalized.includes('poly') || normalized.includes('matic')) return all['polygon']?.address || DEFAULT_PROTOCOL_FEE_RECIPIENTS.polygon.address;

  // Default EVM fallback
  return DEFAULT_PROTOCOL_FEE_RECIPIENTS.ethereum.address;
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
