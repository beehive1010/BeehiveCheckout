import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Layers,
  Home
} from 'lucide-react';
import { useLayeredMatrix, useMatrixChildren } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';
import { useIsMobile } from '../../hooks/use-mobile';

interface MobileMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

interface NavigationHistory {
  wallet: string;
  username?: string;
  level: number;
  layer: number;
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
    hasChildInL?: boolean;
    hasChildInM?: boolean;
    hasChildInR?: boolean;
    childCountL?: number;
    childCountM?: number;
    childCountR?: number;
  } | null;
  onTap?: (memberWallet: string) => void;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ position, member, onTap }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  // 移动端优化的尺寸
  const nodeSize = isMobile ? 'p-2' : 'p-3';
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const avatarSize = isMobile ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = isMobile ? 'text-[10px]' : 'text-xs';

  if (!member) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center ${nodeSize} transition-all`}>
        <div className={`${avatarSize} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-1`}>
          <User className={`${iconSize} text-gray-400`} />
        </div>
        <div className={`${textSize} font-semibold text-gray-500 dark:text-gray-400 mb-1`}>{position}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{t('matrix.waitingToJoin')}</div>
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
  const avatarColors = isSpillover
    ? 'from-amber-500 to-yellow-600'
    : 'from-yellow-500 to-amber-600';

  const memberAvatarSize = isMobile ? 'w-8 h-8' : 'w-10 h-10';
  const badgeSize = isMobile ? 'text-[10px] h-4 px-1.5' : 'text-xs h-4 px-2';

  return (
    <div
      className={`aspect-square bg-gradient-to-br ${
        isSpillover
          ? 'from-amber-500/20 to-yellow-500/30 border-amber-500/50'
          : 'from-yellow-500/20 to-amber-500/30 border-yellow-500/50'
      } border-2 rounded-xl ${nodeSize} flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 active:scale-95 cursor-pointer bg-black/80`}
      onClick={() => onTap?.(member.wallet)}
    >
      {/* Avatar */}
      <div className={`${memberAvatarSize} rounded-full bg-gradient-to-br ${avatarColors} flex items-center justify-center mb-1 shadow-lg`}>
        <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {member.username?.charAt(0).toUpperCase() || member.wallet.charAt(2).toUpperCase()}
        </span>
      </div>

      {/* Position Badge */}
      <div className={`${textSize} font-bold text-gray-700 dark:text-gray-300 mb-0.5`}>{position}</div>

      {/* Type Indicator */}
      <div className="flex items-center mb-0.5">
        {isSpillover ? (
          <ArrowDownLeft className={`${iconSize} text-blue-400 dark:text-blue-400`} />
        ) : (
          <ArrowUpRight className={`${iconSize} text-green-600 dark:text-green-400`} />
        )}
      </div>

      {/* Username */}
      <div className={`${textSize} font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full px-0.5`}>
        {member.username || `${t('common.user')}${member.wallet.slice(-4)}`}
      </div>

      {/* Level Badge */}
      {member.level && (
        <Badge className={`mt-0.5 ${badgeSize} ${
          isSpillover
            ? 'bg-blue-400 hover:bg-blue-500'
            : 'bg-green-500 hover:bg-green-600'
        }`}>
          L{member.level}
        </Badge>
      )}

      {/* Next Level Indicators - 移动端优化 */}
      <div className={`flex justify-center ${isMobile ? 'space-x-1 mt-1' : 'space-x-2 mt-2'}`}>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInL ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInL ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.left')}</span>
        </div>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInM ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInM ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.middle')}</span>
        </div>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInR ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInR ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.right')}</span>
        </div>
      </div>
    </div>
  );
};

const MobileMatrixView: React.FC<MobileMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [currentRootUser, setCurrentRootUser] = useState(rootUser);
  const [originalRoot] = useState<string>(rootWalletAddress);
  
  // 根据是否查看原始根节点来决定使用哪个hook
  const isViewingOriginalRoot = currentRoot === originalRoot;
  
  // 原始矩阵数据
  const { data: originalMatrixData, isLoading: isLoadingOriginal, error: originalError } = useLayeredMatrix(
    originalRoot, 
    currentLayer, 
    originalRoot
  );
  
  // 子节点数据  
  const { data: childrenData, isLoading: isLoadingChildren, error: childrenError } = useMatrixChildren(
    originalRoot,
    currentRoot
  );
  
  // 合并数据
  const matrixData = isViewingOriginalRoot ? originalMatrixData : childrenData;
  const isLoading = isViewingOriginalRoot ? isLoadingOriginal : isLoadingChildren;
  const error = isViewingOriginalRoot ? originalError : childrenError;
  
  // 调试信息
  console.log('🔍 MobileMatrixView - Current state:', {
    currentRoot,
    currentLayer,
    originalRoot,
    isViewingOriginalRoot,
    isLoading,
    error: error?.message,
    matrixData: matrixData ? 'Data available' : 'No data'
  });

  const handleMemberTap = (memberWallet: string) => {
    console.log('🔍 MobileMatrixView - Tapping member:', memberWallet);
    console.log('🔍 Current root before change:', currentRoot);
    
    // 保存当前根到历史记录
    setNavigationHistory(prev => [...prev, { 
      wallet: currentRoot,
      username: currentRootUser?.username || `${t('common.user')}${currentRoot.slice(-4)}`,
      level: navigationHistory.length + 1,
      layer: currentLayer
    }]);
    
    // 切换到新的根，显示该会员的第1层
    setCurrentRoot(memberWallet);
    setCurrentRootUser({
      username: `${t('common.user')}${memberWallet.slice(-4)}`,
      currentLevel: 1
    });
    setCurrentLayer(1); // 重置到第一层
    
    console.log('🔍 New root set to:', memberWallet);
    console.log('🔍 New layer set to: 1');
    
    // 如果有外部导航处理器，也调用它
    onNavigateToMember?.(memberWallet);
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setCurrentRoot(previous.wallet);
      setCurrentRootUser({
        username: previous.username || `${t('common.user')}${previous.wallet.slice(-4)}`,
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

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-honey to-honey/80 mx-auto mb-4 flex items-center justify-center animate-pulse`}>
              <Users className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200 dark:text-yellow-300`}>{t('matrix.loadingData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center`}>
              <User className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-red-500`} />
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-400 dark:text-red-300 mb-2`}>{t('matrix.loadFailed')}</div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center`}>
              <Users className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400`} />
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200 dark:text-yellow-300`}>{t('matrix.noData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 处理不同的数据结构
  let currentMatrix = [];
  let totalMembers = 0;
  
  if (isViewingOriginalRoot) {
    // 原始矩阵数据结构
    currentMatrix = matrixData?.currentLayerMatrix || matrixData?.layer1Matrix || [];
    totalMembers = matrixData?.totalCurrentLayerMembers || matrixData?.totalLayer1Members || 0;
  } else {
    // 子节点数据结构
    currentMatrix = matrixData?.children || [];
    totalMembers = matrixData?.totalChildren || 0;
  }
  
  console.log('🔍 MobileMatrixView - Matrix data details:', {
    matrixData,
    currentMatrix,
    totalMembers,
    currentMatrixLength: currentMatrix.length,
    isViewingOriginalRoot
  });

  return (
    <div className={isMobile ? "space-y-3" : "space-y-4"}>
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 shadow-xl shadow-yellow-500/20">
        <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
          <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
              <Crown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-400`} />
              <span className="text-yellow-400 dark:text-yellow-300">{t('matrix.matrixView')}</span>
            </div>
            <Badge className={`bg-yellow-500 text-black font-semibold ${isMobile ? 'text-xs px-2 py-0.5' : ''}`}>
              {t('matrix.layer')} {currentLayer}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Root User Info Card */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-3" : "p-4"}>
          {/* Navigation Controls */}
          <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
              {navigationHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  className={`text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/10 bg-black/20 ${isMobile ? 'h-8 px-2 text-xs' : ''}`}
                >
                  <ChevronLeft className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
                  {isMobile ? t('common.back') : t('matrix.previousLayer')}
                </Button>
              )}

              {currentRoot !== rootWalletAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoHome}
                  className={`text-amber-400 border-amber-500/50 hover:bg-amber-500/10 bg-black/20 ${isMobile ? 'h-8 px-2 text-xs' : ''}`}
                >
                  <Home className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
                  {isMobile ? 'Home' : t('matrix.myMatrix')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-honey to-honey/80 flex items-center justify-center shadow-lg`}>
                <Crown className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-black`} />
              </div>
              <div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-gray-100`}>
                  {currentRootUser?.username || t('matrix.myMatrix')}
                </div>
                <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400 font-mono`}>
                  {formatWallet(currentRoot)}
                </div>
                {currentRootUser?.currentLevel && (
                  <Badge className={`mt-1 bg-honey text-black ${isMobile ? 'text-[10px] px-1.5 py-0' : 'text-xs'}`}>
                    {t('matrix.level')} {currentRootUser.currentLevel}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-honey`}>{totalMembers}/3</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.filled')}</div>
            </div>
          </div>

          {/* Navigation History */}
          {navigationHistory.length > 0 && (
            <div className={`${isMobile ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-yellow-500/30`}>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-400 mb-1`}>{t('matrix.navigationPath')}:</div>
              <div className={`flex items-center ${isMobile ? 'space-x-1 text-[10px]' : 'space-x-2 text-xs'}`}>
                <span className="text-yellow-300/70">{t('matrix.myMatrix')}</span>
                {navigationHistory.map((nav, index) => (
                  <React.Fragment key={index}>
                    <span className="text-yellow-400/60">→</span>
                    <span className="text-amber-400">{nav.username}</span>
                  </React.Fragment>
                ))}
                <span className="text-yellow-400/60">→</span>
                <span className="text-green-400 font-medium">{t('matrix.current')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Layer Navigation */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-3" : "p-4"}>
          <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
              disabled={currentLayer <= 1}
              className={`border-gray-200 dark:border-gray-700 ${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-4'}`}
            >
              <ChevronLeft className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
              {isMobile ? '←' : t('matrix.previousLayer')}
            </Button>

            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
              <Layers className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-honey`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300`}>
                {t('matrix.layer')} {currentLayer}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(currentLayer + 1)}
              disabled={currentLayer >= 19}
              className={`border-gray-200 dark:border-gray-700 ${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-4'}`}
            >
              {isMobile ? '→' : t('matrix.nextLayer')}
              <ChevronRight className={`${isMobile ? 'h-3 w-3 ml-0.5' : 'h-4 w-4 ml-1'}`} />
            </Button>
          </div>

          {/* Quick Layer Selection */}
          <div className="flex flex-wrap gap-1 justify-center">
            {[1,2,3,4,5,6,7,8,9,10].map(layer => (
              <Button
                key={layer}
                variant={layer === currentLayer ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLayer(layer)}
                className={`${isMobile ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'} ${
                  layer === currentLayer
                    ? 'bg-honey text-black hover:bg-honey/90'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {layer}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`grid grid-cols-3 ${isMobile ? 'gap-2 mb-4' : 'gap-4 mb-6'}`}>
            {['L', 'M', 'R'].map(position => {
              const node = currentMatrix.find(n => n.position === position);
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
          <div className={`grid grid-cols-3 ${isMobile ? 'gap-2 pt-3' : 'gap-3 pt-4'} border-t border-gray-100 dark:border-gray-800`}>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-green-500`}>{currentMatrix.filter(n => n.member?.type !== 'is_spillover').length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.directReferral')}</div>
            </div>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-blue-400`}>{currentMatrix.filter(n => n.member?.type === 'is_spillover').length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.spillover')}</div>
            </div>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-500`}>{3 - totalMembers}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.emptySlot')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 border-0">
        <CardContent className="p-4">
          <div className="text-sm font-medium text-yellow-400 dark:text-yellow-300 mb-3">{t('matrix.legend')}</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.directReferral')}</strong>: {t('matrix.directReferralDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-3 w-3 text-blue-400" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.spillover')}</strong>: {t('matrix.spilloverDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.emptySlot')}</strong>: {t('matrix.emptySlotDesc')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMatrixView;