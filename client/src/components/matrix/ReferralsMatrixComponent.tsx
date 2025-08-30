import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Share2, UserPlus, Crown } from 'lucide-react';

interface ReferralMember {
  walletAddress: string;
  username: string;
  currentLevel: number;
  memberActivated: boolean;
  placement: 'left' | 'middle' | 'right';
  placementType: 'direct_referral' | 'upline_placement' | 'self_placement';
  sponsorWallet?: string;
  placerWallet?: string;
  joinedAt: string;
  teamSize: number; // 该成员的下级团队大小
  directReferrals: number; // 直推数量
}

interface ReferralLayer {
  layerNumber: number;
  maxMembers: number;
  members: ReferralMember[];
  directReferralCount: number; // 该层级直推数量
  spilloverCount: number; // 该层级安置数量
  leftLeg: ReferralMember[];
  middleLeg: ReferralMember[];
  rightLeg: ReferralMember[];
}

interface ReferralsMatrixData {
  layers: ReferralLayer[];
  totalMembers: number;
  totalLevels: number;
  directReferralCount: number; // 总直推数量
  totalTeamSize: number; // 总团队大小
  deepestLevel: number; // 最深层级
}

export default function ReferralsMatrixComponent({ walletAddress }: { walletAddress: string }) {
  const [currentViewLayer, setCurrentViewLayer] = useState(1);
  const [layer3Page, setLayer3Page] = useState(0); // For paginating layer 3+
  
  // Fetch referrals-focused matrix data
  const { data: referralsMatrixData, isLoading } = useQuery<ReferralsMatrixData>({
    queryKey: ['/api/dashboard/matrix', walletAddress, 'referrals'],
    enabled: !!walletAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/matrix', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch referrals matrix data');
      const data = await response.json();
      
      
      // Transform for referrals-focused view
      const transformedData: ReferralsMatrixData = {
        layers: data.downlineLayers?.map((layer: any, layerIndex: number) => {
          // Convert string array to member objects if needed
          const members = (layer.members || []).map((member: any, index: number) => {
            // If member is a string (wallet address), create a member object
            if (typeof member === 'string') {
              // Calculate placement based on matrix position
              // Layer 1: positions 0,1,2 map directly to left,middle,right
              // Layer 2: positions 0-2 under left, 3-5 under middle, 6-8 under right
              // Layer 3: positions 0-8 under left, 9-17 under middle, 18-26 under right
              let placement: 'left' | 'middle' | 'right';
              
              if (layerIndex === 0) {
                // Layer 1: direct mapping
                placement = index === 0 ? 'left' : index === 1 ? 'middle' : 'right';
              } else {
                // Layer 2+: calculate based on parent position
                const layerSize = Math.pow(3, layerIndex);
                const sectionSize = layerSize / 3;
                
                if (index < sectionSize) {
                  placement = 'left';
                } else if (index < sectionSize * 2) {
                  placement = 'middle';
                } else {
                  placement = 'right';
                }
              }
              
              // Placement type logic for 3x3 forced matrix:
              // - direct_referral: I sponsored them (any layer)
              // - self_placement: I placed them but didn't sponsor (spillover from my other directs)
              // - upline_placement: Placed by upline spillover
              // Since we don't have sponsor/placer data for string members, estimate based on layer
              const placementType: 'direct_referral' | 'upline_placement' | 'self_placement' = 
                layerIndex === 0 ? 'direct_referral' : // First 3 in layer 1 are usually direct
                layerIndex === 1 && index < 3 ? 'self_placement' : // Some in layer 2 could be our spillover
                'upline_placement'; // Rest are upline spillover
              
              // Calculate actual team size for this member in 3x3 matrix
              // Each position (L, M, R) can have up to 3 children in next layer
              let calculatedTeamSize = 0;
              
              // For layer 1, each position manages specific positions in layer 2:
              // Left (index 0) -> manages positions 0,1,2 in layer 2
              // Middle (index 1) -> manages positions 3,4,5 in layer 2  
              // Right (index 2) -> manages positions 6,7,8 in layer 2
              for (let futureLayerIndex = layerIndex + 1; futureLayerIndex < data.downlineLayers.length; futureLayerIndex++) {
                const futureLayer = data.downlineLayers[futureLayerIndex];
                if (!futureLayer.members || futureLayer.members.length === 0) break;
                
                // Calculate which positions this member manages in the future layer
                const layerDiff = futureLayerIndex - layerIndex;
                const branchingFactor = Math.pow(3, layerDiff - 1);
                const startPos = index * 3 * branchingFactor;
                const endPos = startPos + 3 * branchingFactor;
                
                // Count members in this member's subtree
                let membersInSubtree = 0;
                for (let i = startPos; i < endPos && i < futureLayer.members.length; i++) {
                  membersInSubtree++;
                }
                calculatedTeamSize += membersInSubtree;
              }
              
              return {
                walletAddress: member,
                username: `User${member.slice(-4)}`,
                currentLevel: 1,
                memberActivated: true,
                placement,
                placementType,
                sponsorWallet: layerIndex === 0 ? walletAddress : '',
                placerWallet: walletAddress,
                joinedAt: new Date().toISOString(),
                teamSize: calculatedTeamSize,
                directReferrals: 0, // Will be calculated based on actual sponsorship
              };
            }
            // If member is already an object, calculate team size
            let calculatedTeamSize = 0;
            for (let futureLayerIndex = layerIndex + 1; futureLayerIndex < data.downlineLayers.length; futureLayerIndex++) {
              const futureLayer = data.downlineLayers[futureLayerIndex];
              const layerDiff = futureLayerIndex - layerIndex;
              const possibleDescendants = Math.pow(3, layerDiff);
              calculatedTeamSize += Math.min(futureLayer.members?.length || 0, possibleDescendants);
            }
            
            return {
              ...member,
              teamSize: member.teamSize || calculatedTeamSize,
              directReferrals: member.directReferrals || 0,
            };
          });

          return {
            layerNumber: layer.layer,
            maxMembers: layer.maxCapacity || Math.pow(3, layer.layer),
            members,
            directReferralCount: members.filter((m: any) => m.placementType === 'direct_referral').length,
            spilloverCount: members.filter((m: any) => m.placementType !== 'direct_referral').length,
            leftLeg: members.filter((m: any) => m.placement === 'left'),
            middleLeg: members.filter((m: any) => m.placement === 'middle'),
            rightLeg: members.filter((m: any) => m.placement === 'right'),
          };
        }) || [],
        totalMembers: data.totalDownline || 0,
        totalLevels: data.downlineLayers?.length || 0,
        directReferralCount: data.directChildren || 0,
        totalTeamSize: data.totalDownline || 0,
        deepestLevel: data.downlineLayers?.length || 0,
      };
      
      return transformedData;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>推荐矩阵视图</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralsMatrixData || !referralsMatrixData.layers || referralsMatrixData.layers.length === 0) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>推荐矩阵视图</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>开始建设您的推荐团队</p>
            <p className="text-sm mt-2">分享推荐链接邀请新成员加入</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentLayer = referralsMatrixData.layers.find(l => l.layerNumber === currentViewLayer);
  
  const renderReferralMemberPosition = (member: ReferralMember | null, positionIndex: number, legType: string) => {
    const isEmpty = !member;
    
    return (
      <div 
        key={`${legType}-${positionIndex}`}
        className="flex flex-col items-center"
        data-testid={`referral-position-${legType}-${positionIndex}`}
      >
        <div
          className={`
            relative w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center
            ${isEmpty 
              ? 'border-dashed border-honey/30 bg-muted/50' 
              : 'border-honey/50 bg-honey/10 hover:bg-honey/20 cursor-pointer transition-colors'
            }
          `}
          title={member ? `${member.username} (${member.walletAddress.slice(0, 6)}...${member.walletAddress.slice(-4)})` : 'Empty position'}
        >
        {member ? (
          <>
            {/* Member Avatar with placement type styling */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
              member.placementType === 'direct_referral' 
                ? 'bg-honey border-2 border-green-400' // 自己推荐的 - 金色+绿边框
                : member.placementType === 'self_placement'
                ? 'bg-honey border-2 border-blue-400' // 自己安置的 - 金色+蓝边框
                : 'bg-honey border-2 border-purple-400' // 上线安置的 - 金色+紫边框
            }`}>
              <span className="text-black font-bold text-xs">
                {member.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* Placement Type Indicator */}
            <div className="absolute -top-1 -left-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                member.placementType === 'direct_referral' 
                  ? 'bg-green-400' // 绿色 - 自己推荐
                  : member.placementType === 'self_placement'
                  ? 'bg-blue-400' // 蓝色 - 自己安置
                  : 'bg-purple-400' // 紫色 - 上线安置
              }`} title={`${
                member.placementType === 'direct_referral' 
                  ? '自己推荐的'
                  : member.placementType === 'self_placement'
                  ? '自己安置的'
                  : '上线安置的'
              }`}>
                {member.placementType === 'direct_referral' && <UserPlus className="h-2 w-2 text-white" />}
                {member.placementType === 'self_placement' && <Crown className="h-2 w-2 text-white" />}
                {member.placementType === 'upline_placement' && <Share2 className="h-2 w-2 text-white" />}
              </div>
            </div>
            
            {/* Team Size Badge */}
            <div className="absolute -top-1 -right-1">
              <Badge 
                variant="secondary" 
                className="text-xs px-1 py-0 h-4 bg-blue-500 text-white border border-blue-400"
                title={`团队大小: ${member.teamSize}`}
              >
                {member.teamSize}
              </Badge>
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
          <div className="w-10 h-10 border-2 border-dashed border-honey/30 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-honey/30" />
          </div>
        )}
        </div>
        {/* Username display below avatar */}
        {member && (
          <div className="mt-1 text-center">
            <p className="text-xs font-medium text-foreground truncate max-w-[80px]">
              {member.username}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {member.walletAddress.slice(0, 4)}...{member.walletAddress.slice(-3)}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReferralLegSection = (legMembers: ReferralMember[], legName: string, maxPositions: number) => {
    const positions = Array.from({ length: maxPositions }, (_, i) => legMembers[i] || null);
    const legDirectCount = legMembers.filter(m => m.placementType === 'direct_referral').length;
    const legTeamSize = legMembers.reduce((sum, member) => sum + member.teamSize, 0);
    
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs font-medium text-honey">
          <span>{legName}</span>
        </div>
        <div className="flex flex-col space-y-2">
          {positions.map((member, index) => renderReferralMemberPosition(member, index, legName.toLowerCase()))}
        </div>
      </div>
    );
  };

  const getMembersPerLeg = (layer: number) => Math.pow(3, layer - 1);

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>推荐矩阵视图</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-honey/10 text-honey">
              团队: {referralsMatrixData.totalTeamSize} 人
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Placement Type Legend */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-sm font-medium text-honey mb-2">安置类型说明</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full flex items-center justify-center">
                <UserPlus className="h-2 w-2 text-white" />
              </div>
              <span className="text-muted-foreground">自己推荐的</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center">
                <Crown className="h-2 w-2 text-white" />
              </div>
              <span className="text-muted-foreground">自己安置的</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full flex items-center justify-center">
                <Share2 className="h-2 w-2 text-white" />
              </div>
              <span className="text-muted-foreground">上线安置的</span>
            </div>
          </div>
        </div>

        {/* Team Summary */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-400 font-bold text-lg">{referralsMatrixData.directReferralCount}</div>
              <div className="text-xs text-muted-foreground">直推人数</div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-lg">{referralsMatrixData.totalTeamSize}</div>
              <div className="text-xs text-muted-foreground">总团队大小</div>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-lg">{referralsMatrixData.deepestLevel}</div>
              <div className="text-xs text-muted-foreground">最深层级</div>
            </div>
          </div>
        </div>
        
        {/* Layer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.max(1, currentViewLayer - 1));
              setLayer3Page(0); // Reset page when changing layers
            }}
            disabled={currentViewLayer <= 1}
            className="border-honey/20 hover:bg-honey/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一层
          </Button>
          
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground">Layer {currentViewLayer}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentViewLayer(Math.min(referralsMatrixData.totalLevels, currentViewLayer + 1));
              setLayer3Page(0); // Reset page when changing layers
            }}
            disabled={currentViewLayer >= referralsMatrixData.totalLevels}
            className="border-honey/20 hover:bg-honey/10"
          >
            下一层
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Matrix Visualization */}
        {currentLayer && (
          <>
            {/* Pagination for Layer 3+ */}
            {currentViewLayer >= 3 && (
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLayer3Page(Math.max(0, layer3Page - 1))}
                  disabled={layer3Page === 0}
                  className="border-honey/20 hover:bg-honey/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  前一组
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {layer3Page + 1} 组 / 共 {Math.ceil(currentLayer.members.length / 9)} 组
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLayer3Page(Math.min(Math.ceil(currentLayer.members.length / 9) - 1, layer3Page + 1))}
                  disabled={layer3Page >= Math.ceil(currentLayer.members.length / 9) - 1}
                  className="border-honey/20 hover:bg-honey/10"
                >
                  下一组
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Matrix Display */}
            <div className="flex justify-center">
              {currentViewLayer < 3 ? (
                // Layer 1 and 2: Show normally
                <div className="flex space-x-8">
                  {renderReferralLegSection(currentLayer.leftLeg, "Left", getMembersPerLeg(currentViewLayer))}
                  {renderReferralLegSection(currentLayer.middleLeg, "Middle", getMembersPerLeg(currentViewLayer))}
                  {renderReferralLegSection(currentLayer.rightLeg, "Right", getMembersPerLeg(currentViewLayer))}
                </div>
              ) : (
                // Layer 3+: Show 9 members at a time (paginated)
                <div className="flex space-x-8">
                  {(() => {
                    const startIndex = layer3Page * 9;
                    const endIndex = Math.min(startIndex + 9, currentLayer.members.length);
                    const pageMembers = currentLayer.members.slice(startIndex, endIndex);
                    
                    // Divide into 3 groups (left, middle, right)
                    const leftMembers = pageMembers.slice(0, 3);
                    const middleMembers = pageMembers.slice(3, 6);
                    const rightMembers = pageMembers.slice(6, 9);
                    
                    return (
                      <>
                        {renderReferralLegSection(leftMembers, "Left", 3)}
                        {renderReferralLegSection(middleMembers, "Middle", 3)}
                        {renderReferralLegSection(rightMembers, "Right", 3)}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* Layer Stats */}
        {currentLayer && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-sm font-medium text-honey mb-2">Layer {currentViewLayer} 推荐统计</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-honey font-semibold">{currentLayer.members.length}</div>
                <div className="text-muted-foreground">成员数</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-semibold">{currentLayer.directReferralCount}</div>
                <div className="text-muted-foreground">直推数</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-semibold">{currentLayer.spilloverCount}</div>
                <div className="text-muted-foreground">安置数</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold">
                  {currentLayer.members.reduce((sum, m) => sum + m.teamSize, 0)}
                </div>
                <div className="text-muted-foreground">下级团队</div>
              </div>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}