import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Layers, Target, TrendingUp, Users} from 'lucide-react';
import {supabase} from '../../lib/supabase';
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

  // 总团队统计（所有层级，递归referrer树）
  total_team_size: number;           // 所有推荐层级的总人数
  total_team_activated?: number;     // 所有层级中激活的人数

  // 矩阵团队统计（19层矩阵内占位）
  matrix_team_size: number;          // 矩阵内总人数（19层）
  activated_members: number;         // 矩阵内激活人数

  max_depth: number;
  network_strength: number;
  highest_referral_level: number;
  level2_upgrade_eligible: boolean;
  layer1_filled: number;
  layer1_max: number;
}


export default function ReferralsStats({ walletAddress, className }: ReferralsStatsProps) {
  const { t } = useI18n();

  const { data: referrerStats, isLoading: isLoadingStats } = useQuery<ReferrerStatsData>({
    queryKey: ['referrer-stats', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      try {
        // Use the Matrix API to get comprehensive stats
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/matrix-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': walletAddress,
          },
          body: JSON.stringify({
            action: 'get-layer-stats'
          }),
        });

        if (!response.ok) {
          throw new Error(`Matrix API Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Matrix API call failed');
        }

        const statsData = result.data.summary;
        const layerStats = result.data.layer_stats || [];
        const layer1Stats = layerStats.find((l: any) => l.layer === 1);

        // Create a stats object with the comprehensive data
        const data = {
          referrer: walletAddress,
          referrer_name: statsData.username || '',
          total_direct_referrals: statsData.direct_referrals || 0,
          activated_referrals: statsData.activated_referrals || 0,
          total_team_size: statsData.total_team_size || 0,
          activated_members: statsData.total_activated_members || 0,
          max_depth: statsData.max_layer || 0,
          network_strength: statsData.network_strength || 0,
          highest_referral_level: statsData.max_layer || 0,
          level2_upgrade_eligible: (statsData.activated_referrals || 0) >= 3,
          layer1_filled: layer1Stats?.totalMembers || 0,
          layer1_max: layer1Stats?.maxCapacity || 3
        };
        
        return data;
      } catch (error) {
        console.error('❌ Failed to fetch referrer stats:', error);
        // Fallback to v_referral_statistics view using direct fetch

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        // Use v_referral_statistics for comprehensive team statistics via direct fetch
        let stats = null;
        let statsError = null;

        try {
          const statsUrl = `${SUPABASE_URL}/rest/v1/v_referral_statistics?member_wallet=ilike.${walletAddress}&select=direct_referral_count,max_spillover_layer,total_team_count,matrix_19_layer_count,activation_rate_percentage`;

          const statsResponse = await fetch(statsUrl, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            }
          });

          if (statsResponse.ok) {
            const statsArray = await statsResponse.json();
            stats = statsArray && statsArray.length > 0 ? statsArray[0] : null;
          } else {
            statsError = new Error(`HTTP ${statsResponse.status}`);
            console.error('❌ Failed to fetch from v_referral_statistics:', statsError);
          }
        } catch (fetchError) {
          console.error('❌ Error fetching v_referral_statistics:', fetchError);
          statsError = fetchError;
        }

        // ✅ Use fn_get_user_layer_stats RPC function for layer 1 stats via direct fetch
        // This correctly calculates per-member matrix (not global matrix_root_wallet)
        let layer1Stats = null;

        try {
          const layer1Response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_get_user_layer_stats`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_user_wallet: walletAddress })
          });

          if (layer1Response.ok) {
            const layerStatsArray = await layer1Response.json();
            // Get Layer 1 data from the results
            layer1Stats = layerStatsArray?.find((l: any) => l.layer === 1) || null;
          }
        } catch (fetchError) {
          console.error('❌ Error fetching fn_get_user_layer_stats:', fetchError);
        }

        const directReferralsCount = stats?.direct_referral_count || 0;
        const totalTeamSize = stats?.total_team_count || 0; // ✅ Now uses fixed recursive CTE
        const matrixTeamSize = stats?.matrix_19_layer_count || 0;
        const maxDepth = stats?.max_spillover_layer || 0;
        const layer1Filled = layer1Stats?.filled || 0; // ✅ fn_get_user_layer_stats returns 'filled' column
        const activationRate = stats?.activation_rate_percentage || 0;

        return {
          referrer: walletAddress,
          referrer_name: '',
          total_direct_referrals: directReferralsCount,
          activated_referrals: directReferralsCount,

          // 总团队（所有推荐层级）- ✅ Now from fixed view
          total_team_size: totalTeamSize,
          total_team_activated: Math.round((totalTeamSize * activationRate) / 100),

          // 矩阵团队（19层内）
          matrix_team_size: matrixTeamSize,
          activated_members: Math.round((matrixTeamSize * activationRate) / 100),

          max_depth: maxDepth,
          network_strength: directReferralsCount * 10,
          highest_referral_level: maxDepth,
          level2_upgrade_eligible: directReferralsCount >= 3,
          layer1_filled: layer1Filled,
          layer1_max: 3
        };
      }
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

  const matrixPositionsFilled = referrerStats.layer1_filled || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Direct Referrals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {referrerStats.total_direct_referrals}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referrals.directReferrals') || 'Direct Referrals'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Team Size (All Layers) */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {referrerStats.total_team_size}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referrals.totalTeam') || 'Total Team'}
                </div>
                <div className="text-xs text-green-400/70">All Layers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matrix Team Size (19 Layers) */}
        <Card className="border-honey/30 bg-honey/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-8 w-8 text-honey" />
              <div>
                <div className="text-2xl font-bold text-honey">
                  {referrerStats.matrix_team_size}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referrals.matrixTeam') || 'Matrix Team'}
                </div>
                <div className="text-xs text-honey/70">19 Layers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Max Layer Depth */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {referrerStats.max_depth}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referrals.maxLayer') || 'Max Layer'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matrix L1 Positions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {matrixPositionsFilled}/3
                </div>
                <div className="text-xs text-muted-foreground">Layer 1 Slots</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Breakdown Card */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Users className="h-5 w-5" />
            Team Statistics Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Team (All Layers) */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">Total Team (All Layers)</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  Unlimited Depth
                </Badge>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {referrerStats.total_team_size}
              </div>
              <div className="text-xs text-muted-foreground">
                Includes all members in your referral chain, regardless of matrix layer limits.
                Calculated using recursive referrer_wallet relationships.
              </div>
              {referrerStats.total_team_size > referrerStats.matrix_team_size && (
                <div className="text-xs text-green-400/70 mt-2">
                  +{referrerStats.total_team_size - referrerStats.matrix_team_size} members beyond 19-layer matrix
                </div>
              )}
            </div>

            {/* Matrix Team (19 Layers) */}
            <div className="bg-honey/5 border border-honey/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-honey">Matrix Team (19 Layers)</span>
                <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                  Layer 1-19
                </Badge>
              </div>
              <div className="text-3xl font-bold text-honey mb-2">
                {referrerStats.matrix_team_size}
              </div>
              <div className="text-xs text-muted-foreground">
                Members who occupy slots in your 19-layer 3x3 matrix.
                Activated: <span className="text-honey font-medium">{referrerStats.activated_members}</span> members
              </div>
              <div className="text-xs text-honey/70 mt-2">
                {referrerStats.activated_members > 0
                  ? `${((referrerStats.activated_members / referrerStats.matrix_team_size) * 100).toFixed(1)}% activation rate`
                  : 'No activated members yet'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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