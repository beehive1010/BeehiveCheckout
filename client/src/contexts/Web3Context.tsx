import React, { createContext, useContext, useState, useEffect } from 'react';
import { createThirdwebClient, ConnectButton, useActiveAccount, useConnect } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';

const client = createThirdwebClient({
  clientId: process.env.VITE_THIRDWEB_CLIENT_ID || import.meta.env.VITE_THIRDWEB_CLIENT_ID || "demo-client-id"
});

interface Web3ContextType {
  client: any;
  account: any;
  isConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const { connect } = useConnect();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (account?.address) {
      setIsConnected(true);
      setWalletAddress(account.address);
    } else {
      setIsConnected(false);
      setWalletAddress(null);
    }
  }, [account]);

  const connectWallet = async () => {
    try {
      const wallet = createWallet("io.metamask");
      await connect(wallet);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const disconnectWallet = () => {
    // Handle disconnect logic
    setIsConnected(false);
    setWalletAddress(null);
  };

  const value = {
    client,
    account,
    isConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
