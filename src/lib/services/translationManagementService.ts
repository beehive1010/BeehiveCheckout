import {supabase} from '../supabase';

export interface TranslationManagementRequest {
  action: 'get_languages' | 'get_keys' | 'get_translations' | 'add_language' | 
          'add_key' | 'update_translation' | 'delete_translation' | 'bulk_translate' | 'sync_translations';
  language_code?: string;
  translation_key?: string;
  translated_text?: string;
  category?: string;
  context?: string;
  keys_to_translate?: string[];
  target_languages?: string[];
  source_language?: string;
}

export interface TranslationManagementResponse {
  success: boolean;
  data?: any;
  results?: any[];
  errors?: string[];
  error?: string;
  message?: string;
  summary?: string;
  synced?: string[];
}

class TranslationManagementService {
  private baseUrl = `${import.meta.env.VITE_API_BASE}/translation-management`;

  /**
   * 获取所有支持的语言
   */
  async getSupportedLanguages(): Promise<string[]> {
    const response = await this.makeRequest({ action: 'get_languages' });
    return response.success ? response.data || [] : [];
  }

  /**
   * 获取所有翻译键
   */
  async getTranslationKeys(category?: string): Promise<Array<{ translation_key: string; category: string }>> {
    const response = await this.makeRequest({
      action: 'get_keys',
      category
    });
    return response.success ? response.data || [] : [];
  }

  /**
   * 获取翻译数据
   */
  async getTranslations(filters?: {
    translation_key?: string;
    language_code?: string;
    category?: string;
  }): Promise<Array<{
    id: string;
    translation_key: string;
    language_code: string;
    translated_text: string;
    category: string;
    context: string | null;
    created_at: string;
    updated_at: string;
  }>> {
    const response = await this.makeRequest({
      action: 'get_translations',
      ...filters
    });
    return response.success ? response.data || [] : [];
  }

  /**
   * 添加新语言
   */
  async addLanguage(languageCode: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest({
      action: 'add_language',
      language_code: languageCode
    });
    return {
      success: response.success,
      message: response.message,
      error: response.error
    };
  }

  /**
   * 添加新的翻译键
   */
  async addTranslationKey(
    translationKey: string,
    category?: string,
    context?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest({
      action: 'add_key',
      translation_key: translationKey,
      category,
      context
    });
    return {
      success: response.success,
      message: response.message,
      error: response.error
    };
  }

  /**
   * 更新翻译
   */
  async updateTranslation(
    translationKey: string,
    languageCode: string,
    translatedText: string,
    category?: string,
    context?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest({
      action: 'update_translation',
      translation_key: translationKey,
      language_code: languageCode,
      translated_text: translatedText,
      category,
      context
    });
    return {
      success: response.success,
      message: response.message,
      error: response.error
    };
  }

  /**
   * 删除翻译
   */
  async deleteTranslation(
    translationKey?: string,
    languageCode?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest({
      action: 'delete_translation',
      translation_key: translationKey,
      language_code: languageCode
    });
    return {
      success: response.success,
      message: response.message,
      error: response.error
    };
  }

  /**
   * 批量翻译
   */
  async bulkTranslate(
    keysToTranslate: string[],
    targetLanguages: string[],
    sourceLanguage = 'en'
  ): Promise<{
    success: boolean;
    results?: Array<{ key: string; language: string; translated_text: string }>;
    errors?: string[];
    summary?: string;
  }> {
    const response = await this.makeRequest({
      action: 'bulk_translate',
      keys_to_translate: keysToTranslate,
      target_languages: targetLanguages,
      source_language: sourceLanguage
    });
    return {
      success: response.success,
      results: response.results,
      errors: response.errors,
      summary: response.summary
    };
  }

  /**
   * 同步翻译 - 确保所有key在所有语言中都有条目
   */
  async syncTranslations(): Promise<{
    success: boolean;
    message?: string;
    synced?: string[];
    error?: string;
  }> {
    const response = await this.makeRequest({ action: 'sync_translations' });
    return {
      success: response.success,
      message: response.message,
      synced: response.synced,
      error: response.error
    };
  }

  /**
   * 获取翻译统计信息
   */
  async getTranslationStatistics(): Promise<{
    totalKeys: number;
    totalTranslations: number;
    languages: Array<{
      code: string;
      name: string;
      totalTranslations: number;
      completionRate: number;
      emptyTranslations: number;
    }>;
    categories: Array<{
      name: string;
      keyCount: number;
      completionRate: number;
    }>;
  }> {
    try {
      // 获取所有翻译数据进行分析
      const [languages, translations, keys] = await Promise.all([
        this.getSupportedLanguages(),
        this.getTranslations(),
        this.getTranslationKeys()
      ]);

      const totalKeys = keys.length;
      const totalTranslations = translations.filter(t => t.translated_text && t.translated_text.trim()).length;

      // 按语言统计
      const languageStats = languages.map(langCode => {
        const langTranslations = translations.filter(t => t.language_code === langCode);
        const filledTranslations = langTranslations.filter(t => t.translated_text && t.translated_text.trim());
        const emptyTranslations = langTranslations.filter(t => !t.translated_text || !t.translated_text.trim());

        return {
          code: langCode,
          name: this.getLanguageName(langCode),
          totalTranslations: filledTranslations.length,
          completionRate: totalKeys > 0 ? Math.round((filledTranslations.length / totalKeys) * 100) : 0,
          emptyTranslations: emptyTranslations.length
        };
      });

      // 按类别统计
      const categoryMap = new Map<string, { keys: Set<string>; translations: number }>();

      keys.forEach(key => {
        const category = key.category || 'general';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { keys: new Set(), translations: 0 });
        }
        categoryMap.get(category)!.keys.add(key.translation_key);
      });

