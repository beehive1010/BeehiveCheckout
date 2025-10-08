'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useActiveAccount } from "thirdweb/react";
import { PurchasePage } from '@/components/common/PurchasePage/PurchasePage';
import { claimTo } from "thirdweb/extensions/erc1155";
import { client } from "@/utils/thirdweb/client";
import { getBuyWithCryptoStatus, getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from "@/types/database";
import type { PayEmbedProps } from "thirdweb/react";
import Loading from '@/components/common/Loading.tsx/Loading.tsx';

// 合约地址配置
const STAR_NFT_CONTRACTS = {
    DEMO: "0x2aFA062e70C5040e17BEb1827f16d74BF7111dA8",
    PROD: "0x31FF15aAA5CBD8Af46838c30dF141e20e1E244fe"
} as const;

// NFT 配置
const NFT_CONFIGS: Record<Database['public']['Enums']['nft_type'], {
    multiplier: number;
    opsFund: number;
    opeFund: number;
    price: number;
}> = {
    'Nova': { multiplier: 5, opsFund: 250, opeFund: 0, price: 500 },
    'Orbit': { multiplier: 6, opsFund: 550, opeFund: 0, price: 1000 },
    'Stellar': { multiplier: 7, opsFund: 1500, opeFund: 150, price: 3000 },
    'Polaris': { multiplier: 8, opsFund: 3850, opeFund: 350, price: 7000 }
};

// 交易验证配置
const VERIFICATION_CONFIG = {
    POLLING_INTERVAL: 3000,
    MAX_RETRIES: 5
};

function PurchaseContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const account = useActiveAccount();
    const [isProcessing, setIsProcessing] = useState(false);

    // 获取并验证查询参数
    const type = searchParams?.get('type');
    const tokenId = searchParams?.get('tokenId');
    const nftType = searchParams?.get('nftType') as Database['public']['Enums']['nft_type'] | null;
    const isDemo = searchParams?.get('isDemo') === 'true';
    const price = searchParams?.get('price');

    // 根据 isDemo 参数选择合约地址
    const contractAddress = isDemo ? STAR_NFT_CONTRACTS.DEMO : STAR_NFT_CONTRACTS.PROD;

    // 验证参数有效性
    const isValidParams = type === 'star' &&
        tokenId &&
        nftType &&
        nftType in NFT_CONFIGS &&
        price;

    // 参数验证和重定向
    useEffect(() => {
        if (!account || !isValidParams) {
            router.replace('/');
        }
    }, [account, isValidParams, router]);

    // 验证交易
    const verifyTransaction = async (txHash: string, retryCount = 0): Promise<boolean> => {
        try {
            if (!account?.address || !nftType || !tokenId) {
                console.error('验证交易失败：缺少必要参数', { account, nftType, tokenId });
                throw new Error('缺少必要参数');
            }

            console.log('开始验证交易:', {
                txHash,
                walletAddress: account.address,
                tokenId,
                nftType,
                isDemo
            });

            const config = NFT_CONFIGS[nftType];
            const response = await fetch('/api/verify-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    txHash,
                    walletAddress: account.address,
                    tokenId: Number(tokenId),
                    nftType,
                    config,
                    isDemoContract: isDemo
                })
            });

            const data = await response.json();
            console.log('验证交易响应:', data);

            if (data.success) {
                console.log('交易验证成功');
                toast.success(t('starNFT.claim.success'));
                router.push('/success');
                return true;
            }

            if (data.status === 'claimed') {
                console.log('NFT 已经被领取');
                toast.success(t('starNFT.claim.alreadyClaimed'));
                router.push('/dashboard?tab=star');
                return true;
            }

            if (retryCount < VERIFICATION_CONFIG.MAX_RETRIES - 1) {
                console.log(`验证失败，准备重试 (${retryCount + 1}/${VERIFICATION_CONFIG.MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL));
                return verifyTransaction(txHash, retryCount + 1);
            }

            throw new Error(data.message || '交易验证失败');
        } catch (error) {
            console.error('验证交易失败:', error);
            if (retryCount === VERIFICATION_CONFIG.MAX_RETRIES - 1) {
                throw error;
            }
            return false;
        }
    };

    // 处理购买成功
    const handlePurchaseSuccess = async (info: { type: 'crypto'; status: { transactionHash: string } }) => {
        try {
            setIsProcessing(true);
            console.log('开始处理购买成功:', info);

            // 使用 getBuyWithCryptoStatus 监控交易状态
            const pollStatus = async (txHash: string, attempts = 0): Promise<boolean> => {
                if (attempts >= VERIFICATION_CONFIG.MAX_RETRIES) {
                    console.log('达到最大重试次数');
                    return false;
                }

                try {
                    console.log(`正在查询交易状态 (${attempts + 1}/${VERIFICATION_CONFIG.MAX_RETRIES}):`, txHash);
                    const status = await getBuyWithCryptoStatus({
                        client,
                        transactionHash: txHash
                    });

                    console.log('交易状态:', status);

                    if ('status' in status) {
                        if (status.status === 'COMPLETED') {
                            console.log('交易已完成，开始验证');
                            const verified = await verifyTransaction(txHash);
                            if (verified) {
                                return true;
                            }
                        } else if (status.status === 'FAILED') {
                            console.error('交易失败:', status.failureMessage);
                            throw new Error(status.failureMessage || '交易失败');
                        }
                    }

                    console.log('交易处理中，等待重试...');
                    await new Promise(resolve => setTimeout(resolve, VERIFICATION_CONFIG.POLLING_INTERVAL));
                    return pollStatus(txHash, attempts + 1);
                } catch (error) {
                    console.error('获取交易状态失败:', error);
                    if (attempts === VERIFICATION_CONFIG.MAX_RETRIES - 1) {
                        throw error;
                    }
                    return false;
                }
            };

            // 开始轮询交易状态
            const success = await pollStatus(info.status.transactionHash);

            if (!success) {
                console.log('购买流程失败');
                toast.error(t('starNFT.claim.error'));
                router.push('/dashboard?tab=star');
            }
        } catch (error) {
            console.error('处理交易失败:', error);
            toast.error(t('starNFT.claim.error'));
            router.push('/dashboard?tab=star');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!account || !isValidParams) {
        return null;
    }

    // 获取合约实例
    const contract = getContract({
        client,
        chain: defineChain(10),
        address: contractAddress,
    });

    // 配置 PayEmbed 属性
    const payEmbedProps: PayEmbedProps = {
        client,
        payOptions: {
            mode: "transaction" as const,
            transaction: claimTo({
                contract,
                quantity: BigInt(1),
                tokenId: BigInt(tokenId),
                to: account.address,
            }),
            onPurchaseSuccess: handlePurchaseSuccess as any
        }
    };

    return (
        <PurchasePage
            payEmbedProps={payEmbedProps}
            isProcessing={isProcessing}
            onClose={() => router.push('/dashboard?tab=star')}
        />
    );
}

// 主页面组件使用 Suspense 包装内容组件
export default function Purchase() {
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 flex items-center justify-center bg-black">
                    <Loading />
                </div>
            }
        >
            <PurchaseContent />
        </Suspense>
    );
}