import { useQuery } from '@tanstack/react-query';
import AdvertisementNFTCard, { AdvertisementNFT } from './AdvertisementNFTCard';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { Megaphone, Sparkles } from 'lucide-react';

interface AdvertisementNFTGridProps {
  onPurchaseSuccess?: () => void;
  className?: string;
  maxItems?: number;
}

export default function AdvertisementNFTGrid({ onPurchaseSuccess, className = '', maxItems }: AdvertisementNFTGridProps) {
  const { toast } = useToast();

  // Fetch advertisement NFTs from API
  const { data: advertisementNFTs = [], isLoading, error } = useQuery({
    queryKey: ['/api/nfts/advertisement'],
    queryFn: async (): Promise<AdvertisementNFT[]> => {
      const response = await fetch('/api/nfts/advertisement');
      if (!response.ok) throw new Error('Failed to fetch advertisement NFTs');
      return response.json();
    },
  });

  const handlePurchase = async (nft: AdvertisementNFT) => {
    try {
      // Here you would implement the actual purchase logic
      // For now, we'll show a success toast
      toast({
        title: 'Purchase Initiated',
        description: `Starting purchase process for ${nft.title}`,
      });

      // Call success callback
      onPurchaseSuccess?.();
    } catch (error) {
      toast({
        title: 'Purchase Failed',
        description: 'Failed to initiate purchase. Please try again.',
        variant: 'destructive',
      });
    }
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
              New Services Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-md">
              Exciting new service NFTs with exclusive features and partnerships are being developed. Stay tuned for updates!
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