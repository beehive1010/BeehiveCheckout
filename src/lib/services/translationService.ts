// ===================================================================
// 自动翻译服务
// 支持多种翻译API提供商，为数据库内容提供实时翻译
// ===================================================================

import { supabase } from '../supabase';

export interface TranslationProvider {
  name: string;
  translate: (text: string, targetLanguage: string, sourceLanguage?: string) => Promise<string>;
  isAvailable: () => boolean;
  getSupportedLanguages: () => string[];
}

// Google Translate API 集成
class GoogleTranslateProvider implements TranslationProvider {
  name = 'Google Translate';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLanguage: string, sourceLanguage = 'auto'): Promise<string> {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
          format: 'text'
        })
      });

      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Google Translate API 错误:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getSupportedLanguages(): string[] {
    return ['en', 'zh', 'zh-tw', 'th', 'ms', 'ko', 'ja'];
  }
}

// DeepL API 集成 - 高质量翻译服务
class DeepLProvider implements TranslationProvider {
  name = 'DeepL';
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // 根据API密钥类型选择URL
    this.apiUrl = apiKey.endsWith(':fx') 
      ? 'https://api.deepl.com/v2/translate'  // 付费版
      : 'https://api-free.deepl.com/v2/translate'; // 免费版
  }

  async translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    try {
      // 特殊处理不支持的语言
      if (['th', 'ms'].includes(targetLanguage)) {
        return await this.handleUnsupportedLanguage(text, targetLanguage, sourceLanguage);
      }

      const targetLang = this.mapLanguageCode(targetLanguage);
      const sourceLang = sourceLanguage && sourceLanguage !== 'auto' ? this.mapLanguageCode(sourceLanguage) : undefined;

      const body = new URLSearchParams({
        text: text,
        target_lang: targetLang,
        formality: 'default', // 使用默认正式程度
        preserve_formatting: '1' // 保持格式
      });

      if (sourceLang) {
        body.append('source_lang', sourceLang);
      }

      console.log(`🌐 DeepL翻译: ${text.substring(0, 50)}... (${sourceLanguage || 'auto'} -> ${targetLanguage})`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepL API 错误 ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.translations || data.translations.length === 0) {
        throw new Error('DeepL返回的翻译结果为空');
      }

      const translatedText = data.translations[0].text;
      
      // 对于zh-tw，添加说明
      if (targetLanguage === 'zh-tw') {
        console.log(`⚠️ DeepL将繁体中文转换为简体中文: ${translatedText.substring(0, 50)}...`);
      } else {
        console.log(`✅ DeepL翻译成功: ${translatedText.substring(0, 50)}...`);
      }
      
      return translatedText;
    } catch (error) {
      console.error('DeepL API 错误:', error);
      throw error;
    }
  }

  // 处理DeepL不支持的语言
  private async handleUnsupportedLanguage(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    console.log(`⚠️ DeepL不支持 ${targetLanguage}，翻译为英语作为替代`);
    
    // 直接调用核心翻译方法，避免递归
    const targetLang = 'EN-US';
    const sourceLang = sourceLanguage && sourceLanguage !== 'auto' ? this.mapLanguageCode(sourceLanguage) : undefined;

    const body = new URLSearchParams({
      text: text,
      target_lang: targetLang,
      formality: 'default',
      preserve_formatting: '1'
    });

    if (sourceLang) {
      body.append('source_lang', sourceLang);
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepL API 错误 ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.translations || data.translations.length === 0) {
      throw new Error('DeepL返回的翻译结果为空');
    }

    const englishResult = data.translations[0].text;
    
    // 在结果前添加说明，表明这是英语替代
    const languageNames = {
      'th': 'ไทย',
      'ms': 'Bahasa Malaysia'
    };
    
    console.log(`📝 ${targetLanguage} -> 英语替代翻译完成`);
    return `[${languageNames[targetLanguage as keyof typeof languageNames] || targetLanguage}] ${englishResult}`;
  }

  private mapLanguageCode(code: string): string {
    // DeepL支持的语言代码映射
    const mapping: Record<string, string> = {
      'en': 'EN-US', // 美式英语
      'zh': 'ZH',    // 中文（简体）
      'zh-tw': 'ZH', // 中文繁体 -> 简体（DeepL将转换为简体）
      'ja': 'JA',    // 日语
      'ko': 'KO',    // 韩语  
      // 对于DeepL不支持的语言，我们尝试翻译到英语作为中间语言
      'th': 'EN-US', // 泰语 -> 英语（用户可理解）
      'ms': 'EN-US', // 马来语 -> 英语（用户可理解）
      'de': 'DE',    // 德语
      'fr': 'FR',    // 法语
      'es': 'ES',    // 西班牙语
      'it': 'IT',    // 意大利语
      'pt': 'PT-PT', // 葡萄牙语
      'ru': 'RU',    // 俄语
      'nl': 'NL',    // 荷兰语
      'pl': 'PL'     // 波兰语
    };
    return mapping[code] || 'EN-US';
  }

  // 检查DeepL是否原生支持该语言
  isLanguageNativelySupported(code: string): boolean {
    const nativeSupported = ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'nl', 'pl'];
    return nativeSupported.includes(code);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getSupportedLanguages(): string[] {
    // DeepL直接支持的语言
    return ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'nl', 'pl'];
  }

  // 获取API使用情况（可选功能）
  async getUsage(): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/translate', '/usage')}`, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('获取DeepL使用情况失败:', error);
    }
    return null;
  }
}

