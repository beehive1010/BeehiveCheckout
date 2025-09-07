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
  Loader2
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

    // Get matrix positions count (using referral_nodes instead)
    const { data: matrixCount } = await supabase
      .from('referral_nodes')
      .select('*', { count: 'exact' })
      .eq('root_wallet', walletAddress);

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
  const [dataMethod, setDataMethod] = useState<'functions' | 'views' | 'tables'>('functions');

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
    const referralLink = `${window.location.origin}/register?ref=${originalWalletAddress}`;
    
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
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <div className="flex space-x-2">
          <Button onClick={() => setDataMethod('functions')} variant={dataMethod === 'functions' ? 'default' : 'outline'} size="sm">
            Functions
          </Button>
          <Button onClick={() => setDataMethod('views')} variant={dataMethod === 'views' ? 'default' : 'outline'} size="sm">
            Views
          </Button>
          <Button onClick={() => setDataMethod('tables')} variant={dataMethod === 'tables' ? 'default' : 'outline'} size="sm">
            Tables
          </Button>
        </div>
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header with Data Method Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-honey">Dashboard</h1>
          <p className="text-muted-foreground">Your BeeHive overview</p>
        </div>
        <div className="hidden md:flex gap-2">
          <div className="flex border rounded-lg p-1 bg-muted">
            <Button 
              onClick={() => setDataMethod('functions')} 
              variant={dataMethod === 'functions' ? 'default' : 'ghost'} 
              size="sm"
            >
              Functions
            </Button>
            <Button 
              onClick={() => setDataMethod('views')} 
              variant={dataMethod === 'views' ? 'default' : 'ghost'} 
              size="sm"
            >
              Views
            </Button>
            <Button 
              onClick={() => setDataMethod('tables')} 
              variant={dataMethod === 'tables' ? 'default' : 'ghost'} 
              size="sm"
            >
              Tables
            </Button>
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Member Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-honey" />
              Member Status
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-600 text-white">
                {dashboardStats.member.isActivated ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                Level {dashboardStats.member.currentLevel}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Tier {dashboardStats.member.activationTier}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey">{dashboardStats.matrix.directReferrals}</div>
              <div className="text-sm text-muted-foreground">Direct Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{dashboardStats.matrix.totalTeamSize}</div>
              <div className="text-sm text-muted-foreground">Total Team</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">${dashboardStats.balance.totalUsdtEarned.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{dashboardStats.rewards.totalPending}</div>
              <div className="text-sm text-muted-foreground">Pending Rewards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link Section - Priority */}
      <Card className="border-honey/20 bg-gradient-to-r from-honey/5 to-yellow-400/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-honey" />
            {t('dashboard.referralLink') || 'Referral Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t('dashboard.shareToEarn') || 'Share your link to earn commissions from your referrals'}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyReferralLink} className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink') || 'Copy Referral Link'}
              </Button>
              <Button 
                onClick={() => setLocation('/referrals')} 
                variant="outline"
                className="border-honey/30 text-honey hover:bg-honey/10"
              >
                <Users className="h-4 w-4 mr-2" />
                {t('nav.referrals') || 'View Network'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* BCC Balance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-honey" />
              BCC Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-honey">{dashboardStats.balance.totalBcc}</div>
                <div className="text-sm text-muted-foreground">Total BCC</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-green-400 font-semibold">{dashboardStats.balance.transferableBcc}</div>
                  <div className="text-muted-foreground">Transferable</div>
                </div>
                <div>
                  <div className="text-orange-400 font-semibold">{dashboardStats.balance.lockedBcc}</div>
                  <div className="text-muted-foreground">Locked</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* USDT Earnings Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-400" />
              USDT Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-green-400">${dashboardStats.balance.totalUsdtEarned.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">${dashboardStats.balance.availableRewards.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Available Rewards</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matrix Network Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-400" />
              Matrix Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xl font-bold text-honey">{dashboardStats.matrix.directReferrals}</div>
                  <div className="text-sm text-muted-foreground">Direct Referrals</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-400">{dashboardStats.matrix.totalTeamSize}</div>
                  <div className="text-sm text-muted-foreground">Total Team</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pending Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-purple-400" />
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-purple-400">{dashboardStats.rewards.totalPending}</div>
                <div className="text-sm text-muted-foreground">Rewards to claim</div>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                disabled={dashboardStats.rewards.totalPending === 0}
              >
                <Gift className="h-4 w-4 mr-2" />
                View Pending Rewards
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Claimed Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-400" />
              Claimed Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-green-400">{dashboardStats.rewards.totalClaimed}</div>
                <div className="text-sm text-muted-foreground">Total claimed</div>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-green-400/30 text-green-400 hover:bg-green-400/10"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Data Method Selector */}
      <div className="md:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex border rounded-lg p-1 bg-muted">
                <Button 
                  onClick={() => setDataMethod('functions')} 
                  variant={dataMethod === 'functions' ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex-1"
                >
                  Functions
                </Button>
                <Button 
                  onClick={() => setDataMethod('views')} 
                  variant={dataMethod === 'views' ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex-1"
                >
                  Views
                </Button>
                <Button 
                  onClick={() => setDataMethod('tables')} 
                  variant={dataMethod === 'tables' ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex-1"
                >
                  Tables
                </Button>
              </div>
              <Button onClick={loadDashboardData} variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}