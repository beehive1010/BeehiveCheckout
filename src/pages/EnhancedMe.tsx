import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { 
  UsersIcon, 
  Edit, 
  User, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Target, 
  Crown, 
  Layers, 
  ArrowUpRight,
  RefreshCw,
  Award,
  Timer,
  Coins,
  BarChart3,
  Settings,
  Wallet,
  History,
  Loader2
} from 'lucide-react';

// Enhanced interfaces based on Me page components
interface UserProfile {
  walletAddress: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  joinedAt: string;
  membershipLevel: number;
  activationTier: number;
  isActivated: boolean;
  profileData?: any;
}

interface DetailedBalance {
  bcc: {
    total: number;
    transferable: number;
    restricted: number;
    locked: number;
    breakdown: any[];
  };
  usdt: {
    totalEarned: number;
    availableRewards: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    recentTransactions: any[];
  };
}

interface MatrixDetails {
  tree: any[];
  layers: Record<number, any[]>;
  performance: {
    spilloverRate: number;
    growthVelocity: number;
    rewardEfficiency: number;
  };
  directReferrals: any[];
  teamMembers: any[];
}

interface RewardsDetails {
  claimable: any[];
  pending: any[];
  history: any[];
  statistics: {
    totalClaimed: number;
    totalPending: number;
    averageReward: number;
    bestMonth: string;
  };
}

// Enhanced data calling functions
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

// Get comprehensive user data using all methods
const getComprehensiveUserData = async (walletAddress: string, method: string) => {
  try {
    if (method === 'functions') {
      // Method 1: Supabase Functions
      const [authResult, balanceResult, matrixResult] = await Promise.all([
        callSupabaseFunction('auth', 'get-user', {}, walletAddress).catch(() => null),
        callSupabaseFunction('balance', 'get-balance', {}, walletAddress).catch(() => null),
        callSupabaseFunction('matrix', 'get-matrix-stats', {}, walletAddress).catch(() => null)
      ]);
      
      return {
        profile: {
          walletAddress,
          username: authResult?.user?.username,
          membershipLevel: authResult?.user?.membershipLevel || 1,
          isActivated: authResult?.user?.isActivated || false,
          joinedAt: authResult?.user?.createdAt || new Date().toISOString()
        },
        balance: balanceResult?.balance || {},
        matrix: matrixResult?.stats || {}
      };
      
    } else if (method === 'views') {
      // Method 2: Supabase Views
      const [balanceView, memberView, matrixView] = await Promise.all([
        supabase.from('user_bcc_balance_overview').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('member_requirements_view').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('matrix_overview').select('*').eq('root_wallet', walletAddress).single()
      ]);
      
      return {
        profile: {
          walletAddress,
          membershipLevel: memberView.data?.current_level || 1,
          isActivated: memberView.data?.is_activated || false,
          joinedAt: memberView.data?.created_at || new Date().toISOString()
        },
        balance: balanceView.data || {},
        matrix: matrixView.data || {}
      };
      
    } else {
      // Method 3: Direct table queries
      const [userResult, memberResult, balanceResult, matrixResult, rewardsResult] = await Promise.all([
        supabase.from('users').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('members').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('user_balances').select('*').eq('wallet_address', walletAddress).single(),
        supabase.from('matrix_positions').select('*').eq('root_wallet', walletAddress),
        supabase.from('layer_rewards').select('*').eq('recipient_wallet', walletAddress).limit(20)
      ]);
      
      return {
        profile: {
          walletAddress,
          username: userResult.data?.username,
          email: userResult.data?.email,
          membershipLevel: memberResult.data?.current_level || 1,
          isActivated: memberResult.data?.is_activated || false,
          joinedAt: userResult.data?.created_at || new Date().toISOString()
        },
        balance: balanceResult.data || {},
        matrix: {
          totalPositions: matrixResult.data?.length || 0,
          directReferrals: matrixResult.data?.filter(p => p.layer === 1).length || 0
        },
        rewards: rewardsResult.data || []
      };
    }
    
  } catch (error) {
    console.error(`Error fetching data with method ${method}:`, error);
    throw error;
  }
};

