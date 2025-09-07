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
      case 'activate-membership':
        result = await activateMembership(supabase, walletAddress);
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
  
  if (data.referrerWallet && data.referrerWallet !== ROOT_WALLET) {
    // 简单记录推荐人，不验证是否为激活会员（注册时还没有会员概念）
    referrerWallet = data.referrerWallet;
    console.log(`📝 记录推荐人: ${data.referrerWallet}（将在激活会员时验证）`);
  } else {
    console.log(`📝 使用默认推荐人（根用户）`);
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

// 激活会员身份函数
async function activateMembership(supabase, walletAddress) {
  console.log(`🚀 激活会员身份: ${walletAddress}`);

  try {
    // 1. 检查用户是否存在
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, email, current_level')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      throw new Error('用户不存在，无法激活会员身份');
    }

    // 2. 检查是否已经是会员
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, is_activated')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingMember && existingMember.is_activated) {
      return {
        success: true,
        action: 'already_activated',
        message: '会员身份已激活'
      };
    }

    // 3. 创建或更新members记录（根据database.types.ts结构）
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .upsert({
        wallet_address: walletAddress,
        is_activated: true,
        activated_at: new Date().toISOString(),
        current_level: 1,
        max_layer: 0,
        levels_owned: [1], // jsonb array
        total_direct_referrals: 0,
        total_team_size: 0,
        has_pending_rewards: false,
        upgrade_reminder_enabled: false
      })
      .select()
      .single();

    if (memberError) {
      console.error('创建会员记录失败:', memberError);
      throw new Error(`激活会员失败: ${memberError.message}`);
    }

    // 4. 如果有推荐者，创建推荐关系记录（使用referrals表）
    const referrerWallet = userData.referrer_wallet;
    if (referrerWallet && referrerWallet !== '0x0000000000000000000000000000000000000001') {
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          member_wallet: walletAddress,
          parent_wallet: referrerWallet,
          placer_wallet: referrerWallet,
          layer: 1, // 直接推荐为第1层
          position: '1', // 位置可以后续计算
          placement_type: 'direct',
          is_active: true
        });

      if (referralError) {
        console.warn('创建推荐关系失败，但会员激活成功:', referralError);
      } else {
        console.log(`✅ 创建推荐关系: ${referrerWallet} -> ${walletAddress}`);
        
        // 更新推荐人的直接推荐数量
        const { error: updateError } = await supabase
          .from('members')
          .update({ 
            total_direct_referrals: supabase.rpc('increment', { x: 1 }) 
          })
          .eq('wallet_address', referrerWallet);
          
        if (updateError) {
          console.warn('更新推荐人统计失败:', updateError);
        }
      }
    }

    console.log(`✅ 会员激活成功: ${walletAddress}`);
    
    return {
      success: true,
      action: 'activated',
      member: newMember,
      message: '会员身份激活成功'
    };

  } catch (error) {
    console.error('激活会员身份错误:', error);
    throw new Error(`激活失败: ${error.message}`);
  }
}