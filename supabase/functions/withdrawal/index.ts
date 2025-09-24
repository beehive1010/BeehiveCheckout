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
    const { action, amount, recipientAddress, sourceChainId, targetChainId, selectedToken, memberWallet } = body
    
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

    // Token addresses and info
    const TOKEN_ADDRESSES: { [key: number]: any } = {
      1: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      137: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
      42161: { 
        usdt: { address: '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9', symbol: 'USDT', decimals: 18 },
        testUSDT: { 
          address: Deno.env.get('ARB_TEST_USDT_ADDRESS') || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 
          symbol: 'TEST-USDT', 
          decimals: 18 
        }
      },
      10: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
      56: { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
      8453: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', decimals: 6 }
    }

    const getTokenInfo = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
      const chainTokens = TOKEN_ADDRESSES[chainId]
      
      if (chainId === 42161 && typeof chainTokens === 'object' && 'usdt' in chainTokens) {
        return chainTokens[tokenType]
      } else if (typeof chainTokens === 'object' && 'address' in chainTokens) {
        return chainTokens
      }
      
      return TOKEN_ADDRESSES[42161].usdt
    }

    const calculateAmountWithDecimals = (amount: number, decimals: number): string => {
      // Use precise calculation for token amounts
      return (amount * Math.pow(10, decimals)).toFixed(0)
    }

    const sourceTokenAddress = '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9' // Our Arbitrum USDT
    const targetTokenAddress = getTokenInfo(targetChainId, selectedToken).address
    const targetTokenInfo = getTokenInfo(targetChainId, selectedToken)

    let result: any = {}

    // Check if this is same-chain transfer or cross-chain bridge
    if (sourceChainId === targetChainId) {
      // Direct transfer using thirdweb wallets API with correct format
      console.log('🔄 Direct transfer on same chain using thirdweb wallets/send API')
      
      const amountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals)
      
      // Use the correct thirdweb API format from thirdweb-api.json
      const walletResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': Deno.env.get('THIRDWEB_SECRET_KEY') || '',
        },
        body: JSON.stringify({
          from: Deno.env.get('SERVER_WALLET_ADDRESS'), // The wallet address that will send tokens
          chainId: targetChainId, // Blockchain network identifier
          recipients: [ // Array of recipients and quantities
            {
              address: recipientAddress, // Recipient wallet address
              quantity: amountInWei // Amount in wei (with proper decimals)
            }
          ],
          tokenAddress: targetTokenAddress // Token contract address (omit for native token)
        })
      })

      if (!walletResponse.ok) {
        const errorText = await walletResponse.text()
        throw new Error(`Thirdweb wallets API failed: ${walletResponse.status} ${errorText}`)
      }

      const walletData = await walletResponse.json()
      
      // The API should return result with transaction hash
      if (!walletData.result) {
        throw new Error(`Thirdweb wallets API error: ${walletData.error || 'No result returned'}`)
      }

      result = {
        transactionHash: walletData.result.transactionHash || walletData.result.txHash,
        feeTransactionHash: null,
        bridged: false,
      }

    } else {
      // Cross-chain bridge using thirdweb Bridge API
      console.log('🌉 Cross-chain bridge')
      
      const sourceTokenDecimals = 18 // Arbitrum USDT decimals
      const amountInWei = calculateAmountWithDecimals(netAmount, sourceTokenDecimals)
      
      const bridgeResponse = await fetch('https://api.thirdweb.com/v1/bridge/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('THIRDWEB_SECRET_KEY')}`,
        },
        body: JSON.stringify({
          fromChainId: sourceChainId.toString(),
          toChainId: targetChainId.toString(),
          fromTokenAddress: sourceTokenAddress,
          toTokenAddress: targetTokenAddress,
          fromAddress: Deno.env.get('SERVER_WALLET_ADDRESS'),
          toAddress: recipientAddress,
          amount: amountInWei,
        })
      })

      if (!bridgeResponse.ok) {
        const error = await bridgeResponse.text()
        throw new Error(`Bridge API failed: ${error}`)
      }

      const bridgeData = await bridgeResponse.json()
      
      // For bridge transactions, we need to execute the transaction using the server wallet
      // This would require additional thirdweb SDK integration on the server side
      // For now, return the bridge quote for client-side execution
      result = {
        transactionHash: `bridge_${Date.now()}`, // Temporary placeholder
        feeTransactionHash: null,
        bridged: true,
        bridgeQuote: bridgeData,
        needsClientExecution: true // Flag to indicate client needs to execute
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
      user_signature: result.bridged ? 'thirdweb_bridge_api' : 'thirdweb_direct_transfer',
      status: result.needsClientExecution ? 'pending' : 'completed',
      user_transaction_hash: result.transactionHash,
      fee_transaction_hash: result.feeTransactionHash,
      created_at: new Date().toISOString(),
      completed_at: result.needsClientExecution ? null : new Date().toISOString(),
      metadata: {
        source: 'rewards_withdrawal',
        member_wallet: memberWallet,
        withdrawal_fee: fee,
        net_amount: netAmount,
        gross_amount: withdrawalAmount,
        fee_deducted_from_amount: true,
        source_chain_id: sourceChainId,
        target_chain_id: targetChainId,
        source_token_address: sourceTokenAddress,
        target_token_address: targetTokenAddress,
        is_cross_chain: result.bridged,
        withdrawal_method: result.bridged ? 'thirdweb_bridge_api' : 'thirdweb_direct_transfer',
        bridge_quote: result.bridgeQuote || null,
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
      fee_transaction_hash: result.feeTransactionHash,
      net_amount: netAmount,
      fee_amount: fee,
      withdrawal_id: withdrawalId,
      is_bridged: result.bridged,
      bridge_quote: result.bridgeQuote,
      needs_client_execution: result.needsClientExecution || false
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