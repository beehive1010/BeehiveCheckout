# MobileMatrixView Search & Filter Feature

**功能**: 为 MobileMatrixView 组件添加搜索和过滤功能
**完成时间**: 2025-10-19
**适配**: 移动端和桌面端
**多语言**: 支持 7 种语言

---

## 🎯 功能概述

为 MobileMatrixView 组件添加了完整的搜索和过滤功能，允许用户快速找到特定的 matrix 成员。

### 核心功能

1. **搜索栏** - 按用户名或钱包地址搜索
2. **类型过滤器** - 按推荐类型过滤 (Direct/Spillover)
3. **等级过滤器** - 按会员等级过滤 (Level 1/2/3)
4. **实时过滤** - 即时显示过滤结果
5. **过滤状态提示** - 显示当前激活的过滤器和结果数量
6. **清除功能** - 一键清除所有过滤器

---

## 📱 UI 设计

### 搜索栏

```
┌──────────────────────────────────────────┐
│ 🔍 Search by username or wallet...    ✕ │
└──────────────────────────────────────────┘
```

- 左侧: 搜索图标
- 中间: 输入框
- 右侧: 清除按钮（有输入时显示）
- 移动端优化: 小字体、紧凑间距
- 实时搜索: 输入时立即过滤

### 过滤器按钮

```
┌──────────────────────────────┬────┐
│ 🔽 Filters              [2]  │ ✕  │
└──────────────────────────────┴────┘
```

- 左侧: 过滤器按钮（显示激活数量）
- 右侧: 清除所有过滤器按钮（有过滤器时显示）

### 过滤选项（展开时）

```
┌─────────────────────────────────────┐
│ Filter by Type                      │
│ ┌─────────────────────────────────┐ │
│ │ All                           ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Filter by Level                     │
│ ┌─────────────────────────────────┐ │
│ │ All                           ▼ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 激活的过滤器摘要（折叠时）

```
Active filters: ["user_5"] [Direct] [Level 2]
```

### 过滤结果提示

```
Showing 2 of 3 members
```

或

```
No results found
```

### Matrix 节点过滤显示

被过滤掉的节点显示为半透明遮罩：

```
┌─────────────┐
│             │
│   🔽 Filtered│
│             │
└─────────────┘
```

---

## 🛠️ 技术实现

### 组件修改

**文件**: `src/components/matrix/MobileMatrixView.tsx`

#### 新增状态

```typescript
// Search and filter states
const [searchQuery, setSearchQuery] = useState<string>('');
const [filterType, setFilterType] = useState<string>('all'); // all, direct, spillover
const [filterLevel, setFilterLevel] = useState<string>('all'); // all, 1, 2, 3
const [showFilters, setShowFilters] = useState<boolean>(false);
```

#### 过滤逻辑

```typescript
const filteredMatrix = useMemo(() => {
  if (!currentMatrix || currentMatrix.length === 0) return currentMatrix;

  return currentMatrix.filter(node => {
    if (!node.member) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const username = node.member.username?.toLowerCase() || '';
      const wallet = node.member.wallet.toLowerCase();

      if (!username.includes(query) && !wallet.includes(query)) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all') {
      const isDirect = node.member.type === 'is_direct';
      if (filterType === 'direct' && !isDirect) return false;
      if (filterType === 'spillover' && isDirect) return false;
    }

    // Level filter
    if (filterLevel !== 'all') {
      const level = node.member.level;
      if (String(level) !== filterLevel) return false;
    }

    return true;
  });
}, [currentMatrix, searchQuery, filterType, filterLevel]);
```

#### 清除过滤器

```typescript
const clearFilters = () => {
  setSearchQuery('');
  setFilterType('all');
  setFilterLevel('all');
};
```

---

## 🌍 多语言支持

### 新增翻译键

| 键名 | 英文 | 中文简体 | 中文繁體 |
|------|------|----------|----------|
| `matrix.searchPlaceholder` | Search by username or wallet... | 按用户名或钱包地址搜索... | 按用戶名或錢包地址搜尋... |
| `matrix.filters` | Filters | 筛选器 | 篩選器 |
| `matrix.filterByType` | Filter by Type | 按类型筛选 | 按類型篩選 |
| `matrix.filterByLevel` | Filter by Level | 按等级筛选 | 按等級篩選 |
| `matrix.filterAll` | All | 全部 | 全部 |
| `matrix.activeFilters` | Active filters | 激活的筛选 | 激活的篩選 |
| `matrix.noResultsFound` | No results found | 未找到结果 | 未找到結果 |
| `matrix.showingResults` | Showing {{count}} of {{total}} members | 显示 {{count}}/{{total}} 个成员 | 顯示 {{count}}/{{total}} 個成員 |
| `matrix.showingAllResults` | Showing all {{count}} members | 显示全部 {{count}} 个成员 | 顯示全部 {{count}} 個成員 |
| `matrix.filteredOut` | Filtered | 已筛选 | 已篩選 |

### 支持的语言

- ✅ English (en)
- ✅ 中文简体 (zh)
- ✅ 中文繁體 (zh-tw)
- ✅ ไทย (th)
- ✅ Bahasa Malaysia (ms)
- ✅ 한국어 (ko)
- ✅ 日本語 (ja)

### 翻译文件

**Migration**: `supabase/migrations/20251019140000_add_matrix_search_filter_translations.sql`

```sql
INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES
  ('matrix.searchPlaceholder', 'en', 'Search by username or wallet...', 'matrix', NOW(), NOW()),
  -- ... more translations
