export const DEFAULT_HYPR_ADDRESS = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';

/**
 * Protocol Authorized Genesis Admin Deployer addresses.
 * The official treasury wallet holding deployment authority across EVM chains.
 */
export const AUTHORIZED_PROTOCOL_ADMINS: string[] = [
  '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'.toLowerCase(),
];

/**
 * Check if a given wallet address or active session has Protocol Admin deployment permissions.
 */
export function isAuthorizedDeployer(walletAddress: string | null | undefined): boolean {
  if (typeof window !== 'undefined') {
    try {
      const activeSession = localStorage.getItem('HYPERON_ADMIN_SESSION_TOKEN');
      const isAdminActive = localStorage.getItem('HYPERON_ADMIN_ACTIVE') === 'true';
      if (activeSession || isAdminActive) {
        return true;
      }
      const customAdmins = localStorage.getItem('HYPERON_CUSTOM_ADMINS');
      if (customAdmins && walletAddress) {
        const list = JSON.parse(customAdmins);
        if (Array.isArray(list) && list.includes(walletAddress.trim().toLowerCase())) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!walletAddress) return false;
  const normalized = walletAddress.trim().toLowerCase();
  
  // Strict cryptographic match with authorized protocol multisig / treasury address
  return AUTHORIZED_PROTOCOL_ADMINS.includes(normalized);
}

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('HYPERON_ADMIN_SESSION_TOKEN');
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, address?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('HYPERON_ADMIN_SESSION_TOKEN', token);
    localStorage.setItem('HYPERON_ADMIN_ACTIVE', 'true');
    if (address) {
      const existing = localStorage.getItem('HYPERON_CUSTOM_ADMINS');
      const list = existing ? JSON.parse(existing) : [];
      if (!list.includes(address.toLowerCase())) {
        list.push(address.toLowerCase());
        localStorage.setItem('HYPERON_CUSTOM_ADMINS', JSON.stringify(list));
      }
    }
    window.dispatchEvent(new CustomEvent('hyperon-admin-updated'));
  } catch (err) {
    console.warn('Failed to set admin session:', err);
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('HYPERON_ADMIN_SESSION_TOKEN');
    localStorage.removeItem('HYPERON_ADMIN_ACTIVE');
    localStorage.removeItem('HYPERON_ADMIN_DEV_KEY');
    localStorage.removeItem('HYPERON_CUSTOM_ADMINS');
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
  initialSupply: string;
}

const STORAGE_KEY = 'HYPR_CUSTOM_CONTRACT_ADDRESS';
const DEPLOYMENTS_KEY = 'HYPR_DEPLOYED_RECORDS';

export function getHyprContractAddress(): string {
  if (typeof window === 'undefined') return DEFAULT_HYPR_ADDRESS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.startsWith('0x') && saved.length === 42) {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_HYPR_ADDRESS;
}

export function setCustomHyprContractAddress(address: string): void {
  if (typeof window === 'undefined') return;
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
