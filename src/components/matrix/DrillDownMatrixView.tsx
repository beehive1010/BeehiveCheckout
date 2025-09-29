import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronDown, ChevronRight, Users, User, Trophy, ArrowLeft, Home } from 'lucide-react';
import { useLayeredMatrix, useMatrixChildren } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface DrillDownMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

interface MatrixNodeProps {
  position: string;
  member: {
    wallet: string;
    joinedAt: string;
    type: string;
    hasChildren?: boolean;
    childrenCount?: number;
  } | null;
  onExpand?: (memberWallet: string) => void;
  isExpanded?: boolean;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ 
  position, 
  member, 
  onExpand, 
  isExpanded = false 
}) => {
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getPositionIcon = (pos: string) => {
    switch(pos) {
      case 'L': return '👈';
      case 'M': return '🎯'; 
      case 'R': return '👉';
      default: return '📍';
    }
  };

  if (!member) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[120px] flex items-center justify-center hover:border-gray-400 transition-colors">
        <div className="text-center">
          <div className="text-2xl mb-2">{getPositionIcon(position)}</div>
          <div className="text-sm font-medium text-gray-500">{position}</div>
          <div className="text-xs text-gray-400 mt-1">空位</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 min-h-[120px] bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="text-center">
        {/* Position Icon */}
        <div className="text-2xl mb-2">{getPositionIcon(position)}</div>
        
        {/* Position Label */}
        <div className="text-sm font-bold text-blue-900 mb-2">{position}</div>
        
        {/* Wallet Address */}
        <div className="text-xs text-blue-700 mb-2 font-mono bg-white/50 px-2 py-1 rounded">
          {formatWallet(member.wallet)}
        </div>
        
        {/* Join Date */}
        <div className="text-xs text-gray-600 mb-2">
          {formatDate(member.joinedAt)}
        </div>
        
        {/* Member Type */}
        <Badge 
          variant={member.type === 'is_direct' ? 'default' : 'secondary'}
          className="text-xs mb-3"
        >
          {member.type === 'is_direct' ? '直推' : '滑落'}
        </Badge>
        
        {/* Expand Button */}
        {member.hasChildren && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExpand?.(member.wallet)}
            className="w-full text-xs mt-2"
          >
            {isExpanded ? (
              <>
                <ChevronDown size={14} className="mr-1" />
                收起 ({member.childrenCount})
              </>
            ) : (
              <>
                <ChevronRight size={14} className="mr-1" />
                展开 ({member.childrenCount})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const ChildrenMatrix: React.FC<{ 
  parentWallet: string; 
  matrixRootWallet: string; 
  onClose: () => void;
}> = ({ parentWallet, matrixRootWallet, onClose }) => {
  const { data: childrenData, isLoading, error } = useMatrixChildren(matrixRootWallet, parentWallet);

  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
        <div className="text-center text-gray-500 flex items-center justify-center">
          <User className="animate-spin mr-2" size={16} />
          加载下级成员...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-500">加载失败: {error.message}</div>
      </div>
    );
  }

  if (!childrenData || childrenData.totalChildren === 0) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
        <div className="text-center text-gray-500">该成员暂无下级成员</div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center">
          <Users size={20} className="mr-2" />
          下级矩阵 ({childrenData.totalChildren}/3)
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} className="mr-1" />
          收起
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {childrenData.children.map((child, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="text-center">
              {/* Position Icon */}
              <div className="text-xl mb-2">
                {child.position === 'L' ? '👈' : child.position === 'M' ? '🎯' : '👉'}
              </div>
              
              <div className="text-sm font-medium text-gray-600 mb-2">
                {child.position}
              </div>
              
              {child.member ? (
                <>
                  <div className="text-xs text-gray-800 font-mono mb-2 bg-gray-100 px-2 py-1 rounded">
                    {child.member.wallet.slice(0, 6)}...{child.member.wallet.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(child.member.joinedAt).toLocaleDateString()}
                  </div>
                  <Badge 
                    variant={child.member.type === 'is_direct' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {child.member.type === 'is_direct' ? '直推' : '滑落'}
                  </Badge>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">空位</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DrillDownMatrixView: React.FC<DrillDownMatrixViewProps> = ({ 
  rootWalletAddress, 
  rootUser 
}) => {
  const { t } = useI18n();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const { data: matrixData, isLoading, error } = useLayeredMatrix(rootWalletAddress);

  const handleExpand = (memberWallet: string) => {
    setExpandedMember(expandedMember === memberWallet ? null : memberWallet);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 flex items-center justify-center">
            <User className="animate-spin mr-2" size={20} />
            {t('matrix.loading')}
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
            {t('matrix.errors.loadMatrixFailed')}: {error.message}
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
            {t('matrix.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Home size={20} className="mr-2" />
            {t('matrix.title')} - Layer 1
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users size={16} className="mr-1" />
            {matrixData.totalLayer1Members}/3
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Root User Info */}
        {rootUser && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
            <div className="text-center">
              <Trophy className="mx-auto mb-2 text-yellow-600" size={24} />
              <div className="font-semibold text-yellow-800">矩阵根节点</div>
              <div className="text-sm text-yellow-700 font-mono">
                {rootWalletAddress.slice(0, 6)}...{rootWalletAddress.slice(-4)}
              </div>
              <Badge variant="outline" className="mt-2">
                Level {rootUser.currentLevel}
              </Badge>
            </div>
          </div>
        )}

        {/* Layer 1 矩阵 - 只显示 L, M, R */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {matrixData.layer1Matrix.map((node, index) => (
            <MatrixNode
              key={index}
              position={node.position}
              member={node.member}
              onExpand={handleExpand}
              isExpanded={expandedMember === node.member?.wallet}
            />
          ))}
        </div>

        {/* 展开的下级成员 */}
        {expandedMember && (
          <ChildrenMatrix
            parentWallet={expandedMember}
            matrixRootWallet={rootWalletAddress}
            onClose={() => setExpandedMember(null)}
          />
        )}

        {/* 矩阵说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">📋 3x3 矩阵说明</h4>
          <ul className="text-xs text-blue-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">🎯</span>
              <span>Layer 1显示直接推荐的L、M、R三个位置</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">👆</span>
              <span>点击有下级的成员可以展开查看其3x3子矩阵</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⬇️</span>
              <span>当Layer 1满员时，新成员会滑落到下级</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔗</span>
              <span>分层展示避免断层，保持父子关系清晰</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DrillDownMatrixView;