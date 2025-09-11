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
      
      // Try spillover_matrix first, then fall back to other tables
      let spilloverData = null;
      let spilloverError = null;

      // First try spillover_matrix
      const { data: spilloverResult, error: spilloverErr } = await supabase
        .from('spillover_matrix')
        .select(`
          member_wallet,
          matrix_layer,
          matrix_position,
          placed_at,
          is_active
        `)
        .eq('matrix_root', walletAddress)
        .eq('is_active', true)
        .order('placed_at', { ascending: false });

      if (spilloverErr) {
        console.warn('spillover_matrix table not available:', spilloverErr);
        
        // Try detailed_spillover_analysis as suggested by the error
        const { data: analysisResult, error: analysisErr } = await supabase
          .from('detailed_spillover_analysis')
          .select('*')
          .eq('matrix_root', walletAddress)
          .order('created_at', { ascending: false });

        if (analysisErr) {
          console.warn('detailed_spillover_analysis not available:', analysisErr);
          spilloverError = analysisErr;
        } else {
          spilloverData = analysisResult;
        }
      } else {
        spilloverData = spilloverResult;
      }

      if (!spilloverData || spilloverError) {
        console.warn('Matrix data not available, using basic referrals fallback');
        // Fallback to basic referrals data from users table
        const { data: basicReferrals } = await supabase
          .from('users')
          .select('wallet_address, username, created_at')
          .eq('referrer_wallet', walletAddress)
          .limit(10);

        // Get activation status for the referrals
        const walletAddresses = basicReferrals?.map(u => u.wallet_address) || [];
        const { data: membersData } = await supabase
          .from('members')
          .select('wallet_address, current_level')
          .in('wallet_address', walletAddresses);

        const activatedCount = membersData?.filter(m => m.current_level > 0).length || 0;

        setMatrixStats({
          as_root: {
            total_team_size: basicReferrals?.length || 0,
            activated_members: activatedCount,
            max_depth: 1,
            layer_distribution: { 1: basicReferrals?.length || 0 }
          },
          overall: { network_strength: (basicReferrals?.length || 0) * 5 }
        });

        setReferrals(basicReferrals?.map((user: any) => {
          const memberData = membersData?.find(m => m.wallet_address === user.wallet_address);
          return {
            member_wallet: user.wallet_address,
            member_name: user.username,
            layer: 1,
            position: 'L',
            placement_type: 'direct',
            placed_at: user.created_at,
            is_active: !!memberData,
            member_level: memberData?.current_level || 0
          };
        }) || []);
        return;
      }

      // Process spillover matrix data
      const totalTeamSize = spilloverData?.length || 0;
      const activatedMembers = spilloverData?.filter(m => m.members?.current_level > 0).length || 0;
      const maxDepth = Math.max(...(spilloverData?.map(m => m.matrix_layer) || [1]));
      
      // Calculate layer distribution
      const layerDistribution: { [key: number]: number } = {};
      spilloverData?.forEach(member => {
        layerDistribution[member.matrix_layer] = (layerDistribution[member.matrix_layer] || 0) + 1;
      });

      const formattedStats = {
        as_root: {
          total_team_size: totalTeamSize,
          activated_members: activatedMembers,
          max_depth: maxDepth,
          layer_distribution: layerDistribution
        },
        overall: {
          network_strength: totalTeamSize * 10 // Simple calculation
        }
      };

      setMatrixStats(formattedStats);
      
      // Format recent members
      const recentMembers = spilloverData?.slice(0, 10).map((member: any) => ({
        member_wallet: member.member_wallet,
        member_name: member.users?.username || 'Unknown',
        layer: member.matrix_layer,
        position: member.matrix_position,
        placement_type: 'spillover', // Will need logic to determine direct vs spillover
        placed_at: member.placed_at,
        is_active: member.is_active,
        member_level: member.members?.current_level || 0
      })) || [];
      
      setReferrals(recentMembers);

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