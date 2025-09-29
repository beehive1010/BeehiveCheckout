# BEEHIVE 项目文件结构

## 📁 核心项目文件
项目根目录现在只保留基础配置文件：

```
/
├── package.json           # 项目依赖和脚本配置
├── tsconfig.json         # TypeScript配置
├── tailwind.config.ts    # Tailwind CSS配置
├── vite.config.ts        # Vite构建配置
├── postcss.config.js     # PostCSS配置
├── components.json       # UI组件配置
├── drizzle.config.ts     # 数据库ORM配置
├── vercel.json          # Vercel部署配置
├── .env.example         # 环境变量模板
├── .gitignore           # Git忽略文件
├── .eslintrc.json       # ESLint配置
├── LICENSE              # 许可证
└── index.html           # 应用入口
```

## 📚 文档目录 (`/docs/`)

### `/docs/api/`
- `API_DOCUMENTATION_SETUP.md` - API文档设置指南
- `THIRDWEB_WEBHOOK_SETUP.md` - Thirdweb Webhook配置指南

### `/docs/setup/`
- `FUNCTION_REORGANIZATION_PLAN.md` - 功能重组计划
- `REORGANIZATION_SUMMARY.md` - 重组总结
- `WELCOME_MEMBERSHIP_INTEGRATION.md` - 欢迎页面会员集成
- `translations_additions.json` - 翻译补充

### `/docs/audit/`
- `AUDIT_QUICK_START.md` - 快速审计指南
- `COMPREHENSIVE_BUG_REPORT.md` - 综合Bug报告
- `DATA_CONSISTENCY_REPORT.md` - 数据一致性报告
- `FINAL_WEBHOOK_STATUS.md` - Webhook最终状态

### `/docs/analysis/`
- `bugsfixTask.md` - Bug修复任务计划
- `typescript-analysis.md` - TypeScript分析报告
- `replit.md` - Replit相关文档
- `codebase-rules.md` - 代码库规则

## 🔧 脚本目录 (`/scripts/`)

### `/scripts/sql/`
- `backup-2025-09-09.sql` - 数据库备份
- `fix_complete_matrix_placement.sql` - 矩阵位置修复
- `fix_correct_spillover_placement.sql` - 溢出位置修复  
- `fix_layer2_position_distribution.sql` - Layer2位置分配修复
- `fix_missing_direct_referrals.sql` - 直推关系修复
- `fix_remaining_spillover.sql` - 剩余溢出修复
- `fix_wallet_case_queries.sql` - 钱包大小写查询修复

### `/scripts/shell/`
- `deploy-webhook.sh` - Webhook部署脚本
- `test-complete-flow.sh` - 完整流程测试
- `test-complete-webhook.sh` - Webhook完整测试
- `verify-webhook-delivery.sh` - Webhook交付验证
- `test-data-consistency.js` - 数据一致性测试
- `test-webhook.js` - Webhook测试

### `/scripts/python/`
- `update_edge_functions.py` - Edge Functions更新脚本

### `/scripts/`
- `ACTIVATE_MEMBERSHIP_SIMPLIFIED.ts` - 简化的会员激活脚本

## 🏗️ 应用目录

### `/src/` - 源代码
### `/public/` - 静态资源
### `/supabase/` - Supabase配置和函数
### `/types/` - TypeScript类型定义
### `/tests/` - 测试文件
### `/db/` - 数据库相关文件
### `/@types/` - 全局类型定义

## 📦 依赖和构建

### `/node_modules/` - NPM依赖包
### `/dist/` - 构建输出 (生成时)

## 💡 整理原则

1. **根目录简洁**: 只保留核心配置文件
2. **分类明确**: 文档、脚本、源码分离
3. **命名规范**: 使用英文且具有描述性的目录名
4. **层次清晰**: 文档和脚本按功能进一步分类

## 🚀 快速导航

- 📖 查看API文档: `docs/api/`
- 🔧 运行脚本: `scripts/`
- 🐛 查看Bug报告: `docs/audit/COMPREHENSIVE_BUG_REPORT.md`
- 📋 查看任务计划: `docs/analysis/bugsfixTask.md`
- ⚙️ 环境配置: `.env.example`