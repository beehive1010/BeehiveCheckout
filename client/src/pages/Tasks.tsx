import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import MobileDivider from '../components/UI/MobileDivider';
import { TransactionWidget, useActiveAccount } from "thirdweb/react";
import { claimTo } from "thirdweb/extensions/erc1155";
import { merchantNFTContract, client } from "../lib/web3";
// import MembershipLevelList from '../components/membership/MembershipLevelList';

interface MarketplaceNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceBCC: number;
  active: boolean;
}

export default function Tasks() {
  const { walletAddress, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<'membership' | 'advertisement'>('membership');
  const account = useActiveAccount();

  // Fetch advertisement NFTs (existing BCC marketplace)
  const { data: allNfts, isLoading: isLoadingNFTs } = useQuery<MarketplaceNFT[]>({
    queryKey: ['/api/tasks/nfts'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/nfts');
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
  });

  // All NFTs from the existing endpoint are advertisement NFTs
  const nfts = allNfts || [];

  // Claim NFT mutation
  const claimNFTMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const response = await fetch('/api/tasks/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ nftId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim NFT');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: String(t('tasks.claim.success.title')),
        description: String(t('tasks.claim.success.description')),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: String(t('tasks.claim.error.title')),
        description: error.message || String(t('tasks.claim.error.description')),
        variant: 'destructive',
      });
    },
  });


  const totalBCC = (bccBalance?.transferable || 0) + (bccBalance?.restricted || 0);

  if (!walletAddress) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto bg-secondary border-border">
          <CardContent className="p-6 space-y-4">
            <div className="text-honey">
              <i className="fas fa-wallet text-4xl mb-4"></i>
            </div>
            <h3 className="text-xl font-bold text-honey">
              {String(t('registration.walletRequired.title'))}
            </h3>
            <p className="text-muted-foreground">
              {String(t('registration.walletRequired.description'))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Mobile Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-honey mb-2 flex items-center">
          <i className="fas fa-store mr-3 text-honey"></i>
          NFT Marketplace
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mb-3">
          Discover and purchase Bumblebees (BBC) with USDT and Advertisement NFTs with Beehive Crypto Coin (BCC)
        </p>
        <MobileDivider className="md:hidden" />
      </div>
      
      {/* Balance Header - Only show for advertisement category */}
      {activeCategory === 'advertisement' && (
        <Card className="bg-secondary border-border mb-6">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:justify-between md:items-center">
              <div className="text-center md:text-left">
                <h3 className="text-honey font-semibold text-sm md:text-base">{String(t('tasks.availableBalance'))}</h3>
                <p className="text-muted-foreground text-xs md:text-sm">{String(t('tasks.restrictedFirst'))}</p>
              </div>
              
              {/* Mobile Divider */}
              <MobileDivider className="md:hidden" />
              
              <div className="flex justify-center md:justify-end space-x-6 md:space-x-4">
                <div className="text-center">
                  <p className="text-honey font-bold text-lg md:text-base">{bccBalance?.restricted || 0}</p>
                  <p className="text-muted-foreground text-xs">{String(t('tasks.restrictedBCC'))}</p>
                </div>
                
                {/* Vertical divider for mobile */}
                <MobileDivider orientation="vertical" className="md:hidden h-12" />
                
                <div className="text-center">
                  <p className="text-honey font-bold text-lg md:text-base">{bccBalance?.transferable || 0}</p>
                  <p className="text-muted-foreground text-xs">{String(t('tasks.transferableBCC'))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          <button
            onClick={() => setActiveCategory('membership')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === 'membership'
                ? 'bg-honey text-black'
                : 'bg-secondary text-muted-foreground hover:text-honey hover:bg-honey/10'
            }`}
            data-testid="filter-membership"
          >
            <i className="fas fa-crown mr-2"></i>
            Bumblebees (BBC)
          </button>
          <button
            onClick={() => setActiveCategory('advertisement')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === 'advertisement'
                ? 'bg-honey text-black'
                : 'bg-secondary text-muted-foreground hover:text-honey hover:bg-honey/10'
            }`}
            data-testid="filter-advertisement"
          >
            <i className="fas fa-bullhorn mr-2"></i>
            Advertisement NFTs
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeCategory === 'membership' ? (
        <>
          <MobileDivider withText="Bumblebees (BBC) Collection" className="mb-6" />
          
          {/* Premium Membership Showcase */}
          <div className="bg-gradient-to-br from-honey/10 to-honey/5 rounded-lg p-6 mb-6 border border-honey/20">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-honey/20 rounded-full mb-4">
                <i className="fas fa-crown text-2xl text-honey"></i>
              </div>
              <h2 className="text-2xl font-bold text-honey mb-2">Bumblebees (BBC) - 19-Level NFT System</h2>
              <p className="text-muted-foreground">From Warrior ($130) to Mythical Peak ($1000) - Premium membership NFTs on Alpha-centauri blockchain</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <i className="fas fa-shield-alt text-honey text-xl mb-2"></i>
                <h3 className="font-semibold text-sm">Bumblebees NFTs</h3>
                <p className="text-xs text-muted-foreground">Secure membership NFTs on Alpha-centauri (ACC)</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <i className="fas fa-coins text-honey text-xl mb-2"></i>
                <h3 className="font-semibold text-sm">USDT Payments</h3>
                <p className="text-xs text-muted-foreground">$130-$1000 USDT • Gas paid in Centauri Honey (CTH)</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <i className="fas fa-users text-honey text-xl mb-2"></i>
                <h3 className="font-semibold text-sm">BCC Rewards</h3>
                <p className="text-xs text-muted-foreground">Earn Beehive Crypto Coin • 100% to uplines</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center bg-honey/10 text-honey px-4 py-2 rounded-lg">
                <i className="fas fa-clock mr-2"></i>
                <span className="text-sm font-medium">Bumblebees (BBC) - Coming Soon</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <MobileDivider withText={`Advertisement NFTs • ${nfts.length} Available`} className="mb-6" />
          
          {/* Marketplace Header */}
          <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-honey mb-1">Advertisement NFTs</h3>
                <p className="text-sm text-muted-foreground">Purchase exclusive ad placements with Beehive Crypto Coin (BCC) tokens</p>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center bg-honey/10 px-3 py-1 rounded-full">
                  <i className="fas fa-coins text-honey mr-2"></i>
                  <span className="text-honey font-medium">BCC Only</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {nfts?.map((nft) => (
              <Card 
                key={nft.id}
                className="bg-secondary border-border glow-hover card-hover overflow-hidden relative"
              >
                {/* BCC Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-honey/20 text-honey">
                    BCC
                  </span>
                </div>

                <img 
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <CardContent className="p-3 md:p-4">
                  <h4 className="text-honey font-semibold mb-2 text-sm md:text-base">{nft.title}</h4>
                  <p className="text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">
                    {nft.description}
                  </p>
                  
                  {/* Mobile: Stack price and button */}
                  <div className="md:hidden space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-honey font-bold text-sm">{nft.priceBCC} BCC</span>
                      <span className={`text-xs px-2 py-1 rounded ${totalBCC >= nft.priceBCC ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {totalBCC >= nft.priceBCC ? 'Available' : 'Insufficient'}
                      </span>
                    </div>
                    
                    <div className="w-full">
                      <TransactionWidget
                        client={client}
                        theme="dark"
                        transaction={claimTo({
                          contract: merchantNFTContract,
                          quantity: BigInt(1),
                          tokenId: BigInt(nft.id),
                          to: account?.address || walletAddress || "",
                        })}
                      />
                    </div>
                  </div>
                  
                  {/* Desktop: Side by side */}
                  <div className="hidden md:flex justify-between items-center">
                    <span className="text-honey font-bold">{nft.priceBCC} BCC</span>
                    <TransactionWidget
                      client={client}
                      theme="dark"
                      transaction={claimTo({
                        contract: merchantNFTContract,
                        quantity: BigInt(1),
                        tokenId: BigInt(nft.id),
                        to: account?.address || walletAddress || "",
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}