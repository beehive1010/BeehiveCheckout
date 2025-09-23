# BEEHIVE V2 多语言系统

## 概述

BEEHIVE V2平台现已完全支持多语言功能，包括数据库内容的自动翻译和管理。系统支持7种语言：英语、中文简体、中文繁体、泰语、马来语、韩语和日语。

## 🌟 主要功能

### 1. 数据库多语言架构
- ✅ 为所有主要内容类型创建了翻译表
- ✅ 支持Advertisement NFTs、Merchant NFTs、Blog Posts、Courses
- ✅ 实现了行级安全(RLS)策略
- ✅ 创建了高效的数据库函数和视图

### 2. 自动翻译服务
- ✅ 集成多个免费翻译API：
  - **LibreTranslate** (完全免费开源)
  - **MyMemory** (1000次/天免费)
  - **Microsoft Translator** (200万字符/月免费)
  - **Google Translate** (支持，需API密钥)
  - **DeepL** (支持，需API密钥)
- ✅ 智能回退机制：优先使用高质量服务，失败后自动切换
- ✅ 翻译缓存系统：避免重复翻译，提高性能

### 3. 前端组件
- ✅ `MultilingualContent` - 完整的多语言内容组件
- ✅ `MultilingualText` - 简化版自动翻译文本组件
- ✅ `useMultilingualContent` - 多语言内容钩子
- ✅ 更新了NFT卡片组件支持自动翻译

### 4. 管理界面
- ✅ `TranslationManager` - 完整的翻译管理中心
- ✅ 翻译统计和监控
- ✅ 手动翻译工具
- ✅ 内容翻译状态管理
- ✅ 缓存管理功能

## 🚀 使用方法

### 环境变量配置

在 `.env` 文件中添加（推荐配置DeepL以获得最佳翻译质量）：

```bash
# DeepL API (推荐 - 高质量翻译)
VITE_DEEPL_API_KEY=your_deepl_api_key

# Google Translate API (可选)
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_api_key

# Microsoft Translator (可选)
VITE_MICROSOFT_TRANSLATOR_API_KEY=your_microsoft_api_key
VITE_MICROSOFT_TRANSLATOR_REGION=your_region

# 用户邮箱（用于MyMemory提高限制）
VITE_USER_EMAIL=your_email@example.com
```

### 🚀 推荐：配置DeepL API

DeepL提供业界领先的翻译质量，特别适合专业内容：

