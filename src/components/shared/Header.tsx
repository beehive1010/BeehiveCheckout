import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationButton from '../notifications/NotificationButton';
import { Link } from 'wouter';
import { ConnectButton } from 'thirdweb/react';
import { client, supportedChains, wallets } from '../../lib/web3';

export default function Header() {
  const { t } = useI18n();
  const { walletAddress } = useWallet();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-2 md:space-x-3 cursor-pointer">
              <img 
                src="/image/BCC.png" 
                alt="BCC Logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
              <h1 className="text-lg md:text-xl font-bold text-honey">Beehive</h1>
            </div>
          </Link>

          {/* Right Side Content */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Notifications - only show for connected users */}
            {walletAddress && (
              <>
                <NotificationButton walletAddress={walletAddress} />
                <div className="w-px h-6 bg-border"></div>
              </>
            )}
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            <div className="w-px h-6 bg-border"></div>
            
            {/* Wallet Connection */}
            <ConnectButton
              client={client}
              chains={supportedChains}
              wallets={wallets}
              theme="dark"
              connectModal={{ 
                showThirdwebBranding: false, 
                size: "wide",
                title: "Connect to Beehive",
                titleIcon: "🐝",
              }}
              connectButton={{
                label: t('header.connectWallet'),
                className: "btn-honey text-sm px-4 py-2 font-medium hover:scale-105 transition-all duration-300"
              }}
              detailsButton={{
                className: "btn-honey text-sm px-4 py-2 font-medium hover:scale-105 transition-all duration-300"
              }}
              data-testid="button-connect-wallet"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
