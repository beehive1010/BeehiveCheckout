import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import HexagonIcon from '../UI/HexagonIcon';
import LanguageSwitcher from '../UI/LanguageSwitcher';
import WalletConnect from '../UI/WalletConnect';
import { Link } from 'wouter';

export default function Header() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-3 cursor-pointer">
              <HexagonIcon className="w-10 h-10">
                <i className="fas fa-layer-group text-honey text-sm"></i>
              </HexagonIcon>
              <h1 className="text-xl font-bold text-honey">Beehive</h1>
            </div>
          </Link>

          {/* Language Switcher & Wallet */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}
