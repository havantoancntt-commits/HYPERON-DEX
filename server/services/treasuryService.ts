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
    totalCollectedUsd24h: 38450.20,
    totalCollectedLifetimeUsd: 1420500.00,
    status: 'ACTIVE',
  },
  solana: {
    chainId: 'solana',
    name: 'Solana Network',
    networkType: 'Solana',
    address: '5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
    explorerUrl: 'https://solscan.io/account/5zz8MHDqLTV3yBX3Qs2KnmjvMzh6qvbzMC4b6zfXAtt4',
    totalCollectedUsd24h: 24190.50,
    totalCollectedLifetimeUsd: 890400.00,
    status: 'ACTIVE',
  },
  bsc: {
    chainId: 'bsc',
    name: 'BNB Smart Chain',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://bscscan.com/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 18400.00,
    totalCollectedLifetimeUsd: 645100.00,
    status: 'ACTIVE',
  },
  tron: {
    chainId: 'tron',
    name: 'TRON Network (TRC-20)',
    networkType: 'Tron',
    address: 'TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
    explorerUrl: 'https://tronscan.org/#/address/TLzquLdPwYGf8q71V6E4mPAAnPYgvxQNBj',
    totalCollectedUsd24h: 21350.00,
    totalCollectedLifetimeUsd: 780900.00,
    status: 'ACTIVE',
  },
  arbitrum: {
    chainId: 'arbitrum',
    name: 'Arbitrum One',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://arbiscan.io/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 16820.00,
    totalCollectedLifetimeUsd: 540200.00,
    status: 'ACTIVE',
  },
  base: {
    chainId: 'base',
    name: 'Base L2 (Coinbase)',
    networkType: 'EVM',
    address: '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    explorerUrl: 'https://basescan.org/address/0x87743246e8cfBc3760a82dAAD00987b1d971a5A9',
    totalCollectedUsd24h: 19940.00,
    totalCollectedLifetimeUsd: 620800.00,
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
    const key = (chainId || 'ethereum').toLowerCase().trim();
    if (this.recipients[key]) {
      return this.recipients[key].address;
    }
    if (key.includes('sol')) return this.recipients.solana.address;
    if (key.includes('tron') || key.includes('trx')) return this.recipients.tron.address;
    if (key.includes('bsc') || key.includes('binance')) return this.recipients.bsc.address;
    if (key.includes('arb')) return this.recipients.arbitrum.address;
    if (key.includes('base')) return this.recipients.base.address;
    return this.recipients.ethereum.address;
  }

  public updateRecipient(chainId: string, newAddress: string): boolean {
    const key = (chainId || '').toLowerCase().trim();
    if (this.recipients[key]) {
      this.recipients[key].address = newAddress.trim();
      return true;
    }
    return false;
  }
}

export const treasuryService = TreasuryService.getInstance();