1. **获取API密钥**：
   - 访问 [DeepL Pro API](https://www.deepl.com/pro-api)
   - 注册免费账户（50万字符/月）
   - 获取API密钥

2. **配置步骤**：
   ```bash
   # 1. 在.env文件中添加
   VITE_DEEPL_API_KEY=your_api_key_here
   
   # 2. 重启开发服务器
   npm run dev
   ```

3. **验证配置**：
   - 访问管理界面的DeepL配置页面
   - 运行翻译测试确认API工作正常

### 前端组件使用

#### 1. 自动翻译文本
```tsx
import { MultilingualText } from '../components/shared/MultilingualContent';

function MyComponent({ nft }) {
  return (
    <div>
      <h2>
        <MultilingualText
          text={nft.title}
          language={nft.language}
          translations={nft.translations}
          autoTranslate={true}
        />
      </h2>
      <p>
        <MultilingualText
          text={nft.description}
          language={nft.language}
          translations={nft.translations}
          autoTranslate={true}
        />
      </p>
    </div>
  );
}
```

#### 2. 完整多语言内容组件
```tsx
import { MultilingualContent } from '../components/shared/MultilingualContent';

function ContentPage({ content }) {
  return (
    <MultilingualContent
      originalContent={{
        text: content.description,
        language: content.language
      }}
      translations={content.translations}
      contentType="description"
      showTranslateButton={true}
      showLanguageIndicator={true}
      onTranslationComplete={(language, translatedText) => {
        console.log(`翻译完成: ${language} -> ${translatedText}`);
      }}
    />
  );
}
```

#### 3. 多语言数据钩子
```tsx
import { useMultilingualNFTs, useMultilingualBlog } from '../hooks/useMultilingualContent';

function NFTPage() {
  const { language } = useI18n();
  const { nfts, loading, error } = useMultilingualNFTs(language);
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;
  
  return (
    <div>
      {nfts.map(nft => (
        <NFTCard key={nft.id} nft={nft} />
      ))}
    </div>
  );
}
```

### API使用

#### 1. 获取多语言NFT数据
```typescript
import { multilingualNFTsApi } from '../api/nfts/multilingual-nfts.api';

// 获取广告NFT（自动翻译为用户语言）
const advertisementNFTs = await multilingualNFTsApi.getAdvertisementNFTs('zh', {
  category: 'gaming',
  is_active: true,
  limit: 20
});

// 获取商家NFT
const merchantNFTs = await multilingualNFTsApi.getMerchantNFTs('th', {
  creator_wallet: 'wallet_address',
  limit: 10
});
```

#### 2. 获取多语言博客内容
```typescript
import { blogApi } from '../api/hiveworld/blog.api';

// 获取博客文章（支持多语言）
const posts = await blogApi.getBlogPosts('ko', {
  published: true,
  limit: 10,
  category: 'technology'
});

// 获取单篇文章
const post = await blogApi.getBlogPost('post-slug', 'ja');
```

#### 3. 直接使用翻译服务
```typescript
import { translationService } from '../lib/services/translationService';

// 使用DeepL进行高质量翻译
const translated = await translationService.translateText(
  'Hello, world!',
  'zh',
  'en',
  {
    useCache: true,
    provider: 'DeepL' // 指定使用DeepL
  }
);

// 自动选择最佳翻译提供商（DeepL优先）
const autoTranslated = await translationService.translateText(
  'Professional content for business use',
  'zh',
  'en'
);

// 批量翻译
const texts = ['Hello', 'World', 'How are you?'];
const translations = await translationService.translateBatch(texts, 'zh', 'en');

// 翻译对象
const translatedNFT = await translationService.translateContent(
  nftData,
  'zh',
  ['title', 'description', 'category'],
  'en'
);
```

#### 4. DeepL特定功能
```typescript
// 检查DeepL服务状态
const providers = translationService.getAvailableProviders();
const isDeepLAvailable = providers.includes('DeepL');

// 获取DeepL使用情况（需要配置API密钥）
if (isDeepLAvailable) {
  const deepLProvider = translationService.providers.find(p => p.name === 'DeepL');
  const usage = await deepLProvider.getUsage();
  console.log('DeepL使用情况:', usage);
}
```

## 📊 数据库结构

### 主要翻译表

1. **advertisement_nft_translations** - 广告NFT翻译
2. **merchant_nft_translations** - 商家NFT翻译  
3. **blog_post_translations** - 博客文章翻译
4. **course_translations** - 课程翻译
5. **translation_cache** - 翻译缓存
6. **supported_languages** - 支持的语言列表

### 数据库函数

- `get_advertisement_nft_content()` - 获取广告NFT多语言内容
- `get_blog_post_content()` - 获取博客文章多语言内容
- `get_course_with_translations()` - 获取课程多语言内容
- `cleanup_expired_translation_cache()` - 清理过期翻译缓存

## 🔧 管理界面

访问 `/admin/translations` 查看翻译管理中心，包含：

1. **概览页面** - 翻译统计和语言支持状态
2. **翻译工具** - 手动翻译和服务状态
3. **内容管理** - 管理各类内容的翻译状态
4. **设置页面** - 翻译服务配置和缓存管理

## 🌍 支持的语言

| 语言 | 代码 | 旗帜 | 默认 | 状态 |
|------|------|------|------|------|
| English | en | 🇺🇸 | ✅ | 活跃 |
| 中文简体 | zh | 🇨🇳 | - | 活跃 |
| 中文繁體 | zh-tw | 🇹🇼 | - | 活跃 |
| ไทย | th | 🇹🇭 | - | 活跃 |
| Malay | ms | 🇲🇾 | - | 活跃 |
| 한국어 | ko | 🇰🇷 | - | 活跃 |
| 日本語 | ja | 🇯🇵 | - | 活跃 |

## 🚀 推荐翻译API服务

### 1. DeepL (强烈推荐) ⭐⭐⭐⭐⭐
- **最高翻译质量**，业界领先
- **50万字符/月免费**
- 支持正式/非正式语调
- 保持原文格式
- 特别适合专业内容和亚洲语言
- 支持：中文、日语、韩语、德语、法语等

**配置方法**：
```bash
VITE_DEEPL_API_KEY=your_deepl_api_key
```

### 2. Microsoft Translator ⭐⭐⭐⭐
- **每月200万字符免费**
- 高质量翻译
- 支持70+语言
- 需要Azure账户

### 3. LibreTranslate ⭐⭐⭐
- **完全免费**，开源项目
- 无需API密钥
- 可自行部署
- 支持50+语言
- 作为备选方案很好

### 4. MyMemory ⭐⭐
- **每日1000次免费**
- 无需注册即可使用
- 支持语言检测
- 提供邮箱可提高限制

## 💡 推荐配置策略

为了获得最佳翻译效果，建议按以下优先级配置：

1. **首选**：DeepL（高质量专业翻译）
2. **备选1**：Microsoft Translator（大容量免费翻译）
3. **备选2**：MyMemory（无需密钥的免费服务）
4. **备选3**：LibreTranslate（完全开源的备选方案）

这样配置确保：
- 重要内容使用最高质量的DeepL翻译
- 大量内容可以使用Microsoft的免费额度
- 始终有免费的备选方案可用

## 📝 注意事项

1. **翻译优先级**：数据库翻译 > API翻译 > 原文
2. **缓存策略**：翻译结果自动缓存7天，提高性能
3. **失败回退**：翻译失败时显示原文，确保用户体验
4. **性能优化**：使用批量翻译和智能缓存减少API调用

## 🔄 升级指南

### 现有项目集成

1. 运行数据库迁移：
```bash
psql "your_database_url" -f sql/setup_multilingual_database.sql
psql "your_database_url" -f sql/create_translation_cache.sql
```

2. 更新现有组件使用 `MultilingualText`：
```tsx
// 替换静态文本
<h1>{nft.title}</h1>

// 使用多语言组件
<h1>
  <MultilingualText 
    text={nft.title} 
    language={nft.language}
    translations={nft.translations}
    autoTranslate={true} 
  />
</h1>
```

3. 更新API调用使用多语言服务：
```typescript
// 替换直接数据库查询
const { data } = await supabase.from('advertisement_nfts').select('*');

// 使用多语言API
const nfts = await multilingualNFTsApi.getAdvertisementNFTs(language);
```

## 📞 技术支持

如有问题，请查看：
1. 浏览器控制台的翻译日志
2. 网络请求确认API调用状态
3. 数据库日志检查多语言查询

---

**开发完成时间**: 2025年9月23日  
**版本**: v2.0.0  
**状态**: ✅ 生产就绪