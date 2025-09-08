import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { useNFTVerification } from '../../hooks/useNFTVerification';
import { useWallet } from '../../hooks/useWallet';
import { parseReferralFromUrl } from '../../lib/web3';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const account = useActiveAccount();
  const [location, setLocation] = useLocation();
  const { hasLevel1NFT, isLoading: isNFTLoading } = useNFTVerification();
  const { isRegistered, isUserLoading } = useWallet();

  // Store referral link if present in URL + backup to server log
  useEffect(() => {
    const referrer = parseReferralFromUrl();
    if (referrer) {
      // Save to localStorage (primary storage)
      localStorage.setItem('beehive-referrer', referrer);
      console.log('Referrer saved to localStorage:', referrer);
      
      // Referral tracking is now handled by Web3Context authentication
    }
  }, [account?.address]);

  // Route guarding logic
  useEffect(() => {
    // Don't redirect while loading user data or NFT verification
    if (isNFTLoading || isUserLoading) return;

    const isPublicRoute = location === '/' || 
                         location === '/landing' || 
                         location.startsWith('/blog/') ||
                         location === '/hiveworld' ||
                         location === '/nft-center' ||
                         location === '/ads';

    // If no wallet connected
    if (!account?.address) {
      // Allow public routes
      if (isPublicRoute) return;
      
      // Redirect to landing for protected routes
      setLocation('/');
      return;
    }

    // Wallet is connected - check NFT status first
    if (hasLevel1NFT) {
      // User has Member NFT - skip registration/welcome, go to dashboard
      if (location === '/' || location === '/landing' || location === '/register' || location === '/welcome') {
        setLocation('/dashboard');
      }
      return; // Allow access to all protected routes
    } 
    
    // No Member NFT - check registration status
    if (isRegistered) {
      // User is registered but no Member NFT - redirect to welcome to claim NFT
      if (location === '/' || location === '/landing' || location === '/register') {
        setLocation('/welcome');
        return;
      }
      
      // Allow welcome flow and public routes
      if (location === '/welcome' || location.startsWith('/blog/') || location === '/hiveworld') return;
      
      // For protected routes, redirect to welcome to claim NFT
      setLocation('/welcome');
      return;
    } else {
      // User has wallet but not registered - guide through registration flow
      if (location === '/' || location === '/landing') {
        // Connected wallet on landing page - start registration flow
        setLocation('/register');
        return;
      }
      
      // Allow registration flow and public routes
      if (location === '/register' || location.startsWith('/blog/') || location === '/hiveworld') return;
      
      // For protected routes, redirect to registration
      setLocation('/register');
      return;
    }
  }, [account?.address, hasLevel1NFT, isRegistered, isNFTLoading, isUserLoading, location, setLocation]);

  // Show loading while checking user data and NFT ownership
  if ((isNFTLoading || isUserLoading) && account?.address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-honey border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-honey font-medium">Verifying membership...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

