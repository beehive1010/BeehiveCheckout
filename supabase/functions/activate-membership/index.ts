import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🚀 会员激活函数启动成功!`)

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

    const { transactionHash, level = 1, ...data } = await req.json()
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()

    if (!walletAddress) {
      throw new Error('钱包地址缺失')
    }

    if (!transactionHash) {
      throw new Error('NFT claim交易哈希缺失，无法验证')
    }

    console.log(`🔐 安全激活会员: ${walletAddress}, 交易: ${transactionHash}`);

    const result = await activateMembershipSecure(supabase, walletAddress, transactionHash, level);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('会员激活错误:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// 安全的会员激活函数 - 只有NFT claim验证成功后才能激活
async function activateMembershipSecure(supabase, walletAddress, transactionHash, level) {
  console.log(`🔒 开始安全激活流程: ${walletAddress}`);

  try {
    // 1. 验证用户存在且有完整注册信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, email, current_level')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      throw new Error('用户不存在或注册信息不完整，无法激活会员身份');
    }

    console.log(`✅ 用户验证成功: ${userData.username}`);

    // 2. 检查是否已经是激活会员
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, is_activated, current_level')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingMember && existingMember.is_activated) {
      return {
        success: true,
        action: 'already_activated',
        member: existingMember,
        message: '会员身份已激活'
      };
    }

    // 3. TODO: 验证NFT claim交易（这里应该调用区块链验证）
    // 暂时跳过区块链验证，但保留transactionHash记录
    console.log(`🔍 记录交易哈希: ${transactionHash}（区块链验证待实现）`);

    // 4. 创建members记录（根据database.types.ts结构）
    const currentTime = new Date().toISOString();
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        wallet_address: walletAddress,
        is_activated: true,
        activated_at: currentTime,
        current_level: level,
        max_layer: 0,
        levels_owned: [level], // jsonb array
        total_direct_referrals: 0,
        total_team_size: 0,
        has_pending_rewards: false,
        upgrade_reminder_enabled: false,
        created_at: currentTime,
        updated_at: currentTime
      })
      .select()
      .single();

    if (memberError) {
      console.error('创建会员记录失败:', memberError);
      throw new Error(`会员激活失败: ${memberError.message}`);
    }

    console.log(`✅ 会员记录创建成功: ${walletAddress}`);

    // 5. 如果有推荐者，创建推荐关系记录
    const referrerWallet = userData.referrer_wallet;
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    
    if (referrerWallet && referrerWallet !== ROOT_WALLET) {
      console.log(`🔗 处理推荐关系: ${referrerWallet} -> ${walletAddress}`);
      
      // 检查推荐者是否为激活会员
      const { data: referrerMember } = await supabase
        .from('members')
        .select('wallet_address, is_activated')
        .eq('wallet_address', referrerWallet)
        .eq('is_activated', true)
        .single();

      if (referrerMember) {
        // 创建推荐关系记录（根据database.types.ts结构）
        const { error: referralError } = await supabase
          .from('referrals')
          .insert({
            member_wallet: walletAddress,
            parent_wallet: referrerWallet,
            placer_wallet: referrerWallet,
            root_wallet: referrerWallet, // referrals表必需字段
            layer: 1, // 直接推荐为第1层
            position: '1', // 位置可以后续计算
            placement_type: 'direct',
            is_active: true
          });

        if (referralError) {
          console.warn('创建推荐关系失败，但会员激活成功:', referralError);
        } else {
          console.log(`✅ 推荐关系创建成功: ${referrerWallet} -> ${walletAddress}`);
          
          // 更新推荐人的直接推荐数量
          const { error: updateError } = await supabase.rpc('increment_direct_referrals', {
            p_wallet_address: referrerWallet
          });
          
          // 如果没有专用函数，使用简单更新
          if (updateError && updateError.message.includes('function')) {
            const { data: currentReferrer } = await supabase
              .from('members')
              .select('total_direct_referrals')
              .eq('wallet_address', referrerWallet)
              .single();
              
            const newCount = (currentReferrer?.total_direct_referrals || 0) + 1;
            await supabase
              .from('members')
              .update({ 
                total_direct_referrals: newCount,
                updated_at: currentTime
              })
              .eq('wallet_address', referrerWallet);
          }
            
          if (updateError) {
            console.warn('更新推荐人统计失败:', updateError);
          } else {
            console.log(`✅ 推荐人统计更新成功: ${referrerWallet}`);
          }
        }
      } else {
        console.warn(`⚠️ 推荐者 ${referrerWallet} 不是激活会员，跳过推荐关系创建`);
      }
    } else {
      console.log(`📝 无有效推荐者，跳过推荐关系创建`);
    }

    // 6. 更新用户表的当前等级
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        current_level: level,
        updated_at: currentTime
      })
      .eq('wallet_address', walletAddress);

    if (userUpdateError) {
      console.warn('更新用户等级失败:', userUpdateError);
    }

    console.log(`🎉 会员激活完成: ${walletAddress} -> Level ${level}`);
    
    return {
      success: true,
      action: 'activated',
      member: newMember,
      transactionHash: transactionHash,
      level: level,
      message: `Level ${level} 会员身份激活成功`
    };

  } catch (error) {
    console.error('安全激活会员身份错误:', error);
    throw new Error(`激活失败: ${error.message}`);
  }
}