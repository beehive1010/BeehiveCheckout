/**
 * Membership NFT Purchase Page
 *
 * Based on StarNFT purchase flow (src/pages/_archive/puchase.tsx)
 * Uses PayEmbed for flexible payment (crypto + credit card)
 */

import { useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useLocation } from 'wouter';
import { PurchasePage } from '../components/membership/puchase/PurchasePage';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { client } from '../lib/thirdwebClient';
import { getBuyWithCryptoStatus, getContract } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { useToast } from '../hooks/use-toast';
import { useI18n } from '../contexts/I18nContext';
import type { PayEmbedProps } from 'thirdweb/react';
import { Loader2 } from 'lucide-react';

// Membership NFT 合约地址
const NFT_CONTRACT = '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693';

// Level prices
const LEVEL_PRICES: Record<number, number> = {
  1: 130, 2: 150, 3: 200, 4: 250, 5: 300,
  6: 350, 7: 400, 8: 450, 9: 500, 10: 550,
  11: 600, 12: 650, 13: 700, 14: 750, 15: 800,
  16: 850, 17: 900, 18: 950, 19: 1000,
};

// Transaction verification config
const VERIFICATION_CONFIG = {
  POLLING_INTERVAL: 3000,
  MAX_RETRIES: 10, // Increased for cross-chain payments
};

export default function MembershipPurchase() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get query parameters (from URL)
  const searchParams = new URLSearchParams(window.location.search);
  const type = searchParams.get('type');
  const level = parseInt(searchParams.get('level') || '1');
  const price = searchParams.get('price');
  const referrerWallet = searchParams.get('referrer');

  // Validate parameters
  const isValidParams =
    type === 'membership' &&
    level >= 1 &&
    level <= 19 &&
    price &&
    parseInt(price) === LEVEL_PRICES[level];

  // Redirect if invalid
  useEffect(() => {
    if (!account || !isValidParams) {
      console.warn('⚠️ Invalid params or no account, redirecting to membership page');
      setLocation('/membership');
    }
  }, [account, isValidParams, setLocation]);

  // Verify membership activation with backend
  const verifyActivation = async (
    txHash: string,
    retryCount = 0
  ): Promise<boolean> => {
    try {
      if (!account?.address) {
        throw new Error('No wallet address');
      }

      console.log(`🔍 Verifying activation (attempt ${retryCount + 1}/${VERIFICATION_CONFIG.MAX_RETRIES})`, {
        txHash,
        walletAddress: account.address,
        level,
        referrerWallet,
      });

      // Call activate-membership Edge Function
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const activationEndpoint =
        level === 1 ? 'activate-membership' : 'level-upgrade';

      const response = await fetch(`${API_BASE}/${activationEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          walletAddress: account.address,
          level,
          transactionHash: txHash,
          paymentAmount: parseInt(price!),
          referrerWallet: referrerWallet,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Activation failed:', errorText);

        // Retry logic
        if (retryCount < VERIFICATION_CONFIG.MAX_RETRIES - 1) {
          console.log(`🔄 Retrying activation...`);
          await new Promise((resolve) =>
            setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL)
          );
          return verifyActivation(txHash, retryCount + 1);
        }

        throw new Error(`Activation failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Activation successful:', result);

      return true;
    } catch (error) {
      console.error('❌ Verification error:', error);

      if (retryCount < VERIFICATION_CONFIG.MAX_RETRIES - 1) {
        console.log(`🔄 Retrying verification...`);
        await new Promise((resolve) =>
          setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL)
        );
        return verifyActivation(txHash, retryCount + 1);
      }

      throw error;
    }
  };

  // Handle purchase success
  const handlePurchaseSuccess = async (info: {
    type: 'crypto';
    status: { transactionHash: string };
  }) => {
    try {
      setIsProcessing(true);
      console.log('🎉 Purchase success:', info);

      toast({
        title: '⏳ Processing...',
        description: 'Waiting for transaction confirmation...',
        duration: 5000,
      });

      // Poll transaction status using Thirdweb API
      const pollStatus = async (
        txHash: string,
        attempts = 0
      ): Promise<boolean> => {
        if (attempts >= VERIFICATION_CONFIG.MAX_RETRIES) {
          console.log('⏰ Max retries reached');
          return false;
        }

        try {
          console.log(
            `🔍 Polling tx status (${attempts + 1}/${VERIFICATION_CONFIG.MAX_RETRIES}):`,
            txHash
          );

          const status = await getBuyWithCryptoStatus({
            client,
            transactionHash: txHash,
          });

          console.log('📊 Transaction status:', status);

          if ('status' in status) {
            if (status.status === 'COMPLETED') {
              console.log('✅ Transaction completed, verifying activation...');

              const verified = await verifyActivation(txHash);
              if (verified) {
                toast({
                  title: '🎉 Membership Activated!',
                  description: `Level ${level} successfully activated`,
                  duration: 5000,
                });

                // Redirect to dashboard
                setTimeout(() => {
                  setLocation('/dashboard');
                }, 2000);

                return true;
              }
            } else if (status.status === 'FAILED') {
              console.error('❌ Transaction failed:', status.failureMessage);
              throw new Error(status.failureMessage || 'Transaction failed');
            }
          }

          // Continue polling
          console.log('⏳ Transaction pending, retrying...');
          await new Promise((resolve) =>
            setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL)
          );
          return pollStatus(txHash, attempts + 1);
        } catch (error) {
          console.error('❌ Poll status error:', error);

          if (attempts === VERIFICATION_CONFIG.MAX_RETRIES - 1) {
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL)
          );
          return pollStatus(txHash, attempts + 1);
        }
      };

      // Start polling
      const success = await pollStatus(info.status.transactionHash);

      if (!success) {
        toast({
          title: '⚠️ Activation Pending',
          description:
            'Transaction confirmed but activation is still processing. Please check back later.',
          variant: 'default',
          duration: 8000,
        });

        setTimeout(() => {
          setLocation('/membership');
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Purchase processing error:', error);

      toast({
        title: '❌ Activation Failed',
        description:
          error instanceof Error ? error.message : 'Please contact support',
        variant: 'destructive',
        duration: 10000,
      });

      setTimeout(() => {
        setLocation('/membership');
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render if invalid
  if (!account || !isValidParams) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-honey" />
      </div>
    );
  }

  // Get NFT contract instance
  const nftContract = getContract({
    client,
    chain: arbitrum,
    address: NFT_CONTRACT,
  });

  // Configure PayEmbed props
  const payEmbedProps: PayEmbedProps = {
    client,
    payOptions: {
      mode: 'transaction' as const,
      transaction: claimTo({
        contract: nftContract,
        quantity: BigInt(1),
        tokenId: BigInt(level),
        to: account.address,
      }),
      metadata: {
        name: `Membership Level ${level}`,
        image: `/nft-level${level}.png`, // Optional: add NFT images
      },
      onPurchaseSuccess: handlePurchaseSuccess as any,
    },
  };

  return (
    <PurchasePage
      payEmbedProps={payEmbedProps}
      isProcessing={isProcessing}
      onClose={() => setLocation('/membership')}
    />
  );
}
