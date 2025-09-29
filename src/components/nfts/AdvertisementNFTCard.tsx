import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useBalance } from '../../hooks/useBalance';
import { useI18n } from '../../contexts/I18nContext';
import { useActiveAccount } from 'thirdweb/react';
import PaymentConfirmationModal from '../education/PaymentConfirmationModal';
import { nftsApi } from '../../api/nfts/nfts.api';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Eye, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { IconCode, IconWallet, IconFlame } from '@tabler/icons-react';

export interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  priceBCC: number;
  priceUSDT: number;
  clickUrl: string | null;
  impressionsTarget: number | null;
  impressionsCurrent: number | null;
  startsAt: string | null;
  endsAt: string | null;
  advertiserWallet: string | null;
  metadata: any;
  createdAt: string;
  type: 'advertisement';
}

interface AdvertisementNFTCardProps {
  nft: AdvertisementNFT;
  onPurchase?: (nft: AdvertisementNFT) => void;
  className?: string;
}

export default function AdvertisementNFTCard({ nft, onPurchase, className = '' }: AdvertisementNFTCardProps) {
  const activeAccount = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userBalance, setUserBalance] = useState({ bcc_balance: 0, usdt_balance: 0 });
  const [purchasing, setPurchasing] = useState(false);
  
  // Load user balance when component mounts
  React.useEffect(() => {
    if (activeAccount?.address) {
      loadUserBalance();
    }
  }, [activeAccount?.address]);

  const loadUserBalance = async () => {
    if (!activeAccount?.address) return;
    
    try {
      const { data: balance } = await supabase
        .from('user_balances')
        .select('bcc_balance, usdt_balance')
        .eq('wallet_address', activeAccount.address)
        .maybeSingle();
      
      if (balance) {
        setUserBalance(balance);
      }
    } catch (error) {
      console.error('Failed to load user balance:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'defi':
        return <IconCode className="w-4 h-4" />;
      case 'nft':
        return <Eye className="w-4 h-4" />;
      case 'gaming':
        return <IconFlame className="w-4 h-4" />;
      case 'education':
        return <IconWallet className="w-4 h-4" />;
      case 'infrastructure':
        return <Zap className="w-4 h-4" />;
      default:
        return <IconWallet className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'defi':
        return 'border-blue-500/50 text-blue-400';
      case 'nft':
        return 'border-purple-500/50 text-purple-400';
      case 'gaming':
        return 'border-orange-500/50 text-orange-400';
      case 'education':
        return 'border-green-500/50 text-green-400';
      case 'infrastructure':
        return 'border-yellow-500/50 text-yellow-400';
      default:
        return 'border-gray-500/50 text-gray-400';
    }
  };

  // Calculate availability based on impression targets
  const totalProgress = nft.impressionsTarget ? 
    Math.min((nft.impressionsCurrent || 0) / nft.impressionsTarget * 100, 100) : 0;
  const canPurchase = userBalance.bcc_balance >= nft.priceBCC && activeAccount?.address;

  const handlePurchaseClick = () => {
    if (!activeAccount?.address) {
      toast({
        title: t('common.error'),
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (paymentMethod: 'bcc' | 'blockchain') => {
    if (!activeAccount?.address) return;
    
    try {
      setPurchasing(true);
      
      if (paymentMethod === 'bcc') {
        await nftsApi.purchaseNFTWithBCC(nft.id, 'advertisement', activeAccount.address);
        await loadUserBalance(); // Refresh balance
        
        if (onPurchase) {
          onPurchase(nft);
        }
        
        toast({
          title: t('common.success'),
          description: `Successfully purchased ${nft.title}`,
        });
      } else {
        throw new Error('Blockchain payment not implemented yet');
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Purchase failed',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <Card className={`group bg-secondary border-border hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-400/10 transition-all duration-300 ${className}`}>
      {/* NFT Image */}
      <div className="aspect-square bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-t-2xl overflow-hidden relative">
        <img 
          src={nft.imageUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400'} 
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
              <span className="text-xs capitalize">{nft.category}</span>
            </div>
          </Badge>
        </div>
        
        {/* Active indicator */}
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg" />
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
                <DialogTitle className="text-blue-400">
                  <MultilingualText
                    text={nft.title}
                    language={nft.language}
                    translations={nft.translations ? Object.fromEntries(
                      Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.title || nft.title])
                    ) : {}}
                    autoTranslate={true}
                  />
                </DialogTitle>
                <DialogDescription>
                  by <MultilingualText
                    text={nft.serviceName}
                    language={nft.language}
                    translations={nft.translations ? Object.fromEntries(
                      Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.serviceName || nft.serviceName])
                    ) : {}}
                    autoTranslate={true}
                  />
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <img src={nft.imageUrl} alt={nft.title} className="w-full h-48 object-cover rounded-lg" />
                <p className="text-sm text-muted-foreground">
                  <MultilingualText
                    text={nft.description}
                    language={nft.language}
                    translations={nft.translations ? Object.fromEntries(
                      Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.description || nft.description])
                    ) : {}}
                    autoTranslate={true}
                  />
                </p>
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
          {/* NFT标题 - 使用DeepL翻译 */}
          <HybridTranslation
            content={{
              text: nft.title,
              language: nft.language,
              translations: nft.translations ? Object.fromEntries(
                Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.title || nft.title])
              ) : {}
            }}
            autoTranslate={true}
            contentStyle="text-lg font-semibold text-blue-400 group-hover:text-blue-300 transition-colors"
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {/* NFT描述 - 使用DeepL翻译 */}
          <HybridTranslation
            content={{
              text: nft.description,
              language: nft.language,
              translations: nft.translations ? Object.fromEntries(
                Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.description || nft.description])
              ) : {}
            }}
            autoTranslate={true}
            contentStyle="text-sm text-muted-foreground"
          />
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
            disabled={!canPurchase || purchasing}
            className={`w-full font-semibold transition-all duration-300 ${
              canPurchase 
                ? 'bg-blue-500 hover:bg-blue-600 text-white group-hover:shadow-lg group-hover:shadow-blue-500/25' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            data-testid={`button-purchase-nft-${nft.id}`}
          >
            <div className="flex items-center gap-2">
              {purchasing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canPurchase ? (
                <ShoppingCart className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>
                {purchasing ? 'Processing...' :
                 canPurchase ? 'Purchase with BCC' : 
                 userBalance.bcc_balance < nft.priceBCC ? 'Insufficient BCC' : 'Connect Wallet'}
              </span>
            </div>
          </Button>
          
          {/* Balance warning */}
          {!canPurchase && userBalance.bcc_balance < nft.priceBCC && activeAccount?.address && (
            <p className="text-xs text-destructive text-center">
              You need {nft.priceBCC - userBalance.bcc_balance} more BCC
            </p>
          )}
        </div>
      </CardContent>
    </Card>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        course={{
          id: nft.id,
          title: nft.title,
          priceBCC: nft.priceBCC,
          priceUSDT: nft.priceUSDT
        }}
        userBalance={userBalance}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
}