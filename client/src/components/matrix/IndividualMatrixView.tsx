import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Trophy, Eye } from 'lucide-react';

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
      
      // Transform dashboard matrix data to IndividualMatrixData format
      const transformedData: IndividualMatrixData = {
        layers: data.downlineLayers?.map((layer: any) => ({
          layerNumber: layer.layer,
          maxMembers: layer.maxCapacity || Math.pow(3, layer.layer),
          members: layer.members || [],
          leftLeg: layer.members?.filter((m: any) => m.placement === 'left') || [],
          middleLeg: layer.members?.filter((m: any) => m.placement === 'middle') || [],
          rightLeg: layer.members?.filter((m: any) => m.placement === 'right') || [],
        })) || [],
        totalMembers: data.totalDownline || 0,
        totalLevels: data.downlineLayers?.length || 0,
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
          </>
        ) : (
          <div className="w-8 h-8 border-2 border-dashed border-honey/30 rounded-full"></div>
        )}
      </div>
    );
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
            onClick={() => setCurrentViewLayer(Math.max(1, currentViewLayer - 1))}
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
            onClick={() => setCurrentViewLayer(Math.min(19, currentViewLayer + 1))}
            disabled={currentViewLayer >= 19}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Next Layer</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Matrix Visualization for Current Layer */}
        {currentLayer && (
          <div className="bg-background rounded-lg p-3 sm:p-6">
            
            {/* Layer 1: Simple 3-position layout */}
            {currentViewLayer === 1 && (
              <div className="flex justify-center space-x-2 sm:space-x-4 md:space-x-8">
                {renderLegSection(currentLayer.leftLeg.slice(0, 1), 'Left', 1)}
                {renderLegSection(currentLayer.middleLeg.slice(0, 1), 'Middle', 1)}
                {renderLegSection(currentLayer.rightLeg.slice(0, 1), 'Right', 1)}
              </div>
            )}
            
            {/* Layer 2+: 3×3 grid per leg */}
            {currentViewLayer > 1 && (
              <div className="flex justify-center space-x-2 sm:space-x-6 md:space-x-12">
                {renderLegSection(currentLayer.leftLeg, 'Left', getMembersPerLeg(currentViewLayer))}
                {renderLegSection(currentLayer.middleLeg, 'Middle', getMembersPerLeg(currentViewLayer))}
                {renderLegSection(currentLayer.rightLeg, 'Right', getMembersPerLeg(currentViewLayer))}
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
                  onClick={() => setCurrentViewLayer(layerNum)}
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