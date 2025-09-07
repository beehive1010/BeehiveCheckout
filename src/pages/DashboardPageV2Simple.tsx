import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown, Gift, ShoppingCart, Activity, Coins, Loader2, RefreshCw, ArrowUpRight, Layers, Timer } from 'lucide-react';

// Simple dashboard data interface
interface DashboardData {
  balance: {
    bcc: {
      total: number;
      transferable: number;
      restricted: number;
      locked: number;
    };
    usdt: {
      totalEarned: number;
      availableRewards: number;
      totalWithdrawn: number;
    };
    activationTier: number;
  };
  matrix: {
    totalTeamSize: number;
    directReferrals: number;
    layerCounts: Record<number, number>;
    deepestLayer: number;
  };
  rewards: {
    totalEarnings: number;
    claimableAmount: number;
    pendingAmount: number;
    claimedAmount: number;
    claimableCount: number;
    pendingCount: number;
  };
}

// Direct Supabase function caller
async function callSupabaseFunction(functionName: string, data: any, walletAddress?: string) {
  const baseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1MjUwMTYsImV4cCI6MjA0MDEwMTAxNn0.gBWZUvwCJgP1lsVQlZNDsYXDxBEr31QfRtNEgYzS6NA';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  };
  
  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }
  
  const response = await fetch(`${baseUrl}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, walletAddress })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

function DashboardV2Simple() {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get balance data
      const balanceResult = await callSupabaseFunction('balance', {
        action: 'get-balance'
      }, walletAddress);
      
      // Get matrix data
      const matrixResult = await callSupabaseFunction('matrix', {
        action: 'get-matrix-stats'
      }, walletAddress);
      
      // Set default data structure
      setDashboardData({
        balance: {
          bcc: {
            total: balanceResult?.balance?.total_bcc || 0,
            transferable: balanceResult?.balance?.bcc_transferable || 0,
            restricted: 0,
            locked: balanceResult?.balance?.bcc_locked || 0,
          },
          usdt: {
            totalEarned: balanceResult?.balance?.total_usdt_earned || 0,
            availableRewards: balanceResult?.balance?.pending_rewards_usdt || 0,
            totalWithdrawn: 0
          },
          activationTier: 1
        },
        matrix: {
          totalTeamSize: matrixResult?.stats?.totalReferrals || 0,
          directReferrals: matrixResult?.stats?.directReferrals || 0,
          layerCounts: {},
          deepestLayer: 0
        },
        rewards: {
          totalEarnings: 0,
          claimableAmount: 0,
          pendingAmount: 0,
          claimedAmount: 0,
          claimableCount: 0,
          pendingCount: 0
        }
      });
      
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadDashboardData();
    }
  }, [walletAddress]);

  const copyReferralLink = async () => {
    const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: t('common.copied'),
        description: t('dashboard.referralLinkCopied'),
      });
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-honey" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-honey">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* User Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-honey" />
              {t('dashboard.memberStatus')}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-600 text-white">
                {t('dashboard.active')}
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                Tier {dashboardData.balance.activationTier}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey">{dashboardData.matrix.directReferrals}</div>
              <div className="text-sm text-muted-foreground">{t('dashboard.directReferrals')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{dashboardData.matrix.totalTeamSize}</div>
              <div className="text-sm text-muted-foreground">{t('dashboard.totalTeam')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">${dashboardData.balance.usdt.totalEarned.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">{t('dashboard.totalEarnings')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* BCC Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-honey" />
              BCC {t('dashboard.balance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-honey">{dashboardData.balance.bcc.total}</div>
                <div className="text-sm text-muted-foreground">{t('dashboard.totalBcc')}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-green-400 font-semibold">{dashboardData.balance.bcc.transferable}</div>
                  <div className="text-muted-foreground">{t('dashboard.transferable')}</div>
                </div>
                <div>
                  <div className="text-orange-400 font-semibold">{dashboardData.balance.bcc.locked}</div>
                  <div className="text-muted-foreground">{t('dashboard.locked')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* USDT Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              USDT {t('dashboard.earnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-green-400">${dashboardData.balance.usdt.totalEarned.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{t('dashboard.totalEarned')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">${dashboardData.balance.usdt.availableRewards.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{t('dashboard.availableRewards')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-400" />
              {t('dashboard.referralLink')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {t('dashboard.shareToEarn')}
              </div>
              <Button onClick={copyReferralLink} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardV2Simple;