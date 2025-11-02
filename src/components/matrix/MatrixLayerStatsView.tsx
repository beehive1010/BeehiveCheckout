import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronUp, ChevronDown, Users, Trophy, Target, Layers, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface LayerStatsData {
  layer: number;
  totalMembers: number;
  leftMembers: number;
  middleMembers: number;
  rightMembers: number;
  maxCapacity: number;
  fillPercentage: number;
  activeMembers: number;
  completedPercentage: number;
  activationRate?: number;
  layerStatus?: 'completed' | 'active' | 'started' | 'empty';
  isBalanced?: boolean;
}

interface MatrixLayerStatsViewProps {
  walletAddress: string;
  compact?: boolean;
}

// Matrix views now handle BFS logic in database - no frontend processing needed

const MatrixLayerStatsView: React.FC<MatrixLayerStatsViewProps> = ({ 
  walletAddress, 
  compact = false 
}) => {
  const { t } = useI18n();
  const [layerStats, setLayerStats] = useState<LayerStatsData[]>([]);
  const [totalDownlineMembers, setTotalDownlineMembers] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [showAllLayers, setShowAllLayers] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadLayerStats();
    }
  }, [walletAddress]);

  const loadLayerStats = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading matrix layer stats for wallet:', walletAddress);

      // Get total member count from user's subtree
      const { data: subtreeStats, error: statsError } = await supabase
        .rpc('fn_get_user_matrix_stats', { p_user_wallet: walletAddress })
        .single();

      if (statsError) {
        console.error('❌ Failed to fetch user matrix stats:', statsError);
      }

      const totalMembers = subtreeStats?.total_members || 0;
      setTotalDownlineMembers(totalMembers);
      console.log('📊 Total members in user subtree:', totalMembers);

      // Use RPC function for user's 19-layer stats
      console.log('📊 Using fn_get_user_layer_stats RPC for user matrix stats');

      const { data: layerData, error: matrixError } = await supabase
        .rpc('fn_get_user_layer_stats', { p_user_wallet: walletAddress });

      if (matrixError) {
        throw new Error(`Database error: ${matrixError.message}`);
      }

      console.log('📊 Matrix layer data from fn_get_user_layer_stats:', layerData);
      console.log('📊 Total records found:', layerData?.length || 0);

      // Build layer counts from fn_get_user_layer_stats
      const layerCounts: Record<number, { L: number, M: number, R: number, active: number }> = {};

      // Map layer data from the view
      layerData?.forEach(row => {
        if (!layerCounts[row.layer]) {
          layerCounts[row.layer] = { L: 0, M: 0, R: 0, active: 0 };
        }
        layerCounts[row.layer].L += row.left_count || 0;
        layerCounts[row.layer].M += row.middle_count || 0;
        layerCounts[row.layer].R += row.right_count || 0;
        layerCounts[row.layer].active += row.filled || 0;
      });

      console.log('📊 Layer counts with L/M/R breakdown:', layerCounts);

      // Generate layer stats for all 19 layers
      // IMPORTANT: Always generate all 19 layers, even if view doesn't return them
      const layer_stats = [];
      for (let layer = 1; layer <= 19; layer++) {
        const counts = layerCounts[layer] || { L: 0, M: 0, R: 0, active: 0 };
        // Total members is sum of L+M+R, not from view (view might not have this layer)
        const totalMembers = counts.L + counts.M + counts.R;
        const maxCapacity = Math.pow(3, layer);
        const fillPercentage = maxCapacity > 0 ? (totalMembers / maxCapacity) * 100 : 0;

        layer_stats.push({
          layer,
          totalMembers,
          leftMembers: counts.L,
          middleMembers: counts.M,
          rightMembers: counts.R,
          maxCapacity,
          fillPercentage: Math.min(fillPercentage, 100),
          activeMembers: counts.active,
          completedPercentage: fillPercentage,
          activationRate: totalMembers > 0 ? (counts.active / totalMembers) * 100 : 0,
          layerStatus: totalMembers >= maxCapacity ? 'completed' : totalMembers > 0 ? 'active' : 'empty',
          isBalanced: Math.abs(counts.L - counts.M) <= 1 && Math.abs(counts.M - counts.R) <= 1
        });
      }

      console.log('📊 Generated stats for all 19 layers:', layer_stats.length);
      
      // Debug: Check specific Layer 2 data
      const layer2Data = layer_stats?.find((layer: any) => layer.layer === 2);
      if (layer2Data) {
        console.log('🔍 Layer 2 debug data:', {
          layer: layer2Data.layer,
          leftMembers: layer2Data.leftMembers,
          middleMembers: layer2Data.middleMembers,
          rightMembers: layer2Data.rightMembers,
          totalMembers: layer2Data.totalMembers,
          maxCapacity: layer2Data.maxCapacity
        });
      }

      // Transform data from matrix-view function response
      const layerStats: LayerStatsData[] = layer_stats?.map((layer: any) => ({
        layer: layer.layer || 1,
        totalMembers: layer.totalMembers || 0,
        leftMembers: layer.leftMembers || 0,
        middleMembers: layer.middleMembers || 0,
        rightMembers: layer.rightMembers || 0,
        maxCapacity: layer.maxCapacity || Math.pow(3, layer.layer || 1),
        fillPercentage: layer.fillPercentage || 0,
        activeMembers: layer.activeMembers || 0,
        completedPercentage: layer.completedPercentage || 0,
        activationRate: layer.activationRate || 0,
        layerStatus: layer.layerStatus || 'empty',
        isBalanced: layer.isBalanced || false,
      })) || [];

      console.log('📊 Final layer stats:', layerStats);
      
      // Debug: Show layer data structure 
      layer_stats?.forEach((layer: any) => {
        console.log(`🔍 Layer ${layer.layer} data:`, {
          leftMembers: layer.leftMembers,
          middleMembers: layer.middleMembers, 
          rightMembers: layer.rightMembers,
          totalMembers: layer.totalMembers,
          maxCapacity: layer.maxCapacity
        });
      });

      setLayerStats(layerStats);
      
    } catch (error: any) {
      console.error('Error loading layer stats:', error);
      setError(error.message || t('matrix.errors.loadLayerStatsFailed'));
      
      // Fallback: create empty stats
      const emptyStats: LayerStatsData[] = [];
      for (let layer = 1; layer <= 19; layer++) {
        emptyStats.push({
          layer,
          totalMembers: 0,
          leftMembers: 0,
          middleMembers: 0,
          rightMembers: 0,
          maxCapacity: Math.pow(3, layer),
          fillPercentage: 0,
          activeMembers: 0,
          completedPercentage: 0
        });
      }
      setLayerStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  const getLayerStatusColor = (fillPercentage: number, leftCount: number, middleCount: number, rightCount: number) => {
    // Color based on fill percentage only - more accurate representation
    if (fillPercentage >= 90) return 'text-green-400 bg-green-500/10 border-green-500/30'; // Complete (90%+)
    if (fillPercentage >= 66) return 'text-blue-400 bg-blue-500/10 border-blue-500/30'; // Good progress (66%+)
    if (fillPercentage >= 33) return 'text-orange-400 bg-orange-500/10 border-orange-500/30'; // Some progress (33%+)
    if (fillPercentage > 0) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'; // Started (>0%)
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30'; // Empty (0%)
  };

  const renderLayerCard = (stat: LayerStatsData) => {
    // A layer is "complete" only when it has very high fill percentage
    const isLayerComplete = stat.fillPercentage >= 90;
    
    return (
      <div
        key={stat.layer}
        className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getLayerStatusColor(stat.fillPercentage, stat.leftMembers, stat.middleMembers, stat.rightMembers)}`}
      >
      {/* Layer Header */}
      <div className="flex justify-between items-center mb-3">
        <Badge variant="outline" className="font-semibold text-xs">
          {t('membershipSystem.matrix.stats.layerStats.layer', { layer: stat.layer })}
        </Badge>
        <div className="flex gap-1">
          <Badge 
            variant="secondary" 
            className={`text-xs ${stat.totalMembers > 0 ? 'bg-honey/20 text-honey' : ''}`}
          >
            {stat.totalMembers}/{stat.maxCapacity}
          </Badge>
          {isLayerComplete && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Position Distribution */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{stat.leftMembers}</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.drillDown.positions.left')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{stat.middleMembers}</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.drillDown.positions.middle')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{stat.rightMembers}</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.drillDown.positions.right')}</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex justify-between items-center text-xs mb-2">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{t('membershipSystem.matrix.stats.layerStats.ActiveMember', { count: stat.activeMembers })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          <span>{t('membershipSystem.matrix.stats.layerStats.complete', { percent: stat.fillPercentage.toFixed(1) })}</span>
        </div>
      </div>

      {/* Fill Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>{t('membershipSystem.matrix.stats.layerStats.fillRate')}</span>
          <span>{stat.fillPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={stat.fillPercentage} className="h-1.5" />
      </div>

      {/* Completion Progress */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>{t('membershipSystem.matrix.stats.layerStats.layerComplete')}</span>
          <span>{stat.fillPercentage.toFixed(1)}%</span>
        </div>
        <Progress
          value={stat.fillPercentage}
          className="h-1.5"
        />
      </div>
    </div>
  );
  };

  const renderSummaryStats = () => {
    // totalMembers: 整体下线组织人数（不受19层限制）
    const totalMembers = totalDownlineMembers;
    // totalActive: 19层矩阵中的激活成员数
    const totalActive = layerStats.reduce((sum, stat) => sum + stat.activeMembers, 0);
    const layersWithMembers = layerStats.filter(stat => stat.totalMembers > 0).length;
    const layersCompleted = layerStats.filter(stat => {
      // A layer is truly "completed" only when it has 100% fill OR very high completion
      return stat.fillPercentage >= 90; // 90% or higher completion
    }).length;
    const avgFillRate = layersWithMembers > 0 ? layerStats.slice(0, layersWithMembers).reduce((sum, stat) => sum + stat.fillPercentage, 0) / layersWithMembers : 0;
    const avgCompletionRate = totalMembers > 0 ? (totalActive / totalMembers) * 100 : 0;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{totalMembers}</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.stats.layerStats.totalMembers')}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{totalActive}</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.stats.layerStats.activeMembers')}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{layersCompleted}/19</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.stats.layerStats.layersCompleted')}</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-5 h-5 text-honey" />
          </div>
          <div className="text-2xl font-bold text-honey">{avgCompletionRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">{t('membershipSystem.matrix.stats.layerStats.avgCompletion')}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">{t('membershipSystem.matrix.stats.layerStats.loading')}</div>
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
            <div className="text-red-400 mb-2">{t('membershipSystem.matrix.stats.layerStats.loadingFailed')}</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadLayerStats}
            >
              {t('membershipSystem.matrix.stats.layerStats.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show layers with data or up to layer 5 minimum, all layers if showAllLayers is true
  const layersWithData = layerStats.filter(stat => stat.totalMembers > 0);
  const maxLayerWithData = layersWithData.length > 0 ? Math.max(...layersWithData.map(s => s.layer)) : 1;
  const minLayersToShow = Math.max(5, maxLayerWithData); // Show at least 5 layers or up to the highest layer with data
  
  // Debug logging to help diagnose the issue
  console.log('🔍 Layer display calculation:', {
    layersWithDataCount: layersWithData.length,
    maxLayerWithData,
    minLayersToShow,
    showAllLayers,
    totalLayerStats: layerStats.length,
    layersWithDataDetails: layersWithData.map(l => ({ layer: l.layer, members: l.totalMembers }))
  });
  
  // FIXED: Show all layers up to the highest layer with data (not slice from 0)
  const visibleLayers = showAllLayers ? layerStats : layerStats.slice(0, minLayersToShow);

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-honey">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <span>{t('membershipSystem.matrix.stats.layerStats.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
              {t('membershipSystem.matrix.stats.layerStats.layerCount')}
            </Badge>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="p-1"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-6">
          {/* Summary Statistics */}
          {renderSummaryStats()}

          {/* Layer Controls */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-honey">{t('membershipSystem.matrix.stats.layerStats.layerDetails')}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing {visibleLayers.length} of 19 layers
                {layersWithData.length > 0 && ` (${layersWithData.length} with data)`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllLayers(!showAllLayers)}
                className="border-honey/30 text-honey hover:bg-honey hover:text-black"
              >
                {showAllLayers ? t('matrix.ui.showLess') : t('matrix.ui.showAllLayers')}
              </Button>
            </div>
          </div>

          {/* Layer Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {visibleLayers.map(renderLayerCard)}
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
            <p><strong>{t('membershipSystem.matrix.stats.layerStats.help.title')}</strong></p>
            <p className="text-xs mt-1">{t('membershipSystem.matrix.stats.layerStats.help.fillRate')}</p>
            <p className="text-xs mt-1">{t('membershipSystem.matrix.stats.layerStats.help.activeMembers')}</p>
            <p className="text-xs mt-1">{t('membershipSystem.matrix.stats.layerStats.help.totalSlots')}</p>
            <p className="text-xs mt-1">{t('membershipSystem.matrix.stats.layerStats.help.completion')}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MatrixLayerStatsView;