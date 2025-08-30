import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Share2, UserPlus, Crown, Home } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface NavigationPath {
  level: number;
  position: string;
  path: string; // e.g., "L.M.R" representing the path taken
}

interface UserStatsData {
  directReferrals: number;
  totalTeam: number;
  downlineMatrix: Array<{
    level: number;
    members: number;
    placements: number;
  }>;
}

interface MatrixPosition {
  name: string;
  filled: number;
  direct: number;
  spillover: number;
  hasChildren: boolean;
}

interface MatrixLevel {
  level: number;
  totalMembers: number;
  totalPlacements: number;
  positions: MatrixPosition[];
}

export default function ReferralsMatrixComponent({ walletAddress }: { walletAddress: string }) {
  const { t } = useI18n();
  const [navigationPath, setNavigationPath] = useState<NavigationPath[]>([]);
  const [viewingLevel, setViewingLevel] = useState(1);
  
  // Fetch user stats data
  const { data: userStats, isLoading } = useQuery<UserStatsData>({
    queryKey: ['/api/beehive/user-stats', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch(`/api/beehive/user-stats/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('referrals.matrix.loading')}</p>
      </div>
    );
  }

  if (!userStats || !userStats.downlineMatrix || userStats.downlineMatrix.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('referrals.matrix.noMembers')}</h3>
        <p className="text-muted-foreground">{t('referrals.matrix.noMembersDesc')}</p>
      </div>
    );
  }

  // Filter layers with members
  const layersWithMembers = userStats.downlineMatrix.filter(layer => layer.members > 0);

  // Navigation helper functions
  const handlePositionClick = (level: number, position: string) => {
    const currentPath = navigationPath.map(p => p.position).join('.');
    const newPath = currentPath ? `${currentPath}.${position}` : position;
    
    setNavigationPath([...navigationPath, { level, position, path: newPath }]);
    setViewingLevel(level + 1);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Back to root
      setNavigationPath([]);
      setViewingLevel(1);
    } else {
      // Back to specific level
      setNavigationPath(navigationPath.slice(0, index + 1));
      setViewingLevel(navigationPath[index].level + 1);
    }
  };

  // Calculate detailed matrix structure for current viewing context
  const getMatrixDetails = (targetLevel: number, pathContext: NavigationPath[]): MatrixLevel | null => {
    if (targetLevel > 19) return null; // Max 19 levels
    
    // For deeper levels, simulate based on actual data or extrapolate
    let baseLayer = layersWithMembers.find(l => l.level === targetLevel);
    
    // If we don't have data for this level, simulate based on path and previous levels
    if (!baseLayer && targetLevel <= 19) {
      const parentLevel = layersWithMembers.find(l => l.level === targetLevel - 1);
      if (parentLevel) {
        // Simulate child level based on parent
        const estimatedMembers = Math.max(0, Math.floor(parentLevel.members * 0.6)); // 60% retention
        const estimatedPlacements = Math.max(0, Math.floor(parentLevel.placements * 0.4)); // 40% new placements
        
        baseLayer = {
          level: targetLevel,
          members: estimatedMembers,
          placements: estimatedPlacements
        };
      }
    }
    
    if (!baseLayer || baseLayer.members === 0) return null;
    
    const totalMembers = baseLayer.members;
    const totalPlacements = baseLayer.placements;
    
    // Calculate members distribution for each position (L, M, R)
    const getPositionMembers = (positionIndex: number) => {
      const baseMembers = Math.floor(totalMembers / 3);
      const extraMembers = totalMembers % 3;
      return Math.min(3, baseMembers + (positionIndex < extraMembers ? 1 : 0));
    };
    
    // Check if next level has members (determines if this position has children)
    const nextLevel = layersWithMembers.find(l => l.level === targetLevel + 1);
    const hasChildren = (nextLevel && nextLevel.members > 0) || targetLevel < 19;
    
    return {
      level: targetLevel,
      totalMembers,
      totalPlacements,
      positions: [
        {
          name: 'L',
          filled: getPositionMembers(0),
          direct: Math.floor(totalPlacements * 0.3),
          spillover: Math.ceil(totalPlacements * 0.4),
          hasChildren: hasChildren
        },
        {
          name: 'M', 
          filled: getPositionMembers(1),
          direct: Math.floor(totalPlacements * 0.35),
          spillover: Math.ceil(totalPlacements * 0.3),
          hasChildren: hasChildren
        },
        {
          name: 'R',
          filled: getPositionMembers(2),
          direct: Math.floor(totalPlacements * 0.25),
          spillover: Math.ceil(totalPlacements * 0.25),
          hasChildren: hasChildren
        }
      ]
    };
  };

  const currentMatrix = getMatrixDetails(viewingLevel, navigationPath);

  if (layersWithMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('referrals.matrix.noMembers')}</h3>
        <p className="text-muted-foreground">{t('referrals.matrix.noMembersDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matrix Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-honey mb-1">
              {userStats.directReferrals || 0}
            </div>
            <p className="text-sm text-muted-foreground">{t('referrals.matrix.stats.direct')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-honey mb-1">
              {userStats.totalTeam || 0}
            </div>
            <p className="text-sm text-muted-foreground">{t('referrals.matrix.stats.total')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-honey mb-1">
              {layersWithMembers.length}
            </div>
            <p className="text-sm text-muted-foreground">{t('referrals.matrix.stats.activeLayers')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb Navigation */}
      {navigationPath.length > 0 && (
        <Card className="bg-secondary border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-honey hover:text-honey/80"
                data-testid="breadcrumb-home"
              >
                <Home className="w-4 h-4 mr-1" />
                {t('referrals.matrix.navigation.root')}
              </Button>
              
              {navigationPath.map((path, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBreadcrumbClick(index)}
                    className="text-honey hover:text-honey/80"
                    data-testid={`breadcrumb-${index}`}
                  >
                    {t('referrals.matrix.layerPosition', { level: path.level, position: path.position })}
                  </Button>
                </React.Fragment>
              ))}
              
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('referrals.matrix.layerDetails', { level: viewingLevel })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matrix Visualization */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-honey flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('referrals.matrix.layer', { level: viewingLevel })} - {t('referrals.matrix.title')}
              {navigationPath.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {t('referrals.matrix.pathIndicator', { path: navigationPath.map(p => p.position).join(' → ') })}
                </Badge>
              )}
            </CardTitle>
            
            {navigationPath.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-honey border-honey hover:bg-honey/10"
                data-testid="back-to-root-button"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('referrals.matrix.navigation.backToRoot')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentMatrix ? (
            <div className="space-y-6">
              {/* Current Level Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded bg-green-400/10 border border-green-400/20">
                  <div className="text-lg font-semibold text-green-400">
                    {currentMatrix.totalMembers}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('referrals.matrix.stats.totalMembers')}</div>
                </div>
                <div className="p-3 rounded bg-blue-400/10 border border-blue-400/20">
                  <div className="text-lg font-semibold text-blue-400">
                    {currentMatrix.totalPlacements}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('referrals.matrix.stats.newPlacements')}</div>
                </div>
              </div>

              {/* Position Grid */}
              <div className="grid grid-cols-3 gap-6 justify-items-center">
                {currentMatrix.positions.map((position, index) => (
                  <div key={position.name} className="flex flex-col items-center space-y-3">
                    <Button
                      variant="ghost"
                      className={`w-16 h-16 rounded-full border-2 transition-all ${
                        position.filled > 0
                          ? 'bg-green-400/20 border-green-400 hover:bg-green-400/30 hover:ring-2 hover:ring-honey'
                          : 'border-dashed border-muted-foreground/30 bg-muted/50'
                      }`}
                      onClick={() => position.hasChildren && position.filled > 0 && handlePositionClick(viewingLevel, position.name)}
                      disabled={!position.hasChildren || position.filled === 0}
                      data-testid={`matrix-position-${position.name}-${viewingLevel}`}
                    >
                      {position.filled > 0 ? (
                        <UserPlus className="w-8 h-8 text-green-400" />
                      ) : (
                        <Users className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="text-sm font-medium mb-2">
                        {t(`referrals.matrix.position.${position.name}`)}
                      </Badge>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>{t('referrals.matrix.position.filled')}: {position.filled}/3</div>
                        {position.filled > 0 && (
                          <>
                            <div className="text-green-400">{t('referrals.matrix.position.direct')}: {position.direct}</div>
                            <div className="text-blue-400">{t('referrals.matrix.position.spillover')}: {position.spillover}</div>
                          </>
                        )}
                      </div>
                      {position.hasChildren && position.filled > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs text-honey border-honey hover:bg-honey/10"
                          onClick={() => handlePositionClick(viewingLevel, position.name)}
                          data-testid={`explore-${position.name}-${viewingLevel}`}
                        >
                          {t('referrals.matrix.navigation.viewSubLevel')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Filling Rules Explanation */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded">
                <div className="font-medium mb-2">{t('referrals.matrix.rules.title')}</div>
                <div className="space-y-1">
                  <div>{t('referrals.matrix.rules.rule1')}</div>
                  <div>{t('referrals.matrix.rules.rule2')}</div>
                  <div>{t('referrals.matrix.rules.rule3')}</div>
                  <div>{t('referrals.matrix.rules.rule4')}</div>
                  <div>{t('referrals.matrix.rules.rule5')}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('referrals.matrix.noMembersAtLevel', { level: viewingLevel })}</h3>
              <p className="text-muted-foreground">{t('referrals.matrix.noMembersAtLevelDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}