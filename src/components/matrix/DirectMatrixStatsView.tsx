import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Activity, Layers, Target, Crown, ArrowUpRight, Loader2 } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

interface DirectMatrixStatsViewProps {
  walletAddress: string;
}

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

export function DirectMatrixStatsView({ walletAddress }: DirectMatrixStatsViewProps) {
  const { t } = useI18n();
  const [layerStats, setLayerStats] = useState<LayerStatsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (walletAddress) {
      loadMatrixStats();
    }
  }, [walletAddress]);

  const loadMatrixStats = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Calling matrix-view function directly for:', walletAddress);
      
      // Direct call to Supabase function
      const response = await fetch('https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          action: 'get-layer-stats'
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Matrix-view function response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch matrix stats');
      }

      const stats = result.data;
      setLayerStats(stats.layer_stats || []);
      setSummary(stats.summary || null);

    } catch (error: any) {
      console.error('❌ Direct API call error:', error);
      setError(error.message || 'Failed to load matrix statistics');
    } finally {
      setLoading(false);
    }
  };

  const renderNetworkOverview = () => {
    if (!summary) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {summary.total_members}
          </div>
          <div className="text-xs text-muted-foreground">Total Members</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 px-1">
              L{summary.deepest_layer}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {summary.total_active}
          </div>
          <div className="text-xs text-muted-foreground">Active Members</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-400">
              {summary.layers_with_data}
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {summary.deepest_layer}
          </div>
          <div className="text-xs text-muted-foreground">Active Layers</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Crown className="w-5 h-5 text-honey" />
            <span className="text-xs text-honey">
              {summary.total_active > 0 ? ((summary.total_active / summary.total_members) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="text-2xl font-bold text-honey">
            {Math.round((summary.total_active / summary.total_members) * 100) || 0}%
          </div>
          <div className="text-xs text-muted-foreground">Activation Rate</div>
        </div>
      </div>
    );
  };

  const renderLayerStats = () => {
    const visibleLayers = layerStats.slice(0, 10); // Show first 10 layers

    return visibleLayers.map((stat) => {
      const getLayerStatusColor = (fillPercentage: number, completedPercentage: number) => {
        if (completedPercentage >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30';
        if (fillPercentage >= 80) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        if (fillPercentage >= 50) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        if (fillPercentage >= 20) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      };

      return (
        <div
          key={stat.layer}
          className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getLayerStatusColor(stat.fillPercentage, stat.completedPercentage)}`}
        >
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
            </div>
          </div>

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

          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Fill Rate</span>
              <span>{stat.fillPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-honey to-honey/70 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stat.fillPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-honey" />
            <div className="text-sm text-muted-foreground">Loading matrix statistics...</div>
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
              onClick={loadMatrixStats}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Matrix Overview */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-honey">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Direct Matrix Network Stats
            </div>
            {summary && (
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                {summary.total_members} members
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderNetworkOverview()}
        </CardContent>
      </Card>
      
      {/* Layer Statistics */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <TrendingUp className="h-5 w-5" />
            Layer Statistics (Direct from Functions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {layerStats.length > 0 ? (
              renderLayerStats()
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No matrix data available</p>
                <p className="text-sm">Start building your network by referring members</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DirectMatrixStatsView;