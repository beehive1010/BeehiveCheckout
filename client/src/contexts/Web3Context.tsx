import React, { createContext, useContext, useState, useEffect } from 'react';
import { createThirdwebClient } from 'thirdweb';
import { ThirdwebProvider, useActiveAccount } from 'thirdweb/react';

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "3123b1ac2ebdb966dd415c6e964dc335"
});

interface Web3ContextType {
  client: any;
  account: any;
  isConnected: boolean;
  walletAddress: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function Web3ContextProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
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

  const value = {
    client,
    account,
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
