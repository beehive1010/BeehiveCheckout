import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Crown, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Zap,
  Gift,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  Activity,
  Target,
  Star,
  Trophy,
  Calendar,
  Coins,
  Database,
  Network,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import CountdownTimer from '../rewards/CountdownTimer';
import { PendingRewardsTimer } from '../rewards/PendingRewardsTimer';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  user: {
    wallet_address: string;
    username?: string;
    current_level: number;
    is_activated: boolean;
    join_date: string;
    total_spent_usdt: number;
    activation_tier: number;
  };
  membership: {
    levels_owned: number[];
    max_level: number;
    next_available_level?: number;
    direct_referrals: number;
    total_team_size: number;
    total_referrals: number;
  };
  rewards: {
    total_earned_usdt: number;
    claimable_usdt: number;
    pending_usdt: number;
    claimed_rewards: number;
    pending_rewards: number;
    expired_rewards: number;
  };
  bcc: {
    transferable_balance: number;
    locked_balance: number;
    total_released: number;
    tier_progress: {
      current_tier: number;
      position_in_tier: number;
      tier_max: number;
    };
  };
  activity: {
    last_login: string;
    last_purchase: string;
    last_claim: string;
    active_timers: number;
    recent_achievements: any[];
  };
}

interface EnhancedMemberDashboardProps {
  className?: string;
}

export function EnhancedMemberDashboard({ className = "" }: EnhancedMemberDashboardProps) {
  const { t } = useI18n();
  const { walletAddress, userData } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch comprehensive dashboard data using new auth function
  const { data: dashboardStats, isLoading, error, refetch } = useQuery({
    queryKey: ['/dashboard/enhanced-stats', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'x-wallet-address': walletAddress!,
        },
        body: JSON.stringify({
          action: 'get-dashboard-stats'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard stats');
      }
      
      return result.data;
    },
  });

  // Matrix view state
  const [matrixData, setMatrixData] = useState<any>(null);
  
  // Fetch Matrix view data for team tab
  const { data: matrixView } = useQuery({
    queryKey: ['/matrix/1x3-view', walletAddress],
    enabled: !!walletAddress && activeTab === 'team',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_1x3_matrix_view', {
        p_wallet_address: walletAddress!,
        p_levels: 3
      });

      if (error) throw error;
      return data;
    },
  });

  // Handle upgrade action
  const handleUpgrade = async (level: number) => {
    try {
      // This would navigate to the upgrade flow
      window.location.href = `/upgrade?level=${level}`;
    } catch (error) {
      console.error('Upgrade navigation error:', error);
    }
  };

  if (!walletAddress) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">{t('dashboard.connectWallet')}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboardStats) {
    return (
      <Card className={`border-destructive/20 ${className}`}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">{t('dashboard.loadError')}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { user, membership, rewards, bcc, activity } = dashboardStats;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with User Info */}
      <Card className="bg-gradient-to-br from-honey/5 to-honey/10 border-honey/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${walletAddress}`} />
                <AvatarFallback className="bg-honey/20 text-honey">
                  {user.username?.slice(0, 2).toUpperCase() || walletAddress.slice(2, 4).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-honey">
                  {user.username || `User ${walletAddress.slice(0, 8)}`}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                    Level {user.current_level}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                    Tier {bcc.tier_progress.current_tier}
                  </Badge>
                  {user.is_activated && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activated
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {new Date(user.join_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button className="bg-honey hover:bg-honey/90 text-black">
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade NFT Level
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalEarned')}</p>
                <p className="text-2xl font-bold text-honey">${rewards.total_earned_usdt}</p>
                <p className="text-xs text-green-400">USDT</p>
              </div>
              <DollarSign className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.teamSize')}</p>
                <p className="text-2xl font-bold text-blue-400">{membership.total_team_size}</p>
                <p className="text-xs text-blue-400">{membership.direct_referrals} {t('dashboard.direct')}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">BCC Balance</p>
                <p className="text-2xl font-bold text-purple-400">{bcc.transferable_balance.toLocaleString()}</p>
                <p className="text-xs text-purple-400">+{bcc.locked_balance.toLocaleString()} locked</p>
              </div>
              <Coins className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Timers</p>
                <p className="text-2xl font-bold text-orange-400">{activity.active_timers}</p>
                <p className="text-xs text-orange-400">Pending rewards</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Rewards Timer */}
      <PendingRewardsTimer 
        walletAddress={walletAddress}
        onRewardClaimable={(rewardId) => {
          console.log('Reward now claimable:', rewardId);
          refetch(); // Refresh dashboard stats when reward becomes claimable
        }}
      />

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="bcc">BCC Tokens</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Membership Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-honey">
                  <Crown className="h-5 w-5" />
                  Membership Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Current Level</span>
                    <span className="font-bold text-honey">Level {user.current_level}</span>
                  </div>
                  <Progress value={(user.current_level / 19) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {19 - user.current_level} levels remaining to Master (Level 19)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-honey">{membership.levels_owned.length}</div>
                    <div className="text-xs text-muted-foreground">NFTs Owned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">${user.total_spent_usdt}</div>
                    <div className="text-xs text-muted-foreground">Total Invested</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BCC Tier Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <Database className="h-5 w-5" />
                  BCC Tier Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Tier {bcc.tier_progress.current_tier} Position</span>
                    <span className="font-bold text-purple-400">
                      #{bcc.tier_progress.position_in_tier.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(bcc.tier_progress.position_in_tier / bcc.tier_progress.tier_max) * 100} 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {(bcc.tier_progress.tier_max - bcc.tier_progress.position_in_tier).toLocaleString()} positions until next tier
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">{bcc.transferable_balance.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Transferable BCC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{bcc.locked_balance.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Locked BCC</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">${rewards.claimable_usdt}</div>
                <div className="text-sm text-muted-foreground">Claimable Rewards</div>
                <div className="text-xs text-green-400">{rewards.claimed_rewards} claims ready</div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">${rewards.pending_usdt}</div>
                <div className="text-sm text-muted-foreground">Pending Rewards</div>
                <div className="text-xs text-yellow-400">{rewards.pending_rewards} pending</div>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-400">{rewards.expired_rewards}</div>
                <div className="text-sm text-muted-foreground">Expired Rewards</div>
                <div className="text-xs text-red-400">Rolled up to upline</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Users className="h-5 w-5" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{membership.direct_referrals}</div>
                    <div className="text-sm text-muted-foreground">Direct Referrals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{membership.total_team_size}</div>
                    <div className="text-sm text-muted-foreground">Total Team</div>
                  </div>
                </div>
                <div className="text-center pt-4 border-t">
                  <div className="text-lg font-bold text-purple-400">{membership.total_referrals}</div>
                  <div className="text-sm text-muted-foreground">Total Referrals</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-honey">
                  <Network className="h-5 w-5" />
                  {t('dashboard.matrixPerformance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matrixView && matrixView.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-honey mb-2">
                        {t('dashboard.matrixRoots', { count: matrixView.length })}
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {t('dashboard.showingLevels', { levels: 3 })}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {matrixView.slice(0, 5).map((root: any, index: number) => (
                        <div key={root.wallet_address} className="flex items-center justify-between p-2 bg-honey/5 rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              L{root.current_level}
                            </Badge>
                            <span className="text-sm font-medium">
                              {root.username || `${root.wallet_address.slice(0, 6)}...`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {root.total_downline} {t('dashboard.downline')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {t('dashboard.viewDetailedMatrix')}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-4">
                      {t('dashboard.noMatrixData')}
                    </div>
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {t('dashboard.viewDetailedMatrix')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bcc" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <Coins className="h-5 w-5" />
                  BCC Balance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Transferable</span>
                    <span className="font-bold text-purple-400">{bcc.transferable_balance.toLocaleString()} BCC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Locked (Tier-based)</span>
                    <span className="font-bold text-orange-400">{bcc.locked_balance.toLocaleString()} BCC</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium">Total Released</span>
                    <span className="font-bold text-honey">{bcc.total_released.toLocaleString()} BCC</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-honey">
                  <Target className="h-5 w-5" />
                  Tier Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey mb-2">
                    Tier {bcc.tier_progress.current_tier}
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Position #{bcc.tier_progress.position_in_tier.toLocaleString()} of {bcc.tier_progress.tier_max.toLocaleString()}
                  </div>
                  <Button variant="outline" className="w-full">
                    <Gift className="mr-2 h-4 w-4" />
                    View Tier Benefits
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Last Login</div>
                <div className="font-medium">
                  {activity.last_login ? new Date(activity.last_login).toLocaleDateString() : 'Never'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Last Purchase</div>
                <div className="font-medium">
                  {activity.last_purchase ? new Date(activity.last_purchase).toLocaleDateString() : 'Never'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Gift className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Last Claim</div>
                <div className="font-medium">
                  {activity.last_claim ? new Date(activity.last_claim).toLocaleDateString() : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          {activity.recent_achievements && activity.recent_achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-honey">
                  <Trophy className="h-5 w-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activity.recent_achievements.map((achievement: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-honey/5">
                      <Star className="h-4 w-4 text-honey" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{achievement.title}</div>
                        <div className="text-xs text-muted-foreground">{achievement.description}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(achievement.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedMemberDashboard;