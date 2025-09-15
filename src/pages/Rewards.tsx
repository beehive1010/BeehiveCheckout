import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import RewardsOverview from '../components/rewards/RewardsOverview';
import USDTWithdrawal from '../components/withdrawal/USDTWithdrawal';
import CountdownTimer from '../components/rewards/CountdownTimer';
import { PendingRewardsTimer } from '../components/rewards/PendingRewardsTimer';
import { 
  User, 
  Award, 
  DollarSign, 
  TrendingUp, 
  Settings,
  Timer,
  Coins,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Users,
  Gift,
  Target,
  ArrowUpRight,
  Clock
} from 'lucide-react';

interface ProfileData {
  wallet_address: string;
  display_name?: string;
  bio?: string;
  profile_image?: string;
  created_at: string;
}

interface RewardsData {
  total: number;
  thisMonth: number;
  lastMonth: number;
  pending: number;
  claimable: number;
  history: RewardHistory[];
}

interface RewardHistory {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
}

export default function Rewards() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Use the registered wallet address from user data if available, fallback to connected wallet
  const memberWalletAddress = userData?.wallet_address || walletAddress;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [pendingRewards, setPendingRewards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Use imported supabase client

  useEffect(() => {
    if (memberWalletAddress) {
      loadRewardsData();
    }
  }, [memberWalletAddress]);

  const loadRewardsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all rewards for this wallet from layer_rewards table
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('layer_rewards')
        .select('*')
        .ilike('reward_recipient_wallet', memberWalletAddress)
        .order('created_at', { ascending: false });

      if (rewardsError) {
        console.error('Rewards data error:', rewardsError);
        throw new Error(`Failed to fetch rewards: ${rewardsError.message}`);
      }

      // Calculate totals based on status field
      const claimedRewards = rewardsData?.filter(r => r.status === 'claimed') || [];
      const pendingRewards = rewardsData?.filter(r => r.status === 'pending') || [];
      const claimableRewards = rewardsData?.filter(r => r.status === 'claimable') || [];

      const totalEarned = claimedRewards.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      const totalPending = pendingRewards.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      const totalClaimable = claimableRewards.reduce((sum, r) => sum + (r.reward_amount || 0), 0);

      // Calculate this month's earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthRewards = claimedRewards.filter(r => {
        const claimedDate = new Date(r.claimed_at || r.created_at);
        return claimedDate.getMonth() === currentMonth && claimedDate.getFullYear() === currentYear;
      });
      const thisMonthTotal = thisMonthRewards.reduce((sum, r) => sum + (r.reward_amount || 0), 0);

      // Get pending rewards with expiration times for countdown timers
      const { data: pendingTimerData, error: pendingError } = await supabase
        .from('layer_rewards')
        .select('*')
        .ilike('recipient_wallet', memberWalletAddress)
        .eq('is_claimed', false)
        .eq('reward_type', 'pending_layer_reward')
        .not('expires_at', 'is', null)
        .order('expires_at', { ascending: true })
        .limit(3); // Only show top 3 most urgent

      if (pendingError) {
        console.warn('Pending rewards fetch error:', pendingError);
      } else {
        setPendingRewards(pendingTimerData || []);
      }

      const mappedRewards: RewardsData = {
        total: totalEarned,
        thisMonth: thisMonthTotal,
        lastMonth: 0, // Could be calculated if needed
        pending: totalPending,
        claimable: totalClaimable,
        history: rewardsData?.slice(0, 10).map((reward) => ({
          id: reward.id,
          type: reward.status || 'layer_reward',
          amount: reward.reward_amount || 0,
          currency: 'USDC',
          date: reward.claimed_at || reward.created_at || 'Unknown',
          status: reward.status === 'claimed' ? 'completed' : reward.status as 'pending' | 'completed' | 'failed',
          description: `Layer ${reward.triggering_nft_level} reward`
        })) || []
      };
      
      setRewardsData(mappedRewards);

    } catch (err) {
      console.error('Rewards data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const claimPendingRewards = async () => {
    if (!rewardsData?.claimable || rewardsData.claimable <= 0) return;
    
    try {
      setIsLoading(true);
      
      // Use the database function to claim layer rewards
      const { data, error } = await supabase.rpc('claim_layer_reward', {
        p_member_wallet: memberWalletAddress,
        p_reward_id: null // Will claim all claimable rewards
      });

      if (error) {
        console.error('Claim rewards error:', error);
        throw new Error(`Failed to claim rewards: ${error.message}`);
      }

      if (data?.success) {
        toast({
          title: t('rewards.claimSuccess'),
          description: t('rewards.claimSuccessDescription', { amount: data.amount_claimed || rewardsData.claimable }),
        });
        
        // Reload data
        await loadRewardsData();
      } else {
        throw new Error(data?.error || 'Failed to claim rewards');
      }

    } catch (err) {
      console.error('Claim rewards error:', err);
      toast({
        title: t('rewards.claimFailed'),
        description: err instanceof Error ? err.message : t('rewards.claimFailedDescription'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-honey" />
        <div className="text-muted-foreground">{t('rewards.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">{t('rewards.error')}: {error}</div>
        <Button onClick={loadRewardsData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('nav.rewards') || 'Rewards & Earnings'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('rewards.subtitle') || 'Track your earnings, claim rewards, and monitor performance'}
          </p>
        </div>
      </div>

      {/* Rewards Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">${rewardsData?.total || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.totalEarned')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">${rewardsData?.thisMonth || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.thisMonth')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">${rewardsData?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.pending')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${rewardsData?.claimable || 0}</div>
            <div className="text-xs text-muted-foreground">{t('rewards.claimable')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Rewards Countdown */}
      {pendingRewards.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-honey" />
            {t('rewards.pendingCountdowns')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRewards.map((reward) => (
              <CountdownTimer
                key={reward.id}
                endTime={reward.expires_at}
                title={t('rewards.pendingRewardTimer')}
                description={t('rewards.pendingRewardDescription', { layer: reward.layer || 1 })}
                rewardAmount={reward.amount_usdt || 0}
                variant="detailed"
                urgencyColors={true}
                className="h-auto"
                onExpired={() => {
                  // Reload rewards data when timer expires
                  loadRewardsData();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Rewards Timer Component */}
      <PendingRewardsTimer 
        walletAddress={memberWalletAddress || ''} 
        onRewardClaimable={(rewardId) => {
          // Reload rewards data when a reward becomes claimable
          loadRewardsData();
          toast({
            title: t('rewards.rewardReady'),
            description: t('rewards.rewardReadyDescription'),
          });
        }}
      />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('rewards.tabs.overview') || 'Overview'}</TabsTrigger>
          <TabsTrigger value="claimable">{t('rewards.tabs.claimable') || 'Claimable'}</TabsTrigger>
          <TabsTrigger value="withdrawal">{t('rewards.tabs.withdrawal') || 'Withdraw'}</TabsTrigger>
          <TabsTrigger value="history">{t('rewards.tabs.history') || 'History'}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Rewards Overview */}
          <RewardsOverview walletAddress={memberWalletAddress || ''} />
          
          {/* Reward System Information */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-honey" />
            {t('rewards.rewardSystemInfo') || 'Reward System Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">{t('rewards.matrixRewardsTitle') || 'Matrix Rewards'}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('rewards.level1Direct') || 'Level 1 Direct: $30 USDC per referral'}</li>
                <li>• {t('rewards.level2Matrix') || 'Level 2 Matrix: $10 USDC per position'}</li>
                <li>• {t('rewards.spilloverBonuses') || 'Spillover Bonuses: Additional rewards'}</li>
                <li>• {t('rewards.claimWindow') || '72-hour claim window'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('rewards.bccTransferable') || 'Transferable BCC: Immediate use'}</li>
                <li>• {t('rewards.bccLocked') || 'Locked BCC: Tier-based release'}</li>
                <li>• {t('rewards.bccMultipliers') || 'Tier multipliers: 1.0x, 0.5x, 0.25x, 0.125x'}</li>
                <li>• {t('rewards.bccUpgrades') || 'Level upgrades unlock more BCC'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Claimable Tab */}
        <TabsContent value="claimable" className="space-y-6">
          <ClaimableRewardsCard walletAddress={memberWalletAddress || ''} />
        </TabsContent>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-6">
          <USDTWithdrawal />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-400" />
                {t('rewards.recentRewards') || 'Recent Rewards'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewardsData?.history && rewardsData.history.length > 0 ? (
                <div className="space-y-3">
                  {rewardsData.history.map((reward) => (
                    <div 
                      key={reward.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="font-medium text-sm">{reward.description}</div>
                          <div className="text-xs text-muted-foreground">{reward.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-honey">{reward.amount} {reward.currency}</div>
                        <Badge 
                          variant="outline" 
                          className={
                            reward.status === 'completed' ? 'text-green-400 border-green-400/30' :
                            reward.status === 'pending' ? 'text-yellow-400 border-yellow-400/30' :
                            'text-red-400 border-red-400/30'
                          }
                        >
                          {reward.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('rewards.noHistory') || 'No reward history yet'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}