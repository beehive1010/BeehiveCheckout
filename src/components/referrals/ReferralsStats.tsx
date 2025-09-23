import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Users, 
  TrendingUp,
  Layers,
  Target
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';

interface ReferralsStatsProps {
  walletAddress: string;
  className?: string;
}

interface ReferrerStatsData {
  referrer: string;
  activation_id: number;
  current_level: number;
  direct_referrals: number;
  l_count: number;
  m_count: number;
  r_count: number;
  spillover_count: number;
  l_activation_id: number | null;
  m_activation_id: number | null;
  r_activation_id: number | null;
  max_layer: number;
  total_team_size: number;
}


export default function ReferralsStats({ walletAddress, className }: ReferralsStatsProps) {
  const { t } = useI18n();

  const { data: referrerStats, isLoading: isLoadingStats } = useQuery<ReferrerStatsData>({
    queryKey: ['referrer-stats', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrer_stats')
        .select('*')
        .eq('referrer', walletAddress)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });


  const loading = isLoadingStats;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading referral statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referrerStats) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No referral statistics available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matrixPositionsFilled = [
    referrerStats.l_count > 0,
    referrerStats.m_count > 0,
    referrerStats.r_count > 0
  ].filter(Boolean).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Direct Referrals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {referrerStats.direct_referrals}
                </div>
                <div className="text-xs text-muted-foreground">Direct Referrals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Team Size */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {referrerStats.total_team_size}
                </div>
                <div className="text-xs text-muted-foreground">Total Team Size</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Max Layer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {referrerStats.max_layer}
                </div>
                <div className="text-xs text-muted-foreground">Max Layer</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matrix Positions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {matrixPositionsFilled}/3
                </div>
                <div className="text-xs text-muted-foreground">Layer 1 Positions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-honey" />
              Matrix Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Layer 1 Positions Filled</span>
                <Badge variant={matrixPositionsFilled === 3 ? 'default' : 'outline'}>
                  {matrixPositionsFilled}/3
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={`text-center p-2 rounded border ${referrerStats.l_count > 0 ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300'}`}>
                  L {referrerStats.l_count > 0 ? '✓' : '○'}
                  {referrerStats.l_activation_id && (
                    <div className="text-xs">#{referrerStats.l_activation_id}</div>
                  )}
                </div>
                <div className={`text-center p-2 rounded border ${referrerStats.m_count > 0 ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300'}`}>
                  M {referrerStats.m_count > 0 ? '✓' : '○'}
                  {referrerStats.m_activation_id && (
                    <div className="text-xs">#{referrerStats.m_activation_id}</div>
                  )}
                </div>
                <div className={`text-center p-2 rounded border ${referrerStats.r_count > 0 ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300'}`}>
                  R {referrerStats.r_count > 0 ? '✓' : '○'}
                  {referrerStats.r_activation_id && (
                    <div className="text-xs">#{referrerStats.r_activation_id}</div>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Next vacant: <span className="font-medium">
                  {referrerStats.l_count === 0 ? 'L' : 
                   referrerStats.m_count === 0 ? 'M' : 
                   referrerStats.r_count === 0 ? 'R' : 'Full'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}