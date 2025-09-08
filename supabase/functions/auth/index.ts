import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`简化的Auth函数启动成功!`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建Supabase客户端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    const { action, ...data } = await req.json()
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()

    if (!walletAddress) {
      throw new Error('钱包地址缺失')
    }

    console.log(`📞 Auth请求: ${action} - 钱包: ${walletAddress}`);

    let result;
    switch (action) {
      case 'register':
        result = await registerUser(supabase, walletAddress, data);
        break;
      case 'get-user':
        result = await getUser(supabase, walletAddress);
        break;
      // activate-membership功能已移除 - 只能通过NFT claim验证后激活
      default:
        throw new Error(`未知操作: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Auth函数错误:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// 简单的用户注册函数
async function registerUser(supabase, walletAddress, data) {
  console.log(`👤 注册用户: ${walletAddress}`);
  
  // 检查用户是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select(`
      wallet_address,
      referrer_wallet,
      username,
      email,
      is_upgraded,
      upgrade_timer_enabled,
      created_at,
      updated_at
    `)
    .eq('wallet_address', walletAddress)
    .single();

  if (existingUser) {
    // 隐藏根钱包地址
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    const sanitizedUser = {
      ...existingUser,
      referrer_wallet: existingUser?.referrer_wallet === ROOT_WALLET ? null : existingUser?.referrer_wallet,
    };

    return {
      success: true,
      action: 'exists',
      user: sanitizedUser,
      message: '用户已存在'
    };
  }

  // 处理推荐人信息（只记录在users表，不操作members/referrals表）
  const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
  let referrerWallet = ROOT_WALLET;
  
  // 修复：正确处理推荐人参数，确保参数传递正确
  const inputReferrer = data.referrerWallet || data.referrer_wallet;
  if (inputReferrer && inputReferrer !== ROOT_WALLET) {
    referrerWallet = inputReferrer.toLowerCase(); // 确保小写  
    console.log(`📝 正在记录推荐人: ${inputReferrer} -> ${referrerWallet}`);
  } else {
    console.log(`📝 使用默认推荐人（根用户），输入推荐人: ${inputReferrer}`);
  }
  
  console.log(`🔍 最终推荐人地址: ${referrerWallet}`);

  // 生成用户名（如果未提供）
  let username = data.username;
  if (!username) {
    const timestamp = Date.now();
    username = `user_${walletAddress.slice(-6)}_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // 创建用户记录
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      wallet_address: walletAddress,
      referrer_wallet: referrerWallet,
      username: username,
      email: data.email || null,
      is_upgraded: false,
      upgrade_timer_enabled: false
    })
    .select()
    .single();

  if (userError) {
    console.error('用户创建错误:', userError);
    throw new Error(`注册失败: ${userError.message}`);
  }

  console.log(`✅ 用户注册成功: ${walletAddress}`);
  
  return {
    success: true,
    action: 'created',
    user: newUser,
    message: '用户注册成功 - 请申领Level 1 NFT激活会员身份'
  };
}

// 简单的获取用户函数
async function getUser(supabase, walletAddress) {
  console.log(`👤 获取用户: ${walletAddress}`);

  // 只从users表获取基本信息
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      wallet_address,
      referrer_wallet,
      username,
      email,
      is_upgraded,
      upgrade_timer_enabled,
      created_at,
      updated_at
    `)
    .eq('wallet_address', walletAddress)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') {
      return {
        success: false,
        action: 'not_found',
        isRegistered: false, // 用户不存在，未注册
        message: '用户不存在'
      };
    }
    throw new Error(`获取用户失败: ${userError.message}`);
  }

  // 隐藏根钱包地址
  const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
  const sanitizedUser = {
    ...userData,
    referrer_wallet: userData?.referrer_wallet === ROOT_WALLET ? null : userData?.referrer_wallet,
  };

  return {
    success: true,
    action: 'found',
    user: sanitizedUser,
    isRegistered: true, // 用户存在就表示已注册
    message: '用户信息获取成功'
  };
}

// 
// ⚠️ SECURITY: activate-membership功能已禁用
// 只能通过NFT claim transaction验证后才能激活会员身份
// 绝对不允许空插入members表
//