import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import { getMembershipLevel, membershipLevels } from '../../lib/config/membershipLevels';
import MultiChainMembershipClaim from './MultiChainMembershipClaim';
import { Lock, CheckCircle, ShoppingCart, Star, Crown, Diamond } from 'lucide-react';

interface MembershipNFTGridProps {
  className?: string;
}

const getBadgeIcon = (level: number) => {
  if (level >= 16) return <Diamond className="w-4 h-4" />;
  if (level >= 11) return <Crown className="w-4 h-4" />;
  if (level >= 6) return <Star className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
};

const getBadgeColor = (badgeTheme: string) => {
  const colorMap: Record<string, string> = {
    'bronze': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300',
    'bronze-plus': 'bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-800/30 dark:text-amber-200',
    'silver': 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300',
    'gold': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300',
    'gold-plus': 'bg-yellow-200 text-yellow-900 border-yellow-400 dark:bg-yellow-800/30 dark:text-yellow-200',
    'platinum': 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/30 dark:text-slate-300',
    'diamond': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300',
    'royal': 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300',
    'legendary': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300'
  };
  return colorMap[badgeTheme] || 'bg-gray-100 text-gray-800 border-gray-300';
};

export default function MembershipNFTGrid({ className = '' }: MembershipNFTGridProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  
  const { t } = useI18n();
  const { walletAddress, currentLevel } = useWallet();

  // Get available levels for purchase
  const { data: availableLevelsData, isLoading } = useQuery({
    queryKey: ['/api/membership/available-levels', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const response = await fetch(`/api/membership/available-levels/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch available levels');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    refetchInterval: 30000,
  });

  const availableLevels = (availableLevelsData as any)?.availableLevels || [];

  const handlePurchase = (level: number) => {
    setSelectedLevel(level);
    setShowPurchaseDialog(true);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    setSelectedLevel(null);
    // Refresh the page or refetch data
    window.location.reload();
  };

  const getNFTStatus = (level: number) => {
    if (level <= (currentLevel || 0)) return 'owned';
    if (availableLevels.includes(level)) return 'available';
    return 'locked';
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 8 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-9 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${className}`}>
        {membershipLevels.map((membershipLevel) => {
          const status = getNFTStatus(membershipLevel.level);
          const isOwned = status === 'owned';
          const isAvailable = status === 'available';
          const isLocked = status === 'locked';
          
          return (
            <Card
              key={membershipLevel.level}
              className={`
                relative overflow-hidden transition-all duration-300 hover:shadow-lg
                ${isOwned 
                  ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
                  : isAvailable 
                    ? 'border-honey/50 bg-honey/5 hover:border-honey hover:shadow-honey/20' 
                    : 'border-gray-200 bg-gray-50/50 dark:bg-gray-950/20'
                }
              `}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    Level {membershipLevel.level}
                  </CardTitle>
                  {isOwned && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {isLocked && (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs w-fit ${getBadgeColor(membershipLevel.badgeTheme)}`}
                >
                  <div className="flex items-center gap-1">
                    {getBadgeIcon(membershipLevel.level)}
                    {membershipLevel.titleEn}
                  </div>
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-honey">
                    ${(membershipLevel.priceUSDT / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">USDT</div>
                </div>

                <div className="space-y-1">
                  {membershipLevel.benefitsKeys.slice(0, 2).map((benefitKey, index) => (
                    <div key={index} className="text-xs text-muted-foreground truncate">
                      • {t(benefitKey)}
                    </div>
                  ))}
                  {membershipLevel.benefitsKeys.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{membershipLevel.benefitsKeys.length - 2} more benefits
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handlePurchase(membershipLevel.level)}
                  disabled={!isAvailable || !walletAddress}
                  className={`w-full text-xs py-2 ${
                    isOwned
                      ? 'bg-green-100 text-green-800 border-green-200 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-honey text-secondary hover:bg-honey/90'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                  variant={isOwned ? 'outline' : 'default'}
                  data-testid={`button-purchase-level-${membershipLevel.level}`}
                >
                  {isOwned ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Owned
                    </>
                  ) : isAvailable ? (
                    <>
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Purchase
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 mr-1" />
                      Locked
                    </>
                  )}
                </Button>
              </CardContent>

              {/* Owned overlay */}
              {isOwned && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ✓ Owned
                </div>
              )}
              
              {/* Next level indicator */}
              {membershipLevel.level === (currentLevel || 0) + 1 && isAvailable && (
                <div className="absolute top-2 right-2 bg-honey text-secondary text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                  Next
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-honey">
              Purchase Level {selectedLevel} NFT
            </DialogTitle>
          </DialogHeader>
          {selectedLevel && walletAddress && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-honey/5 rounded-lg border border-honey/20">
                <h3 className="font-semibold text-lg">
                  {getMembershipLevel(selectedLevel)?.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Multi-chain NFT claiming with USDT payment
                </p>
              </div>
              
              <MultiChainMembershipClaim
                walletAddress={walletAddress}
                level={selectedLevel}
                onSuccess={handlePurchaseSuccess}
                onError={(error) => {
                  console.error('Purchase error:', error);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}