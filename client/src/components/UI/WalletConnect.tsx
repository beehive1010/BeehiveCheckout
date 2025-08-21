import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function WalletConnect() {
  const { 
    isConnected, 
    walletAddress, 
    connectWallet, 
    disconnectWallet,
    currentLevel 
  } = useWallet();
  const { t } = useI18n();

  if (!isConnected) {
    return (
      <Button 
        onClick={connectWallet}
        className="wallet-connected px-6 py-2 rounded-lg font-semibold transition-all duration-200 glow-hover"
        data-testid="button-connect-wallet"
      >
        <i className="fas fa-wallet mr-2"></i>
        {t('wallet.connect')}
      </Button>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center space-x-2">
      {currentLevel > 0 && (
        <Badge variant="secondary" className="bg-honey text-black font-semibold">
          L{currentLevel}
        </Badge>
      )}
      <Button 
        onClick={disconnectWallet}
        variant="secondary"
        className="wallet-connected px-6 py-2 rounded-lg font-semibold transition-all duration-200 glow-hover"
        data-testid="button-wallet-address"
      >
        <i className="fas fa-wallet mr-2"></i>
        {formatAddress(walletAddress!)}
      </Button>
    </div>
  );
}
