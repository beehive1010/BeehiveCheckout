import React, { useState } from 'react';
import { useLayeredMatrix, useMatrixChildren } from '../../hooks/useMatrixByLevel';
import { ChevronDown, ChevronRight, Users, User } from 'lucide-react';

interface LayeredMatrixViewProps {
  matrixRootWallet: string;
  title?: string;
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
  matrixRootWallet: string;
  onExpand?: (memberWallet: string) => void;
  isExpanded?: boolean;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ 
  position, 
  member, 
  matrixRootWallet, 
  onExpand, 
  isExpanded = false 
}) => {
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (!member) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[100px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500">{position}</div>
          <div className="text-xs text-gray-400 mt-1">空位</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 min-h-[100px] bg-blue-50 hover:bg-blue-100 transition-colors">
      <div className="text-center">
        <div className="text-sm font-medium text-blue-900 mb-1">{position}</div>
        <div className="text-xs text-blue-700 mb-2 font-mono">
          {formatWallet(member.wallet)}
        </div>
        <div className="text-xs text-gray-600 mb-2">
          {formatDate(member.joinedAt)}
        </div>
        <div className="text-xs text-green-600 mb-2">
          {member.type === 'is_direct' ? '直推' : '滑落'}
        </div>
        
        {member.hasChildren && (
          <button
            onClick={() => onExpand?.(member.wallet)}
            className="flex items-center justify-center w-full text-xs text-blue-600 hover:text-blue-800 mt-2"
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
          </button>
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
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">加载下级成员...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 rounded-lg">
        <div className="text-center text-red-500">加载失败</div>
      </div>
    );
  }

  if (!childrenData || childrenData.totalChildren === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">暂无下级成员</div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">
          下级成员 ({childrenData.totalChildren})
        </h4>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          收起
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {childrenData.children.map((child, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">
                {child.position}
              </div>
              {child.member ? (
                <>
                  <div className="text-xs text-gray-800 font-mono mb-1">
                    {child.member.wallet.slice(0, 6)}...{child.member.wallet.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(child.member.joinedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {child.member.type === 'is_direct' ? '直推' : '滑落'}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400">空位</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LayeredMatrixView: React.FC<LayeredMatrixViewProps> = ({ 
  matrixRootWallet, 
  title = "3x3 矩阵结构" 
}) => {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const { data: matrixData, isLoading, error } = useLayeredMatrix(matrixRootWallet);

  const handleExpand = (memberWallet: string) => {
    setExpandedMember(expandedMember === memberWallet ? null : memberWallet);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-500">加载矩阵数据...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-red-500">加载失败: {error.message}</div>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-500">暂无矩阵数据</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center text-sm text-gray-600">
          <Users size={16} className="mr-1" />
          Layer 1: {matrixData.totalLayer1Members}/3
        </div>
      </div>

      {/* Layer 1 矩阵 - 只显示 L, M, R */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {matrixData.layer1Matrix.map((node, index) => (
          <MatrixNode
            key={index}
            position={node.position}
            member={node.member}
            matrixRootWallet={matrixRootWallet}
            onExpand={handleExpand}
            isExpanded={expandedMember === node.member?.wallet}
          />
        ))}
      </div>

      {/* 展开的下级成员 */}
      {expandedMember && (
        <ChildrenMatrix
          parentWallet={expandedMember}
          matrixRootWallet={matrixRootWallet}
          onClose={() => setExpandedMember(null)}
        />
      )}

      {/* 矩阵说明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">矩阵说明</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Layer 1显示直接推荐的L、M、R三个位置</li>
          <li>• 点击有下级的成员可以展开查看其3x3子矩阵</li>
          <li>• 当Layer 1满员时，新成员会滑落到下级</li>
          <li>• 避免显示断层，保持父子关系清晰</li>
        </ul>
      </div>
    </div>
  );
};

export default LayeredMatrixView;