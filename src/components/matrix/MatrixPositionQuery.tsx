import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Users, Target, TrendingUp } from 'lucide-react';

interface MatrixPosition {
  matrix_root_wallet: string;
  matrix_layer: number;
  matrix_position: string;
  is_direct_referral: boolean;
  is_spillover_placement: boolean;
  member_activation_sequence: number;
  placed_at: string;
  root_username?: string;
}

interface MatrixPositionQueryProps {
  queryWallet: string;
}

const MatrixPositionQuery: React.FC<MatrixPositionQueryProps> = ({ queryWallet }) => {
  const [positions, setPositions] = useState<MatrixPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMatrices, setTotalMatrices] = useState(0);

  useEffect(() => {
    if (queryWallet && queryWallet.length === 42) {
      queryMatrixPositions();
    }
  }, [queryWallet]);

  const queryMatrixPositions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Querying matrix positions for wallet:', queryWallet);
      
      // 查询该钱包在所有矩阵中的排位
      const { data: positionsData, error: positionsError } = await supabase
        .from('referrals')
        .select(`
          matrix_root_wallet,
          matrix_layer,
          matrix_position,
          is_direct_referral,
          is_spillover_placement,
          member_activation_sequence,
          placed_at
        `)
        .eq('member_wallet', queryWallet)
        .order('matrix_layer')
        .order('member_activation_sequence');

      if (positionsError) {
        throw new Error(`Query error: ${positionsError.message}`);
      }

      console.log(`📊 Found ${positionsData?.length || 0} matrix positions`);

      // 获取根钱包的用户名
      if (positionsData && positionsData.length > 0) {
        const rootWallets = [...new Set(positionsData.map(p => p.matrix_root_wallet))];
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('wallet_address, username')
          .in('wallet_address', rootWallets);

        if (!usersError && usersData) {
          const enrichedPositions = positionsData.map(pos => ({
            ...pos,
            root_username: usersData.find(u => 
              u.wallet_address.toLowerCase() === pos.matrix_root_wallet.toLowerCase()
            )?.username
          }));
          
          setPositions(enrichedPositions);
          setTotalMatrices(rootWallets.length);
        } else {
          setPositions(positionsData);
          setTotalMatrices(rootWallets.length);
        }
      } else {
        setPositions([]);
        setTotalMatrices(0);
      }

    } catch (error: any) {
      console.error('❌ Error querying matrix positions:', error);
      setError(error.message || 'Failed to query matrix positions');
    } finally {
      setLoading(false);
    }
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const groupByRoot = () => {
    const grouped: { [key: string]: MatrixPosition[] } = {};
    positions.forEach(pos => {
      if (!grouped[pos.matrix_root_wallet]) {
        grouped[pos.matrix_root_wallet] = [];
      }
      grouped[pos.matrix_root_wallet].push(pos);
    });
    return grouped;
  };

  if (!queryWallet || queryWallet.length !== 42) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">请输入有效的钱包地址查询矩阵排位</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">查询矩阵排位中...</div>
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
            <div className="text-sm mb-2">查询失败</div>
            <div className="text-xs">{error}</div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3"
              onClick={queryMatrixPositions}
            >
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedPositions = groupByRoot();
  const rootWallets = Object.keys(groupedPositions);

  return (
    <div className="space-y-4">
      {/* 查询结果概览 */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>矩阵排位查询结果</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalMatrices}</div>
              <div className="text-xs text-blue-700">参与矩阵数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{positions.length}</div>
              <div className="text-xs text-green-700">总排位数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {positions.filter(p => p.is_direct_referral).length}
              </div>
              <div className="text-xs text-purple-700">直推排位</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {positions.filter(p => p.is_spillover_placement).length}
              </div>
              <div className="text-xs text-orange-700">滑落排位</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white rounded border">
            <div className="text-xs text-gray-600 mb-1">查询地址:</div>
            <div className="font-mono text-sm text-gray-800">{queryWallet}</div>
          </div>
        </CardContent>
      </Card>

      {/* 按矩阵根节点分组显示 */}
      {rootWallets.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">该地址未在任何矩阵中找到排位</div>
              <div className="text-xs mt-1">可能该地址尚未激活或参与矩阵系统</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rootWallets.map(rootWallet => {
            const rootPositions = groupedPositions[rootWallet];
            const rootUser = rootPositions[0];
            
            return (
              <Card key={rootWallet} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span>矩阵根节点: {rootUser.root_username || formatWallet(rootWallet)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rootPositions.length} 个排位
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rootPositions
                      .sort((a, b) => a.matrix_layer - b.matrix_layer || a.member_activation_sequence - b.member_activation_sequence)
                      .map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-sm">
                              第{position.matrix_layer}层
                            </span>
                          </div>
                          
                          <Badge className={`text-xs ${
                            position.matrix_position === 'L' ? 'bg-blue-100 text-blue-700' :
                            position.matrix_position === 'M' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {position.matrix_position} 位
                          </Badge>
                          
                          <Badge className={`text-xs ${
                            position.is_direct_referral 
                              ? 'bg-green-500 text-white' 
                              : 'bg-blue-500 text-white'
                          }`}>
                            {position.is_direct_referral ? '直推' : '滑落'}
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-600">激活序号</div>
                          <div className="font-mono text-sm">#{position.member_activation_sequence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <div className="text-xs text-blue-700">
                      <strong>矩阵根节点:</strong> {formatWallet(rootWallet)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatrixPositionQuery;