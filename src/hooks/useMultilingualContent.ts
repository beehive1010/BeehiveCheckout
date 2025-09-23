import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { translationService } from '../lib/services/translationService';
import { multilingualService } from '../lib/services/multilingualService';

export interface MultilingualContentItem {
  id: string;
  originalText: string;
  originalLanguage: string;
  translations: Record<string, string>;
  autoTranslated?: Record<string, string>;
}

export interface UseMultilingualContentOptions {
  enableAutoTranslation?: boolean;
  cacheTranslations?: boolean;
  fallbackToOriginal?: boolean;
  preferredTranslationFields?: string[];
}

export function useMultilingualContent<T extends Record<string, any>>(
  data: T[] | null,
  options: UseMultilingualContentOptions = {}
) {
  const { language: currentLanguage } = useI18n();
  const [translatedData, setTranslatedData] = useState<T[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [errors, setErrors] = useState<Error[]>([]);

  const {
    enableAutoTranslation = false,
    cacheTranslations = true,
    fallbackToOriginal = true,
    preferredTranslationFields = ['title', 'description', 'content', 'excerpt']
  } = options;

  // 翻译单个内容项
  const translateContentItem = useCallback(async (
    item: T,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<T> => {
    if (!enableAutoTranslation) return item;

    const translatedItem = { ...item };
    
    for (const field of preferredTranslationFields) {
      const value = item[field];
      
      // 只翻译字符串字段
      if (typeof value === 'string' && value.trim()) {
        try {
          const translatedValue = await translationService.translateText(
            value,
            targetLanguage,
            sourceLanguage,
            {
              useCache: cacheTranslations,
              fallback: fallbackToOriginal ? value : undefined
            }
          );
          
          translatedItem[field] = translatedValue;
        } catch (error) {
          console.error(`翻译字段 ${field} 失败:`, error);
          if (!fallbackToOriginal) {
            throw error;
          }
          // 如果启用回退，保持原值不变
        }
      }
    }

    return translatedItem;
  }, [enableAutoTranslation, preferredTranslationFields, cacheTranslations, fallbackToOriginal]);

  // 批量翻译内容
  const translateBatch = useCallback(async (
    items: T[],
    targetLanguage: string
  ): Promise<T[]> => {
    if (!enableAutoTranslation || !items.length) return items;

    setIsTranslating(true);
    setTranslationProgress(0);
    setErrors([]);

    const translatedItems: T[] = [];
    const batchErrors: Error[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const translatedItem = await translateContentItem(
          items[i],
          targetLanguage,
          items[i].language || 'en'
        );
        translatedItems.push(translatedItem);
      } catch (error) {
        batchErrors.push(error as Error);
        // 如果翻译失败，添加原始项目
        translatedItems.push(items[i]);
      }
      
      // 更新进度
      setTranslationProgress(((i + 1) / items.length) * 100);
    }

    setErrors(batchErrors);
    setIsTranslating(false);
    
    return translatedItems;
  }, [enableAutoTranslation, translateContentItem]);

  // 处理数据变化
  useEffect(() => {
    async function processData() {
      if (!data) {
        setTranslatedData([]);
        return;
      }

      // 如果当前语言是英语或未启用自动翻译，直接使用原数据
      if (currentLanguage === 'en' || !enableAutoTranslation) {
        setTranslatedData(data);
        return;
      }

      // 检查数据是否已经包含当前语言的翻译
      const hasTranslations = data.some(item => 
        preferredTranslationFields.some(field => 
          item[`${field}_${currentLanguage}`] || 
          (item.translations && item.translations[currentLanguage])
        )
      );

      // 如果已有翻译，处理并使用
      if (hasTranslations) {
        const processedData = data.map(item => {
          const processed = { ...item };
          
          // 查找并应用已有翻译
          for (const field of preferredTranslationFields) {
            const translatedField = `${field}_${currentLanguage}`;
            const translationValue = item[translatedField] || 
                                   (item.translations && item.translations[currentLanguage]?.[field]);
            
            if (translationValue) {
              processed[field] = translationValue;
            }
          }
          
          return processed;
        });
        
        setTranslatedData(processedData);
        return;
      }

      // 执行自动翻译
      try {
        const translated = await translateBatch(data, currentLanguage);
        setTranslatedData(translated);
      } catch (error) {
        console.error('批量翻译失败:', error);
        setTranslatedData(data); // 回退到原数据
      }
    }

    processData();
  }, [data, currentLanguage, enableAutoTranslation, preferredTranslationFields, translateBatch]);

  // 手动翻译特定项目
  const translateItem = useCallback(async (
    itemId: string,
    targetLanguage?: string
  ): Promise<void> => {
    const language = targetLanguage || currentLanguage;
    const item = translatedData.find(item => item.id === itemId);
    
    if (!item) return;

    try {
      setIsTranslating(true);
      const translated = await translateContentItem(item, language);
      
      setTranslatedData(prev => 
        prev.map(prevItem => 
          prevItem.id === itemId ? translated : prevItem
        )
      );
    } catch (error) {
      console.error('翻译项目失败:', error);
      setErrors(prev => [...prev, error as Error]);
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, translatedData, translateContentItem]);

  // 获取翻译统计
  const getTranslationStats = useCallback(() => {
    if (!data || !translatedData) return null;

    const totalItems = data.length;
    const translatedItems = translatedData.filter(item => 
      preferredTranslationFields.some(field => 
        item[field] !== data.find(original => original.id === item.id)?.[field]
      )
    ).length;

    return {
      total: totalItems,
      translated: translatedItems,
      percentage: totalItems > 0 ? (translatedItems / totalItems) * 100 : 0,
      errors: errors.length,
      isTranslating,
      progress: translationProgress
    };
  }, [data, translatedData, preferredTranslationFields, errors, isTranslating, translationProgress]);

  // 清除翻译缓存
  const clearTranslationCache = useCallback(async () => {
    try {
      await translationService.cleanupCache();
    } catch (error) {
      console.error('清除翻译缓存失败:', error);
    }
  }, []);

  return {
    translatedData,
    isTranslating,
    translationProgress,
    errors,
    translateItem,
    getTranslationStats: getTranslationStats(),
    clearTranslationCache
  };
}

// 专门用于NFT数据的钩子
export function useMultilingualNFTs(language: string = 'en') {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadNFTs() {
      try {
        setLoading(true);
        setError(null);

        // 使用多语言NFT API
        const { multilingualNFTsApi } = await import('../api/nfts/multilingual-nfts.api');
        const data = await multilingualNFTsApi.getAdvertisementNFTs(language);
        
        setNfts(data);
      } catch (err) {
        setError(err as Error);
        console.error('加载多语言NFT失败:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNFTs();
  }, [language]);

  return { nfts, loading, error };
}

// 专门用于博客数据的钩子
export function useMultilingualBlog(language: string = 'en') {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        setError(null);

        const { blogApi } = await import('../api/hiveworld/blog.api');
        const data = await blogApi.getBlogPosts(language);
        
        setPosts(data);
      } catch (err) {
        setError(err as Error);
        console.error('加载多语言博客失败:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [language]);

  return { posts, loading, error };
}

// 专门用于课程数据的钩子
export function useMultilingualCourses(language: string = 'en', userLevel?: number) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);

        const data = await multilingualService.getCoursesWithTranslations(language, userLevel);
        setCourses(data);
      } catch (err) {
        setError(err as Error);
        console.error('加载多语言课程失败:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [language, userLevel]);

  return { courses, loading, error };
}