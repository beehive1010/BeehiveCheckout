import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronUp, ChevronDown, Users, Trophy, Target, Layers, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '@/contexts/I18nContext';

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
}

interface MatrixLayerStatsViewProps {
  walletAddress: string;
  compact?: boolean;
}

// Matrix spillover logic: redistribute referral tree members into matrix structure
const applyMatrixSpilloverLogic = (referralData: any[]) => {
  const matrixPositions: any[] = [];
  const layerCapacity = [0, 3, 9, 27, 81, 243, 729]; // Layer 1-6 capacity
  
  // Group by depth (layer) first
  const membersByDepth = referralData.reduce((acc, member) => {
    const depth = member.depth;
    if (!acc[depth]) acc[depth] = [];
    acc[depth].push(member);
    return acc;
  }, {} as Record<number, any[]>);

  // Process each depth level
  Object.keys(membersByDepth).forEach(depthKey => {
    const depth = parseInt(depthKey);
    const members = membersByDepth[depth];
    
    members.forEach((member, index) => {
      // Calculate matrix position based on spillover logic
      const capacity = layerCapacity[depth] || Math.pow(3, depth);
      const positionIndex = index % 3;
      const layer = depth;
      
      matrixPositions.push({
        layer: layer,
        position: ['L', 'M', 'R'][positionIndex],
        wallet_address: member.wallet_address,
        activation_sequence: member.activation_sequence
      });
    });
  });

  return matrixPositions;
};

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
      
      // Get layer summary data
      const { data: matrixData, error: layerError } = await supabase
        .from('matrix_layers_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('layer', { ascending: true });

      if (layerError) {
        console.error('❌ Matrix layers query error:', layerError);
        throw new Error(`Matrix layers error: ${layerError.message}`);
      }

      console.log('📊 Matrix layers data:', matrixData);

      // Try to get matrix data from available views, applying BFS logic
      let positionData;
      
      console.log('🔍 Trying matrix_referrals_tree_view first...');
      
      // Try matrix_referrals_tree_view first
      const matrixResult = await supabase
        .from('matrix_referrals_tree_view')
        .select('layer, position, member_wallet, activation_sequence, is_spillover')
        .eq('matrix_root_wallet', walletAddress)
        .neq('position', 'root');

      if (matrixResult.error) {
        console.warn('⚠️ matrix_referrals_tree_view not available, using referral_tree_view with BFS logic');
        
        // Fallback: Use referral_tree_view and apply BFS matrix logic
        const referralResult = await supabase
          .from('referral_tree_view')
          .select('depth, position, wallet_address, activation_sequence')
          .eq('root_wallet', walletAddress)
          .neq('position', 'root')
          .order('activation_sequence', { ascending: true });

        if (referralResult.error) {
          throw new Error(`No suitable matrix view available: ${referralResult.error.message}`);
        }

        console.log('📊 Raw referral tree data (applying BFS logic):', referralResult.data);
        
        // Apply BFS matrix placement algorithm
        positionData = applyBFSMatrixPlacement(referralResult.data || []);
      } else {
        positionData = matrixResult.data;
        console.log('📊 Matrix data from matrix_referrals_tree_view:', positionData);
      }

      // Calculate position distribution by layer
      const positionByLayer: Record<number, { L: number; M: number; R: number }> = {};
      positionData?.forEach(member => {
        const layer = member.layer; // Now consistently using layer field
        if (!positionByLayer[layer]) {
          positionByLayer[layer] = { L: 0, M: 0, R: 0 };
        }
        if (member.position === 'L' || member.position === 'M' || member.position === 'R') {
          positionByLayer[layer][member.position]++;
        }
      });

      console.log('📊 Position distribution by layer:', positionByLayer);

      // Transform data to match LayerStatsData interface
      const layerStats: LayerStatsData[] = matrixData?.map((layer: any) => ({
        layer: layer.layer || 1,
        totalMembers: layer.filled_slots || 0,
        leftMembers: positionByLayer[layer.layer]?.L || 0,
        middleMembers: positionByLayer[layer.layer]?.M || 0,
        rightMembers: positionByLayer[layer.layer]?.R || 0,
        maxCapacity: layer.max_slots || Math.pow(3, layer.layer || 1),
        fillPercentage: parseFloat(layer.completion_rate || 0),
        activeMembers: layer.filled_slots || 0,
        completedPercentage: parseFloat(layer.completion_rate || 0),
      })) || [];

      setLayerStats(layerStats);
      
    } catch (error: any) {
      console.error('Error loading layer stats:', error);
      setError(error.message || 'Failed to load layer statistics');
      
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

  const getLayerStatusColor = (fillPercentage: number, completedPercentage: number) => {
    if (completedPercentage >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (fillPercentage >= 80) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (fillPercentage >= 50) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (fillPercentage >= 20) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const renderLayerCard = (stat: LayerStatsData) => (
    <div
      key={stat.layer}
      className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getLayerStatusColor(stat.fillPercentage, stat.completedPercentage)}`}
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
          {stat.activeMembers === stat.totalMembers && stat.totalMembers > 0 && (
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
          <span>{stat.completedPercentage.toFixed(1)}% Complete</span>
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
          <span>Activation Rate</span>
          <span>{stat.completedPercentage.toFixed(1)}%</span>
        </div>
        <Progress 
          value={stat.completedPercentage} 
          className="h-1.5"
        />
      </div>
    </div>
  );

  const renderSummaryStats = () => {
    const totalMembers = layerStats.reduce((sum, stat) => sum + stat.totalMembers, 0);
    const totalActive = layerStats.reduce((sum, stat) => sum + stat.activeMembers, 0);
    const layersWithMembers = layerStats.filter(stat => stat.totalMembers > 0).length;
    const layersCompleted = layerStats.filter(stat => stat.activeMembers === stat.totalMembers && stat.totalMembers > 0).length;
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
          <div className="text-2xl font-bold text-purple-400">{layersCompleted}/{layersWithMembers}</div>
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
                {showAllLayers ? 'Show Less' : 'Show All 19 Layers'}
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
              📊 Each layer can hold 3^layer positions (Layer 1: 3, Layer 2: 9, Layer 3: 27, etc.)
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MatrixLayerStatsView;