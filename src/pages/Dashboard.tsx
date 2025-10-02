import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useWallet} from '../hooks/useWallet';
import {useI18n} from '../contexts/I18nContext';
import {useLocation} from 'wouter';
import {useToast} from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import {supabase} from '../lib/supabase';
import {Award, DollarSign, Plus, RefreshCw, Users, Copy, ArrowRight, TrendingUp, Lock} from 'lucide-react';
import {useIsMobile} from '../hooks/use-mobile';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import '../components/dashboard/dashboard.css';

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
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="w-full px-4 sm:px-6 lg:container lg:mx-auto py-4 sm:py-6 pb-8 sm:pb-12 lg:pb-16 space-y-4 sm:space-y-6 animate-in fade-in-50 duration-700">
        {/* Enhanced Header */}
        <div className="text-center sm:text-left mb-4 sm:mb-6 animate-in slide-in-from-top-2 duration-500">
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

        {/* Main Stats Grid - Desktop: 3 columns, Mobile: 1 column */}
        <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* BCC Balance Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-honey/10 via-amber-50/50 to-honey/5 dark:from-honey/5 dark:via-slate-800 dark:to-honey/10 border-2 border-honey/20 hover:border-honey/40 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-50"></div>
            <CardHeader className={`relative ${isMobile ? 'pb-3' : 'pb-4'}`}>
              <CardTitle className="flex items-center gap-3">
                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-honey to-amber-500 rounded-xl flex items-center justify-center shadow-lg`}>
                  <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-black`} />
                </div>
                <div>
                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold bg-gradient-to-r from-honey to-amber-500 bg-clip-text text-transparent`}>
                    {t('dashboard.bccBalance')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.yourTokens')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-honey`}>{data.bccBalance.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.transferable')}</p>
                </div>
                <Badge className="bg-honey/20 text-honey border-honey/30">{t('dashboard.available')}</Badge>
              </div>
              <div className="flex items-center gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                <Lock className="h-4 w-4 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-500">{data.bccLocked.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.bccLocked')}</p>
                </div>
              </div>
              <Button
                onClick={() => setLocation('/tokens')}
                className={`w-full bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-10' : 'h-11'}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.topUp')}
              </Button>
            </CardContent>
          </Card>

          {/* Network Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50 dark:from-blue-950/30 dark:via-slate-800 dark:to-blue-950/20 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 opacity-50"></div>
            <CardHeader className={`relative ${isMobile ? 'pb-3' : 'pb-4'}`}>
              <CardTitle className="flex items-center gap-3">
                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg`}>
                  <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                </div>
                <div>
                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent`}>
                    {t('dashboard.referralNetwork')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.yourTeam')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600 dark:text-blue-400`}>{data.directReferrals}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.directReferrals')}</p>
                </div>
                <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg">
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-indigo-600 dark:text-indigo-400`}>{data.totalTeamSize}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalTeamSize')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">{t('dashboard.maxLayer')}: <span className="font-bold text-blue-600 dark:text-blue-400">{data.maxLayer}</span></p>
              </div>
              <Button
                onClick={() => setLocation('/referrals')}
                variant="outline"
                className={`w-full border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 ${isMobile ? 'h-10' : 'h-11'}`}
              >
                {t('dashboard.viewMatrix')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50/50 to-emerald-50 dark:from-emerald-950/30 dark:via-slate-800 dark:to-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 opacity-50"></div>
            <CardHeader className={`relative ${isMobile ? 'pb-3' : 'pb-4'}`}>
              <CardTitle className="flex items-center gap-3">
                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg`}>
                  <Award className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                </div>
                <div>
                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent`}>
                    {t('dashboard.rewardCenter')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.earnings')}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={`relative space-y-3 ${isMobile ? 'pt-0' : ''}`}>
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.totalRewards')}</p>
                <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-emerald-600 dark:text-emerald-400`}>${data.totalRewards.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.claimableRewards')}</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">${data.claimableRewards.toFixed(2)}</p>
                </div>
                {data.claimableRewards > 0 && <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 animate-pulse">{t('dashboard.ready')}</Badge>}
              </div>
              <Button
                onClick={() => setLocation('/rewards')}
                className={`w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'h-10' : 'h-11'}`}
              >
                {t('dashboard.claimRewards')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-50"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3">
              <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-honey to-amber-500 rounded-xl flex items-center justify-center shadow-lg`}>
                <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-black`} />
              </div>
              <div>
                <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>{t('dashboard.shareReferral')}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.shareDescription')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm break-all">
                {`${window.location.origin}/welcome?ref=${walletAddress}`}
              </div>
              <Button
                onClick={copyReferralLink}
                className={`bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${isMobile ? 'w-full' : ''}`}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink')}
              </Button>
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