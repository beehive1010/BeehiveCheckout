import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveWallet } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Crown, 
  Layers, 
  ArrowUpRight,
  RefreshCw,
  Award,
  Timer,
  Coins,
  BarChart3,
  Copy,
  Share2,
  Building2,
  Gift,
  ShoppingCart,
  Loader2,
  User
} from 'lucide-react';

// Data interfaces based on existing components
interface DashboardStats {
  balance: {
    totalBcc: number;
    transferableBcc: number;
    lockedBcc: number;
    totalUsdtEarned: number;
    availableRewards: number;
    pendingRewards: number;
  };
  matrix: {
    directReferrals: number;
    totalTeamSize: number;
    layers: any[];
    recentActivity: any[];
  };
  rewards: {
    claimableRewards: any[];
    pendingRewards: any[];
    totalClaimed: number;
    totalPending: number;
  };
  member: {
    currentLevel: number;
    activationTier: number;
    isActivated: boolean;
    joinedAt: string;
  };
}

// Method 1: Direct Supabase Function Calls
const callSupabaseFunction = async (functionName: string, action: string, data: any = {}, walletAddress?: string) => {
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
    body: JSON.stringify({ action, ...data, walletAddress })
  });
  
  if (!response.ok) {
    throw new Error(`${functionName} API Error: ${response.status}`);
  }
  
  return response.json();
};

// Method 2: Direct Supabase SDK API calls for views
const getDataFromViews = async (walletAddress: string) => {
  try {
    // Get balance from view
    const { data: balanceData } = await supabase
      .from('user_bcc_balance_overview')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Get member requirements
    const { data: memberData } = await supabase
      .from('member_requirements_view')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Get matrix overview
    const { data: matrixData } = await supabase
      .from('matrix_overview')
      .select('*')
      .eq('root_wallet', walletAddress)
      .single();

    return {
      balance: balanceData,
      member: memberData,
      matrix: matrixData
    };
  } catch (error) {
    console.error('Views API error:', error);
    return null;
  }
};

// Method 3: Direct table queries (fallback)
const getDataFromTables = async (walletAddress: string) => {
  try {
    // Get user balance
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Get member info
    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Get matrix positions count (using members table)
    const { data: matrixCount } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
      .eq('referrer_wallet', walletAddress);

    // Get rewards
    const { data: rewardsData } = await supabase
      .from('layer_rewards')
      .select('*')
      .eq('recipient_wallet', walletAddress)
      .limit(10);

    return {
      balance: balanceData,
      member: memberData,
      matrixCount: matrixCount?.length || 0,
      rewards: rewardsData || []
    };
  } catch (error) {
    console.error('Tables API error:', error);
    return null;
  }
};

