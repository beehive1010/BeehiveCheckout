# DeepL 翻译服务使用示例

## 🚀 快速开始

### 1. 环境配置

在项目根目录的 `.env` 文件中添加：

```bash
# DeepL API 密钥 (推荐)
VITE_DEEPL_API_KEY=your_deepl_api_key_here

# 可选：用于提高MyMemory限制
VITE_USER_EMAIL=your_email@example.com
```

### 2. 基本使用

```typescript
import { translationService } from '../lib/services/translationService';

// 简单翻译
const result = await translationService.translateText(
  'Hello, welcome to our platform!',
  'zh', // 目标语言：中文
  'en'  // 源语言：英语
);
console.log(result); // "您好，欢迎来到我们的平台！"
```

## 🎯 实际应用场景

### 1. NFT标题和描述翻译

```typescript
// NFT组件中的使用
import { MultilingualText } from '../components/shared/MultilingualContent';

function NFTCard({ nft }) {
  return (
    <div className="nft-card">
      <h3>
        <MultilingualText
          text={nft.title}
          language="en"
          autoTranslate={true} // 自动使用DeepL翻译
        />
      </h3>
      <p>
        <MultilingualText
          text={nft.description}
          language="en"
          autoTranslate={true}
        />
      </p>
    </div>
  );
}
```

### 2. 博客文章翻译

```typescript
// 获取多语言博客文章
import { blogApi } from '../api/hiveworld/blog.api';
import { useI18n } from '../contexts/I18nContext';

function BlogPage() {
  const { language } = useI18n();
  
  useEffect(() => {
    async function loadPosts() {
      // 自动获取用户语言的文章（使用DeepL翻译）
      const posts = await blogApi.getBlogPosts(language, {
        published: true,
        limit: 10
      });
      setPosts(posts);
    }
    loadPosts();
  }, [language]);
}
```

### 3. 用户生成内容翻译

```typescript
// 实时翻译用户输入
async function translateUserContent(userInput: string, targetLang: string) {
  try {
    const translated = await translationService.translateText(
      userInput,
      targetLang,
      'auto', // 自动检测源语言
      {
        provider: 'DeepL', // 强制使用DeepL
        useCache: true      // 使用缓存提高性能
      }
    );
    return translated;
  } catch (error) {
    console.error('翻译失败:', error);
    return userInput; // 失败时返回原文
  }
}
```

### 4. 批量翻译

```typescript
// 批量翻译多个NFT
async function translateNFTBatch(nfts: NFT[], targetLanguage: string) {
  const titles = nfts.map(nft => nft.title);
  const descriptions = nfts.map(nft => nft.description);
  
  // 批量翻译标题
  const translatedTitles = await translationService.translateBatch(
    titles, 
    targetLanguage, 
    'en'
  );
  
  // 批量翻译描述
  const translatedDescriptions = await translationService.translateBatch(
    descriptions, 
    targetLanguage, 
    'en'
  );
  
  // 合并结果
  return nfts.map((nft, index) => ({
    ...nft,
    translatedTitle: translatedTitles[index],
    translatedDescription: translatedDescriptions[index]
  }));
}
```

## 🔧 高级配置

### 1. 检查服务状态

```typescript
function checkTranslationStatus() {
  const providers = translationService.getAvailableProviders();
  console.log('可用翻译服务:', providers);
  
  const isDeepLActive = providers.includes('DeepL');
  if (isDeepLActive) {
    console.log('✅ DeepL服务已激活');
  } else {
    console.log('⚠️ DeepL服务未配置，使用备选服务');
  }
}
```

### 2. 错误处理

```typescript
async function safeTranslate(text: string, targetLang: string) {
  try {
    return await translationService.translateText(text, targetLang);
  } catch (error) {
    if (error.message.includes('quota')) {
      console.warn('DeepL配额已用完，自动切换到备选服务');
    } else if (error.message.includes('network')) {
      console.warn('网络错误，稍后重试');
    }
    return text; // 返回原文作为fallback
  }
}
```

### 3. 缓存管理

```typescript
// 清理过期的翻译缓存
async function cleanupTranslationCache() {
  try {
    await translationService.cleanupCache();
    console.log('翻译缓存已清理');
  } catch (error) {
    console.error('清理缓存失败:', error);
  }
}

// 定期清理缓存（每天执行一次）
setInterval(cleanupTranslationCache, 24 * 60 * 60 * 1000);
```

## 🎨 UI组件集成

### 1. 带翻译状态指示器的组件

```typescript
import { MultilingualContent } from '../components/shared/MultilingualContent';

function ContentWithTranslationStatus({ content }) {
  return (
    <MultilingualContent
      originalContent={{
        text: content.text,
        language: content.language
      }}
      translations={content.translations}
      showTranslateButton={true}
      showLanguageIndicator={true}
      onTranslationComplete={(language, translatedText) => {
        // 保存翻译结果到数据库
        saveTranslation(content.id, language, translatedText);
      }}
      onTranslationError={(error) => {
        console.error('翻译失败:', error);
        toast.error('翻译失败，请稍后重试');
      }}
    />
  );
}
```

### 2. 自定义翻译按钮

```typescript
function CustomTranslateButton({ text, targetLanguage, onTranslated }) {
  const [loading, setLoading] = useState(false);
  
  const handleTranslate = async () => {
    setLoading(true);
    try {
      const result = await translationService.translateText(
        text, 
        targetLanguage, 
        'auto',
        { provider: 'DeepL' }
      );
      onTranslated(result);
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button onClick={handleTranslate} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          翻译中...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          使用DeepL翻译
        </>
      )}
    </Button>
  );
}
```

## 📊 性能优化

### 1. 智能缓存策略

```typescript
// 为不同内容类型设置不同的缓存TTL
const getCacheTTL = (contentType: string) => {
  switch (contentType) {
    case 'nft_title':
      return 7 * 24 * 60 * 60 * 1000; // 7天
    case 'nft_description':
      return 3 * 24 * 60 * 60 * 1000; // 3天
    case 'user_message':
      return 1 * 60 * 60 * 1000;      // 1小时
    default:
      return 24 * 60 * 60 * 1000;     // 1天
  }
};
```

### 2. 请求去重

```typescript
// 避免同时发起相同的翻译请求
const pendingTranslations = new Map();

async function debouncedTranslate(text: string, targetLang: string) {
  const key = `${text}_${targetLang}`;
  
  if (pendingTranslations.has(key)) {
    return pendingTranslations.get(key);
  }
  
  const promise = translationService.translateText(text, targetLang);
  pendingTranslations.set(key, promise);
  
  try {
    const result = await promise;
    pendingTranslations.delete(key);
    return result;
  } catch (error) {
    pendingTranslations.delete(key);
    throw error;
  }
}
```

## ⚠️ 注意事项

1. **API配额管理**：
   - DeepL免费版每月50万字符
   - 超出后自动切换到备选服务
   - 可在控制台查看使用情况

2. **语言支持**：
   - DeepL直接支持：中文、日语、韩语、德语、法语等
   - 不支持的语言会自动使用备选服务

3. **错误处理**：
   - 网络错误：自动重试
   - 配额用完：切换备选服务
   - API错误：返回原文

4. **性能考虑**：
   - 使用缓存减少API调用
   - 批量翻译提高效率
   - 避免翻译超长文本

---

**最后更新**: 2025年9月23日  
**DeepL集成状态**: ✅ 已完成  
**推荐指数**: ⭐⭐⭐⭐⭐