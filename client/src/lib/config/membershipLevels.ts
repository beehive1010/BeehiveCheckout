export interface MembershipLevel {
  level: number;
  slug: string;
  i18nKey: string;
  priceUSDT: number;
  badgeTheme: string;
  benefitsKeys: string[];
  titleEn: string;
  titleZh: string;
  rewardAmount: number;
}

export const membershipLevels: MembershipLevel[] = [
  {
    level: 1,
    slug: 'warrior',
    i18nKey: 'membership.level.1',
    priceUSDT: 130,
    badgeTheme: 'bronze',
    benefitsKeys: ['membership.benefits.l1.basic', 'membership.benefits.l1.education', 'membership.benefits.l1.rewards'],
    titleEn: 'Warrior',
    titleZh: '勇士',
    rewardAmount: 100
  },
  {
    level: 2,
    slug: 'bronze',
    i18nKey: 'membership.level.2',
    priceUSDT: 150,
    badgeTheme: 'bronze-plus',
    benefitsKeys: ['membership.benefits.l2.enhanced', 'membership.benefits.l2.bonus', 'membership.benefits.l2.network'],
    titleEn: 'Bronze',
    titleZh: '青铜',
    rewardAmount: 150
  },
  {
    level: 3,
    slug: 'silver',
    i18nKey: 'membership.level.3',
    priceUSDT: 200,
    badgeTheme: 'silver',
    benefitsKeys: ['membership.benefits.l3.advanced', 'membership.benefits.l3.exclusive', 'membership.benefits.l3.priority'],
    titleEn: 'Silver',
    titleZh: '白银',
    rewardAmount: 200
  },
  {
    level: 4,
    slug: 'gold',
    i18nKey: 'membership.level.4',
    priceUSDT: 250,
    badgeTheme: 'gold',
    benefitsKeys: ['membership.benefits.l4.premium', 'membership.benefits.l4.mentorship', 'membership.benefits.l4.tools'],
    titleEn: 'Gold',
    titleZh: '黄金',
    rewardAmount: 250
  },
  {
    level: 5,
    slug: 'elite',
    i18nKey: 'membership.level.5',
    priceUSDT: 300,
    badgeTheme: 'gold-plus',
    benefitsKeys: ['membership.benefits.l5.elite', 'membership.benefits.l5.leadership', 'membership.benefits.l5.insights'],
    titleEn: 'Elite',
    titleZh: '精英',
    rewardAmount: 300
  },
  {
    level: 6,
    slug: 'platinum',
    i18nKey: 'membership.level.6',
    priceUSDT: 350,
    badgeTheme: 'platinum',
    benefitsKeys: ['membership.benefits.l6.mastery', 'membership.benefits.l6.networking', 'membership.benefits.l6.rewards'],
    titleEn: 'Platinum',
    titleZh: '铂金',
    rewardAmount: 350
  },
  {
    level: 7,
    slug: 'master',
    i18nKey: 'membership.level.7',
    priceUSDT: 400,
    badgeTheme: 'platinum-plus',
    benefitsKeys: ['membership.benefits.l7.expert', 'membership.benefits.l7.community', 'membership.benefits.l7.alpha'],
    titleEn: 'Master',
    titleZh: '大师',
    rewardAmount: 400
  },
  {
    level: 8,
    slug: 'diamond',
    i18nKey: 'membership.level.8',
    priceUSDT: 450,
    badgeTheme: 'diamond',
    benefitsKeys: ['membership.benefits.l8.legendary', 'membership.benefits.l8.influence', 'membership.benefits.l8.opportunities'],
    titleEn: 'Diamond',
    titleZh: '钻石',
    rewardAmount: 450
  },
  {
    level: 9,
    slug: 'grandmaster',
    i18nKey: 'membership.level.9',
    priceUSDT: 500,
    badgeTheme: 'diamond-plus',
    benefitsKeys: ['membership.benefits.l9.mastery', 'membership.benefits.l9.inner_circle', 'membership.benefits.l9.exclusive'],
    titleEn: 'Grandmaster',
    titleZh: '宗师',
    rewardAmount: 500
  },
  {
    level: 10,
    slug: 'star-shine',
    i18nKey: 'membership.level.10',
    priceUSDT: 550,
    badgeTheme: 'cosmic',
    benefitsKeys: ['membership.benefits.l10.grandmaster', 'membership.benefits.l10.authority', 'membership.benefits.l10.legacy'],
    titleEn: 'Star Shine',
    titleZh: '星耀',
    rewardAmount: 550
  },
  {
    level: 11,
    slug: 'epic',
    i18nKey: 'membership.level.11',
    priceUSDT: 600,
    badgeTheme: 'cosmic-plus',
    benefitsKeys: ['membership.benefits.l11.wisdom', 'membership.benefits.l11.cosmic', 'membership.benefits.l11.transcendent'],
    titleEn: 'Epic',
    titleZh: '史诗',
    rewardAmount: 600
  },
  {
    level: 12,
    slug: 'hall',
    i18nKey: 'membership.level.12',
    priceUSDT: 650,
    badgeTheme: 'ethereal',
    benefitsKeys: ['membership.benefits.l12.oracle', 'membership.benefits.l12.foresight', 'membership.benefits.l12.divine'],
    titleEn: 'Hall',
    titleZh: '殿堂',
    rewardAmount: 650
  },
  {
    level: 13,
    slug: 'strongest-king',
    i18nKey: 'membership.level.13',
    priceUSDT: 700,
    badgeTheme: 'ethereal-plus',
    benefitsKeys: ['membership.benefits.l13.immortal', 'membership.benefits.l13.eternal', 'membership.benefits.l13.infinite'],
    titleEn: 'The Strongest King',
    titleZh: '最強王者',
    rewardAmount: 700
  },
  {
    level: 14,
    slug: 'king-of-kings',
    i18nKey: 'membership.level.14',
    priceUSDT: 750,
    badgeTheme: 'divine',
    benefitsKeys: ['membership.benefits.l14.celestial', 'membership.benefits.l14.heavenly', 'membership.benefits.l14.ascended'],
    titleEn: 'The King of Kings',
    titleZh: '无双王者',
    rewardAmount: 750
  },
  {
    level: 15,
    slug: 'glory-king',
    i18nKey: 'membership.level.15',
    priceUSDT: 800,
    badgeTheme: 'divine-plus',
    benefitsKeys: ['membership.benefits.l15.divine', 'membership.benefits.l15.godlike', 'membership.benefits.l15.ultimate'],
    titleEn: 'Glory King',
    titleZh: '荣耀王者',
    rewardAmount: 800
  },
  {
    level: 16,
    slug: 'legendary-overlord',
    i18nKey: 'membership.level.16',
    priceUSDT: 850,
    badgeTheme: 'transcendent',
    benefitsKeys: ['membership.benefits.l16.supreme', 'membership.benefits.l16.omnipotent', 'membership.benefits.l16.sovereign'],
    titleEn: 'Legendary Overlord',
    titleZh: '传奇主宰',
    rewardAmount: 850
  },
  {
    level: 17,
    slug: 'supreme-lord',
    i18nKey: 'membership.level.17',
    priceUSDT: 900,
    badgeTheme: 'transcendent-plus',
    benefitsKeys: ['membership.benefits.l17.transcendent', 'membership.benefits.l17.beyond', 'membership.benefits.l17.unlimited'],
    titleEn: 'Supreme Lord',
    titleZh: '至尊主宰',
    rewardAmount: 900
  },
  {
    level: 18,
    slug: 'supreme-myth',
    i18nKey: 'membership.level.18',
    priceUSDT: 950,
    badgeTheme: 'mythical',
    benefitsKeys: ['membership.benefits.l18.absolute', 'membership.benefits.l18.perfection', 'membership.benefits.l18.apex'],
    titleEn: 'Supreme Myth',
    titleZh: '至尊神话',
    rewardAmount: 950
  },
  {
    level: 19,
    slug: 'mythical-peak',
    i18nKey: 'membership.level.19',
    priceUSDT: 1000,
    badgeTheme: 'mythical-peak',
    benefitsKeys: ['membership.benefits.l19.mythical', 'membership.benefits.l19.peak', 'membership.benefits.l19.legendary'],
    titleEn: 'Mythical Peak',
    titleZh: '神话巅峰',
    rewardAmount: 1000
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