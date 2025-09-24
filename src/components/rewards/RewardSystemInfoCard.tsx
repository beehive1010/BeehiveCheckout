import React, {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '../ui/collapsible';
import {useI18n} from '../../contexts/I18nContext';
import {ChevronDown, ChevronUp, Coins, Gift, Info} from 'lucide-react';

interface RewardSystemInfoCardProps {
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  className?: string;
}

export default function RewardSystemInfoCard({ 
  isExpanded = false, 
  onExpandChange,
  className = ""
}: RewardSystemInfoCardProps) {
  const { t } = useI18n();
  const [internalExpanded, setInternalExpanded] = useState(isExpanded);
  const [mobileRewardTab, setMobileRewardTab] = useState<'matrix' | 'bcc'>('matrix');
  
  const isRewardInfoExpanded = onExpandChange ? isExpanded : internalExpanded;
  const setIsRewardInfoExpanded = onExpandChange || setInternalExpanded;

  return (
    <Collapsible 
      open={isRewardInfoExpanded} 
      onOpenChange={setIsRewardInfoExpanded}
      className={`w-full ${className}`}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-honey/8 via-orange-500/8 to-amber-500/8 border-0 shadow-2xl shadow-honey/10">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.1),transparent_70%)]" />
        
        <CollapsibleTrigger asChild>
          <CardHeader className="relative cursor-pointer hover:bg-white/5 dark:hover:bg-black/5 transition-all duration-300 group rounded-t-lg p-3 md:p-6">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Info className="h-3 w-3 md:h-5 md:w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm md:text-xl font-bold bg-gradient-to-r from-honey to-orange-500 bg-clip-text text-transparent">
                    {t('rewards.rewardSystemInfo')}
                  </span>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                    {t('rewards.rewardSystemSubtitle') || 'Understanding the complete reward ecosystem'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <Badge 
                  variant="outline" 
                  className="bg-honey/15 border-honey/30 text-honey font-semibold px-2 md:px-3 py-1 text-xs hover:bg-honey/25 transition-colors hidden sm:flex"
                >
                  {t('rewards.learnMore')}
                </Badge>
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-honey/20 flex items-center justify-center group-hover:bg-honey/30 transition-colors">
                  {isRewardInfoExpanded ? (
                    <ChevronUp className="h-3 w-3 md:h-4 md:w-4 text-honey" />
                  ) : (
                    <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-honey" />
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="relative pt-0 pb-3 md:pb-8 px-3 md:px-6">
            {/* Desktop Layout - Grid */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4 md:gap-8">
              {/* Matrix Rewards Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Gift className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">
                    {t('rewards.matrixRewardsTitle')}
                  </h4>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'level1Direct', color: 'emerald', icon: '🎯' },
                    { key: 'level2Matrix', color: 'blue', icon: '🌐' },
                    { key: 'spilloverBonuses', color: 'purple', icon: '⚡' },
                    { key: 'claimWindow', color: 'orange', icon: '⏰' }
                  ].map((item, index) => (
                    <div 
                      key={item.key}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-900/20 dark:hover:bg-emerald-800/30 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: isRewardInfoExpanded ? 'slideInFromLeft 0.5s ease-out forwards' : 'none'
                      }}
                    >
                      <div className="text-xl">{item.icon}</div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">
                          {t(`rewards.rewards.${item.key}`)}
                        </span>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 group-hover:scale-125 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* BCC Token Rewards Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">
                    {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                  </h4>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'bccTransferable', color: 'yellow', icon: '💰' },
                    { key: 'bccLocked', color: 'red', icon: '🔒' },
                    { key: 'bccMultipliers', color: 'teal', icon: '📈' },
                    { key: 'bccUpgrades', color: 'indigo', icon: '🚀' }
                  ].map((item, index) => (
                    <div 
                      key={item.key}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-yellow-50/50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-800/30 border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: isRewardInfoExpanded ? 'slideInFromLeft 0.5s ease-out forwards' : 'none'
                      }}
                    >
                      <div className="text-xl">{item.icon}</div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">
                          {t(`rewards.bccRewards.${item.key}`)}
                        </span>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:scale-125 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Version - Tab Layout */}
            <div className="block md:hidden space-y-3">
              {/* Tab Navigation */}
              <div className="flex bg-muted/30 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setMobileRewardTab('matrix')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                    mobileRewardTab === 'matrix'
                      ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Matrix
                </button>
                <button
                  onClick={() => setMobileRewardTab('bcc')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                    mobileRewardTab === 'bcc'
                      ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  BCC
                </button>
              </div>

              {/* Tab Content */}
              <div className="relative h-40">
                {mobileRewardTab === 'matrix' && (
                  <div className="space-y-2 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                        <Gift className="h-2.5 w-2.5 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {t('rewards.matrixRewardsTitle') || 'Matrix Rewards'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'level1Direct', bgClass: 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200/50 dark:border-emerald-700/50', dotClass: 'bg-gradient-to-r from-emerald-400 to-emerald-600', icon: '🎯' },
                        { key: 'level2Matrix', bgClass: 'bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-700/50', dotClass: 'bg-gradient-to-r from-blue-400 to-blue-600', icon: '🌐' },
                        { key: 'spilloverBonuses', bgClass: 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50 dark:border-purple-700/50', dotClass: 'bg-gradient-to-r from-purple-400 to-purple-600', icon: '⚡' },
                        { key: 'claimWindow', bgClass: 'bg-gradient-to-br from-orange-50/50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200/50 dark:border-orange-700/50', dotClass: 'bg-gradient-to-r from-orange-400 to-orange-600', icon: '⏰' }
                      ].map((item, index) => (
                        <div 
                          key={item.key}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${item.bgClass}`}
                        >
                          <div className="text-lg">{item.icon}</div>
                          <span className="text-[10px] font-medium text-center text-foreground leading-tight">
                            {t(`rewards.rewards.${item.key}`)}
                          </span>
                          <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mobileRewardTab === 'bcc' && (
                  <div className="space-y-2 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-honey to-orange-500 flex items-center justify-center">
                        <Coins className="h-2.5 w-2.5 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {t('rewards.bccTokenRewardsTitle') || 'BCC Token Rewards'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'bccTransferable', bgClass: 'bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200/50 dark:border-yellow-700/50', dotClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600', icon: '💰' },
                        { key: 'bccLocked', bgClass: 'bg-gradient-to-br from-red-50/50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-red-200/50 dark:border-red-700/50', dotClass: 'bg-gradient-to-r from-red-400 to-red-600', icon: '🔒' },
                        { key: 'bccMultipliers', bgClass: 'bg-gradient-to-br from-teal-50/50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200/50 dark:border-teal-700/50', dotClass: 'bg-gradient-to-r from-teal-400 to-teal-600', icon: '📈' },
                        { key: 'bccUpgrades', bgClass: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200/50 dark:border-indigo-700/50', dotClass: 'bg-gradient-to-r from-indigo-400 to-indigo-600', icon: '🚀' }
                      ].map((item, index) => (
                        <div 
                          key={item.key}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${item.bgClass}`}
                        >
                          <div className="text-lg">{item.icon}</div>
                          <span className="text-[10px] font-medium text-center text-foreground leading-tight">
                            {t(`rewards.bccRewards.${item.key}`)}
                          </span>
                          <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="mt-4 md:mt-8 pt-3 md:pt-6 border-t border-honey/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-honey animate-pulse" />
                  <span className="hidden sm:inline">{t('rewards.systemActive') || 'Reward system active and processing'}</span>
                  <span className="sm:hidden">{t('rewards.active') || 'Active'}</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                    <span className="text-[10px] md:text-xs">{t('rewards.viewDetails') || 'Details'}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="border-honey/30 text-honey hover:bg-honey/10">
                    <span className="text-[10px] md:text-xs">{t('rewards.howItWorks') || 'How It Works'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}