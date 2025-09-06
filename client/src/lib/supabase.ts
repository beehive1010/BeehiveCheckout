// Supabase client configuration for Beehive Platform
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'beehive-supabase-auth'
  }
})

// Supabase Edge Function client with wallet authentication
export class SupabaseApiClient {
  private baseUrl: string
  private anonKey: string
  
  constructor() {
    this.baseUrl = `${supabaseUrl}/functions/v1`
    this.anonKey = supabaseAnonKey
  }

  private async getHeaders(walletAddress?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Get auth token from Supabase session - required for most operations
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('⚠️ Session error:', sessionError)
      console.warn('⚠️ No Supabase session found, using anon key. Some operations may fail.')
      headers['Authorization'] = `Bearer ${this.anonKey}`
    } else if (session?.access_token) {
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        console.warn('⚠️ Supabase token expired, attempting refresh...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !refreshData.session) {
          console.warn('⚠️ Token refresh failed, using anon key. Some operations may fail.')
          headers['Authorization'] = `Bearer ${this.anonKey}`
        } else {
          headers['Authorization'] = `Bearer ${refreshData.session.access_token}`
        }
      } else {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } else {
      // No session - fall back to anon key for compatibility
      console.warn('⚠️ No Supabase session found, using anon key. Some operations may fail.')
      headers['Authorization'] = `Bearer ${this.anonKey}`
    }

    if (walletAddress) {
      headers['x-wallet-address'] = walletAddress.toLowerCase()
    }

