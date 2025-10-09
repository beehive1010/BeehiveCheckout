import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { ClaimMembershipButton } from './ClaimMembershipButton';
import { NFTBadge } from '../nft/NFTBadge';
import { supabase } from '@/lib/supabase';

// Membership Level 配置 (Level 1-19)
const MEMBERSHIP_LEVELS = Array.from({ length: 19 }, (_, i) => {
    const level = i + 1;
    let price: number;

    if (level === 1) {
        price = 130;
    } else if (level === 2) {
        price = 150;
    } else {
        price = 150 + (level - 2) * 50;
    }

    return {
        id: level,
        level,
        tokenId: level,
        nftType: `LEVEL${level}`,
        price,
    };
});

interface MembershipClaimListProps {
    address: string;
    onSuccess?: () => void;
}

export function MembershipClaimList({ address, onSuccess }: MembershipClaimListProps) {
    const { t } = useI18n();
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

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

    const currentLevel = memberData?.current_level ?? 0;

    // 过滤可升级的等级
    const availableLevels = MEMBERSHIP_LEVELS.filter((level) => level.level > currentLevel);

    const handleLevelClick = (level: number) => {
        const isNextLevel = level === currentLevel + 1;
        if (isNextLevel) {
            setSelectedLevel(selectedLevel === level ? null : level);
        }
    };

    const handleSuccess = () => {
        setSelectedLevel(null);
        onSuccess?.();
    };

    const handleError = (error: Error) => {
        console.error('Claim error:', error);
        setSelectedLevel(null);
    };

    return (
        <div className="w-full">
            {/* 当前等级显示 */}
            <div className="mb-6 bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400">{t('membership.currentLevel')}</p>
                <p className="text-2xl font-bold text-amber-400">
                    {currentLevel === 0 ? t('membership.notActivated') : `Level ${currentLevel}`}
                </p>
            </div>

            {/* Level 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableLevels.map((levelConfig) => {
                    const isNextLevel = levelConfig.level === currentLevel + 1;
                    const isDisabled = !isNextLevel;

                    return (
                        <div
                            key={levelConfig.id}
                            onClick={() => handleLevelClick(levelConfig.level)}
                            className={`
                                p-6 rounded-xl border transition-all cursor-pointer
                                ${
                                    isDisabled
                                        ? 'bg-gray-900/20 border-gray-500/20 opacity-50 cursor-not-allowed'
                                        : selectedLevel === levelConfig.level
                                        ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                                        : 'bg-amber-900/20 border-amber-500/20 hover:border-amber-500/40'
                                }
                            `}
                        >
                            {/* Level 标题 */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative w-10 h-10">
                                    <NFTBadge level={levelConfig.level} />
                                </div>
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

                            {/* 价格和按钮 */}
                            <div className="space-y-4">
                                <div className="bg-black/20 rounded-lg p-3">
                                    <p className="text-sm text-gray-400">{t('membership.price')}</p>
                                    <p className="text-xl font-bold text-white">
                                        ${levelConfig.price.toLocaleString()} USDT
                                    </p>
                                </div>

                                {/* Claim 按钮 */}
                                <ClaimMembershipButton
                                    walletAddress={address}
                                    tokenId={levelConfig.tokenId}
                                    nftType={levelConfig.nftType as any}
                                    disabled={isDisabled || selectedLevel !== levelConfig.level}
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 无可用等级提示 */}
            {availableLevels.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-400">{t('membership.maxLevelReached')}</p>
                </div>
            )}
        </div>
    );
}

export type { MembershipClaimListProps };