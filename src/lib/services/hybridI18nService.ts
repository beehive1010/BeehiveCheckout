import {supabase} from '../supabase';

// 导入本地翻译文件作为基础
import enTranslations from '../../translations/en.json';
import zhTranslations from '../../translations/zh.json';
import zhTwTranslations from '../../translations/zh-tw.json';
import thTranslations from '../../translations/th.json';
import msTranslations from '../../translations/ms.json';
import koTranslations from '../../translations/ko.json';
import jaTranslations from '../../translations/ja.json';

export interface Translation {
  translation_key: string;
  language_code: string;
  translated_text: string;
  category?: string;
  context?: string;
  updated_at?: string;
}

export interface TranslationCache {
  [languageCode: string]: {
    translations: { [key: string]: string };
    lastUpdated: Date;
    source: 'local' | 'database' | 'hybrid';
  };
}

// 扁平化嵌套翻译对象的辅助函数
const flattenTranslations = (obj: any, prefix = ''): { [key: string]: string } => {
  const flattened: { [key: string]: string } = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenTranslations(obj[key], newKey));
      } else {
        flattened[newKey] = String(obj[key]);
      }
    }
  }
  
  return flattened;
};

// 本地翻译文件（已扁平化）
const localTranslations: { [languageCode: string]: { [key: string]: string } } = {
  en: flattenTranslations(enTranslations),
  zh: flattenTranslations(zhTranslations),
  'zh-tw': flattenTranslations(zhTwTranslations),
  th: flattenTranslations(thTranslations),
  ms: flattenTranslations(msTranslations),
  ko: flattenTranslations(koTranslations),
  ja: flattenTranslations(jaTranslations)
};

class HybridI18nService {
  private cache: TranslationCache = {};
  private loadingPromises: { [languageCode: string]: Promise<void> } = {};
  private updateCheckInterval: { [languageCode: string]: NodeJS.Timeout } = {};
  
  // 配置选项
  private config = {
    // 缓存过期时间（毫秒）
    cacheExpiration: 30 * 60 * 1000, // 30分钟
    // 数据库更新检查间隔（毫秒）
    updateCheckInterval: 5 * 60 * 1000, // 5分钟
    // 是否启用自动更新检查
    enableAutoUpdate: true,
    // 是否优先使用本地翻译
    preferLocalTranslations: true,
    // 网络超时时间
    networkTimeout: 5000, // 5秒
  };

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[] {
    return Object.keys(localTranslations);
  }

  /**
   * 获取指定语言的翻译
   * 混合策略：本地翻译 + 数据库更新
   */
  async getTranslationsForLanguage(
    languageCode: string, 
    forceReload = false
  ): Promise<{ [key: string]: string }> {
    // 如果正在加载，等待加载完成
    if (this.loadingPromises[languageCode]) {
      await this.loadingPromises[languageCode];
      return this.getCachedTranslations(languageCode);
    }

    // 如果已缓存且未过期，直接返回
    if (!forceReload && this.isCacheValid(languageCode)) {
      return this.getCachedTranslations(languageCode);
    }

    // 开始混合加载
    this.loadingPromises[languageCode] = this.loadHybridTranslations(languageCode);
    await this.loadingPromises[languageCode];
    delete this.loadingPromises[languageCode];

    return this.getCachedTranslations(languageCode);
  }

