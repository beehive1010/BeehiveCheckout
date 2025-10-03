import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";

const NFT_CONTRACT_ADDRESS = "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "3123b1ac2ebdb966dd415c6e964dc335",
});

declare global {
  interface Window {
    ethereum?: any;
  }
}

function useSwitchChainEVM() {
  return async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + chainId.toString(16) }],
      });
    } catch (err) {
      throw err;
    }
  };
}

export function useMembershipNFT() {
  const account = useActiveAccount();
  const walletChain = useActiveWalletChain();
  const switchChain = useSwitchChainEVM();

  const nftContract = getContract({
    client,
    chain: arbitrum,
    address: NFT_CONTRACT_ADDRESS,
  });

  return {
    nftContract,
    client,
    address: account?.address,
    isConnected: !!account?.address,
    chain: arbitrum,
    switchChain,
    chainId: arbitrum.id,
    walletChain,
    contractAddress: NFT_CONTRACT_ADDRESS,
  };
}
