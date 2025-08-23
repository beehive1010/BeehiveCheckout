import { useActiveAccount } from "thirdweb/react";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // TEMPORARY FIX: Skip NFT verification to avoid Alpha Centauri RPC issues
  // For now, assume users don't have NFT until they complete payment process
  // This will be updated once the payment flow creates NFTs on accessible chains
  
  const hasLevel1NFT = false; // Always false until payment system creates NFTs
  const isLoading = false;    // No loading since we're not querying
  const error = null;         // No error since we're not querying
  const level1Balance = BigInt(0); // No balance since no NFT
  const alphaLevel1Balance = BigInt(0); // Placeholder for compatibility
  const isCheckingAlpha = false; // Not checking

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