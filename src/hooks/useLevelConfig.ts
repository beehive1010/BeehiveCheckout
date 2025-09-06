import { useQuery } from '@tanstack/react-query';
import { configApi, type LevelConfiguration, type DiscoverPartner } from '../api/config.api';

// Hook to get all level configurations
export const useLevelConfigurations = () => {
  return useQuery({
    queryKey: ['levelConfigurations'],
    queryFn: configApi.getAllLevelConfigurations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get specific level configuration
export const useLevelConfiguration = (level: number) => {
  return useQuery({
    queryKey: ['levelConfiguration', level],
    queryFn: () => configApi.getLevelConfiguration(level),
    enabled: level >= 1 && level <= 19,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get discover partners
export const useDiscoverPartners = () => {
  return useQuery({
    queryKey: ['discoverPartners'],
    queryFn: configApi.getDiscoverPartners,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Helper function to convert database level config to legacy format
export const convertToLegacyMembershipLevel = (levelConfig: LevelConfiguration) => {
  return {
    level: levelConfig.level,
    slug: getLevelSlug(levelConfig.level),
    i18nKey: `membership.level.${levelConfig.level}`,
    priceUSDT: levelConfig.priceUSDT, // Total price
    nftPriceUSDT: levelConfig.rewardUSDT, // What goes to referrer
    platformFeeUSDT: levelConfig.activationFeeUSDT, // Platform fee
    badgeTheme: getBadgeTheme(levelConfig.level),
    benefitsKeys: getBenefitsKeys(levelConfig.level),
    titleEn: levelConfig.levelName,
    titleZh: levelConfig.levelName, // TODO: Add Chinese translations to database
  };
};

// Helper functions for legacy compatibility
const getLevelSlug = (level: number): string => {
  const slugs = [
    'warrior', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 
    'grandmaster', 'legend', 'mythic', 'ascendant', 'transcendent', 'omniscient',
    'supreme', 'cosmic', 'eternal', 'infinite', 'ultimate', 'apex'
  ];
  return slugs[level - 1] || `level-${level}`;
};

const getBadgeTheme = (level: number): string => {
  if (level <= 3) return 'bronze';
  if (level <= 6) return 'silver';
  if (level <= 9) return 'gold';
  if (level <= 12) return 'platinum';
  if (level <= 15) return 'diamond';
  return 'mythic';
};

const getBenefitsKeys = (level: number): string[] => {
  const baseBenefits = [`membership.benefits.l${level}.basic`, `membership.benefits.l${level}.education`];
  if (level >= 2) baseBenefits.push(`membership.benefits.l${level}.rewards`);
  if (level >= 5) baseBenefits.push(`membership.benefits.l${level}.premium`);
  return baseBenefits;
};