import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThirdwebProvider, useActiveAccount, useActiveWallet, useActiveWalletChain, useConnect } from 'thirdweb/react';
import { client, supportedChains, arbitrum } from '../lib/web3';
import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { createSponsoredInAppWallet, connectWithGasSponsorship, gasSponsorshipUtils } from '../lib/web3/enhanced-wallets';
import { supabase, authService } from '../lib/supabase-unified';
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
  gasSponsorship: {
    enabled: boolean;
    eligible: boolean;
    config: any;
  } | null;
  checkGasSponsorshipEligibility: () => Promise<void>;
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
  const [gasSponsorship, setGasSponsorship] = useState<{
    enabled: boolean;
    eligible: boolean;
    config: any;
  } | null>(null);

  // Enhanced wallet connection with gas sponsorship support
  const connectWallet = async () => {
    try {
      // Use enhanced sponsored wallet instead of basic InAppWallet - default to Arbitrum One
      const targetChain = activeChain || arbitrum;
      const result = await connectWithGasSponsorship('sponsored-inapp', targetChain);
      
      if (result.success && result.wallet && result.account) {
        // Update gas sponsorship status
        setGasSponsorship(result.gasSponsorship);
        
        console.log('🔗 Enhanced sponsored wallet connected:', {
          address: result.account.address,
          gasSponsorship: result.gasSponsorship
        });
      } else {
        // Fallback to basic wallet connection
        console.log('⚠️ Gas sponsorship unavailable, using basic wallet');
        const wallet = createSponsoredInAppWallet(targetChain);
        
        await connect({ 
          client,
          wallet,
          chains: supportedChains,
        });
        
        console.log('🔗 Basic InAppWallet connection initiated (fallback)');
      }
    } catch (error) {
      console.error('Failed to connect enhanced wallet:', error);
      // Ultimate fallback to original wallet
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
              'wallet'
            ],
            mode: 'popup',
          },
          metadata: {
            name: "Beehive Platform",
            description: "Web3 Membership and Learning Platform",
            logoUrl: "https://beehive-lifestyle.io/logo.png",
            url: "https://beehive-lifestyle.io",
          },
          styling: {
            theme: 'dark',
            accentColor: '#F59E0B',
          },
          hideThirdwebBranding: true,
        });
        
        await connect({ 
          client,
          wallet,
          chains: supportedChains,
        });
        
        console.log('🔗 Fallback InAppWallet connected');
      } catch (fallbackError) {
        console.error('All wallet connection methods failed:', fallbackError);
        throw fallbackError;
      }
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

  // Simplified routing - no longer checks membership here, just handles basic auth routing
  const checkBasicAuthRouting = async () => {
    try {
      // Skip all auth checks for admin routes - AdminAuthContext handles admin authentication
      if (location.startsWith('/admin')) {
        console.log('🔧 Admin route detected - skipping Web3 auth checks');
        return;
      }

      // Handle different authentication states
      if (!account?.address && !isSupabaseAuthenticated) {
        console.log('❌ No wallet and no Supabase auth - staying on current page');
        return;
      }

      if (account?.address && !isSupabaseAuthenticated) {
        console.log('🔗 Wallet connected but no Supabase auth - need authentication');
        // Only redirect if not already on allowed pages
        const allowedPages = ['/auth', '/welcome', '/welcome2', '/register', '/'];
        const isOnAllowedPage = allowedPages.some(page => location === page || location.startsWith(page + '/'));
        if (!isOnAllowedPage) {
          setLocation('/auth');
        }
        return;
      }

      if (!account?.address && isSupabaseAuthenticated) {
        console.log('🔐 Supabase authenticated but no wallet - need to connect wallet');
        return;
      }

      // Both connected - let pages handle their own routing based on useWallet data
      console.log('✅ Both wallet and Supabase authenticated');
    } catch (error) {
      console.error('Failed to check basic auth routing:', error);
    }
  };

  // Check gas sponsorship eligibility for current wallet and chain
  const checkGasSponsorshipEligibility = async () => {
    try {
      if (!account?.address || !activeChain?.id) {
        setGasSponsorship(null);
        return;
      }

      const eligibility = await gasSponsorshipUtils.checkSponsorshipEligibility(
        account.address,
        activeChain.id
      );

      const config = gasSponsorshipUtils.getGasConfig(activeChain.id);

      setGasSponsorship({
        enabled: gasSponsorshipUtils.isSponsorshipAvailable(activeChain.id),
        eligible: eligibility.eligible,
        config: config
      });

      console.log('⛽ Gas sponsorship status updated:', {
        chain: activeChain.id,
        enabled: gasSponsorshipUtils.isSponsorshipAvailable(activeChain.id),
        eligible: eligibility.eligible,
        dailyUsed: eligibility.dailyUsed,
        dailyLimit: eligibility.dailyLimit
      });
    } catch (error) {
      console.error('Failed to check gas sponsorship eligibility:', error);
      setGasSponsorship(null);
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
        sessionStorage.removeItem('ActiveMember-chain-id');
        localStorage.removeItem('walletAddress'); // ✅ Also clear localStorage
        localStorage.removeItem('ActiveMember-chain-id');
        
        // Redirect to landing page if not already there and not on admin/public pages
        const publicPages = ['/', '/hiveworld', '/register', '/welcome', '/welcome2'];
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
    let disconnectTimer: NodeJS.Timeout | null = null;
    let isMounted = true;
    const currentAddress = account?.address;
    const currentLocation = location;

    const handleWalletConnection = async () => {
      if (currentAddress) {
        // Clear any pending disconnect timer
        if (disconnectTimer) {
          clearTimeout(disconnectTimer);
          disconnectTimer = null;
        }

        if (!isMounted) return;

        setIsConnected(true);
        setWalletAddress(currentAddress);

        // Store wallet data in BOTH sessionStorage and localStorage for persistence
        const wasAddress = sessionStorage.getItem('wallet-address');
        const wasChainId = sessionStorage.getItem('ActiveMember-chain-id');

        sessionStorage.setItem('wallet-address', currentAddress);
        localStorage.setItem('walletAddress', currentAddress); // ✅ Add localStorage for persistence

        if (activeChain?.id !== undefined && activeChain.id !== null) {
          sessionStorage.setItem('ActiveMember-chain-id', activeChain.id.toString());
          localStorage.setItem('ActiveMember-chain-id', activeChain.id.toString());
        }

        // Only log if it's a new connection or chain switch
        if (wasAddress !== currentAddress) {
          console.log('🔗 Wallet connected:', {
            address: currentAddress,
            walletId: wallet?.id,
            chainId: activeChain?.id
          });
        } else if (wasChainId && activeChain?.id && wasChainId !== activeChain.id.toString()) {
          console.log('🔄 Chain switched:', {
            from: wasChainId,
            to: activeChain.id
          });
        }

        // Check if we need Supabase authentication
        if (!isSupabaseAuthenticated && isMounted) {
          console.log('🔗 Wallet connected but no Supabase auth - need authentication');
          // Only redirect if not already on auth/welcome/registration pages
          const allowedPages = ['/auth', '/welcome', '/welcome2', '/register', '/'];
          const isOnAllowedPage = allowedPages.some(page => currentLocation === page || currentLocation.startsWith(page + '/'));

          if (!isOnAllowedPage) {
            console.log('  Redirecting to authentication from:', currentLocation);
            setLocation('/auth');
          } else {
            console.log('  Already on allowed page:', currentLocation, '- no redirect needed');
          }
        }

        // Note: recordWalletConnection will be called later when both wallet and Supabase auth are ready
      } else {
        // Delay disconnect to avoid false disconnects during chain switching
        const wasConnected = isConnected;

        disconnectTimer = setTimeout(() => {
          if (!isMounted) return;

          // Double-check account is still null after delay
          if (!account?.address) {
            setIsConnected(false);
            setWalletAddress(null);
            setReferrerWallet(null);
            sessionStorage.removeItem('wallet-address');
            sessionStorage.removeItem('ActiveMember-chain-id');
            localStorage.removeItem('walletAddress'); // ✅ Also clear localStorage
            localStorage.removeItem('ActiveMember-chain-id');

            // Reset member status on wallet disconnect
            setIsMember(false);

            // Auto-redirect to landing page when wallet disconnects (except admin and public pages)
            const publicPages = ['/', '/hiveworld', '/register', '/welcome', '/welcome2'];
            const isPublicPage = publicPages.includes(currentLocation) || currentLocation.startsWith('/hiveworld/');

            if (wasConnected && !currentLocation.startsWith('/admin/') && !isPublicPage && isMounted) {
              console.log('🔄 Wallet disconnected, redirecting to landing page');
              setLocation('/');
            }

            console.log('🔗 Wallet disconnected');
          }
        }, 500); // 增加到500ms延迟
      }
    };

    handleWalletConnection();

    // Cleanup timeout on unmount
    return () => {
      isMounted = false;
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
      }
    };
  }, [account?.address, activeChain?.id, isConnected, location]); // 简化依赖，移除setLocation和wallet

  // Check basic auth routing when wallet and Supabase auth change
  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      if (isMounted) {
        await checkBasicAuthRouting();
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isSupabaseAuthenticated, account?.address]);

  // Check gas sponsorship eligibility when wallet or chain changes
  useEffect(() => {
    if (isConnected && account?.address && activeChain?.id) {
      checkGasSponsorshipEligibility();
    } else {
      setGasSponsorship(null);
    }
  }, [isConnected, account?.address, activeChain?.id]);

  const value = useMemo(() => ({
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
    checkMembershipStatus: checkBasicAuthRouting, // Renamed for clarity
    signOut,
    gasSponsorship,
    checkGasSponsorshipEligibility,
  }), [
    client,
    account,
    wallet,
    activeChain,
    isConnected,
    walletAddress,
    isSupabaseAuthenticated,
    supabaseUser,
    isMember,
    referrerWallet,
    gasSponsorship,
  ]);

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider 
      client={client}
      supportedChains={supportedChains}
      activeChain={arbitrum} // Set Arbitrum One as default chain
    >
      <Web3ContextProvider>
        {children}
      </Web3ContextProvider>
    </ThirdwebProvider>
  );
}

// Add displayName for Fast Refresh compatibility
Web3Provider.displayName = 'Web3Provider';

// Export hook with Fast Refresh compatibility
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
