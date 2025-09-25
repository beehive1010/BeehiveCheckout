import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '@/contexts/I18nContext';
import {useIsMobile} from '@/hooks/use-mobile';
import {CheckCircle, Gift, Lock, Timer, TrendingUp, Unlock, Users, Zap} from 'lucide-react';

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

const BCC_PHASES: BCCPhase[] = [
  {
    phase: 1,
    members: '1st - 9,999th',
    totalReward: 10450,
    description: '阶段一：早期采用者',
    color: 'from-green-500 to-emerald-600',
    status: 'current',
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: 100 + (i * 50)
    }))
  },
  {
    phase: 2,
    members: '10,000th - 29,999th',
    totalReward: 5225,
    description: '阶段二：成长阶段（减半）',
    color: 'from-yellow-500 to-orange-500',
    status: 'upcoming',
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 2)
    }))
  },
  {
    phase: 3,
    members: '30,000th - 99,999th',
    totalReward: 2612.5,
    description: '阶段三：扩张阶段（再减半）',
    color: 'from-orange-500 to-red-500',
    status: 'upcoming',
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 4)
    }))
  },
  {
    phase: 4,
    members: '100,000th - 186,000th',
    totalReward: 1306.25,
    description: '阶段四：最终阶段（再减半）',
    color: 'from-red-500 to-pink-600',
    status: 'upcoming',
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
                基于激活人数的四阶段释放系统
              </p>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
            自动分发
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
              <span className="font-semibold text-green-400">当前阶段：{currentPhase.description}</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">活跃中</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">激活进度</span>
              <span className="text-green-400 font-medium">{currentProgress.toLocaleString()} / 9,999</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-slate-700">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </Progress>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>阶段一奖励池：{currentPhase.totalReward.toLocaleString()} BCC</span>
              <span>{(100 - progressPercentage).toFixed(1)}% 剩余</span>
            </div>
          </div>
        </div>

        {/* Quick Release Preview */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
          <h4 className={`font-semibold text-blue-400 mb-3 flex items-center gap-2 ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
            <Gift className={`${compact || isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            当前释放标准 (每激活一次)
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
                ... 到 L19 ({currentPhase.releases[18].amount} BCC)
              </span>
            </div>
          )}
        </div>

        {/* Phase Overview */}
        <div className="space-y-3">
          <h4 className={`font-semibold text-blue-400 flex items-center gap-2 ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
            <TrendingUp className={`${compact || isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            四阶段系统概览
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
                    <Badge className="bg-green-500 text-white text-xs mt-1">当前</Badge>
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
            释放机制
          </h4>
          
          <div className={`space-y-3 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <Users className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">激活触发</div>
                <div className="text-muted-foreground">
                  当会员激活新级别时，自动释放对应数量的BCC到余额
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <TrendingUp className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">递减奖励</div>
                <div className="text-muted-foreground">
                  每个阶段奖励减半，确保系统长期可持续发展
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                <Timer className="h-3 w-3 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-purple-400">实时分发</div>
                <div className="text-muted-foreground">
                  基于总激活会员数实时切换阶段，无需人工干预
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
                自动释放
              </span>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              激活即释放，无需额外操作
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className={`font-medium text-green-400 ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
                早期优势
              </span>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              越早参与，获得越多BCC奖励
            </p>
          </div>
        </div>

        {/* Current Phase CTA */}
        {showAnimation && (
          <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
              <span className={`font-semibold text-honey ${compact || isMobile ? 'text-sm' : 'text-base'}`}>
                阶段一进行中
              </span>
              <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
            </div>
            <p className={`text-muted-foreground ${compact || isMobile ? 'text-xs' : 'text-sm'}`}>
              激活会员级别即可获得最高BCC奖励
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BCCRewardInformation;