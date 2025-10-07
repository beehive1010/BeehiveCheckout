import React, {useState} from 'react';
import {useWallet} from '../hooks/useWallet';
import {useI18n} from '../contexts/I18nContext';
import {useLocation} from 'wouter';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../components/ui/tabs';
import HexagonIcon from '../components/shared/HexagonIcon';
import UserProfileCard from '../components/shared/UserProfileCard';
import {
    Activity,
    ArrowUpRight,
    Award,
    BarChart3,
    Coins,
    Crown,
    DollarSign,
    Edit,
    Layers,
    RefreshCw,
    Target,
    Timer,
    TrendingUp,
    User,
    UsersIcon
} from 'lucide-react';

// V2 Components and Hooks
import {
    useBalanceBreakdownV2,
    useClaimableRewardsV2,
    useDashboardV2,
    useMatrixTreeV2,
    usePendingRewardsV2,
    useRefreshDashboardV2
} from '../hooks/useMatrixData';
import ClaimableRewardsCardV2 from '../components/rewards/ClaimableRewardsCardV2';
import SimpleMatrixView from '../components/matrix/SimpleMatrixView';
import {MatrixNetworkStatsV2} from '../components/matrix/MatrixNetworkStatsV2';
import MatrixLayerStats from '../components/matrix/MatrixLayerStats';
import NFTLevelUpgrade from '../components/NFTLevelUpgrade';
import {useToast} from '../hooks/use-toast';

