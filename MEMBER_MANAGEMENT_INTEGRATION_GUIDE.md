# 成员管理功能集成指南

## 📋 概述

将成员管理功能（CREATE/UPDATE/DELETE）集成到现有的 `activate-membership` Edge Function。

## 🔧 修改步骤

### 1. 在 `activate-membership/index.ts` 顶部导入

```typescript
import {
  handleCreateMember,
  handleUpdateMember,
  handleDeleteMember,
  handleGetMemberInfo
} from './member-management.ts';
```

### 2. 在主 serve 函数中添加路由

在现有的 `action` 路由逻辑后添加（大约在第83行 `if (action === 'check-activation-status')` 之后）:

```typescript
// ============================================
// Member Management Actions
// ============================================

// Create Member
if (action === 'create-member') {
  try {
    const memberData = {
      wallet_address: data.wallet_address || walletAddress,
      username: data.username,
      referrer_wallet: data.referrer_wallet
    };

    const newMember = await handleCreateMember(supabase, memberData);

    return new Response(JSON.stringify({
      success: true,
      member: newMember
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Create member error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create member'
    }), {
      status: error instanceof Error && error.message.includes('already exists') ? 409 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update Member
if (action === 'update-member') {
  try {
    const updateData = {
      username: data.username,
      referrer_wallet: data.referrer_wallet
    };

    const updatedMember = await handleUpdateMember(supabase, walletAddress, updateData);

    return new Response(JSON.stringify({
      success: true,
      member: updatedMember
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Update member error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update member'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete Member
if (action === 'delete-member') {
  try {
    const result = await handleDeleteMember(supabase, walletAddress);

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Delete member error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete member'
    }), {
      status: error instanceof Error && error.message.includes('downline') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get Member Info (detailed)
if (action === 'get-member-info') {
  try {
    const memberInfo = await handleGetMemberInfo(supabase, walletAddress);

    return new Response(JSON.stringify({
      success: true,
      member: memberInfo
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Get member info error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get member info'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

### 3. 更新 corsHeaders 的 Allow-Methods

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS', // 添加 PUT 和 DELETE
}
```

## 📡 API使用示例

### 创建成员

```typescript
const { data, error } = await supabase.functions.invoke('activate-membership', {
  body: {
    action: 'create-member',
    wallet_address: '0x1234...',
    username: 'Alice',
    referrer_wallet: '0x5678...'
  }
});
```

### 更新成员

```typescript
const { data, error } = await supabase.functions.invoke('activate-membership', {
  body: {
    action: 'update-member',
    username: 'Bob'
  },
  headers: {
    'x-wallet-address': '0x1234...'
  }
});
```

### 删除成员

```typescript
const { data, error } = await supabase.functions.invoke('activate-membership', {
  body: {
    action: 'delete-member'
  },
  headers: {
    'x-wallet-address': '0x1234...'
  }
});
```

### 获取成员详情

```typescript
const { data, error } = await supabase.functions.invoke('activate-membership', {
  body: {
    action: 'get-member-info'
  },
  headers: {
    'x-wallet-address': '0x1234...'
  }
});
```

## 🎯 Frontend Hooks 使用

更新 `useMemberAPI.ts` 中的 Edge Function 调用：

```typescript
// 之前：
await supabase.functions.invoke('member-management/create', {...})

// 改为：
await supabase.functions.invoke('activate-membership', {
  body: { action: 'create-member', ... }
})
```

完整示例：

```typescript
export function useCreateMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberData: CreateMemberData) => {
      const { data, error } = await supabase.functions.invoke('activate-membership', {
        body: {
          action: 'create-member',
          ...memberData
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create member');

      return data.member;
    },
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Success', description: 'Member created successfully' });
    }
  });
}
```

## ✅ 优势总结

1. **单一入口**：所有成员相关操作都通过 `activate-membership`
2. **统一认证**：共享同一套认证逻辑
3. **代码复用**：共享 Supabase client、错误处理等
4. **更少维护**：只需管理一个Edge Function

## 📝 注意事项

1. `action` 参数必须正确传递
2. `wallet_address` 可以通过 header 或 body 传递
3. 删除操作会检查是否有下线成员
4. 创建成员时会自动计算matrix placement（如果提供referrer）
