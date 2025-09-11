import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Eye,
  Share2,
  BarChart3
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { matrixService } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';

interface ReferralStatsCardProps {
  className?: string;
  onViewMatrix?: () => void;
}

export default function ReferralStatsCard({ className, onViewMatrix }: ReferralStatsCardProps) {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const [matrixStats, setMatrixStats] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadReferralData();
    }
  }, [walletAddress]);

  const loadReferralData = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      // 使用新的推荐数据获取函数
      const { supabase } = await import('../../lib/supabaseClient');
      const { data: referralData, error } = await supabase
        .rpc('get_user_referral_data', { 
          p_wallet_address: walletAddress 
        });

      if (error) {
        throw new Error(error.message);
      }

      if (referralData?.[0]) {
        const data = referralData[0];
        
        // 格式化为组件期望的数据结构
        const formattedStats = {
          as_root: data.matrix_stats?.as_root || {
            total_team_size: 0,
            activated_members: 0,
            max_depth: 0,
            layer_distribution: {}
          },
          overall: {
            network_strength: data.overall_stats?.network_strength || 0
          }
        };

        setMatrixStats(formattedStats);
        
        // 设置推荐列表数据
        const recentMembers = data.matrix_stats?.recent_members || [];
        setReferrals(recentMembers);
      }

    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLayerProgress = (layer: number) => {
    const layerCapacity = Math.pow(3, layer);
    const layerCount = matrixStats?.as_root?.layer_distribution?.[layer] || 0;
    return Math.min((layerCount / layerCapacity) * 100, 100);
  };

  const getLayerStatus = (layer: number) => {
    const progress = calculateLayerProgress(layer);
    if (progress === 100) return 'completed';
    if (progress > 0) return 'active';
    return 'pending';
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('referrals.team_overview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-honey" />
            {t('referrals.team_overview')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewMatrix}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {t('referrals.view_matrix')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-honey">
              {matrixStats?.as_root?.total_team_size || 0}
            </p>
            <p className="text-xs text-muted-foreground">{t('referrals.total_team')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {matrixStats?.as_root?.activated_members || 0}
            </p>
            <p className="text-xs text-muted-foreground">{t('referrals.active_members')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {matrixStats?.as_root?.max_depth || 0}
            </p>
            <p className="text-xs text-muted-foreground">{t('referrals.max_layers')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(matrixStats?.overall?.network_strength || 0)}
            </p>
            <p className="text-xs text-muted-foreground">{t('referrals.network_strength')}</p>
          </div>
        </div>

        {/* Layer Progress */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('referrals.layer_progress')}
          </h4>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((layer) => {
              const progress = calculateLayerProgress(layer);
              const status = getLayerStatus(layer);
              const layerCount = matrixStats?.as_root?.layer_distribution?.[layer] || 0;
              const capacity = Math.pow(3, layer);

              return (
                <div key={layer} className="flex items-center gap-3">
                  <Badge 
                    variant={status === 'completed' ? 'default' : status === 'active' ? 'secondary' : 'outline'}
                    className={
                      status === 'completed' ? 'bg-green-600 text-white' : 
                      status === 'active' ? 'bg-honey text-black' : 
                      'text-muted-foreground'
                    }
                  >
                    L{layer}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{layerCount}/{capacity}</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('referrals.recent_referrals')}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {referrals.slice(0, 5).map((referral: any) => (
                <div key={referral.member_wallet} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      L{referral.layer}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${
                      referral.placement_type === 'direct' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {referral.placement_type === 'direct' ? 'Direct' : 'Spillover'}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">
                        {referral.member_name || formatAddress(referral.member_wallet)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referral.position} • Level {referral.member_level || 0} • {new Date(referral.placed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={referral.is_active ? 'default' : 'outline'}
                    className={referral.is_active ? 'bg-green-600 text-white' : ''}
                  >
                    {referral.is_active ? t('common.active') : t('common.pending')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Referral Link */}
        <div className="pt-4 border-t">
          <Button 
            className="w-full bg-honey hover:bg-honey/90 text-black"
            onClick={() => {
              const referralLink = `${window.location.origin}?ref=${walletAddress}`;
              navigator.clipboard.writeText(referralLink);
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('referrals.share_link')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}