import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Crown, ArrowRight, User } from 'lucide-react';
import MembershipBadge from '../membership/MembershipBadge';

interface UserProfileProps {
  className?: string;
}

export default function UserProfile({ className = '' }: UserProfileProps) {
  const { userData, walletAddress, currentLevel } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  const handleUpgradeClick = () => {
    setLocation('/membership');
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className={`bg-gradient-to-r from-honey/10 to-orange-500/10 border-honey/30 ${className}`}>
      <CardContent className="p-6">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            {/* User Avatar */}
            <Avatar className="h-16 w-16 border-2 border-honey/50">
              <AvatarFallback className="bg-honey/20 text-honey text-lg font-bold">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-foreground" data-testid="text-username">
                  {userData?.username || formatWalletAddress(walletAddress || '')}
                </h3>
                <MembershipBadge level={currentLevel || 1} />
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="secondary" 
                  className="bg-honey/20 text-honey border-honey/30"
                  data-testid="badge-level"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Level {currentLevel || 1}
                </Badge>
                <p className="text-sm text-muted-foreground" data-testid="text-wallet">
                  {formatWalletAddress(walletAddress || '')}
                </p>
              </div>
            </div>
          </div>

          {/* Upgrade Button */}
          <Button 
            onClick={handleUpgradeClick}
            className="bg-honey hover:bg-honey/90 text-black font-semibold shadow-lg"
            data-testid="button-upgrade"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {t('dashboard.upgrade')}
          </Button>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center space-x-3">
            {/* User Avatar */}
            <Avatar className="h-12 w-12 border-2 border-honey/50">
              <AvatarFallback className="bg-honey/20 text-honey text-sm font-bold">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-foreground" data-testid="text-username-mobile">
                  {userData?.username || formatWalletAddress(walletAddress || '')}
                </h3>
                <MembershipBadge level={currentLevel || 1} size="sm" />
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className="bg-honey/20 text-honey border-honey/30 text-xs"
                  data-testid="badge-level-mobile"
                >
                  <Crown className="h-2 w-2 mr-1" />
                  Level {currentLevel || 1}
                </Badge>
                <p className="text-xs text-muted-foreground" data-testid="text-wallet-mobile">
                  {formatWalletAddress(walletAddress || '')}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Upgrade Button */}
          <Button 
            onClick={handleUpgradeClick}
            className="w-full bg-honey hover:bg-honey/90 text-black font-semibold shadow-lg"
            data-testid="button-upgrade-mobile"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {t('dashboard.upgrade')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}