import { useState } from 'react';
import { useWallet } from '../../../hooks/useWallet';
import { useI18n } from '../../../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';
import { apiRequest } from '../../../lib/queryClient';
import MobileDivider from '../../shared/components/MobileDivider';
import UserProfile from '../../shared/components/UserProfile';
import { membershipLevels, getMembershipLevel } from '../../../lib/config/membershipLevels';
import ClaimMembershipButton from '../../membership/components/ClaimMembershipButton';
import { StarIcon, FireIcon, TagIcon, GiftIcon } from '@heroicons/react/24/outline';

interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  serviceName: string;
  serviceType: 'dapp' | 'banner' | 'promotion';
  priceBCC: number;
  totalSupply: number;
  claimedCount: number;
  createdAt: string;
}

export default function Tasks() {
  const { walletAddress, bccBalance, currentLevel, isActivated } = useWallet();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<'membership' | 'advertisement'>('membership');
  const [selectedBucketType, setSelectedBucketType] = useState<'transferable' | 'restricted'>('transferable');

  // Fetch advertisement NFTs
  const { data: nfts = [], isLoading: isLoadingNFTs } = useQuery<AdvertisementNFT[]>({
    queryKey: ['/api/ads/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/ads/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

  // Helper function to determine if a level is available for purchase
  const getLevelStatus = (level: number) => {
    if (level <= currentLevel) {
      return 'owned'; // User already owns this level
    } else if (level === currentLevel + 1) {
      return 'available'; // Next level available for purchase
    } else {
      return 'locked'; // Level is locked until previous levels are purchased
    }
  };

  // Get available membership levels (up to level 18)
  const availableLevels = membershipLevels.slice(0, 18);

  // Claim NFT mutation
  const claimNFTMutation = useMutation({
    mutationFn: async ({ nftId, bucketType }: { nftId: string; bucketType: string }) => {
      const response = await fetch('/api/ads/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ nftId, bucketType }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim NFT');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('ads.claim.success.title'),
        description: t('ads.claim.success.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: t('ads.claim.error.title'),
        description: error.message || t('ads.claim.error.description'),
        variant: 'destructive',
      });
    },
  });


  const totalBCC = (bccBalance?.transferable || 0) + (bccBalance?.restricted || 0);

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'dapp': return <StarIcon className="w-4 h-4" />;
      case 'banner': return <TagIcon className="w-4 h-4" />;
      case 'promotion': return <GiftIcon className="w-4 h-4" />;
      default: return <StarIcon className="w-4 h-4" />;
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case 'dapp': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'banner': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'promotion': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-honey/20 text-honey border-honey/30';
    }
  };

  const canAfford = (price: number, bucketType: 'transferable' | 'restricted') => {
    if (!bccBalance) return false;
    const balance = bucketType === 'transferable' ? bccBalance.transferable : bccBalance.restricted;
    return balance >= price;
  };

  if (!walletAddress) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto bg-secondary border-border">
          <CardContent className="p-6 space-y-4">
            <div className="text-honey">
              <i className="fas fa-wallet text-4xl mb-4"></i>
            </div>
            <h3 className="text-xl font-bold text-honey">
              {t('registration.walletRequired.title')}
            </h3>
            <p className="text-muted-foreground">
              {t('registration.walletRequired.description')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* User Profile Component */}
      <UserProfile />
      
      {/* Mobile Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-honey mb-2 flex items-center">
          <i className="fas fa-tasks mr-3 text-honey"></i>
          {t('tasks.pageTitle')}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mb-3">
          {t('tasks.membership.description')} • {t('tasks.advertisement.description')}
        </p>
        
        {/* NFT Center Navigation Button */}
        <div className="flex justify-center my-4">
          <Button
            onClick={() => {
              window.location.href = '/nft-center';
            }}
            className="bg-honey text-black hover:bg-honey/90 px-6 py-2 font-semibold"
            data-testid="button-nft-center"
          >
            <i className="fas fa-gems mr-2"></i>
            NFT Center
          </Button>
        </div>
        
        <MobileDivider className="md:hidden" />
      </div>
      

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          <button
            onClick={() => setActiveCategory('membership')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === 'membership'
                ? 'bg-honey text-black'
                : 'bg-secondary text-muted-foreground hover:text-honey hover:bg-honey/10'
            }`}
            data-testid="filter-membership"
          >
            <i className="fas fa-crown mr-2"></i>
            {t('tasks.categories.membership')}
          </button>
          <button
            onClick={() => setActiveCategory('advertisement')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === 'advertisement'
                ? 'bg-honey text-black'
                : 'bg-secondary text-muted-foreground hover:text-honey hover:bg-honey/10'
            }`}
            data-testid="filter-advertisement"
          >
            <i className="fas fa-bullhorn mr-2"></i>
            {t('tasks.categories.advertisement')}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeCategory === 'membership' ? (
        <>
          <MobileDivider withText={`${t('tasks.membership.title')} • ${t('tasks.membership.level')} ${currentLevel} ${currentLevel > 0 ? t('tasks.membership.status.owned') : 'Inactive'}`} className="mb-6" />
          
          {/* User Status Header */}
          <Card className="bg-secondary border-border mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-honey font-semibold text-lg">{t('tasks.membership.title')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentLevel === 0 
                      ? t('tasks.membership.getStarted')
                      : `${t('tasks.membership.level')} ${currentLevel} • ${t('tasks.membership.upgradeNow')}: ${t('tasks.membership.level')} ${currentLevel + 1} ${availableLevels[currentLevel]?.titleEn || 'Max Level'}`
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-honey font-bold text-xl">{currentLevel}</p>
                    <p className="text-muted-foreground text-xs">{t('tasks.membership.level')}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                    <i className="fas fa-crown text-honey"></i>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Membership Levels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableLevels.map((level) => {
              const status = getLevelStatus(level.level);
              const isOwned = status === 'owned';
              const isAvailable = status === 'available';
              const isLocked = status === 'locked';
              
              return (
                <Card 
                  key={level.level}
                  className={`border transition-all relative overflow-hidden ${
                    isOwned 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : isAvailable 
                      ? 'bg-honey/10 border-honey/30 glow-hover' 
                      : 'bg-muted/30 border-muted'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {isOwned && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-500/20 text-green-400">
                        <i className="fas fa-check mr-1"></i>{t('tasks.membership.status.owned')}
                      </span>
                    )}
                    {isAvailable && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-honey/20 text-honey">
                        {t('tasks.membership.status.available')}
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        <i className="fas fa-lock mr-1"></i>{t('tasks.membership.status.locked')}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                        isOwned 
                          ? 'bg-green-500/20' 
                          : isAvailable 
                          ? 'bg-honey/20' 
                          : 'bg-muted/50'
                      }`}>
                        <i className={`fas fa-crown text-xl ${
                          isOwned 
                            ? 'text-green-400' 
                            : isAvailable 
                            ? 'text-honey' 
                            : 'text-muted-foreground'
                        }`}></i>
                      </div>
                      
                      <h3 className={`font-bold text-lg ${
                        isOwned 
                          ? 'text-green-400' 
                          : isAvailable 
                          ? 'text-honey' 
                          : 'text-muted-foreground'
                      }`}>
                        {t('tasks.membership.level')} {level.level}
                      </h3>
                      
                      <p className={`text-sm font-medium ${
                        isOwned 
                          ? 'text-green-400/80' 
                          : isAvailable 
                          ? 'text-honey/80' 
                          : 'text-muted-foreground'
                      }`}>
                        {language === 'zh' ? level.titleZh : level.titleEn}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          isOwned 
                            ? 'text-green-400' 
                            : isAvailable 
                            ? 'text-honey' 
                            : 'text-muted-foreground'
                        }`}>
                          ${(level.priceUSDT / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('tasks.membership.usdt')}</p>
                      </div>

                      {/* Purchase Button */}
                      {isOwned ? (
                        <Button 
                          disabled 
                          className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/20"
                          data-testid={`button-owned-level-${level.level}`}
                        >
                          <i className="fas fa-check mr-2"></i>
                          {t('tasks.membership.status.owned')}
                        </Button>
                      ) : isAvailable ? (
                        <ClaimMembershipButton
                          walletAddress={walletAddress || ''}
                          level={level.level}
                          className="w-full"
                          onSuccess={() => {
                            toast({
                              title: t('membership.purchase.success.title'),
                              description: t('membership.purchase.success.description'),
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                          }}
                          onError={(error) => {
                            toast({
                              title: t('membership.purchase.error.title'),
                              description: error,
                              variant: 'destructive',
                            });
                          }}
                        />
                      ) : (
                        <Button 
                          disabled 
                          className="w-full bg-muted text-muted-foreground"
                          data-testid={`button-locked-level-${level.level}`}
                        >
                          <i className="fas fa-lock mr-2"></i>
                          {t('tasks.membership.status.locked')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <MobileDivider withText={`${t('tasks.advertisement.title')} • ${nfts.length} ${t('tasks.membership.status.available')}`} className="mb-6" />
          
          {/* Marketplace Header */}
          <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-honey mb-1">{t('tasks.advertisement.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('tasks.advertisement.description')}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center bg-honey/10 px-3 py-1 rounded-full">
                  <i className="fas fa-coins text-honey mr-2"></i>
                  <span className="text-honey font-medium">BCC Only</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Advertisement NFT Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingNFTs ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-secondary border-border animate-pulse">
                  <div className="aspect-video bg-muted rounded-t-lg"></div>
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              nfts.map((nft) => (
                <Card key={nft.id} className="bg-secondary border-border glow-hover group">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={nft.imageUrl}
                      alt={nft.title}
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className={`${getServiceTypeColor(nft.serviceType)} border`}>
                        <span className="flex items-center gap-1">
                          {getServiceTypeIcon(nft.serviceType)}
                          {nft.serviceType.toUpperCase()}
                        </span>
                      </Badge>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-honey text-black">
                        {nft.serviceName}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-honey mb-2">{nft.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{nft.description}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-honey">{nft.priceBCC}</div>
                        <div className="text-xs text-muted-foreground">{t('ads.bccRequired')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold">{nft.totalSupply - nft.claimedCount}</div>
                        <div className="text-xs text-muted-foreground">{t('ads.available')}</div>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-honey text-black hover:bg-honey/90"
                          disabled={nft.claimedCount >= nft.totalSupply}
                          data-testid={`button-claim-${nft.id}`}
                        >
                          {nft.claimedCount >= nft.totalSupply ? t('ads.soldOut') : t('ads.claimNft')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border-border">
                        <DialogHeader>
                          <DialogTitle className="text-honey">{t('ads.claimNft')} {nft.title}</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            {t('ads.bucketSelection')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select
                            value={selectedBucketType}
                            onValueChange={(value: 'transferable' | 'restricted') => setSelectedBucketType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transferable">
                                {t('ads.transferableBcc')} ({bccBalance?.transferable || 0} {t('ads.available')})
                              </SelectItem>
                              <SelectItem value="restricted">
                                {t('ads.restrictedBcc')} ({bccBalance?.restricted || 0} {t('ads.available')})
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="bg-secondary/50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span>{t('ads.cost')}:</span>
                              <span className="text-honey font-semibold">{nft.priceBCC} BCC</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>{t('ads.available')}:</span>
                              <span className={canAfford(nft.priceBCC, selectedBucketType) ? 'text-green-400' : 'text-red-400'}>
                                {selectedBucketType === 'transferable' ? bccBalance?.transferable || 0 : bccBalance?.restricted || 0} BCC
                              </span>
                            </div>
                          </div>

                          <Button
                            onClick={() => claimNFTMutation.mutate({ nftId: nft.id, bucketType: selectedBucketType })}
                            disabled={!canAfford(nft.priceBCC, selectedBucketType) || claimNFTMutation.isPending}
                            className="w-full bg-honey text-black hover:bg-honey/90"
                            data-testid={`button-confirm-claim-${nft.id}`}
                          >
                            {claimNFTMutation.isPending ? t('ads.claiming') : t('ads.confirmClaim')}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}