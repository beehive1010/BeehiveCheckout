import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { CountdownTimer } from './CountdownTimer';

interface BCCBalanceProps {
  walletAddress: string;
}

interface BCCBalanceData {
  bcc_balance: number;
  bcc_locked: number;
  bcc_total_unlocked: number;
  bcc_used: number;
  last_updated: string;
}

interface BCCReleaseLog {
  bcc_released: number;
  bcc_remaining_locked: number;
  created_at: string;
  from_level: number;
  to_level: number;
  release_reason: string;
}

export const BCCBalanceDisplay: React.FC<BCCBalanceProps> = ({ walletAddress }) => {
  // Get current BCC balance via Supabase Edge Function
  const { data: balanceData, isLoading: balanceLoading } = useQuery<any>({
    queryKey: ['bcc-balance', walletAddress],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bcc-balance', {
        body: { walletAddress },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
    refetchInterval: 5000,
  });

  // Get latest BCC release log for countdown
  const { data: releaseLog } = useQuery<BCCReleaseLog>({
    queryKey: ['bcc-release-log', walletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bcc_release_logs')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    },
    enabled: !!walletAddress,
  });

  if (balanceLoading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg p-6">
        <div className="h-4 bg-gray-300 rounded mb-2"></div>
        <div className="h-8 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!balanceData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Unable to load BCC balance</p>
      </div>
    );
  }

  // Calculate next release time (72 hours from last release)
  const nextReleaseTime = releaseLog 
    ? new Date(new Date(releaseLog.created_at).getTime() + 72 * 60 * 60 * 1000)
    : null;

  const shouldShowCountdown = balanceData.bcc_locked > 0 && nextReleaseTime && nextReleaseTime > new Date();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">BCC Balance</h3>
      
      {/* Available BCC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Available BCC</div>
          <div className="text-2xl font-bold text-green-600">
            {balanceData.bcc_balance?.toLocaleString() || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Locked BCC</div>
          <div className="text-2xl font-bold text-orange-600">
            {balanceData.bcc_locked?.toLocaleString() || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Used</div>
          <div className="text-2xl font-bold text-gray-600">
            {balanceData.bcc_used?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Total Unlocked Progress</span>
          <span>{balanceData.bcc_total_unlocked?.toLocaleString() || 0} BCC</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min(100, ((balanceData.bcc_total_unlocked || 0) / 10000) * 100)}%` 
            }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Progress towards full BCC unlock (10,000 BCC target)
        </div>
      </div>

      {/* 72-Hour Release Countdown */}
      {shouldShowCountdown && nextReleaseTime && (
        <div className="bg-blue-100 rounded-lg p-4 border border-blue-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Next BCC Release</span>
            <span className="text-xs text-blue-600">Every 72 hours</span>
          </div>
          
          <CountdownTimer
            targetDate={nextReleaseTime.toISOString()}
            onComplete={() => {
              // Refresh data when countdown completes
              window.location.reload();
            }}
            className="text-lg font-mono font-bold text-blue-700"
          />
          
          <div className="text-xs text-blue-600 mt-2">
            {balanceData.bcc_locked > 0 && 
              `${Math.min(balanceData.bcc_locked, 100)} BCC will be released`
            }
          </div>
        </div>
      )}

      {/* Recent Release History */}
      {releaseLog && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Latest Release</div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-600 font-medium">
              +{releaseLog.bcc_released} BCC Released
            </span>
            <span className="text-gray-500">
              {new Date(releaseLog.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Reason: {releaseLog.release_reason || 'Scheduled 72-hour release'}
          </div>
        </div>
      )}

      {/* No Locked BCC Message */}
      {balanceData.bcc_locked === 0 && (
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <div className="text-gray-600 text-sm">
            No locked BCC. Upgrade your membership level to unlock more BCC!
          </div>
        </div>
      )}
    </div>
  );
};