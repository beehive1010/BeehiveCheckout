import React, {useCallback, useEffect, useState} from 'react';
import {useI18n} from '../contexts/I18nContext';
import {useWallet} from '../hooks/useWallet';
import {useLocation} from 'wouter';
import {useMultilingualNFTs} from '../hooks/useMultilingualContent';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Badge} from '../components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../components/ui/tabs';
import {HybridTranslation} from '../components/shared/HybridTranslation';
import {useToast} from '../hooks/use-toast';
import {Eye, Loader2, Megaphone, Package, Palette, ShoppingCart, Star} from 'lucide-react';
import {orderService, supabase} from '../lib/supabaseClient';

// Stable Image component to prevent flickering
const StableImage = React.memo(({ src, alt, className, fallback }: {
  src: string | null;
  alt: string;
  className?: string;
  fallback: string;
}) => {
  const [imageSrc, setImageSrc] = useState(src || fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src && src !== imageSrc && !error) {
      setImageSrc(src);
    }
  }, [src, imageSrc, error]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className={`relative ${className || ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className || ''} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
});

interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  priceUSDT: number;
  priceBCC: number;
  category: string;
  advertiserWallet: string | null;
  clickUrl: string | null;
  impressionsTarget: number;
  impressionsCurrent: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  // 多语言支持
  language?: string;
  languageCode?: string;
  translations?: Record<string, { title?: string; description?: string; category?: string; }>;
  availableLanguages?: string[];
}

interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  priceUSDT: number;
  priceBCC: number;
  category: string;
  supplyTotal: number | null;
  supplyAvailable: number | null;
  isActive: boolean;
  creatorWallet: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  // 多语言支持
  language?: string;
  languageCode?: string;
  translations?: Record<string, { title?: string; description?: string; category?: string; }>;
  availableLanguages?: string[];
}

interface NFTPurchase {
  id: string;
  buyerWallet: string;
  nftId: string;
  nftType: string;
  paymentMethod: string;
  priceBCC: number | null;
  priceUSDT: number;
  purchasedAt: string;
  status: string;
  transactionHash: string | null;
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
          imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
          priceUSDT: 99.99,
          priceBCC: 150,
          category: 'defi',
          advertiserWallet: null,
          clickUrl: 'https://example.com',
          impressionsTarget: 10000,
          impressionsCurrent: 2345,
          isActive: true,
          startsAt: new Date().toISOString(),
          endsAt: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          availableLanguages: ['en', 'zh', 'ja']
        },
        {
          id: 'mock-2',
          title: 'Gaming NFT Collection',
          description: 'Exclusive gaming NFTs that unlock special abilities and rewards in our Web3 game ecosystem.',
          imageUrl: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400',
          priceUSDT: 49.99,
          priceBCC: 75,
          category: 'gaming',
          advertiserWallet: null,
          clickUrl: 'https://example.com/gaming',
          impressionsTarget: 5000,
          impressionsCurrent: 1234,
          isActive: true,
          startsAt: new Date().toISOString(),
          endsAt: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          availableLanguages: ['en', 'zh', 'ko']
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
          imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
          priceUSDT: 199.99,
          priceBCC: 300,
          category: 'development',
          supplyTotal: 10,
          supplyAvailable: 7,
          isActive: true,
          creatorWallet: null,
          metadata: { duration: '2-4 weeks', includes: ['Frontend', 'Backend', 'Database'] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          availableLanguages: ['en', 'zh', 'th']
        },
        {
          id: 'merchant-2',
          title: 'Digital Marketing Consultation',
          description: 'Strategic digital marketing consultation to boost your Web3 project visibility and growth.',
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
          priceUSDT: 149.99,
          priceBCC: 225,
          category: 'consulting',
          supplyTotal: 5,
          supplyAvailable: 3,
          isActive: true,
          creatorWallet: null,
          metadata: { duration: '1-2 weeks', includes: ['Strategy', 'Campaign', 'Analytics'] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          availableLanguages: ['en', 'zh', 'ms']
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

    // Check BCC balance with multiple fallback methods
    let currentBCC = 0;
    
    console.log('💰 Balance check - Direct BCC:', directBCCBalance, 'Wallet BCC:', bccBalance?.transferable);
    
    // Priority 1: Use direct balance if available and greater than 0
    if (directBCCBalance !== null && directBCCBalance > 0) {
      currentBCC = directBCCBalance;
      console.log('✅ Using direct BCC balance:', currentBCC);
    }
    // Priority 2: Use wallet balance if available
    else if (bccBalance?.transferable && bccBalance.transferable > 0) {
      currentBCC = bccBalance.transferable;
      console.log('✅ Using wallet BCC balance:', currentBCC);
    }
    // Priority 3: Query database directly as final fallback
    else {
      try {
        console.log('🔄 Querying database directly for BCC balance...');
        const { data: balanceData, error } = await supabase
          .from('user_balances')
          .select('bcc_balance')
          .eq('wallet_address', walletAddress)
          .single();
          
        if (error) {
          console.error('Database balance query error:', error);
        } else {
          currentBCC = balanceData?.bcc_balance || 0;
          console.log('✅ Database BCC balance:', currentBCC);
        }
      } catch (error) {
        console.error('Failed to get balance from database:', error);
      }
    }
    if (currentBCC < nft.priceBCC) {
      toast({
        title: t('nfts.purchase.insufficientBcc'),
        description: t('nfts.purchase.needBcc', { amount: nft.priceBCC, current: currentBCC }),
        variant: "destructive"
      });
      return;
    }

    // Validate amount before sending to API
    const purchaseAmount = Number(nft.priceBCC);
    if (!purchaseAmount || purchaseAmount <= 0 || isNaN(purchaseAmount)) {
      console.error('❌ Invalid purchase amount:', nft.priceBCC);
      toast({
        title: 'Invalid Amount',
        description: `Invalid NFT price: ${nft.priceBCC}`,
        variant: "destructive"
      });
      return;
    }

    console.log('🛒 Starting NFT purchase:', {
      nft_id: nft.id,
      nft_title: nft.title,
      price_bcc: purchaseAmount,
      wallet: walletAddress
    });

    setPurchaseState({ nftId: nft.id, loading: true, error: null });

    try {
      // Generate mock transaction hash
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Use balance edge function to spend BCC for NFT purchase
      const baseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const requestPayload = {
        action: 'spend-bcc',
        amount: purchaseAmount,
        purpose: 'nft_purchase',
        itemType: 'nft',
        itemId: nft.id,
        nftType: nftType
      };

      console.log('📤 Sending BCC spend request:', requestPayload);
      
      const spendResponse = await fetch(`${baseUrl}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify(requestPayload)
      });
      
      if (!spendResponse.ok) {
        const errorData = await spendResponse.json().catch(() => ({ error: 'Network error' }));
        console.error('❌ BCC spend API error:', errorData);
        throw new Error(errorData.error || `API request failed with status ${spendResponse.status}`);
      }

      const spendResult = await spendResponse.json();
      console.log('💰 BCC spend response:', spendResult);

      if (!spendResult?.success) {
        console.error('❌ BCC spend failed:', spendResult);
        throw new Error(spendResult?.error || spendResult?.message || 'BCC spending failed - insufficient balance or system error');
      }

      console.log(`✅ BCC spent successfully: ${purchaseAmount} BCC for NFT ${nft.title}`);

      // Create NFT purchase record using the orderService
      const { data: purchaseRecord, error: purchaseError } = await orderService.createNFTPurchase({
        buyer_wallet: walletAddress,
        nft_id: nft.id,
        nft_type: nftType,
        price_bcc: purchaseAmount,
        priceUSDT: nft.priceUSDT || 0,
        payment_method: 'bcc',
        transaction_hash: transactionHash,
        metadata: {
          nft_title: nft.title,
          category: nft.category || nftType,
          imageUrl: nft.imageUrl
        }
      });

      if (purchaseError) {
        console.error('❌ Error creating purchase record:', purchaseError);
        throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
      }
      
      console.log('✅ NFT purchase record created successfully:', purchaseRecord?.id);

      // Update supply for merchant NFTs
      if (nftType === 'merchant' && 'supply_available' in nft && nft.supplyAvailable && nft.supplyAvailable > 0) {
        const { error: supplyError } = await supabase
          .from('merchant_nfts')
          .update({ 
            supplyAvailable: Math.max(0, nft.supplyAvailable - 1),
            updatedAt: new Date().toISOString()
          })
          .eq('id', nft.id);

        if (supplyError) {
          console.error('Error updating NFT supply:', supplyError);
        }
      }

      toast({
        title: "🎉 " + t('nfts.purchase.success'),
        description: `${t('nfts.purchase.successDesc')} "${nft.title}" for ${nft.priceBCC} BCC`,
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

      {/* Loading.tsx State */}
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
                <Card key={nft.id} className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-blue-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-blue-500/20">
                  {/* Blue background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-400/15 to-blue-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  {/* Animated border glow */}
                  <div className="absolute inset-0 rounded-xl border-2 border-blue-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                  <CardHeader className="relative pb-3">
                    <StableImage
                      src={nft.imageUrl}
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                      fallback="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400"
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
                  
                  <CardContent className="relative space-y-4">
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
                        <div className="text-lg font-bold text-blue-400">{nft.priceBCC || 0} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.priceUSDT || 0} USDT</div>
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
                <Card key={nft.id} className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-purple-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-purple-500/20">
                  {/* Purple background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-400/15 to-purple-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  {/* Animated border glow */}
                  <div className="absolute inset-0 rounded-xl border-2 border-purple-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                  <CardHeader className="relative pb-3">
                    <StableImage
                      src={nft.imageUrl}
                      alt={nft.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                      fallback="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
                    />
                    <div className="flex items-center justify-between">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
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
                      {nft.supplyTotal && (
                        <Badge variant="outline" className="text-xs">
                          {nft.supplyAvailable}/{nft.supplyTotal} left
                        </Badge>
                      )}
                    </div>
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
                  
                  <CardContent className="relative space-y-4">
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
                        <div className="text-lg font-bold text-purple-400">{nft.priceBCC || 0} BCC</div>
                        <div className="text-xs text-muted-foreground">${nft.priceUSDT || 0} USDT</div>
                      </div>
                      {nft.supplyTotal && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-foreground">{nft.supplyAvailable || 0}</div>
                          <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => handlePurchaseNFT(nft, 'merchant')}
                      disabled={
                        purchaseState.loading && purchaseState.nftId === nft.id ||
                        (nft.supplyAvailable !== null && nft.supplyAvailable <= 0)
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white"
                    >
                      {purchaseState.loading && purchaseState.nftId === nft.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('nfts.purchase.purchasing')}
                        </>
                      ) : nft.supplyAvailable !== null && nft.supplyAvailable <= 0 ? (
                        t('nfts.merchant.soldOut')
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {t('nfts.purchase.button')} ({nft.priceBCC} BCC)
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
                  <Card key={purchase.id} className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-green-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-green-500/20">
                    {/* Green background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-400/15 to-green-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                    {/* Animated border glow */}
                    <div className="absolute inset-0 rounded-xl border-2 border-green-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                    <CardHeader className="relative pb-3">
                      <StableImage
                        src={nft.imageUrl}
                        alt={nft.title}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                        fallback="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"
                      />
                      <div className="flex items-center justify-between">
                        <Badge className={`${
                          isAdNFT 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
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
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Owned
                        </Badge>
                      </div>
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
                    
                    <CardContent className="relative space-y-4">
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