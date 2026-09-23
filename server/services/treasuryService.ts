/**
 * Server-Side Institutional Protocol Treasury & Fee Routing Engine
 * Coordinates protocol fee distribution across EVM, Solana, and TRON networks.
 */

export interface ServerTreasuryRecord {
  chainId: string;
  name: string;
  networkType: 'EVM' | 'Solana' | 'Tron';
  address: string;
  explorerUrl: string;
  totalCollectedUsd24h: number;
  totalCollectedLifetimeUsd: number;
  status: 'ONLINE' | 'ACTIVE';
}

export const SERVER_TREASURY_RECIPIENTS: Record<string, ServerTreasuryRecord> = {
  ethereum: {
    chainId: 'ethereum',
    name: 'Ethereum Mainnet',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://etherscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
  solana: {
    chainId: 'solana',
    name: 'Solana Network',
    networkType: 'Solana',
    address: '5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
    explorerUrl: 'https://solscan.io/account/5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
  bsc: {
    chainId: 'bsc',
    name: 'BNB Smart Chain',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://bscscan.com/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
  tron: {
    chainId: 'tron',
    name: 'TRON Network (TRC-20)',
    networkType: 'Tron',
    address: 'TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
    explorerUrl: 'https://tronscan.org/#/address/TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
  arbitrum: {
    chainId: 'arbitrum',
    name: 'Arbitrum One',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://arbiscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
  base: {
    chainId: 'base',
    name: 'Base L2 (Coinbase)',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://basescan.org/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 0.0,
    totalCollectedLifetimeUsd: 0.0,
    status: 'ACTIVE',
  },
};

export class TreasuryService {
  private static instance: TreasuryService;
  private recipients: Record<string, ServerTreasuryRecord> = { ...SERVER_TREASURY_RECIPIENTS };

  public static getInstance(): TreasuryService {
    if (!TreasuryService.instance) {
      TreasuryService.instance = new TreasuryService();
    }
    return TreasuryService.instance;
  }

  public getAllTreasuryRecipients(): Record<string, ServerTreasuryRecord> {
    return this.recipients;
  }

  public getFeeRecipient(chainId: string): string {
    if (!chainId) {
      throw new Error('INVALID_CHAIN: chainId cannot be empty. FAIL CLOSED.');
    }
    const key = chainId.toLowerCase().trim();
    if (this.recipients[key]) {
      return this.recipients[key].address;
    }
    if (key === 'sol' || key === 'solana') return this.recipients.solana.address;
    if (key === 'tron' || key === 'trx') return this.recipients.tron.address;
    if (key === 'bsc' || key === 'binance' || key === '56') return this.recipients.bsc.address;
    if (key === 'arb' || key === 'arbitrum' || key === '42161') return this.recipients.arbitrum.address;
    if (key === 'base' || key === '8453') return this.recipients.base.address;
    if (key === 'eth' || key === 'ethereum' || key === '1') return this.recipients.ethereum.address;
    throw new Error(`INVALID_CHAIN: Treasury recipient not configured for chain '${chainId}'. FAIL CLOSED.`);
  }

  public updateRecipient(chainId: string, newAddress: string): boolean {
    const key = (chainId || '').toLowerCase().trim();
    const record = this.recipients[key];
    if (!record) return false;

    const trimmed = (newAddress || '').trim();
    if (record.networkType === 'EVM') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed) || trimmed === '0x0000000000000000000000000000000000000000') {
        throw new Error('INVALID_TREASURY_ADDRESS: Address must be a valid non-zero EVM address');
      }
    } else if (record.networkType === 'Solana') {
      if (!/^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(trimmed)) {
        throw new Error('INVALID_TREASURY_ADDRESS: Address must be a valid Solana Base58 address');
      }
    } else if (record.networkType === 'Tron') {
      if (!/^T[1-9A-HJ-NP-za-km-z]{33}$/.test(trimmed)) {
        throw new Error('INVALID_TREASURY_ADDRESS: Address must be a valid TRON address starting with T');
      }
    }

    record.address = trimmed;
    return true;
  }
}

export const treasuryService = TreasuryService.getInstance();
