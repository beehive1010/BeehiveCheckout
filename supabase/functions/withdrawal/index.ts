import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeFunctionLogger, PerformanceTimer } from '../shared/logger.ts';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
console.log('💰 USDT Withdrawal Edge Function started successfully!');
serve(async (req)=>{
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }
    let logger;
    let timer;
    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        // Initialize logger and performance timer
        logger = new EdgeFunctionLogger(supabase, 'withdrawal');
        timer = new PerformanceTimer('withdrawal-request', logger);
        const body = await req.json();
        const { action, amount, recipientAddress, sourceChainId, targetChainId, selectedToken, memberWallet, targetTokenSymbol, skipBalanceCheck } = body;
        console.log('💰 Withdrawal request:', {
            action,
            amount,
            recipientAddress,
            targetChainId,
            memberWallet,
            targetTokenSymbol,
            skipBalanceCheck
        });
        await logger.logInfo('withdrawal-request-started', 'wallet_operations', {
            action,
            amount,
            recipientAddress,
            targetChainId,
            memberWallet,
            targetTokenSymbol
        });
        if (action !== 'process-withdrawal') {
            await logger.logValidationError('invalid-action', `Invalid action: ${action}`, {
                action
            });
            throw new Error('Invalid action');
        }
        // Validate inputs
        if (!amount || !recipientAddress || !targetChainId || !memberWallet) {
            await logger.logValidationError('missing-parameters', 'Missing required parameters', {
                amount: !!amount,
                recipientAddress: !!recipientAddress,
                targetChainId: !!targetChainId,
                memberWallet: !!memberWallet
            });
            throw new Error('Missing required parameters');
        }
        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
            await logger.logValidationError('invalid-wallet-format', 'Invalid recipient wallet address format', {
                recipientAddress
            });
            throw new Error('Invalid recipient wallet address format');
        }
        // Validate amount
        const withdrawalAmount = parseFloat(amount.toString());
        if (withdrawalAmount <= 0) {
            await logger.logValidationError('invalid-amount', 'Invalid withdrawal amount', {
                amount,
                withdrawalAmount
            });
            throw new Error('Invalid withdrawal amount');
        }
        console.log(`✅ Validation passed: ${withdrawalAmount} USDT to ${recipientAddress}`);
        await logger.logInfo('validation-passed', 'wallet_operations', {
            withdrawalAmount,
            recipientAddress,
            targetChainId
        });
        // Get withdrawal fee for target chain
        const WITHDRAWAL_FEES = {
            1: 15.0,
            137: 1.0,
            42161: 0.0,
            10: 1.5,
            56: 1.0,
            8453: 1.5 // Base - low-moderate fees
        };
        const fee = WITHDRAWAL_FEES[targetChainId] ?? 2.0;
        const netAmount = withdrawalAmount - fee;
        console.log(`💰 Fee calculation: ${withdrawalAmount} - ${fee} = ${netAmount}`);
        await logger.logInfo('fee-calculated', 'wallet_operations', {
            withdrawalAmount,
            fee,
            netAmount,
            targetChainId
        });
        if (netAmount <= 0) {
            await logger.logValidationError('amount-too-small', `Amount too small: ${withdrawalAmount}, required minimum: ${fee + 0.01}`, {
                withdrawalAmount,
                fee,
                netAmount
            });
            throw new Error(`Amount too small. Minimum withdrawal is ${fee + 0.01} USDT (including ${fee} USDT fee)`);
        }
        // Verify user has sufficient balance (skip for admin withdrawals from server wallet)
        let userBalance = null;
        let currentBalance = 0;

        if (skipBalanceCheck === true) {
            console.log(`⚠️ Skipping balance check for admin withdrawal (skipBalanceCheck=true)`);
            await logger.logInfo('balance-check-skipped', 'wallet_operations', {
                memberWallet,
                reason: 'admin_withdrawal',
                skipBalanceCheck
            });
            // Set dummy balance for admin withdrawals - actual balance is on-chain
            userBalance = { available_balance: withdrawalAmount, reward_balance: 0, total_earned: 0 };
            currentBalance = withdrawalAmount;
        } else {
            console.log(`🔍 Checking balance for wallet: ${memberWallet}`);
            const { data: balanceData, error: balanceError } = await supabase.from('user_balances').select('reward_balance, available_balance, total_earned').ilike('wallet_address', memberWallet).single();
            if (balanceError) {
                console.error('❌ Balance check error:', balanceError);
                await logger.logDatabaseError('balance-check-failed', balanceError, {
                    memberWallet
                });
                throw new Error('Failed to check user balance');
            }
            userBalance = balanceData;
            // Use available_balance first, fallback to reward_balance for backward compatibility
            currentBalance = userBalance.available_balance || userBalance.reward_balance || 0;
            if (!userBalance || currentBalance < withdrawalAmount) {
                console.error(`❌ Insufficient balance: ${currentBalance} < ${withdrawalAmount}`);
                await logger.logWarning('insufficient-balance', 'wallet_operations', 'Insufficient balance for withdrawal', {
                    memberWallet,
                    requestedAmount: withdrawalAmount,
                    availableBalance: currentBalance,
                    available_balance: userBalance?.available_balance,
                    reward_balance: userBalance?.reward_balance
                });
                throw new Error('Insufficient balance');
            }
            console.log(`✅ Balance sufficient: ${currentBalance} >= ${withdrawalAmount}`);
            await logger.logInfo('balance-verified', 'wallet_operations', {
                memberWallet,
                rewardBalance: userBalance.reward_balance,
                withdrawalAmount,
                netAmount
            });
        }
        // Multi-token support: Native tokens and ERC20 tokens by chain
        const SUPPORTED_TOKENS = {
            1: {
                'ETH': {
                    address: null,
                    symbol: 'ETH',
                    decimals: 18,
                    isNative: true
                },
                'USDT': {
                    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                    symbol: 'USDT',
                    decimals: 6,
                    isNative: false
                },
                'USDC': {
                    address: '0xA0b86a33E6411b67f16D0f3C3e0d7A8e7D1E2E6F',
                    symbol: 'USDC',
                    decimals: 6,
                    isNative: false
                }
            },
            137: {
                'MATIC': {
                    address: null,
                    symbol: 'MATIC',
                    decimals: 18,
                    isNative: true
                },
                'USDT': {
                    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                    symbol: 'USDT',
                    decimals: 6,
                    isNative: false
                },
                'USDC': {
                    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    symbol: 'USDC',
                    decimals: 6,
                    isNative: false
                }
            },
            42161: {
                'ETH': {
                    address: null,
                    symbol: 'ETH',
                    decimals: 18,
                    isNative: true
                },
                'ARB': {
                    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
                    symbol: 'ARB',
                    decimals: 18,
                    isNative: false
                },
                'USDT': {
                    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                    symbol: 'USDT',
                    decimals: 6,
                    isNative: false
                }
            },
            10: {
                'ETH': {
                    address: null,
                    symbol: 'ETH',
                    decimals: 18,
                    isNative: true
                },
                'OP': {
                    address: '0x4200000000000000000000000000000000000042',
                    symbol: 'OP',
                    decimals: 18,
                    isNative: false
                },
                'USDT': {
                    address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                    symbol: 'USDT',
                    decimals: 6,
                    isNative: false
                },
                'USDC': {
                    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                    symbol: 'USDC',
                    decimals: 6,
                    isNative: false
                }
            },
            56: {
                'BNB': {
                    address: null,
                    symbol: 'BNB',
                    decimals: 18,
                    isNative: true
                },
                'USDT': {
                    address: '0x55d398326f99059fF775485246999027B3197955',
                    symbol: 'USDT',
                    decimals: 18,
                    isNative: false
                },
                'USDC': {
                    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                    symbol: 'USDC',
                    decimals: 18,
                    isNative: false
                },
                'BUSD': {
                    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                    symbol: 'BUSD',
                    decimals: 18,
                    isNative: false
                }
            },
            8453: {
                'ETH': {
                    address: null,
                    symbol: 'ETH',
                    decimals: 18,
                    isNative: true
                },
                'USDT': {
                    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
                    symbol: 'USDT',
                    decimals: 6,
                    isNative: false
                },
                'USDC': {
                    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                    symbol: 'USDC',
                    decimals: 6,
                    isNative: false
                }
            }
        };
        const getTokenInfo = (chainId, tokenSymbol = 'USDT')=>{
            const chainTokens = SUPPORTED_TOKENS[chainId];
            if (chainTokens && chainTokens[tokenSymbol]) {
                return chainTokens[tokenSymbol];
            }
            // Fallback to USDT on ARB if token not found
            return SUPPORTED_TOKENS[42161]['USDT'];
        };
        // Get source token (we settle in ARB USDT - USDT on Arbitrum)
        const sourceTokenSymbol = 'USDT';
        const sourceToken = getTokenInfo(sourceChainId || 42161, sourceTokenSymbol);
        const calculateAmountWithDecimals = (amount, decimals)=>{
            // Use precise calculation for token amounts
            return (amount * Math.pow(10, decimals)).toFixed(0);
        };
        // Get target token info based on user's choice
        const requestedTokenSymbol = targetTokenSymbol || selectedToken || 'USDT';
        const targetTokenInfo = getTokenInfo(targetChainId, requestedTokenSymbol);
        // Source: We settle in ARB USDT (USDT on Arbitrum)
        const sourceTokenAddress = sourceToken.address // ARB USDT: 0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008
        ;
        const targetTokenAddress = targetTokenInfo.address // Could be null for native tokens
        ;
        let result = {};
        // Check if this is same-chain and same-token transfer
        const isSameChain = (sourceChainId || 42161) === targetChainId;
        const isSameToken = sourceTokenAddress?.toLowerCase() === targetTokenAddress?.toLowerCase();
        const isDirectTransfer = isSameChain && isSameToken && !targetTokenInfo.isNative;
        if (isDirectTransfer) {
            // Direct transfer on same chain with same token
            console.log('🔄 Direct transfer on same chain using thirdweb wallets/send API');
            await logger.logInfo('direct-transfer-initiated', 'api_calls', {
                transferType: 'direct',
                targetChainId,
                targetToken: targetTokenInfo.symbol,
                netAmount,
                recipientAddress
            });
            // Calculate amount with proper decimals
            const amountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals);
            console.log('💰 Amount calculation:', {
                netAmount,
                decimals: targetTokenInfo.decimals,
                amountInWei,
                tokenSymbol: targetTokenInfo.symbol
            });
            // Check server wallet balance before attempting transfer
            console.log('🔍 Checking server wallet balance...');
            const serverWalletAddress = Deno.env.get('VITE_SERVER_WALLET_ADDRESS');
            // Query server wallet balance using Thirdweb API
            try {
                const balanceCheckUrl = `https://api.thirdweb.com/v1/wallets/${serverWalletAddress}/balances?chainId=${targetChainId}`;
                console.log('📊 Balance check URL:', balanceCheckUrl);
                const balanceResponse = await fetch(balanceCheckUrl, {
                    headers: {
                        'x-client-id': Deno.env.get('VITE_THIRDWEB_CLIENT_ID') || '',
                        'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || ''
                    }
                });
                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    console.log('💰 Server wallet balance:', JSON.stringify(balanceData, null, 2));
                } else {
                    console.warn('⚠️ Could not check wallet balance:', await balanceResponse.text());
                }
            } catch (balanceError) {
                console.warn('⚠️ Balance check failed (non-critical):', balanceError);
            }
            // Prepare request body - omit tokenAddress for native tokens
            const requestBody = {
                from: serverWalletAddress,
                chainId: targetChainId.toString(),
                recipients: [
                    {
                        address: recipientAddress,
                        quantity: amountInWei
                    }
                ]
            };
            // Only add tokenAddress for ERC20 tokens, not for native tokens
            if (!targetTokenInfo.isNative && targetTokenAddress) {
                requestBody.tokenAddress = targetTokenAddress;
            }
            console.log('🚀 Calling thirdweb wallets/send API:', JSON.stringify(requestBody, null, 2));
            const walletResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': Deno.env.get('VITE_THIRDWEB_CLIENT_ID') || '',
                    'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
                    'x-vault-access-token': Deno.env.get('VITE_VALUE_ACCESS_TOKEN') || ''
                },
                body: JSON.stringify(requestBody)
            });
            if (!walletResponse.ok) {
                const errorText = await walletResponse.text();
                console.error(`❌ Thirdweb API error: ${walletResponse.status}`, errorText);
                await logger.logAPICall('thirdweb-wallets-send', false, null, {
                    status: walletResponse.status,
                    error: errorText,
                    requestBody
                });
                throw new Error(`Thirdweb wallets API failed: ${walletResponse.status} ${errorText}`);
            }
            const walletData = await walletResponse.json();
            console.log('🔍 Wallet API Response:', JSON.stringify(walletData, null, 2));
            await logger.logAPICall('thirdweb-wallets-send', true, walletData);
            // Handle different response formats
            let queueId = null;
            if (walletData.result && walletData.result.transactionIds && walletData.result.transactionIds.length > 0) {
                queueId = walletData.result.transactionIds[0];
            } else if (walletData.result && walletData.result.queueId) {
                queueId = walletData.result.queueId;
            } else if (walletData.queueId) {
                queueId = walletData.queueId;
            } else if (walletData.transactionHash) {
                queueId = walletData.transactionHash;
            }
            if (!queueId) {
                console.error('❌ No queue ID found in response:', walletData);
                await logger.logError('thirdweb-queue-id-missing', 'api_calls', `No queue ID found in thirdweb response`, 'QUEUE_ID_MISSING', walletData);
                throw new Error(`Thirdweb wallets API error: ${JSON.stringify(walletData)}`);
            }
            console.log(`✅ Direct transfer queue ID: ${queueId}`);
            await logger.logInfo('direct-transfer-queued', 'api_calls', {
                queueId,
                netAmount,
                recipientAddress
            });
            result = {
                transactionHash: queueId,
                feeTransactionHash: null,
                bridged: false
            };
        } else {
            // Cross-chain or cross-token: First swap via bridge, then send
            console.log(`🌉 Swap + Send: ARB USDT -> ${targetTokenInfo.symbol} on chain ${targetChainId}`);
            // Step 1: Use bridge/swap API to convert ARB USDT to target chain/token
            const grossAmountInWei = calculateAmountWithDecimals(withdrawalAmount, sourceToken.decimals) // Source ARB USDT decimals
            ;
            // Prepare swap request body with correct thirdweb bridge format
            const swapRequestBody = {
                from: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
                to: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
                tokenIn: {
                    chainId: sourceChainId || 42161,
                    address: sourceTokenAddress,
                    amount: grossAmountInWei,
                    decimals: sourceToken.decimals
                },
                tokenOut: {
                    chainId: targetChainId,
                    address: targetTokenInfo.isNative ? undefined : targetTokenAddress,
                    decimals: targetTokenInfo.decimals
                }
            };
            // 如果是native token，移除address字段
            if (targetTokenInfo.isNative) {
                delete swapRequestBody.tokenOut.address;
            }
            const swapResponse = await fetch('https://api.thirdweb.com/v1/bridge/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': Deno.env.get('VITE_THIRDWEB_CLIENT_ID') || '',
                    'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
                    'x-vault-access-token': Deno.env.get('VITE_VALUE_ACCESS_TOKEN') || ''
                },
                body: JSON.stringify(swapRequestBody)
            });
            if (!swapResponse.ok) {
                const errorText = await swapResponse.text();
                throw new Error(`Bridge swap failed: ${swapResponse.status} ${errorText}`);
            }
            const swapData = await swapResponse.json();
            console.log('✅ Bridge swap initiated:', swapData.result?.queueId);
            // Step 2: Send the net amount to user using wallets/send API
            // Note: In production, you'd monitor the swap completion via webhook before sending
            const netAmountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals);
            // Prepare send request body
            const sendRequestBody = {
                from: Deno.env.get('VITE_SERVER_WALLET_ADDRESS'),
                chainId: targetChainId.toString(),
                recipients: [
                    {
                        address: recipientAddress,
                        quantity: netAmountInWei // Send net amount (fee already deducted)
                    }
                ]
            };
            // Only add tokenAddress for ERC20 tokens, not for native tokens
            if (!targetTokenInfo.isNative && targetTokenAddress) {
                sendRequestBody.tokenAddress = targetTokenAddress;
            }
            const sendResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': Deno.env.get('VITE_THIRDWEB_CLIENT_ID') || '',
                    'x-secret-key': Deno.env.get('VITE_THIRDWEB_SECRET_KEY') || '',
                    'x-vault-access-token': Deno.env.get('VITE_VALUE_ACCESS_TOKEN') || ''
                },
                body: JSON.stringify(sendRequestBody)
            });
            if (!sendResponse.ok) {
                const errorText = await sendResponse.text();
                throw new Error(`User transfer failed: ${sendResponse.status} ${errorText}`);
            }
            const sendData = await sendResponse.json();
            if (!sendData.result || !sendData.result.queueId) {
                throw new Error(`User transfer API error: ${sendData.error || 'No queue ID returned'}`);
            }
            result = {
                transactionHash: sendData.result.queueId,
                feeTransactionHash: swapData.result?.queueId,
                bridged: true,
                swapQueueId: swapData.result?.queueId,
                sendQueueId: sendData.result.queueId,
                targetToken: targetTokenInfo
            };
        }
        // Record withdrawal in database
        const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        console.log(`💾 Recording withdrawal in database: ${withdrawalId}`);
        await logger.logInfo('withdrawal-record-created', 'database_operations', {
            withdrawalId,
            memberWallet,
            withdrawalAmount,
            netAmount,
            fee,
            targetChainId,
            isCrossChain: result.bridged
        });
        const { error: insertError } = await supabase.from('withdrawal_requests').insert({
            id: withdrawalId,
            user_wallet: recipientAddress,
            amount: withdrawalAmount.toString(),
            target_chain_id: targetChainId,
            token_address: targetTokenAddress || 'native',
            user_signature: result.bridged ? 'thirdweb_swap_and_send' : 'thirdweb_direct_send',
            status: 'processing',
            transaction_hash: result.transactionHash,
            created_at: new Date().toISOString(),
            completed_at: null,
            metadata: {
                fee_transaction_hash: result.feeTransactionHash,
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
                processing_steps: result.bridged ? [
                    `swap_${sourceToken.symbol}_to_${targetTokenInfo.symbol}`,
                    'send_to_user'
                ] : [
                    `direct_send_${targetTokenInfo.symbol}`
                ],
                settlement_currency: 'ARB_USDC',
                target_currency: targetTokenInfo.symbol
            }
        });
        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            await logger.logDatabaseError('withdrawal-record-insert-failed', insertError, {
                withdrawalId
            });
            throw new Error('Failed to record withdrawal in database');
        }
        // Update user balance (skip for admin withdrawals)
        if (skipBalanceCheck === true) {
            console.log(`⚠️ Skipping balance update for admin withdrawal (skipBalanceCheck=true)`);
            await logger.logInfo('balance-update-skipped', 'wallet_operations', {
                memberWallet,
                reason: 'admin_withdrawal',
                withdrawalAmount
            });
        } else {
            console.log(`💰 Updating user balance for: ${memberWallet}`);
            const currentAvailableBalance = userBalance.available_balance || userBalance.reward_balance || 0;
            const { data: currentBalanceData, error: balanceQueryError } = await supabase.from('user_balances').select('total_withdrawn, available_balance, reward_balance').ilike('wallet_address', memberWallet).single();
            if (balanceQueryError) {
                console.error('❌ Balance query error:', balanceQueryError);
                await logger.logDatabaseError('balance-query-error', balanceQueryError, {
                    memberWallet
                });
            }
            const currentWithdrawn = currentBalanceData?.total_withdrawn || 0;
            const newAvailableBalance = Math.max(0, currentAvailableBalance - withdrawalAmount);
            const newTotalWithdrawn = currentWithdrawn + withdrawalAmount;
            console.log(`💰 Balance update: available ${currentAvailableBalance} -> ${newAvailableBalance}, withdrawn ${currentWithdrawn} -> ${newTotalWithdrawn}`);
            // Update both available_balance and reward_balance for backward compatibility
            const { error: balanceUpdateError } = await supabase.from('user_balances').update({
                available_balance: newAvailableBalance,
                reward_balance: newAvailableBalance,
                total_withdrawn: newTotalWithdrawn,
                last_updated: new Date().toISOString()
            }).ilike('wallet_address', memberWallet);
            if (balanceUpdateError) {
                console.error('❌ Balance update error:', balanceUpdateError);
                await logger.logDatabaseError('balance-update-failed', balanceUpdateError, {
                    memberWallet,
                    newAvailableBalance,
                    newTotalWithdrawn
                });
                throw new Error('Failed to update user balance');
            }
            console.log(`✅ Balance updated successfully`);
            await logger.logInfo('balance-updated', 'wallet_operations', {
                memberWallet,
                previousAvailableBalance: currentAvailableBalance,
                newAvailableBalance,
                withdrawalAmount,
                newTotalWithdrawn
            });
        }
        console.log('✅ Withdrawal processed successfully:', withdrawalId);
        // Final success response
        const responseData = {
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
            message: result.bridged ? `跨链提现已启动：${withdrawalAmount} ${sourceToken.symbol} → ${netAmount} ${targetTokenInfo.symbol}（扣除 ${fee} USDT 手续费）` : `直接提现已启动：${netAmount} ${targetTokenInfo.symbol}（扣除 ${fee} USDT 手续费）`
        };
        // Complete performance timer and log final success
        await timer.end('wallet_operations', true, responseData);
        await logger.logSuccess('withdrawal-completed', 'wallet_operations', {
            withdrawalId,
            memberWallet,
            recipientAddress,
            withdrawalAmount,
            netAmount,
            fee,
            targetChainId,
            targetToken: targetTokenInfo.symbol,
            transactionHash: result.transactionHash,
            isCrossChain: result.bridged
        });
        return new Response(JSON.stringify(responseData), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 200
        });
    } catch (error) {
        console.error('❌ Withdrawal function error:', error);
        // Log critical error if logger is available
        if (logger) {
            await logger.logCritical('withdrawal-function-error', 'wallet_operations', error, 'WITHDRAWAL_ERROR', {
                errorMessage: error.message,
                errorStack: error.stack
            });
            // Complete timer with error if available
            if (timer) {
                await timer.end('wallet_operations', false, null, error);
            }
        }
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            details: error instanceof Error ? error.message : String(error)
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
});
