import {supabase} from '../supabase';

export interface Translation {
  id?: string;
  translation_key: string;
  language_code: string;
  translated_text: string;
  category?: string;
  context?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TranslationCache {
  [languageCode: string]: {
    [key: string]: string;
  };
}

class DynamicI18nService {
  private cache: TranslationCache = {};
  private lastUpdated: { [languageCode: string]: Date } = {};
  private loadingPromises: { [languageCode: string]: Promise<void> } = {};

  /**
   * 获取所有支持的语言
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('language_code')
        .group('language_code');

      if (error) throw error;

      return [...new Set(data?.map(item => item.language_code) || [])];
    } catch (error) {
      console.error('Error fetching supported languages:', error);
      return ['en', 'zh']; // 默认语言
    }
  }

  /**
   * 获取指定语言的所有翻译
   */
  async getTranslationsForLanguage(languageCode: string, forceReload = false): Promise<{ [key: string]: string }> {
    // 如果正在加载，等待加载完成
    if (this.loadingPromises[languageCode]) {
      await this.loadingPromises[languageCode];
      return this.cache[languageCode] || {};
    }

    // 如果已缓存且不需要强制重新加载，直接返回缓存
    if (this.cache[languageCode] && !forceReload) {
      return this.cache[languageCode];
    }

    // 开始加载翻译
    this.loadingPromises[languageCode] = this.loadTranslations(languageCode);
    await this.loadingPromises[languageCode];
    delete this.loadingPromises[languageCode];

    return this.cache[languageCode] || {};
  }

  /**
   * 获取单个翻译
   */
  async getTranslation(key: string, languageCode: string, fallbackLanguage = 'en'): Promise<string> {
    const translations = await this.getTranslationsForLanguage(languageCode);

    if (translations[key]) {
      return translations[key];
    }

    // 如果没找到，尝试使用fallback语言
    if (languageCode !== fallbackLanguage) {
      const fallbackTranslations = await this.getTranslationsForLanguage(fallbackLanguage);
      if (fallbackTranslations[key]) {
        console.warn(`Translation missing for '${key}' in '${languageCode}', using fallback: ${fallbackLanguage}`);
        return fallbackTranslations[key];
      }
    }

    // 如果都没找到，返回key本身
    console.warn(`Translation missing for key: '${key}' in language: '${languageCode}'`);
    return key;
  }

  /**
   * 批量获取翻译
   */
  async getTranslations(keys: string[], languageCode: string): Promise<{ [key: string]: string }> {
    const translations = await this.getTranslationsForLanguage(languageCode);
    const result: { [key: string]: string } = {};

    keys.forEach(key => {
      result[key] = translations[key] || key;
    });

    return result;
  }

