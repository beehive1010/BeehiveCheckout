import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Activity, Layers, Target, Crown, ArrowUpRight, Loader2 } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixNetworkStatsV2Props {
  walletAddress: string;
}

interface MatrixStatsData {
  totalMembers: number;
  activeMembers: number;
  deepestLayer: number;
  layersWithData: number;
  directReferrals: number;
  layerBreakdown: Array<{
    layer: number;
    totalMembers: number;
    leftMembers: number;
    middleMembers: number;
    rightMembers: number;
    maxCapacity: number;
    fillPercentage: number;
    activeMembers: number;
  }>;
}

export function MatrixNetworkStatsV2({ walletAddress }: MatrixNetworkStatsV2Props) {
  const { t } = useI18n();
  
  // Direct API state management
  const [matrixStats, setMatrixStats] = useState<MatrixStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadMatrixStats();
    }
  }, [walletAddress]);

  const loadMatrixStats = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Loading matrix stats directly from Supabase for:', walletAddress);
      
      // Import supabase client 
      const { supabase } = await import('../../lib/supabaseClient');
      
      // Get layer statistics directly from matrix_layers_view
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

      // Transform data for all 19 layers
      const layerStats = [];
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = matrixData?.find((l: any) => l.layer === layer);
        
        if (layerData) {
          layerStats.push({
            layer: layerData.layer,
            totalMembers: layerData.filled_slots || 0,
            leftMembers: layerData.left_count || 0,
            middleMembers: layerData.middle_count || 0,
            rightMembers: layerData.right_count || 0,
            maxCapacity: layerData.max_slots || Math.pow(3, layer),
            fillPercentage: parseFloat(layerData.completion_rate || 0),
            activeMembers: layerData.activated_members || 0
          });
        } else {
          layerStats.push({
            layer,
            totalMembers: 0,
            leftMembers: 0,
            middleMembers: 0,
            rightMembers: 0,
            maxCapacity: Math.pow(3, layer),
            fillPercentage: 0,
            activeMembers: 0
          });
        }
      }

      // Calculate summary
      const totalMembers = layerStats.reduce((sum, stat) => sum + stat.totalMembers, 0);
      const totalActive = layerStats.reduce((sum, stat) => sum + stat.activeMembers, 0);
      const deepestLayer = Math.max(...layerStats.filter(s => s.totalMembers > 0).map(s => s.layer), 0);
      const layersWithData = layerStats.filter(s => s.totalMembers > 0).length;

      const statsData: MatrixStatsData = {
        totalMembers,
        activeMembers: totalActive,
        deepestLayer,
        layersWithData,
        directReferrals: layerStats.find((l: any) => l.layer === 1)?.totalMembers || 0,
        layerBreakdown: layerStats.slice(0, 5) // Show first 5 layers
      };

      setMatrixStats(statsData);

    } catch (error: any) {
      console.error('❌ Matrix stats loading error:', error);
      setError(error.message || t('matrix.errors.loadMatrixStatsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading;

  const renderLoadingState = () => (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2].map((i) => (
        <Card key={i} className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMatrixLayerStats = () => {
    if (!matrixStats?.layerBreakdown) return null;

    return matrixStats.layerBreakdown.map((layer) => {
      const fillRate = layer.fillPercentage;
      const activatedMembers = layer.activeMembers;
      
      return (
        <div 
          key={layer.layer} 
          className="bg-gradient-to-r from-muted/30 to-background rounded-lg p-4 border border-border hover:border-honey/30 transition-all"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-honey/10 text-honey border-honey/30 font-semibold"
              >
                Layer {layer.layer}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`${fillRate > 80 ? 'bg-green-500/10 text-green-400' : fillRate > 50 ? 'bg-orange-500/10 text-orange-400' : 'bg-muted'}`}
              >
                {layer.totalMembers} members
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-honey" />
              <span className="text-sm font-medium text-honey">{fillRate.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{layer.leftMembers}</div>
              <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.left')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{layer.middleMembers}</div>
              <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.middle')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{layer.rightMembers}</div>
              <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.right')}</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-green-400" />
              <span className="text-muted-foreground">
                Activated: <span className="text-green-400 font-medium">{activatedMembers}</span>
              </span>
            </div>
            <div className="text-muted-foreground">
              Max: {layer.maxCapacity}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2 w-full bg-muted/50 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-honey to-honey/70 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(fillRate, 100)}%` }}
            />
          </div>
        </div>
      );
    });
  };

  const renderNetworkOverview = () => {
    if (!matrixStats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {matrixStats.totalMembers}
          </div>
          <div className="text-xs text-muted-foreground">Total Team</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 px-1">
              L{matrixStats.deepestLayer}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {matrixStats.directReferrals}
          </div>
          <div className="text-xs text-muted-foreground">Direct Refs</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-400">
              {matrixStats.layersWithData}
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {matrixStats.layersWithData}
          </div>
          <div className="text-xs text-muted-foreground">Active Layers</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Crown className="w-5 h-5 text-honey" />
            <span className="text-xs text-honey">
              {matrixStats.totalMembers > 0 ? ((matrixStats.activeMembers / matrixStats.totalMembers) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="text-2xl font-bold text-honey">
            {matrixStats.activeMembers}
          </div>
          <div className="text-xs text-muted-foreground">Active Members</div>
        </div>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!matrixStats) return null;

    const activationRate = matrixStats.totalMembers > 0 ? (matrixStats.activeMembers / matrixStats.totalMembers) * 100 : 0;
    const averageFillRate = matrixStats.layerBreakdown.length > 0 
      ? matrixStats.layerBreakdown.reduce((sum, layer) => sum + layer.fillPercentage, 0) / matrixStats.layerBreakdown.length 
      : 0;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-honey flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performance Metrics (Direct from Views)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Activation Rate</span>
              <TrendingUp className="w-4 h-4 text-honey" />
            </div>
            <div className="text-lg font-bold text-honey">
              {activationRate.toFixed(1)}%
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1 mt-2">
              <div 
                className="bg-honey h-1 rounded-full transition-all"
                style={{ width: `${Math.min(activationRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Avg Fill Rate</span>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-lg font-bold text-green-400">
              {averageFillRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">across layers</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Team Depth</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-blue-400">
              {matrixStats.deepestLayer}
            </div>
            <div className="text-xs text-muted-foreground">layers deep</div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Enhanced Matrix Overview */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-honey">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Enhanced Matrix Network
            </div>
            {matrixStats && (
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                {matrixStats.totalMembers} members
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderNetworkOverview()}
          {renderPerformanceMetrics()}
        </CardContent>
      </Card>
      
      {/* Enhanced Layer Statistics */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <TrendingUp className="h-5 w-5" />
            Layer-by-Layer Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            {matrixStats?.layerBreakdown && matrixStats.layerBreakdown.length > 0 ? (
              renderMatrixLayerStats()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No matrix data available</p>
                <p className="text-sm">Start building your network by referring members</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add retry button for failed loads */}
      {error && (
        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">⚠️ Failed to load matrix statistics</div>
              <div className="text-xs text-muted-foreground mb-4">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMatrixStats}
                className="border-honey/30 text-honey hover:bg-honey hover:text-black"
              >
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}