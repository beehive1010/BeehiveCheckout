import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`更新的Auth函数启动成功! - 使用新的数据库结构`)

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
      case 'update-profile':
        result = await updateUserProfile(supabase, walletAddress, data);
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

// 用户注册函数 - 使用新的数据库流程
async function registerUser(supabase, walletAddress, data) {
  console.log(`👤 注册用户: ${walletAddress}`);
  
  try {
    // 使用数据库函数处理完整的用户注册流程
    const { data: registrationResult, error } = await supabase.rpc('process_user_registration', {
      p_wallet_address: walletAddress,
      p_username: data.username || `user_${walletAddress.slice(-6)}`,
      p_referrer_wallet: data.referrerWallet || data.referrer_wallet
    });

    if (error) {
      console.error('用户注册错误:', error);
      throw new Error(`注册失败: ${error.message}`);
    }

    const result = typeof registrationResult === 'string' ? JSON.parse(registrationResult) : registrationResult;
    
    if (!result.success) {
      throw new Error(result.message);
    }

    // 获取创建的用户信息
    const { data: userData } = await supabase
      .from('users')
      .select(`
        wallet_address,
        username,
        created_at
      `)
      .eq('wallet_address', walletAddress)
      .single();

    const { data: memberData } = await supabase
      .from('members')
      .select(`
        activation_sequence,
        current_level,
        referrer_wallet,
        created_at
      `)
      .eq('wallet_address', walletAddress)
      .single();

    console.log(`✅ 用户注册成功: ${walletAddress}, sequence: ${result.activation_sequence}`);
    
    return {
      success: true,
      action: result.action,
      user: userData,
      member: memberData,
      activation_sequence: result.activation_sequence,
      message: result.action === 'existing_user' ? '用户已存在' : '用户注册成功 - 请申领NFT激活会员身份'
    };

  } catch (error) {
    console.error('注册过程错误:', error);
    throw error;
  }
}

// 获取用户函数 - 使用新的数据库结构
async function getUser(supabase, walletAddress) {
  console.log(`👤 获取用户: ${walletAddress}`);

  // 获取用户基本信息
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      wallet_address,
      username,
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
        isRegistered: false,
        message: '用户不存在'
      };
    }
    throw new Error(`获取用户失败: ${userError.message}`);
  }

  // 获取会员信息（如果存在）
  const { data: memberData } = await supabase
    .from('members')
    .select(`
      activation_sequence,
      current_level,
      referrer_wallet,
      created_at
    `)
    .ilike('wallet_address', walletAddress)
    .single();

  // 获取用户余额信息
  const { data: balanceData } = await supabase
    .from('user_balances')
    .select(`
      available_balance,
      total_earned,
      bcc_balance,
      last_updated
    `)
    .eq('wallet_address', walletAddress)
    .single();

  // 如果是会员，获取推荐统计
  let referralStats = null;
  if (memberData) {
    const { data: directReferrals } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('referrer_wallet', walletAddress)
      .eq('is_direct_referral', true);

    const { data: matrixMembers } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('matrix_root_wallet', walletAddress);

    referralStats = {
      direct_referrals: directReferrals?.length || 0,
      matrix_members: matrixMembers?.length || 0
    };
  }

  const isMember = !!memberData && memberData.current_level > 0;
  
  console.log(`🔍 用户状态: member=${!!memberData}, level=${memberData?.current_level || 0}`);

  return {
    success: true,
    action: 'found',
    user: userData,
    member: memberData,
    balance: balanceData,
    referral_stats: referralStats,
    isRegistered: true,
    isMember,
    membershipLevel: memberData?.current_level || 0,
    canAccessReferrals: isMember,
    message: '用户信息获取成功'
  };
}

// 验证推荐人函数 - 使用新的数据库结构
async function validateReferrer(supabase, referrerWallet) {
  console.log(`🔍 验证推荐人: ${referrerWallet}`);
  
  if (!referrerWallet) {
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet address is required'
    };
  }
  
  // 检查推荐人是否为已注册用户
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('wallet_address, username')
    .ilike('wallet_address', referrerWallet)
    .single();
  
  if (userError || !userData) {
    console.log(`❌ 推荐人未注册: ${referrerWallet}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer is not a registered user'
    };
  }
  
  // 检查推荐人是否为激活会员
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('current_level, activation_sequence, wallet_address')
    .ilike('wallet_address', referrerWallet)
    .single();
  
  if (memberError || !memberData || memberData.current_level < 1) {
    console.log(`❌ 推荐人不是激活会员: ${referrerWallet}, level: ${memberData?.current_level || 0}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer is not an activated member (must have Level 1+ membership)'
    };
  }
  
  // 获取推荐人的推荐统计
  const { data: directReferrals } = await supabase
    .from('referrals')
    .select('member_wallet')
    .eq('referrer_wallet', referrerWallet)
    .eq('is_direct_referral', true);

  const { data: matrixMembers } = await supabase
    .from('referrals')
    .select('member_wallet')
    .eq('matrix_root_wallet', referrerWallet);
  
  console.log(`✅ 推荐人验证通过: ${referrerWallet}, level: ${memberData.current_level}, 直推: ${directReferrals?.length || 0}`);
  
  return {
    success: true,
    isValid: true,
    referrer: {
      wallet_address: userData.wallet_address,
      username: userData.username,
      current_level: memberData.current_level,
      activation_sequence: memberData.activation_sequence,
      direct_referrals_count: directReferrals?.length || 0,
      matrix_members_count: matrixMembers?.length || 0
    },
    message: 'Referrer is a valid activated member'
  };
}