import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserCheck, 
  TrendingDown,
  Target,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  level: number;
  isActive: boolean;
  layer: number;
  position: 'L' | 'M' | 'R';
  placedAt?: string;
  isDirect: boolean;        // 是否直推
  isSpillover: boolean;     // 是否滑落
  referrerWallet?: string;  // 推荐人
  matrixRoot?: string;      // matrix根节点
}

interface MatrixLayerData {
  left: MatrixMember[];
  middle: MatrixMember[];
  right: MatrixMember[];
}

interface EnhancedMatrixViewProps {
  walletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

const EnhancedMatrixView: React.FC<EnhancedMatrixViewProps> = ({ 
  walletAddress, 
  rootUser 
}) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState(1);
  const [matrixData, setMatrixData] = useState<{ [key: number]: MatrixLayerData }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    directReferrals: 0,
    spilloverMembers: 0,
    maxLayer: 0
  });

  useEffect(() => {
    if (walletAddress) {
      loadEnhancedMatrixData();
    }
  }, [walletAddress]);

  const loadEnhancedMatrixData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading enhanced matrix data for: ${walletAddress}`);

      // 使用新的referrals表获取完整的直推/滑落信息
      const { data: matrixData, error: matrixError } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          referrer_wallet,
          matrix_root_wallet,
          matrix_layer,
          matrix_position,
          is_direct_referral,
          is_spillover_placement,
          placed_at,
          member_activation_sequence
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer')
        .order('member_activation_sequence');

      if (matrixError) {
        throw new Error(`Matrix query error: ${matrixError.message}`);
      }

      console.log(`📊 Found ${matrixData?.length || 0} matrix members`);
      console.log(`📋 Sample data:`, matrixData?.slice(0, 3));

      // 获取用户信息
      const memberWallets = matrixData?.map(m => m.member_wallet) || [];
      let usersData = [];
      let membersDetailData = [];

      if (memberWallets.length > 0) {
        const [usersResult, membersResult] = await Promise.allSettled([
          supabase
            .from('users')
            .select('wallet_address, username')
            .in('wallet_address', memberWallets),
          supabase
            .from('members')
            .select('wallet_address, current_level')
            .in('wallet_address', memberWallets)
        ]);

        if (usersResult.status === 'fulfilled' && usersResult.value.data) {
          usersData = usersResult.value.data;
        }
        if (membersResult.status === 'fulfilled' && membersResult.value.data) {
          membersDetailData = membersResult.value.data;
        }
      }

      // 组织数据到层级结构
      const organizedData: { [key: number]: MatrixLayerData } = {};
      
      // 初始化19层
      for (let i = 1; i <= 19; i++) {
        organizedData[i] = { left: [], middle: [], right: [] };
      }

      let totalMembers = 0;
      let directReferrals = 0;
      let spilloverMembers = 0;
      let maxLayer = 0;

      matrixData?.forEach((record: any) => {
        const userData = usersData.find(u => 
          u.wallet_address.toLowerCase() === record.member_wallet.toLowerCase()
        );
        const memberDetail = membersDetailData.find(m => 
          m.wallet_address.toLowerCase() === record.member_wallet.toLowerCase()
        );

        const member: MatrixMember = {
          walletAddress: record.member_wallet,
          username: userData?.username || `User${record.member_wallet.slice(-4)}`,
          level: memberDetail?.current_level || 1,
          isActive: true, // 在matrix中的都是激活的
          layer: record.matrix_layer,
          position: record.matrix_position as 'L' | 'M' | 'R',
          placedAt: record.placed_at,
          isDirect: record.is_direct_referral || false,
          isSpillover: record.is_spillover_placement || false,
          referrerWallet: record.referrer_wallet,
          matrixRoot: record.matrix_root_wallet
        };

        const layer = record.matrix_layer;
        const position = record.matrix_position;

        if (organizedData[layer]) {
          if (position === 'L') {
            organizedData[layer].left.push(member);
          } else if (position === 'M') {
            organizedData[layer].middle.push(member);
          } else if (position === 'R') {
            organizedData[layer].right.push(member);
          }
        }

        totalMembers++;
        if (member.isDirect) directReferrals++;
        if (member.isSpillover) spilloverMembers++;
        if (layer > maxLayer) maxLayer = layer;
      });

      setMatrixData(organizedData);
      setStats({
        totalMembers,
        directReferrals,
        spilloverMembers,
        maxLayer
      });

      console.log(`✅ Matrix organized: ${totalMembers} total, ${directReferrals} direct, ${spilloverMembers} spillover, max layer: ${maxLayer}`);

    } catch (error: any) {
      console.error('❌ Error loading enhanced matrix data:', error);
      setError(error.message || 'Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  };

  const navigateLayer = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentLayer > 1) {
      setCurrentLayer(currentLayer - 1);
    } else if (direction === 'next' && currentLayer < stats.maxLayer) {
      setCurrentLayer(currentLayer + 1);
    }
  };

  const renderMemberCard = (member: MatrixMember) => (
    <div
      key={member.walletAddress}
      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {member.isDirect ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" title="直推" />
          ) : member.isSpillover ? (
            <ArrowDownLeft className="h-4 w-4 text-blue-500" title="滑落" />
          ) : (
            <Target className="h-4 w-4 text-gray-500" title="其他" />
          )}
          <span className="font-medium text-sm">
            {member.username}
          </span>
        </div>
        <Badge 
          variant={member.isDirect ? "default" : "secondary"}
          className={`text-xs ${
            member.isDirect 
              ? 'bg-green-100 text-green-800 border-green-300' 
              : member.isSpillover 
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-gray-100 text-gray-800 border-gray-300'
          }`}
        >
          {member.isDirect ? '直推' : member.isSpillover ? '滑落' : '其他'}
        </Badge>
      </div>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Level: {member.level}</div>
        <div>Position: {member.position}</div>
        <div>Wallet: {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}</div>
        {member.placedAt && (
          <div>Placed: {new Date(member.placedAt).toLocaleDateString()}</div>
        )}
      </div>
    </div>
  );

  const renderPositionSlot = (members: MatrixMember[], position: 'L' | 'M' | 'R') => (
    <div className="flex flex-col items-center">
      <div className="mb-2">
        <Badge variant="outline" className="text-sm font-medium">
          {position}
        </Badge>
      </div>
      <div className="space-y-2 w-full">
        {members.length > 0 ? (
          members.map(member => renderMemberCard(member))
        ) : (
          <div className="bg-dashed-border rounded-lg p-6 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">空位置</p>
            <p className="text-xs">等待新成员</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading enhanced matrix...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Loading Failed</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadEnhancedMatrixData}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentLayerData = matrixData[currentLayer] || { left: [], middle: [], right: [] };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-honey" />
            <span>Enhanced Matrix View</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
              Layer {currentLayer}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-xl font-bold text-blue-400">{stats.totalMembers}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">直推</span>
            </div>
            <div className="text-xl font-bold text-green-400">{stats.directReferrals}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">滑落</span>
            </div>
            <div className="text-xl font-bold text-purple-400">{stats.spilloverMembers}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-lg p-3 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Max Layer</span>
            </div>
            <div className="text-xl font-bold text-orange-400">{stats.maxLayer}</div>
          </div>
        </div>

        {/* 层级导航 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateLayer('prev')}
            disabled={currentLayer <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一层
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-semibold">Layer {currentLayer}</div>
            <div className="text-xs text-muted-foreground">
              {(currentLayerData.left.length + currentLayerData.middle.length + currentLayerData.right.length)} members
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateLayer('next')}
            disabled={currentLayer >= stats.maxLayer}
          >
            下一层
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Matrix 显示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderPositionSlot(currentLayerData.left, 'L')}
          {renderPositionSlot(currentLayerData.middle, 'M')}
          {renderPositionSlot(currentLayerData.right, 'R')}
        </div>

        {/* 图例 */}
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="text-sm font-medium mb-3">图例说明</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span><strong>直推</strong>: 通过您的推荐链接直接注册的用户</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-blue-500" />
              <span><strong>滑落</strong>: 由于您的位置已满而分配到您矩阵中的用户</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span><strong>空位</strong>: 等待新成员加入的位置</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedMatrixView;