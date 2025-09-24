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
    <div className="w-full px-3 md:px-4 lg:container lg:mx-auto py-2 md:py-4 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-honey mb-1 md:mb-2">
            {t('nav.rewards')}
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground">
            {t('rewards.subtitle')}
          </p>
        </div>
      </div>

      {/* Rewards Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <Card className="hover:scale-[1.02] transition-transform duration-200">
          <CardContent className="p-2 md:p-4 text-center">
            <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-honey mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-honey">${rewardsData?.total || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.totalEarned')}</div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-transform duration-200">
          <CardContent className="p-2 md:p-4 text-center">
            <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-amber-500 mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-amber-500">${rewardsData?.totalWithdrawn || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.totalWithdrawn')}</div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-transform duration-200">
          <CardContent className="p-2 md:p-4 text-center">
            <Timer className="h-4 w-4 md:h-6 md:w-6 text-yellow-400 mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-yellow-400">${rewardsData?.pending || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.pending')}</div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-transform duration-200">
          <CardContent className="p-2 md:p-4 text-center">
            <Gift className="h-4 w-4 md:h-6 md:w-6 text-honey mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-honey">${rewardsData?.claimable || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.claimable')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky TabBar Container */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-3 md:-mx-4 lg:mx-0 px-3 md:px-4 lg:px-0 pb-2 mb-3 md:mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto md:h-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm gap-1 p-1">
            <TabsTrigger value="pending" className="flex items-center gap-1 md:gap-2 px-1 sm:px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm min-h-[40px] md:min-h-[48px]">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline sm:inline">{t('rewards.tabs.pending')}</span>
              <span className="xs:hidden sm:hidden text-[10px]">{t('rewards.pending')}</span>
            </TabsTrigger>
            <TabsTrigger value="rollup" className="flex items-center gap-1 md:gap-2 px-1 sm:px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm min-h-[40px] md:min-h-[48px]">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline sm:inline">{t('rewards.tabs.rollup')}</span>
              <span className="xs:hidden sm:hidden text-[10px]">{t('rewards.rollup')}</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="flex items-center gap-1 md:gap-2 px-1 sm:px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm min-h-[40px] md:min-h-[48px]">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline sm:inline">{t('rewards.tabs.withdrawal')}</span>
              <span className="xs:hidden sm:hidden text-[10px]">{t('rewards.withdrawal')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 md:gap-2 px-1 sm:px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm min-h-[40px] md:min-h-[48px]">
              <Award className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline sm:inline">{t('rewards.tabs.history')}</span>
              <span className="xs:hidden sm:hidden text-[10px]">{t('rewards.history')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content Container with proper spacing */}
      <div className="pt-2 space-y-3 md:space-y-6">
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