// LibreTranslate - 完全免费开源
class LibreTranslateProvider implements TranslationProvider {
  name = 'LibreTranslate';
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl = 'https://libretranslate.de/translate', apiKey?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLanguage: string, sourceLanguage = 'auto'): Promise<string> {
    try {
      const body: any = {
        q: text,
        source: sourceLanguage === 'auto' ? 'auto' : sourceLanguage,
        target: targetLanguage,
        format: 'text'
      };

      if (this.apiKey) {
        body.api_key = this.apiKey;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`LibreTranslate API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error('LibreTranslate API 错误:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return true; // LibreTranslate 完全免费
  }

  getSupportedLanguages(): string[] {
    return ['en', 'zh', 'th', 'ms', 'ko', 'ja'];
  }
}

// MyMemory - 免费1000次/天
class MyMemoryProvider implements TranslationProvider {
  name = 'MyMemory';
  private apiUrl = 'https://api.mymemory.translated.net/get';
  private email?: string;

  constructor(email?: string) {
    this.email = email; // 可选，提供email可获得更高限制
  }

  async translate(text: string, targetLanguage: string, sourceLanguage = 'auto'): Promise<string> {
    try {
      const params = new URLSearchParams({
        q: text,
        langpair: `${sourceLanguage}|${targetLanguage}`,
        ...(this.email && { de: this.email })
      });

      const response = await fetch(`${this.apiUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`MyMemory API 错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error(`MyMemory 翻译失败: ${data.responseDetails}`);
      }

      return data.responseData.translatedText;
    } catch (error) {
      console.error('MyMemory API 错误:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return true; // MyMemory 免费可用
  }

  getSupportedLanguages(): string[] {
    return ['en', 'zh', 'zh-tw', 'th', 'ms', 'ko', 'ja'];
  }
}

// Microsoft Translator - 200万字符/月免费
class MicrosoftTranslatorProvider implements TranslationProvider {
  name = 'Microsoft Translator';
  private apiKey: string;
  private region: string;

  constructor(apiKey: string, region = 'global') {
    this.apiKey = apiKey;
    this.region = region;
  }

  async translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    try {
      const body = [{
        text: text
      }];

      const params = new URLSearchParams({
        'api-version': '3.0',
        to: targetLanguage,
        ...(sourceLanguage && sourceLanguage !== 'auto' && { from: sourceLanguage })
      });

      const response = await fetch(`https://api.cognitive.microsofttranslator.com/translate?${params}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Microsoft Translator API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data[0].translations[0].text;
    } catch (error) {
      console.error('Microsoft Translator API 错误:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getSupportedLanguages(): string[] {
    return ['en', 'zh', 'zh-tw', 'th', 'ms', 'ko', 'ja'];
  }
}

// 翻译缓存接口
interface TranslationCache {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

// Supabase 翻译缓存实现
class SupabaseTranslationCache implements TranslationCache {
  async get(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('translation_cache')
        .select('translated_text, expires_at')
        .eq('cache_key', key)
        .maybeSingle();

      if (error || !data) return null;

      // 检查是否过期
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.delete(key);
        return null;
      }

      return data.translated_text;
    } catch (error) {
      console.error('缓存读取错误:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      
      await supabase
        .from('translation_cache')
        .upsert({
          cache_key: key,
          translated_text: value,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('缓存写入错误:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await supabase
        .from('translation_cache')
        .delete()
        .eq('cache_key', key);
    } catch (error) {
      console.error('缓存删除错误:', error);
    }
  }
}

// 主翻译服务类
class TranslationService {
  private providers: TranslationProvider[] = [];
  private cache: TranslationCache;
  private fallbackTexts: Record<string, Record<string, string>> = {};

  constructor() {
    this.cache = new SupabaseTranslationCache();
    this.setupProviders();
  }

  private setupProviders() {
    // 从环境变量获取DeepL API密钥
    const deepLApiKey = import.meta.env.VITE_DEEPL_API_KEY;
    
    // 只使用DeepL提供商
    if (deepLApiKey) {
      this.providers.push(new DeepLProvider(deepLApiKey));
      console.log('🚀 DeepL翻译服务已启用 (单一提供商模式)');
      console.log('✅ 支持语言: en, zh, zh-tw(→zh), ja, ko | 替代支持: th(→en), ms(→en)');
    } else {
      console.warn('⚠️ 未找到DeepL API密钥，翻译功能将不可用');
    }
    
    // 添加MyMemory作为纯粹的备选（如果DeepL完全失败）
    this.providers.push(new MyMemoryProvider());
    
    console.log(`🌐 翻译服务初始化完成，主要提供商: DeepL`);
  }

  private generateCacheKey(text: string, targetLanguage: string, sourceLanguage: string): string {
    const content = `${text}_${sourceLanguage}_${targetLanguage}`;
    // 使用 encodeURIComponent 而不是 btoa 来支持 Unicode 字符（如中文）
    try {
      // 方案1: 使用 btoa + unescape/encodeURIComponent 处理 Unicode
      const base64 = btoa(unescape(encodeURIComponent(content)));
      return base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
    } catch (e) {
      // 方案2: 如果 btoa 失败，使用简单的哈希
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36).substring(0, 64);
    }
  }

  // 智能选择最佳翻译提供商 (专门针对只有DeepL的情况)
  private selectBestProvider(targetLanguage: string, sourceLanguage: string): TranslationProvider | null {
    const availableProviders = this.providers.filter(p => p.isAvailable());

    if (availableProviders.length === 0) return null;

    // 优先选择DeepL（如果可用）
    const deeplProvider = availableProviders.find(p => p.name === 'DeepL');
    if (deeplProvider) {
      // 对于DeepL原生支持的语言，直接使用
      if (['en', 'zh', 'ja', 'ko'].includes(targetLanguage)) {
        console.log(`🎯 DeepL原生支持 ${targetLanguage}，使用DeepL`);
        return deeplProvider;
      }
      
      // 对于不支持的语言，仍然使用DeepL但会有特殊处理
      console.log(`⚠️ ${targetLanguage} 不被DeepL直接支持，将使用最接近的替代方案`);
      return deeplProvider;
    }

    // 如果没有DeepL，使用其他可用的提供商
    return availableProviders[0];
  }

  // 获取翻译，带缓存和失败回退
  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage = 'auto',
    options?: {
      useCache?: boolean;
      provider?: string;
      fallback?: string;
    }
  ): Promise<string> {
    if (!text || !text.trim()) return text;
    
    const useCache = options?.useCache !== false;
    const cacheKey = this.generateCacheKey(text, targetLanguage, sourceLanguage);

    // 1. 尝试从缓存获取
    if (useCache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          console.log(`📝 翻译缓存命中: ${text.substring(0, 50)}...`);
          return cached;
        }
      } catch (error) {
        console.warn('翻译缓存读取失败:', error);
      }
    }

    // 2. 智能选择最佳翻译提供商
    const bestProvider = this.selectBestProvider(targetLanguage, sourceLanguage);
    const sortedProviders = bestProvider ? [bestProvider, ...this.providers.filter(p => p !== bestProvider)] : this.providers;

    for (const provider of sortedProviders) {
      if (options?.provider && provider.name !== options.provider) {
        continue;
      }

      if (!provider.isAvailable() || !provider.getSupportedLanguages().includes(targetLanguage)) {
        continue;
      }

      try {
        console.log(`🌐 使用 ${provider.name} 翻译 (${sourceLanguage} -> ${targetLanguage}): ${text.substring(0, 50)}...`);
        const translated = await provider.translate(text, targetLanguage, sourceLanguage);
        
        // 缓存翻译结果
        if (useCache && translated) {
          await this.cache.set(cacheKey, translated);
        }
        
        return translated;
      } catch (error) {
        console.error(`${provider.name} 翻译失败:`, error);
        continue;
      }
    }

    // 3. 返回备选文本或原文
    console.warn(`所有翻译提供商都失败，返回原文: ${text.substring(0, 50)}...`);
    return options?.fallback || text;
  }

  // 批量翻译
  async translateBatch(
    texts: string[], 
    targetLanguage: string, 
    sourceLanguage = 'auto'
  ): Promise<string[]> {
    const results = await Promise.allSettled(
      texts.map(text => this.translateText(text, targetLanguage, sourceLanguage))
    );

    return results.map((result, index) => 
      result.status === 'fulfilled' ? result.value : texts[index]
    );
  }

  // 翻译数据库内容对象
  async translateContent<T extends Record<string, any>>(
    content: T,
    targetLanguage: string,
    translatableFields: (keyof T)[],
    sourceLanguage = 'auto'
  ): Promise<T> {
    const translated = { ...content };

    for (const field of translatableFields) {
      const value = content[field];
      if (typeof value === 'string' && value.trim()) {
        try {
          translated[field] = await this.translateText(
            value, 
            targetLanguage, 
            sourceLanguage
          ) as T[keyof T];
        } catch (error) {
          console.error(`翻译字段 ${String(field)} 失败:`, error);
          // 保持原文
        }
      }
    }

    return translated;
  }

  // 获取可用的翻译提供商
  getAvailableProviders(): string[] {
    return this.providers
      .filter(provider => provider.isAvailable())
      .map(provider => provider.name);
  }

  // 获取支持的语言
  getSupportedLanguages(): string[] {
    const allLanguages = new Set<string>();
    this.providers.forEach(provider => {
      provider.getSupportedLanguages().forEach(lang => allLanguages.add(lang));
    });
    return Array.from(allLanguages);
  }

  // 清理过期缓存
  async cleanupCache(): Promise<void> {
    try {
      await supabase
        .from('translation_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      console.log('✅ 翻译缓存清理完成');
    } catch (error) {
      console.error('翻译缓存清理失败:', error);
    }
  }
}

// 创建并导出翻译服务实例
export const translationService = new TranslationService();
export default translationService;

// 导出类型
export type { TranslationProvider, TranslationCache };