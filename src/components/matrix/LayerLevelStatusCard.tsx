import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Clock, Coins, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/contexts/I18nContext';

interface LayerLevelStatus {
  matrix_root: string;
  root_name: string;
  root_level: number;
  member_layer: number;
  member_position: string;
  can_earn_reward: boolean;
  reward_reason: string;
  potential_reward: number;
}

interface LayerLevelStatusCardProps {
  walletAddress: string;
}

const LayerLevelStatusCard: React.FC<LayerLevelStatusCardProps> = ({ walletAddress }) => {
  const { t } = useI18n();
  const [statusData, setStatusData] = useState<LayerLevelStatus[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadLayerLevelStatus();
    }
  }, [walletAddress]);

  const loadLayerLevelStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取用户的Layer-Level状态
      const [statusResult, summaryResult] = await Promise.all([
        supabase.rpc('get_user_layer_level_status', { 
          p_wallet_address: walletAddress 
        }),
        supabase.rpc('check_layer_level_matching_status', { 
          p_wallet_address: walletAddress 
        })
      ]);

      if (statusResult.error) {
        throw new Error(statusResult.error.message);
      }

      if (summaryResult.error) {
        throw new Error(summaryResult.error.message);
      }

      setStatusData(statusResult.data || []);
      setSummary(summaryResult.data?.[0] || null);

    } catch (error: any) {
      console.error('Error loading layer-level status:', error);
      setError(error.message || 'Failed to load layer-level status');
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'L': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'M': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'R': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading Layer-Level status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Loading Failed</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadLayerLevelStatus}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rewardsEligibilityRate = summary ? 
    Math.round((summary.eligible_reward_layers / Math.max(summary.total_matrices_joined, 1)) * 100) : 0;

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-honey">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <span>Layer-Level Reward Matching</span>
          </div>
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
            Layer ≥ Level System
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Level {summary.user_current_level}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-green-400">{summary.eligible_reward_layers}</div>
              <div className="text-xs text-muted-foreground">Eligible Layers</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-lg p-4 border border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-orange-400">{summary.pending_reward_layers}</div>
              <div className="text-xs text-muted-foreground">Pending Layers</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <Coins className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400">{summary.claimable_rewards?.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Claimable USDC</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">{rewardsEligibilityRate}%</div>
              <div className="text-xs text-muted-foreground">Eligibility Rate</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {summary && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Reward Eligibility Progress</span>
              <span>{summary.eligible_reward_layers}/{summary.total_matrices_joined} matrices</span>
            </div>
            <Progress 
              value={rewardsEligibilityRate} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              💡 Upgrade your NFT Level to unlock rewards from more layers
            </div>
          </div>
        )}

        {/* Layer Status Details */}
        <div className="space-y-4">
          <h4 className="font-medium text-honey">Matrix Positions & Reward Status</h4>
          
          {statusData.length > 0 ? (
            <div className="grid gap-3">
              {statusData.map((status, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 transition-all ${
                    status.can_earn_reward 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-orange-500/5 border-orange-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={getPositionColor(status.member_position)}
                      >
                        Layer {status.member_layer} ({status.member_position})
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Root: {status.root_name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-honey">
                        {status.potential_reward} USDC
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Root Level {status.root_level}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {status.can_earn_reward ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Trophy className="w-4 h-4" />
                        <span>✅ Eligible for rewards</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span>⏳ Pending (Root needs Level {status.member_layer}+)</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mt-2 bg-muted/20 rounded p-2">
                    {status.reward_reason}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matrix positions found</p>
              <p className="text-xs mt-1">Join the matrix by getting referred by an active member</p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            <strong>Layer-Level Reward Matching System</strong>
          </div>
          <p className="text-xs">
            🎯 <strong>Rule:</strong> You earn rewards when someone in your Layer N buys Level N NFT, 
            BUT only if the root wallet has Level ≥ N
          </p>
          <p className="text-xs mt-1">
            📈 <strong>Example:</strong> Layer 3 member buys Level 3 NFT → Root needs Level 3+ to earn 200 USDC
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LayerLevelStatusCard;