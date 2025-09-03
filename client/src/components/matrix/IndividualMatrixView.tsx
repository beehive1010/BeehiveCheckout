import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Trophy, Eye, ArrowLeft } from 'lucide-react';

interface MatrixMember {
  walletAddress: string;
  username: string;
  currentLevel: number;
  memberActivated: boolean;
  placement: 'left' | 'middle' | 'right';
  joinedAt: string;
}

interface MatrixLayer {
  layerNumber: number;
  maxMembers: number; // 3^layerNumber
  members: MatrixMember[];
  leftLeg: MatrixMember[];
  middleLeg: MatrixMember[];
  rightLeg: MatrixMember[];
}

interface IndividualMatrixData {
  layers: MatrixLayer[];
  totalMembers: number;
  totalLevels: number;
}

export default function IndividualMatrixView({ walletAddress, rootUser }: { 
  walletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}) {
  const [currentViewLayer, setCurrentViewLayer] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [drillDownMember, setDrillDownMember] = useState<MatrixMember | null>(null);
  const [viewMode, setViewMode] = useState<'layer' | 'member'>('layer');
  
  const MEMBERS_PER_PAGE = 9; // Maximum 9 circles per page
  
  // Fetch individual user's L1-L19 matrix data
  const { data: matrixData, isLoading } = useQuery<IndividualMatrixData>({
    queryKey: ['/api/dashboard/matrix', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/matrix', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch matrix data');
      const data = await response.json();
      
      // Use memberMatrixView data if available, otherwise transform dashboard data
      const allLayers: MatrixLayer[] = [];
      
      if (data.memberMatrixData?.layerData) {
        // Use the efficient memberMatrixView data
        data.memberMatrixData.layerData.forEach((layer: any) => {
          const members: MatrixMember[] = [];
          const leftLeg: MatrixMember[] = [];
          const middleLeg: MatrixMember[] = [];
          const rightLeg: MatrixMember[] = [];
          
          // Extract members from positions data
          if (layer.positions?.L) {
            const member: MatrixMember = {
              walletAddress: layer.positions.L.wallet,
              username: layer.positions.L.wallet.slice(0, 8),
              currentLevel: 1, // TODO: Get from user data
              memberActivated: true,
              placement: 'left',
              joinedAt: layer.positions.L.placedAt
            };
            leftLeg.push(member);
            members.push(member);
          }
          
          if (layer.positions?.M) {
            const member: MatrixMember = {
              walletAddress: layer.positions.M.wallet,
              username: layer.positions.M.wallet.slice(0, 8),
              currentLevel: 1,
              memberActivated: true,
              placement: 'middle',
              joinedAt: layer.positions.M.placedAt
            };
            middleLeg.push(member);
            members.push(member);
          }
          
          if (layer.positions?.R) {
            const member: MatrixMember = {
              walletAddress: layer.positions.R.wallet,
              username: layer.positions.R.wallet.slice(0, 8),
              currentLevel: 1,
              memberActivated: true,
              placement: 'right',
              joinedAt: layer.positions.R.placedAt
            };
            rightLeg.push(member);
            members.push(member);
          }
          
          allLayers.push({
            layerNumber: layer.layer,
            maxMembers: layer.maxPositions,
            members,
            leftLeg,
            middleLeg,
            rightLeg,
          });
        });
        
        // Fill in remaining layers up to 19
        for (let layerNum = allLayers.length + 1; layerNum <= 19; layerNum++) {
          allLayers.push({
            layerNumber: layerNum,
            maxMembers: Math.pow(3, layerNum),
            members: [],
            leftLeg: [],
            middleLeg: [],
            rightLeg: [],
          });
        }
      } else {
        // Fallback to dashboard matrix data
        for (let layerNum = 1; layerNum <= 19; layerNum++) {
          const apiLayerData = data.downlineMatrix?.find((layer: any) => layer.level === layerNum);
          
          allLayers.push({
            layerNumber: layerNum,
            maxMembers: Math.pow(3, layerNum),
            members: apiLayerData?.members || [],
            leftLeg: apiLayerData?.members?.filter((m: any) => m.placement === 'left') || [],
            middleLeg: apiLayerData?.members?.filter((m: any) => m.placement === 'middle') || [],
            rightLeg: apiLayerData?.members?.filter((m: any) => m.placement === 'right') || [],
          });
        }
      }
      
      const transformedData: IndividualMatrixData = {
        layers: allLayers,
        totalMembers: data.memberMatrixData?.totalMembers || data.downlineMatrix?.reduce((sum: number, layer: any) => sum + (layer.members || 0), 0) || 0,
        totalLevels: 19, // Always show all 19 levels
      };
      
      return transformedData;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Your 3×3 Matrix Tree (L1-L19)</span>
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

  if (!matrixData || !matrixData.layers || matrixData.layers.length === 0) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Your 3×3 Matrix Tree (L1-L19)</span>
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

  const currentLayer = matrixData.layers.find(l => l.layerNumber === currentViewLayer);
  
  const renderMatrixPosition = (member: MatrixMember | null, positionIndex: number, legType: string) => {
    const isEmpty = !member;
    
    return (
      <div 
        key={`${legType}-${positionIndex}`}
        className={`
          relative w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center
          ${isEmpty 
            ? 'border-dashed border-honey/30 bg-muted/50' 
            : 'border-honey/50 bg-honey/10 hover:bg-honey/20 cursor-pointer transition-colors'
          }
        `}
        onClick={() => member && handleMemberClick(member)}
        data-testid={`matrix-position-${legType}-${positionIndex}`}
      >
        {member ? (
          <>
            {/* Member Avatar */}
            <div className="w-10 h-10 bg-honey rounded-full flex items-center justify-center mb-1">
              <span className="text-black font-bold text-xs">
                {member.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1">
              <Badge 
                variant="secondary" 
                className={`text-xs px-1 py-0 h-4 ${
                  member.memberActivated && member.currentLevel > 0 
                    ? 'bg-honey text-black' 
                    : 'bg-gray-500'
                }`}
              >
                L{member.currentLevel || 0}
              </Badge>
            </div>
            
            {/* Click indicator */}
            <div className="absolute -top-1 -left-1">
              <Eye className="w-3 h-3 text-honey/60" />
            </div>
          </>
        ) : (
          <div className="w-8 h-8 border-2 border-dashed border-honey/30 rounded-full"></div>
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

  const renderLegSection = (legMembers: MatrixMember[], legName: string, maxPositions: number) => {
    const positions = Array.from({ length: maxPositions }, (_, i) => legMembers[i] || null);
    
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs font-medium text-honey">{legName}</div>
        <div className="flex flex-col space-y-2">
          {positions.map((member, index) => renderMatrixPosition(member, index, legName.toLowerCase()))}
        </div>
      </div>
    );
  };

  const getMaxMembersForLayer = (layer: number) => Math.pow(3, layer);
  const getMembersPerLeg = (layer: number) => Math.pow(3, layer - 1);

  // Paginated members display
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
        {/* Members Grid (max 9 per page) */}
        <div className="grid grid-cols-3 gap-4 justify-items-center">
          {paginatedMembers.map((member, index) => renderMatrixPosition(member, index, 'paginated'))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-2"
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
              className="flex items-center gap-2"
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
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={handleBackToLayer}
          className="flex items-center gap-2 text-honey border-honey hover:bg-honey hover:text-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Layer {currentViewLayer}
        </Button>

        {/* Member Detail Card */}
        <Card className="bg-background border-honey/20">
          <CardHeader>
            <CardTitle className="text-honey flex items-center gap-3">
              <div className="w-12 h-12 bg-honey rounded-full flex items-center justify-center">
                <span className="text-black font-bold">
                  {drillDownMember.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <div>{drillDownMember.username}</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {drillDownMember.walletAddress}
                </div>
              </div>
              <Badge className="bg-honey text-black">
                Level {drillDownMember.currentLevel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`ml-2 ${drillDownMember.memberActivated ? 'text-green-400' : 'text-red-400'}`}>
                    {drillDownMember.memberActivated ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Placement:</span>
                  <span className="ml-2 capitalize">{drillDownMember.placement}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="ml-2">
                    {new Date(drillDownMember.joinedAt).toLocaleDateString()}
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

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Your 3×3 Matrix Tree</span>
            {rootUser && (
              <Badge variant="outline" className="border-honey text-honey">
                {rootUser.username} • L{rootUser.currentLevel}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-honey/10 text-honey">
              Total: {matrixData.totalMembers} members
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Layer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.max(1, currentViewLayer - 1));
              setCurrentPage(1); // Reset page when changing layers
            }}
            disabled={currentViewLayer <= 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous Layer</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="text-center">
            <div className="font-bold text-honey text-lg">Layer {currentViewLayer}</div>
            <div className="text-xs text-muted-foreground">
              Max {getMaxMembersForLayer(currentViewLayer)} members 
              ({currentLayer?.members.length || 0} filled)
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.min(19, currentViewLayer + 1));
              setCurrentPage(1); // Reset page when changing layers
            }}
            disabled={currentViewLayer >= 19}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Next Layer</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Matrix Visualization for Current Layer - Paginated Display */}
        {currentLayer && (
          <div className="bg-background rounded-lg p-3 sm:p-6">
            {currentLayer.members.length > 0 ? (
              renderPaginatedMembers(currentLayer.members, currentPage)
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-honey/30 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-honey/30" />
                </div>
                <p className="text-muted-foreground mb-2">
                  No members in Layer {currentViewLayer} yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Capacity: {getMaxMembersForLayer(currentViewLayer)} members • Max 9 per page
                </p>
              </div>
            )}
          </div>
        )}

        {/* Layer Summary Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center text-sm">
          <div className="bg-background rounded-lg p-2 sm:p-3">
            <div className="text-lg sm:text-xl font-bold text-green-400">
              {currentLayer?.leftLeg.length || 0}
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm">Left Leg</div>
          </div>
          <div className="bg-background rounded-lg p-2 sm:p-3">
            <div className="text-lg sm:text-xl font-bold text-blue-400">
              {currentLayer?.middleLeg.length || 0}
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm">Middle Leg</div>
          </div>
          <div className="bg-background rounded-lg p-2 sm:p-3">
            <div className="text-lg sm:text-xl font-bold text-purple-400">
              {currentLayer?.rightLeg.length || 0}
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm">Right Leg</div>
          </div>
        </div>

        {/* Quick Layer Overview */}
        <div className="border-t border-border pt-4">
          <h4 className="font-medium text-honey mb-3 flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Layer Overview (L1-L19)</span>
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-1 sm:gap-2">
            {Array.from({ length: 19 }, (_, i) => {
              const layerNum = i + 1;
              const layerData = matrixData.layers.find(l => l.layerNumber === layerNum);
              const memberCount = layerData?.members.length || 0;
              const maxMembers = getMaxMembersForLayer(layerNum);
              const fillPercentage = maxMembers > 0 ? (memberCount / maxMembers) * 100 : 0;
              
              return (
                <button
                  key={layerNum}
                  onClick={() => {
                    setCurrentViewLayer(layerNum);
                    setCurrentPage(1); // Reset page when clicking layer
                  }}
                  className={`
                    relative p-1 sm:p-2 rounded-md text-xs transition-colors
                    ${currentViewLayer === layerNum 
                      ? 'bg-honey text-black font-bold' 
                      : memberCount > 0 
                        ? 'bg-honey/20 text-honey hover:bg-honey/30' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                  data-testid={`layer-selector-${layerNum}`}
                >
                  <div className="text-xs sm:text-sm">L{layerNum}</div>
                  <div className="text-xs hidden sm:block">{memberCount}/{maxMembers}</div>
                  {fillPercentage > 0 && (
                    <div 
                      className="absolute bottom-0 left-0 bg-honey/40 h-1 rounded-b-md"
                      style={{ width: `${fillPercentage}%` }}
                    />
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