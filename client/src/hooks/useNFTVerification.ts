import { useActiveAccount, useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { bbcMembershipContract, levelToTokenId } from "../lib/web3";

export function useNFTVerification() {
  const account = useActiveAccount();
  
  // Check if user owns Level 1 membership NFT (token ID 0) using direct contract call
  const { data: level1Balance, isLoading: isCheckingLevel1, error } = useReadContract(
    balanceOf,
    {
      contract: bbcMembershipContract,
      owner: account?.address || "",
      tokenId: levelToTokenId(1), // Level 1 = Token ID 0
    }
  );

  const hasLevel1NFT = Boolean(level1Balance && level1Balance > BigInt(0));
  const isLoading = isCheckingLevel1;

  return {
    hasLevel1NFT,
    isLoading,
    error,
    level1Balance,
  };
}