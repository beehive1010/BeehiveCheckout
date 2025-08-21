import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';

interface MatrixData {
  referralNode: {
    walletAddress: string;
    parentWallet: string | null;
    children: string[];
    createdAt: string;
  };
  childrenDetails: Array<{
    walletAddress: string;
    username: string;
    memberActivated: boolean;
    currentLevel: number;
    children: string[];
  }>;
  rewardEvents: Array<{
    id: string;
    buyerWallet: string;
    sponsorWallet: string;
    eventType: string;
    level: number;
    amount: number;
    status: string;
    timerStartAt: string | null;
    timerExpireAt: string | null;
    createdAt: string;
  }>;
}

export default function HiveWorld() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState('');

  // Generate referral link
  const generateReferralLink = () => {
    if (walletAddress) {
      const baseUrl = window.location.origin;
      return `${baseUrl}/?ref=${walletAddress}`;
    }
    return '';
  };

  // Fetch matrix data
  const { data: matrixData, isLoading: isLoadingMatrix } = useQuery<MatrixData>({
    queryKey: ['/api/hiveworld/matrix'],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/hiveworld/matrix', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch matrix data');
      return response.json();
    },
  });

  const copyReferralLink = () => {
    const link = generateReferralLink();
    navigator.clipboard.writeText(link);
    toast({
      title: t('hiveworld.linkCopied.title'),
      description: t('hiveworld.linkCopied.description'),
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDirectReferrals = () => {
    return matrixData?.childrenDetails.length || 0;
  };

  const getTotalTeam = () => {
    let total = 0;
    matrixData?.childrenDetails.forEach(child => {
      total += 1 + child.children.length; // Child + their children
    });
    return total;
  };

  const getPendingRewards = () => {
    return matrixData?.rewardEvents
      .filter(event => event.status === 'pending')
      .reduce((sum, event) => sum + event.amount, 0) || 0;
  };

  const getTotalEarned = () => {
    return matrixData?.rewardEvents
      .filter(event => event.status === 'completed')
      .reduce((sum, event) => sum + event.amount, 0) || 0;
  };

  const getTimeRemaining = (expireAt: string | null) => {
    if (!expireAt) return null;
    
    const now = new Date().getTime();
    const expire = new Date(expireAt).getTime();
    const remaining = expire - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (isLoadingMatrix) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted skeleton w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted skeleton"></div>
            ))}
          </div>
          <div className="h-96 bg-muted skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('hiveworld.title')}
      </h2>
      
      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-honey">{getDirectReferrals()}</div>
            <div className="text-muted-foreground text-sm">{t('hiveworld.stats.directReferrals')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-honey">{getTotalTeam()}</div>
            <div className="text-muted-foreground text-sm">{t('hiveworld.stats.totalTeam')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-honey">{getPendingRewards()}</div>
            <div className="text-muted-foreground text-sm">{t('hiveworld.stats.pending')} (USDT)</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-honey">{getTotalEarned()}</div>
            <div className="text-muted-foreground text-sm">{t('hiveworld.stats.totalEarned')} (USDT)</div>
          </CardContent>
        </Card>
      </div>

      {/* 3x3 Matrix Visualization */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <h3 className="text-honey font-semibold text-lg mb-4">
            {t('hiveworld.matrix.title')}
          </h3>
          <div className="flex flex-col items-center space-y-4">
            {/* You (Root) */}
            <div className="flex justify-center">
              <div className="relative">
                <HexagonIcon size="xl">
                  <i className="fas fa-user text-honey text-xl"></i>
                </HexagonIcon>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-honey font-semibold">
                  {t('hiveworld.matrix.you')}
                </div>
              </div>
            </div>
            
            {/* Level 1 (Direct Referrals) */}
            <div className="flex justify-center space-x-8">
              {[0, 1, 2].map((index) => {
                const child = matrixData?.childrenDetails[index];
                return (
                  <div key={index} className="relative">
                    <HexagonIcon size="lg">
                      <i className={`fas fa-user ${child?.memberActivated ? 'text-green-400' : 'text-muted-foreground'}`}></i>
                    </HexagonIcon>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center">
                      {child ? (
                        <>
                          <div className={child.memberActivated ? 'text-green-400' : 'text-muted-foreground'}>
                            L{child.currentLevel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAddress(child.walletAddress)}
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">Empty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Level 2 (Indirect Referrals) */}
            <div className="grid grid-cols-9 gap-2 max-w-md">
              {[...Array(9)].map((_, index) => {
                const parentIndex = Math.floor(index / 3);
                const child = matrixData?.childrenDetails[parentIndex];
                const grandChildIndex = index % 3;
                const hasGrandChild = child && child.children.length > grandChildIndex;
                
                return (
                  <div key={index} className="flex justify-center">
                    <HexagonIcon className="w-10 h-10">
                      <i className={`fas ${hasGrandChild ? 'fa-user text-blue-400' : 'fa-plus text-muted-foreground'} text-xs`}></i>
                    </HexagonIcon>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex justify-center space-x-6 text-xs mt-4">
              <div className="flex items-center space-x-1">
                <i className="fas fa-user text-green-400"></i>
                <span className="text-muted-foreground">{t('hiveworld.matrix.activeDirect')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-user text-blue-400"></i>
                <span className="text-muted-foreground">{t('hiveworld.matrix.activeIndirect')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-plus text-muted-foreground"></i>
                <span className="text-muted-foreground">{t('hiveworld.matrix.availableSlot')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <h3 className="text-honey font-semibold text-lg mb-4">
            {t('hiveworld.referralLink.title')}
          </h3>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              type="text"
              value={generateReferralLink()}
              readOnly
              className="flex-1 input-honey"
              data-testid="input-referral-link"
            />
            <Button
              onClick={copyReferralLink}
              className="btn-honey"
              data-testid="button-copy-referral"
            >
              <i className="fas fa-copy mr-2"></i>
              {t('hiveworld.referralLink.copy')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reward History */}
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <h3 className="text-honey font-semibold text-lg mb-4">
            {t('hiveworld.rewardHistory.title')}
          </h3>
          <div className="space-y-3">
            {matrixData?.rewardEvents.length ? (
              matrixData.rewardEvents.map((reward) => (
                <div 
                  key={reward.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <i className={`fas ${
                      reward.eventType === 'L1_direct' ? 'fa-gift text-green-400' :
                      reward.eventType === 'L2plus_upgrade' ? 'fa-clock text-yellow-400' :
                      'fa-arrow-up text-blue-400'
                    }`}></i>
                    <div>
                      <p className="text-honey text-sm font-medium">
                        {reward.eventType === 'L1_direct' && t('hiveworld.rewardHistory.directBonus')}
                        {reward.eventType === 'L2plus_upgrade' && t('hiveworld.rewardHistory.upgradeReward')}
                        {reward.eventType === 'rollup' && t('hiveworld.rewardHistory.rollupReward')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        From: {formatAddress(reward.buyerWallet)} • L{reward.level}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      reward.status === 'completed' ? 'text-green-400' :
                      reward.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      +{reward.amount} USDT
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {reward.status === 'pending' && reward.timerExpireAt 
                        ? getTimeRemaining(reward.timerExpireAt)
                        : reward.status === 'completed' 
                        ? t('hiveworld.rewardHistory.completed')
                        : reward.status === 'expired'
                        ? t('hiveworld.rewardHistory.expired')
                        : reward.status
                      }
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-gift text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground">
                  {t('hiveworld.rewardHistory.noRewards')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
