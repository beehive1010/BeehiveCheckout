import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useWallet} from '../hooks/useWallet';
import {useI18n} from '../contexts/I18nContext';
import {useLocation} from 'wouter';
import {useToast} from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import {supabase} from '../lib/supabase';
import {Award, DollarSign, Plus, RefreshCw, Users, Copy, ArrowRight, TrendingUp, Lock, Share2, Crown} from 'lucide-react';
import {useIsMobile} from '../hooks/use-mobile';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '../components/ui/accordion';
import {DashboardBackground} from '../components/shared/HoneycombBackground';
import BackgroundErrorBoundary from '../components/shared/SafeBackground';
import '../components/dashboard/dashboard.css';
import '../styles/dashboard-background.css';

interface SimpleDashboardData {
  bccBalance: number;        // BCC总余额 
  bccLocked: number;         // BCC锁仓
  bccTransferable: number;   // BCC可转账
  directReferrals: number;   // 直推人数
  totalTeamSize: number;     // 团队总人数
  maxLayer: number;          // 最大安置层级
  totalRewards: number;      // 总奖励
  pendingRewards: number;    // 待领取奖励
  claimableRewards: number;  // 可领取奖励
  lastUpdated: string;       // 最后更新时间
}

interface DataLoadState {
  balance: boolean;
  matrix: boolean;
  rewards: boolean;
}

