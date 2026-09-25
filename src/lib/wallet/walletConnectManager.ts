/**
 * HYPERON-DEX Real WalletConnect v2 Enterprise Connection Manager
 * Integrates directly with @walletconnect/ethereum-provider.
 * ZERO synthetic pairing strings, ZERO mock sessions.
 */

import { EIP1193Provider, WalletError } from './types';

// Fallback public demo project ID used exclusively when VITE_WALLETCONNECT_PROJECT_ID is omitted
// Allows evaluation in testing and preview environments
const DEFAULT_WC_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64';

export interface WalletConnectInitOptions {
  projectId?: string;
  chains?: number[];
  optionalChains?: number[];
  onDisplayUri?: (uri: string) => void;
  onSessionDelete?: () => void;
}

class WalletConnectManager {
  private static instance: WalletConnectManager;
  private provider: any = null;
  private currentUri: string = '';
  private isInitializing: boolean = false;

  private constructor() {}

  public static getInstance(): WalletConnectManager {
    if (!WalletConnectManager.instance) {
      WalletConnectManager.instance = new WalletConnectManager();
    }
    return WalletConnectManager.instance;
  }

  public getProjectId(): string {
    const envId =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID) ||
      (typeof process !== 'undefined' && process.env?.VITE_WALLETCONNECT_PROJECT_ID);
    return envId && envId.trim().length > 0 ? envId.trim() : DEFAULT_WC_PROJECT_ID;
  }

  public isProjectConfigured(): boolean {
    const envId =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID) ||
      (typeof process !== 'undefined' && process.env?.VITE_WALLETCONNECT_PROJECT_ID);
    return Boolean(envId && envId.trim().length > 0);
  }

  public getCurrentUri(): string {
    return this.currentUri;
  }

  /**
   * Initializes real WalletConnect Ethereum Provider and starts pairing listener.
   */
  public async getOrCreateProvider(options?: WalletConnectInitOptions): Promise<EIP1193Provider> {
    if (this.provider) {
      return this.provider as EIP1193Provider;
    }

    if (this.isInitializing) {
      // Wait for concurrent initialization
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.provider) return this.provider as EIP1193Provider;
    }

    this.isInitializing = true;
    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      const projectId = options?.projectId || this.getProjectId();

      const chains = (options?.chains && options.chains.length > 0 ? options.chains : [1]) as [number, ...number[]];
      const optionalChains = (options?.optionalChains && options.optionalChains.length > 0 ? options.optionalChains : [8453, 42161, 10, 56, 137]) as [number, ...number[]];

      const ethereumProvider = await EthereumProvider.init({
        projectId,
        chains,
        optionalChains,
        showQrModal: false, // We render the real QR code directly in HYPERON modal via qrcode.react
        metadata: {
          name: 'HYPERON-DEX',
          description: 'Institutional Non-Custodial Cross-Chain DEX Aggregator',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://hyperon.dex',
          icons: ['https://assets.coingecko.com/coins/images/279/small/ethereum.png'],
        },
      });

      // Bind genuine URI pairing event
      ethereumProvider.on('display_uri', (uri: string) => {
        this.currentUri = uri;
        options?.onDisplayUri?.(uri);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hyperon:wc_uri', { detail: { uri } }));
        }
      });

      ethereumProvider.on('session_delete', () => {
        this.currentUri = '';
        this.provider = null;
        options?.onSessionDelete?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hyperon:wc_session_deleted'));
        }
      });

      this.provider = ethereumProvider;
      return this.provider as EIP1193Provider;
    } catch (err: any) {
      this.provider = null;
      throw new WalletError(
        'ENVIRONMENT_BLOCKED',
        `Không thể khởi tạo WalletConnect Relay: ${err?.message || 'Lỗi mạng hoặc Project ID không hợp lệ'}.`,
        err
      );
    } finally {
      this.isInitializing = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect?.();
      } catch {
        // Safe teardown
      }
      this.provider = null;
      this.currentUri = '';
    }
  }
}

export const walletConnectManager = WalletConnectManager.getInstance();
