import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Crown, Megaphone, Package, ArrowRight, Star, TestTube, Shield, CreditCard, Loader2 } from 'lucide-react';
import ClaimMembershipButton from '../components/membership/ClaimMembershipButton';
import MembershipBadge from '../components/membership/MembershipBadge';
import MembershipNFTGrid from '../components/membership/MembershipNFTGrid';
import { getMembershipLevel } from '../lib/config/membershipLevels';
import AdvertisementNFTGrid from '../components/nfts/AdvertisementNFTGrid';
import MyNFTGrid from '../components/nfts/MyNFTGrid';

interface UserOwnedNFT {
  id: string;
  nftType: 'membership' | 'advertisement' | 'merchant';
  title: string;
  description: string;
  imageUrl?: string;
  level?: number;
  serviceName?: string;
  acquiredAt: string;
  services?: NFTService[];
}

interface NFTService {
  id: string;
  serviceName: string;
  serviceDescription: string;
  serviceCode: string;
}

export default function Tasks() {
  const { t } = useI18n();
  const { walletAddress, bccBalance, currentLevel } = useWallet();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('membership-nfts');
  const [claimState, setClaimState] = useState<{
    method: string | null;
    loading: boolean;
    error: string | null;
  }>({
    method: null,
    loading: false,
    error: null
  });

  // Fetch user's owned NFTs for display count
  const { data: userNFTs = [], isLoading: isLoadingNFTs } = useQuery({
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

  // Enhanced NFT claim function for specific levels
  const handleClaimLevel = async (level: number) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const tokenId = level;
    const basePrice = level * 100;

    setClaimState({ method: `level_${level}`, loading: true, error: null });

    try {
      const claimData = {
        claimMethod: 'database_test', // Default to database test for demo
        referrerWallet: null,
        transactionHash: `level_${level}_tx_` + Date.now(),
        mintTxHash: `level_${level}_mint_` + Date.now(),
        isOffChain: true,
        targetLevel: level,
        tokenId: tokenId,
        priceUsdc: basePrice
      };

      toast({
        title: `Level ${level} Claim Started`,
        description: `Claiming NFT Token ID ${tokenId} for $${basePrice} USDC`,
      });

      // Call the NFT claim API
      const response = await fetch(`/api/auth/claim-nft-token-${tokenId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify(claimData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: `🎉 Level ${level} NFT Claimed!`,
          description: `Successfully claimed Token ID ${tokenId}`,
          duration: 6000
        });

        console.log(`✅ Level ${level} claim successful:`, result);
        
        // Refresh the page data
        window.location.reload();
      } else {
        throw new Error(result.error || `Failed to claim NFT Token ID ${tokenId}`);
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimState({ method: null, loading: false, error: error.message });
      
      toast({
        title: "Claim Failed",
        description: error.message || `Failed to claim Level ${level} NFT`,
        variant: "destructive"
      });
    } finally {
      setClaimState({ method: null, loading: false, error: null });
    }
  };

  // Get available membership levels for purchase
  const availableMembershipLevels = [2, 3, 5, 10, 15, 19].filter(level => level > (currentLevel || 1));

  // Calculate stats
  const membershipNFTs = userNFTs.filter(nft => nft.nftType === 'membership');
  const serviceNFTs = userNFTs.filter(nft => nft.nftType === 'advertisement' || nft.nftType === 'merchant');
  const totalServices = userNFTs.filter(n => n.services && n.services.length > 0).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-3 bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
              NFT Ecosystem
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Unlock exclusive Web3 services and benefits through our premium NFT collection
            </p>
          </div>
          
          {/* Stats Summary */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4">
            <div className="text-center lg:text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span>My Collection</span>
              </div>
              <div className="text-lg font-bold text-honey">
                {isLoadingNFTs ? '...' : userNFTs.length} NFT{userNFTs.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <Button
              onClick={() => setLocation('/nft-center')}
              variant="outline"
              className="border-honey/30 text-honey hover:bg-honey/10"
              data-testid="button-my-nfts"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto bg-background border border-border rounded-xl p-1">
            <TabsTrigger 
              value="membership-nfts" 
              className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              data-testid="tab-membership-nfts"
            >
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Membership NFTs</span>
              <span className="sm:hidden">Membership</span>
              <Badge variant="secondary" className="ml-1 bg-honey/20 text-honey text-xs">
                {membershipNFTs.length}
              </Badge>
            </TabsTrigger>
            
            <TabsTrigger 
              value="service-nfts" 
              className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              data-testid="tab-service-nfts"
            >
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Service NFTs</span>
              <span className="sm:hidden">Services</span>
              <Badge variant="secondary" className="ml-1 bg-blue-500/20 text-blue-400 text-xs">
                {serviceNFTs.length}
              </Badge>
            </TabsTrigger>
            
            <TabsTrigger 
              value="my-collection" 
              className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              data-testid="tab-my-collection"
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">My Collection</span>
              <span className="inline sm:hidden">Collection</span>
              <Badge variant="secondary" className="ml-1 bg-purple-500/20 text-purple-400 text-xs">
                {totalServices}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Membership NFTs Tab */}
        <TabsContent value="membership-nfts" className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-honey/20 to-honey/10 rounded-2xl">
              <Crown className="w-8 h-8 text-honey" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-honey">Membership NFTs (Level 1-19)</h2>
              <p className="text-muted-foreground">
                Multi-chain NFT collection with exclusive Web3 benefits. Choose your preferred network to activate.
              </p>
            </div>
          </div>

          {/* Membership NFT Claim Grid - Token ID 1-19 */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card className="bg-gradient-to-r from-honey/10 via-honey/5 to-transparent border-honey/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-bold text-lg text-honey mb-2">
                    Claim Membership NFTs
                  </h3>
                  <p className="text-muted-foreground">
                    Choose any level to claim the corresponding NFT Token (Level 1-19)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Membership Level Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 19 }, (_, index) => {
                const level = index + 1;
                const tokenId = level;
                const basePrice = level * 100; // Simple pricing: Level 1 = 100 USDC, Level 2 = 200 USDC, etc.
                const isCurrentLevel = level === (currentLevel || 0);
                const isAvailable = !currentLevel || level > currentLevel;
                const isOwned = currentLevel && level <= currentLevel;
                
                return (
                  <Button
                    key={level}
                    onClick={() => handleClaimLevel(level)}
                    disabled={claimState.loading || isOwned}
                    className={`h-auto flex-col gap-2 py-4 relative ${
                      isCurrentLevel 
                        ? 'bg-honey hover:bg-honey/90 text-black' 
                        : isOwned 
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : isAvailable
                        ? 'border-honey/30 text-honey hover:bg-honey/10'
                        : 'opacity-50'
                    }`}
                    variant={isCurrentLevel ? 'default' : 'outline'}
                    data-testid={`button-claim-level-${level}`}
                  >
                    {/* Level Badge */}
                    <div className="absolute top-2 right-2">
                      {isOwned && (
                        <Badge className="bg-green-500 text-white text-xs">
                          Owned
                        </Badge>
                      )}
                    </div>
                    
                    {/* Level Number */}
                    <div className="text-2xl font-bold">
                      L{level}
                    </div>
                    
                    {/* Token ID */}
                    <div className="text-sm opacity-80">
                      Token ID: {tokenId}
                    </div>
                    
                    {/* Price */}
                    <div className="text-lg font-semibold">
                      ${basePrice} USDC
                    </div>
                    
                    {/* Loading or Icon */}
                    {claimState.loading && claimState.method === `level_${level}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isOwned ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        ✓ Claimed
                      </Badge>
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Information Footer */}
            <div className="text-center text-xs text-muted-foreground space-y-1 mt-6">
              <p>🎯 Each level unlocks higher tier benefits and rewards</p>
              <p>💰 BCC rewards scale with level: Level × 500 transferable + Level × 5000 locked</p>
              <p>🌐 Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}</p>
            </div>
          </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MembershipBadge level={currentLevel || 1} size="lg" showLabel />
                      <div>
                        <h3 className="font-bold text-lg text-honey">
                          Level {currentLevel || 1} - {getMembershipLevel(currentLevel || 1)?.titleEn || 'Warrior'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You own Level {currentLevel || 1} NFT. Unlock higher levels for more benefits!
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-honey">
                        {19 - (currentLevel || 1)} <span className="text-sm text-muted-foreground">more levels</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Available to claim</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-chain NFT Grid for Activated Users */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-honey">Available NFT Upgrades</h3>
                  <Badge variant="outline" className="text-honey border-honey">
                    Multi-Chain Support
                  </Badge>
                </div>
                <MembershipNFTGrid className="mt-6" />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Service NFTs Tab */}
        <TabsContent value="service-nfts" className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-2xl">
              <Megaphone className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-400">Service NFTs</h2>
              <p className="text-muted-foreground">Unlock exclusive Web3 services and premium features</p>
            </div>
          </div>

          <AdvertisementNFTGrid
            maxItems={12}
            onPurchaseSuccess={() => {
              toast({
                title: 'Purchase Successful',
                description: 'Your new service NFT has been claimed!',
              });
            }}
          />
        </TabsContent>

        {/* My Collection Tab */}
        <TabsContent value="my-collection" className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl">
              <Star className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-purple-400">My Collection</h2>
              <p className="text-muted-foreground">Your owned NFTs and active services</p>
            </div>
          </div>

          <MyNFTGrid
            walletAddress={walletAddress || undefined}
            maxItems={20}
            showHeader={false}
          />

          {userNFTs.length === 0 && !isLoadingNFTs && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-purple-400/30 mx-auto mb-4 flex items-center justify-center">
                <Package className="w-8 h-8 text-purple-400/30" />
              </div>
              <p className="text-muted-foreground mb-4">No NFTs in your collection yet</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('membership-nfts')}
                  className="border-honey/30 text-honey hover:bg-honey/10"
                >
                  Get Membership NFT
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('service-nfts')}
                  className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                >
                  Browse Services
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}