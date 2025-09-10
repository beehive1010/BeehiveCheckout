import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Activity, Layers, Target, Crown, ArrowUpRight, Loader2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useDashboardV2, useMatrixTreeV2, useGlobalPoolStatsV2 } from '@/hooks/useDashboardV2';

interface MatrixNetworkStatsV2Props {
  walletAddress: string;
}

export function MatrixNetworkStatsV2({ walletAddress }: MatrixNetworkStatsV2Props) {
  const { t } = useI18n();
  
  // Use v2 hooks for enhanced data
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboardV2(walletAddress);
  const { data: matrixTree, isLoading: isMatrixLoading } = useMatrixTreeV2(walletAddress, 5); // First 5 layers for overview
  const { data: globalStats } = useGlobalPoolStatsV2();

  const isLoading = isDashboardLoading || isMatrixLoading;

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
    if (!matrixTree?.layerSummary) return null;

    return matrixTree.layerSummary.slice(0, 5).map((layer) => {
      const fillRate = layer.fillPercentage;
      const activatedMembers = layer.members.filter((m: any) => m.activated).length;
      
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
                {layer.members.length} members
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-honey" />
              <span className="text-sm font-medium text-honey">{fillRate.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{layer.members.filter((m: any) => m.position === 'L').length}</div>
              <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.left')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{layer.members.filter((m: any) => m.position === 'M').length}</div>
              <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.middle')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{layer.members.filter((m: any) => m.position === 'R').length}</div>
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
    if (!dashboardData) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {dashboardData.matrix.totalTeamSize}
          </div>
          <div className="text-xs text-muted-foreground">Total Team</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 px-1">
              L{dashboardData.matrix.deepestLayer}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {dashboardData.matrix.directReferrals}
          </div>
          <div className="text-xs text-muted-foreground">Direct Refs</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-400">
              {dashboardData.matrix.averageLayerFillRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {Object.keys(dashboardData.matrix.layerCounts).length}
          </div>
          <div className="text-xs text-muted-foreground">Active Layers</div>
        </div>

        <div className="bg-gradient-to-br from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
          <div className="flex items-center justify-between mb-2">
            <Crown className="w-5 h-5 text-honey" />
            <span className="text-xs text-honey">
              {dashboardData.matrix.activationRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-honey">
            {globalStats?.globalPool.totalMembersActivated || 0}
          </div>
          <div className="text-xs text-muted-foreground">Global Active</div>
        </div>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!dashboardData?.performance) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-honey flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performance Metrics
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Spillover Rate</span>
              <TrendingUp className="w-4 h-4 text-honey" />
            </div>
            <div className="text-lg font-bold text-honey">
              {dashboardData.performance.spilloverRate.toFixed(1)}%
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1 mt-2">
              <div 
                className="bg-honey h-1 rounded-full transition-all"
                style={{ width: `${Math.min(dashboardData.performance.spilloverRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Growth Velocity</span>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-lg font-bold text-green-400">
              {dashboardData.performance.growthVelocity.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">members/day</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Reward Efficiency</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-blue-400">
              ${dashboardData.performance.rewardEfficiency.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">per member</div>
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
            {dashboardData && (
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                {dashboardData.matrix.totalTeamSize} members
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
            {matrixTree?.layerSummary && matrixTree.layerSummary.length > 0 ? (
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

      {/* Global Network Statistics */}
      {globalStats && (
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <Crown className="h-5 w-5" />
              Global Network Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-honey/5 rounded-lg border border-honey/20">
                <div className="text-2xl font-bold text-honey">
                  {globalStats.globalPool.totalMembersActivated.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Global Members</div>
              </div>
              <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">
                  {globalStats.tierBreakdown.tier1.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Tier 1 Members</div>
              </div>
              <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">
                  {globalStats.globalPool.currentTier}
                </div>
                <div className="text-xs text-muted-foreground">Current Global Tier</div>
              </div>
              <div className="text-center p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">
                  {globalStats.globalPool.totalBccLocked.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">BCC Locked</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}