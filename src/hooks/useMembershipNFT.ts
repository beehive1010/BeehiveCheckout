import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";

// V4 Contract on Arbitrum Sepolia
const NFT_CONTRACT_ADDRESS = "0xC99CF23CeCE6bF79bD2a23FE5f1D9716D62EC9E1";

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
    chain: arbitrumSepolia,
    address: NFT_CONTRACT_ADDRESS,
  });

  return {
    nftContract,
    client,
    address: account?.address,
    isConnected: !!account?.address,
    chain: arbitrumSepolia,
    switchChain,
    chainId: arbitrumSepolia.id,
    walletChain,
    contractAddress: NFT_CONTRACT_ADDRESS,
  };
}
