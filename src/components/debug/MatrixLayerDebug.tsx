import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { supabase } from '../../lib/supabase';

interface MatrixLayerDebugProps {
  walletAddress: string;
}

const MatrixLayerDebug: React.FC<MatrixLayerDebugProps> = ({ walletAddress }) => {
  const [layerData, setLayerData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      checkAllLayers();
    }
  }, [walletAddress]);

  const checkAllLayers = async () => {
    setLoading(true);
    try {
      // 查询该钱包在所有层级的数据
      const { data: allData, error } = await supabase
        .from('referrals')
        .select('matrix_layer, matrix_position, member_wallet, is_direct_referral, is_spillover_placement, referrer_wallet, member_activation_sequence, placed_at')
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer')
        .order('member_activation_sequence');

      if (error) {
        console.error('Debug query error:', error);
        return;
      }

      // 按层级分组
      const groupedByLayer: { [key: number]: any[] } = {};
      allData?.forEach(item => {
        if (!groupedByLayer[item.matrix_layer]) {
          groupedByLayer[item.matrix_layer] = [];
        }
        groupedByLayer[item.matrix_layer].push(item);
      });

      setLayerData(groupedByLayer);
      
      console.log('🔍 DEBUG: All layers data for wallet:', walletAddress);
      console.log('📊 Layers found:', Object.keys(groupedByLayer));
      console.log('📋 Full data:', groupedByLayer);
      
    } catch (error) {
      console.error('Debug error:', error);
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
        <CardContent className="p-4">
          <div className="text-center">调试数据加载中...</div>
        </CardContent>
      </Card>
    );
  }

  const layerNumbers = Object.keys(layerData).map(Number).sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          🔍 矩阵层级调试 - {formatWallet(walletAddress)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm font-medium">
            找到 {layerNumbers.length} 个层级: {layerNumbers.join(', ')}
          </div>
          
          {layerNumbers.map(layer => (
            <div key={layer} className="p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium mb-1">第 {layer} 层 ({layerData[layer].length} 个成员)</div>
              <div className="space-y-1">
                {layerData[layer].map((member: any, index: number) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs">{formatWallet(member.member_wallet)}</span>
                      <div className="flex gap-1">
                        <span className={`px-1 rounded text-xs ${
                          member.matrix_position === 'L' ? 'bg-blue-100' :
                          member.matrix_position === 'M' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {member.matrix_position}
                        </span>
                        <span className={`px-1 rounded text-xs ${
                          member.is_direct_referral ? 'bg-green-200' : 'bg-blue-200'
                        }`}>
                          {member.is_direct_referral ? '直推' : '滑落'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>推荐人: {formatWallet(member.referrer_wallet || 'N/A')}</div>
                      <div>激活序号: {member.member_activation_sequence}</div>
                      <div>加入时间: {member.placed_at ? new Date(member.placed_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {layerNumbers.length === 0 && (
            <div className="text-gray-500 text-sm">
              该钱包没有任何矩阵成员数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatrixLayerDebug;