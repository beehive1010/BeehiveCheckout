import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '@/contexts/I18nContext';
import {useIsMobile} from '@/hooks/use-mobile';
import {CheckCircle, Gift, Lock, Timer, TrendingUp, Unlock, Users, Zap} from 'lucide-react';

interface BCCPhaseBase {
  phase: number;
  members: string;
  totalReward: number;
  descriptionKey: string;
  releases: Array<{
    level: number;
    amount: number;
  }>;
  color: string;
  status: 'current' | 'upcoming' | 'completed';
}

interface BCCPhase {
  phase: number;
  members: string;
  totalReward: number;
  description: string;
  releases: Array<{
    level: number;
    amount: number;
  }>;
  color: string;
  status: 'current' | 'upcoming' | 'completed';
}

// BCC phases data will be populated with translations in the component
const BCC_PHASES_BASE: BCCPhaseBase[] = [
  {
    phase: 1,
    members: '1st - 9,999th',
    totalReward: 10450,
    descriptionKey: 'rewards.bcc.phases.phase1.description',
    color: 'from-green-500 to-emerald-600',
    status: 'current' as const,
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: 100 + (i * 50)
    }))
  },
  {
    phase: 2,
    members: '10,000th - 29,999th',
    totalReward: 5225,
    descriptionKey: 'rewards.bcc.phases.phase2.description',
    color: 'from-yellow-500 to-orange-500',
    status: 'upcoming' as const,
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 2)
    }))
  },
  {
    phase: 3,
    members: '30,000th - 99,999th',
    totalReward: 2612.5,
    descriptionKey: 'rewards.bcc.phases.phase3.description',
    color: 'from-orange-500 to-red-500',
    status: 'upcoming' as const,
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 4)
    }))
  },
  {
    phase: 4,
    members: '100,000th - 186,000th',
    totalReward: 1306.25,
    descriptionKey: 'rewards.bcc.phases.phase4.description',
    color: 'from-red-500 to-pink-600',
    status: 'upcoming' as const,
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 8)
    }))
  }
];

interface BCCRewardInformationProps {
  className?: string;
  compact?: boolean;
  showAnimation?: boolean;
}

