import React, {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {useI18n} from '@/contexts/I18nContext';
import {useIsMobile} from '@/hooks/use-mobile';
import {MatrixVisualization} from '@/components/illustrations/MatrixVisualization';
import {
    AlertCircle,
    ArrowRight,
    Award,
    CheckCircle,
    ChevronDown,
    Clock,
    Gift,
    Info,
    Layers,
    Lock,
    Target,
    Timer,
    TrendingUp,
    Unlock,
    Users,
    Zap
} from 'lucide-react';

interface RewardsInformationProps {
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  className?: string;
}

// Calculate matrix slots for each layer (3x3 structure)
const getLayerSlots = (layer: number) => {
  if (layer === 1) return 3; // Direct referrals
  return Math.pow(3, layer); // 3^layer slots
};

// Layer reward data structure
const LAYER_REWARDS = Array.from({ length: 19 }, (_, i) => {
  const layer = i + 1;
  const nftPrice = 100 + (i * 50); // Level 1: $100, Level 2: $150, etc.
  const layerSlots = getLayerSlots(layer);
  const totalPotentialReward = nftPrice * layerSlots;
  
  return {
    layer,
    levelPrice: nftPrice,
    layerSlots,
    totalPotentialReward,
    activationFee: i === 0 ? 30 : 0, // Level 1 has 30 USDT activation fee
    percentage: 100, // 100% of NFT price goes to referrer (minus activation fee for Level 1)
    description: i === 0 
      ? `Layer 1: ${layerSlots} direct referrals × $${nftPrice} each = $${totalPotentialReward} + $30 activation fee per member`
      : `Layer ${layer}: ${layerSlots} members × $${nftPrice} each = $${totalPotentialReward} when they upgrade to Level ${layer}`,
    conditions: {
      firstSecond: `Referrer level must equal Layer ${layer}`,
      third: `Referrer level must be greater than Layer ${layer}`
    },
    rewardStates: {
      claimable: `Instant if referrer level >= ${layer}`,
      pending: `72-hour pending if referrer level < ${layer}`,
      rollup: `Rolls up to qualified upline if expired`
    }
  };
});

// BCC staking phases data
const BCC_PHASES_BASE = [
  {
    phase: 1,
    membersKey: 'rewards.bcc.phases.phase1.members',
    totalReward: 10450,
    descriptionKey: 'rewards.bcc.phases.phase1.description',
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
    releases: Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      amount: Math.round((100 + (i * 50)) / 8)
    }))
  }
];

