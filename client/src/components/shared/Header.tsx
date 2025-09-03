import { useI18n } from '../../contexts/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Link, useLocation } from 'wouter';
import { ConnectButton } from 'thirdweb/react';
import { client, supportedChains, wallets } from '../../lib/web3';
import { useWallet } from '../../hooks/useWallet';
import { User, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function Header() {
  const { t } = useI18n();
  const { isConnected, walletAddress, currentLevel, isActivated } = useWallet();
  const [, setLocation] = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
            {/* User Profile Quick Access (Mobile Only when connected) */}
            {isConnected && isActivated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/me')}
                className="md:hidden flex items-center gap-2 px-3 py-2 bg-honey/10 hover:bg-honey/20 border border-honey/20 rounded-lg"
                data-testid="button-mobile-user-center"
              >
                <User className="w-4 h-4 text-honey" />
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs bg-honey/20 text-honey border-honey/30 px-1">
                    L{currentLevel || 1}
                  </Badge>
                </div>
              </Button>
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
                label: "Connect Wallet",
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
