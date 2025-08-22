import { useActiveAccount, useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { bbcMembershipContracts, levelToTokenId } from "../lib/web3";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Frontend displays Alpha Centauri NFT ownership only
  // Backend handles cross-chain verification (Arbitrum Sepolia payment -> Alpha Centauri claim)
  const { 
    data: alphaLevel1Balance, 
    isLoading: isCheckingAlpha, 
    error
  } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContracts.alphaCentauri,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 1 on Alpha Centauri
    }
  );

  const isCheckingLevel1 = isCheckingAlpha;
  
  // Frontend only shows Alpha Centauri NFT ownership
  // Users see they own NFT on Alpha Centauri (the target chain)
  const hasLevel1NFT = Boolean(alphaLevel1Balance && alphaLevel1Balance > BigInt(0));
  
  const isLoading = isCheckingLevel1;
  
  // Return Alpha Centauri balance for display
  const level1Balance = alphaLevel1Balance || BigInt(0);

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