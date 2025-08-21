import { ConnectButton } from 'thirdweb/react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { Badge } from '../ui/badge';
import { useWeb3 } from '../../contexts/Web3Context';
import { supportedChains, wallets, authConfig, alphaCentauri } from '../../lib/web3';

export default function WalletConnect() {
  const { currentLevel, isConnected, walletAddress } = useWallet();
  const { client } = useWeb3();
  const { t } = useI18n();

  return (
    <div className="flex items-center space-x-2">
      {isConnected && currentLevel > 0 && (
        <Badge variant="secondary" className="bg-honey text-black font-semibold">
          L{currentLevel}
        </Badge>
      )}
      <ConnectButton
        client={client}
        chains={supportedChains}
        wallets={wallets}
        theme="dark"
        accountAbstraction={{
          chain: alphaCentauri, // Use Alpha-centauri for account abstraction
          sponsorGas: true, // Sponsor gas fees for users
        }}
        auth={authConfig}
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
            [alphaCentauri.id]: "CTH", // Show CTH balance
          }
        }}
        data-testid="button-connect-wallet"
      />
    </div>
  );
}
