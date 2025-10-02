import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, Target, Network, ArrowDown, ArrowRight } from 'lucide-react';
// import { matrixService } from '@/lib/supabaseClient'; // Removed - now using direct API calls
import { useI18n } from '../../contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  layer: number;
  position: 'L' | 'M' | 'R';
  isActive: boolean;
  joinDate?: string;
}

interface RecursiveMatrixData {
  [matrixRoot: string]: {
    ownerUsername: string;
    members: MatrixMember[];
    totalCount: number;
    deepestLayer: number;
  };
}

interface RecursiveMatrixViewerProps {
  walletAddress: string;
  maxDepth?: number;
}

const RecursiveMatrixViewer: React.FC<RecursiveMatrixViewerProps> = ({ 
  walletAddress, 
  maxDepth = 5 
}) => {
  const { t } = useI18n();
  const [recursiveData, setRecursiveData] = useState<RecursiveMatrixData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatrix, setSelectedMatrix] = useState<string>(walletAddress);

  useEffect(() => {
    if (walletAddress) {
      loadRecursiveMatrixData();
    }
  }, [walletAddress]);

  const loadRecursiveMatrixData = async () => {
    setLoading(true);
    setError(null);

    try {
      const recursiveMatrices: RecursiveMatrixData = {};
      
      // 首先获取用户自己的matrix
      await loadSingleMatrix(walletAddress, recursiveMatrices);
      
      // 使用 matrix-view function 获取用户下级的matrix数据
      const response = await fetch('https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          action: 'get-matrix-members'
        })
      });

      if (response.ok) {
        const userMatrix = await response.json();
        if (userMatrix.success && userMatrix.data?.matrix_data?.by_layer) {
          const layer1Members = userMatrix.data.matrix_data.by_layer[1] || [];
          
          // 为每个第一层的下级加载他们的matrix
          for (const referral of layer1Members.slice(0, maxDepth)) {
            await loadSingleMatrix(referral.wallet_address, recursiveMatrices);
          }
        }
      }

      setRecursiveData(recursiveMatrices);
      setSelectedMatrix(walletAddress);
    } catch (error: any) {
      console.error('Error loading recursive matrix data:', error);
      setError(error.message || t('matrix.errors.loadRecursiveMatrixFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadSingleMatrix = async (matrixRoot: string, dataContainer: RecursiveMatrixData) => {
    try {
      // 使用 matrix-view function 获取matrix数据
      const response = await fetch('https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': matrixRoot
        },
        body: JSON.stringify({
          action: 'get-matrix-members'
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data?.matrix_data?.by_layer) {
          const matrixMembers: MatrixMember[] = [];
          
          // 处理所有层级的成员
          Object.entries(result.data.matrix_data.by_layer).forEach(([layer, members]: [string, any]) => {
            (members as any[]).forEach((member: any) => {
              matrixMembers.push({
                walletAddress: member.wallet_address,
                username: member.username || `User${member.wallet_address.slice(-4)}`,
                layer: parseInt(layer),
                position: normalizePosition(member.matrix_position),
                isActive: member.is_activated,
                joinDate: member.joined_at
              });
            });
          });

          matrixMembers.sort((a, b) => a.layer - b.layer || a.position.localeCompare(b.position));

          dataContainer[matrixRoot] = {
            ownerUsername: `User${matrixRoot.slice(-4)}`,
            members: matrixMembers,
            totalCount: matrixMembers.length,
            deepestLayer: Math.max(...matrixMembers.map(m => m.layer), 0)
          };
        } else {
          dataContainer[matrixRoot] = {
            ownerUsername: `User${matrixRoot.slice(-4)}`,
            members: [],
            totalCount: 0,
            deepestLayer: 0
          };
        }
      } else {
        dataContainer[matrixRoot] = {
          ownerUsername: `User${matrixRoot.slice(-4)}`,
          members: [],
          totalCount: 0,
          deepestLayer: 0
        };
      }
    } catch (error) {
      console.error(`Error loading matrix for ${matrixRoot}:`, error);
    }
  };

  const normalizePosition = (position: string): 'L' | 'M' | 'R' => {
    const pos = String(position).toLowerCase();
    if (['l', '1', 'left'].includes(pos)) return 'L';
    if (['m', '2', 'middle', 'center'].includes(pos)) return 'M';
    if (['r', '3', 'right'].includes(pos)) return 'R';
    return 'L';
  };

  const renderMatrixOwnerCard = (matrixRoot: string, data: RecursiveMatrixData[string]) => (
    <div 
      key={matrixRoot}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selectedMatrix === matrixRoot 
          ? 'border-honey bg-honey/5' 
          : 'border-border hover:border-honey/50'
      }`}
      onClick={() => setSelectedMatrix(matrixRoot)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-honey to-honey/80 rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-sm">
              {data.ownerUsername.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-sm">{data.ownerUsername}</div>
            <div className="text-xs text-muted-foreground">
              {matrixRoot.slice(0, 6)}...{matrixRoot.slice(-4)}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {data.totalCount} 成员
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="font-bold text-green-400">
            {data.members.filter(m => m.position === 'L').length}
          </div>
          <div className="text-muted-foreground">L</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-blue-400">
            {data.members.filter(m => m.position === 'M').length}
          </div>
          <div className="text-muted-foreground">M</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-purple-400">
            {data.members.filter(m => m.position === 'R').length}
          </div>
          <div className="text-muted-foreground">R</div>
        </div>
      </div>
    </div>
  );

  const renderSelectedMatrixDetails = () => {
    const selectedData = recursiveData[selectedMatrix];
    if (!selectedData) return null;

    const layerData = Array.from({ length: 5 }, (_, i) => {
      const layer = i + 1;
      const layerMembers = selectedData.members.filter(m => m.layer === layer);
      const maxCapacity = Math.pow(3, layer);
      
      return {
        layer,
        members: layerMembers,
        maxCapacity,
        fillPercentage: (layerMembers.length / maxCapacity) * 100
      };
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-honey">
            {selectedData.ownerUsername} 的Matrix详情
          </h4>
          <Badge className="bg-honey/20 text-honey">
            最深层级: {selectedData.deepestLayer}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {layerData.map(({ layer, members, maxCapacity, fillPercentage }) => (
            <div 
              key={layer}
              className="bg-muted/30 rounded-lg p-3 border"
            >
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className="text-xs">
                  第 {layer} 层
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {members.length}/{maxCapacity}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-2">
                {['L', 'M', 'R'].map(position => {
                  const positionMembers = members.filter(m => m.position === position);
                  const positionColor = position === 'L' ? 'text-green-400' : 
                                      position === 'M' ? 'text-blue-400' : 'text-purple-400';
                  
                  return (
                    <div key={position} className="text-center">
                      <div className={`text-sm font-bold ${positionColor}`}>
                        {positionMembers.length}
                      </div>
                      <div className="text-xs text-muted-foreground">{position}</div>
                    </div>
                  );
                })}
              </div>

              <div className="w-full bg-muted/50 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-honey to-honey/70 h-1 rounded-full transition-all"
                  style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {selectedData.members.length > 0 && (
          <div className="bg-muted/20 rounded-lg p-3">
            <h5 className="font-medium mb-2 text-sm">成员列表</h5>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedData.members.slice(0, 10).map((member, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span>{member.username}</span>
                  <Badge variant="secondary" className="text-xs">
                    L{member.layer}-{member.position}
                  </Badge>
                </div>
              ))}
              {selectedData.members.length > 10 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  还有 {selectedData.members.length - 10} 个成员...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">加载递归矩阵数据中...</div>
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
              onClick={loadRecursiveMatrixData}
            >
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-honey">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            <span>递归推荐矩阵</span>
          </div>
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
            {Object.keys(recursiveData).length} 个矩阵
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 矩阵拥有者列表 */}
        <div className="space-y-4">
          <h4 className="font-medium text-honey flex items-center gap-2">
            <Users className="h-4 w-4" />
            矩阵拥有者
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(recursiveData).map(([matrixRoot, data]) => 
              renderMatrixOwnerCard(matrixRoot, data)
            )}
          </div>
        </div>

        {/* 选中矩阵的详细信息 */}
        {selectedMatrix && recursiveData[selectedMatrix] && (
          <div className="border-t border-border/20 pt-6">
            {renderSelectedMatrixDetails()}
          </div>
        )}

        {/* 说明文本 */}
        <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
          <p>🔄 <strong>递归矩阵系统</strong>: 每个会员都拥有独立的推荐矩阵</p>
          <p className="text-xs mt-1">点击不同的矩阵拥有者查看他们的团队结构和层级分布</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecursiveMatrixViewer;