import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  DollarSign, 
  Coins, 
  TrendingUp, 
  Clock, 
  Download,
  History,
  Gift,
  Wallet
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { rewardService } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';
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
    <div className={`space-y-6 ${className}`}>
      {/* Reward Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('rewards.available_usdt')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(rewardBalance?.available_usdt || 0, 'USDT')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-honey" />
              <div>
                <p className="text-xs text-muted-foreground">{t('rewards.available_bcc')}</p>
                <p className="text-2xl font-bold text-honey">
                  {formatCurrency(rewardBalance?.available_bcc || 0, 'BCC')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('rewards.total_earned')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(rewardData?.total_earned_usdt || 0, 'USDT')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('rewards.pending_rewards')}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {claimableRewards?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Button 
          onClick={handleWithdrawReward}
          className="bg-green-600 hover:bg-green-700"
          disabled={!rewardBalance?.available_usdt && !rewardBalance?.available_bcc}
        >
          <Download className="h-4 w-4 mr-2" />
          {t('rewards.withdraw')}
        </Button>

        <Button 
          onClick={() => setShowBCCTopUpModal(true)}
          className="bg-honey hover:bg-honey/90 text-black"
        >
          <Coins className="h-4 w-4 mr-2" />
          {t('rewards.top_up_bcc')}
        </Button>

        <Button 
          variant="outline"
          onClick={loadRewardData}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {t('rewards.refresh')}
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="claimable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claimable" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            {t('rewards.claimable')} ({claimableRewards?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('rewards.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claimable" className="space-y-4">
          {claimableRewards?.length > 0 ? (
            <div className="grid gap-4">
              {claimableRewards.map((reward: any) => (
                <Card key={reward.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Layer {reward.layer}
                          </Badge>
                          <Badge className="bg-honey text-black">
                            Level {reward.nft_level} NFT
                          </Badge>
                          <Badge variant="outline" className="text-green-600">
                            {reward.reward_type || 'Layer Reward'}
                          </Badge>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(reward.reward_amount_usdc, 'USDT')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          From: {reward.trigger_info?.trigger_member_name || 'Member'}
                        </p>
                        <p className="text-xs text-green-600">
                          💡 {reward.trigger_info?.trigger_member_name} purchased Level {reward.nft_level} NFT at Layer {reward.layer} ({reward.trigger_info?.layer_position})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reward.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleClaimReward(reward)}
                        className="bg-honey hover:bg-honey/90 text-black"
                      >
                        {t('rewards.claim')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('rewards.no_claimable_rewards')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <RewardHistory walletAddress={walletAddress || ''} />
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