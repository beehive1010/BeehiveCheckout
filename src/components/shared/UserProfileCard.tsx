import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useLocation } from 'wouter';
import { User, Settings, Wallet, TrendingUp } from 'lucide-react';

interface UserProfileCardProps {
  variant?: 'default' | 'compact' | 'detailed';
  showUserCenter?: boolean;
  showStats?: boolean;
  className?: string;
}

export default function UserProfileCard({ 
  variant = 'default',
  showUserCenter = true,
  showStats = false,
  className = '' 
}: UserProfileCardProps) {
  const { walletAddress, currentLevel, bccBalance, isConnected } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleUserCenter = () => {
    setLocation('/me');
  };

  if (!isConnected || !walletAddress) {
    return (
      <Card className={`bg-muted/30 border-dashed border-muted-foreground/30 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-muted/50 rounded-2xl mb-3">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Wallet not connected
          </p>
        </CardContent>
      </Card>
    );
  }


  if (variant === 'detailed') {
    return (
      <Card className={`bg-gradient-to-br from-secondary to-secondary/80 border-border/50 ${className}`}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-honey/20 to-honey/5 border-2 border-honey/20 flex items-center justify-center">
                <User className="w-8 h-8 text-honey" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-honey">Profile</h3>
                <p className="text-sm text-muted-foreground">Level {currentLevel || 1} Member</p>
              </div>
            </div>
            {showUserCenter && (
              <Button 
                onClick={handleUserCenter}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                data-testid="button-user-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                User Center
              </Button>
            )}
          </div>

          {/* Wallet Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Wallet Address</label>
              <div className="bg-background px-4 py-3 rounded-xl border border-border">
                <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Membership Level</label>
                <div className="bg-honey/10 px-4 py-3 rounded-xl border border-honey/20">
                  <span className="font-semibold text-honey">Level {currentLevel || 1}</span>
                </div>
              </div>
              
              {showStats && bccBalance && (
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">BCC Balance</label>
                  <div className="bg-green-500/10 px-4 py-3 rounded-xl border border-green-500/20">
                    <span className="font-semibold text-green-400">{bccBalance.transferable}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant - Optimized for mobile
  return (
    <Card className={`bg-secondary/30 border-border/30 ${className}`}>
      <CardContent className="p-3 sm:p-4">
        {/* Mobile-first responsive layout */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center space-x-3">
            {/* Compact User Avatar */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-honey/10 to-honey/5 border-2 border-honey/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-honey" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Mobile: Compact horizontal layout */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('userProfile.username') || 'Address'}
                  </p>
                  <div className="bg-background px-2 py-1 rounded-lg border border-border">
                    <span className="text-xs font-mono truncate block">
                      {formatAddress(walletAddress)}
                    </span>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('userProfile.level') || 'Level'}
                  </p>
                  <div className="bg-honey/10 px-2 py-1 rounded-lg border border-honey/20 min-w-[50px] text-center">
                    <span className="text-xs font-semibold text-honey">
                      L{currentLevel || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile stats row */}
              {showStats && bccBalance && (
                <div className="flex gap-2 mt-2 sm:hidden">
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30 py-0 px-2">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {bccBalance.transferable}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          {/* Compact User Center Button */}
          {showUserCenter && (
            <Button 
              onClick={handleUserCenter}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg w-full sm:w-auto text-xs sm:text-sm font-medium shadow-sm"
              data-testid="button-user-center"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span>{t('userProfile.userCenter') || 'User Center'}</span>
            </Button>
          )}
        </div>

        {/* Desktop stats */}
        {showStats && bccBalance && (
          <div className="hidden sm:flex gap-3 mt-4 pt-4 border-t border-border/30">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              <TrendingUp className="w-4 h-4 mr-2" />
              {bccBalance.transferable} BCC Available
            </Badge>
            {bccBalance.restricted > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                {bccBalance.restricted} BCC Restricted
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}