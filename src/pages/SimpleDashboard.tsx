import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import { 
  balanceService, 
  matrixService 
} from '../lib/supabaseClient';
import { 
  Users, 
  DollarSign, 
  Copy,
  Share2,
  Award,
  ArrowRight,
  Plus
} from 'lucide-react';
import UserProfile from '../components/dashboard/UserProfile';

interface SimpleDashboardData {
  bccBalance: number;        // BCC总余额
  bccLocked: number;         // BCC锁仓
  directReferrals: number;   // 直推人数
  maxLayer: number;          // 最大安置层级
  totalRewards: number;      // 总奖励
  pendingRewards: number;    // 奖金提醒余额
}

export default function SimpleDashboard() {
  const { userData, walletAddress } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<SimpleDashboardData>({
    bccBalance: 0,
    bccLocked: 0,
    directReferrals: 0,
    maxLayer: 0,
    totalRewards: 0,
    pendingRewards: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadSimpleData();
    }
  }, [walletAddress]);

  const loadSimpleData = async () => {
    if (!walletAddress) {
      console.log('❌ No wallet address available for data loading');
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading simple dashboard data for:', walletAddress);
    try {
      const [balanceResult, matrixResult] = await Promise.allSettled([
        balanceService.getUserBalance(walletAddress),
        matrixService.getMatrixStats(walletAddress)
      ]);
      
      console.log('📊 Simple dashboard API results:', {
        balance: balanceResult.status === 'fulfilled' ? 'success' : 'failed',
        matrix: matrixResult.status === 'fulfilled' ? 'success' : 'failed'
      });

      const balance = balanceResult.status === 'fulfilled' ? balanceResult.value.data : null;
      const matrix = matrixResult.status === 'fulfilled' ? matrixResult.value.data : null;
      
      console.log('💰 Balance data:', balance);
      console.log('🌐 Matrix data:', matrix);

      const dashboardData = {
        bccBalance: (balance?.bcc_total_initial || balance?.bcc_total || (balance?.bcc_transferable || 0) + (balance?.bcc_locked || 0)),
        bccLocked: balance?.bcc_locked || 0,
        directReferrals: matrix?.directReferrals || 0,
        maxLayer: matrix?.maxLayer || 0,
        totalRewards: (balance?.usdc_claimed_total || balance?.usdc_total_earned || 0),
        pendingRewards: (balance?.usdc_pending || balance?.usdc_claimable || 0)
      };
      
      console.log('📈 Final dashboard data:', dashboardData);
      setData(dashboardData);
    } catch (error) {
      console.error('❌ Failed to load simple dashboard data:', error);
      toast({
        title: t('dashboard.errors.dataLoadFailed'),
        description: t('dashboard.errors.refreshToRetry'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t('dashboard.success.copied'),
      description: t('dashboard.success.linkCopiedToClipboard'),
      duration: 2000
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 用户资料卡片 */}
        <UserProfile className="mb-8" />

        {/* 欢迎信息 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-honey mb-2">
            {userData?.username ? t('dashboard.welcomeBack', { username: userData.username }) : t('dashboard.welcomeMember')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.buildNetwork')}
          </p>
        </div>

        {/* Premium 主要数据卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Premium BCC余额卡片 */}
          <div className="group relative transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-orange-500/20 to-honey/20 rounded-3xl blur-lg group-hover:blur-xl"></div>
            <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
              <CardContent className="p-8">
                {/* 头部图标和标题 */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-honey/30 to-orange-500/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-honey/20 to-orange-500/20 backdrop-blur-sm">
                      <DollarSign className="h-8 w-8 text-honey transition-all duration-300 group-hover:scale-110" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
                    {t('dashboard.bccBalance')}
                  </h3>
                </div>
                
                {/* 数据展示 */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-honey/10 to-orange-500/10 border border-honey/20 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-honey mb-2">
                      {data.bccBalance}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{t('dashboard.bccBalance')}</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-orange-400/10 to-red-400/10 border border-orange-400/20 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-orange-400 mb-2">
                      {data.bccLocked}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{t('dashboard.bccLocked')}</div>
                  </div>
                </div>
                
                {/* Premium Button */}
                <Button 
                  onClick={() => setLocation('/tokens')}
                  className="w-full h-12 bg-gradient-to-r from-honey via-orange-500 to-honey hover:from-honey/90 hover:via-orange-500/90 hover:to-honey/90 text-black font-bold text-base rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-honey/30"
                  data-testid="button-topup"
                >
                  <Plus className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:rotate-90" />
                  {t('dashboard.topUp')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Premium 推荐网络卡片 */}
          <div className="group relative transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-lg group-hover:blur-xl"></div>
            <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
              <CardContent className="p-8">
                {/* 头部图标和标题 */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm">
                      <Users className="h-8 w-8 text-blue-400 transition-all duration-300 group-hover:scale-110" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {t('dashboard.referralNetwork')}
                  </h3>
                </div>
                
                {/* 数据展示 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {data.directReferrals}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{t('dashboard.directReferrals')}</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {data.maxLayer}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{t('dashboard.maxLayer')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Premium 奖励卡片 */}
        <div className="group relative transition-all duration-500 hover:-translate-y-1 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-3xl blur-lg group-hover:blur-xl"></div>
          <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
            <CardContent className="p-8">
              {/* 头部图标和标题 */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
                    <Award className="h-8 w-8 text-green-400 transition-all duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                  {t('dashboard.rewardCenter')}
                </h3>
              </div>
              
              {/* 数据展示 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    ${data.totalRewards}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{t('dashboard.totalRewards')}</div>
                </div>
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-amber-400/10 border border-yellow-400/20 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    ${data.pendingRewards}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{t('dashboard.pendingRewards')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium 推荐链接卡片 */}
        <div className="group relative transition-all duration-500 hover:-translate-y-1 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-yellow-400/20 to-honey/20 rounded-3xl blur-lg group-hover:blur-xl"></div>
          <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
            <CardContent className="p-8">
              {/* 头部图标和标题 */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-honey/30 to-yellow-400/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-honey/20 to-yellow-400/20 backdrop-blur-sm">
                    <Share2 className="h-8 w-8 text-honey transition-all duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent">
                  {t('dashboard.shareReferral')}
                </h3>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {t('dashboard.shareDescription')}
              </p>
              
              {/* 推荐链接展示 */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/10 to-yellow-400/10 rounded-2xl blur-sm"></div>
                <div className="relative bg-gradient-to-br from-gray-50/90 to-gray-100/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-honey/20">
                  <div className="text-sm font-mono break-all text-honey font-medium">
                    {`${window.location.origin}/register?ref=${walletAddress}`}
                  </div>
                </div>
              </div>
              
              {/* Premium 复制按钮 */}
              <Button 
                onClick={copyReferralLink} 
                className="w-full h-12 bg-gradient-to-r from-honey via-yellow-400 to-honey hover:from-honey/90 hover:via-yellow-400/90 hover:to-honey/90 text-black font-bold text-base rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-honey/30"
              >
                <Copy className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:rotate-12" />
                {t('dashboard.copyLink')}
            </Button>
          </CardContent>
        </Card>

        {/* 快捷导航 */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors group" 
            onClick={() => setLocation('/referrals')}
          >
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold mb-2">{t('dashboard.referralNetwork')}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                {t('dashboard.viewMatrix')} <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors group" 
            onClick={() => setLocation('/rewards')}
          >
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold mb-2">{t('dashboard.rewardCenter')}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                {t('dashboard.claimRewards')} <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('dashboard.inviteTip')}</p>
        </div>
      </div>
    </div>
  );
}