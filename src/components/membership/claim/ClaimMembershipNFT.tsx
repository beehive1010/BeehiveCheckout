/**
 * Membership NFT Claim Component
 *
 * Based on the StarNFT claim flow:
 * 1. Check USDT allowance
 * 2. Approve if needed
 * 3. Navigate to purchase page with PayEmbed
 */

import { useState } from 'react';
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
import { Loader2, Crown } from 'lucide-react';

// 合约地址
const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008'; // Arbitrum USDT
const NFT_CONTRACT = '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693'; // Membership NFT

// Level 价格配置
const LEVEL_PRICES: Record<number, number> = {
  1: 130,
  2: 150,
  3: 200,
  4: 250,
  5: 300,
  6: 350,
  7: 400,
  8: 450,
  9: 500,
  10: 550,
  11: 600,
  12: 650,
  13: 700,
  14: 750,
  15: 800,
  16: 850,
  17: 900,
  18: 950,
  19: 1000,
};

interface ClaimMembershipNFTProps {
  level: number; // 1-19
  referrerWallet?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function ClaimMembershipNFT({
  level,
  referrerWallet,
  onSuccess,
  onError,
  disabled,
  className = '',
}: ClaimMembershipNFTProps) {
  const { t } = useI18n();
  const account = useActiveAccount();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const price = LEVEL_PRICES[level] || 0;

  // 获取 NFT 合约实例
  const nftContract = getContract({
    client,
    chain: arbitrum,
    address: NFT_CONTRACT,
  });

  // 获取 USDT 合约实例用于检查授权
  const usdtContract = getContract({
    client,
    chain: arbitrum,
    address: USDT_CONTRACT,
  });

  // 检查 USDT 授权额度
  const { data: allowance } = useReadContract({
    contract: usdtContract,
    method: 'function allowance(address owner, address spender) view returns (uint256)',
    params: [account?.address ?? '', NFT_CONTRACT],
  });

  const handleClaim = async () => {
    if (!account) {
      toast({
        title: t('wallet.connectFirst'),
        description: t('wallet.connectFirstDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (isProcessing || disabled) return;

    try {
      setIsProcessing(true);

      // 构建 claim 交易
      const claimTransaction = claimTo({
        contract: nftContract,
        quantity: BigInt(1),
        tokenId: BigInt(level),
        to: account.address,
      });

      // 检查是否需要授权
      const requiredAmount = parseUnits(price.toString(), 6); // USDT has 6 decimals
      if (!allowance || allowance < requiredAmount) {
        setIsApproving(true);

        toast({
          title: '⏳ ' + t('messages.approving'),
          description: t('messages.approveConfirm'),
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
              title: '✅ ' + t('messages.approved'),
              description: t('messages.approveProceed'),
              duration: 3000,
            });
          }
        } catch (error: any) {
          console.error('Approval error:', error);

          if (error.message?.includes('insufficient funds')) {
            toast({
              title: t('messages.noTokens'),
              variant: 'destructive',
            });
          } else if (error.code === 4001 || error.message?.includes('User rejected')) {
            toast({
              title: t('messages.transactionError'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('messages.approvalFailed'),
              description: error.message,
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

      // 构建查询参数
      const searchParams = new URLSearchParams();
      searchParams.set('type', 'membership');
      searchParams.set('level', level.toString());
      searchParams.set('price', price.toString());
      if (referrerWallet) {
        searchParams.set('referrer', referrerWallet);
      }

      // 跳转到购买页面
      console.log('🔗 Navigating to purchase page:', `/purchase?${searchParams.toString()}`);
      setLocation(`/purchase?${searchParams.toString()}`);

    } catch (error) {
      console.error('Claim error:', error);

      toast({
        title: t('claim.error'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });

      if (error instanceof Error) {
        onError?.(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={!account || isProcessing || disabled}
      className={`w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50 ${className}`}
    >
      {!account ? (
        <>
          <Crown className="mr-2 h-5 w-5" />
          {t('claim.connectWalletToClaimNFT')}
        </>
      ) : isProcessing ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {isApproving ? t('messages.approving') : t('common.processing')}
        </>
      ) : (
        <>
          <Crown className="mr-2 h-5 w-5" />
          {t('claim.claimLevel', { level })} - {price} USDT
        </>
      )}
    </Button>
  );
}
