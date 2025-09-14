import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import { 
  supabase
} from '../lib/supabase';
import { 
  Users, 
  DollarSign,
  Award,
  Plus,
  RefreshCw
} from 'lucide-react';
import UserProfile from '../components/dashboard/UserProfile';
import PremiumDataCard from '../components/dashboard/PremiumDataCard';
import ReferralLinkCard from '../components/dashboard/ReferralLinkCard';
import QuickNavigationCard from '../components/dashboard/QuickNavigationCard';
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

  // 加载余额数据 - 直接使用Supabase数据库查询
  const loadBalanceData = useCallback(async () => {
    if (!walletAddress) return null;

    setLoadingState(prev => ({ ...prev, balance: true }));
    try {
      console.log('💰 Fetching balance from database for:', walletAddress);
      
      // 直接查询用户余额表
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('❌ Balance query error:', balanceError);
        throw new Error(`Database error: ${balanceError.message}`);
      }

      console.log('💰 Raw balance data from DB:', balanceData);

      if (balanceData) {
        return {
          bccTotal: (balanceData.bcc_transferable || 0) + (balanceData.bcc_locked || 0),
          bccLocked: balanceData.bcc_locked || 0,
          bccTransferable: balanceData.bcc_transferable || 0
        };
      }

      // 如果没有余额记录，返回默认值
      return {
        bccTotal: 0,
        bccLocked: 0,
        bccTransferable: 0
      };
    } catch (error) {
      console.error('❌ Balance load error:', error);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, balance: false }));
    }
  }, [walletAddress]);

  // 加载矩阵数据 - 直接使用Supabase数据库查询
  const loadMatrixData = useCallback(async () => {
    if (!walletAddress) return null;

    setLoadingState(prev => ({ ...prev, matrix: true }));
    try {
      console.log('🌐 Fetching matrix data from database for:', walletAddress);
      
      // 并行查询直推人数和总团队人数
      const [directReferralsResult, totalTeamResult, maxLayerResult] = await Promise.allSettled([
        // 查询直推人数 - 从members表查询referrer_wallet
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_wallet', walletAddress),
        
        // 查询总团队人数 - 使用matrix edge function
        supabase.functions.invoke('matrix', { 
          body: { 
            action: 'get-downline', 
            rootWallet: walletAddress, 
            maxDepth: 19 
          } 
        }),
        
        // 查询最大层级
        supabase
          .from('referrals')
          .select('matrix_layer')
          .ilike('matrix_root_wallet', walletAddress)
          .order('matrix_layer', { ascending: false })
          .limit(1)
      ]);

      const directReferrals = directReferralsResult.status === 'fulfilled' 
        ? (directReferralsResult.value.count || 0) 
        : 0;

      const totalTeamSize = totalTeamResult.status === 'fulfilled' && totalTeamResult.value.data
        ? (totalTeamResult.value.data.length || 0) 
        : 0;

      const maxLayer = maxLayerResult.status === 'fulfilled' && maxLayerResult.value.data?.[0]
        ? maxLayerResult.value.data[0].matrix_layer 
        : 0;

      console.log('🌐 Matrix data from DB:', { directReferrals, totalTeamSize, maxLayer });

      return {
        directReferrals,
        totalTeamSize,
        maxLayer
      };
    } catch (error) {
      console.error('❌ Matrix load error:', error);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, matrix: false }));
    }
  }, [walletAddress]);

  // 加载奖励数据 - 直接使用Supabase数据库查询
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
          claimed_at
        `)
        .eq('reward_recipient_wallet', walletAddress)
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
          totalClaimed,
          totalPending,
          totalAvailable
        };
      }

      return {
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
        bccBalance: results.balance?.bccTransferable || 0,
        bccLocked: results.balance?.bccLocked || 0,
        bccTransferable: results.balance?.bccTransferable || 0,
        directReferrals: results.matrix?.directReferrals || 0,
        totalTeamSize: results.matrix?.totalTeamSize || 0,
        maxLayer: results.matrix?.maxLayer || 0,
        totalRewards: results.rewards?.totalClaimed || 0,
        pendingRewards: results.rewards?.totalPending || 0,
        claimableRewards: results.rewards?.totalAvailable || 0,
        lastUpdated: new Date().toISOString()
      };

      console.log('📈 Final dashboard data:', dashboardData);
      setData(dashboardData);
      retryCountRef.current = 0; // 重置重试计数

    } catch (error: unknown) {
      console.error('❌ Failed to load dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
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

  return (
    <div className="dashboard-container">
      <Navigation />
      
      <div className="dashboard-content">
        {/* 用户资料卡片 */}
        <UserProfile className="mb-6 sm:mb-8" />

        {/* 欢迎信息和刷新按钮 */}
        <div className="welcome-container">
          <div className="text-center sm:text-left mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h1 className="welcome-title">
                  {userData?.username ? t('dashboard.welcomeBack', { username: userData.username }) : t('dashboard.welcomeMember')}
                </h1>
                <p className="welcome-subtitle text-sm sm:text-base">
                  {t('dashboard.buildNetwork')}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-honey/10 hover:bg-honey/20 border border-honey/30 rounded-lg sm:rounded-xl text-honey transition-colors disabled:opacity-50 min-h-[44px] text-sm sm:text-sm"
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="font-medium">
                  {refreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
                </span>
              </button>
            </div>
          </div>
          
          {/* 数据状态指示器 */}
          {(loadingState.balance || loadingState.matrix || loadingState.rewards) && (
            <div className="flex items-center gap-2 sm:gap-3 p-3 bg-honey/5 border border-honey/20 rounded-lg mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-honey flex-shrink-0"></div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {t('dashboard.loadingData')}
                {loadingState.balance && ` ${t('dashboard.balance')}`}
                {loadingState.matrix && ` ${t('dashboard.network')}`}
                {loadingState.rewards && ` ${t('dashboard.rewards')}`}
              </span>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-red-600 text-xs sm:text-sm font-medium">{t('dashboard.errors.loadError')}</span>
                <button
                  onClick={handleRefresh}
                  className="text-red-600 hover:text-red-700 text-xs sm:text-sm underline text-left sm:text-right"
                  data-testid="button-retry"
                >
                  {t('dashboard.errors.retry')}
                </button>
              </div>
              <p className="text-red-600 text-xs mt-1 break-words">{error}</p>
            </div>
          )}

          {/* 最后更新时间 */}
          {data.lastUpdated && (
            <p className="text-xs text-muted-foreground mb-4 sm:mb-6 text-center sm:text-left">
              {t('dashboard.lastUpdated')}: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Premium 主要数据卡片 */}
        <div className="dashboard-grid-2">
          {/* BCC余额卡片 */}
          <PremiumDataCard
            title={t('dashboard.bccBalance')}
            icon={DollarSign}
            iconColor="text-honey"
            gradientFrom="from-honey/20"
            gradientTo="to-orange-500/20"
            data={[
              { value: data.bccBalance.toFixed(2), label: t('dashboard.bccBalance'), color: 'text-honey' },
              { value: data.bccLocked.toFixed(2), label: t('dashboard.bccLocked'), color: 'text-orange-400' }
            ]}
            action={{
              label: t('dashboard.topUp'),
              onClick: () => setLocation('/tokens'),
              icon: Plus,
              testId: 'button-topup'
            }}
          />

          {/* 推荐网络卡片 */}
          <PremiumDataCard
            title={t('dashboard.referralNetwork')}
            icon={Users}
            iconColor="text-blue-400"
            gradientFrom="from-blue-500/20"
            gradientTo="to-purple-500/20"
            data={[
              { value: data.directReferrals.toString(), label: t('dashboard.directReferrals'), color: 'text-blue-400' },
              { value: data.totalTeamSize.toString(), label: t('dashboard.totalTeamSize'), color: 'text-purple-400' }
            ]}
          />
        </div>

        {/* 奖励卡片 */}
        <PremiumDataCard
          title={t('dashboard.rewardCenter')}
          icon={Award}
          iconColor="text-green-400"
          gradientFrom="from-green-500/20"
          gradientTo="to-emerald-500/20"
          data={[
            { value: `$${data.totalRewards.toFixed(2)}`, label: t('dashboard.totalRewards'), color: 'text-green-400' },
            { value: `$${data.claimableRewards.toFixed(2)}`, label: t('dashboard.claimableRewards'), color: 'text-yellow-400' }
          ]}
          className="mb-6 sm:mb-8"
        />

        {/* 推荐链接卡片 */}
        <ReferralLinkCard
          title={t('dashboard.shareReferral')}
          description={t('dashboard.shareDescription')}
          referralLink={`${window.location.origin}/welcome?ref=${walletAddress}`}
          onCopyLink={copyReferralLink}
          copyButtonText={t('dashboard.copyLink')}
          className="mb-6 sm:mb-8"
        />

        {/* 快捷导航 */}
        <div className="dashboard-grid-nav">
          <QuickNavigationCard
            title={t('dashboard.referralNetwork')}
            description={t('dashboard.viewMatrix')}
            icon={Users}
            iconColor="text-blue-400"
            onClick={() => setLocation('/referrals')}
          />
          
          <QuickNavigationCard
            title={t('dashboard.rewardCenter')}
            description={t('dashboard.claimRewards')}
            icon={Award}
            iconColor="text-green-400"
            onClick={() => setLocation('/rewards')}
          />
        </div>

        {/* 底部提示 */}
        <div className="dashboard-footer">
          <p>{t('dashboard.inviteTip')}</p>
        </div>
      </div>
    </div>
  );
}