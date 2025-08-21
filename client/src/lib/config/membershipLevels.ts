export interface MembershipLevel {
  level: number;
  slug: string;
  i18nKey: string;
  priceUSDT: number;
  badgeTheme: string;
  benefitsKeys: string[];
}

export const membershipLevels: MembershipLevel[] = [
  {
    level: 1,
    slug: 'warrior',
    i18nKey: 'membership.level.1',
    priceUSDT: 130,
    badgeTheme: 'bronze',
    benefitsKeys: ['membership.benefits.l1.basic', 'membership.benefits.l1.education', 'membership.benefits.l1.rewards']
  },
  {
    level: 2,
    slug: 'knight',
    i18nKey: 'membership.level.2',
    priceUSDT: 150,
    badgeTheme: 'bronze-plus',
    benefitsKeys: ['membership.benefits.l2.enhanced', 'membership.benefits.l2.bonus', 'membership.benefits.l2.network']
  },
  {
    level: 3,
    slug: 'guardian',
    i18nKey: 'membership.level.3',
    priceUSDT: 200,
    badgeTheme: 'silver',
    benefitsKeys: ['membership.benefits.l3.advanced', 'membership.benefits.l3.exclusive', 'membership.benefits.l3.priority']
  },
  {
    level: 4,
    slug: 'protector',
    i18nKey: 'membership.level.4',
    priceUSDT: 250,
    badgeTheme: 'silver-plus',
    benefitsKeys: ['membership.benefits.l4.premium', 'membership.benefits.l4.mentorship', 'membership.benefits.l4.tools']
  },
  {
    level: 5,
    slug: 'defender',
    i18nKey: 'membership.level.5',
    priceUSDT: 300,
    badgeTheme: 'gold',
    benefitsKeys: ['membership.benefits.l5.elite', 'membership.benefits.l5.leadership', 'membership.benefits.l5.insights']
  },
  {
    level: 6,
    slug: 'champion',
    i18nKey: 'membership.level.6',
    priceUSDT: 350,
    badgeTheme: 'gold-plus',
    benefitsKeys: ['membership.benefits.l6.mastery', 'membership.benefits.l6.networking', 'membership.benefits.l6.rewards']
  },
  {
    level: 7,
    slug: 'hero',
    i18nKey: 'membership.level.7',
    priceUSDT: 400,
    badgeTheme: 'platinum',
    benefitsKeys: ['membership.benefits.l7.expert', 'membership.benefits.l7.community', 'membership.benefits.l7.alpha']
  },
  {
    level: 8,
    slug: 'legend',
    i18nKey: 'membership.level.8',
    priceUSDT: 450,
    badgeTheme: 'platinum-plus',
    benefitsKeys: ['membership.benefits.l8.legendary', 'membership.benefits.l8.influence', 'membership.benefits.l8.opportunities']
  },
  {
    level: 9,
    slug: 'master',
    i18nKey: 'membership.level.9',
    priceUSDT: 500,
    badgeTheme: 'diamond',
    benefitsKeys: ['membership.benefits.l9.mastery', 'membership.benefits.l9.inner_circle', 'membership.benefits.l9.exclusive']
  },
  {
    level: 10,
    slug: 'grandmaster',
    i18nKey: 'membership.level.10',
    priceUSDT: 550,
    badgeTheme: 'diamond-plus',
    benefitsKeys: ['membership.benefits.l10.grandmaster', 'membership.benefits.l10.authority', 'membership.benefits.l10.legacy']
  },
  {
    level: 11,
    slug: 'sage',
    i18nKey: 'membership.level.11',
    priceUSDT: 600,
    badgeTheme: 'cosmic',
    benefitsKeys: ['membership.benefits.l11.wisdom', 'membership.benefits.l11.cosmic', 'membership.benefits.l11.transcendent']
  },
  {
    level: 12,
    slug: 'oracle',
    i18nKey: 'membership.level.12',
    priceUSDT: 650,
    badgeTheme: 'cosmic-plus',
    benefitsKeys: ['membership.benefits.l12.oracle', 'membership.benefits.l12.foresight', 'membership.benefits.l12.divine']
  },
  {
    level: 13,
    slug: 'immortal',
    i18nKey: 'membership.level.13',
    priceUSDT: 700,
    badgeTheme: 'ethereal',
    benefitsKeys: ['membership.benefits.l13.immortal', 'membership.benefits.l13.eternal', 'membership.benefits.l13.infinite']
  },
  {
    level: 14,
    slug: 'celestial',
    i18nKey: 'membership.level.14',
    priceUSDT: 750,
    badgeTheme: 'ethereal-plus',
    benefitsKeys: ['membership.benefits.l14.celestial', 'membership.benefits.l14.heavenly', 'membership.benefits.l14.ascended']
  },
  {
    level: 15,
    slug: 'divine',
    i18nKey: 'membership.level.15',
    priceUSDT: 800,
    badgeTheme: 'divine',
    benefitsKeys: ['membership.benefits.l15.divine', 'membership.benefits.l15.godlike', 'membership.benefits.l15.ultimate']
  },
  {
    level: 16,
    slug: 'supreme',
    i18nKey: 'membership.level.16',
    priceUSDT: 850,
    badgeTheme: 'divine-plus',
    benefitsKeys: ['membership.benefits.l16.supreme', 'membership.benefits.l16.omnipotent', 'membership.benefits.l16.sovereign']
  },
  {
    level: 17,
    slug: 'transcendent',
    i18nKey: 'membership.level.17',
    priceUSDT: 900,
    badgeTheme: 'transcendent',
    benefitsKeys: ['membership.benefits.l17.transcendent', 'membership.benefits.l17.beyond', 'membership.benefits.l17.unlimited']
  },
  {
    level: 18,
    slug: 'absolute',
    i18nKey: 'membership.level.18',
    priceUSDT: 950,
    badgeTheme: 'transcendent-plus',
    benefitsKeys: ['membership.benefits.l18.absolute', 'membership.benefits.l18.perfection', 'membership.benefits.l18.apex']
  },
  {
    level: 19,
    slug: 'mythical-peak',
    i18nKey: 'membership.level.19',
    priceUSDT: 1000,
    badgeTheme: 'mythical',
    benefitsKeys: ['membership.benefits.l19.mythical', 'membership.benefits.l19.peak', 'membership.benefits.l19.legendary']
  }
];

export const getMembershipLevel = (level: number): MembershipLevel | undefined => {
  return membershipLevels.find(l => l.level === level);
};

export const getMembershipLevelBySlug = (slug: string): MembershipLevel | undefined => {
  return membershipLevels.find(l => l.slug === slug);
};

export const getMaxLevel = (): number => {
  return Math.max(...membershipLevels.map(l => l.level));
};

export const validateLevel = (level: number): boolean => {
  return level >= 1 && level <= 19 && membershipLevels.some(l => l.level === level);
};