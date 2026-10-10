export const DEFAULT_HYPR_ADDRESS = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';

/**
 * Protocol Authorized Genesis Admin Deployer addresses.
 * The official treasury wallet holding deployment authority across EVM chains.
 */
export const AUTHORIZED_PROTOCOL_ADMINS: string[] = [
  '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'.toLowerCase(),
];

/**
 * Check if active session holds Protocol Admin deployment permissions.
 * STRICT SECURITY BOUNDARY:
 * Decided solely by an active, unexpired, server-issued session token.
 * Never grants permissions based on client localStorage booleans or plain wallet strings.
 */
export function isAuthorizedDeployer(walletAddress?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Purge legacy persistent admin keys from localStorage to prevent lingering admin access
    if (localStorage.getItem('HYPERON_ADMIN_SESSION_TOKEN')) {
      localStorage.removeItem('HYPERON_ADMIN_SESSION_TOKEN');
      localStorage.removeItem('HYPERON_ADMIN_EXPIRES_AT');
      localStorage.removeItem('HYPERON_ADMIN_ADDRESS');
      localStorage.removeItem('HYPERON_ADMIN_ACTIVE');
      localStorage.removeItem('HYPERON_ADMIN_DEV_KEY');
    }

    // STRICT INVARIANT: Admin authorization is strictly ephemeral in sessionStorage
    const token = sessionStorage.getItem('HYPERON_ADMIN_SESSION_TOKEN');
    const expiresAtStr = sessionStorage.getItem('HYPERON_ADMIN_EXPIRES_AT');

    if (!token) return false;

    if (expiresAtStr && Number(expiresAtStr) < Date.now()) {
      clearAdminSession();
      return false;
    }

    const boundAddress = sessionStorage.getItem('HYPERON_ADMIN_ADDRESS');

    if (walletAddress && boundAddress && walletAddress.toLowerCase() !== boundAddress.toLowerCase()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('HYPERON_ADMIN_SESSION_TOKEN');
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, address?: string, expiresAt?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const exp = expiresAt || Date.now() + 2 * 60 * 60 * 1000;
    sessionStorage.setItem('HYPERON_ADMIN_SESSION_TOKEN', token);
    sessionStorage.setItem('HYPERON_ADMIN_EXPIRES_AT', String(exp));

    if (address) {
      sessionStorage.setItem('HYPERON_ADMIN_ADDRESS', address.toLowerCase());
    }

    // Ensure zero localStorage persistence for admin privileges
    localStorage.removeItem('HYPERON_ADMIN_SESSION_TOKEN');
    localStorage.removeItem('HYPERON_ADMIN_EXPIRES_AT');
    localStorage.removeItem('HYPERON_ADMIN_ADDRESS');
    localStorage.removeItem('HYPERON_ADMIN_ACTIVE');
    localStorage.removeItem('HYPERON_ADMIN_DEV_KEY');

    window.dispatchEvent(new CustomEvent('hyperon-admin-updated'));
  } catch (err) {
    console.warn('Failed to set admin session:', err);
  }
}

/**
 * Server-authenticated Passkey Verification.
 * Strictly verifies credentials on the server; zero secret keys stored in client bundle.
 */
export async function authenticateAdminPasskey(
  passkey: string,
  walletAddress?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const cleanPasskey = (passkey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanPasskey) {
    return { success: false, error: 'Vui lòng nhập mật mã quản trị viên (Admin Passkey).' };
  }

  try {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passkey: cleanPasskey,
        walletAddress: walletAddress || undefined,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && data?.sessionId) {
      setAdminSession(data.sessionId, walletAddress || data.walletAddress, data.expiresAt);
      return { success: true, sessionId: data.sessionId };
    }

    return {
      success: false,
      error: data?.error || 'Mật mã quản trị viên không chính xác. Quyền truy cập bị từ chối.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Không thể kết nối đến máy chủ xác thực admin. Vui lòng kiểm tra lại mạng.',
    };
  }
}

/**
 * P0.3: Cryptographic Challenge-Response Wallet Admin Authentication.
 * Requests a cryptographic nonce from server, has admin wallet sign challenge,
 * verifies on server, and creates a verified admin session upon cryptographic proof.
 */
