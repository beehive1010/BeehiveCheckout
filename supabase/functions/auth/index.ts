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
    .select('wallet_address')
    .eq('wallet_address', walletAddress)
    .single();

  if (existingUser) {
    return {
      success: false,
      action: 'exists',
      message: '用户已存在'
    };
  }

  // 设置默认推荐人为根用户
  const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
  let referrerWallet = ROOT_WALLET;
  
  if (data.referrerWallet && data.referrerWallet !== ROOT_WALLET) {
    // 检查推荐人是否存在
    const { data: referrer } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', data.referrerWallet)
      .single();
    
    if (referrer) {
      referrerWallet = data.referrerWallet;
      console.log(`✅ 有效推荐人: ${data.referrerWallet}`);
    } else {
      console.log(`⚠️ 推荐人无效，使用根用户: ${data.referrerWallet}`);
    }
  }

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
      current_level: 0,
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
      current_level,
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
    message: '用户信息获取成功'
  };
}