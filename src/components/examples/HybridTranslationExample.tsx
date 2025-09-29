import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { HybridTranslation, SmartContent } from '../shared/HybridTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Sparkles, Languages, Globe } from 'lucide-react';

export default function HybridTranslationExample() {
  const { t } = useI18n();

  // 模拟NFT数据
  const mockNFT = {
    title: "Premium Digital Art Collection",
    description: "This exclusive NFT collection features rare digital artwork created by renowned artists. Each piece represents unique creativity and technological innovation.",
    category: "Digital Art",
    price: 0.5,
    language: "en"
  };

  // 模拟博客文章
  const mockBlogPost = {
    title: "The Future of Web3 and Decentralized Finance",
    content: "Blockchain technology is revolutionizing the financial industry by providing decentralized solutions that eliminate intermediaries and reduce costs.",
    author: "Crypto Expert",
    language: "en"
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 标题说明 */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          {t('混合翻译系统演示')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('UI界面使用i18n静态翻译，动态内容使用DeepL实时翻译')}
        </p>
        
        {/* 翻译方式说明 */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge className="bg-purple-500/20 text-purple-400">
            <Languages className="w-3 h-3 mr-1" />
            i18n - UI界面
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-400">
            <Sparkles className="w-3 h-3 mr-1" />
            DeepL - 动态内容
          </Badge>
          <Badge className="bg-green-500/20 text-green-400">
            <Globe className="w-3 h-3 mr-1" />
            数据库 - 已存翻译
          </Badge>
        </div>
        
        {/* DeepL语言支持说明 */}
        <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
          <div>🟢 DeepL原生支持: EN, 中文, 日本語, 한국어</div>
          <div>🟡 替代支持: ไทย(→EN), Bahasa Malaysia(→EN), 繁體(→简)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NFT卡片示例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              {t('nfts.title')} {/* UI标签用i18n */}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* NFT标题 - DeepL翻译 */}
            <HybridTranslation
              uiLabel="nfts.name" // i18n键
              content={{
                text: mockNFT.title,
                language: mockNFT.language
              }}
              showTranslationSource={true}
              enableManualTranslate={true}
              contentStyle="text-lg font-semibold"
            />

            {/* NFT描述 - DeepL翻译 */}
            <HybridTranslation
              uiLabel="nfts.description"
              content={{
                text: mockNFT.description,
                language: mockNFT.language
              }}
              showTranslationSource={true}
              contentStyle="text-sm text-muted-foreground"
            />

            {/* 价格信息 - UI用i18n，数值保持不变 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('nfts.price')}</span>
              <span className="text-lg font-bold text-blue-400">{mockNFT.price} ETH</span>
            </div>

            {/* 分类 - 简化版组件 */}
            <SmartContent
              label="nfts.category"
              text={mockNFT.category}
              language={mockNFT.language}
              showSource={true}
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* 博客文章示例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-green-400" />
              {t('blog.title')} {/* UI标签用i18n */}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 文章标题 - DeepL翻译 */}
            <HybridTranslation
              uiLabel="blog.articleTitle"
              content={{
                text: mockBlogPost.title,
                language: mockBlogPost.language
              }}
              showTranslationSource={true}
              enableManualTranslate={true}
              contentStyle="text-lg font-semibold"
            />

            {/* 文章内容 - DeepL翻译 */}
            <HybridTranslation
              uiLabel="blog.content"
              content={{
                text: mockBlogPost.content,
                language: mockBlogPost.language
              }}
              showTranslationSource={true}
              contentStyle="text-sm text-muted-foreground leading-relaxed"
            />

            {/* 作者信息 - UI用i18n，名字保持不变 */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('blog.author')}:</span>
              <span className="font-medium">{mockBlogPost.author}</span>
            </div>
          </CardContent>
        </Card>

        {/* 用户界面元素示例 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('examples.uiElements')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 按钮 - 纯i18n */}
              <div className="space-y-2">
                <h4 className="font-medium">{t('examples.buttons')}</h4>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    {t('buttons.purchase')}
                  </button>
                  <button className="w-full px-4 py-2 border border-border rounded hover:bg-muted">
                    {t('buttons.viewDetails')}
                  </button>
                </div>
              </div>

              {/* 状态标签 - 纯i18n */}
              <div className="space-y-2">
                <h4 className="font-medium">{t('examples.status')}</h4>
                <div className="space-y-2">
                  <Badge className="bg-green-500/20 text-green-400">
                    {t('status.available')}
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-400">
                    {t('status.soldOut')}
                  </Badge>
                </div>
              </div>

              {/* 导航 - 纯i18n */}
              <div className="space-y-2">
                <h4 className="font-medium">{t('examples.navigation')}</h4>
                <div className="space-y-2">
                  <div className="text-sm text-blue-400 hover:underline cursor-pointer">
                    {t('nav.marketplace')}
                  </div>
                  <div className="text-sm text-blue-400 hover:underline cursor-pointer">
                    {t('nav.myNFTs')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 翻译系统说明 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examples.howItWorks')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Languages className="w-4 h-4 text-purple-400" />
                {t('examples.i18nTranslation')}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                <li>• {t('examples.i18nFeature1')}</li>
                <li>• {t('examples.i18nFeature2')}</li>
                <li>• {t('examples.i18nFeature3')}</li>
                <li>• {t('examples.i18nFeature4')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {t('examples.deeplTranslation')}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                <li>• {t('examples.deeplFeature1')}</li>
                <li>• {t('examples.deeplFeature2')}</li>
                <li>• {t('examples.deeplFeature3')}</li>
                <li>• {t('examples.deeplFeature4')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}