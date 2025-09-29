import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {useI18n} from '@/contexts/I18nContext';
import {useIsMobile} from '@/hooks/use-mobile';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Gift,
    Info,
    Layers,
    Lock,
    Target,
    Timer,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';

interface RewardInformationCardProps {
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  className?: string;
}

// Layer reward data structure
const LAYER_REWARDS = Array.from({ length: 19 }, (_, i) => ({
  layer: i + 1,
  levelPrice: 100 + (i * 50), // Level 1: $100, Level 2: $150, etc.
  activationFee: i === 0 ? 30 : 0, // Level 1 has 30 USDC activation fee
  percentage: 100, // 100% of NFT price goes to referrer (minus activation fee for Level 1)
  description: i === 0 
    ? `Level 1: $${100 + (i * 50)} NFT (100% to referrer) + $30 activation fee`
    : `Layer ${i + 1} reward triggered when Level ${i + 1} members upgrade`,
  conditions: {
    firstSecond: `Referrer level must equal Layer ${i + 1}`,
    third: `Referrer level must be greater than Layer ${i + 1}`
  },
  rewardStates: {
    claimable: `Instant if referrer level >= ${i + 1}`,
    pending: `72-hour pending if referrer level < ${i + 1}`,
    rollup: `Rolls up to qualified upline if expired`
  }
}));

