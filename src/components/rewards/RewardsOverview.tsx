import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Award, DollarSign} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {useI18n} from '../../contexts/I18nContext';

interface RewardsOverviewProps {
  walletAddress: string;
  className?: string;
}

interface RewardsOverviewData {
  wallet_address: string;
  total_rewards_count: number;
  pending_rewards_count: number;
  claimable_rewards_count: number;
  claimed_rewards_count: number;
  total_amount_usdt: number;
  pending_amount_usdt: number;
  claimable_amount_usdt: number;
  claimed_amount_usdt: number;
  latest_reward_time: string;
  latest_claim_time: string;
}

export default function RewardsOverview({ walletAddress, className }: RewardsOverviewProps) {
  const { t } = useI18n();
  const { data: rewardsOverview, isLoading } = useQuery<RewardsOverviewData>({
    queryKey: ['member-rewards-overview', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_rewards_overview_v2')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-6 sm:py-8">
            <div className="relative">
              <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-slate-200 border-t-honey mx-auto mb-4"></div>
            </div>
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300">{t('rewards.loading_overview')}</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-honey rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-honey rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-honey rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rewardsOverview) {
    return (
      <Card className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 shadow-lg ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-6 sm:py-8 animate-in fade-in-50 duration-700">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-200/50 to-gray-200/50 dark:from-slate-700/50 dark:to-slate-600/50 rounded-full blur-xl group-hover:scale-110 transition-transform duration-300"></div>
              <Award className="relative h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-slate-400 mx-auto mb-4 transition-colors duration-300" />
            </div>
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-semibold text-muted-foreground">{t('rewards.no_data')}</p>
              <p className="text-sm text-muted-foreground/70">{t('rewards.start_earning')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-top-2 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-emerald-500/5 opacity-50"></div>
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
          <div className="p-2 rounded-full bg-gradient-to-r from-honey/20 to-amber-400/20">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-honey" />
          </div>
          <span className="bg-gradient-to-r from-slate-700 to-gray-800 dark:from-slate-200 dark:to-gray-100 bg-clip-text text-transparent font-bold">
            {t('rewards.overview')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="group p-4 rounded-xl bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('rewards.total_rewards')}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">{rewardsOverview.total_rewards_count}</p>
              </div>
              <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-600 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">{t('rewards.claimable')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200">{rewardsOverview.claimable_rewards_count}</p>
                  {rewardsOverview.claimable_rewards_count > 0 && (
                    <Badge className="bg-emerald-500 text-white shadow-lg animate-pulse px-2 py-1 text-xs">
                      {t('rewards.new')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-2 rounded-full bg-emerald-200 dark:bg-emerald-800 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide">{t('rewards.pending')}</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-800 dark:text-orange-200">{rewardsOverview.pending_rewards_count}</p>
              </div>
              <div className="p-2 rounded-full bg-orange-200 dark:bg-orange-800 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">{t('rewards.claimed')}</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-200">{rewardsOverview.claimed_rewards_count}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-200 dark:bg-blue-800 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-950/20 dark:via-green-950/30 dark:to-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300">{t('rewards.total_earned')}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                  ${(rewardsOverview.total_amount_usdt || 0).toFixed(2)}
                </p>
                {rewardsOverview.claimable_amount_usdt > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">{t('rewards.available_to_claim')}</p>
                    <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                      ${(rewardsOverview.claimable_amount_usdt || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}