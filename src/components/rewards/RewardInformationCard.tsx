import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {useI18n} from '@/contexts/I18nContext';
import {useIsMobile} from '@/hooks/use-mobile';
import {BCCRewardInformation} from './BCCRewardInformation';
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
  percentage: 100, // 100% of NFT price
  description: `Layer ${i + 1} reward triggered when Level ${i + 1} members upgrade`,
  conditions: {
    firstSecond: `Level must equal Layer ${i + 1}`,
    third: `Level must be greater than Layer ${i + 1}`
  }
}));

// BCC staking phases data with complete release schedule
const BCC_PHASES = [
  {
    phase: 1,
    members: '1st - 9,999th',
    totalReward: 10450,
    description: '阶段一：早期采用者',
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
    description: '阶段二：成长阶段（减半）',
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
    description: '阶段三：扩张阶段（再减半）',
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
    description: '阶段四：最终阶段（再减半）',
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
      <Card className={`bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 border-2 border-slate-700 shadow-2xl hover:shadow-3xl transition-all duration-500 ${className}`}>
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
            <CardContent className={`bg-gradient-to-br from-slate-800/30 to-slate-700/20 rounded-b-xl ${isMobile ? 'p-4' : 'p-6'}`}>
              
              {/* Desktop: Side-by-side Layout */}
              {!isMobile && (
                <div className="grid grid-cols-2 gap-6">
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
                            className="bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm px-4 py-2"
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
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 19].map((layer, index) => {
                          const reward = LAYER_REWARDS[layer - 1];
                          return (
                            <div key={layer} className="bg-slate-700/50 rounded-lg p-2 text-center">
                              <div className="text-honey text-xs font-bold">
                                Layer {layer}{index === 3 ? ' (Max)' : ''}
                              </div>
                              <div className="text-green-400 text-xs font-semibold">
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
                    <BCCRewardInformation compact={true} showAnimation={false} />
                    <div className="text-center">
                      <Button 
                        onClick={() => openDialog('bcc')}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm px-4 py-2"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        查看全部阶段
                      </Button>
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
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === activeSlide ? 'bg-honey w-6' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Sliding Content */}
                  <div className="relative overflow-hidden rounded-xl">
                    <div 
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                      {/* Layer Rewards Slide */}
                      <div className="w-full flex-shrink-0 space-y-4">
                        <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 shadow-lg">
                          <div className="text-center space-y-3">
                            <div className="w-12 h-12 bg-honey/20 rounded-full flex items-center justify-center mx-auto">
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
                          <div className="grid grid-cols-2 gap-2">
                            {[1, 2, 3, 19].map((layer, index) => {
                              const reward = LAYER_REWARDS[layer - 1];
                              return (
                                <div key={layer} className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-honey text-xs font-bold">
                                    Layer {layer}{index === 3 ? ' (Max)' : ''}
                                  </div>
                                  <div className="text-green-400 text-xs font-semibold">
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
                            className="bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full py-2 text-sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            查看全部19层详情
                          </Button>
                        </div>
                      </div>

                      {/* BCC Rewards Slide */}
                      <div className="w-full flex-shrink-0">
                        <BCCRewardInformation compact={true} showAnimation={true} />
                        <div className="text-center mt-4">
                          <Button 
                            onClick={() => openDialog('bcc')}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full py-2 text-sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            查看全部阶段详情
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
                      className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center px-3 py-2 bg-slate-800 rounded-lg border border-slate-600">
                      <span className="text-xs text-muted-foreground">
                        {activeSlide + 1} / {slides.length}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSlideChange('next')}
                      className="bg-slate-800 border-slate-600 hover:bg-slate-700"
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
              层级奖励 - 完整19层详情
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              19层奖励系统的全面解释，包括资格规则和支付机制
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Matrix Explanation */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-xl p-6 border border-slate-600 shadow-xl">
              <h4 className="font-semibold text-honey mb-4 flex items-center gap-3 text-lg">
                <Users className="h-5 w-5" />
                矩阵结构说明
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    <strong className="text-honey">矩阵结构原理：</strong>BEEHIVE采用19层3×3矩阵系统，每个级别代表矩阵中的一层。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h5 className="font-medium text-honey">触发条件：</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 层级中的会员升级会员级别</li>
                        <li>• 根据升级的级别触发对应奖励</li>
                        <li>• 每层可获得多次奖励</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-honey">奖励金额：</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Layer 1: $100 (Level 1 NFT价格)</li>
                        <li>• Layer 2: $150 (Level 2 NFT价格)</li>
                        <li>• Layer 19: $1,000 (Level 19 NFT价格)</li>
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
                完整19层奖励结构
              </h4>
              
              {/* Layer Groups */}
              <div className="space-y-4">
                {/* Layers 1-5 */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                  <h5 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400">初级</Badge>
                    Layer 1-5 奖励
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LAYER_REWARDS.slice(0, 5).map((reward) => (
                      <div key={reward.layer} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">Layer {reward.layer}</div>
                            <div className="text-xs text-muted-foreground">Level {reward.layer} 升级触发</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">100% NFT价格</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 6-10 */}
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/30">
                  <h5 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400">中级</Badge>
                    Layer 6-10 奖励
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LAYER_REWARDS.slice(5, 10).map((reward) => (
                      <div key={reward.layer} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">Layer {reward.layer}</div>
                            <div className="text-xs text-muted-foreground">Level {reward.layer} 升级触发</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">100% NFT价格</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 11-15 */}
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-4 border border-orange-500/30">
                  <h5 className="font-medium text-orange-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-orange-500/20 text-orange-400">高级</Badge>
                    Layer 11-15 奖励
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LAYER_REWARDS.slice(10, 15).map((reward) => (
                      <div key={reward.layer} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-honey text-sm">Layer {reward.layer}</div>
                            <div className="text-xs text-muted-foreground">Level {reward.layer} 升级触发</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">${reward.levelPrice}</div>
                            <div className="text-xs text-muted-foreground">100% NFT价格</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layers 16-19 */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30">
                  <h5 className="font-medium text-purple-400 mb-3 flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400">顶级</Badge>
                    Layer 16-19 奖励
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                    {LAYER_REWARDS.slice(15, 19).map((reward) => (
                      <div key={reward.layer} className={`bg-slate-800/50 rounded-lg p-4 border ${reward.layer === 19 ? 'border-honey/50 bg-gradient-to-r from-honey/10 to-amber-500/10' : 'border-slate-600'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-semibold text-sm flex items-center gap-2 ${reward.layer === 19 ? 'text-honey' : 'text-honey'}`}>
                              Layer {reward.layer}
                              {reward.layer === 19 && <Badge className="bg-honey text-black text-xs">MAX</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">Level {reward.layer} 升级触发</div>
                            {reward.layer === 19 && (
                              <div className="text-xs text-honey mt-1">最高收益层级</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${reward.layer === 19 ? 'text-honey text-lg' : 'text-green-400'}`}>
                              ${reward.levelPrice}
                            </div>
                            <div className="text-xs text-muted-foreground">100% NFT价格</div>
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
                    层级奖励总结
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="font-bold text-green-400 text-lg">$100-$250</div>
                      <div className="text-xs text-muted-foreground">Layer 1-5</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="font-bold text-blue-400 text-lg">$300-$500</div>
                      <div className="text-xs text-muted-foreground">Layer 6-10</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="font-bold text-orange-400 text-lg">$550-$750</div>
                      <div className="text-xs text-muted-foreground">Layer 11-15</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="font-bold text-honey text-lg">$800-$1,000</div>
                      <div className="text-xs text-muted-foreground">Layer 16-19</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Eligibility Rules & Timing */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/30 shadow-xl">
              <h4 className="font-semibold text-orange-400 mb-4 flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                资格规则和时间机制
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-medium text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-400" />
                    即时奖励
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">每层前1、2个奖励</div>
                        <div className="text-muted-foreground">您的等级必须等于该层级才能立即获得</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">每层第3+个奖励</div>
                        <div className="text-muted-foreground">您的等级必须大于该层级</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h5 className="font-medium text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    待处理系统
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-orange-400">72小时待处理</div>
                        <div className="text-muted-foreground">如未满足等级要求，奖励进入待处理状态</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-blue-400">升级领取</div>
                        <div className="text-muted-foreground">激活所需等级即可立即领取</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-purple-400">过期重分配</div>
                        <div className="text-muted-foreground">过期奖励转给上级符合条件的会员</div>
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
              BCC锁仓奖励 - 完整四阶段详情
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              基于总激活会员数量的四阶段BCC释放系统，包含所有级别的详细释放数量
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* BCC Release Overview */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/30 shadow-xl">
              <h4 className="font-semibold text-blue-400 mb-4 flex items-center gap-3 text-lg">
                <Timer className="h-5 w-5" />
                BCC释放机制说明
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">自动分发</Badge>
              </h4>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                BCC奖励根据会员激活人数达标分为四个阶段，每个阶段的总锁仓奖励和单级别释放数量都会递减。
                当会员激活新的级别时，系统会自动释放对应数量的BCC到余额中。
              </p>
            </div>

            {/* Complete Four-Phase Breakdown */}
            <div className="space-y-6">
              <h4 className="font-semibold text-blue-400 flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                完整四阶段释放详情
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
                            激活会员: {phase.members}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-400 text-2xl">
                          {phase.totalReward} BCC
                        </div>
                        <div className="text-xs text-muted-foreground">
                          每位会员总锁仓池
                        </div>
                        {phase.status === 'current' && (
                          <Badge className="bg-green-500 text-white text-xs mt-1">当前阶段</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Complete Release Schedule */}
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <div className="text-sm font-medium text-blue-300 mb-4 flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        完整释放时间表 (BCC数量/级别激活)
                      </div>
                      
                      {/* Level 1-5 */}
                      <div className="mb-4">
                        <h6 className="text-xs font-medium text-green-400 mb-2">Level 1-5 (初级)</h6>
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
                        <h6 className="text-xs font-medium text-blue-400 mb-2">Level 6-10 (中级)</h6>
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
                        <h6 className="text-xs font-medium text-orange-400 mb-2">Level 11-15 (高级)</h6>
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
                        <h6 className="text-xs font-medium text-purple-400 mb-2">Level 16-19 (顶级)</h6>
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
                          阶段{phase.phase}总结: Level 1释放{phase.releases[0].amount} BCC → Level 19释放{phase.releases[18].amount} BCC
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
                BCC释放运作机制
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">会员激活</div>
                      <div className="text-sm text-muted-foreground">
                        当会员激活新级别时，系统自动计算并释放对应BCC数量
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">阶段判断</div>
                      <div className="text-sm text-muted-foreground">
                        系统根据总激活会员数自动判断当前阶段
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
                      <div className="font-medium text-purple-400">即时释放</div>
                      <div className="text-sm text-muted-foreground">
                        对应BCC数量立即释放到会员余额中
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">4</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">阶段递进</div>
                      <div className="text-sm text-muted-foreground">
                        达到人数门槛时自动进入下一阶段，奖励减半
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