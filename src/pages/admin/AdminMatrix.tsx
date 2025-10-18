import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Users, 
  UserCheck,
  Search,
  Crown,
  TreePine,
  Network,
  Calendar,
  Eye,
  RotateCcw,
  Download,
  Filter,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';

// 接口定义
interface MemberInfo {
  wallet_address: string;
  username?: string;
  email?: string;
  current_level: number;
  referrer_wallet?: string;
  activation_sequence: number;
  activation_time: string;
  total_nft_claimed: number;
  is_activated: boolean;
}

interface MatrixInfo {
  member_wallet: string;
  member_username?: string;
  matrix_root_wallet: string;
  root_username?: string;
  matrix_layer: number;
  matrix_position: string;
  member_activation_sequence: number;
  is_direct_referral: boolean;
  is_spillover_placement: boolean;
  placed_at: string;
}

interface MatrixStats {
  total_members: number;
  activated_members: number;
  total_matrices: number;
  avg_matrix_depth: number;
  incomplete_matrices: number;
}

export default function AdminMatrix() {
  const { hasPermission, isAdminAuthenticated, isLoading: authLoading } = useAdminAuthContext();
  const { toast } = useToast();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  
  // 数据状态
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [matrixData, setMatrixData] = useState<MatrixInfo[]>([]);
  const [matrixStats, setMatrixStats] = useState<MatrixStats | null>(null);
  const [memberMatrix, setMemberMatrix] = useState<MatrixInfo[]>([]);

  // 加载所有会员数据
  const loadMembersData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading.tsx members data...');
      
      // 获取所有会员信息，包括用户名
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          wallet_address,
          current_level,
          referrer_wallet,
          activation_sequence,
          activation_time,
          total_nft_claimed,
          users!inner(username, email)
        `)
        .order('activation_sequence', { ascending: true });

      if (membersError) {
        throw membersError;
      }

      const formattedMembers = membersData?.map(member => ({
        wallet_address: member.wallet_address,
        username: (member.users as any)?.username || 'Unknown',
        email: (member.users as any)?.email,
        current_level: member.current_level,
        referrer_wallet: member.referrer_wallet,
        activation_sequence: member.activation_sequence,
        activation_time: member.activation_time,
        total_nft_claimed: member.total_nft_claimed || 0,
        is_activated: true
      })) || [];

      setMembers(formattedMembers);
      console.log(`✅ Loaded ${formattedMembers.length} members`);

    } catch (error: any) {
      console.error('❌ Error loading members:', error);
      toast({
        title: "加载失败",
        description: `无法加载会员数据: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载矩阵数据
  const loadMatrixData = async () => {
    try {
      console.log('🔍 Loading matrix data...');

      // 获取所有矩阵关系 (使用正确的表名 matrix_referrals)
      const { data: matrixData, error: matrixError } = await supabase
        .from('matrix_referrals')
        .select(`
          member_wallet,
          matrix_root_wallet,
          layer,
          position,
          referral_type,
          source,
          created_at
        `)
        .order('created_at', { ascending: true });

      if (matrixError) {
        throw matrixError;
      }

      // 获取用户名映射
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('wallet_address, username');

      if (usersError) {
        throw usersError;
      }

      const usernameMap = new Map(usersData?.map(user => [user.wallet_address, user.username]) || []);

      // 获取会员激活序列映射（直接查询，不依赖状态）
      const { data: membersData } = await supabase
        .from('members')
        .select('wallet_address, activation_sequence');

      const memberSequenceMap = new Map(
        membersData?.map(m => [m.wallet_address, m.activation_sequence]) || []
      );

      const formattedMatrix = matrixData?.map(matrix => ({
        member_wallet: matrix.member_wallet,
        member_username: usernameMap.get(matrix.member_wallet) || 'Unknown',
        matrix_root_wallet: matrix.matrix_root_wallet,
        root_username: usernameMap.get(matrix.matrix_root_wallet) || 'Unknown',
        matrix_layer: matrix.layer,
        matrix_position: matrix.position,
        member_activation_sequence: memberSequenceMap.get(matrix.member_wallet) || 0,
        is_direct_referral: matrix.referral_type === 'direct',
        is_spillover_placement: matrix.source === 'spillover' || matrix.referral_type === 'spillover',
        placed_at: matrix.created_at
      })) || [];

      setMatrixData(formattedMatrix);
      console.log(`✅ Loaded ${formattedMatrix.length} matrix relationships`);

    } catch (error: any) {
      console.error('❌ Error loading matrix data:', error);
      toast({
        title: "加载失败",
        description: `无法加载矩阵数据: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // 加载矩阵统计
  const loadMatrixStats = async () => {
    try {
      // 计算基本统计
      const totalMembers = members.length;
      const activatedMembers = members.filter(m => m.is_activated).length;
      const uniqueRoots = new Set(matrixData.map(m => m.matrix_root_wallet)).size;
      
      // 计算平均矩阵深度
      const layerStats = new Map<string, number>();
      matrixData.forEach(m => {
        const current = layerStats.get(m.matrix_root_wallet) || 0;
        layerStats.set(m.matrix_root_wallet, Math.max(current, m.matrix_layer));
      });
      
      const avgDepth = Array.from(layerStats.values()).reduce((sum, depth) => sum + depth, 0) / layerStats.size || 0;

      setMatrixStats({
        total_members: totalMembers,
        activated_members: activatedMembers,
        total_matrices: uniqueRoots,
        avg_matrix_depth: Math.round(avgDepth * 10) / 10,
        incomplete_matrices: uniqueRoots - Math.floor(avgDepth)
      });

    } catch (error: any) {
      console.error('❌ Error calculating matrix stats:', error);
    }
  };

  // 加载特定成员的矩阵
  const loadMemberMatrix = async (walletAddress: string) => {
    try {
      console.log(`🔍 Loading matrix for member: ${walletAddress}`);
      
      const memberMatrixData = matrixData.filter(m => m.matrix_root_wallet === walletAddress);
      setMemberMatrix(memberMatrixData);

    } catch (error: any) {
      console.error('❌ Error loading member matrix:', error);
    }
  };

  // 初始化数据加载
  useEffect(() => {
    if (isAdminAuthenticated && !authLoading && hasPermission('matrix.read')) {
      loadMembersData();
      loadMatrixData();
    }
  }, [isAdminAuthenticated, authLoading, hasPermission]);

  useEffect(() => {
    if (members.length > 0 && matrixData.length > 0) {
      loadMatrixStats();
    }
  }, [members, matrixData]);

  // 筛选数据
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchTerm || 
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.wallet_address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || member.current_level.toString() === filterLevel;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'activated' && member.is_activated) ||
      (filterStatus === 'inactive' && !member.is_activated);

    return matchesSearch && matchesLevel && matchesStatus;
  });

  // 导出数据
  const exportMatrixData = () => {
    const csvContent = [
      ['钱包地址', '用户名', '等级', '激活序列', '推荐人', '激活时间', '矩阵根', '矩阵层级', '矩阵位置', '直推', '安置'].join(','),
      ...matrixData.map(m => [
        m.member_wallet,
        m.member_username,
        members.find(mem => mem.wallet_address === m.member_wallet)?.current_level || 0,
        m.member_activation_sequence,
        members.find(mem => mem.wallet_address === m.member_wallet)?.referrer_wallet || '',
        members.find(mem => mem.wallet_address === m.member_wallet)?.activation_time || '',
        m.matrix_root_wallet,
        m.matrix_layer,
        m.matrix_position,
        m.is_direct_referral ? '是' : '否',
        m.is_spillover_placement ? '是' : '否'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `matrix_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">验证管理员权限...</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated || !hasPermission('matrix.read')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              您需要管理员权限才能访问此页面
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">会员矩阵管理</h1>
          <p className="text-muted-foreground">查看和管理所有会员的矩阵排阵信息</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadMembersData} disabled={loading} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
          <Button onClick={exportMatrixData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {matrixStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">总会员数</p>
                  <p className="text-2xl font-bold text-honey">{matrixStats.total_members}</p>
                </div>
                <Users className="h-8 w-8 text-honey" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">已激活</p>
                  <p className="text-2xl font-bold text-green-500">{matrixStats.activated_members}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">矩阵总数</p>
                  <p className="text-2xl font-bold text-blue-500">{matrixStats.total_matrices}</p>
                </div>
                <Network className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">平均深度</p>
                  <p className="text-2xl font-bold text-purple-500">{matrixStats.avg_matrix_depth}</p>
                </div>
                <Layers className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">不完整矩阵</p>
                  <p className="text-2xl font-bold text-orange-500">{matrixStats.incomplete_matrices}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主要内容 */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">会员列表</TabsTrigger>
          <TabsTrigger value="matrix">矩阵关系</TabsTrigger>
          <TabsTrigger value="analysis">数据分析</TabsTrigger>
        </TabsList>

        {/* 会员列表标签页 */}
        <TabsContent value="members" className="space-y-4">
          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户名或钱包地址..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有等级</SelectItem>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(level => (
                      <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="activated">已激活</SelectItem>
                    <SelectItem value="inactive">未激活</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 会员列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                会员列表 ({filteredMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers.map((member, index) => (
                    <div
                      key={member.wallet_address}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedMember(member.wallet_address);
                        loadMemberMatrix(member.wallet_address);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-honey/10 text-honey rounded-full text-sm font-medium">
                          {member.activation_sequence}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.username}</span>
                            <Badge variant="outline" className="text-xs">
                              Level {member.current_level}
                            </Badge>
                            {member.is_activated ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.wallet_address.slice(0, 6)}...{member.wallet_address.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(member.activation_time).toLocaleDateString('zh-CN')}
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Eye className="h-4 w-4" />
                          <span className="text-xs">查看矩阵</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 矩阵关系标签页 */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 全局矩阵概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  全局矩阵概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Array.from(new Set(matrixData.map(m => m.matrix_root_wallet))).map(rootWallet => {
                    const rootMember = members.find(m => m.wallet_address === rootWallet);
                    const rootMatrix = matrixData.filter(m => m.matrix_root_wallet === rootWallet);
                    const maxLayer = Math.max(...rootMatrix.map(m => m.matrix_layer), 0);
                    
                    return (
                      <div key={rootWallet} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-honey" />
                            <span className="font-medium">{rootMember?.username || 'Unknown'}</span>
                            <Badge variant="outline">#{rootMember?.activation_sequence}</Badge>
                          </div>
                          <Badge variant="secondary">{rootMatrix.length} 成员</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {[1, 2, 3].map(layer => {
                            const layerMembers = rootMatrix.filter(m => m.matrix_layer === layer);
                            return (
                              <div key={layer} className="text-center p-2 bg-muted/30 rounded">
                                <div className="font-medium">Layer {layer}</div>
                                <div className="text-muted-foreground">{layerMembers.length}/9</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 选中成员的矩阵详情 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  成员矩阵详情
                  {selectedMember && (
                    <Badge variant="outline">
                      {members.find(m => m.wallet_address === selectedMember)?.username}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMember ? (
                  <div className="space-y-4">
                    {memberMatrix.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {[1, 2, 3, 4].map(layer => {
                          const layerMembers = memberMatrix.filter(m => m.matrix_layer === layer);
                          if (layerMembers.length === 0) return null;
                          
                          return (
                            <div key={layer} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">Layer {layer}</span>
                                <Badge variant="secondary">{layerMembers.length} 成员</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {['L', 'M', 'R'].map(position => {
                                  const positionMember = layerMembers.find(m => m.matrix_position === position);
                                  return (
                                    <div key={position} className="text-center p-2 border rounded">
                                      <div className="font-medium text-xs mb-1">{position}</div>
                                      {positionMember ? (
                                        <div>
                                          <div className="text-xs font-medium">{positionMember.member_username}</div>
                                          <div className="text-xs text-muted-foreground">
                                            #{positionMember.member_activation_sequence}
                                          </div>
                                          <div className="flex items-center justify-center gap-1 mt-1">
                                            {positionMember.is_direct_referral ? (
                                              <Badge variant="default" className="text-xs">直推</Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs">安置</Badge>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground">空位</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        该成员暂无下线矩阵
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    请在左侧选择一个成员查看其矩阵详情
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 数据分析标签页 */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 激活趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>激活趋势分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>今日新增激活</span>
                    <Badge variant="default">
                      {members.filter(m => 
                        new Date(m.activation_time).toDateString() === new Date().toDateString()
                      ).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>本周新增激活</span>
                    <Badge variant="default">
                      {members.filter(m => {
                        const activationDate = new Date(m.activation_time);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return activationDate >= weekAgo;
                      }).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>本月新增激活</span>
                    <Badge variant="default">
                      {members.filter(m => {
                        const activationDate = new Date(m.activation_time);
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return activationDate >= monthAgo;
                      }).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 等级分布 */}
            <Card>
              <CardHeader>
                <CardTitle>等级分布统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1,2,3,4,5].map(level => {
                    const levelCount = members.filter(m => m.current_level === level).length;
                    const percentage = members.length > 0 ? (levelCount / members.length * 100).toFixed(1) : '0';
                    return (
                      <div key={level} className="flex items-center justify-between">
                        <span>Level {level}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-honey h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {levelCount} ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 矩阵健康度 */}
            <Card>
              <CardHeader>
                <CardTitle>矩阵健康度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>完整矩阵数量</span>
                    <Badge variant="default">
                      {Array.from(new Set(matrixData.map(m => m.matrix_root_wallet))).filter(rootWallet => {
                        const rootMatrix = matrixData.filter(m => m.matrix_root_wallet === rootWallet);
                        return rootMatrix.filter(m => m.matrix_layer === 1).length === 3;
                      }).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>平均直推比例</span>
                    <Badge variant="secondary">
                      {matrixData.length > 0 ? 
                        (matrixData.filter(m => m.is_direct_referral).length / matrixData.length * 100).toFixed(1) : '0'
                      }%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>溢出安置比例</span>
                    <Badge variant="outline">
                      {matrixData.length > 0 ? 
                        (matrixData.filter(m => m.is_spillover_placement).length / matrixData.length * 100).toFixed(1) : '0'
                      }%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 推荐关系分析 */}
            <Card>
              <CardHeader>
                <CardTitle>推荐关系分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>有推荐人的成员</span>
                    <Badge variant="default">
                      {members.filter(m => m.referrer_wallet).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>无推荐人的成员</span>
                    <Badge variant="secondary">
                      {members.filter(m => !m.referrer_wallet).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>平均推荐深度</span>
                    <Badge variant="outline">
                      {matrixStats ? matrixStats.avg_matrix_depth.toFixed(1) : '0'} 层
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}