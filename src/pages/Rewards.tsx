import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { 
  Award, 
  DollarSign, 
  TrendingUp, 
  Timer,
  Coins,
  BarChart3,
  RefreshCw,
  Gift,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

// Simplified interfaces for rewards page
interface RewardItem {
  id: string;
  type: 'direct' | 'matrix' | 'upgrade' | 'bonus';
  amount: number;
  currency: 'USDT' | 'BCC';
  status: 'pending' | 'claimable' | 'claimed';
  description: string;
  date: string;
  expiresAt?: string;
}

interface RewardsSummary {
  totalEarned: number;
  totalClaimed: number;
  totalPending: number;
  claimableAmount: number;
  monthlyEarnings: number;
}

export default function Rewards() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [rewardsSummary] = useState<RewardsSummary>({
    totalEarned: 1250.50,
    totalClaimed: 980.25,
    totalPending: 270.25,
    claimableAmount: 150.75,
    monthlyEarnings: 320.15
  });

  const [recentRewards] = useState<RewardItem[]>([
    {
      id: '1',
      type: 'direct',
      amount: 50.00,
      currency: 'USDT',
      status: 'claimable',
      description: 'Direct referral bonus from new member',
      date: '2024-01-15',
    },
    {
      id: '2',
      type: 'matrix',
      amount: 25.50,
      currency: 'USDT',
      status: 'claimable',
      description: 'Matrix position reward - Layer 2',
      date: '2024-01-14',
    },
    {
      id: '3',
      type: 'upgrade',
      amount: 75.25,
      currency: 'USDT',
      status: 'pending',
      description: 'Level upgrade bonus',
      date: '2024-01-13',
      expiresAt: '2024-01-20'
    },
    {
      id: '4',
      type: 'bonus',
      amount: 100,
      currency: 'BCC',
      status: 'claimed',
      description: 'Weekly activity bonus',
      date: '2024-01-12',
    }
  ]);

  const claimReward = async (rewardId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Reward Claimed!",
        description: "Your reward has been successfully claimed and added to your balance.",
      });
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: RewardItem['status']) => {
    switch (status) {
      case 'claimable':
        return <Gift className="h-4 w-4 text-green-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'claimed':
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: RewardItem['status']) => {
    switch (status) {
      case 'claimable':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'claimed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeLabel = (type: RewardItem['type']) => {
    const labels = {
      'direct': 'Direct Referral',
      'matrix': 'Matrix Reward',
      'upgrade': 'Upgrade Bonus',
      'bonus': 'Activity Bonus'
    };
    return labels[type];
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-2">
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

      {/* Rewards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">${rewardsSummary.totalEarned}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">${rewardsSummary.totalClaimed}</div>
            <div className="text-xs text-muted-foreground">Total Claimed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${rewardsSummary.claimableAmount}</div>
            <div className="text-xs text-muted-foreground">Claimable Now</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-400">${rewardsSummary.monthlyEarnings}</div>
            <div className="text-xs text-muted-foreground">This Month</div>
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
              className="bg-honey hover:bg-honey/90 text-black font-semibold"
              disabled={rewardsSummary.claimableAmount === 0}
            >
              <Gift className="h-4 w-4 mr-2" />
              Claim Available (${rewardsSummary.claimableAmount})
            </Button>
            <Button variant="outline" className="border-honey/30 text-honey hover:bg-honey/10">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" className="border-honey/30 text-honey hover:bg-honey/10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-400" />
            Recent Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRewards.map((reward) => (
              <div 
                key={reward.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(reward.status)}
                  <div>
                    <div className="font-medium text-sm">{getTypeLabel(reward.type)}</div>
                    <div className="text-xs text-muted-foreground">{reward.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {reward.date}
                      {reward.expiresAt && (
                        <span className="text-yellow-400 ml-2">
                          • Expires {reward.expiresAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="font-bold text-honey">
                      {reward.amount} {reward.currency}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(reward.status)}`}
                    >
                      {reward.status}
                    </Badge>
                  </div>
                  
                  {reward.status === 'claimable' && (
                    <Button 
                      size="sm" 
                      onClick={() => claimReward(reward.id)}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Claim'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}