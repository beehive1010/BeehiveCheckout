# 补充会员记录指南

## 目标
为钱包地址 `0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF` 补充所有缺失的数据库记录。

## 需要补充的记录

根据激活流程，以下记录是必需的：

1. **users** - 用户注册信息
2. **membership** - NFT 会员资格记录
3. **members** - 会员激活状态
4. **referrals** - 推荐关系记录
5. **member_balances** - 会员余额记录
6. **matrix_slots** - 矩阵位置记录

## 执行步骤

### 方法 1: 使用 Supabase Dashboard

1. 登录到 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 "SQL Editor"
4. 点击 "New query" 创建新查询
5. 复制 `check_and_fix_member.sql` 文件的内容
6. 粘贴到查询编辑器
7. 点击 "Run" 执行脚本

### 方法 2: 使用 psql 命令行

如果你有 Supabase 数据库的直接连接权限：

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f check_and_fix_member.sql
```

### 方法 3: 使用 Supabase CLI

```bash
supabase db execute -f check_and_fix_member.sql
```

## 脚本功能

该脚本会：

1. ✅ **检查现有记录** - 对每个表进行检查
2. 📝 **补充缺失记录** - 只创建不存在的记录
3. 🔄 **更新激活状态** - 确保 members 表的激活状态正确
4. 🎯 **矩阵放置** - 调用 `recursive_matrix_placement` 函数进行矩阵放置
5. 📊 **显示最终状态** - 输出所有表的记录状态

## 脚本输出

执行后你会看到类似以下的输出：

```
🔍 开始检查钱包地址: 0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF
🔗 推荐人地址: 0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0

✅ users 表记录已存在
✅ membership 表记录已创建
✅ members 表记录已创建 (activation_sequence: 123)
✅ referrals 表记录已创建
✅ member_balances 表记录已创建
✅ 矩阵放置完成

========================================
📊 最终记录状态检查:
========================================
users 表:
  ✅ 存在
membership 表 (Level 1):
  ✅ 存在
members 表:
  ✅ 存在
referrals 表:
  ✅ 存在
member_balances 表:
  ✅ 存在
matrix_slots 表:
  ✅ 存在

✅ 所有记录检查和补充完成！
```

## 验证结果

脚本执行后会自动显示一个汇总查询结果，包含：

1. 用户信息
2. Membership 记录
3. 会员记录
4. 推荐关系
5. 余额记录
6. 矩阵位置

## 重要信息

- **钱包地址**: `0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF`
- **推荐人**: `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0`
- **用户名**: `Test1LA`
- **激活等级**: Level 1
- **NFT Level**: 1

## 注意事项

1. 脚本使用 `ON CONFLICT DO NOTHING` 避免重复插入
2. 脚本会保持现有记录不变，只补充缺失的部分
3. 对于 members 表，如果记录已存在，会更新激活状态
4. 矩阵放置函数可能会因为记录已存在而报错，这是正常的

## 故障排除

### 如果矩阵放置失败

矩阵放置失败通常是因为：
- 记录已经存在
- 推荐人不存在或未激活

可以手动检查：

```sql
SELECT * FROM matrix_slots
WHERE member_wallet ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF';
```

### 如果某个表的记录创建失败

可以单独执行该表的插入语句，检查具体错误信息。

## 后续操作

执行完脚本后，建议：

1. 刷新应用页面
2. 检查 Dashboard 是否显示正确
3. 验证矩阵位置是否正确
4. 检查推荐关系是否建立

## 联系支持

如果遇到问题，请提供：
- 脚本执行的完整输出
- 任何错误信息
- 钱包地址和推荐人地址
