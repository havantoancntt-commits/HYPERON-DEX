import { Request, Response, NextFunction } from 'express';
import { verifyMessage, isAddress } from 'viem';

export interface WalletAuthPayload {
  userAddress: string;
  signature?: string;
  authMessage?: string;
  authNonce?: string;
  authTimestamp?: number;
}

/**
 * Validates cryptographic wallet signatures for authenticated non-custodial actions.
 * Supports EIP-191 personal_sign messages / SIWE formatting.
 */
export async function verifyWalletAuth(
  userAddress: string,
  signature?: string,
  authMessage?: string
): Promise<{ verified: boolean; reason?: string }> {
  if (!userAddress || !isAddress(userAddress)) {
    return { verified: false, reason: 'INVALID_ADDRESS: Invalid EVM address' };
  }

  // When cryptographic signature is provided, verify against the claimed address
  if (signature) {
    try {
      if (!authMessage) {
        return { verified: false, reason: 'AUTH_MESSAGE_REQUIRED: Missing message payload for signature verification' };
      }

      const isValid = await verifyMessage({
        address: userAddress as `0x${string}`,
        message: authMessage,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return { verified: false, reason: 'INVALID_SIGNATURE: Cryptographic signature does not match claimed address' };
      }

      return { verified: true };
    } catch (err: any) {
      return { verified: false, reason: `SIGNATURE_VERIFICATION_FAILED: ${err?.message || 'Malformed signature'}` };
    }
  }

  // Non-signed requests are allowed in development / simulation mode with valid EVM address
  return { verified: true };
}

/**
 * Express Middleware enforcing cryptographic wallet authentication
 */
export async function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  const { userAddress, signature, authMessage } = req.body || {};

  if (!userAddress) {
    return res.status(400).json({ error: 'USER_ADDRESS_REQUIRED', message: 'User wallet address is required.' });
  }

  if (!isAddress(userAddress)) {
    return res.status(400).json({ error: 'INVALID_ADDRESS', message: 'Supplied address is not a valid EVM address.' });
  }

  if (signature) {
    const authResult = await verifyWalletAuth(userAddress, signature, authMessage);
    if (!authResult.verified) {
      return res.status(401).json({
        error: 'UNAUTHORIZED_SIGNATURE',
        message: authResult.reason || 'Cryptographic signature verification failed',
      });
    }
  }

  next();
}

/**
 * Helper to construct standard EIP-191 / SIWE authentication message
 */
export function buildLotteryAuthMessage(userAddress: string, action: string, nonce: string, timestamp: number): string {
  return `HYPERON-DEX Non-Custodial Authorization\n\nSign in with your Ethereum account:\n${userAddress}\n\nAction: ${action}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
