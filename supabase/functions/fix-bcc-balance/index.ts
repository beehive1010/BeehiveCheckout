import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🔧 BCC Balance Fix Function启动成功!`)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()
    
    if (!walletAddress) {
      throw new Error('钱包地址缺失')
    }

    console.log(`🔧 修复BCC余额: ${walletAddress}`)

    // 1. 检查是否为激活会员
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('wallet_address, is_activated, current_level, activated_at')
      .eq('wallet_address', walletAddress)
      .eq('is_activated', true)
      .single()

    if (memberError || !member) {
      throw new Error('用户不是激活会员')
    }

    // 2. 检查当前BCC余额
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    console.log('当前余额:', currentBalance)

    // 3. 计算应有的BCC余额
    const initialBccLocked = 10450
    const initialBccTransferable = 500
    const level1UnlockBonus = 100
    
    const finalBccLocked = initialBccLocked - level1UnlockBonus
    const finalBccTransferable = initialBccTransferable + level1UnlockBonus

    // 4. 分配BCC余额
    const currentTime = new Date().toISOString()
    
    if (currentBalance) {
      // 更新现有余额
      await supabase
        .from('user_balances')
        .update({
          bcc_transferable: finalBccTransferable,
          bcc_locked: finalBccLocked,
          updated_at: currentTime
        })
        .eq('wallet_address', walletAddress)
      
      console.log(`✅ BCC余额已更新`)
    } else {
      // 创建新的余额记录
      await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress,
          bcc_transferable: finalBccTransferable,
          bcc_locked: finalBccLocked,
          bcc_restricted: 0,
          total_usdt_earned: 0,
          pending_rewards_usdt: 0,
          created_at: currentTime,
          updated_at: currentTime
        })
      
      console.log(`✅ BCC余额已创建`)
    }

    // 5. 记录交易日志
    await supabase
      .from('bcc_transactions')
      .insert({
        wallet_address: walletAddress,
        amount: finalBccTransferable + finalBccLocked,
        balance_type: 'activation_reward',
        transaction_type: 'reward',
        purpose: `Level ${member.current_level} 会员激活奖励补发: ${finalBccLocked} 锁仓 + ${finalBccTransferable} 可转账`,
        status: 'completed',
        created_at: currentTime,
        processed_at: currentTime,
        metadata: {
          fix_type: 'retroactive_allocation',
          initial_locked: initialBccLocked,
          initial_transferable: initialBccTransferable,
          unlock_bonus: level1UnlockBonus,
          final_locked: finalBccLocked,
          final_transferable: finalBccTransferable,
          activation_level: member.current_level,
          activated_at: member.activated_at
        }
      })

    console.log(`✅ BCC余额修复完成`)

    // 6. 返回最新余额
    const { data: newBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    return new Response(JSON.stringify({
      success: true,
      message: `BCC余额修复成功`,
      member: member,
      balance: newBalance,
      allocated: {
        transferable: finalBccTransferable,
        locked: finalBccLocked,
        total: finalBccTransferable + finalBccLocked
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('BCC余额修复错误:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})