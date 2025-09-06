import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThirdwebProvider, useActiveAccount, useActiveWallet, useActiveWalletChain, useConnect } from 'thirdweb/react';
import { client, supportedChains } from '../lib/web3';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { createAuth } from '@supabase/supabase-js';

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
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function Web3ContextProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { connect } = useConnect();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false);

  // Enhanced wallet connection with InAppWallet and WalletConnect
  const connectWallet = async () => {
    try {
      const wallets = [
        inAppWallet({
          auth: {
            options: ['email', 'google', 'apple', 'facebook'],
          },
        }),
        createWallet('io.metamask'),
        createWallet('com.coinbase.wallet'),
        createWallet('walletConnect'),
      ];
      
      await connect({ 
        client,
        wallets,
        chains: supportedChains,
      });
      
      console.log('🔗 Wallet connection initiated');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      if (wallet) {
        await wallet.disconnect();
        setIsConnected(false);
        setWalletAddress(null);
        setIsSupabaseAuthenticated(false);
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('active-chain-id');
        sessionStorage.removeItem('supabase-session');
        console.log('🔗 Wallet disconnected');
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

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
        
        // Authenticate with Supabase using wallet address
        try {
          // Import apiRequest dynamically to avoid circular dependency
          const { apiRequest } = await import('../lib/queryClient');
          const response = await apiRequest('POST', '/api/auth/supabase-login', {
            walletAddress: account.address,
            walletType: wallet?.id || 'unknown'
          }, account.address);
          
          const result = await response.json();
          if (result.session) {
            sessionStorage.setItem('supabase-session', JSON.stringify(result.session));
            setIsSupabaseAuthenticated(true);
            console.log('✅ Supabase authenticated for wallet:', account.address);
          } else {
            console.warn('⚠️ Supabase authentication failed, continuing without');
          }
        } catch (error) {
          console.error('Supabase auth error:', error);
        }
        
        console.log('🔗 Wallet connected:', {
          address: account.address,
          walletId: wallet?.id,
          chainId: activeChain?.id
        });
      } else {
        setIsConnected(false);
        setWalletAddress(null);
        setIsSupabaseAuthenticated(false);
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('active-chain-id');
        sessionStorage.removeItem('supabase-session');
        console.log('🔗 Wallet disconnected');
      }
    };

    handleWalletConnection();
  }, [account, wallet, activeChain]);

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
