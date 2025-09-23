import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useLocation } from 'wouter';
import { useMultilingualNFTs } from '../hooks/useMultilingualContent';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { HybridTranslation } from '../components/shared/HybridTranslation';
import { useToast } from '../hooks/use-toast';
import { Megaphone, Package, ArrowRight, Star, Loader2, ShoppingCart, Eye, Sparkles, Palette, Languages } from 'lucide-react';
import { supabase, orderService } from '../lib/supabaseClient';

interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  price_usdt: number;
  price_bcc: number;
  category: string;
  advertiser_wallet: string | null;
  click_url: string | null;
  impressions_target: number;
  impressions_current: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  // 多语言支持
  language?: string;
  language_code?: string;
  translations?: Record<string, { title?: string; description?: string; category?: string; }>;
  available_languages?: string[];
}

interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  price_usdt: number;
  price_bcc: number;
  category: string;
  supply_total: number | null;
  supply_available: number | null;
  is_active: boolean;
  creator_wallet: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  // 多语言支持
  language?: string;
  language_code?: string;
  translations?: Record<string, { title?: string; description?: string; category?: string; }>;
  available_languages?: string[];
}

interface NFTPurchase {
  id: string;
  buyer_wallet: string;
  nft_id: string;
  nft_type: string;
  payment_method: string;
  price_bcc: number | null;
  price_usdt: number;
  purchased_at: string;
  status: string;
  transaction_hash: string | null;
  metadata: any;
}

