import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { useNFTVerification } from '../hooks/useNFTVerification';
import { parseReferralFromUrl } from '../lib/web3';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const account = useActiveAccount();
  const [location, setLocation] = useLocation();
  const { hasLevel1NFT, isLoading } = useNFTVerification();

  // Store referral link if present in URL
  useEffect(() => {
    const referrer = parseReferralFromUrl();
    if (referrer) {
      localStorage.setItem('beehive-referrer', referrer);
    }
  }, []);

  // Route guarding logic
  useEffect(() => {
    // Don't redirect while loading NFT verification
    if (isLoading) return;

    const isPublicRoute = location === '/' || 
                         location === '/landing' || 
                         location.startsWith('/blog/') ||
                         location === '/hiveworld';

    // If no wallet connected
    if (!account?.address) {
      // Allow public routes
      if (isPublicRoute) return;
      
      // Redirect to landing for protected routes
      setLocation('/');
      return;
    }

    // Wallet is connected - begin authenticated flow
    if (hasLevel1NFT) {
      // User has Level 1 NFT - redirect to dashboard if on entry routes
      if (location === '/' || location === '/landing' || location === '/register' || location === '/welcome') {
        setLocation('/dashboard');
      }
      return;
    } else {
      // User has wallet but no Level 1 NFT - guide through registration flow
      if (location === '/' || location === '/landing') {
        // Connected wallet on landing page - start registration flow
        setLocation('/register');
        return;
      }
      
      // Allow registration/welcome flow routes
      if (location === '/register' || location === '/welcome') return;
      
      // Allow other public routes
      if (location.startsWith('/blog/') || location === '/hiveworld') return;
      
      // For protected routes, redirect to registration
      setLocation('/register');
      return;
    }
  }, [account?.address, hasLevel1NFT, isLoading, location, setLocation]);

  // Show loading while checking NFT ownership
  if (isLoading && account?.address) {
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

// Protected routes that require Level 1 NFT
export const protectedRoutes = [
  '/dashboard',
  '/tasks',
  '/education',
  '/discover',
  '/me',
  '/profile'
];

// Public routes accessible without wallet or NFT
export const publicRoutes = [
  '/',
  '/landing',
  '/hiveworld',
  '/blog'
];

// Registration flow routes (require wallet but not NFT)
export const registrationFlowRoutes = [
  '/register',
  '/welcome'
];