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

interface MerchantNFT {
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
  const [selectedNFT, setSelectedNFT] = useState<MerchantNFT | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch merchant NFTs
  const { data: nfts, isLoading: isLoadingNFTs } = useQuery<MerchantNFT[]>({
    queryKey: ['/api/tasks/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

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

  const handleClaimClick = (nft: MerchantNFT) => {
    setSelectedNFT(nft);
    setIsModalOpen(true);
  };

  const handleConfirmClaim = () => {
    if (selectedNFT) {
      claimNFTMutation.mutate(selectedNFT.id);
    }
  };

  const totalBCC = (bccBalance?.transferable || 0) + (bccBalance?.restricted || 0);

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
          {String(t('tasks.title'))}
        </h2>
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

      {/* Section Divider */}
      <MobileDivider withText="Available Tasks" className="mb-6" />

      {/* NFT Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {nfts?.map((nft) => (
          <Card 
            key={nft.id}
            className="bg-secondary border-border glow-hover card-hover overflow-hidden"
          >
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
                <MobileDivider />
                <Button
                  onClick={() => handleClaimClick(nft)}
                  className="btn-honey w-full text-xs"
                  disabled={totalBCC < nft.priceBCC || claimNFTMutation.isPending}
                  data-testid={`button-claim-${nft.id}`}
                >
                  {totalBCC < nft.priceBCC ? String(t('tasks.insufficientBCC')) : String(t('tasks.claim'))}
                </Button>
              </div>
              
              {/* Desktop: Side by side */}
              <div className="hidden md:flex justify-between items-center">
                <span className="text-honey font-bold">{nft.priceBCC} BCC</span>
                <Button
                  onClick={() => handleClaimClick(nft)}
                  className="btn-honey"
                  disabled={totalBCC < nft.priceBCC || claimNFTMutation.isPending}
                  data-testid={`button-claim-${nft.id}`}
                >
                  {totalBCC < nft.priceBCC ? String(t('tasks.insufficientBCC')) : String(t('tasks.claim'))}
                </Button>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {/* Claim Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-secondary border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-honey">{String(t('tasks.claimModal.title'))}</DialogTitle>
          </DialogHeader>
          
          {selectedNFT && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{String(t('tasks.claimModal.price'))}</span>
                  <span className="text-honey font-semibold">{selectedNFT.priceBCC} BCC</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{String(t('tasks.claimModal.availableRestricted'))}</span>
                  <span className="text-honey">{bccBalance?.restricted || 0} BCC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{String(t('tasks.claimModal.availableTransferable'))}</span>
                  <span className="text-honey">{bccBalance?.transferable || 0} BCC</span>
                </div>
              </div>
              
              <p className="text-muted-foreground text-sm">
                {String(t('tasks.claimModal.confirmation'))}
              </p>
              
              <div className="flex space-x-3">
                <Button
                  onClick={handleConfirmClaim}
                  className="flex-1 btn-honey"
                  disabled={claimNFTMutation.isPending}
                  data-testid="button-confirm-claim"
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
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-cancel-claim"
                >
                  {String(t('tasks.claimModal.cancel'))}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
