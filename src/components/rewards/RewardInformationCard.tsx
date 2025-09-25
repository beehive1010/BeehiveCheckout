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
      subtitle: '19层奖励系统',
      icon: Layers,
      gradient: 'from-honey/20 to-amber-500/20',
      borderColor: 'border-honey/30',
      content: 'layer'
    },
    {
      id: 'bcc',
      title: t('rewards.information.bccRewards'),
      subtitle: 'BCC释放奖励',
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
                            层级奖励系统
                          </h3>
                          <p className="text-muted-foreground mb-3 text-sm">
                            当您矩阵中的会员升级会员级别时触发相应层级奖励
                          </p>
                          <Button 
                            onClick={() => openDialog('layer')}
                            className="bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm px-4 py-2"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            详细说明
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Layer Preview */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                      <h4 className="font-semibold text-honey mb-3 flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4" />
                        层级奖励预览
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
                        详细说明
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
                              层级奖励系统
                            </h3>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              当您矩阵中的会员升级会员级别时触发相应层级奖励。每个层级都有特定的资格要求和奖励金额。
                            </p>
                          </div>
                        </div>

                        {/* Layer Rewards Quick Preview */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                          <h4 className="font-semibold text-honey mb-3 flex items-center justify-center gap-2 text-sm">
                            <Target className="h-4 w-4" />
                            层级奖励预览
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
                            查看完整说明
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
                            查看完整说明
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
              层级奖励 - 完整指南
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

            {/* Detailed Reward Structure */}
            <div className="space-y-4">
              <h4 className="font-semibold text-honey flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5" />
                详细奖励结构
              </h4>
              
              <div className="grid gap-3">
                {/* Show first 6 layers in detail */}
                {LAYER_REWARDS.slice(0, 6).map((reward) => (
                  <Card key={reward.layer} className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border-slate-600 hover:border-honey/50 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="font-semibold text-honey flex items-center gap-2">
                            <div className="w-8 h-8 bg-honey/20 rounded-full flex items-center justify-center text-xs font-bold text-honey">
                              {reward.layer}
                            </div>
                            Layer {reward.layer} 奖励
                          </div>
                          <div className="text-sm text-muted-foreground">
                            当您的 Layer {reward.layer} 中有会员升级到 Level {reward.layer} 时触发
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              1st & 2nd: 您的等级必须等于 Layer {reward.layer}
                            </div>
                            <div className="flex items-center gap-1 text-blue-400">
                              <Target className="h-3 w-3" />
                              3rd+: 您的等级必须大于 Layer {reward.layer}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-400 text-xl">
                            ${reward.levelPrice}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Level {reward.layer} NFT价格的 100%
                          </div>
                          <div className="text-xs text-honey font-medium mt-1">
                            符合条件立即发放
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Continuation indicator */}
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
                    <span className="text-sm">继续到 Layer 19</span>
                    <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                {/* Final layer */}
                <Card className="bg-gradient-to-r from-amber-900/30 to-yellow-800/20 border-honey/50 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="font-semibold text-honey flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-honey to-amber-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                            19
                          </div>
                          Layer 19 奖励 (最高)
                          <Badge className="bg-honey text-black text-xs">MAX</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          最终层级奖励 - 最高收益潜力
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400 text-2xl">
                          ${LAYER_REWARDS[18].levelPrice}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Level 19 NFT价格的 100%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
              BCC锁仓奖励 - 释放时间表
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              基于总激活会员数量的四阶段BCC释放系统，奖励递减
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <BCCRewardInformation showAnimation={true} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardInformationCard;