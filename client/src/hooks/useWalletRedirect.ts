import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useWeb3 } from '../contexts/Web3Context';

/**
 * Hook that automatically redirects to landing page when wallet disconnects
 * on any page except the landing page itself
 */
export function useWalletRedirect() {
  const { isConnected } = useWeb3();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If wallet disconnects and we're not on landing page, redirect to landing
    if (!isConnected && location !== '/') {
      // Don't redirect from admin pages
      if (!location.startsWith('/admin/')) {
        console.log('🔄 Wallet disconnected, redirecting to landing page');
        setLocation('/');
      }
    }
  }, [isConnected, location, setLocation]);

  return { isConnected, location };
}