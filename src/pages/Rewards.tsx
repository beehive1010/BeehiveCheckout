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
import RewardHistory from '../components/rewards/RewardHistory';
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
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield
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
            <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-green-400 mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-green-400">${rewardsData?.total || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.totalEarned')}</div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-transform duration-200">
          <CardContent className="p-2 md:p-4 text-center">
            <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-purple-400 mx-auto mb-1 md:mb-2" />
            <div className="text-sm md:text-lg font-bold text-purple-400">${rewardsData?.totalWithdrawn || 0}</div>
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

        <Card className="relative overflow-hidden bg-gradient-to-br from-honey/8 via-orange-500/8 to-amber-500/8 border-0 shadow-2xl shadow-honey/10">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.1),transparent_70%)]" />
          
          <CollapsibleTrigger asChild>
            <CardHeader className="relative cursor-pointer hover:bg-white/5 dark:hover:bg-black/5 transition-all duration-300 group rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-honey to-orange-500 bg-clip-text text-transparent">
                      {t('rewards.rewardSystemInfo')}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                      {t('rewards.rewardSystemSubtitle') || 'Understanding the complete reward ecosystem'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className="bg-honey/15 border-honey/30 text-honey font-semibold px-3 py-1 hover:bg-honey/25 transition-colors"
                  >
                    {t('rewards.learnMore')}
                  </Badge>
                  <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center group-hover:bg-honey/30 transition-colors">
                    {isRewardInfoExpanded ? (
                      <ChevronUp className="h-4 w-4 text-honey" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-honey" />
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="relative pt-0 pb-8">
              {/* Desktop Layout - Grid */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-8">
                {/* Matrix Rewards Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {t('rewards.matrixRewardsTitle')}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'level1Direct', color: 'emerald', icon: '🎯' },
                      { key: 'level2Matrix', color: 'blue', icon: '🌐' },
                      { key: 'spilloverBonuses', color: 'purple', icon: '⚡' },
                      { key: 'claimWindow', color: 'orange', icon: '⏰' }
                    ].map((item, index) => (
                      <div 
                        key={item.key}
                        className={`group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-${item.color}-50/50 to-${item.color}-100/50 dark:from-${item.color}-900/20 dark:to-${item.color}-800/20 border border-${item.color}-200/50 dark:border-${item.color}-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: isRewardInfoExpanded ? 'slideInFromLeft 0.5s ease-out forwards' : 'none'
                        }}
                      >
                        <div className="text-xl">{item.icon}</div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {t(`rewards.rewards.${item.key}`)}
                          </span>
                        </div>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 group-hover:scale-125 transition-transform duration-300`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* BCC Token Rewards Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'bccTransferable', color: 'yellow', icon: '💰' },
                      { key: 'bccLocked', color: 'red', icon: '🔒' },
                      { key: 'bccMultipliers', color: 'teal', icon: '📈' },
                      { key: 'bccUpgrades', color: 'indigo', icon: '🚀' }
                    ].map((item, index) => (
                      <div 
                        key={item.key}
                        className={`group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-${item.color}-50/50 to-${item.color}-100/50 dark:from-${item.color}-900/20 dark:to-${item.color}-800/20 border border-${item.color}-200/50 dark:border-${item.color}-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                        style={{
                          animationDelay: `${(index + 4) * 100}ms`,
                          animation: isRewardInfoExpanded ? 'slideInFromRight 0.5s ease-out forwards' : 'none'
                        }}
                      >
                        <div className="text-xl">{item.icon}</div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {t(`rewards.${item.key}`)}
                          </span>
                        </div>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 group-hover:scale-125 transition-transform duration-300`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Layout - Compact Tabs */}
              <div className="lg:hidden">
                {/* Tab Selector */}
                <div className="flex mb-4 bg-muted/30 rounded-lg p-1">
                  <button 
                    onClick={() => setMobileRewardTab('matrix')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      mobileRewardTab === 'matrix' 
                        ? 'bg-emerald-500/20 text-emerald-600 shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Gift className="h-4 w-4" />
                    Matrix
                  </button>
                  <button 
                    onClick={() => setMobileRewardTab('bcc')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      mobileRewardTab === 'bcc' 
                        ? 'bg-honey/20 text-honey shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    BCC
                  </button>
                </div>

                {/* Content */}
                <div className="min-h-[240px]">
                  {mobileRewardTab === 'matrix' && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Gift className="h-3 w-3 text-white" />
                        </div>
                        <h4 className="font-semibold text-foreground">
                          {t('rewards.matrixRewardsTitle')}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'level1Direct', bgClass: 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200/50 dark:border-emerald-700/50', dotClass: 'bg-gradient-to-r from-emerald-400 to-emerald-600', icon: '🎯' },
                          { key: 'level2Matrix', bgClass: 'bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-700/50', dotClass: 'bg-gradient-to-r from-blue-400 to-blue-600', icon: '🌐' },
                          { key: 'spilloverBonuses', bgClass: 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50 dark:border-purple-700/50', dotClass: 'bg-gradient-to-r from-purple-400 to-purple-600', icon: '⚡' },
                          { key: 'claimWindow', bgClass: 'bg-gradient-to-br from-orange-50/50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200/50 dark:border-orange-700/50', dotClass: 'bg-gradient-to-r from-orange-400 to-orange-600', icon: '⏰' }
                        ].map((item, index) => (
                          <div 
                            key={item.key}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${item.bgClass}`}
                          >
                            <div className="text-2xl">{item.icon}</div>
                            <span className="text-xs font-medium text-center text-foreground leading-tight">
                              {t(`rewards.rewards.${item.key}`)}
                            </span>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.dotClass}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mobileRewardTab === 'bcc' && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                          <Coins className="h-3 w-3 text-white" />
                        </div>
                        <h4 className="font-semibold text-foreground">
                          {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'bccTransferable', bgClass: 'bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200/50 dark:border-yellow-700/50', dotClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600', icon: '💰' },
                          { key: 'bccLocked', bgClass: 'bg-gradient-to-br from-red-50/50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-red-200/50 dark:border-red-700/50', dotClass: 'bg-gradient-to-r from-red-400 to-red-600', icon: '🔒' },
                          { key: 'bccMultipliers', bgClass: 'bg-gradient-to-br from-teal-50/50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200/50 dark:border-teal-700/50', dotClass: 'bg-gradient-to-r from-teal-400 to-teal-600', icon: '📈' },
                          { key: 'bccUpgrades', bgClass: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200/50 dark:border-indigo-700/50', dotClass: 'bg-gradient-to-r from-indigo-400 to-indigo-600', icon: '🚀' }
                        ].map((item, index) => (
                          <div 
                            key={item.key}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${item.bgClass}`}
                          >
                            <div className="text-2xl">{item.icon}</div>
                            <span className="text-xs font-medium text-center text-foreground leading-tight">
                              {t(`rewards.${item.key}`)}
                            </span>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.dotClass}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-8 pt-6 border-t border-honey/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-honey animate-pulse" />
                    <span>{t('rewards.systemActive') || 'Reward system active and processing'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                      <span className="text-xs">{t('rewards.viewDetails') || 'View Details'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                      <span className="text-xs">{t('rewards.howItWorks') || 'How It Works'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sticky TabBar Container */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-3 md:-mx-4 lg:mx-0 px-3 md:px-4 lg:px-0 pb-2 mb-3 md:mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 md:h-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <TabsTrigger value="pending" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('rewards.tabs.pending')}</span>
              <span className="sm:hidden">{t('rewards.pending')}</span>
            </TabsTrigger>
            <TabsTrigger value="rollup" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('rewards.tabs.rollup')}</span>
              <span className="sm:hidden">{t('rewards.rollup')}</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('rewards.tabs.withdrawal')}</span>
              <span className="sm:hidden">{t('rewards.withdrawal')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm">
              <Award className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('rewards.tabs.history')}</span>
              <span className="sm:hidden">{t('rewards.history')}</span>
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
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={claimPendingRewards}
                  disabled={!rewardsData?.claimable || rewardsData.claimable <= 0}
                  size="sm"
                  className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1 sm:flex-none"
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.1),transparent_70%)]" />
            
            <CardHeader className="relative p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-3 w-3 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm md:text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
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
                    className="bg-orange-500/15 border-orange-500/30 text-orange-500 font-semibold px-2 md:px-3 py-1 text-xs"
                  >
                    {t('rewards.rollup.autoDistribution') || 'Auto Distribution'}
                  </Badge>
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-2 md:p-4 text-center">
                <ArrowUpRight className="h-4 w-4 md:h-6 md:w-6 text-orange-400 mx-auto mb-1 md:mb-2" />
                <div className="text-sm md:text-lg font-bold text-orange-400">{t('rewards.rollup.automatic') || 'Automatic'}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.distribution') || 'Distribution'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-2 md:p-4 text-center">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-blue-400 mx-auto mb-1 md:mb-2" />
                <div className="text-sm md:text-lg font-bold text-blue-400">{t('rewards.rollup.networkBased') || 'Network'}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.based') || 'Based'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-2 md:p-4 text-center">
                <Clock className="h-4 w-4 md:h-6 md:w-6 text-purple-400 mx-auto mb-1 md:mb-2" />
                <div className="text-sm md:text-lg font-bold text-purple-400">{t('rewards.rollup.realTime') || 'Real-time'}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.tracking') || 'Tracking'}</div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.02] transition-transform duration-200">
              <CardContent className="p-2 md:p-4 text-center">
                <Shield className="h-4 w-4 md:h-6 md:w-6 text-green-400 mx-auto mb-1 md:mb-2" />
                <div className="text-sm md:text-lg font-bold text-green-400">{t('rewards.rollup.transparent') || 'Transparent'}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{t('rewards.rollup.system') || 'System'}</div>
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
                    </div>

                    {/* Results Summary */}
                    <div className="text-xs text-muted-foreground text-center">
                      {t('rewards.history.showing') || 'Showing'} {Math.min(paginatedHistory.length, itemsPerPage)} {t('rewards.history.of') || 'of'} {filteredHistory.length} {t('rewards.history.results') || 'results'}
                    </div>

                    {/* History List */}
                    <div className="space-y-3">
                      {paginatedHistory.length > 0 ? paginatedHistory.map((reward, index) => (
                        <Card 
                          key={reward.id} 
                          className="border border-border/50 hover:border-emerald-500/30 transition-all duration-300"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  reward.status === 'completed' 
                                    ? 'bg-green-500' :
                                  reward.status === 'pending' 
                                    ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}>
                                  {reward.status === 'completed' ? (
                                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  ) : reward.status === 'pending' ? (
                                    <Clock className="h-3 w-3 text-white" />
                                  ) : (
                                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm text-foreground line-clamp-1">
                                    {reward.description}
                                  </h5>
                                  <p className="text-xs text-muted-foreground">
                                    {reward.date}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-lg font-bold text-honey">
                                  {reward.amount}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    reward.status === 'completed' 
                                      ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                                    reward.status === 'pending' 
                                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                      'bg-red-500/10 border-red-500/30 text-red-500'
                                  }`}
                                >
                                  {reward.status === 'completed' ? t('rewards.status.completed') || 'Completed' :
                                   reward.status === 'pending' ? t('rewards.status.pending') || 'Pending' :
                                   t('rewards.status.failed') || 'Failed'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Mobile Progress Bar */}
                            <div className="w-full bg-muted/50 rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full transition-all duration-500 ${
                                  reward.status === 'completed' 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' :
                                  reward.status === 'pending' 
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 w-2/3' :
                                    'bg-gradient-to-r from-red-500 to-red-600 w-1/3'
                                }`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <div className="text-center py-8">
                          <div className="text-muted-foreground mb-2">
                            {t('rewards.history.noFilteredResults') || 'No transactions match your filters'}
                          </div>
                          <button
                            onClick={() => setHistoryFilters({ layer: '', searchKeyword: '', dateFrom: '', dateTo: '', status: '' })}
                            className="text-xs text-emerald-500 hover:text-emerald-600 underline"
                          >
                            {t('rewards.history.clearFilters') || 'Clear Filters'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 pt-3">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded-md border border-border bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 text-xs rounded-md border ${
                                  currentPage === page
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-background border-border hover:bg-muted'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded-md border border-border bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Enhanced Empty State */
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <Award className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t('rewards.noHistory')}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {t('rewards.noHistoryDescription') || 'Your reward transactions will appear here once you start earning through the matrix system.'}
                  </p>
                  <Button variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
                    {t('rewards.startEarning') || 'Start Earning Rewards'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Reward System Information - Premium Expandable Card (moved to bottom) */}
      <Collapsible 
        open={isRewardInfoExpanded} 
        onOpenChange={setIsRewardInfoExpanded}
        className="w-full mt-6"
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-honey/8 via-orange-500/8 to-amber-500/8 border-0 shadow-2xl shadow-honey/10">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.1),transparent_70%)]" />
          
          <CollapsibleTrigger asChild>
            <CardHeader className="relative cursor-pointer hover:bg-white/5 dark:hover:bg-black/5 transition-all duration-300 group rounded-t-lg p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Info className="h-3 w-3 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm md:text-xl font-bold bg-gradient-to-r from-honey to-orange-500 bg-clip-text text-transparent">
                      {t('rewards.rewardSystemInfo')}
                    </span>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                      {t('rewards.rewardSystemSubtitle') || 'Understanding the complete reward ecosystem'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <Badge 
                    variant="outline" 
                    className="bg-honey/15 border-honey/30 text-honey font-semibold px-2 md:px-3 py-1 text-xs hover:bg-honey/25 transition-colors hidden sm:flex"
                  >
                    {t('rewards.learnMore')}
                  </Badge>
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-honey/20 flex items-center justify-center group-hover:bg-honey/30 transition-colors">
                    {isRewardInfoExpanded ? (
                      <ChevronUp className="h-3 w-3 md:h-4 md:w-4 text-honey" />
                    ) : (
                      <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-honey" />
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="relative pt-0 pb-3 md:pb-8 px-3 md:px-6">
              {/* Desktop Layout - Grid */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-4 md:gap-8">
                {/* Matrix Rewards Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {t('rewards.matrixRewardsTitle')}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'level1Direct', color: 'emerald', icon: '🎯' },
                      { key: 'level2Matrix', color: 'blue', icon: '🌐' },
                      { key: 'spilloverBonuses', color: 'purple', icon: '⚡' },
                      { key: 'claimWindow', color: 'orange', icon: '⏰' }
                    ].map((item, index) => (
                      <div 
                        key={item.key}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-900/20 dark:hover:bg-emerald-800/30 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: isRewardInfoExpanded ? 'slideInFromLeft 0.5s ease-out forwards' : 'none'
                        }}
                      >
                        <div className="text-xl">{item.icon}</div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {t(`rewards.rewards.${item.key}`)}
                          </span>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 group-hover:scale-125 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* BCC Token Rewards Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'bccTransferable', color: 'yellow', icon: '💰' },
                      { key: 'bccLocked', color: 'red', icon: '🔒' },
                      { key: 'bccMultipliers', color: 'teal', icon: '📈' },
                      { key: 'bccUpgrades', color: 'indigo', icon: '🚀' }
                    ].map((item, index) => (
                      <div 
                        key={item.key}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-yellow-50/50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-800/30 border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: isRewardInfoExpanded ? 'slideInFromLeft 0.5s ease-out forwards' : 'none'
                        }}
                      >
                        <div className="text-xl">{item.icon}</div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {t(`rewards.bccRewards.${item.key}`)}
                          </span>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:scale-125 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Version - Tab Layout */}
              <div className="block md:hidden space-y-3">
                {/* Tab Navigation */}
                <div className="flex bg-muted/30 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setMobileRewardTab('matrix')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                      mobileRewardTab === 'matrix'
                        ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Matrix
                  </button>
                  <button
                    onClick={() => setMobileRewardTab('bcc')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                      mobileRewardTab === 'bcc'
                        ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BCC
                  </button>
                </div>

                {/* Tab Content */}
                <div className="relative h-40">
                  {mobileRewardTab === 'matrix' && (
                    <div className="space-y-2 animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                          <Award className="h-2.5 w-2.5 text-white" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {t('rewards.matrixRewardsTitle') || 'Matrix Rewards'}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'level1Direct', bgClass: 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200/50 dark:border-emerald-700/50', dotClass: 'bg-gradient-to-r from-emerald-400 to-emerald-600', icon: '🎯' },
                          { key: 'level2Matrix', bgClass: 'bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-700/50', dotClass: 'bg-gradient-to-r from-blue-400 to-blue-600', icon: '🌐' },
                          { key: 'spilloverBonuses', bgClass: 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50 dark:border-purple-700/50', dotClass: 'bg-gradient-to-r from-purple-400 to-purple-600', icon: '⚡' },
                          { key: 'claimWindow', bgClass: 'bg-gradient-to-br from-orange-50/50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200/50 dark:border-orange-700/50', dotClass: 'bg-gradient-to-r from-orange-400 to-orange-600', icon: '⏰' }
                        ].map((item, index) => (
                          <div 
                            key={item.key}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${item.bgClass}`}
                          >
                            <div className="text-lg">{item.icon}</div>
                            <span className="text-[10px] font-medium text-center text-foreground leading-tight">
                              {t(`rewards.rewards.${item.key}`)}
                            </span>
                            <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mobileRewardTab === 'bcc' && (
                    <div className="space-y-2 animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                          <Coins className="h-2.5 w-2.5 text-white" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'bccTransferable', bgClass: 'bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200/50 dark:border-yellow-700/50', dotClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600', icon: '💰' },
                          { key: 'bccLocked', bgClass: 'bg-gradient-to-br from-red-50/50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-red-200/50 dark:border-red-700/50', dotClass: 'bg-gradient-to-r from-red-400 to-red-600', icon: '🔒' },
                          { key: 'bccMultipliers', bgClass: 'bg-gradient-to-br from-teal-50/50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200/50 dark:border-teal-700/50', dotClass: 'bg-gradient-to-r from-teal-400 to-teal-600', icon: '📈' },
                          { key: 'bccUpgrades', bgClass: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200/50 dark:border-indigo-700/50', dotClass: 'bg-gradient-to-r from-indigo-400 to-indigo-600', icon: '🚀' }
                        ].map((item, index) => (
                          <div 
                            key={item.key}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${item.bgClass}`}
                          >
                            <div className="text-lg">{item.icon}</div>
                            <span className="text-[10px] font-medium text-center text-foreground leading-tight">
                              {t(`rewards.bccRewards.${item.key}`)}
                            </span>
                            <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-4 md:mt-8 pt-3 md:pt-6 border-t border-honey/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-honey animate-pulse" />
                    <span className="hidden sm:inline">{t('rewards.systemActive') || 'Reward system active and processing'}</span>
                    <span className="sm:hidden">{t('rewards.active') || 'Active'}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                      <span className="text-[10px] md:text-xs">{t('rewards.viewDetails') || 'Details'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                      <span className="text-[10px] md:text-xs">{t('rewards.howItWorks') || 'How It Works'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
}