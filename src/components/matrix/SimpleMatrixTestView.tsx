import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useLayeredMatrix } from '../../hooks/useMatrixByLevel';

interface SimpleMatrixTestViewProps {
  walletAddress?: string;
}

const SimpleMatrixTestView: React.FC<SimpleMatrixTestViewProps> = ({ walletAddress }) => {
  const [currentWallet, setCurrentWallet] = useState<string>(
    walletAddress || '0x0F5adA73e94867a678347D6c2284dBa565489183'
  );
  
  // 测试钱包列表
  const testWallets = [
    '0x0F5adA73e94867a678347D6c2284dBa565489183', // 有3个直推
    '0x0000000000000000000000000000000000000001', // 有滑落的复杂矩阵
    '0x006397D2015b03b9839193449db7719C6cD12fB9',
    '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
  ];

  const { data: matrixData, isLoading, error } = useLayeredMatrix(currentWallet);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="space-y-4">
      {/* 钱包选择器 */}
      <Card>
        <CardHeader>
          <CardTitle>矩阵测试工具</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm font-medium">选择测试钱包:</div>
            <div className="grid grid-cols-2 gap-2">
              {testWallets.map((wallet, index) => (
                <Button
                  key={wallet}
                  variant={currentWallet === wallet ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentWallet(wallet)}
                  className="text-xs"
                >
                  测试 {index + 1}: {formatWallet(wallet)}
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={currentWallet}
                onChange={(e) => setCurrentWallet(e.target.value)}
                placeholder="或输入钱包地址"
                className="w-full p-2 border rounded text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 矩阵显示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>矩阵视图</span>
            {matrixData && (
              <Badge variant="outline">
                {matrixData.totalLayer1Members}/3 位置已填充
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              加载中...
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-red-500">
              错误: {error.message}
            </div>
          )}
          
          {matrixData && !isLoading && !error && (
            <div>
              {/* 当前根钱包 */}
              <div className="mb-4 p-3 bg-gray-100 rounded text-center">
                <div className="text-sm font-medium text-gray-800 mb-1">🏠 根钱包 (你)</div>
                <div className="text-xs font-mono text-gray-600">
                  {formatWallet(currentWallet)}
                </div>
              </div>

              {/* L M R 矩阵 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {matrixData.layer1Matrix.map((node, index) => {
                  const member = node.member;
                  if (!member) {
                    return (
                      <div key={index} className="border border-gray-300 rounded p-4 bg-gray-50 text-center">
                        <div className="text-lg font-bold text-gray-500 mb-2">{node.position}</div>
                        <div className="text-sm text-gray-400">空位</div>
                      </div>
                    );
                  }

                  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
                  
                  return (
                    <div 
                      key={index} 
                      className={`border rounded p-4 ${
                        isSpillover 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-700 mb-2">{node.position}</div>
                        
                        {/* 类型标签 */}
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                          isSpillover 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isSpillover ? '滑落' : '直推'}
                        </div>
                        
                        {/* 用户名 */}
                        {member.username && (
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            {member.username}
                          </div>
                        )}
                        
                        {/* 钱包地址 */}
                        <div className="text-xs text-gray-600 mb-2 font-mono bg-white px-2 py-1 rounded border">
                          {formatWallet(member.wallet)}
                        </div>
                        
                        {/* 下级状态 */}
                        <div className="mb-2">
                          <div className="text-xs text-gray-600 mb-1">下级:</div>
                          <div className="flex justify-center space-x-1 text-xs">
                            <span className={`px-2 py-1 rounded ${member.childrenCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              L {member.childrenCount > 0 ? '✓' : '○'}
                            </span>
                            <span className={`px-2 py-1 rounded ${member.childrenCount > 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              M {member.childrenCount > 1 ? '✓' : '○'}
                            </span>
                            <span className={`px-2 py-1 rounded ${member.childrenCount > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              R {member.childrenCount > 2 ? '✓' : '○'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 加入时间 */}
                        <div className="text-xs text-gray-500">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 说明 */}
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
                💡 绿色=直推，蓝色=滑落，✓=该下级位置有成员，○=空位
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleMatrixTestView;