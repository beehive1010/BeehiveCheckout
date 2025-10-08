/**
 * Claim Membership NFT Button - Beehive UI Style
 *
 * Complete flow with PayEmbed:
 * 1. Check registration status
 * 2. Validate referrer
 * 3. Check requirements (Level 2 needs 3+ referrals)
 * 4. Approve USDT if needed
 * 5. Navigate to purchase page with PayEmbed
 */

import { useState, useEffect } from 'react';
import { useActiveAccount, useSendTransaction, useReadContract } from 'thirdweb/react';
import { useLocation } from 'wouter';
import { getContract } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { getApprovalForTransaction } from 'thirdweb/extensions/erc20';
import { parseUnits } from 'viem';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useI18n } from '../../../contexts/I18nContext';
import { client } from '../../../lib/thirdwebClient';
import { Loader2, Crown, Zap, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Contracts (Updated 2025-10-08)
const USDT_CONTRACT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // Official Arbitrum USDT
const NFT_CONTRACT = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29'; // Beehive Membership NFT

interface ClaimMembershipNFTButtonProps {
  level: number;
  price: number;
  referrerWallet?: string;
  disabled?: boolean;
  isSelected?: boolean;
  currentLevel?: number;
  directReferralsCount?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function ClaimMembershipNFTButton({
  level,
  price,
  referrerWallet,
  disabled,
  isSelected = false,
  currentLevel = 0,
  directReferralsCount = 0,
  onSuccess,
  onError,
  className = '',
}: ClaimMembershipNFTButtonProps) {
  const { t } = useI18n();
  const account = useActiveAccount();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Get contracts
  const nftContract = getContract({
    client,
    chain: arbitrum,
    address: NFT_CONTRACT,
  });

  const usdtContract = getContract({
    client,
    chain: arbitrum,
    address: USDT_CONTRACT,
  });

  // Check USDT allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    contract: usdtContract,
    method: 'function allowance(address owner, address spender) view returns (uint256)',
    params: account?.address ? [account.address, NFT_CONTRACT] : undefined,
  });

  // Check if user can claim this level
  const canClaim = () => {
    if (!account) return { can: false, reason: 'wallet_not_connected' };
    if (level <= currentLevel) return { can: false, reason: 'already_owned' };
    if (level > currentLevel + 1) return { can: false, reason: 'sequential_upgrade' };

    // Level 2 special requirement
    if (level === 2 && directReferralsCount < 3) {
      return { can: false, reason: 'needs_referrals', needed: 3 - directReferralsCount };
    }

    return { can: true, reason: 'ok' };
  };

  const claimStatus = canClaim();

  const handleClaim = async () => {
    if (!account) {
      toast({
        title: t('wallet.connectFirst'),
        description: t('wallet.connectFirstDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!claimStatus.can) {
      if (claimStatus.reason === 'needs_referrals') {
        toast({
          title: '⚠️ Requirements Not Met',
          description: `Level 2 requires 3 direct referrals. You need ${claimStatus.needed} more.`,
          variant: 'destructive',
          duration: 5000,
        });
      }
      return;
    }

    if (isProcessing || disabled) return;

    try {
      setIsProcessing(true);
      setIsCheckingStatus(true);
      setStatusMessage('Checking registration status...');

      // Step 1: Check registration
      const API_BASE = import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      console.log('🔍 Checking user registration...');
      const userCheckResponse = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          action: 'get-user',
        }),
      });

      if (!userCheckResponse.ok) {
        throw new Error('Failed to check user status');
      }

      const userStatus = await userCheckResponse.json();

      if (!userStatus.isRegistered) {
        setIsCheckingStatus(false);
        toast({
          title: '⚠️ Registration Required',
          description: 'Please register before claiming membership NFTs',
          variant: 'destructive',
        });

        setTimeout(() => {
          setLocation('/register');
        }, 2000);
        return;
      }

      console.log('✅ User is registered:', userStatus);

      // Step 2: Build claim transaction
      setStatusMessage('Preparing transaction...');
      const claimTransaction = claimTo({
        contract: nftContract,
        quantity: BigInt(1),
        tokenId: BigInt(level),
        to: account.address,
      });

      // Step 3: Check and approve USDT if needed
      const requiredAmount = parseUnits(price.toString(), 6);
      await refetchAllowance();

      if (!allowance || allowance < requiredAmount) {
        setIsApproving(true);
        setStatusMessage('Approving USDT...');

        toast({
          title: '⏳ Approval Required',
          description: 'Please approve USDT spending in your wallet',
          duration: 5000,
        });

        try {
          const approveTx = await getApprovalForTransaction({
            transaction: claimTransaction,
            account,
          });

          if (approveTx) {
            await sendTransaction(approveTx);

            toast({
              title: '✅ USDT Approved',
              description: 'Proceeding to payment...',
              duration: 3000,
            });

            // Wait for approval to be confirmed
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          console.error('Approval error:', error);

          if (error.message?.includes('insufficient funds')) {
            toast({
              title: '❌ Insufficient Balance',
              description: `You need ${price} USDT to claim this level`,
              variant: 'destructive',
            });
          } else if (error.code === 4001 || error.message?.includes('User rejected')) {
            toast({
              title: '❌ Transaction Rejected',
              description: 'You rejected the approval transaction',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '❌ Approval Failed',
              description: error.message || 'Please try again',
              variant: 'destructive',
            });
          }

          if (onError && error instanceof Error) {
            onError(error);
          }
          return;
        } finally {
          setIsApproving(false);
        }
      }

      // Step 4: Navigate to purchase page
      setStatusMessage('Redirecting to payment...');

      const searchParams = new URLSearchParams();
      searchParams.set('type', 'membership');
      searchParams.set('level', level.toString());
      searchParams.set('price', price.toString());
      if (referrerWallet) {
        searchParams.set('referrer', referrerWallet);
      }

      console.log('🔗 Navigating to purchase page');

      toast({
        title: '✅ Ready to Purchase',
        description: 'Redirecting to payment page...',
        duration: 2000,
      });

      setTimeout(() => {
        setLocation(`/membership-purchase?${searchParams.toString()}`);
      }, 1000);

    } catch (error) {
      console.error('Claim error:', error);

      toast({
        title: '❌ Claim Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });

      if (error instanceof Error) {
        onError?.(error);
      }
    } finally {
      setIsProcessing(false);
      setIsCheckingStatus(false);
      setStatusMessage('');
    }
  };

  // Get button content based on state
  const getButtonContent = () => {
    if (!account) {
      return (
        <>
          <Crown className="mr-2 h-5 w-5" />
          {t('wallet.connectFirst')}
        </>
      );
    }

    if (isProcessing) {
      return (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {isApproving ? 'Approving USDT...' : isCheckingStatus ? 'Checking...' : 'Processing...'}
        </>
      );
    }

    if (!claimStatus.can) {
      if (claimStatus.reason === 'already_owned') {
        return (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Already Owned
          </>
        );
      }
      if (claimStatus.reason === 'needs_referrals') {
        return (
          <>
            <Users className="mr-2 h-5 w-5" />
            Need {claimStatus.needed} More Referrals
          </>
        );
      }
      if (claimStatus.reason === 'sequential_upgrade') {
        return (
          <>
            <AlertCircle className="mr-2 h-5 w-5" />
            Upgrade Sequentially
          </>
        );
      }
    }

    return (
      <>
        <Zap className="mr-2 h-5 w-5" />
        Claim Level {level} - ${price} USDT
      </>
    );
  };

  const isButtonDisabled = !account || isProcessing || disabled || !isSelected || !claimStatus.can;

  return (
    <div className="relative">
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-0 right-0 text-center"
          >
            <p className="text-xs text-honey">{statusMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleClaim}
        disabled={isButtonDisabled}
        className={`relative w-full h-14 overflow-hidden transition-all duration-300 ${
          isSelected && claimStatus.can
            ? 'bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 shadow-lg shadow-honey/30 hover:shadow-honey/50'
            : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
        } text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {/* Animated background glow */}
        {isSelected && claimStatus.can && !isProcessing && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-honey/30 via-orange-500/30 to-honey/30"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}

        <span className="relative z-10 flex items-center justify-center">
          {getButtonContent()}
        </span>
      </Button>
    </div>
  );
}