export default function Me() {
  const { 
    userData, 
    walletAddress, 
    currentLevel, 
    bccBalance,
  } = useWallet();
  
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // V2 Dashboard hooks
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboardV2(walletAddress || undefined);
  const { data: matrixTree, isLoading: isMatrixLoading } = useMatrixTreeV2(walletAddress || undefined, 19);
  const { data: balanceBreakdown, isLoading: isBalanceLoading } = useBalanceBreakdownV2(walletAddress || undefined);
  const { data: claimableRewards } = useClaimableRewardsV2(walletAddress || undefined);
  const { data: pendingRewards } = usePendingRewardsV2(walletAddress || undefined);
  const { refreshAll } = useRefreshDashboardV2();

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

  const handleRefresh = async () => {
    if (!walletAddress || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshAll(walletAddress);
      toast({
        title: t('me.system.profileRefreshed'),
        description: t('me.system.refreshSuccess'),
      });
    } catch (error) {
      toast({
        title: t('me.system.refreshFailed'),
        description: t('me.system.refreshError'),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isDashboardLoading || isMatrixLoading || isBalanceLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('me.title') || 'My Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('me.system.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserProfileCard variant="compact" />
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="border-honey/30 text-honey hover:bg-honey hover:text-black"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('me.system.refresh')}
          </Button>
        </div>
      </div>
      
      {/* Enhanced Profile Card with V2 Data */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative">
                <HexagonIcon className="w-16 h-16 text-honey">
                  <User className="w-8 h-8" />
                </HexagonIcon>
                <Badge className="absolute -top-2 -right-2 bg-honey text-black font-bold">
                  L{currentLevel}
                </Badge>
                {dashboardData && (
                  <Badge className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs">
                    Tier {balanceBreakdown?.activation.tier || 1}
                  </Badge>
                )}
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
                    <span className="text-muted-foreground">BCC Total:</span>
                    <span className="font-medium text-honey ml-1">
                      {balanceBreakdown?.bcc.total || bccBalance?.transferable || 0}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Transferable:</span>
                    <span className="font-medium text-green-400 ml-1">
                      {balanceBreakdown?.bcc.transferable || bccBalance?.transferable || 0}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">USDT:</span>
                    <span className="font-medium text-emerald-400 ml-1">
                      ${dashboardData?.rewards.claimableAmount.toFixed(2) || '0.00'}
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
                className="border-honey text-honey hover:bg-honey hover:text-black w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                <span className="sm:inline">{t('me.profile.editProfile')}</span>
              </Button>
            </div>
          </div>

          {/* V2 Balance Breakdown */}
          {balanceBreakdown && (
            <div className="border-t border-border/20 pt-4">
              <h4 className="font-medium text-honey mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                {t('me.balances.title')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
                  <div className="text-lg font-bold text-green-400">
                    {balanceBreakdown.bcc.transferable}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('me.balances.transferableBCC')}</div>
                  <div className="text-xs text-green-400 mt-1">
                    {balanceBreakdown.bcc.breakdown.transferable.usage}
                  </div>
                </div>
                <div className="bg-orange-500/5 rounded-lg p-3 border border-orange-500/20">
                  <div className="text-lg font-bold text-orange-400">
                    {balanceBreakdown.bcc.restricted}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('me.balances.restrictedBCC')}</div>
                  <div className="text-xs text-orange-400 mt-1">
                    {balanceBreakdown.bcc.breakdown.restricted.usage}
                  </div>
                </div>
                <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20">
                  <div className="text-lg font-bold text-purple-400">
                    {balanceBreakdown.bcc.locked}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('me.balances.lockedBCC')}</div>
                  <div className="text-xs text-purple-400 mt-1">
                    {balanceBreakdown.bcc.breakdown.locked.usage}
                  </div>
                </div>
                <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
                  <div className="text-lg font-bold text-blue-400">
                    ${balanceBreakdown.usdt.totalEarned.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('me.balances.totalUSDTEarned')}</div>
                  <div className="text-xs text-blue-400 mt-1">
                    ${balanceBreakdown.usdt.totalWithdrawn.toFixed(2)} withdrawn
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Performance Overview */}
      {dashboardData && (
        <Card className="bg-secondary border-border mb-6">
          <CardHeader>
            <CardTitle className="text-honey flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('me.performance.overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {dashboardData.matrix.totalTeamSize}
                </div>
                <div className="text-xs text-muted-foreground">{t('me.performance.totalTeamSize')}</div>
              </div>
              
              <div className="text-center p-3 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {dashboardData.matrix.directReferrals}
                </div>
                <div className="text-xs text-muted-foreground">{t('me.performance.directReferrals')}</div>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-center mb-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  L{dashboardData.matrix.deepestLayer}
                </div>
                <div className="text-xs text-muted-foreground">{t('me.performance.deepestLayer')}</div>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg border border-honey/20">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-honey" />
                </div>
                <div className="text-2xl font-bold text-honey">
                  {dashboardData.performance.spilloverRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">{t('me.performance.spilloverRate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Tabs */}
      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-secondary">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">{t('me.performance.layerRewards')}</span>
            <span className="sm:hidden">{t('nav.rewards')}</span>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">{t('me.performance.matrixTree')}</span>
            <span className="sm:hidden">{t('nav.matrix') || 'Matrix'}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">{t('me.performance.analytics')}</span>
            <span className="sm:hidden">{t('me.performance.stats')}</span>
          </TabsTrigger>
          <TabsTrigger value="upgrade" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="hidden sm:inline">{t('me.balances.nftUpgrade')}</span>
            <span className="sm:hidden">{t('me.performance.upgrade')}</span>
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <span className="hidden sm:inline">{t('me.balances.balances')}</span>
            <span className="sm:hidden">{t('me.performance.balance')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Layer-based Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <ClaimableRewardsCardV2 walletAddress={walletAddress || ''} />
          
          {/* Reward Statistics */}
          {dashboardData && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey flex items-center gap-2">
                  <Award className="w-5 w-5" />
                  {t('me.performance.rewardPerformance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      ${dashboardData.rewards.totalEarnings.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('me.performance.totalEarnings')}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-honey mb-1">
                      {claimableRewards?.rewards.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('me.performance.readyToClaim')}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      {pendingRewards?.rewards.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('me.performance.pendingRewards')}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      ${dashboardData.performance.rewardEfficiency.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('me.performance.efficiency')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Matrix Tree Tab */}
        <TabsContent value="matrix" className="space-y-6">
          <MatrixLayerStats 
            walletAddress={walletAddress || ''}
          />
          <SimpleMatrixView 
            walletAddress={walletAddress || ''} 
            rootUser={{
              username: userData?.username || 'User',
              currentLevel: currentLevel || 1
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <MatrixNetworkStatsV2 walletAddress={walletAddress || ''} />
          
          {/* Performance Metrics Details */}
          {dashboardData && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('me.performance.detailedMetrics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{t('me.performance.spilloverRate')}</span>
                        <ArrowUpRight className="w-4 h-4 text-honey" />
                      </div>
                      <div className="text-2xl font-bold text-honey">
                        {dashboardData.performance.spilloverRate.toFixed(1)}%
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2 mt-2">
                        <div 
                          className="bg-honey h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(dashboardData.performance.spilloverRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{t('me.performance.growthVelocity')}</span>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {dashboardData.performance.growthVelocity.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{t('me.performance.membersPerDay')}</div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{t('me.performance.rewardEfficiency')}</span>
                        <Target className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        ${dashboardData.performance.rewardEfficiency.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{t('me.performance.usdtPerMember')}</div>
                    </div>
                  </div>

                  <div className="border-t border-border/20 pt-4">
                    <h4 className="font-medium text-honey mb-3">{t('me.performance.layerDistribution')}</h4>
                    <div className="space-y-2">
                      {Object.entries(dashboardData.matrix.layerCounts).map(([layer, count]) => (
                        <div key={layer} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Layer {layer}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted/50 rounded-full h-1">
                              <div 
                                className="bg-honey h-1 rounded-full transition-all"
                                style={{ width: `${(count / Math.max(...Object.values(dashboardData.matrix.layerCounts))) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-honey w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Enhanced Balances Tab */}
        <TabsContent value="balances" className="space-y-6">
          {isLoading ? (
            <Card className="bg-secondary border-border">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('me.loading.balanceDetails')}</p>
              </CardContent>
            </Card>
          ) : balanceBreakdown ? (
            <div className="space-y-6">
              {/* BCC Balance Details */}
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-honey flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    {t('me.tokens.management')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-green-400">{t('me.tokens.transferable')}</h4>
                        <Badge className="bg-green-500 text-white">{t('me.tokens.ActiveMember')}</Badge>
                      </div>
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {balanceBreakdown.bcc.transferable}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {balanceBreakdown.bcc.breakdown.transferable.description}
                      </p>
                      <p className="text-xs text-green-400 font-medium">
                        {t('me.tokens.usage')}: {balanceBreakdown.bcc.breakdown.transferable.usage}
                      </p>
                    </div>

                    <div className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-orange-400">{t('me.tokens.restricted')}</h4>
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400">{t('me.tokens.limited')}</Badge>
                      </div>
                      <div className="text-3xl font-bold text-orange-400 mb-2">
                        {balanceBreakdown.bcc.restricted}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {balanceBreakdown.bcc.breakdown.restricted.description}
                      </p>
                      <p className="text-xs text-orange-400 font-medium">
                        {t('me.tokens.usage')}: {balanceBreakdown.bcc.breakdown.restricted.usage}
                      </p>
                    </div>

                    <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-purple-400">{t('me.tokens.locked')}</h4>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                          <Timer className="w-3 h-3 mr-1" />
                          {t('me.tokens.locked')}
                        </Badge>
                      </div>
                      <div className="text-3xl font-bold text-purple-400 mb-2">
                        {balanceBreakdown.bcc.locked}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {balanceBreakdown.bcc.breakdown.locked.description}
                      </p>
                      <p className="text-xs text-purple-400 font-medium">
                        {t('me.tokens.usage')}: {balanceBreakdown.bcc.breakdown.locked.usage}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* USDT Balance Details */}
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-honey flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {t('me.usdt.earningsBreakdown')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-emerald-400 mb-1">
                        ${balanceBreakdown.usdt.totalEarned.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.usdt.totalEarned')}</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        ${balanceBreakdown.usdt.availableRewards.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.usdt.available')}</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        ${balanceBreakdown.usdt.totalWithdrawn.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.usdt.withdrawn')}</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        ${balanceBreakdown.usdt.pendingWithdrawals.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.usdt.pending')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Metadata */}
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-honey flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    {t('me.account.information')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-honey" />
                        <span className="font-medium text-honey">{t('me.account.activationTier')}</span>
                      </div>
                      <div className="text-2xl font-bold text-honey mb-1">
                        {balanceBreakdown.activation.tier}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {balanceBreakdown.activation.tierDescription}
                      </p>
                    </div>
                    
                    <div className="bg-background rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UsersIcon className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-blue-400">{t('me.account.activationOrder')}</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        #{balanceBreakdown.activation.order}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.account.memberSince')}</p>
                    </div>

                    <div className="bg-background rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="font-medium text-green-400">{t('me.account.lastUpdated')}</span>
                      </div>
                      <div className="text-sm font-medium text-green-400 mb-1">
                        {formatDate(balanceBreakdown.metadata.lastUpdated)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('me.account.dataRefresh')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-secondary border-border">
              <CardContent className="p-8 text-center">
                <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('me.loading.noBalanceData')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* NFT Upgrade Tab */}
        <TabsContent value="upgrade" className="space-y-6">
          <NFTLevelUpgrade 
            showFullPath={true}
            onUpgradeSuccess={() => {
              refreshAll(walletAddress!);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}