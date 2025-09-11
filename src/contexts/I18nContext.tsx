import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

type Language = 'en' | 'zh' | 'th' | 'ms' | 'ko' | 'ja';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  languages: { code: Language; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const languageOptions = [
  { code: 'en' as Language, name: 'English' },
  { code: 'zh' as Language, name: '中文' },
  { code: 'th' as Language, name: 'ไทย' },
  { code: 'ms' as Language, name: 'Malay' },
  { code: 'ko' as Language, name: '한국어' },
  { code: 'ja' as Language, name: '日本語' },
];

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Initialize language from localStorage after component mounts
  useEffect(() => {
    const saved = localStorage.getItem('beehive-language');
    const validLanguages: Language[] = ['en', 'zh', 'th', 'ms', 'ko', 'ja'];
    if (saved && validLanguages.includes(saved as Language)) {
      setLanguageState(saved as Language);
    } else {
      // Default to English and clear invalid stored language
      localStorage.setItem('beehive-language', 'en');
      setLanguageState('en');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('beehive-language', lang);
  };

  const t = (key: string, interpolations?: Record<string, string | number>): string => {
    try {
      const keys = key.split('.');
      let value: any = translations[language];
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      // If translation not found in current language, try English as fallback
      if (!value && language !== 'en') {
        let englishValue: any = translations.en;
        for (const k of keys) {
          englishValue = englishValue?.[k];
        }
        if (englishValue) {
          value = englishValue;
        }
      }
      
      let result = value || key;
      
      // Force reload for dashboard.topUp if missing
      if (key === 'dashboard.topUp' && !value) {
        // Direct access to ensure translation works
        const directValue = translations[language]?.dashboard?.topUp;
        if (directValue) {
          result = directValue;
        } else if (language !== 'en') {
          // Fallback to English
          const englishValue = translations.en?.dashboard?.topUp;
          if (englishValue) {
            result = englishValue;
          }
        }
      }
      
      // Ensure we always return a string, never an object
      if (typeof result === 'object') {
        console.warn('Translation returned object instead of string for key:', key, result);
        return key; // Fallback to key if object found
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
      languages: [{ code: 'en' as Language, name: 'English' }],
    };
  }
  return context;
};

export { I18nProvider };
export { useI18n };
