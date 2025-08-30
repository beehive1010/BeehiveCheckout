import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThirdwebProvider, useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { client, supportedChains } from '../lib/web3';

interface Web3ContextType {
  client: any;
  account: any;
  activeChain: any;
  isConnected: boolean;
  walletAddress: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function Web3ContextProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (account?.address) {
      setIsConnected(true);
      setWalletAddress(account.address);
      // Store wallet address and chain for API client access
      sessionStorage.setItem('wallet-address', account.address);
      if (activeChain) {
        sessionStorage.setItem('active-chain-id', activeChain.id.toString());
      }
    } else {
      setIsConnected(false);
      setWalletAddress(null);
      // Remove wallet data when disconnected
      sessionStorage.removeItem('wallet-address');
      sessionStorage.removeItem('active-chain-id');
    }
  }, [account, activeChain]);

  const value = {
    client,
    account,
    activeChain,
    isConnected,
    walletAddress,
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
