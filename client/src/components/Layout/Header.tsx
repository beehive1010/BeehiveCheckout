// Removed unused useWallet import
import { useI18n } from '../../contexts/I18nContext';
import LanguageSwitcher from '../UI/LanguageSwitcher';
import WalletConnect from '../UI/WalletConnect';
import { Link } from 'wouter';

export default function Header() {
  const { t } = useI18n();

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

          {/* Mobile Divider */}
          <div className="md:hidden h-6 w-px bg-border mx-3"></div>

          {/* Language Switcher & Wallet */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <LanguageSwitcher />
            <div className="w-px h-6 bg-border"></div>
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}
