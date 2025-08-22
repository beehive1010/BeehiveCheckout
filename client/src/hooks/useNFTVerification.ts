import { useActiveAccount, useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { bbcMembershipContracts, levelToTokenId } from "../lib/web3";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Primary check: Level 1 NFT balance on Arbitrum Sepolia (main verification chain)
  const { 
    data: arbitrumLevel1Balance, 
    isLoading: isCheckingArbitrum,
    error: arbitrumError
  } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContracts.arbitrumSepolia,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 1
    }
  );

  // Secondary check: Level 1 NFT balance on Alpha Centauri (for claimed NFTs)
  const { 
    data: alphaLevel1Balance, 
    isLoading: isCheckingAlpha, 
    error: alphaError
  } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContracts.alphaCentauri,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 1
    }
  );

  const isCheckingLevel1 = isCheckingArbitrum || isCheckingAlpha;
  
  // Priority to Arbitrum Sepolia for verification (main chain for payments)
  // Then fall back to Alpha Centauri for claimed NFTs
  const hasLevel1NFT = Boolean(
    (arbitrumLevel1Balance && arbitrumLevel1Balance > BigInt(0)) ||
    (alphaLevel1Balance && alphaLevel1Balance > BigInt(0))
  );
  
  const isLoading = isCheckingLevel1;
  
  // Return combined balance for backward compatibility, prioritizing Arbitrum Sepolia
  const level1Balance = arbitrumLevel1Balance || alphaLevel1Balance || BigInt(0);
  
  // Combine errors
  const error = arbitrumError || alphaError;

  return {
    hasLevel1NFT,
    isLoading,
    error,
    level1Balance,
    // Additional chain-specific data
    arbitrumLevel1Balance,
    alphaLevel1Balance,
    isCheckingArbitrum,
    isCheckingAlpha,
  };
}