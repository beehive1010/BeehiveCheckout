'use client';

import { useTranslation } from 'react-i18next';
import styles from './Loading.module.css';

export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative">
        {/* 主要加载动画 */}
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />

        {/* 内部加载动画 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"
               style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}
          />
        </div>
      </div>

      {/* 加载文本 */}
      <p className="mt-4 text-purple-200 text-sm font-medium animate-pulse">
        {t('common.loading')}
      </p>
    </div>
  );
}