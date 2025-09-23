// ===================================================================
// 多语言NFT API
// 支持Advertisement NFTs和Merchant NFTs的多语言内容
// ===================================================================

import { multilingualService } from '../../lib/services/multilingualService';

export interface NFTFilters {
  category?: string;
  is_active?: boolean;
  creator_wallet?: string;
  advertiser_wallet?: string;
  price_range?: {
    min_usdt?: number;
    max_usdt?: number;
    min_bcc?: number;
    max_bcc?: number;
  };
  limit?: number;
  offset?: number;
}

export const multilingualNFTsApi = {
  // ====================================================================
  // Advertisement NFTs 多语言API
  // ====================================================================

  async getAdvertisementNFTs(language: string = 'en', filters?: NFTFilters) {
    try {
      console.log(`🎯 多语言NFT API: 获取广告NFT列表 (${language})`);

      const nfts = await multilingualService.getAdvertisementNFTs(language, {
        category: filters?.category,
        is_active: filters?.is_active !== undefined ? filters.is_active : true,
        limit: filters?.limit || 20,
        offset: filters?.offset || 0
      });

      // 应用价格过滤
      let filteredNFTs = nfts;
      if (filters?.price_range) {
        filteredNFTs = nfts.filter(nft => {
          const priceRange = filters.price_range!;
          if (priceRange.min_usdt && nft.price_usdt < priceRange.min_usdt) return false;
          if (priceRange.max_usdt && nft.price_usdt > priceRange.max_usdt) return false;
          if (priceRange.min_bcc && nft.price_bcc < priceRange.min_bcc) return false;
          if (priceRange.max_bcc && nft.price_bcc > priceRange.max_bcc) return false;
          return true;
        });
      }

      // 转换为前端期望的格式
      const formattedNFTs = filteredNFTs.map(nft => ({
        id: nft.id,
        title: nft.title,
        description: nft.description,
        imageUrl: nft.image_url,
        priceUSDT: Number(nft.price_usdt),
        priceBCC: Number(nft.price_bcc),
        category: nft.category,
        advertiserWallet: nft.advertiser_wallet,
        clickUrl: nft.click_url,
        impressionsTarget: nft.impressions_target,
        impressionsCurrent: nft.impressions_current,
        isActive: nft.is_active,
        startsAt: nft.starts_at,
        endsAt: nft.ends_at,
        metadata: nft.metadata,
        language: nft.language,
        availableLanguages: nft.available_languages,
        createdAt: nft.created_at,
        type: 'advertisement'
      }));

      console.log(`✅ 多语言NFT API: 返回 ${formattedNFTs.length} 个广告NFT`);
      return formattedNFTs;
    } catch (error) {
      console.error('多语言NFT API: 获取广告NFT失败:', error);
      return [];
    }
  },

  async getAdvertisementNFT(id: string, language: string = 'en') {
    try {
      console.log(`🎯 多语言NFT API: 获取广告NFT详情 ${id} (${language})`);

      const nft = await multilingualService.getAdvertisementNFT(id, language);
      
      if (!nft) return null;

      // 转换为前端期望的格式
      return {
        id: nft.id,
        title: nft.title,
        description: nft.description,
        imageUrl: nft.image_url,
        priceUSDT: Number(nft.price_usdt),
        priceBCC: Number(nft.price_bcc),
        category: nft.category,
        advertiserWallet: nft.advertiser_wallet,
        clickUrl: nft.click_url,
        isActive: nft.is_active,
        metadata: nft.metadata,
        language: nft.language_code,
        createdAt: nft.created_at,
        type: 'advertisement'
      };
    } catch (error) {
      console.error('多语言NFT API: 获取广告NFT详情失败:', error);
      return null;
    }
  },

  // ====================================================================
  // Merchant NFTs 多语言API
  // ====================================================================

  async getMerchantNFTs(language: string = 'en', filters?: NFTFilters) {
    try {
      console.log(`🏪 多语言NFT API: 获取商家NFT列表 (${language})`);

      const nfts = await multilingualService.getMerchantNFTs(language, {
        category: filters?.category,
        is_active: filters?.is_active !== undefined ? filters.is_active : true,
        creator_wallet: filters?.creator_wallet,
        limit: filters?.limit || 20,
        offset: filters?.offset || 0
      });

      // 应用价格过滤
      let filteredNFTs = nfts;
      if (filters?.price_range) {
        filteredNFTs = nfts.filter(nft => {
          const priceRange = filters.price_range!;
          if (priceRange.min_usdt && nft.price_usdt < priceRange.min_usdt) return false;
          if (priceRange.max_usdt && nft.price_usdt > priceRange.max_usdt) return false;
          if (priceRange.min_bcc && nft.price_bcc < priceRange.min_bcc) return false;
          if (priceRange.max_bcc && nft.price_bcc > priceRange.max_bcc) return false;
          return true;
        });
      }

      // 转换为前端期望的格式
      const formattedNFTs = filteredNFTs.map(nft => ({
        id: nft.id,
        title: nft.title,
        description: nft.description,
        imageUrl: nft.image_url,
        priceUSDT: Number(nft.price_usdt),
        priceBCC: Number(nft.price_bcc),
        category: nft.category,
        supplyTotal: nft.supply_total,
        supplyAvailable: nft.supply_available,
        creatorWallet: nft.creator_wallet,
        isActive: nft.is_active,
        metadata: nft.metadata,
        language: nft.language,
        availableLanguages: nft.available_languages,
        createdAt: nft.created_at,
        type: 'merchant',
        // 计算销售状态
        soldOut: nft.supply_available === 0,
        soldPercentage: nft.supply_total > 0 ? ((nft.supply_total - nft.supply_available) / nft.supply_total) * 100 : 0
      }));

      console.log(`✅ 多语言NFT API: 返回 ${formattedNFTs.length} 个商家NFT`);
      return formattedNFTs;
    } catch (error) {
      console.error('多语言NFT API: 获取商家NFT失败:', error);
      return [];
    }
  },

  async getMerchantNFT(id: string, language: string = 'en') {
    try {
      console.log(`🏪 多语言NFT API: 获取商家NFT详情 ${id} (${language})`);

      // 直接查询，因为我们还没有为Merchant NFT创建专门的函数
      const { data, error } = await multilingualService.supabase
        .from('merchant_nfts')
        .select(`
          *,
          merchant_nft_translations (
            language_code,
            title,
            description
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const translation = data.merchant_nft_translations?.find(t => t.language_code === language);

      return {
        id: data.id,
        title: translation?.title || data.title,
        description: translation?.description || data.description,
        imageUrl: data.image_url,
        priceUSDT: Number(data.price_usdt),
        priceBCC: Number(data.price_bcc),
        category: data.category,
        supplyTotal: data.supply_total,
        supplyAvailable: data.supply_available,
        creatorWallet: data.creator_wallet,
        isActive: data.is_active,
        metadata: data.metadata,
        language: language,
        availableLanguages: data.merchant_nft_translations?.map(t => t.language_code) || ['en'],
        createdAt: data.created_at,
        type: 'merchant',
        soldOut: data.supply_available === 0,
        soldPercentage: data.supply_total > 0 ? ((data.supply_total - data.supply_available) / data.supply_total) * 100 : 0
      };
    } catch (error) {
      console.error('多语言NFT API: 获取商家NFT详情失败:', error);
      return null;
    }
  },

  // ====================================================================
  // 统一NFT搜索API
  // ====================================================================

  async getAllNFTs(language: string = 'en', filters?: NFTFilters & {
    nft_types?: ('advertisement' | 'merchant')[];
    search_query?: string;
  }) {
    try {
      console.log(`🔍 多语言NFT API: 获取所有NFT (${language})`);

      const promises = [];
      const nftTypes = filters?.nft_types || ['advertisement', 'merchant'];

      // 并行获取不同类型的NFT
      if (nftTypes.includes('advertisement')) {
        promises.push(this.getAdvertisementNFTs(language, filters));
      }
      if (nftTypes.includes('merchant')) {
        promises.push(this.getMerchantNFTs(language, filters));
      }

      const results = await Promise.all(promises);
      let allNFTs = results.flat();

      // 应用搜索查询
      if (filters?.search_query) {
        const query = filters.search_query.toLowerCase();
        allNFTs = allNFTs.filter(nft =>
          nft.title.toLowerCase().includes(query) ||
          nft.description.toLowerCase().includes(query) ||
          nft.category.toLowerCase().includes(query)
        );
      }

      // 排序（按创建时间降序）
      allNFTs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // 应用分页
      const start = filters?.offset || 0;
      const end = start + (filters?.limit || 20);
      const paginatedNFTs = allNFTs.slice(start, end);

      console.log(`✅ 多语言NFT API: 返回 ${paginatedNFTs.length} 个NFT (总共 ${allNFTs.length})`);
      return {
        nfts: paginatedNFTs,
        total: allNFTs.length,
        hasMore: end < allNFTs.length
      };
    } catch (error) {
      console.error('多语言NFT API: 获取所有NFT失败:', error);
      return { nfts: [], total: 0, hasMore: false };
    }
  },

  // ====================================================================
  // NFT分类和统计API
  // ====================================================================

  async getNFTCategories(language: string = 'en') {
    try {
      console.log(`📊 多语言NFT API: 获取NFT分类 (${language})`);

      // 从两个表获取分类
      const [advCategories, merchantCategories] = await Promise.all([
        multilingualService.supabase
          .from('advertisement_nfts')
          .select('category')
          .eq('is_active', true),
        multilingualService.supabase
          .from('merchant_nfts')
          .select('category')
          .eq('is_active', true)
      ]);

      const allCategories = [
        ...(advCategories.data || []),
        ...(merchantCategories.data || [])
      ];

      // 统计分类使用次数
      const categoryCounts: Record<string, number> = {};
      allCategories.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });

      // 返回分类列表
      const categories = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          name: category,
          count,
          // 这里可以添加多语言分类名称的映射
          displayName: this.getCategoryDisplayName(category, language)
        }))
        .sort((a, b) => b.count - a.count);

      console.log(`✅ 多语言NFT API: 返回 ${categories.length} 个分类`);
      return categories;
    } catch (error) {
      console.error('多语言NFT API: 获取NFT分类失败:', error);
      return [];
    }
  },

  // 分类名称多语言映射
  getCategoryDisplayName(category: string, language: string): string {
    const translations: Record<string, Record<string, string>> = {
      'defi': {
        'en': 'DeFi',
        'zh': 'DeFi',
        'th': 'DeFi',
        'ms': 'DeFi',
        'ko': 'DeFi',
        'ja': 'DeFi'
      },
      'gaming': {
        'en': 'Gaming',
        'zh': '游戏',
        'th': 'เกม',
        'ms': 'Permainan',
        'ko': '게임',
        'ja': 'ゲーム'
      },
      'art': {
        'en': 'Art',
        'zh': '艺术',
        'th': 'ศิลปะ',
        'ms': 'Seni',
        'ko': '예술',
        'ja': 'アート'
      },
      'utility': {
        'en': 'Utility',
        'zh': '实用工具',
        'th': 'ยูทิลิตี้',
        'ms': 'Utiliti',
        'ko': '유틸리티',
        'ja': 'ユーティリティ'
      },
      'collectible': {
        'en': 'Collectible',
        'zh': '收藏品',
        'th': 'คอลเลกชัน',
        'ms': 'Koleksi',
        'ko': '수집품',
        'ja': 'コレクティブル'
      }
    };

    return translations[category]?.[language] || category;
  },

  async getNFTStats(language: string = 'en') {
    try {
      console.log(`📊 多语言NFT API: 获取NFT统计 (${language})`);

      const [advStats, merchantStats] = await Promise.all([
        multilingualService.supabase
          .from('advertisement_nfts')
          .select('id, is_active, price_bcc, price_usdt')
          .eq('is_active', true),
        multilingualService.supabase
          .from('merchant_nfts')
          .select('id, is_active, price_bcc, price_usdt, supply_total, supply_available')
          .eq('is_active', true)
      ]);

      const advData = advStats.data || [];
      const merchantData = merchantStats.data || [];

      const stats = {
        total_nfts: advData.length + merchantData.length,
        advertisement_nfts: advData.length,
        merchant_nfts: merchantData.length,
        total_value_bcc: [
          ...advData.map(n => Number(n.price_bcc)),
          ...merchantData.map(n => Number(n.price_bcc))
        ].reduce((sum, price) => sum + price, 0),
        total_value_usdt: [
          ...advData.map(n => Number(n.price_usdt)),
          ...merchantData.map(n => Number(n.price_usdt))
        ].reduce((sum, price) => sum + price, 0),
        merchant_nfts_sold: merchantData.reduce((sum, nft) => 
          sum + (nft.supply_total - nft.supply_available), 0
        ),
        merchant_nfts_available: merchantData.reduce((sum, nft) => 
          sum + nft.supply_available, 0
        )
      };

      console.log(`✅ 多语言NFT API: 返回统计数据`, stats);
      return stats;
    } catch (error) {
      console.error('多语言NFT API: 获取NFT统计失败:', error);
      return {
        total_nfts: 0,
        advertisement_nfts: 0,
        merchant_nfts: 0,
        total_value_bcc: 0,
        total_value_usdt: 0,
        merchant_nfts_sold: 0,
        merchant_nfts_available: 0
      };
    }
  },

  // ====================================================================
  // 语言管理API
  // ====================================================================

  async getSupportedLanguages() {
    try {
      return await multilingualService.getSupportedLanguages();
    } catch (error) {
      console.error('多语言NFT API: 获取支持语言失败:', error);
      return [];
    }
  },

  // 为NFT添加翻译
  async addNFTTranslation(
    nftType: 'advertisement' | 'merchant',
    nftId: string,
    languageCode: string,
    translations: {
      title: string;
      description: string;
      click_url?: string; // 仅对advertisement NFT有效
    }
  ) {
    try {
      const tableName = nftType === 'advertisement' 
        ? 'advertisement_nft_translations'
        : 'merchant_nft_translations';

      const translationData = {
        title: translations.title,
        description: translations.description,
        ...(nftType === 'advertisement' && translations.click_url && {
          click_url: translations.click_url
        })
      };

      return await multilingualService.upsertTranslation(
        tableName,
        nftId,
        languageCode,
        translationData
      );
    } catch (error) {
      console.error('多语言NFT API: 添加翻译失败:', error);
      throw error;
    }
  }
};