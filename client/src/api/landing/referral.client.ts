// Landing page referral service
export const referralService = {
  // Handle referral parameter from URL
  handleReferralParameter(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
      localStorage.setItem('beehive-referrer', referrer);
    }
  },

  // Get stored referral code
  getStoredReferral(): string | null {
    return localStorage.getItem('beehive-referrer');
  }
};