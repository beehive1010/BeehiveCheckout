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
import MembershipBadge from '../components/membership/MembershipBadge';
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

  // Enhanced NFT claim function for specific levels with progressive pricing
  const handleClaimLevel = async (level: number) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    // Check if user can claim this level (must have previous level)
    if (level > 1 && (!currentLevel || level > currentLevel + 1)) {
      toast({
        title: "Level Locked",
        description: `You must own Level ${level - 1} NFT before claiming Level ${level}`,
        variant: "destructive"
      });
      return;
    }

    const tokenId = level;
    // Progressive pricing: Level 1 = 100 + 30 activation fee, Level 2 = 150, Level 3 = 200, +50 per level, up to Level 19 = 1000
    const levelPrice = level === 1 ? 100 : 100 + (level - 1) * 50;
    const platformFee = level === 1 ? 30 : 0; // Only Level 1 has activation fee
    const totalPrice = levelPrice + platformFee;

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
        priceUsdc: totalPrice,
        nftPrice: levelPrice,
        platformFee: platformFee
      };

      toast({
        title: `Level ${level} Claim Started`,
        description: `Claiming NFT Token ID ${tokenId} for $${totalPrice} USDC`,
      });

      // Simulate successful claim for demo
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: `🎉 Level ${level} NFT Claimed!`,
        description: `Successfully claimed Token ID ${tokenId}. Earned ${totalPrice} BCC reward!`,
        duration: 6000
      });

      console.log(`✅ Level ${level} claim successful:`, claimData);
      
      // Refresh the page data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

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

          {/* ERC5115 Style Membership NFT Claim Grid - Token ID 1-19 */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card className="bg-gradient-to-r from-honey/10 via-honey/5 to-transparent border-honey/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Crown className="h-8 w-8 text-honey mr-2" />
                    <Badge className="bg-honey/20 text-honey border-honey/50">
                      ERC-5115 NFT Collection
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg text-honey mb-2">
                    Claim Membership NFTs (Level 1-19)
                  </h3>
                  <p className="text-muted-foreground">
                    Progressive pricing: Level 1 (130 USDC with activation) → Level 2 (150 USDC) → Level 19 (1000 USDC)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Membership Level Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 19 }, (_, index) => {
                const level = index + 1;
                const tokenId = level;
                // Progressive pricing: Level 1 = 100 + 30 activation fee, Level 2 = 150, Level 3 = 200, +50 per level, up to Level 19 = 1000
                const levelPrice = level === 1 ? 100 : 100 + (level - 1) * 50;
                const platformFee = level === 1 ? 30 : 0; // Only Level 1 has activation fee
                const totalPrice = levelPrice + platformFee;
                
                const isOwned = currentLevel && level <= currentLevel;
                const isUnlocked = level === 1 || (currentLevel && level <= currentLevel + 1);
                const isNextLevel = currentLevel && level === currentLevel + 1;
                
                return (
                  <Card 
                    key={level}
                    className={`transition-all duration-200 ${
                      isOwned 
                        ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30' 
                        : isNextLevel
                        ? 'bg-gradient-to-br from-honey/10 to-honey/5 border-honey/30'
                        : isUnlocked
                        ? 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                        : 'bg-muted/20 border-muted/30 opacity-60'
                    }`}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="flex items-center justify-center mb-2">
                        <Crown className="h-6 w-6 text-honey mr-2" />
                        <Badge 
                          className={
                            isOwned 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50'
                              : isNextLevel
                              ? 'bg-honey/20 text-honey border-honey/50'
                              : isUnlocked
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                              : 'bg-muted/20 text-muted-foreground border-muted/50'
                          }
                        >
                          Level {level}
                        </Badge>
                      </div>
                      <CardTitle className={`text-xl mb-1 ${
                        isOwned ? 'text-green-400' : isNextLevel ? 'text-honey' : isUnlocked ? 'text-blue-400' : 'text-muted-foreground'
                      }`}>
                        Token ID {tokenId}
                      </CardTitle>
                      {!isUnlocked && (
                        <p className="text-xs text-muted-foreground">
                          🔒 Requires Level {level - 1} NFT
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Pricing Information */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-3 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                          <div className="text-lg font-bold text-orange-400">${totalPrice}</div>
                          <div className="text-xs text-muted-foreground">Total Cost</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
                          <div className="text-lg font-bold text-purple-400">{totalPrice}</div>
                          <div className="text-xs text-muted-foreground">BCC Reward</div>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>NFT Price:</span>
                            <span className="text-foreground">${levelPrice} USDC</span>
                          </div>
                          {platformFee > 0 && (
                            <div className="flex justify-between">
                              <span>Activation Fee:</span>
                              <span className="text-foreground">${platformFee} USDC</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-border/50 pt-1">
                            <span className="font-medium">Total:</span>
                            <span className="text-foreground font-medium">${totalPrice} USDC</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => handleClaimLevel(level)}
                        disabled={claimState.loading || isOwned || !isUnlocked}
                        className={`w-full h-10 font-semibold ${
                          isOwned 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default'
                            : isNextLevel
                            ? 'bg-gradient-to-r from-honey to-honey/80 hover:from-honey/90 hover:to-honey/70 text-black'
                            : isUnlocked
                            ? 'bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white'
                            : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                        }`}
                        variant={isOwned ? 'outline' : 'default'}
                        data-testid={`button-claim-level-${level}`}
                      >
                        {claimState.loading && claimState.method === `level_${level}` ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Claiming...
                          </>
                        ) : isOwned ? (
                          <>
                            <Badge className="mr-2 bg-green-500/20 text-green-400">✓</Badge>
                            Owned
                          </>
                        ) : !isUnlocked ? (
                          <>
                            🔒 Locked
                          </>
                        ) : (
                          <>
                            <Crown className="mr-2 h-4 w-4" />
                            Claim NFT (${totalPrice} USDC)
                          </>
                        )}
                      </Button>

                      {/* Additional Info for Available Levels */}
                      {isUnlocked && !isOwned && (
                        <div className="text-center text-xs text-muted-foreground space-y-1">
                          <p>🎯 {totalPrice} BCC reward (matches USDC price)</p>
                          <p>⚡ Two transactions: Approval + Minting</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Information Footer */}
            <div className="text-center text-xs text-muted-foreground space-y-1 mt-6">
              <p>🎯 Progressive unlocking: Complete lower levels to access higher ones</p>
              <p>💰 BCC rewards match USDC price: Level 1 = 130 BCC, Level 2 = 150 BCC, Level 19 = 1000 BCC</p>
              <p>🌐 Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}</p>
              <p>📊 Current Level: {currentLevel || 'None'} | Next Available: Level {(currentLevel || 0) + 1}</p>
            </div>
          </div>
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