export default function EnhancedDashboard() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const activeWallet = useActiveWallet();
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataMethod] = useState<'functions' | 'views' | 'tables'>('functions'); // 固定使用functions数据源

  const loadDashboardData = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let data: any = {};
      
      if (dataMethod === 'functions') {
        // Method 1: Use Supabase Functions
        const [balanceResult, matrixResult] = await Promise.all([
          callSupabaseFunction('balance', 'get-balance', {}, walletAddress).catch(() => null),
          callSupabaseFunction('matrix', 'get-matrix-stats', {}, walletAddress).catch(() => null)
        ]);
        
        data = {
          balance: balanceResult?.balance || {},
          matrix: matrixResult?.stats || {}
        };
        
      } else if (dataMethod === 'views') {
        // Method 2: Use Supabase Views
        data = await getDataFromViews(walletAddress);
        
      } else {
        // Method 3: Direct table queries
        data = await getDataFromTables(walletAddress);
      }

      // Transform data to consistent format
      setDashboardStats({
        balance: {
          totalBcc: data?.balance?.total_bcc || data?.balance?.totalBcc || 0,
          transferableBcc: data?.balance?.bcc_transferable || 0,
          lockedBcc: data?.balance?.bcc_locked || 0,
          totalUsdtEarned: data?.balance?.total_usdt_earned || 0,
          availableRewards: data?.balance?.pending_rewards_usdt || 0,
          pendingRewards: 0
        },
        matrix: {
          directReferrals: data?.matrix?.directReferrals || data?.matrix?.direct_referrals || 0,
          totalTeamSize: data?.matrix?.totalReferrals || data?.matrix?.total_team_size || data?.matrixCount || 0,
          layers: [],
          recentActivity: data?.matrix?.recentActivity || []
        },
        rewards: {
          claimableRewards: [],
          pendingRewards: data?.rewards || [],
          totalClaimed: 0,
          totalPending: data?.rewards?.length || 0
        },
        member: {
          currentLevel: data?.member?.current_level || userData?.membershipLevel || 1,
          activationTier: data?.member?.activation_tier || 1,
          isActivated: data?.member?.is_activated || true,
          joinedAt: data?.member?.created_at || new Date().toISOString()
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
  }, [walletAddress, dataMethod]);

  const copyReferralLink = async () => {
    // Get the original wallet address (not lowercase) from activeWallet
    const originalWalletAddress = activeWallet?.getAccount()?.address || walletAddress;
    // Use current page URL as base for referral link
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/register?ref=${originalWalletAddress}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: t('dashboard.linkCopied.title') || 'Link Copied!',
        description: t('dashboard.linkCopied.description') || 'Referral link copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-honey" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
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

  if (!dashboardStats) {
    return <div>No data available</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-honey">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your BeeHive overview</p>
      </div>

      {/* 用户信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-honey" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="secondary" className="bg-green-600 text-white">
                {dashboardStats.member.isActivated ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-muted-foreground">Level</div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                Level {dashboardStats.member.currentLevel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 奖励余额 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-green-400" />
            Reward Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Earned</span>
              <span className="text-xl font-bold text-green-400">${dashboardStats.balance.totalUsdtEarned.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <span className="text-lg font-semibold text-blue-400">${dashboardStats.balance.availableRewards.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-lg font-semibold text-purple-400">{dashboardStats.rewards.totalPending}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BCC余额 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-honey" />
            BCC Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total BCC</span>
              <span className="text-xl font-bold text-honey">{dashboardStats.balance.totalBcc}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-400">{dashboardStats.balance.transferableBcc}</div>
                <div className="text-xs text-muted-foreground">Transferable</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-400">{dashboardStats.balance.lockedBcc}</div>
                <div className="text-xs text-muted-foreground">Locked</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 推荐链接组件 - 显示链接 */}
      <Card className="border-honey/20 bg-gradient-to-r from-honey/5 to-yellow-400/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-honey" />
            {t('dashboard.referralLink.title') || 'Referral Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('dashboard.shareToEarn') || 'Share your link to earn commissions from your referrals'}
            </div>
            
            {/* 显示实际链接 */}
            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Your Referral Link:</div>
              <div className="text-sm font-mono break-all text-honey">
                {`${window.location.origin}/register?ref=${(activeWallet?.getAccount()?.address || walletAddress)}`}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={copyReferralLink} className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.referralLink.copy') || 'Copy Link'}
              </Button>
              <Button 
                onClick={() => setLocation('/referrals')} 
                variant="outline"
                className="border-honey/30 text-honey hover:bg-honey/10"
              >
                <Users className="h-4 w-4 mr-2" />
                Network
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 推荐和奖励页面导航 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/referrals')}>
          <CardContent className="p-4 text-center space-y-2">
            <Users className="h-8 w-8 text-blue-400 mx-auto" />
            <div className="font-semibold">Referrals</div>
            <div className="text-2xl font-bold text-honey">{dashboardStats.matrix.directReferrals}</div>
            <div className="text-xs text-muted-foreground">Direct referrals</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/rewards')}>
          <CardContent className="p-4 text-center space-y-2">
            <Award className="h-8 w-8 text-green-400 mx-auto" />
            <div className="font-semibold">Rewards</div>
            <div className="text-2xl font-bold text-green-400">{dashboardStats.rewards.totalClaimed}</div>
            <div className="text-xs text-muted-foreground">Total claimed</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}