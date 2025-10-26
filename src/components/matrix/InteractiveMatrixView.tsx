import React, { useState, useEffect, useMemo } from 'react';
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
import { useMatrixTreeData, useMatrixNodeChildren } from '../../hooks/useMatrixTreeData';
import { useI18n } from '../../contexts/I18nContext';
import { useIsMobile } from '../../hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [currentNodeLayer, setCurrentNodeLayer] = useState<number>(1); // Track the actual layer of current node
  const [maxAvailableLayer, setMaxAvailableLayer] = useState<number>(1);
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [currentRootUser, setCurrentRootUser] = useState(rootUser);
  const [originalRoot] = useState<string>(rootWalletAddress); // 保持原始根节点引用

  // 使用新的useMatrixTreeData hook获取矩阵数据
  // When drilling down, we need to get children of the current node
  const isDrillDown = currentRoot !== originalRoot;

  // Get children of current node using the new hook
  const { data: childrenData, isLoading, error } = useMatrixNodeChildren(
    originalRoot,
    currentRoot
  );

  // Transform children data to match the expected format
  const matrixData = useMemo(() => {
    if (!childrenData) return null;

    const transformNode = (node: typeof childrenData.L): MatrixMember | null => {
      if (!node) return null;
      return {
        wallet: node.member_wallet,
        username: node.member_username || undefined,
        joinedAt: node.activation_time || new Date().toISOString(),
        type: node.referral_type === 'direct' ? 'is_direct' : 'is_spillover',
        hasChildren: node.has_children,
        childrenCount: node.children_count,
        isActivated: true,
        hasChildInL: node.children_slots?.L !== null,
        hasChildInM: node.children_slots?.M !== null,
        hasChildInR: node.children_slots?.R !== null,
      };
    };

    const currentLayerMatrix = [
      { position: 'L' as const, member: transformNode(childrenData.L) },
      { position: 'M' as const, member: transformNode(childrenData.M) },
      { position: 'R' as const, member: transformNode(childrenData.R) },
    ];

    const totalCurrentLayerMembers = [childrenData.L, childrenData.M, childrenData.R]
      .filter(Boolean).length;

    return {
      currentLayerMatrix,
      totalCurrentLayerMembers,
    };
  }, [childrenData]);

  // 简化的层级检查 - 根据matrixData动态判断
  useEffect(() => {
    if (matrixData && matrixData.totalCurrentLayerMembers > 0) {
      // 如果当前层有数据，假设最大层级为19（可以根据实际情况调整）
      setMaxAvailableLayer(19);
    } else {
      setMaxAvailableLayer(currentNodeLayer);
    }
  }, [matrixData, currentNodeLayer]);

  useEffect(() => {
    console.log('🔍 InteractiveMatrixView - Current root:', currentRoot, 'current node layer:', currentNodeLayer);
    console.log('📊 Matrix data:', matrixData);
    console.log('🎚️ Max available layer:', maxAvailableLayer);
  }, [currentRoot, currentNodeLayer, matrixData, maxAvailableLayer]);

  const handleNavigateToMember = (memberWallet: string, memberData?: MatrixMember) => {
    // Get the layer of the member we're drilling down to
    const childNode = childrenData?.L?.member_wallet === memberWallet ? childrenData.L :
                     childrenData?.M?.member_wallet === memberWallet ? childrenData.M :
                     childrenData?.R?.member_wallet === memberWallet ? childrenData.R :
                     null;

    const nextLayer = childNode?.layer || currentNodeLayer + 1;

    // 保存当前根到历史记录
    setNavigationHistory(prev => [...prev, {
      wallet: currentRoot,
      username: currentRootUser?.username || `${t('common.user')}${currentRoot.slice(-4)}`,
      level: navigationHistory.length + 1,
      layer: currentNodeLayer
    }]);

    // 切换到新的根
    setCurrentRoot(memberWallet);
    setCurrentRootUser({
      username: memberData?.username || `${t('common.user')}${memberWallet.slice(-4)}`,
      currentLevel: 1
    });
    setCurrentNodeLayer(nextLayer); // Update to the actual layer of the clicked node
    setCurrentLayer(1); // Reset display layer to 1 (showing children of this node)

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
        username: previous.username || `${t('common.user')}${previous.wallet.slice(-4)}`,
        currentLevel: 1
      });
      setCurrentNodeLayer(previous.layer); // Restore the layer
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentLayer(1);
    }
  };

  const handleGoHome = () => {
    setCurrentRoot(rootWalletAddress);
    setCurrentRootUser(rootUser);
    setNavigationHistory([]);
    setCurrentNodeLayer(1); // Reset to layer 1
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
                      ? 'bg-gradient-to-br from-green-500/20 to-green-500/30 border border-green-500/50 text-green-400' 
                      : member.type === 'is_spillover'
                        ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/30 border border-amber-500/50 text-amber-400'
                        : 'bg-gradient-to-br from-yellow-500/20 to-amber-500/30 border border-yellow-500/50 text-yellow-400'
                  }`}
                >
                  {member.type === 'is_direct' ? t('matrix.directReferral') : member.type === 'is_spillover' ? t('matrix.spillover') : t('matrix.other')}
                </Badge>
              </div>

              {/* 用户名 */}
              <div className="text-center mb-3">
                <h3 className="font-semibold text-white text-lg mb-1">
                  {member.username || `${t('common.user')}${member.wallet.slice(-4)}`}
                </h3>
                <p className="text-xs text-yellow-300/70 font-mono bg-black/30 px-2 py-1 rounded border border-yellow-500/30">
                  {formatWallet(member.wallet)}
                </p>
              </div>
            </div>

            {/* 下级状态指示器 */}
            <div className="px-4 pb-4">
              <div className="text-xs text-yellow-300/80 mb-2 text-center">{t('matrix.legend')}:</div>
              <div className="flex justify-center space-x-3">
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInL ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInL ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">{t('membershipSystem.matrix.drillDown.positions.left')}</span>
                </div>
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInM ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInM ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">{t('membershipSystem.matrix.drillDown.positions.middle')}</span>
                </div>
                <div className={`flex flex-col items-center space-y-1 ${member.hasChildInR ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${member.hasChildInR ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-medium">{t('membershipSystem.matrix.drillDown.positions.right')}</span>
                </div>
              </div>
            </div>

            {/* 加入时间 */}
            <div className="px-4 pb-4 text-center">
              <p className="text-xs text-yellow-300/70">
                {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>

            {/* 点击提示 */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/20 px-4 py-2 rounded-b-2xl border-t border-yellow-500/30">
              <p className="text-xs text-yellow-400 text-center font-medium group-hover:text-yellow-300">
                <Navigation className="inline h-3 w-3 mr-1" />
                {t('matrix.matrixView')}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm bg-gradient-to-br from-gray-800/50 to-gray-900/70 rounded-2xl border-2 border-dashed border-yellow-500/30 p-8 text-center">
            <div className="text-yellow-500/50 mb-3">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-sm text-yellow-400/80 font-medium">{t('matrix.emptySlot')}</p>
            <p className="text-xs text-yellow-300/60 mt-1">{t('matrix.waitingToJoin')}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 text-white">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <div className="text-sm text-yellow-400">{t('matrix.loadingData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 text-white">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ {t('matrix.loadFailed')}</div>
            <div className="text-xs text-yellow-300/70">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 text-white">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-yellow-400">{t('matrix.noData')}</div>
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
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Badge variant="outline" className="bg-gradient-to-br from-yellow-500/20 to-amber-500/30 text-yellow-400 border-yellow-500/50">
              {t('matrix.layer')} {currentNodeLayer}
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
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-yellow-400">{t('matrix.myMatrix')}:</h3>
              <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-lg border border-yellow-500/30">
                <User className="h-4 w-4 text-yellow-400" />
                <span className="font-medium text-white">
                  {currentRootUser?.username || `${t('common.user')}${currentRoot.slice(-4)}`}
                </span>
                <span className="text-xs text-yellow-300/70 font-mono">
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
                  className="text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/10 bg-black/20"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('matrix.previousLayer')}
                </Button>
              )}
              
              {currentRoot !== rootWalletAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoHome}
                  className="text-amber-400 border-amber-500/50 hover:bg-amber-500/10 bg-black/20"
                >
                  <Home className="h-4 w-4 mr-1" />
                  {t('matrix.myMatrix')}
                </Button>
              )}
            </div>
          </div>

          {/* 层级选择器 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-yellow-400">{t('matrix.layer')}:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerChange(currentLayer - 1)}
                  disabled={currentLayer <= 1}
                  className="px-2 py-1 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/10 bg-black/20"
                >
                  ←
                </Button>
                
                <select 
                  value={currentLayer} 
                  onChange={(e) => handleLayerChange(Number(e.target.value))}
                  className="px-3 py-1 border border-yellow-500/50 rounded text-sm bg-black/40 text-yellow-400 min-w-[80px]"
                >
                  {Array.from({length: 19}, (_, i) => i + 1).map(layer => (
                    <option key={layer} value={layer} className="bg-black text-yellow-400">{t('matrix.layer')} {layer}</option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerChange(currentLayer + 1)}
                  disabled={currentLayer >= 19}
                  className="px-2 py-1 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/10 bg-black/20"
                >
                  →
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-gradient-to-br from-yellow-500/20 to-amber-500/30 text-yellow-400 border-yellow-500/50">
                {t('matrix.layer')} {currentLayer} / 19
              </Badge>
              {matrixData?.totalCurrentLayerMembers > 0 && (
                <Badge variant="outline" className="bg-gradient-to-br from-green-500/10 to-green-500/20 text-green-400 border-green-500/30">
                  {matrixData.totalCurrentLayerMembers} {t('matrix.filled')}
                </Badge>
              )}
            </div>
          </div>

          {/* 导航历史 */}
          {navigationHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-500/30">
              <div className="text-xs text-yellow-400 mb-1">{t('matrix.myMatrix')}:</div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-yellow-300/70">{t('matrix.myMatrix')}</span>
                {navigationHistory.map((nav, index) => (
                  <React.Fragment key={index}>
                    <span className="text-yellow-400/60">→</span>
                    <span className="text-amber-400">{nav.username}</span>
                  </React.Fragment>
                ))}
                <span className="text-yellow-400/60">→</span>
                <span className="text-green-400 font-medium">{t('matrix.level')}</span>
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
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-lg p-4 border border-yellow-500/30">
          <h4 className="font-semibold text-yellow-400 mb-3">💡 {t('matrix.legend')} - 19 {t('matrix.layer')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-300/80">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Navigation className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span><strong>{t('matrix.matrixView')}</strong> {t('matrix.directReferralDesc')}</span>
              </div>
              <div className="flex items-start space-x-2">
                <ChevronLeft className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>{t('matrix.previousLayer')}</strong> {t('matrix.myMatrix')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>{t('matrix.layer')}</strong> 1-19 {t('matrix.layer')}</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>{t('matrix.myMatrix')}</strong> 19 {t('matrix.layer')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>{t('matrix.legend')}</strong> {t('matrix.filled')} / {t('matrix.emptySlot')}</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-amber-400 rounded mt-0.5 flex-shrink-0"></div>
                <span><strong>{t('matrix.directReferral')}</strong> / <strong>{t('matrix.spillover')}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/20 rounded-lg border border-yellow-500/30">
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                ✨ {t('matrix.interactiveView.subtitle')} - 19 {t('matrix.layer')} {t('matrix.matrixView')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveMatrixView;