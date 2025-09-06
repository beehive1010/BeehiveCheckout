import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThirdwebProvider, useActiveAccount, useActiveWallet, useActiveWalletChain, useConnect } from 'thirdweb/react';
import { client, supportedChains } from '../lib/web3';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { supabase } from '../lib/supabase';
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
  signInWithWallet: () => Promise<void>;
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

  // Connect Thirdweb InAppWallet
  const connectWallet = async () => {
    try {
      const wallet = inAppWallet({
        auth: {
          options: ['email', 'google', 'apple', 'facebook'],
        },
      });
      
      await connect({ 
        client,
        wallet,
        chains: supportedChains,
      });
      
      console.log('🔗 InAppWallet connection initiated');
    } catch (error) {
      console.error('Failed to connect InAppWallet:', error);
      throw error;
    }
  };

  // Sign in with wallet to Supabase
  const signInWithWallet = async () => {
    try {
      if (!account?.address) {
        throw new Error('No wallet connected');
      }

      // Create a message to sign for authentication
      const message = `Sign in to Beehive Platform\nWallet: ${account.address}\nTimestamp: ${Date.now()}`;
      
      // Sign the message with the wallet
      const signature = await wallet?.signMessage(message);
      
      if (!signature) {
        throw new Error('Failed to sign message');
      }

      // Authenticate with your Supabase auth function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseAnonKey}`,
          'x-wallet-address': account.address.toLowerCase(),
        },
        body: JSON.stringify({
          action: 'login',
          signature,
          message,
          walletAddress: account.address.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Supabase authentication failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setIsSupabaseAuthenticated(true);
        setSupabaseUser(result.user);
        
        // Store session info
        localStorage.setItem('supabase-wallet-session', JSON.stringify({
          walletAddress: account.address,
          user: result.user,
          session: result.session,
          timestamp: Date.now(),
        }));
        
        console.log('✅ Authenticated with Supabase using wallet:', account.address);
        return result;
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Wallet authentication error:', error);
      throw error;
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

  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedSession = localStorage.getItem('supabase-wallet-session');
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          // Check if session is still valid (less than 24 hours old)
          const isValid = Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000;
          
          if (isValid && sessionData.user) {
            setIsSupabaseAuthenticated(true);
            setSupabaseUser(sessionData.user);
            console.log('🔄 Restored Supabase session for:', sessionData.walletAddress);
          } else {
            localStorage.removeItem('supabase-wallet-session');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        localStorage.removeItem('supabase-wallet-session');
      }
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    const handleWalletConnection = async () => {
      if (account?.address) {
        setIsConnected(true);
        setWalletAddress(account.address);
        
        // Store wallet data
        sessionStorage.setItem('wallet-address', account.address);
        if (activeChain?.id !== undefined && activeChain.id !== null) {
          sessionStorage.setItem('active-chain-id', activeChain.id.toString());
        } else {
          sessionStorage.removeItem('active-chain-id');
        }
        
        console.log('🔗 InAppWallet connected:', {
          address: account.address,
          walletId: wallet?.id,
          chainId: activeChain?.id
        });
      } else {
        const wasConnected = isConnected;
        setIsConnected(false);
        setWalletAddress(null);
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('active-chain-id');
        
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
    signInWithWallet,
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
