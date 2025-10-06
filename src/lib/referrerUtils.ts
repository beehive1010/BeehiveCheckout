// Utility functions for handling referrer display logic
// Root wallet address should not be displayed to users

const ROOT_WALLET = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

/**
 * Check if a wallet address is the root/system wallet
 */
export function isRootWallet(walletAddress?: string | null): boolean {
  return walletAddress === ROOT_WALLET;
}

/**
 * Format referrer wallet for display
 * Returns null for root wallet, formatted address for others
 */
export function formatReferrerForDisplay(referrerWallet?: string | null): string | null {
  if (!referrerWallet || isRootWallet(referrerWallet)) {
    return null; // Don't show root wallet
  }
  return referrerWallet;
}

/**
 * Get display text for referrer status
 */
export function getReferrerDisplayText(referrerWallet?: string | null): string {
  if (!referrerWallet || isRootWallet(referrerWallet)) {
    return 'No referrer';
  }
  return `${referrerWallet.slice(0, 6)}...${referrerWallet.slice(-4)}`;
}

/**
 * Check if user has a meaningful (non-root) referrer
 */
export function hasRealReferrer(referrerWallet?: string | null): boolean {
  return !!referrerWallet && !isRootWallet(referrerWallet);
}

/**
 * Get referrer info for UI display
 */
export function getReferrerInfo(referrerWallet?: string | null, referrerUsername?: string) {
  if (!referrerWallet || isRootWallet(referrerWallet)) {
    return {
      hasReferrer: false,
      displayText: 'No referrer',
      walletAddress: null,
      username: null
    };
  }

  return {
    hasReferrer: true,
    displayText: referrerUsername || `${referrerWallet.slice(0, 6)}...${referrerWallet.slice(-4)}`,
    walletAddress: referrerWallet,
    username: referrerUsername
  };
}