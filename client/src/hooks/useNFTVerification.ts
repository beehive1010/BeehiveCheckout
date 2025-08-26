import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Check activation status from database with real-time updates
  const { data: registrationStatus, isLoading } = useQuery({
    queryKey: ['/api/wallet/registration-status'],
    queryFn: async () => {
      if (!account?.address) return null;
      const response = await fetch('/api/wallet/registration-status', {
        headers: {
          'X-Wallet-Address': account.address
        }
      });
      if (!response.ok) throw new Error('Failed to fetch registration status');
      return response.json();
    },
    enabled: !!account?.address,
    staleTime: 2000, // 2 seconds
    refetchInterval: 6000, // Real-time polling every 6 seconds for activation status
    refetchIntervalInBackground: true,
  });
  
  // Use database activation status instead of NFT verification
  const hasLevel1NFT = registrationStatus?.activated || false;
  const error = null;
  const level1Balance = BigInt(registrationStatus?.activated ? 1 : 0);
  const alphaLevel1Balance = BigInt(0);
  const isCheckingAlpha = false;

  return {
    hasLevel1NFT,
    isLoading,
    error,
    level1Balance,
    // Alpha Centauri chain data (displayed to user)
    alphaLevel1Balance,
    isCheckingAlpha,
  };
}