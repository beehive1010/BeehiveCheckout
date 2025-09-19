import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
// Import JSON translations as fallback
import enTranslations from '../translations/en.json';
import zhTranslations from '../translations/zh.json';
import zhTwTranslations from '../translations/zh-tw.json';
import thTranslations from '../translations/th.json';
import msTranslations from '../translations/ms.json';
import koTranslations from '../translations/ko.json';
import jaTranslations from '../translations/ja.json';

type Language = 'en' | 'zh' | 'zh-tw' | 'th' | 'ms' | 'ko' | 'ja';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  languages: { code: Language; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const languageOptions = [
  { code: 'en' as Language, name: 'English' },
  { code: 'zh' as Language, name: '中文简体' },
  { code: 'zh-tw' as Language, name: '中文繁體' },
  { code: 'th' as Language, name: 'ไทย' },
  { code: 'ms' as Language, name: 'Malay' },
  { code: 'ko' as Language, name: '한국어' },
  { code: 'ja' as Language, name: '日本語' },
];

// Helper function to flatten nested JSON objects
const flattenTranslations = (obj: any, prefix = ''): Record<string, string> => {
  const flattened: Record<string, string> = {};
  
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

// JSON fallback translations (flattened)
const jsonTranslations: Record<Language, Record<string, string>> = {
  en: flattenTranslations(enTranslations),
  zh: flattenTranslations(zhTranslations),
  'zh-tw': flattenTranslations(zhTwTranslations),
  th: flattenTranslations(thTranslations),
  ms: flattenTranslations(msTranslations),
  ko: flattenTranslations(koTranslations),
  ja: flattenTranslations(jaTranslations)
};

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<Language, Record<string, string>>>(jsonTranslations);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations from database and merge with JSON fallbacks
  const loadTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('translation_key, language_code, translated_text');

      if (error) {
        console.error('Error loading translations from database:', error);
        // Use JSON translations as fallback if database fails
        console.log('🌍 Using JSON fallback translations');
        setIsLoading(false);
        return;
      }

      // Start with JSON translations as base
      const mergedTranslations: Record<Language, Record<string, string>> = {
        en: { ...jsonTranslations.en },
        zh: { ...jsonTranslations.zh },
        'zh-tw': { ...jsonTranslations['zh-tw'] },
        th: { ...jsonTranslations.th },
        ms: { ...jsonTranslations.ms },
        ko: { ...jsonTranslations.ko },
        ja: { ...jsonTranslations.ja }
      };

      // Override with database translations
      data?.forEach(item => {
        const lang = item.language_code as Language;
        if (mergedTranslations[lang]) {
          mergedTranslations[lang][item.translation_key] = item.translated_text;
        }
      });

      setTranslations(mergedTranslations);
      console.log(`🌍 Loaded translations (DB + JSON fallback):`, {
        en: Object.keys(mergedTranslations.en).length,
        zh: Object.keys(mergedTranslations.zh).length,
        'zh-tw': Object.keys(mergedTranslations['zh-tw']).length,
        th: Object.keys(mergedTranslations.th).length,
        ms: Object.keys(mergedTranslations.ms).length,
        ko: Object.keys(mergedTranslations.ko).length,
        ja: Object.keys(mergedTranslations.ja).length
      });
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Use JSON translations as fallback if anything fails
      console.log('🌍 Using JSON fallback translations due to error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize language from localStorage and load translations
  useEffect(() => {
    const saved = localStorage.getItem('beehive-language');
    const validLanguages: Language[] = ['en', 'zh', 'zh-tw', 'th', 'ms', 'ko', 'ja'];
    if (saved && validLanguages.includes(saved as Language)) {
      setLanguageState(saved as Language);
    } else {
      // Default to English and clear invalid stored language
      localStorage.setItem('beehive-language', 'en');
      setLanguageState('en');
    }

    // Load translations from database
    loadTranslations();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('beehive-language', lang);
  };

  const t = (key: string, interpolations?: Record<string, string | number>): string => {
    try {
      // If translations are still loading, return the key as fallback
      if (isLoading) {
        return key;
      }

      // Get translation from current language
      let result = translations[language]?.[key];
      
      // If translation not found in current language, try English as fallback
      if (!result && language !== 'en') {
        result = translations.en?.[key];
      }
      
      // If still no translation found, return the key
      if (!result) {
        console.warn(`Translation missing for key: ${key} (language: ${language})`);
        return key;
      }
      
      // Handle interpolation
      if (interpolations && typeof result === 'string') {
        for (const [placeholder, replacement] of Object.entries(interpolations)) {
          // Handle both {placeholder} and ${placeholder} formats
          result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), String(replacement));
        }
      }
      
      return String(result);
    } catch (error) {
      console.error('Translation error:', error, key);
      return key;
    }
  };

  const value = {
    language,
    setLanguage,
    t,
    languages: languageOptions,
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
    // Provide a safe fallback instead of throwing error immediately
    // This prevents crashes during hot reloading or timing issues
    console.warn('useI18n hook called outside I18nProvider, using fallback');
    return {
      language: 'en' as Language,
      setLanguage: () => {
        console.warn('setLanguage called outside I18nProvider context');
      },
      t: (key: string, interpolations?: Record<string, string | number>): string => {
        console.warn(`Translation fallback used for key: ${key}`);
        return key; // Return the key as fallback
      },
      languages: languageOptions,
    };
  }
  return context;
};

export { I18nProvider };
export { useI18n };
