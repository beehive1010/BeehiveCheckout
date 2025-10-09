import React, { useState, useEffect } from 'react';
import { translationService } from '../../lib/services/translationService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TranslationTest() {
  const [testText, setTestText] = useState('Hello! Welcome to our NFT platform. This is a test translation.');
  const [translationResult, setTranslationResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // 检查翻译服务状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const availableProviders = translationService.getAvailableProviders();
        setProviders(availableProviders);
        
        if (availableProviders.includes('DeepL')) {
          setApiStatus('success');
          console.log('🚀 DeepL服务已成功配置');
        } else {
          setApiStatus('error');
          console.log('⚠️ DeepL服务未配置');
        }
      } catch (error) {
        console.error('检查翻译服务状态失败:', error);
        setApiStatus('error');
      }
    };
    
    checkStatus();
  }, []);

  // 测试DeepL翻译
  const testDeepLTranslation = async () => {
    if (!testText.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    setLoading(true);
    try {
      console.log('🌐 开始DeepL翻译测试...');
      const result = await translationService.translateText(
        testText,
        'zh',
        'en',
        {
          provider: 'DeepL',
          useCache: false
        }
      );
      
      setTranslationResult(result);
      toast.success('DeepL翻译测试成功！');
      console.log('✅ DeepL翻译成功:', result);
    } catch (error) {
      console.error('❌ DeepL翻译失败:', error);
      toast.error(`翻译失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试自动翻译（使用最佳可用服务）
  const testAutoTranslation = async () => {
    if (!testText.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    setLoading(true);
    try {
      console.log('🌐 开始自动翻译测试...');
      const result = await translationService.translateText(
        testText,
        'zh',
        'en'
      );
      
      setTranslationResult(result);
      toast.success('自动翻译测试成功！');
      console.log('✅ 自动翻译成功:', result);
    } catch (error) {
      console.error('❌ 自动翻译失败:', error);
      toast.error(`翻译失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">翻译服务测试</h1>
        <p className="text-muted-foreground">测试DeepL API和其他翻译服务</p>
      </div>

      {/* 服务状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            翻译服务状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API状态 */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="font-medium">API状态</span>
              {apiStatus === 'loading' && (
                <Badge variant="outline">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  检查中
                </Badge>
              )}
              {apiStatus === 'success' && (
                <Badge className="bg-green-500/20 text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  正常
                </Badge>
              )}
              {apiStatus === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  异常
                </Badge>
              )}
            </div>

            {/* 可用服务数 */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="font-medium">可用服务</span>
              <Badge variant="outline">{providers.length} 个</Badge>
            </div>

            {/* DeepL状态 */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="font-medium">DeepL</span>
              {providers.includes('DeepL') ? (
                <Badge className="bg-blue-500/20 text-blue-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已配置
                </Badge>
              ) : (
                <Badge variant="outline">未配置</Badge>
              )}
            </div>
          </div>

          {/* 服务列表 */}
          {providers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">可用翻译服务:</h4>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider, index) => (
                  <Badge 
                    key={provider} 
                    variant={provider === 'DeepL' ? 'default' : 'secondary'}
                    className={provider === 'DeepL' ? 'bg-blue-500/20 text-blue-400' : ''}
                  >
                    {provider === 'DeepL' && '⭐ '}
                    {provider}
                    {index === 0 && ' (首选)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
          {/* 测试文本输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">测试文本 (英语)</label>
            <Textarea
              placeholder="输入要翻译的英文文本..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* 翻译按钮 */}
          <div className="flex gap-2">
            <Button 
              onClick={testDeepLTranslation} 
              disabled={loading || !providers.includes('DeepL')}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              测试DeepL翻译
            </Button>
            
            <Button 
              onClick={testAutoTranslation} 
              disabled={loading || providers.length === 0}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              测试自动翻译
            </Button>
          </div>

          {/* 翻译结果 */}
          {translationResult && (
            <div className="space-y-2">
              <label className="text-sm font-medium">翻译结果 (中文)</label>
              <div className="p-4 bg-muted rounded-lg border-l-4 border-blue-500">
                <p className="text-sm">{translationResult}</p>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {!providers.includes('DeepL') && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                DeepL服务未配置。请确保在 .env 文件中添加了 VITE_DEEPL_API_KEY。
                当前将使用备选翻译服务。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 调试信息 */}
      <Card>
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>环境变量检查:</div>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            VITE_DEEPL_API_KEY: {import.meta.env.VITE_DEEPL_API_KEY ? '已设置 ✅' : '未设置 ❌'}
          </div>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            可用提供商: {providers.join(', ') || '无'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}