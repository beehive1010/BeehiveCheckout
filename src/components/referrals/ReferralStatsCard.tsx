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
import { supabase } from '../../lib/supabase';
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
  const [currentLayerPage, setCurrentLayerPage] = useState(1);
  const [showAllLayers, setShowAllLayers] = useState(false);
  const LAYERS_PER_PAGE = 8;

  useEffect(() => {
    if (walletAddress) {
      loadReferralData();
    }
  }, [walletAddress]);

  const loadReferralData = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      // Use matrix edge function for more accurate data
      const [matrixStatsResult, matrixDownlineResult] = await Promise.allSettled([
        supabase.functions.invoke('matrix', { 
          body: { 
            action: 'get-matrix-stats', 
            rootWallet: walletAddress 
          } 
        }),
        supabase.functions.invoke('matrix', { 
          body: { 
            action: 'get-downline', 
            rootWallet: walletAddress, 
            maxDepth: 3 
          } 
        })
      ]);

      // Extract stats data from edge function response
      let statsData = null;
      if (matrixStatsResult.status === 'fulfilled' && matrixStatsResult.value.data) {
        statsData = matrixStatsResult.value.data;
      }

      // Extract downline data from edge function response
      let downlineData = [];
      if (matrixDownlineResult.status === 'fulfilled' && matrixDownlineResult.value.data) {
        downlineData = matrixDownlineResult.value.data;
      }

      // Process matrix stats
      if (statsData) {
        setMatrixStats(statsData);
      } else {
        // Fallback: Get basic referrals data from members table using exact matching
        const { data: basicReferrals } = await supabase
          .from('members')
          .select('wallet_address, activation_time, current_level')
          .eq('referrer_wallet', walletAddress)
          .limit(10);

        const activatedCount = basicReferrals?.filter(m => m.current_level > 0).length || 0;
        const totalReferrals = basicReferrals?.length || 0;

        setMatrixStats({
          as_root: {
            total_team_size: totalReferrals,
            activated_members: activatedCount,
            max_depth: totalReferrals > 0 ? 1 : 0,
            layer_distribution: { 1: totalReferrals }
          },
          overall: { 
            network_strength: totalReferrals * 5 + activatedCount * 10 
          }
        });
      }

      // Process downline referrals
      if (downlineData && downlineData.length > 0) {
        setReferrals(downlineData.slice(0, 10).map((member: any) => ({
          member_wallet: member.wallet_address || member.member_wallet,
          member_name: member.username || `User${(member.wallet_address || member.member_wallet).slice(-4)}`,
          layer: member.depth_level || 1,
          position: member.matrix_position || 'L',
          placement_type: member.is_direct_referral ? 'direct' : 'spillover',
          placed_at: member.activation_date || member.placed_at,
          is_active: member.current_level > 0 || member.is_active,
          member_level: member.current_level || 1
        })));
      } else {
        // Fallback to basic members query using exact matching
        const { data: basicReferrals } = await supabase
          .from('members')
          .select('wallet_address, activation_time, current_level')
          .eq('referrer_wallet', walletAddress)
          .limit(10);

        setReferrals(basicReferrals?.map((member: any) => ({
          member_wallet: member.wallet_address,
          member_name: `User${member.wallet_address.slice(-4)}`,
          layer: 1,
          position: 'L',
          placement_type: 'direct',
          placed_at: member.activation_time,
          is_active: member.current_level > 0,
          member_level: member.current_level || 0
        })) || []);
      }

    } catch (error) {
      console.error('Failed to load referral data:', error);
      // Set empty defaults
      setMatrixStats({
        as_root: { total_team_size: 0, activated_members: 0, max_depth: 0, layer_distribution: {} },
        overall: { network_strength: 0 }
      });
      setReferrals([]);
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

        {/* 19-Layer Progress with Pagination */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('referrals.layer_progress')} 
            </h4>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllLayers(!showAllLayers)}
                className="text-xs h-6 px-2"
              >
                {showAllLayers ? 'Show Less' : 'Show All 19'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {(() => {
              // Get all layers with data or potential data
              const activeLayers = Array.from({ length: 19 }, (_, i) => i + 1).filter(layer => {
                const progress = calculateLayerProgress(layer);
                return progress > 0 || layer <= (matrixStats?.as_root?.max_depth || 0) + 2;
              });

              const layersToShow = showAllLayers ? activeLayers : activeLayers.slice(0, 6);
              const maxDepth = matrixStats?.as_root?.max_depth || 0;

              return layersToShow.map((layer) => {
                const progress = calculateLayerProgress(layer);
                const status = getLayerStatus(layer);
                const layerCount = matrixStats?.as_root?.layer_distribution?.[layer] || 0;
                const capacity = Math.pow(3, layer);

                return (
                  <div key={layer} className="flex items-center gap-2 md:gap-3">
                    <Badge 
                      variant={status === 'completed' ? 'default' : status === 'active' ? 'secondary' : 'outline'}
                      className={`text-xs flex-shrink-0 ${
                        status === 'completed' ? 'bg-green-600 text-white' : 
                        status === 'active' ? 'bg-honey text-black' : 
                        'text-muted-foreground'
                      }`}
                    >
                      L{layer}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate">
                          {layerCount}/{capacity >= 1000000 ? `${(capacity/1000000).toFixed(1)}M` : capacity >= 1000 ? `${(capacity/1000).toFixed(1)}K` : capacity}
                        </span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          
          {/* Summary info */}
          <div className="flex justify-between text-xs text-muted-foreground bg-muted/20 rounded p-2">
            <span>Max Depth: Layer {matrixStats?.as_root?.max_depth || 0}</span>
            <span>Total Capacity: 19 Layers</span>
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
              const referralLink = `${window.location.origin}/welcome?ref=${walletAddress}`;
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