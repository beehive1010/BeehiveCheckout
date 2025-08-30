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
import styles from '../styles/nfts/nfts.module.css';

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

export default function NFTCenter() {
  const { walletAddress, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const [, setLocation] = useLocation();
  const [selectedNFT, setSelectedNFT] = useState<AdvertisementNFT | null>(null);

  // Mock NFT data - in real implementation would come from API
  const mockNFTs: AdvertisementNFT[] = [
    {
      id: '1',
      title: 'DeFi Protocol Access Pass',
      description: 'Exclusive access to premium DeFi features and early releases',
      imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
      serviceName: 'DeFi Pro',
      serviceType: 'dapp',
      priceBCC: 200,
      totalSupply: 1000,
      claimedCount: 245,
      createdAt: '2024-12-20T10:00:00Z'
    },
    {
      id: '2',
      title: 'Trading Bot Premium',
      description: 'Access to advanced trading algorithms and strategies',
      imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=400&fit=crop',
      serviceName: 'TradePro',
      serviceType: 'dapp',
      priceBCC: 300,
      totalSupply: 500,
      claimedCount: 89,
      createdAt: '2024-12-18T14:30:00Z'
    }
  ];

  const handleClaimNFT = async (nft: AdvertisementNFT) => {
    if (!account) {
      toast({
        title: t('nft.connectWallet'),
        description: t('nft.connectWalletDesc'),
        variant: 'destructive',
      });
      return;
    }

    if ((bccBalance?.transferable || 0) < nft.priceBCC) {
      toast({
        title: t('nft.insufficientBalance'),
        description: t('nft.insufficientBalanceDesc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // In real implementation, this would call the actual smart contract
      toast({
        title: t('nft.claimSuccess'),
        description: t('nft.claimSuccessDesc', { title: nft.title }),
      });
    } catch (error) {
      toast({
        title: t('nft.claimError'),
        description: t('nft.claimErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'dapp':
        return <IconCode className="w-5 h-5" />;
      case 'banner':
        return <StarIcon className="w-5 h-5" />;
      case 'promotion':
        return <FireIcon className="w-5 h-5" />;
      default:
        return <IconWallet className="w-5 h-5" />;
    }
  };

  return (
    <div className={`${styles.nftContainer} container mx-auto px-4 py-8`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-honey mb-2">
            {t('nft.title') || 'NFT Center'}
          </h1>
          <p className="text-muted-foreground">
            {t('nft.subtitle') || 'Discover and claim exclusive NFTs from our partners'}
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setLocation('/nft/advertisements')}
          className="border-honey text-honey hover:bg-honey hover:text-secondary"
        >
          <IconFlame className="w-4 h-4 mr-2" />
          {t('nft.viewAdvertisements') || 'Advertisement NFTs'}
        </Button>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockNFTs.map((nft) => (
          <Card key={nft.id} className="bg-secondary border-border hover:border-honey/50 transition-all duration-300 group">
            <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
              <img
                src={nft.imageUrl}
                alt={nft.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-honey text-lg">{nft.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    by {nft.serviceName}
                  </p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getServiceTypeIcon(nft.serviceType)}
                  {nft.serviceType}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {nft.description}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Supply:</span>
                <span>{nft.claimedCount}/{nft.totalSupply}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge className="bg-honey text-secondary">
                  {nft.priceBCC} BCC
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {((nft.totalSupply - nft.claimedCount) / nft.totalSupply * 100).toFixed(0)}% available
                </span>
              </div>
              
              <div className="pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-honey text-secondary hover:bg-honey/90"
                      onClick={() => setSelectedNFT(nft)}
                    >
                      <IconWallet className="w-4 h-4 mr-2" />
                      {t('nft.claimNow') || 'Claim NFT'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-secondary border-border">
                    <DialogHeader>
                      <DialogTitle className="text-honey">
                        {t('nft.confirmClaim') || 'Confirm NFT Claim'}
                      </DialogTitle>
                      <DialogDescription>
                        {t('nft.confirmClaimDesc') || 'You are about to claim this exclusive NFT. This action cannot be undone.'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedNFT && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={selectedNFT.imageUrl}
                            alt={selectedNFT.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-honey">{selectedNFT.title}</h4>
                            <p className="text-sm text-muted-foreground">{selectedNFT.serviceName}</p>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span>{t('nft.price') || 'Price'}:</span>
                            <span className="font-semibold text-honey">{selectedNFT.priceBCC} BCC</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('nft.yourBalance') || 'Your Balance'}:</span>
                            <span>{bccBalance?.transferable || 0} BCC</span>
                          </div>
                        </div>
                        
                        <Button
                          className="w-full bg-honey text-secondary hover:bg-honey/90"
                          onClick={() => handleClaimNFT(selectedNFT)}
                          disabled={(bccBalance?.transferable || 0) < selectedNFT.priceBCC}
                        >
                          {t('nft.confirmAndClaim') || 'Confirm & Claim'}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}