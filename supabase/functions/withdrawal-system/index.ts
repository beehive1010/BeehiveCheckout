import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

interface WithdrawalRequest {
  action: 'request_withdrawal' | 'check_limits' | 'get_status' | 'process_pending' | 'cancel_withdrawal'
  walletAddress: string
  amount?: number
  currency?: 'USDC' | 'BCC'
  targetChain?: 'arbitrum' | 'polygon' | 'base' | 'optimism'
  targetAddress?: string
  withdrawalId?: string
}

interface WithdrawalResponse {
  success: boolean
  action: string
  withdrawalId?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  amount?: number
  currency?: string
  targetChain?: string
  targetAddress?: string
  transactionHash?: string
  limits?: {
    daily: {
      limit: number
      used: number
      remaining: number
    }
    monthly: {
      limit: number
      used: number
      remaining: number
    }
  }
  estimatedFees?: {
    networkFee: number
    platformFee: number
    total: number
  }
  withdrawals?: any[]
  message: string
  error?: string
}

// Withdrawal configuration
const WITHDRAWAL_CONFIG = {
  // Default limits (can be customized per user)
  DEFAULT_LIMITS: {
    DAILY_USDC: 1000,    // $1000 USDC per day
    MONTHLY_USDC: 10000, // $10000 USDC per month
    DAILY_BCC: 5000,     // 5000 BCC per day
    MONTHLY_BCC: 50000,  // 50000 BCC per month
  },

  // Minimum withdrawal amounts
  MINIMUM_AMOUNTS: {
    USDC: 10,  // Minimum $10 USDC
    BCC: 100   // Minimum 100 BCC
  },

  // Platform fees (percentage)
  PLATFORM_FEES: {
    USDC: 0.01, // 1% platform fee for USDC
    BCC: 0.005  // 0.5% platform fee for BCC
  },

  // Estimated network fees (in USDC equivalent)
  NETWORK_FEES: {
    arbitrum: 0.5,
    polygon: 0.1,
    base: 0.3,
    optimism: 0.4
  },

  // Thirdweb server wallet configuration
  THIRDWEB_CONFIG: {
    ENGINE_URL: Deno.env.get('THIRDWEB_ENGINE_URL'),
    ACCESS_TOKEN: Deno.env.get('THIRDWEB_ACCESS_TOKEN'),
    BACKEND_WALLET: Deno.env.get('THIRDWEB_BACKEND_WALLET'),
    
    // Contract addresses for different chains
    CONTRACTS: {
      arbitrum: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        BCC: '0x...', // BCC token contract address
        chainId: 42161
      },
      polygon: {
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        BCC: '0x...', // BCC token contract address  
        chainId: 137
      },
      base: {
        USDC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        BCC: '0x...', // BCC token contract address
        chainId: 8453
      },
      optimism: {
        USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        BCC: '0x...', // BCC token contract address
        chainId: 10
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, walletAddress, amount, currency, targetChain, targetAddress, withdrawalId } = await req.json() as WithdrawalRequest

    console.log(`=¸ Withdrawal System Action: ${action} for ${walletAddress}`)

    let response: WithdrawalResponse

    switch (action) {
      case 'request_withdrawal':
        response = await requestWithdrawal(supabase, walletAddress, amount!, currency!, targetChain!, targetAddress!)
        break
      
      case 'check_limits':
        response = await checkWithdrawalLimits(supabase, walletAddress, currency!)
        break
      
      case 'get_status':
        response = await getWithdrawalStatus(supabase, walletAddress, withdrawalId)
        break
        
      case 'process_pending':
        response = await processPendingWithdrawals(supabase)
        break
        
      case 'cancel_withdrawal':
        response = await cancelWithdrawal(supabase, walletAddress, withdrawalId!)
        break
      
      default:
        response = {
          success: false,
          action,
          message: 'Invalid action specified',
          error: 'Unknown action'
        }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Withdrawal system error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        action: 'error',
        error: error.message || 'Withdrawal processing failed',
        message: 'Processing failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Request a new withdrawal
async function requestWithdrawal(
  supabase: any, 
  walletAddress: string, 
  amount: number, 
  currency: string, 
  targetChain: string, 
  targetAddress: string
): Promise<WithdrawalResponse> {
  console.log(`=° Processing withdrawal request: ${amount} ${currency} to ${targetChain}`)

  try {
    // 1. Validate parameters
    if (!amount || amount <= 0) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'Invalid withdrawal amount',
        error: 'Amount must be positive'
      }
    }

    if (!['USDC', 'BCC'].includes(currency)) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'Invalid currency',
        error: 'Currency must be USDC or BCC'
      }
    }

    if (!['arbitrum', 'polygon', 'base', 'optimism'].includes(targetChain)) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'Invalid target chain',
        error: 'Unsupported chain'
      }
    }

    // 2. Check minimum withdrawal amount
    const minAmount = WITHDRAWAL_CONFIG.MINIMUM_AMOUNTS[currency as keyof typeof WITHDRAWAL_CONFIG.MINIMUM_AMOUNTS]
    if (amount < minAmount) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: `Minimum withdrawal amount is ${minAmount} ${currency}`,
        error: 'Amount below minimum'
      }
    }

    // 3. Check user balance
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select(currency === 'USDC' ? 'usdc_balance' : 'bcc_transferable')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (!balanceData) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'User balance not found',
        error: 'No balance record'
      }
    }

    const currentBalance = currency === 'USDC' ? balanceData.usdc_balance : balanceData.bcc_transferable
    
    if (currentBalance < amount) {
      return {
        success: false,
        action: 'request_withdrawal',
        amount: currentBalance,
        currency,
        message: `Insufficient balance. Available: ${currentBalance} ${currency}`,
        error: 'Insufficient balance'
      }
    }

    // 4. Check withdrawal limits
    const limitsCheck = await checkWithdrawalLimits(supabase, walletAddress, currency)
    if (!limitsCheck.success || !limitsCheck.limits) {
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'Failed to check withdrawal limits',
        error: 'Limits check failed'
      }
    }

    if (amount > limitsCheck.limits.daily.remaining) {
      return {
        success: false,
        action: 'request_withdrawal',
        limits: limitsCheck.limits,
        message: `Exceeds daily limit. Available: ${limitsCheck.limits.daily.remaining} ${currency}`,
        error: 'Daily limit exceeded'
      }
    }

    if (amount > limitsCheck.limits.monthly.remaining) {
      return {
        success: false,
        action: 'request_withdrawal',
        limits: limitsCheck.limits,
        message: `Exceeds monthly limit. Available: ${limitsCheck.limits.monthly.remaining} ${currency}`,
        error: 'Monthly limit exceeded'
      }
    }

    // 5. Calculate fees
    const platformFeeRate = WITHDRAWAL_CONFIG.PLATFORM_FEES[currency as keyof typeof WITHDRAWAL_CONFIG.PLATFORM_FEES]
    const networkFee = WITHDRAWAL_CONFIG.NETWORK_FEES[targetChain as keyof typeof WITHDRAWAL_CONFIG.NETWORK_FEES]
    const platformFee = amount * platformFeeRate
    const totalFees = platformFee + networkFee
    const netAmount = amount - totalFees

    if (netAmount <= 0) {
      return {
        success: false,
        action: 'request_withdrawal',
        estimatedFees: {
          networkFee,
          platformFee,
          total: totalFees
        },
        message: 'Withdrawal amount too small to cover fees',
        error: 'Amount insufficient for fees'
      }
    }

    // 6. Create withdrawal request
    const withdrawalId = crypto.randomUUID()
    const { data: withdrawalRecord, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        id: withdrawalId,
        wallet_address: walletAddress.toLowerCase(),
        amount,
        currency,
        net_amount: netAmount,
        platform_fee: platformFee,
        network_fee: networkFee,
        target_chain: targetChain,
        target_address: targetAddress.toLowerCase(),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('Create withdrawal error:', withdrawalError)
      return {
        success: false,
        action: 'request_withdrawal',
        message: 'Failed to create withdrawal request',
        error: withdrawalError.message
      }
    }

    // 7. Deduct amount from user balance (hold in escrow)
    const updateField = currency === 'USDC' ? 'usdc_balance' : 'bcc_transferable'
    await supabase
      .from('user_balances')
      .update({
        [updateField]: currentBalance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase())

    // 8. Log the withdrawal request
    await supabase
      .from('audit_logs')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        action: 'withdrawal_requested',
        details: {
          withdrawalId,
          amount,
          currency,
          netAmount,
          targetChain,
          targetAddress,
          fees: { platformFee, networkFee, total: totalFees }
        }
      })

    console.log(` Withdrawal request created: ${withdrawalId}`)

    return {
      success: true,
      action: 'request_withdrawal',
      withdrawalId,
      status: 'pending',
      amount,
      currency,
      targetChain,
      targetAddress,
      estimatedFees: {
        networkFee,
        platformFee,
        total: totalFees
      },
      message: `Withdrawal request created successfully. ID: ${withdrawalId}`
    }

  } catch (error) {
    console.error('Request withdrawal error:', error)
    return {
      success: false,
      action: 'request_withdrawal',
      message: 'Failed to process withdrawal request',
      error: error.message
    }
  }
}