// BCC staking phases data structure - descriptions will be populated from translations
const BCC_PHASES_BASE = [
  {
    phase: 1,
    membersKey: 'rewards.bcc.phases.phase1.members',
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
    membersKey: 'rewards.bcc.phases.phase2.members',
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
    membersKey: 'rewards.bcc.phases.phase3.members',
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
    membersKey: 'rewards.bcc.phases.phase4.members',
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

export const RewardInformationCard: React.FC<RewardInformationCardProps> = ({
  isExpanded = false,
  onExpandChange,
  className = ''
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'layer' | 'bcc'>('layer');
  const [autoSlide, setAutoSlide] = useState(true);

  // Create BCC_PHASES with translations
  const BCC_PHASES = BCC_PHASES_BASE.map(phase => ({
    ...phase,
    description: t(phase.descriptionKey),
    members: t(phase.membersKey)
  }));

  const slides = [
    {
      id: 'layer',
      title: t('rewards.information.layerRewards'),
      subtitle: t('rewards.information.layerRewardsSubtitle'),
      icon: Layers,
      gradient: 'from-honey/20 to-amber-500/20',
      borderColor: 'border-honey/30',
      content: 'layer'
    },
    {
      id: 'bcc',
      title: t('rewards.information.bccRewards'),
      subtitle: t('rewards.information.bccRewardsSubtitle'),
      icon: Lock,
      gradient: 'from-blue-500/20 to-purple-500/20',
      borderColor: 'border-blue-500/30',
      content: 'bcc'
    }
  ];

  const handleExpandChange = () => {
    const newExpanded = !isExpanded;
    onExpandChange?.(newExpanded);
  };

  const handleSlideChange = (direction: 'prev' | 'next') => {
    setAutoSlide(false);
    setActiveSlide(prev => {
      if (direction === 'next') {
        return prev === slides.length - 1 ? 0 : prev + 1;
      } else {
        return prev === 0 ? slides.length - 1 : prev - 1;
      }
    });
  };

  const openDialog = (type: 'layer' | 'bcc') => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  // Auto-slide effect for mobile
  useEffect(() => {
    if (!autoSlide || !isExpanded) return;

    const interval = setInterval(() => {
      setActiveSlide(prev => prev === slides.length - 1 ? 0 : prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoSlide, isExpanded]);

  const currentSlide = slides[activeSlide];

  return (
    <>
      <Card className={`bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 border-2 border-slate-700 shadow-2xl hover:shadow-3xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0 duration-700 ${className}`}>
        <Collapsible open={isExpanded} onOpenChange={handleExpandChange}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-all duration-300 rounded-t-xl group">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-honey/80 to-amber-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Info className="h-4 w-4 text-black" />
                  </div>
                  <div className="text-left">
                    <span className={`font-bold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {t('rewards.information.title')}
                    </span>
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                      {t('rewards.information.subtitle')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-honey/20 text-honey border-honey/30 animate-pulse">
                    {t('rewards.information.badge')}
                  </Badge>
                  <div className={`w-6 h-6 bg-gradient-to-br from-honey to-amber-500 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} group-hover:scale-110`}>
                    <ChevronDown className="h-3 w-3 text-black" />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1">
            <CardContent className={`bg-gradient-to-br from-slate-800/30 to-slate-700/20 rounded-b-xl ${isMobile ? 'p-3 sm:p-4' : 'p-4 lg:p-6'}`}>
              
              {/* Desktop: Side-by-side Layout */}
              {!isMobile && (
                <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-6">
                  {/* Layer Rewards */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-honey/20 rounded-full flex items-center justify-center mt-1">
                          <Layers className="h-4 w-4 text-honey" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-honey mb-2 text-base">
                            {t('rewards.information.layerRewardsSystem')}
                          </h3>
                          <p className="text-muted-foreground mb-3 text-sm">
                            {t('rewards.information.layerRewardsSystemDesc')}
                          </p>
                          <Button 
                            onClick={() => openDialog('layer')}
                            className="bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 text-sm px-4 py-2"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('rewards.information.viewAll19Layers')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Layer Preview */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                      <h4 className="font-semibold text-honey mb-3 flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4" />
                        {t('rewards.information.layerRewardsPreview')}
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
                        {LAYER_REWARDS.map((reward, index) => {
                          const isHighlight = reward.layer === 1 || reward.layer === 19;
                          return (
                            <div key={reward.layer} className={`rounded-lg p-2 text-center transition-all duration-300 hover:scale-[1.05] hover:shadow-lg ${
                              isHighlight ? 'bg-honey/20 border border-honey/30 shadow-honey/20' : 'bg-slate-700/50 hover:bg-slate-700'
                            }`}>
                              <div className={`text-xs font-bold ${
                                isHighlight ? 'text-honey' : 'text-slate-300'
                              }`}>
                                L{reward.layer}{reward.layer === 19 ? ' (Max)' : ''}
                              </div>
                              <div className={`text-xs font-semibold ${
                                isHighlight ? 'text-honey' : 'text-green-400'
                              }`}>
                                ${reward.levelPrice}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BCC Rewards */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mt-1">
                          <Lock className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-blue-400 mb-2 text-base">
                            {t('rewards.information.bccRewardsSystem')}
                          </h3>
                          <p className="text-muted-foreground mb-3 text-sm">
                            {t('rewards.information.bccRewardsSystemDesc')}
                          </p>
                          <Button 
                            onClick={() => openDialog('bcc')}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 text-sm px-4 py-2"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('rewards.information.viewAllPhases')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* BCC Phases Quick Preview */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                      <h4 className="font-semibold text-blue-400 mb-3 flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        {t('rewards.information.bccPhasesPreview')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {BCC_PHASES.map((phase) => {
                          const isCurrent = phase.status === 'current';
                          return (
                            <div key={phase.phase} className={`rounded-lg p-2 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                              isCurrent ? 'bg-green-500/20 border border-green-500/30 animate-pulse' : 'bg-slate-700/50 hover:bg-slate-700'
                            }`}>
                              <div className={`text-xs font-bold ${
                                isCurrent ? 'text-green-400' : 'text-slate-300'
                              }`}>
                                {t('rewards.information.phase')} {phase.phase}{isCurrent ? ` (${t('rewards.information.current')})` : ''}
                              </div>
                              <div className={`text-xs font-semibold ${
                                isCurrent ? 'text-green-400' : 'text-blue-400'
                              }`}>
                                {phase.totalReward} BCC
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {phase.members}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile: Sliding Cards Layout */}
              {isMobile && (
                <div className="space-y-4">
                  {/* Slide Indicators */}
                  <div className="flex justify-center space-x-2 mb-4">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setActiveSlide(index);
                          setAutoSlide(false);
                        }}
                        className={`w-2 h-2 rounded-full transition-all duration-500 hover:scale-125 ${
                          index === activeSlide ? 'bg-honey w-6 animate-pulse shadow-honey/50 shadow-sm' : 'bg-slate-600 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Sliding Content */}
                  <div className="relative overflow-hidden rounded-xl">
                    <div 
                      className="flex transition-transform duration-700 ease-in-out"
                      style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                      {/* Layer Rewards Slide */}
                      <div className="w-full flex-shrink-0 space-y-4">
                        <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 shadow-lg">
                          <div className="text-center space-y-3">
                            <div className="w-12 h-12 bg-honey/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                              <Layers className="h-6 w-6 text-honey" />
                            </div>
                            <h3 className="font-bold text-honey text-base">
                              {t('rewards.information.layerRewardsSystem')}
                            </h3>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {t('rewards.information.layerRewardsMobileDesc')}
                            </p>
                          </div>
                        </div>

                        {/* Layer Rewards Quick Preview */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                          <h4 className="font-semibold text-honey mb-3 flex items-center justify-center gap-2 text-sm">
                            <Target className="h-4 w-4" />
                            {t('rewards.information.layerRewardsPreview')}
                          </h4>
                          <div className="grid grid-cols-3 xs:grid-cols-4 gap-1 max-h-40 overflow-y-auto">
                            {LAYER_REWARDS.map((reward) => {
                              const isHighlight = reward.layer === 1 || reward.layer === 19;
                              return (
                                <div key={reward.layer} className={`rounded-lg p-2 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                  isHighlight ? 'bg-honey/20 border border-honey/30 animate-pulse' : 'bg-slate-700/50 hover:bg-slate-700'
                                }`}>
                                  <div className={`text-xs font-bold ${
                                    isHighlight ? 'text-honey' : 'text-slate-300'
                                  }`}>
                                    L{reward.layer}
                                  </div>
                                  <div className={`text-xs font-semibold ${
                                    isHighlight ? 'text-honey' : 'text-green-400'
                                  }`}>
                                    ${reward.levelPrice}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="text-center">
                          <Button 
                            onClick={() => openDialog('layer')}
                            className="bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 w-full py-2 text-sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('rewards.information.viewAll19LayersDetails')}
                          </Button>
                        </div>
                      </div>

                      {/* BCC Rewards Slide */}
                      <div className="w-full flex-shrink-0 space-y-4">
                        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30 shadow-lg">
                          <div className="text-center space-y-3">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                              <Lock className="h-6 w-6 text-blue-400" />
                            </div>
                            <h3 className="font-bold text-blue-400 text-base">
                              {t('rewards.information.bccRewardsSystem')}
                            </h3>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {t('rewards.information.bccRewardsMobileDesc')}
                            </p>
                          </div>
                        </div>

                        {/* BCC Phases Mobile Preview */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                          <h4 className="font-semibold text-blue-400 mb-3 flex items-center justify-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            {t('rewards.information.bccPhasesPreview')}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {BCC_PHASES.map((phase) => {
                              const isCurrent = phase.status === 'current';
                              return (
                                <div key={phase.phase} className={`rounded-lg p-2 text-center transition-all duration-300 hover:scale-[1.02] ${
                                  isCurrent ? 'bg-green-500/20 border border-green-500/30 animate-pulse shadow-green-500/20 shadow-lg' : 'bg-slate-700/50 hover:bg-slate-600/70'
                                }`}>
                                  <div className={`text-xs font-bold ${
                                    isCurrent ? 'text-green-400' : 'text-slate-300'
                                  }`}>
                                    {t('rewards.information.phase')} {phase.phase}
                                  </div>
                                  <div className={`text-xs font-semibold ${
                                    isCurrent ? 'text-green-400' : 'text-blue-400'
                                  }`}>
                                    {phase.totalReward}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {phase.members.split(' ')[0]}
                                  </div>
                                  {isCurrent && (
                                    <div className="text-xs text-green-400">{t('rewards.information.current')}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-center mt-2">
                            <span className="text-muted-foreground text-xs">
                              {t('rewards.information.fourPhasesSystem')}
                            </span>
                          </div>
                        </div>

                        <div className="text-center">
                          <Button 
                            onClick={() => openDialog('bcc')}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 w-full py-2 text-sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('rewards.information.viewAllPhasesDetails')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Arrows for Mobile */}
                  <div className="flex justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSlideChange('prev')}
                      className="bg-slate-800 border-slate-600 hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-95"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center px-3 py-2 bg-slate-800 rounded-lg border border-slate-600 transition-all duration-300 hover:bg-slate-700">
                      <span className="text-xs text-muted-foreground">
                        {activeSlide + 1} / {slides.length}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSlideChange('next')}
                      className="bg-slate-800 border-slate-600 hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-95"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Layer Rewards Detail Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'layer'} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
        <DialogContent className={`${isMobile ? 'w-[95vw] h-[90vh] max-w-none' : 'max-w-5xl max-h-[85vh]'} bg-gradient-to-br from-slate-900 to-slate-800 border-slate-600 overflow-hidden`}>
          <DialogHeader className="border-b border-slate-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-honey text-xl">
              <Layers className="h-6 w-6" />
              {t('rewards.information.layerRewardsDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {t('rewards.information.layerRewardsDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Matrix Explanation */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-xl p-6 border border-slate-600 shadow-xl">
              <h4 className="font-semibold text-honey mb-4 flex items-center gap-3 text-lg">
                <Users className="h-5 w-5" />
                {t('rewards.information.matrixStructureExplanation')}
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 text-center md:text-left">
                    {t('rewards.information.matrixStructureExplanation')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm justify-items-center md:justify-items-start">
                    <div className="space-y-2">
                      <h5 className="font-medium text-honey">{t('rewards.information.triggerConditions')}</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• {t('rewards.information.triggerCondition1')}</li>
                        <li>• {t('rewards.information.triggerCondition2')}</li>
                        <li>• {t('rewards.information.triggerCondition3')}</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-honey">{t('rewards.information.rewardAmounts')}</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• {t('rewards.information.rewardAmount1')}</li>
                        <li>• {t('rewards.information.rewardAmount2')}</li>
                        <li>• {t('rewards.information.rewardAmount19')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete 19-Layer Reward Structure */}
            <div className="space-y-4">
              <h4 className="font-semibold text-honey flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5" />
                {t('rewards.information.complete19LayerRewardStructure')}
              </h4>
              
              {/* Layer Groups */}
              <div className="space-y-4">
                {/* Layers 1-5 */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                  <h5 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400">{t('rewards.information.layerGroupBasicBadge')}</Badge>
                    Layer 1-5 {t('rewards.information.layerRewards')}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center">
                    {LAYER_REWARDS.slice(0, 5).map((reward) => (
                      <div key={reward.layer} className={`rounded-lg p-3 border w-full max-w-xs ${
                        reward.layer === 1 
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/15 border-green-500/50' 
                          : 'bg-slate-800/50 border-slate-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">
                              Layer {reward.layer}
                              {reward.layer === 1 && <span className="text-green-400 ml-1">(Direct)</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {reward.layer === 1 
                                ? t('rewards.information.referralRewardToUpline')
                                : t('rewards.information.levelUpgradeTrigger', { level: reward.layer })}
                            </div>
                            {reward.layer === 1 && (
                              <div className="text-xs text-amber-400 mt-1">
                                {t('rewards.information.activationFeePerMember')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">
                              {reward.layer === 1 ? '100% to referrer' : t('rewards.information.percentageNftPrice')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 6-10 */}
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/30">
                  <h5 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400">{t('rewards.information.layerGroupIntermediateBadge')}</Badge>
                    Layer 6-10 {t('rewards.information.layerRewards')}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center">
                    {LAYER_REWARDS.slice(5, 10).map((reward) => (
                      <div key={reward.layer} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 w-full max-w-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">Layer {reward.layer}</div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.levelUpgradeTrigger', { level: reward.layer })}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.percentageNftPrice')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 11-15 */}
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-4 border border-orange-500/30">
                  <h5 className="font-medium text-orange-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-orange-500/20 text-orange-400">{t('rewards.information.layerGroupAdvancedBadge')}</Badge>
                    Layer 11-15 {t('rewards.information.layerRewards')}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center">
                    {LAYER_REWARDS.slice(10, 15).map((reward) => (
                      <div key={reward.layer} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 w-full max-w-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">Layer {reward.layer}</div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.levelUpgradeTrigger', { level: reward.layer })}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.percentageNftPrice')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 16-19 */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30">
                  <h5 className="font-medium text-purple-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400">{t('rewards.information.layerGroupTopBadge')}</Badge>
                    Layer 16-19 {t('rewards.information.layerRewards')}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 justify-items-center">
                    {LAYER_REWARDS.slice(15, 19).map((reward) => (
                      <div key={reward.layer} className={`bg-slate-800/50 rounded-lg p-4 border ${reward.layer === 19 ? 'border-honey/50 bg-gradient-to-r from-honey/10 to-amber-500/10' : 'border-slate-600'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-semibold text-sm flex items-center gap-2 ${reward.layer === 19 ? 'text-honey' : 'text-honey'}`}>
                              Layer {reward.layer}
                              {reward.layer === 19 && <Badge className="bg-honey text-black text-xs">MAX</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.levelUpgradeTrigger', { level: reward.layer })}</div>
                            {reward.layer === 19 && (
                              <div className="text-xs text-honey mt-1">{t('rewards.information.highestRewardLayer')}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${reward.layer === 19 ? 'text-honey text-lg' : 'text-green-400'}`}>
                              ${reward.levelPrice}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('rewards.information.percentageNftPrice')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layer Reward Summary */}
                <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30">
                  <h5 className="font-medium text-honey mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t('rewards.information.layerRewardsSummary')}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center justify-items-center">
                    <div className="bg-slate-800/50 rounded-lg p-3 w-full max-w-xs">
                      <div className="font-bold text-green-400 text-lg">$100-$250</div>
                      <div className="text-xs text-muted-foreground">Layer 1-5</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 w-full max-w-xs">
                      <div className="font-bold text-blue-400 text-lg">$300-$500</div>
                      <div className="text-xs text-muted-foreground">Layer 6-10</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 w-full max-w-xs">
                      <div className="font-bold text-orange-400 text-lg">$550-$750</div>
                      <div className="text-xs text-muted-foreground">Layer 11-15</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 w-full max-w-xs">
                      <div className="font-bold text-honey text-lg">$800-$1,000</div>
                      <div className="text-xs text-muted-foreground">Layer 16-19</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reward Status & Verification System */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-indigo-500/30 shadow-xl">
              <h4 className="font-semibold text-indigo-400 mb-4 flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                {t('rewards.information.rewardStatusSystem')}
              </h4>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h5 className="font-medium text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t('rewards.information.claimableInstant')}
                  </h5>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• {t('rewards.information.referrerLevelRequired')}</p>
                    <p>• {t('rewards.information.levelVerificationPassed')}</p>
                    <p>• {t('rewards.information.rewardDistributedImmediately')}</p>
                    <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/30">
                      <div className="text-xs text-green-400 font-medium">{t('rewards.information.exampleLayer3Reward')}</div>
                      <div className="text-xs text-muted-foreground">{t('rewards.information.referrerHasLevel3')}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="font-medium text-orange-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('rewards.information.pendingHours')}
                  </h5>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• {t('rewards.information.referrerLevelInsufficient')}</p>
                    <p>• {t('rewards.information.hourUpgradeWindow')}</p>
                    <p>• {t('rewards.information.canClaimByUpgrading')}</p>
                    <div className="mt-2 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                      <div className="text-xs text-orange-400 font-medium">{t('rewards.information.exampleLayer3Reward')}</div>
                      <div className="text-xs text-muted-foreground">{t('rewards.information.referrerHasLevel1')}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="font-medium text-purple-400 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {t('rewards.information.rollupSystem')}
                  </h5>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• {t('rewards.information.expiredRewards')}</p>
                    <p>• {t('rewards.information.rollsUpToQualified')}</p>
                    <p>• {t('rewards.information.ensuresNoRewardLost')}</p>
                    <div className="mt-2 p-2 bg-purple-500/10 rounded border border-purple-500/30">
                      <div className="text-xs text-purple-400 font-medium">{t('rewards.information.exampleLayer3Reward')}</div>
                      <div className="text-xs text-muted-foreground">{t('rewards.information.noUpgradeRollup')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Eligibility Rules & Timing */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/30 shadow-xl">
              <h4 className="font-semibold text-orange-400 mb-4 flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                {t('rewards.information.eligibilityRulesAndTiming')}
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-medium text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-400" />
                    {t('rewards.information.instantRewards')}
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">{t('rewards.information.instantReward1')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.instantReward1Desc')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">{t('rewards.information.instantReward2')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.instantReward2Desc')}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h5 className="font-medium text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    {t('rewards.information.pendingSystem')}
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-orange-400">{t('rewards.information.pending72Hours')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.pending72HoursDesc')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-blue-400">{t('rewards.information.upgradeToClain')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.upgradeToClainDesc')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-purple-400">{t('rewards.information.expiredReallocation')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.expiredReallocationDesc')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BCC Rewards Detail Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'bcc'} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
        <DialogContent className={`${isMobile ? 'w-[95vw] h-[90vh] max-w-none' : 'max-w-5xl max-h-[85vh]'} bg-gradient-to-br from-slate-900 to-slate-800 border-slate-600 overflow-hidden`}>
          <DialogHeader className="border-b border-slate-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-blue-400 text-xl">
              <Lock className="h-6 w-6" />
              {t('rewards.information.bccLockingRewardsTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {t('rewards.information.bccLockingRewardsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* BCC Release Overview */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/30 shadow-xl">
              <h4 className="font-semibold text-blue-400 mb-4 flex items-center gap-3 text-lg">
                <Timer className="h-5 w-5" />
                {t('rewards.information.bccReleaseMechanism')}
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">{t('rewards.information.autoDistribution')}</Badge>
              </h4>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                {t('rewards.information.bccReleaseMechanismDesc')}
              </p>
            </div>

            {/* Complete Four-Phase Breakdown */}
            <div className="space-y-6">
              <h4 className="font-semibold text-blue-400 flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                {t('rewards.information.completeFourPhaseDetails')}
              </h4>
              
              {BCC_PHASES.map((phase, index) => (
                <Card key={phase.phase} className={`bg-gradient-to-r from-slate-800/60 to-slate-700/40 border-slate-600 ${phase.status === 'current' ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-gradient-to-br ${phase.color}`}>
                          {phase.phase}
                        </div>
                        <div>
                          <div className="font-semibold text-blue-400 text-lg">
                            {phase.description}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('rewards.information.activatedMembers')}: {phase.members}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-400 text-2xl">
                          {phase.totalReward} BCC
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('rewards.information.perMemberTotalLockingPool')}
                        </div>
                        {phase.status === 'current' && (
                          <Badge className="bg-green-500 text-white text-xs mt-1">{t('rewards.information.currentPhase')}</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Complete Release Schedule */}
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <div className="text-sm font-medium text-blue-300 mb-4 flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        {t('rewards.information.completeReleaseSchedule')}
                      </div>
                      
                      {/* Level 1-5 */}
                      <div className="mb-4">
                        <h6 className="text-xs font-medium text-green-400 mb-2">{t('rewards.information.levelBasic')}</h6>
                        <div className="grid grid-cols-5 gap-2">
                          {phase.releases.slice(0, 5).map((release) => (
                            <div key={release.level} className="text-center bg-slate-600/30 rounded p-2">
                              <div className="text-xs font-medium text-honey">L{release.level}</div>
                              <div className="text-xs text-green-400 font-semibold">{release.amount}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Level 6-10 */}
                      <div className="mb-4">
                        <h6 className="text-xs font-medium text-blue-400 mb-2">{t('rewards.information.levelIntermediate')}</h6>
                        <div className="grid grid-cols-5 gap-2">
                          {phase.releases.slice(5, 10).map((release) => (
                            <div key={release.level} className="text-center bg-slate-600/30 rounded p-2">
                              <div className="text-xs font-medium text-honey">L{release.level}</div>
                              <div className="text-xs text-green-400 font-semibold">{release.amount}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Level 11-15 */}
                      <div className="mb-4">
                        <h6 className="text-xs font-medium text-orange-400 mb-2">{t('rewards.information.levelAdvanced')}</h6>
                        <div className="grid grid-cols-5 gap-2">
                          {phase.releases.slice(10, 15).map((release) => (
                            <div key={release.level} className="text-center bg-slate-600/30 rounded p-2">
                              <div className="text-xs font-medium text-honey">L{release.level}</div>
                              <div className="text-xs text-green-400 font-semibold">{release.amount}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Level 16-19 */}
                      <div className="mb-4">
                        <h6 className="text-xs font-medium text-purple-400 mb-2">{t('rewards.information.levelTop')}</h6>
                        <div className="grid grid-cols-4 gap-2">
                          {phase.releases.slice(15, 19).map((release) => (
                            <div key={release.level} className={`text-center bg-slate-600/30 rounded p-2 ${release.level === 19 ? 'ring-1 ring-honey/50' : ''}`}>
                              <div className={`text-xs font-medium ${release.level === 19 ? 'text-honey' : 'text-honey'}`}>
                                L{release.level}{release.level === 19 ? ' (MAX)' : ''}
                              </div>
                              <div className={`text-xs font-semibold ${release.level === 19 ? 'text-honey' : 'text-green-400'}`}>
                                {release.amount}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Phase Summary */}
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <div className="text-xs text-blue-400 font-medium flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          {t('rewards.information.phaseSummary', { phase: phase.phase, amount1: phase.releases[0].amount, amount19: phase.releases[18].amount })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Release Mechanism Details */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-6 border border-purple-500/30 shadow-xl">
              <h4 className="font-semibold text-purple-400 mb-4 flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                {t('rewards.information.bccReleaseOperationMechanism')}
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">{t('rewards.information.memberActivation')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('rewards.information.memberActivationDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">{t('rewards.information.phaseJudgment')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('rewards.information.phaseJudgmentDesc')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">3</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">{t('rewards.information.instantRelease')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('rewards.information.instantReleaseDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">4</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">{t('rewards.information.phaseProgression')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('rewards.information.phaseProgressionDesc')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardInformationCard;