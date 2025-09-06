import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Trophy, Eye, ArrowLeft, Activity, TrendingUp } from 'lucide-react';
import { useMatrixTreeV2, useDashboardV2 } from '@/hooks/useDashboardV2';
// Define local interfaces based on API responses
export interface MatrixMember {
  walletAddress: string;
  username?: string;
  currentLevel: number;
  isActivated: boolean;
  zone: 'L' | 'M' | 'R';
  layer: number;
  placedAt: string;
  personalTeamSize?: number;
}

interface IndividualMatrixViewV2Props {
  walletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

export default function IndividualMatrixViewV2({ walletAddress, rootUser }: IndividualMatrixViewV2Props) {
  const [currentViewLayer, setCurrentViewLayer] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [drillDownMember, setDrillDownMember] = useState<MatrixMember | null>(null);
  const [viewMode, setViewMode] = useState<'layer' | 'member'>('layer');
  
  const MEMBERS_PER_PAGE = 9;
  
  // Use v2 hooks
  const { data: matrixTree, isLoading: isLoadingTree } = useMatrixTreeV2(walletAddress, 19);
  const { data: dashboardData } = useDashboardV2(walletAddress);

  if (isLoadingTree) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Enhanced 3×3 Matrix Tree (L1-L19)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex justify-center space-x-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-16 h-16 bg-muted rounded-full"></div>
              ))}
            </div>
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform API data to component format
  const transformedLayers = matrixTree?.layerSummary?.map(layer => ({
    layerNumber: layer.layer,
    maxMembers: layer.maxCapacity,
    members: layer.members.map((member: any): MatrixMember => ({
      walletAddress: member.walletAddress,
      username: member.username,
      currentLevel: member.currentLevel || 1,
      isActivated: member.activated,
      zone: member.position,
      layer: layer.layer,
      placedAt: member.placedAt,
      personalTeamSize: 0
    })),
    leftLeg: layer.members.filter((m: any) => m.position === 'L').map((member: any): MatrixMember => ({
      walletAddress: member.walletAddress,
      username: member.username,
      currentLevel: member.currentLevel || 1,
      isActivated: member.activated,
      zone: 'L',
      layer: layer.layer,
      placedAt: member.placedAt,
      personalTeamSize: 0
    })),
    middleLeg: layer.members.filter((m: any) => m.position === 'M').map((member: any): MatrixMember => ({
      walletAddress: member.walletAddress,
      username: member.username,
      currentLevel: member.currentLevel || 1,
      isActivated: member.activated,
      zone: 'M',
      layer: layer.layer,
      placedAt: member.placedAt,
      personalTeamSize: 0
    })),
    rightLeg: layer.members.filter((m: any) => m.position === 'R').map((member: any): MatrixMember => ({
      walletAddress: member.walletAddress,
      username: member.username,
      currentLevel: member.currentLevel || 1,
      isActivated: member.activated,
      zone: 'R',
      layer: layer.layer,
      placedAt: member.placedAt,
      personalTeamSize: 0
    }))
  })) || [];

  if (!matrixTree || !transformedLayers || transformedLayers.length === 0) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Enhanced 3×3 Matrix Tree (L1-L19)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start building your matrix by referring members</p>
            <p className="text-sm mt-2">Each layer expands: L1=3, L2=9, L3=27 members</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentLayer = transformedLayers.find(l => l.layerNumber === currentViewLayer);
  
  const renderMatrixPosition = (member: MatrixMember | null, positionIndex: number, zone: string) => {
    const isEmpty = !member;
    
    return (
      <div 
        key={`${zone}-${positionIndex}`}
        className={`
          relative w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center
          ${isEmpty 
            ? 'border-dashed border-honey/30 bg-muted/50' 
            : 'border-honey/50 bg-honey/10 hover:bg-honey/20 cursor-pointer transition-colors'
          }
        `}
        onClick={() => member && handleMemberClick(member)}
        data-testid={`matrix-position-${zone}-${positionIndex}`}
      >
        {member ? (
          <>
            <div className="w-12 h-12 bg-gradient-to-br from-honey to-honey/80 rounded-full flex items-center justify-center mb-1 shadow-md">
              <span className="text-black font-bold text-sm">
                {member.username?.charAt(0).toUpperCase() || member.walletAddress?.charAt(2).toUpperCase()}
              </span>
            </div>
            
            <div className="absolute -bottom-2 -right-2">
              <Badge 
                variant="secondary" 
                className={`text-xs px-1.5 py-0.5 h-5 ${
                  member.isActivated && member.currentLevel > 0 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-500 text-white'
                }`}
              >
                L{member.currentLevel || 0}
              </Badge>
            </div>
            
            <div className="absolute -top-1 -left-1">
              <div className={`w-3 h-3 rounded-full ${member.isActivated ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
          </>
        ) : (
          <div className="w-10 h-10 border-2 border-dashed border-honey/30 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-honey/30 rounded-full" />
          </div>
        )}
      </div>
    );
  };

  const handleMemberClick = (member: MatrixMember) => {
    setDrillDownMember(member);
    setViewMode('member');
  };

  const handleBackToLayer = () => {
    setViewMode('layer');
    setDrillDownMember(null);
    setCurrentPage(1);
  };

  const getPaginatedMembers = (members: MatrixMember[], page: number) => {
    const startIndex = (page - 1) * MEMBERS_PER_PAGE;
    const endIndex = startIndex + MEMBERS_PER_PAGE;
    return members.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalMembers: number) => {
    return Math.ceil(totalMembers / MEMBERS_PER_PAGE);
  };

  const renderPaginatedMembers = (members: MatrixMember[], currentPage: number) => {
    const paginatedMembers = getPaginatedMembers(members, currentPage);
    const totalPages = getTotalPages(members.length);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-6 justify-items-center">
          {paginatedMembers.map((member, index) => renderMatrixPosition(member, index, `page-${currentPage}`))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-2 border-honey/30 text-honey hover:bg-honey hover:text-black"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • {members.length} members
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-2 border-honey/30 text-honey hover:bg-honey hover:text-black"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderMemberDetailView = () => {
    if (!drillDownMember) return null;

    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={handleBackToLayer}
          className="flex items-center gap-2 text-honey border-honey hover:bg-honey hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Layer {currentViewLayer}
        </Button>

        <Card className="bg-background border-honey/20">
          <CardHeader>
            <CardTitle className="text-honey flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-honey to-honey/80 rounded-full flex items-center justify-center">
                <span className="text-black font-bold">
                  {drillDownMember.username?.charAt(0).toUpperCase() || drillDownMember.walletAddress?.charAt(2).toUpperCase()}
                </span>
              </div>
              <div>
                <div>{drillDownMember.username || `User ${drillDownMember.walletAddress?.slice(0, 8)}`}</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {drillDownMember.walletAddress?.slice(0, 6)}...{drillDownMember.walletAddress?.slice(-4)}
                </div>
              </div>
              <Badge className={`${drillDownMember.isActivated ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                Level {drillDownMember.currentLevel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${drillDownMember.isActivated ? 'text-green-400' : 'text-red-400'}`}>
                    {drillDownMember.isActivated ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Zone:</span>
                  <Badge variant="outline" className="capitalize border-honey/30 text-honey">
                    {drillDownMember.zone}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">
                    {new Date(drillDownMember.placedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Layer:</span>
                  <Badge className="bg-honey text-black">
                    Layer {drillDownMember.layer}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Team Size:</span>
                  <span className="font-medium text-blue-400">
                    {drillDownMember.personalTeamSize || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (viewMode === 'member') {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Member Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMemberDetailView()}
        </CardContent>
      </Card>
    );
  }

  const getMaxMembersForLayer = (layer: number) => Math.pow(3, layer);

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Enhanced 3×3 Matrix Tree</span>
            {rootUser && (
              <Badge variant="outline" className="border-honey text-honey">
                {rootUser.username} • L{rootUser.currentLevel}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-honey/10 text-honey">
              Total: {matrixTree.totalMembers} members
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Activity className="w-3 h-3 mr-1" />
              Deepest: L{matrixTree.deepestLayer}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Enhanced Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="text-lg font-bold text-green-400">
              {dashboardData?.performance.spilloverRate.toFixed(1) || '0.0'}%
            </div>
            <div className="text-xs text-muted-foreground">Spillover Rate</div>
          </div>
          <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <div className="text-lg font-bold text-blue-400">
              {dashboardData?.matrix.activationRate.toFixed(1) || '0.0'}%
            </div>
            <div className="text-xs text-muted-foreground">Activation Rate</div>
          </div>
          <div className="text-center p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
            <div className="text-lg font-bold text-purple-400">
              {dashboardData?.performance.growthVelocity.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-muted-foreground">Growth/Day</div>
          </div>
          <div className="text-center p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
            <div className="text-lg font-bold text-orange-400">
              {matrixTree.summary.averageLayerFillRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Fill Rate</div>
          </div>
        </div>
        
        {/* Layer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.max(1, currentViewLayer - 1));
              setCurrentPage(1);
            }}
            disabled={currentViewLayer <= 1}
            className="w-full sm:w-auto border-honey/30 text-honey hover:bg-honey hover:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous Layer</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="text-center">
            <div className="font-bold text-honey text-xl">Layer {currentViewLayer}</div>
            <div className="text-sm text-muted-foreground">
              Max {getMaxMembersForLayer(currentViewLayer)} members 
              ({currentLayer?.members.length || 0} filled)
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.min(19, currentViewLayer + 1));
              setCurrentPage(1);
            }}
            disabled={currentViewLayer >= 19}
            className="w-full sm:w-auto border-honey/30 text-honey hover:bg-honey hover:text-black"
          >
            <span className="hidden sm:inline">Next Layer</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Enhanced Matrix Visualization */}
        {currentLayer && (
          <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-6 border border-honey/10">
            {currentLayer.members.length > 0 ? (
              renderPaginatedMembers(currentLayer.members, currentPage)
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-honey/30 mx-auto mb-6 flex items-center justify-center bg-honey/5">
                  <Users className="w-10 h-10 text-honey/30" />
                </div>
                <p className="text-muted-foreground mb-2 text-lg">
                  No members in Layer {currentViewLayer} yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Capacity: {getMaxMembersForLayer(currentViewLayer)} members • Max 9 per page
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Layer Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">
              {currentLayer?.leftLeg?.length || 0}
            </div>
            <div className="text-muted-foreground text-sm">Left Leg</div>
            <div className="text-xs text-green-400 mt-1">
              {currentLayer?.leftLeg?.length ? `${((currentLayer.leftLeg.length / Math.pow(3, currentViewLayer - 1)) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">
              {currentLayer?.middleLeg?.length || 0}
            </div>
            <div className="text-muted-foreground text-sm">Middle Leg</div>
            <div className="text-xs text-blue-400 mt-1">
              {currentLayer?.middleLeg?.length ? `${((currentLayer.middleLeg.length / Math.pow(3, currentViewLayer - 1)) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-400">
              {currentLayer?.rightLeg?.length || 0}
            </div>
            <div className="text-muted-foreground text-sm">Right Leg</div>
            <div className="text-xs text-purple-400 mt-1">
              {currentLayer?.rightLeg?.length ? `${((currentLayer.rightLeg.length / Math.pow(3, currentViewLayer - 1)) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Enhanced Layer Overview */}
        <div className="border-t border-border pt-6">
          <h4 className="font-medium text-honey mb-4 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Layer Overview (L1-L19)</span>
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
            {Array.from({ length: 19 }, (_, i) => {
              const layerNum = i + 1;
              const layerData = transformedLayers.find(l => l.layerNumber === layerNum);
              const memberCount = layerData?.members.length || 0;
              const maxMembers = getMaxMembersForLayer(layerNum);
              const fillPercentage = maxMembers > 0 ? (memberCount / maxMembers) * 100 : 0;
              
              return (
                <button
                  key={layerNum}
                  onClick={() => {
                    setCurrentViewLayer(layerNum);
                    setCurrentPage(1);
                  }}
                  className={`
                    relative p-2 rounded-lg text-xs transition-all duration-200 border
                    ${currentViewLayer === layerNum 
                      ? 'bg-honey text-black font-bold border-honey shadow-lg transform scale-105' 
                      : memberCount > 0 
                        ? 'bg-honey/10 text-honey hover:bg-honey/20 border-honey/30 hover:scale-102' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border-muted'
                    }
                  `}
                  data-testid={`layer-selector-${layerNum}`}
                >
                  <div className="font-semibold">L{layerNum}</div>
                  <div className="text-xs">{memberCount}/{maxMembers > 999 ? '999+' : maxMembers}</div>
                  {fillPercentage > 0 && (
                    <div 
                      className="absolute bottom-0 left-0 bg-honey/50 h-1 rounded-b-lg transition-all"
                      style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                    />
                  )}
                  {memberCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}