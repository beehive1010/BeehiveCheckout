import { useI18n } from '../../contexts/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { useState, useEffect, useRef } from 'react';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLanguageFlag = (code: string) => {
    const flags = {
      'en': '🇺🇸',
      'zh': '🇨🇳', 
      'th': '🇹🇭',
      'ms': '🇲🇾',
      'ko': '🇰🇷'
    };
    return flags[code as keyof typeof flags] || '🌐';
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === language);
  };

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
              <span className="text-sm font-medium">{getCurrentLanguage()?.name}</span>
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
      <div className="block sm:hidden" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 p-0 bg-transparent hover:bg-muted/50"
          data-testid="button-language-mobile"
        >
          <span className="text-sm">{getLanguageFlag(language)}</span>
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
