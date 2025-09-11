import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Megaphone, Package, ArrowRight, Star, Loader2, ShoppingCart, Eye, Sparkles, Palette } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price_usdt: number;
  price_bcc: number;
  category: string;
  advertiser_wallet?: string;
  click_url?: string;
  impressions_target: number;
  impressions_current: number;
  is_active: boolean;
  starts_at: string;
  ends_at?: string;
  metadata: any;
  created_at: string;
}

interface MerchantNFT {
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

interface NFTPurchase {
  id: string;
  buyer_wallet: string;
  nft_id: string;
  nft_type: 'advertisement' | 'merchant';
  amount_paid: number;
  currency: string;
  transaction_hash: string;
  created_at: string;
}

export default function NFTs() {
  const { t } = useI18n();
  const { walletAddress, bccBalance, currentLevel } = useWallet();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('advertisement-nfts');
  const [loading, setLoading] = useState(false);
  const [advertisementNFTs, setAdvertisementNFTs] = useState<AdvertisementNFT[]>([]);
  const [merchantNFTs, setMerchantNFTs] = useState<MerchantNFT[]>([]);
  const [myPurchases, setMyPurchases] = useState<NFTPurchase[]>([]);
  const [purchaseState, setPurchaseState] = useState<{
    nftId: string | null;
    loading: boolean;
    error: string | null;
  }>({
    nftId: null,
    loading: false,
    error: null
  });

  // Fetch Advertisement NFTs from Supabase
  const fetchAdvertisementNFTs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('advertisement_nfts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvertisementNFTs(data || []);
    } catch (error) {
      console.error('Error fetching advertisement NFTs:', error);
      toast({
        title: "Error",
        description: "Failed to load advertisement NFTs",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Fetch Merchant NFTs from Supabase
  const fetchMerchantNFTs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_nfts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMerchantNFTs(data || []);
    } catch (error) {
      console.error('Error fetching merchant NFTs:', error);
      toast({
        title: "Error",
        description: "Failed to load merchant NFTs",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Fetch user's NFT purchases from Supabase
  const fetchMyPurchases = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('nft_purchases')
        .select('*')
        .eq('buyer_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyPurchases(data || []);
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      toast({
        title: "Error",
        description: "Failed to load your NFT purchases",
        variant: "destructive"
      });
    }
  }, [walletAddress, toast]);

  // Purchase NFT function
  const handlePurchaseNFT = async (nft: AdvertisementNFT | MerchantNFT, nftType: 'advertisement' | 'merchant') => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to purchase NFTs",
        variant: "destructive"
      });
      return;
    }

    // Check BCC balance
    if (bccBalance < nft.price_bcc) {
      toast({
        title: "Insufficient BCC",
        description: `You need ${nft.price_bcc} BCC to purchase this NFT (current: ${bccBalance} BCC)`,
        variant: "destructive"
      });
      return;
    }

    setPurchaseState({ nftId: nft.id, loading: true, error: null });

    try {
      // Generate mock transaction hash
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Insert purchase record
      const { error: purchaseError } = await supabase
        .from('nft_purchases')
        .insert({
          buyer_wallet: walletAddress,
          nft_id: nft.id,
          nft_type: nftType,
          amount_paid: nft.price_bcc,
          currency: 'BCC',
          transaction_hash: transactionHash
        });

      if (purchaseError) throw purchaseError;

      // Update user BCC balance (lock the BCC instead of subtracting)
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ 
          bcc_transferable: bccBalance - nft.price_bcc,
          bcc_locked: (bccBalance - nft.price_bcc), // Lock the BCC amount
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (balanceError) throw balanceError;

      // If it's a merchant NFT, decrease available supply
      if (nftType === 'merchant' && 'supply_available' in nft && nft.supply_available && nft.supply_available > 0) {
        const { error: supplyError } = await supabase
          .from('merchant_nfts')
          .update({ 
            supply_available: nft.supply_available - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', nft.id);

        if (supplyError) throw supplyError;
      }

      toast({
        title: "🎉 NFT Purchased Successfully!",
        description: `You've purchased "${nft.title}" for ${nft.price_bcc} BCC`,
        duration: 6000
      });

      // Refresh data
      await Promise.all([
        fetchMyPurchases(),
        nftType === 'merchant' ? fetchMerchantNFTs() : fetchAdvertisementNFTs()
      ]);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase NFT. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchaseState({ nftId: null, loading: false, error: null });
    }
  };

  // Load data on component mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAdvertisementNFTs(),
      fetchMerchantNFTs(),
      fetchMyPurchases()
    ]).finally(() => setLoading(false));
  }, [fetchAdvertisementNFTs, fetchMerchantNFTs, fetchMyPurchases]);

  // Calculate stats
  const adNFTsOwned = myPurchases.filter(p => p.nft_type === 'advertisement').length;
  const merchantNFTsOwned = myPurchases.filter(p => p.nft_type === 'merchant').length;
  const totalNFTsOwned = adNFTsOwned + merchantNFTsOwned;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-3 bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
              NFT Marketplace
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Discover and purchase exclusive Web3 services, merchant offerings, and premium digital assets using BCC tokens
            </p>
          </div>
          
          {/* Stats Summary */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4">
            <div className="text-center lg:text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span>My NFTs</span>
              </div>
              <div className="text-lg font-bold text-honey">
                {totalNFTsOwned} Owned
              </div>
            </div>
            
            <div className="text-center lg:text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span>BCC Balance</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                {bccBalance.toFixed(2)} BCC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-honey" />
          <span className="ml-2 text-muted-foreground">Loading NFTs...</span>
        </div>
      )}

      {/* Tab Navigation */}
      {!loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-border">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto bg-background border border-border rounded-xl p-1">
              <TabsTrigger 
                value="advertisement-nfts" 
                className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              >
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Advertisement</span>
                <span className="sm:hidden">Ads</span>
                <Badge variant="secondary" className="ml-1 bg-blue-500/20 text-blue-400 text-xs">
                  {advertisementNFTs.length}
                </Badge>
              </TabsTrigger>
              
              <TabsTrigger 
                value="merchant-nfts" 
                className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Merchant</span>
                <span className="sm:hidden">Merchant</span>
                <Badge variant="secondary" className="ml-1 bg-purple-500/20 text-purple-400 text-xs">
                  {merchantNFTs.length}
                </Badge>
              </TabsTrigger>
              
              <TabsTrigger 
                value="my-collection" 
                className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">My NFTs</span>
                <span className="sm:hidden">Mine</span>
                <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400 text-xs">
                  {totalNFTsOwned}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Advertisement NFTs Tab */}
          <TabsContent value="advertisement-nfts" className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-2xl">
                <Megaphone className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-400">Advertisement NFTs</h2>
                <p className="text-muted-foreground">Web3 services and platform advertisements - purchase with BCC</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advertisementNFTs.map((nft) => (
                <Card key={nft.id} className="group hover:shadow-lg transition-all duration-200 border-blue-500/20 hover:border-blue-500/40">
                  <CardHeader className="pb-3">
                    <img 
                      src={nft.image_url} 
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <Badge className="w-fit bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {nft.category}
                    </Badge>
                    <CardTitle className="text-lg text-foreground">{nft.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{nft.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{nft.price_bcc} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.price_usdt} USDT</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-foreground">{nft.impressions_current.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handlePurchaseNFT(nft, 'advertisement')}
                        disabled={purchaseState.loading && purchaseState.nftId === nft.id}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white"
                      >
                        {purchaseState.loading && purchaseState.nftId === nft.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Purchasing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Purchase
                          </>
                        )}
                      </Button>
                      
                      {nft.click_url && (
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(nft.click_url, '_blank')}
                          className="px-3 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {advertisementNFTs.length === 0 && !loading && (
              <div className="text-center py-12">
                <Megaphone className="w-16 h-16 text-blue-400/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No advertisement NFTs available</p>
              </div>
            )}
          </TabsContent>

          {/* Merchant NFTs Tab */}
          <TabsContent value="merchant-nfts" className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-2xl">
                <Palette className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-purple-400">Merchant NFTs</h2>
                <p className="text-muted-foreground">Professional services and digital products from verified merchants</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchantNFTs.map((nft) => (
                <Card key={nft.id} className="group hover:shadow-lg transition-all duration-200 border-purple-500/20 hover:border-purple-500/40">
                  <CardHeader className="pb-3">
                    <img 
                      src={nft.image_url} 
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {nft.category}
                      </Badge>
                      {nft.supply_total && (
                        <Badge variant="outline" className="text-xs">
                          {nft.supply_available}/{nft.supply_total} left
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg text-foreground">{nft.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{nft.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-400">{nft.price_bcc} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.price_usdt} USDT</div>
                      </div>
                      {nft.supply_total && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-foreground">{nft.supply_available || 0}</div>
                          <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => handlePurchaseNFT(nft, 'merchant')}
                      disabled={
                        purchaseState.loading && purchaseState.nftId === nft.id ||
                        (nft.supply_available !== null && nft.supply_available <= 0)
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white"
                    >
                      {purchaseState.loading && purchaseState.nftId === nft.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Purchasing...
                        </>
                      ) : nft.supply_available !== null && nft.supply_available <= 0 ? (
                        'Sold Out'
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Purchase ({nft.price_bcc} BCC)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {merchantNFTs.length === 0 && !loading && (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No merchant NFTs available</p>
              </div>
            )}
          </TabsContent>

          {/* My Collection Tab */}
          <TabsContent value="my-collection" className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl">
                <Star className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-400">My NFT Collection</h2>
                <p className="text-muted-foreground">Your purchased NFTs and active services</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPurchases.map((purchase) => {
                const isAdNFT = purchase.nft_type === 'advertisement';
                const nft = isAdNFT 
                  ? advertisementNFTs.find(n => n.id === purchase.nft_id)
                  : merchantNFTs.find(n => n.id === purchase.nft_id);
                  
                if (!nft) return null;

                return (
                  <Card key={purchase.id} className="border-green-500/20">
                    <CardHeader className="pb-3">
                      <img 
                        src={nft.image_url} 
                        alt={nft.title}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <div className="flex items-center justify-between">
                        <Badge className={`${
                          isAdNFT 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {nft.category}
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Owned
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-foreground">{nft.title}</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{nft.description}</p>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Purchased: {new Date(purchase.created_at).toLocaleDateString()}</div>
                        <div>Paid: {purchase.amount_paid} {purchase.currency}</div>
                        <div>Type: {purchase.nft_type}</div>
                      </div>

                      {isAdNFT && (nft as AdvertisementNFT).click_url && (
                        <Button 
                          variant="outline" 
                          onClick={() => window.open((nft as AdvertisementNFT).click_url, '_blank')}
                          className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Access Service
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {myPurchases.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-green-400/30 mx-auto mb-4 flex items-center justify-center">
                  <Package className="w-8 h-8 text-green-400/30" />
                </div>
                <p className="text-muted-foreground mb-4">No NFTs in your collection yet</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('advertisement-nfts')}
                    className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                  >
                    Browse Ads
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('merchant-nfts')}
                    className="border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                  >
                    Browse Services
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}