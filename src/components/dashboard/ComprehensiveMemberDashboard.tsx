import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Coins, 
  Users, 
  TrendingUp, 
  Clock, 
  Wallet,
  ArrowUp,
  CheckCircle,
  AlertTriangle,
  Gift,
  DollarSign,
  Crown,
  Star,
  Target,
  Loader2
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import MembershipActivationSystem from '../membership/MembershipActivationSystem';
import ReferralMatrixVisualization from '../referrals/ReferralMatrixVisualization';

interface MemberStats {
  currentLevel: number;
  levelsOwned: number[];
  activationRank: number;
  tier: number;
  directReferrals: number;
  totalDownline: number;
}

interface BalanceInfo {
  usdc: number;
  bccTransferable: number;
  bccLocked: number;
  totalEarned: number;
}

interface PendingReward {
  id: string;
  amount: number;
  level: number;
  hoursLeft: number;
  canClaim: boolean;
  status: 'pending' | 'claimable';
}

interface UpgradeInfo {
  nextLevel: number;
  cost: number;
  bccUnlock: number;
  canUpgrade: boolean;
  requirements: {
    directReferrals: {
      required: number;
      current: number;
      satisfied: boolean;
    };
    sequential: boolean;
  };
}

interface WithdrawalLimits {
  daily: {
    limit: number;
    used: number;
    remaining: number;
  };
  monthly: {
    limit: number;
    used: number;
    remaining: number;
  };
}

