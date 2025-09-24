import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, User, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface PendingReward {
  reward_id: string;
  reward_amount: number;
  triggering_member_username: string;
  timer_type: 'layer_r_upgrade_incentive' | 'layer_qualification_wait' | 'qualification_wait';
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
  const { t } = useI18n();
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onRewardClaimableRef = useRef(onRewardClaimable);
  
  // Keep ref updated
  useEffect(() => {
    onRewardClaimableRef.current = onRewardClaimable;
  });

  // Format remaining time
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return t('rewards.expired');
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (days > 0) {
      return t('rewards.timeFormat.days', { days, hours, minutes });
    } else if (hours > 0) {
      return t('rewards.timeFormat.hours', { hours, minutes });
    } else if (minutes > 0) {
      return t('rewards.timeFormat.minutes', { minutes, seconds: remainingSeconds });
    } else {
      return t('rewards.timeFormat.seconds', { seconds: remainingSeconds });
    }
  };

  // 获取倒计时状态颜色和样式
  const getTimerColor = (seconds: number, timerType: string) => {
    if (seconds <= 0) return 'destructive';
    if (seconds <= 3600) return 'destructive'; // 1小时内红色警告
    if (seconds <= 86400) return 'warning'; // 24小时内黄色提醒
    if (timerType === 'layer_r_upgrade_incentive') return 'secondary'; // R位置升级激励
    return 'default';
  };

  // 获取timer类型的显示文本和图标
  const getTimerTypeDisplay = (timerType: string) => {
    switch (timerType) {
      case 'layer_r_upgrade_incentive':
        return {
          label: 'R位置升级激励',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: '🚀'
        };
      case 'layer_qualification_wait':
        return {
          label: '等级资格等待',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '⏳'
        };
      default:
        return {
          label: '资格等待',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '⏱️'
        };
    }
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
      console.error('Error fetching pending rewards:', err);
      setError(err instanceof Error ? err.message : t('rewards.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // 稳定的更新倒计时函数，减少闪烁
  const updateCountdown = useCallback(() => {
    setPendingRewards(prev => 
      prev.map(reward => {
        const now = new Date().getTime();
        const expiry = new Date(reward.expires_at).getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        
        // 只有秒数发生变化时才更新，减少不必要的重新渲染
        if (reward.time_remaining_seconds === remaining) {
          return reward;
        }
        
        // 如果倒计时结束且可以领取，触发回调
        if (remaining === 0 && reward.can_claim && onRewardClaimableRef.current) {
          onRewardClaimableRef.current(reward.reward_id);
        }
        
        return {
          ...reward,
          time_remaining_seconds: remaining,
          can_claim: remaining === 0 || reward.can_claim
        };
      })
    );
  }, []); // No dependencies needed since we use ref

  useEffect(() => {
    if (walletAddress) {
      fetchPendingRewards();
    }
  }, [walletAddress]);

  // 创建定时器，只在有pending rewards时运行
  useEffect(() => {
    if (pendingRewards.length === 0) return;

    const interval = setInterval(() => {
      setPendingRewards(prev => 
        prev.map(reward => {
          const now = new Date().getTime();
          const expiry = new Date(reward.expires_at).getTime();
          const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
          
          // 只有秒数发生变化时才更新
          if (reward.time_remaining_seconds === remaining) {
            return reward;
          }
          
          // 如果倒计时结束且可以领取，触发回调
          if (remaining === 0 && reward.can_claim && onRewardClaimableRef.current) {
            onRewardClaimableRef.current(reward.reward_id);
          }
          
          return {
            ...reward,
            time_remaining_seconds: remaining,
            can_claim: remaining === 0 || reward.can_claim
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingRewards.length]); // 只依赖rewards数量变化

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('rewards.pendingCountdowns')}
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
            {t('common.error')}
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
            {t('rewards.pendingRewards')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            {t('rewards.noPendingRewards')}
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
          {t('rewards.pendingCountdowns')}
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-lg">{reward.reward_amount} USDT</span>
                </div>
                
                {/* Timer类型标签 */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTimerTypeDisplay(reward.timer_type).icon}</span>
                  <Badge variant="outline" className={getTimerTypeDisplay(reward.timer_type).color}>
                    {getTimerTypeDisplay(reward.timer_type).label}
                  </Badge>
                  {reward.timer_type === 'layer_r_upgrade_incentive' && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      升级激励
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <User className="w-3 h-3" />
                  触发者: {reward.triggering_member_username}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {reward.can_claim && (
                  <Badge variant="default" className="bg-green-500">
                    可领取
                  </Badge>
                )}
                {reward.timer_type === 'layer_r_upgrade_incentive' && !reward.can_claim && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-600">
                    需要升级
                  </Badge>
                )}
              </div>
            </div>

            {/* 倒计时 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('rewards.timeRemaining')}:</span>
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
                  className={`h-2 rounded-full transition-all duration-500 ${
                    reward.time_remaining_seconds <= 0
                      ? 'bg-red-500'
                      : reward.time_remaining_seconds <= 3600
                      ? 'bg-red-400'
                      : reward.time_remaining_seconds <= 86400
                      ? 'bg-yellow-400'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.max(0, (reward.time_remaining_seconds / (72 * 3600)) * 100)}%`
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
              {t('rewards.expiresAt')}: {new Date(reward.expires_at).toLocaleString()}
            </div>
          </div>
        ))}

        {/* 刷新按钮 */}
        <div className="pt-4 border-t">
          <button
            onClick={fetchPendingRewards}
            className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {t('rewards.refreshCountdown')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}