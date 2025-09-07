import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import { useLevelConfigurations, convertToLegacyMembershipLevel } from '../../hooks/useLevelConfig';
import MembershipBadge from './MembershipBadge';
import ClaimMembershipButton from './ClaimMembershipButton';
import MobileDivider from '../shared/MobileDivider';

interface MembershipLevelListProps {
  onPurchaseSuccess?: () => void;
  className?: string;
}

export default function MembershipLevelList({ 
  onPurchaseSuccess, 
  className = '' 
}: MembershipLevelListProps) {
  const { t } = useI18n();
  const { walletAddress, userData } = useWallet();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Use dynamic level configurations from database
  const { data: levelConfigs, isLoading: isLoadingLevels, error: levelConfigError } = useLevelConfigurations(walletAddress || undefined);

  const currentLevel = userData?.user?.currentLevel || 0;
  const levelsOwned = userData?.membershipState?.levelsOwned || [];

  // Convert database configs to legacy format
  const membershipLevels = levelConfigs ? levelConfigs.map(convertToLegacyMembershipLevel) : [];

  const getCardStatus = (level: number) => {
    if (levelsOwned.includes(level)) return 'owned';
    if (level <= currentLevel) return 'owned';
    if (currentLevel > 0 && level < currentLevel) return 'lower';
    return 'available';
  };

  const isLevelSelectable = (level: number) => {
    const status = getCardStatus(level);
    return status === 'available';
  };

  const handleCardClick = (level: number) => {
    if (isLevelSelectable(level)) {
      setSelectedLevel(selectedLevel === level ? null : level);
    }
  };

  const handlePurchaseSuccess = () => {
    setSelectedLevel(null);
    onPurchaseSuccess?.();
  };

  // Loading state
  if (isLoadingLevels) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading membership levels...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (levelConfigError || !levelConfigs || levelConfigs.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load membership levels</p>
          <p className="text-muted-foreground text-sm">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-honey mb-2">
          {String(t('membership.levels.title'))}
        </h2>
        <p className="text-muted-foreground text-sm">
          {String(t('membership.levels.subtitle'))}
        </p>
        <MobileDivider className="mt-4" />
      </div>

      {/* Current Status */}
      {currentLevel > 0 && (
        <Card className="bg-honey/10 border-honey/30">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-3">
              <MembershipBadge level={currentLevel} size="md" />
              <div>
                <h3 className="text-honey font-semibold">
                  {String(t('membership.levels.currentLevel'))}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {String(t(`membership.level.${currentLevel}.title`))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {membershipLevels.map((level) => {
          const status = getCardStatus(level.level);
          const isSelected = selectedLevel === level.level;
          const isSelectable = isLevelSelectable(level.level);

          return (
            <Card
              key={level.level}
              onClick={() => handleCardClick(level.level)}
              className={`
                relative transition-all duration-300 cursor-pointer transform hover:scale-105
                ${status === 'owned' 
                  ? 'bg-green-500/10 border-green-500/30 opacity-75' 
                  : status === 'lower'
                  ? 'bg-muted/50 border-border opacity-60'
                  : isSelected
                  ? 'bg-honey/20 border-honey shadow-lg shadow-honey/25 scale-105'
                  : 'bg-secondary border-border hover:bg-honey/5 hover:border-honey/30'
                }
                ${!isSelectable ? 'cursor-default' : ''}
              `}
              data-testid={`membership-card-${level.level}`}
            >
              {/* Status Badge */}
              {status === 'owned' && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {String(t('membership.levels.owned'))}
                </div>
              )}
              
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2 bg-honey text-black text-xs px-2 py-1 rounded-full font-medium">
                  {String(t('membership.levels.selected'))}
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex flex-col items-center space-y-2">
                  <MembershipBadge level={level.level} size="lg" />
                  <div className="text-center">
                    <h3 className="font-bold text-honey">
                      {String(t(`${level.i18nKey}.title`))}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {String(t(`${level.i18nKey}.subtitle`))}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Price */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey">
                    ${level.priceUSDT}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {String(t('membership.levels.priceUSDT'))}
                  </div>
                </div>

                <MobileDivider />

                {/* Benefits */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {String(t('membership.levels.benefits'))}
                  </h4>
                  <ul className="space-y-1">
                    {level.benefitsKeys.slice(0, 3).map((benefitKey, index) => (
                      <li key={index} className="flex items-start space-x-2 text-xs">
                        <i className="fas fa-check text-honey mt-0.5 flex-shrink-0"></i>
                        <span className="text-muted-foreground">
                          {String(t(benefitKey))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <MobileDivider />

                {/* Action Button */}
                <div className="pt-2">
                  {status === 'owned' ? (
                    <div className="w-full py-2 text-center text-green-500 font-medium text-sm">
                      <i className="fas fa-check mr-2"></i>
                      {String(t('membership.levels.activated'))}
                    </div>
                  ) : status === 'lower' ? (
                    <div className="w-full py-2 text-center text-muted-foreground font-medium text-sm">
                      {String(t('membership.levels.higherLevelOwned'))}
                    </div>
                  ) : (
                    <ClaimMembershipButton
                      walletAddress={walletAddress || ''}
                      level={level.level}
                      onSuccess={handlePurchaseSuccess}
                      disabled={!isSelected || !walletAddress}
                      className="text-sm"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selection Info */}
      {selectedLevel && (
        <Card className="bg-honey/5 border-honey/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {String(t('membership.levels.selectionInfo'))}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}