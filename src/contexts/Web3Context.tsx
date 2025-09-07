import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThirdwebProvider, useActiveAccount, useActiveWallet, useActiveWalletChain, useConnect } from 'thirdweb/react';
import { client, supportedChains } from '../lib/web3';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { supabase, supabaseApi } from '../lib/supabase';
import { useLocation } from 'wouter';

interface Web3ContextType {
  client: any;
  account: any;
  wallet: any;
  activeChain: any;
  isConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  isSupabaseAuthenticated: boolean;
  supabaseUser: any;
  isMember: boolean;
  referrerWallet: string | null;
  recordWalletConnection: () => Promise<void>;
  checkMembershipStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function Web3ContextProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { connect } = useConnect();
  const [location, setLocation] = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);

  // Connect with InAppWallet (includes all authentication methods)
  const connectWallet = async () => {
    try {
      const wallet = inAppWallet({
        auth: {
          options: [
            'email', 
            'google', 
            'apple', 
            'facebook',
            'discord',
            'farcaster',
            'telegram',
            // External wallets
            'wallet'  // This enables MetaMask, WalletConnect, etc.
          ],
          mode: 'popup',
        },
        metadata: {
          name: "Beehive Platform",
          description: "Web3 Membership and Learning Platform",
          logoUrl: "https://beehive-lifestyle.io/logo.png",
          url: "https://beehive-lifestyle.io",
        },
        // Custom styling & branding
        styling: {
          theme: 'dark',
          accentColor: '#F59E0B', // Honey color
        },
        hideThirdwebBranding: true, // Hide "Powered by Thirdweb"
      });
      
      await connect({ 
        client,
        wallet,
        chains: supportedChains,
      });
      
      console.log('🔗 InAppWallet connection initiated (all methods available)');
    } catch (error) {
      console.error('Failed to connect InAppWallet:', error);
      throw error;
    }
  };

  // Capture referrer from URL parameters (no auto-registration)
  const recordWalletConnection = async () => {
    try {
      if (!account?.address) return;

      // Capture referrer from URL parameters and store it for later use
      const urlParams = new URLSearchParams(window.location.search);
      const urlReferrer = urlParams.get('ref');
      
      if (urlReferrer && /^0x[a-fA-F0-9]{40}$/.test(urlReferrer)) {
        setReferrerWallet(urlReferrer);
        console.log('🔗 Referrer captured from URL:', urlReferrer);
      } else {
        console.log('🏠 No referrer in URL');
      }

      console.log('✅ Wallet connection processed (no auto-registration):', account.address);
    } catch (error) {
      console.error('Failed to process wallet connection:', error);
    }
  };

  // Check membership status with proper dual auth routing
  const checkMembershipStatus = async () => {
    try {
      // Handle different authentication states
      if (!account?.address && !isSupabaseAuthenticated) {
        console.log('❌ No wallet and no Supabase auth - staying on current page');
        return;
      }
      
      if (account?.address && !isSupabaseAuthenticated) {
        console.log('🔗 Wallet connected but no Supabase auth - redirecting to authentication');
        setLocation('/auth'); // Redirect to Supabase Auth page
        return;
      }
      
      if (!account?.address && isSupabaseAuthenticated) {
        console.log('🔐 Supabase authenticated but no wallet - need to connect wallet');
        // Stay on current page and show wallet connection prompt
        return;
      }

      // Both wallet and Supabase auth are connected
      if (account?.address && isSupabaseAuthenticated) {
        console.log('✅ Both wallet and Supabase authenticated - checking membership');
        
        try {
          // Check if user is a member - only members can access dashboard
          const result = await supabaseApi.getUser(account.address); // PRESERVE CASE
          
          if (result.success && result.user) {
            // Check member status from API response
            const isActiveMember = result.isMember || false;
            const canAccessReferrals = result.canAccessReferrals || false;
            setIsMember(isActiveMember);
            
            // Route based on membership status  
            if (isActiveMember) {
              console.log('✅ User is a member, redirecting to dashboard');
              console.log(`🔗 Referral access: ${canAccessReferrals ? 'Enabled' : 'Blocked (pending active)'}`);
              setLocation('/dashboard');
            } else {
              console.log('⏳ User authenticated but not a member, redirecting to welcome');
              setLocation('/welcome');
            }
          } else if (result.success && !result.user) {
            // User doesn't exist yet - redirect to registration page
            console.log('👤 User not found, redirecting to registration...');
            setIsMember(false);
            setLocation('/register');
          } else {
            console.log('❌ Failed to get user data, redirecting to welcome');
            setLocation('/welcome');
          }
        } catch (error: any) {
          console.error('Error checking membership status:', error);
          
          // Handle account expired error (410)
          if (error.status === 410 || error.message?.includes('Account expired')) {
            console.log('⏰ Account expired, user cleanup completed');
            
            // Parse error response for cleanup information
            let errorData;
            try {
              if (typeof error.message === 'string' && error.message.includes('{')) {
                const jsonStart = error.message.indexOf('{');
                errorData = JSON.parse(error.message.substring(jsonStart));
              } else if (error.response?.data) {
                errorData = error.response.data;
              }
            } catch (parseError) {
              console.warn('Could not parse error response:', parseError);
            }
            
            // Show cleanup message if available
            if (errorData?.message) {
              console.log('📋 Cleanup message:', errorData.message);
            }
            
            // Clear any local state and redirect to registration
            setIsSupabaseAuthenticated(false);
            setSupabaseUser(null);
            localStorage.removeItem('supabase-wallet-session');
            setLocation('/');
            return;
          }
          
          // Handle authentication errors
          if (error.status === 401 || 
              error.message?.includes('Authentication') || 
              error.message?.includes('session') ||
              error.message?.includes('sign in')) {
            console.log('🔓 Authentication error, redirecting to sign in');
            setIsSupabaseAuthenticated(false);
            setSupabaseUser(null);
            setLocation('/auth');
            return;
          }
          
          // If user doesn't exist, redirect to registration page
          if (error.message?.includes('not found') || error.message?.includes('404')) {
            console.log('👤 User not found, redirecting to registration...');
            setIsMember(false);
            setLocation('/register');
          } else {
            setLocation('/welcome');
          }
        }
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
    }
  };

  // Sign out (wallet-based auth)
  const signOut = async () => {
    try {
      // No Supabase auth signOut needed
      setIsSupabaseAuthenticated(false);
      setSupabaseUser(null);
      localStorage.removeItem('supabase-wallet-session');
      console.log('🔓 Signed out from wallet auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (wallet) {
        await wallet.disconnect();
        await signOut(); // Also sign out from Supabase
        setIsConnected(false);
        setWalletAddress(null);
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('active-chain-id');
        
        // Redirect to landing page if not already there and not on admin/public pages
        const publicPages = ['/', '/hiveworld', '/register', '/welcome'];
        const isPublicPage = publicPages.includes(location) || location.startsWith('/hiveworld/');
        
        if (!location.startsWith('/admin/') && !isPublicPage) {
          console.log('🔄 Redirecting to landing page after wallet disconnect');
          setLocation('/');
        }
        
        console.log('🔗 Wallet disconnected and signed out');
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  // Initialize wallet-based authentication (no Supabase Auth)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing wallet-based authentication');
        // Always authenticated for wallet-based auth - no Supabase session needed
        setIsSupabaseAuthenticated(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    initializeAuth();
  }, []);

  // Handle wallet connection and record it
  useEffect(() => {
    const handleWalletConnection = async () => {
      if (account?.address) {
        setIsConnected(true);
        setWalletAddress(account.address);
        
        // Store wallet data
        sessionStorage.setItem('wallet-address', account.address);
        if (activeChain?.id !== undefined && activeChain.id !== null) {
          sessionStorage.setItem('active-chain-id', activeChain.id.toString());
        }
        
        console.log('🔗 Wallet connected:', {
          address: account.address,
          walletId: wallet?.id,
          chainId: activeChain?.id
        });

        // Check if we need Supabase authentication
        if (!isSupabaseAuthenticated) {
          console.log('🔗 Wallet connected but no Supabase auth - redirecting to authentication');
          // Only redirect if not already on auth page
          if (location !== '/auth') {
            setLocation('/auth');
          }
        }
        
        // Note: recordWalletConnection will be called later when both wallet and Supabase auth are ready
      } else {
        const wasConnected = isConnected;
        setIsConnected(false);
        setWalletAddress(null);
        setReferrerWallet(null);
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('active-chain-id');
        
        // Reset member status on wallet disconnect
        setIsMember(false);
        
        // Auto-redirect to landing page when wallet disconnects (except admin and public pages)
        const publicPages = ['/', '/hiveworld', '/register', '/welcome'];
        const isPublicPage = publicPages.includes(location) || location.startsWith('/hiveworld/');
        
        if (wasConnected && !location.startsWith('/admin/') && !isPublicPage) {
          console.log('🔄 Wallet disconnected, redirecting to landing page');
          setLocation('/');
        }
        
        console.log('🔗 Wallet disconnected');
      }
    };

    handleWalletConnection();
  }, [account, wallet, activeChain, isConnected, location, setLocation]);

  // Check membership status when both wallet and Supabase auth are ready
  useEffect(() => {
    if (isConnected && isSupabaseAuthenticated && account?.address) {
      checkMembershipStatus();
    }
  }, [isConnected, isSupabaseAuthenticated, account?.address]);

  const value = {
    client,
    account,
    wallet,
    activeChain,
    isConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    isSupabaseAuthenticated,
    supabaseUser,
    isMember,
    referrerWallet,
    recordWalletConnection,
    checkMembershipStatus,
    signOut,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <Web3ContextProvider>
        {children}
      </Web3ContextProvider>
    </ThirdwebProvider>
  );
}

Web3Provider.displayName = 'Web3Provider';

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