const ComprehensiveMemberDashboard: React.FC = () => {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfo | null>(null);
  const [withdrawalLimits, setWithdrawalLimits] = useState<WithdrawalLimits | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load all dashboard data
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadDashboardData();
    }
  }, [isConnected, walletAddress]);

  const loadDashboardData = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      await Promise.all([
        loadMemberStats(),
        loadBalanceInfo(),
        loadPendingRewards(),
        loadUpgradeInfo(),
        loadWithdrawalLimits()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadMemberStats = async () => {
    try {
      // Get member data from database
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('current_level, levels_owned, activation_rank, tier_level')
        .eq('wallet_address', walletAddress!)
        .maybeSingle();

      if (memberError) {
        console.error('Member data error:', memberError);
        return;
      }

      // Get referral counts
      const { count: directReferrals } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress!);

      // Get total downline from direct referrals (fallback since matrix placements table doesn't exist)
      const { count: totalDownline } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress!);

      setMemberStats({
        currentLevel: memberData?.current_level || 0,
        levelsOwned: memberData?.levels_owned || [],
        activationRank: memberData?.activation_rank || 0,
        tier: memberData?.tier_level || 1,
        directReferrals: directReferrals || 0,
        totalDownline: totalDownline || 0
      });
    } catch (error) {
      console.error('Failed to load member stats:', error);
    }
  };

  const loadBalanceInfo = async () => {
    try {
      // Get balance data from user_balances table
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('bcc_transferable, bcc_restricted, bcc_locked, total_usdt_earned')
        .eq('wallet_address', walletAddress!)
        .maybeSingle();

      if (balanceError) {
        console.error('Balance data error:', balanceError);
        // Set default values if no balance record exists
        setBalanceInfo({
          usdc: 0,
          bccTransferable: 0,
          bccLocked: 0,
          totalEarned: 0
        });
        return;
      }

      setBalanceInfo({
        usdc: balanceData?.total_usdt_earned || 0,
        bccTransferable: balanceData?.bcc_transferable || 0,
        bccLocked: balanceData?.bcc_locked || 0,
        totalEarned: balanceData?.total_usdt_earned || 0
      });
    } catch (error) {
      console.error('Failed to load balance info:', error);
    }
  };

  const loadPendingRewards = async () => {
    try {
      // Get pending and claimable rewards from layer_rewards table
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('layer_rewards')
        .select(`
          id,
          amount_usdt,
          layer,
          reward_type,
          is_claimed,
          created_at,
          countdown_timers (
            end_time,
            is_active
          )
        `)
        .eq('recipient_wallet', walletAddress!)
        .in('reward_type', ['layer_reward', 'pending_layer_reward'])
        .eq('is_claimed', false)
        .order('created_at', { ascending: false });

      if (rewardsError) {
        console.error('Rewards data error:', rewardsError);
        return;
      }

      // Transform rewards data
      const transformedRewards = rewardsData?.map((reward: any) => {
        const countdownTimer = reward.countdown_timers?.[0];
        const hoursLeft = countdownTimer?.end_time 
          ? Math.max(0, Math.floor((new Date(countdownTimer.end_time).getTime() - Date.now()) / (1000 * 60 * 60)))
          : 0;

        return {
          id: reward.id,
          amount: reward.amount_usdt,
          level: reward.layer,
          hoursLeft,
          canClaim: reward.reward_type === 'layer_reward',
          status: reward.reward_type === 'layer_reward' ? 'claimable' as const : 'pending' as const
        };
      }) || [];

      setPendingRewards(transformedRewards);
    } catch (error) {
      console.error('Failed to load pending rewards:', error);
    }
  };

  const loadUpgradeInfo = async () => {
    if (!memberStats) return;

    try {
      const nextLevel = memberStats.currentLevel + 1;
      if (nextLevel > 19) return;

      const result = await callEdgeFunction('level-upgrade', {
        action: 'check_requirements',
        walletAddress: walletAddress!,
        targetLevel: nextLevel
      }, walletAddress!);

      if (result.success) {
        setUpgradeInfo({
          nextLevel,
          cost: result.requirements?.pricing?.usdcCost || 0,
          bccUnlock: result.requirements?.pricing?.bccUnlocked || 0,
          canUpgrade: result.canUpgrade || false,
          requirements: {
            directReferrals: result.requirements?.directReferrals || {
              required: 0,
              current: 0,
              satisfied: true
            },
            sequential: true
          }
        });
      }
    } catch (error) {
      console.error('Failed to load upgrade info:', error);
    }
  };

  const loadWithdrawalLimits = async () => {
    try {
      const result = await callEdgeFunction('withdrawal-system', {
        action: 'check_limits',
        walletAddress: walletAddress!,
        currency: 'USDC'
      }, walletAddress!);

      if (result.success && result.limits) {
        setWithdrawalLimits(result.limits);
      }
    } catch (error) {
      console.error('Failed to load withdrawal limits:', error);
    }
  };

  const claimReward = async (rewardId: string) => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      // Use the database function to claim rewards
      const { data, error } = await supabase.rpc('claim_reward_to_balance', {
        p_claim_id: rewardId,
        p_wallet_address: walletAddress
      });

      if (error) {
        console.error('Claim reward error:', error);
        toast.error('Failed to claim reward');
        return;
      }

      if (data?.success) {
        toast.success(`Successfully claimed ${data.amount} USDC!`);
        await loadDashboardData();
      } else {
        toast.error(data?.error || 'Failed to claim reward');
      }

    } catch (error) {
      console.error('Claim reward error:', error);
      toast.error('Failed to claim reward');
    } finally {
      setLoading(false);
    }
  };

  const upgradeLevel = async () => {
    if (!upgradeInfo || !walletAddress) return;

    try {
      setIsUpgrading(true);
      
      const result = await callEdgeFunction('level-upgrade', {
        action: 'upgrade_level',
        walletAddress,
        targetLevel: upgradeInfo.nextLevel,
        transactionHash: 'simulation', // For simulation mode
        network: 'simulation'
      }, walletAddress);

      if (result.success) {
        toast.success(`Successfully upgraded to Level ${upgradeInfo.nextLevel}!`);
        await loadDashboardData();
      } else {
        toast.error(result.error || 'Upgrade failed');
      }

    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Upgrade failed');
    } finally {
      setIsUpgrading(false);
    }
  };

  const requestWithdrawal = async (amount: number, currency: 'USDC' | 'BCC') => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      const result = await callEdgeFunction('withdrawal-system', {
        action: 'request_withdrawal',
        walletAddress,
        amount,
        currency,
        targetChain: 'arbitrum',
        targetAddress: walletAddress
      }, walletAddress);

      if (result.success) {
        toast.success(`Withdrawal request created: ${result.withdrawalId}`);
        await loadDashboardData();
      } else {
        toast.error(result.error || 'Withdrawal request failed');
      }

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Withdrawal request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to access the dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!memberStats || memberStats.currentLevel === 0) {
    return <MembershipActivationSystem onActivationComplete={loadDashboardData} />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Level</p>
                <p className="text-2xl font-bold text-honey">Level {memberStats.currentLevel}</p>
              </div>
              <Crown className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activation Rank</p>
                <p className="text-2xl font-bold text-blue-500">#{memberStats.activationRank}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Direct Referrals</p>
                <p className="text-2xl font-bold text-green-500">{memberStats.directReferrals}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Member Tier</p>
                <p className="text-2xl font-bold text-purple-500">Tier {memberStats.tier}</p>
              </div>
              <Trophy className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Balance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {balanceInfo && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">USDC Balance</p>
                        <p className="text-lg font-bold text-green-600">${balanceInfo.usdc.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">BCC Available</p>
                        <p className="text-lg font-bold text-blue-600">{balanceInfo.bccTransferable.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">BCC Locked</p>
                      <p className="text-lg font-bold text-orange-600">{balanceInfo.bccLocked.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upgradeInfo && upgradeInfo.canUpgrade && (
                  <Button onClick={upgradeLevel} disabled={isUpgrading} className="w-full">
                    {isUpgrading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Upgrade to Level {upgradeInfo.nextLevel}
                      </>
                    )}
                  </Button>
                )}
                
                {balanceInfo && balanceInfo.usdc > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => requestWithdrawal(Math.min(100, balanceInfo.usdc), 'USDC')}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Quick Withdraw $100 USDC
                  </Button>
                )}
                
                {pendingRewards.filter(r => r.canClaim).length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('rewards')}
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Claim {pendingRewards.filter(r => r.canClaim).length} Rewards
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Level Progress */}
          {upgradeInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Level Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Level {memberStats.currentLevel}</span>
                    <span>Level {Math.min(memberStats.currentLevel + 1, 19)}</span>
                  </div>
                  <Progress value={upgradeInfo.canUpgrade ? 100 : 50} className="h-3" />
                  <div className="text-center text-sm text-muted-foreground">
                    {upgradeInfo.canUpgrade 
                      ? `Ready to upgrade to Level ${upgradeInfo.nextLevel}!`
                      : `Complete requirements to unlock Level ${upgradeInfo.nextLevel}`
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Pending Rewards ({pendingRewards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRewards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No pending rewards at the moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">${reward.amount} USDC</div>
                        <div className="text-sm text-muted-foreground">
                          Level {reward.level} Reward • {reward.hoursLeft}h remaining
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={reward.canClaim ? "default" : "secondary"}>
                          {reward.canClaim ? 'Claimable' : 'Pending'}
                        </Badge>
                        {reward.canClaim && (
                          <Button
                            size="sm"
                            onClick={() => claimReward(reward.id)}
                            disabled={loading}
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Claim'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upgrade Tab */}
        <TabsContent value="upgrade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="h-5 w-5" />
                Level Upgrade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upgradeInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold">Upgrade Cost</h3>
                      <p className="text-2xl font-bold text-honey">${upgradeInfo.cost} USDC</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold">BCC Unlock</h3>
                      <p className="text-2xl font-bold text-blue-500">{upgradeInfo.bccUnlock} BCC</p>
                    </div>
                  </div>

                  {!upgradeInfo.canUpgrade && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Requirements Not Met</strong>
                        {upgradeInfo.requirements.directReferrals.required > 0 && (
                          <div className="mt-2">
                            Direct Referrals: {upgradeInfo.requirements.directReferrals.current}/
                            {upgradeInfo.requirements.directReferrals.required} required
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={upgradeLevel}
                    disabled={!upgradeInfo.canUpgrade || isUpgrading}
                    className="w-full"
                    size="lg"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Upgrade to Level {upgradeInfo.nextLevel}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 mb-4 text-honey" />
                  <h3 className="text-xl font-semibold mb-2">Maximum Level Reached!</h3>
                  <p className="text-muted-foreground">
                    Congratulations on reaching Level {memberStats.currentLevel}!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matrix Tab */}
        <TabsContent value="matrix" className="space-y-6">
          <ReferralMatrixVisualization />
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Withdrawal Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawalLimits ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Daily Limit</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span>${withdrawalLimits.daily.used}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Remaining:</span>
                        <span className="font-semibold text-green-600">${withdrawalLimits.daily.remaining}</span>
                      </div>
                      <Progress 
                        value={(withdrawalLimits.daily.used / withdrawalLimits.daily.limit) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Monthly Limit</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span>${withdrawalLimits.monthly.used}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Remaining:</span>
                        <span className="font-semibold text-green-600">${withdrawalLimits.monthly.remaining}</span>
                      </div>
                      <Progress 
                        value={(withdrawalLimits.monthly.used / withdrawalLimits.monthly.limit) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
                  <p>Loading withdrawal limits...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveMemberDashboard;