import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {dynamicI18nService} from '../lib/services/dynamicI18nService';

type Language = 'en' | 'zh' | 'zh-tw' | 'th' | 'ms' | 'ko' | 'ja';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  languages: { code: string; name: string }[];
  isLoading: boolean;
  refreshTranslations: (languageCode?: string) => Promise<void>;
  addTranslation: (key: string, translations: { [languageCode: string]: string }, category?: string) => Promise<boolean>;
  updateTranslation: (key: string, languageCode: string, translatedText: string, category?: string) => Promise<boolean>;
  deleteTranslation: (key: string, languageCode?: string) => Promise<boolean>;
  supportedLanguages: string[];
  translationStats: {
    totalKeys: number;
    languages: { code: string; translationCount: number; completionRate: number; }[];
  } | null;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const defaultLanguageOptions = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文简体' },
  { code: 'zh-tw', name: '中文繁體' },
  { code: 'th', name: 'ไทย' },
  { code: 'ms', name: 'Bahasa Malaysia' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
];

const EnhancedI18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en', 'zh']);
  const [languages, setLanguages] = useState(defaultLanguageOptions);
  const [translationStats, setTranslationStats] = useState<{
    totalKeys: number;
    languages: { code: string; translationCount: number; completionRate: number; }[];
  } | null>(null);

  // Initialize supported languages and stats
  const initializeLanguages = useCallback(async () => {
    try {
      const supportedLangs = await dynamicI18nService.getSupportedLanguages();
      setSupportedLanguages(supportedLangs);

      // Update language options to include all supported languages
      const updatedLanguages = [
        ...defaultLanguageOptions,
        ...supportedLangs
          .filter(code => !defaultLanguageOptions.some(lang => lang.code === code))
          .map(code => ({ 
            code, 
            name: getLanguageName(code) 
          }))
      ];
      setLanguages(updatedLanguages);

      // Get translation stats
      const stats = await dynamicI18nService.getTranslationStats();
      setTranslationStats(stats);

      console.log('🌐 Initialized languages:', supportedLangs);
      console.log('📊 Translation stats:', stats);
    } catch (error) {
      console.error('Failed to initialize languages:', error);
    }
  }, []);

  // Initialize language from localStorage and load translations
  useEffect(() => {
    const initializeI18n = async () => {
      setIsLoading(true);

      // Initialize supported languages first
      await initializeLanguages();

      // Get saved language from localStorage
      const savedLanguage = localStorage.getItem('beehive-language');
      const validLanguage = savedLanguage && supportedLanguages.includes(savedLanguage) 
        ? savedLanguage as Language 
        : 'en';
      
      setLanguageState(validLanguage);
      localStorage.setItem('beehive-language', validLanguage);

      // Preload translations for current language
      try {
        await dynamicI18nService.getTranslationsForLanguage(validLanguage);
        console.log(`✅ Preloaded translations for ${validLanguage}`);
      } catch (error) {
        console.error('Failed to preload translations:', error);
      }

      setIsLoading(false);
    };

    initializeI18n();
  }, [initializeLanguages, supportedLanguages]);

  const setLanguage = useCallback(async (lang: Language) => {
    if (!supportedLanguages.includes(lang)) {
      console.warn(`Language ${lang} is not supported`);
      return;
    }

    setIsLoading(true);
    
    try {
      // Preload translations for the new language
      await dynamicI18nService.getTranslationsForLanguage(lang);
      setLanguageState(lang);
      localStorage.setItem('beehive-language', lang);
      console.log(`🌐 Language changed to: ${lang}`);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supportedLanguages]);

  const t = useCallback((key: string, interpolations?: Record<string, string | number>): string => {
    if (isLoading) {
      return key; // Return key while loading
    }

    try {
      // Get cached translation synchronously (it should be preloaded)
      const translations = dynamicI18nService['cache'][language] || {};
      let result = translations[key];

      // Fallback to English if not found in current language
      if (!result && language !== 'en') {
        const enTranslations = dynamicI18nService['cache']['en'] || {};
        result = enTranslations[key];
        
        if (result) {
          console.warn(`Translation missing for '${key}' in '${language}', using English fallback`);
        }
      }

      // If still not found, return the key
      if (!result) {
        console.warn(`Translation missing for key: '${key}' (language: ${language})`);
        return key;
      }

      // Handle interpolation
      if (interpolations && typeof result === 'string') {
        for (const [placeholder, replacement] of Object.entries(interpolations)) {
          // Handle multiple placeholder formats: {{placeholder}}, {placeholder}, ${{placeholder}}
          result = result.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\$\\{\\{${placeholder}\\}\\}`, 'g'), String(replacement));
        }
      }

      return result;
    } catch (error) {
      console.error('Translation error:', error, key);
      return key;
    }
  }, [language, isLoading]);

  const refreshTranslations = useCallback(async (languageCode?: string) => {
    setIsLoading(true);
    try {
      await dynamicI18nService.refreshTranslations(languageCode);
      
      // Refresh stats
      const stats = await dynamicI18nService.getTranslationStats();
      setTranslationStats(stats);
      
      console.log(`✅ Refreshed translations${languageCode ? ` for ${languageCode}` : ''}`);
    } catch (error) {
      console.error('Failed to refresh translations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTranslation = useCallback(async (
    key: string, 
    translations: { [languageCode: string]: string }, 
    category?: string
  ): Promise<boolean> => {
    try {
      const success = await dynamicI18nService.addTranslationKey(key, translations, category);
      
      if (success) {
        // Refresh stats
        const stats = await dynamicI18nService.getTranslationStats();
        setTranslationStats(stats);
        
        console.log(`✅ Added translation key: ${key}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add translation:', error);
      return false;
    }
  }, []);

  const updateTranslation = useCallback(async (
    key: string, 
    languageCode: string, 
    translatedText: string, 
    category?: string
  ): Promise<boolean> => {
    try {
      const success = await dynamicI18nService.updateTranslation(key, languageCode, translatedText, category);
      
      if (success) {
        console.log(`✅ Updated translation: ${key} (${languageCode})`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to update translation:', error);
      return false;
    }
  }, []);

  const deleteTranslation = useCallback(async (key: string, languageCode?: string): Promise<boolean> => {
    try {
      const success = await dynamicI18nService.deleteTranslationKey(key, languageCode);
      
      if (success) {
        // Refresh stats
        const stats = await dynamicI18nService.getTranslationStats();
        setTranslationStats(stats);
        
        console.log(`✅ Deleted translation: ${key}${languageCode ? ` (${languageCode})` : ' (all languages)'}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete translation:', error);
      return false;
    }
  }, []);

  const value = {
    language,
    setLanguage,
    t,
    languages,
    isLoading,
    refreshTranslations,
    addTranslation,
    updateTranslation,
    deleteTranslation,
    supportedLanguages,
    translationStats,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Helper function to get language display name
function getLanguageName(code: string): string {
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

const useEnhancedI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    console.warn('useEnhancedI18n hook called outside EnhancedI18nProvider, using fallback');
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => key,
      languages: defaultLanguageOptions,
      isLoading: false,
      refreshTranslations: async () => {},
      addTranslation: async () => false,
      updateTranslation: async () => false,
      deleteTranslation: async () => false,
      supportedLanguages: ['en'],
      translationStats: null,
    };
  }
  return context;
};

export { EnhancedI18nProvider, useEnhancedI18n };
export type { I18nContextType, Language };