// Check withdrawal limits for a user
async function checkWithdrawalLimits(supabase: any, walletAddress: string, currency: string): Promise<WithdrawalResponse> {
  console.log(`=Ê Checking withdrawal limits for ${walletAddress} (${currency})`)

  try {
    // Get user's custom limits or use defaults
    const { data: limitsData } = await supabase
      .from('user_withdrawal_limits')
      .select('daily_limit_usdc, monthly_limit_usdc, daily_limit_bcc, monthly_limit_bcc')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    // Calculate current usage for the day and month
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get withdrawals for the current day
    const { data: dailyWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('currency', currency)
      .in('status', ['pending', 'processing', 'completed'])
      .gte('created_at', startOfDay.toISOString())

    // Get withdrawals for the current month
    const { data: monthlyWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('currency', currency)
      .in('status', ['pending', 'processing', 'completed'])
      .gte('created_at', startOfMonth.toISOString())

    const dailyUsed = dailyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0
    const monthlyUsed = monthlyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0

    // Determine limits (custom or default)
    const dailyLimit = currency === 'USDC' 
      ? (limitsData?.daily_limit_usdc || WITHDRAWAL_CONFIG.DEFAULT_LIMITS.DAILY_USDC)
      : (limitsData?.daily_limit_bcc || WITHDRAWAL_CONFIG.DEFAULT_LIMITS.DAILY_BCC)
    
    const monthlyLimit = currency === 'USDC'
      ? (limitsData?.monthly_limit_usdc || WITHDRAWAL_CONFIG.DEFAULT_LIMITS.MONTHLY_USDC)
      : (limitsData?.monthly_limit_bcc || WITHDRAWAL_CONFIG.DEFAULT_LIMITS.MONTHLY_BCC)

    const limits = {
      daily: {
        limit: dailyLimit,
        used: dailyUsed,
        remaining: Math.max(0, dailyLimit - dailyUsed)
      },
      monthly: {
        limit: monthlyLimit,
        used: monthlyUsed,
        remaining: Math.max(0, monthlyLimit - monthlyUsed)
      }
    }

    return {
      success: true,
      action: 'check_limits',
      limits,
      message: `${currency} withdrawal limits - Daily: ${limits.daily.remaining}/${limits.daily.limit}, Monthly: ${limits.monthly.remaining}/${limits.monthly.limit}`
    }

  } catch (error) {
    console.error('Check limits error:', error)
    return {
      success: false,
      action: 'check_limits',
      message: 'Failed to check withdrawal limits',
      error: error.message
    }
  }
}

// Get withdrawal status
async function getWithdrawalStatus(supabase: any, walletAddress: string, withdrawalId?: string): Promise<WithdrawalResponse> {
  console.log(`=Ë Getting withdrawal status for ${walletAddress}`)

  try {
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false })

    if (withdrawalId) {
      query = query.eq('id', withdrawalId).single()
    }

    const { data: withdrawals, error } = await query

    if (error && withdrawalId) {
      return {
        success: false,
        action: 'get_status',
        message: 'Withdrawal not found',
        error: error.message
      }
    }

    if (withdrawalId) {
      // Single withdrawal status
      const withdrawal = withdrawals
      return {
        success: true,
        action: 'get_status',
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        targetChain: withdrawal.target_chain,
        targetAddress: withdrawal.target_address,
        transactionHash: withdrawal.transaction_hash,
        message: `Withdrawal ${withdrawal.id} is ${withdrawal.status}`
      }
    } else {
      // All user withdrawals
      return {
        success: true,
        action: 'get_status',
        withdrawals: withdrawals || [],
        message: `Found ${withdrawals?.length || 0} withdrawals`
      }
    }

  } catch (error) {
    console.error('Get withdrawal status error:', error)
    return {
      success: false,
      action: 'get_status',
      message: 'Failed to get withdrawal status',
      error: error.message
    }
  }
}

