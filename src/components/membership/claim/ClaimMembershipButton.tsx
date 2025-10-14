import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useLocation } from "wouter";
import { FiLoader } from 'react-icons/fi';
import { toast } from "react-hot-toast";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { defineChain, getContract } from "thirdweb";
import { client } from "@/lib/web3/client";
import { parseUnits } from "viem";
import { claimTo } from "thirdweb/extensions/erc1155";
import { arbitrum } from "thirdweb/chains";
import { getApprovalForTransaction } from "thirdweb/extensions/erc20";
import { supabase } from "@/lib/supabase";

// Arbitrum 合约地址
const USDT_CONTRACT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";  // Arbitrum USDT
const MEMBERSHIP_NFT_CONTRACT = "0x018F516B0d1E77Cc5947226Abc2E864B167C7E29";  // Arbitrum Membership NFT

// NFT 类型定义 (Level 1-19)
type NFTType = 'LEVEL1' | 'LEVEL2' | 'LEVEL3' | 'LEVEL4' | 'LEVEL5' | 'LEVEL6' |
               'LEVEL7' | 'LEVEL8' | 'LEVEL9' | 'LEVEL10' | 'LEVEL11' | 'LEVEL12' |
               'LEVEL13' | 'LEVEL14' | 'LEVEL15' | 'LEVEL16' | 'LEVEL17' | 'LEVEL18' | 'LEVEL19';

// NFT 价格配置 (Level 1: 130, Level 2: 150, Level 3+: 每级增加50 USDT)
const NFT_PRICES: Record<NFTType, number> = {
    'LEVEL1': 130,
    'LEVEL2': 150,
    'LEVEL3': 200,
    'LEVEL4': 250,
    'LEVEL5': 300,
    'LEVEL6': 350,
    'LEVEL7': 400,
    'LEVEL8': 450,
    'LEVEL9': 500,
    'LEVEL10': 550,
    'LEVEL11': 600,
    'LEVEL12': 650,
    'LEVEL13': 700,
    'LEVEL14': 750,
    'LEVEL15': 800,
    'LEVEL16': 850,
    'LEVEL17': 900,
    'LEVEL18': 950,
    'LEVEL19': 1000
};

interface ClaimMembershipButtonProps {
    walletAddress: string;
    tokenId: number;
    nftType: NFTType;
    style?: React.CSSProperties;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    disabled?: boolean;
}

export function ClaimMembershipButton({
                                       walletAddress,
                                       tokenId,
                                       nftType,
                                       style,
                                       onSuccess,
                                       onError,
                                       disabled
                                   }: ClaimMembershipButtonProps) {
    const { t } = useI18n();
    const account = useActiveAccount();
    const [, setLocation] = useLocation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const { mutateAsync: sendTransaction } = useSendTransaction();

    // 获取 Membership NFT 合约实例 (Arbitrum)
    const contract = getContract({
        client,
        chain: defineChain(arbitrum),
        address: MEMBERSHIP_NFT_CONTRACT,
    });

    // 获取 USDT 合约实例用于检查授权 (Arbitrum)
    const USDTContract = getContract({
        client,
        chain: defineChain(arbitrum),
        address: USDT_CONTRACT,
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
        contract: USDTContract,
        method: "allowance",
        params: [account?.address ?? '', MEMBERSHIP_NFT_CONTRACT]
    });

    const handleClick = async () => {
        if (!account) {
            toast.error(t("wallet.connect_first"));
            return;
        }

        if (isProcessing || disabled) return;

        try {
            setIsProcessing(true);

            // 提取目标等级 (例如 'LEVEL1' -> 1)
            const targetLevel = parseInt(nftType.replace('LEVEL', ''));

            // Token ID 映射: Level 1-19 -> tokenId 1-19 (相同)
            const nftTokenId = targetLevel;

            // 检查会员当前等级（从 members 表）
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select('current_level, wallet_address')
                .eq('wallet_address', walletAddress.toLowerCase())
                .maybeSingle(); // Use maybeSingle() to allow no record (first purchase)

            // If there's an error OTHER than "no rows returned", show error
            if (memberError && memberError.code !== 'PGRST116') {
                toast.error(t("membership.memberNotFound") || "Member check failed");
                console.error('Member check error:', memberError);
                return;
            }

            // Get current level (0 if no record = first purchase)
            const currentMemberLevel = memberData?.current_level || 0;

            // 检查是否已经拥有此等级或更高等级
            if (currentMemberLevel >= targetLevel) {
                toast.error(t("membership.alreadyOwned") || "Already owned this level");
                return;
            }

            // 检查是否按顺序升级（不能跳级）
            if (currentMemberLevel < targetLevel - 1) {
                toast.error(t("membership.mustUpgradeSequentially") || "Must upgrade sequentially");
                return;
            }

            // 构建 claim 交易 (使用映射后的 tokenId)
            const claimTransaction = claimTo({
                contract,
                quantity: BigInt(1),
                tokenId: BigInt(nftTokenId),
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
            searchParams.set('type', 'membership');
            searchParams.set('tokenId', nftTokenId.toString());  // tokenId 1-19
            searchParams.set('nftType', nftType);
            searchParams.set('level', targetLevel.toString());
            searchParams.set('price', NFT_PRICES[nftType].toString());

            // 跳转到购买页面
            setLocation(`/purchase?${searchParams.toString()}`);

        } catch (error) {
            console.error('Claim error:', error);
            toast.error(t("membership.claim.error"));
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
        bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700
        transition-colors duration-200
        shadow-lg shadow-amber-500/20
        border border-amber-400/30 backdrop-blur-sm
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
                        <span>{t('membership.buttons.claim')}</span>
                        <span className="text-xl">🐝</span>
                    </>
                )}
            </div>
        </button>
    );
}
