export const DEFAULT_HYPR_ADDRESS = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';

/**
 * Protocol Authorized Genesis Admin Deployer addresses.
 * The official treasury wallet holding deployment authority across EVM chains.
 */
export const AUTHORIZED_PROTOCOL_ADMINS: string[] = [
  '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'.toLowerCase(),
];

/**
 * Check if a given wallet address has Protocol Genesis Admin deployment permissions.
 */
export function isAuthorizedDeployer(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  const normalized = walletAddress.trim().toLowerCase();
  
  // 1. Direct match with authorized protocol multisig / treasury address
  if (AUTHORIZED_PROTOCOL_ADMINS.includes(normalized)) return true;

  // 2. Check local developer override key (for emergency authorized dev environments)
  if (typeof window !== 'undefined') {
    try {
      const devOverride = localStorage.getItem('HYPERON_ADMIN_DEV_KEY');
      if (devOverride === 'HYPR_GENESIS_CORE_2026') return true;

      // Also allow any custom admin address saved in admin management
      const customAdmins = localStorage.getItem('HYPERON_CUSTOM_ADMINS');
      if (customAdmins) {
        const parsed: string[] = JSON.parse(customAdmins);
        if (Array.isArray(parsed) && parsed.map(a => a.toLowerCase()).includes(normalized)) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
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
