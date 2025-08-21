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
    <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-border/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* User Avatar */}
          <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center">
            <i className="fas fa-user text-2xl text-muted-foreground"></i>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Username :</p>
                <div className="bg-background px-3 py-1 rounded-full border border-border">
                  <span className="text-sm font-mono">
                    {walletAddress ? formatAddress(walletAddress) : '0x000...0000'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Level :</p>
                <div className="bg-background px-3 py-1 rounded-full border border-border min-w-[60px] text-center">
                  <span className="text-sm">
                    {currentLevel > 0 ? currentLevel : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* User Center Button */}
        <Button 
          onClick={handleUserCenter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full"
          data-testid="button-user-center"
        >
          User Center
        </Button>
      </div>
    </div>
  );
}