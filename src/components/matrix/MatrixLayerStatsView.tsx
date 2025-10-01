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
      console.log('🔍 Loading matrix layer stats for:', walletAddress);
      
      // Use direct database view query instead of edge function
      console.log('📊 Using direct database query for matrix stats');

      // Get matrix layer statistics directly from matrix_referrals_tree_view
      const { data: matrixData, error: matrixError } = await supabase
        .from('matrix_referrals_tree_view')
        .select('matrix_layer, matrix_position, member_wallet, referral_type')
        .eq('matrix_root_wallet', walletAddress);

      if (matrixError) {
        throw new Error(`Database error: ${matrixError.message}`);
      }

      console.log('📊 Matrix data from database:', matrixData);

      // Calculate layer statistics from raw data
      const layerCounts: Record<number, { L: number, M: number, R: number, active: number }> = {};

      matrixData?.forEach(member => {
        const layer = member.matrix_layer;
        if (!layerCounts[layer]) {
          layerCounts[layer] = { L: 0, M: 0, R: 0, active: 0 };
        }

        // Count positions - support both simple positions (L, M, R) and complex positions (L.L, L.M, etc.)
        const position = member.matrix_position;
        if (position === 'L' || position?.endsWith('.L')) layerCounts[layer].L++;
        else if (position === 'M' || position?.endsWith('.M')) layerCounts[layer].M++;
        else if (position === 'R' || position?.endsWith('.R')) layerCounts[layer].R++;

        // Count active members (assume all are active since they're in the matrix)
        layerCounts[layer].active++;
      });

      // Generate layer stats for all 19 layers
      const layer_stats = [];
      for (let layer = 1; layer <= 19; layer++) {
        const counts = layerCounts[layer] || { L: 0, M: 0, R: 0, active: 0 };
        const totalMembers = counts.L + counts.M + counts.R;
        // For matrix layers, capacity grows exponentially
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
          Layer {stat.layer}
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
          <div className="text-xs text-muted-foreground">L</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{stat.middleMembers}</div>
          <div className="text-xs text-muted-foreground">M</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{stat.rightMembers}</div>
          <div className="text-xs text-muted-foreground">R</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex justify-between items-center text-xs mb-2">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>Active: {stat.activeMembers}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          <span>{stat.fillPercentage.toFixed(1)}% Complete</span>
        </div>
      </div>

      {/* Fill Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Fill Rate</span>
          <span>{stat.fillPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={stat.fillPercentage} className="h-1.5" />
      </div>

      {/* Completion Progress */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>Layer Complete</span>
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
    const totalMembers = layerStats.reduce((sum, stat) => sum + stat.totalMembers, 0);
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
          <div className="text-xs text-muted-foreground">Total Members</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{totalActive}</div>
          <div className="text-xs text-muted-foreground">Active Members</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{layersCompleted}/19</div>
          <div className="text-xs text-muted-foreground">Layers Completed</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-5 h-5 text-honey" />
          </div>
          <div className="text-2xl font-bold text-honey">{avgCompletionRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Avg Completion</div>
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
            <div className="text-sm text-muted-foreground">Loading layer statistics...</div>
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
            <div className="text-red-400 mb-2">⚠️ Loading failed</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadLayerStats}
            >
              Retry
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
            <span>Matrix Layer Statistics</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
              19 Layers
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
            <h4 className="font-medium text-honey">Layer Details</h4>
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
            <p>💡 <strong>Layer Statistics</strong>: Fill rate shows position occupancy, completion rate shows member activation</p>
            <p className="text-xs mt-1">
              🎯 Green layers are fully activated • Blue layers are well-filled • Yellow layers need more members
            </p>
            <p className="text-xs mt-1">
              📊 Each layer capacity: 3^layer positions (Layer 1: 3, Layer 2: 9, Layer 3: 27, etc.)
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MatrixLayerStatsView;