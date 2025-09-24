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
    ArrowDownLeft,
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

      {/* Stats Overview - Compact Information Display */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 md:p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 md:w-6 md:h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
            {t('rewards.overview.title')}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-600">
            <div className="w-6 h-6 md:w-8 md:h-8 mx-auto bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mb-1">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('rewards.overview.totalEarned')}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              ${rewardsData?.total || 0}
            </p>
          </div>

          <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-600">
            <div className="w-6 h-6 md:w-8 md:h-8 mx-auto bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mb-1">
              <ArrowDownLeft className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('rewards.overview.totalWithdrawn')}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              ${rewardsData?.totalWithdrawn || 0}
            </p>
          </div>

          <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-600">
            <div className="w-6 h-6 md:w-8 md:h-8 mx-auto bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('rewards.overview.pending')}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              ${rewardsData?.pending || 0}
            </p>
          </div>

          <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-600">
            <div className="w-6 h-6 md:w-8 md:h-8 mx-auto bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-1">
              <Gift className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('rewards.overview.claimable')}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              ${rewardsData?.claimable || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Action Navigation - Clear Separation from Stats */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {t('rewards.sections.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('rewards.sections.description')}
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: 3D Button Style Tabs */}
          <div className="md:hidden">
            <TabsList className="grid grid-cols-2 gap-4 h-auto bg-transparent p-0">
              <TabsTrigger 
                value="pending" 
                className="group relative flex flex-col items-center gap-3 p-5 h-auto bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/60 dark:hover:to-blue-700/60 border-2 border-blue-300 dark:border-blue-600 data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:border-blue-700 rounded-xl text-blue-800 dark:text-blue-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div className="w-10 h-10 bg-white/80 dark:bg-blue-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-center">{t('rewards.tabs.pending')}</span>
                <div className="text-xs opacity-75">点击查看</div>
              </TabsTrigger>
              <TabsTrigger 
                value="rollup" 
                className="group relative flex flex-col items-center gap-3 p-5 h-auto bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/60 dark:hover:to-purple-700/60 border-2 border-purple-300 dark:border-purple-600 data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:border-purple-700 rounded-xl text-purple-800 dark:text-purple-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div className="w-10 h-10 bg-white/80 dark:bg-purple-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-center">{t('rewards.tabs.rollup')}</span>
                <div className="text-xs opacity-75">点击查看</div>
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-2 gap-4 h-auto bg-transparent p-0 mt-4">
              <TabsTrigger 
                value="withdrawal" 
                className="group relative flex flex-col items-center gap-3 p-5 h-auto bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-800/60 dark:hover:to-emerald-700/60 border-2 border-emerald-300 dark:border-emerald-600 data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white data-[state=active]:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div className="w-10 h-10 bg-white/80 dark:bg-emerald-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-center">{t('rewards.tabs.withdrawal')}</span>
                <div className="text-xs opacity-75">点击查看</div>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="group relative flex flex-col items-center gap-3 p-5 h-auto bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/60 dark:hover:to-orange-700/60 border-2 border-orange-300 dark:border-orange-600 data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white data-[state=active]:border-orange-700 rounded-xl text-orange-800 dark:text-orange-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div className="w-10 h-10 bg-white/80 dark:bg-orange-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-center">{t('rewards.tabs.history')}</span>
                <div className="text-xs opacity-75">点击查看</div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop: 3D Button Style Tabs */}
          <div className="hidden md:block">
            <TabsList className="grid w-full grid-cols-4 h-auto bg-gray-100 dark:bg-gray-800 gap-3 p-3 rounded-xl border border-gray-300 dark:border-gray-600 shadow-inner">
              <TabsTrigger value="pending" className="group relative flex items-center justify-center gap-3 px-6 py-4 text-sm min-h-[64px] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/60 dark:hover:to-blue-700/60 border-2 border-blue-300 dark:border-blue-600 data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:border-blue-700 rounded-lg text-blue-800 dark:text-blue-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer">
                <div className="w-8 h-8 bg-white/60 dark:bg-blue-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="font-bold">{t('rewards.tabs.pending')}</span>
              </TabsTrigger>
              <TabsTrigger value="rollup" className="group relative flex items-center justify-center gap-3 px-6 py-4 text-sm min-h-[64px] bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/60 dark:hover:to-purple-700/60 border-2 border-purple-300 dark:border-purple-600 data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:border-purple-700 rounded-lg text-purple-800 dark:text-purple-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer">
                <div className="w-8 h-8 bg-white/60 dark:bg-purple-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="font-bold">{t('rewards.tabs.rollup')}</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="group relative flex items-center justify-center gap-3 px-6 py-4 text-sm min-h-[64px] bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-800/60 dark:hover:to-emerald-700/60 border-2 border-emerald-300 dark:border-emerald-600 data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white data-[state=active]:border-emerald-700 rounded-lg text-emerald-800 dark:text-emerald-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer">
                <div className="w-8 h-8 bg-white/60 dark:bg-emerald-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="font-bold">{t('rewards.tabs.withdrawal')}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="group relative flex items-center justify-center gap-3 px-6 py-4 text-sm min-h-[64px] bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/60 dark:hover:to-orange-700/60 border-2 border-orange-300 dark:border-orange-600 data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white data-[state=active]:border-orange-700 rounded-lg text-orange-800 dark:text-orange-200 shadow-[0_4px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] data-[state=active]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer">
                <div className="w-8 h-8 bg-white/60 dark:bg-orange-900/50 group-data-[state=active]:bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  <Award className="h-4 w-4" />
                </div>
                <span className="font-bold">{t('rewards.tabs.history')}</span>
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