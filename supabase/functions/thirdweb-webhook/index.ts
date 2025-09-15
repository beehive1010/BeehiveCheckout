import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ThirdWeb webhook configuration
const EXPECTED_NFT_CONTRACT = '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8' // ARB ONE Membership Contract
const EXPECTED_CHAIN_ID = 42161 // Arbitrum One
const WEBHOOK_SECRET = Deno.env.get('THIRDWEB_WEBHOOK_SECRET') // Configure this in Supabase

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payload-signature, x-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🔗 ThirdWeb Webhook function started successfully!')

// ThirdWeb official webhook payload structure
interface ThirdWebWebhookPayload {
  version: number
  type: 'pay.onchain-transaction' | 'pay.onramp-transaction'
  data: {
    transactionId: string
    paymentId: string
    status: 'SELL' | 'COMPLETED' | 'FAILED'
    fromAddress: string
    toAddress: string
    transactionHash: string
    chainId: number
    contractAddress: string
    tokenId?: string
    amount: string
    currency: string
    timestamp: string
    metadata?: any
  }
}

// Legacy support for direct contract events
interface ContractEvent {
  type: string
  transactionHash: string
  blockNumber: number
  contractAddress: string
  chainId: number
  timestamp: string
  data: {
    operator?: string
    from?: string
    to?: string
    id?: string
    value?: string
    tokenId?: string
    amount?: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
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

    // Verify ThirdWeb webhook signature
    const signature = req.headers.get('x-payload-signature')
    const timestamp = req.headers.get('x-timestamp')
    console.log('📨 Webhook signature received:', signature ? 'Present' : 'Missing')
    console.log('📨 Webhook timestamp received:', timestamp ? 'Present' : 'Missing')

    const requestBody = await req.text()
    
    // Verify signature if webhook secret is configured
    if (WEBHOOK_SECRET && signature && timestamp) {
      const isValid = await verifyWebhookSignature(requestBody, signature, timestamp)
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid webhook signature'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        })
      }
      console.log('✅ Webhook signature verified')
    }

    // Parse webhook payload
    const webhookData = JSON.parse(requestBody)
    console.log('🔍 Webhook data received:', JSON.stringify(webhookData, null, 2))

    // Check if this is a ThirdWeb payment webhook
    if (webhookData.version && webhookData.type?.startsWith('pay.')) {
      return await handleThirdWebPaymentWebhook(supabase, webhookData as ThirdWebWebhookPayload)
    }

    // Legacy support for direct contract events
    if (webhookData.type && webhookData.contractAddress) {
      return await handleLegacyContractEvent(supabase, webhookData as ContractEvent)
    }

    console.log(`⚠️ Unknown webhook format`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook received but format not recognized'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Verify ThirdWeb webhook signature using HMAC-SHA256
async function verifyWebhookSignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
  try {
    // Check timestamp tolerance (5 minutes)
    const now = Date.now() / 1000
    const webhookTime = parseInt(timestamp)
    if (Math.abs(now - webhookTime) > 300) { // 5 minutes
      console.error('❌ Webhook timestamp too old')
      return false
    }

    // Create signature string
    const signatureString = `${timestamp}.${payload}`
    
    // Import webhook secret as key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(WEBHOOK_SECRET!),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signatureString)
    )

    // Convert to hex
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Compare signatures
    return signature === expectedSignature
  } catch (error) {
    console.error('❌ Signature verification error:', error)
    return false
  }
}