export default function Dashboard() {
  const { userData, walletAddress } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<SimpleDashboardData>({
    bccBalance: 0,
    bccLocked: 0,
    bccTransferable: 0,
    directReferrals: 0,
    totalTeamSize: 0,
    maxLayer: 0,
    totalRewards: 0,
    pendingRewards: 0,
    claimableRewards: 0,
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<DataLoadState>({
    balance: true,
    matrix: true,
    rewards: true
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Debug effect to log data changes
  useEffect(() => {
    console.log('🔄 Dashboard data state changed:', {
      directReferrals: data.directReferrals,
      totalTeamSize: data.totalTeamSize,
      timestamp: new Date().toISOString()
    });
  }, [data.directReferrals, data.totalTeamSize]);

  // 加载余额数据 - 使用balance Supabase函数
  const loadBalanceData = useCallback(async () => {
    if (!walletAddress) return null;

    setLoadingState(prev => ({ ...prev, balance: true }));
    try {
      console.log('💰 Fetching balance using balance function for:', walletAddress);
      
      // 使用balance Supabase函数获取数据
      const { data: result, error: functionError } = await supabase.functions.invoke('balance', {
        body: {
          action: 'get-balance'
        },
        headers: {
          'x-wallet-address': walletAddress
        }
      });

      if (functionError) {
        console.error('❌ Balance function error:', functionError);
        throw new Error(`Function error: ${functionError.message}`);
      }

      console.log('💰 Raw balance data from function:', result);

      if (result.success && result.balance) {
        const balance = result.balance;
        return {
          bccTotal: balance.bcc_transferable || 0,
          bccLocked: balance.bcc_locked || 0,
          bccTransferable: balance.bcc_transferable || 0
        };
      }

      // 如果没有余额记录，返回默认值 (新成员默认余额)
      return {
        bccTotal: 500, // 显示可用余额
        bccLocked: 10350,
        bccTransferable: 500
      };
    } catch (error) {
      console.error('❌ Balance load error:', error);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, balance: false }));
    }
  }, [walletAddress]);

  // 加载矩阵数据 - 使用改进的referrals_stats_view
  const loadMatrixData = useCallback(async () => {
    if (!walletAddress) return null;

    setLoadingState(prev => ({ ...prev, matrix: true }));
    try {
      console.log('🌐 Fetching matrix data from referrals table for:', walletAddress);
      
      // 从多个表获取数据进行综合统计
      const [
        { data: directReferralsData },
        { data: matrixTeamData }, 
        { data: memberData }
      ] = await Promise.all([
        // 直接推荐统计
        supabase
          .from('members')
          .select('wallet_address, current_level, activation_time')
          .eq('referrer_wallet', walletAddress),
          
        // Matrix团队统计 - 使用matrix_referrals表
        supabase
          .from('matrix_referrals')
          .select('member_wallet, layer, referral_type')
          .eq('matrix_root_wallet', walletAddress),
          
        // 当前用户信息
        supabase
          .from('members')
          .select('wallet_address, current_level, activation_time')
          .eq('wallet_address', walletAddress)
          .single()
      ]);

      // 计算直接推荐数据
      const directReferrals = directReferralsData?.length || 0;
      const activatedDirectReferrals = directReferralsData?.filter(m => m.current_level > 0).length || 0;
      
      // 计算Matrix团队数据
      const totalTeamSize = matrixTeamData?.length || 0;
      const maxLayer = matrixTeamData && matrixTeamData.length > 0
        ? Math.max(...matrixTeamData.map(m => m.layer))
        : 0;
      const activeLayers = matrixTeamData && matrixTeamData.length > 0
        ? new Set(matrixTeamData.map(m => m.layer)).size
        : 0;

      console.log('🌐 Matrix data calculated:', {
        directReferrals,
        activatedDirectReferrals,
        totalTeamSize,
        maxLayer,
        activeLayers
      });

      return {
        directReferrals,
        totalTeamSize,
        maxLayer,
        activatedReferrals: activatedDirectReferrals,
        totalNetworkSize: directReferrals + totalTeamSize,
        hasMatrixTeam: totalTeamSize > 0,
        activeLayers,
        totalActivatedMembers: totalTeamSize // 假设matrix团队都是激活的
      };
    } catch (error) {
      console.error('❌ Matrix load error:', error);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, matrix: false }));
    }
  }, [walletAddress]);

  // 加载奖励数据 - 保持简单的数据库查询
  const loadRewardData = useCallback(async () => {
    if (!walletAddress) return null;

    setLoadingState(prev => ({ ...prev, rewards: true }));
    try {
      console.log('🏆 Fetching reward data from database for:', walletAddress);
      
      // 查询奖励统计 - 使用正确的layer_rewards表
      const { data: rewardData, error: rewardError } = await supabase
        .from('layer_rewards')
        .select(`
          id,
          reward_amount,
          status,
          created_at,
          expires_at,
          claimed_at,
          matrix_layer,
          triggering_member_wallet
        `)
        .ilike('reward_recipient_wallet', walletAddress) // Use correct column name
        .order('created_at', { ascending: false });

      if (rewardError) {
        console.error('❌ Reward query error:', rewardError);
        throw new Error(`Database error: ${rewardError.message}`);
      }

      console.log('🏆 Raw reward data from DB:', rewardData);

      if (rewardData) {
        // 计算各种奖励统计
        const claimedRewards = rewardData.filter(r => r.status === 'claimed');
        const pendingRewards = rewardData.filter(r => r.status === 'pending');
        const availableRewards = rewardData.filter(r => r.status === 'claimable');

        const totalClaimed = claimedRewards.reduce((sum, reward) => sum + Number(reward.reward_amount || 0), 0);
        const totalPending = pendingRewards.reduce((sum, reward) => sum + Number(reward.reward_amount || 0), 0);
        const totalAvailable = availableRewards.reduce((sum, reward) => sum + Number(reward.reward_amount || 0), 0);

        console.log('🏆 Calculated reward stats:', { totalClaimed, totalPending, totalAvailable });

        return {
          totalRewards: totalClaimed + totalPending + totalAvailable, // 所有奖励总和
          totalClaimed,
          totalPending,
          totalAvailable
        };
      }

      return {
        totalRewards: 0,
        totalClaimed: 0,
        totalPending: 0,
        totalAvailable: 0
      };
    } catch (error) {
      console.error('❌ Rewards load error:', error);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, rewards: false }));
    }
  }, [walletAddress]);

  // 主数据加载函数
  const loadDashboardData = useCallback(async () => {
    if (!walletAddress) {
      console.log('❌ No wallet address available for data loading');
      setLoading(false);
      return;
    }

    console.log('🔄 Loading dashboard data for:', walletAddress);
    setError(null);
    setLoading(true);

    try {
      // 并行加载所有数据
      const [balanceResult, matrixResult, rewardResult] = await Promise.allSettled([
        loadBalanceData(),
        loadMatrixData(), 
        loadRewardData()
      ]);

      const results = {
        balance: balanceResult.status === 'fulfilled' ? balanceResult.value : null,
        matrix: matrixResult.status === 'fulfilled' ? matrixResult.value : null,
        rewards: rewardResult.status === 'fulfilled' ? rewardResult.value : null
      };

      console.log('📊 Dashboard load results:', results);

      // 合并数据
      const dashboardData: SimpleDashboardData = {
        bccBalance: results.balance?.bccTotal || 0,
        bccLocked: results.balance?.bccLocked || 0,
        bccTransferable: results.balance?.bccTransferable || 0,
        directReferrals: results.matrix?.directReferrals || 0,
        totalTeamSize: results.matrix?.totalTeamSize || 0,
        maxLayer: results.matrix?.maxLayer || 0,
        totalRewards: results.rewards?.totalRewards || 0,
        pendingRewards: results.rewards?.totalPending || 0,
        claimableRewards: results.rewards?.totalAvailable || 0,
        lastUpdated: new Date().toISOString()
      };

      console.log('📈 Final dashboard data:', dashboardData);
      console.log('🔍 Matrix data in final dashboard:', {
        directReferrals: dashboardData.directReferrals,
        totalTeamSize: dashboardData.totalTeamSize,
        matrixResult: results.matrix
      });
      
      // Use functional update to ensure we get the latest state
      setData(prevData => {
        const newData = { ...dashboardData };
        console.log('🔄 State update: Previous data:', {
          directReferrals: prevData.directReferrals,
          totalTeamSize: prevData.totalTeamSize
        });
        console.log('🔄 State update: New data:', {
          directReferrals: newData.directReferrals,
          totalTeamSize: newData.totalTeamSize
        });
        return newData;
      });
      retryCountRef.current = 0; // 重置重试计数

    } catch (error: unknown) {
      console.error('❌ Failed to load dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : t('dashboard.errors.dataLoadFailed');
      setError(errorMessage);
      
      // 重试逻辑
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`🔄 Retrying... (${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => loadDashboardData(), 2000 * retryCountRef.current);
      } else {
        toast({
          title: t('dashboard.errors.dataLoadFailed'),
          description: t('dashboard.errors.refreshToRetry'),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      setLoadingState({ balance: false, matrix: false, rewards: false });
    }
  }, [walletAddress, t, toast, loadBalanceData, loadMatrixData, loadRewardData]);

  // 手动刷新数据
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    retryCountRef.current = 0;
    await loadDashboardData();
    setRefreshing(false);
    
    toast({
      title: t('dashboard.success.refreshed'),
      description: t('dashboard.success.dataUpdated'),
      duration: 2000
    });
  }, [refreshing, loadDashboardData, t, toast]);

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/welcome?ref=${walletAddress}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t('dashboard.success.copied'),
      description: t('dashboard.success.linkCopiedToClipboard'),
      duration: 2000
    });
  };

  const shareToSocial = (platform: 'facebook' | 'whatsapp' | 'twitter' | 'telegram') => {
    const referralLink = `${window.location.origin}/welcome?ref=${walletAddress}`;
    const shareText = t('dashboard.shareDescription');
    const fullText = `${shareText}\n\n${referralLink}`;

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // 初始数据加载
  useEffect(() => {
    if (walletAddress) {
      loadDashboardData();
    }
  }, [walletAddress, loadDashboardData]);

  // 设置实时数据订阅
  useEffect(() => {
    if (!walletAddress) return;

    const balanceSubscription = supabase
      .channel('balance_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_balances', filter: `wallet_address=ilike.${walletAddress}` },
        (payload: any) => {
          console.log('💰 Balance updated:', payload);
          loadBalanceData();
        }
      )
      .subscribe();

    const rewardSubscription = supabase
      .channel('reward_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'layer_rewards', filter: `reward_recipient_wallet=eq.${walletAddress}` },
        (payload: any) => {
          console.log('🏆 Rewards updated:', payload);
          loadRewardData();
        }
      )
      .subscribe();

    return () => {
      if (balanceSubscription) {
        supabase.removeChannel(balanceSubscription);
      }
      if (rewardSubscription) {
        supabase.removeChannel(rewardSubscription);
      }
    };
  }, [walletAddress, loadBalanceData, loadRewardData]);

  if (loading && !data.lastUpdated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 蜂巢动画背景 - 带错误边界保护 */}
      <BackgroundErrorBoundary>
        <DashboardBackground />
      </BackgroundErrorBoundary>

      <Navigation />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:container lg:mx-auto py-2 sm:py-4 pb-8 sm:pb-12 lg:pb-16 space-y-3 sm:space-y-4 animate-in fade-in-50 duration-700">
        {/* Enhanced Header */}
        <div className="text-center sm:text-left mb-2 sm:mb-4 animate-in slide-in-from-top-2 duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/20 to-amber-400/20 rounded-2xl blur-xl animate-pulse"></div>
            <h1 className="relative text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-honey via-amber-400 to-honey bg-clip-text text-transparent mb-2 sm:mb-3">
              {userData?.username ? t('dashboard.welcomeBack', { username: userData.username }) : t('dashboard.welcomeMember')}
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto sm:mx-0">
            {t('dashboard.buildNetwork')}
          </p>
        </div>

        {/* Status Bar and Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Loading State */}
          {(loadingState.balance || loadingState.matrix || loadingState.rewards) && (
            <div className="flex items-center gap-2 sm:gap-3 p-3 bg-honey/5 border border-honey/20 rounded-xl flex-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-honey flex-shrink-0"></div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {t('dashboard.loadingData')}
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl flex-1">
              <span className="text-red-600 text-xs sm:text-sm font-medium">{t('dashboard.errors.loadError')}</span>
              <button onClick={handleRefresh} className="text-red-600 hover:text-red-700 text-xs sm:text-sm underline">
                {t('dashboard.errors.retry')}
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className={`group border-2 border-honey/30 hover:border-honey/50 hover:bg-honey/10 shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'w-full' : 'min-w-[140px]'}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="font-semibold">{refreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}</span>
          </Button>
        </div>

        {/* Last Updated */}
        {data.lastUpdated && (
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {t('dashboard.lastUpdated')}: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        )}

        {/* Main Stats Grid - Desktop: 4 columns, Mobile: 1 column */}
        <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'} animate-in slide-in-from-bottom-2 duration-500`}>
          {/* Membership Level Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-purple-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-purple-500/20">
            {/* Purple background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-400/15 to-purple-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-xl border-2 border-purple-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <CardHeader className={`relative ${isMobile ? 'pb-2' : 'pb-3'}`}>
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <Crown className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-white`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`${isMobile ? 'text-base' : 'text-base'} font-bold text-purple-400 group-hover:text-purple-300 transition-colors duration-300 block truncate`}>
                    {t('dashboard.membershipLevel')}
                  </span>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 mt-0.5 truncate`}>{t('dashboard.yourNFT')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-2 sm:space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-3xl' : 'text-3xl'} font-bold text-purple-400 group-hover:text-purple-300 transition-colors duration-300 truncate`}>
                    Level {userData?.membershipLevel || 0}
                  </p>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.currentLevel')}</p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 group-hover:bg-purple-500/30 transition-all duration-300 flex-shrink-0">
                  NFT
                </Badge>
              </div>
              <Button
                onClick={() => setLocation('/membership')}
                className={`w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-9' : 'h-10'}`}
              >
                <Crown className="h-4 w-4 mr-2" />
                {t('dashboard.upgradeMembership')}
              </Button>
            </CardContent>
          </Card>

          {/* BCC Balance Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-honey/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-honey/20">
            {/* Golden background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-amber-300/15 to-yellow-400/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-xl border-2 border-honey/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <CardHeader className={`relative ${isMobile ? 'pb-2' : 'pb-3'}`}>
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-honey/80 via-honey to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <DollarSign className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-black`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`${isMobile ? 'text-base' : 'text-base'} font-bold text-honey group-hover:text-amber-300 transition-colors duration-300 block truncate`}>
                    {t('dashboard.bccBalance')}
                  </span>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 mt-0.5 truncate`}>{t('dashboard.yourTokens')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-2 sm:space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-3xl' : 'text-3xl'} font-bold text-honey group-hover:text-amber-300 transition-colors duration-300 truncate`}>{data.bccBalance.toFixed(2)}</p>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.transferable')}</p>
                </div>
                <Badge className="bg-honey/20 text-honey border-honey/30 group-hover:bg-honey/30 transition-all duration-300 flex-shrink-0">{t('dashboard.available')}</Badge>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-orange-900/20 hover:via-orange-800/10 hover:to-orange-900/20 border border-orange-500/30 rounded-lg transition-all duration-300">
                <Lock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold text-orange-400 truncate`}>{data.bccLocked.toFixed(2)}</p>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.bccLocked')}</p>
                </div>
              </div>
              <Button
                onClick={() => setLocation('/tokens')}
                className={`w-full bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-9' : 'h-10'}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.topUp')}
              </Button>
            </CardContent>
          </Card>

          {/* Network Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-blue-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-blue-500/20">
            {/* Blue background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-400/15 to-blue-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-xl border-2 border-blue-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <CardHeader className={`relative ${isMobile ? 'pb-2' : 'pb-3'}`}>
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <Users className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-white`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`${isMobile ? 'text-base' : 'text-base'} font-bold text-blue-400 group-hover:text-blue-300 transition-colors duration-300 block truncate`}>
                    {t('dashboard.referralNetwork')}
                  </span>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 mt-0.5 truncate`}>{t('dashboard.yourTeam')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-2 sm:space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-blue-900/20 hover:via-blue-800/10 hover:to-blue-900/20 border border-blue-500/30 rounded-lg transition-all duration-300">
                  <p className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-blue-400 truncate`}>{data.directReferrals}</p>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.directReferrals')}</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-indigo-900/20 hover:via-indigo-800/10 hover:to-indigo-900/20 border border-indigo-500/30 rounded-lg transition-all duration-300">
                  <p className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-indigo-400 truncate`}>{data.totalTeamSize}</p>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.totalTeamSize')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-blue-500/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 flex-1 truncate`}>{t('dashboard.maxLayer')}: <span className="font-bold text-blue-400">{data.maxLayer}</span></p>
              </div>
              <Button
                onClick={() => setLocation('/referrals')}
                className={`w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-9' : 'h-10'}`}
              >
                {t('dashboard.viewMatrix')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-emerald-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-emerald-500/20">
            {/* Green background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-400/15 to-emerald-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-xl border-2 border-emerald-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <CardHeader className={`relative ${isMobile ? 'pb-2' : 'pb-3'}`}>
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <Award className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-white`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`${isMobile ? 'text-base' : 'text-base'} font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300 block truncate`}>
                    {t('dashboard.rewardCenter')}
                  </span>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 mt-0.5 truncate`}>{t('dashboard.earnings')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-2 sm:space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-emerald-900/20 hover:via-emerald-800/10 hover:to-emerald-900/20 border border-emerald-500/30 rounded-lg transition-all duration-300">
                <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 mb-1`}>{t('dashboard.totalRewards')}</p>
                <p className={`${isMobile ? 'text-3xl' : 'text-3xl'} font-bold text-emerald-400 truncate`}>${data.totalRewards.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 hover:from-yellow-900/20 hover:via-yellow-800/10 hover:to-yellow-900/20 border border-yellow-500/30 rounded-lg transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-400 dark:text-gray-500 truncate`}>{t('dashboard.claimableRewards')}</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-lg'} font-bold text-yellow-400 truncate`}>${data.claimableRewards.toFixed(2)}</p>
                </div>
                {data.claimableRewards > 0 && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse flex-shrink-0">{t('dashboard.ready')}</Badge>}
              </div>
              <Button
                onClick={() => setLocation('/rewards')}
                className={`w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-9' : 'h-10'}`}
              >
                {t('dashboard.claimRewards')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-honey/50 transition-all duration-500 shadow-2xl hover:shadow-3xl hover:shadow-honey/20 animate-in slide-in-from-bottom-2 duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-amber-300/15 to-yellow-400/20 opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
          <div className="absolute inset-0 rounded-xl border-2 border-honey/30 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>

          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 sm:gap-3">
              <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-honey/80 via-honey to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                <Users className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-black`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-honey group-hover:text-amber-300 transition-colors duration-300 block truncate`}>{t('dashboard.shareReferral')}</span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{t('dashboard.shareDescription')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 p-2 sm:p-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-honey/30 rounded-lg font-mono text-xs sm:text-sm text-gray-300 break-all overflow-x-auto">
                {`${window.location.origin}/welcome?ref=${walletAddress}`}
              </div>
              <Button
                onClick={copyReferralLink}
                className={`bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'w-full h-9' : 'h-auto'}`}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink')}
              </Button>
            </div>

            {/* Social Share Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-honey" />
                <span className="text-xs text-gray-400">{t('dashboard.social.shareOn')}:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  onClick={() => shareToSocial('facebook')}
                  variant="outline"
                  className="group border-blue-600/50 hover:border-blue-500 hover:bg-blue-600/10 transition-all duration-300"
                >
                  <svg className="h-4 w-4 mr-2 fill-current text-blue-500 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-xs font-semibold">Facebook</span>
                </Button>

                <Button
                  onClick={() => shareToSocial('whatsapp')}
                  variant="outline"
                  className="group border-green-600/50 hover:border-green-500 hover:bg-green-600/10 transition-all duration-300"
                >
                  <svg className="h-4 w-4 mr-2 fill-current text-green-500 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="text-xs font-semibold">WhatsApp</span>
                </Button>

                <Button
                  onClick={() => shareToSocial('twitter')}
                  variant="outline"
                  className="group border-slate-600/50 hover:border-slate-400 hover:bg-slate-600/10 transition-all duration-300"
                >
                  <svg className="h-4 w-4 mr-2 fill-current text-slate-300 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-xs font-semibold">X</span>
                </Button>

                <Button
                  onClick={() => shareToSocial('telegram')}
                  variant="outline"
                  className="group border-sky-600/50 hover:border-sky-500 hover:bg-sky-600/10 transition-all duration-300"
                >
                  <svg className="h-4 w-4 mr-2 fill-current text-sky-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span className="text-xs font-semibold">Telegram</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Tip */}
        <div className="p-4 bg-honey/5 border border-honey/20 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">{t('dashboard.inviteTip')}</p>
        </div>
      </div>
    </div>
  );
}