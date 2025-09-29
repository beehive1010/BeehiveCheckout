import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Context';
import { useLayeredMatrix } from '../hooks/useMatrixByLevel';

// Import all matrix components
import DrillDownMatrixView from '../components/matrix/DrillDownMatrixView';
import RecursiveMatrixViewer from '../components/matrix/RecursiveMatrixViewer';
import MatrixLayerStats from '../components/matrix/MatrixLayerStats';
import LayerLevelStatusCard from '../components/matrix/LayerLevelStatusCard';
import DirectMatrixStatsView from '../components/matrix/DirectMatrixStatsView';
import MatrixLayerStatsView from '../components/matrix/MatrixLayerStatsView';
import EnhancedMatrixView from '../components/matrix/EnhancedMatrixView';
import SimpleMatrixView from '../components/matrix/SimpleMatrixView';
import LayeredMatrixView from '../components/matrix/LayeredMatrixView';
import MatrixNetworkStatsV2 from '../components/matrix/MatrixNetworkStatsV2';

import { CubeIcon } from '@heroicons/react/24/outline';

// 详细矩阵slots视图 - 显示正确的滑落层级
const DetailedMatrixSlotsView: React.FC<{ currentWallet: string }> = ({ currentWallet }) => {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  useEffect(() => {
    const fetchMatrixSlots = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 直接查询matrix_referrals获取准确的滑落数据
        const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/matrix-view', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs`,
            'Content-Type': 'application/json',
            'x-wallet-address': currentWallet,
          },
          body: JSON.stringify({
            action: 'get-matrix-slots-detailed',
            matrixRoot: currentWallet,
            maxLayers: 3
          })
        });

        const result = await response.json();
        if (result.success) {
          setMatrixData(result.data);
        } else {
          setError(result.error || '获取matrix数据失败');
        }
      } catch (err) {
        setError('网络错误');
        console.error('Matrix slots fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentWallet) {
      fetchMatrixSlots();
    }
  }, [currentWallet]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">加载详细矩阵slots中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-500">错误: {error}</div>
        </CardContent>
      </Card>
    );
  }

  // 渲染slots数据
  const renderSlots = (layer: number, slots: any[]) => {
    const slotsPerRow = layer === 1 ? 3 : 9;
    const gridCols = layer === 1 ? 'grid-cols-3' : 'grid-cols-9';
    
    return (
      <div className={`grid ${gridCols} gap-2 mb-6`}>
        {Array.from({ length: slotsPerRow }, (_, index) => {
          const slot = slots?.find(s => s.slot_number === index + 1);
          const isEmpty = !slot || slot.slot_status === 'empty';
          
          return (
            <div 
              key={index} 
              className={`border rounded p-2 text-center min-h-[120px] text-xs ${
                isEmpty 
                  ? 'bg-gray-50 border-gray-200' 
                  : slot.referral_type === 'is_spillover' 
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-green-50 border-green-300'
              }`}
            >
              <div className="font-bold mb-1">
                Slot {index + 1}
              </div>
              <div className="text-xs mb-1">
                {slot?.position || (layer === 1 ? ['L', 'M', 'R'][index] : `${Math.floor(index/3)+1}.${['L','M','R'][index%3]}`)}
              </div>
              
              {!isEmpty && (
                <>
                  <div className={`text-xs px-1 py-0.5 rounded mb-1 ${
                    slot.referral_type === 'is_spillover' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {slot.referral_type === 'is_spillover' ? '滑落' : '直推'}
                  </div>
                  
                  {slot.member_username && (
                    <div className="font-medium mb-1">
                      {slot.member_username}
                    </div>
                  )}
                  
                  <div className="font-mono text-xs">
                    {formatWallet(slot.member_wallet)}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    Level {slot.member_level || 1}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>详细Matrix Slots视图</span>
          <Badge variant="outline">
            {currentWallet ? formatWallet(currentWallet) : '未选择'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 根钱包 */}
        <div className="mb-6 p-4 bg-gray-100 rounded text-center">
          <div className="text-lg font-medium text-gray-800 mb-2">🏠 Matrix Root</div>
          <div className="text-sm font-mono text-gray-600 bg-white px-3 py-1 rounded border">
            {formatWallet(currentWallet)}
          </div>
        </div>

        {/* Layer 1 - 3个slots */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Layer 1 (Slots 1-3)</h3>
          {renderSlots(1, matrixData?.layer1 || [])}
        </div>

        {/* Layer 2 - 9个slots */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Layer 2 (Slots 1-9) - 滑落层</h3>
          {renderSlots(2, matrixData?.layer2 || [])}
        </div>

        {/* 说明 */}
        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
          <div className="font-semibold mb-2">说明:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>💚 绿色 = 直推用户</div>
            <div>💙 蓝色 = 滑落用户</div>
            <div>⚪ 灰色 = 空slots</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 简洁矩阵视图组件 (保持原有)
const OriginalMatrixView: React.FC<{ currentWallet: string }> = ({ currentWallet }) => {
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
          <span>原始矩阵视图</span>
          <Badge variant="outline">
            {matrixData.totalLayer1Members}/3 位置已填充
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 当前根钱包 */}
        <div className="mb-6 p-4 bg-gray-100 rounded text-center">
          <div className="text-lg font-medium text-gray-800 mb-2">🏠 根钱包</div>
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