export const BCCRewardInformation: React.FC<BCCRewardInformationProps> = ({
  className = '',
  compact = false,
  showAnimation = true
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  // Create BCC_PHASES with translations
  const BCC_PHASES = BCC_PHASES_BASE.map(phase => ({
    ...phase,
    description: t(phase.descriptionKey),
    members: t(`rewards.bcc.phases.phase${phase.phase}.members`)
  }));

  const currentPhase = BCC_PHASES[0]; // Assume phase 1 is current
  const currentProgress = 1500; // Example: 1500 members activated
  const progressPercentage = (currentProgress / 9999) * 100;

  return (
    <Card className={`bg-gradient-to-br from-blue-900/20 via-purple-800/10 to-indigo-900/20 border-2 border-blue-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 ${className}`}>
      <CardHeader className={`${compact || isMobile ? 'p-4' : 'p-6'}`}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className={`font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text ${compact || isMobile ? 'text-base' : 'text-lg'}`}>
                {t('rewards.information.bccRewardsTitle')}
              </span>
              <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                {t('rewards.bcc.subtitle')}
              </p>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
            {t('rewards.bcc.autoDistribution')}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className={`space-y-4 ${compact || isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
        {/* Current Phase Status */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-green-400">{t('rewards.bcc.currentPhase')}: {currentPhase.description}</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">{t('rewards.bcc.active')}</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('rewards.bcc.activationProgress')}</span>
              <span className="text-green-400 font-medium">{currentProgress.toLocaleString()} / 9,999</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-slate-700">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </Progress>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('rewards.bcc.phaseRewardPool')}: {currentPhase.totalReward.toLocaleString()} BCC</span>
              <span>{(100 - progressPercentage).toFixed(1)}% {t('rewards.bcc.remaining')}</span>
            </div>
          </div>
        </div>

        {/* Quick Release Preview */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
          <h4 className={`font-semibold text-blue-400 mb-3 flex items-center gap-2 ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
            <Gift className={`${compact || isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {t('rewards.bcc.currentReleaseStandard')}
          </h4>
          
          <div className={`grid gap-2 ${compact || isMobile ? 'grid-cols-4' : 'grid-cols-6'}`}>
            {currentPhase.releases.slice(0, compact || isMobile ? 8 : 12).map((release) => (
              <div key={release.level} className="bg-slate-700/50 rounded-lg p-2 text-center">
                <div className={`font-medium text-honey ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                  L{release.level}
                </div>
                <div className={`text-green-400 font-semibold ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                  {release.amount}
                </div>
              </div>
            ))}
          </div>
          
          {currentPhase.releases.length > (compact || isMobile ? 8 : 12) && (
            <div className="text-center mt-2">
              <span className="text-muted-foreground text-xs">
                {t('rewards.bcc.upToL19', { amount: currentPhase.releases[18].amount })}
              </span>
            </div>
          )}
        </div>

        {/* Phase Overview */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-blue-400 flex items-center gap-2 ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
            <TrendingUp className={`${compact || isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {t('rewards.bcc.fourPhaseSystemOverview')}
          </h4>
          
          <div className={`grid gap-2 ${compact || isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {BCC_PHASES.map((phase) => (
              <Card 
                key={phase.phase} 
                className={`bg-slate-800/30 border-slate-600 transition-all duration-200 ${
                  phase.status === 'current' ? 'ring-2 ring-green-500/50 border-green-500/50' : 
                  'hover:border-blue-500/50'
                }`}
              >
                <CardContent className={`text-center ${compact || isMobile ? 'p-3' : 'p-4'}`}>
                  <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-2 bg-gradient-to-br ${phase.color} ${phase.status === 'current' ? 'animate-pulse' : ''}`}>
                    {phase.phase}
                  </div>
                  <div className={`font-semibold text-blue-400 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                    {phase.totalReward} BCC
                  </div>
                  <div className={`text-muted-foreground ${compact || isMobile ? 'text-[10px]' : 'text-xs'} leading-tight`}>
                    {phase.members}
                  </div>
                  {phase.status === 'current' && (
                    <Badge className="bg-green-500 text-white text-xs mt-1">{t('rewards.bcc.current')}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Release Mechanism */}
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
          <h4 className={`font-semibold text-purple-400 mb-3 flex items-center gap-2 ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
            <Zap className={`${compact || isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {t('rewards.bcc.releaseMechanism')}
          </h4>
          
          <div className={`space-y-3 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <Users className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">{t('rewards.bcc.mechanisms.activationTrigger')}</div>
                <div className="text-muted-foreground">
                  {t('rewards.bcc.mechanisms.activationTriggerDesc')}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <TrendingUp className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">{t('rewards.bcc.mechanisms.decreasingRewards')}</div>
                <div className="text-muted-foreground">
                  {t('rewards.bcc.mechanisms.decreasingRewardsDesc')}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <Timer className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">{t('rewards.bcc.mechanisms.realtimeDistribution')}</div>
                <div className="text-muted-foreground">
                  {t('rewards.bcc.mechanisms.realtimeDistributionDesc')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Unlock className="h-4 w-4 text-blue-400" />
              <span className={`font-medium text-blue-400 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                {t('rewards.bcc.benefits.autoRelease')}
              </span>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              {t('rewards.bcc.benefits.autoReleaseDesc')}
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className={`font-medium text-green-400 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                {t('rewards.bcc.benefits.earlyAdvantage')}
              </span>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              {t('rewards.bcc.benefits.earlyAdvantageDesc')}
            </p>
          </div>
        </div>

        {/* Current Phase CTA */}
        {showAnimation && (
          <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
              <span className={`font-semibold text-honey ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
                {t('rewards.bcc.phase1InProgress')}
              </span>
              <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              {t('rewards.bcc.activateToGetMaxRewards')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BCCRewardInformation;