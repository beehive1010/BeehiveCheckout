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

  console.log('📝 Webhook request details:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

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
      console.log('📝 Webhook signature verification (simplified for now)')
      // Basic verification that webhook secret is set
      console.log('✅ Webhook secret configured, signature present')
    } else {
      console.log('⚠️ Webhook signature verification skipped (missing secret or signature)')
    }

    let body
    try {
      body = await req.json()
      console.log('📨 Received webhook:', JSON.stringify(body, null, 2))
    } catch (jsonError) {
      console.error('❌ Failed to parse webhook body:', jsonError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 to avoid webhook retries
      })
    }

    // Handle different webhook event types
    const { eventType, type, data } = body
    const actualEventType = eventType || type

    switch (actualEventType) {
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

      case 'token_transfer':
      case 'transfer':
        await handleTokenTransfer(supabase, data)
        break

      default:
        console.log(`⚠️ Unhandled webhook event type: ${actualEventType}`)
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
    
    // Log error details for debugging
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    })
    
    // Return 200 to prevent ThirdWeb from retrying failed webhooks
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown webhook processing error',
      timestamp: new Date().toISOString(),
      note: 'Error logged for investigation'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Changed from 500 to 200 to avoid webhook retries
    })
  }
})

// Handle transaction sent event
async function handleTransactionSent(supabase: any, data: any) {
  const { queueId, transactionHash, from, to, value, tokenAddress, chainId } = data
  
  console.log(`📤 Transaction sent: ${queueId || transactionHash}`)
  
  // Find withdrawal request by queue ID (either swap or send queue ID)
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .or(`user_transaction_hash.eq.${queueId || transactionHash},metadata->>thirdweb_swap_queue_id.eq.${queueId},metadata->>thirdweb_send_queue_id.eq.${queueId}`)
    .maybeSingle()
  
  if (fetchError || !withdrawal) {
    console.log(`⚠️ No matching withdrawal found for queue ID: ${queueId || transactionHash}`)
    return
  }
  
  // Update withdrawal request status to 'processing'
  let updateData: any = {
    status: 'processing',
    updated_at: new Date().toISOString()
  }
  
  // Update the appropriate queue ID based on transaction type
  const metadata = withdrawal.metadata || {}
  if (metadata.thirdweb_swap_queue_id === queueId) {
    updateData.metadata = {
      ...metadata,
      swap_transaction_hash: transactionHash,
      swap_status: 'sent',
      webhook_event: 'swap_transaction.sent',
      processed_at: new Date().toISOString()
    }
  } else {
    updateData.user_transaction_hash = transactionHash
    updateData.metadata = {
      ...metadata,
      send_transaction_hash: transactionHash,
      send_status: 'sent',
      webhook_event: 'send_transaction.sent',
      processed_at: new Date().toISOString()
    }
  }
  
  const { error } = await supabase
    .from('withdrawal_requests')
    .update(updateData)
    .eq('id', withdrawal.id)
  
  if (error) {
    console.error('Error updating withdrawal request:', error)
  } else {
    console.log('✅ Updated withdrawal request status to processing')
  }
}

