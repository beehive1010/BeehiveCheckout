import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Users, TrendingUp, Gift, Clock } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import MatrixVisualization from '@/components/illustrations/MatrixVisualization';
import { AnimatedIcon } from '@/components/illustrations/AnimatedIcon';

export default function MatrixExplanation() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F23] to-[#1A1A2E] text-white">
      {/* Header with back button */}
      <div className="container mx-auto px-4 py-6">
        <Link href="/">
          <button 
            className="flex items-center gap-2 text-honey hover:text-yellow-300 transition-colors mb-8 group"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            {t('common.back') || 'Back'}
          </button>
        </Link>

        <div className="text-center mb-12">
          <AnimatedIcon animation="fade" delay={100}>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-honey to-yellow-300 bg-clip-text text-transparent mb-4">
              3×3 Matrix System
            </h1>
          </AnimatedIcon>
          <AnimatedIcon animation="slide" delay={300}>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Understanding the Beehive 19-Layer Referral System
            </p>
          </AnimatedIcon>
        </div>

        {/* Matrix Visualization */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-honey/20">
          <h2 className="text-2xl font-bold text-center mb-8 text-honey">
            Matrix Structure Visualization
          </h2>
          <div className="flex justify-center">
            <MatrixVisualization maxLevels={4} showAnimation={true} compact={false} />
          </div>
        </div>

        {/* How it Works */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <AnimatedIcon animation="scale" delay={400}>
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-honey/10">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-honey" />
                <h3 className="text-xl font-bold">Placement Rules</h3>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• L → M → R priority placement</li>
                <li>• Find first incomplete downline layer</li>
                <li>• Each member maintains 19-layer matrix</li>
                <li>• Layer 1: 3 members, Layer 2: 9 members, Layer 3: 27 members...</li>
              </ul>
            </div>
          </AnimatedIcon>

          <AnimatedIcon animation="scale" delay={600}>
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-honey/10">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-8 h-8 text-honey" />
                <h3 className="text-xl font-bold">Reward System</h3>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• Layer Rewards = NFT price of that level</li>
                <li>• Root must hold ≥ that level to claim</li>
                <li>• 72-hour upgrade window for pending rewards</li>
                <li>• Rewards roll up to next qualified upline</li>
              </ul>
            </div>
          </AnimatedIcon>
        </div>

        {/* Membership Levels */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-honey/20">
          <h2 className="text-2xl font-bold text-center mb-8 text-honey">
            Membership Levels & Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <AnimatedIcon animation="bounce" delay={200}>
              <div className="text-center p-6 bg-honey/10 rounded-xl border border-honey/30">
                <div className="text-3xl font-bold text-honey mb-2">Level 1</div>
                <div className="text-2xl font-semibold mb-2">130 USDC</div>
                <div className="text-sm text-gray-400">
                  100 USDC NFT + 30 USDC activation
                </div>
              </div>
            </AnimatedIcon>
            
            <AnimatedIcon animation="bounce" delay={400}>
              <div className="text-center p-6 bg-honey/10 rounded-xl border border-honey/30">
                <div className="text-3xl font-bold text-honey mb-2">Level 2-19</div>
                <div className="text-2xl font-semibold mb-2">+50 USDC</div>
                <div className="text-sm text-gray-400">
                  Sequential upgrade required
                </div>
              </div>
            </AnimatedIcon>

            <AnimatedIcon animation="bounce" delay={600}>
              <div className="text-center p-6 bg-honey/10 rounded-xl border border-honey/30">
                <div className="text-3xl font-bold text-honey mb-2">Level 19</div>
                <div className="text-2xl font-semibold mb-2">1000 USDC</div>
                <div className="text-sm text-gray-400">
                  Maximum level achievement
                </div>
              </div>
            </AnimatedIcon>
          </div>
        </div>

        {/* Special Features */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <AnimatedIcon animation="fade" delay={300}>
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-honey/10">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-8 h-8 text-honey" />
                <h3 className="text-xl font-bold">BCC Token Rewards</h3>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• Tier 1 (1-9,999): 10,450 BCC total</li>
                <li>• Level 1: 100 BCC → Level 19: 1000 BCC</li>
                <li>• 500 BCC activation bonus</li>
                <li>• Lower rewards for later tiers</li>
              </ul>
            </div>
          </AnimatedIcon>

          <AnimatedIcon animation="fade" delay={500}>
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-honey/10">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-8 h-8 text-honey" />
                <h3 className="text-xl font-bold">Special Rules</h3>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• Level 2: Requires 3 direct referrals</li>
                <li>• Layer 1 Right slot: Must upgrade to Level 2</li>
                <li>• Sequential NFT purchases required</li>
                <li>• 72-hour pending reward window</li>
              </ul>
            </div>
          </AnimatedIcon>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <AnimatedIcon animation="scale" delay={700}>
            <Link href="/">
              <button 
                className="bg-gradient-to-r from-honey to-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg hover:shadow-honey/50 transition-all transform hover:scale-105"
                data-testid="get-started-matrix"
              >
                Start Your Matrix Journey
              </button>
            </Link>
          </AnimatedIcon>
        </div>
      </div>
    </div>
  );
}