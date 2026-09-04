/**
 * HYPERON-DEX Production Transaction Simulation Engine
 * Executes REAL pre-flight on-chain transaction simulations via eth_call and eth_estimateGas.
 *
 * Rules:
 * - NO fake simulations or hardcoded "success: true".
 * - Encodes real calldata for Uniswap V3 / Uniswap V2 / Universal Router interfaces.
 * - Executes viem client.call() against the target chain RPC.
 * - Decodes EVM revert reasons (Standard Error(string), Panic(uint256), and DEX custom errors).
 * - Verifies real balance and on-chain ERC20 allowance.
 */

import {
  Address,
  encodeFunctionData,
  decodeErrorResult,
  formatUnits,
  parseUnits,
  toHex,
  Hex,
} from 'viem';
import { getChainClient, getERC20Allowance, getERC20Balance, getNativeBalance, getLiveBlockNumber, getLiveGasPrice } from './rpc';
import { getRouterConfig } from './routerRegistry';
import { getUsdPrice } from './priceFeed';
import { safeTruncateAndParseUnits } from './router';
import { SwapQuote, TransactionSimulation, ChainId, SimulationStatus } from '../../src/types';

export const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export const UNISWAP_V2_ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

/**
 * Decodes raw EVM revert data from eth_call
 */
export function decodeRevertReason(revertData: string | undefined | null): string {
  if (!revertData || revertData === '0x') {
    return 'Transaction reverted without a reason string (execution failed)';
  }

  try {
    // 1. Check for standard Error(string) selector: 0x08c379a0
    if (revertData.startsWith('0x08c379a0')) {
      const decoded = decodeErrorResult({
        abi: [
          {
            name: 'Error',
            type: 'error',
            inputs: [{ name: 'message', type: 'string' }],
          },
        ],
        data: revertData as Hex,
      });
      return `Reverted with: "${decoded.args[0]}"`;
    }

    // 2. Check for Panic(uint256) selector: 0x4e487b71
    if (revertData.startsWith('0x4e487b71')) {
      const decoded = decodeErrorResult({
        abi: [
          {
            name: 'Panic',
            type: 'error',
            inputs: [{ name: 'code', type: 'uint256' }],
          },
        ],
        data: revertData as Hex,
      });
      const code = Number(decoded.args[0]);
      const panicDescriptions: Record<number, string> = {
        0x01: 'Assertion failed',
        0x11: 'Arithmetic underflow/overflow',
        0x12: 'Division by zero',
        0x21: 'Enum conversion out of bounds',
        0x22: 'Invalid storage byte array',
        0x31: 'Empty array pop',
        0x32: 'Array index out of bounds',
        0x41: 'Memory allocation error',
        0x51: 'Zero initialized function pointer',
      };
      return `Reverted with EVM Panic(0x${code.toString(16)}): ${panicDescriptions[code] || 'Panic exception'}`;
    }

    // 3. Known Uniswap / DEX error codes
    const hexSlice = revertData.slice(2);
    if (hexSlice.includes('535446')) {
      return 'Reverted with STF (SafeTransferFailed): Insufficient token balance or approval';
    }
    if (hexSlice.includes('5446')) {
      return 'Reverted with TF (TransferFailed): ERC20 transfer failed';
    }
    if (hexSlice.includes('45585049524544')) {
      return 'Reverted with EXPIRED: Transaction deadline has passed';
    }
    if (hexSlice.includes('494e53554646494349454e545f4f55545055545f414d4f554e54')) {
      return 'Reverted with INSUFFICIENT_OUTPUT_AMOUNT: Slippage limit exceeded';
    }

    return `Reverted with custom error: ${revertData.substring(0, 34)}...`;
  } catch (err: any) {
    return `Revert data: ${revertData.substring(0, 34)}... (${err?.message || 'Unknown'})`;
  }
}

export interface SimulationOptions {
  deadline?: bigint | number;
  fee?: number;
  routerAddress?: Address;
}

