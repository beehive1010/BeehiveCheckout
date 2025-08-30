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
  teamSize: number;
  directReferrals: number;
}

interface ReferralLayer {
  layerNumber: number;
  maxMembers: number;
  members: ReferralMember[];
  directReferralCount: number;
  spilloverCount: number;
  leftLeg: ReferralMember[];
  middleLeg: ReferralMember[];
  rightLeg: ReferralMember[];
}

interface ReferralsMatrixData {
  layers: ReferralLayer[];
  totalMembers: number;
  totalLevels: number;
  directReferralCount: number;
  totalTeamSize: number;
  deepestLevel: number;
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

export default function ReferralsMatrixComponent({ walletAddress }: { walletAddress: string }) {
  const [currentViewLayer, setCurrentViewLayer] = useState(1);
  
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
        <p className="text-muted-foreground">加载矩阵数据中...</p>
      </div>
    );
  }

  if (!userStats || !userStats.downlineMatrix || userStats.downlineMatrix.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无矩阵成员</h3>
        <p className="text-muted-foreground">开始推荐新成员来建立您的矩阵网络</p>
      </div>
    );
  }

  // Filter layers with members
  const layersWithMembers = userStats.downlineMatrix.filter(layer => layer.members > 0);

  if (layersWithMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无矩阵成员</h3>
        <p className="text-muted-foreground">开始推荐新成员来建立您的矩阵网络</p>
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
            <p className="text-sm text-muted-foreground">直推成员</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-honey mb-1">
              {userStats.totalTeam || 0}
            </div>
            <p className="text-sm text-muted-foreground">团队总数</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-honey mb-1">
              {layersWithMembers.length}
            </div>
            <p className="text-sm text-muted-foreground">活跃层级</p>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Visualization */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center gap-2">
            <Users className="w-5 h-5" />
            3×3 强制矩阵结构
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Root Position */}
            <div className="text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-honey border-4 border-honey flex items-center justify-center">
                  <Crown className="w-8 h-8 text-black" />
                </div>
                <span className="text-sm font-medium mt-2">您 (根节点)</span>
              </div>
            </div>

            {/* Matrix Layers */}
            {layersWithMembers.map((layer, index) => (
              <div key={layer.level} className="border-t border-border pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-honey">
                    第 {layer.level} 层
                  </h4>
                  <Badge variant="secondary">
                    {layer.members} / {Math.pow(3, layer.level)} 位置
                  </Badge>
                </div>

                {/* Layer positions visualization */}
                <div className="grid grid-cols-3 gap-4 justify-items-center">
                  {Array.from({ length: Math.min(layer.members, 3) }, (_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        成员 {i + 1}
                      </span>
                      <Badge variant="outline" className="text-xs mt-1">
                        {i === 0 ? 'L位' : i === 1 ? 'M位' : 'R位'}
                      </Badge>
                    </div>
                  ))}
                  
                  {/* Empty positions */}
                  {Array.from({ length: Math.pow(3, layer.level) - layer.members }, (_, i) => (
                    <div key={`empty-${i}`} className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">空位</span>
                    </div>
                  ))}
                </div>

                {layer.members > 0 && (
                  <div className="mt-3 text-center">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      ✓ {layer.placements} 个新安置
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}