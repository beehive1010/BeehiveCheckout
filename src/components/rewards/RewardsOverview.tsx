import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Award, DollarSign} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {useI18n} from '../../contexts/I18nContext';

interface RewardsOverviewProps {
  walletAddress: string;
  className?: string;
}

interface RewardsOverviewData {
  wallet_address: string;
  total_rewards_count: number;
  pending_rewards_count: number;
  claimable_rewards_count: number;
  claimed_rewards_count: number;
  total_amount_usdt: number;
  pending_amount_usdt: number;
  claimable_amount_usdt: number;
  claimed_amount_usdt: number;
  latest_reward_time: string;
  latest_claim_time: string;
}

export default function RewardsOverview({ walletAddress, className }: RewardsOverviewProps) {
  const { t } = useI18n();
  const { data: rewardsOverview, isLoading } = useQuery<RewardsOverviewData>({
    queryKey: ['member-rewards-overview', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_rewards_overview_v2')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading rewards overview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rewardsOverview) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No rewards data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-honey" />
          Rewards Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>Total Rewards</span>
            <span className="font-medium">{rewardsOverview.total_rewards_count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Claimable</span>
            <Badge variant="default" className="bg-green-600">
              {rewardsOverview.claimable_rewards_count}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Pending</span>
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              {rewardsOverview.pending_rewards_count}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Claimed</span>
            <span className="text-muted-foreground">{rewardsOverview.claimed_rewards_count}</span>
          </div>
        </div>
        
        <div className="border-t pt-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </span>
            <span className="font-bold text-green-600">
              ${(rewardsOverview.total_amount_usdt || 0).toFixed(2)}
            </span>
          </div>
          {rewardsOverview.claimable_amount_usdt > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span>Available to Claim</span>
              <span className="font-medium text-green-600">
                ${(rewardsOverview.claimable_amount_usdt || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}