import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🔗 Thirdweb Webhook Edge Function started successfully!')

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

    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-signature')
    const webhookSecret = Deno.env.get('THIRDWEB_WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      // TODO: Implement signature verification for security
      console.log('📝 Webhook signature verification (to be implemented)')
    }

    const body = await req.json()
    console.log('📨 Received webhook:', JSON.stringify(body, null, 2))

    // Handle different webhook event types
    const { eventType, data } = body

    switch (eventType) {
      case 'transaction.sent':
        await handleTransactionSent(supabase, data)
        break
        
      case 'transaction.mined':
        await handleTransactionMined(supabase, data)
        break
        
      case 'transaction.failed':
        await handleTransactionFailed(supabase, data)
        break
        
      case 'wallet.send':
        await handleWalletSend(supabase, data)
        break
        
      default:
        console.log(`⚠️ Unhandled webhook event type: ${eventType}`)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      eventType: eventType,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Handle transaction sent event
async function handleTransactionSent(supabase: any, data: any) {
  const { transactionHash, from, to, value, tokenAddress, chainId } = data
  
  console.log(`📤 Transaction sent: ${transactionHash}`)
  
  // Update withdrawal request status to 'processing'
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'processing',
      user_transaction_hash: transactionHash,
      updated_at: new Date().toISOString(),
      metadata: {
        ...data,
        webhook_event: 'transaction.sent',
        processed_at: new Date().toISOString()
      }
    })
    .eq('user_transaction_hash', transactionHash)
  
  if (error) {
    console.error('Error updating withdrawal request:', error)
  } else {
    console.log('✅ Updated withdrawal request status to processing')
  }
}

// Handle transaction mined event
async function handleTransactionMined(supabase: any, data: any) {
  const { transactionHash, blockNumber, gasUsed, status } = data
  
  console.log(`⛏️ Transaction mined: ${transactionHash}, Block: ${blockNumber}`)
  
  // Update withdrawal request status to 'completed'
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...data,
        webhook_event: 'transaction.mined',
        block_number: blockNumber,
        gas_used: gasUsed,
        processed_at: new Date().toISOString()
      }
    })
    .eq('user_transaction_hash', transactionHash)
  
  if (error) {
    console.error('Error updating withdrawal request:', error)
  } else {
    console.log('✅ Updated withdrawal request status to completed')
    
    // Send notification to user (optional)
    await sendWithdrawalNotification(supabase, transactionHash, 'completed')
  }
}

// Handle transaction failed event
async function handleTransactionFailed(supabase: any, data: any) {
  const { transactionHash, error: txError, reason } = data
  
  console.log(`❌ Transaction failed: ${transactionHash}, Reason: ${reason}`)
  
  // Update withdrawal request status to 'failed' and refund user balance
  const { data: withdrawalData, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('user_wallet, amount, metadata')
    .eq('user_transaction_hash', transactionHash)
    .single()
  
  if (fetchError) {
    console.error('Error fetching withdrawal request:', fetchError)
    return
  }
  
  // Update withdrawal status
  const { error: updateError } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      metadata: {
        ...withdrawalData.metadata,
        webhook_event: 'transaction.failed',
        failure_reason: reason,
        error: txError,
        processed_at: new Date().toISOString()
      }
    })
    .eq('user_transaction_hash', transactionHash)
  
  if (updateError) {
    console.error('Error updating failed withdrawal:', updateError)
    return
  }
  
  // Refund user balance
  const { data: userBalance } = await supabase
    .from('user_balances')
    .select('reward_balance, total_withdrawn')
    .ilike('wallet_address', withdrawalData.user_wallet)
    .single()
  
  if (userBalance) {
    const refundAmount = parseFloat(withdrawalData.amount)
    const { error: balanceError } = await supabase
      .from('user_balances')
      .update({
        reward_balance: (userBalance.reward_balance || 0) + refundAmount,
        total_withdrawn: Math.max(0, (userBalance.total_withdrawn || 0) - refundAmount),
        updated_at: new Date().toISOString()
      })
      .ilike('wallet_address', withdrawalData.user_wallet)
    
    if (balanceError) {
      console.error('Error refunding user balance:', balanceError)
    } else {
      console.log(`💰 Refunded ${refundAmount} USDT to ${withdrawalData.user_wallet}`)
    }
  }
  
  // Send failure notification
  await sendWithdrawalNotification(supabase, transactionHash, 'failed', reason)
}

// Handle wallet send event (general wallet operation)
async function handleWalletSend(supabase: any, data: any) {
  const { transactionHash, recipients, totalAmount, chainId } = data
  
  console.log(`💸 Wallet send operation: ${transactionHash}`)
  console.log(`Recipients: ${recipients?.length || 0}, Total: ${totalAmount}`)
  
  // This can be used for batch operations or general monitoring
  // Log the operation for audit purposes
  const { error } = await supabase
    .from('transaction_logs')
    .insert({
      transaction_hash: transactionHash,
      transaction_type: 'wallet_send',
      chain_id: chainId,
      recipients_count: recipients?.length || 0,
      total_amount: totalAmount,
      metadata: data,
      created_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('Error logging wallet send operation:', error)
  }
}

// Send notification to user about withdrawal status
async function sendWithdrawalNotification(supabase: any, transactionHash: string, status: string, reason?: string) {
  try {
    // Get withdrawal details
    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('user_wallet, amount')
      .eq('user_transaction_hash', transactionHash)
      .single()
    
    if (!withdrawal) return
    
    // Create notification
    let title, message
    
    switch (status) {
      case 'completed':
        title = '提现成功 ✅'
        message = `您的 ${withdrawal.amount} USDT 提现已成功完成`
        break
      case 'failed':
        title = '提现失败 ❌'
        message = `您的 ${withdrawal.amount} USDT 提现失败${reason ? `: ${reason}` : ''}，余额已退回`
        break
      default:
        return
    }
    
    await supabase
      .from('notifications')
      .insert({
        wallet_address: withdrawal.user_wallet,
        title: title,
        message: message,
        type: 'withdrawal',
        data: {
          transaction_hash: transactionHash,
          amount: withdrawal.amount,
          status: status,
          reason: reason || null
        },
        created_at: new Date().toISOString()
      })
    
    console.log(`📧 Notification sent to ${withdrawal.user_wallet}: ${title}`)
    
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}