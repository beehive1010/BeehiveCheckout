import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useUserMatrixLayers } from '../hooks/useMatrixPlacement';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import HexagonIcon from '../components/shared/HexagonIcon';
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
  const { data: matrixData, isLoading: isMatrixLoading } = useUserMatrixLayers();
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
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('me.title')}
      </h2>
      
      {/* Profile Card */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <HexagonIcon className="w-16 h-16 text-honey">
                <User className="w-8 h-8" />
              </HexagonIcon>
              <Badge className="absolute -top-2 -right-2 bg-honey text-secondary">
                L{currentLevel}
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-honey">
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
            <div className="ml-4">
              <Button 
                onClick={() => setLocation('/me/profile-settings')}
                variant="outline" 
                size="sm"
                className="border-honey text-honey hover:bg-honey hover:text-secondary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
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
              ) : matrixData?.layers ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-honey">
                        {matrixData.totalMembers}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Members</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-honey">
                        {matrixData.maxLayer}
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

                  {/* Layer Details */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {matrixData.layers.slice(0, 10).map((layer: any) => (
                      <div key={layer.layer} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-honey border-honey">
                            L{layer.layer}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">
                              {layer.filledPositions} / {layer.totalPositions} positions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              L: {layer.leftCount} | M: {layer.middleCount} | R: {layer.rightCount}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Progress 
                            value={layer.fillPercentage} 
                            className="w-20 h-2 mb-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            {layer.fillPercentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {matrixData.layers.length > 10 && (
                      <div className="text-center py-4">
                        <Button 
                          onClick={() => setLocation('/referrals')}
                          variant="outline"
                          size="sm"
                          className="border-honey text-honey hover:bg-honey hover:text-secondary"
                        >
                          View All {matrixData.layers.length} Layers
                        </Button>
                      </div>
                    )}
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