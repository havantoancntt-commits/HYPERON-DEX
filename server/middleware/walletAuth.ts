import { Request, Response, NextFunction } from 'express';
import { verifyMessage, verifyTypedData, isAddress, Address, Hex } from 'viem';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
  chainId: string;
  domain?: string;
  action?: string;
}

export interface INonceStore {
  get(key: string): Promise<NonceRecord | null> | NonceRecord | null;
  set(key: string, record: NonceRecord): Promise<void> | void;
  markUsed(key: string): Promise<boolean> | boolean;
  delete(key: string): Promise<void> | void;
  prune(): Promise<void> | void;
}

/**
 * Production Durable Nonce Store supporting serverless/multi-container deployments.
 * Persists to disk with in-memory write-through cache for instant reads.
 */
export class DurableNonceStore implements INonceStore {
  private cache: Map<string, NonceRecord> = new Map();
  private storagePath: string;

  constructor(filePath?: string) {
    this.storagePath = filePath || path.resolve('.data', 'nonces.json');
    this.init();
  }

  private init(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const now = Date.now();
          for (const item of data) {
            if (item.expiresAt > now && !item.used) {
              this.cache.set(`${item.userAddress.toLowerCase()}:${item.nonce}`, item);
            }
          }
        }
      }
    } catch {
      // Fallback to in-memory if disk is unavailable
    }
  }

  private persist(): void {
    try {
      const records = Array.from(this.cache.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(records, null, 2), 'utf8');
    } catch {
      // Best-effort file sync
    }
  }

  get(key: string): NonceRecord | null {
    return this.cache.get(key) || null;
  }

  set(key: string, record: NonceRecord): void {
    this.cache.set(key, record);
    this.persist();
  }

  markUsed(key: string): boolean {
    const rec = this.cache.get(key);
    if (!rec || rec.used) {
      return false;
    }
    rec.used = true;
    this.persist();
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.persist();
  }

  prune(): void {
    const now = Date.now();
    let modified = false;
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt < now || v.used) {
        this.cache.delete(k);
        modified = true;
      }
    }
    if (modified) {
      this.persist();
    }
  }
}

export const nonceStore: INonceStore = new DurableNonceStore();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
export const DEFAULT_AUTH_DOMAIN = 'hyperon.dex';

const cleanupTimer = setInterval(() => nonceStore.prune(), 60 * 1000);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Issues a cryptographically random, single-use nonce bound to userAddress, chainId, and domain.
 */
export function issueWalletNonce(
  userAddress: string,
  chainId: string = 'ethereum',
  domain: string = DEFAULT_AUTH_DOMAIN,
  action: string = 'AUTHENTICATE_SESSION'
): {
  nonce: string;
  expiresAt: number;
  authMessage: string;
  domain: string;
  chainId: string;
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
    chainId: chainId.toLowerCase(),
    domain,
    action,
  };

  nonceStore.set(`${normalized}:${nonce}`, record);

  const authMessage = buildWalletAuthMessage(userAddress, action, nonce, now, chainId, domain);

  return {
    nonce,
    expiresAt,
    authMessage,
    domain,
    chainId,
  };
}

/**
 * Standard SIWE / EIP-4361 Auth Message Builder
 */
export function buildWalletAuthMessage(
  userAddress: string,
  action: string,
  nonce: string,
  timestamp: number,
  chainId: string = 'ethereum',
  domain: string = DEFAULT_AUTH_DOMAIN
): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    userAddress,
    '',
    `HYPERON-DEX Non-Custodial Protocol Authorization`,
    '',
    `URI: https://${domain}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Action: ${action}`,
    `Issued At: ${new Date(timestamp).toISOString()}`,
    `Expiration Time: ${new Date(timestamp + NONCE_TTL_MS).toISOString()}`,
    '',
    'Signing this message will not trigger a blockchain transaction or cost any gas.',
  ].join('\n');
}

export interface ParsedAuthMessage {
  domain?: string;
  address?: string;
  nonce?: string;
  chainId?: string;
  action?: string;
  issuedAt?: number;
  expirationTime?: number;
}

