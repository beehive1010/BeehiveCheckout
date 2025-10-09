import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Users, TrendingUp, Gift, Clock } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import MatrixVisualization from '@/components/illustrations/MatrixVisualization';
import { AnimatedIcon } from '@/components/illustrations/AnimatedIcon';

export default function MatrixExplanation() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#0F0F23] text-white">
      {/* Header with back button */}
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <Link href="/">
          <button 
            className="flex items-center gap-2 text-honey hover:text-yellow-300 transition-colors mb-6 group"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('common.back') || 'Back'}
          </button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-honey mb-2">
            {t('matrixExplanation.title')}
          </h1>
          <p className="text-sm md:text-base text-gray-400 max-w-xl mx-auto">
            {t('matrixExplanation.subtitle')}
          </p>
        </div>

        {/* Matrix Visualization */}
        <div className="bg-gray-900/30 rounded-lg p-4 md:p-6 mb-8 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-center mb-4 text-honey">
            {t('matrixExplanation.matrixStructure')}
          </h2>
          <div className="flex justify-center">
            <MatrixVisualization maxLevels={3} showAnimation={false} compact={true} />
          </div>
        </div>

        {/* How it Works */}
        <div className="space-y-6 mb-8">
          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">{t('matrixExplanation.placementRules.title')}</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• {t('matrixExplanation.placementRules.rule1')}</li>
              <li>• {t('matrixExplanation.placementRules.rule2')}</li>
              <li>• {t('matrixExplanation.placementRules.rule3')}</li>
            </ul>
          </div>

          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">{t('matrixExplanation.rewardSystem.title')}</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• {t('matrixExplanation.rewardSystem.rule1')}</li>
              <li>• {t('matrixExplanation.rewardSystem.rule2')}</li>
              <li>• {t('matrixExplanation.rewardSystem.rule3')}</li>
            </ul>
          </div>
        </div>

        {/* Membership Levels */}
        <div className="bg-gray-900/30 rounded-lg p-4 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold text-center mb-4 text-honey">
            {t('matrixExplanation.membershipLevels.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">{t('matrixExplanation.membershipLevels.level1.title')}</div>
              <div className="text-base font-semibold mb-1">{t('matrixExplanation.membershipLevels.level1.price')}</div>
              <div className="text-xs text-gray-400">
                {t('matrixExplanation.membershipLevels.level1.description')}
              </div>
            </div>
            
            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">{t('matrixExplanation.membershipLevels.level2to19.title')}</div>
              <div className="text-base font-semibold mb-1">{t('matrixExplanation.membershipLevels.level2to19.price')}</div>
              <div className="text-xs text-gray-400">
                {t('matrixExplanation.membershipLevels.level2to19.description')}
              </div>
            </div>

            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">{t('matrixExplanation.membershipLevels.level19.title')}</div>
              <div className="text-base font-semibold mb-1">{t('matrixExplanation.membershipLevels.level19.price')}</div>
              <div className="text-xs text-gray-400">
                {t('matrixExplanation.membershipLevels.level19.description')}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-6 mb-8">
          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">{t('matrixExplanation.bccRewards.title')}</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• {t('matrixExplanation.bccRewards.tier1')}</li>
              <li>• {t('matrixExplanation.bccRewards.levelProgression')}</li>
              <li>• {t('matrixExplanation.bccRewards.activationBonus')}</li>
            </ul>
          </div>

          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">{t('matrixExplanation.specialRules.title')}</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• {t('matrixExplanation.specialRules.level2Requirement')}</li>
              <li>• {t('matrixExplanation.specialRules.sequentialPurchases')}</li>
              <li>• {t('matrixExplanation.specialRules.pendingWindow')}</li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center pt-4">
          <Link href="/">
            <button 
              className="bg-honey text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
              data-testid="get-started-matrix"
            >
              {t('landing.getStarted')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}