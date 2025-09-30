import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  User, 
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Layers,
  ChevronDown,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { useLayeredMatrix } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface ModernMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

interface ModernMatrixNodeProps {
  position: string;
  member: {
    wallet: string;
    joinedAt: string;
    type: string;
    username?: string;
    isActivated?: boolean;
    level?: number;
  } | null;
  onTap?: (memberWallet: string) => void;
  isRoot?: boolean;
}

const ModernMatrixNode: React.FC<ModernMatrixNodeProps> = ({ 
  position, 
  member, 
  onTap,
  isRoot = false 
}) => {
  if (!member) {
    return (
      <div className="relative group">
        <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl p-6 h-32 flex flex-col items-center justify-center transition-all duration-300 hover:border-honey/50 hover:bg-honey/5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-3 transition-transform group-hover:scale-110">
            <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">{position}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">等待加入</div>
        </div>
        
        {/* Glow effect for empty slots */}
        <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-honey/10 to-honey/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
  const gradientColors = isSpillover 
    ? 'from-blue-500 via-blue-600 to-blue-700' 
    : isRoot
      ? 'from-honey via-yellow-500 to-amber-600'
      : 'from-green-500 via-green-600 to-green-700';
  
  const bgColors = isSpillover 
    ? 'from-blue-50 via-blue-100 to-blue-150 dark:from-blue-900/30 dark:via-blue-800/40 dark:to-blue-700/30' 
    : isRoot
      ? 'from-honey/20 via-yellow-100 to-amber-50 dark:from-yellow-900/30 dark:via-amber-800/40 dark:to-honey/20'
      : 'from-green-50 via-green-100 to-green-150 dark:from-green-900/30 dark:via-green-800/40 dark:to-green-700/30';
  
  const borderColors = isSpillover 
    ? 'border-blue-200 dark:border-blue-600' 
    : isRoot
      ? 'border-honey dark:border-yellow-600'
      : 'border-green-200 dark:border-green-600';

  return (
    <div className="relative group">
      <div 
        className={`bg-gradient-to-br ${bgColors} border-2 ${borderColors} rounded-3xl p-6 h-32 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer`}
        onClick={() => onTap?.(member.wallet)}
      >
        {/* Avatar with enhanced styling */}
        <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientColors} flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110`}>
          <span className="text-white font-bold text-lg">
            {member.username?.charAt(0).toUpperCase() || member.wallet.charAt(2).toUpperCase()}
          </span>
          
          {/* Status indicator */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
            isRoot ? 'bg-yellow-400' : 'bg-green-400'
          } border-2 border-white shadow-sm`}>
            {isRoot && <Crown className="w-2 h-2 text-yellow-800 m-0.5" />}
          </div>
        </div>
        
        {/* Position and Type */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{position}</div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          {isSpillover ? (
            <ArrowDownLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
          )}
        </div>
        
        {/* Username */}
        <div className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full mb-1">
          {member.username || `User${member.wallet.slice(-4)}`}
        </div>
        
        {/* Level Badge */}
        {member.level && (
          <Badge className={`text-xs h-5 px-2 ${
            isSpillover 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : isRoot
                ? 'bg-honey text-black hover:bg-honey/90'
                : 'bg-green-500 hover:bg-green-600'
          }`}>
            L{member.level}
          </Badge>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      {/* Enhanced glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${
        isSpillover 
          ? 'from-blue-500/20 via-blue-400/10 to-blue-500/20' 
          : isRoot
            ? 'from-honey/30 via-yellow-400/20 to-honey/30'
            : 'from-green-500/20 via-green-400/10 to-green-500/20'
      } rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl`} />
    </div>
  );
};

const ModernMatrixView: React.FC<ModernMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [showStats, setShowStats] = useState(false);
  
  // 使用修正后的useLayeredMatrix hook，支持层级参数
  const { data: matrixData, isLoading, error } = useLayeredMatrix(rootWalletAddress, currentLayer);

  const handleMemberTap = (memberWallet: string) => {
    onNavigateToMember?.(memberWallet);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-honey/5 to-honey/10 border-honey/20 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-honey to-honey/80 mx-auto mb-6 flex items-center justify-center animate-pulse shadow-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">加载矩阵数据</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">正在获取您的网络结构...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-6 flex items-center justify-center shadow-2xl">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">加载失败</div>
              <div className="text-sm text-red-500 dark:text-red-400">{error.message}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-400 to-gray-500 mx-auto mb-6 flex items-center justify-center shadow-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">暂无数据</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">您的矩阵网络为空</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMatrix = matrixData.currentLayerMatrix || matrixData.layer1Matrix || [];
  const totalMembers = matrixData.totalCurrentLayerMembers || matrixData.totalLayer1Members || 0;
  const directCount = currentMatrix.filter(n => n.member && n.member.type !== 'is_spillover').length;
  const spilloverCount = currentMatrix.filter(n => n.member && n.member.type === 'is_spillover').length;

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <Card className="bg-gradient-to-r from-honey/10 via-honey/5 to-transparent border-honey/30 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-honey/5 to-transparent opacity-50" />
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-honey to-amber-600 flex items-center justify-center shadow-lg">
                <Layers className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className="text-gray-900 dark:text-gray-100">矩阵网络</span>
                <div className="text-sm font-normal text-gray-600 dark:text-gray-400">第{currentLayer}层视图</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="h-10 w-10 p-0"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Stats Panel (Collapsible) */}
      {showStats && (
        <Card className="bg-white dark:bg-gray-900 border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{directCount}</div>
                <div className="text-xs text-green-700 dark:text-green-300 font-medium">直推成员</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{spilloverCount}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">滑落成员</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-honey/20 to-amber-100 dark:from-amber-900/20 dark:to-honey/20 rounded-2xl">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{3 - totalMembers}</div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">空余位置</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layer Navigation */}
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
              disabled={currentLayer <= 1}
              className="h-12 px-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-honey hover:bg-honey/5"
            >
              <ChevronDown className="h-5 w-5 mr-2 rotate-90" />
              上一层
            </Button>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-honey">{currentLayer}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">当前层级</div>
            </div>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentLayer(currentLayer + 1)}
              disabled={currentLayer >= 19}
              className="h-12 px-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-honey hover:bg-honey/5"
            >
              下一层
              <ChevronDown className="h-5 w-5 ml-2 -rotate-90" />
            </Button>
          </div>

          {/* Quick Layer Access */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[1,2,3,4,5,6,7,8,9,10].map(layer => (
              <Button
                key={layer}
                variant={layer === currentLayer ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLayer(layer)}
                className={`h-10 w-10 rounded-xl text-sm font-medium ${
                  layer === currentLayer
                    ? 'bg-honey text-black hover:bg-honey/90 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {layer}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matrix Display */}
      <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-honey/5 via-transparent to-blue/5 opacity-30" />
        <CardContent className="relative p-8">
          <div className="grid grid-cols-3 gap-6">
            {['L', 'M', 'R'].map(position => {
              const node = currentMatrix.find(n => n.position === position);
              return (
                <ModernMatrixNode
                  key={position}
                  position={position}
                  member={node?.member || null}
                  onTap={handleMemberTap}
                  isRoot={currentLayer === 1 && position === 'M'} // Middle position in layer 1 could be special
                />
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">填充进度</span>
              <span className="text-sm font-bold text-honey">{totalMembers}/3</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-honey to-amber-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(totalMembers / 3) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Legend */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-honey" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">图例说明</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <ArrowUpRight className="h-3 w-3 text-white" />
              </div>
              <span className="text-gray-600 dark:text-gray-400"><strong>直推成员</strong> - 通过您的邀请链接直接注册的用户</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <ArrowDownLeft className="h-3 w-3 text-white" />
              </div>
              <span className="text-gray-600 dark:text-gray-400"><strong>滑落成员</strong> - 由于您的位置已满而自动分配到您矩阵中的用户</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
              <span className="text-gray-600 dark:text-gray-400"><strong>空余位置</strong> - 等待新成员加入的位置</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernMatrixView;