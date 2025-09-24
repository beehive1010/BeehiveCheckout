import React, {useCallback, useEffect, useState} from 'react';
import {useWallet} from '../hooks/useWallet';
import {useI18n} from '../contexts/I18nContext';
import {useLocation} from 'wouter';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../components/ui/tabs';
import {useToast} from '../hooks/use-toast';
import {supabase} from '../lib/supabase';
import RollupRewardsCard from '../components/rewards/RollupRewardsCard';
import USDTWithdrawal from '../components/withdrawal/USDTWithdrawal';
import {PendingRewardsList} from '../components/rewards/PendingRewardsList';
import RewardHistory from '../components/rewards/RewardHistory';
import {
    ArrowUpRight,
    Award,
    BarChart3,
    Clock,
    DollarSign,
    Gift,
    RefreshCw,
    Shield,
    Timer,
    TrendingUp,
    Users
} from 'lucide-react';
import RewardSystemInfoCard from '../components/rewards/RewardSystemInfoCard';

interface ProfileData {
  wallet_address: string;
  display_name?: string;
  bio?: string;
  profile_image?: string;
  created_at: string;
}

interface RewardsData {
  total: number;
  totalWithdrawn: number;
  netEarnings: number;
  pending: number;
  claimable: number;
  history: RewardHistory[];
}

interface RewardHistory {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  layer?: number;
}

export default function Rewards() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Use the registered wallet address from user data if available, fallback to connected wallet
  const memberWalletAddress = userData?.wallet_address || walletAddress;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [pendingRewards, setPendingRewards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [isRewardInfoExpanded, setIsRewardInfoExpanded] = useState(false);
  const [mobileRewardTab, setMobileRewardTab] = useState<'matrix' | 'bcc'>('matrix');
  

  // Use imported supabase client

  const loadRewardsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the new rewards stats function to get comprehensive data
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_rewards_stats' as any, {
        p_wallet_address: memberWalletAddress
      });

      if (statsError) {
        console.error('Rewards stats error:', statsError);
        throw new Error(`Failed to fetch rewards stats: ${statsError.message}`);
      }

      const stats = Array.isArray(statsData) ? statsData[0] : statsData;
      console.log('Rewards stats:', stats);

      // Get all rewards for history
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('layer_rewards')
        .select('*')
        .ilike('reward_recipient_wallet', memberWalletAddress)
        .order('created_at', { ascending: false });

      if (rewardsError) {
        console.error('Rewards data error:', rewardsError);
        throw new Error(`Failed to fetch rewards: ${rewardsError.message}`);
      }

      console.log('Rewards breakdown:', {
        total: rewardsData?.length,
        total_earned: stats?.total_earned || 0,
        total_withdrawn: stats?.total_withdrawn || 0,
        claimable: stats?.total_claimable || 0,
        pending: stats?.total_pending || 0
      });

      // Get pending rewards with expiration times for countdown timers
      const { data: pendingTimerData, error: pendingError } = await supabase
        .from('layer_rewards')
        .select('*')
        .ilike('reward_recipient_wallet', memberWalletAddress)
        .eq('status', 'pending')
        .not('expires_at', 'is', null)
        .order('expires_at', { ascending: true })
        .limit(3); // Only show top 3 most urgent

      if (pendingError) {
        console.warn('Pending rewards fetch error:', pendingError);
      } else {
        setPendingRewards(pendingTimerData || []);
      }

      const mappedRewards: RewardsData = {
        total: stats?.total_earned || 0,
        totalWithdrawn: stats?.total_withdrawn || 0,
        netEarnings: stats?.net_earnings || 0,
        pending: stats?.total_pending || 0,
        claimable: stats?.total_claimable || 0,
        history: rewardsData?.map((reward) => ({
          id: reward.id,
          type: reward.status || 'layer_reward',
          amount: reward.reward_amount || 0,
          currency: 'USDC',
          date: reward.claimed_at || reward.created_at || t('common.unknown'),
          status: reward.status === 'claimed' ? 'completed' : reward.status as 'pending' | 'completed' | 'failed',
          description: `Layer ${reward.triggering_nft_level} reward`,
          layer: reward.triggering_nft_level || 1
        })) || []
      };
      
      setRewardsData(mappedRewards);

    } catch (err) {
      console.error('Rewards data fetch error:', err);
      setError(err instanceof Error ? err.message : t('rewards.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [memberWalletAddress, t]); // Add memberWalletAddress as dependency

  useEffect(() => {
    if (memberWalletAddress) {
      loadRewardsData();
    }
  }, [memberWalletAddress, loadRewardsData]);

  // Stable callback for PendingRewardsTimer
  const handleRewardClaimable = useCallback((rewardId: string) => {
    // Reload rewards data when a reward becomes claimable
    loadRewardsData();
    toast({
      title: t('rewards.rewardReady'),
      description: t('rewards.rewardReadyDescription'),
    });
  }, [loadRewardsData, toast, t]);

  const claimPendingRewards = async () => {
    if (!rewardsData?.claimable || rewardsData.claimable <= 0) return;
    
    try {
      setIsLoading(true);
      
      // Use the database function to claim layer rewards
      const { data, error } = await supabase.rpc('claim_layer_reward' as any, {
        p_member_wallet: memberWalletAddress,
        p_reward_id: null as any // Will claim all claimable rewards
      });

      if (error) {
        console.error('Claim rewards error:', error);
        throw new Error(`Failed to claim rewards: ${error.message}`);
      }

      const resultData = data as any;
      if (resultData?.success) {
        toast({
          title: t('rewards.claimSuccess'),
          description: t('rewards.claimSuccessDescription', { amount: resultData.amount_claimed || rewardsData.claimable }),
        });
        
        // Reload data
        await loadRewardsData();
      } else {
        throw new Error(resultData?.error || t('rewards.errors.claimFailed'));
      }

    } catch (err) {
      console.error('Claim rewards error:', err);
      toast({
        title: t('rewards.claimFailed'),
        description: err instanceof Error ? err.message : t('rewards.claimFailedDescription'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-honey" />
        <div className="text-muted-foreground">{t('rewards.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">{t('rewards.error')}: {error}</div>
        <Button onClick={loadRewardsData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:container lg:mx-auto py-4 md:py-6 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center md:text-left mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-honey mb-2 md:mb-3">
          {t('nav.rewards')}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
          {t('rewards.subtitle')}
        </p>
      </div>

      {/* Rewards Overview Cards */}
      <div className="space-y-4 mb-6">
        {/* Mobile: Stack cards vertically for better readability */}
        <div className="md:hidden space-y-3">
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/40 border-amber-200 dark:border-amber-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-200 dark:bg-amber-800 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-800 dark:text-amber-200" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-800 dark:text-amber-200">${rewardsData?.total || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('rewards.totalEarned')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/40 dark:to-red-900/40 border-orange-200 dark:border-orange-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-800 dark:text-orange-200" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-800 dark:text-orange-200">${rewardsData?.totalWithdrawn || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('rewards.totalWithdrawn')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40 border-yellow-200 dark:border-yellow-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                    <Timer className="h-5 w-5 text-yellow-800 dark:text-yellow-200" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">${rewardsData?.pending || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('rewards.pending')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 border-green-200 dark:border-green-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                    <Gift className="h-5 w-5 text-green-800 dark:text-green-200" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-800 dark:text-green-200">${rewardsData?.claimable || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('rewards.claimable')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          <Card className="hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-br from-honey/10 to-amber-50 dark:from-honey/20 dark:to-amber-900/30 border-honey/20">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-honey mx-auto mb-2" />
              <div className="text-lg font-bold text-honey">${rewardsData?.total || 0}</div>
              <div className="text-xs text-muted-foreground">{t('rewards.totalEarned')}</div>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-200/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-amber-600">${rewardsData?.totalWithdrawn || 0}</div>
              <div className="text-xs text-muted-foreground">{t('rewards.totalWithdrawn')}</div>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200/30">
            <CardContent className="p-4 text-center">
              <Timer className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-yellow-600">${rewardsData?.pending || 0}</div>
              <div className="text-xs text-muted-foreground">{t('rewards.pending')}</div>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-br from-honey/15 to-amber-100 dark:from-honey/25 dark:to-amber-800/30 border-honey/30">
            <CardContent className="p-4 text-center">
              <Gift className="h-6 w-6 text-honey mx-auto mb-2" />
              <div className="text-lg font-bold text-honey">${rewardsData?.claimable || 0}</div>
              <div className="text-xs text-muted-foreground">{t('rewards.claimable')}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile-Optimized TabBar Container */}
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: 2x2 Grid */}
          <div className="md:hidden">
            <TabsList className="grid grid-cols-2 gap-2 h-auto bg-transparent p-0">
              <TabsTrigger 
                value="pending" 
                className="flex flex-col items-center gap-2 p-4 h-auto bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-200 dark:border-blue-700/50 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl text-blue-800 dark:text-blue-200"
              >
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">{t('rewards.tabs.pending')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rollup" 
                className="flex flex-col items-center gap-2 p-4 h-auto bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 border border-purple-200 dark:border-purple-700/50 data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-xl text-purple-800 dark:text-purple-200"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-medium">{t('rewards.tabs.rollup')}</span>
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-2 gap-2 h-auto bg-transparent p-0 mt-2">
              <TabsTrigger 
                value="withdrawal" 
                className="flex flex-col items-center gap-2 p-4 h-auto bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 border border-emerald-200 dark:border-emerald-700/50 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl text-emerald-800 dark:text-emerald-200"
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">{t('rewards.tabs.withdrawal')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex flex-col items-center gap-2 p-4 h-auto bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 border border-orange-200 dark:border-orange-700/50 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-xl text-orange-800 dark:text-orange-200"
              >
                <Award className="h-5 w-5" />
                <span className="text-sm font-medium">{t('rewards.tabs.history')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop: Traditional horizontal tabs */}
          <div className="hidden md:block sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-4 lg:mx-0 px-4 lg:px-0 pb-2">
            <TabsList className="grid w-full grid-cols-4 h-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm gap-1 p-1">
              <TabsTrigger value="pending" className="flex items-center gap-2 px-4 py-3 text-sm min-h-[48px] data-[state=active]:bg-honey data-[state=active]:text-white">
                <Clock className="h-4 w-4" />
                <span>{t('rewards.tabs.pending')}</span>
              </TabsTrigger>
              <TabsTrigger value="rollup" className="flex items-center gap-2 px-4 py-3 text-sm min-h-[48px] data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4" />
                <span>{t('rewards.tabs.rollup')}</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="flex items-center gap-2 px-4 py-3 text-sm min-h-[48px] data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                <DollarSign className="h-4 w-4" />
                <span>{t('rewards.tabs.withdrawal')}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 px-4 py-3 text-sm min-h-[48px] data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Award className="h-4 w-4" />
                <span>{t('rewards.tabs.history')}</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Tab Content Container with proper spacing */}
      <div className="pt-4 space-y-6 md:space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-honey" />
                  {t('rewards.pendingCountdowns')}
                  {pendingRewards.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{pendingRewards.length}</Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('rewards.pendingDescription')}
                </p>
              </div>
              
              <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  onClick={claimPendingRewards}
                  disabled={!rewardsData?.claimable || rewardsData.claimable <= 0}
                  size="sm"
                  className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1 xs:flex-none min-h-[40px]"
                  data-testid="button-claim-all"
                >
                  <Gift className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="text-xs md:text-sm">{t('rewards.claimAll')}</span>
                </Button>
                <Button 
                  onClick={loadRewardsData}
                  variant="outline"
                  size="sm"
                  className="border-honey/30 hover:bg-honey/10"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="text-xs md:text-sm">{t('common.refresh')}</span>
                </Button>
              </div>
            </div>

            {/* Pending Rewards List */}
            <PendingRewardsList 
              rewards={pendingRewards}
              onRewardExpired={loadRewardsData}
              variant="compact"
            />
          </div>
        </TabsContent>

        {/* Enhanced Rollup Tab */}
        <TabsContent value="rollup" className="space-y-3 md:space-y-6">
          {/* Premium Rollup Header */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 border-0 shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_70%)]" />
            
            <CardHeader className="relative p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-honey to-amber-500 flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-3 w-3 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm md:text-xl font-bold bg-gradient-to-r from-honey to-amber-500 bg-clip-text text-transparent">
                      {t('rewards.rollup.title')}
                    </span>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                      {t('rewards.rollup.subtitle')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="bg-honey/15 border-honey/30 text-honey font-semibold px-2 md:px-3 py-1 text-xs"
                  >
                    {t('rewards.rollup.autoDistribution') || 'Auto Distribution'}
                  </Badge>
                  <div className="w-2 h-2 rounded-full bg-honey animate-pulse" />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-3 md:p-4 text-center">
                <ArrowUpRight className="h-4 w-4 md:h-6 md:w-6 text-honey mx-auto mb-1 md:mb-2" />
                <div className="text-xs sm:text-sm md:text-lg font-bold text-honey">{t('rewards.rollup.automatic') || 'Automatic'}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.distribution') || 'Distribution'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-3 md:p-4 text-center">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-amber-500 mx-auto mb-1 md:mb-2" />
                <div className="text-xs sm:text-sm md:text-lg font-bold text-amber-500">{t('rewards.rollup.networkBased') || 'Network'}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.based') || 'Based'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-3 md:p-4 text-center">
                <Clock className="h-4 w-4 md:h-6 md:w-6 text-orange-500 mx-auto mb-1 md:mb-2" />
                <div className="text-xs sm:text-sm md:text-lg font-bold text-orange-500">{t('rewards.rollup.realTime') || 'Real-time'}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.tracking') || 'Tracking'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-3 md:p-4 text-center">
                <Shield className="h-4 w-4 md:h-6 md:w-6 text-lime-500 mx-auto mb-1 md:mb-2" />
                <div className="text-xs sm:text-sm md:text-lg font-bold text-lime-500">{t('rewards.rollup.transparent') || 'Transparent'}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.system') || 'System'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Rollup Content */}
          <RollupRewardsCard walletAddress={memberWalletAddress || ''} />
        </TabsContent>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-6">
          <USDTWithdrawal />
        </TabsContent>

        {/* Enhanced History Tab */}
        <TabsContent value="history" className="space-y-6">
          <RewardHistory history={rewardsData?.history || []} />
        </TabsContent>
      </Tabs>
      </div>

      {/* Reward System Information - Premium Expandable Card (moved to bottom) */}
      <RewardSystemInfoCard 
        isExpanded={isRewardInfoExpanded}
        onExpandChange={setIsRewardInfoExpanded}
        className="mt-6"
      />

    </div>
  );
}