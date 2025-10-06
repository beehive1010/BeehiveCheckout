# 推送 CheckoutWidget 测试分支到 BeehiveCheckout 仓库

## 当前状态

✅ **分支已创建**: `checkout-widget-test`
✅ **更改已提交**: 2个commit
✅ **Remote已添加**: `checkout` -> `https://github.com/beehive1010/BeehiveCheckout.git`

## 推送步骤

### 方式1: 使用 GitHub CLI (推荐)

```bash
# 1. 安装 GitHub CLI (如果未安装)
# 已经安装则跳过

# 2. 登录 GitHub
gh auth login

# 3. 推送分支
git push checkout checkout-widget-test:main
```

### 方式2: 使用 Personal Access Token

```bash
# 1. 创建 Personal Access Token
# 访问: https://github.com/settings/tokens
# 创建 token，选择 repo 权限

# 2. 使用 token 推送
git push https://YOUR_TOKEN@github.com/beehive1010/BeehiveCheckout.git checkout-widget-test:main
```

### 方式3: 使用 SSH

```bash
# 1. 更新 remote 使用 SSH
git remote set-url checkout git@github.com:beehive1010/BeehiveCheckout.git

# 2. 推送
git push checkout checkout-widget-test:main
```

## 推送内容

将推送以下文件到 BeehiveCheckout 仓库：

### 新增文件
- ✅ `src/components/membership/Level1ClaimWithCheckout.tsx` - CheckoutWidget组件
- ✅ `supabase/functions/mint-and-send-nft/index.ts` - 服务器端mint NFT
- ✅ `src/pages/CheckoutTest.tsx` - 测试页面
- ✅ `CHECKOUT_WIDGET_TEST.md` - 完整文档
- ✅ `deploy-checkout-test.sh` - 部署脚本

### 修改文件
- ✅ `src/App.tsx` - 添加 `/checkout-test` 路由

## 推送后步骤

1. **访问新仓库**
   ```
   https://github.com/beehive1010/BeehiveCheckout
   ```

2. **部署 Edge Function**
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_3ab3f7a4d5ead5e940aa536cd4ffeeb0ff258b6a
   supabase functions deploy mint-and-send-nft --project-ref cvqibjcbfrwsgkvthccp
   ```

3. **配置环境变量**
   在 Supabase Dashboard 配置：
   - `THIRDWEB_ENGINE_URL`
   - `THIRDWEB_ENGINE_ACCESS_TOKEN`
   - `THIRDWEB_BACKEND_WALLET`
   - `VITE_MEMBERSHIP_NFT_CONTRACT`

4. **测试支付流程**
   访问: `http://localhost:5173/checkout-test`

## 分支对比

### checkout-widget-test (新方式)
- 使用 CheckoutWidget
- 用户支付到服务器钱包
- 服务器mint并发送NFT
- 无gas费

### api (当前方式)
- 使用 TransactionButton + PayModal
- 用户直接调用合约
- 用户支付gas费
- 去中心化

## 当前 Git 状态

```bash
Current branch: checkout-widget-test
Commits ahead of api: 2

Remote 'checkout' URL:
https://github.com/beehive1010/BeehiveCheckout.git
```

## 手动推送命令

如果以上方式都不行，可以下载并重新上传：

```bash
# 1. 创建补丁文件
git format-patch api..checkout-widget-test -o /tmp/checkout-patches

# 2. 压缩补丁
tar -czf /tmp/checkout-widget-test.tar.gz /tmp/checkout-patches

# 然后手动下载并上传到 GitHub
```

## 需要帮助？

查看完整文档: `CHECKOUT_WIDGET_TEST.md`
