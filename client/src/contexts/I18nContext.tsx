import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('beehive-language', lang);
  }, []);

  const t = useCallback((key: string, interpolations?: Record<string, string | number>): string => {
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
      
      // Handle interpolation
      if (interpolations && typeof result === 'string') {
        for (const [placeholder, replacement] of Object.entries(interpolations)) {
          // Handle both {placeholder} and ${placeholder} formats
          result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
          result = result.replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), String(replacement));
        }
      }
      
      return result;
    } catch (error) {
      console.error('Translation error:', error, key);
      return key;
    }
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    languages: languageOptions,
  }), [language, setLanguage, t]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export { I18nProvider };
export { useI18n };
