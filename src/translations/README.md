# 🌍 BEEHIVE V2 多语言翻译系统

## 📁 文件结构

```
src/translations/
├── _template.json          # 统一翻译键模板
├── en.json                # 英语翻译 (主要)
├── zh.json                # 简体中文翻译
├── zh-tw.json             # 繁体中文翻译
├── th.json                # 泰语翻译
├── ms.json                # 马来语翻译
├── ko.json                # 韩语翻译
├── ja.json                # 日语翻译
└── README.md              # 此文档
```

## 🔧 翻译键模板使用指南

### 1. 模板文件 (`_template.json`)

- **用途**: 标准化所有语言的翻译键结构
- **格式**: 所有键值为空字符串，仅定义结构
- **规则**: 所有语言文件必须包含模板中的所有键

### 2. 添加新翻译键

**步骤**:
1. 先在 `_template.json` 中添加新键
2. 更新 `en.json` (英语为主要语言)
3. 逐一更新其他语言文件

**示例**:
```json
// 1. 在 _template.json 中添加
{
  "common": {
    "newKey": ""
  }
}

// 2. 在 en.json 中添加翻译
{
  "common": {
    "newKey": "New Translation"
  }
}

// 3. 在 zh.json 中添加翻译
{
  "common": {
    "newKey": "新翻译"
  }
}
```

### 3. 翻译键命名规范

**结构**: `section.subsection.key`

**命名原则**:
- 使用小驼峰命名 (camelCase)
- 按功能模块分组
- 保持层级清晰
- 避免过深嵌套 (最多3层)

**示例**:
```json
{
  "dashboard": {
    "welcome": {
      "title": "欢迎",
      "subtitle": "欢迎来到仪表板"
    },
    "stats": {
      "totalUsers": "总用户数",
      "activeUsers": "活跃用户"
    }
  }
}
```

## 🌐 支持的语言

| 语言代码 | 语言名称 | 状态 | 完成度 | 翻译键数量 |
|---------|----------|------|--------|------------|
| `en` | English | ✅ 完整 | 100% | 1457/1457 |
| `zh` | 简体中文 | ✅ 很好 | 90% | 1305/1457 |
| `zh-tw` | 繁体中文 | ❌ 需大量工作 | 6% | 93/1457 |
| `th` | ไทย | ✅ 很好 | 90% | 1317/1457 |
| `ms` | Malay | ❌ 需大量工作 | 17% | 253/1457 |
| `ko` | 한국어 | ⚠️ 需更新 | 58% | 852/1457 |
| `ja` | 日本語 | ⚠️ 需更新 | 55% | 804/1457 |

**总计**: 1457 个翻译键 | **平均覆盖率**: 59%

## 🔄 使用方法

### 在组件中使用翻译

```tsx
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('dashboard.welcome.title')}</h1>
      <p>{t('dashboard.welcome.subtitle')}</p>
    </div>
  );
}
```

### 带参数的翻译

```tsx
// 翻译文件中
{
  "welcome": "欢迎回来, {username}!"
}

// 组件中使用
{t('welcome', { username: 'John' })}
// 输出: "欢迎回来, John!"
```

## 📋 新增翻译键检查清单

添加新翻译键时，请确保：

- [ ] 在 `_template.json` 中添加键结构
- [ ] 在 `en.json` 中添加英语翻译
- [ ] 在至少一个其他语言文件中添加翻译
- [ ] 测试翻译在组件中正常工作
- [ ] 检查翻译键命名是否符合规范
- [ ] 确认没有重复的键名

## 🛠️ 开发工具

### 检查翻译文件完整性

```bash
# 检查所有语言文件的翻译覆盖率和缺失键
node scripts/check-translations.cjs
```

### 重新生成模板文件

```bash
# 基于英文翻译文件重新生成模板
node scripts/generate-template.cjs
```

### 添加到package.json scripts

```bash
# 在package.json中添加便捷脚本
"scripts": {
  "check-translations": "node scripts/check-translations.cjs",
  "generate-template": "node scripts/generate-template.cjs"
}
```

## 🔍 常见问题

### Q: 为什么需要模板文件？
A: 模板文件确保所有语言文件具有相同的键结构，便于维护和同步。

### Q: 如何处理复数形式？
A: 在翻译键中使用描述性命名：
```json
{
  "user": "用户",
  "users": "用户们",
  "userCount": "{count} 个用户"
}
```

### Q: 如何处理长文本？
A: 将长文本分解为更小的键：
```json
{
  "terms": {
    "paragraph1": "第一段内容...",
    "paragraph2": "第二段内容...",
    "conclusion": "结论..."
  }
}
```

### Q: 翻译回退机制是什么？
A: 系统按以下顺序查找翻译：
1. 当前选择的语言
2. 英语 (默认语言)
3. 键名本身

## 📝 贡献指南

1. **添加新语言**: 复制 `_template.json` 并重命名为 `{language-code}.json`
2. **更新翻译**: 确保遵循键结构和命名规范
3. **测试**: 在本地测试所有翻译是否正常工作
4. **文档**: 更新此 README 中的语言支持表

## 🔗 相关文件

- `src/contexts/I18nContext.tsx` - 翻译上下文和逻辑
- `src/components/shared/LanguageSwitcher.tsx` - 语言选择器组件
- 各组件文件中的 `useI18n()` 使用示例

## 📊 翻译状态监控

系统会自动记录：
- 缺失的翻译键
- 未使用的翻译键
- 翻译回退使用情况

查看翻译状态：打开浏览器控制台，寻找以 "🌍" 开头的翻译相关日志。