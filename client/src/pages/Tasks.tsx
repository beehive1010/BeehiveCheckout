import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import MobileDivider from '../components/UI/MobileDivider';

interface MarketplaceNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: 'BCC' | 'USDT';
  category: 'membership' | 'advertisement';
  membershipLevel?: number; // For membership NFTs
  active: boolean;
}

export default function Tasks() {
  const { walletAddress, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNFT, setSelectedNFT] = useState<MarketplaceNFT | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'membership' | 'advertisement'>('all');

  // Fetch marketplace NFTs
  const { data: allNfts, isLoading: isLoadingNFTs } = useQuery<MarketplaceNFT[]>({
    queryKey: ['/api/marketplace/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

  // Filter NFTs by category
  const nfts = allNfts?.filter(nft => {
    if (activeCategory === 'all') return true;
    return nft.category === activeCategory;
  }) || [];

  // Claim NFT mutation
  const claimNFTMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const response = await fetch('/api/tasks/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ nftId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim NFT');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: String(t('tasks.claim.success.title')),
        description: String(t('tasks.claim.success.description')),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsModalOpen(false);
      setSelectedNFT(null);
    },
    onError: (error: any) => {
      toast({
        title: String(t('tasks.claim.error.title')),
        description: error.message || String(t('tasks.claim.error.description')),
        variant: 'destructive',
      });
    },
  });

  const handlePurchaseClick = (nft: MarketplaceNFT) => {
    setSelectedNFT(nft);
    setIsModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedNFT) {
      claimNFTMutation.mutate(selectedNFT.id);
    }
  };

  const totalBCC = (bccBalance?.transferable || 0) + (bccBalance?.restricted || 0);

  const getButtonText = (nft: MarketplaceNFT) => {
    if (nft.currency === 'BCC') {
      return totalBCC < nft.price ? String(t('marketplace.insufficientBCC')) : String(t('marketplace.purchase'));
    } else {
      return String(t('marketplace.purchaseUSDT'));
    }
  };

  const isButtonDisabled = (nft: MarketplaceNFT) => {
    if (nft.currency === 'BCC') {
      return totalBCC < nft.price || claimNFTMutation.isPending;
    }
    return claimNFTMutation.isPending;
  };

  if (isLoadingNFTs) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-secondary border-border">
              <div className="w-full h-48 bg-muted skeleton"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-muted skeleton mb-2"></div>
                <div className="h-3 bg-muted skeleton mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-muted skeleton"></div>
                  <div className="h-8 w-16 bg-muted skeleton"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Mobile Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-honey mb-2">
          {String(t('marketplace.title'))}
        </h2>
        <p className="text-muted-foreground text-sm mb-3">
          {String(t('marketplace.subtitle'))}
        </p>
        <MobileDivider className="md:hidden" />
      </div>
      
      {/* Balance Header */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:justify-between md:items-center">
            <div className="text-center md:text-left">
              <h3 className="text-honey font-semibold text-sm md:text-base">{String(t('tasks.availableBalance'))}</h3>
              <p className="text-muted-foreground text-xs md:text-sm">{String(t('tasks.restrictedFirst'))}</p>
            </div>
            
            {/* Mobile Divider */}
            <MobileDivider className="md:hidden" />
            
            <div className="flex justify-center md:justify-end space-x-6 md:space-x-4">
              <div className="text-center">
                <p className="text-honey font-bold text-lg md:text-base">{bccBalance?.restricted || 0}</p>
                <p className="text-muted-foreground text-xs">{String(t('tasks.restrictedBCC'))}</p>
              </div>
              
              {/* Vertical divider for mobile */}
              <MobileDivider orientation="vertical" className="md:hidden h-12" />
              
              <div className="text-center">
                <p className="text-honey font-bold text-lg md:text-base">{bccBalance?.transferable || 0}</p>
                <p className="text-muted-foreground text-xs">{String(t('tasks.transferableBCC'))}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-honey text-black'
                : 'bg-secondary text-muted-foreground hover:text-honey hover:bg-honey/10'
            }`}
            data-testid="filter-all"
          >
            {String(t('marketplace.categories.all'))}
          </button>
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
            {String(t('marketplace.categories.membership'))}
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
            {String(t('marketplace.categories.advertisement'))}
          </button>
        </div>
      </div>

      {/* Section Divider */}
      <MobileDivider withText={`${nfts.length} NFTs Available`} className="mb-6" />

      {/* NFT Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {nfts?.map((nft) => (
          <Card 
            key={nft.id}
            className="bg-secondary border-border glow-hover card-hover overflow-hidden relative"
          >
            {/* Category Badge */}
            <div className="absolute top-2 left-2 z-10">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                nft.category === 'membership' 
                  ? 'bg-purple-500/20 text-purple-300' 
                  : 'bg-blue-500/20 text-blue-300'
              }`}>
                {nft.category === 'membership' ? (
                  <>
                    <i className="fas fa-crown mr-1"></i>
                    {nft.membershipLevel && `L${nft.membershipLevel}`}
                  </>
                ) : (
                  <>
                    <i className="fas fa-bullhorn mr-1"></i>
                    AD
                  </>
                )}
              </span>
            </div>

            {/* Currency Badge */}
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                nft.currency === 'USDT' 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-honey/20 text-honey'
              }`}>
                {nft.currency}
              </span>
            </div>

            <img 
              src={nft.imageUrl}
              alt={nft.title}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <CardContent className="p-3 md:p-4">
              <h4 className="text-honey font-semibold mb-2 text-sm md:text-base">{nft.title}</h4>
              <p className="text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">
                {nft.description}
              </p>
              
              {/* Mobile: Stack price and button */}
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-honey font-bold text-sm">{nft.price} {nft.currency}</span>
                  {nft.currency === 'BCC' && (
                    <span className={`text-xs px-2 py-1 rounded ${totalBCC >= nft.price ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {totalBCC >= nft.price ? 'Available' : 'Insufficient'}
                    </span>
                  )}
                </div>
                <MobileDivider />
                <Button
                  onClick={() => handlePurchaseClick(nft)}
                  className={nft.currency === 'USDT' ? 'bg-green-600 hover:bg-green-700 text-white w-full text-xs' : 'btn-honey w-full text-xs'}
                  disabled={isButtonDisabled(nft)}
                  data-testid={`button-purchase-${nft.id}`}
                >
                  {getButtonText(nft)}
                </Button>
              </div>
              
              {/* Desktop: Side by side */}
              <div className="hidden md:flex justify-between items-center">
                <span className="text-honey font-bold">{nft.price} {nft.currency}</span>
                <Button
                  onClick={() => handlePurchaseClick(nft)}
                  className={nft.currency === 'USDT' ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-honey'}
                  disabled={isButtonDisabled(nft)}
                  data-testid={`button-purchase-${nft.id}`}
                >
                  {getButtonText(nft)}
                </Button>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {/* Purchase Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-secondary border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-honey">{String(t('marketplace.purchaseModal.title'))}</DialogTitle>
          </DialogHeader>
          
          {selectedNFT && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{String(t('marketplace.purchaseModal.item'))}</span>
                  <span className="text-honey font-semibold">{selectedNFT.title}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{String(t('marketplace.purchaseModal.price'))}</span>
                  <span className="text-honey font-bold">{selectedNFT.price} {selectedNFT.currency}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{String(t('marketplace.purchaseModal.category'))}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedNFT.category === 'membership' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {selectedNFT.category === 'membership' ? 'Membership' : 'Advertisement'}
                  </span>
                </div>
                
                {selectedNFT.currency === 'BCC' && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">{String(t('marketplace.purchaseModal.availableRestricted'))}</span>
                      <span className="text-honey">{bccBalance?.restricted || 0} BCC</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{String(t('marketplace.purchaseModal.availableTransferable'))}</span>
                      <span className="text-honey">{bccBalance?.transferable || 0} BCC</span>
                    </div>
                  </>
                )}
              </div>
              
              <p className="text-muted-foreground text-sm">
                {selectedNFT.currency === 'USDT' 
                  ? String(t('marketplace.purchaseModal.confirmationUSDT'))
                  : String(t('marketplace.purchaseModal.confirmationBCC'))
                }
              </p>
              
              <div className="flex space-x-3">
                <Button
                  onClick={handleConfirmPurchase}
                  className={`flex-1 ${selectedNFT.currency === 'USDT' ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-honey'}`}
                  disabled={claimNFTMutation.isPending}
                  data-testid="button-confirm-purchase"
                >
                  {claimNFTMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      {String(t('marketplace.purchasing'))}
                    </>
                  ) : (
                    String(t('marketplace.purchaseModal.confirm'))
                  )}
                </Button>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-cancel-purchase"
                >
                  {String(t('marketplace.purchaseModal.cancel'))}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
