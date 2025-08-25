import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { prepareContractCall, sendTransaction, getContract } from 'thirdweb';
import { useActiveAccount } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { client } from '../lib/web3';
import { StarIcon, FireIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { IconCode, IconWallet, IconFlame } from '@tabler/icons-react';
import { useLocation } from 'wouter';

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

export default function NFTCenter() {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedNFT, setSelectedNFT] = useState<AdvertisementNFTClaim | null>(null);
  const account = useActiveAccount();

  // Fetch user's Advertisement NFT claims
  const { data: myNFTs = [], isLoading: isLoadingMyNFTs } = useQuery<AdvertisementNFTClaim[]>({
    queryKey: ['/api/ads/my-nfts'],
    enabled: !!walletAddress,
  });

  // Burn NFT with thirdweb mutation
  const burnNFTMutation = useMutation({
    mutationFn: async (claim: AdvertisementNFTClaim) => {
      if (!account) throw new Error('Wallet not connected');

      // First, burn via API to get service code
      const response = await fetch('/api/ads/burn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ claimId: claim.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to burn NFT');
      }

      // TODO: Integrate with actual thirdweb contract calls
      // This would burn both the NFT and BCC tokens on-chain
      // For now, we're using the API-based burning system
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('ads.burn.title'),
        description: `Service code: ${data.serviceCode}`,
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ads/my-nfts'] });
      setSelectedNFT(null);
    },
    onError: (error: any) => {
      toast({
        title: t('ads.burn.error.title'),
        description: error.message || t('ads.burn.error.description'),
        variant: 'destructive',
      });
    },
  });

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'dapp': return <StarIcon className="w-4 h-4" />;
      case 'banner': return <IconCode className="w-4 h-4" />;
      case 'promotion': return <IconFlame className="w-4 h-4" />;
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/tasks')}
          className="text-honey hover:bg-honey/10"
          data-testid="button-back-to-tasks"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
{t('nftCenter.backToTasks')}
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold text-honey mb-4 flex items-center justify-center gap-3">
            <IconWallet className="w-8 h-8" />
{t('nftCenter.title')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
{t('nftCenter.description')}
          </p>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingMyNFTs ? (
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
        ) : myNFTs.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <IconWallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">{t('nftCenter.noNfts.title')}</h3>
            <p className="text-muted-foreground mb-4">{t('nftCenter.noNfts.description')}</p>
            <Button 
              onClick={() => setLocation('/ads')}
              className="bg-honey text-black hover:bg-honey/90"
              data-testid="button-browse-nfts"
            >
{t('nftCenter.noNfts.browseButton')}
            </Button>
          </div>
        ) : (
          myNFTs.map((claim) => (
            <Card 
              key={claim.id} 
              className="bg-secondary border-border glow-hover group cursor-pointer"
              onClick={() => setSelectedNFT(claim)}
              data-testid={`nft-card-${claim.id}`}
            >
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={claim.nft.imageUrl}
                  alt={claim.nft.title}
                  className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <Badge className={claim.status === 'burned' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}>
                    {claim.status === 'burned' ? t('ads.status.used') : t('ads.status.active')}
                  </Badge>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-honey text-black">
                    {claim.nft.serviceName}
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge className={`${getServiceTypeColor(claim.nft.serviceType)} border`}>
                    <span className="flex items-center gap-1">
                      {getServiceTypeIcon(claim.nft.serviceType)}
                      {claim.nft.serviceType.toUpperCase()}
                    </span>
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-honey mb-2">{claim.nft.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{claim.nft.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">BCC Locked:</span>
                    <span className="text-honey font-semibold">{claim.bccAmountLocked} BCC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Bucket:</span>
                    <span className="text-blue-400 text-sm">{claim.bucketUsed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Status:</span>
                    <span className={claim.status === 'burned' ? 'text-red-400' : 'text-green-400'}>
                      {claim.status === 'burned' ? t('ads.status.serviceActivated') : t('ads.status.claimed')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
          <DialogContent className="bg-background border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-honey text-xl flex items-center gap-2">
                <IconCode className="w-6 h-6" />
                {selectedNFT.nft.title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Advertisement NFT Details and Service Management
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* NFT Image and Info */}
              <div className="flex gap-6">
                <div className="relative flex-shrink-0">
                  <img
                    src={selectedNFT.nft.imageUrl}
                    alt={selectedNFT.nft.title}
                    className="w-48 h-32 object-cover rounded-lg"
                  />
                  <Badge className="absolute top-2 right-2 bg-honey text-black">
                    {selectedNFT.nft.serviceName}
                  </Badge>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-muted-foreground">{selectedNFT.nft.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Service Type:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {getServiceTypeIcon(selectedNFT.nft.serviceType)}
                        <span className="text-honey">{selectedNFT.nft.serviceType.toUpperCase()}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">BCC Locked:</span>
                      <div className="text-honey font-semibold mt-1">{selectedNFT.bccAmountLocked} BCC</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Code Display */}
              {selectedNFT.status === 'claimed' && selectedNFT.activeCode && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconCode className="w-5 h-5 text-honey" />
                    <span className="font-semibold text-honey">Active Code:</span>
                  </div>
                  <code className="text-sm font-mono text-muted-foreground break-all block p-2 bg-background rounded border">
                    {selectedNFT.activeCode}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    This code will be activated when you use the NFT service
                  </p>
                </div>
              )}

              {/* Service Status */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="font-semibold text-honey mb-2">Service Status</h4>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <Badge className={selectedNFT.status === 'burned' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                    {selectedNFT.status === 'burned' ? 'Service Activated' : 'Ready to Activate'}
                  </Badge>
                </div>
                {selectedNFT.burnedAt && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-muted-foreground">Activated On:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedNFT.burnedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedNFT.status === 'claimed' ? (
                  <Button
                    onClick={() => burnNFTMutation.mutate(selectedNFT)}
                    disabled={burnNFTMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    data-testid={`button-use-nft-${selectedNFT.id}`}
                  >
                    <FireIcon className="w-4 h-4 mr-2" />
                    {burnNFTMutation.isPending ? 'Activating...' : 'Use NFT Service'}
                  </Button>
                ) : (
                  <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <FireIcon className="w-4 h-4" />
                      <span className="font-semibold">Service Activated</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This NFT has been used and the service is now active
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedNFT(null)}
                  className="border-border hover:bg-muted"
                  data-testid="button-close-nft-detail"
                >
                  Close
                </Button>
              </div>

              {/* Warning for burning */}
              {selectedNFT.status === 'claimed' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">⚠️ Important</h4>
                  <p className="text-sm text-muted-foreground">
                    Using this NFT will permanently burn both the NFT and the {selectedNFT.bccAmountLocked} BCC tokens locked within it. 
                    In return, you'll receive the service code to activate your promotional service with {selectedNFT.nft.serviceName}.
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}