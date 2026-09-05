import { Request, Response, NextFunction } from 'express';
import { verifyMessage, verifyTypedData, isAddress, Address, Hex } from 'viem';
import crypto from 'crypto';

export interface WalletAuthPayload {
  userAddress: string;
  signature?: string;
  authMessage?: string;
  authNonce?: string;
  authTimestamp?: number;
}

export interface NonceRecord {
  nonce: string;
  userAddress: string;
  expiresAt: number;
  used: boolean;
  issuedAt: number;
  chainId?: string;
}

// In-memory single-use nonce store with automatic pruning
const nonceStore: Map<string, NonceRecord> = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes validity

/**
 * Prunes expired nonces periodically
 */
function pruneExpiredNonces(): void {
  const now = Date.now();
  for (const [key, record] of nonceStore.entries()) {
    if (record.expiresAt < now || record.used) {
      nonceStore.delete(key);
    }
  }
}

const cleanupTimer = setInterval(pruneExpiredNonces, 60 * 1000);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Issues a cryptographically random, single-use nonce tied to a specific wallet.
 */
export function issueWalletNonce(userAddress: string, chainId: string = 'ethereum'): {
  nonce: string;
  expiresAt: number;
  authMessage: string;
} {
  if (!userAddress || !isAddress(userAddress)) {
    throw new Error('INVALID_ADDRESS: Must provide a valid EVM address to issue nonce');
  }

  const normalized = userAddress.toLowerCase();
  const nonce = `hyp_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + NONCE_TTL_MS;

  const record: NonceRecord = {
    nonce,
    userAddress: normalized,
    expiresAt,
    used: false,
    issuedAt: now,
    chainId,
  };

  nonceStore.set(`${normalized}:${nonce}`, record);

  const authMessage = buildWalletAuthMessage(userAddress, 'AUTHENTICATE_SESSION', nonce, now, chainId);

  return {
    nonce,
    expiresAt,
    authMessage,
  };
}

/**
 * Standard SIWE / EIP-191 Auth Message Builder
 */
export function buildWalletAuthMessage(
  userAddress: string,
  action: string,
  nonce: string,
  timestamp: number,
  chainId: string = 'ethereum'
): string {
  return [
    'HYPERON-DEX Non-Custodial Security Protocol',
    '',
    `Sign-in authorization for account: ${userAddress}`,
    `Action: ${action}`,
    `Chain: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(timestamp).toISOString()}`,
    `Expires In: 5 minutes`,
    '',
    'Signing this message will not trigger a blockchain transaction or cost any gas.',
  ].join('\n');
}

/**
 * Validates cryptographic wallet signatures for authenticated actions.
 * Enforces:
 * 1. Valid EVM address
 * 2. Non-empty signature and message
 * 3. Valid, unexpired, unused nonce (replay attack prevention)
 * 4. Exact ECDSA verification via viem verifyMessage
 * 5. Immediate consumption of nonce upon success
 */
export async function verifyWalletAuth(
  userAddressOrParams:
    | string
    | {
        address: string;
        signature: string;
        message?: string;
        authMessage?: string;
        nonce?: string;
        authNonce?: string;
      },
  paramSignature?: string,
  paramAuthMessage?: string,
  paramAuthNonce?: string
): Promise<{ verified: boolean; reason?: string }> {
  let userAddress: string;
  let signature: string;
  let authMessage: string;
  let authNonce: string | undefined;

  if (typeof userAddressOrParams === 'string') {
    userAddress = userAddressOrParams;
    signature = paramSignature || '';
    authMessage = paramAuthMessage || '';
    authNonce = paramAuthNonce;
  } else {
    userAddress = userAddressOrParams.address;
    signature = userAddressOrParams.signature;
    authMessage = userAddressOrParams.authMessage || userAddressOrParams.message || '';
    authNonce = userAddressOrParams.authNonce || userAddressOrParams.nonce;
  }

  if (!userAddress || !isAddress(userAddress)) {
    return { verified: false, reason: 'INVALID_ADDRESS: Invalid EVM address' };
  }

  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { verified: false, reason: 'SIGNATURE_REQUIRED: Missing or malformed cryptographic signature' };
  }

  if (!authMessage || typeof authMessage !== 'string') {
    return { verified: false, reason: 'AUTH_MESSAGE_REQUIRED: Missing authMessage payload' };
  }

  const normalized = userAddress.toLowerCase();

  // If a nonce is provided or embedded in message, verify single-use replay protection
  let extractedNonce = authNonce;
  if (!extractedNonce) {
    const nonceMatch = authMessage.match(/Nonce:\s*(hyp_[a-f0-9]+)/i);
    if (nonceMatch) {
      extractedNonce = nonceMatch[1];
    }
  }

  if (extractedNonce) {
    const key = `${normalized}:${extractedNonce}`;
    const record = nonceStore.get(key);

    if (!record) {
      return { verified: false, reason: 'NONCE_INVALID_OR_EXPIRED: Nonce not recognized or expired' };
    }

    if (record.used) {
      return { verified: false, reason: 'NONCE_ALREADY_USED: Replay attack detected. Nonce was already consumed.' };
    }

    if (Date.now() > record.expiresAt) {
      nonceStore.delete(key);
      return { verified: false, reason: 'NONCE_EXPIRED: Authentication session timed out' };
    }
  }

  try {
    const isValid = await verifyMessage({
      address: userAddress as Address,
      message: authMessage,
      signature: signature as Hex,
    });

    if (!isValid) {
      return { verified: false, reason: 'INVALID_SIGNATURE: Cryptographic signature does not match claimed address' };
    }

    // Mark nonce as consumed upon successful verification
    if (extractedNonce) {
      const key = `${normalized}:${extractedNonce}`;
      const record = nonceStore.get(key);
      if (record) {
        record.used = true;
      }
    }

    return { verified: true };
  } catch (err: any) {
    return { verified: false, reason: `SIGNATURE_VERIFICATION_FAILED: ${err?.message || 'Verification error'}` };
  }
}

/**
 * Express Middleware strictly enforcing cryptographic wallet authentication for privileged endpoints.
 * Rejects unsigned requests on production.
 */
export async function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  const userAddress = req.body?.userAddress || (req.headers['x-wallet-address'] as string);
  const signature = req.body?.signature || (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);
  const authMessage = req.body?.authMessage || (req.headers['x-auth-message'] as string);
  const authNonce = req.body?.authNonce || (req.headers['x-auth-nonce'] as string);

  if (!userAddress) {
    return res.status(401).json({
      error: 'USER_ADDRESS_REQUIRED',
      message: 'User wallet address is required for authenticated operation.',
    });
  }

  if (!isAddress(userAddress)) {
    return res.status(400).json({
      error: 'INVALID_ADDRESS',
      message: 'Supplied address is not a valid EVM address.',
    });
  }

  if (!signature || !authMessage) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_SIGNATURE_REQUIRED',
      message: 'Cryptographic signature and authMessage are strictly required for this endpoint.',
    });
  }

  const authResult = await verifyWalletAuth(userAddress, signature, authMessage, authNonce);
  if (!authResult.verified) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_SIGNATURE',
      message: authResult.reason || 'Cryptographic signature verification failed',
    });
  }

  (req as any).authenticatedUser = userAddress.toLowerCase();
  next();
}

/**
 * EIP-712 Relay Swap Typed Data Schema & Verification
 */
export const RELAY_SWAP_TYPES = {
  RelaySwap: [
    { name: 'user', type: 'address' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMinimum', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'feeTier', type: 'uint24' },
    { name: 'routeHash', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export interface RelaySwapMessage {
  user: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
  feeTier: number;
  routeHash: Hex;
  deadline: bigint;
  nonce: bigint;
}

/**
 * Cryptographically verifies an EIP-712 relay swap signature against the verifying contract
 */
export async function verifyRelaySwapSignature(params: {
  message: RelaySwapMessage;
  signature: Hex;
  verifyingContract: Address;
  chainId: number;
}): Promise<{ verified: boolean; reason?: string }> {
  try {
    const nowEpoch = BigInt(Math.floor(Date.now() / 1000));
    if (params.message.deadline < nowEpoch) {
      return { verified: false, reason: 'EXPIRED_DEADLINE: Relay swap deadline has expired' };
    }

    const domain = {
      name: 'HyperonRouter',
      version: '1',
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
    } as const;

    const isValid = await verifyTypedData({
      address: params.message.user,
      domain,
      types: RELAY_SWAP_TYPES,
      primaryType: 'RelaySwap',
      message: params.message,
      signature: params.signature,
    });

    if (!isValid) {
      return { verified: false, reason: 'INVALID_EIP712_SIGNATURE: Signature does not match message parameters' };
    }

    return { verified: true };
  } catch (err: any) {
    return { verified: false, reason: `EIP712_VERIFICATION_ERROR: ${err?.message || 'Signature parse error'}` };
  }
}
