import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/button';
import { useLocation } from 'wouter';

export default function UserProfile() {
  const { walletAddress, currentLevel } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleUserCenter = () => {
    setLocation('/me');
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 mb-6 border border-border/30">
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* User Avatar - Smaller on mobile */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center flex-shrink-0">
            <i className="fas fa-user text-lg sm:text-2xl text-muted-foreground"></i>
          </div>
          
          <div className="space-y-1 min-w-0 flex-1">
            {/* Mobile: Stack username and level vertically, Desktop: Side by side */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('userProfile.username')} :</p>
                <div className="bg-background px-2 sm:px-3 py-1 rounded-full border border-border">
                  <span className="text-xs sm:text-sm font-mono truncate block">
                    {walletAddress ? formatAddress(walletAddress) : '0x000...0000'}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('userProfile.level')} :</p>
                <div className="bg-background px-2 sm:px-3 py-1 rounded-full border border-border min-w-[50px] sm:min-w-[60px] text-center">
                  <span className="text-xs sm:text-sm">
                    {currentLevel > 0 ? currentLevel : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* User Center Button - Full width on mobile, compact on desktop */}
        <Button 
          onClick={handleUserCenter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full w-full sm:w-auto text-sm sm:text-base"
          data-testid="button-user-center"
        >
          <span className="sm:hidden">{t('userProfile.userCenter')}</span>
          <span className="hidden sm:inline">{t('userProfile.userCenter')}</span>
        </Button>
      </div>
    </div>
  );
}