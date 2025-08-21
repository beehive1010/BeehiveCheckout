import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

type Language = 'en' | 'zh' | 'th' | 'ms' | 'ko';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: { code: Language; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const languageOptions = [
  { code: 'en' as Language, name: 'English' },
  { code: 'zh' as Language, name: '中文' },
  { code: 'th' as Language, name: 'ไทย' },
  { code: 'ms' as Language, name: 'Malay' },
  { code: 'ko' as Language, name: '한국어' },
];

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('beehive-language');
    // Validate the saved language exists in our translations
    const validLanguages: Language[] = ['en', 'zh', 'th', 'ms', 'ko'];
    if (saved && validLanguages.includes(saved as Language)) {
      return saved as Language;
    }
    // Default to English and clear invalid stored language
    localStorage.setItem('beehive-language', 'en');
    return 'en';
  });

  // Debug: Add window function to force reset to English
  useEffect(() => {
    (window as any).forceEnglish = () => {
      setLanguage('en');
      window.location.reload();
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('beehive-language', lang);
  };

  const t = (key: string): string => {
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
        return englishValue;
      }
    }
    
    return value || key;
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

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
