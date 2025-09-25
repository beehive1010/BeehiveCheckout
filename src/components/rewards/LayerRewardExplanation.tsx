import React, {useState} from 'react';
import {useI18n} from '../../contexts/I18nContext';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {MatrixVisualization} from '@/components/illustrations/MatrixVisualization';
import {useIsMobile} from '@/hooks/use-mobile';
import {
    AlertTriangle,
    ArrowUp,
    Award,
    CheckCircle,
    Clock,
    DollarSign,
    GitBranch,
    Info,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';

interface LayerRewardExplanationProps {
  trigger?: React.ReactNode;
  className?: string;
}

export const LayerRewardExplanation: React.FC<LayerRewardExplanationProps> = ({
  trigger,
  className = ''
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="group relative overflow-hidden bg-gradient-to-r from-honey/10 to-amber-400/10 hover:from-honey/20 hover:to-amber-400/20 border-honey/30 hover:border-honey/50 text-honey hover:text-white transition-all duration-300"
      data-testid="button-layer-reward-explanation"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <Info className="relative h-4 w-4 mr-2" />
      <span className="relative font-medium">{t('rewards.layerRewardSystem.learnMore')}</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[95vh]' : 'max-w-6xl h-[90vh]'} overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 border-2 border-honey/30 shadow-2xl`}>
        <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-transparent to-amber-400/5 opacity-50"></div>
        <DialogHeader className="relative border-b border-honey/20 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-honey via-amber-400 to-honey bg-clip-text text-transparent">
            {t('rewards.layerRewardSystem.title')}
          </DialogTitle>
          <p className="text-slate-400 text-sm">
            {t('rewards.layerRewardSystem.subtitle')}
          </p>
        </DialogHeader>
        
        <div className="relative flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2 bg-slate-800/50 p-1 rounded-lg border border-honey/20`}>
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-honey data-[state=active]:text-black font-medium"
                data-testid="tab-overview"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('rewards.layerRewardSystem.howItWorks.title')}
              </TabsTrigger>
              <TabsTrigger 
                value="structure" 
                className="data-[state=active]:bg-honey data-[state=active]:text-black font-medium"
                data-testid="tab-structure"
              >
                <GitBranch className="h-4 w-4 mr-2" />
                {t('rewards.layerRewardSystem.rewardStructure.title')}
              </TabsTrigger>
              <TabsTrigger 
                value="rules" 
                className="data-[state=active]:bg-honey data-[state=active]:text-black font-medium"
                data-testid="tab-rules"
              >
                <Target className="h-4 w-4 mr-2" />
                {t('rewards.layerRewardSystem.eligibilityRules.title')}
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="data-[state=active]:bg-honey data-[state=active]:text-black font-medium"
                data-testid="tab-pending"
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('rewards.layerRewardSystem.pendingSystem.title')}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pb-4">
              <TabsContent value="overview" className="space-y-4 mt-0">
                <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} gap-6 ${isMobile ? 'px-2' : ''}`}>
                  <Card className="bg-slate-800/50 border-honey/20">
                    <CardHeader>
                      <CardTitle className="text-honey flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t('rewards.layerRewardSystem.matrixVisualization.title')}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {t('rewards.layerRewardSystem.matrixVisualization.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-honey/10">
                        <div className={`${isMobile ? 'flex justify-center items-center' : ''}`}>
                          <MatrixVisualization 
                            maxLevels={4} 
                            showAnimation={true} 
                            compact={isMobile ? true : true}
                            className={`${isMobile ? 'scale-90 w-auto' : 'w-full'}`}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mt-3">
                        {t('rewards.layerRewardSystem.matrixVisualization.positions')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-honey/20">
                    <CardHeader>
                      <CardTitle className="text-honey flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        {t('rewards.layerRewardSystem.howItWorks.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-slate-300">
                        {t('rewards.layerRewardSystem.howItWorks.description')}
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-green-500/20">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.matrixVisualization.rewards')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="structure" className="space-y-4 mt-0">
                <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} gap-6 ${isMobile ? 'px-2' : ''}`}>
                  <Card className="bg-slate-800/50 border-honey/20">
                    <CardHeader>
                      <CardTitle className="text-honey flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        {t('rewards.layerRewardSystem.rewardStructure.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardStructure.layer1')}
                          </span>
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            Layer 1
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardStructure.layer2')}
                          </span>
                          <Badge variant="outline" className="border-purple-400 text-purple-400">
                            Layer 2
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardStructure.layer3')}
                          </span>
                          <Badge variant="outline" className="border-orange-400 text-orange-400">
                            Layer 3
                          </Badge>
                        </div>
                        <div className="flex items-center justify-center p-3 bg-honey/10 rounded-lg border border-honey/20">
                          <span className="text-sm text-honey font-medium">
                            {t('rewards.layerRewardSystem.rewardStructure.pattern')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-honey/20">
                    <CardHeader>
                      <CardTitle className="text-honey flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        {t('rewards.layerRewardSystem.rewardAmounts.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardAmounts.level1')}
                          </span>
                          <Badge className="bg-green-500 text-white">$100</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardAmounts.level2')}
                          </span>
                          <Badge className="bg-blue-500 text-white">$150</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <span className="text-sm text-slate-300">
                            {t('rewards.layerRewardSystem.rewardAmounts.level3')}
                          </span>
                          <Badge className="bg-purple-500 text-white">$200</Badge>
                        </div>
                        <div className="flex items-center justify-center p-3 bg-honey/10 rounded-lg border border-honey/20">
                          <span className="text-sm text-honey font-medium">
                            {t('rewards.layerRewardSystem.rewardAmounts.continuation')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-0">
                <Card className="bg-slate-800/50 border-honey/20">
                  <CardHeader>
                    <CardTitle className="text-honey flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {t('rewards.layerRewardSystem.eligibilityRules.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-4`}>
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <span className="font-medium text-green-400">{t('rewards.information.eligibilityRules.firstSecondTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.eligibilityRules.firstSecond')}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <div className="flex items-center gap-3 mb-3">
                          <ArrowUp className="h-5 w-5 text-orange-400" />
                          <span className="font-medium text-orange-400">{t('rewards.information.eligibilityRules.thirdOnwardTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.eligibilityRules.thirdOnward')}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-honey/10 rounded-lg border border-honey/20">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="h-5 w-5 text-honey" />
                        <span className="font-medium text-honey">{t('rewards.information.eligibilityRules.importantTitle')}</span>
                      </div>
                      <p className="text-sm text-slate-300">
                        {t('rewards.layerRewardSystem.eligibilityRules.verification')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4 mt-0">
                <Card className="bg-slate-800/50 border-honey/20">
                  <CardHeader>
                    <CardTitle className="text-honey flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {t('rewards.layerRewardSystem.pendingSystem.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                          <span className="font-medium text-red-400">{t('rewards.information.pendingSystem.notEligibleTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.pendingSystem.notEligible')}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="h-5 w-5 text-blue-400" />
                          <span className="font-medium text-blue-400">{t('rewards.information.pendingSystem.windowTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.pendingSystem.upgradeWindow')}
                        </p>
                      </div>
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <span className="font-medium text-green-400">{t('rewards.information.pendingSystem.immediateTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.pendingSystem.immediate')}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <ArrowUp className="h-5 w-5 text-orange-400" />
                          <span className="font-medium text-orange-400">{t('rewards.information.pendingSystem.rollupTitle')}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {t('rewards.layerRewardSystem.pendingSystem.expiry')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};