export const RewardsInformation: React.FC<RewardsInformationProps> = ({
  isExpanded = false,
  onExpandChange,
  className = ''
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('layer');
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false);
  const [isBccDialogOpen, setIsBccDialogOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(1);

  // Translate BCC phases using translation keys
  const BCC_PHASES = React.useMemo(() =>
    BCC_PHASES_BASE.map(phase => ({
      ...phase,
      members: t(phase.membersKey),
      description: t(phase.descriptionKey)
    })), [t]
  );

  const handleExpandChange = () => {
    const newExpanded = !isExpanded;
    onExpandChange?.(newExpanded);
  };

  return (
    <>
      <Card className={`bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 border-2 border-slate-700 shadow-2xl hover:shadow-3xl transition-all duration-300 ${className}`}>
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
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'} space-y-6 bg-gradient-to-br from-slate-800/30 to-slate-700/20 rounded-b-xl`}>
              {/* Information Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-12' : 'h-14'} bg-slate-800 rounded-xl border border-slate-600`}>
                  <TabsTrigger 
                    value="layer" 
                    className={`group relative overflow-hidden flex items-center gap-2 ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 data-[state=active]:from-honey/90 data-[state=active]:to-amber-400 data-[state=active]:text-black rounded-lg transition-all duration-300 shadow-lg`}
                  >
                    <Layers className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className="font-semibold">{t('rewards.information.layerRewards')}</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bcc" 
                    className={`group relative overflow-hidden flex items-center gap-2 ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 data-[state=active]:from-honey/90 data-[state=active]:to-amber-400 data-[state=active]:text-black rounded-lg transition-all duration-300 shadow-lg`}
                  >
                    <Lock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className="font-semibold">{t('rewards.information.bccRewards')}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Layer Rewards Tab */}
                <TabsContent value="layer" className="space-y-4 mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
                  {/* Matrix Visualization Preview */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-xl p-4 border border-slate-600 shadow-xl">
                    <h4 className={`font-bold text-honey mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                      <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      {t('rewards.information.matrixPreview')}
                    </h4>
                    <div className="bg-black/30 rounded-lg p-3 mb-4">
                      <MatrixVisualization 
                        maxLevels={3} 
                        compact={true}
                        showAnimation={true}
                        className="w-full"
                      />
                    </div>
                    <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                      {t('rewards.information.matrixDescription')}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-xl p-4 border border-honey/30 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-honey/20 rounded-full flex items-center justify-center mt-1">
                        <Layers className="h-4 w-4 text-honey" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-honey mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                          {t('rewards.information.layerRewardsTitle')}
                        </h3>
                        <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                          {t('rewards.information.layerRewardsDescription')}
                        </p>
                        <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              className={`bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isMobile ? 'text-xs px-3 py-2' : 'text-sm px-4 py-2'}`}
                            >
                              <ArrowRight className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              {t('rewards.information.viewDetails')}
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    </div>
                  </div>

                  {/* Quick Layer Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 19].map((layer, index) => {
                      const reward = LAYER_REWARDS[layer - 1];
                      return (
                        <Card key={layer} className="bg-slate-800/50 border-slate-600 hover:border-honey/50 transition-all duration-200 hover:scale-105 shadow-lg">
                          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
                            <div className={`font-bold text-honey ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {t('rewards.information.layerText', { layer })}{index === 3 ? ` (${t('rewards.information.maxLayer')})` : ''}
                            </div>
                            <div className={`text-green-400 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              ${reward.levelPrice}
                            </div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                              {reward.percentage}% {t('rewards.information.nftPrice')}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* BCC Rewards Tab */}
                <TabsContent value="bcc" className="space-y-4 mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mt-1">
                        <Lock className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-blue-400 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                          {t('rewards.information.bccRewardsTitle')}
                        </h3>
                        <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                          {t('rewards.information.bccRewardsDescription')}
                        </p>
                        <Dialog open={isBccDialogOpen} onOpenChange={setIsBccDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              className={`bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isMobile ? 'text-xs px-3 py-2' : 'text-sm px-4 py-2'}`}
                            >
                              <ArrowRight className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              {t('rewards.information.viewDetails')}
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    </div>
                  </div>

                  {/* Quick BCC Phase Overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {BCC_PHASES.map((phase) => (
                      <Card key={phase.phase} className="bg-slate-800/50 border-slate-600 hover:border-blue-500/50 transition-all duration-200 hover:scale-105 shadow-lg">
                        <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
                          <div className={`font-bold text-blue-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Phase {phase.phase}
                          </div>
                          <div className={`text-green-400 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {phase.totalReward} BCC
                          </div>
                          <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} leading-tight`}>
                            {phase.members}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Layer Rewards Detail Dialog */}
      <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
        <DialogContent className={`${isMobile ? 'w-[95vw] h-[90vh] max-w-none' : 'max-w-5xl max-h-[85vh]'} bg-gradient-to-br from-slate-900 to-slate-800 border-slate-600 overflow-hidden`}>
          <DialogHeader className="border-b border-slate-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-honey text-xl">
              <Layers className="h-6 w-6" />
              {t('rewards.information.layerRewardsDetailTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {t('rewards.information.layerRewardsDetailDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Interactive Matrix Visualization */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-xl p-6 border border-slate-600 shadow-xl">
              <h4 className="font-semibold text-honey mb-4 flex items-center gap-3 text-lg">
                <Users className="h-5 w-5" />
                {t('rewards.information.matrixVisualization')}
                <Badge className="bg-honey/20 text-honey text-xs">{t('rewards.information.liveAnimation')}</Badge>
              </h4>
              <div className="bg-black/40 rounded-xl p-4">
                <MatrixVisualization 
                  maxLevels={5} 
                  compact={isMobile}
                  showAnimation={true}
                  className="w-full"
                />
              </div>
              <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-honey">{t('rewards.information.matrixStructureTitle')}:</strong> {t('rewards.information.matrixStructureDesc')}
                </p>
              </div>
            </div>

            {/* Detailed Reward Structure */}
            <div className="space-y-4">
              <h4 className="font-semibold text-honey flex items-center gap-2 text-lg">
                <Award className="h-5 w-5" />
                {t('rewards.information.detailedRewardStructure')}
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
                            {t('rewards.information.layerRewardText', { layer: reward.layer })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('rewards.information.triggeredByLevel', { layer: reward.layer })}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              {t('rewards.information.firstSecond')}: {reward.conditions.firstSecond}
                            </div>
                            <div className="flex items-center gap-1 text-blue-400">
                              <Target className="h-3 w-3" />
                              {t('rewards.information.thirdPlus')}: {reward.conditions.third}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-400 text-xl">
                            ${reward.levelPrice}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reward.percentage}% {t('rewards.information.ofLevelNftPrice', { level: reward.layer })}
                          </div>
                          <div className="text-xs text-honey font-medium mt-1">
                            {t('rewards.information.instantPayout')}
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
                    <span className="text-sm">{t('rewards.information.continuesToLayer19')}</span>
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
                          {t('rewards.information.layer19RewardMax')}
                          <Badge className="bg-honey text-black text-xs">{t('rewards.information.max')}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t('rewards.information.finalLayerReward')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400 text-2xl">
                          ${LAYER_REWARDS[18].levelPrice}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          100% {t('rewards.information.ofLevel19NftPrice')}
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
                {t('rewards.information.eligibilityRules')}
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-medium text-white flex items-center gap-2">
                    <Timer className="h-4 w-4 text-green-400" />
                    {t('rewards.information.instantRewards')}
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">{t('rewards.information.firstSecondRewards')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.levelMustEqualLayer')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-400">{t('rewards.information.thirdPlusRewards')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.levelMustBeGreater')}</div>
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
                        <div className="font-medium text-orange-400">{t('rewards.information.seventyTwoHourPending')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.levelRequirementsNotMet')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-blue-400">{t('rewards.information.upgradeToClaim')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.activateRequiredLevel')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-purple-400">{t('rewards.information.expiryRedistribution')}</div>
                        <div className="text-muted-foreground">{t('rewards.information.expiredRewardsRedistribute')}</div>
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
      <Dialog open={isBccDialogOpen} onOpenChange={setIsBccDialogOpen}>
        <DialogContent className={`${isMobile ? 'w-[95vw] h-[90vh] max-w-none' : 'max-w-5xl max-h-[85vh]'} bg-gradient-to-br from-slate-900 to-slate-800 border-slate-600 overflow-hidden`}>
          <DialogHeader className="border-b border-slate-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-blue-400 text-xl">
              <Lock className="h-6 w-6" />
              {t('rewards.information.bccRewardsDetailTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {t('rewards.information.bccRewardsDetailDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* BCC Release Overview */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/30 shadow-xl">
              <h4 className="font-semibold text-blue-400 mb-4 flex items-center gap-3 text-lg">
                <Unlock className="h-5 w-5" />
                BCC Release Mechanism
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">Automatic</Badge>
              </h4>
              <p className="text-muted-foreground mb-4">
                BCC rewards are automatically released to member balances when they activate new membership levels. 
                The release amount depends on the current phase and the level being activated.
              </p>
            </div>

            {/* Phase Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-400 flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Four-Phase Reward System
              </h4>
              
              <div className="grid gap-4">
                {BCC_PHASES.map((phase, index) => (
                  <Card key={phase.phase} className={`bg-gradient-to-r from-slate-800/60 to-slate-700/40 border-slate-600 hover:border-blue-500/50 transition-all duration-300 ${index === 0 ? 'ring-2 ring-green-500/30' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            phase.phase === 1 ? 'bg-green-500 text-white' : 
                            phase.phase === 2 ? 'bg-yellow-500 text-black' : 
                            phase.phase === 3 ? 'bg-orange-500 text-white' : 
                            'bg-red-500 text-white'
                          }`}>
                            {phase.phase}
                          </div>
                          <div>
                            <div className="font-semibold text-blue-400 text-lg">
                              {phase.description}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Activated Members: {phase.members}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-400 text-2xl">
                            {phase.totalReward} BCC
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Pool Per Member
                          </div>
                          {index === 0 && (
                            <Badge className="bg-green-500 text-white text-xs mt-1">Current Phase</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Release Schedule Grid */}
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Release Schedule (BCC per level activation):
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                          {phase.releases.slice(0, 10).map((release) => (
                            <div key={release.level} className="text-center bg-slate-600/30 rounded p-2">
                              <div className="text-xs font-medium text-honey">L{release.level}</div>
                              <div className="text-xs text-green-400 font-semibold">{release.amount}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-center text-muted-foreground mt-2 text-xs">
                          ... continues to Level 19 ({phase.releases[18].amount} BCC)
                        </div>
                      </div>

                      {/* Phase-specific details */}
                      {phase.phase === 1 && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                          <div className="text-xs text-green-400 font-medium">
                            🎯 Current Phase - Full rewards available for early adopters
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Release Mechanism Details */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-6 border border-purple-500/30 shadow-xl">
              <h4 className="font-semibold text-purple-400 mb-4 flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                How BCC Release Works
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">Member Activation</div>
                      <div className="text-sm text-muted-foreground">
                        When a member activates a new level (e.g., Level 3), the system calculates BCC release
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">Phase Detection</div>
                      <div className="text-sm text-muted-foreground">
                        System determines current phase based on total activated member count
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
                      <div className="font-medium text-purple-400">BCC Release</div>
                      <div className="text-sm text-muted-foreground">
                        Corresponding BCC amount is released to member's balance instantly
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-purple-400">4</span>
                    </div>
                    <div>
                      <div className="font-medium text-purple-400">Phase Progression</div>
                      <div className="text-sm text-muted-foreground">
                        As member count increases, phases automatically progress with reduced rewards
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

export default RewardsInformation;