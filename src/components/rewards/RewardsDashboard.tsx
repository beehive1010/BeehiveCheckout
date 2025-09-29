import React, {useEffect, useState} from 'react';
import {Card, CardContent} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {Clock, Coins, DollarSign, Download, Gift, History, TrendingUp, Wallet} from 'lucide-react';
import {useWallet} from '../../hooks/useWallet';
import {rewardService} from '../../lib/supabaseClient';
import {useI18n} from '../../contexts/I18nContext';
import RewardClaimModal from './RewardClaimModal';
import RewardWithdrawModal from './RewardWithdrawModal';
import RewardHistory from './RewardHistory';
import BCCTopUpModal from './BCCTopUpModal';

interface RewardsDashboardProps {
  className?: string;
}

export default function RewardsDashboard({ className }: RewardsDashboardProps) {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const [rewardData, setRewardData] = useState<any>(null);
  const [claimableRewards, setClaimableRewards] = useState<any[]>([]);
  const [rewardBalance, setRewardBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBCCTopUpModal, setShowBCCTopUpModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);

  useEffect(() => {
    if (walletAddress) {
      loadRewardData();
    }
  }, [walletAddress]);

  const loadRewardData = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      // Load all reward data
      const [dashboardResult, claimableResult, balanceResult] = await Promise.all([
        rewardService.getRewardDashboard(walletAddress),
        rewardService.getClaimableRewards(walletAddress),
        rewardService.getRewardBalance(walletAddress)
      ]);

      if (dashboardResult.data) {
        setRewardData(dashboardResult.data);
      }

      if (claimableResult.data) {
        setClaimableRewards(claimableResult.data);
      }

      if (balanceResult.data) {
        setRewardBalance(balanceResult.data);
      }

    } catch (error) {
      console.error('Failed to load reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = (reward: any) => {
    setSelectedReward(reward);
    setShowClaimModal(true);
  };

  const handleWithdrawReward = () => {
    setShowWithdrawModal(true);
  };

  const formatCurrency = (amount: number, currency: 'USDT' | 'BCC') => {
    return `${amount?.toFixed(2) || '0.00'} ${currency}`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <Card>
            <CardContent className="pt-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 px-4 sm:px-6 ${className}`}>
      {/* Reward Balance Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-950/20 dark:via-green-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left-2">
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-emerald-400/20 rounded-full blur-xl group-hover:bg-emerald-400/30 transition-colors duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-emerald-500/20 mr-3">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">{t('rewards.available_usdt')}</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200 truncate">
                  {formatCurrency(rewardBalance?.available_usdt || 0, 'USDT')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-honey/10 dark:from-amber-950/20 dark:via-yellow-950/30 dark:to-honey/20 border-honey/30 dark:border-honey/40 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left-3">
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-honey/20 rounded-full blur-xl group-hover:bg-honey/30 transition-colors duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-honey/20 mr-3">
                    <Coins className="h-5 w-5 text-honey" />
                  </div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">{t('rewards.available_bcc')}</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-honey truncate">
                  {formatCurrency(rewardBalance?.available_bcc || 0, 'BCC')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/20 dark:via-indigo-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right-3">
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-400/20 rounded-full blur-xl group-hover:bg-blue-400/30 transition-colors duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-blue-500/20 mr-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">{t('rewards.total_earned')}</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-200 truncate">
                  {formatCurrency(rewardData?.total_earned_usdt || 0, 'USDT')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-orange-950/20 dark:via-amber-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right-2">
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-orange-400/20 rounded-full blur-xl group-hover:bg-orange-400/30 transition-colors duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-orange-500/20 mr-3">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide">{t('rewards.pending_rewards')}</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-800 dark:text-orange-200">
                  {claimableRewards?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Mobile Enhanced */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in-50 duration-500">
        <Button 
          onClick={handleWithdrawReward}
          disabled={!rewardBalance?.available_usdt && !rewardBalance?.available_bcc}
          className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 flex-1 sm:flex-none"
        >
          <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="relative flex items-center justify-center">
            <Download className="h-4 w-4 mr-2 group-hover:animate-bounce" />
            <span className="font-semibold">{t('rewards.withdraw')}</span>
          </div>
        </Button>

        <Button 
          onClick={() => setShowBCCTopUpModal(true)}
          className="relative group overflow-hidden bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 flex-1 sm:flex-none"
        >
          <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="relative flex items-center justify-center">
            <Coins className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-semibold">{t('rewards.top_up_bcc')}</span>
          </div>
        </Button>

        <Button 
          variant="outline"
          onClick={loadRewardData}
          className="relative group overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 flex-1 sm:flex-none"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="relative flex items-center justify-center">
            <TrendingUp className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-semibold">{t('rewards.refresh')}</span>
          </div>
        </Button>
      </div>

      {/* Tabs for different views - Mobile Enhanced */}
      <Tabs defaultValue="claimable" className="space-y-4 animate-in fade-in-50 duration-700">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100 dark:from-slate-800 dark:via-gray-800 dark:to-slate-800 rounded-2xl shadow-lg border-2 border-slate-200/50 dark:border-slate-700/50">
          <TabsTrigger 
            value="claimable" 
            className="group relative flex items-center justify-center gap-2 rounded-xl px-3 py-3 sm:px-6 sm:py-4 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-200 dark:data-[state=active]:shadow-emerald-900/50 data-[state=active]:scale-105"
          >
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 group-data-[state=active]:animate-pulse" />
              <span className="font-medium text-sm sm:text-base">
                {t('rewards.claimable')}
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white text-xs px-2 py-1">
                {claimableRewards?.length || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="group relative flex items-center justify-center gap-2 rounded-xl px-3 py-3 sm:px-6 sm:py-4 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200 dark:data-[state=active]:shadow-blue-900/50 data-[state=active]:scale-105"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 group-data-[state=active]:animate-pulse" />
              <span className="font-medium text-sm sm:text-base">{t('rewards.history')}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claimable" className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
          {claimableRewards?.length > 0 ? (
            <div className="grid gap-3 sm:gap-4">
              {claimableRewards.map((reward: any, index) => (
                <Card key={reward.id} className={`group relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-in slide-in-from-left-${index + 1}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-honey/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative pt-4 pb-4">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg px-3 py-1 rounded-full">
                            Layer {reward.layer}
                          </Badge>
                          <Badge className="bg-gradient-to-r from-honey to-amber-400 text-black shadow-lg px-3 py-1 rounded-full font-semibold">
                            Level {reward.nft_level} NFT
                          </Badge>
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg px-3 py-1 rounded-full">
                            {reward.reward_type || 'Layer Reward'}
                          </Badge>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(reward.reward_amount_usdc, 'USDT')}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              From: <span className="text-blue-600 dark:text-blue-400 font-semibold">{reward.trigger_info?.trigger_member_name || 'Member'}</span>
                            </p>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                              <span className="text-lg">💡</span>
                              <span>{reward.trigger_info?.trigger_member_name} purchased Level {reward.nft_level} NFT at Layer {reward.layer} ({reward.trigger_info?.layer_position})</span>
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reward.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleClaimReward(reward)}
                        className="relative group overflow-hidden bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 rounded-xl px-6 py-3 font-bold lg:min-w-[120px]"
                      >
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                        <div className="relative flex items-center gap-2">
                          <Wallet className="h-4 w-4 group-hover:animate-bounce" />
                          {t('rewards.claim')}
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="space-y-4 animate-in fade-in-50 duration-700">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-200/50 to-gray-200/50 dark:from-slate-700/50 dark:to-slate-600/50 rounded-full blur-xl group-hover:scale-110 transition-transform duration-300"></div>
                    <Gift className="relative h-16 w-16 mx-auto text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors duration-300" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">{t('rewards.no_claimable_rewards')}</p>
                  <p className="text-sm text-muted-foreground/70">Check back later for new rewards!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <RewardHistory />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RewardClaimModal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false);
          setSelectedReward(null);
        }}
        reward={selectedReward}
        onClaimed={loadRewardData}
      />

      <RewardWithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        rewardBalance={rewardBalance}
        onWithdrawn={loadRewardData}
      />

      <BCCTopUpModal
        isOpen={showBCCTopUpModal}
        onClose={() => setShowBCCTopUpModal(false)}
        onTopUpComplete={loadRewardData}
      />
    </div>
  );
}