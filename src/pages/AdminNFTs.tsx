import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Plus, Palette, Megaphone, Loader2, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AdvertisementNFTForm {
  title: string;
  description: string;
  image_url: string;
  price_usdt: number;
  price_bcc: number;
  category: string;
  click_url?: string;
  impressions_target: number;
  starts_at: string;
  ends_at?: string;
  metadata: any;
}

interface MerchantNFTForm {
  title: string;
  description: string;
  image_url: string;
  price_usdt: number;
  price_bcc: number;
  category: string;
  supply_total?: number;
  metadata: any;
}

export default function AdminNFTs() {
  const { t } = useI18n();
  const { walletAddress, userData } = useWallet();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('add-advertisement');
  const [loading, setLoading] = useState(false);
  const [advertisementNFTs, setAdvertisementNFTs] = useState<any[]>([]);
  const [merchantNFTs, setMerchantNFTs] = useState<any[]>([]);
  
  // Form states
  const [adForm, setAdForm] = useState<AdvertisementNFTForm>({
    title: '',
    description: '',
    image_url: '',
    price_usdt: 0,
    price_bcc: 0,
    category: '',
    click_url: '',
    impressions_target: 1000,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    metadata: {}
  });

  const [merchantForm, setMerchantForm] = useState<MerchantNFTForm>({
    title: '',
    description: '',
    image_url: '',
    price_usdt: 0,
    price_bcc: 0,
    category: '',
    supply_total: undefined,
    metadata: {}
  });

  // Categories
  const advertisementCategories = ['DeFi', 'NFT', 'Gaming', 'Trading', 'DAO', 'Metaverse', 'Infrastructure'];
  const merchantCategories = ['Education', 'Consulting', 'Security', 'Design', 'Development', 'Marketing', 'Economics', 'Governance'];

  // Check admin access
  const isAdmin = userData?.role === 'admin' || userData?.is_admin;

  // Fetch existing NFTs
  const fetchNFTs = useCallback(async () => {
    try {
      const [adResponse, merchantResponse] = await Promise.all([
        supabase.from('advertisement_nfts').select('*').order('created_at', { ascending: false }),
        supabase.from('merchant_nfts').select('*').order('created_at', { ascending: false })
      ]);

      if (adResponse.error) throw adResponse.error;
      if (merchantResponse.error) throw merchantResponse.error;

      setAdvertisementNFTs(adResponse.data || []);
      setMerchantNFTs(merchantResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching NFTs:', error);
      toast({
        title: "Error",
        description: "Failed to load NFTs",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Create Advertisement NFT
  const createAdvertisementNFT = async () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('advertisement_nfts')
        .insert({
          ...adForm,
          advertiser_wallet: walletAddress,
          impressions_current: 0,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advertisement NFT created successfully!",
        duration: 4000
      });

      // Reset form
      setAdForm({
        title: '',
        description: '',
        image_url: '',
        price_usdt: 0,
        price_bcc: 0,
        category: '',
        click_url: '',
        impressions_target: 1000,
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: '',
        metadata: {}
      });

      await fetchNFTs();
    } catch (error: any) {
      console.error('Error creating advertisement NFT:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create advertisement NFT",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create Merchant NFT
  const createMerchantNFT = async () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('merchant_nfts')
        .insert({
          ...merchantForm,
          creator_wallet: walletAddress,
          supply_available: merchantForm.supply_total,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Merchant NFT created successfully!",
        duration: 4000
      });

      // Reset form
      setMerchantForm({
        title: '',
        description: '',
        image_url: '',
        price_usdt: 0,
        price_bcc: 0,
        category: '',
        supply_total: undefined,
        metadata: {}
      });

      await fetchNFTs();
    } catch (error: any) {
      console.error('Error creating merchant NFT:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create merchant NFT",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete NFT
  const deleteNFT = async (id: string, type: 'advertisement' | 'merchant') => {
    if (!isAdmin) return;

    const table = type === 'advertisement' ? 'advertisement_nfts' : 'merchant_nfts';
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type} NFT deleted successfully`,
      });

      await fetchNFTs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete NFT",
        variant: "destructive"
      });
    }
  };

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      fetchNFTs();
    }
  }, [isAdmin, fetchNFTs]);

  // Check admin access
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-3">
          NFT Management
        </h1>
        <p className="text-muted-foreground">
          Create and manage Advertisement NFTs and Merchant NFTs for the marketplace
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl mx-auto bg-background border border-border rounded-xl p-1">
          <TabsTrigger 
            value="add-advertisement" 
            className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
          >
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">Add Ad NFT</span>
            <span className="sm:hidden">Ad</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="add-merchant" 
            className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
          >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Add Merchant</span>
            <span className="sm:hidden">Merchant</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="manage-ads" 
            className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Ads ({advertisementNFTs.length})</span>
            <span className="sm:hidden">Ads</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="manage-merchants" 
            className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Services ({merchantNFTs.length})</span>
            <span className="sm:hidden">Services</span>
          </TabsTrigger>
        </TabsList>

        {/* Add Advertisement NFT */}
        <TabsContent value="add-advertisement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Create Advertisement NFT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">Title</Label>
                  <Input
                    id="ad-title"
                    value={adForm.title}
                    onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                    placeholder="Advertisement title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-category">Category</Label>
                  <Select value={adForm.category} onValueChange={(value) => setAdForm({ ...adForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {advertisementCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-price-usdt">Price (USDT)</Label>
                  <Input
                    id="ad-price-usdt"
                    type="number"
                    value={adForm.price_usdt}
                    onChange={(e) => setAdForm({ ...adForm, price_usdt: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-price-bcc">Price (BCC)</Label>
                  <Input
                    id="ad-price-bcc"
                    type="number"
                    value={adForm.price_bcc}
                    onChange={(e) => setAdForm({ ...adForm, price_bcc: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-impressions">Impressions Target</Label>
                  <Input
                    id="ad-impressions"
                    type="number"
                    value={adForm.impressions_target}
                    onChange={(e) => setAdForm({ ...adForm, impressions_target: parseInt(e.target.value) || 1000 })}
                    placeholder="1000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-click-url">Click URL (optional)</Label>
                  <Input
                    id="ad-click-url"
                    value={adForm.click_url}
                    onChange={(e) => setAdForm({ ...adForm, click_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ad-image">Image URL</Label>
                <Input
                  id="ad-image"
                  value={adForm.image_url}
                  onChange={(e) => setAdForm({ ...adForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ad-description">Description</Label>
                <Textarea
                  id="ad-description"
                  value={adForm.description}
                  onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                  placeholder="Describe the advertisement..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-starts">Starts At</Label>
                  <Input
                    id="ad-starts"
                    type="datetime-local"
                    value={adForm.starts_at}
                    onChange={(e) => setAdForm({ ...adForm, starts_at: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ad-ends">Ends At (optional)</Label>
                  <Input
                    id="ad-ends"
                    type="datetime-local"
                    value={adForm.ends_at}
                    onChange={(e) => setAdForm({ ...adForm, ends_at: e.target.value })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={createAdvertisementNFT}
                disabled={loading || !adForm.title || !adForm.description}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Advertisement NFT
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Merchant NFT */}
        <TabsContent value="add-merchant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Create Merchant NFT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant-title">Title</Label>
                  <Input
                    id="merchant-title"
                    value={merchantForm.title}
                    onChange={(e) => setMerchantForm({ ...merchantForm, title: e.target.value })}
                    placeholder="Service title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="merchant-category">Category</Label>
                  <Select value={merchantForm.category} onValueChange={(value) => setMerchantForm({ ...merchantForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchantCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="merchant-price-usdt">Price (USDT)</Label>
                  <Input
                    id="merchant-price-usdt"
                    type="number"
                    value={merchantForm.price_usdt}
                    onChange={(e) => setMerchantForm({ ...merchantForm, price_usdt: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="merchant-price-bcc">Price (BCC)</Label>
                  <Input
                    id="merchant-price-bcc"
                    type="number"
                    value={merchantForm.price_bcc}
                    onChange={(e) => setMerchantForm({ ...merchantForm, price_bcc: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="merchant-supply">Total Supply (optional - leave empty for unlimited)</Label>
                  <Input
                    id="merchant-supply"
                    type="number"
                    value={merchantForm.supply_total || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, supply_total: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave empty for unlimited supply"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="merchant-image">Image URL</Label>
                <Input
                  id="merchant-image"
                  value={merchantForm.image_url}
                  onChange={(e) => setMerchantForm({ ...merchantForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="merchant-description">Description</Label>
                <Textarea
                  id="merchant-description"
                  value={merchantForm.description}
                  onChange={(e) => setMerchantForm({ ...merchantForm, description: e.target.value })}
                  placeholder="Describe the service..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={createMerchantNFT}
                disabled={loading || !merchantForm.title || !merchantForm.description}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Merchant NFT
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Advertisement NFTs */}
        <TabsContent value="manage-ads" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advertisementNFTs.map((nft) => (
              <Card key={nft.id} className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <img 
                    src={nft.image_url} 
                    alt={nft.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <Badge className="w-fit bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {nft.category}
                  </Badge>
                  <CardTitle className="text-sm">{nft.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Price: {nft.price_bcc} BCC (${nft.price_usdt})</div>
                    <div>Views: {nft.impressions_current}/{nft.impressions_target}</div>
                    <div>Created: {new Date(nft.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNFT(nft.id, 'advertisement')}
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {advertisementNFTs.length === 0 && (
            <div className="text-center py-12">
              <Megaphone className="w-16 h-16 text-blue-400/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No advertisement NFTs created yet</p>
            </div>
          )}
        </TabsContent>

        {/* Manage Merchant NFTs */}
        <TabsContent value="manage-merchants" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchantNFTs.map((nft) => (
              <Card key={nft.id} className="border-purple-500/20">
                <CardHeader className="pb-3">
                  <img 
                    src={nft.image_url} 
                    alt={nft.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <Badge className="w-fit bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {nft.category}
                  </Badge>
                  <CardTitle className="text-sm">{nft.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Price: {nft.price_bcc} BCC (${nft.price_usdt})</div>
                    {nft.supply_total && (
                      <div>Supply: {nft.supply_available}/{nft.supply_total}</div>
                    )}
                    <div>Created: {new Date(nft.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNFT(nft.id, 'merchant')}
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {merchantNFTs.length === 0 && (
            <div className="text-center py-12">
              <Palette className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No merchant NFTs created yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}