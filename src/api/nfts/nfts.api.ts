// NFT API functions - for advertisement and merchant NFTs
import { supabase } from '../../lib/supabase';

export interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  category: string;
  price_bcc: number;
  price_usdt: number;
  is_active: boolean;
  image_url: string | null;
  click_url: string | null;
  impressions_target: number | null;
  impressions_current: number | null;
  starts_at: string | null;
  ends_at: string | null;
  advertiser_wallet: string | null;
  metadata: any;
  created_at: string;
}

export interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  category: string;
  price_bcc: number;
  price_usdt: number;
  is_active: boolean;
  image_url: string | null;
  supply_total: number | null;
  supply_available: number | null;
  creator_wallet: string | null;
  metadata: any;
  created_at: string;
}

export interface NFTPurchase {
  id: string;
  buyer_wallet: string;
  nft_id: string;
  nft_type: 'advertisement' | 'merchant';
  price_paid_bcc: number;
  price_paid_usdt: number;
  transaction_hash: string | null;
  status: 'pending' | 'completed' | 'failed';
  purchased_at: string;
}

export const nftsApi = {
  // Get advertisement NFTs
  async getAdvertisementNFTs(language = 'en', category?: string) {
    try {
      console.log('📢 获取广告NFT列表...');
      
      let query = supabase
        .from('advertisement_nfts')
        .select(`
          id,
          title,
          description,
          category,
          price_bcc,
          price_usdt,
          is_active,
          image_url,
          click_url,
          impressions_target,
          impressions_current,
          starts_at,
          ends_at,
          advertiser_wallet,
          metadata,
          created_at,
          advertisement_nft_translations (
            language_code,
            title,
            description
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data: nfts, error } = await query;

      if (error) {
        console.error('获取广告NFT失败:', error);
        return [];
      }

      // Format data with translations
      const formattedNFTs = nfts?.map(nft => {
        const translation = nft.advertisement_nft_translations?.find(t => t.language_code === language);
        
        return {
          id: nft.id,
          title: translation?.title || nft.title,
          description: translation?.description || nft.description,
          category: nft.category,
          priceBCC: nft.price_bcc,
          priceUSDT: nft.price_usdt,
          imageUrl: nft.image_url,
          clickUrl: nft.click_url,
          impressionsTarget: nft.impressions_target,
          impressionsCurrent: nft.impressions_current,
          startsAt: nft.starts_at,
          endsAt: nft.ends_at,
          advertiserWallet: nft.advertiser_wallet,
          metadata: nft.metadata,
          createdAt: nft.created_at,
          type: 'advertisement' as const
        };
      }) || [];

      console.log(`✅ 返回 ${formattedNFTs.length} 个广告NFT`);
      return formattedNFTs;
    } catch (error) {
      console.error('获取广告NFT列表失败:', error);
      return [];
    }
  },

  // Get merchant NFTs
  async getMerchantNFTs(language = 'en', category?: string) {
    try {
      console.log('🏪 获取商户NFT列表...');
      
      let query = supabase
        .from('merchant_nfts')
        .select(`
          id,
          title,
          description,
          category,
          price_bcc,
          price_usdt,
          is_active,
          image_url,
          supply_total,
          supply_available,
          creator_wallet,
          metadata,
          created_at,
          merchant_nft_translations (
            language_code,
            title,
            description
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data: nfts, error } = await query;

      if (error) {
        console.error('获取商户NFT失败:', error);
        return [];
      }

      // Format data with translations
      const formattedNFTs = nfts?.map(nft => {
        const translation = nft.merchant_nft_translations?.find(t => t.language_code === language);
        
        return {
          id: nft.id,
          title: translation?.title || nft.title,
          description: translation?.description || nft.description,
          category: nft.category,
          priceBCC: nft.price_bcc,
          priceUSDT: nft.price_usdt,
          imageUrl: nft.image_url,
          supplyTotal: nft.supply_total,
          supplyAvailable: nft.supply_available,
          creatorWallet: nft.creator_wallet,
          metadata: nft.metadata,
          createdAt: nft.created_at,
          type: 'merchant' as const
        };
      }) || [];

      console.log(`✅ 返回 ${formattedNFTs.length} 个商户NFT`);
      return formattedNFTs;
    } catch (error) {
      console.error('获取商户NFT列表失败:', error);
      return [];
    }
  },

  // Purchase NFT with BCC
  async purchaseNFTWithBCC(nftId: string, nftType: 'advertisement' | 'merchant', walletAddress: string) {
    try {
      console.log(`💰 用户购买NFT: ${walletAddress} -> ${nftId} (${nftType})`);
      
      // Get NFT details to check price
      let nftData: any = null;
      if (nftType === 'advertisement') {
        const { data } = await supabase
          .from('advertisement_nfts')
          .select('id, title, price_bcc, is_active')
          .eq('id', nftId)
          .eq('is_active', true)
          .maybeSingle();
        nftData = data;
      } else {
        const { data } = await supabase
          .from('merchant_nfts')
          .select('id, title, price_bcc, is_active, supply_available')
          .eq('id', nftId)
          .eq('is_active', true)
          .maybeSingle();
        nftData = data;
      }

      if (!nftData) {
        throw new Error('NFT不存在或已下架');
      }

      // Check supply for merchant NFTs
      if (nftType === 'merchant' && nftData.supply_available !== null && nftData.supply_available <= 0) {
        throw new Error('NFT库存不足');
      }

      // Check if user already owns this NFT
      const { data: existingPurchase } = await supabase
        .from('nft_purchases')
        .select('id')
        .eq('buyer_wallet', walletAddress)
        .eq('nft_id', nftId)
        .eq('nft_type', nftType)
        .eq('status', 'completed')
        .maybeSingle();

      if (existingPurchase) {
        throw new Error('您已经拥有此NFT');
      }

      // Check user's BCC balance
      const { data: balance } = await supabase
        .from('user_balances')
        .select('bcc_balance')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (!balance || (balance.bcc_balance || 0) < nftData.price_bcc) {
        throw new Error(`BCC余额不足，需要 ${nftData.price_bcc} BCC，当前余额 ${balance?.bcc_balance || 0} BCC`);
      }

      // Use database function to purchase NFT (handles BCC deduction and purchase record)
      const { data: result, error } = await supabase.rpc('purchase_nft_with_bcc', {
        p_buyer_wallet: walletAddress,
        p_nft_id: nftId,
        p_nft_type: nftType,
        p_price_bcc: nftData.price_bcc
      });

      if (error) {
        throw new Error(`NFT购买失败: ${error.message}`);
      }

      console.log(`✅ NFT购买成功: ${nftData.title}`);

      return {
        success: true,
        message: `成功购买NFT: ${nftData.title}`,
        purchase: result,
        nftId: nftId,
        pricePaid: nftData.price_bcc
      };
    } catch (error) {
      console.error('购买NFT失败:', error);
      throw error;
    }
  },

  // Get user's NFT purchases
  async getUserNFTPurchases(walletAddress: string) {
    try {
      console.log(`📋 获取用户NFT购买记录: ${walletAddress}`);
      
      const { data: purchases, error } = await supabase
        .from('nft_purchases')
        .select(`
          id,
          nft_id,
          nft_type,
          price_paid_bcc,
          price_paid_usdt,
          status,
          purchased_at,
          transaction_hash
        `)
        .eq('buyer_wallet', walletAddress)
        .order('purchased_at', { ascending: false });

      if (error) {
        console.error('获取NFT购买记录失败:', error);
        return [];
      }

      console.log(`✅ 返回 ${purchases?.length || 0} 个NFT购买记录`);
      return purchases || [];
    } catch (error) {
      console.error('获取NFT购买记录失败:', error);
      return [];
    }
  },

  // Get NFT categories
  async getNFTCategories() {
    try {
      const [advCategories, merchantCategories] = await Promise.all([
        supabase
          .from('advertisement_nfts')
          .select('category')
          .eq('is_active', true)
          .then(({ data }) => data?.map(item => item.category) || []),
        supabase
          .from('merchant_nfts')
          .select('category')
          .eq('is_active', true)
          .then(({ data }) => data?.map(item => item.category) || [])
      ]);

      const allCategories = [...new Set([...advCategories, ...merchantCategories])];
      return allCategories;
    } catch (error) {
      console.error('获取NFT分类失败:', error);
      return [];
    }
  }
};