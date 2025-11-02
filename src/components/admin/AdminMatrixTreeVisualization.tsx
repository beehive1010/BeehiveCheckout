import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Crown,
  User,
  CheckCircle,
  XCircle,
  ArrowDown,
  Layers,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';

// 数据类型定义
interface MatrixMember {
  wallet: string;
  username?: string;
  level: number;
  activationSequence: number;
  isActivated: boolean;
  slot?: string;  // L, M, R
  layer: number;
  referralType: string; // direct, spillover
  activationTime?: string;
  parentWallet?: string;
}

interface MatrixNodeData {
  member: MatrixMember;
  children: {
    L?: MatrixMember;
    M?: MatrixMember;
    R?: MatrixMember;
  };
  childrenLoaded: boolean;
  isExpanded: boolean;
}

interface AdminMatrixTreeVisualizationProps {
  initialWallet?: string;
  maxAutoExpandLayers?: number; // 自动展开的层数
  compact?: boolean;
}

export function AdminMatrixTreeVisualization({
  initialWallet,
  maxAutoExpandLayers = 3,
  compact = false
}: AdminMatrixTreeVisualizationProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // 状态管理
  const [searchInput, setSearchInput] = useState(initialWallet || '');
  const [rootWallet, setRootWallet] = useState<string | null>(initialWallet || null);
  const [treeData, setTreeData] = useState<Map<string, MatrixNodeData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>(isMobile ? 'compact' : 'detailed');

  // 从数据库加载会员信息
  const loadMemberInfo = async (wallet: string): Promise<MatrixMember | null> => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select(`
          wallet_address,
          current_level,
          activation_sequence,
          users!inner(username)
        `)
        .eq('wallet_address', wallet)
        .single();

      if (memberError || !memberData) {
        console.error('Member not found:', wallet);
        return null;
      }

      return {
        wallet: memberData.wallet_address,
        username: (memberData.users as any)?.username || 'Unknown',
        level: memberData.current_level,
        activationSequence: memberData.activation_sequence,
        isActivated: true,
        layer: 0,
        referralType: 'direct'
      };
    } catch (error) {
      console.error('Error loading member info:', error);
      return null;
    }
  };

  // 从数据库加载节点的子节点
  const loadNodeChildren = async (
    parentWallet: string,
    matrixRoot: string
  ): Promise<{ L?: MatrixMember; M?: MatrixMember; R?: MatrixMember }> => {
    try {
      console.log(`📊 Loading children for: ${parentWallet} (root: ${matrixRoot})`);

      // ✅ 查询 members 表获取该节点的3个子位置
      const { data: childrenData, error } = await supabase
        .from('members')
        .select(`
          wallet_address,
          parent_wallet,
          referrer_wallet,
          position,
          layer_level,
          activation_time
        `)
        .eq('matrix_root_wallet', matrixRoot)
        .eq('parent_wallet', parentWallet)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error loading children:', error);
        return {};
      }

      if (!childrenData || childrenData.length === 0) {
        console.log(`No children found for ${parentWallet}`);
        return {};
      }

      // ✅ 获取子节点的用户详细信息
      const childWallets = childrenData.map(c => c.wallet_address);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('wallet_address, username')
        .in('wallet_address', childWallets);

      if (usersError) {
        console.error('Error loading user details:', usersError);
      }

      // 构建用户详情映射
      const usersMap = new Map(
        usersData?.map(u => [
          u.wallet_address,
          {
            username: u.username || 'Unknown'
          }
        ]) || []
      );

      // 组织成 L, M, R 格式
      const children: { L?: MatrixMember; M?: MatrixMember; R?: MatrixMember } = {};

      childrenData.forEach(child => {
        const userDetails = usersMap.get(child.wallet_address);
        const referralType = child.parent_wallet?.toLowerCase() === child.referrer_wallet?.toLowerCase()
          ? 'direct'
          : 'spillover';

        const position = child.position as 'L' | 'M' | 'R';
        children[position] = {
          wallet: child.wallet_address,
          username: userDetails?.username || `User${child.wallet_address.slice(-4)}`,
          level: 1, // Level info not directly available in this query
          activationSequence: 0, // Sequence not needed here
          isActivated: true,
          slot: child.position,
          layer: child.layer_level,
          referralType: referralType,
          activationTime: child.activation_time,
          parentWallet: child.parent_wallet
        };
      });

      console.log(`✅ Loaded ${Object.keys(children).length} children for ${parentWallet}`);
      return children;

    } catch (error) {
      console.error('Error in loadNodeChildren:', error);
      return {};
    }
  };

  // 搜索并加载根节点
  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      toast({
        title: '输入错误',
        description: '请输入有效的钱包地址',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // 加载根节点会员信息
      const rootMember = await loadMemberInfo(searchInput);

      if (!rootMember) {
        toast({
          title: '未找到',
          description: '该钱包地址不存在于系统中',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // ✅ 获取该会员的矩阵根（从members表）
      const { data: matrixRootData } = await supabase
        .from('members')
        .select('matrix_root_wallet')
        .eq('wallet_address', searchInput)
        .order('layer_level', { ascending: true })
        .limit(1);

      const matrixRoot = matrixRootData?.[0]?.matrix_root_wallet || searchInput;

      // 设置根节点
      setRootWallet(searchInput);

      // 加载根节点的子节点
      const children = await loadNodeChildren(searchInput, matrixRoot);

      // 初始化树数据
      const newTreeData = new Map<string, MatrixNodeData>();
      newTreeData.set(searchInput, {
        member: rootMember,
        children,
        childrenLoaded: true,
        isExpanded: true
      });

      setTreeData(newTreeData);

      toast({
        title: '加载成功',
        description: `已加载 ${rootMember.username} 的矩阵树`,
      });

    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: '搜索失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [searchInput, toast]);

  // 切换节点展开/折叠
  const toggleNode = async (wallet: string) => {
    const nodeData = treeData.get(wallet);
    if (!nodeData) return;

    // 如果已经展开，折叠它
    if (nodeData.isExpanded) {
      const newTreeData = new Map(treeData);
      newTreeData.set(wallet, {
        ...nodeData,
        isExpanded: false
      });
      setTreeData(newTreeData);
      return;
    }

    // 如果未展开，展开它
    // 如果子节点未加载，先加载
    if (!nodeData.childrenLoaded) {
      // ✅ 获取矩阵根（从members表）
      const { data: matrixRootData } = await supabase
        .from('members')
        .select('matrix_root_wallet')
        .eq('wallet_address', wallet)
        .order('layer_level', { ascending: true })
        .limit(1);

      const matrixRoot = matrixRootData?.[0]?.matrix_root_wallet || rootWallet || wallet;

      // 加载子节点
      const children = await loadNodeChildren(wallet, matrixRoot);

      const newTreeData = new Map(treeData);
      newTreeData.set(wallet, {
        ...nodeData,
        children,
        childrenLoaded: true,
        isExpanded: true
      });
      setTreeData(newTreeData);
    } else {
      // 子节点已加载，只需展开
      const newTreeData = new Map(treeData);
      newTreeData.set(wallet, {
        ...nodeData,
        isExpanded: true
      });
      setTreeData(newTreeData);
    }
  };

  // 递归展开所有节点到指定层级
  const expandAllToLayer = async (wallet: string, currentLayer: number, maxLayer: number) => {
    if (currentLayer >= maxLayer) return;

    const nodeData = treeData.get(wallet);
    if (!nodeData) return;

    // 展开当前节点
    await toggleNode(wallet);

    // 递归展开子节点
    const { L, M, R } = nodeData.children;
    const childPromises = [];

    if (L) childPromises.push(expandAllToLayer(L.wallet, currentLayer + 1, maxLayer));
    if (M) childPromises.push(expandAllToLayer(M.wallet, currentLayer + 1, maxLayer));
    if (R) childPromises.push(expandAllToLayer(R.wallet, currentLayer + 1, maxLayer));

    await Promise.all(childPromises);
  };

  // 导出矩阵树数据为JSON
  const exportTreeData = () => {
    const exportData = {
      root: rootWallet,
      timestamp: new Date().toISOString(),
      tree: Array.from(treeData.entries()).map(([wallet, data]) => ({
        wallet,
        member: data.member,
        children: data.children,
        isExpanded: data.isExpanded
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `matrix_tree_${rootWallet}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // 渲染单个节点
  const renderNode = (member: MatrixMember, depth: number = 0): JSX.Element => {
    const nodeData = treeData.get(member.wallet);
    const isExpanded = nodeData?.isExpanded || false;
    const children = nodeData?.children || {};
    const hasChildren = Object.keys(children).length > 0;
    const childrenCount = Object.values(children).filter(Boolean).length;

    return (
      <div key={member.wallet} className="ml-4">
        {/* 节点本身 - 响应式布局 */}
        <div className={`
          flex items-center gap-2 ${isMobile ? 'p-2' : 'p-3'} rounded-lg border-2 transition-all duration-200
          ${depth === 0 ? 'bg-honey/10 border-honey' : 'bg-card border-border hover:border-honey/50'}
          ${isExpanded ? 'shadow-lg' : 'shadow-sm'}
          group hover:shadow-xl
        `}>
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} p-0 hover:bg-honey/20 flex-shrink-0`}
            onClick={() => toggleNode(member.wallet)}
          >
            {isExpanded ? (
              <ChevronDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-honey`} />
            ) : (
              <ChevronRight className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
            )}
          </Button>

          {/* 会员图标 - 移动端缩小 */}
          <div className={`
            flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex-shrink-0
            ${depth === 0 ? 'bg-honey text-black' : 'bg-blue-500/20 text-blue-400'}
          `}>
            {depth === 0 ? (
              <Crown className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            ) : (
              <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            )}
          </div>

          {/* 会员信息 - 移动端紧凑 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`font-bold truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                {member.username}
              </span>
              <Badge variant="outline" className={`${isMobile ? 'text-[10px] px-1' : 'text-xs'}`}>
                L{member.level}
              </Badge>
              {!isMobile && (
                <Badge variant="secondary" className="text-xs">
                  #{member.activationSequence}
                </Badge>
              )}
              {member.isActivated ? (
                <CheckCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-green-500 flex-shrink-0`} />
              ) : (
                <XCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-500 flex-shrink-0`} />
              )}
              {member.slot && (
                <Badge variant="default" className={`${isMobile ? 'text-[10px] px-1' : 'text-xs'} bg-purple-500`}>
                  {member.slot}
                </Badge>
              )}
              {member.referralType === 'spillover' && !isMobile && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                  滑落
                </Badge>
              )}
            </div>
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-0.5 font-mono`}>
              {isMobile ?
                `${member.wallet.slice(0, 6)}...${member.wallet.slice(-4)}` :
                `${member.wallet.slice(0, 8)}...${member.wallet.slice(-6)}`
              }
            </p>
          </div>

          {/* 子节点统计 */}
          {hasChildren && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant={childrenCount === 3 ? "default" : "secondary"}
                className={`${isMobile ? 'text-[10px] px-1' : 'text-xs'} ${childrenCount === 3 ? 'bg-green-500' : ''}`}
              >
                {childrenCount}/3
              </Badge>
            </div>
          )}
        </div>

        {/* 子节点 - 响应式布局: 移动端垂直，桌面端3列 */}
        {isExpanded && hasChildren && (
          <div className={`${isMobile ? 'ml-4 mt-2 pl-2' : 'ml-8 mt-3 pl-4'} border-l-2 border-honey/30`}>
            <div className={`grid grid-cols-1 md:grid-cols-3 ${isMobile ? 'gap-2' : 'gap-4'}`}>
              {(['L', 'M', 'R'] as const).map(position => {
                const child = children[position];
                return (
                  <div key={position} className="relative">
                    <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-muted-foreground ${isMobile ? 'mb-1' : 'mb-2'} flex items-center gap-1`}>
                      <Layers className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                      {isMobile ? position : `Position ${position}`}
                    </div>
                    {child ? (
                      renderNode(child, depth + 1)
                    ) : (
                      <div className={`${isMobile ? 'p-2' : 'p-3'} border-2 border-dashed border-muted-foreground/30 rounded-lg text-center`}>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground italic`}>空位</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 初始化：如果提供了initialWallet，自动搜索
  useEffect(() => {
    if (initialWallet && !rootWallet) {
      setSearchInput(initialWallet);
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWallet]);

  return (
    <div className="space-y-4">
      {/* 搜索栏 - 响应式 */}
      <Card>
        <CardHeader className={isMobile ? 'p-4' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <Search className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            {isMobile ? '搜索矩阵树' : '搜索会员矩阵树'}
          </CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>
            {isMobile ? '输入钱包地址查看矩阵树' : '输入任意会员钱包地址，查看其完整的3×3矩阵树形结构'}
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'p-4 pt-0' : ''}>
          <div className="flex gap-2">
            <Input
              placeholder={isMobile ? '0x1234...' : '输入钱包地址（例如：0x1234...）'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className={`flex-1 ${isMobile ? 'text-sm' : ''}`}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchInput.trim()}
              size={isMobile ? 'sm' : 'default'}
            >
              {loading ? (
                <RefreshCw className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'} animate-spin`} />
              ) : (
                <Search className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-2'}`} />
              )}
              {!isMobile && '搜索'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 矩阵树展示 - 响应式 */}
      {rootWallet && (
        <Card>
          <CardHeader className={isMobile ? 'p-4' : ''}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <Crown className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
                {isMobile ? '矩阵树' : '矩阵树形结构'}
                <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
                  {treeData.get(rootWallet)?.member.username}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
                  className={isMobile ? 'px-2' : ''}
                >
                  {viewMode === 'compact' ? (
                    <Maximize2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-1'}`} />
                  ) : (
                    <Minimize2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-1'}`} />
                  )}
                  {!isMobile && (viewMode === 'compact' ? '详细' : '紧凑')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTreeData}
                  className={isMobile ? 'px-2' : ''}
                >
                  <Download className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 mr-1'}`} />
                  {!isMobile && '导出'}
                </Button>
              </div>
            </div>
            <CardDescription className={isMobile ? 'text-xs mt-1' : ''}>
              {isMobile ? '点击箭头展开 | L/M/R' : '点击节点前的箭头展开/折叠子节点 | L=左, M=中, R=右'}
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4 pt-0' : ''}>
            <div className={`${isMobile ? 'max-h-[600px]' : 'max-h-[800px]'} overflow-y-auto ${viewMode === 'compact' ? 'text-sm' : ''}`}>
              {treeData.get(rootWallet) && renderNode(treeData.get(rootWallet)!.member)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!rootWallet && !loading && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Crown className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">输入钱包地址开始查看矩阵树</p>
              <p className="text-sm mt-2">支持展开查看完整的19层3×3矩阵结构</p>
              <div className="mt-6 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>已激活</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>未激活</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="default" className="text-xs bg-purple-500">L/M/R</Badge>
                  <span>矩阵位置</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-honey" />
              <p className="text-muted-foreground">正在加载矩阵数据...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminMatrixTreeVisualization;
