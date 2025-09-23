# DeepL API 配置指南

## 🚀 快速配置

您的BEEHIVE V2平台已经集成了DeepL API支持。按照以下步骤配置：

### 1. 当前配置状态

✅ **已完成**: DeepL API密钥已配置  
✅ **已完成**: 翻译服务已启用  
✅ **已完成**: DeepL设置为首选翻译提供商  

### 2. 验证配置

您可以通过以下方式验证DeepL API是否正常工作：

#### 方法1: 浏览器控制台测试
1. 打开浏览器开发者工具 (F12)
2. 在控制台中运行: `testDeepL()`
3. 查看测试结果

#### 方法2: 访问测试页面
访问: `http://localhost:5002/translation-test`

#### 方法3: 检查网络请求
切换语言时，在网络面板中查看是否有到 `api.deepl.com` 的请求

## 📊 API 详情

### 当前配置
- **API密钥**: `a1885611-3d08-40c1-889a-dfaa129d54d6:fx` (付费版)
- **API端点**: `https://api.deepl.com/v2/translate`
- **服务状态**: ✅ 已启用
- **优先级**: 🥇 首选翻译服务

### 支持的语言
- 🇨🇳 中文简体 (ZH)
- 🇯🇵 日语 (JA)  
- 🇰🇷 韩语 (KO)
- 🇩🇪 德语 (DE)
- 🇫🇷 法语 (FR)
- 🇪🇸 西班牙语 (ES)
- 🇮🇹 意大利语 (IT)
- 🇵🇹 葡萄牙语 (PT)
- 🇷🇺 俄语 (RU)
- 🇳🇱 荷兰语 (NL)

## 🔧 功能特性

### 1. 自动翻译
```typescript
// 用户切换语言时自动翻译NFT内容
<MultilingualText
  text="Premium NFT Collection"
  autoTranslate={true}
  language="en"
/>
// 输出: "高级NFT收藏"
```

### 2. 智能缓存
- 翻译结果自动缓存7天
- 相同内容不会重复翻译
- 提高响应速度，节省API调用

### 3. 失败回退
```
DeepL (首选) → Microsoft Translator → MyMemory → LibreTranslate
```

### 4. 批量翻译
```typescript
// 批量翻译多个NFT标题
const titles = ['NFT 1', 'NFT 2', 'NFT 3'];
const translated = await translationService.translateBatch(titles, 'zh');
```

## 📈 使用监控

### 在浏览器控制台查看翻译日志:
```javascript
// 开启详细日志
localStorage.setItem('debug-translation', 'true');

// 查看翻译统计
console.log('翻译提供商:', translationService.getAvailableProviders());
```

### 监控API使用情况:
```javascript
// 查看DeepL使用情况 (需要付费版API)
testDeepL.getUsage();
```

## 🛠️ 故障排除

### 常见问题

#### 1. "process is not defined" 错误
✅ **已修复**: 使用 `import.meta.env` 代替 `process.env`

#### 2. API密钥无效
检查 `.env` 文件中的 `VITE_DEEPL_API_KEY` 是否正确

#### 3. 翻译失败
- 检查网络连接
- 查看浏览器控制台错误信息
- 验证API密钥是否有效

#### 4. 某些语言不支持
DeepL不支持的语言会自动使用备选服务

### 调试步骤

1. **检查环境变量**:
   ```bash
   cat .env | grep DEEPL
   ```

2. **检查服务状态**:
   ```javascript
   // 在浏览器控制台运行
   translationService.getAvailableProviders()
   ```

3. **测试API连接**:
   ```javascript
   // 在浏览器控制台运行
   testDeepL()
   ```

## 💡 最佳实践

### 1. 内容优化
- 使用简洁、清晰的原文
- 避免过长的文本（建议<500字符）
- 保持专业术语的一致性

### 2. 性能优化
- 启用缓存减少API调用
- 使用批量翻译处理多个项目
- 避免频繁切换语言

### 3. 用户体验
- 显示翻译状态指示器
- 提供手动翻译按钮
- 翻译失败时优雅降级

## 🔄 更新配置

如需更换API密钥或修改配置:

1. 更新 `.env` 文件:
   ```bash
   VITE_DEEPL_API_KEY=your_new_api_key
   ```

2. 重启开发服务器:
   ```bash
   npm run dev
   ```

3. 验证新配置:
   - 访问翻译测试页面
   - 检查浏览器控制台日志

## 📞 技术支持

### 获取帮助
- 📖 [DeepL API文档](https://www.deepl.com/docs-api)
- 🔧 [API状态页面](https://status.deepl.com/)
- 💬 [DeepL支持中心](https://support.deepl.com/)

### 本地调试
1. 查看浏览器开发者工具的网络面板
2. 检查控制台错误信息
3. 使用 `testDeepL()` 函数进行测试

---

**配置状态**: ✅ 完成  
**服务状态**: 🟢 运行中  
**推荐指数**: ⭐⭐⭐⭐⭐