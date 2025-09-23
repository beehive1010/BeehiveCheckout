import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { RefreshCw, ArrowUpRight, Clock, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface RollupRewardsCardProps {
  walletAddress: string;
  className?: string;
}

interface RollupReward {
  id: string;
  reward_amount: number;
  status: string;
  roll_up_reason: string | null;
  rolled_up_at: string | null;
  created_at: string;
  expires_at: string | null;
  matrix_layer: number;
  layer_position: string;
  triggering_member_wallet: string;
  reward_recipient_wallet: string;
}

interface RollupStats {
  total_rolled_up: number;
  total_amount: number;
  by_reason: Record<string, { count: number; amount: number }>;
  recent_rollups: RollupReward[];
}

export default function RollupRewardsCard({ walletAddress, className }: RollupRewardsCardProps) {
  const { t } = useI18n();

  const { data: rollupStats, isLoading, error } = useQuery<RollupStats>({
    queryKey: ['rollup-rewards', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      // Get all rolled up rewards for this wallet
      const { data: rollupRewards, error: rollupError } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', walletAddress)
        .eq('status', 'rolled_up')
        .order('rolled_up_at', { ascending: false });

      if (rollupError) throw rollupError;

      const rewards = rollupRewards || [];
      
      // Calculate stats
      const totalAmount = rewards.reduce((sum, r) => sum + r.reward_amount, 0);
      
      // Group by rollup reason
      const byReason: Record<string, { count: number; amount: number }> = {};
      rewards.forEach(reward => {
        const reason = reward.roll_up_reason || 'unknown';
        if (!byReason[reason]) {
          byReason[reason] = { count: 0, amount: 0 };
        }
        byReason[reason].count += 1;
        byReason[reason].amount += reward.reward_amount;
      });

      return {
        total_rolled_up: rewards.length,
        total_amount: totalAmount,
        by_reason: byReason,
        recent_rollups: rewards.slice(0, 10)
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatRollupReason = (reason: string | null) => {
    if (!reason) return 'Unknown';
    
    const reasonMap: Record<string, string> = {
      'expired_unclaimed': 'Expired - Not Claimed',
      'insufficient_level': 'Insufficient Level',
      'network_spillover': 'Network Spillover',
      'manual_rollup': 'Manual Rollup',
      'system_rollup': 'System Rollup'
    };
    
    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRollupReasonColor = (reason: string | null) => {
    const colorMap: Record<string, string> = {
      'expired_unclaimed': 'text-red-500 border-red-500/30',
      'insufficient_level': 'text-orange-500 border-orange-500/30',
      'network_spillover': 'text-blue-500 border-blue-500/30',
      'manual_rollup': 'text-purple-500 border-purple-500/30',
      'system_rollup': 'text-gray-500 border-gray-500/30'
    };
    
    return colorMap[reason || ''] || 'text-gray-500 border-gray-500/30';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-honey" />
            <p className="text-muted-foreground">Loading rollup rewards...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-red-500">Error loading rollup rewards</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rollupStats || rollupStats.total_rolled_up === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-honey" />
            Rollup Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No rollup rewards found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Rollup rewards appear when pending rewards expire or are redistributed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-honey" />
          Rollup Rewards
          <Badge variant="secondary">{rollupStats.total_rolled_up}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total Rolled Up</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {rollupStats.total_rolled_up}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Amount</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${rollupStats.total_amount.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Reasons</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(rollupStats.by_reason).length}
            </div>
          </div>
        </div>

        {/* Rollup Reasons Breakdown */}
        {Object.keys(rollupStats.by_reason).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Rollup Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(rollupStats.by_reason).map(([reason, stats]) => (
                <div key={reason} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getRollupReasonColor(reason)}>
                      {formatRollupReason(reason)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.count} reward{stats.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="font-semibold text-honey">
                    ${stats.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Rollups */}
        {rollupStats.recent_rollups.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Recent Rollups</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rollupStats.recent_rollups.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-orange-800">
                        ${reward.reward_amount.toFixed(2)} USDT
                      </span>
                      <Badge variant="outline" className={getRollupReasonColor(reward.roll_up_reason)}>
                        {formatRollupReason(reward.roll_up_reason)}
                      </Badge>
                    </div>
                    <div className="text-sm text-orange-600">
                      Layer {reward.matrix_layer} • Position {reward.layer_position}
                    </div>
                    <div className="text-xs text-orange-500">
                      {reward.rolled_up_at 
                        ? `Rolled up: ${new Date(reward.rolled_up_at).toLocaleDateString()}`
                        : `Created: ${new Date(reward.created_at).toLocaleDateString()}`
                      }
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Clock className="h-4 w-4 text-orange-500 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">About Rollup Rewards</h4>
              <p className="text-xs text-blue-600">
                Rollup rewards are rewards that were pending but couldn't be claimed due to expiration, 
                insufficient level, or other reasons. These rewards are redistributed within the network 
                according to the matrix rollup system.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}