    return headers
  }

  private async getUnauthenticatedHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.anonKey}`
    }
  }

  async callFunction(
    functionName: string, 
    data: any, 
    walletAddress?: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${functionName}`, {
      method: 'POST',
      headers: await this.getHeaders(walletAddress),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  // Authentication methods
  async login(walletAddress: string, signature: string, message: string) {
    return this.callFunction('auth', {
      action: 'login',
      signature,
      message
    }, walletAddress)
  }

  async register(
    walletAddress: string, 
    referrerWallet?: string, 
    username?: string, 
    email?: string
  ) {
    return this.callFunction('auth', {
      action: 'register',
      referrerWallet,
      username,
      email
    }, walletAddress)
  }

  async getUser(walletAddress: string) {
    return this.callFunction('auth', {
      action: 'get-user'
    }, walletAddress)
  }

  async activateMembership(walletAddress: string) {
    return this.callFunction('auth', {
      action: 'activate-membership'
    }, walletAddress)
  }

  async upgradeToLevel(walletAddress: string, nftLevel: number, paymentAmountUsdc: number, transactionHash: string) {
    return this.callFunction('nft-upgrade', {
      wallet_address: walletAddress,
      nft_level: nftLevel,
      payment_amount_usdc: paymentAmountUsdc,
      transaction_hash: transactionHash
    })
  }

  // Referral link methods
  async createReferralLink(
    walletAddress: string, 
    baseUrl = 'https://beehive-platform.com/register',
    maxUses?: number, 
    expiresDays?: number
  ) {
    return this.callFunction('auth', {
      action: 'create-referral-link',
      baseUrl,
      maxUses,
      expiresDays
    }, walletAddress)
  }

  async processReferralLink(walletAddress: string, referralToken: string) {
    return this.callFunction('auth', {
      action: 'process-referral-link',
      referralToken
    }, walletAddress)
  }

  // Process referral link click (without registration)
  async trackReferralClick(referralToken: string) {
    return this.callFunction('auth', {
      action: 'process-referral-link',
      referralToken
    }) // No wallet address = just click tracking
  }

  // Note: Countdown and pending functions removed - not supported in simplified auth
  // These would need separate Edge Functions if required

  // BCC Purchase methods
  async getBccConfig() {
    return this.callFunction('bcc-purchase', {
      action: 'get-config'
    })
  }

  async createBccPurchase(
    walletAddress: string, 
    amountUSDC: number, 
    network: string, 
    paymentMethod: string,
    transactionHash?: string,
    bridgeUsed?: boolean
  ) {
    return this.callFunction('bcc-purchase', {
      action: 'create-purchase',
      amountUSDC,
      network,
      paymentMethod,
      transactionHash,
      bridgeUsed
    }, walletAddress)
  }

  async confirmBccPayment(
    walletAddress: string,
    orderId: string,
    transactionHash: string,
    actualAmountReceived?: number
  ) {
    return this.callFunction('bcc-purchase', {
      action: 'confirm-payment',
      orderId,
      transactionHash,
      actualAmountReceived
    }, walletAddress)
  }

  async getBccHistory(walletAddress: string, limit = 20, offset = 0) {
    return this.callFunction('bcc-purchase', {
      action: 'get-history',
      limit,
      offset
    }, walletAddress)
  }

  async getPendingBccPurchases(walletAddress: string) {
    return this.callFunction('bcc-purchase', {
      action: 'get-pending'
    }, walletAddress)
  }

  // Matrix methods
  async getMatrix(walletAddress: string, rootWallet?: string, layer?: number) {
    return this.callFunction('matrix', {
      action: 'get-matrix',
      rootWallet: rootWallet || walletAddress,
      layer
    }, walletAddress)
  }

  async placeMember(
    walletAddress: string,
    rootWallet: string,
    memberWallet: string,
    placerWallet: string,
    placementType = 'direct'
  ) {
    return this.callFunction('matrix', {
      action: 'place-member',
      rootWallet,
      memberWallet,
      placerWallet,
      placementType
    }, walletAddress)
  }

  async getDownline(walletAddress: string, layer?: number, limit = 50, offset = 0) {
    return this.callFunction('matrix', {
      action: 'get-downline',
      layer,
      limit,
      offset
    }, walletAddress)
  }

  async getUpline(walletAddress: string) {
    return this.callFunction('matrix', {
      action: 'get-upline'
    }, walletAddress)
  }

  async getMatrixStats(walletAddress: string) {
    return this.callFunction('matrix', {
      action: 'get-matrix-stats'
    }, walletAddress)
  }

  // Rewards methods
  async getRewards(walletAddress: string, level?: number, layer?: number, limit = 50, offset = 0) {
    return this.callFunction('rewards', {
      action: 'get-rewards',
      level,
      layer,
      limit,
      offset
    }, walletAddress)
  }

  async claimRewards(walletAddress: string, rewardIds: string[]) {
    return this.callFunction('rewards', {
      action: 'claim-rewards',
      rewardIds
    }, walletAddress)
  }

  async getRewardHistory(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('rewards', {
      action: 'get-reward-history',
      limit,
      offset
    }, walletAddress)
  }

  async getPendingRewards(walletAddress: string) {
    return this.callFunction('rewards', {
      action: 'get-pending-rewards'
    }, walletAddress)
  }

  // NFT Upgrade methods
  async getLevelInfo(walletAddress: string, level?: number) {
    return this.callFunction('nft-upgrade', {
      action: 'get-level-info',
      level
    }, walletAddress)
  }

  async checkUpgradeEligibility(walletAddress: string, level: number) {
    return this.callFunction('nft-upgrade', {
      action: 'check-eligibility',
      level
    }, walletAddress)
  }

  async processUpgrade(
    walletAddress: string,
    level: number,
    paymentMethod: string,
    transactionHash?: string,
    network?: string
  ) {
    return this.callFunction('nft-upgrade', {
      action: 'process-upgrade',
      level,
      paymentMethod,
      transactionHash,
      network
    }, walletAddress)
  }

  async getUpgradeHistory(walletAddress: string, limit = 20, offset = 0) {
    return this.callFunction('nft-upgrade', {
      action: 'get-upgrade-history',
      limit,
      offset
    }, walletAddress)
  }

  // Balance methods
  async getBalance(walletAddress: string) {
    return this.callFunction('balance', {
      action: 'get-balance'
    }, walletAddress)
  }

  async getTransactions(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('balance', {
      action: 'get-transactions',
      limit,
      offset
    }, walletAddress)
  }

  async transferBcc(
    walletAddress: string,
    amount: number,
    recipientWallet: string,
    purpose?: string
  ) {
    return this.callFunction('balance', {
      action: 'transfer-bcc',
      amount,
      recipientWallet,
      purpose
    }, walletAddress)
  }

  async spendBcc(
    walletAddress: string,
    amount: number,
    itemType: string,
    itemId: string,
    purpose?: string,
    nftType?: string
  ) {
    return this.callFunction('balance', {
      action: 'spend-bcc',
      amount,
      itemType,
      itemId,
      purpose,
      nftType
    }, walletAddress)
  }

  async getEarningHistory(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('balance', {
      action: 'get-earning-history',
      limit,
      offset
    }, walletAddress)
  }

  // Admin methods (require admin privileges)
  async getAdminSettings(adminWallet: string) {
    return this.callFunction('admin', {
      action: 'get-settings'
    }, adminWallet)
  }

  async toggleGlobalPending(adminWallet: string, enabled: boolean, reason?: string) {
    return this.callFunction('admin', {
      action: 'toggle-global-pending',
      enabled,
      reason
    }, adminWallet)
  }

  async setMemberPending(
    adminWallet: string,
    targetWallet: string,
    pendingHours: number,
    reason?: string
  ) {
    return this.callFunction('admin', {
      action: 'set-member-pending',
      targetWallet,
      pendingHours,
      reason
    }, adminWallet)
  }

  async clearMemberPending(
    adminWallet: string,
    targetWallet: string,
    reason?: string
  ) {
    return this.callFunction('admin', {
      action: 'clear-member-pending',
      targetWallet,
      reason
    }, adminWallet)
  }

  async getPendingMembers(adminWallet: string) {
    return this.callFunction('admin', {
      action: 'get-pending-members'
    }, adminWallet)
  }

  async getAdminActions(adminWallet: string, limit = 50, offset = 0) {
    return this.callFunction('admin', {
      action: 'get-admin-actions',
      limit,
      offset
    }, adminWallet)
  }
}

export const supabaseApi = new SupabaseApiClient()