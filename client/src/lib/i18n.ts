// Import all translation files
import en from '../translations/en.json';
import zh from '../translations/zh.json';
import th from '../translations/th.json';
import ms from '../translations/ms.json';
import ko from '../translations/ko.json';
import ja from '../translations/ja.json';

export const translations = {
  en,
  zh,
  th,
  ms,
  ko,
  ja,
} as const;

export type SupportedLanguage = keyof typeof translations;

export const defaultLanguage: SupportedLanguage = 'en';

export const getTranslation = (language: SupportedLanguage, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};

export const formatNumber = (num: number, locale: SupportedLanguage): string => {
  const localeMap = {
    en: 'en-US',
    zh: 'zh-CN',
    th: 'th-TH',
    ms: 'ms-MY',
    ko: 'ko-KR',
    ja: 'ja-JP',
  };
  
  return new Intl.NumberFormat(localeMap[locale]).format(num);
};

export const formatCurrency = (
  amount: number,
  currency: string,
  locale: SupportedLanguage
): string => {
  const localeMap = {
    en: 'en-US',
    zh: 'zh-CN',
    th: 'th-TH',
    ms: 'ms-MY',
    ko: 'ko-KR',
    ja: 'ja-JP',
  };
  
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (
  date: Date | string,
  locale: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string => {
  const localeMap = {
    en: 'en-US',
    zh: 'zh-CN',
    th: 'th-TH',
    ms: 'ms-MY',
    ko: 'ko-KR',
    ja: 'ja-JP',
  };
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(localeMap[locale], {
    ...defaultOptions,
    ...options,
  }).format(new Date(date));
};
