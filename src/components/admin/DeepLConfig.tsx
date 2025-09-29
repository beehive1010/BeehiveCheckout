import React, { useState, useEffect } from 'react';
import { translationService } from '../../lib/services/translationService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Key, 
  BarChart3,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DeepLConfig() {
  const [apiKey, setApiKey] = useState('');
  const [testText, setTestText] = useState('Hello, this is a test translation.');
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [translationResult, setTranslationResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'working' | 'error'>('unknown');
  const [usage, setUsage] = useState<any>(null);
  const [providers, setProviders] = useState<string[]>([]);

  // 检查当前配置状态
  useEffect(() => {
    const checkStatus = () => {
      const availableProviders = translationService.getAvailableProviders();
      setProviders(availableProviders);
      
      if (availableProviders.includes('DeepL')) {
        setApiStatus('working');
      } else {
        setApiStatus('unknown');
      }
    };
    
    checkStatus();
  }, []);

  // 测试DeepL API
  const testDeepLAPI = async () => {
    if (!testText.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    setLoading(true);
    try {
      const result = await translationService.translateText(
        testText,
        targetLanguage,
        'en',
        {
          provider: 'DeepL',
          useCache: false // 强制使用API进行测试
        }
      );
      
      setTranslationResult(result);
      setApiStatus('working');
      toast.success('DeepL API测试成功！');
    } catch (error) {
      console.error('DeepL API测试失败:', error);
      setApiStatus('error');
      toast.error(`DeepL API测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 复制配置到剪贴板
  const copyConfig = () => {
    const config = `# DeepL API 配置
VITE_DEEPL_API_KEY=${apiKey}

# 可选：用于测试的其他配置
VITE_USER_EMAIL=your_email@example.com`;
    
    navigator.clipboard.writeText(config);
    toast.success('配置已复制到剪贴板');
  };

  const supportedLanguages = [
    { code: 'zh', name: '中文简体', flag: '🇨🇳' },
    { code: 'ja', name: '日语', flag: '🇯🇵' },
    { code: 'ko', name: '韩语', flag: '🇰🇷' },
    { code: 'de', name: '德语', flag: '🇩🇪' },
    { code: 'fr', name: '法语', flag: '🇫🇷' },
    { code: 'es', name: '西班牙语', flag: '🇪🇸' },
    { code: 'it', name: '意大利语', flag: '🇮🇹' },
    { code: 'pt', name: '葡萄牙语', flag: '🇵🇹' },
    { code: 'ru', name: '俄语', flag: '🇷🇺' },
    { code: 'nl', name: '荷兰语', flag: '🇳🇱' },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-2xl">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">DeepL API 配置</h1>
            <p className="text-muted-foreground">配置和测试高质量的DeepL翻译服务</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API密钥配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 状态指示 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">当前状态:</span>
              {apiStatus === 'working' && (
                <Badge className="bg-green-500/20 text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已配置
                </Badge>
              )}
              {apiStatus === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  配置错误
                </Badge>
              )}
              {apiStatus === 'unknown' && (
                <Badge variant="outline">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  未配置
                </Badge>
              )}
            </div>

            {/* API密钥输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">DeepL API密钥</label>
              <Input
                type="password"
                placeholder="输入您的DeepL API密钥..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                您可以从 <a 
                  href="https://www.deepl.com/pro-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  DeepL Pro API
                  <ExternalLink className="w-3 h-3" />
                </a> 获取API密钥
              </p>
            </div>

            {/* 配置说明 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>免费版限制:</strong> 50万字符/月<br/>
                <strong>付费版:</strong> 无限制，支持更多功能
              </AlertDescription>
            </Alert>

            {/* 复制配置按钮 */}
            <Button 
              onClick={copyConfig} 
              variant="outline" 
              className="w-full"
              disabled={!apiKey}
            >
              <Copy className="w-4 h-4 mr-2" />
              复制环境变量配置
            </Button>
          </CardContent>
        </Card>

        {/* 翻译测试 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              翻译测试
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 测试文本 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">测试文本 (英语)</label>
              <Textarea
                placeholder="输入要翻译的英文文本..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* 目标语言选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">目标语言</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 翻译按钮 */}
            <Button 
              onClick={testDeepLAPI} 
              disabled={loading || !testText.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  翻译中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  测试DeepL翻译
                </>
              )}
            </Button>

            {/* 翻译结果 */}
            {translationResult && (
              <div className="space-y-2">
                <label className="text-sm font-medium">翻译结果</label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{translationResult}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 服务状态 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              翻译服务状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider, index) => (
                <div key={provider} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      provider === 'DeepL' ? 'bg-blue-500' :
                      index === 0 ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{provider}</span>
                  </div>
                  <Badge variant={provider === 'DeepL' ? "default" : index === 0 ? "default" : "secondary"}>
                    {provider === 'DeepL' ? '首选' : index === 0 ? '主要' : '备选'}
                  </Badge>
                </div>
              ))}
            </div>

            {providers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                暂无可用的翻译服务
              </div>
            )}

            {/* DeepL特性说明 */}
            {providers.includes('DeepL') && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">DeepL 优势</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 顶级翻译质量，特别适合专业内容</li>
                  <li>• 支持正式/非正式语调调整</li>
                  <li>• 保持原文格式和结构</li>
                  <li>• 免费版提供50万字符/月</li>
                  <li>• 支持中文、日语、韩语等亚洲语言</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}