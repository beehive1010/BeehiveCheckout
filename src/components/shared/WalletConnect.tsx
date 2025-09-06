import { ConnectButton } from 'thirdweb/react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { client, supportedChains, wallets, alphaCentauri } from '../../lib/web3';

export default function WalletConnect() {
  const { 
    isConnected, 
    walletAddress, 
    isCheckingRegistration, 
    isNewUser,
    needsNFTClaim,
    isFullyActivated,
    userData,
    userStatus
  } = useWallet();
  const { t } = useI18n();

  // Enhanced status display - shows complete user journey
  const getConnectionStatus = () => {
    if (!isConnected) return null;
    
    if (isCheckingRegistration) {
      return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-honey border-t-transparent rounded-full"></div>
          <span>Checking status...</span>
        </div>
      );
    }
    
    if (isNewUser) {
      return (
        <div className="text-sm text-amber-400">
          👋 New wallet - Ready to register!
        </div>
      );
    }
    
    if (needsNFTClaim) {
      return (
        <div className="text-sm text-blue-400">
          🎫 Welcome! Claim your Level 1 NFT
        </div>
      );
    }
    
    if (isFullyActivated) {
      return (
        <div className="text-sm text-green-400">
          ✅ Welcome back, {userData?.username || 'Beehive Member'}!
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col items-end space-y-2">
      <ConnectButton
        client={client}
        chains={supportedChains}
        wallets={wallets}
        theme="dark"
        connectModal={{ 
          showThirdwebBranding: false, 
          size: "compact",
          title: t('wallet.connect'),
          titleIcon: "🐝",
        }}
        connectButton={{
          label: t('wallet.connect'),
          className: "wallet-connected px-6 py-2 rounded-lg font-semibold transition-all duration-200 glow-hover"
        }}
        detailsButton={{
          className: "wallet-connected px-6 py-2 rounded-lg font-semibold transition-all duration-200 glow-hover",
          displayBalanceToken: {
            [alphaCentauri?.id || 141941]: "CTH", // Show CTH balance with fallback
          }
        }}
        data-testid="button-connect-wallet"
      />
      {getConnectionStatus()}
    </div>
  );
}
