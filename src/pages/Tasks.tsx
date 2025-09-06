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

  // Enhanced NFT claim function with three network options
  const handleClaim = async (claimMethod: 'database_test' | 'testnet_arb_sepolia' | 'mainnet_arb_one') => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setClaimState({ method: claimMethod, loading: true, error: null });

    try {
      let claimData = {};
      let networkInfo = {};

      switch (claimMethod) {
        case 'database_test':
          claimData = {
            claimMethod: 'demo',
            referrerWallet: null,
            transactionHash: 'database_test_' + Date.now(),
            mintTxHash: 'test_mint_' + Date.now(),
            isOffChain: true,
            targetLevel: 1,
            tokenId: 1
          };
          networkInfo = {
            name: 'Off-Chain Database Test',
            description: 'No blockchain transaction - database only',
            color: 'green'
          };
          break;

        case 'testnet_arb_sepolia':
          claimData = {
            claimMethod: 'testnet_purchase',
            referrerWallet: null,
            network: 'arbitrum-sepolia',
            tokenContract: '0xTestFakeUSDTContract',
            amount: '100000000', // 100 fake USDT (6 decimals)
            chainId: 421614, // Arbitrum Sepolia
            transactionHash: 'testnet_tx_' + Date.now(),
            mintTxHash: 'testnet_mint_' + Date.now(),
            targetLevel: 1,
            tokenId: 1
          };
          networkInfo = {
            name: 'Testnet (Arbitrum Sepolia)',
            description: 'Claim with fake USDT token - 100 fake USDT',
            color: 'blue'
          };
          break;

        case 'mainnet_arb_one':
          claimData = {
            claimMethod: 'mainnet_purchase',
            referrerWallet: null,
            network: 'arbitrum-one',
            tokenContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35', // USDC on Arbitrum One
            amount: '100000000', // 100 USDC (6 decimals)
            chainId: 42161, // Arbitrum One
            bridgeUsed: true,
            transactionHash: 'mainnet_tx_' + Date.now(),
            mintTxHash: 'mainnet_mint_' + Date.now(),
            targetLevel: 1,
            tokenId: 1
          };
          networkInfo = {
            name: 'Mainnet (Arbitrum One)',
            description: 'Purchase with USDC via bridge - 100 USDC',
            color: 'honey'
          };
          break;

        default:
          throw new Error('Invalid claim method');
      }

      toast({
        title: `${networkInfo.name} Claim Started`,
        description: networkInfo.description,
      });

      // Call the enhanced NFT claim API
      const response = await fetch('/api/auth/claim-nft-token-1', {
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
          title: "🎉 Membership Activated!",
          description: result.message,
          duration: 6000
        });

        console.log('✅ Membership activation successful:', result);
        
        // Refresh the page data
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to claim NFT Token ID 1');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimState({ method: null, loading: false, error: error.message });
      
      toast({
        title: "Claim Failed",
        description: error.message || 'Failed to claim NFT Token ID 1',
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

          {/* Show claim options if user is not activated */}
          {(!currentLevel || currentLevel === 0) ? (
            <div className="space-y-6">
              {/* Activation Instructions */}
              <Card className="bg-gradient-to-r from-honey/10 via-honey/5 to-transparent border-honey/30">
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-honey mb-2">
                      Activate Your Membership
                    </h3>
                    <p className="text-muted-foreground">
                      Choose your preferred network to claim NFT Token ID 1 and unlock Level 1 membership
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Three Claim Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Database Test Button - Off Chain */}
                <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <TestTube className="h-5 w-5" />
                      Database Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        Off-Chain
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Test activation with database-only recording. No blockchain transaction required.
                      </p>
                      <div className="text-lg font-semibold text-green-400">
                        FREE
                      </div>
                      <div className="text-xs text-muted-foreground">
                        • No gas fees<br/>
                        • Instant activation<br/>
                        • Testing purposes
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleClaim('database_test')}
                      disabled={claimState.loading}
                      className="w-full bg-green-500 hover:bg-green-500/90 text-black"
                    >
                      {claimState.loading && claimState.method === 'database_test' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <TestTube className="mr-2 h-4 w-4" />
                          Test Claim
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Testnet Button - Arbitrum Sepolia */}
                <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-400">
                      <Shield className="h-5 w-5" />
                      Testnet Claim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                        Arbitrum Sepolia
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Claim with fake USDT token on Arbitrum Sepolia testnet.
                      </p>
                      <div className="text-lg font-semibold text-blue-400">
                        100 Fake USDT
                      </div>
                      <div className="text-xs text-muted-foreground">
                        • Testnet only<br/>
                        • Free testnet ETH needed<br/>
                        • Chain ID: 421614
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleClaim('testnet_arb_sepolia')}
                      disabled={claimState.loading}
                      className="w-full bg-blue-500 hover:bg-blue-500/90 text-white"
                    >
                      {claimState.loading && claimState.method === 'testnet_arb_sepolia' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Testnet Claim
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Mainnet Button - Arbitrum One */}
                <Card className="border-honey/20 hover:border-honey/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-honey">
                      <CreditCard className="h-5 w-5" />
                      Mainnet Purchase
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                        Arbitrum One
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Purchase with USDC via bridge on Arbitrum One mainnet.
                      </p>
                      <div className="text-lg font-semibold text-honey">
                        100 USDC
                      </div>
                      <div className="text-xs text-muted-foreground">
                        • Real transaction<br/>
                        • Bridge supported<br/>
                        • Chain ID: 42161
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleClaim('mainnet_arb_one')}
                      disabled={claimState.loading}
                      className="w-full bg-honey hover:bg-honey/90 text-black"
                    >
                      {claimState.loading && claimState.method === 'mainnet_arb_one' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Purchase Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Network Information */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>🎯 All methods activate Level 1 membership with NFT Token ID 1</p>
                <p>💰 Rewards: 500 BCC transferable + 10,350 BCC locked + referral bonuses</p>
                <p>🌐 Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Status for Activated Users */}
              <Card className="bg-gradient-to-r from-honey/10 via-honey/5 to-transparent border-honey/30">
                <CardContent className="p-6">
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