export async function authenticateAdminWithWalletSignature(
  address: string,
  signMessageFn: (message: string) => Promise<string>
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!address) {
    return { success: false, error: 'Vui lòng kết nối ví Web3 để xác thực.' };
  }

  try {
    // 1. Request cryptographic nonce challenge from server
    const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}&chainId=1`);
    const nonceData = await nonceRes.json().catch(() => null);
    if (!nonceRes.ok || !nonceData?.nonce) {
      return { success: false, error: nonceData?.message || 'Không thể tạo mã xác thực nonce từ server.' };
    }

    const domain = typeof window !== 'undefined' ? window.location.host : 'hyperon-dex.exchange';
    const authMessage = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'HYPERON-DEX Administrative Access Challenge',
      '',
      `URI: https://${domain}`,
      'Version: 1',
      'Chain ID: 1',
      `Nonce: ${nonceData.nonce}`,
      `Issued At: ${new Date(nonceData.issuedAt).toISOString()}`,
    ].join('\n');

    // 2. Request user wallet signature
    const signature = await signMessageFn(authMessage);
    if (!signature) {
      return { success: false, error: 'Người dùng đã hủy ký xác thực.' };
    }

    // 3. Verify signature on server (replay protected, cryptographic verification)
    const verifyRes = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        signature,
        authMessage,
        chainId: '1',
      }),
    });

    const verifyData = await verifyRes.json().catch(() => null);
    if (verifyRes.ok && verifyData?.success && verifyData?.sessionId) {
      const isRoleAdmin =
        verifyData.session?.roles?.includes('ADMIN') ||
        verifyData.session?.roles?.includes('SUPER_ADMIN');

      if (!isRoleAdmin) {
        return {
          success: false,
          error: 'Địa chỉ ví này không thuộc danh sách Quản trị viên (Protocol Admin) được ủy quyền.',
        };
      }

      setAdminSession(verifyData.sessionId, address, verifyData.session?.expiresAt);
      return { success: true, sessionId: verifyData.sessionId };
    }

    return {
      success: false,
      error: verifyData?.reason || verifyData?.message || 'Xác thực chữ ký quản trị viên thất bại.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi trong quá trình ký xác thực ví.',
    };
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('HYPERON_ADMIN_SESSION_TOKEN');
    sessionStorage.removeItem('HYPERON_ADMIN_EXPIRES_AT');
    sessionStorage.removeItem('HYPERON_ADMIN_ADDRESS');
    localStorage.removeItem('HYPERON_ADMIN_SESSION_TOKEN');
    localStorage.removeItem('HYPERON_ADMIN_EXPIRES_AT');
    localStorage.removeItem('HYPERON_ADMIN_ADDRESS');
    localStorage.removeItem('HYPERON_ADMIN_ACTIVE');
    localStorage.removeItem('HYPERON_ADMIN_DEV_KEY');
    localStorage.removeItem('HYPERON_CUSTOM_ADMINS');
    // Notify server to clear session cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.dispatchEvent(new CustomEvent('hyperon-admin-updated'));
  } catch (err) {
    console.warn('Failed to clear admin session:', err);
  }
}

export interface DeployedContractRecord {
  address: string;
  chainId: number;
  chainName: string;
  txHash: string;
  deployedAt: number;
  deployerAddress: string;
  initialSupply?: string;
}

const STORAGE_KEY = 'HYPR_CUSTOM_CONTRACT_ADDRESS';
const DEPLOYMENTS_KEY = 'HYPR_DEPLOYED_RECORDS';

export function getHyprContractAddress(): string {
  if (typeof window === 'undefined') return DEFAULT_HYPR_ADDRESS;
  try {
    // Only allow custom address override if developer session is authenticated
    if (isAuthorizedDeployer()) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.startsWith('0x') && saved.length === 42) {
        return saved;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_HYPR_ADDRESS;
}

export function setCustomHyprContractAddress(address: string): void {
  if (typeof window === 'undefined') return;
  // Strict Security: Only authenticated admins can configure custom deployment addresses
  if (!isAuthorizedDeployer()) {
    console.warn('[Security] Unauthorized attempt to override canonical HYPR contract address rejected.');
    return;
  }
  try {
    if (address && address.startsWith('0x') && address.length === 42) {
      localStorage.setItem(STORAGE_KEY, address);
      window.dispatchEvent(new CustomEvent('hypr-address-updated', { detail: address }));
    }
  } catch (err) {
    console.warn('Failed to save custom HYPR address:', err);
  }
}

export function resetHyprContractAddress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hypr-address-updated', { detail: DEFAULT_HYPR_ADDRESS }));
  } catch (err) {
    console.warn('Failed to reset HYPR address:', err);
  }
}

export function getStoredDeployments(): DeployedContractRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEPLOYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeployment(record: DeployedContractRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredDeployments();
    const updated = [record, ...existing.filter((r) => r.address.toLowerCase() !== record.address.toLowerCase())];
    localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(updated));
    setCustomHyprContractAddress(record.address);
  } catch (err) {
    console.warn('Failed to record deployment:', err);
  }
}
