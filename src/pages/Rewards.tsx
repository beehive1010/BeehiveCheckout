import React, {useCallback, useEffect, useState} from 'react';
import {useWallet} from '../hooks/useWallet';
import {useI18n} from '../contexts/I18nContext';
import {useLocation} from 'wouter';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../components/ui/tabs';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '../components/ui/collapsible';
import {useToast} from '../hooks/use-toast';
import {supabase} from '../lib/supabase';
import RollupRewardsCard from '../components/rewards/RollupRewardsCard';
import USDTWithdrawal from '../components/withdrawal/USDTWithdrawal';
import {PendingRewardsList} from '../components/rewards/PendingRewardsList';
import RewardHistory from '../components/rewards/RewardHistory';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Award,
    BarChart3,
    ChevronDown,
    Clock,
    DollarSign,
    Gift,
    RefreshCw,
    Shield,
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
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
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
    <div className="w-full px-4 sm:px-6 lg:container lg:mx-auto py-2 sm:py-4 space-y-1 sm:space-y-2 animate-in fade-in-50 duration-700">
      {/* Enhanced Header */}
      <div className="text-center sm:text-left mb-1 sm:mb-2 animate-in slide-in-from-top-2 duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-honey/20 to-amber-400/20 rounded-2xl blur-xl animate-pulse"></div>
          <h1 className="relative text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-honey via-amber-400 to-honey bg-clip-text text-transparent mb-2 sm:mb-3">
            {t('nav.rewards')}
          </h1>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto sm:mx-0">
          {t('rewards.subtitle')}
        </p>
      </div>

      {/* Enhanced Collapsible Stats Overview */}
      <Collapsible open={isOverviewOpen} onOpenChange={setIsOverviewOpen} className="mb-1 animate-in slide-in-from-bottom-2 duration-500">
        <CollapsibleTrigger className="w-full">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 dark:from-black dark:via-slate-950 dark:to-black rounded-xl border-2 border-slate-700 dark:border-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 hover:border-honey/50 transition-all duration-500 cursor-pointer shadow-2xl hover:shadow-3xl hover:shadow-honey/20 group hover:scale-[1.02] transform">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-honey via-amber-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-honey/50 group-hover:scale-110 transition-all duration-500">
                  <BarChart3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-black drop-shadow-sm" />
                </div>
                <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-honey to-amber-400 bg-clip-text text-transparent drop-shadow-sm tracking-wide">
                  {t('rewards.overview') || 'Rewards Overview'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="bg-gradient-to-r from-honey/90 to-amber-400 px-2.5 py-1 rounded-full shadow-lg transform group-hover:scale-105 transition-all duration-300">
                  <span className="text-xs sm:text-sm font-bold text-black drop-shadow-sm whitespace-nowrap">
                    ${rewardsData?.claimable || 0} {t('rewards.available_to_claim') || 'Available to Claim'}
                  </span>
                </div>
                <div className="bg-honey/20 hover:bg-honey/30 rounded-full p-1 transition-all duration-300">
                  <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-honey transition-all duration-500 group-hover:scale-110 ${isOverviewOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 dark:from-black dark:via-gray-950 dark:to-black rounded-2xl border-2 border-gray-700 dark:border-gray-800 p-3 sm:p-4 mt-3 shadow-3xl animate-in slide-in-from-top-2 duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-40"></div>
            <div className="relative grid grid-cols-2 gap-2 sm:gap-3">
              <div className="group relative overflow-hidden p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-honey/20 hover:via-honey/10 hover:to-amber-400/20 border-2 border-honey/30 hover:border-honey/60 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-honey/30 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-30 group-hover:opacity-70 transition-opacity duration-300"></div>
                <div className="relative text-center space-y-1">
                  <div className="w-8 h-8 mx-auto bg-gradient-to-br from-honey/60 via-honey to-amber-400 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <TrendingUp className="h-4 w-4 text-black" />
                  </div>
                  <p className="text-xs font-semibold text-honey group-hover:text-amber-300 uppercase tracking-wide">
                    {t('rewards.overview.totalEarned') || 'Total Earned'}
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-honey group-hover:text-amber-300 transition-colors duration-300">
                    ${rewardsData?.total || 0}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-honey/50 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-honey/20 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center space-y-1">
                  <div className="w-8 h-8 mx-auto bg-gradient-to-br from-gray-500 via-gray-400 to-gray-500 group-hover:from-honey/80 group-hover:via-honey group-hover:to-amber-400 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <ArrowDownLeft className="h-4 w-4 text-white group-hover:text-black transition-colors duration-300" />
                  </div>
                  <p className="text-xs font-semibold text-gray-100 group-hover:text-gray-200 uppercase tracking-wide">
                    {t('rewards.overview.totalWithdrawn') || 'Total Withdrawn'}
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-white group-hover:text-honey transition-colors duration-300">
                    ${rewardsData?.totalWithdrawn || 0}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-honey/50 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-honey/20 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center space-y-1">
                  <div className="w-8 h-8 mx-auto bg-gradient-to-br from-gray-500 via-gray-400 to-gray-500 group-hover:from-honey/80 group-hover:via-honey group-hover:to-amber-400 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <Clock className="h-4 w-4 text-white group-hover:text-black transition-colors duration-300" />
                  </div>
                  <p className="text-xs font-semibold text-gray-100 group-hover:text-gray-200 uppercase tracking-wide">
                    {t('rewards.overview.pending') || 'Pending'}
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-white group-hover:text-honey transition-colors duration-300">
                    ${rewardsData?.pending || 0}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-honey/20 hover:via-honey/10 hover:to-amber-400/20 border-2 border-honey/40 hover:border-honey/70 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-honey/40 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/10 via-transparent to-amber-400/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center space-y-1">
                  <div className="w-8 h-8 mx-auto bg-gradient-to-br from-honey/70 via-honey to-amber-400 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Gift className="h-4 w-4 text-black" />
                  </div>
                  <p className="text-xs font-semibold text-honey group-hover:text-amber-300 uppercase tracking-wide">
                    {t('rewards.overview.claimable') || 'Claimable'}
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-honey group-hover:text-amber-300">
                    ${rewardsData?.claimable || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Enhanced Unified Tab Navigation and Content Container */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl animate-in slide-in-from-bottom-3 duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-50"></div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="relative w-full">
          {/* Enhanced Header with Description */}
          <div className="p-4 sm:p-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-honey to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                <Award className="h-3 w-3 text-black" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-700 to-gray-800 dark:from-slate-200 dark:to-gray-100 bg-clip-text text-transparent">
                {t('rewards.management')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t('rewards.selectCategory')}
            </p>
          </div>
          {/* Enhanced Mobile: 3D Button Style Tabs */}
          <div className="lg:hidden p-4 sm:p-6">
            <TabsList className="grid grid-cols-2 gap-3 sm:gap-4 h-auto bg-transparent p-0">
              <TabsTrigger 
                value="pending" 
                className="group relative overflow-hidden flex flex-col items-center gap-3 p-4 h-auto bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950/30 dark:via-blue-900/40 dark:to-blue-950/30 hover:from-blue-100 hover:via-blue-200 hover:to-blue-100 dark:hover:from-blue-900/50 dark:hover:via-blue-800/60 dark:hover:to-blue-900/50 border-2 border-blue-200 dark:border-blue-700 data-[state=active]:from-blue-500 data-[state=active]:via-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600 rounded-2xl text-blue-800 dark:text-blue-200 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 data-[state=active]:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-white/90 dark:bg-blue-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="relative text-xs font-bold text-center leading-tight">{t('rewards.tabs.pending')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rollup" 
                className="group relative overflow-hidden flex flex-col items-center gap-3 p-4 h-auto bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 dark:from-purple-950/30 dark:via-purple-900/40 dark:to-purple-950/30 hover:from-purple-100 hover:via-purple-200 hover:to-purple-100 dark:hover:from-purple-900/50 dark:hover:via-purple-800/60 dark:hover:to-purple-900/50 border-2 border-purple-200 dark:border-purple-700 data-[state=active]:from-purple-500 data-[state=active]:via-purple-600 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:border-purple-600 rounded-2xl text-purple-800 dark:text-purple-200 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 data-[state=active]:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-white/90 dark:bg-purple-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="relative text-xs font-bold text-center leading-tight">{t('rewards.tabs.rollup')}</span>
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-2 gap-3 sm:gap-4 h-auto bg-transparent p-0 mt-4">
              <TabsTrigger 
                value="withdrawal" 
                className="group relative overflow-hidden flex flex-col items-center gap-3 p-4 h-auto bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:via-emerald-900/40 dark:to-emerald-950/30 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-100 dark:hover:from-emerald-900/50 dark:hover:via-emerald-800/60 dark:hover:to-emerald-900/50 border-2 border-emerald-200 dark:border-emerald-700 data-[state=active]:from-emerald-500 data-[state=active]:via-emerald-600 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:border-emerald-600 rounded-2xl text-emerald-800 dark:text-emerald-200 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 data-[state=active]:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-white/90 dark:bg-emerald-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="relative text-xs font-bold text-center leading-tight">{t('rewards.tabs.withdrawal')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="group relative overflow-hidden flex flex-col items-center gap-3 p-4 h-auto bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-orange-950/30 dark:via-orange-900/40 dark:to-orange-950/30 hover:from-orange-100 hover:via-orange-200 hover:to-orange-100 dark:hover:from-orange-900/50 dark:hover:via-orange-800/60 dark:hover:to-orange-900/50 border-2 border-orange-200 dark:border-orange-700 data-[state=active]:from-orange-500 data-[state=active]:via-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600 rounded-2xl text-orange-800 dark:text-orange-200 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 data-[state=active]:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-white/90 dark:bg-orange-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-5 w-5" />
                </div>
                <span className="relative text-xs font-bold text-center leading-tight">{t('rewards.tabs.history')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Enhanced Desktop: 3D Button Style Tabs */}
          <div className="hidden lg:block p-4 sm:p-6">
            <TabsList className="grid w-full grid-cols-4 h-auto bg-gradient-to-r from-gray-900 via-black to-gray-900 dark:from-black dark:via-gray-950 dark:to-black gap-3 p-3 rounded-2xl border-2 border-gray-700 dark:border-gray-800 shadow-2xl">
              <TabsTrigger value="pending" className="group relative overflow-hidden flex items-center justify-center gap-3 px-4 py-3 text-sm min-h-[60px] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-gray-500 data-[state=active]:from-honey/90 data-[state=active]:via-honey data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:border-honey rounded-xl text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.2)] data-[state=active]:shadow-[inset_0_2px_0_rgba(251,191,36,0.4),inset_0_-2px_0_rgba(251,191,36,0.6),0_4px_16px_rgba(251,191,36,0.3),0_12px_32px_rgba(251,191,36,0.2)] transform hover:scale-[1.02] hover:-translate-y-0.5 data-[state=active]:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-8 h-8 bg-gray-600 group-hover:bg-gray-500 group-data-[state=active]:bg-black/20 rounded-full flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-all duration-300">
                  <Clock className="h-4 w-4 text-gray-200 group-hover:text-white group-data-[state=active]:text-honey" />
                </div>
                <span className="relative font-bold text-xs sm:text-sm lg:text-base">{t('rewards.tabs.pending')}</span>
              </TabsTrigger>
              <TabsTrigger value="rollup" className="group relative overflow-hidden flex items-center justify-center gap-3 px-4 py-3 text-sm min-h-[60px] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-gray-500 data-[state=active]:from-honey/90 data-[state=active]:via-honey data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:border-honey rounded-xl text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.2)] data-[state=active]:shadow-[inset_0_2px_0_rgba(251,191,36,0.4),inset_0_-2px_0_rgba(251,191,36,0.6),0_4px_16px_rgba(251,191,36,0.3),0_12px_32px_rgba(251,191,36,0.2)] transform hover:scale-[1.02] hover:-translate-y-0.5 data-[state=active]:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-8 h-8 bg-gray-600 group-hover:bg-gray-500 group-data-[state=active]:bg-black/20 rounded-full flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="h-4 w-4 text-gray-200 group-hover:text-white group-data-[state=active]:text-honey" />
                </div>
                <span className="relative font-bold text-xs sm:text-sm lg:text-base">{t('rewards.tabs.rollup')}</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="group relative overflow-hidden flex items-center justify-center gap-3 px-4 py-3 text-sm min-h-[60px] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-gray-500 data-[state=active]:from-honey/90 data-[state=active]:via-honey data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:border-honey rounded-xl text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.2)] data-[state=active]:shadow-[inset_0_2px_0_rgba(251,191,36,0.4),inset_0_-2px_0_rgba(251,191,36,0.6),0_4px_16px_rgba(251,191,36,0.3),0_12px_32px_rgba(251,191,36,0.2)] transform hover:scale-[1.02] hover:-translate-y-0.5 data-[state=active]:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-8 h-8 bg-gray-600 group-hover:bg-gray-500 group-data-[state=active]:bg-black/20 rounded-full flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-all duration-300">
                  <DollarSign className="h-4 w-4 text-gray-200 group-hover:text-white group-data-[state=active]:text-honey" />
                </div>
                <span className="relative font-bold text-xs sm:text-sm lg:text-base">{t('rewards.tabs.withdrawal')}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="group relative overflow-hidden flex items-center justify-center gap-3 px-4 py-3 text-sm min-h-[60px] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-600 hover:to-gray-700 border-2 border-gray-600 hover:border-gray-500 data-[state=active]:from-honey/90 data-[state=active]:via-honey data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:border-honey rounded-xl text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.2)] data-[state=active]:shadow-[inset_0_2px_0_rgba(251,191,36,0.4),inset_0_-2px_0_rgba(251,191,36,0.6),0_4px_16px_rgba(251,191,36,0.3),0_12px_32px_rgba(251,191,36,0.2)] transform hover:scale-[1.02] hover:-translate-y-0.5 data-[state=active]:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/8 via-transparent to-amber-400/8 opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-8 h-8 bg-gray-600 group-hover:bg-gray-500 group-data-[state=active]:bg-black/20 rounded-full flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-all duration-300">
                  <Award className="h-4 w-4 text-gray-200 group-hover:text-white group-data-[state=active]:text-honey" />
                </div>
                <span className="relative font-bold text-xs sm:text-sm lg:text-base">{t('rewards.tabs.history')}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Enhanced Content Area with visual separation */}
          <div className="border-t-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50/80 via-gray-50/50 to-slate-50/80 dark:from-slate-800/30 dark:via-slate-750/30 dark:to-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-b-2xl">

        {/* Enhanced Pending Tab */}
        <TabsContent value="pending" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            {/* Enhanced Quick Actions */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-between items-start lg:items-center">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-honey/20 to-amber-400/20">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-honey" />
                  </div>
                  <span className="bg-gradient-to-r from-slate-700 to-gray-800 dark:from-slate-200 dark:to-gray-100 bg-clip-text text-transparent">
                    {t('rewards.pendingCountdowns')}
                  </span>
                  {pendingRewards.length > 0 && (
                    <Badge className="bg-honey text-black font-bold px-2 sm:px-3 py-1 rounded-full animate-pulse shadow-lg text-xs sm:text-sm">{pendingRewards.length}</Badge>
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  {t('rewards.pendingDescription')}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Button 
                  onClick={claimPendingRewards}
                  disabled={!rewardsData?.claimable || rewardsData.claimable <= 0}
                  className="group relative overflow-hidden bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 min-h-[48px] flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  data-testid="button-claim-all"
                >
                  <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <Gift className="h-4 w-4 group-hover:animate-bounce" />
                    <span>{t('rewards.claimAll')}</span>
                  </div>
                </Button>
                <Button 
                  onClick={loadRewardsData}
                  variant="outline"
                  className="group relative overflow-hidden border-2 border-honey/30 hover:border-honey/50 hover:bg-honey/10 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 min-h-[48px] flex-1 sm:flex-none"
                  data-testid="button-refresh"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-honey/5 to-amber-400/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="font-semibold">{t('common.refresh')}</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Enhanced Pending Rewards List */}
            <div className="animate-in slide-in-from-left-2 duration-700">
              <PendingRewardsList 
                rewards={pendingRewards}
                onRewardExpired={loadRewardsData}
                variant="compact"
              />
            </div>
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
          </div>
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