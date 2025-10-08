'use client';

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiLoader } from 'react-icons/fi';
import { toast } from "react-hot-toast";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { useRouter } from 'next/navigation';
import { defineChain, getContract } from "thirdweb";
import { client } from "@/utils/thirdweb/client";
import { parseUnits } from "viem";
import { claimTo } from "thirdweb/extensions/erc1155";
import { optimism } from "thirdweb/chains";
import { getApprovalForTransaction } from "thirdweb/extensions/erc20";
import { supabase } from "@/lib/supabase";

// 合约地址
const USDC_CONTRACT = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";  // Optimism USDC
const STAR_NFT_CONTRACTS = {
    DEMO: "0x2aFA062e70C5040e17BEb1827f16d74BF7111dA8",
    PROD: "0x31FF15aAA5CBD8Af46838c30dF141e20e1E244fe"
} as const;

// NFT 类型定义
type NFTType = 'Nova' | 'Orbit' | 'Stellar' | 'Polaris';

// NFT 价格配置
const NFT_PRICES: Record<NFTType, number> = {
    'Nova': 500,
    'Orbit': 1000,
    'Stellar': 3000,
    'Polaris': 7000
};

interface ClaimStarNFTButtonProps {
    walletAddress: string;
    tokenId: number;
    nftType: NFTType;
    style?: React.CSSProperties;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    disabled?: boolean;
    isDemo?: boolean;
}

export function ClaimStarNFTButton({
                                       walletAddress,
                                       tokenId,
                                       nftType,
                                       style,
                                       onSuccess,
                                       onError,
                                       disabled,
                                       isDemo = false
                                   }: ClaimStarNFTButtonProps) {
    const { t } = useTranslation();
    const account = useActiveAccount();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const { mutateAsync: sendTransaction } = useSendTransaction();

    // 获取正确的合约地址
    const contractAddress = isDemo ? STAR_NFT_CONTRACTS.DEMO : STAR_NFT_CONTRACTS.PROD;

    // 获取合约实例
    const contract = getContract({
        client,
        chain: defineChain(optimism),
        address: contractAddress,
    });

    // 获取 USDC 合约实例用于检查授权
    const USDCContract = getContract({
        client,
        chain: defineChain(optimism),
        address: USDC_CONTRACT,
        abi: [{
            name: "allowance",
            type: "function",
            stateMutability: "view",
            inputs: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" }
            ],
            outputs: [{ type: "uint256" }]
        }] as const
    });

    // 检查授权额度
    const { data: allowance } = useReadContract({
        contract: USDCContract,
        method: "allowance",
        params: [account?.address ?? '', contractAddress]
    });

    const handleClick = async () => {
        if (!account) {
            toast.error(t("wallet.connect_first"));
            return;
        }

        if (isProcessing || disabled) return;

        try {
            setIsProcessing(true);

            // 检查NFT是否已经被认领
            const { data: claimedData } = await supabase
                .from('star_nft_claimed')
                .select('id')
                .eq('wallet_address', walletAddress.toLowerCase())
                .eq('token_id', tokenId)
                .single();

            if (claimedData) {
                toast.error(t("starNFT.claim.alreadyClaimed"));
                return;
            }

            // 构建 claim 交易
            const claimTransaction = claimTo({
                contract,
                quantity: BigInt(1),
                tokenId: BigInt(tokenId),
                to: walletAddress,
            });

            // 检查是否需要授权
            if (!allowance || allowance < parseUnits(NFT_PRICES[nftType].toString(), 6)) {
                setIsApproving(true);
                toast.loading(
                    <div className="flex flex-col gap-2">
                        <p className="font-semibold">{t("messages.approving")}</p>
                        <p className="text-sm text-gray-300">{t("messages.approveConfirm")}</p>
                        <div className="mt-2 text-xs text-purple-400">
                            {t("messages.approveTip")}
                        </div>
                    </div>,
                    { id: 'approve-toast', duration: undefined }
                );

                try {
                    const approveTx = await getApprovalForTransaction({
                        transaction: claimTransaction,
                        account,
                    });

                    if (approveTx) {
                        await sendTransaction(approveTx);
                        toast.success(
                            <div className="flex flex-col gap-2">
                                <p className="font-semibold">{t("messages.approved")}</p>
                                <p className="text-sm text-gray-300">{t("messages.approveProceed")}</p>
                            </div>,
                            { id: 'approve-toast', duration: 3000 }
                        );
                    }
                } catch (error: any) {
                    console.error('Approval error:', error);
                    if (error.message?.includes('insufficient funds')) {
                        toast.error(t("messages.noTokens"), { id: 'approve-toast' });
                    } else if (error.code === 4001) {
                        toast.error(t("messages.transactionError"), { id: 'approve-toast' });
                    } else {
                        toast.error(t("messages.approvalFailed"), { id: 'approve-toast' });
                    }
                    return;
                } finally {
                    setIsApproving(false);
                }
            }

            // 构建查询参数
            const searchParams = new URLSearchParams();
            searchParams.set('type', 'star');
            searchParams.set('tokenId', tokenId.toString());
            searchParams.set('nftType', nftType);
            searchParams.set('isDemo', isDemo.toString());
            searchParams.set('price', NFT_PRICES[nftType].toString());

            // 跳转到购买页面
            router.push(`/purchase?${searchParams.toString()}`);

        } catch (error) {
            console.error('Claim error:', error);
            toast.error(t("starNFT.claim.error"));
            if (error instanceof Error) {
                onError?.(error);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={!account || isProcessing || disabled}
            className="w-full py-4 px-6 rounded-xl text-white font-medium
        bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
        transition-colors duration-200
        shadow-lg shadow-purple-500/20
        border border-purple-400/30 backdrop-blur-sm
        disabled:opacity-50 disabled:cursor-not-allowed"
            style={style}
        >
            <div className="flex items-center justify-center gap-2">
                {isProcessing ? (
                    <>
                        <FiLoader className="animate-spin" />
                        {isApproving ? t('messages.approving') : t('common.processing')}
                    </>
                ) : (
                    <>
                        <span>{t('starNFT.buttons.claim')}</span>
                        <span className="text-xl">⭐</span>
                    </>
                )}
            </div>
        </button>
    );
}
