import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import MobileDivider from '../components/UI/MobileDivider';
import UserProfile from '../components/UI/UserProfile';
import { TransactionWidget, useActiveAccount } from "thirdweb/react";
import { claimTo } from "thirdweb/extensions/erc1155";
import { merchantNFTContract, client, bbcMembershipContract, levelToTokenId } from "../lib/web3";
import { membershipLevels, getMembershipLevel } from '../lib/config/membershipLevels';
import ClaimMembershipButton from '../components/membership/ClaimMembershipButton';

interface MarketplaceNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceBCC: number;
  active: boolean;
}

export default function Tasks() {
  const { walletAddress, bccBalance, currentLevel, isActivated } = useWallet();
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

  // Helper function to determine if a level is available for purchase
  const getLevelStatus = (level: number) => {
    if (level <= currentLevel) {
      return 'owned'; // User already owns this level
    } else if (level === currentLevel + 1) {
      return 'available'; // Next level available for purchase
    } else {
      return 'locked'; // Level is locked until previous levels are purchased
    }
  };

  // Get available membership levels (up to level 18)
  const availableLevels = membershipLevels.slice(0, 18);

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
      {/* User Profile Component */}
      <UserProfile />
      
      {/* Mobile Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-honey mb-2 flex items-center">
          <i className="fas fa-tasks mr-3 text-honey"></i>
          Tasks
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mb-3">
          Level up your membership and unlock exclusive features • Purchase Advertisement NFTs with BCC
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
          <MobileDivider withText={`Membership Levels • Level ${currentLevel} ${currentLevel > 0 ? 'Active' : 'Inactive'}`} className="mb-6" />
          
          {/* User Status Header */}
          <Card className="bg-secondary border-border mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-honey font-semibold text-lg">Your Membership Progress</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentLevel === 0 
                      ? "Start your journey by purchasing Level 1 Warrior membership"
                      : `Current Level: ${currentLevel} • Next: Level ${currentLevel + 1} ${availableLevels[currentLevel]?.titleEn || 'Max Level'}`
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-honey font-bold text-xl">{currentLevel}</p>
                    <p className="text-muted-foreground text-xs">Current Level</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                    <i className="fas fa-crown text-honey"></i>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Membership Levels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableLevels.map((level) => {
              const status = getLevelStatus(level.level);
              const isOwned = status === 'owned';
              const isAvailable = status === 'available';
              const isLocked = status === 'locked';
              
              return (
                <Card 
                  key={level.level}
                  className={`border transition-all relative overflow-hidden ${
                    isOwned 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : isAvailable 
                      ? 'bg-honey/10 border-honey/30 glow-hover' 
                      : 'bg-muted/30 border-muted'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {isOwned && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-500/20 text-green-400">
                        <i className="fas fa-check mr-1"></i>Owned
                      </span>
                    )}
                    {isAvailable && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-honey/20 text-honey">
                        Available
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        <i className="fas fa-lock mr-1"></i>Locked
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                        isOwned 
                          ? 'bg-green-500/20' 
                          : isAvailable 
                          ? 'bg-honey/20' 
                          : 'bg-muted/50'
                      }`}>
                        <i className={`fas fa-crown text-xl ${
                          isOwned 
                            ? 'text-green-400' 
                            : isAvailable 
                            ? 'text-honey' 
                            : 'text-muted-foreground'
                        }`}></i>
                      </div>
                      
                      <h3 className={`font-bold text-lg ${
                        isOwned 
                          ? 'text-green-400' 
                          : isAvailable 
                          ? 'text-honey' 
                          : 'text-muted-foreground'
                      }`}>
                        Level {level.level}
                      </h3>
                      
                      <p className={`text-sm font-medium ${
                        isOwned 
                          ? 'text-green-400/80' 
                          : isAvailable 
                          ? 'text-honey/80' 
                          : 'text-muted-foreground'
                      }`}>
                        {level.titleEn} / {level.titleZh}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          isOwned 
                            ? 'text-green-400' 
                            : isAvailable 
                            ? 'text-honey' 
                            : 'text-muted-foreground'
                        }`}>
                          ${level.priceUSDT}
                        </p>
                        <p className="text-xs text-muted-foreground">USDT</p>
                      </div>

                      {/* Purchase Button */}
                      {isOwned ? (
                        <Button 
                          disabled 
                          className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/20"
                          data-testid={`button-owned-level-${level.level}`}
                        >
                          <i className="fas fa-check mr-2"></i>
                          Owned
                        </Button>
                      ) : isAvailable ? (
                        <ClaimMembershipButton
                          walletAddress={walletAddress || ''}
                          level={level.level}
                          className="w-full"
                          onSuccess={() => {
                            toast({
                              title: 'Membership Upgraded!',
                              description: `You are now Level ${level.level} ${level.titleEn}!`,
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                          }}
                          onError={(error) => {
                            toast({
                              title: 'Purchase Failed',
                              description: error,
                              variant: 'destructive',
                            });
                          }}
                        />
                      ) : (
                        <Button 
                          disabled 
                          className="w-full bg-muted text-muted-foreground"
                          data-testid={`button-locked-level-${level.level}`}
                        >
                          <i className="fas fa-lock mr-2"></i>
                          Locked
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                          tokenId: BigInt(1), // Use sequential number instead of UUID
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
                        tokenId: BigInt(1), // Use sequential number instead of UUID
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