import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Layers
} from 'lucide-react';
import { useRecursiveMatrix } from '../../hooks/useRecursiveMatrix';
import { useI18n } from '../../contexts/I18nContext';

interface RecursiveMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

interface MatrixNodeProps {
  position: string;
  member: {
    wallet: string;
    joinedAt: string;
    type: string;
    username?: string;
    isActivated?: boolean;
    level?: number;
    sequenceIndex?: number;
    actualLayer?: number;
    actualPosition?: string;
    calculatedLayer?: number;
    calculatedPosition?: string;
    isMatching?: boolean;
  } | null;
  onTap?: (memberWallet: string) => void;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ position, member, onTap }) => {
  if (!member) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center p-3 transition-all">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{position}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">待加入</div>
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
  const avatarColors = isSpillover 
    ? 'from-blue-500 to-blue-600' 
    : 'from-green-500 to-green-600';
  
  return (
    <div 
      className={`aspect-square bg-gradient-to-br ${
        isSpillover 
          ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700' 
          : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700'
      } border-2 rounded-2xl flex flex-col items-center justify-center p-3 transition-all hover:scale-105 active:scale-95 cursor-pointer`}
      onClick={() => onTap?.(member.wallet)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors} flex items-center justify-center mb-2 shadow-lg`}>
        <span className="text-white font-bold text-sm">
          {member.username?.charAt(0).toUpperCase() || member.wallet.charAt(2).toUpperCase()}
        </span>
      </div>
      
      {/* Position Badge */}
      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{position}</div>
      
      {/* Sequence Index */}
      {member.sequenceIndex && (
        <div className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mb-1">
          #{member.sequenceIndex}
        </div>
      )}
      
      {/* Type Indicator */}
      <div className="flex items-center mb-1">
        {isSpillover ? (
          <ArrowDownLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        ) : (
          <ArrowUpRight className="w-3 h-3 text-green-600 dark:text-green-400" />
        )}
      </div>
      
      {/* Username */}
      <div className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full px-1">
        {member.username || `User${member.wallet.slice(-4)}`}
      </div>
      
      {/* Matching Status */}
      {member.isMatching !== undefined && (
        <div className={`text-xs mt-1 px-1 py-0.5 rounded ${
          member.isMatching 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {member.isMatching ? '✅' : '❌'}
        </div>
      )}
      
      {/* Actual vs Calculated Position */}
      {member.actualLayer && member.calculatedLayer && (
        <div className="text-xs text-gray-600 mt-1">
          <div>实际: L{member.actualLayer}.{member.actualPosition}</div>
          <div>计算: L{member.calculatedLayer}.{member.calculatedPosition}</div>
        </div>
      )}
    </div>
  );
};

const RecursiveMatrixView: React.FC<RecursiveMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  
  const { data: matrixData, isLoading, error } = useRecursiveMatrix(rootWalletAddress, currentLayer);

  const handleMemberTap = (memberWallet: string) => {
    onNavigateToMember?.(memberWallet);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-honey to-honey/80 mx-auto mb-4 flex items-center justify-center animate-pulse">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">加载递归矩阵数据中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
              <User className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 mb-2">加载失败</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">暂无递归矩阵数据</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMatrix = matrixData.currentLayerMatrix || [];
  const totalMembers = matrixData.totalCurrentLayerMembers || 0;
  const maxLayers = matrixData.totalCalculatedLayers || 1;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-gray-900 dark:text-gray-100">递归矩阵视图</span>
            </div>
            <Badge className="bg-purple-600 text-white font-semibold">
              第{currentLayer}层
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Root User Info Card */}
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {rootUser?.username || '递归矩阵根节点'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {formatWallet(rootWalletAddress)}
                </div>
                {rootUser?.currentLevel && (
                  <Badge className="mt-1 bg-purple-100 text-purple-700 text-xs">
                    等级 {rootUser.currentLevel}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">{totalMembers}/3</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">当前层</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                总推荐: {matrixData.totalReferrals}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layer Navigation */}
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
              disabled={currentLayer <= 1}
              className="h-10 px-4 border-gray-200 dark:border-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一层
            </Button>
            
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                第 {currentLayer} 层 / 共 {maxLayers} 层
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(currentLayer + 1)}
              disabled={currentLayer >= maxLayers}
              className="h-10 px-4 border-gray-200 dark:border-gray-700"
            >
              下一层
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Quick Layer Selection */}
          <div className="flex flex-wrap gap-1 justify-center">
            {Array.from({length: Math.min(maxLayers, 10)}, (_, i) => i + 1).map(layer => (
              <Button
                key={layer}
                variant={layer === currentLayer ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLayer(layer)}
                className={`h-8 w-8 text-xs ${
                  layer === currentLayer
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {layer}
              </Button>
            ))}
            {maxLayers > 10 && (
              <span className="text-xs text-gray-500 px-2 py-1">...</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['L', 'M', 'R'].map(position => {
              const node = currentMatrix.find((n: any) => n.position === position);
              return (
                <MatrixNode
                  key={position}
                  position={position}
                  member={node?.member || null}
                  onTap={handleMemberTap}
                />
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">
                {currentMatrix.filter((n: any) => n.member?.type !== 'is_spillover').length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">直推</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">
                {currentMatrix.filter((n: any) => n.member?.type === 'is_spillover').length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">滑落</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-500">{3 - totalMembers}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">空位</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-500">
                {currentMatrix.filter((n: any) => n.member?.isMatching).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">匹配</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 border-0">
        <CardContent className="p-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">递归矩阵说明</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400"><strong>直推</strong>：通过您的邀请链接直接注册</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-3 w-3 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400"><strong>滑落</strong>：按推荐顺序递归分配到您的矩阵</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-1 rounded">✅</span>
              <span className="text-gray-600 dark:text-gray-400"><strong>匹配</strong>：实际位置与计算位置一致</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-100 text-red-700 px-1 rounded">❌</span>
              <span className="text-gray-600 dark:text-gray-400"><strong>不匹配</strong>：实际位置与计算位置不一致</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecursiveMatrixView;