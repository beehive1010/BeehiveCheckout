import { useQuery } from '@tanstack/react-query';
import MyNFTCard, { UserOwnedNFT, NFTService } from './MyNFTCard';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useLocation } from 'wouter';
import { Package, ArrowRight, Sparkles } from 'lucide-react';
import { IconWallet } from '@tabler/icons-react';

interface MyNFTGridProps {
  walletAddress?: string;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

export default function MyNFTGrid({ 
  walletAddress, 
  maxItems, 
  showHeader = true,
  className = '' 
}: MyNFTGridProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch user's owned NFTs
  const { data: userNFTs = [], isLoading, error } = useQuery({
    queryKey: ['/api/nfts/user-owned', walletAddress],
    enabled: !!walletAddress,
    queryFn: async (): Promise<UserOwnedNFT[]> => {
      const response = await fetch('/api/nfts/user-owned', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user NFTs');
      return response.json();
    },
  });

  const handleServiceAccess = async (nft: UserOwnedNFT, service: NFTService) => {
    try {
      // Here you would implement the actual service access logic
      // For now, we'll show a success toast with the service code
      toast({
        title: 'Service Access',
        description: `Accessing ${service.serviceName}. Code: ${service.serviceCode}`,
      });
    } catch (error) {
      toast({
        title: 'Access Failed',
        description: 'Failed to access service. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const displayNFTs = maxItems ? userNFTs.slice(0, maxItems) : userNFTs;
  const nftsWithServices = userNFTs.filter(nft => nft.services && nft.services.length > 0);
  const membershipNFTs = userNFTs.filter(nft => nft.nftType === 'membership');
  const serviceNFTs = userNFTs.filter(nft => nft.nftType === 'advertisement');

  if (!walletAddress) {
    return (
      <div className={`${className}`}>
        <Card className="bg-muted/30 border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-2xl mb-4">
              <IconWallet className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Connect Wallet
            </h3>
            <p className="text-muted-foreground max-w-md">
              Please connect your wallet to view your NFT collection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your NFT collection...</p>
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
              <Package className="w-12 h-12 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Failed to Load NFTs
            </h3>
            <p className="text-muted-foreground">
              Unable to fetch your NFT collection. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (displayNFTs.length === 0) {
    return (
      <div className={`${className}`}>
        <Card className="bg-muted/30 border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-2xl mb-4">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No NFTs Yet
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Start building your collection by claiming membership NFTs or purchasing service NFTs.
            </p>
            <Button
              onClick={() => setLocation('/tasks')}
              className="bg-honey text-secondary hover:bg-honey/90"
              data-testid="button-explore-nfts"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Explore NFTs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with Stats */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-honey mb-1">
                My NFT Collection
              </h3>
              <p className="text-muted-foreground">
                Your digital assets and available services
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-secondary px-3 py-1 rounded-full">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold text-honey">{userNFTs.length}</span>
              </div>
              <div className="bg-secondary px-3 py-1 rounded-full">
                <span className="text-muted-foreground">With Services: </span>
                <span className="font-semibold text-green-400">{nftsWithServices.length}</span>
              </div>
              {membershipNFTs.length > 0 && (
                <div className="bg-secondary px-3 py-1 rounded-full">
                  <span className="text-muted-foreground">Membership: </span>
                  <span className="font-semibold text-honey">{membershipNFTs.length}</span>
                </div>
              )}
              {serviceNFTs.length > 0 && (
                <div className="bg-secondary px-3 py-1 rounded-full">
                  <span className="text-muted-foreground">Service: </span>
                  <span className="font-semibold text-blue-400">{serviceNFTs.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {displayNFTs.map((nft) => (
          <MyNFTCard
            key={nft.id}
            nft={nft}
            onServiceAccess={handleServiceAccess}
            className="h-full" // Ensure cards stretch to same height
          />
        ))}
      </div>

      {/* Show more indicator if maxItems is set and there are more items */}
      {maxItems && userNFTs.length > maxItems && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Showing {maxItems} of {userNFTs.length} NFTs
          </p>
          <Button
            variant="outline"
            onClick={() => setLocation('/nft-center')}
            className="border-honey/30 text-honey hover:bg-honey/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            View All NFTs
          </Button>
        </div>
      )}
    </div>
  );
}