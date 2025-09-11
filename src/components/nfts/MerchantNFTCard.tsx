import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { ShoppingCart, Eye, Package, Star, Zap } from 'lucide-react';
import { IconBriefcase, IconPalette, IconCode, IconSchool } from '@tabler/icons-react';

export interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price_usdt: number;
  price_bcc: number;
  category: string;
  supply_total?: number;
  supply_available?: number;
  is_active: boolean;
  creator_wallet?: string;
  metadata: any;
  created_at: string;
}

interface MerchantNFTCardProps {
  nft: MerchantNFT;
  onPurchase?: (nft: MerchantNFT) => void;
  isLoading?: boolean;
  isOwned?: boolean;
  className?: string;
}

export default function MerchantNFTCard({ 
  nft, 
  onPurchase, 
  isLoading = false,
  isOwned = false,
  className = '' 
}: MerchantNFTCardProps) {
  const { bccBalance } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'education':
        return <IconSchool className="w-4 h-4" />;
      case 'consulting':
        return <IconBriefcase className="w-4 h-4" />;
      case 'design':
        return <IconPalette className="w-4 h-4" />;
      case 'development':
        return <IconCode className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'education':
        return 'border-green-500/50 text-green-400';
      case 'consulting':
        return 'border-blue-500/50 text-blue-400';
      case 'design':
        return 'border-pink-500/50 text-pink-400';
      case 'development':
        return 'border-purple-500/50 text-purple-400';
      case 'security':
        return 'border-red-500/50 text-red-400';
      case 'marketing':
        return 'border-orange-500/50 text-orange-400';
      default:
        return 'border-gray-500/50 text-gray-400';
    }
  };

  const availableCount = nft.supply_available || 0;
  const totalSupply = nft.supply_total || 0;
  const availabilityPercentage = totalSupply > 0 ? (availableCount / totalSupply) * 100 : 100;
  const canPurchase = (bccBalance?.transferable || 0) >= nft.price_bcc && 
                     availableCount > 0 && 
                     nft.is_active && 
                     !isOwned;

  const handlePurchaseClick = () => {
    if (!canPurchase) {
      let message = 'Cannot purchase this NFT';
      if (isOwned) {
        message = 'You already own this NFT';
      } else if ((bccBalance?.transferable || 0) < nft.price_bcc) {
        message = 'Insufficient BCC balance';
      } else if (availableCount <= 0) {
        message = 'NFT is sold out';
      } else if (!nft.is_active) {
        message = 'NFT is not currently available';
      }

      toast({
        title: 'Cannot Purchase',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    onPurchase?.(nft);
  };

  return (
    <Card className={`group bg-secondary border-border hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-400/10 transition-all duration-300 ${className}`}>
      {/* NFT Image */}
      <div className="aspect-square bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-t-2xl overflow-hidden relative">
        <img 
          src={nft.image_url} 
          alt={nft.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className={`bg-black/70 text-white border-0 ${getCategoryColor(nft.category)}`}>
            <div className="flex items-center gap-1">
              {getCategoryIcon(nft.category)}
              <span className="text-xs">{nft.category}</span>
            </div>
          </Badge>
        </div>
        
        {/* Status indicators */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isOwned && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              Owned
            </Badge>
          )}
          {totalSupply > 0 && (
            <div className={`w-3 h-3 rounded-full ${availableCount > 0 ? 'bg-green-500' : 'bg-red-500'} shadow-lg`} />
          )}
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
                <DialogTitle className="text-purple-400">{nft.title}</DialogTitle>
                <DialogDescription>
                  {nft.category} Service
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <img src={nft.image_url} alt={nft.title} className="w-full h-48 object-cover rounded-lg" />
                <p className="text-sm text-muted-foreground">{nft.description}</p>
                
                {/* Metadata display */}
                {nft.metadata && Object.keys(nft.metadata).length > 0 && (
                  <div className="bg-purple-500/5 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium text-purple-400">Service Details:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {nft.metadata.duration && (
                        <div>Duration: {nft.metadata.duration}</div>
                      )}
                      {nft.metadata.includes && Array.isArray(nft.metadata.includes) && (
                        <div>Includes: {nft.metadata.includes.join(', ')}</div>
                      )}
                      {nft.metadata.expertise && Array.isArray(nft.metadata.expertise) && (
                        <div>Expertise: {nft.metadata.expertise.join(', ')}</div>
                      )}
                      {nft.metadata.turnaround && (
                        <div>Turnaround: {nft.metadata.turnaround}</div>
                      )}
                      {nft.metadata.timeline && (
                        <div>Timeline: {nft.metadata.timeline}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-purple-400">{nft.price_bcc} BCC</div>
                    <div className="text-xs text-muted-foreground">${nft.price_usdt} USDT</div>
                  </div>
                  {totalSupply > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {availableCount}/{totalSupply} available
                    </span>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-purple-400 group-hover:text-purple-300 transition-colors text-lg">
            {nft.title}
          </CardTitle>
          {nft.metadata?.certification && (
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Certified
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {nft.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Supply availability (if limited) */}
        {totalSupply > 0 && (
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
              {availableCount} of {totalSupply} remaining
            </div>
          </div>
        )}

        {/* Key features from metadata */}
        {nft.metadata && (
          <div className="flex flex-wrap gap-1">
            {nft.metadata.comprehensive && (
              <Badge variant="outline" className="text-xs">📋 Comprehensive</Badge>
            )}
            {nft.metadata.report_included && (
              <Badge variant="outline" className="text-xs">📄 Report</Badge>
            )}
            {nft.metadata.ai_powered && (
              <Badge variant="outline" className="text-xs">🤖 AI-Powered</Badge>
            )}
            {nft.metadata.success_rate && (
              <Badge variant="outline" className="text-xs">📈 {nft.metadata.success_rate}</Badge>
            )}
          </div>
        )}

        {/* Price and Purchase */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-400">
                {nft.price_bcc}
              </div>
              <div className="text-xs text-muted-foreground">BCC</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">${nft.price_usdt}</div>
              <div className="text-xs text-muted-foreground">USDT equiv.</div>
            </div>
          </div>
          
          <Button
            onClick={handlePurchaseClick}
            disabled={!canPurchase || isLoading}
            className={`w-full font-semibold transition-all duration-300 ${
              isOwned
                ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default'
                : canPurchase 
                ? 'bg-purple-500 hover:bg-purple-600 text-white group-hover:shadow-lg group-hover:shadow-purple-500/25' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            data-testid={`button-purchase-merchant-${nft.id}`}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Zap className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isOwned ? (
                <>
                  <Badge className="mr-2 bg-green-500/20 text-green-400">✓</Badge>
                  <span>Owned</span>
                </>
              ) : canPurchase ? (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Purchase Service</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    {(bccBalance?.transferable || 0) < nft.price_bcc ? 'Insufficient BCC' : 
                     availableCount <= 0 ? 'Sold Out' : 'Unavailable'}
                  </span>
                </>
              )}
            </div>
          </Button>
          
          {/* Balance warning */}
          {!canPurchase && !isOwned && (bccBalance?.transferable || 0) < nft.price_bcc && (
            <p className="text-xs text-destructive text-center">
              You need {nft.price_bcc - (bccBalance?.transferable || 0)} more BCC
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}