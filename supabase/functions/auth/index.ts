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
    const walletAddress = req.headers.get('x-wallet-address')

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
      case 'validate-referrer':
        result = await validateReferrer(supabase, data.referrerWallet);
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
  
  // 检查用户是否已存在（使用大小写不敏感查询）
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
    .ilike('wallet_address', walletAddress)
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
    // 验证推荐人是否为激活会员 - CRITICAL: This ensures chain sync only happens for registered users with valid referrers
    const referrerValidation = await validateReferrer(supabase, inputReferrer);
    if (!referrerValidation.isValid) {
      throw new Error(`Invalid referrer: ${referrerValidation.error} - Chain synchronization requires valid activated member as referrer`);
    }
    
    referrerWallet = inputReferrer; // 保持原始大小写  
    console.log(`📝 推荐人验证通过，正在记录: ${inputReferrer} -> ${referrerWallet}`);
  } else {
    throw new Error('Valid activated member referrer is required for registration before any chain synchronization can occur');
  }
  
  console.log(`🔍 最终推荐人地址: ${referrerWallet}`);

  // 确保不能自我推荐（比较时使用小写，但存储保持原始大小写）
  if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
    throw new Error('Self-referral is not allowed');
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

  // 只从users表获取基本信息（使用大小写不敏感查询）
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
    .ilike('wallet_address', walletAddress)
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

  // 检查用户是否为激活会员 - 快速数据库检查（使用大小写不敏感查询）
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('current_level')
    .ilike('wallet_address', walletAddress)
    .single();
  
  // 如果用户在members表中存在且有等级，则视为激活会员
  const isMember = !!memberData && memberData.current_level > 0;
  const membershipLevel = memberData?.current_level || 0;
  
  console.log(`🔍 会员状态检查 ${walletAddress}: member=${!!memberData}, level=${membershipLevel}, error=${memberError?.code}`);

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
    isMember, // 关键：返回会员激活状态
    membershipLevel,
    canAccessReferrals: isMember, // 激活会员可访问推荐功能
    message: '用户信息获取成功'
  };
}

// 验证推荐人是否为激活会员
async function validateReferrer(supabase, referrerWallet) {
  console.log(`🔍 验证推荐人: ${referrerWallet}`);
  
  if (!referrerWallet) {
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet address is required'
    };
  }
  
  // 首先检查推荐人是否为已注册用户（使用小写比较但保持原始大小写）
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('wallet_address, username')
    .ilike('wallet_address', referrerWallet) // 使用 ilike 进行大小写不敏感查询
    .single();
  
  if (userError || !userData) {
    console.log(`❌ 推荐人未注册: ${referrerWallet}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer is not a registered user'
    };
  }
  
  // CRITICAL: 检查推荐人是否为激活会员（必须在members表中且current_level > 0）
  // This is essential for chain synchronization - only activated members can refer new users
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('current_level, wallet_address')
    .ilike('wallet_address', referrerWallet) // 使用 ilike 进行大小写不敏感查询
    .single();
  
  if (memberError || !memberData || memberData.current_level < 1) {
    console.log(`❌ 推荐人不是激活会员: ${referrerWallet}, level: ${memberData?.current_level || 0}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer is not an activated member (must have Level 1+ membership). Chain sync and activation require activated member referrers only.'
    };
  }
  
  console.log(`✅ 推荐人验证通过: ${referrerWallet}, level: ${memberData.current_level}`);
  
  return {
    success: true,
    isValid: true,
    referrer: {
      wallet_address: userData.wallet_address, // 返回数据库中的原始大小写地址
      username: userData.username,
      current_level: memberData.current_level
    },
    message: 'Referrer is a valid activated member'
  };
}

// 
// ⚠️ SECURITY: activate-membership功能已禁用
// 只能通过NFT claim transaction验证后才能激活会员身份
// 绝对不允许空插入members表
//