// Handle ThirdWeb payment webhooks
async function handleThirdWebPaymentWebhook(supabase: any, payload: ThirdWebWebhookPayload) {
  console.log('💳 Processing ThirdWeb payment webhook...')

  const { type, data } = payload

  // Only process onchain transactions
  if (type !== 'pay.onchain-transaction') {
    console.log(`⚠️ Ignoring non-onchain transaction: ${type}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Non-onchain transaction ignored'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Only process completed transactions
  if (data.status !== 'COMPLETED') {
    console.log(`⚠️ Ignoring non-completed transaction: ${data.status}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Non-completed transaction ignored'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Validate required fields
  if (!data.contractAddress || !data.chainId || !data.toAddress || !data.transactionHash) {
    console.log(`⚠️ Missing required fields in ThirdWeb webhook data:`, {
      hasContract: !!data.contractAddress,
      hasChain: !!data.chainId,
      hasRecipient: !!data.toAddress,
      hasTxHash: !!data.transactionHash
    })
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields in webhook data'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }

  // Validate contract and chain
  if (data.contractAddress.toLowerCase() !== EXPECTED_NFT_CONTRACT.toLowerCase()) {
    console.log(`⚠️ Ignoring transaction from unexpected contract: ${data.contractAddress}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Transaction from unexpected contract ignored'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  if (data.chainId !== EXPECTED_CHAIN_ID) {
    console.log(`⚠️ Ignoring transaction from unexpected chain: ${data.chainId}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Transaction from unexpected chain ignored'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  console.log(`✅ Valid payment transaction from expected contract on Arbitrum One`)

  // Process the NFT purchase/mint
  return await processNFTTransaction(supabase, {
    transactionHash: data.transactionHash,
    recipient: data.toAddress,
    tokenId: data.tokenId || '1',
    amount: data.amount,
    timestamp: data.timestamp,
    source: 'thirdweb_payment',
    metadata: data.metadata
  })
}

// Handle legacy contract events
async function handleLegacyContractEvent(supabase: any, event: ContractEvent) {
  console.log('📜 Processing legacy contract event...')

  // Validate contract address and chain
  if (event.contractAddress?.toLowerCase() !== EXPECTED_NFT_CONTRACT.toLowerCase()) {
    console.log(`⚠️ Ignoring event from unexpected contract: ${event.contractAddress}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Event ignored - unexpected contract'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  if (event.chainId !== EXPECTED_CHAIN_ID) {
    console.log(`⚠️ Ignoring event from unexpected chain: ${event.chainId}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Event ignored - unexpected chain'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Handle different event types
  switch (event.type) {
    case 'TransferSingle':
    case 'Transfer':
      return await handleNFTMintEvent(supabase, event)
    
    case 'TransferBatch':
      return await handleBatchMintEvent(supabase, event)
    
    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`)
      return new Response(JSON.stringify({
        success: true,
        message: `Event type ${event.type} acknowledged but not processed`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
  }
}

// Unified NFT transaction processing
async function processNFTTransaction(supabase: any, transaction: {
  transactionHash: string
  recipient: string
  tokenId: string
  amount: string
  timestamp: string
  source: string
  metadata?: any
}) {
  const { transactionHash, recipient, tokenId, amount, timestamp, source } = transaction

  console.log(`🎯 Processing NFT transaction:`, {
    recipient,
    tokenId,
    amount,
    transactionHash,
    source
  })

  // Check if we already processed this transaction
  const { data: existingProcessing } = await supabase
    .from('webhook_processing_log')
    .select('id')
    .eq('transaction_hash', transactionHash)
    .eq('event_type', 'nft_mint')
    .maybeSingle()

  if (existingProcessing) {
    console.log(`⚠️ Transaction ${transactionHash} already processed`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Transaction already processed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Log webhook processing
  await supabase
    .from('webhook_processing_log')
    .insert({
      transaction_hash: transactionHash,
      event_type: 'nft_mint',
      recipient_wallet: recipient.toLowerCase(),
      nft_level: parseInt(tokenId),
      amount: parseInt(amount),
      event_timestamp: timestamp,
      processed_at: new Date().toISOString(),
      status: 'processing'
    })

  // Check if user is registered
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('wallet_address, username')
    .eq('wallet_address', recipient.toLowerCase())
    .maybeSingle()

  if (userError || !userData) {
    console.log(`⚠️ User not registered: ${recipient}`)
    
    // Update log status
    await supabase
      .from('webhook_processing_log')
      .update({ 
        status: 'failed',
        error_message: 'User not registered'
      })
      .eq('transaction_hash', transactionHash)

    return new Response(JSON.stringify({
      success: false,
      error: 'User must be registered before NFT activation',
      recipient,
      transactionHash
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }

  // Check if membership already activated
  const { data: memberData } = await supabase
    .from('members')
    .select('current_level')
    .eq('wallet_address', recipient.toLowerCase())
    .maybeSingle()

  if (memberData && memberData.current_level > 0) {
    console.log(`⚠️ User ${recipient} already has activated membership`)
    
    await supabase
      .from('webhook_processing_log')
      .update({ 
        status: 'skipped',
        error_message: 'User already activated'
      })
      .eq('transaction_hash', transactionHash)

    return new Response(JSON.stringify({
      success: true,
      message: 'User already has activated membership',
      recipient,
      transactionHash
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Trigger membership activation
  try {
    console.log(`🚀 Triggering membership activation for ${recipient}`)
    
    // Extract referrer from metadata if it's a manual claim
    let referrerWallet = null;
    if (source === 'manual_claim' && transaction.metadata?.referrer) {
      referrerWallet = transaction.metadata.referrer;
      console.log(`📋 Using referrer from manual claim: ${referrerWallet}`);
    }
    
    const { data: activationResult, error: activationError } = await supabase.rpc(
      'activate_nft_level1_membership',
      {
        p_wallet_address: recipient.toLowerCase(),
        p_referrer_wallet: referrerWallet, // Use extracted referrer or null for spillover
        p_transaction_hash: transactionHash
      }
    )

    if (activationError) {
      throw new Error(`Activation failed: ${activationError.message}`)
    }

    if (!activationResult || !activationResult.success) {
      throw new Error(`Activation failed: ${activationResult?.message || 'Unknown error'}`)
    }

    // Update log status
    await supabase
      .from('webhook_processing_log')
      .update({ 
        status: 'completed',
        activation_result: activationResult
      })
      .eq('transaction_hash', transactionHash)

    console.log(`✅ Membership activation successful for ${recipient}`)

    return new Response(JSON.stringify({
      success: true,
      message: 'NFT transaction processed and membership activated',
      recipient,
      transactionHash,
      source,
      activationResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (activationError) {
    console.error(`❌ Activation failed for ${recipient}:`, activationError)
    
    // Update log status
    await supabase
      .from('webhook_processing_log')
      .update({ 
        status: 'failed',
        error_message: activationError.message
      })
      .eq('transaction_hash', transactionHash)

    return new Response(JSON.stringify({
      success: false,
      error: 'NFT transaction detected but activation failed',
      recipient,
      transactionHash,
      source,
      details: activationError.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

// Handle NFT mint events (TransferSingle/Transfer) - Legacy support
async function handleNFTMintEvent(supabase: any, event: ContractEvent) {
  console.log('🎨 Processing NFT mint event...')

  const { data, transactionHash, blockNumber, timestamp } = event
  const { from, to, id, value, tokenId, amount } = data

  // Check if this is a mint transaction (from zero address)
  const zeroAddress = '0x0000000000000000000000000000000000000000'
  const fromAddress = from?.toLowerCase()
  
  if (fromAddress !== zeroAddress) {
    console.log(`⚠️ Not a mint transaction - from: ${from}`)
    return new Response(JSON.stringify({
      success: true,
      message: 'Not a mint transaction - ignored'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Extract recipient and NFT details
  const recipient = to?.toLowerCase() || ''
  const nftLevel = parseInt(id || tokenId || '1')
  const mintAmount = parseInt(amount || value || '1')

  console.log(`🎯 Legacy NFT Mint detected:`, {
    recipient,
    nftLevel,
    mintAmount,
    transactionHash,
    blockNumber
  })

  // Use unified processing
  return await processNFTTransaction(supabase, {
    transactionHash,
    recipient,
    tokenId: nftLevel.toString(),
    amount: mintAmount.toString(),
    timestamp,
    source: 'legacy_contract_event'
  })
}

// Handle batch mint events
async function handleBatchMintEvent(supabase: any, event: ContractEvent) {
  console.log('🎨 Processing batch NFT mint event...')
  
  // For batch events, you might need to process multiple recipients
  // This is a placeholder for batch processing logic
  console.log('⚠️ Batch mint events require special handling - not yet implemented')
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Batch mint event acknowledged - processing not yet implemented',
    transactionHash: event.transactionHash
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}