  /**
   * 获取单个翻译
   */
  async getTranslation(
    key: string,
    languageCode: string,
    fallbackLanguage = 'en',
    interpolations?: { [key: string]: string | number }
  ): Promise<string> {
    const translations = await this.getTranslationsForLanguage(languageCode);

    let result = translations[key];

    // 如果没找到，尝试使用fallback语言
    if (!result && languageCode !== fallbackLanguage) {
      const fallbackTranslations = await this.getTranslationsForLanguage(fallbackLanguage);
      result = fallbackTranslations[key];

      if (result) {
        console.warn(`Translation missing for '${key}' in '${languageCode}', using fallback: ${fallbackLanguage}`);
      }
    }

    // 如果都没找到，返回key本身
    if (!result) {
      console.warn(`Translation missing for key: '${key}' in language: '${languageCode}'`);
      return key;
    }

    // 处理插值
    if (interpolations && typeof result === 'string') {
      for (const [placeholder, replacement] of Object.entries(interpolations)) {
        // 支持多种插值格式
        result = result.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), String(replacement));
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
        result = result.replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), String(replacement));
      }
    }

    return result;
  }

  /**
   * 批量获取翻译
   */
  async getBatchTranslations(
    keys: string[],
    languageCode: string
  ): Promise<{ [key: string]: string }> {
    const translations = await this.getTranslationsForLanguage(languageCode);
    const result: { [key: string]: string } = {};

    keys.forEach(key => {
      result[key] = translations[key] || key;
    });

    return result;
  }

  /**
   * 手动刷新翻译
   */
  async refreshTranslations(languageCode?: string): Promise<void> {
    if (languageCode) {
      delete this.cache[languageCode];
      await this.getTranslationsForLanguage(languageCode, true);
    } else {
      // 刷新所有语言
      this.cache = {};
      const languages = this.getSupportedLanguages();

      await Promise.all(
        languages.map(lang => this.getTranslationsForLanguage(lang, true))
      );
    }
  }

  /**
   * 更新本地缓存中的翻译
   */
  updateCachedTranslation(
    key: string,
    languageCode: string,
    translatedText: string
  ): void {
    if (this.cache[languageCode]) {
      this.cache[languageCode].translations[key] = translatedText;
      this.cache[languageCode].lastUpdated = new Date();
      console.log(`✅ Updated cached translation: ${key} (${languageCode})`);
    }
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo(): {
    cachedLanguages: string[];
    cacheStatus: {
      [languageCode: string]: {
        translationCount: number;
        lastUpdated: Date;
        source: 'local' | 'database' | 'hybrid';
        isValid: boolean;
      };
    };
    config: typeof this.config;
  } {
    const cacheStatus: { [languageCode: string]: any } = {};

    Object.entries(this.cache).forEach(([lang, data]) => {
      cacheStatus[lang] = {
        translationCount: Object.keys(data.translations).length,
        lastUpdated: data.lastUpdated,
        source: data.source,
        isValid: this.isCacheValid(lang)
      };
    });

    return {
      cachedLanguages: Object.keys(this.cache),
      cacheStatus,
      config: { ...this.config }
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated hybrid i18n config:', this.config);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清除所有定时器
    Object.values(this.updateCheckInterval).forEach(timer => {
      clearInterval(timer);
    });
    this.updateCheckInterval = {};

    // 清除缓存
    this.cache = {};
    this.loadingPromises = {};

    console.log('🧹 Cleaned up hybrid i18n service');
  }

  /**
   * 获取翻译统计信息
   */
  getTranslationStats(): {
    totalKeys: number;
    languages: {
      [languageCode: string]: {
        localKeys: number;
        cachedKeys: number;
        source: 'local' | 'database' | 'hybrid';
        completionRate: number;
      };
    };
  } {
    const allKeys = new Set<string>();

    // 收集所有本地翻译键
    Object.values(localTranslations).forEach(translations => {
      Object.keys(translations).forEach(key => allKeys.add(key));
    });

    // 收集所有缓存翻译键
    Object.values(this.cache).forEach(cached => {
      Object.keys(cached.translations).forEach(key => allKeys.add(key));
    });

    const totalKeys = allKeys.size;
    const languages: any = {};

    this.getSupportedLanguages().forEach(languageCode => {
      const localKeys = Object.keys(localTranslations[languageCode] || {}).length;
      const cachedData = this.cache[languageCode];
      const cachedKeys = cachedData ? Object.keys(cachedData.translations).length : 0;

      languages[languageCode] = {
        localKeys,
        cachedKeys: cachedKeys || localKeys,
        source: cachedData?.source || 'local',
        completionRate: totalKeys > 0 ? Math.round(((cachedKeys || localKeys) / totalKeys) * 100) : 0
      };
    });

    return {
      totalKeys,
      languages
    };
  }

  /**
   * 混合加载翻译：本地文件 + 数据库更新
   */
  private async loadHybridTranslations(languageCode: string): Promise<void> {
    console.log(`🌐 Loading hybrid translations for: ${languageCode}`);

    // 第一步：加载本地翻译作为基础
    const baseTranslations = localTranslations[languageCode] || {};
    console.log(`📁 Loaded ${Object.keys(baseTranslations).length} local translations for ${languageCode}`);

    // 第二步：尝试从数据库获取更新
    let databaseTranslations: { [key: string]: string } = {};
    let databaseLoadSuccess = false;

    try {
      const databaseData = await this.loadDatabaseTranslations(languageCode);
      databaseTranslations = databaseData;
      databaseLoadSuccess = true;
      console.log(`💾 Loaded ${Object.keys(databaseTranslations).length} database translations for ${languageCode}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load database translations for ${languageCode}:`, error);
      // 继续使用本地翻译，不抛出错误
    }

    // 第三步：合并翻译（数据库覆盖本地）
    const mergedTranslations = {
      ...baseTranslations, // 本地翻译作为基础
      ...databaseTranslations // 数据库翻译覆盖本地
    };

    // 第四步：更新缓存
    this.cache[languageCode] = {
      translations: mergedTranslations,
      lastUpdated: new Date(),
      source: databaseLoadSuccess ? 'hybrid' : 'local'
    };

    console.log(`✅ Cached ${Object.keys(mergedTranslations).length} hybrid translations for ${languageCode} (source: ${this.cache[languageCode].source})`);

    // 第五步：启动自动更新检查（如果启用）
    if (this.config.enableAutoUpdate && databaseLoadSuccess) {
      this.startAutoUpdateCheck(languageCode);
    }
  }

  /**
   * 从数据库加载翻译
   */
  private async loadDatabaseTranslations(languageCode: string): Promise<{ [key: string]: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.networkTimeout);

    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('translation_key, translated_text, updated_at')
        .eq('language_code', languageCode)
        .not('translated_text', 'eq', '')
        .not('translated_text', 'is', null)
        .order('translation_key')
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) throw error;

      const translations: { [key: string]: string } = {};
      data?.forEach(item => {
        if (item.translated_text && item.translated_text.trim()) {
          translations[item.translation_key] = item.translated_text;
        }
      });

      return translations;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(languageCode: string): boolean {
    const cached = this.cache[languageCode];
    if (!cached) return false;

    const now = new Date();
    const expired = now.getTime() - cached.lastUpdated.getTime() > this.config.cacheExpiration;

    return !expired;
  }

  /**
   * 获取缓存的翻译
   */
  private getCachedTranslations(languageCode: string): { [key: string]: string } {
    return this.cache[languageCode]?.translations || {};
  }

  /**
   * 启动自动更新检查
   */
  private startAutoUpdateCheck(languageCode: string): void {
    // 清除现有的定时器
    if (this.updateCheckInterval[languageCode]) {
      clearInterval(this.updateCheckInterval[languageCode]);
    }

    // 启动新的定时器
    this.updateCheckInterval[languageCode] = setInterval(async () => {
      try {
        await this.checkForUpdates(languageCode);
      } catch (error) {
        console.warn(`Failed to check updates for ${languageCode}:`, error);
      }
    }, this.config.updateCheckInterval);

    console.log(`🔄 Started auto-update check for ${languageCode}`);
  }

  /**
   * 检查数据库更新
   */
  private async checkForUpdates(languageCode: string): Promise<boolean> {
    const cached = this.cache[languageCode];
    if (!cached) return false;

    try {
      // 检查数据库中的最新更新时间
      const { data, error } = await supabase
        .from('app_translations')
        .select('updated_at')
        .eq('language_code', languageCode)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const latestUpdate = new Date(data[0].updated_at);

        // 如果数据库有更新的翻译，重新加载
        if (latestUpdate > cached.lastUpdated) {
          console.log(`🔄 Found updates for ${languageCode}, reloading...`);
          await this.loadHybridTranslations(languageCode);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn(`Failed to check for updates for ${languageCode}:`, error);
      return false;
    }
  }
}

// 创建单例实例
export const hybridI18nService = new HybridI18nService();
export default hybridI18nService;