ON CONFLICT (translation_key, language_code)
DO UPDATE SET
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();
```

---

## 🎨 样式适配

### 移动端优化

- **搜索栏高度**: 36px (h-9)
- **字体大小**: 12px (text-xs)
- **图标大小**: 16px (w-4 h-4)
- **间距**: 12px (gap-3)
- **内边距**: 12px (p-3)

### 桌面端样式

- **搜索栏高度**: 40px (h-10)
- **字体大小**: 14px (text-sm)
- **图标大小**: 20px (w-5 h-5)
- **间距**: 16px (gap-4)
- **内边距**: 16px (p-4)

### 颜色方案

- **背景**: `bg-black/50` - 半透明黑色
- **边框**: `border-yellow-500/30` - 半透明黄色边框
- **文字**: `text-white` - 白色
- **占位符**: `text-gray-400` - 灰色
- **焦点**: `focus:border-yellow-500` - 黄色边框
- **过滤器徽章**: `bg-yellow-500 text-black` - 黄色背景黑色文字

---

## 📊 使用示例

### 场景 1: 搜索用户

**操作**:
1. 用户在搜索框输入 "user_5"
2. 系统实时过滤 matrix 节点
3. 只显示用户名包含 "user_5" 的成员

**结果**:
```
Showing 1 of 3 members

┌──────────┐  ┌──────────┐  ┌──────────┐
│  user_5  │  │ Filtered │  │ Filtered │
└──────────┘  └──────────┘  └──────────┘
```

### 场景 2: 按类型过滤

**操作**:
1. 点击 "Filters" 按钮
2. 选择 "Filter by Type: Direct"
3. 系统只显示直接推荐的成员

**结果**:
```
Active filters: [Direct]
Showing 1 of 3 members
```

### 场景 3: 组合过滤

**操作**:
1. 搜索: "0x5B3"
2. 类型: Direct
3. 等级: Level 1

**结果**:
```
Active filters: ["0x5B3"] [Direct] [Level 1]
Showing 1 of 3 members
```

### 场景 4: 无结果

**操作**:
1. 搜索不存在的用户名
2. 系统显示无结果提示

**结果**:
```
No results found

┌──────────┐  ┌──────────┐  ┌──────────┐
│ Filtered │  │ Filtered │  │ Filtered │
└──────────┘  └──────────┘  └──────────┘
```

---

## 🔧 新增 UI 组件

### Select Component

使用 shadcn/ui 的 Select 组件：

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
```

### Input Component

使用 shadcn/ui 的 Input 组件：

```typescript
import { Input } from '../ui/input';
```

### Icons

新增 Lucide 图标：

```typescript
import {
  Search,    // 搜索图标
  Filter,    // 过滤器图标
  X          // 清除图标
} from 'lucide-react';
```

---

## 📈 性能优化

### useMemo 优化

过滤逻辑使用 `useMemo` 缓存：

```typescript
const filteredMatrix = useMemo(() => {
  // 过滤逻辑
}, [currentMatrix, searchQuery, filterType, filterLevel]);
```

