import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { RefreshCw, ArrowUpRight, Clock, DollarSign, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface RollupRewardsCardProps {
  walletAddress: string;
  className?: string;
}

interface RollupReward {
  id: string;
  reward_amount: number;
  status: string;
  roll_up_reason: string | null;
  rolled_up_at?: string | null;
  created_at: string | null;
  expires_at: string | null;
  matrix_layer: number;
  layer_position: string;
  triggering_member_wallet: string;
  reward_recipient_wallet: string;
  claimed_at?: string | null;
  direct_referrals_current?: number | null;
  direct_referrals_required?: number | null;
  triggering_nft_level?: number;
}

interface RollupStats {
  total_rolled_up: number;
  total_amount: number;
  by_reason: Record<string, { count: number; amount: number }>;
  recent_rollups: RollupReward[];
}

export default function RollupRewardsCard({ walletAddress, className }: RollupRewardsCardProps) {
  const { t } = useI18n();

  const { data: rollupStats, isLoading, error } = useQuery({
    queryKey: ['rollup-rewards', walletAddress],
    enabled: !!walletAddress,
    queryFn: async (): Promise<RollupStats> => {
      // Get all rolled up rewards for this wallet
      const { data: rollupRewards, error: rollupError } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', walletAddress)
        .eq('status', 'rolled_up')
        .order('created_at', { ascending: false });

      if (rollupError) throw rollupError;

      const rewards = rollupRewards || [];
      
      // Calculate stats
      const totalAmount = rewards.reduce((sum, r) => sum + r.reward_amount, 0);
      
      // Group by rollup reason
      const byReason: Record<string, { count: number; amount: number }> = {};
      rewards.forEach(reward => {
        const reason = reward.roll_up_reason || 'unknown';
        if (!byReason[reason]) {
          byReason[reason] = { count: 0, amount: 0 };
        }
        byReason[reason].count += 1;
        byReason[reason].amount += reward.reward_amount;
      });

      return {
        total_rolled_up: rewards.length,
        total_amount: totalAmount,
        by_reason: byReason,
        recent_rollups: rewards.slice(0, 10)
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatRollupReason = (reason: string | null) => {
    if (!reason) return t('common.unknown') || 'Unknown';
    
    // Use translations for rollup reasons
    const reasonKey = `rewards.rollup.reasons.${reason}`;
    const translatedReason = t(reasonKey);
    
    // If translation exists, use it; otherwise format the reason string
    if (translatedReason && translatedReason !== reasonKey) {
      return translatedReason;
    }
    
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRollupReasonColor = (reason: string | null) => {
    const colorMap: Record<string, string> = {
      'expired_timeout': 'text-red-500 border-red-500/30', // Layer 1 R position timeout
      'expired_unclaimed': 'text-red-500 border-red-500/30',
      'insufficient_level': 'text-orange-500 border-orange-500/30',
      'network_spillover': 'text-blue-500 border-blue-500/30',
      'manual_rollup': 'text-purple-500 border-purple-500/30',
      'system_rollup': 'text-gray-500 border-gray-500/30',
      'no_qualified_upline': 'text-gray-600 border-gray-600/30'
    };
    
    return colorMap[reason || ''] || 'text-gray-500 border-gray-500/30';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-honey" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-red-500">{t('common.error')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rollupStats || rollupStats.total_rolled_up === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-honey" />
            {t('rewards.rollup.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">{t('rewards.rollup.noRollupRewards')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('rewards.rollup.noRollupDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header Card */}
      <Card className={`relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 border-0 shadow-xl ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.1),transparent_70%)]" />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <ArrowUpRight className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {t('rewards.rollup.title')}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('rewards.rollup.subtitle') || 'Rewards automatically distributed to upline members'}
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className="bg-orange-500/15 border-orange-500/30 text-orange-500 font-semibold px-3 py-1"
            >
              {rollupStats.total_rolled_up} {t('rewards.rollup.items') || 'Items'}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Enhanced Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -translate-y-8 translate-x-8 md:-translate-y-10 md:translate-x-10" />
          <CardContent className="p-4 md:p-6 relative">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <span className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400">
                {t('rewards.rollup.totalRolledUp')}
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {rollupStats.total_rolled_up}
            </div>
            <div className="text-[10px] md:text-xs text-blue-500/70 mt-1">
              {t('rewards.rollup.distributedRewards') || 'Distributed rewards'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-full -translate-y-8 translate-x-8 md:-translate-y-10 md:translate-x-10" />
          <CardContent className="p-4 md:p-6 relative">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <span className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400">
                {t('rewards.rollup.totalAmount')}
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              ${rollupStats.total_amount.toFixed(2)}
            </div>
            <div className="text-[10px] md:text-xs text-green-500/70 mt-1">
              USDT {t('rewards.rollup.totalValue') || 'total value'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full -translate-y-8 translate-x-8 md:-translate-y-10 md:translate-x-10" />
          <CardContent className="p-4 md:p-6 relative">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <span className="text-xs md:text-sm font-medium text-purple-600 dark:text-purple-400">
                {t('rewards.rollup.reasons')}
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Object.keys(rollupStats.by_reason).length}
            </div>
            <div className="text-[10px] md:text-xs text-purple-500/70 mt-1">
              {t('rewards.rollup.reasonTypes') || 'different reason types'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Content Area - Mobile Optimized */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
        <CardContent className="space-y-4 md:space-y-8 p-4 md:p-8">

        {/* Enhanced Rollup Reasons Breakdown - Mobile Optimized */}
        {Object.keys(rollupStats.by_reason).length > 0 && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-bold text-foreground">{t('rewards.rollup.rollupBreakdown')}</h4>
            </div>
            
            <div className="grid gap-3 md:gap-4">
              {Object.entries(rollupStats.by_reason).map(([reason, stats], index) => (
                <div 
                  key={reason} 
                  className="group relative overflow-hidden rounded-xl border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="flex items-center justify-between p-3 md:p-4 relative">
                    <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge 
                          variant="outline" 
                          className={`${getRollupReasonColor(reason)} font-medium mb-1 text-xs md:text-sm`}
                        >
                          {formatRollupReason(reason)}
                        </Badge>
                        <div className="text-xs md:text-sm text-muted-foreground truncate">
                          {(stats as any).count} reward{(stats as any).count !== 1 ? 's' : ''} distributed
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg md:text-xl font-bold text-honey">
                        ${(stats as any).amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">
                        USDT
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Recent Rollups Timeline - Mobile Optimized */}
        {rollupStats.recent_rollups.length > 0 && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-bold text-foreground">{t('rewards.rollup.recentRollups')}</h4>
            </div>
            
            <div className="relative">
              {/* Timeline Line - Hidden on mobile */}
              <div className="hidden md:block absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-honey via-orange-500 to-transparent" />
              
              <div className="space-y-3 md:space-y-4 max-h-64 md:max-h-80 overflow-y-auto custom-scrollbar">
                {rollupStats.recent_rollups.slice(0, 5).map((reward, index) => (
                  <div 
                    key={reward.id} 
                    className="relative flex gap-3 md:gap-4 group"
                    style={{
                      animationDelay: `${index * 150}ms`,
                      animation: 'slideInFromLeft 0.6s ease-out forwards'
                    }}
                  >
                    {/* Timeline Node */}
                    <div className="relative z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </div>
                    
                    {/* Content Card */}
                    <Card className="flex-1 border-border/50 hover:border-honey/30 transition-all duration-300 hover:shadow-md md:hover:translate-x-1 min-w-0">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-start justify-between mb-2 md:mb-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-base md:text-lg font-bold text-honey">
                                ${reward.reward_amount.toFixed(2)}
                              </span>
                              <span className="text-[10px] md:text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                                USDT
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`${getRollupReasonColor(reward.roll_up_reason)} text-[10px] md:text-xs`}
                            >
                              {formatRollupReason(reward.roll_up_reason)}
                            </Badge>
                          </div>
                          
                          <div className="text-right text-[10px] md:text-xs text-muted-foreground flex-shrink-0 ml-2">
                            <div>Layer {reward.matrix_layer}</div>
                            <div>Pos. {reward.layer_position}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground">
                          <span className="truncate">
                            {reward.expires_at 
                              ? `Expired ${new Date(reward.expires_at).toLocaleDateString()}`
                              : `Created ${new Date(reward.created_at || '').toLocaleDateString()}`
                            }
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span>Rolled up</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Information Section */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_70%)]" />
          <CardContent className="p-6 relative">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  {t('rewards.rollup.aboutRollup')}
                </h4>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                  {t('rewards.rollup.aboutRollupDescription')}
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 text-xs">
                    {t('rewards.rollup.automatic') || 'Automatic'}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 text-xs">
                    {t('rewards.rollup.transparent') || 'Transparent'}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 text-xs">
                    {t('rewards.rollup.efficient') || 'Efficient'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
    </div>
  );
}