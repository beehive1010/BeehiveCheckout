import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PendingReward {
  reward_id: string;
  reward_amount: number;
  triggering_member_username: string;
  timer_type: 'super_root_upgrade' | 'qualification_wait';
  time_remaining_seconds: number;
  expires_at: string;
  status_description: string;
  can_claim: boolean;
}

interface PendingRewardsTimerProps {
  walletAddress: string;
  onRewardClaimable?: (rewardId: string) => void;
}

export function PendingRewardsTimer({ walletAddress, onRewardClaimable }: PendingRewardsTimerProps) {
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '已过期';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  // 获取倒计时状态颜色
  const getTimerColor = (seconds: number, timerType: string) => {
    if (seconds <= 0) return 'destructive';
    if (seconds <= 3600) return 'destructive'; // 1小时内
    if (seconds <= 86400) return 'warning'; // 24小时内
    if (timerType === 'super_root_upgrade') return 'secondary';
    return 'default';
  };

  // 获取pending奖励
  const fetchPendingRewards = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_pending_rewards', {
        p_wallet_address: walletAddress
      });

      if (error) throw error;

      setPendingRewards(data || []);
    } catch (err) {
      console.error('获取pending奖励错误:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新倒计时
  const updateCountdown = () => {
    setPendingRewards(prev => 
      prev.map(reward => {
        const now = new Date().getTime();
        const expiry = new Date(reward.expires_at).getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        
        // 如果倒计时结束且可以领取，触发回调
        if (remaining === 0 && reward.can_claim && onRewardClaimable) {
          onRewardClaimable(reward.reward_id);
        }
        
        return {
          ...reward,
          time_remaining_seconds: remaining,
          can_claim: remaining === 0 || reward.can_claim
        };
      })
    );
  };

  useEffect(() => {
    if (walletAddress) {
      fetchPendingRewards();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (pendingRewards.length === 0) return;

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pendingRewards.length, onRewardClaimable]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending奖励倒计时
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            错误
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingRewards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Pending奖励
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            暂无pending状态的奖励
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending奖励倒计时
          <Badge variant="secondary">{pendingRewards.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRewards.map((reward) => (
          <div
            key={reward.reward_id}
            className="border rounded-lg p-4 space-y-3"
          >
            {/* 奖励信息 */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold">{reward.reward_amount} USDT</span>
                  <Badge variant="outline" size="sm">
                    {reward.timer_type === 'super_root_upgrade' ? 'Super Root升级' : '资格等待'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <User className="w-3 h-3" />
                  来自: {reward.triggering_member_username}
                </div>
              </div>
              
              {reward.can_claim && (
                <Badge variant="default" className="bg-green-500">
                  可领取
                </Badge>
              )}
            </div>

            {/* 倒计时 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">剩余时间:</span>
                <Badge 
                  variant={getTimerColor(reward.time_remaining_seconds, reward.timer_type) as any}
                  className="font-mono"
                >
                  {formatTimeRemaining(reward.time_remaining_seconds)}
                </Badge>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    reward.time_remaining_seconds <= 0
                      ? 'bg-red-500'
                      : reward.time_remaining_seconds <= 3600
                      ? 'bg-red-400'
                      : reward.time_remaining_seconds <= 86400
                      ? 'bg-yellow-400'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: reward.timer_type === 'super_root_upgrade'
                      ? `${Math.max(0, (reward.time_remaining_seconds / (72 * 3600)) * 100)}%`
                      : `${Math.max(0, (reward.time_remaining_seconds / (30 * 24 * 3600)) * 100)}%`
                  }}
                ></div>
              </div>
            </div>

            {/* 状态描述 */}
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              {reward.status_description}
            </p>

            {/* 到期时间 */}
            <div className="text-xs text-gray-400">
              到期时间: {new Date(reward.expires_at).toLocaleString('zh-CN')}
            </div>
          </div>
        ))}

        {/* 刷新按钮 */}
        <div className="pt-4 border-t">
          <button
            onClick={fetchPendingRewards}
            className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            刷新倒计时
          </button>
        </div>
      </CardContent>
    </Card>
  );
}