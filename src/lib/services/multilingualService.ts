// ===================================================================
// 多语言数据库内容服务
// 为BEEHIVE平台提供统一的多语言内容管理
// ===================================================================

import { supabase } from '../supabase';

export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  flag_emoji?: string;
  is_active: boolean;
  is_default: boolean;
  rtl: boolean;
}

export interface MultilingualContent<T = Record<string, any>> {
  id: string;
  base_content: T;
  translations: Record<string, Partial<T>>;
  created_at: string;
  updated_at: string;
}

class MultilingualService {
  // 获取支持的语言列表
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    try {
      const { data, error } = await supabase
        .from('supported_languages')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取支持语言失败:', error);
      return [];
    }
  }

  // 获取默认语言
  async getDefaultLanguage(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('supported_languages')
        .select('code')
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data?.code || 'en';
    } catch (error) {
      console.error('获取默认语言失败:', error);
      return 'en';
    }
  }

  // ====================================================================
  // Advertisement NFTs 多语言服务
  // ====================================================================

  async getAdvertisementNFTs(language: string = 'en', filters?: {
    category?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      console.log(`🎯 获取广告NFT列表 (${language})`);

      let query = supabase
        .from('advertisement_nfts')
        .select('*');

      // 应用过滤器
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // 处理多语言内容 - advertisement_nfts表已经包含所有字段
      const processedData = data?.map(item => {
        // 检测内容的实际语言
        const titleIsChinese = /[\u4e00-\u9fff]/.test(item.title || '');
        const actualLanguage = titleIsChinese ? 'zh' : 'en';

        return {
          id: item.id,
          title: item.title || `NFT ${item.id.slice(0, 8)}`,
          description: item.description || 'No description available',
          image_url: item.image_url,
          price_usdt: item.price_usdt,
          price_bcc: item.price_bcc,
          category: item.category,
          advertiser_wallet: item.advertiser_wallet,
          click_url: item.click_url,
          impressions_target: item.impressions_target,
          impressions_current: item.impressions_current,
          is_active: item.is_active,
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          metadata: item.metadata,
          language: actualLanguage,
          available_languages: ['en', 'zh'],
          translations: {},  // 可以扩展支持实际的翻译表
          created_at: item.created_at
        };
      }) || [];

      console.log(`✅ 返回 ${processedData.length} 个广告NFT (包含图片URL)`);
      return processedData;
    } catch (error) {
      console.error('获取广告NFT失败:', error);
      return [];
    }
  }

  async getAdvertisementNFT(id: string, language: string = 'en') {
    try {
      console.log(`🎯 获取广告NFT详情: ${id} (${language})`);

      const { data, error } = await supabase
        .rpc('get_advertisement_nft_content', {
          p_nft_id: id,
          p_language_code: language
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('获取广告NFT详情失败:', error);
      return null;
    }
  }

  // ====================================================================
  // Merchant NFTs 多语言服务
  // ====================================================================

  async getMerchantNFTs(language: string = 'en', filters?: {
    category?: string;
    is_active?: boolean;
    creator_wallet?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      console.log(`🏪 获取商家NFT列表 (${language})`);

      let query = supabase
        .from('merchant_nfts')
        .select(`
          *,
          merchant_nft_translations (
            language_code,
            title,
            description
          )
        `);

      // 应用过滤器
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.creator_wallet) {
        query = query.eq('creator_wallet', filters.creator_wallet);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // 处理多语言内容
      const processedData = data?.map(item => {
        const translation = item.merchant_nft_translations?.find(t => t.language_code === language);
        const displayTitle = translation?.title || item.title;
        const displayDescription = translation?.description || item.description;

        // 检测内容的实际语言
        // 如果没有匹配的翻译，使用主表内容，并检测主表内容的语言
        const hasTranslation = !!translation;
        const titleIsChinese = /[\u4e00-\u9fff]/.test(displayTitle || '');
        const actualLanguage = hasTranslation ? language : (titleIsChinese ? 'zh' : 'en');

        // 构建translations对象供HybridTranslation使用
        const translations: Record<string, any> = {};
        item.merchant_nft_translations?.forEach(t => {
          translations[t.language_code] = {
            title: t.title,
            description: t.description
          };
        });

        return {
          id: item.id,
          title: displayTitle,
          description: displayDescription,
          image_url: item.image_url,
          price_usdt: item.price_usdt,
          price_bcc: item.price_bcc,
          category: item.category,
          supply_total: item.supply_total,
          supply_available: item.supply_available,
          creator_wallet: item.creator_wallet,
          is_active: item.is_active,
          metadata: item.metadata,
          language: actualLanguage,  // 使用实际语言
          available_languages: item.merchant_nft_translations?.map(t => t.language_code) || ['en'],
          translations: translations,  // 添加完整的translations对象
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      }) || [];

      console.log(`✅ 返回 ${processedData.length} 个商家NFT`);
      return processedData;
    } catch (error) {
      console.error('获取商家NFT失败:', error);
      return [];
    }
  }

  // ====================================================================
  // Blog Posts 多语言服务
  // ====================================================================

  async getBlogPosts(language: string = 'en', filters?: {
    published?: boolean;
    author_wallet?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }) {
    try {
      console.log(`📝 获取Blog文章列表 (${language})`);

      const { data, error } = await supabase
        .rpc('get_blog_post_content', {
          p_language_code: language
        });

      if (error) throw error;

      let processedData = data || [];

      // 应用过滤器
      if (filters?.published !== undefined) {
        processedData = processedData.filter(item => item.published === filters.published);
      }
      if (filters?.author_wallet) {
        processedData = processedData.filter(item => item.author_wallet === filters.author_wallet);
      }
      if (filters?.tags && filters.tags.length > 0) {
        processedData = processedData.filter(item => 
          filters.tags!.some(tag => 
            item.tags && Array.isArray(item.tags) && item.tags.includes(tag)
          )
        );
      }

      // 分页
      if (filters?.offset || filters?.limit) {
        const start = filters.offset || 0;
        const end = start + (filters.limit || 10);
        processedData = processedData.slice(start, end);
      }

      console.log(`✅ 返回 ${processedData.length} 篇Blog文章`);
      return processedData;
    } catch (error) {
      console.error('获取Blog文章失败:', error);
      return [];
    }
  }

  async getBlogPost(idOrSlug: string, language: string = 'en') {
    try {
      console.log(`📝 获取Blog文章详情: ${idOrSlug} (${language})`);

      // 判断是ID还是slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

      const { data, error } = await supabase
        .rpc('get_blog_post_content', {
          p_post_id: isUuid ? idOrSlug : null,
          p_slug: !isUuid ? idOrSlug : null,
          p_language_code: language
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('获取Blog文章详情失败:', error);
      return null;
    }
  }

  // ====================================================================
  // Courses 多语言服务 (增强版)
  // ====================================================================

  async getCoursesWithTranslations(language: string = 'en', userLevel?: number, filters?: {
    category?: string;
    difficulty_level?: string;
    course_type?: string;
    instructor_wallet?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      console.log(`📚 获取课程列表 (${language})`);

      let query = supabase
        .from('courses')
        .select(`
          *,
          course_translations (
            language_code,
            title,
            description
          )
        `);

      // 应用过滤器
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }
      if (filters?.course_type) {
        query = query.eq('course_type', filters.course_type);
      }
      if (filters?.instructor_wallet) {
        query = query.eq('instructor_wallet', filters.instructor_wallet);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (userLevel !== undefined) {
        query = query.lte('required_level', userLevel);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);
      }

      const { data, error } = await query
        .order('required_level', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 处理多语言内容
      const processedData = data?.map(item => {
        const translation = item.course_translations?.find(t => t.language_code === language);
        const canAccess = userLevel === undefined || item.required_level <= userLevel;

        return {
          id: item.id,
          title: translation?.title || item.title,
          description: translation?.description || item.description,
          image_url: item.image_url,
          price_usdt: item.price_usdt,
          price_bcc: item.price_bcc,
          category: item.category,
          difficulty_level: item.difficulty_level,
          duration_hours: item.duration_hours,
          instructor_name: item.instructor_name,
          instructor_wallet: item.instructor_wallet,
          is_active: item.is_active,
          required_level: item.required_level,
          course_type: item.course_type,
          metadata: item.metadata,
          language: language,
          available_languages: item.course_translations?.map(t => t.language_code) || ['en'],
          can_access: canAccess,
          level_locked: !canAccess,
          created_at: item.created_at
        };
      }) || [];

      console.log(`✅ 返回 ${processedData.length} 门课程`);
      return processedData;
    } catch (error) {
      console.error('获取课程列表失败:', error);
      return [];
    }
  }

  async getCourseWithTranslations(courseId: string, language: string = 'en') {
    try {
      console.log(`📚 获取课程详情: ${courseId} (${language})`);

      const { data, error } = await supabase
        .rpc('get_course_with_translations', {
          p_course_id: courseId,
          p_language_code: language
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('获取课程详情失败:', error);
      return null;
    }
  }

  // ====================================================================
  // 通用翻译管理方法
  // ====================================================================

  // 创建或更新翻译
  async upsertTranslation(
    table: string,
    entityId: string,
    languageCode: string,
    translations: Record<string, any>
  ) {
    try {
      console.log(`🔄 更新翻译: ${table}.${entityId} (${languageCode})`);

      const { data, error } = await supabase
        .from(table)
        .upsert({
          [`${table.replace('_translations', '')}_id`]: entityId,
          language_code: languageCode,
          ...translations,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      console.log(`✅ 翻译更新成功`);
      return data?.[0] || null;
    } catch (error) {
      console.error('更新翻译失败:', error);
      throw error;
    }
  }

  // 删除翻译
  async deleteTranslation(table: string, entityId: string, languageCode: string) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(`${table.replace('_translations', '')}_id`, entityId)
        .eq('language_code', languageCode);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('删除翻译失败:', error);
      throw error;
    }
  }

  // 获取实体的所有翻译
  async getEntityTranslations(table: string, entityId: string) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(`${table.replace('_translations', '')}_id`, entityId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取实体翻译失败:', error);
      return [];
    }
  }

  // 检查翻译完整性
  async checkTranslationCompleteness(table: string, entityId: string) {
    try {
      const [translations, languages] = await Promise.all([
        this.getEntityTranslations(table, entityId),
        this.getSupportedLanguages()
      ]);

      const translatedLanguages = translations.map(t => t.language_code);
      const missingLanguages = languages
        .filter(lang => lang.is_active && !translatedLanguages.includes(lang.code))
        .map(lang => lang.code);

      return {
        total_languages: languages.length,
        translated_languages: translatedLanguages.length,
        missing_languages: missingLanguages,
        completion_percentage: (translatedLanguages.length / languages.length) * 100
      };
    } catch (error) {
      console.error('检查翻译完整性失败:', error);
      return null;
    }
  }
}

// 导出单例实例
export const multilingualService = new MultilingualService();
export default multilingualService;