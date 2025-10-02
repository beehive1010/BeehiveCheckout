import React, {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {supabase} from '../../lib/supabase';
import {CompactCountdownTimer} from '../bcc/CountdownTimer';
import {useI18n} from '@/contexts/I18nContext';

interface WithdrawRewardsProps {
  walletAddress: string;
}

interface LayerReward {
  id: string;
  reward_amount: number;
  status: string;
  expires_at: string;
  claimed_at: string | null;
  matrix_layer: number;
  layer_position: string;
  triggering_member_wallet: string;
  roll_up_reason: string | null;
}

interface UserBalance {
  reward_balance: number;
  total_withdrawn: number;
  available_balance: number;
}

export const WithdrawRewards: React.FC<WithdrawRewardsProps> = ({ walletAddress }) => {
  const { t } = useI18n();
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const queryClient = useQueryClient();

  // Get claimable and pending rewards
  const { data: rewards, isLoading: rewardsLoading } = useQuery<LayerReward[]>({
    queryKey: ['layer-rewards', walletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', walletAddress)
        .in('status', ['claimable', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!walletAddress,
    refetchInterval: 5000,
  });

  // Get user balance
  const { data: balance } = useQuery<UserBalance>({
    queryKey: ['user-balance', walletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_balances')
        .select('reward_balance, total_withdrawn, available_balance')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress, 
          rewardId 
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-rewards', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', walletAddress] });
    },
  });

  // Withdraw mutation using server-wallet API
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      // Call server-wallet function via supabase functions
      const response = await fetch('https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/server-wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'wallet-address': walletAddress,
        },
        body: JSON.stringify({
          amount: amount.toString(),
          targetChainId: 42161, // Arbitrum
          tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      setWithdrawAmount('');
      setShowWithdrawForm(false);
      queryClient.invalidateQueries({ queryKey: ['user-balance', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['layer-rewards', walletAddress] });
    },
  });

  const claimableRewards = rewards?.filter(r => r.status === 'claimable') || [];
  const pendingRewards = rewards?.filter(r => r.status === 'pending') || [];
  const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.reward_amount, 0);

  const handleClaimReward = (rewardId: string) => {
    claimRewardMutation.mutate(rewardId);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount > 0 && amount <= (balance?.available_balance || 0)) {
      withdrawMutation.mutate(amount);
    }
  };

  if (rewardsLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('withdrawal.rewardBalance')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">{t('withdrawal.available_balance')}</div>
            <div className="text-2xl font-bold text-green-600">
              ${balance?.available_balance?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">{t('rewards.claim_rewards')}</div>
            <div className="text-2xl font-bold text-blue-600">
              ${totalClaimable.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">{t('withdrawal.totalWithdrawn')}</div>
            <div className="text-2xl font-bold text-gray-600">
              ${balance?.total_withdrawn?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Withdraw Button */}
        {(balance?.available_balance || 0) > 0 && (
          <div className="mt-6">
            {!showWithdrawForm ? (
              <button
                onClick={() => setShowWithdrawForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {t('buttons.withdraw')}
              </button>
            ) : (
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('withdrawal.withdrawal_amount')} (USD)
                    </label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      max={balance?.available_balance || 0}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {t('withdrawal.max')}: ${balance?.available_balance?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleWithdraw}
                      disabled={
                        !withdrawAmount || 
                        parseFloat(withdrawAmount) <= 0 || 
                        parseFloat(withdrawAmount) > (balance?.available_balance || 0) ||
                        withdrawMutation.isPending
                      }
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawMutation.isPending ? t('withdrawal.processing') : t('common.confirm')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowWithdrawForm(false);
                        setWithdrawAmount('');
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claimable Rewards */}
      {claimableRewards.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            {t('withdrawal.readyToClaim')} ({claimableRewards.length})
          </h4>
          
          <div className="space-y-3">
            {claimableRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <div className="font-semibold text-green-800">
                    ${reward.reward_amount.toFixed(2)} USDC
                  </div>
                  <div className="text-sm text-green-600">
                    Layer {reward.matrix_layer} • Position {reward.layer_position}
                  </div>
                  {reward.roll_up_reason && (
                    <div className="text-xs text-green-500">
                      Roll-up: {reward.roll_up_reason}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleClaimReward(reward.id)}
                  disabled={claimRewardMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {claimRewardMutation.isPending ? t('withdrawal.claiming') : t('buttons.claim')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Rewards with Countdown */}
      {pendingRewards.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            {t('rewards.pending_rewards')} ({pendingRewards.length})
          </h4>
          
          <div className="space-y-3">
            {pendingRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <div className="font-semibold text-orange-800">
                    ${reward.reward_amount.toFixed(2)} USDC
                  </div>
                  <div className="text-sm text-orange-600">
                    Layer {reward.matrix_layer} • Position {reward.layer_position}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-orange-600 mb-1">{t('withdrawal.availableIn')}:</div>
                  <CompactCountdownTimer
                    targetDate={reward.expires_at}
                    className="text-orange-700 font-medium"
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['layer-rewards', walletAddress] });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Rewards Message */}
      {claimableRewards.length === 0 && pendingRewards.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="text-gray-600 mb-2">{t('rewards.no_rewards')}</div>
          <div className="text-sm text-gray-500">
            {t('withdrawal.rewardsWillAppear')}
          </div>
        </div>
      )}
    </div>
  );
};