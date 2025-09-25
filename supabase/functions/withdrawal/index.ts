import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('💰 USDT Withdrawal Edge Function started successfully!')

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

    const body = await req.json()
    const { action, amount, recipientAddress, sourceChainId, targetChainId, selectedToken, memberWallet, targetTokenSymbol } = body
    
    if (action !== 'process-withdrawal') {
      throw new Error('Invalid action')
    }

    console.log('🔄 Processing withdrawal:', { amount, recipientAddress, targetChainId, memberWallet })

    // Validate inputs
    if (!amount || !recipientAddress || !targetChainId || !memberWallet) {
      throw new Error('Missing required parameters')
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      throw new Error('Invalid recipient wallet address format')
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount.toString())
    if (withdrawalAmount <= 0) {
      throw new Error('Invalid withdrawal amount')
    }

    // Get withdrawal fee for target chain
    const WITHDRAWAL_FEES: { [key: number]: number } = {
      1: 15.0,      // Ethereum - higher gas fees
      137: 1.0,     // Polygon - low fees
      42161: 2.0,   // Arbitrum - moderate fees
      10: 1.5,      // Optimism - low-moderate fees
      56: 1.0,      // BSC - low fees
      8453: 1.5     // Base - low-moderate fees
    }

    const fee = WITHDRAWAL_FEES[targetChainId] || 2.0
    const netAmount = withdrawalAmount - fee

    if (netAmount <= 0) {
      throw new Error(`Amount too small. Minimum withdrawal is ${fee + 0.01} USDT (including ${fee} USDT fee)`)
    }

    // Verify user has sufficient balance
    const { data: userBalance } = await supabase
      .from('user_balances')
      .select('reward_balance')
      .ilike('wallet_address', memberWallet)
      .single()

    if (!userBalance || (userBalance.reward_balance || 0) < withdrawalAmount) {
      throw new Error('Insufficient balance')
    }

    // Multi-token support: Native tokens and ERC20 tokens by chain
    const SUPPORTED_TOKENS: { [key: number]: { [symbol: string]: any } } = {
      1: { 
        'ETH': { address: null, symbol: 'ETH', decimals: 18, isNative: true },
        'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, isNative: false },
        'USDC': { address: '0xA0b86a33E6411b67f16D0f3C3e0d7A8e7D1E2E6F', symbol: 'USDC', decimals: 6, isNative: false }
      },
      137: { 
        'MATIC': { address: null, symbol: 'MATIC', decimals: 18, isNative: true },
        'USDT': { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, isNative: false },
        'USDC': { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, isNative: false }
      },
      42161: { 
        'ETH': { address: null, symbol: 'ETH', decimals: 18, isNative: true },
        'ARB': { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18, isNative: false },
        'USDT': { address: '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9', symbol: 'USDT', decimals: 18, isNative: false },
        'USDC': { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, isNative: false }
      },
      10: { 
        'ETH': { address: null, symbol: 'ETH', decimals: 18, isNative: true },
        'OP': { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18, isNative: false },
        'USDT': { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6, isNative: false },
        'USDC': { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6, isNative: false }
      },
      56: { 
        'BNB': { address: null, symbol: 'BNB', decimals: 18, isNative: true },
        'USDT': { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18, isNative: false },
        'USDC': { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, isNative: false },
        'BUSD': { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', decimals: 18, isNative: false }
      },
      8453: { 
        'ETH': { address: null, symbol: 'ETH', decimals: 18, isNative: true },
        'USDT': { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', decimals: 6, isNative: false },
        'USDC': { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, isNative: false }
      }
    }

    const getTokenInfo = (chainId: number, tokenSymbol: string = 'USDT') => {
      const chainTokens = SUPPORTED_TOKENS[chainId]
      
      if (chainTokens && chainTokens[tokenSymbol]) {
        return chainTokens[tokenSymbol]
      }
      
      // Fallback to USDT on ARB if token not found
      return SUPPORTED_TOKENS[42161]['USDT']
    }

    // Get source token (we settle in ARB USDT)
    const sourceTokenSymbol = 'USDT'
    const sourceToken = getTokenInfo(sourceChainId || 42161, sourceTokenSymbol)

    const calculateAmountWithDecimals = (amount: number, decimals: number): string => {
      // Use precise calculation for token amounts
      return (amount * Math.pow(10, decimals)).toFixed(0)
    }

    // Get target token info based on user's choice
    const targetTokenSymbol = targetTokenSymbol || selectedToken || 'USDT'
    const targetTokenInfo = getTokenInfo(targetChainId, targetTokenSymbol)
    
    // Source: We settle in ARB USDT
    const sourceTokenAddress = sourceToken.address // ARB USDT
    const targetTokenAddress = targetTokenInfo.address // Could be null for native tokens

    let result: any = {}

    // Check if this is same-chain and same-token transfer
    const isSameChain = (sourceChainId || 42161) === targetChainId
    const isSameToken = sourceTokenAddress?.toLowerCase() === targetTokenAddress?.toLowerCase()
    const isDirectTransfer = isSameChain && isSameToken && !targetTokenInfo.isNative
    
    if (isDirectTransfer) {
      // Direct transfer on same chain with same token
      console.log('🔄 Direct transfer on same chain using thirdweb wallets/send API')
      
      const amountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals)
      
      // Prepare request body - omit tokenAddress for native tokens
      const requestBody: any = {
        from: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
        chainId: targetChainId.toString(),
        recipients: [
          {
            address: recipientAddress,
            quantity: amountInWei
          }
        ]
      }
      
      // Only add tokenAddress for ERC20 tokens, not for native tokens
      if (!targetTokenInfo.isNative && targetTokenAddress) {
        requestBody.tokenAddress = targetTokenAddress
      }

      const walletResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
        },
        body: JSON.stringify(requestBody)
      })

      if (!walletResponse.ok) {
        const errorText = await walletResponse.text()
        throw new Error(`Thirdweb wallets API failed: ${walletResponse.status} ${errorText}`)
      }

      const walletData = await walletResponse.json()
      
      if (!walletData.result || !walletData.result.queueId) {
        throw new Error(`Thirdweb wallets API error: ${walletData.error || 'No queue ID returned'}`)
      }

      result = {
        transactionHash: walletData.result.queueId, // ThirdWeb returns queueId for async operations
        feeTransactionHash: null,
        bridged: false,
      }

    } else {
      // Cross-chain or cross-token: First swap via bridge, then send
      console.log(`🌉 Swap + Send: ARB USDT -> ${targetTokenInfo.symbol} on chain ${targetChainId}`)
      
      // Step 1: Use bridge/swap API to convert ARB USDT to target chain/token
      const grossAmountInWei = calculateAmountWithDecimals(withdrawalAmount, sourceToken.decimals) // Source ARB USDT decimals
      
      // Prepare swap request body
      const swapRequestBody: any = {
        fromChainId: (sourceChainId || 42161).toString(),
        toChainId: targetChainId.toString(),
        fromTokenAddress: sourceTokenAddress,
        fromAddress: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
        toAddress: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'), // Swap to our wallet first
        amount: grossAmountInWei,
      }
      
      // Handle target token address - use null for native tokens
      if (targetTokenInfo.isNative) {
        // For native tokens like BNB, ETH, don't specify toTokenAddress
        swapRequestBody.toTokenAddress = null
      } else {
        swapRequestBody.toTokenAddress = targetTokenAddress
      }
      
      const swapResponse = await fetch('https://api.thirdweb.com/v1/bridge/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
        },
        body: JSON.stringify(swapRequestBody)
      })

      if (!swapResponse.ok) {
        const errorText = await swapResponse.text()
        throw new Error(`Bridge swap failed: ${swapResponse.status} ${errorText}`)
      }

      const swapData = await swapResponse.json()
      console.log('✅ Bridge swap initiated:', swapData.result?.queueId)
      
      // Step 2: Send the net amount to user using wallets/send API
      // Note: In production, you'd monitor the swap completion via webhook before sending
      const netAmountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals)
      
      // Prepare send request body
      const sendRequestBody: any = {
        from: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
        chainId: targetChainId.toString(),
        recipients: [
          {
            address: recipientAddress,
            quantity: netAmountInWei // Send net amount (fee already deducted)
          }
        ]
      }
      
      // Only add tokenAddress for ERC20 tokens, not for native tokens
      if (!targetTokenInfo.isNative && targetTokenAddress) {
        sendRequestBody.tokenAddress = targetTokenAddress
      }
      
      const sendResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
        },
        body: JSON.stringify(sendRequestBody)
      })

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text()
        throw new Error(`User transfer failed: ${sendResponse.status} ${errorText}`)
      }

      const sendData = await sendResponse.json()
      
      if (!sendData.result || !sendData.result.queueId) {
        throw new Error(`User transfer API error: ${sendData.error || 'No queue ID returned'}`)
      }

      result = {
        transactionHash: sendData.result.queueId, // User transfer queue ID
        feeTransactionHash: swapData.result?.queueId, // Swap queue ID (fee included in swap)
        bridged: true,
        swapQueueId: swapData.result?.queueId,
        sendQueueId: sendData.result.queueId,
        targetToken: targetTokenInfo
      }
    }

    // Record withdrawal in database
    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    await supabase.from('withdrawal_requests').insert({
      id: withdrawalId,
      user_wallet: recipientAddress,
      amount: withdrawalAmount.toString(),
      target_chain_id: targetChainId,
      token_address: targetTokenAddress,
      user_signature: result.bridged ? 'thirdweb_swap_and_send' : 'thirdweb_direct_send',
      status: 'processing', // ThirdWeb operations are async
      user_transaction_hash: result.transactionHash,
      fee_transaction_hash: result.feeTransactionHash,
      created_at: new Date().toISOString(),
      completed_at: null, // Will be updated when transaction confirms
      metadata: {
        source: 'rewards_withdrawal',
        member_wallet: memberWallet,
        withdrawal_fee: fee,
        net_amount: netAmount,
        gross_amount: withdrawalAmount,
        fee_deducted_from_amount: true,
        fee_calculation: `${withdrawalAmount} - ${fee} = ${netAmount}`,
        source_chain_id: sourceChainId,
        target_chain_id: targetChainId,
        source_token_address: sourceTokenAddress,
        target_token_address: targetTokenAddress,
        target_token_symbol: targetTokenInfo.symbol,
        target_token_is_native: targetTokenInfo.isNative,
        target_token_decimals: targetTokenInfo.decimals,
        is_cross_chain: result.bridged,
        withdrawal_method: result.bridged ? 'swap_then_send' : 'direct_send',
        thirdweb_swap_queue_id: result.swapQueueId || null,
        thirdweb_send_queue_id: result.sendQueueId || result.transactionHash,
        processing_steps: result.bridged ? 
          [`swap_${sourceToken.symbol}_to_${targetTokenInfo.symbol}`, 'send_to_user'] : 
          [`direct_send_${targetTokenInfo.symbol}`],
        settlement_currency: 'ARB_USDT',
        target_currency: targetTokenInfo.symbol
      }
    })

    // Update user balance
    const currentRewardBalance = userBalance.reward_balance || 0
    const { data: currentBalanceData } = await supabase
      .from('user_balances')
      .select('total_withdrawn')
      .ilike('wallet_address', memberWallet)
      .single()
    
    const currentWithdrawn = currentBalanceData?.total_withdrawn || 0
    
    await supabase
      .from('user_balances')
      .update({
        reward_balance: Math.max(0, currentRewardBalance - withdrawalAmount),
        total_withdrawn: currentWithdrawn + withdrawalAmount,
        updated_at: new Date().toISOString(),
      })
      .ilike('wallet_address', memberWallet)

    console.log('✅ Withdrawal processed successfully:', withdrawalId)

    return new Response(JSON.stringify({
      success: true,
      transaction_hash: result.transactionHash,
      swap_queue_id: result.swapQueueId,
      send_queue_id: result.sendQueueId || result.transactionHash,
      net_amount: netAmount,
      fee_amount: fee,
      gross_amount: withdrawalAmount,
      withdrawal_id: withdrawalId,
      is_cross_chain: result.bridged,
      processing_method: result.bridged ? 'swap_then_send' : 'direct_send',
      status: 'processing',
      estimated_completion_minutes: result.bridged ? 5 : 2,
      source_token: {
        symbol: sourceToken.symbol,
        address: sourceTokenAddress,
        chain_id: sourceChainId || 42161
      },
      target_token: {
        symbol: targetTokenInfo.symbol,
        address: targetTokenAddress,
        chain_id: targetChainId,
        is_native: targetTokenInfo.isNative,
        decimals: targetTokenInfo.decimals
      },
      fee_calculation: `提现 ${withdrawalAmount} ${sourceToken.symbol}，手续费 ${fee} USDT，到账 ${netAmount} ${targetTokenInfo.symbol}`,
      message: result.bridged ? 
        `跨链提现已启动：${withdrawalAmount} ${sourceToken.symbol} → ${netAmount} ${targetTokenInfo.symbol}（扣除 ${fee} USDT 手续费）` :
        `直接提现已启动：${netAmount} ${targetTokenInfo.symbol}（扣除 ${fee} USDT 手续费）`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('Withdrawal error:', error)
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