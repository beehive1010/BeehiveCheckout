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

        {/* 主要数据卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* BCC余额卡片 */}
          <Card className="bg-gradient-to-br from-honey/10 to-honey/5 border-honey/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-8 w-8 text-honey" />
                <h3 className="text-lg font-semibold text-honey">{t('dashboard.bccBalance')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-honey mb-1">
                    {data.bccBalance}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.bccBalance')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-400 mb-1">
                    {data.bccLocked}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.bccLocked')}</div>
                </div>
              </div>
              
              {/* Top Up Button */}
              <Button 
                onClick={() => setLocation('/tokens')}
                className="w-full bg-honey/10 hover:bg-honey/20 text-honey border border-honey/30"
                variant="outline"
                data-testid="button-topup"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.topUp')}
              </Button>
            </CardContent>
          </Card>

          {/* 推荐网络卡片 */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8 text-blue-400" />
                <h3 className="text-lg font-semibold text-blue-400">{t('dashboard.referralNetwork')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400 mb-1">
                    {data.directReferrals}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.directReferrals')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400 mb-1">
                    {data.maxLayer}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.maxLayer')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 奖励卡片 */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="h-8 w-8 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400">{t('dashboard.rewardCenter')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-400 mb-1">
                  ${data.totalRewards}
                </div>
                <div className="text-xs text-muted-foreground">{t('dashboard.totalRewards')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400 mb-1">
                  ${data.pendingRewards}
                </div>
                <div className="text-xs text-muted-foreground">{t('dashboard.pendingRewards')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 推荐链接 */}
        <Card className="mb-8 border-honey/20 bg-gradient-to-r from-honey/5 to-yellow-400/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="h-5 w-5 text-honey" />
              <h3 className="text-lg font-semibold text-honey">{t('dashboard.shareReferral')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.shareDescription')}
            </p>
            <div className="bg-background/50 rounded-lg p-3 mb-4 border border-border/50">
              <div className="text-xs font-mono break-all text-honey">
                {`${window.location.origin}/register?ref=${walletAddress}`}
              </div>
            </div>
            <Button 
              onClick={copyReferralLink} 
              className="w-full bg-honey hover:bg-honey/90 text-black font-semibold"
            >
              <Copy className="h-4 w-4 mr-2" />
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