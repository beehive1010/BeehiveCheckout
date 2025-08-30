import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '../../../hooks/useWallet';
import { useI18n } from '../../../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';
import { apiRequest } from '../../../lib/queryClient';
import { StarIcon, FireIcon, TagIcon, GiftIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { IconWallet, IconFlame, IconCode } from '@tabler/icons-react';
import { useLocation } from 'wouter';

interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  serviceName: string;
  serviceType: 'dapp' | 'banner' | 'promotion';
  websiteUrl?: string;
  priceBCC: number;
  totalSupply: number;
  claimedCount: number;
  createdAt: string;
}

interface AdvertisementNFTClaim {
  id: string;
  nftId: string;
  bccAmountLocked: number;
  bucketUsed: string;
  activeCode: string;
  status: 'claimed' | 'burned';
  claimedAt: string;
  burnedAt?: string;
  nft: AdvertisementNFT;
}

export default function AdvertisementNFTs() {
  const { walletAddress, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-nfts'>('marketplace');
  const [selectedBucketType, setSelectedBucketType] = useState<'transferable' | 'restricted'>('transferable');
  const [, setLocation] = useLocation();

  // Handle NFT service link clicks
  const handleServiceClick = (nft: AdvertisementNFT) => {
    if (!nft.websiteUrl) return;
    
    if (nft.websiteUrl.startsWith('http')) {
      // External link - open in new tab
      window.open(nft.websiteUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Internal link - navigate within app
      setLocation(nft.websiteUrl);
    }
  };

  // Fetch available Advertisement NFTs
  const { data: nfts = [], isLoading: isLoadingNFTs } = useQuery<AdvertisementNFT[]>({
    queryKey: ['/api/ads/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/ads/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

  // Fetch user's Advertisement NFT claims
  const { data: myNFTs = [], isLoading: isLoadingMyNFTs } = useQuery<AdvertisementNFTClaim[]>({
    queryKey: ['/api/ads/my-nfts'],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/ads/my-nfts?t=${Date.now()}`, {
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user NFTs');
      return response.json();
    },
    enabled: !!walletAddress,
  });

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
        title: 'NFT Claimed Successfully!',
        description: 'Your Advertisement NFT has been claimed and BCC tokens are locked.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ads/my-nfts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim Advertisement NFT',
        variant: 'destructive',
      });
    },
  });

  // Burn NFT mutation
  const burnNFTMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const response = await fetch('/api/ads/burn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ claimId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to burn NFT');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'NFT Burned Successfully!',
        description: `Service code: ${data.serviceCode}`,
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ads/my-nfts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Burn Failed',
        description: error.message || 'Failed to burn Advertisement NFT',
        variant: 'destructive',
      });
    },
  });

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-honey mb-4 flex items-center justify-center gap-3">
          <IconFlame className="w-8 h-8" />
          Advertisement NFT Collection
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Claim Advertisement NFTs with your BCC tokens to unlock promotional services for top DApps and platforms
        </p>
      </div>

      {/* NFT Center Navigation */}
      <div className="flex justify-center mb-8">
        <Button
          onClick={() => window.location.href = '/nft-center'}
          className="bg-honey text-black hover:bg-honey/90 px-8 py-3 text-lg font-semibold"
          data-testid="button-nft-center"
        >
          <IconWallet className="w-5 h-5 mr-3" />
          NFT Center - Manage Your NFTs
        </Button>
      </div>

      {/* Browse Only - No Tabs */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-honey mb-2">Browse Advertisement NFTs</h2>
        <p className="text-muted-foreground">
          Explore available promotional services and DApp partnerships. Visit NFT Center to manage your collection.
        </p>
      </div>

      {/* Browse NFTs Only */}
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
                    <div className="text-xs text-muted-foreground">BCC Required</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{nft.totalSupply - nft.claimedCount}</div>
                    <div className="text-xs text-muted-foreground">Available</div>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-honey text-black hover:bg-honey/90"
                      disabled={nft.claimedCount >= nft.totalSupply}
                      data-testid={`button-claim-${nft.id}`}
                    >
                      {nft.claimedCount >= nft.totalSupply ? 'Sold Out' : 'Claim NFT'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-border">
                    <DialogHeader>
                      <DialogTitle className="text-honey">Claim {nft.title}</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Choose which BCC bucket to use for claiming this Advertisement NFT
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
                            Transferable BCC ({bccBalance?.transferable || 0} available)
                          </SelectItem>
                          <SelectItem value="restricted">
                            Restricted BCC ({bccBalance?.restricted || 0} available)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span>Cost:</span>
                          <span className="text-honey font-semibold">{nft.priceBCC} BCC</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Available:</span>
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
                        {claimNFTMutation.isPending ? 'Claiming...' : 'Confirm Claim'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}