export default function NFTs() {
  const { t, language } = useI18n();
  const { walletAddress, bccBalance, currentLevel } = useWallet();
  
  // 使用多语言NFT钩子
  const { nfts: multilingualNFTs, loading: nftsLoading, error: nftsError } = useMultilingualNFTs(language);
  
  // Helper function to get translated content from NFT metadata (临时向后兼容)
  const getTranslatedContent = (nft: AdvertisementNFT | MerchantNFT, field: 'title' | 'description' | 'category') => {
    const translations = nft.metadata?.translations || nft.translations;
    if (translations && translations[language] && translations[language][field]) {
      return translations[language][field];
    }
    // Fallback to default field value
    return nft[field] || '';
  };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Local state for direct BCC balance
  const [directBCCBalance, setDirectBCCBalance] = useState<number | null>(null);
  
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

  // Fetch Advertisement NFTs using multilingual API
  const fetchAdvertisementNFTs = useCallback(async () => {
    try {
      console.log(`🔍 开始获取广告NFT数据 (语言: ${language})`);
      const { multilingualNFTsApi } = await import('../api/nfts/multilingual-nfts.api');
      const data = await multilingualNFTsApi.getAdvertisementNFTs(language, {
        is_active: true,
        limit: 50
      });
      console.log(`📦 获取到 ${data.length} 个广告NFT`, data);
      setAdvertisementNFTs(data);
    } catch (error) {
      console.error('Error fetching multilingual advertisement NFTs:', error);
      // 创建示例数据用于测试翻译功能
      console.log('🧪 使用示例数据测试翻译功能...');
      const mockData: AdvertisementNFT[] = [
        {
          id: 'mock-1',
          title: 'Premium DeFi Analytics Dashboard',
          description: 'Access advanced analytics and insights for your DeFi portfolio with real-time tracking.',
          image_url: 'https://picsum.photos/400/300?random=1',
          price_usdt: 99.99,
          price_bcc: 150,
          category: 'defi',
          advertiser_wallet: null,
          click_url: 'https://example.com',
          impressions_target: 10000,
          impressions_current: 2345,
          is_active: true,
          starts_at: new Date().toISOString(),
          ends_at: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          language: 'en',
          translations: {
            'zh': { 
              title: 'DeFi分析仪表板高级版', 
              description: '获得DeFi投资组合的高级分析和洞察，提供实时跟踪功能。',
              category: 'DeFi'
            },
            'ja': { 
              title: 'プレミアムDeFi分析ダッシュボード', 
              description: 'リアルタイム追跡機能付きのDeFiポートフォリオ向け高度な分析と洞察にアクセス。',
              category: 'DeFi'
            }
          },
          available_languages: ['en', 'zh', 'ja']
        },
        {
          id: 'mock-2',
          title: 'Gaming NFT Collection',
          description: 'Exclusive gaming NFTs that unlock special abilities and rewards in our Web3 game ecosystem.',
          image_url: 'https://picsum.photos/400/300?random=2',
          price_usdt: 49.99,
          price_bcc: 75,
          category: 'gaming',
          advertiser_wallet: null,
          click_url: 'https://example.com/gaming',
          impressions_target: 5000,
          impressions_current: 1234,
          is_active: true,
          starts_at: new Date().toISOString(),
          ends_at: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          language: 'en',
          translations: {
            'zh': { 
              title: '游戏NFT收藏品', 
              description: '独家游戏NFT，在我们的Web3游戏生态系统中解锁特殊能力和奖励。',
              category: '游戏'
            },
            'ko': { 
              title: '게임 NFT 컬렉션', 
              description: 'Web3 게임 생태계에서 특별한 능력과 보상을 해제하는 독점 게임 NFT.',
              category: '게임'
            }
          },
          available_languages: ['en', 'zh', 'ko']
        }
      ];
      
      setAdvertisementNFTs(mockData);
      console.log(`✅ 使用 ${mockData.length} 个测试NFT数据`);
    }
  }, [language, toast, t]);

  // Fetch Merchant NFTs using multilingual API
  const fetchMerchantNFTs = useCallback(async () => {
    try {
      console.log(`🔍 开始获取商户NFT数据 (语言: ${language})`);
      const { multilingualNFTsApi } = await import('../api/nfts/multilingual-nfts.api');
      const data = await multilingualNFTsApi.getMerchantNFTs(language, {
        is_active: true,
        limit: 50
      });
      console.log(`📦 获取到 ${data.length} 个商户NFT`, data);
      setMerchantNFTs(data);
    } catch (error) {
      console.error('Error fetching multilingual merchant NFTs:', error);
      // 创建示例数据用于测试翻译功能
      console.log('🧪 使用商户示例数据测试翻译功能...');
      const mockData: MerchantNFT[] = [
        {
          id: 'merchant-1',
          title: 'Professional Web Development Service',
          description: 'Full-stack web development service including React, Node.js, and database integration.',
          image_url: 'https://picsum.photos/400/300?random=3',
          price_usdt: 199.99,
          price_bcc: 300,
          category: 'development',
          supply_total: 10,
          supply_available: 7,
          is_active: true,
          creator_wallet: null,
          metadata: { duration: '2-4 weeks', includes: ['Frontend', 'Backend', 'Database'] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          language: 'en',
          translations: {
            'zh': { 
              title: '专业网站开发服务', 
              description: '全栈网站开发服务，包括React、Node.js和数据库集成。',
              category: '开发'
            },
            'th': { 
              title: 'บริการพัฒนาเว็บไซต์มืออาชีพ', 
              description: 'บริการพัฒนาเว็บไซต์แบบ full-stack รวมถึง React, Node.js และการเชื่อมต่อฐานข้อมูล',
              category: 'การพัฒนา'
            }
          },
          available_languages: ['en', 'zh', 'th']
        },
        {
          id: 'merchant-2',
          title: 'Digital Marketing Consultation',
          description: 'Strategic digital marketing consultation to boost your Web3 project visibility and growth.',
          image_url: 'https://picsum.photos/400/300?random=4',
          price_usdt: 149.99,
          price_bcc: 225,
          category: 'consulting',
          supply_total: 5,
          supply_available: 3,
          is_active: true,
          creator_wallet: null,
          metadata: { duration: '1-2 weeks', includes: ['Strategy', 'Campaign', 'Analytics'] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          language: 'en',
          translations: {
            'zh': { 
              title: '数字营销咨询', 
              description: '战略性数字营销咨询，提升您的Web3项目可见度和增长。',
              category: '咨询'
            },
            'ms': { 
              title: 'Perundingan Pemasaran Digital', 
              description: 'Perundingan pemasaran digital strategik untuk meningkatkan keterlihatan dan pertumbuhan projek Web3 anda.',
              category: 'Perundingan'
            }
          },
          available_languages: ['en', 'zh', 'ms']
        }
      ];
      
      setMerchantNFTs(mockData);
      console.log(`✅ 使用 ${mockData.length} 个测试商户NFT数据`);
    }
  }, [language, toast, t]);

  // Fetch user's NFT purchases from Supabase
  const fetchMyPurchases = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('nft_purchases')
        .select('*')
        .eq('buyer_wallet', walletAddress)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setMyPurchases(data || []);
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      toast({
        title: t('nfts.errors.loadFailed'),
        description: t('nfts.errors.loadPurchasesFailed'),
        variant: "destructive"
      });
    }
  }, [walletAddress, toast]);

  // Fetch direct BCC balance from database
  const fetchDirectBCCBalance = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('bcc_balance')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      setDirectBCCBalance(data?.bcc_balance || 0);
      console.log(`💰 Direct BCC Balance: ${data?.bcc_balance || 0}`);
    } catch (error) {
      console.error('Error fetching direct BCC balance:', error);
      setDirectBCCBalance(0);
    }
  }, [walletAddress]);

  // Purchase NFT function
  const handlePurchaseNFT = async (nft: AdvertisementNFT | MerchantNFT, nftType: 'advertisement' | 'merchant') => {
    if (!walletAddress) {
      toast({
        title: t('nfts.purchase.walletRequired'),
        description: t('nfts.purchase.connectWallet'),
        variant: "destructive"
      });
      return;
    }

    // Check BCC balance - use direct balance if available, otherwise fallback to useWallet balance
    let currentBCC = directBCCBalance !== null ? directBCCBalance : (bccBalance?.transferable || 0);
    
    // If still no balance, query database directly
    if (currentBCC === 0) {
      try {
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('bcc_balance')
          .eq('wallet_address', walletAddress)
          .single();
        currentBCC = balanceData?.bcc_balance || 0;
        console.log(`🔄 Direct DB query - BCC balance: ${currentBCC}`);
      } catch (error) {
        console.error('Failed to get balance from database:', error);
      }
    }
    if (currentBCC < nft.price_bcc) {
      toast({
        title: t('nfts.purchase.insufficientBcc'),
        description: t('nfts.purchase.needBcc', { amount: nft.price_bcc, current: currentBCC }),
        variant: "destructive"
      });
      return;
    }

    setPurchaseState({ nftId: nft.id, loading: true, error: null });

    try {
      // Generate mock transaction hash
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Use balance edge function to spend BCC for NFT purchase
      const baseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1MjUwMTYsImV4cCI6MjA0MDEwMTAxNn0.gBWZUvwCJgP1lsVQlZNDsYXDxBEr31QfRtNEgYzS6NA';
      
      const spendResponse = await fetch(`${baseUrl}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'spend-bcc',
          amount: nft.price_bcc,
          purpose: 'nft_purchase',
          itemType: 'nft',
          itemId: nft.id,
          nftType: nftType
        })
      });
      
      const spendResult = await spendResponse.json();
      const spendError = !spendResponse.ok ? new Error(spendResult.error || 'Failed to spend BCC') : null;

      if (spendError || !spendResult?.success) {
        throw new Error(`BCC spending failed: ${spendError?.message || spendResult?.error || 'Unknown error'}`);
      }

      console.log(`✅ BCC spent successfully: ${nft.price_bcc} BCC for NFT ${nft.title}`);

      // Create NFT purchase record using the orderService
      const { data: purchaseRecord, error: purchaseError } = await orderService.createNFTPurchase({
        buyer_wallet: walletAddress,
        nft_id: nft.id,
        nft_type: nftType,
        price_bcc: nft.price_bcc,
        price_usdt: nft.price_usdt || 0,
        payment_method: 'bcc',
        transaction_hash: transactionHash,
        metadata: {
          nft_title: nft.title,
          category: nft.category || nftType,
          image_url: nft.image_url
        }
      });

      if (purchaseError) {
        console.error('❌ Error creating purchase record:', purchaseError);
        throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
      }
      
      console.log('✅ NFT purchase record created successfully:', purchaseRecord?.id);

      // Update supply for merchant NFTs
      if (nftType === 'merchant' && 'supply_available' in nft && nft.supply_available && nft.supply_available > 0) {
        const { error: supplyError } = await supabase
          .from('merchant_nfts')
          .update({ 
            supply_available: Math.max(0, nft.supply_available - 1),
            updated_at: new Date().toISOString()
          })
          .eq('id', nft.id);

        if (supplyError) {
          console.error('Error updating NFT supply:', supplyError);
        }
      }

      toast({
        title: "🎉 " + t('nfts.purchase.success'),
        description: `${t('nfts.purchase.successDesc')} "${nft.title}" for ${nft.price_bcc} BCC`,
        duration: 6000
      });

      // Refresh data including direct balance
      await Promise.all([
        fetchMyPurchases(),
        fetchDirectBCCBalance(),
        nftType === 'merchant' ? fetchMerchantNFTs() : fetchAdvertisementNFTs()
      ]);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: t('nfts.purchase.failed'),
        description: error.message || t('nfts.purchase.failedDesc'),
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
      fetchMyPurchases(),
      fetchDirectBCCBalance()
    ]).finally(() => setLoading(false));
  }, [fetchAdvertisementNFTs, fetchMerchantNFTs, fetchMyPurchases, fetchDirectBCCBalance]);

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
              {t('nfts.title')}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {t('nfts.subtitle')}
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
                {((directBCCBalance !== null ? directBCCBalance : bccBalance?.transferable) || 0).toFixed(2)} BCC
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
                <span className="hidden sm:inline">{t('nfts.stats.advertisement')}</span>
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
                <span className="hidden sm:inline">{t('nfts.stats.merchant')}</span>
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
                <h2 className="text-2xl font-bold text-blue-400">{t('nfts.advertisement.title')}</h2>
                <p className="text-muted-foreground">{t('nfts.advertisement.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advertisementNFTs.map((nft) => (
                <Card key={nft.id} className="group hover:shadow-lg transition-all duration-200 border-blue-500/20 hover:border-blue-500/40">
                  <CardHeader className="pb-3">
                    <img 
                      src={nft.image_url || '/placeholder-nft.jpg'} 
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <Badge className="w-fit bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <HybridTranslation
                        content={{
                          text: nft.category,
                          language: nft.language_code || nft.language,
                          translations: nft.translations ? Object.fromEntries(
                            Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.category || nft.category])
                          ) : {}
                        }}
                        autoTranslate={true}
                        contentStyle="text-xs"
                      />
                    </Badge>
                    <CardTitle className="text-lg text-foreground">
                      <HybridTranslation
                        content={{
                          text: nft.title,
                          language: nft.language_code || nft.language,
                          translations: nft.translations ? Object.fromEntries(
                            Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.title || nft.title])
                          ) : {}
                        }}
                        autoTranslate={true}
                        contentStyle="text-lg font-semibold"
                        showTranslationSource={true}
                      />
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      <HybridTranslation
                        content={{
                          text: nft.description,
                          language: nft.language_code || nft.language,
                          translations: nft.translations ? Object.fromEntries(
                            Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.description || nft.description])
                          ) : {}
                        }}
                        autoTranslate={true}
                        contentStyle="text-sm text-muted-foreground"
                      />
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{nft.price_bcc || 0} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.price_usdt || 0} USDT</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-foreground">{(nft.impressions_current || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{t('nfts.advertisement.views')}</div>
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
                            {t('nfts.purchase.purchasing')}
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {t('nfts.purchase.button')}
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
                <h2 className="text-2xl font-bold text-purple-400">{t('nfts.merchant.title')}</h2>
                <p className="text-muted-foreground">{t('nfts.merchant.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchantNFTs.map((nft) => (
                <Card key={nft.id} className="group hover:shadow-lg transition-all duration-200 border-purple-500/20 hover:border-purple-500/40">
                  <CardHeader className="pb-3">
                    <img 
                      src={nft.image_url || '/placeholder-nft.jpg'} 
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {getTranslatedContent(nft, 'category')}
                      </Badge>
                      {nft.supply_total && (
                        <Badge variant="outline" className="text-xs">
                          {nft.supply_available}/{nft.supply_total} left
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg text-foreground">{getTranslatedContent(nft, 'title')}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      <HybridTranslation
                        content={{
                          text: nft.description,
                          language: nft.language_code || nft.language,
                          translations: nft.translations ? Object.fromEntries(
                            Object.entries(nft.translations).map(([lang, trans]) => [lang, trans.description || nft.description])
                          ) : {}
                        }}
                        autoTranslate={true}
                        contentStyle="text-sm text-muted-foreground"
                      />
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-400">{nft.price_bcc || 0} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.price_usdt || 0} USDT</div>
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
                          {t('nfts.purchase.purchasing')}
                        </>
                      ) : nft.supply_available !== null && nft.supply_available <= 0 ? (
                        t('nfts.merchant.soldOut')
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {t('nfts.purchase.button')} ({nft.price_bcc} BCC)
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
                <h2 className="text-2xl font-bold text-green-400">{t('nfts.myCollection.title')}</h2>
                <p className="text-muted-foreground">{t('nfts.myCollection.subtitle')}</p>
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
                        src={nft.image_url || '/placeholder-nft.jpg'} 
                        alt={nft.title}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <div className="flex items-center justify-between">
                        <Badge className={`${
                          isAdNFT 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {getTranslatedContent(nft, 'category')}
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Owned
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-foreground">{getTranslatedContent(nft, 'title')}</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{getTranslatedContent(nft, 'description')}</p>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}</div>
                        <div>Paid: {purchase.price_usdt || 0} USDT</div>
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
                <p className="text-muted-foreground mb-4">{t('nfts.myCollection.empty')}</p>
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