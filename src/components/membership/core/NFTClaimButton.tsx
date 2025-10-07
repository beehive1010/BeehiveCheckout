/**
 * Base NFT Claim Component
 *
 * Core functionality for claiming NFTs with USDT payment
 * Used by both activation and upgrade buttons
 */

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getContract, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { approve, balanceOf as erc20BalanceOf, allowance } from 'thirdweb/extensions/erc20';
import { useToast } from '../../../hooks/use-toast';
import { client } from '../../../lib/thirdwebClient';

// Contract addresses
const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008'; // Arbitrum Mainnet USDT
const NFT_CONTRACT = '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693'; // Arbitrum Mainnet NFT

export interface NFTClaimConfig {
  level: number;
  priceUSDT: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  activationEndpoint?: string; // API endpoint to call after claim
  activationPayload?: Record<string, any>; // Additional data for activation
}

export function useNFTClaim() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const sendTransactionWithRetry = async (
    transaction: any,
    account: any,
    description: string,
    maxRetries = 3
  ) => {
    let lastError: any = null;
    const baseDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Sending ${description} (attempt ${attempt}/${maxRetries})...`);

        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }

        const result = await sendTransaction({
          transaction,
          account,
        });

        console.log(`✅ ${description} successful on attempt ${attempt}`);
        return result;

      } catch (error: any) {
        lastError = error;
        console.error(`❌ ${description} failed on attempt ${attempt}:`, error.message);

        if (
          error.message?.includes('User rejected') ||
          error.message?.includes('user denied') ||
          error.message?.includes('User cancelled')
        ) {
          throw new Error('Transaction cancelled by user');
        }

        if (attempt === maxRetries) {
          break;
        }

        console.log(`🔄 Retrying ${description} in ${baseDelay * attempt}ms...`);
      }
    }

    throw new Error(
      `${description} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  };

  const claimNFT = async (config: NFTClaimConfig): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!account?.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    const { level, priceUSDT, onSuccess, onError, activationEndpoint, activationPayload } = config;
    const priceWei = BigInt(priceUSDT * 1_000_000); // USDT has 6 decimals

    console.log(`🎯 Starting NFT claim for Level ${level}`);
    setIsProcessing(true);

    try {
      // Step 1: Setup contracts
      const usdtContract = getContract({
        client,
        address: USDT_CONTRACT,
        chain: arbitrum,
      });

      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrum,
      });

      // Step 2: Check USDT balance
      console.log('💰 Checking USDT balance...');
      setCurrentStep('Checking USDT balance...');

      const tokenBalance = await erc20BalanceOf({
        contract: usdtContract,
        address: account.address,
      });

      if (tokenBalance < priceWei) {
        const errorMsg = `Insufficient USDT balance. You have ${(Number(tokenBalance) / 1e6).toFixed(2)} USDT but need ${priceUSDT} USDT`;
        throw new Error(errorMsg);
      }

      console.log('✅ Sufficient USDT balance confirmed');

      // Step 3: Check and request approval
      setCurrentStep('Checking USDT approval...');

      const currentAllowance = await allowance({
        contract: usdtContract,
        owner: account.address,
        spender: NFT_CONTRACT,
      });

      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e6} USDT, Required: ${priceUSDT} USDT`);

      if (currentAllowance < priceWei) {
        console.log(`💰 Requesting USDT approval for exactly ${priceUSDT} USDT...`);

        toast({
          title: '⏳ Approval Required',
          description: `Please approve ${priceUSDT} USDT spending in your wallet`,
          duration: 5000,
        });

        // ⚠️ IMPORTANT: Approve exact amount only (not unlimited)
        // This is safer and follows best practices for ERC20 approvals
        const approveTransaction = approve({
          contract: usdtContract,
          spender: NFT_CONTRACT,
          amount: priceWei.toString(), // Exact amount in wei (6 decimals for USDT)
        });

        setCurrentStep('Waiting for approval...');

        const approveTxResult = await sendTransactionWithRetry(
          approveTransaction,
          account,
          'USDT approval transaction'
        );

        await waitForReceipt({
          client,
          chain: arbitrum,
          transactionHash: approveTxResult?.transactionHash,
        });

        console.log('✅ USDT approval confirmed');

        toast({
          title: '✅ USDT Approved',
          description: `Now claiming your Level ${level} NFT...`,
          duration: 3000,
        });
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 4: Claim NFT
      console.log(`🎁 Claiming Level ${level} NFT...`);
      setCurrentStep(`Minting Level ${level} NFT...`);

      toast({
        title: '⏳ Claiming NFT',
        description: 'Please confirm the claim transaction in your wallet',
        duration: 5000,
      });

      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(level),
        quantity: BigInt(1),
      });

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        `Level ${level} NFT claim transaction`
      );

      // Wait for confirmation
      setCurrentStep('Waiting for NFT confirmation...');
      await waitForReceipt({
        client,
        chain: arbitrum,
        transactionHash: claimTxResult.transactionHash,
        maxBlocksWaitTime: 50,
      });

      console.log(`✅ Level ${level} NFT claim confirmed`);
      console.log('🔗 Transaction hash:', claimTxResult.transactionHash);

      // Step 5: Call activation endpoint if provided
      if (activationEndpoint) {
        toast({
          title: '🎉 NFT Claimed!',
          description: 'Processing membership activation...',
          duration: 5000,
        });

        setCurrentStep('Activating membership...');

        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

        const activateResponse = await fetch(`${API_BASE}/${activationEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': account.address,
          },
          body: JSON.stringify({
            walletAddress: account.address,        // ✅ Match Edge Function parameter name
            level,
            transactionHash: claimTxResult.transactionHash,  // ✅ Match Edge Function parameter name
            paymentAmount: priceUSDT,
            ...activationPayload,  // Contains referrerWallet
          }),
        });

        if (!activateResponse.ok) {
          const errorText = await activateResponse.text();
          console.error('❌ Activation API call failed:', errorText);

          toast({
            title: '⚠️ NFT Claimed but Activation Failed',
            description: 'NFT claimed successfully, but database activation failed. Please contact support with your transaction hash.',
            variant: 'destructive',
            duration: 10000,
          });

          // Don't call onSuccess if activation failed
          // Return partial success with error details
          return {
            success: false,
            txHash: claimTxResult.transactionHash,
            error: `Activation failed: ${errorText}`,
            nftClaimed: true // NFT was claimed but activation failed
          };
        } else {
          const activateResult = await activateResponse.json();
          console.log('✅ Membership activated:', activateResult);

          // Only call onSuccess if activation was successful
          if (onSuccess) {
            onSuccess();
          }
        }
      } else {
        // No activation endpoint, just call onSuccess
        if (onSuccess) {
          onSuccess();
        }
      }

      return { success: true, txHash: claimTxResult.transactionHash };

    } catch (error: any) {
      console.error('❌ Claim error:', error);

      let errorMessage = 'Failed to claim NFT';
      if (error.message?.includes('Insufficient USDT')) {
        errorMessage = error.message;
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (error.message?.includes('cancelled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: '❌ Claim Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });

      if (onError) {
        onError(new Error(errorMessage));
      }

      return { success: false, error: errorMessage };

    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return {
    claimNFT,
    isProcessing,
    currentStep,
  };
}