      translations.forEach(t => {
        if (t.translated_text && t.translated_text.trim()) {
          const category = t.category || 'general';
          if (categoryMap.has(category)) {
            categoryMap.get(category)!.translations++;
          }
        }
      });

      const categoryStats = Array.from(categoryMap.entries()).map(([name, data]) => {
        const keyCount = data.keys.size;
        const expectedTranslations = keyCount * languages.length;
        const completionRate = expectedTranslations > 0 ? Math.round((data.translations / expectedTranslations) * 100) : 0;

        return {
          name,
          keyCount,
          completionRate
        };
      });

      return {
        totalKeys,
        totalTranslations,
        languages: languageStats,
        categories: categoryStats
      };
    } catch (error) {
      console.error('Failed to get translation statistics:', error);
      return {
        totalKeys: 0,
        totalTranslations: 0,
        languages: [],
        categories: []
      };
    }
  }

  /**
   * 获取缺失翻译的报告
   */
  async getMissingTranslationsReport(): Promise<{
    missingByLanguage: Array<{
      languageCode: string;
      missingCount: number;
      missingKeys: string[];
    }>;
    missingByKey: Array<{
      translationKey: string;
      category: string;
      missingLanguages: string[];
    }>;
    totalMissing: number;
  }> {
    try {
      const [languages, translations, keys] = await Promise.all([
        this.getSupportedLanguages(),
        this.getTranslations(),
        this.getTranslationKeys()
      ]);

      // 创建完整的翻译矩阵
      const translationMatrix = new Map<string, Set<string>>();
      translations.forEach(t => {
        if (t.translated_text && t.translated_text.trim()) {
          const key = `${t.translation_key}:${t.language_code}`;
          if (!translationMatrix.has(t.translation_key)) {
            translationMatrix.set(t.translation_key, new Set());
          }
          translationMatrix.get(t.translation_key)!.add(t.language_code);
        }
      });

      // 按语言分析缺失
      const missingByLanguage = languages.map(langCode => {
        const missingKeys = keys.filter(key => {
          const availableLanguages = translationMatrix.get(key.translation_key) || new Set();
          return !availableLanguages.has(langCode);
        }).map(key => key.translation_key);

        return {
          languageCode: langCode,
          missingCount: missingKeys.length,
          missingKeys
        };
      });

      // 按键分析缺失
      const missingByKey = keys.map(keyData => {
        const availableLanguages = translationMatrix.get(keyData.translation_key) || new Set();
        const missingLanguages = languages.filter(lang => !availableLanguages.has(lang));

        return {
          translationKey: keyData.translation_key,
          category: keyData.category || 'general',
          missingLanguages
        };
      }).filter(item => item.missingLanguages.length > 0);

      const totalMissing = missingByLanguage.reduce((sum, item) => sum + item.missingCount, 0);

      return {
        missingByLanguage,
        missingByKey,
        totalMissing
      };
    } catch (error) {
      console.error('Failed to get missing translations report:', error);
      return {
        missingByLanguage: [],
        missingByKey: [],
        totalMissing: 0
      };
    }
  }

  /**
   * 导出翻译数据
   */
  async exportTranslations(
    languageCode?: string,
    category?: string
  ): Promise<{ [key: string]: any }> {
    const translations = await this.getTranslations({
      language_code: languageCode,
      category
    });

    const exported: { [key: string]: any } = {};

    translations.forEach(t => {
      if (t.translated_text && t.translated_text.trim()) {
        // 创建嵌套对象结构
        const keys = t.translation_key.split('.');
        let current = exported;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = t.translated_text;
      }
    });

    return exported;
  }

  /**
   * 导入翻译数据
   */
  async importTranslations(
    translationData: { [key: string]: any },
    languageCode: string,
    category = 'imported',
    overwriteExisting = false
  ): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
    const flattenedData = this.flattenTranslations(translationData);
    const results = { success: true, imported: 0, skipped: 0, errors: [] as string[] };

    for (const [key, value] of Object.entries(flattenedData)) {
      try {
        // 检查是否已存在
        if (!overwriteExisting) {
          const existing = await this.getTranslations({
            translation_key: key,
            language_code: languageCode
          });

          if (existing.length > 0 && existing[0].translated_text && existing[0].translated_text.trim()) {
            results.skipped++;
            continue;
          }
        }

        const updateResult = await this.updateTranslation(key, languageCode, String(value), category);
        if (updateResult.success) {
          results.imported++;
        } else {
          results.errors.push(`Failed to import ${key}: ${updateResult.error}`);
        }
      } catch (error) {
        results.errors.push(`Error importing ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  private async makeRequest(requestData: TranslationManagementRequest): Promise<TranslationManagementResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // 只在开发环境显示错误（生产环境静默失败）
      if (import.meta.env.DEV) {
        console.warn('Translation management request failed:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 扁平化嵌套翻译对象
   */
  private flattenTranslations(obj: any, prefix = ''): { [key: string]: string } {
    const flattened: { [key: string]: string } = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenTranslations(obj[key], newKey));
        } else {
          flattened[newKey] = String(obj[key]);
        }
      }
    }
    
    return flattened;
  }

  /**
   * 获取语言显示名称
   */
  private getLanguageName(code: string): string {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'zh': '中文简体',
      'zh-tw': '中文繁體',
      'th': 'ไทย',
      'ms': 'Bahasa Malaysia',
      'ko': '한국어',
      'ja': '日本語',
      'de': 'Deutsch',
      'fr': 'Français',
      'es': 'Español',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'nl': 'Nederlands',
      'pl': 'Polski'
    };
    
    return languageNames[code] || code.toUpperCase();
  }
}

// 创建单例实例
export const translationManagementService = new TranslationManagementService();
export default translationManagementService;