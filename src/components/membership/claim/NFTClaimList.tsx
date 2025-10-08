'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimStarNFTButton } from './ClaimStarNFTButton';
import { NFTBadge } from '../nft/NFTBadge';
import styles from './StarNFTClaimList.module.css';
import type { Database } from '@/types/database';

// 静态 NFT 配置，使用正确的类型定义
const STAR_NFTS: Array<{
    id: number;
    nft_type: Database['public']['Enums']['nft_type'];
    token_id: number;
    price: number;
    multiplier: number;
    tier: string;
}> = [
    {
        id: 0,
        nft_type: 'Nova',
        token_id: 0,
        price: 500,
        multiplier: 5,
        tier: 'tier0'
    },
    {
        id: 1,
        nft_type: 'Orbit',
        token_id: 1,
        price: 1000,
        multiplier: 6,
        tier: 'tier1'
    },
    {
        id: 2,
        nft_type: 'Stellar',
        token_id: 2,
        price: 3000,
        multiplier: 7,
        tier: 'tier2'
    },
    {
        id: 3,
        nft_type: 'Polaris',
        token_id: 3,
        price: 7000,
        multiplier: 8,
        tier: 'tier3'
    }
];

interface StarNFTClaimListProps {
    address: string;
    onSuccess?: () => void;
}

export function StarNFTClaimList({ address, onSuccess }: StarNFTClaimListProps) {
    const { t } = useTranslation();
    const [selectedNFT, setSelectedNFT] = useState<number | null>(null);

    const getBenefits = (tier: string) => {
        const benefits = t(`starNFT.levels.${tier}.benefits`, { returnObjects: true });
        return Array.isArray(benefits) ? benefits.slice(0, 3) : [];
    };

    const handleNFTClick = (nftId: number) => {
        setSelectedNFT(selectedNFT === nftId ? null : nftId);
    };

    const handleSuccess = () => {
        setSelectedNFT(null);
        onSuccess?.();
    };

    const handleError = (error: Error) => {
        console.error('Claim error:', error);
        setSelectedNFT(null);
    };

    return (
        <div className={styles.container}>
            <div className={styles.cardGrid}>
                {STAR_NFTS.map((nft) => (
                    <div
                        key={nft.id}
                        onClick={() => handleNFTClick(nft.token_id)}
                        className={`${styles.card} ${selectedNFT === nft.token_id ? styles.selected : ''}`}
                    >
                        {/* NFT 标题和等级 */}
                        <div className={styles.header}>
                            <div className="relative w-10 h-10">
                                <NFTBadge level={nft.token_id} />
                            </div>
                            <div className={styles.nftInfo}>
                                <h3 className={styles.title}>
                                    {nft.nft_type}
                                </h3>
                                <p className={styles.subtitle}>
                                    {nft.multiplier}x {t('starNFT.multiplier')}
                                </p>
                            </div>
                        </div>

                        {/* 价格和权益 */}
                        <div className={styles.content}>
                            <div className={styles.priceCard}>
                                <p className={styles.priceLabel}>{t('starNFT.price')}</p>
                                <p className={styles.priceValue}>
                                    ${nft.price.toLocaleString()} USD
                                </p>
                            </div>

                            <div className={styles.benefitsCard}>
                                <p className={styles.benefitsLabel}>{t('starNFT.benefits')}</p>
                                <div className={styles.benefitsList}>
                                    {getBenefits(nft.tier).map((benefit: string, index: number) => (
                                        <p key={index} className={styles.benefitItem}>
                                            <span className={styles.benefitDot} />
                                            <span className="truncate">{benefit}</span>
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Claim 按钮 */}
                            <ClaimStarNFTButton
                                walletAddress={address}
                                tokenId={nft.token_id}
                                nftType={nft.nft_type}
                                disabled={selectedNFT !== nft.token_id}
                                onSuccess={handleSuccess}
                                onError={handleError}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export type { StarNFTClaimListProps };