import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { supabase } from '../../lib/supabase';

interface ReferralSequenceDebugProps {
  walletAddress: string;
}

const ReferralSequenceDebug: React.FC<ReferralSequenceDebugProps> = ({ walletAddress }) => {
  const [sequenceData, setSequenceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      checkReferralSequence();
    }
  }, [walletAddress]);

  const checkReferralSequence = async () => {
    setLoading(true);
    try {
      // 查询该钱包作为根的所有推荐，按激活顺序排列
      const { data: allReferrals, error } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          referrer_wallet,
          matrix_root_wallet,
          matrix_layer,
          matrix_position,
          is_direct_referral,
          is_spillover_placement,
          member_activation_sequence,
          placed_at
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('member_activation_sequence');

      if (error) {
        console.error('Sequence query error:', error);
        return;
      }

      setSequenceData(allReferrals || []);
      
      console.log('🔍 SEQUENCE DEBUG: Referral sequence for wallet:', walletAddress);
      console.log('📊 Total referrals:', allReferrals?.length);
      console.log('📋 Sequence data:', allReferrals);
      
    } catch (error) {
      console.error('Sequence debug error:', error);
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
          <div className="text-center">推荐序列数据加载中...</div>
        </CardContent>
      </Card>
    );
  }

  // 模拟递归矩阵分配逻辑
  const simulateMatrixPlacement = () => {
    const result = [];
    let currentLayer = 1;
    let currentPosition = 0;
    const positions = ['L', 'M', 'R'];
    
    for (let i = 0; i < sequenceData.length; i++) {
      const member = sequenceData[i];
      const posInLayer = positions[currentPosition % 3];
      
      result.push({
        ...member,
        simulatedLayer: currentLayer,
        simulatedPosition: posInLayer,
        sequenceIndex: i + 1
      });
      
      currentPosition++;
      if (currentPosition % 3 === 0) {
        currentLayer++;
      }
    }
    
    return result;
  };

  const simulatedData = simulateMatrixPlacement();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          🔄 推荐序列与矩阵占位分析 - {formatWallet(walletAddress)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium mb-2">推荐序列分析:</div>
            <div className="text-xs text-gray-600 mb-2">
              按激活顺序: A推荐B→C→D→E→F→G→H→I...
            </div>
            <div className="text-xs text-gray-600 mb-4">
              矩阵占位: Layer1(B,C,D) → Layer2(E,F,G) → Layer3(H,I,_) ...
            </div>
          </div>
          
          {sequenceData.length === 0 ? (
            <div className="text-gray-500 text-sm">
              该钱包没有推荐数据
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 实际数据 */}
                <div>
                  <div className="font-medium text-sm mb-2">🏠 实际矩阵数据</div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {sequenceData.map((member, index) => (
                      <div key={index} className="p-2 border rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono">{formatWallet(member.member_wallet)}</span>
                          <div className="flex gap-1">
                            <span className="px-1 bg-gray-100 rounded">
                              #{member.member_activation_sequence}
                            </span>
                            <span className={`px-1 rounded ${
                              member.matrix_position === 'L' ? 'bg-blue-100' :
                              member.matrix_position === 'M' ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              L{member.matrix_layer}.{member.matrix_position}
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-600">
                          {member.is_direct_referral ? '直推' : '滑落'} | 
                          推荐人: {formatWallet(member.referrer_wallet)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 模拟数据 */}
                <div>
                  <div className="font-medium text-sm mb-2">🧮 模拟递归分配</div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {simulatedData.map((member, index) => (
                      <div key={index} className="p-2 border rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono">{formatWallet(member.member_wallet)}</span>
                          <div className="flex gap-1">
                            <span className="px-1 bg-gray-100 rounded">
                              #{member.sequenceIndex}
                            </span>
                            <span className={`px-1 rounded ${
                              member.simulatedPosition === 'L' ? 'bg-blue-100' :
                              member.simulatedPosition === 'M' ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              L{member.simulatedLayer}.{member.simulatedPosition}
                            </span>
                          </div>
                        </div>
                        <div className={`text-xs ${
                          member.matrix_layer === member.simulatedLayer && 
                          member.matrix_position === member.simulatedPosition
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {member.matrix_layer === member.simulatedLayer && 
                           member.matrix_position === member.simulatedPosition
                            ? '✅ 匹配' : `❌ 实际: L${member.matrix_layer}.${member.matrix_position}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded text-xs">
                <div className="font-medium mb-1">📊 统计分析</div>
                <div>总推荐数: {sequenceData.length}</div>
                <div>层级范围: {Math.min(...sequenceData.map(m => m.matrix_layer))} - {Math.max(...sequenceData.map(m => m.matrix_layer))}</div>
                <div>直推数: {sequenceData.filter(m => m.is_direct_referral).length}</div>
                <div>滑落数: {sequenceData.filter(m => m.is_spillover_placement).length}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSequenceDebug;