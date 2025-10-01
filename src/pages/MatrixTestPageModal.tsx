import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
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
import MobileMatrixView from '../components/matrix/MobileMatrixView';
import ModernMatrixView from '../components/matrix/ModernMatrixView';
// import InteractiveMatrixView from '../components/matrix/InteractiveMatrixView';

// 详细Slots视图组件 - 内联实现
const DetailedMatrixSlotsView: React.FC<{ currentWallet: string }> = ({ currentWallet }) => {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWallet) {
      loadMatrixData();
    }
  }, [currentWallet]);

  const loadMatrixData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/matrix`, {
        method: 'POST',
        headers: {
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
    } catch (error: any) {
      setError(error.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            正在加载矩阵详细数据...
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
            加载失败: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData?.layer1Matrix) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            没有找到矩阵数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 详细Slots矩阵视图</span>
          <Badge>{matrixData.layer1Matrix.filter((n: any) => n.member).length}/3</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* L M R 矩阵 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {matrixData.layer1Matrix.map((node: any, index: number) => {
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

// 原始视图组件 - 内联实现
const OriginalMatrixView: React.FC<{ currentWallet: string }> = ({ currentWallet }) => {
  const { data: matrixData, isLoading, error } = useLayeredMatrix(currentWallet, 1);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            加载中...
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
            加载失败: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMatrix = matrixData?.currentLayerMatrix || matrixData?.layer1Matrix || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏠 原始视图</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['L', 'M', 'R'].map(position => {
            const node = currentMatrix.find((n: any) => n.position === position);
            const member = node?.member;
            
            if (!member) {
              return (
                <div key={position} className="border border-gray-300 rounded p-4 bg-gray-50 text-center min-h-[150px] flex items-center justify-center">
                  <div>
                    <div className="text-lg font-bold text-gray-500 mb-2">{position}</div>
                    <div className="text-sm text-gray-400">空位</div>
                  </div>
                </div>
              );
            }

            const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
            
            return (
              <div 
                key={position}
                className={`border rounded p-4 min-h-[150px] ${
                  isSpillover 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-700 mb-2">{position}</div>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                    isSpillover 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isSpillover ? '滑落' : '直推'}
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {member.username || `User${member.wallet.slice(-4)}`}
                  </div>
                  <div className="text-xs text-gray-600 font-mono">
                    {member.wallet.slice(0, 6)}...{member.wallet.slice(-4)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const MatrixTestPageModal: React.FC = () => {
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
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">矩阵测试中心</h1>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-500 text-white">📱 移动端新增</Badge>
              <Badge className="bg-purple-500 text-white">🎨 现代化设计</Badge>
              <Badge className="bg-blue-500 text-white">🔧 弹窗模式</Badge>
            </div>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">测试和对比不同的3x3矩阵组件 - 现在使用弹窗模式展示，更好的响应式体验</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：钱包选择器 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">测试钱包选择</CardTitle>
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
              </CardContent>
            </Card>
          </div>

          {/* 右侧：矩阵显示 - 用弹窗展示所有组件 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>矩阵组件展示</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {/* 交互式矩阵视图 - 暂时禁用 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2" disabled>
                        <span className="text-xl">🎯</span>
                        <span>交互式(暂停)</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🎯 交互式矩阵视图</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-yellow-50 rounded border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            交互式矩阵视图暂时禁用，请使用其他视图组件。
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* 移动端优化组件 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">📱</span>
                        <span>移动端</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>📱 移动端优化矩阵组件</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-green-50 rounded border-green-200">
                          <p className="text-sm text-green-700">专为移动设备优化，触摸友好的3x3矩阵展示</p>
                        </div>
                        <MobileMatrixView 
                          rootWalletAddress={currentWallet}
                          rootUser={{ username: '测试用户', currentLevel: 2 }}
                          onNavigateToMember={(memberWallet) => {
                            console.log('Navigate to:', memberWallet);
                            alert(`导航到成员: ${memberWallet.slice(0, 6)}...${memberWallet.slice(-4)}`);
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* 现代化设计组件 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">🎨</span>
                        <span>现代化</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🎨 现代化高端设计</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-purple-50 rounded border-purple-200">
                          <p className="text-sm text-purple-700">glassmorphism风格，高端视觉效果和丰富交互</p>
                        </div>
                        <ModernMatrixView 
                          rootWalletAddress={currentWallet}
                          rootUser={{ username: '测试用户', currentLevel: 2 }}
                          onNavigateToMember={(memberWallet) => {
                            console.log('Navigate to:', memberWallet);
                            alert(`导航到成员: ${memberWallet.slice(0, 6)}...${memberWallet.slice(-4)}`);
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* 详细Slots视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">🔍</span>
                        <span>详细Slots</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🔍 详细Slots视图</DialogTitle>
                      </DialogHeader>
                      <DetailedMatrixSlotsView currentWallet={currentWallet} />
                    </DialogContent>
                  </Dialog>

                  {/* 原始视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">🏠</span>
                        <span>原始视图</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🏠 原始视图</DialogTitle>
                      </DialogHeader>
                      <OriginalMatrixView currentWallet={currentWallet} />
                    </DialogContent>
                  </Dialog>

                  {/* 增强视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">⚡</span>
                        <span>增强视图</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>⚡ 增强视图</DialogTitle>
                      </DialogHeader>
                      <EnhancedMatrixView rootWalletAddress={currentWallet} />
                    </DialogContent>
                  </Dialog>

                  {/* 钻取视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">🔗</span>
                        <span>钻取视图</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🔗 钻取视图</DialogTitle>
                      </DialogHeader>
                      <DrillDownMatrixView 
                        rootWalletAddress={currentWallet}
                        onNavigateToMember={(memberWallet) => setCurrentWallet(memberWallet)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* 统计视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">📊</span>
                        <span>统计视图</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>📊 统计视图</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MatrixNetworkStatsV2 walletAddress={currentWallet} />
                        <DirectMatrixStatsView walletAddress={currentWallet} />
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* 简单视图 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">📋</span>
                        <span>简单视图</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>📋 简单视图</DialogTitle>
                      </DialogHeader>
                      <SimpleMatrixView rootWalletAddress={currentWallet} />
                    </DialogContent>
                  </Dialog>

                  {/* 所有组件 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 text-xs p-2">
                        <span className="text-xl">🧩</span>
                        <span>所有组件</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>🧩 所有组件</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* 第一行：递归视图和层级视图 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">递归矩阵视图</h3>
                            <RecursiveMatrixViewer 
                              walletAddress={currentWallet}
                              maxDepth={3}
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-3">层级矩阵视图</h3>
                            <LayeredMatrixView rootWalletAddress={currentWallet} />
                          </div>
                        </div>
                        
                        {/* 第二行：层级状态 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">层级状态卡片</h3>
                            <LayerLevelStatusCard 
                              rootWalletAddress={currentWallet}
                              maxLayers={5}
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-3">矩阵层级统计</h3>
                            <MatrixLayerStats rootWalletAddress={currentWallet} />
                          </div>
                        </div>
                        
                        {/* 第三行：统计组件 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">层级统计视图</h3>
                            <MatrixLayerStatsView rootWalletAddress={currentWallet} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-3">直推统计视图</h3>
                            <DirectMatrixStatsView walletAddress={currentWallet} />
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixTestPageModal;