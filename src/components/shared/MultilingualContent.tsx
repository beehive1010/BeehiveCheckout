import React, { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { translationService } from '../../lib/services/translationService';
import { Button } from '../ui/button';
import { Loader2, Languages, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MultilingualContentProps {
  // 原始内容
  originalContent: {
    text: string;
    language?: string; // 原始语言，默认 'en'
  };
  
  // 已有的翻译内容（来自数据库）
  translations?: Record<string, string>;
  
  // 可翻译的内容类型
  contentType?: 'title' | 'description' | 'content' | 'text';
  
  // 样式选项
  className?: string;
  showTranslateButton?: boolean;
  showLanguageIndicator?: boolean;
  
  // 回调函数
  onTranslationComplete?: (language: string, translatedText: string) => void;
  onTranslationError?: (error: Error) => void;
}

export function MultilingualContent({
  originalContent,
  translations = {},
  contentType = 'text',
  className = '',
  showTranslateButton = true,
  showLanguageIndicator = false,
  onTranslationComplete,
  onTranslationError
}: MultilingualContentProps) {
  const { language: currentLanguage, t } = useI18n();
  const [displayText, setDisplayText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationSource, setTranslationSource] = useState<'database' | 'api' | 'original'>('original');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  // 初始化显示文本
  useEffect(() => {
    const sourceLanguage = originalContent.language || 'en';
    
    // 1. 如果当前语言就是原始语言，直接显示原文
    if (currentLanguage === sourceLanguage) {
      setDisplayText(originalContent.text);
      setTranslationSource('original');
      return;
    }

    // 2. 检查是否有数据库中的翻译
    if (translations[currentLanguage]) {
      setDisplayText(translations[currentLanguage]);
      setTranslationSource('database');
      return;
    }

    // 3. 显示原文，等待用户触发翻译或自动翻译
    setDisplayText(originalContent.text);
    setTranslationSource('original');
  }, [currentLanguage, originalContent, translations]);

  // 获取可用的翻译服务
  useEffect(() => {
    const languages = translationService.getSupportedLanguages();
    setAvailableLanguages(languages);
  }, []);

  // 执行自动翻译
  const handleTranslate = async () => {
    if (!originalContent.text.trim()) return;
    
    setIsTranslating(true);
    
    try {
      const sourceLanguage = originalContent.language || 'en';
      const translatedText = await translationService.translateText(
        originalContent.text,
        currentLanguage,
        sourceLanguage,
        {
          useCache: true,
          fallback: originalContent.text
        }
      );

      setDisplayText(translatedText);
      setTranslationSource('api');
      
      // 调用回调函数
      onTranslationComplete?.(currentLanguage, translatedText);
      
      toast.success(t('翻译完成'));
    } catch (error) {
      console.error('翻译失败:', error);
      onTranslationError?.(error as Error);
      toast.error(t('翻译失败，请稍后重试'));
    } finally {
      setIsTranslating(false);
    }
  };

  // 判断是否需要翻译
  const needsTranslation = () => {
    const sourceLanguage = originalContent.language || 'en';
    return currentLanguage !== sourceLanguage && 
           !translations[currentLanguage] && 
           translationSource === 'original';
  };

  // 获取翻译状态指示器
  const getTranslationIndicator = () => {
    if (!showLanguageIndicator) return null;

    const sourceLanguage = originalContent.language || 'en';
    
    switch (translationSource) {
      case 'database':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Languages className="w-3 h-3 mr-1" />
            {t('数据库翻译')}
          </span>
        );
      case 'api':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Sparkles className="w-3 h-3 mr-1" />
            {t('AI翻译')}
          </span>
        );
      case 'original':
        return currentLanguage !== sourceLanguage ? (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <Languages className="w-3 h-3 mr-1" />
            {t('原始语言')}
          </span>
        ) : null;
      default:
        return null;
    }
  };

  // 渲染内容的样式
  const getContentClassName = () => {
    const base = className;
    const typeClasses = {
      'title': 'text-lg font-semibold',
      'description': 'text-sm text-muted-foreground',
      'content': 'text-base leading-relaxed',
      'text': 'text-base'
    };
    
    return `${base} ${typeClasses[contentType] || typeClasses.text}`.trim();
  };

  return (
    <div className="space-y-2">
      {/* 主要内容 */}
      <div className={getContentClassName()}>
        {displayText}
      </div>

      {/* 翻译控制和状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getTranslationIndicator()}
          
          {needsTranslation() && availableLanguages.includes(currentLanguage) && (
            <span className="text-xs text-muted-foreground">
              {t('可以翻译为')} {currentLanguage.toUpperCase()}
            </span>
          )}
        </div>

        {/* 翻译按钮 */}
        {showTranslateButton && needsTranslation() && availableLanguages.includes(currentLanguage) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="ml-auto"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t('翻译中...')}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                {t('翻译')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// 简化版本 - 仅显示文本，支持自动翻译
interface MultilingualTextProps {
  text: string;
  language?: string;
  translations?: Record<string, string>;
  className?: string;
  autoTranslate?: boolean; // 自动翻译，无需用户点击
}

export function MultilingualText({
  text,
  language = 'en',
  translations = {},
  className = '',
  autoTranslate = false
}: MultilingualTextProps) {
  const { language: currentLanguage } = useI18n();
  const [displayText, setDisplayText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadTranslation() {
      // 如果当前语言就是原始语言，直接显示
      if (currentLanguage === language) {
        setDisplayText(text);
        return;
      }

      // 如果有数据库翻译，使用数据库翻译
      if (translations[currentLanguage]) {
        setDisplayText(translations[currentLanguage]);
        return;
      }

      // 如果启用自动翻译且支持当前语言
      if (autoTranslate && translationService.getSupportedLanguages().includes(currentLanguage)) {
        setIsLoading(true);
        try {
          const translated = await translationService.translateText(
            text,
            currentLanguage,
            language,
            { useCache: true, fallback: text }
          );
          setDisplayText(translated);
        } catch (error) {
          console.error('自动翻译失败:', error);
          setDisplayText(text); // 回退到原文
        } finally {
          setIsLoading(false);
        }
      } else {
        setDisplayText(text); // 显示原文
      }
    }

    if (text) {
      loadTranslation();
    }
  }, [text, currentLanguage, language, translations, autoTranslate]);

  if (isLoading) {
    return (
      <span className={`${className} inline-flex items-center`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        <span className="opacity-50">{text}</span>
      </span>
    );
  }

  return <span className={className}>{displayText}</span>;
}

export default MultilingualContent;