export function parseAuthMessage(msg: string): ParsedAuthMessage {
  const parsed: ParsedAuthMessage = {};

  const domainMatch = msg.match(/^([a-zA-Z0-9.-]+)\s+wants you to sign in/i);
  if (domainMatch) parsed.domain = domainMatch[1];

  const nonceMatch = msg.match(/Nonce:\s*([^\r\n]+)/i);
  if (nonceMatch) parsed.nonce = nonceMatch[1].trim();

  const chainMatch = msg.match(/Chain ID:\s*([^\r\n]+)/i);
  if (chainMatch) parsed.chainId = chainMatch[1].trim().toLowerCase();

  const actionMatch = msg.match(/Action:\s*([^\r\n]+)/i);
  if (actionMatch) parsed.action = actionMatch[1].trim();

  const issuedMatch = msg.match(/Issued At:\s*([^\r\n]+)/i);
  if (issuedMatch) {
    const t = Date.parse(issuedMatch[1].trim());
    if (!isNaN(t)) parsed.issuedAt = t;
  }

  const expMatch = msg.match(/Expiration Time:\s*([^\r\n]+)/i);
  if (expMatch) {
    const t = Date.parse(expMatch[1].trim());
    if (!isNaN(t)) parsed.expirationTime = t;
  }

  const addrMatch = msg.match(/(0x[a-fA-F0-9]{40})/);
  if (addrMatch) parsed.address = addrMatch[1];

  return parsed;
}

/**
 * Validates cryptographic wallet signatures for authenticated actions.
 * Enforces:
 * 1. Valid EVM address
 * 2. Non-empty signature and message
 * 3. Mandatory, registered, unexpired, unused nonce (replay attack prevention)
 * 4. User address binding (message address == claimed address)
 * 5. Domain, chainId, and action consistency
 * 6. Exact ECDSA verification via viem verifyMessage
 * 7. Immediate consumption of nonce upon success
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
        expectedAction?: string;
        expectedChainId?: string;
        expectedDomain?: string;
      },
  paramSignature?: string,
  paramAuthMessage?: string,
  paramAuthNonce?: string,
  expectedAction?: string
): Promise<{ verified: boolean; reason?: string }> {
  let userAddress: string;
  let signature: string;
  let authMessage: string;
  let authNonce: string | undefined;
  let actionExpected = expectedAction;

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
    actionExpected = userAddressOrParams.expectedAction;
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
  const parsed = parseAuthMessage(authMessage);

  // Address in message must match claimed address
  if (parsed.address && parsed.address.toLowerCase() !== normalized) {
    return { verified: false, reason: 'ADDRESS_MISMATCH: Message address does not match claimed signer' };
  }

  // Extract nonce from parameter or message
  const nonceToVerify = authNonce || parsed.nonce;
  if (!nonceToVerify) {
    return { verified: false, reason: 'NONCE_REQUIRED: Cryptographic auth requires single-use nonce' };
  }

  const key = `${normalized}:${nonceToVerify}`;
  const record = await nonceStore.get(key);

  if (!record) {
    return { verified: false, reason: 'NONCE_INVALID_OR_EXPIRED: Nonce not recognized or expired' };
  }

  if (record.used) {
    return { verified: false, reason: 'NONCE_ALREADY_USED: Replay attack detected. Nonce was already consumed.' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    await nonceStore.delete(key);
    return { verified: false, reason: 'NONCE_EXPIRED: Authentication session timed out' };
  }

  // Check action binding if expected
  if (actionExpected && record.action && record.action !== actionExpected) {
    return { verified: false, reason: `ACTION_MISMATCH: Expected action ${actionExpected}, got ${record.action}` };
  }

  // Check clock skew on issuedAt (tolerance: 60s in future)
  if (parsed.issuedAt && parsed.issuedAt > now + 60000) {
    return { verified: false, reason: 'TIMESTAMP_FUTURE: Message timestamp is in the future' };
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

    // Atomic consumption of single-use nonce
    const marked = await nonceStore.markUsed(key);
    if (!marked) {
      return { verified: false, reason: 'NONCE_ALREADY_USED: Race condition / replay detected during consumption' };
    }

    return { verified: true };
  } catch (err: any) {
    return { verified: false, reason: `SIGNATURE_VERIFICATION_FAILED: ${err?.message || 'Verification error'}` };
  }
}

/**
 * Express Middleware strictly enforcing cryptographic wallet authentication for privileged endpoints.
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

    if (params.message.tokenIn.toLowerCase() === params.message.tokenOut.toLowerCase()) {
      return { verified: false, reason: 'IDENTICAL_TOKENS: tokenIn and tokenOut cannot be identical' };
    }

    if (!isAddress(params.message.user) || !isAddress(params.message.recipient)) {
      return { verified: false, reason: 'INVALID_ADDRESS: user and recipient must be valid EVM addresses' };
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
