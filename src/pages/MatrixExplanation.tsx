import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Users, TrendingUp, Gift, Clock } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import MatrixVisualization from '@/components/illustrations/MatrixVisualization';
import { AnimatedIcon } from '@/components/illustrations/AnimatedIcon';
import MatrixBottomNav from '@/components/matrix/MatrixBottomNav';

export default function MatrixExplanation() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#0F0F23] text-white pb-20">
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
            3×3 Matrix System
          </h1>
          <p className="text-sm md:text-base text-gray-400 max-w-xl mx-auto">
            Understanding the Beehive 19-Layer Referral System
          </p>
        </div>

        {/* Matrix Visualization */}
        <div className="bg-gray-900/30 rounded-lg p-4 md:p-6 mb-8 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-center mb-4 text-honey">
            Matrix Structure
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
              <h3 className="text-lg font-semibold">Placement Rules</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• L → M → R priority placement</li>
              <li>• Find first incomplete downline layer</li>
              <li>• Each member maintains 19-layer matrix</li>
            </ul>
          </div>

          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">Reward System</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Layer Rewards = NFT price of that level</li>
              <li>• Root must hold ≥ that level to claim</li>
              <li>• 72-hour upgrade window for pending rewards</li>
            </ul>
          </div>
        </div>

        {/* Membership Levels */}
        <div className="bg-gray-900/30 rounded-lg p-4 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold text-center mb-4 text-honey">
            Membership Levels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">Level 1</div>
              <div className="text-base font-semibold mb-1">130 USDC</div>
              <div className="text-xs text-gray-400">
                100 USDC NFT + 30 USDC activation
              </div>
            </div>
            
            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">Level 2-19</div>
              <div className="text-base font-semibold mb-1">+50 USDC each</div>
              <div className="text-xs text-gray-400">
                Sequential upgrade required
              </div>
            </div>

            <div className="text-center p-3 bg-honey/10 rounded-lg border border-honey/30">
              <div className="text-lg font-bold text-honey mb-1">Level 19</div>
              <div className="text-base font-semibold mb-1">1000 USDC</div>
              <div className="text-xs text-gray-400">
                Maximum level
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-6 mb-8">
          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">BCC Token Rewards</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Tier 1 (1-9,999): 10,450 BCC total</li>
              <li>• Level 1: 100 BCC → Level 19: 1000 BCC</li>
              <li>• 500 BCC activation bonus</li>
            </ul>
          </div>

          <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-honey" />
              <h3 className="text-lg font-semibold">Special Rules</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Level 2: Requires 3 direct referrals</li>
              <li>• Sequential NFT purchases required</li>
              <li>• 72-hour pending reward window</li>
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
              Get Started
            </button>
          </Link>
        </div>
      </div>
      
      {/* Fixed Bottom Navigation */}
      <MatrixBottomNav />
    </div>
  );
}