import { createPublicClient, http, fallback, formatEther, formatUnits, parseUnits, Address, Hash } from 'viem';
import { mainnet, base, arbitrum, optimism, bsc, polygon } from 'viem/chains';

export const CHAIN_CLIENTS = {
  ethereum: createPublicClient({
    chain: mainnet,
    transport: fallback([
      http('https://cloudflare-eth.com'),
      http('https://rpc.ankr.com/eth'),
      http('https://ethereum-rpc.publicnode.com'),
      http('https://eth.meowrpc.com'),
    ]),
  }),
  base: createPublicClient({
    chain: base,
    transport: fallback([
      http('https://mainnet.base.org'),
      http('https://base.publicnode.com'),
      http('https://base-rpc.publicnode.com'),
    ]),
  }),
  arbitrum: createPublicClient({
    chain: arbitrum,
    transport: fallback([
      http('https://arb1.arbitrum.io/rpc'),
      http('https://arbitrum-one-rpc.publicnode.com'),
      http('https://rpc.ankr.com/arbitrum'),
    ]),
  }),
  optimism: createPublicClient({
    chain: optimism,
    transport: fallback([
      http('https://mainnet.optimism.io'),
      http('https://optimism-rpc.publicnode.com'),
      http('https://rpc.ankr.com/optimism'),
    ]),
  }),
  bsc: createPublicClient({
    chain: bsc,
    transport: fallback([
      http('https://binance.ankr.com'),
      http('https://bsc-dataseed.binance.org'),
      http('https://bsc-rpc.publicnode.com'),
    ]),
  }),
  polygon: createPublicClient({
    chain: polygon,
    transport: fallback([
      http('https://polygon-rpc.com'),
      http('https://polygon-bor-rpc.publicnode.com'),
      http('https://rpc.ankr.com/polygon'),
    ]),
  }),
};

export async function getLiveBlockNumber(chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'): Promise<bigint> {
  try {
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum;
    return await client.getBlockNumber();
  } catch (error) {
    console.warn(`[RPC] Failed to get block number for ${chainId}:`, error);
    return 21950000n;
  }
}

export async function getLiveGasPrice(chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'): Promise<{ gasPriceGwei: number; maxFeePerGasGwei?: number }> {
  try {
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum;
    const gasPrice = await client.getGasPrice();
    const gwei = Number(formatUnits(gasPrice, 9));
    return { gasPriceGwei: Number(gwei.toFixed(2)) };
  } catch (error) {
    console.warn(`[RPC] Failed to get gas price for ${chainId}:`, error);
    return { gasPriceGwei: 15.5 };
  }
}

export async function getContractBytecode(address: string, chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'): Promise<string | undefined> {
  try {
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum;
    const bytecode = await client.getBytecode({ address: address as Address });
    return bytecode;
  } catch (error) {
    console.warn(`[RPC] Failed to fetch bytecode for ${address}:`, error);
    return undefined;
  }
}

export async function getNativeBalance(address: string, chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'): Promise<string> {
  try {
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum;
    const balance = await client.getBalance({ address: address as Address });
    return formatEther(balance);
  } catch (error) {
    console.warn(`[RPC] Failed to fetch balance for ${address}:`, error);
    return '0.0';
  }
}