export function extractFeeTier(quote: SwapQuote, options?: SimulationOptions): number {
  if (options?.fee !== undefined) return options.fee;
  if ((quote as any).feeTierBps !== undefined) {
    return (quote as any).feeTierBps * 100;
  }
  if ((quote as any).feeTier !== undefined) {
    return (quote as any).feeTier;
  }
  const splitDexName = quote.routeSplits?.[0]?.dexName || '';
  const match = splitDexName.match(/(\d+(?:\.\d+)?)%/);
  if (match) {
    const pct = parseFloat(match[1]);
    return Math.round(pct * 10000);
  }
  const primarySource = quote.sources?.find((s) => s.sharePercent > 0) || quote.sources?.[0];
  if (primarySource?.poolFeePercent !== undefined) {
    return Math.round(primarySource.poolFeePercent * 10000);
  }
  return 3000;
}

export function resolveSimulationRouter(
  quote: SwapQuote,
  routerConfig: ReturnType<typeof getRouterConfig>,
  options?: SimulationOptions
): {
  routerAddress: Address;
  protocol: 'v3' | 'v2';
  fee: number;
} {
  if (options?.routerAddress) {
    return {
      routerAddress: options.routerAddress,
      protocol: 'v3',
      fee: extractFeeTier(quote, options),
    };
  }

  const protocolHint = (
    (quote as any).protocol ||
    quote.routeSplits?.[0]?.dexName ||
    ''
  ).toLowerCase();

  const fee = extractFeeTier(quote, options);

  if (protocolHint.includes('v2') || protocolHint.includes('sushiswap')) {
    const v2Router = (routerConfig.uniswapV2Router ||
      routerConfig.universalRouter ||
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D') as Address;
    return { routerAddress: v2Router, protocol: 'v2', fee };
  }

  const v3Router = (routerConfig.uniswapV3Router ||
    routerConfig.universalRouter ||
    '0xE592427A0AEce92De3Edee1F18E0157C05861564') as Address;
  return { routerAddress: v3Router, protocol: 'v3', fee };
}

export class SimulationEngine {
  /**
   * Executes genuine on-chain simulation via viem client.call() with decoded revert reasons.
   */
  async simulateSwap(
    quote: SwapQuote,
    userAddress?: string,
    chainId: string = 'ethereum',
    options?: SimulationOptions
  ): Promise<TransactionSimulation> {
    if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
      throw new Error('USER_ADDRESS_REQUIRED: A valid EVM wallet address is required for simulation.');
    }

    const routerConfig = getRouterConfig(chainId);
    const verifiedChain = routerConfig.chainId;
    const { client } = getChainClient(verifiedChain);

    const { routerAddress: routerSpender, protocol, fee } = resolveSimulationRouter(
      quote,
      routerConfig,
      options
    );

    const nativeSymbol = routerConfig.nativeSymbol;
    const nativePriceUsd = getUsdPrice(nativeSymbol) || 0;
    const decimalsIn = quote.fromToken.decimals || 18;
    const decimalsOut = quote.toToken.decimals || 18;

    const isNativeIn =
      quote.fromToken.symbol === nativeSymbol ||
      quote.fromToken.address === '0x0000000000000000000000000000000000000000';

    // 1. Read block, gas price, and caller balance concurrently
    const [rpcBlock, rpcGas, balRes] = await Promise.all([
      getLiveBlockNumber(verifiedChain).catch(() => ({ data: null })),
      getLiveGasPrice(verifiedChain).catch(() => ({ data: null })),
      isNativeIn
        ? getNativeBalance(userAddress, verifiedChain).catch(() => ({ data: null }))
        : getERC20Balance(quote.fromToken.address, userAddress, decimalsIn, verifiedChain).catch(() => ({ data: null })),
    ]);

    const currentBlock = rpcBlock.data ? Number(rpcBlock.data) : 0;
    const gasGwei = rpcGas.data?.gasPriceGwei || 15.0;

    const amountInRaw = safeTruncateAndParseUnits(quote.fromAmount.toString(), decimalsIn);
    const amountOutMinRaw = safeTruncateAndParseUnits(quote.minimumReceived.toString(), decimalsOut);

    let balanceBeforeRaw = 0n;
    let balanceFormatted = '0.0';
    if (balRes?.data) {
      balanceBeforeRaw = balRes.data.raw;
      balanceFormatted = balRes.data.formatted;
    }

    const hasSufficientBalance = balanceBeforeRaw >= amountInRaw;

    // 2. Read live caller allowance for Router
    let isAllowanceApproved = isNativeIn;
    let allowanceFormatted = isNativeIn ? 'UNLIMITED (Native Token)' : '0.0';

    if (!isNativeIn) {
      const allowRes = await getERC20Allowance(
        quote.fromToken.address,
        userAddress,
        routerSpender,
        decimalsIn,
        verifiedChain
      );
      if (allowRes.data) {
        allowanceFormatted = allowRes.data.formatted;
        isAllowanceApproved = allowRes.data.isSufficient(amountInRaw);
      }
    }

    // 3. Construct real calldata for eth_call dynamically
    let calldata: Hex = '0x';
    const deadline = options?.deadline
      ? BigInt(options.deadline)
      : BigInt(Math.floor(Date.now() / 1000) + 1200);

    try {
      const tokenInAddr = (isNativeIn ? routerConfig.wrappedNativeAddress : quote.fromToken.address) as Address;
      const tokenOutAddr = (quote.toToken.symbol === nativeSymbol ? routerConfig.wrappedNativeAddress : quote.toToken.address) as Address;

      if (protocol === 'v2') {
        if (isNativeIn) {
          calldata = encodeFunctionData({
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: 'swapExactETHForTokens',
            args: [amountOutMinRaw, [tokenInAddr, tokenOutAddr], userAddress as Address, deadline],
          });
        } else {
          calldata = encodeFunctionData({
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [amountInRaw, amountOutMinRaw, [tokenInAddr, tokenOutAddr], userAddress as Address, deadline],
          });
        }
      } else {
        calldata = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: tokenInAddr,
              tokenOut: tokenOutAddr,
              fee,
              recipient: userAddress as Address,
              deadline,
              amountIn: amountInRaw,
              amountOutMinimum: amountOutMinRaw,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
      }
    } catch {
      calldata = '0x';
    }

    // 4. Perform actual eth_call on RPC node
    let ethCallSuccess = false;
    let revertReason: string | undefined;
    let gasEstimated = 145000;

    const warnings: string[] = [];

    if (!hasSufficientBalance) {
      warnings.push(
        `Insufficient Balance: Wallet has ${parseFloat(balanceFormatted).toFixed(4)} ${quote.fromToken.symbol}, but swap requires ${quote.fromAmount}.`
      );
    }

    if (!isAllowanceApproved && !isNativeIn) {
      warnings.push(
        `Token Approval Required: Router (${routerSpender.substring(0, 8)}...) has ${allowanceFormatted} allowance for ${quote.fromToken.symbol}.`
      );
    }

    if (quote.priceImpactPercent > 3.0) {
      warnings.push(`High Price Impact: Execution price deviates by ${quote.priceImpactPercent.toFixed(2)}% from pool spot price.`);
    }

    let simulationErrorType: 'REVERTED' | 'RPC_ERROR' | 'TIMEOUT' | null = null;
    try {
      const withTimeout = async <T>(promise: Promise<T>, ms = 2500): Promise<T> => {
        let timer: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const tErr = new Error('SIMULATION_TIMEOUT');
            tErr.name = 'TimeoutError';
            reject(tErr);
          }, ms);
        });
        try {
          return await Promise.race([promise, timeoutPromise]);
        } finally {
          clearTimeout(timer);
        }
      };

      // Execute eth_call with sender and calldata
      const callResult = await withTimeout(client.call({
        account: userAddress as Address,
        to: routerSpender,
        data: calldata,
        value: isNativeIn ? amountInRaw : 0n,
      }));

      // If call didn't throw and returned data
      if (callResult && callResult.data) {
        ethCallSuccess = true;
      }
    } catch (err: any) {
      ethCallSuccess = false;
      const rawData = err?.data || err?.cause?.data;
      if (err?.name === 'TimeoutError' || err?.message?.includes('SIMULATION_TIMEOUT')) {
        simulationErrorType = 'TIMEOUT';
        revertReason = 'Simulation request timed out on RPC node.';
      } else if (rawData) {
        simulationErrorType = 'REVERTED';
        revertReason = decodeRevertReason(rawData);
      } else if (err?.message?.includes('revert') || err?.message?.includes('execution reverted')) {
        simulationErrorType = 'REVERTED';
        revertReason = decodeRevertReason(err?.message);
      } else if (err?.name === 'HttpRequestError' || err?.message?.includes('fetch failed') || err?.message?.includes('RPC')) {
        simulationErrorType = 'RPC_ERROR';
        revertReason = `RPC connectivity failure: ${err?.message?.slice(0, 80)}`;
      } else {
        simulationErrorType = 'REVERTED';
        revertReason = decodeRevertReason(err?.message);
      }
    }

    // Estimate gas if balance & allowance are sufficient
    if (hasSufficientBalance && isAllowanceApproved) {
      try {
        const estGas = await client.estimateGas({
          account: userAddress as Address,
          to: routerSpender,
          data: calldata,
          value: isNativeIn ? amountInRaw : 0n,
        });
        gasEstimated = Number(estGas);
      } catch {
        gasEstimated = 145000;
      }
    }

    const gasCostUsd = nativePriceUsd > 0 ? Number(((gasEstimated * gasGwei * 1e-9) * nativePriceUsd).toFixed(2)) : 0;
    const overallSuccess = ethCallSuccess && hasSufficientBalance && isAllowanceApproved;
    const status: SimulationStatus = ethCallSuccess
      ? 'SUCCESS'
      : simulationErrorType === 'TIMEOUT'
      ? 'TIMEOUT'
      : simulationErrorType === 'RPC_ERROR'
      ? 'RPC_ERROR'
      : 'REVERTED';

    const simulationLogs = [
      `[SIMULATION] Network: ${verifiedChain.toUpperCase()} (Block #${currentBlock})`,
      `[ROUTER] Target Contract: ${routerSpender} (${protocol.toUpperCase()})`,
      `[ACCOUNT] Sender: ${userAddress}`,
      `[FEE TIER] ${fee} (${(fee / 10000).toFixed(2)}%)`,
      `[DEADLINE] Epoch: ${deadline.toString()}`,
      `[BALANCE CHECK] On-Chain Balance: ${balanceFormatted} ${quote.fromToken.symbol} (${hasSufficientBalance ? 'PASS' : 'FAIL'})`,
      `[ALLOWANCE CHECK] Approved: ${isAllowanceApproved ? 'YES' : 'NO'} (Current: ${allowanceFormatted})`,
      `[ETH_CALL] Calldata: ${calldata.substring(0, 20)}... (${calldata.length} bytes)`,
      `[ETH_CALL RESULT] ${ethCallSuccess ? 'SUCCESS (0x1)' : `REVERTED: ${revertReason || 'Execution reverted'}`}`,
      `[ESTIMATED GAS] ${gasEstimated.toLocaleString()} units (~$${gasCostUsd} USD @ ${gasGwei.toFixed(2)} Gwei)`,
      `[FINAL VERDICT] ${overallSuccess ? 'READY FOR EXECUTION' : 'PRE-FLIGHT BLOCKED'}`,
    ];

    return {
      success: overallSuccess,
      status,
      intentId: `INTENT-${Date.now()}`,
      correlationId: `CORR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      fromAddress: userAddress,
      toAddress: routerSpender,
      gasEstimated,
      gasEstimatedUnits: gasEstimated,
      gasCostUsd,
      balanceBefore: parseFloat(balanceFormatted) || 0,
      balanceAfter: Math.max(0, (parseFloat(balanceFormatted) || 0) - quote.fromAmount),
      allowanceRequired: !isNativeIn,
      allowanceApproved: isAllowanceApproved,
      priceImpactSafe: quote.priceImpactPercent < 3.0,
      priceImpactValue: quote.priceImpactPercent,
      slippageConfigured: quote.slippagePercent,
      smartContractRiskScore: overallSuccess ? 95 : 45,
      warnings,
      simulationLogs,
      blockNumberSimulated: currentBlock,
    };
  }
}

export const simulationEngine = new SimulationEngine();
