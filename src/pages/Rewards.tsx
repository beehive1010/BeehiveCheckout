import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { createSupabaseClient } from '../lib/supabase';
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
  Target
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
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseClient();

  useEffect(() => {
    if (walletAddress) {
      loadRewardsData();
    }
  }, [walletAddress]);

  const loadRewardsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Supabase Edge Function for rewards data
      const { data, error: functionsError } = await supabase.functions.invoke('rewards', {
        body: { 
          wallet_address: walletAddress,
          action: 'get_rewards_summary'
        }
      });

      if (functionsError) {
        console.error('Supabase Edge Function Error [rewards]:', functionsError);
        throw new Error(`Function call failed: ${functionsError.message}`);
      }

      if (data?.success) {
        setRewardsData(data.rewards);
      } else {
        throw new Error(data?.error || 'Failed to load rewards data');
      }

    } catch (err) {
      console.error('Rewards data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
      
      // Set fallback data for demonstration
      setRewardsData({
        total: 1250.50,
        thisMonth: 320.15,
        lastMonth: 245.80,
        pending: 125.25,
        claimable: 75.50,
        history: [
          {
            id: '1',
            type: 'referral',
            amount: 50.00,
            currency: 'USDT',
            date: '2024-01-15',
            status: 'completed',
            description: 'Direct referral bonus'
          },
          {
            id: '2',
            type: 'matrix',
            amount: 25.25,
            currency: 'USDT',
            date: '2024-01-12',
            status: 'pending',
            description: 'Matrix position reward'
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const claimPendingRewards = async () => {
    if (!rewardsData?.claimable || rewardsData.claimable <= 0) return;
    
    try {
      setIsLoading(true);
      
      const { data, error: functionsError } = await supabase.functions.invoke('rewards', {
        body: { 
          wallet_address: walletAddress,
          action: 'claim_rewards'
        }
      });

      if (functionsError) {
        throw new Error(`Failed to claim rewards: ${functionsError.message}`);
      }

      if (data?.success) {
        toast({
          title: "Rewards Claimed!",
          description: `Successfully claimed ${rewardsData.claimable} USDT`,
        });
        
        // Reload data
        await loadRewardsData();
      } else {
        throw new Error(data?.error || 'Failed to claim rewards');
      }

    } catch (err) {
      console.error('Claim rewards error:', err);
      toast({
        title: "Claim Failed",
        description: err instanceof Error ? err.message : "Failed to claim rewards",
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
        <div className="text-muted-foreground">Loading rewards data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadRewardsData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/dashboard')}
          className="text-muted-foreground hover:text-honey"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-honey">Rewards</h1>
          <p className="text-sm text-muted-foreground">Track and claim your earnings</p>
        </div>
      </div>

      {/* Rewards Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">${rewardsData?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">${rewardsData?.thisMonth || 0}</div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">${rewardsData?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${rewardsData?.claimable || 0}</div>
            <div className="text-xs text-muted-foreground">Claimable</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-honey/20 bg-gradient-to-r from-honey/5 to-yellow-400/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-honey" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={claimPendingRewards}
              disabled={!rewardsData?.claimable || rewardsData.claimable <= 0 || isLoading}
              className="bg-honey hover:bg-honey/90 text-black font-semibold"
            >
              <Gift className="h-4 w-4 mr-2" />
              Claim Available (${rewardsData?.claimable || 0})
            </Button>
            <Button variant="outline" className="border-honey/30 text-honey hover:bg-honey/10">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              onClick={loadRewardsData}
              variant="outline" 
              className="border-honey/30 text-honey hover:bg-honey/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rewards History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-400" />
            Recent Rewards
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
              No rewards history available
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}