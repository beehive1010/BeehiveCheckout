import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, Award } from 'lucide-react';

interface RewardMember {
  walletAddress: string;
  username: string;
  currentLevel: number;
  memberActivated: boolean;
  placement: 'left' | 'middle' | 'right';
  placementType: 'direct_referral' | 'upline_placement' | 'self_placement';
  totalRewardsGenerated: number; // 该成员为您产生的总奖励
  lastRewardDate?: string;
  joinedAt: string;
}

interface RewardLayer {
  layerNumber: number;
  maxMembers: number;
  members: RewardMember[];
  layerRewardTotal: number; // 该层级总奖励
  leftLeg: RewardMember[];
  middleLeg: RewardMember[];
  rightLeg: RewardMember[];
}

interface RewardMatrixData {
  layers: RewardLayer[];
  totalMembers: number;
  totalLevels: number;
  totalRewardsGenerated: number; // 所有下级为您产生的总奖励
  monthlyRewards: number; // 本月奖励
}

export default function RewardMatrixComponent({ walletAddress }: { walletAddress: string }) {
  const [currentViewLayer, setCurrentViewLayer] = useState(1);
  
  // Fetch reward-focused matrix data
  const { data: rewardMatrixData, isLoading } = useQuery<RewardMatrixData>({
    queryKey: ['/api/dashboard/matrix', walletAddress, 'rewards'],
    enabled: !!walletAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/matrix', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch reward matrix data');
      const data = await response.json();
      
      // Transform for reward-focused view
      const transformedData: RewardMatrixData = {
        layers: data.downlineLayers?.map((layer: any) => ({
          layerNumber: layer.layer,
          maxMembers: layer.maxCapacity || Math.pow(3, layer.layer),
          members: (layer.members || []).map((member: any, index: number) => ({
            ...member,
            totalRewardsGenerated: (layer.layer * 50) * (index + 1), // Mock calculation
            lastRewardDate: new Date().toISOString(),
          })),
          layerRewardTotal: (layer.members?.length || 0) * layer.layer * 50,
          leftLeg: (layer.members || []).filter((m: any) => m.placement === 'left'),
          middleLeg: (layer.members || []).filter((m: any) => m.placement === 'middle'),
          rightLeg: (layer.members || []).filter((m: any) => m.placement === 'right'),
        })) || [],
        totalMembers: data.totalDownline || 0,
        totalLevels: data.downlineLayers?.length || 0,
        totalRewardsGenerated: (data.totalDownline || 0) * 150, // Mock calculation
        monthlyRewards: (data.totalDownline || 0) * 25, // Mock monthly
      };
      
      return transformedData;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>奖励矩阵视图</span>
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

  if (!rewardMatrixData || !rewardMatrixData.layers || rewardMatrixData.layers.length === 0) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>奖励矩阵视图</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>开始推荐会员来赚取奖励</p>
            <p className="text-sm mt-2">每个级别的升级都会为您产生USDT奖励</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentLayer = rewardMatrixData.layers.find(l => l.layerNumber === currentViewLayer);
  
  const renderRewardMemberPosition = (member: RewardMember | null, positionIndex: number, legType: string) => {
    const isEmpty = !member;
    
    return (
      <div 
        key={`${legType}-${positionIndex}`}
        className={`
          relative w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center
          ${isEmpty 
            ? 'border-dashed border-honey/30 bg-muted/50' 
            : 'border-honey/50 bg-gradient-to-br from-green-400/20 to-yellow-400/20 hover:from-green-400/30 hover:to-yellow-400/30 cursor-pointer transition-all'
          }
        `}
        data-testid={`reward-position-${legType}-${positionIndex}`}
      >
        {member ? (
          <>
            {/* Member Avatar with reward glow */}
            <div className="w-12 h-12 bg-gradient-to-br from-honey to-yellow-500 rounded-full flex items-center justify-center mb-1 shadow-lg">
              <span className="text-black font-bold text-xs">
                {member.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* Reward Amount Badge */}
            <div className="absolute -top-2 -right-2">
              <Badge 
                variant="secondary" 
                className="text-xs px-1 py-0 h-5 bg-green-500 text-white border border-green-400"
                title={`总奖励: $${member.totalRewardsGenerated}`}
              >
                ${member.totalRewardsGenerated}
              </Badge>
            </div>
            
            {/* Level Badge */}
            <div className="absolute -bottom-2 -left-2">
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
            <DollarSign className="h-4 w-4 text-honey/30" />
          </div>
        )}
      </div>
    );
  };

  const renderRewardLegSection = (legMembers: RewardMember[], legName: string, maxPositions: number) => {
    const positions = Array.from({ length: maxPositions }, (_, i) => legMembers[i] || null);
    const legRewardTotal = legMembers.reduce((sum, member) => sum + member.totalRewardsGenerated, 0);
    
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs font-medium text-honey flex items-center space-x-1">
          <span>{legName}</span>
          <Badge variant="outline" className="text-xs border-green-400 text-green-400">
            ${legRewardTotal}
          </Badge>
        </div>
        <div className="flex flex-col space-y-2">
          {positions.map((member, index) => renderRewardMemberPosition(member, index, legName.toLowerCase()))}
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
            <DollarSign className="h-5 w-5" />
            <span>奖励矩阵视图</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border border-green-400/20">
              总奖励: ${rewardMatrixData.totalRewardsGenerated}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Reward Summary */}
        <div className="bg-gradient-to-r from-green-500/10 to-yellow-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-400 font-bold text-lg">${rewardMatrixData.totalRewardsGenerated}</div>
              <div className="text-xs text-muted-foreground">累计奖励</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold text-lg">${rewardMatrixData.monthlyRewards}</div>
              <div className="text-xs text-muted-foreground">本月奖励</div>
            </div>
            <div>
              <div className="text-honey font-bold text-lg">{rewardMatrixData.totalMembers}</div>
              <div className="text-xs text-muted-foreground">产生奖励成员</div>
            </div>
          </div>
        </div>
        
        {/* Layer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentViewLayer(Math.max(1, currentViewLayer - 1))}
            disabled={currentViewLayer <= 1}
            className="border-honey/20 hover:bg-honey/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一层
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Layer {currentViewLayer}</span>
            {currentLayer && (
              <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                奖励: ${currentLayer.layerRewardTotal}
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentViewLayer(Math.min(rewardMatrixData.totalLevels, currentViewLayer + 1))}
            disabled={currentViewLayer >= rewardMatrixData.totalLevels}
            className="border-honey/20 hover:bg-honey/10"
          >
            下一层
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Matrix Visualization */}
        {currentLayer && (
          <div className="flex justify-center">
            <div className="flex space-x-8">
              {renderRewardLegSection(currentLayer.leftLeg, "Left", getMembersPerLeg(currentViewLayer))}
              {renderRewardLegSection(currentLayer.middleLeg, "Middle", getMembersPerLeg(currentViewLayer))}
              {renderRewardLegSection(currentLayer.rightLeg, "Right", getMembersPerLeg(currentViewLayer))}
            </div>
          </div>
        )}

        {/* Layer Stats */}
        {currentLayer && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-sm font-medium text-honey mb-2">Layer {currentViewLayer} 奖励统计</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-honey font-semibold">{currentLayer.members.length}</div>
                <div className="text-muted-foreground">成员数</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-semibold">${currentLayer.layerRewardTotal}</div>
                <div className="text-muted-foreground">层级奖励</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-semibold">{currentLayer.leftLeg.length + currentLayer.middleLeg.length + currentLayer.rightLeg.length}</div>
                <div className="text-muted-foreground">活跃成员</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold">{Math.round(currentLayer.layerRewardTotal / Math.max(currentLayer.members.length, 1))}</div>
                <div className="text-muted-foreground">平均奖励</div>
              </div>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}