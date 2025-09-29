import { useQuery } from '@tanstack/react-query';
import AdvertisementNFTCard, { AdvertisementNFT } from './AdvertisementNFTCard';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { nftsApi } from '../../api/nfts/nfts.api';
import { Megaphone, Sparkles } from 'lucide-react';

interface AdvertisementNFTGridProps {
  onPurchaseSuccess?: () => void;
  className?: string;
  maxItems?: number;
}

export default function AdvertisementNFTGrid({ onPurchaseSuccess, className = '', maxItems }: AdvertisementNFTGridProps) {
  const { toast } = useToast();
  const { currentLanguage } = useI18n();

  // Fetch advertisement NFTs from our real API
  const { data: advertisementNFTs = [], isLoading, error } = useQuery({
    queryKey: ['advertisement-nfts', currentLanguage],
    queryFn: async (): Promise<AdvertisementNFT[]> => {
      const nfts = await nftsApi.getAdvertisementNFTs(currentLanguage);
      console.log('📢 Loaded advertisement NFTs:', nfts.length);
      return nfts;
    },
    staleTime: 30000, // 30 seconds
  });

  const handlePurchase = async (nft: AdvertisementNFT) => {
    // Purchase is handled in the AdvertisementNFTCard component
    // This callback is for additional actions after successful purchase
    onPurchaseSuccess?.();
  };

  const displayNFTs = maxItems ? advertisementNFTs.slice(0, maxItems) : advertisementNFTs;

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service NFTs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-destructive/20 rounded-2xl mb-4">
              <Megaphone className="w-12 h-12 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Failed to Load NFTs
            </h3>
            <p className="text-muted-foreground">
              Unable to fetch service NFTs. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (displayNFTs.length === 0) {
    return (
      <div className={`${className}`}>
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-dashed border-muted-foreground/20 hover:border-blue-400/30 transition-colors duration-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-2xl mb-4 group-hover:bg-blue-400/10 transition-colors duration-300">
              <Sparkles className="w-16 h-16 text-muted-foreground group-hover:text-blue-400 transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No Advertisement NFTs Available
            </h3>
            <p className="text-muted-foreground max-w-md">
              There are currently no advertisement NFTs available. Check back soon for new opportunities!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {displayNFTs.map((nft) => (
          <AdvertisementNFTCard
            key={nft.id}
            nft={nft}
            onPurchase={handlePurchase}
            className="h-full" // Ensure cards stretch to same height
          />
        ))}
      </div>

      {/* Show more indicator if maxItems is set and there are more items */}
      {maxItems && advertisementNFTs.length > maxItems && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Showing {maxItems} of {advertisementNFTs.length} service NFTs
          </p>
        </div>
      )}
    </div>
  );
}