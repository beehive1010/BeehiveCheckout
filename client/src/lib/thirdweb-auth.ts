// Thirdweb InApp Wallet + Supabase Auth Integration
import { createThirdwebClient, defineChain } from "thirdweb"
import { inAppWallet, createWallet } from "thirdweb/wallets"
import { supabase, supabaseApi } from './supabase'

// Thirdweb Client Configuration
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID

if (!THIRDWEB_CLIENT_ID) {
  throw new Error("Missing VITE_THIRDWEB_CLIENT_ID environment variable")
}

export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
})

// Supported Chains
export const arbitrumOne = defineChain(42161)
export const arbitrumSepolia = defineChain(421614)
export const ethereum = defineChain(1)
export const polygon = defineChain(137)

// InApp Wallet Configuration
export const inAppWalletConfig = inAppWallet({
  auth: {
    options: [
      "email",
      "phone", 
      "google",
      "apple",
      "facebook",
      "discord",
    ],
    // Custom authentication flow
    mode: "popup", // or "redirect"
    redirectUrl: `${window.location.origin}/auth/callback`,
  },
  smartAccount: {
    chain: arbitrumOne,
    sponsorGas: ture, // Set to true if you want to sponsor gas fees
  }
})

// External Wallet Support (WalletConnect, MetaMask, etc.)
export const externalWalletConfig = createWallet("io.metamask")
export const walletConnectConfig = createWallet("walletConnect", {
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
})

// Beehive Platform Auth Integration
export class BeehiveAuth {
  private currentUser: any = null
  private currentWallet: any = null

  /**
   * Initialize authentication - check for existing sessions
   */
  async initialize() {
    try {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        this.currentUser = session.user
        // Try to restore wallet connection if metadata exists
        const walletAddress = session.user.user_metadata?.wallet_address
        if (walletAddress) {
          await this.restoreWalletConnection(walletAddress)
        }
      }

      return {
        isAuthenticated: !!session,
        user: this.currentUser,
        wallet: this.currentWallet
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      return { isAuthenticated: false, user: null, wallet: null }
    }
  }

  /**
   * Login with Thirdweb InApp Wallet + Supabase Auth
   */
  async loginWithInAppWallet(authMethod: 'email' | 'phone' | 'google' | 'discord' = 'email') {
    try {
      // Step 1: Connect with Thirdweb InApp Wallet
      const wallet = inAppWalletConfig()
      await wallet.connect({
        client: thirdwebClient,
        strategy: authMethod,
      })

      // Step 2: Get wallet address and user info
      const account = wallet.getAccount()
      if (!account) throw new Error('Failed to get wallet account')

      const walletAddress = account.address
      
      // Step 3: Get user details from Thirdweb (email, etc.)
      const userDetails = await wallet.getUserDetails()
      
      // Step 4: Create/update Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google', // This will be customized based on authMethod
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            wallet_address: walletAddress,
            auth_method: authMethod,
          },
        },
      })

      if (authError) {
        // Fallback: Create user directly via our Edge Function
        const result = await supabaseApi.register(
          walletAddress,
          undefined, // no referrer for direct login
          userDetails.email ? `User_${walletAddress.slice(0, 8)}` : undefined,
          userDetails.email
        )

        if (!result.success) {
          throw new Error(result.error || 'Registration failed')
        }
      }

      // Step 5: Store wallet connection
      this.currentWallet = wallet
      this.currentUser = authData.user

      // Step 6: Process any pending referral links
      await this.processReferralFromUrl()

      return {
        success: true,
        user: this.currentUser,
        wallet: this.currentWallet,
        walletAddress,
        userDetails
      }

    } catch (error) {
      console.error('InApp wallet login error:', error)
      throw error
    }
  }

  /**
   * Login with External Wallet (MetaMask, WalletConnect, etc.)
   */
  async loginWithExternalWallet(walletType: 'metamask' | 'walletconnect' = 'metamask') {
    try {
      // Step 1: Connect external wallet
      let wallet
      if (walletType === 'walletconnect') {
        wallet = walletConnectConfig
      } else {
        wallet = externalWalletConfig
      }

      await wallet.connect({ client: thirdwebClient })

      // Step 2: Get wallet address
      const account = wallet.getAccount()
      if (!account) throw new Error('Failed to get wallet account')

      const walletAddress = account.address

      // Step 3: Sign authentication message
      const message = `Sign this message to authenticate with Beehive Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`
      const signature = await account.signMessage({ message })

      // Step 4: Authenticate with our backend
      const authResult = await supabaseApi.login(walletAddress, signature, message)

      if (!authResult.success) {
        // Try registration if login fails
        const regResult = await supabaseApi.register(walletAddress)
        if (!regResult.success) {
          throw new Error(regResult.error || 'Authentication failed')
        }
      }

      // Step 5: Create Supabase session with custom JWT
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: 'custom_wallet_token', // This would be a proper JWT in production
        refresh_token: 'custom_refresh_token',
      })

      // Step 6: Store connections
      this.currentWallet = wallet
      this.currentUser = authResult.user

      // Step 7: Process any pending referral links
      await this.processReferralFromUrl()

      return {
        success: true,
        user: this.currentUser,
        wallet: this.currentWallet,
        walletAddress,
        authMethod: 'external_wallet'
      }

    } catch (error) {
      console.error('External wallet login error:', error)
      throw error
    }
  }

  /**
   * Process referral link from URL parameters
   */
  private async processReferralFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const referralToken = urlParams.get('ref')
      
      if (referralToken && this.currentWallet) {
        const account = this.currentWallet.getAccount()
        if (account?.address) {
          await supabaseApi.processReferralLink(account.address, referralToken)
        }
      }
    } catch (error) {
      console.warn('Referral processing error:', error)
    }
  }

  /**
   * Restore wallet connection from stored session
   */
  private async restoreWalletConnection(walletAddress: string) {
    try {
      // Try to reconnect to previously connected wallet
      const wallet = inAppWalletConfig()
      
      // Check if wallet is still connected
      const account = wallet.getAccount()
      if (account?.address === walletAddress) {
        this.currentWallet = wallet
        return true
      }
    } catch (error) {
      console.warn('Wallet restoration failed:', error)
    }
    return false
  }

  /**
   * Logout - disconnect both Thirdweb and Supabase
   */
  async logout() {
    try {
      // Disconnect wallet
      if (this.currentWallet) {
        await this.currentWallet.disconnect()
        this.currentWallet = null
      }

      // Sign out from Supabase
      await supabase.auth.signOut()
      this.currentUser = null

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState() {
    return {
      isAuthenticated: !!(this.currentUser && this.currentWallet),
      user: this.currentUser,
      wallet: this.currentWallet,
      walletAddress: this.currentWallet?.getAccount()?.address || null
    }
  }

  /**
   * Switch wallet network
   */
  async switchNetwork(chainId: number) {
    if (!this.currentWallet) {
      throw new Error('No wallet connected')
    }

    try {
      const account = this.currentWallet.getAccount()
      if (account) {
        await account.switchChain(defineChain(chainId))
        return { success: true, chainId }
      }
    } catch (error) {
      console.error('Network switch error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const beehiveAuth = new BeehiveAuth()