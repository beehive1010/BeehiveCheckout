'use client';

import { useEffect } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { PayEmbed } from "thirdweb/react";
import { FiArrowLeft } from "react-icons/fi";
import type { PayEmbedProps } from "thirdweb/react";

interface PurchasePageProps {
    payEmbedProps: PayEmbedProps;
    isProcessing: boolean;
    onClose?: () => void;
}

export function PurchasePage({
                                 payEmbedProps,
                                 isProcessing,
                                 onClose
                             }: PurchasePageProps) {
    const { t } = useI18n();

    // 处理返回
    const handleBack = () => {
        if (isProcessing) {
            const shouldClose = window.confirm(t('common.confirmClose'));
            if (!shouldClose) {
                return;
            }
        }
        if (onClose) {
            onClose();
        } else {
            window.history.back();
        }
    };

    // 处理视口高度
    useEffect(() => {
        const updateViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        // 初始设置
        updateViewportHeight();

        // 监听调整大小事件
        window.addEventListener('resize', updateViewportHeight);
        window.addEventListener('orientationchange', updateViewportHeight);

        return () => {
            window.removeEventListener('resize', updateViewportHeight);
            window.removeEventListener('orientationchange', updateViewportHeight);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 z-[99999] h-[56px] bg-black/80 backdrop-blur-lg safe-top">
                <div className="flex items-center justify-between h-full px-4">
                    <button
                        onClick={handleBack}
                        disabled={isProcessing}
                        className="flex items-center gap-2 text-white/80 hover:text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200"
                    >
                        <FiArrowLeft size={24} />
                        <span>{t('common.back')}</span>
                    </button>

                    {isProcessing && (
                        <div className="text-purple-400 text-sm animate-pulse">
                            {t('common.processing')}
                        </div>
                    )}
                </div>
            </div>

            {/* PayEmbed 容器 */}
            <div
                className="flex-1 w-full overflow-y-auto overscroll-contain safe-top safe-bottom"
                style={{
                    height: 'calc(var(--vh, 1vh) * 100 - var(--safe-area-top) - var(--safe-area-bottom))',
                    paddingTop: '56px',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div className="min-h-full w-full">
                    <PayEmbed {...payEmbedProps} />
                </div>
            </div>

            {/* 底部安全区域 */}
            <div className="h-safe-bottom bg-black" />
        </div>
    );
}

// 导出类型定义
export type { PurchasePageProps };