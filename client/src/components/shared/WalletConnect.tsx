import { ConnectButton } from 'thirdweb/react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { client, supportedChains, wallets, alphaCentauri } from '../../lib/web3';

export default function WalletConnect() {
  const { isConnected, walletAddress } = useWallet();
  const { t } = useI18n();

  return (
    <div className="flex items-center space-x-2">
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
    </div>
  );
}
