// 导入数据库服务
import { getMembershipLevelsFromDB, getMembershipLevelFromDB, formatPriceWithCurrency } from '../services/membershipPricing';

export interface MembershipLevel {
  level: number;
  slug: string;
  i18nKey: string;
  priceUSDT: number; // Total price (NFT price + platform fee) - fallback value
  nftPriceUSDT: number; // NFT price portion (what sponsor receives as reward) - fallback value
  platformFeeUSDT: number; // Platform fee portion - fallback value
  badgeTheme: string;
  benefitsKeys: string[];
  titleEn: string;
  titleZh: string;
  // 添加动态价格字段
  dynamicPriceUSDT?: number; // 从数据库获取的实际价格
  bccRelease?: number; // 从数据库获取的BCC释放数量
  unlockLayer?: number; // 从数据库获取的解锁层级
}

export const membershipLevels: MembershipLevel[] = [
  {
    level: 1,
    slug: 'warrior',
    i18nKey: 'membership.level.1',
    priceUSDT: 13000, // Total price ($130.00 in cents)
    nftPriceUSDT: 10000, // NFT price portion ($100.00 in cents)
    platformFeeUSDT: 3000, // Platform fee ($30.00 in cents)
    badgeTheme: 'bronze',
    benefitsKeys: ['membership.benefits.l1.basic', 'membership.benefits.l1.education', 'membership.benefits.l1.rewards'],
    titleEn: 'Warrior',
    titleZh: '勇士'
  },
  {
    level: 2,
    slug: 'bronze',
    i18nKey: 'membership.level.2',
    priceUSDT: 15000, // Total price ($150.00 in cents)
    nftPriceUSDT: 15000, // NFT price portion ($150.00 in cents)
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
    priceUSDT: 20000, // Total price ($200.00 in cents)
    nftPriceUSDT: 20000, // NFT price portion ($200.00 in cents)
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
    priceUSDT: 25000, // Total price ($250.00 in cents)
    nftPriceUSDT: 25000, // NFT price portion ($250.00 in cents)
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
    priceUSDT: 30000, // Total price ($300.00 in cents)
    nftPriceUSDT: 30000, // NFT price portion ($300.00 in cents)
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
    priceUSDT: 35000, // Total price ($350.00 in cents)
    nftPriceUSDT: 35000, // NFT price portion ($350.00 in cents)
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
    priceUSDT: 40000, // Total price ($400.00 in cents)
    nftPriceUSDT: 40000, // NFT price portion ($400.00 in cents),
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
    priceUSDT: 45000, // Total price ($450.00 in cents)
    nftPriceUSDT: 45000, // NFT price portion ($450.00 in cents)
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
    priceUSDT: 50000, // Total price ($500.00 in cents)
    nftPriceUSDT: 50000, // NFT price portion ($500.00 in cents)
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
    priceUSDT: 55000, // Total price ($550.00 in cents)
    nftPriceUSDT: 55000, // NFT price portion ($550.00 in cents)
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
    priceUSDT: 60000, // Total price ($600.00 in cents)
    nftPriceUSDT: 60000, // NFT price portion ($600.00 in cents)
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
    priceUSDT: 65000, // Total price ($650.00 in cents)
    nftPriceUSDT: 65000, // NFT price portion ($650.00 in cents)
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
    priceUSDT: 70000, // Total price ($700.00 in cents)
    nftPriceUSDT: 70000, // NFT price portion ($700.00 in cents)
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
    priceUSDT: 75000, // Total price ($750.00 in cents)
    nftPriceUSDT: 75000, // NFT price portion ($750.00 in cents)
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
    priceUSDT: 80000, // Total price ($800.00 in cents)
    nftPriceUSDT: 80000, // NFT price portion ($800.00 in cents)
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
    priceUSDT: 85000, // Total price ($850.00 in cents)
    nftPriceUSDT: 85000, // NFT price portion ($850.00 in cents)
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
    priceUSDT: 90000, // Total price ($900.00 in cents)
    nftPriceUSDT: 90000, // NFT price portion ($900.00 in cents)
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
    priceUSDT: 95000, // Total price ($950.00 in cents)
    nftPriceUSDT: 95000, // NFT price portion ($950.00 in cents)
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
    priceUSDT: 100000, // Total price ($1000.00 in cents)
    nftPriceUSDT: 100000, // NFT price portion ($1000.00 in cents)
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

/**
 * 获取带有数据库价格的会员级别列表
 */
export async function getMembershipLevelsWithDynamicPricing(): Promise<MembershipLevel[]> {
  try {
    console.log('🔄 Loading membership levels with dynamic pricing from database...');
    
    const dbLevels = await getMembershipLevelsFromDB();
    const dbLevelMap = new Map(dbLevels.map(level => [level.level, level]));
    
    const levelsWithDynamicPricing = membershipLevels.map(level => {
      const dbLevel = dbLevelMap.get(level.level);
      if (dbLevel) {
        return {
          ...level,
          dynamicPriceUSDT: dbLevel.price_usdc, // 价格以分为单位存储
          bccRelease: dbLevel.bcc_release,
          unlockLayer: dbLevel.unlock_layer
        };
      }
      return level; // 如果数据库中没有，使用硬编码价格
    });
    
    console.log('✅ Loaded membership levels with dynamic pricing:', levelsWithDynamicPricing);
    return levelsWithDynamicPricing;
  } catch (error) {
    console.error('❌ Failed to load dynamic pricing, using fallback prices:', error);
    return membershipLevels; // 失败时返回硬编码价格
  }
}

/**
 * 获取特定级别的实际价格 (优先使用数据库价格)
 */
export async function getMembershipPrice(level: number): Promise<number> {
  try {
    const dbLevel = await getMembershipLevelFromDB(level);
    if (dbLevel) {
      return dbLevel.price_usdc;
    }
    
    // 回退到硬编码价格
    const fallbackLevel = getMembershipLevel(level);
    return fallbackLevel?.priceUSDT || 0;
  } catch (error) {
    console.error(`❌ Failed to get price for level ${level}:`, error);
    const fallbackLevel = getMembershipLevel(level);
    return fallbackLevel?.priceUSDT || 0;
  }
}

/**
 * 获取格式化的会员价格显示
 */
export async function getFormattedMembershipPrice(level: number): Promise<string> {
  const price = await getMembershipPrice(level);
  return formatPriceWithCurrency(price);
}