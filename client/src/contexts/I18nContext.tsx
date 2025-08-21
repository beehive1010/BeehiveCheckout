import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

type Language = 'en' | 'zh' | 'th' | 'ms' | 'ko' | 'ja';

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
  { code: 'ja' as Language, name: '日本語' },
];

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('beehive-language');
    return (saved as Language) || 'en';
  });

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
