import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, Trophy, Target, Layers } from 'lucide-react';
import { matrixService } from '@/lib/supabaseClient';
import { useI18n } from '@/contexts/I18nContext';

interface LayerStats {
  layer: number;
  totalMembers: number;
  leftMembers: number;
  middleMembers: number;
  rightMembers: number;
  maxCapacity: number;
  fillPercentage: number;
  activeMembers: number;
}

interface MatrixLayerStatsProps {
  walletAddress: string;
  showAllLayers?: boolean;
}

const MatrixLayerStats: React.FC<MatrixLayerStatsProps> = ({ 
  walletAddress, 
  showAllLayers = false 
}) => {
  const { t } = useI18n();
  const [layerStats, setLayerStats] = useState<LayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLayerView, setCurrentLayerView] = useState(1);

  useEffect(() => {
    if (walletAddress) {
      loadLayerStats();
    }
  }, [walletAddress]);

  const loadLayerStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // 使用新的spillover matrix服务获取实际的matrix数据（已经应用滑落逻辑）
      const spilloverResult = await matrixService.getSpilloverMatrixStats(walletAddress);
      
      if (spilloverResult.success && spilloverResult.data.layerStats) {
        // 使用数据库函数返回的层级统计
        const dbLayerStats = spilloverResult.data.layerStats;
        const stats: LayerStats[] = [];
        
        // 创建完整的19层统计
        for (let layer = 1; layer <= 19; layer++) {
          const dbStat = dbLayerStats.find((stat: any) => stat.layer_num === layer);
          
          if (dbStat) {
            stats.push({
              layer,
              totalMembers: Number(dbStat.current_count),
              leftMembers: Number(dbStat.l_count),
              middleMembers: Number(dbStat.m_count), 
              rightMembers: Number(dbStat.r_count),
              maxCapacity: Number(dbStat.max_capacity),
              fillPercentage: Number(dbStat.fill_percentage),
              activeMembers: Number(dbStat.current_count) // spillover matrix中的都是活跃会员
            });
          } else {
            // 没有数据的层级
            stats.push({
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

        setLayerStats(stats);
      } else {
        // 没有数据时创建空的统计
        const emptyStats: LayerStats[] = [];
        for (let layer = 1; layer <= 19; layer++) {
          emptyStats.push({
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
        setLayerStats(emptyStats);
      }
    } catch (error: any) {
      console.error('Error loading spillover matrix stats:', error);
      setError(error.message || 'Failed to load spillover matrix statistics');
    } finally {
      setLoading(false);
    }
  };

  const getLayerColor = (fillPercentage: number) => {
    if (fillPercentage >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (fillPercentage >= 50) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (fillPercentage >= 20) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const renderLayerCard = (stat: LayerStats) => (
    <div
      key={stat.layer}
      className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getLayerColor(stat.fillPercentage)}`}
    >
      <div className="flex justify-between items-center mb-3">
        <Badge variant="outline" className="font-semibold">
          第 {stat.layer} 层
        </Badge>
        <Badge 
          variant="secondary" 
          className={stat.fillPercentage > 0 ? 'bg-honey/20 text-honey' : ''}
        >
          {stat.totalMembers}/{stat.maxCapacity}
        </Badge>
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
          <span>活跃: {stat.activeMembers}</span>
        </div>
        <div className="font-medium">
          {stat.fillPercentage.toFixed(1)}%
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-muted/50 rounded-full h-1.5">
        <div 
          className="bg-gradient-to-r from-honey to-honey/70 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(stat.fillPercentage, 100)}%` }}
        />
      </div>
    </div>
  );

  const renderSummaryStats = () => {
    const totalMembers = layerStats.reduce((sum, stat) => sum + stat.totalMembers, 0);
    const totalActive = layerStats.reduce((sum, stat) => sum + stat.activeMembers, 0);
    const deepestLayer = layerStats.findIndex(stat => stat.totalMembers === 0) || 19;
    const avgFillRate = layerStats.slice(0, deepestLayer).reduce((sum, stat) => sum + stat.fillPercentage, 0) / Math.max(deepestLayer, 1);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{totalMembers}</div>
          <div className="text-xs text-muted-foreground">总会员数</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{totalActive}</div>
          <div className="text-xs text-muted-foreground">活跃会员</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{deepestLayer}</div>
          <div className="text-xs text-muted-foreground">最深层数</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-5 h-5 text-honey" />
          </div>
          <div className="text-2xl font-bold text-honey">{avgFillRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">平均填充率</div>
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
            <div className="text-sm text-muted-foreground">加载层级统计中...</div>
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
            <div className="text-red-400 mb-2">⚠️ 加载失败</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadLayerStats}
            >
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleStats = showAllLayers ? layerStats : layerStats.slice(0, 5);

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-honey">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <span>19层矩阵统计</span>
          </div>
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
            1×3 结构
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 总体统计 */}
        {renderSummaryStats()}

        {/* 层级统计网格 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-honey">各层详细统计</h4>
            {!showAllLayers && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentLayerView(Math.max(1, currentLayerView - 5))}
                  disabled={currentLayerView <= 1}
                  className="border-honey/30 text-honey hover:bg-honey hover:text-black"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {currentLayerView}-{Math.min(currentLayerView + 4, 19)} 层
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentLayerView(Math.min(15, currentLayerView + 5))}
                  disabled={currentLayerView >= 15}
                  className="border-honey/30 text-honey hover:bg-honey hover:text-black"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(showAllLayers ? layerStats : layerStats.slice(currentLayerView - 1, currentLayerView + 4))
              .map(renderLayerCard)}
          </div>
        </div>

        {/* 帮助文本 */}
        <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
          <p>💡 <strong>递归推荐树</strong>: 每个会员都有自己独立的19层矩阵</p>
          <p className="text-xs mt-1">
            📈 推荐链示例: A→B→C→D→E | A看到: B(L1),C(L2),D(L3),E(L4) | B看到: C(L1),D(L2),E(L3)
          </p>
          <p className="text-xs mt-1">
            🎯 滑落机制: 当某层满员时(3^层数)，新成员自动滑落到下一层的可用位置
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatrixLayerStats;