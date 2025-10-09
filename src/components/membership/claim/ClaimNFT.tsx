import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { NFTBadge } from '../nft/NFTBadge';
import { ClaimMembershipButton } from './ClaimMembershipButton';
import { defineChain, getContract } from 'thirdweb';
import { client } from '@/lib/web3/client';
import { arbitrum } from 'thirdweb/chains';
import type { Database } from '@/types/database';

interface ClaimMembershipNFTProps {
    address: string;
    currentLevel?: number;
}

interface MembershipLevel {
    level: number;
    tokenId: number;
    price: number;
    nftType: string;
}

// Level 1-19 配置
const MEMBERSHIP_LEVELS: MembershipLevel[] = Array.from({ length: 19 }, (_, i) => {
    const level = i + 1;
    let price: number;

    if (level === 1) {
        price = 130;
    } else if (level === 2) {
        price = 150;
    } else {
        price = 150 + (level - 2) * 50; // Level 3+ 每级增加 50
    }

    return {
        level,
        tokenId: level,
        price,
        nftType: `LEVEL${level}` as const,
    };
});

export function ClaimMembershipNFT({ address, currentLevel = 0 }: ClaimMembershipNFTProps) {
    const { t } = useI18n();
    const [selectedLevel, setSelectedLevel] = useState<number>(0);

    // 获取会员当前等级
    const { data: memberData } = useQuery({
        queryKey: ['member-level', address],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('members')
                .select('current_level, wallet_address')
                .eq('wallet_address', address.toLowerCase())
                .single();

            if (error) {
                console.error('Failed to fetch member data:', error);
                return null;
            }
            return data;
        },
        enabled: !!address,
    });

    const memberCurrentLevel = memberData?.current_level ?? currentLevel ?? 0;

    // NFT 合约地址
    const NFT_CONTRACT = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';

    const contract = getContract({
        client,
        chain: defineChain(arbitrum),
        address: NFT_CONTRACT,
    });

    // 过滤可升级的等级
    const availableLevels = MEMBERSHIP_LEVELS.filter(
        (levelConfig) => levelConfig.level > memberCurrentLevel
    );

    return (
        <div className="space-y-6">
            {/* 当前等级显示 */}
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400">{t('membership.currentLevel')}</p>
                <p className="text-2xl font-bold text-amber-400">
                    {memberCurrentLevel === 0
                        ? t('membership.notActivated')
                        : `Level ${memberCurrentLevel}`}
                </p>
            </div>

            {/* 可升级等级列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableLevels.map((levelConfig) => {
                    const isNextLevel = levelConfig.level === memberCurrentLevel + 1;
                    const isDisabled = !isNextLevel;

                    return (
                        <motion.div
                            key={levelConfig.level}
                            onClick={() => !isDisabled && setSelectedLevel(levelConfig.level)}
                            whileHover={!isDisabled ? { scale: 1.02 } : {}}
                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                            className={`p-6 rounded-xl border cursor-pointer transition-all
                                ${isDisabled
                                    ? 'bg-gray-900/20 border-gray-500/20 opacity-50 cursor-not-allowed'
                                    : selectedLevel === levelConfig.level
                                        ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                                        : 'bg-amber-900/20 border-amber-500/20 hover:border-amber-500/40'
                                }`}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <NFTBadge level={levelConfig.level} />
                                <div>
                                    <h3 className="text-lg font-bold text-amber-400">
                                        Level {levelConfig.level}
                                    </h3>
                                    {!isNextLevel && (
                                        <p className="text-xs text-red-400">
                                            {t('membership.mustUpgradeSequentially')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-400">{t('membership.price')}</p>
                                    <p className="text-lg font-bold text-white">
                                        ${levelConfig.price} USDT
                                    </p>
                                </div>

                                <ClaimMembershipButton
                                    walletAddress={address}
                                    tokenId={levelConfig.tokenId}
                                    nftType={levelConfig.nftType as any}
                                    disabled={isDisabled || selectedLevel !== levelConfig.level}
                                    onSuccess={() => setSelectedLevel(0)}
                                    onError={(error: Error) =>
                                        console.error('ClaimMembershipButton error:', error)
                                    }
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {availableLevels.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-400">
                        {t('membership.maxLevelReached')}
                    </p>
                </div>
            )}
        </div>
    );
}

export default ClaimMembershipNFT;