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

// Standard ERC20 minimal ABI for on-chain state inspection
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

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
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return undefined;
    }
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
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return '0.0';
    }
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum;
    const balance = await client.getBalance({ address: address as Address });
    return formatEther(balance);
  } catch (error) {
    console.warn(`[RPC] Failed to fetch native balance for ${address}:`, error);
    return '0.0';
  }
}

export async function getERC20Balance(
  tokenAddress: string,
  userAddress: string,
  decimals: number = 18,
  chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'
): Promise<string> {
  try {
    if (!tokenAddress || !userAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      return await getNativeBalance(userAddress, chainId);
    }
    const client = (CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum) as any;
    const balance = await client.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as Address],
    });
    return formatUnits(balance as bigint, decimals);
  } catch (error) {
    console.warn(`[RPC] Failed to read ERC20 balance for ${tokenAddress}:`, error);
    return '0.0';
  }
}

export async function getERC20Allowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  decimals: number = 18,
  chainId: keyof typeof CHAIN_CLIENTS = 'ethereum'
): Promise<{ allowanceFormatted: string; allowanceRaw: bigint; isSufficient: (requiredAmount: string) => boolean }> {
  try {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      return {
        allowanceFormatted: 'Infinity (Native ETH)',
        allowanceRaw: 2n ** 256n - 1n,
        isSufficient: () => true,
      };
    }
    const client = (CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS.ethereum) as any;
    const allowance = await client.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress as Address, spenderAddress as Address],
    });
    const allowanceRaw = allowance as bigint;
    const allowanceFormatted = formatUnits(allowanceRaw, decimals);
    return {
      allowanceFormatted,
      allowanceRaw,
      isSufficient: (requiredAmount: string) => {
        try {
          const reqBig = parseUnits(requiredAmount || '0', decimals);
          return allowanceRaw >= reqBig;
        } catch {
          return false;
        }
      },
    };
  } catch (error) {
    console.warn(`[RPC] Failed to read ERC20 allowance for ${tokenAddress}:`, error);
    return {
      allowanceFormatted: '0.0',
      allowanceRaw: 0n,
      isSufficient: () => false,
    };
  }
}
