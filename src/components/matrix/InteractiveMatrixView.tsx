import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  ChevronLeft, 
  Users, 
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Home,
  Navigation
} from 'lucide-react';
import { useLayeredMatrix } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixMember {
  wallet: string;
  username?: string;
  joinedAt: string;
  type: string;
  hasChildren?: boolean;
  childrenCount?: number;
  isActivated?: boolean;
  hasChildInL?: boolean;
  hasChildInM?: boolean;
  hasChildInR?: boolean;
}

interface NavigationHistory {
  wallet: string;
  username?: string;
  level: number;
  layer: number;
}

interface InteractiveMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

const InteractiveMatrixView: React.FC<InteractiveMatrixViewProps> = ({ 
  rootWalletAddress, 
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [maxAvailableLayer, setMaxAvailableLayer] = useState<number>(1);
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [currentRootUser, setCurrentRootUser] = useState(rootUser);

  // 使用更新后的hook获取当前root的矩阵数据
  const { data: matrixData, isLoading, error } = useLayeredMatrix(currentRoot, currentLayer);

  // 简化的层级检查 - 根据matrixData动态判断
  useEffect(() => {
    if (matrixData && matrixData.totalCurrentLayerMembers > 0) {
      // 如果当前层有数据，假设最大层级为19（可以根据实际情况调整）
      setMaxAvailableLayer(19);
    } else {
      setMaxAvailableLayer(currentLayer);
    }
  }, [matrixData, currentLayer]);

  useEffect(() => {
    console.log('🔍 InteractiveMatrixView - Current root:', currentRoot, 'layer:', currentLayer);
    console.log('📊 Matrix data:', matrixData);
    console.log('🎚️ Max available layer:', maxAvailableLayer);
  }, [currentRoot, currentLayer, matrixData, maxAvailableLayer]);

  const handleNavigateToMember = (memberWallet: string, memberData?: MatrixMember) => {
    // 保存当前根到历史记录
    setNavigationHistory(prev => [...prev, { 
      wallet: currentRoot, 
      username: currentRootUser?.username || `User${currentRoot.slice(-4)}`,
      level: navigationHistory.length + 1,
      layer: currentLayer
    }]);
    
    // 切换到新的根
    setCurrentRoot(memberWallet);
    setCurrentRootUser({
      username: memberData?.username || `User${memberWallet.slice(-4)}`,
      currentLevel: 1
    });
    setCurrentLayer(1); // 重置到第一层
    
    // 如果有外部导航处理器，也调用它
    onNavigateToMember?.(memberWallet);
  };

  const handleLayerChange = (newLayer: number) => {
    if (newLayer >= 1 && newLayer <= 19) {
      setCurrentLayer(newLayer);
    }
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setCurrentRoot(previous.wallet);
      setCurrentRootUser({
        username: previous.username || `User${previous.wallet.slice(-4)}`,
        currentLevel: 1
      });
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentLayer(1);
    }
  };

  const handleGoHome = () => {
    setCurrentRoot(rootWalletAddress);
    setCurrentRootUser(rootUser);
    setNavigationHistory([]);
    setCurrentLayer(1);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const renderMatrixNode = (position: 'L' | 'M' | 'R', member: MatrixMember | null) => {
    return (
      <div className="flex flex-col items-center">
        {/* 位置标签 */}
        <div className="mb-3">
          <Badge 
            variant="outline" 
            className="text-lg font-bold px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-700"
          >
            {position}
          </Badge>
        </div>

        {/* 成员卡片或空位 */}
        {member ? (
          <div 
            className="w-full max-w-sm bg-gradient-to-br from-gray-900/80 to-black/90 rounded-lg border-2 border-yellow-500/30 hover:border-yellow-400/70 hover:shadow-xl hover:shadow-yellow-500/20 hover:scale-105 transition-all duration-300 cursor-pointer group"
            onClick={() => handleNavigateToMember(member.wallet, member)}
          >
            {/* 卡片头部 */}
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {member.type === 'is_direct' ? (
                    <div className="p-1 bg-gradient-to-br from-green-500/10 to-green-500/20 border border-green-500/30 rounded-full">
                      <ArrowUpRight className="h-4 w-4 text-green-400" />
                    </div>
                  ) : member.type === 'is_spillover' ? (
                    <div className="p-1 bg-gradient-to-br from-amber-500/20 to-yellow-500/30 border border-amber-500/50 rounded-full">
                      <ArrowDownLeft className="h-4 w-4 text-amber-400" />
                    </div>
                  ) : (
                    <div className="p-1 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 border border-yellow-500/50 rounded-full">
                      <Target className="h-4 w-4 text-yellow-400" />
                    </div>
                  )}
                  <User className="h-5 w-5 text-yellow-400" />
                </div>
                <Badge 
                  variant={member.type === 'is_direct' ? "default" : "secondary"}
                  className={`text-xs ${
                    member.type === 'is_direct'
                      ? 'bg-gradient-to-br from-green-500/10 to-green-500/20 border border-green-500/30 text-green-800 border-green-300' 
                      : member.type === 'is_spillover'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  {member.type === 'is_direct' ? t('matrix.directReferral') : member.type === 'is_spillover' ? t('matrix.spillover') : t('matrix.other')}
                </Badge>
              </div>

              {/* 用户名 */}
              <div className="text-center mb-3">
                <h3 className="font-semibold text-gray-800 text-lg mb-1">
                  {member.username || `User${member.wallet.slice(-4)}`}
                </h3>
                <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border">
                  {formatWallet(member.wallet)}
                </p>
              </div>
            </div>

            {/* 下级状态指示器 */}
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-600 mb-2 text-center">下级节点状态:</div>
              <div className="flex justify-center space-x-3">
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInL ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInL ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">L</span>
                </div>
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInM ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInM ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">M</span>
                </div>
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInR ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInR ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">R</span>
                </div>
              </div>
            </div>

            {/* 加入时间 */}
            <div className="px-4 pb-4 text-center">
              <p className="text-xs text-gray-500">
                加入时间: {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>

            {/* 点击提示 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-b-2xl border-t border-blue-100">
              <p className="text-xs text-blue-400 text-center font-medium group-hover:text-blue-700">
                <Navigation className="inline h-3 w-3 mr-1" />
                点击查看此成员的矩阵网络
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-gray-400 mb-3">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-sm text-gray-500 font-medium">空位置</p>
            <p className="text-xs text-gray-400 mt-1">等待新成员</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-sm text-gray-600">加载矩阵数据中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">⚠️ 加载失败</div>
            <div className="text-xs text-gray-500">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-500">暂无矩阵数据</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 从matrixData中提取L, M, R位置的成员
  const leftMember = matrixData.currentLayerMatrix?.find(n => n.position === 'L')?.member || null;
  const middleMember = matrixData.currentLayerMatrix?.find(n => n.position === 'M')?.member || null;
  const rightMember = matrixData.currentLayerMatrix?.find(n => n.position === 'R')?.member || null;

  return (
    <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 text-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-lg border border-yellow-500/50">
              <Users className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-yellow-400">{t('matrix.interactiveView.title')}</h2>
              <p className="text-sm text-yellow-200/80">{t('matrix.interactiveView.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-gradient-to-br from-yellow-500/20 to-amber-500/30 text-yellow-400 border-yellow-500/50">
              {t('matrix.layer')} {currentLayer}
            </Badge>
            <Badge variant="outline" className="bg-gradient-to-br from-amber-500/20 to-orange-500/30 text-amber-400 border-amber-500/50">
              {matrixData?.totalCurrentLayerMembers || 0}/3 {t('matrix.filled')}
            </Badge>
            <Badge variant="outline" className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/30 text-yellow-300 border-yellow-500/50">
              {t('matrix.maxLayer')} {maxAvailableLayer}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 导航面包屑和控制 */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-800">当前根节点:</h3>
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-lg border">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">
                  {currentRootUser?.username || `User${currentRoot.slice(-4)}`}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  ({formatWallet(currentRoot)})
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {navigationHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  className="text-blue-400 border-blue-300 hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  返回上级
                </Button>
              )}
              
              {currentRoot !== rootWalletAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoHome}
                  className="text-green-400 border-green-300 hover:bg-green-50"
                >
                  <Home className="h-4 w-4 mr-1" />
                  回到根节点
                </Button>
              )}
            </div>
          </div>

          {/* 层级选择器 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">选择层级:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerChange(currentLayer - 1)}
                  disabled={currentLayer <= 1}
                  className="px-2 py-1"
                >
                  ←
                </Button>
                
                <select 
                  value={currentLayer} 
                  onChange={(e) => handleLayerChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm bg-white min-w-[80px]"
                >
                  {Array.from({length: 19}, (_, i) => i + 1).map(layer => (
                    <option key={layer} value={layer}>第{layer}层</option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerChange(currentLayer + 1)}
                  disabled={currentLayer >= 19}
                  className="px-2 py-1"
                >
                  →
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 text-indigo-400 border-indigo-500/30">
                第 {currentLayer} / 19 层
              </Badge>
              {matrixData?.totalCurrentLayerMembers > 0 && (
                <Badge variant="outline" className="bg-gradient-to-br from-green-500/10 to-green-500/20 text-green-400 border-green-500/30">
                  本层 {matrixData.totalCurrentLayerMembers} 个成员
                </Badge>
              )}
            </div>
          </div>

          {/* 导航历史 */}
          {navigationHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-1">导航路径:</div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">根节点</span>
                {navigationHistory.map((nav, index) => (
                  <React.Fragment key={index}>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-400">{nav.username}</span>
                  </React.Fragment>
                ))}
                <span className="text-gray-400">→</span>
                <span className="text-green-400 font-medium">当前</span>
              </div>
            </div>
          )}
        </div>

        {/* 矩阵显示 - 水平布局 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {renderMatrixNode('L', leftMember)}
          {renderMatrixNode('M', middleMember)}
          {renderMatrixNode('R', rightMember)}
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-3">💡 使用说明 - 支持完整19层矩阵导航</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Navigation className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span><strong>节点导航</strong> 点击成员卡片切换到该成员作为根节点</span>
              </div>
              <div className="flex items-start space-x-2">
                <ChevronLeft className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>返回导航</strong> 返回上级或回到根节点</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-indigo-500 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>层级选择</strong> 使用下拉选择器或左右箭头浏览1-19层</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>深度探索</strong> 每个根节点都可以查看完整的19层结构</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span><strong>状态指示</strong> 绿点=有成员，灰点=空位</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-blue-400 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>类型标识</strong> 绿色=直推，蓝色=滑落</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                ✨ 现在支持完整19层矩阵导航！点击任意成员查看其完整的下级网络结构
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveMatrixView;