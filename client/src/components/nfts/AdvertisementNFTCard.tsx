import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { ShoppingCart, Eye, ExternalLink, Zap } from 'lucide-react';
import { IconCode, IconWallet, IconFlame } from '@tabler/icons-react';

export interface AdvertisementNFT {
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

interface AdvertisementNFTCardProps {
  nft: AdvertisementNFT;
  onPurchase?: (nft: AdvertisementNFT) => void;
  className?: string;
}

export default function AdvertisementNFTCard({ nft, onPurchase, className = '' }: AdvertisementNFTCardProps) {
  const { bccBalance } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'dapp':
        return <IconCode className="w-4 h-4" />;
      case 'banner':
        return <Eye className="w-4 h-4" />;
      case 'promotion':
        return <IconFlame className="w-4 h-4" />;
      default:
        return <IconWallet className="w-4 h-4" />;
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case 'dapp':
        return 'border-blue-500/50 text-blue-400';
      case 'banner':
        return 'border-purple-500/50 text-purple-400';
      case 'promotion':
        return 'border-orange-500/50 text-orange-400';
      default:
        return 'border-gray-500/50 text-gray-400';
    }
  };

  const availableCount = nft.totalSupply - nft.claimedCount;
  const availabilityPercentage = (availableCount / nft.totalSupply) * 100;
  const canPurchase = (bccBalance?.transferable || 0) >= nft.priceBCC && availableCount > 0;

  const handlePurchaseClick = () => {
    if (!canPurchase) {
      toast({
        title: 'Cannot Purchase',
        description: (bccBalance?.transferable || 0) < nft.priceBCC 
          ? 'Insufficient BCC balance' 
          : 'NFT is sold out',
        variant: 'destructive',
      });
      return;
    }

    onPurchase?.(nft);
  };

  return (
    <Card className={`group bg-secondary border-border hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-400/10 transition-all duration-300 ${className}`}>
      {/* NFT Image */}
      <div className="aspect-square bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-t-2xl overflow-hidden relative">
        <img 
          src={nft.imageUrl} 
          alt={nft.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Service badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className={`bg-black/70 text-white border-0 ${getServiceTypeColor(nft.serviceType)}`}>
            <div className="flex items-center gap-1">
              {getServiceTypeIcon(nft.serviceType)}
              <span className="text-xs">{nft.serviceName}</span>
            </div>
          </Badge>
        </div>
        
        {/* Availability indicator */}
        <div className="absolute top-3 right-3">
          <div className={`w-3 h-3 rounded-full ${availableCount > 0 ? 'bg-green-500' : 'bg-red-500'} shadow-lg`} />
        </div>
        
        {/* Quick view button */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="bg-black/50 border-white/20 text-white hover:bg-black/70">
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-400">{nft.title}</DialogTitle>
                <DialogDescription>
                  by {nft.serviceName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <img src={nft.imageUrl} alt={nft.title} className="w-full h-48 object-cover rounded-lg" />
                <p className="text-sm text-muted-foreground">{nft.description}</p>
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {nft.priceBCC} BCC
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {availableCount}/{nft.totalSupply} available
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-400 group-hover:text-blue-300 transition-colors text-lg">
          {nft.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {nft.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Availability Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Availability</span>
            <span className="font-medium">{availabilityPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                availabilityPercentage > 50 ? 'bg-green-500' : 
                availabilityPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(availabilityPercentage, 5)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {availableCount} of {nft.totalSupply} remaining
          </div>
        </div>

        {/* Price and Purchase */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">
                {nft.priceBCC}
              </div>
              <div className="text-xs text-muted-foreground">BCC</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${canPurchase ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {canPurchase ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
          
          <Button
            onClick={handlePurchaseClick}
            disabled={!canPurchase}
            className={`w-full font-semibold transition-all duration-300 ${
              canPurchase 
                ? 'bg-blue-500 hover:bg-blue-600 text-white group-hover:shadow-lg group-hover:shadow-blue-500/25' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            data-testid={`button-purchase-nft-${nft.id}`}
          >
            <div className="flex items-center gap-2">
              {canPurchase ? <ShoppingCart className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              <span>
                {canPurchase ? 'Purchase with BCC' : 
                 (bccBalance?.transferable || 0) < nft.priceBCC ? 'Insufficient BCC' : 'Sold Out'}
              </span>
            </div>
          </Button>
          
          {/* Balance warning */}
          {!canPurchase && (bccBalance?.transferable || 0) < nft.priceBCC && (
            <p className="text-xs text-destructive text-center">
              You need {nft.priceBCC - (bccBalance?.transferable || 0)} more BCC
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}