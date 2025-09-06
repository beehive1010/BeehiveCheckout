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

  // Record wallet connection and capture referrer from URL
  const recordWalletConnection = async () => {
    try {
      if (!account?.address) return;

      // Capture referrer from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const referrer = urlParams.get('ref');
      
      if (referrer && /^0x[a-fA-F0-9]{40}$/.test(referrer)) {
        setReferrerWallet(referrer);
        console.log('🔗 Referrer captured from URL:', referrer);
      }

      // Register user with wallet address and referrer
      const result = await supabaseApi.register(
        account.address.toLowerCase(), 
        referrer || undefined,
        undefined, // username - can be added later
        undefined  // email - InAppWallet may provide this
      );
      
      console.log('✅ Wallet connection recorded:', account.address);
      return result;
    } catch (error) {
      console.error('Failed to record wallet connection:', error);
    }
  };

  // Check membership status after both wallet + Supabase auth
  const checkMembershipStatus = async () => {
    try {
      // Need both wallet connected AND Supabase authenticated
      if (!account?.address || !isSupabaseAuthenticated) {
        console.log('⏳ Waiting for both wallet and Supabase authentication');
        return;
      }

      // Check if user is a member - only members can access dashboard
      const result = await supabaseApi.getUser(account.address.toLowerCase());
      
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
      } else {
        console.log('👤 User authenticated but not registered, redirecting to welcome');
        setLocation('/welcome');
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
    }
  };

  // Sign out from Supabase
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsSupabaseAuthenticated(false);
      setSupabaseUser(null);
      localStorage.removeItem('supabase-wallet-session');
      console.log('🔓 Signed out from Supabase');
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

  // Check for existing Supabase Auth session on mount
  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsSupabaseAuthenticated(true);
          setSupabaseUser(session.user);
          console.log('🔄 Supabase session restored:', session.user.email);
        }
      } catch (error) {
        console.error('Error checking Supabase session:', error);
      }
    };

    checkSupabaseSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsSupabaseAuthenticated(true);
          setSupabaseUser(session.user);
          console.log('✅ Supabase user signed in:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setIsSupabaseAuthenticated(false);
          setSupabaseUser(null);
          console.log('🔓 Supabase user signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
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

        // Record wallet connection and capture referrer
        await recordWalletConnection();
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

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
