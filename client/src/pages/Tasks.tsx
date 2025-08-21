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
import MembershipLevelList from '../components/membership/MembershipLevelList';

interface MarketplaceNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceBCC: number;
  active: boolean;
}

export default function Tasks() {
  const { walletAddress, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNFT, setSelectedNFT] = useState<MarketplaceNFT | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'membership' | 'advertisement'>('membership');

  // Fetch advertisement NFTs (existing BCC marketplace)
  const { data: allNfts, isLoading: isLoadingNFTs } = useQuery<MarketplaceNFT[]>({
    queryKey: ['/api/tasks/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

  // All NFTs from the existing endpoint are advertisement NFTs
  const nfts = allNfts || [];

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

  const isButtonDisabled = (nft: MarketplaceNFT) => {
    return !walletAddress || totalBCC < nft.priceBCC || claimNFTMutation.isPending;
  };

  const getButtonText = (nft: MarketplaceNFT) => {
    if (!walletAddress) return String(t('wallet.connect'));
    if (claimNFTMutation.isPending) return String(t('tasks.claiming'));
    if (totalBCC < nft.priceBCC) return String(t('tasks.insufficientBCC'));
    return String(t('tasks.claim'));
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
              {String(t('registration.walletRequired.title'))}
            </h3>
            <p className="text-muted-foreground">
              {String(t('registration.walletRequired.description'))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Mobile Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-honey mb-2">
          {String(t('tasks.title'))}
        </h2>
        <p className="text-muted-foreground text-sm mb-3">
          Dual NFT marketplace with membership and advertisement categories
        </p>
        <MobileDivider className="md:hidden" />
      </div>
      
      {/* Balance Header - Only show for advertisement category */}
      {activeCategory === 'advertisement' && (
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
      )}

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
            Membership NFTs (USDT)
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
            Advertisement NFTs (BCC)
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeCategory === 'membership' ? (
        <>
          <MobileDivider withText="19-Level Membership System" className="mb-6" />
          <MembershipLevelList 
            onPurchaseSuccess={() => {
              // Refresh user data after membership purchase
              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
              toast({
                title: "Membership Activated!",
                description: "Your new membership level has been activated successfully.",
              });
            }}
          />
        </>
      ) : (
        <>
          <MobileDivider withText={`Advertisement NFTs (${nfts.length} Available)`} className="mb-6" />
          
          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {nfts?.map((nft) => (
              <Card 
                key={nft.id}
                className="bg-secondary border-border glow-hover card-hover overflow-hidden relative"
              >
                {/* BCC Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-honey/20 text-honey">
                    BCC
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
                      <span className="text-honey font-bold text-sm">{nft.priceBCC} BCC</span>
                      <span className={`text-xs px-2 py-1 rounded ${totalBCC >= nft.priceBCC ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {totalBCC >= nft.priceBCC ? 'Available' : 'Insufficient'}
                      </span>
                    </div>
                    
                    <Dialog open={isModalOpen && selectedNFT?.id === nft.id} onOpenChange={(open) => {
                      if (!open) {
                        setIsModalOpen(false);
                        setSelectedNFT(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => handlePurchaseClick(nft)}
                          disabled={isButtonDisabled(nft)}
                          className={`w-full text-xs ${
                            isButtonDisabled(nft)
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-honey hover:bg-honey/90 text-black'
                          }`}
                          data-testid={`button-claim-${nft.id}`}
                        >
                          {getButtonText(nft)}
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="bg-background border-border">
                        <DialogHeader>
                          <DialogTitle className="text-honey">{String(t('tasks.claimModal.title'))}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <img src={nft.imageUrl} alt={nft.title} className="w-16 h-16 rounded-lg object-cover" />
                            <div>
                              <h4 className="font-semibold text-honey">{nft.title}</h4>
                              <p className="text-sm text-muted-foreground">{nft.description}</p>
                            </div>
                          </div>
                          
                          <div className="bg-secondary p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <span>{String(t('tasks.claimModal.price'))}:</span>
                              <span className="font-bold text-honey">{nft.priceBCC} BCC</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{String(t('tasks.claimModal.availableRestricted'))}:</span>
                              <span>{bccBalance?.restricted || 0} BCC</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{String(t('tasks.claimModal.availableTransferable'))}:</span>
                              <span>{bccBalance?.transferable || 0} BCC</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {String(t('tasks.claimModal.confirmation'))}
                          </p>
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleConfirmPurchase}
                              disabled={claimNFTMutation.isPending || totalBCC < nft.priceBCC}
                              className="flex-1 bg-honey hover:bg-honey/90 text-black"
                            >
                              {claimNFTMutation.isPending ? (
                                <>
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                  {String(t('tasks.claiming'))}
                                </>
                              ) : (
                                String(t('tasks.claimModal.confirm'))
                              )}
                            </Button>
                            <Button
                              onClick={() => setIsModalOpen(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              {String(t('tasks.claimModal.cancel'))}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Desktop: Side by side */}
                  <div className="hidden md:flex justify-between items-center">
                    <span className="text-honey font-bold">{nft.priceBCC} BCC</span>
                    <Button
                      onClick={() => handlePurchaseClick(nft)}
                      disabled={isButtonDisabled(nft)}
                      className={`${
                        isButtonDisabled(nft)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-honey hover:bg-honey/90 text-black'
                      }`}
                      data-testid={`button-claim-${nft.id}`}
                    >
                      {getButtonText(nft)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}