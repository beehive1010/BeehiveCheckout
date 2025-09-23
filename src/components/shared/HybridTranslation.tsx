import React, { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { translationService } from '../../lib/services/translationService';
import { MultilingualText } from './MultilingualContent';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Languages, 
  Sparkles, 
  Globe,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface HybridTranslationProps {
  // UI标签 - 使用i18n翻译
  uiLabel?: string;
  
  // 动态内容 - 使用DeepL翻译
  content: {
    text: string;
    language?: string;
    translations?: Record<string, string>;
  };
  
  // 配置选项
  showTranslationSource?: boolean;
  autoTranslate?: boolean;
  enableManualTranslate?: boolean;
  className?: string;
  
  // 样式配置
  uiLabelStyle?: string;
  contentStyle?: string;
}

export function HybridTranslation({
  uiLabel,
  content,
  showTranslationSource = false,
  autoTranslate = true,
  enableManualTranslate = false,
  className = '',
  uiLabelStyle = 'text-sm font-medium text-muted-foreground',
  contentStyle = 'text-base'
}: HybridTranslationProps) {
  const { t, language } = useI18n();
  const [translatedContent, setTranslatedContent] = useState(content.text);
  const [translationSource, setTranslationSource] = useState<'original' | 'database' | 'deepl' | 'i18n'>('original');
  const [isTranslating, setIsTranslating] = useState(false);

  // 处理内容翻译
  useEffect(() => {
    async function handleContentTranslation() {
      const sourceLanguage = content.language || detectLanguage(content.text) || 'en';
      
      // 1. 如果是原语言，直接显示
      if (language === sourceLanguage) {
        setTranslatedContent(content.text);
        setTranslationSource('original');
        return;
      }

      // 2. 检查数据库翻译
      if (content.translations && content.translations[language]) {
        setTranslatedContent(content.translations[language]);
        setTranslationSource('database');
        return;
      }

      // 3. 使用DeepL自动翻译
      if (autoTranslate) {
        try {
          setIsTranslating(true);
          const result = await translationService.translateText(
            content.text,
            language,
            sourceLanguage,
            {
              provider: 'DeepL',
              useCache: true,
              fallback: content.text
            }
          );
          setTranslatedContent(result);
          setTranslationSource('deepl');
        } catch (error) {
          console.error('DeepL翻译失败:', error);
          setTranslatedContent(content.text);
          setTranslationSource('original');
        } finally {
          setIsTranslating(false);
        }
      } else {
        setTranslatedContent(content.text);
        setTranslationSource('original');
      }
    }

    handleContentTranslation();
  }, [content, language, autoTranslate]);

  // 手动翻译
  const handleManualTranslate = async () => {
    if (isTranslating) return;
    
    setIsTranslating(true);
    try {
      const result = await translationService.translateText(
        content.text,
        language,
        content.language || 'en',
        {
          provider: 'DeepL',
          useCache: false // 手动翻译不使用缓存
        }
      );
      setTranslatedContent(result);
      setTranslationSource('deepl');
    } catch (error) {
      console.error('手动翻译失败:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // 获取翻译源标识
  const getTranslationBadge = () => {
    if (!showTranslationSource) return null;

    const badgeConfig = {
      original: { text: '原文', icon: Globe, className: 'bg-gray-500/20 text-gray-400' },
      database: { text: '数据库', icon: Languages, className: 'bg-green-500/20 text-green-400' },
      deepl: { text: 'DeepL', icon: Sparkles, className: 'bg-blue-500/20 text-blue-400' },
      i18n: { text: 'i18n', icon: Languages, className: 'bg-purple-500/20 text-purple-400' }
    };

    const config = badgeConfig[translationSource];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
        {/* 显示目标语言 */}
        {translationSource !== 'original' && (
          <span className="ml-1">→ {getLanguageName(language)}</span>
        )}
      </Badge>
    );
  };

  // 获取语言显示名称
  // 获取语言显示名称
  const getLanguageName = (code: string): string => {
    const names: Record<string, string> = {
      'en': 'EN',
      'zh': '中文',
      'zh-tw': '繁體',
      'th': 'ไทย',
      'ms': 'BM',
      'ko': '한국',
      'ja': '日本'
    };
    return names[code] || code.toUpperCase();
  };

  // 简单的语言检测 (基于字符模式)
  const detectLanguage = (text: string): string | null => {
    if (!text || text.length < 3) return null;
    
    // 中文检测 (包含中文字符)
    if (/[\u4e00-\u9fff]/.test(text)) {
      // 繁体字检测 (检查常见繁体字)
      if (/[繁體選擇點擊確認]/.test(text)) {
        return 'zh-tw';
      }
      return 'zh';
    }
    
    // 日文检测 (平假名、片假名、日文汉字)
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'ja';
    }
    
    // 韩文检测 (韩文字符)
    if (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text)) {
      return 'ko';
    }
    
    // 泰文检测 (泰文字符)
    if (/[\u0e00-\u0e7f]/.test(text)) {
      return 'th';
    }
    
    // 英文检测 (基本拉丁字符)
    if (/^[a-zA-Z\s.,!?'"()-]+$/.test(text)) {
      return 'en';
    }
    
    // 马来语通常使用拉丁字符，但难以从英语中区分
    // 这里可以根据常见马来语词汇进行检测
    const malayWords = /\b(dan|atau|yang|ini|itu|dengan|untuk|pada|dari|ke|oleh|akan|adalah|juga|tidak|ada|dalam|dapat|sudah|belum|masih|sangat|lebih|paling|semua|setiap|beberapa|satu|dua|tiga)\b/i;
    if (malayWords.test(text)) {
      return 'ms';
    }
    
    return null; // 无法确定语言
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* UI标签 - 使用i18n */}
      {uiLabel && (
        <div className={`flex items-center gap-2 ${uiLabelStyle}`}>
          <span>{t(uiLabel)}</span>
          {showTranslationSource && (
            <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400">
              <Languages className="w-3 h-3 mr-1" />
              i18n
            </Badge>
          )}
        </div>
      )}

      {/* 动态内容 - 使用DeepL */}
      <div className="space-y-2">
        <div className={`flex items-start gap-2 ${contentStyle}`}>
          <div className="flex-1">
            {isTranslating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">DeepL翻译中...</span>
              </div>
            ) : (
              <span>{translatedContent}</span>
            )}
          </div>
          
          {/* 翻译源标识 */}
          {getTranslationBadge()}
        </div>

        {/* 手动翻译按钮 */}
        {enableManualTranslate && translationSource !== 'deepl' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualTranslate}
            disabled={isTranslating}
            className="text-xs"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                翻译中
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                使用DeepL翻译
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// 简化版组件 - 只翻译内容，UI标签自动使用t()
interface SmartContentProps {
  label?: string; // i18n key
  text: string;   // 要翻译的内容
  language?: string;
  translations?: Record<string, string>;
  className?: string;
  showSource?: boolean;
}

export function SmartContent({
  label,
  text,
  language = 'en',
  translations = {},
  className = '',
  showSource = false
}: SmartContentProps) {
  return (
    <HybridTranslation
      uiLabel={label}
      content={{
        text,
        language,
        translations
      }}
      showTranslationSource={showSource}
      autoTranslate={true}
      className={className}
    />
  );
}

export default HybridTranslation;