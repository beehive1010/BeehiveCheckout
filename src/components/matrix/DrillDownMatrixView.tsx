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
  onToggleExpand?: (memberWallet: string) => void;
  isExpanded?: boolean;
  t: (key: string, options?: any) => string;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ 
  position, 
  member, 
  onNavigateToMember,
  onToggleExpand,
  isExpanded,
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
      className={`border rounded-md p-3 cursor-pointer ${
        isSpillover 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-green-50 border-green-200 hover:bg-green-100'
      } ${isExpanded ? 'ring-2 ring-blue-400' : ''} hover:shadow-md transition-all`}
      onClick={() => member.hasChildren && onToggleExpand?.(member.wallet)}
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
          {member.hasChildren && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs text-green-600 border-green-200 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(member.wallet);
              }}
            >
              {isExpanded ? '收起 ↑' : '展开 ↓'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`${member.hasChildren ? 'flex-1' : 'w-full'} text-xs text-blue-600 border-blue-200 hover:bg-blue-50`}
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
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  console.log('🏠 DrillDownMatrixView props:', { rootWalletAddress, rootUser });
  console.log('🔍 DrillDownMatrixView - wallet address received:', rootWalletAddress);
  console.log('🔍 DrillDownMatrixView - wallet address type:', typeof rootWalletAddress);
  console.log('🔍 DrillDownMatrixView - wallet address length:', rootWalletAddress?.length);
  
  const { data: matrixData, isLoading, error } = useLayeredMatrix(rootWalletAddress);
  const { data: childrenData } = useMatrixChildren(rootWalletAddress, expandedMember || '');

  const handleToggleExpand = (memberWallet: string) => {
    setExpandedMember(expandedMember === memberWallet ? null : memberWallet);
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
              {matrixData.totalLayer1Members}/3 已填满
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 根节点信息 */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-800 mb-2">🏠 根节点 (你)</div>
          <div className="text-sm font-mono text-gray-600 bg-white px-3 py-1 rounded border">
            {rootWalletAddress.slice(0, 6)}...{rootWalletAddress.slice(-4)}
          </div>
          {rootUser && (
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                等级 {rootUser.currentLevel}
              </Badge>
            </div>
          )}
        </div>

        {/* L M R 水平布局 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* L 位置 */}
          {(() => {
            const leftNode = matrixData.layer1Matrix.find(n => n.position === 'L');
            return (
              <MatrixNode
                key="L"
                position="L"
                member={leftNode?.member || null}
                onNavigateToMember={onNavigateToMember}
                onToggleExpand={handleToggleExpand}
                isExpanded={expandedMember === leftNode?.member?.wallet}
                t={t}
              />
            );
          })()}

          {/* M 位置 */}
          {(() => {
            const middleNode = matrixData.layer1Matrix.find(n => n.position === 'M');
            return (
              <MatrixNode
                key="M"
                position="M"
                member={middleNode?.member || null}
                onNavigateToMember={onNavigateToMember}
                onToggleExpand={handleToggleExpand}
                isExpanded={expandedMember === middleNode?.member?.wallet}
                t={t}
              />
            );
          })()}

          {/* R 位置 */}
          {(() => {
            const rightNode = matrixData.layer1Matrix.find(n => n.position === 'R');
            return (
              <MatrixNode
                key="R"
                position="R"
                member={rightNode?.member || null}
                onNavigateToMember={onNavigateToMember}
                onToggleExpand={handleToggleExpand}
                isExpanded={expandedMember === rightNode?.member?.wallet}
                t={t}
              />
            );
          })()}
        </div>

        {/* 展开的子节点 */}
        {expandedMember && childrenData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-blue-800 flex items-center">
                <Users size={16} className="mr-2" />
                {childrenData.expandedMemberName || formatWallet(expandedMember)} 的下级节点
              </h4>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setExpandedMember(null)}
              >
                收起
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {['L', 'M', 'R'].map(position => {
                const childNode = childrenData.children?.find((c: any) => 
                  c.member && c.member.matrix_position?.endsWith(`.${position}`)
                );
                
                if (childNode?.member) {
                  return (
                    <div key={position} className="border border-blue-200 rounded-lg p-3 bg-white">
                      <div className="text-center">
                        <div className="text-sm font-bold text-blue-700 mb-1">{position}</div>
                        <div className="text-xs font-medium text-gray-800 mb-1">
                          {childNode.member.username}
                        </div>
                        <div className="text-xs text-gray-600 font-mono mb-1">
                          {formatWallet(childNode.member.wallet_address)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          childNode.member.is_spillover ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {childNode.member.is_spillover ? '滑落' : '直推'}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={position} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-500 mb-1">{position}</div>
                        <div className="text-xs text-gray-400">空位</div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* 简单说明 */}
        <div className="mt-6 p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
          💡 绿色表示直推成员，蓝色表示滑落成员。点击有下级的成员卡片可展开查看其L M R下级节点。
        </div>
      </CardContent>
    </Card>
  );
};

export default DrillDownMatrixView;