'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { NFTBadge } from '../nft/NFTBadge';
import { ClaimStarNFTButton } from './ClaimStarNFTButton';
import { defineChain, getContract } from 'thirdweb';
import { client } from '@/utils/thirdweb/client';
import type { Database } from '@/types/database';

interface ClaimStarNFTProps {
    nftType: Database['public']['Enums']['nft_type'];
    address: string;
}

interface NFTConfig {
    id: number;
    nft_type: string;
    token_id: number;
    price: number;
    ops_fund: number;
    ops_fee: number;
    contract_type: string;
    contract_address: string;
}

interface OpsStage {
    id: number;
    stage_price: number;
    stage_number: number;
    created_at: string;
    updated_at: string;
}

export function ClaimStarNFT({ nftType, address }: ClaimStarNFTProps) {
    const { t } = useTranslation();
    const [selectedNFT, setSelectedNFT] = useState<number>(0);

    // 获取 NFT 配置
    const { data: nftConfigs } = useQuery({
        queryKey: ['nft-config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('nft_config')
                .select('*')
                .in('nft_type', ['Nova', 'Orbit', 'Stellar', 'Polaris'])
                .order('token_id');
            if (error) throw error;
            return data.map((item: any) => ({
                id: item.id,
                nft_type: item.nft_type,
                token_id: item.token_id,
                price: item.price,
                ops_fund: item.ops_fund,
                ops_fee: item.ops_fee,
                contract_type: item.contract_type,
                contract_address: item.contract_address,
            })) as NFTConfig[];
        }
    });

    // 获取当前 OPS 价格
    const { data: currentStage } = useQuery<OpsStage>({
        queryKey: ['current-stage'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ops_stages')
                .select('*')
                .single();

            if (error) throw error;
            return data as unknown as OpsStage;
        }
    });

    if (!nftConfigs || !currentStage) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {nftConfigs.map((config) => {
                const contract = getContract({
                    client,
                    chain: defineChain(10),
                    address: config.contract_address,
                });

                const maxOpsAmount = config.ops_fund
                    ? Math.floor(config.ops_fund / (currentStage.stage_price || 1))
                    : 0;

                return (
                    <motion.div
                        key={config.id}
                        onClick={() => setSelectedNFT(config.token_id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-6 rounded-xl border cursor-pointer transition-all
              ${selectedNFT === config.token_id
                            ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                            : 'bg-purple-900/20 border-purple-500/20 hover:border-purple-500/40'
                        }`}
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <NFTBadge level={config.token_id} />
                            <div>
                                <h3 className="text-lg font-bold text-purple-400">
                                    {config.nft_type}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {config.token_id}x {t('starNFT.multiplier')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400">{t('starNFT.price')}</p>
                                <p className="text-lg font-bold text-white">
                                    ${config.price} USD
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">{t('starNFT.maxOps')}</p>
                                <p className="text-lg font-bold text-white">
                                    {maxOpsAmount} OPS
                                </p>
                            </div>

                            <ClaimStarNFTButton
                                walletAddress={address}
                                tokenId={config.token_id}
                                nftType={config.nft_type as "Nova" | "Orbit" | "Stellar" | "Polaris"}
                                disabled={selectedNFT !== config.token_id}
                                onSuccess={() => setSelectedNFT(0)}
                                onError={(error: Error) => console.error("ClaimStarNFTButton error:", error)} // ✅ 修正 onError 类型
                                style={{}} // ✅ 添加 style（可为空对象）
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

export default ClaimStarNFT;