// Handle transaction mined event
async function handleTransactionMined(supabase: any, data: any) {
  const { queueId, transactionHash, blockNumber, gasUsed, status } = data
  
  console.log(`⛏️ Transaction mined: ${queueId || transactionHash}, Block: ${blockNumber}`)
  
  // Find withdrawal request by queue ID or transaction hash
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .or(`user_transaction_hash.eq.${queueId || transactionHash},metadata->>thirdweb_swap_queue_id.eq.${queueId},metadata->>thirdweb_send_queue_id.eq.${queueId}`)
    .maybeSingle()
  
  if (fetchError || !withdrawal) {
    console.log(`⚠️ No matching withdrawal found for queue ID: ${queueId || transactionHash}`)
    return
  }
  
  const metadata = withdrawal.metadata || {}
  let updateData: any = {
    updated_at: new Date().toISOString()
  }
  
  // Check if this is swap completion or send completion
  const isSwapCompletion = metadata.thirdweb_swap_queue_id === queueId
  const isSendCompletion = metadata.thirdweb_send_queue_id === queueId || withdrawal.user_transaction_hash === (queueId || transactionHash)
  
  if (isSwapCompletion) {
    // Swap transaction completed
    updateData.metadata = {
      ...metadata,
      swap_transaction_hash: transactionHash,
      swap_status: 'completed',
      swap_block_number: blockNumber,
      swap_gas_used: gasUsed,
      webhook_event: 'swap_transaction.mined',
      processed_at: new Date().toISOString()
    }
    console.log('✅ Bridge swap completed')
  } else if (isSendCompletion) {
    // Send transaction completed - this is the final step
    updateData.status = 'completed'
    updateData.completed_at = new Date().toISOString()
    updateData.user_transaction_hash = transactionHash
    updateData.metadata = {
      ...metadata,
      send_transaction_hash: transactionHash,
      send_status: 'completed',
      send_block_number: blockNumber,
      send_gas_used: gasUsed,
      webhook_event: 'send_transaction.mined',
      processed_at: new Date().toISOString()
    }
    
    // Now update user balance since withdrawal is fully completed
    await updateUserBalanceAfterWithdrawal(supabase, withdrawal)
    
    console.log('✅ User send completed - withdrawal fully processed')
  }
  
  const { error } = await supabase
    .from('withdrawal_requests')
    .update(updateData)
    .eq('id', withdrawal.id)
  
  if (error) {
    console.error('Error updating withdrawal request:', error)
  } else if (isSendCompletion) {
    console.log('✅ Updated withdrawal request status to completed')
    
    // Send notification to user
    await sendWithdrawalNotification(supabase, transactionHash, 'completed', withdrawal)
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

// Update user balance after successful withdrawal
async function updateUserBalanceAfterWithdrawal(supabase: any, withdrawal: any) {
  try {
    const { user_wallet, amount, metadata } = withdrawal
    const withdrawalAmount = parseFloat(amount)
    
    // Get current user balance
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('reward_balance, total_withdrawn')
      .eq('wallet_address', user_wallet)
      .single()
    
    if (!userBalance) {
      console.error(`❌ User balance not found for wallet: ${user_wallet}`)
      return
    }
    
    const currentRewardBalance = userBalance.reward_balance || 0
    const currentTotalWithdrawn = userBalance.total_withdrawn || 0
    
    // Update balances: deduct from reward_balance, add to total_withdrawn
    const newRewardBalance = Math.max(0, currentRewardBalance - withdrawalAmount)
    const newTotalWithdrawn = currentTotalWithdrawn + withdrawalAmount
    
    const { error } = await supabase
      .from('user_balances')
      .update({
        reward_balance: newRewardBalance,
        total_withdrawn: newTotalWithdrawn,
        last_withdrawal_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', user_wallet)
    
    if (error) {
      console.error('❌ Error updating user balance after withdrawal:', error)
    } else {
      console.log(`💰 Updated user balance: ${user_wallet}`)
      console.log(`   Reward balance: ${currentRewardBalance} → ${newRewardBalance}`)
      console.log(`   Total withdrawn: ${currentTotalWithdrawn} → ${newTotalWithdrawn}`)
    }
    
  } catch (error) {
    console.error('❌ Error in updateUserBalanceAfterWithdrawal:', error)
  }
}

// Handle token transfer event - auto transfer platform fee
async function handleTokenTransfer(supabase: any, data: any) {
  try {
    const { chainId, contractAddress, from, to, value, transactionHash } = data

    console.log(`💰 Token transfer detected:`, {
      chainId,
      contractAddress,
      from,
      to,
      value,
      transactionHash
    })

    // Configuration
    const SERVER_WALLET = Deno.env.get('SERVER_WALLET_ADDRESS')?.toLowerCase()
    const PLATFORM_RECIPIENT = Deno.env.get('PLATFORM_FEE_RECIPIENT')?.toLowerCase() || '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0'.toLowerCase()
    const USDT_ADDRESS_ARB = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'.toLowerCase() // Arbitrum mainnet USDT
    const USDT_ADDRESS_ARB_SEPOLIA = '0xb67f84e6148D087D4fc5F390BedC75597770f6c0'.toLowerCase() // Arbitrum Sepolia USDT
    const MIN_AMOUNT_USDT = 130 // Minimum 130 USDT to trigger auto transfer
    const PLATFORM_FEE_USDT = 30 // Transfer 30 USDT to platform

    // Check if this is a transfer to our server wallet
    if (to?.toLowerCase() !== SERVER_WALLET) {
      console.log(`⚠️ Transfer not to server wallet, ignoring`)
      return
    }

    // Check if it's Arbitrum (mainnet or Sepolia)
    if (chainId !== '42161' && chainId !== 42161 && chainId !== '421614' && chainId !== 421614) {
      console.log(`⚠️ Not Arbitrum chain, ignoring`)
      return
    }

    // Check if it's USDT token on the respective chain
    const isArbitrumMainnet = chainId === '42161' || chainId === 42161
    const isArbitrumSepolia = chainId === '421614' || chainId === 421614
    const expectedUSDT = isArbitrumMainnet ? USDT_ADDRESS_ARB : USDT_ADDRESS_ARB_SEPOLIA

    if (contractAddress?.toLowerCase() !== expectedUSDT) {
      console.log(`⚠️ Not USDT token, ignoring`)
      return
    }

    // Convert value to USDT (6 decimals)
    const amountUSDT = parseInt(value) / 1_000_000

    console.log(`💵 Received ${amountUSDT} USDT from ${from}`)

    // Check if amount >= 130 USDT
    if (amountUSDT < MIN_AMOUNT_USDT) {
      console.log(`⚠️ Amount ${amountUSDT} USDT < ${MIN_AMOUNT_USDT} USDT, no auto transfer`)
      return
    }

    console.log(`✅ Triggering auto platform fee transfer: ${PLATFORM_FEE_USDT} USDT → ${PLATFORM_RECIPIENT}`)

    // Call nft-claim-usdc-transfer function to execute the transfer
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    const transferResponse = await fetch(
      `${supabaseUrl}/functions/v1/nft-claim-usdc-transfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          token_id: '1',
          claimer_address: from,
          transaction_hash: transactionHash,
          usdt_received: value
        }),
      }
    )

    if (transferResponse.ok) {
      const transferResult = await transferResponse.json()
      console.log(`✅ Auto platform fee transfer completed:`, transferResult)

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_wallet: SERVER_WALLET,
        action: 'auto_platform_fee_transfer',
        old_values: {
          received_amount: amountUSDC,
          from_address: from,
          trigger_tx: transactionHash
        },
        new_values: {
          transferred_amount: PLATFORM_FEE_USDC,
          to_address: PLATFORM_RECIPIENT,
          transfer_result: transferResult
        }
      })

    } else {
      const errorText = await transferResponse.text()
      console.error(`❌ Auto transfer failed:`, errorText)
    }

  } catch (error) {
    console.error('❌ Error in handleTokenTransfer:', error)
  }
}

// Send notification to user about withdrawal status
async function sendWithdrawalNotification(supabase: any, transactionHash: string, status: string, withdrawal?: any, reason?: string) {
  try {
    // Get withdrawal details if not provided
    let withdrawalData = withdrawal
    if (!withdrawalData) {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('user_wallet, amount, metadata')
        .eq('user_transaction_hash', transactionHash)
        .single()
      withdrawalData = data
    }
    
    if (!withdrawalData) return
    
    const targetTokenSymbol = withdrawalData.metadata?.target_token_symbol || 'USDT'
    const netAmount = withdrawalData.metadata?.net_amount || withdrawalData.amount
    const feeAmount = withdrawalData.metadata?.fee_amount || 0
    
    // Create notification
    let title, message
    
    switch (status) {
      case 'completed':
        title = '提现成功 ✅'
        message = `您的 ${netAmount} ${targetTokenSymbol} 提现已成功完成（扣除 ${feeAmount} USDT 手续费）`
        break
      case 'failed':
        title = '提现失败 ❌'
        message = `您的 ${withdrawalData.amount} USDT 提现失败${reason ? `: ${reason}` : ''}，余额已退回`
        break
      default:
        return
    }
    
    await supabase
      .from('notifications')
      .insert({
        wallet_address: withdrawalData.user_wallet,
        title: title,
        message: message,
        type: 'withdrawal',
        data: {
          transaction_hash: transactionHash,
          amount: withdrawalData.amount,
          net_amount: netAmount,
          target_token: targetTokenSymbol,
          fee_amount: feeAmount,
          status: status,
          reason: reason || null
        },
        created_at: new Date().toISOString()
      })
    
    console.log(`📧 Notification sent to ${withdrawalData.user_wallet}: ${title}`)
    
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}