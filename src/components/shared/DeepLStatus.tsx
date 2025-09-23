import React, { useState, useEffect } from 'react';
import { translationService } from '../../lib/services/translationService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface DeepLStatusProps {
  className?: string;
  showTestButton?: boolean;
}

export function DeepLStatus({ className = '', showTestButton = false }: DeepLStatusProps) {
  const [isDeepLAvailable, setIsDeepLAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkDeepLStatus();
  }, []);

  const checkDeepLStatus = () => {
    try {
      const providers = translationService.getAvailableProviders();
      setIsDeepLAvailable(providers.includes('DeepL'));
      console.log('🔍 翻译服务状态:', providers);
    } catch (error) {
      console.error('检查DeepL状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDeepL = async () => {
    if (!isDeepLAvailable) return;
    
    setTesting(true);
    try {
      const result = await translationService.translateText(
        'Hello! This is a DeepL API test.',
        'zh',
        'en',
        { provider: 'DeepL', useCache: false }
      );
      setTestResult(result);
      console.log('✅ DeepL测试成功:', result);
    } catch (error) {
      console.error('❌ DeepL测试失败:', error);
      setTestResult('测试失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">检查中...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isDeepLAvailable ? "default" : "outline"}
        className={isDeepLAvailable ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
      >
        {isDeepLAvailable ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            DeepL 已启用
          </>
        ) : (
          <>
            <AlertCircle className="w-3 h-3 mr-1" />
            DeepL 未配置
          </>
        )}
      </Badge>

      {showTestButton && isDeepLAvailable && (
        <Button
          size="sm"
          variant="outline"
          onClick={testDeepL}
          disabled={testing}
          className="text-xs"
        >
          {testing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              测试中
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              测试
            </>
          )}
        </Button>
      )}

      {!isDeepLAvailable && (
        <a
          href="https://www.deepl.com/pro-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
        >
          获取API密钥
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {testResult && (
        <div className="text-xs text-muted-foreground max-w-xs truncate">
          结果: {testResult}
        </div>
      )}
    </div>
  );
}

export default DeepLStatus;