import { useActiveAccount, useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { bbcMembershipContracts, levelToTokenId } from "../lib/web3";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Check Level 1 NFT balance on Arbitrum Sepolia
  const { 
    data: arbitrumLevel1Balance, 
    isLoading: isCheckingArbitrum 
  } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContracts.arbitrumSepolia,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 0
    }
  );

  // Check Level 1 NFT balance on Alpha Centauri
  const { 
    data: alphaLevel1Balance, 
    isLoading: isCheckingAlpha, 
    error 
  } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContracts.alphaCentauri,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 0
    }
  );

  const isCheckingLevel1 = isCheckingArbitrum || isCheckingAlpha;
  
  // User has Level 1 NFT if they own it on either chain
  const hasLevel1NFT = Boolean(
    (arbitrumLevel1Balance && arbitrumLevel1Balance > BigInt(0)) ||
    (alphaLevel1Balance && alphaLevel1Balance > BigInt(0))
  );
  
  const isLoading = isCheckingLevel1;
  
  // Return combined balance for backward compatibility
  const level1Balance = arbitrumLevel1Balance || alphaLevel1Balance || BigInt(0);

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