  /**
   * 更新单个翻译
   */
  async updateTranslation(
    key: string,
    languageCode: string,
    translatedText: string,
    category?: string,
    context?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('app_translations')
        .upsert({
          translation_key: key,
          language_code: languageCode,
          translated_text: translatedText,
          category: category || 'general',
          context,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // 更新缓存
      if (!this.cache[languageCode]) {
        this.cache[languageCode] = {};
      }
      this.cache[languageCode][key] = translatedText;

      console.log(`✅ Translation updated: ${key} (${languageCode})`);
      return true;
    } catch (error) {
      console.error('Error updating translation:', error);
      return false;
    }
  }

  /**
   * 添加新的翻译键
   */
  async addTranslationKey(
    key: string,
    translations: { [languageCode: string]: string },
    category?: string,
    context?: string
  ): Promise<boolean> {
    try {
      const insertData = Object.entries(translations).map(([languageCode, translatedText]) => ({
        translation_key: key,
        language_code: languageCode,
        translated_text: translatedText,
        category: category || 'general',
        context,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('app_translations')
        .insert(insertData);

      if (error) throw error;

      // 更新缓存
      Object.entries(translations).forEach(([languageCode, translatedText]) => {
        if (!this.cache[languageCode]) {
          this.cache[languageCode] = {};
        }
        this.cache[languageCode][key] = translatedText;
      });

      console.log(`✅ Translation key added: ${key} for ${Object.keys(translations).length} languages`);
      return true;
    } catch (error) {
      console.error('Error adding translation key:', error);
      return false;
    }
  }

  /**
   * 删除翻译键
   */
  async deleteTranslationKey(key: string, languageCode?: string): Promise<boolean> {
    try {
      let query = supabase.from('app_translations').delete();

      if (languageCode) {
        query = query.eq('translation_key', key).eq('language_code', languageCode);
      } else {
        query = query.eq('translation_key', key);
      }

      const { error } = await query;

      if (error) throw error;

      // 更新缓存
      if (languageCode) {
        if (this.cache[languageCode]) {
          delete this.cache[languageCode][key];
        }
      } else {
        Object.keys(this.cache).forEach(lang => {
          if (this.cache[lang]) {
            delete this.cache[lang][key];
          }
        });
      }

      console.log(`✅ Translation key deleted: ${key}${languageCode ? ` (${languageCode})` : ' (all languages)'}`);
      return true;
    } catch (error) {
      console.error('Error deleting translation key:', error);
      return false;
    }
  }

  /**
   * 刷新指定语言的翻译缓存
   */
  async refreshTranslations(languageCode?: string): Promise<void> {
    if (languageCode) {
      delete this.cache[languageCode];
      delete this.lastUpdated[languageCode];
      await this.getTranslationsForLanguage(languageCode, true);
    } else {
      // 刷新所有语言
      const languages = await this.getSupportedLanguages();
      this.cache = {};
      this.lastUpdated = {};

      await Promise.all(
        languages.map(lang => this.getTranslationsForLanguage(lang, true))
      );
    }
  }

  /**
   * 获取翻译统计信息
   */
  async getTranslationStats(): Promise<{
    totalKeys: number;
    languages: {
      code: string;
      translationCount: number;
      completionRate: number;
    }[];
  }> {
    try {
      // 获取所有unique keys
      const { data: allKeys } = await supabase
        .from('app_translations')
        .select('translation_key')
        .group('translation_key');

      const totalKeys = allKeys?.length || 0;

      // 获取每种语言的翻译统计
      const { data: langStats } = await supabase
        .from('app_translations')
        .select('language_code')
        .not('translated_text', 'eq', '')
        .not('translated_text', 'is', null);

      const languageCount: { [lang: string]: number } = {};
      langStats?.forEach(item => {
        languageCount[item.language_code] = (languageCount[item.language_code] || 0) + 1;
      });

      const languages = Object.entries(languageCount).map(([code, count]) => ({
        code,
        translationCount: count,
        completionRate: totalKeys > 0 ? Math.round((count / totalKeys) * 100) : 0
      }));

      return { totalKeys, languages };
    } catch (error) {
      console.error('Error getting translation stats:', error);
      return { totalKeys: 0, languages: [] };
    }
  }

  /**
   * 清理缓存
   */
  clearCache(languageCode?: string): void {
    if (languageCode) {
      delete this.cache[languageCode];
      delete this.lastUpdated[languageCode];
    } else {
      this.cache = {};
      this.lastUpdated = {};
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheInfo(): {
    cachedLanguages: string[];
    lastUpdated: { [languageCode: string]: Date };
    cacheSize: { [languageCode: string]: number };
  } {
    return {
      cachedLanguages: Object.keys(this.cache),
      lastUpdated: { ...this.lastUpdated },
      cacheSize: Object.fromEntries(
        Object.entries(this.cache).map(([lang, translations]) => [
          lang,
          Object.keys(translations).length
        ])
      )
    };
  }

  /**
   * 从数据库加载翻译
   */
  private async loadTranslations(languageCode: string): Promise<void> {
    try {
      console.log(`🌐 Loading translations for language: ${languageCode}`);

      const { data, error } = await supabase
        .from('app_translations')
        .select('translation_key, translated_text')
        .eq('language_code', languageCode)
        .order('translation_key');

      if (error) throw error;

      // 构建翻译对象
      const translations: { [key: string]: string } = {};
      data?.forEach(item => {
        if (item.translated_text && item.translated_text.trim()) {
          translations[item.translation_key] = item.translated_text;
        }
      });

      // 更新缓存
      this.cache[languageCode] = translations;
      this.lastUpdated[languageCode] = new Date();

      console.log(`✅ Loaded ${Object.keys(translations).length} translations for ${languageCode}`);
    } catch (error) {
      console.error(`❌ Error loading translations for ${languageCode}:`, error);
      this.cache[languageCode] = {};
    }
  }
}

// 创建单例实例
export const dynamicI18nService = new DynamicI18nService();
export default dynamicI18nService;