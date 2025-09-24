import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import RollupRewardsCard from '../components/rewards/RollupRewardsCard';
import USDTWithdrawal from '../components/withdrawal/USDTWithdrawal';
import CountdownTimer from '../components/rewards/CountdownTimer';
import { PendingRewardsList } from '../components/rewards/PendingRewardsList';
import { 
  User, 
  Award, 
  DollarSign, 
  TrendingUp, 
  Settings,
  Timer,
  Coins,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Users,
  Gift,
  Target,
  ArrowUpRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
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
        history: rewardsData?.slice(0, 10).map((reward) => ({
          id: reward.id,
          type: reward.status || 'layer_reward',
          amount: reward.reward_amount || 0,
          currency: 'USDC',
          date: reward.claimed_at || reward.created_at || t('common.unknown'),
          status: reward.status === 'claimed' ? 'completed' : reward.status as 'pending' | 'completed' | 'failed',
          description: `Layer ${reward.triggering_nft_level} reward`
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
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('nav.rewards')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('rewards.subtitle')}
          </p>
        </div>
      </div>

      {/* Rewards Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">${rewardsData?.total || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.totalEarned')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-400">${rewardsData?.totalWithdrawn || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.totalWithdrawn')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">${rewardsData?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.pending')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${rewardsData?.claimable || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.claimable')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reward System Information - Expandable Card */}
      <Collapsible 
        open={isRewardInfoExpanded} 
        onOpenChange={setIsRewardInfoExpanded}
        className="w-full"
      >
        <Card className="bg-gradient-to-r from-honey/5 to-orange-500/5 border-honey/20 shadow-lg">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-honey/5 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-honey" />
                  <span className="text-lg font-semibold">{t('rewards.rewardSystemInfo')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-honey/10 border-honey/30 text-honey">
                    {t('rewards.learnMore')}
                  </Badge>
                  {isRewardInfoExpanded ? (
                    <ChevronUp className="h-5 w-5 text-honey" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-honey" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-honey flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    {t('rewards.matrixRewardsTitle')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('rewards.rewards.level1Direct')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('rewards.rewards.level2Matrix')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('rewards.rewards.spilloverBonuses')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{t('rewards.rewards.claimWindow')}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-honey flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>{t('rewards.bccTransferable')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>{t('rewards.bccLocked')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      <span>{t('rewards.bccMultipliers')}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span>{t('rewards.bccUpgrades')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('rewards.tabs.pending')}</span>
            <span className="sm:hidden">{t('rewards.pending')}</span>
          </TabsTrigger>
          <TabsTrigger value="rollup" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('rewards.tabs.rollup')}</span>
            <span className="sm:hidden">{t('rewards.rollup')}</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawal" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('rewards.tabs.withdrawal')}</span>
            <span className="sm:hidden">{t('rewards.withdrawal')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">{t('rewards.tabs.history')}</span>
            <span className="sm:hidden">{t('rewards.history')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={claimPendingRewards}
                  disabled={!rewardsData?.claimable || rewardsData.claimable <= 0}
                  className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1 sm:flex-none"
                  data-testid="button-claim-all"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {t('rewards.claimAll')}
                </Button>
                <Button 
                  onClick={loadRewardsData}
                  variant="outline"
                  className="border-honey/30 hover:bg-honey/10"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('common.refresh')}
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

        {/* Rollup Tab */}
        <TabsContent value="rollup" className="space-y-6">
          <RollupRewardsCard walletAddress={memberWalletAddress || ''} />
        </TabsContent>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-6">
          <USDTWithdrawal />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-400" />
                {t('rewards.recentRewards')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewardsData?.history && rewardsData.history.length > 0 ? (
                <div className="space-y-3">
                  {rewardsData.history.map((reward) => (
                    <div 
                      key={reward.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="font-medium text-sm">{reward.description}</div>
                          <div className="text-xs text-muted-foreground">{reward.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-honey">{reward.amount} {reward.currency}</div>
                        <Badge 
                          variant="outline" 
                          className={
                            reward.status === 'completed' ? 'text-green-400 border-green-400/30' :
                            reward.status === 'pending' ? 'text-yellow-400 border-yellow-400/30' :
                            'text-red-400 border-red-400/30'
                          }
                        >
                          {reward.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('rewards.noHistory')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}