import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import IndividualMatrixView from '../components/matrix/IndividualMatrixView';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import HexagonIcon from '../components/shared/HexagonIcon';
import UserProfileCard from '../components/shared/UserProfileCard';
import { UsersIcon, Edit, User } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';

export default function Me() {
  const { 
    userData, 
    walletAddress, 
    currentLevel, 
    bccBalance, 
    userBalances,
    isBalancesLoading 
  } = useWallet();
  
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(language === 'en' ? 'en-US' : language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with UserProfile */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('me.title') || 'My Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('me.subtitle') || 'View your stats, balances, and account details'}
          </p>
        </div>
        <UserProfileCard variant="compact" />
      </div>
      
      {/* Profile Card */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative">
                <HexagonIcon className="w-16 h-16 text-honey">
                  <User className="w-8 h-8" />
                </HexagonIcon>
                <Badge className="absolute -top-2 -right-2 bg-honey text-secondary">
                  L{currentLevel}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-honey truncate">
                  {userData?.username || formatAddress(walletAddress || '')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {formatAddress(walletAddress || '')}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">BCC:</span>
                    <span className="font-medium text-honey ml-1">
                      {bccBalance?.transferable || 0}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Locked:</span>
                    <span className="font-medium text-orange-400 ml-1">
                      {bccBalance?.restricted || bccBalance?.locked || 0}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">USDT:</span>
                    <span className="font-medium text-emerald-400 ml-1">
                      ${userBalances?.availableUSDTRewards || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={() => setLocation('/me/profile-settings')}
                variant="outline" 
                size="sm"
                className="border-honey text-honey hover:bg-honey hover:text-secondary w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                <span className="sm:inline">Edit Profile</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t('me.rewards') || 'Rewards'}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            {t('me.referrals') || 'Referrals'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-6">
          <ClaimableRewardsCard walletAddress={walletAddress || ''} />
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          {/* Referral Statistics */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey">
                {t('me.referralStats') || 'Referral Statistics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUserStats || isBalancesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-honey mb-1">
                      {userStats?.totalReferrals || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('me.totalReferrals') || 'Total Referrals'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {userStats?.recentReferrals?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('me.directReferrals') || 'Direct Referrals'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      ${userBalances?.availableUSDTRewards || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Available to Withdraw
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      ${userBalances?.pendingUpgradeRewards || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pending Upgrades
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Matrix Visualization with 19 Layers */}
          <IndividualMatrixView 
            walletAddress={walletAddress || ''} 
            rootUser={{
              username: userData?.username || 'User',
              currentLevel: currentLevel || 1
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}