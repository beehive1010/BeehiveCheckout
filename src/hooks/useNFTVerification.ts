import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Check member activation status using new database framework
  const { data: memberStatus, isLoading } = useQuery({
    queryKey: ['/api/member/status'],
    queryFn: async () => {
      if (!account?.address) return null;
      const response = await fetch(`/api/member/status?t=${Date.now()}`, {
        headers: {
          'X-Wallet-Address': account.address,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { 
            isActivated: false, 
            currentLevel: 0, 
            levelsOwned: [] 
          };
        }
        throw new Error('Failed to fetch member status');
      }
      return response.json();
    },
    enabled: !!account?.address,
    staleTime: 3000,
    refetchInterval: 8000, // Optimized polling for member status
    refetchIntervalInBackground: true,
  });
  
  // Use new member system data
  const hasLevel1NFT = memberStatus?.isActivated && (memberStatus?.levelsOwned?.includes(1) || memberStatus?.currentLevel >= 1);
  const error = null;
  const level1Balance = BigInt(hasLevel1NFT ? 1 : 0);
  const alphaLevel1Balance = BigInt(0);
  const isCheckingAlpha = false;

  return {
    hasLevel1NFT,
    isLoading,
    error,
    level1Balance,
    // Member status from new database
    memberStatus,
    isActivated: memberStatus?.isActivated || false,
    currentLevel: memberStatus?.currentLevel || 0,
    levelsOwned: memberStatus?.levelsOwned || [],
    // Alpha Centauri chain data (displayed to user)
    alphaLevel1Balance,
    isCheckingAlpha,
  };
}