import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Check activation status from database instead of NFT ownership
  const { data: registrationStatus, isLoading } = useQuery({
    queryKey: ['/api/wallet/registration-status'],
    enabled: !!account?.address,
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