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
import { MatrixNetworkStatsV2 } from '../components/matrix/MatrixNetworkStatsV2';
// 其他矩阵组件
import ModernMatrixView from '../components/matrix/ModernMatrixView';
import InteractiveMatrixView from '../components/matrix/InteractiveMatrixView';
import MatrixPositionQuery from '../components/matrix/MatrixPositionQuery';

import { CubeIcon } from '@heroicons/react/24/outline';

// 详细矩阵slots视图 - 显示正确的滑落层级
const DetailedMatrixSlotsView: React.FC<{ 
  currentWallet: string; 
  onNavigateToMember?: (memberWallet: string) => void;
}> = ({ currentWallet, onNavigateToMember }) => {
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
        const response = await fetch('https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix-view', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs`,
            'Content-Type': 'application/json',
            'x-wallet-address': currentWallet,
          },
          body: JSON.stringify({
            action: 'get-matrix-slots-detailed',
            matrixRoot: currentWallet,
            maxLayers: 19
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
              className={`border rounded p-2 text-center min-h-[120px] text-xs transition-all ${
                isEmpty 
                  ? 'bg-gray-50 border-gray-200' 
                  : slot.referral_type === 'is_spillover' 
                    ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 cursor-pointer'
                    : 'bg-green-50 border-green-300 hover:bg-green-100 cursor-pointer'
              }`}
              onClick={() => {
                if (!isEmpty && slot.member_wallet && onNavigateToMember) {
                  console.log('🔍 Detailed slots navigating to:', slot.member_wallet);
                  onNavigateToMember(slot.member_wallet);
                }
              }}
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
const OriginalMatrixView: React.FC<{ 
  currentWallet: string;
  onNavigateToMember?: (memberWallet: string) => void;
}> = ({ currentWallet, onNavigateToMember }) => {
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
                className={`border rounded p-4 min-h-[200px] transition-all cursor-pointer ${
                  isSpillover 
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                }`}
                onClick={() => {
                  if (member.wallet && onNavigateToMember) {
                    console.log('🏠 Original matrix navigating to:', member.wallet);
                    onNavigateToMember(member.wallet);
                  }
                }}
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
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['0x0F5adA73e94867a678347D6c2284dBa565489183']);
  
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

  // 导航功能
  const navigateToMember = (memberWallet: string) => {
    if (memberWallet !== currentWallet) {
      // 添加到导航历史
      setNavigationHistory(prev => [...prev, memberWallet]);
      setCurrentWallet(memberWallet);
      console.log('🔄 Navigating to member:', memberWallet, 'History:', [...navigationHistory, memberWallet]);
    }
  };

  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousWallet = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentWallet(previousWallet);
      console.log('⬅️ Navigating back to:', previousWallet, 'History:', newHistory);
    }
  };

  const resetToRoot = () => {
    const rootWallet = navigationHistory[0];
    setNavigationHistory([rootWallet]);
    setCurrentWallet(rootWallet);
    console.log('🏠 Reset to root:', rootWallet);
  };

  // Define currentUser for InteractiveMatrixView
  const currentUser = {
    username: userStatus?.username || '测试用户',
    currentLevel: userStatus?.currentLevel || 1
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CubeIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">矩阵排位查询中心</h1>
            <div className="flex gap-2">
              <Badge className="bg-green-500 text-white">📱 移动端新增</Badge>
              <Badge className="bg-purple-500 text-white">🎨 现代化设计</Badge>
              <Badge className="bg-blue-500 text-white">🔍 排位查询</Badge>
            </div>
          </div>
          <p className="text-gray-600">输入任意钱包地址，查询该地址在矩阵系统中的排位情况 - 支持多种矩阵组件视图</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧：钱包选择器 */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>矩阵排位查询设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 导航控制 */}
                {navigationHistory.length > 1 && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">🧭 矩阵导航</div>
                    <div className="space-y-2">
                      <div className="text-xs text-blue-700">
                        当前位置: {formatWallet(currentWallet)}
                      </div>
                      <div className="text-xs text-blue-600">
                        导航层级: {navigationHistory.length} 层深
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={navigateBack}
                          disabled={navigationHistory.length <= 1}
                          className="flex-1 text-xs"
                        >
                          ⬅️ 返回上层
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetToRoot}
                          disabled={navigationHistory.length <= 1}
                          className="flex-1 text-xs"
                        >
                          🏠 回到根节点
                        </Button>
                      </div>
                      {/* 导航路径显示 */}
                      <div className="text-xs text-blue-600">
                        <div className="font-medium mb-1">导航路径:</div>
                        <div className="space-y-1">
                          {navigationHistory.map((wallet, index) => (
                            <div 
                              key={index} 
                              className={`flex items-center gap-1 ${
                                index === navigationHistory.length - 1 ? 'font-medium text-blue-800' : 'text-blue-600'
                              }`}
                            >
                              <span>{'  '.repeat(index)}├─</span>
                              <span className="font-mono text-xs">{formatWallet(wallet)}</span>
                              {index === navigationHistory.length - 1 && <span className="text-blue-500">📍</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 连接的钱包 */}
                {walletAddress && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">🔗 已连接钱包</div>
                    <div className="text-xs font-mono text-green-700">{formatWallet(walletAddress)}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => {
                        setCurrentWallet(walletAddress);
                        setNavigationHistory([walletAddress]);
                      }}
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
                        onClick={() => {
                          setCurrentWallet(wallet.address);
                          setNavigationHistory([wallet.address]);
                        }}
                      >
                        <div className="text-sm font-medium text-gray-800">{wallet.name}</div>
                        <div className="text-xs font-mono text-gray-600">{formatWallet(wallet.address)}</div>
                        <div className="text-xs text-gray-500 mt-1">{wallet.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 矩阵排位查询 */}
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">🔍 矩阵排位查询</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-blue-700 mb-1 block">查询地址:</label>
                      <input
                        type="text"
                        value={currentWallet}
                        onChange={(e) => setCurrentWallet(e.target.value)}
                        placeholder="输入钱包地址查询其矩阵排位..."
                        className="w-full p-2 border rounded text-xs font-mono"
                      />
                    </div>
                    <div className="text-xs text-blue-600">
                      💡 输入任何钱包地址，查看该地址在所有矩阵组件中的排位情况
                    </div>
                  </div>
                </div>

                {/* 快速地址输入 */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">快速输入:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const testWallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';
                        setCurrentWallet(testWallet);
                        setNavigationHistory([testWallet]);
                      }}
                      className="text-xs"
                    >
                      10层测试
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const testWallet = '0x0F5adA73e94867a678347D6c2284dBa565489183';
                        setCurrentWallet(testWallet);
                        setNavigationHistory([testWallet]);
                      }}
                      className="text-xs"
                    >
                      基础测试
                    </Button>
                  </div>
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

          {/* 右侧：矩阵显示 - 用Tabs展示所有组件 */}
          <div className="xl:col-span-2">
            <Tabs defaultValue="position-query" className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 text-xs">
                <TabsTrigger value="position-query">🔍排位查询</TabsTrigger>
                <TabsTrigger value="interactive">🎯交互式</TabsTrigger>
                <TabsTrigger value="mobile">🏢Referrals矩阵</TabsTrigger>
                <TabsTrigger value="modern">🎨现代化</TabsTrigger>
                <TabsTrigger value="detailed-slots">📋详细Slots</TabsTrigger>
                <TabsTrigger value="original">🏠原始视图</TabsTrigger>
                <TabsTrigger value="enhanced">⚡增强视图</TabsTrigger>
                <TabsTrigger value="drill-down">🎯钻取视图</TabsTrigger>
                <TabsTrigger value="stats">📊统计视图</TabsTrigger>
                <TabsTrigger value="components">🧩所有组件</TabsTrigger>
              </TabsList>
              
              {/* 矩阵排位查询 - 新增 */}
              <TabsContent value="position-query">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-blue-800">🔍 矩阵排位查询</h3>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">核心功能</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        <strong>功能说明:</strong> 输入任意钱包地址，查询该地址在整个矩阵系统中的排位情况
                      </p>
                      <div className="text-xs text-blue-600 space-y-1">
                        <div>• 🎯 显示在哪些矩阵中有排位</div>
                        <div>• 📍 显示具体层级和位置(L/M/R)</div>
                        <div>• 🔄 区分直推和滑落排位</div>
                        <div>• 📊 统计总体排位数据</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <MatrixPositionQuery queryWallet={currentWallet} />
                </div>
              </TabsContent>
              
              {/* 交互式矩阵视图 - 新增 */}
              <TabsContent value="interactive">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-blue-800">🎯 交互式矩阵视图</h3>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">推荐使用</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        <strong>特色功能:</strong> 点击任意成员节点可切换到该成员作为根节点的视图，支持导航历史和快速返回
                      </p>
                      <div className="text-xs text-blue-600 space-y-1">
                        <div>• 🖱️ 点击成员卡片切换根节点</div>
                        <div>• 📍 显示下级节点占用状态</div>
                        <div>• 🔄 支持返回上级和回到根节点</div>
                        <div>• 📋 完整的导航路径追踪</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <InteractiveMatrixView 
                    rootWalletAddress={currentWallet}
                    rootUser={currentUser}
                    onNavigateToMember={navigateToMember}
                  />
                </div>
              </TabsContent>
              
              {/* Referrals界面矩阵组件 - 真实生产环境组件 */}
              <TabsContent value="mobile">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🏢</span>
                        <h3 className="text-lg font-semibold text-green-800">Referrals界面矩阵组件</h3>
                      </div>
                      <p className="text-sm text-green-700">真实生产环境使用的矩阵组件，包含钻取视图和层级统计</p>
                    </CardContent>
                  </Card>
                  
                  {/* 矩阵层级统计 */}
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">矩阵层级统计视图</h4>
                    <MatrixLayerStatsView 
                      rootWalletAddress={currentWallet}
                    />
                  </div>
                  
                  {/* 钻取矩阵视图 */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">钻取矩阵视图</h4>
                    <DrillDownMatrixView 
                      rootWalletAddress={currentWallet}
                      rootUser={{ username: currentUser.username, currentLevel: currentUser.currentLevel }}
                      onNavigateToMember={navigateToMember}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* 现代化设计组件 - 新增 */}
              <TabsContent value="modern">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-purple-50 to-pink-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎨</span>
                        <h3 className="text-lg font-semibold text-purple-800">现代化高端设计</h3>
                      </div>
                      <p className="text-sm text-purple-700">glassmorphism风格，高端视觉效果和丰富交互</p>
                    </CardContent>
                  </Card>
                  <ModernMatrixView 
                    rootWalletAddress={currentWallet}
                    rootUser={{ username: '测试用户', currentLevel: 2 }}
                    onNavigateToMember={navigateToMember}
                  />
                </div>
              </TabsContent>
              
              {/* 详细Slots视图 - 新增，显示正确的滑落层级 */}
              <TabsContent value="detailed-slots">
                <DetailedMatrixSlotsView 
                  currentWallet={currentWallet} 
                  onNavigateToMember={navigateToMember}
                />
              </TabsContent>
              
              {/* 原始简洁视图 */}
              <TabsContent value="original">
                <OriginalMatrixView 
                  currentWallet={currentWallet} 
                  onNavigateToMember={navigateToMember}
                />
              </TabsContent>
              
              {/* 增强矩阵视图 */}
              <TabsContent value="enhanced">
                <EnhancedMatrixView 
                  rootWalletAddress={currentWallet}
                  onNavigateToMember={navigateToMember}
                />
              </TabsContent>
              
              {/* 钻取矩阵视图 */}
              <TabsContent value="drill-down">
                <DrillDownMatrixView 
                  rootWalletAddress={currentWallet}
                  onNavigateToMember={navigateToMember}
                />
              </TabsContent>
              
              {/* 统计视图 */}
              <TabsContent value="stats">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MatrixNetworkStatsV2 walletAddress={currentWallet} />
                  <DirectMatrixStatsView walletAddress={currentWallet} />
                </div>
              </TabsContent>
              
              {/* 所有组件展示 */}
              <TabsContent value="components">
                <div className="space-y-6">
                  {/* 第一行：递归视图和层级视图 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">递归矩阵视图</h3>
                      <RecursiveMatrixViewer 
                        walletAddress={currentWallet}
                        maxDepth={3}
                        onNavigateToMember={navigateToMember}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">层级矩阵视图</h3>
                      <LayeredMatrixView 
                        matrixRootWallet={currentWallet}
                        onNavigateToMember={navigateToMember}
                      />
                    </div>
                  </div>
                  
                  {/* 第二行：简单视图和层级状态 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">简单矩阵视图</h3>
                      <SimpleMatrixView 
                        rootWalletAddress={currentWallet}
                        onNavigateToMember={navigateToMember}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">层级状态卡片</h3>
                      <LayerLevelStatusCard 
                        rootWalletAddress={currentWallet}
                        maxLayers={5}
                      />
                    </div>
                  </div>
                  
                  {/* 第三行：统计组件 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">矩阵层级统计</h3>
                      <MatrixLayerStats rootWalletAddress={currentWallet} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">层级统计视图</h3>
                      <MatrixLayerStatsView rootWalletAddress={currentWallet} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">直推统计视图</h3>
                      <DirectMatrixStatsView walletAddress={currentWallet} />
                    </div>
                  </div>
                  
                  {/* 第四行：网络统计 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">网络统计 V2</h3>
                    <MatrixNetworkStatsV2 walletAddress={currentWallet} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixTestPage;