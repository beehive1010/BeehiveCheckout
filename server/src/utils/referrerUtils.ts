// Server-side utility functions for handling referrer display logic
// Root wallet address should not be exposed to clients

const ROOT_WALLET = '0x0000000000000000000000000000000000000001';

/**
 * Check if a wallet address is the root/system wallet
 */
export function isRootWallet(walletAddress?: string | null): boolean {
  return walletAddress?.toLowerCase() === ROOT_WALLET.toLowerCase();
}

/**
 * Filter referrer wallet for client response
 * Returns null for root wallet to hide it from UI
 */
export function sanitizeReferrerForClient(referrerWallet?: string | null): string | null {
  if (!referrerWallet || isRootWallet(referrerWallet)) {
    return null; // Don't expose root wallet to clients
  }
  return referrerWallet;
}

/**
 * Sanitize user data before sending to client
 * Removes root wallet from referrer fields
 */
export function sanitizeUserDataForClient(userData: any): any {
  if (!userData) return userData;
  
  return {
    ...userData,
    referrer_wallet: sanitizeReferrerForClient(userData.referrer_wallet),
    referrerWallet: sanitizeReferrerForClient(userData.referrerWallet), // Handle both naming conventions
  };
}

/**
 * Get the root wallet address (for internal use only)
 */
export function getRootWallet(): string {
  return ROOT_WALLET;
}

/**
 * Ensure a referrer wallet is set, using root as fallback
 */
export function ensureReferrerWallet(referrerWallet?: string | null): string {
  return referrerWallet || ROOT_WALLET;
}