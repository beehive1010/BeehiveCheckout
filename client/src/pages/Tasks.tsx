import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

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
        title: t('tasks.claim.success.title'),
        description: t('tasks.claim.success.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsModalOpen(false);
      setSelectedNFT(null);
    },
    onError: (error: any) => {
      toast({
        title: t('tasks.claim.error.title'),
        description: error.message || t('tasks.claim.error.description'),
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
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('tasks.title')}
      </h2>
      
      {/* Balance Header */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-honey font-semibold">{t('tasks.availableBalance')}</h3>
              <p className="text-muted-foreground text-sm">{t('tasks.restrictedFirst')}</p>
            </div>
            <div className="flex space-x-4">
              <div className="text-center">
                <p className="text-honey font-bold">{bccBalance?.restricted || 0}</p>
                <p className="text-muted-foreground text-xs">{t('tasks.restrictedBCC')}</p>
              </div>
              <div className="text-center">
                <p className="text-honey font-bold">{bccBalance?.transferable || 0}</p>
                <p className="text-muted-foreground text-xs">{t('tasks.transferableBCC')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFT Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <CardContent className="p-4">
              <h4 className="text-honey font-semibold mb-2">{nft.title}</h4>
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                {nft.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-honey font-bold">{nft.priceBCC} BCC</span>
                <Button
                  onClick={() => handleClaimClick(nft)}
                  className="btn-honey"
                  disabled={totalBCC < nft.priceBCC || claimNFTMutation.isPending}
                  data-testid={`button-claim-${nft.id}`}
                >
                  {totalBCC < nft.priceBCC ? t('tasks.insufficientBCC') : t('tasks.claim')}
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
            <DialogTitle className="text-honey">{t('tasks.claimModal.title')}</DialogTitle>
          </DialogHeader>
          
          {selectedNFT && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{t('tasks.claimModal.price')}</span>
                  <span className="text-honey font-semibold">{selectedNFT.priceBCC} BCC</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{t('tasks.claimModal.availableRestricted')}</span>
                  <span className="text-honey">{bccBalance?.restricted || 0} BCC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('tasks.claimModal.availableTransferable')}</span>
                  <span className="text-honey">{bccBalance?.transferable || 0} BCC</span>
                </div>
              </div>
              
              <p className="text-muted-foreground text-sm">
                {t('tasks.claimModal.confirmation')}
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
                      {t('tasks.claiming')}
                    </>
                  ) : (
                    t('tasks.claimModal.confirm')
                  )}
                </Button>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-cancel-claim"
                >
                  {t('tasks.claimModal.cancel')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
