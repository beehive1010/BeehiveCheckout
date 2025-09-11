// Dashboard service functions
export const dashboardService = {
  // Check registration expiration status
  async checkRegistrationStatus(walletAddress: string) {
    try {
      const response = await fetch(`/api/wallet/registration-status`, {
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to check registration status:', error);
      return null;
    }
  },

  // Format wallet address for display
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  // Format time remaining for countdown
  formatTimeRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  },

  // Format large numbers for display
  formatNumber(num: number | undefined): string {
    const safeNum = Number(num) || 0;
    if (safeNum >= 1000000) return `${(safeNum / 1000000).toFixed(1)}M`;
    if (safeNum >= 1000) return `${(safeNum / 1000).toFixed(0)}K`;
    return safeNum.toString();
  },

  // Generate referral link
  generateReferralLink(walletAddress: string): string {
    return `https://beehive-lifestyle.io/welcome?ref=${walletAddress}`;
  },

  // Social sharing URLs
  generateSocialShareUrls(referralLink: string) {
    return {
      twitter: `https://twitter.com/intent/tweet?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on Beehive!`,
      whatsapp: `whatsapp://send?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`
    };
  }
};