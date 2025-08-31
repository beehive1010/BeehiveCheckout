import { useI18n } from '../../contexts/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { useState, useMemo, useCallback } from 'react';

// Move flags outside component to prevent recreation
const FLAGS = {
  'en': '🇺🇸',
  'zh': '🇨🇳', 
  'th': '🇹🇭',
  'ms': '🇲🇾',
  'ko': '🇰🇷'
} as const;

export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const getLanguageFlag = useCallback((code: string) => {
    return FLAGS[code as keyof typeof FLAGS] || '🌐';
  }, []);

  const currentLanguage = useMemo(() => {
    return languages.find(lang => lang.code === language);
  }, [languages, language]);

  return (
    <div className="relative">
      {/* Desktop Version */}
      <div className="hidden sm:block">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger 
            className="w-auto min-w-[120px] bg-secondary text-foreground border-border hover:bg-muted transition-colors" 
            data-testid="select-language"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getLanguageFlag(language)}</span>
              <span className="text-sm font-medium">{currentLanguage?.name}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-secondary border-border">
            {languages.map((lang) => (
              <SelectItem 
                key={lang.code} 
                value={lang.code}
                className="text-foreground hover:bg-muted cursor-pointer"
                data-testid={`option-language-${lang.code}`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getLanguageFlag(lang.code)}</span>
                  <span>{lang.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Version */}
      <div className="block sm:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 p-0 bg-secondary hover:bg-muted"
          data-testid="button-language-mobile"
        >
          <span className="text-lg">{getLanguageFlag(language)}</span>
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 top-12 z-50 bg-secondary border border-border rounded-md shadow-lg py-1 min-w-[140px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-foreground flex items-center space-x-2"
                data-testid={`option-language-mobile-${lang.code}`}
              >
                <span className="text-lg">{getLanguageFlag(lang.code)}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
