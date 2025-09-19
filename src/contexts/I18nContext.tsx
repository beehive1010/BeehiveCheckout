import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<Language, Record<string, string>>>({
    en: {},
    zh: {},
    'zh-tw': {},
    th: {},
    ms: {},
    ko: {},
    ja: {}
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load translations from database
  const loadTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('translation_key, language_code, translated_text');

      if (error) {
        console.error('Error loading translations from database:', error);
        return;
      }

      const translationMap: Record<Language, Record<string, string>> = {
        en: {},
        zh: {},
        'zh-tw': {},
        th: {},
        ms: {},
        ko: {},
        ja: {}
      };

      data?.forEach(item => {
        const lang = item.language_code as Language;
        if (translationMap[lang]) {
          translationMap[lang][item.translation_key] = item.translated_text;
        }
      });

      setTranslations(translationMap);
      console.log(`🌍 Loaded translations:`, {
        en: Object.keys(translationMap.en).length,
        zh: Object.keys(translationMap.zh).length,
        'zh-tw': Object.keys(translationMap['zh-tw']).length,
        th: Object.keys(translationMap.th).length,
        ms: Object.keys(translationMap.ms).length,
        ko: Object.keys(translationMap.ko).length,
        ja: Object.keys(translationMap.ja).length
      });
    } catch (error) {
      console.error('Failed to load translations:', error);
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
