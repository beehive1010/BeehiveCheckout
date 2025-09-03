import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import HexagonIcon from '../components/shared/HexagonIcon';
import UserProfileCard from '../components/shared/UserProfileCard';
import { UsersIcon, Edit, User } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import styles from '../styles/me/me.module.css';

export default function Me() {
  const { 
    userData, 
    walletAddress, 
    currentLevel, 
    bccBalance, 
    cthBalance, 
    userActivity, 
    isActivityLoading,
    userBalances,
    isBalancesLoading 
  } = useWallet();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  
  // 使用dashboard matrix API来获取19层矩阵数据
  const { data: dashboardData, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['/api/dashboard/matrix', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/dashboard/matrix?t=${Date.now()}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch matrix data: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 30000,
  });
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
    <div className={`${styles.meContainer} container mx-auto px-4 py-8`}>
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
                    <span className="font-medium text-honey ml-1">
                      {bccBalance?.restricted || 0}
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
              {isLoadingUserStats ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-honey">
                      {userStats?.directReferralCount || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Direct Referrals</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-honey">
                      {userStats?.totalTeamCount || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Team</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-honey">
                      ${userStats?.totalEarnings || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-honey">
                      {userStats?.matrixLevel || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Matrix Level</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matrix Layers Overview */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey">
                Matrix Tree (Layers 1-19)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMatrixLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
                </div>
              ) : dashboardData?.downlineMatrix ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-honey">
                        {dashboardData.downlineMatrix.reduce((sum: number, level: any) => sum + level.members, 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Members</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-honey">
                        {dashboardData.downlineMatrix.findLastIndex((level: any) => level.members > 0) + 1 || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Active Layers</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-honey">
                        {currentLevel}
                      </div>
                      <p className="text-sm text-muted-foreground">Your Level</p>
                    </div>
                  </div>

                  {/* Layer Details - 完整显示19层 */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dashboardData.downlineMatrix.map((level: any) => {
                      const maxCapacity = Math.pow(3, level.level);
                      return (
                        <div key={level.level} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-honey border-honey">
                              L{level.level}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">
                                {level.members} / {maxCapacity.toLocaleString()} positions
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Members: {level.members} | Upgraded: {level.upgraded}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Progress 
                              value={level.members > 0 ? (level.members / maxCapacity) * 100 : 0} 
                              className="w-20 h-2 mb-1"
                            />
                            <p className="text-xs text-muted-foreground">
                              {level.members > 0 ? ((level.members / maxCapacity) * 100).toFixed(1) : '0.0'}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No matrix data available. Activate membership to start building your referral tree.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}