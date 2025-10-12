import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Award, Calendar, ChevronLeft, ChevronRight, Clock, Filter, Search, X} from 'lucide-react';
import {useI18n} from '../../contexts/I18nContext';
import {useWallet} from '../../hooks/useWallet';
import {supabase} from '../../lib/supabase';

interface LayerReward {
  id: string;
  triggering_member_wallet: string;
  reward_recipient_wallet: string;
  matrix_root_wallet: string;
  triggering_nft_level: number;
  reward_amount: number;
  layer_position: string;
  matrix_layer: number;
  status: string;
  recipient_required_level: number;
  recipient_current_level: number;
  expires_at: string;
  created_at: string;
  claimed_at: string;
  rolled_up_to: string;
  roll_up_reason: string;
  triggering_member?: {
    wallet_address: string;
    users?: {
      username: string;
    };
  };
  matrix_root?: {
    wallet_address: string;
    users?: {
      username: string;
    };
  };
}

interface RewardHistoryProps {
  className?: string;
  walletAddress?: string;
}

export default function RewardHistory({ className, walletAddress }: RewardHistoryProps) {
  const { walletAddress: connectedWallet } = useWallet();
  const { t } = useI18n();
  const activeWallet = walletAddress || connectedWallet;
  
  // Data state
  const [layerRewards, setLayerRewards] = useState<LayerReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination state
  const [historyFilters, setHistoryFilters] = useState({
    layer: '',
    searchKeyword: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [filteredHistory, setFilteredHistory] = useState<LayerReward[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load layer rewards data
  const loadLayerRewards = async () => {
    if (!activeWallet) return;

    setLoading(true);
    setError(null);

    try {
      // Only load completed rewards for history (exclude pending and claimable)
      const { data, error } = await supabase
        .from('layer_rewards')
        .select(`
          id,
          triggering_member_wallet,
          reward_recipient_wallet,
          matrix_root_wallet,
          triggering_nft_level,
          reward_amount,
          layer_position,
          matrix_layer,
          status,
          recipient_required_level,
          recipient_current_level,
          expires_at,
          created_at,
          claimed_at,
          rolled_up_to,
          roll_up_reason
        `)
        .ilike('reward_recipient_wallet', activeWallet)
        .in('status', ['claimed', 'expired', 'rolled_up', 'forfeited']) // Only show completed rewards
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Get unique wallet addresses for username lookups
      const allWallets = new Set<string>();
      data?.forEach(reward => {
        if (reward.triggering_member_wallet) allWallets.add(reward.triggering_member_wallet);
        if (reward.matrix_root_wallet) allWallets.add(reward.matrix_root_wallet);
      });
      
      // Fetch usernames for all wallets
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('wallet_address, username')
        .in('wallet_address', Array.from(allWallets));
      
      if (usersError) {
        console.warn('Failed to load usernames:', usersError);
      }
      
      // Create a map of wallet addresses to usernames
      const usernameMap = new Map<string, string>();
      usersData?.forEach(user => {
        if (user.username) {
          usernameMap.set(user.wallet_address, user.username);
        }
      });
      
      // Enhance the rewards data with username information
      const enhancedRewards = data?.map(reward => ({
        ...reward,
        triggering_member: {
          wallet_address: reward.triggering_member_wallet,
          users: usernameMap.has(reward.triggering_member_wallet) ? {
            username: usernameMap.get(reward.triggering_member_wallet)!
          } : undefined
        },
        matrix_root: {
          wallet_address: reward.matrix_root_wallet,
          users: usernameMap.has(reward.matrix_root_wallet) ? {
            username: usernameMap.get(reward.matrix_root_wallet)!
          } : undefined
        }
      })) || [];
      
      setLayerRewards(enhancedRewards);
    } catch (err) {
      console.error('Failed to load layer rewards:', err);
      setError('Failed to load reward history');
    } finally {
      setLoading(false);
    }
  };

  // Load data when wallet changes
  useEffect(() => {
    loadLayerRewards();
  }, [activeWallet]);

  // Filter and pagination logic
  useEffect(() => {
    if (!layerRewards) {
      setFilteredHistory([]);
      return;
    }

    let filtered = [...layerRewards];

    // Apply filters
    if (historyFilters.layer) {
      filtered = filtered.filter(item => item.matrix_layer?.toString() === historyFilters.layer);
    }
    
    if (historyFilters.searchKeyword) {
      const keyword = historyFilters.searchKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        item.triggering_member?.users?.username?.toLowerCase().includes(keyword) ||
        item.matrix_root?.users?.username?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword) ||
        item.layer_position?.toLowerCase().includes(keyword)
      );
    }
    
    if (historyFilters.dateFrom) {
      filtered = filtered.filter(item => new Date(item.created_at) >= new Date(historyFilters.dateFrom));
    }
    
    if (historyFilters.dateTo) {
      filtered = filtered.filter(item => new Date(item.created_at) <= new Date(historyFilters.dateTo));
    }
    
    if (historyFilters.status) {
      filtered = filtered.filter(item => item.status === historyFilters.status);
    }

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [layerRewards, historyFilters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setHistoryFilters({ layer: '', searchKeyword: '', dateFrom: '', dateTo: '', status: '' });
  };

  const hasActiveFilters = historyFilters.layer || historyFilters.searchKeyword || 
                          historyFilters.dateFrom || historyFilters.dateTo || historyFilters.status;

  if (loading) {
    return (
      <Card className={`border-0 shadow-lg bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10 ${className}`}>
        <CardContent className="p-8 md:p-12">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-0 shadow-lg bg-gradient-to-br from-red-50/50 to-red-50/50 dark:from-red-900/10 dark:to-red-900/10 ${className}`}>
        <CardContent className="p-8 md:p-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Error Loading Rewards
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {error}
            </p>
            <Button variant="outline" onClick={loadLayerRewards}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!layerRewards || layerRewards.length === 0) {
    return (
      <Card className={`border-0 shadow-lg bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10 ${className}`}>
        <CardContent className="p-8 md:p-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-honey/20 to-amber-500/20 flex items-center justify-center">
              <Award className="h-10 w-10 text-honey" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('rewards.noHistory')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {t('rewards.noHistoryDescription') || 'Your reward transactions will appear here once you start earning through the matrix system.'}
            </p>
            <Button variant="outline" className="border-honey/30 text-honey hover:bg-honey/10">
              <span className="text-sm">{t('rewards.learnMore') || 'Learn More'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Premium Header */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-honey/10 via-amber-500/5 to-yellow-500/10 border-0 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_70%)]" />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-honey to-amber-500 flex items-center justify-center shadow-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-honey to-amber-500 bg-clip-text text-transparent">
                  {t('rewards.history.title') || 'Reward History'}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('rewards.history.subtitle') || 'Complete transaction history and reward tracking'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-honey/15 border-honey/30 text-honey font-semibold px-3 py-1"
              >
                {filteredHistory.length} {t('rewards.history.transactions') || 'Transactions'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-honey/30 text-honey hover:bg-honey/10"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <Card className="border border-honey/20 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-4 w-4 text-honey" />
                {t('rewards.history.filters') || 'Filters'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('rewards.history.searchPlaceholder') || 'Search...'}
                  value={historyFilters.searchKeyword}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, searchKeyword: e.target.value }))}
                  className="w-full pl-10 pr-3 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-honey/20 focus:border-honey"
                />
              </div>

              {/* Layer Filter */}
              <select
                value={historyFilters.layer}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, layer: e.target.value }))}
                className="w-full px-3 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-honey/20 focus:border-honey"
              >
                <option value="">{t('rewards.history.allLayers') || 'All Layers'}</option>
                {Array.from({ length: 19 }, (_, i) => i + 1).map(layer => (
                  <option key={layer} value={layer.toString()}>Layer {layer}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-honey/20 focus:border-honey"
              >
                <option value="">{t('rewards.history.allStatus')}</option>
                <option value="claimed">{t('rewards.status.claimed')}</option>
                <option value="expired">{t('rewards.status.expired')}</option>
                <option value="rolled_up">{t('rewards.status.rolled_up')}</option>
                <option value="forfeited">{t('rewards.status.forfeited')}</option>
              </select>

              {/* Date From */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={historyFilters.dateFrom}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  placeholder={t('rewards.history.dateFrom') || 'From Date'}
                  className="w-full pl-10 pr-3 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-honey/20 focus:border-honey"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={historyFilters.dateTo}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  placeholder={t('rewards.history.dateTo') || 'To Date'}
                  className="w-full pl-10 pr-3 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-honey/20 focus:border-honey"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-honey border-honey/30 hover:bg-honey/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('rewards.history.clearFilters') || 'Clear Filters'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground text-center">
        {t('rewards.history.showing') || 'Showing'} {Math.min(paginatedHistory.length, itemsPerPage)} {t('rewards.history.of') || 'of'} {filteredHistory.length} {t('rewards.history.results') || 'results'}
      </div>

      {/* Enhanced History List */}
      <div className="grid gap-3 md:gap-4">
        {paginatedHistory.length > 0 ? paginatedHistory.map((reward, index) => (
          <Card 
            key={reward.id} 
            className="group relative overflow-hidden border border-border/50 hover:border-honey/30 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.5s ease-out forwards'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    reward.status === 'claimed'
                      ? 'bg-gradient-to-br from-honey to-amber-500' :
                    reward.status === 'expired' || reward.status === 'forfeited'
                      ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      'bg-gradient-to-br from-blue-500 to-blue-600'
                  } shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {reward.status === 'claimed' ? (
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : reward.status === 'expired' || reward.status === 'forfeited' ? (
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm md:text-base text-foreground line-clamp-1 mb-1">
                      Layer {reward.matrix_layer} Reward {reward.layer_position ? `(${reward.layer_position})` : ''}
                    </h5>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>{new Date(reward.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>From: {reward.triggering_member?.users?.username || `User${reward.triggering_member_wallet?.slice(-4)}`}</span>
                      {reward.matrix_root_wallet !== reward.reward_recipient_wallet && (
                        <>
                          <span>•</span>
                          <span>Matrix: {reward.matrix_root?.users?.username || `User${reward.matrix_root_wallet?.slice(-4)}`}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Amount and Status */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-honey dark:text-amber-400">
                    ${Number(reward.reward_amount).toFixed(2)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs mt-1 ${
                      reward.status === 'claimed'
                        ? 'bg-honey/10 border-honey/30 text-honey dark:text-amber-400' :
                      reward.status === 'expired' || reward.status === 'forfeited'
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' :
                        'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {t(`rewards.status.${reward.status}`)}
                  </Badge>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted/50 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    reward.status === 'claimed'
                      ? 'bg-gradient-to-r from-honey to-amber-500 w-full' :
                    reward.status === 'expired' || reward.status === 'forfeited'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 w-1/3' :
                      'bg-gradient-to-r from-blue-500 to-blue-600 w-2/3'
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="border border-border/50">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                {t('rewards.history.noFilteredResults') || 'No transactions match your filters'}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-honey border-honey/30 hover:bg-honey/10"
                >
                  {t('rewards.history.clearFilters') || 'Clear Filters'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <Card className="border-0 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-10 w-10 p-0 border-honey/30 text-honey hover:bg-honey/10 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 p-0 ${
                        currentPage === page
                          ? 'bg-honey text-white border-honey hover:bg-amber-600'
                          : 'border-honey/30 text-honey hover:bg-honey/10'
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-10 w-10 p-0 border-honey/30 text-honey hover:bg-honey/10 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center mt-3 text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}