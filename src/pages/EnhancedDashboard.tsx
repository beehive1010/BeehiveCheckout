import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
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

    // Get matrix positions count
    const { data: matrixCount } = await supabase
      .from('matrix_positions')
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Data Method Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-honey">Enhanced Dashboard</h1>
          <p className="text-muted-foreground">Multi-method data loading</p>
        </div>
        <div className="flex gap-2">
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* BCC Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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

            {/* Referral Link Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-400" />
                  Referral Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Share to earn commissions
                  </div>
                  <Button onClick={copyReferralLink} variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Balance Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Data source: <Badge variant="outline">{dataMethod}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold">BCC Balance</div>
                    <div className="text-honey text-xl">{dashboardStats.balance.totalBcc}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">USDT Earned</div>
                    <div className="text-green-400 text-xl">${dashboardStats.balance.totalUsdtEarned.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matrix Network</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold">Direct Referrals</div>
                  <div className="text-honey text-xl">{dashboardStats.matrix.directReferrals}</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">Total Team Size</div>
                  <div className="text-blue-400 text-xl">{dashboardStats.matrix.totalTeamSize}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rewards Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold">Pending Rewards</div>
                  <div className="text-purple-400 text-xl">{dashboardStats.rewards.totalPending}</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">Total Claimed</div>
                  <div className="text-green-400 text-xl">{dashboardStats.rewards.totalClaimed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}