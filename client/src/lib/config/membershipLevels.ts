export interface MembershipLevel {
  level: number;
  slug: string;
  i18nKey: string;
  priceUSDT: number; // Total price (NFT price + platform fee)
  nftPriceUSDT: number; // NFT price portion (what sponsor receives as reward)
  platformFeeUSDT: number; // Platform fee portion
  badgeTheme: string;
  benefitsKeys: string[];
  titleEn: string;
  titleZh: string;
}

export const membershipLevels: MembershipLevel[] = [
  {
    level: 1,
    slug: 'warrior',
    i18nKey: 'membership.level.1',
    priceUSDT: 130, // Total price ($100 NFT + $30 platform fee)
    nftPriceUSDT: 100, // NFT price portion (sponsor reward)
    platformFeeUSDT: 30, // Platform fee for Level 1
    badgeTheme: 'bronze',
    benefitsKeys: ['membership.benefits.l1.basic', 'membership.benefits.l1.education', 'membership.benefits.l1.rewards'],
    titleEn: 'Warrior',
    titleZh: '勇士'
  },
  {
    level: 2,
    slug: 'bronze',
    i18nKey: 'membership.level.2',
    priceUSDT: 150, // Total price
    nftPriceUSDT: 150, // NFT price portion (sponsor reward)
    platformFeeUSDT: 0, // No platform fee for Level 2+
    badgeTheme: 'bronze-plus',
    benefitsKeys: ['membership.benefits.l2.enhanced', 'membership.benefits.l2.bonus', 'membership.benefits.l2.network'],
    titleEn: 'Bronze',
    titleZh: '青铜'
  },
  {
    level: 3,
    slug: 'silver',
    i18nKey: 'membership.level.3',
    priceUSDT: 200,
    nftPriceUSDT: 200,
    platformFeeUSDT: 0,
    badgeTheme: 'silver',
    benefitsKeys: ['membership.benefits.l3.advanced', 'membership.benefits.l3.exclusive', 'membership.benefits.l3.priority'],
    titleEn: 'Silver',
    titleZh: '白银'
  },
  {
    level: 4,
    slug: 'gold',
    i18nKey: 'membership.level.4',
    priceUSDT: 250,
    nftPriceUSDT: 250,
    platformFeeUSDT: 0,
    badgeTheme: 'gold',
    benefitsKeys: ['membership.benefits.l4.premium', 'membership.benefits.l4.mentorship', 'membership.benefits.l4.tools'],
    titleEn: 'Gold',
    titleZh: '黄金'
  },
  {
    level: 5,
    slug: 'elite',
    i18nKey: 'membership.level.5',
    priceUSDT: 300,
    nftPriceUSDT: 300,
    platformFeeUSDT: 0,
    badgeTheme: 'gold-plus',
    benefitsKeys: ['membership.benefits.l5.elite', 'membership.benefits.l5.leadership', 'membership.benefits.l5.insights'],
    titleEn: 'Elite',
    titleZh: '精英'
  },
  {
    level: 6,
    slug: 'platinum',
    i18nKey: 'membership.level.6',
    priceUSDT: 350,
    nftPriceUSDT: 350,
    platformFeeUSDT: 0,
    badgeTheme: 'platinum',
    benefitsKeys: ['membership.benefits.l6.mastery', 'membership.benefits.l6.networking', 'membership.benefits.l6.rewards'],
    titleEn: 'Platinum',
    titleZh: '铂金'
  },
  {
    level: 7,
    slug: 'master',
    i18nKey: 'membership.level.7',
    priceUSDT: 400,
    nftPriceUSDT: 400,
    platformFeeUSDT: 0,
    badgeTheme: 'platinum-plus',
    benefitsKeys: ['membership.benefits.l7.expert', 'membership.benefits.l7.community', 'membership.benefits.l7.alpha'],
    titleEn: 'Master',
    titleZh: '大师'
  },
  {
    level: 8,
    slug: 'diamond',
    i18nKey: 'membership.level.8',
    priceUSDT: 450,
    nftPriceUSDT: 450,
    platformFeeUSDT: 0,
    badgeTheme: 'diamond',
    benefitsKeys: ['membership.benefits.l8.legendary', 'membership.benefits.l8.influence', 'membership.benefits.l8.opportunities'],
    titleEn: 'Diamond',
    titleZh: '钻石'
  },
  {
    level: 9,
    slug: 'grandmaster',
    i18nKey: 'membership.level.9',
    priceUSDT: 500,
    nftPriceUSDT: 500,
    platformFeeUSDT: 0,
    badgeTheme: 'diamond-plus',
    benefitsKeys: ['membership.benefits.l9.mastery', 'membership.benefits.l9.inner_circle', 'membership.benefits.l9.exclusive'],
    titleEn: 'Grandmaster',
    titleZh: '宗师'
  },
  {
    level: 10,
    slug: 'star-shine',
    i18nKey: 'membership.level.10',
    priceUSDT: 550,
    nftPriceUSDT: 550,
    platformFeeUSDT: 0,
    badgeTheme: 'cosmic',
    benefitsKeys: ['membership.benefits.l10.grandmaster', 'membership.benefits.l10.authority', 'membership.benefits.l10.legacy'],
    titleEn: 'Star Shine',
    titleZh: '星耀'
  },
  {
    level: 11,
    slug: 'epic',
    i18nKey: 'membership.level.11',
    priceUSDT: 600,
    nftPriceUSDT: 600,
    platformFeeUSDT: 0,
    badgeTheme: 'cosmic-plus',
    benefitsKeys: ['membership.benefits.l11.wisdom', 'membership.benefits.l11.cosmic', 'membership.benefits.l11.transcendent'],
    titleEn: 'Epic',
    titleZh: '史诗'
  },
  {
    level: 12,
    slug: 'hall',
    i18nKey: 'membership.level.12',
    priceUSDT: 650,
    nftPriceUSDT: 650,
    platformFeeUSDT: 0,
    badgeTheme: 'ethereal',
    benefitsKeys: ['membership.benefits.l12.oracle', 'membership.benefits.l12.foresight', 'membership.benefits.l12.divine'],
    titleEn: 'Hall',
    titleZh: '殿堂'
  },
  {
    level: 13,
    slug: 'strongest-king',
    i18nKey: 'membership.level.13',
    priceUSDT: 700,
    nftPriceUSDT: 700,
    platformFeeUSDT: 0,
    badgeTheme: 'ethereal-plus',
    benefitsKeys: ['membership.benefits.l13.immortal', 'membership.benefits.l13.eternal', 'membership.benefits.l13.infinite'],
    titleEn: 'The Strongest King',
    titleZh: '最強王者'
  },
  {
    level: 14,
    slug: 'king-of-kings',
    i18nKey: 'membership.level.14',
    priceUSDT: 750,
    nftPriceUSDT: 750,
    platformFeeUSDT: 0,
    badgeTheme: 'divine',
    benefitsKeys: ['membership.benefits.l14.celestial', 'membership.benefits.l14.heavenly', 'membership.benefits.l14.ascended'],
    titleEn: 'The King of Kings',
    titleZh: '无双王者'
  },
  {
    level: 15,
    slug: 'glory-king',
    i18nKey: 'membership.level.15',
    priceUSDT: 800,
    nftPriceUSDT: 800,
    platformFeeUSDT: 0,
    badgeTheme: 'divine-plus',
    benefitsKeys: ['membership.benefits.l15.divine', 'membership.benefits.l15.godlike', 'membership.benefits.l15.ultimate'],
    titleEn: 'Glory King',
    titleZh: '荣耀王者'
  },
  {
    level: 16,
    slug: 'legendary-overlord',
    i18nKey: 'membership.level.16',
    priceUSDT: 850,
    nftPriceUSDT: 850,
    platformFeeUSDT: 0,
    badgeTheme: 'transcendent',
    benefitsKeys: ['membership.benefits.l16.supreme', 'membership.benefits.l16.omnipotent', 'membership.benefits.l16.sovereign'],
    titleEn: 'Legendary Overlord',
    titleZh: '传奇主宰'
  },
  {
    level: 17,
    slug: 'supreme-lord',
    i18nKey: 'membership.level.17',
    priceUSDT: 900,
    nftPriceUSDT: 900,
    platformFeeUSDT: 0,
    badgeTheme: 'transcendent-plus',
    benefitsKeys: ['membership.benefits.l17.transcendent', 'membership.benefits.l17.beyond', 'membership.benefits.l17.unlimited'],
    titleEn: 'Supreme Lord',
    titleZh: '至尊主宰'
  },
  {
    level: 18,
    slug: 'supreme-myth',
    i18nKey: 'membership.level.18',
    priceUSDT: 950,
    nftPriceUSDT: 950,
    platformFeeUSDT: 0,
    badgeTheme: 'mythical',
    benefitsKeys: ['membership.benefits.l18.absolute', 'membership.benefits.l18.perfection', 'membership.benefits.l18.apex'],
    titleEn: 'Supreme Myth',
    titleZh: '至尊神话'
  },
  {
    level: 19,
    slug: 'mythical-peak',
    i18nKey: 'membership.level.19',
    priceUSDT: 1000,
    nftPriceUSDT: 1000,
    platformFeeUSDT: 0,
    badgeTheme: 'mythical-peak',
    benefitsKeys: ['membership.benefits.l19.mythical', 'membership.benefits.l19.peak', 'membership.benefits.l19.legendary'],
    titleEn: 'Mythical Peak',
    titleZh: '神话巅峰'
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