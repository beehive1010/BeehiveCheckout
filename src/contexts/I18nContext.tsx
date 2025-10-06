import React, {createContext, useContext, useEffect, useState} from 'react';
import {hybridI18nService} from '../lib/services/hybridI18nService';

type Language = 'en' | 'zh' | 'zh-tw' | 'th' | 'ms' | 'ko' | 'ja';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  languages: { code: Language; name: string }[];
  useLocalOnly: boolean;
  setLocalOnlyMode: (localOnly: boolean) => void;
  refreshTranslations: () => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const languageOptions = [
  { code: 'en' as Language, name: 'English' },
  { code: 'zh' as Language, name: '中文简体' },
  { code: 'zh-tw' as Language, name: '中文繁體' },
  { code: 'th' as Language, name: 'ไทย' },
  { code: 'ms' as Language, name: 'Bahasa Malaysia' },
  { code: 'ko' as Language, name: '한국어' },
  { code: 'ja' as Language, name: '日本語' },
];

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(false);

  // Get supported languages from hybrid service
  const getSupportedLanguages = () => {
    return hybridI18nService.getSupportedLanguages();
  };

  // Load translations using hybrid strategy (local + database)
  const loadHybridTranslations = async (forceReload = false) => {
    if (useLocalOnly) {
      console.log('🌍 Using local-only translations mode');
      return;
    }

    setIsLoading(true);
    try {
      await hybridI18nService.getTranslationsForLanguage(language, forceReload);
      console.log(`🌍 Loaded hybrid translations for ${language}`);
    } catch (error) {
      console.error('Failed to load hybrid translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Force local-only mode (for admin manual control)
  const setLocalOnlyMode = (localOnly: boolean) => {
    setUseLocalOnly(localOnly);
    if (localOnly) {
      console.log('🌍 Switched to local-only translation mode');
    } else {
      console.log('🌍 Switched to hybrid translation mode');
      loadHybridTranslations(true);
    }
  };

  // Initialize language from localStorage
  useEffect(() => {
    const initializeTranslations = async () => {
      const saved = localStorage.getItem('beehive-language');
      const savedMode = localStorage.getItem('beehive-translation-mode');
      const supportedLanguages = getSupportedLanguages();
      
      let targetLanguage: Language;
      if (saved && supportedLanguages.includes(saved)) {
        targetLanguage = saved as Language;
      } else {
        localStorage.setItem('beehive-language', 'en');
        targetLanguage = 'en';
      }
      setLanguageState(targetLanguage);

      // Set translation mode preference
      const isLocalOnly = savedMode === 'local-only';
      setUseLocalOnly(isLocalOnly);
      
      // Always load translations for the target language, regardless of mode
      try {
        await hybridI18nService.getTranslationsForLanguage(targetLanguage);
        console.log(`🌍 Initialized translations for ${targetLanguage} (mode: ${isLocalOnly ? 'local-only' : 'hybrid'})`);
      } catch (error) {
        console.error('Failed to initialize translations:', error);
      }
      
      if (!isLocalOnly) {
        console.log('🌍 Starting in hybrid translation mode');
      } else {
        console.log('🌍 Starting in local-only translation mode');
      }
    };
    
    initializeTranslations();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('beehive-language', lang);

    // Load translations for new language if not in local-only mode
    if (!useLocalOnly) {
      setIsLoading(true);
      try {
        await hybridI18nService.getTranslationsForLanguage(lang, true);
        console.log(`🌍 Loaded hybrid translations for ${lang}`);
      } catch (error) {
        console.error('Failed to load hybrid translations:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const t = (key: string, interpolations?: Record<string, string | number>): string => {
    try {
      let result: string;

      // Always try to get translations from cache, even when loading
      // This prevents showing translation keys during language switch
      if (useLocalOnly) {
        // Local-only mode: directly access local translations from hybrid service
        const cacheInfo = hybridI18nService.getCacheInfo();
        const currentCache = cacheInfo.cacheStatus[language];

        if (currentCache) {
          // Use cached translations (which include local translations)
          const cachedTranslations = hybridI18nService['cache'][language]?.translations || {};
          result = cachedTranslations[key];

          // Fallback to English if available
          if (!result && language !== 'en') {
            const enCache = hybridI18nService['cache']['en']?.translations || {};
            result = enCache[key];
          }
        }
      } else {
        // Hybrid mode: get translations synchronously from cache
        const cachedTranslations = hybridI18nService['cache'][language]?.translations || {};
        result = cachedTranslations[key];

        // Fallback to English
        if (!result && language !== 'en') {
          const enTranslations = hybridI18nService['cache']['en']?.translations || {};
          result = enTranslations[key];
        }
      }
      
      if (!result) {
        console.warn(`Translation missing for key: ${key} (language: ${language}, mode: ${useLocalOnly ? 'local' : 'hybrid'})`);
        return key;
      }
      
      // Handle interpolation for both modes
      if (interpolations && typeof result === 'string') {
        for (const [placeholder, replacement] of Object.entries(interpolations)) {
          // Support multiple placeholder formats:
          // {{placeholder}}, {placeholder}, ${{placeholder}}
          result = result.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\$\\{\\{${placeholder}\\}\\}`, 'g'), String(replacement));
        }
      }
      
      return String(result);
    } catch (error) {
      console.error('Translation error:', error, key);
      return key;
    }
  };

  const refreshTranslations = async () => {
    if (!useLocalOnly) {
      await loadHybridTranslations(true);
    }
  };

  const value = {
    language,
    setLanguage,
    t,
    languages: languageOptions,
    useLocalOnly,
    setLocalOnlyMode,
    refreshTranslations,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    console.warn('useI18n hook called outside I18nProvider, using fallback');
    return {
      language: 'en' as Language,
      setLanguage: () => {
        console.warn('setLanguage called outside I18nProvider context');
      },
      t: (key: string, interpolations?: Record<string, string | number>): string => {
        console.warn(`Translation fallback used for key: ${key}`);
        return key;
      },
      languages: languageOptions,
      useLocalOnly: false,
      setLocalOnlyMode: () => {
        console.warn('setLocalOnlyMode called outside I18nProvider context');
      },
      refreshTranslations: async () => {
        console.warn('refreshTranslations called outside I18nProvider context');
      },
    };
  }
  return context;
};

export { I18nProvider };
export { useI18n };