// Process pending withdrawals using Thirdweb Engine
async function processPendingWithdrawals(supabase: any): Promise<WithdrawalResponse> {
  console.log(`™ Processing pending withdrawals...`)

  try {
    // Get all pending withdrawals
    const { data: pendingWithdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process up to 10 at a time

    if (error) throw error

    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
      return {
        success: true,
        action: 'process_pending',
        message: 'No pending withdrawals to process'
      }
    }

    console.log(`=Ë Processing ${pendingWithdrawals.length} pending withdrawals`)

    let processed = 0
    let failed = 0

    for (const withdrawal of pendingWithdrawals) {
      try {
        const result = await processWithdrawalWithThirdweb(supabase, withdrawal)
        if (result.success) {
          processed++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to process withdrawal ${withdrawal.id}:`, error)
        failed++
      }
    }

    return {
      success: true,
      action: 'process_pending',
      message: `Processed ${processed} withdrawals, ${failed} failed`
    }

  } catch (error) {
    console.error('Process pending withdrawals error:', error)
    return {
      success: false,
      action: 'process_pending',
      message: 'Failed to process pending withdrawals',
      error: error.message
    }
  }
}

// Process individual withdrawal with Thirdweb Engine
async function processWithdrawalWithThirdweb(supabase: any, withdrawal: any): Promise<{success: boolean}> {
  console.log(`=€ Processing withdrawal ${withdrawal.id} with Thirdweb`)

  try {
    // Update status to processing
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id)

    const config = WITHDRAWAL_CONFIG.THIRDWEB_CONFIG.CONTRACTS[withdrawal.target_chain as keyof typeof WITHDRAWAL_CONFIG.THIRDWEB_CONFIG.CONTRACTS]
    
    if (!config) {
      throw new Error(`Unsupported chain: ${withdrawal.target_chain}`)
    }

    const contractAddress = withdrawal.currency === 'USDC' ? config.USDC : config.BCC
    
    // Call Thirdweb Engine to execute the transfer
    const thirdwebResponse = await fetch(`${WITHDRAWAL_CONFIG.THIRDWEB_CONFIG.ENGINE_URL}/contract/${config.chainId}/${contractAddress}/erc20/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WITHDRAWAL_CONFIG.THIRDWEB_CONFIG.ACCESS_TOKEN}`,
        'X-Backend-Wallet-Address': WITHDRAWAL_CONFIG.THIRDWEB_CONFIG.BACKEND_WALLET || ''
      },
      body: JSON.stringify({
        toAddress: withdrawal.target_address,
        amount: withdrawal.net_amount.toString()
      })
    })

    const thirdwebData = await thirdwebResponse.json()

    if (!thirdwebResponse.ok) {
      throw new Error(`Thirdweb API error: ${thirdwebData.message || 'Unknown error'}`)
    }

    const transactionHash = thirdwebData.result?.transactionHash || thirdwebData.queueId

    // Update withdrawal with transaction hash
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        transaction_hash: transactionHash,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id)

    // Log successful withdrawal
    await supabase
      .from('audit_logs')
      .insert({
        wallet_address: withdrawal.wallet_address,
        action: 'withdrawal_completed',
        details: {
          withdrawalId: withdrawal.id,
          transactionHash,
          amount: withdrawal.amount,
          netAmount: withdrawal.net_amount,
          currency: withdrawal.currency,
          targetChain: withdrawal.target_chain
        }
      })

    console.log(` Withdrawal ${withdrawal.id} completed: ${transactionHash}`)
    return { success: true }

  } catch (error) {
    console.error(`L Withdrawal ${withdrawal.id} failed:`, error)
    
    // Update withdrawal status to failed
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id)

    // Refund the amount to user balance
    await refundFailedWithdrawal(supabase, withdrawal)

    return { success: false }
  }
}

// Cancel a withdrawal
async function cancelWithdrawal(supabase: any, walletAddress: string, withdrawalId: string): Promise<WithdrawalResponse> {
  console.log(`L Cancelling withdrawal ${withdrawalId}`)

  try {
    // Get withdrawal details
    const { data: withdrawal, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (error || !withdrawal) {
      return {
        success: false,
        action: 'cancel_withdrawal',
        message: 'Withdrawal not found or cannot be cancelled',
        error: 'Invalid withdrawal'
      }
    }

    // Update withdrawal status
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    // Refund the amount
    await refundFailedWithdrawal(supabase, withdrawal)

    return {
      success: true,
      action: 'cancel_withdrawal',
      withdrawalId,
      message: `Withdrawal ${withdrawalId} cancelled and refunded`
    }

  } catch (error) {
    console.error('Cancel withdrawal error:', error)
    return {
      success: false,
      action: 'cancel_withdrawal',
      message: 'Failed to cancel withdrawal',
      error: error.message
    }
  }
}

// Refund a failed/cancelled withdrawal
async function refundFailedWithdrawal(supabase: any, withdrawal: any): Promise<void> {
  console.log(`=° Refunding withdrawal ${withdrawal.id}`)

  try {
    const updateField = withdrawal.currency === 'USDC' ? 'usdc_balance' : 'bcc_transferable'
    
    // Get current balance
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select(updateField)
      .eq('wallet_address', withdrawal.wallet_address)
      .single()

    // Add back the original amount
    await supabase
      .from('user_balances')
      .update({
        [updateField]: (currentBalance?.[updateField] || 0) + withdrawal.amount,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', withdrawal.wallet_address)

    console.log(` Refunded ${withdrawal.amount} ${withdrawal.currency} to ${withdrawal.wallet_address}`)

  } catch (error) {
    console.error('Refund failed withdrawal error:', error)
  }
}