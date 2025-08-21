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

    // Wallet is connected
    if (hasLevel1NFT) {
      // User has Level 1 NFT - allow access to all routes
      // Redirect to dashboard if on landing, registration, or welcome
      if (location === '/' || location === '/landing' || location === '/register' || location === '/welcome') {
        setLocation('/dashboard');
      }
      return;
    } else {
      // User has wallet but no Level 1 NFT
      // Allow public routes and the registration/welcome flow
      if (isPublicRoute || location === '/register' || location === '/welcome') return;
      
      // For other protected routes, redirect to registration to start the flow
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