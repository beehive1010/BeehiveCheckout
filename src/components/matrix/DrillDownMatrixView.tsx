import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, User } from 'lucide-react';
import { useLayeredMatrix, useMatrixChildren } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface DrillDownMatrixViewProps {
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
    hasChildren?: boolean;
    childrenCount?: number;
    username?: string;
    isActivated?: boolean;
    hasChildInL?: boolean;
    hasChildInM?: boolean;
    hasChildInR?: boolean;
  } | null;
  onNavigateToMember?: (memberWallet: string) => void;
  t: (key: string, options?: any) => string;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ 
  position, 
  member, 
  onNavigateToMember,
  t
}) => {
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (!member) {
    return (
      <div className="border border-gray-300 rounded-md p-3 bg-gray-50 text-center">
        <div className="text-lg font-bold text-gray-500 mb-1">{position}</div>
        <div className="text-sm text-gray-400">空位</div>
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';

  return (
    <div 
      className={`border rounded-md p-3 ${
        isSpillover 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-green-50 border-green-200 hover:bg-green-100'
      } hover:shadow-md transition-all`}
    >
      <div className="text-center">
        {/* Position */}
        <div className="text-lg font-bold text-gray-700 mb-2">{position}</div>
        
        {/* Type Badge */}
        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
          isSpillover 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {isSpillover ? '滑落' : '直推'}
        </div>
        
        {/* Username */}
        {member.username && (
          <div className="text-sm font-medium text-gray-800 mb-1">
            {member.username}
          </div>
        )}
        
        {/* Wallet Address */}
        <div className="text-xs text-gray-600 mb-2 font-mono bg-white px-2 py-1 rounded border">
          {formatWallet(member.wallet)}
        </div>
        
        {/* 下级L M R状态 */}
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-1">下级节点:</div>
          <div className="flex justify-center space-x-2 text-xs">
            <span className={`px-2 py-1 rounded ${member.hasChildInL ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              L {member.hasChildInL ? '✓' : '○'}
            </span>
            <span className={`px-2 py-1 rounded ${member.hasChildInM ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              M {member.hasChildInM ? '✓' : '○'}
            </span>
            <span className={`px-2 py-1 rounded ${member.hasChildInR ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              R {member.hasChildInR ? '✓' : '○'}
            </span>
          </div>
        </div>
        
        {/* Join Date */}
        <div className="text-xs text-gray-500 mb-3">
          {formatDate(member.joinedAt)}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToMember?.(member.wallet);
            }}
          >
            查看矩阵 →
          </Button>
        </div>
      </div>
    </div>
  );
};


const DrillDownMatrixView: React.FC<DrillDownMatrixViewProps> = ({ 
  rootWalletAddress, 
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
  const [currentRootUser, setCurrentRootUser] = useState(rootUser);
  const [navigationHistory, setNavigationHistory] = useState<Array<{wallet: string, user?: any}>>([]);
  
  console.log('🏠 DrillDownMatrixView current root:', currentRoot);
  console.log('🔍 DrillDownMatrixView - navigation history:', navigationHistory.length);
  
  // 根据当前根节点获取数据
  const isViewingChildren = currentRoot !== rootWalletAddress;
  
  // 如果查看的是子节点，使用useMatrixChildren，否则使用useLayeredMatrix
  const { data: rootMatrixData, isLoading: isLoadingRoot, error: rootError } = useLayeredMatrix(rootWalletAddress, undefined, 1);
  const { data: childrenMatrixData, isLoading: isLoadingChildren, error: childrenError } = useMatrixChildren(rootWalletAddress, currentRoot);
  
  // 根据当前状态选择数据源
  const matrixData = isViewingChildren ? childrenMatrixData : rootMatrixData;
  const isLoading = isViewingChildren ? isLoadingChildren : isLoadingRoot;
  const error = isViewingChildren ? childrenError : rootError;

  const handleNavigateToMember = (memberWallet: string, memberData?: any) => {
    // 保存当前根到历史记录
    setNavigationHistory(prev => [...prev, { 
      wallet: currentRoot, 
      user: currentRootUser 
    }]);
    
    // 切换到新的根
    setCurrentRoot(memberWallet);
    setCurrentRootUser({
      username: memberData?.username || `User${memberWallet.slice(-4)}`,
      currentLevel: memberData?.level || 1
    });
    
    // 如果有外部导航处理器，也调用它
    onNavigateToMember?.(memberWallet);
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setCurrentRoot(previous.wallet);
      setCurrentRootUser(previous.user);
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };
  
  console.log('🔍 Matrix data status:', { 
    hasRealData: !!matrixData
  });


  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 flex items-center justify-center">
            <User className="animate-spin mr-2" size={20} />
            {t('matrix.drillDown.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {t('matrix.errors.loadFailed')}: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {t('matrix.drillDown.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users size={20} className="mr-2" />
            矩阵视图
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Badge variant="outline">
              {isViewingChildren 
                ? `${matrixData?.totalChildren || 0}/3 已填满`
                : `${matrixData?.totalLayer1Members || 0}/3 已填满`
              }
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 导航栏 */}
        {navigationHistory.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-600">
                导航路径: {navigationHistory.length + 1} 层
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
                onClick={handleGoBack}
              >
                ← 返回上一层
              </Button>
            </div>
          </div>
        )}

        {/* 当前根节点信息 */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-800 mb-2">
            🏠 当前矩阵根节点 {navigationHistory.length > 0 ? '(成员视图)' : '(你)'}
          </div>
          <div className="text-sm font-mono text-gray-600 bg-white px-3 py-1 rounded border">
            {currentRoot.slice(0, 6)}...{currentRoot.slice(-4)}
          </div>
          {currentRootUser && (
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                {currentRootUser.username || 'User'} - 等级 {currentRootUser.currentLevel}
              </Badge>
            </div>
          )}
        </div>

        {/* L M R 水平布局 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* L 位置 */}
          {(() => {
            const leftNode = isViewingChildren 
              ? matrixData?.children?.find(n => n.position === 'L')
              : matrixData?.layer1Matrix?.find(n => n.position === 'L');
            return (
              <MatrixNode
                key="L"
                position="L"
                member={leftNode?.member || null}
                onNavigateToMember={(wallet) => handleNavigateToMember(wallet, leftNode?.member)}
                t={t}
              />
            );
          })()}

          {/* M 位置 */}
          {(() => {
            const middleNode = isViewingChildren 
              ? matrixData?.children?.find(n => n.position === 'M')
              : matrixData?.layer1Matrix?.find(n => n.position === 'M');
            return (
              <MatrixNode
                key="M"
                position="M"
                member={middleNode?.member || null}
                onNavigateToMember={(wallet) => handleNavigateToMember(wallet, middleNode?.member)}
                t={t}
              />
            );
          })()}

          {/* R 位置 */}
          {(() => {
            const rightNode = isViewingChildren 
              ? matrixData?.children?.find(n => n.position === 'R')
              : matrixData?.layer1Matrix?.find(n => n.position === 'R');
            return (
              <MatrixNode
                key="R"
                position="R"
                member={rightNode?.member || null}
                onNavigateToMember={(wallet) => handleNavigateToMember(wallet, rightNode?.member)}
                t={t}
              />
            );
          })()}
        </div>


        {/* 简单说明 */}
        <div className="mt-6 p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
          💡 绿色表示直推成员，蓝色表示滑落成员。点击"查看矩阵"按钮可查看该成员的子节点矩阵（作为新的根节点）。
        </div>
      </CardContent>
    </Card>
  );
};

export default DrillDownMatrixView;