export default function EnhancedMe() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [detailedBalance, setDetailedBalance] = useState<DetailedBalance | null>(null);
  const [matrixDetails, setMatrixDetails] = useState<MatrixDetails | null>(null);
  const [rewardsDetails, setRewardsDetails] = useState<RewardsDetails | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataMethod, setDataMethod] = useState<'functions' | 'views' | 'tables'>('functions');

  const loadUserData = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getComprehensiveUserData(walletAddress, dataMethod);
      
      // Set user profile
      setUserProfile({
        walletAddress,
        username: data.profile?.username || `User ${walletAddress.slice(-6)}`,
        email: data.profile?.email,
        membershipLevel: data.profile?.membershipLevel || 1,
        activationTier: data.profile?.activationTier || 1,
        isActivated: data.profile?.isActivated || true,
        joinedAt: data.profile?.joinedAt || new Date().toISOString()
      });

      // Set detailed balance
      setDetailedBalance({
        bcc: {
          total: data.balance?.total_bcc || data.balance?.totalBcc || 0,
          transferable: data.balance?.bcc_transferable || 0,
          restricted: 0,
          locked: data.balance?.bcc_locked || 0,
          breakdown: []
        },
        usdt: {
          totalEarned: data.balance?.total_usdt_earned || 0,
          availableRewards: data.balance?.pending_rewards_usdt || 0,
          totalWithdrawn: 0,
          pendingWithdrawals: 0,
          recentTransactions: []
        }
      });

      // Set matrix details
      setMatrixDetails({
        tree: [],
        layers: {},
        performance: {
          spilloverRate: 0,
          growthVelocity: 0,
          rewardEfficiency: 0
        },
        directReferrals: [],
        teamMembers: []
      });

      // Set rewards details
      setRewardsDetails({
        claimable: [],
        pending: data.rewards || [],
        history: [],
        statistics: {
          totalClaimed: 0,
          totalPending: data.rewards?.length || 0,
          averageReward: 0,
          bestMonth: 'N/A'
        }
      });
      
    } catch (err: any) {
      console.error('User data load error:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadUserData();
    }
  }, [walletAddress, dataMethod]);

  const handleEditProfile = () => {
    setLocation('/me/profile-settings');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-honey" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
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
        <Button onClick={loadUserData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!userProfile) {
    return <div>No profile data available</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-honey">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and view detailed statistics</p>
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
          <Button onClick={loadUserData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userProfile.avatarUrl} />
              <AvatarFallback className="bg-honey/20 text-honey text-lg">
                {userProfile.username?.slice(0, 2).toUpperCase() || walletAddress?.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{userProfile.username}</h2>
                <Button onClick={handleEditProfile} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
              <p className="text-muted-foreground">{userProfile.walletAddress}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {userProfile.isActivated ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  Level {userProfile.membershipLevel}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Tier {userProfile.activationTier}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">BCC Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-honey">{detailedBalance?.bcc.total || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total BCC Tokens</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">USDT Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">${detailedBalance?.usdt.totalEarned.toFixed(2) || '0.00'}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Earnings</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Matrix Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{userProfile.membershipLevel}</div>
                <div className="text-xs text-muted-foreground mt-1">Current Level</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{rewardsDetails?.statistics.totalPending || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Member Since */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-honey" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Member Since</div>
                  <div className="font-semibold">{new Date(userProfile.joinedAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Data Source</div>
                  <Badge variant="outline">{dataMethod}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>BCC Balance Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total BCC</span>
                  <span className="font-semibold text-honey">{detailedBalance?.bcc.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transferable</span>
                  <span className="font-semibold text-green-400">{detailedBalance?.bcc.transferable || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Locked</span>
                  <span className="font-semibold text-orange-400">{detailedBalance?.bcc.locked || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>USDT Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Earned</span>
                  <span className="font-semibold text-green-400">${detailedBalance?.usdt.totalEarned.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className="font-semibold text-blue-400">${detailedBalance?.usdt.availableRewards.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Withdrawn</span>
                  <span className="font-semibold text-gray-400">${detailedBalance?.usdt.totalWithdrawn.toFixed(2) || '0.00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matrix Network Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Matrix details will be loaded based on selected data method</p>
                <p className="text-sm text-muted-foreground mt-2">Current method: <Badge variant="outline">{dataMethod}</Badge></p>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{rewardsDetails?.statistics.totalClaimed || 0}</div>
                  <div className="text-sm text-muted-foreground">Claimed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">{rewardsDetails?.statistics.totalPending || 0}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">${rewardsDetails?.statistics.averageReward.toFixed(2) || '0.00'}</div>
                  <div className="text-sm text-muted-foreground">Average</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-400">{rewardsDetails?.statistics.bestMonth || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Best Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Edit Profile</div>
                  <div className="text-sm text-muted-foreground">Update your username and preferences</div>
                </div>
                <Button onClick={handleEditProfile} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <div className="font-medium mb-2">Data Loading Method</div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setDataMethod('functions')} 
                    variant={dataMethod === 'functions' ? 'default' : 'outline'} 
                    size="sm"
                  >
                    Supabase Functions
                  </Button>
                  <Button 
                    onClick={() => setDataMethod('views')} 
                    variant={dataMethod === 'views' ? 'default' : 'outline'} 
                    size="sm"
                  >
                    Database Views
                  </Button>
                  <Button 
                    onClick={() => setDataMethod('tables')} 
                    variant={dataMethod === 'tables' ? 'default' : 'outline'} 
                    size="sm"
                  >
                    Direct Tables
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Choose how to load your data: Functions (Edge Functions), Views (Optimized queries), or Tables (Direct database access)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}