import { useI18n } from '../../contexts/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useI18n();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger 
        className="w-20 bg-secondary text-honey border-border focus:ring-honey" 
        data-testid="select-language"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-secondary border-border">
        {languages.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code}
            className="text-honey hover:bg-muted"
            data-testid={`option-language-${lang.code}`}
          >
            {lang.code.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
