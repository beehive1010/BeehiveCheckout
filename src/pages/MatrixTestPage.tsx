import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Context';
import { useLayeredMatrix } from '../hooks/useMatrixByLevel';
import DrillDownMatrixView from '../components/matrix/DrillDownMatrixView';
import { CubeIcon } from '@heroicons/react/24/outline';

// 简洁矩阵视图组件
const SimpleMatrixView: React.FC<{ currentWallet: string }> = ({ currentWallet }) => {
  const { data: matrixData, isLoading, error } = useLayeredMatrix(currentWallet);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">加载矩阵数据中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-500">错误: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">暂无矩阵数据</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>矩阵视图</span>
          <Badge variant="outline">
            {matrixData.totalLayer1Members}/3 位置已填充
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 当前根钱包 */}
        <div className="mb-6 p-4 bg-gray-100 rounded text-center">
          <div className="text-lg font-medium text-gray-800 mb-2">🏠 根钱包 (你)</div>
          <div className="text-sm font-mono text-gray-600 bg-white px-3 py-1 rounded border">
            {formatWallet(currentWallet)}
          </div>
        </div>

        {/* L M R 矩阵 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {matrixData.layer1Matrix.map((node, index) => {
            const member = node.member;
            if (!member) {
              return (
                <div key={index} className="border border-gray-300 rounded p-4 bg-gray-50 text-center min-h-[200px] flex items-center justify-center">
                  <div>
                    <div className="text-lg font-bold text-gray-500 mb-2">{node.position}</div>
                    <div className="text-sm text-gray-400">空位</div>
                  </div>
                </div>
              );
            }

            const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
            
            return (
              <div 
                key={index} 
                className={`border rounded p-4 min-h-[200px] ${
                  isSpillover 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="text-center h-full flex flex-col justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-700 mb-2">{node.position}</div>
                    
                    {/* 类型标签 */}
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${
                      isSpillover 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {isSpillover ? '滑落' : '直推'}
                    </div>
                    
                    {/* 用户名 */}
                    {member.username && (
                      <div className="text-sm font-medium text-gray-800 mb-2">
                        {member.username}
                      </div>
                    )}
                    
                    {/* 钱包地址 */}
                    <div className="text-xs text-gray-600 mb-3 font-mono bg-white px-2 py-1 rounded border">
                      {formatWallet(member.wallet)}
                    </div>
                  </div>

                  <div>
                    {/* 下级状态 */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-600 mb-1">下级节点:</div>
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
              </div>
            );
          })}
        </div>

        {/* 说明 */}
        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
          💡 绿色=直推，蓝色=滑落，✓=该下级位置有成员，○=空位
        </div>
      </CardContent>
    </Card>
  );
};

const MatrixTestPage: React.FC = () => {
  const [currentWallet, setCurrentWallet] = useState<string>('0x0F5adA73e94867a678347D6c2284dBa565489183');
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  
  // Use same user data connection as other components
  const { walletAddress, isConnected } = useWeb3();
  const { userStatus, isUserLoading } = useWallet();

  // 测试钱包列表
  const testWallets = [
    { 
      address: '0x0F5adA73e94867a678347D6c2284dBa565489183', 
      name: '测试钱包 1', 
      desc: '有3个直推成员' 
    },
    { 
      address: '0x0000000000000000000000000000000000000001', 
      name: '测试钱包 2', 
      desc: '有滑落矩阵结构' 
    },
    { 
      address: '0x006397D2015b03b9839193449db7719C6cD12fB9', 
      name: '测试钱包 3', 
      desc: '混合矩阵' 
    },
    { 
      address: '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD', 
      name: '测试钱包 4', 
      desc: '纯滑落成员' 
    }
  ];

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  // 在有连接钱包时自动切换
  useEffect(() => {
    if (walletAddress && walletAddress !== currentWallet) {
      setCurrentWallet(walletAddress);
    }
  }, [walletAddress, currentWallet]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CubeIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">矩阵测试中心</h1>
          </div>
          <p className="text-gray-600">测试和查看矩阵数据结构</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧：钱包选择器 */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>测试钱包选择</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 连接的钱包 */}
                {walletAddress && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">🔗 已连接钱包</div>
                    <div className="text-xs font-mono text-green-700">{formatWallet(walletAddress)}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => setCurrentWallet(walletAddress)}
                    >
                      使用连接的钱包
                    </Button>
                  </div>
                )}

                {/* 测试钱包列表 */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">预设测试钱包:</div>
                  <div className="space-y-2">
                    {testWallets.map((wallet) => (
                      <div
                        key={wallet.address}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          currentWallet === wallet.address
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setCurrentWallet(wallet.address)}
                      >
                        <div className="text-sm font-medium text-gray-800">{wallet.name}</div>
                        <div className="text-xs font-mono text-gray-600">{formatWallet(wallet.address)}</div>
                        <div className="text-xs text-gray-500 mt-1">{wallet.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 自定义钱包输入 */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">自定义钱包:</div>
                  <input
                    type="text"
                    value={currentWallet}
                    onChange={(e) => setCurrentWallet(e.target.value)}
                    placeholder="输入钱包地址..."
                    className="w-full p-2 border rounded text-xs"
                  />
                </div>

                {/* 视图模式切换 */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">视图模式:</div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={viewMode === 'simple' ? 'default' : 'outline'}
                      onClick={() => setViewMode('simple')}
                      className="flex-1"
                    >
                      简洁视图
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'advanced' ? 'default' : 'outline'}
                      onClick={() => setViewMode('advanced')}
                      className="flex-1"
                    >
                      详细视图
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：矩阵显示 */}
          <div className="xl:col-span-2">
            {viewMode === 'simple' ? (
              <SimpleMatrixView currentWallet={currentWallet} />
            ) : (
              <DrillDownMatrixView 
                rootWalletAddress={currentWallet}
                onNavigateToMember={(memberWallet) => setCurrentWallet(memberWallet)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixTestPage;