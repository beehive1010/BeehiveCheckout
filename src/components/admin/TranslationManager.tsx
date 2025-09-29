import React, { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { translationService } from '../../lib/services/translationService';
import { multilingualService } from '../../lib/services/multilingualService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Languages, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Database, 
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TranslationItem {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  type: 'manual' | 'auto' | 'database';
  lastUpdated: string;
}

interface ContentItem {
  id: string;
  type: 'nft' | 'blog' | 'course';
  title: string;
  description: string;
  language: string;
  translations: Record<string, any>;
}

export default function TranslationManager() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<any[]>([]);
  const [translationStats, setTranslationStats] = useState<any>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [newTranslation, setNewTranslation] = useState({
    originalText: '',
    targetLanguage: '',
    translatedText: ''
  });

  // 加载支持的语言
  useEffect(() => {
    async function loadLanguages() {
      try {
        const languages = await multilingualService.getSupportedLanguages();
        setSupportedLanguages(languages);
      } catch (error) {
        console.error('加载语言失败:', error);
      }
    }
    loadLanguages();
  }, []);

  // 加载翻译统计
  const loadTranslationStats = async () => {
    setLoading(true);
    try {
      // 获取翻译提供商信息
      const providers = translationService.getAvailableProviders();
      const supportedLangs = translationService.getSupportedLanguages();
      
      // 模拟统计数据（实际应用中从数据库获取）
      setTranslationStats({
        totalTranslations: 156,
        activeLanguages: supportedLangs.length,
        autoTranslations: 98,
        manualTranslations: 58,
        providers: providers,
        cacheHitRate: 87.5
      });
    } catch (error) {
      console.error('加载翻译统计失败:', error);
      toast.error('加载翻译统计失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载内容项目
  const loadContentItems = async () => {
    setLoading(true);
    try {
      // 模拟加载内容（实际应用中从数据库获取）
      const mockContent: ContentItem[] = [
        {
          id: '1',
          type: 'nft',
          title: 'Premium NFT Collection',
          description: 'Exclusive digital art collection',
          language: 'en',
          translations: { 'zh': { title: '高级NFT收藏', description: '独家数字艺术收藏' } }
        },
        {
          id: '2',
          type: 'blog',
          title: 'Web3 Future Trends',
          description: 'Analysis of upcoming Web3 technologies',
          language: 'en',
          translations: { 'zh': { title: 'Web3未来趋势', description: '即将到来的Web3技术分析' } }
        }
      ];
      setContentItems(mockContent);
    } catch (error) {
      console.error('加载内容失败:', error);
      toast.error('加载内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动翻译文本
  const handleAutoTranslate = async () => {
    if (!newTranslation.originalText || !newTranslation.targetLanguage) {
      toast.error('请填写原文和目标语言');
      return;
    }

    setLoading(true);
    try {
      const translated = await translationService.translateText(
        newTranslation.originalText,
        newTranslation.targetLanguage,
        'auto'
      );
      setNewTranslation(prev => ({ ...prev, translatedText: translated }));
      toast.success('自动翻译完成');
    } catch (error) {
      console.error('自动翻译失败:', error);
      toast.error('自动翻译失败');
    } finally {
      setLoading(false);
    }
  };

  // 清理翻译缓存
  const handleClearCache = async () => {
    setLoading(true);
    try {
      await translationService.cleanupCache();
      toast.success('翻译缓存已清理');
      loadTranslationStats();
    } catch (error) {
      console.error('清理缓存失败:', error);
      toast.error('清理缓存失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranslationStats();
    loadContentItems();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 标题部分 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-2xl">
            <Languages className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">翻译管理中心</h1>
            <p className="text-muted-foreground">管理多语言内容和自动翻译</p>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-background border border-border rounded-xl p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="translate" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            翻译工具
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            内容管理
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 统计卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">总翻译数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {translationStats?.totalTranslations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  活跃语言: {translationStats?.activeLanguages || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">自动翻译</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {translationStats?.autoTranslations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  手动翻译: {translationStats?.manualTranslations || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">缓存命中率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {translationStats?.cacheHitRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  提高性能
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">翻译提供商</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {translationStats?.providers?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  可用服务
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 支持的语言 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                支持的语言
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {supportedLanguages.map((lang) => (
                  <Badge 
                    key={lang.code} 
                    variant={lang.is_default ? "default" : "secondary"}
                    className="flex items-center gap-2 p-2 justify-center"
                  >
                    <span>{lang.flag_emoji}</span>
                    <span className="text-xs">{lang.native_name}</span>
                    {lang.is_default && <CheckCircle className="w-3 h-3" />}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 翻译工具标签页 */}
        <TabsContent value="translate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                自动翻译工具
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">原文</label>
                  <Textarea
                    placeholder="输入要翻译的文本..."
                    value={newTranslation.originalText}
                    onChange={(e) => setNewTranslation(prev => ({ ...prev, originalText: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">译文</label>
                  <Textarea
                    placeholder="翻译结果将在这里显示..."
                    value={newTranslation.translatedText}
                    onChange={(e) => setNewTranslation(prev => ({ ...prev, translatedText: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Select 
                  value={newTranslation.targetLanguage} 
                  onValueChange={(value) => setNewTranslation(prev => ({ ...prev, targetLanguage: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择目标语言" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag_emoji}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button onClick={handleAutoTranslate} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  自动翻译
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 翻译服务状态 */}
          <Card>
            <CardHeader>
              <CardTitle>翻译服务状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {translationStats?.providers?.map((provider: string, index: number) => (
                  <div key={provider} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="font-medium">{provider}</span>
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 ? '首选' : '备选'}
                    </Badge>
                  </div>
                )) || (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    暂无可用的翻译服务
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容管理标签页 */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {contentItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <Badge variant="outline">{item.type.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">翻译状态:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(item.translations).map((lang) => (
                        <Badge key={lang} className="bg-green-500/20 text-green-400">
                          {lang.toUpperCase()} ✓
                        </Badge>
                      ))}
                      {supportedLanguages
                        .filter(lang => !Object.keys(item.translations).includes(lang.code) && lang.code !== item.language)
                        .map((lang) => (
                          <Badge key={lang.code} variant="outline" className="text-muted-foreground">
                            {lang.code.toUpperCase()} ⏳
                          </Badge>
                        ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3 mr-1" />
                      添加翻译
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 设置标签页 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>翻译设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">清理翻译缓存</div>
                  <div className="text-sm text-muted-foreground">删除过期的翻译缓存以释放空间</div>
                </div>
                <Button variant="outline" onClick={handleClearCache} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  清理缓存
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <div className="font-medium mb-2">默认翻译语言</div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag_emoji}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}