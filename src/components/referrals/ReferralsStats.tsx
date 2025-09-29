import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Layers, Target, TrendingUp, Users} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {useI18n} from '../../contexts/I18nContext';

interface ReferralsStatsProps {
  walletAddress: string;
  className?: string;
}

interface ReferrerStatsData {
  referrer: string;
  referrer_name: string;
  total_direct_referrals: number;
  activated_referrals: number;
  total_team_size: number;
  activated_members: number;
  max_depth: number;
  network_strength: number;
  highest_referral_level: number;
  level2_upgrade_eligible: boolean;
}


export default function ReferralsStats({ walletAddress, className }: ReferralsStatsProps) {
  const { t } = useI18n();

  const { data: referrerStats, isLoading: isLoadingStats } = useQuery<ReferrerStatsData>({
    queryKey: ['referrer-stats', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      // Get referral stats by counting direct referrals from referrals_new table (correct table)
      const { count: directReferralsCount, error: directError } = await supabase
        .from('referrals_new')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress);
      
      if (directError) throw directError;
      
      // Create a stats object with the count
      const data = {
        referrer: walletAddress,
        direct_referrals_count: directReferralsCount || 0,
        total_direct_referrals: directReferralsCount || 0,
        total_referrals: directReferralsCount || 0, // For now, same as direct
        direct_referrals: directReferralsCount || 0
      };
      
      const error = null;

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
            <p className="text-xs text-muted-foreground mt-2">
              Start building your network by sharing your referral link!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matrixPositionsFilled = Math.min(3, referrerStats.total_direct_referrals || 0);

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
                  {referrerStats.total_direct_referrals}
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
                  {referrerStats.max_depth}
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
                {[...Array(3)].map((_, i) => {
                  const isFilled = i < matrixPositionsFilled;
                  const position = ['L', 'M', 'R'][i];
                  return (
                    <div key={i} className={`text-center p-2 rounded border ${isFilled ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300'}`}>
                      {position} {isFilled ? '✓' : '○'}
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                Matrix Status: <span className="font-medium">
                  {matrixPositionsFilled < 3 ? `${3 - matrixPositionsFilled} positions available` : 'Full'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}