**好处**:
- 避免每次渲染都重新过滤
- 只在依赖项变化时重新计算
- 提高性能，特别是在大量数据时

### 实时搜索

搜索框使用 `onChange` 事件实时更新：

```typescript
<Input
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

**好处**:
- 即时反馈
- 无需点击搜索按钮
- 更好的用户体验

---

## 🧪 测试建议

### 测试场景

1. **搜索功能**
   - ✅ 输入用户名，验证过滤结果
   - ✅ 输入钱包地址，验证过滤结果
   - ✅ 输入不存在的内容，验证"无结果"提示
   - ✅ 清除搜索，验证显示所有成员

2. **类型过滤**
   - ✅ 选择 "Direct"，验证只显示直接推荐
   - ✅ 选择 "Spillover"，验证只显示溢出推荐
   - ✅ 选择 "All"，验证显示所有成员

3. **等级过滤**
   - ✅ 选择 "Level 1"，验证只显示 Level 1 成员
   - ✅ 选择 "Level 2"，验证只显示 Level 2 成员
   - ✅ 选择 "All"，验证显示所有等级

4. **组合过滤**
   - ✅ 搜索 + 类型过滤
   - ✅ 搜索 + 等级过滤
   - ✅ 类型 + 等级过滤
   - ✅ 搜索 + 类型 + 等级

5. **UI 交互**
   - ✅ 点击 "Filters" 按钮，验证展开/收起
   - ✅ 点击清除按钮，验证清除所有过滤器
   - ✅ 查看过滤器计数徽章
   - ✅ 查看激活的过滤器摘要

6. **多语言**
   - ✅ 切换到中文简体，验证翻译
   - ✅ 切换到中文繁體，验证翻译
   - ✅ 切换到泰语，验证翻译
   - ✅ 切换到其他语言，验证翻译

7. **移动端适配**
   - ✅ 在移动设备上测试 UI
   - ✅ 验证触摸交互
   - ✅ 验证字体大小和间距
   - ✅ 验证响应式布局

---

## 📝 修改的文件

### 组件文件

1. **`src/components/matrix/MobileMatrixView.tsx`**
   - 添加搜索和过滤状态
   - 实现过滤逻辑
   - 添加搜索和过滤 UI
   - 更新 Matrix Grid 显示过滤结果
   - 添加过滤状态提示

### 数据库迁移

2. **`supabase/migrations/20251019140000_add_matrix_search_filter_translations.sql`**
   - 添加 70 条翻译记录（10 个键 × 7 种语言）
   - 支持冲突时更新（ON CONFLICT）

---

## 🎉 功能亮点

### 1. 实时搜索

无需点击按钮，输入时立即看到结果。

### 2. 智能过滤

支持多条件组合过滤，满足各种查找需求。

### 3. 视觉反馈

- 过滤器计数徽章
- 激活的过滤器摘要
- 过滤结果提示
- 被过滤节点的遮罩显示

### 4. 移动端优化

完全适配移动设备，触摸友好。

### 5. 多语言支持

支持 7 种语言，自动切换。

### 6. 性能优化

使用 useMemo 缓存过滤结果，避免不必要的计算。

---

## 🚀 未来改进

### 可能的增强功能

1. **高级搜索**
   - 支持正则表达式
   - 支持模糊搜索
   - 支持多条件搜索

2. **保存过滤器**
   - 保存常用过滤器配置
   - 一键应用保存的过滤器

3. **导出功能**
   - 导出过滤结果为 CSV
   - 导出过滤结果为 PDF

4. **批量操作**
   - 选择过滤后的成员
   - 批量发送消息
   - 批量操作

5. **统计信息**
   - 显示过滤结果的统计数据
   - 图表展示分布情况

---

**完成者**: Claude Code
**完成时间**: 2025-10-19
**状态**: ✅ **已完成并测试**

---

## 📋 检查清单

- [x] ✅ 添加搜索功能
- [x] ✅ 添加类型过滤器
- [x] ✅ 添加等级过滤器
- [x] ✅ 实现过滤逻辑
- [x] ✅ 添加清除功能
- [x] ✅ 添加过滤状态提示
- [x] ✅ 移动端优化
- [x] ✅ 添加翻译键（7 种语言）
- [x] ✅ 更新数据库
- [x] ✅ 创建文档
