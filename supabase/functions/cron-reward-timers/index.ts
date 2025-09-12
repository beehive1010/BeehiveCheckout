import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🕒 Cron Reward Timers函数启动成功!')

serve(async (req) => {
  // Handle CORS
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
        }
      }
    )

    console.log('⏰ 开始处理奖励倒计时...')

    // 调用数据库函数处理过期的倒计时
    const { data: timerResult, error: timerError } = await supabase.rpc('process_expired_timers')

    if (timerError) {
      console.error('倒计时处理错误:', timerError)
      throw timerError
    }

    console.log('倒计时处理结果:', timerResult)

    // 获取即将到期的奖励进行通知
    const { data: upcomingTimers, error: upcomingError } = await supabase
      .from('reward_timers')
      .select(`
        id,
        recipient_wallet,
        timer_type,
        expires_at,
        layer_rewards!inner(reward_amount)
      `)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // 24小时内到期
      .eq('notification_sent', false)

    if (upcomingError) {
      console.error('获取即将到期倒计时错误:', upcomingError)
    } else if (upcomingTimers && upcomingTimers.length > 0) {
      console.log(`发现${upcomingTimers.length}个即将到期的倒计时`)
      
      // 发送通知（这里可以集成通知系统）
      for (const timer of upcomingTimers) {
        console.log(`即将到期: 钱包 ${timer.recipient_wallet}, 类型 ${timer.timer_type}`)
        
        // 标记通知已发送
        await supabase
          .from('reward_timers')
          .update({ notification_sent: true })
          .eq('id', timer.id)
      }
    }

    // 检查Super Root是否已升级到Level 2
    await checkSuperRootUpgrade(supabase)

    return new Response(JSON.stringify({
      success: true,
      timer_processing: timerResult,
      upcoming_notifications: upcomingTimers?.length || 0,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Cron奖励倒计时错误:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// 检查Super Root升级状态
async function checkSuperRootUpgrade(supabase) {
  try {
    // 获取Super Root当前状态
    const { data: superRoot } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .eq('activation_sequence', 0)
      .single()

    if (superRoot && superRoot.current_level >= 2) {
      console.log('🎉 Super Root已升级到Level 2，检查pending奖励...')
      
      // 将Super Root的pending奖励更新为claimable
      const { data: updatedRewards, error: updateError } = await supabase
        .from('layer_rewards')
        .update({ 
          status: 'claimable',
          updated_at: new Date().toISOString()
        })
        .eq('reward_recipient_wallet', superRoot.wallet_address)
        .eq('status', 'pending')
        .select('id, reward_amount')

      if (updateError) {
        console.error('更新Super Root奖励状态错误:', updateError)
      } else if (updatedRewards && updatedRewards.length > 0) {
        console.log(`✅ 已更新${updatedRewards.length}个Super Root奖励为可领取状态`)
        
        // 停用相关的倒计时
        for (const reward of updatedRewards) {
          await supabase
            .from('reward_timers')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('reward_id', reward.id)
        }
      }
    }
    
  } catch (error) {
    console.error('检查Super Root升级状态错误:', error)
  }
}