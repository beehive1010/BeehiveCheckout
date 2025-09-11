-- Advertisement NFTs Data Seeds for Beehive Platform (English with Translation Keys)
-- 广告NFT数据种子 (英文版带翻译键)

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM advertisement_nfts LIMIT 1) THEN
        RAISE NOTICE 'Advertisement NFTs table already has data, skipping insert';
        RETURN;
    END IF;

    INSERT INTO advertisement_nfts (
        title, description, image_url, price_usdt, price_bcc, category, 
        advertiser_wallet, click_url, impressions_target, impressions_current,
        is_active, starts_at, ends_at, metadata
    ) VALUES
    -- DeFi Protocol Advertisements
    (
        'UniSwap V4 - Revolutionary Trading Experience',
        'Experience the future of decentralized trading with UniSwap V4. New features, better liquidity, and lower fees await you.',
        'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
        299.99,
        29999.0,
        'DeFi Protocol',
        NULL,
        'https://uniswap.org',
        100000,
        12543,
        true,
        NOW(),
        NOW() + INTERVAL '30 days',
        '{"campaign_type": "product_launch", "target_audience": "DeFi users", "campaign_goals": ["awareness", "user_acquisition"], "i18n": {"zh": {"title": "UniSwap V4 - 革命性交易体验", "description": "体验去中心化交易的未来，UniSwap V4带来新功能、更好的流动性和更低的费用。", "category": "DeFi协议"}}}'
    ),

    (
        'Compound Finance - Maximize Your Crypto Yields',
        'Earn competitive interest rates on your crypto assets with Compound Protocol. Safe, secure, and transparent DeFi lending.',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
        199.99,
        19999.0,
        'DeFi Protocol',
        NULL,
        'https://compound.finance',
        75000,
        8934,
        true,
        NOW(),
        NOW() + INTERVAL '25 days',
        '{"campaign_type": "yield_promotion", "target_audience": "yield farmers", "apy_highlight": "8.5%", "i18n": {"zh": {"title": "Compound Finance - 最大化您的加密收益", "description": "通过Compound协议在您的加密资产上赚取有竞争力的利率。安全、可靠且透明的DeFi借贷。", "category": "DeFi协议"}}}'
    ),

    -- NFT Marketplace Advertisements
    (
        'OpenSea - Discover, Collect, and Sell NFTs',
        'The world\'s largest NFT marketplace. Discover unique digital assets, collect rare items, and trade with confidence.',
        'https://images.unsplash.com/photo-1640161704729-cbe966a08853?w=800',
        399.99,
        39999.0,
        'NFT Marketplace',
        NULL,
        'https://opensea.io',
        150000,
        23456,
        true,
        NOW(),
        NOW() + INTERVAL '45 days',
        '{"campaign_type": "marketplace_promotion", "target_audience": "NFT collectors", "featured_collections": ["BAYC", "CryptoPunks"], "i18n": {"zh": {"title": "OpenSea - 发现、收集和出售NFT", "description": "世界最大的NFT市场。发现独特的数字资产，收集稀有物品，安全交易。", "category": "NFT市场"}}}'
    ),

    (
        'Foundation - Curated Digital Art Platform',
        'Premium platform for digital artists and collectors. Discover exclusive artwork from emerging and established artists.',
        'https://images.unsplash.com/photo-1640826843966-e1bda632df31?w=800',
        249.99,
        24999.0,
        'NFT Marketplace',
        NULL,
        'https://foundation.app',
        80000,
        15672,
        true,
        NOW(),
        NOW() + INTERVAL '20 days',
        '{"campaign_type": "platform_awareness", "target_audience": "art collectors", "focus": "curated content", "i18n": {"zh": {"title": "Foundation - 精选数字艺术平台", "description": "数字艺术家和收藏家的高端平台。发现新兴和知名艺术家的独家作品。", "category": "NFT市场"}}}'
    ),

    -- Crypto Exchange Advertisements
    (
        'Binance - World\'s Leading Cryptocurrency Exchange',
        'Trade 500+ cryptocurrencies with the world\'s most trusted exchange. Advanced trading tools, low fees, and 24/7 support.',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        499.99,
        49999.0,
        'Crypto Exchange',
        NULL,
        'https://binance.com',
        200000,
        45123,
        true,
        NOW(),
        NOW() + INTERVAL '60 days',
        '{"campaign_type": "user_acquisition", "target_audience": "crypto traders", "promotion": "0% fees for 30 days", "i18n": {"zh": {"title": "币安 - 全球领先的加密货币交易所", "description": "在世界最受信任的交易所交易500+种加密货币。先进的交易工具、低手续费和24/7支持。", "category": "加密交易所"}}}'
    ),

    (
        'Coinbase - Buy, Sell, and Store Crypto Safely',
        'The most trusted platform to buy, sell, and store cryptocurrency. Secure, insured, and user-friendly for beginners.',
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        349.99,
        34999.0,
        'Crypto Exchange',
        NULL,
        'https://coinbase.com',
        120000,
        28905,
        true,
        NOW(),
        NOW() + INTERVAL '35 days',
        '{"campaign_type": "beginner_focused", "target_audience": "crypto newcomers", "security_focus": true, "i18n": {"zh": {"title": "Coinbase - 安全地购买、出售和存储加密货币", "description": "最受信任的加密货币买卖和存储平台。安全、投保且对初学者友好。", "category": "加密交易所"}}}'
    ),

    -- Web3 Infrastructure Advertisements
    (
        'Polygon - Scale Ethereum with Lower Costs',
        'Build and scale your dApps on Polygon. Ethereum-compatible with faster transactions and lower fees.',
        'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        199.99,
        19999.0,
        'Web3 Infrastructure',
        NULL,
        'https://polygon.technology',
        90000,
        16789,
        true,
        NOW(),
        NOW() + INTERVAL '40 days',
        '{"campaign_type": "developer_recruitment", "target_audience": "blockchain developers", "tech_focus": "Layer 2 scaling", "i18n": {"zh": {"title": "Polygon - 以更低成本扩展以太坊", "description": "在Polygon上构建和扩展您的dApp。与以太坊兼容，交易更快，费用更低。", "category": "Web3基础设施"}}}'
    ),

    (
        'IPFS - Distributed Web Storage Solution',
        'Decentralized storage for the distributed web. Store and share data with IPFS - the future of file storage.',
        'https://images.unsplash.com/photo-1558616024-faa1a8f9a3af?w=800',
        149.99,
        14999.0,
        'Web3 Infrastructure',
        NULL,
        'https://ipfs.io',
        60000,
        9234,
        true,
        NOW(),
        NOW() + INTERVAL '30 days',
        '{"campaign_type": "technology_awareness", "target_audience": "developers", "use_cases": ["NFT storage", "dApp hosting"], "i18n": {"zh": {"title": "IPFS - 分布式网络存储解决方案", "description": "去中心化的分布式网络存储。使用IPFS存储和共享数据——文件存储的未来。", "category": "Web3基础设施"}}}'
    ),

    -- Gaming & Metaverse Advertisements
    (
        'Axie Infinity - Play-to-Earn Gaming Revolution',
        'Join millions of players earning real money through gaming. Battle, breed, and trade Axies in this blockchain-based game.',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        299.99,
        29999.0,
        'Gaming & Metaverse',
        NULL,
        'https://axieinfinity.com',
        180000,
        34567,
        true,
        NOW(),
        NOW() + INTERVAL '50 days',
        '{"campaign_type": "game_promotion", "target_audience": "gamers", "earning_potential": "$500-2000/month", "i18n": {"zh": {"title": "Axie Infinity - 边玩边赚游戏革命", "description": "加入数百万通过游戏赚取真金的玩家。在这个基于区块链的游戏中战斗、繁殖和交易Axie。", "category": "游戏与元宇宙"}}}'
    ),

    (
        'Decentraland - Own Your Virtual World',
        'Buy land, build experiences, and monetize your creations in the first fully decentralized virtual world.',
        'https://images.unsplash.com/photo-1633218388467-87139406f70a?w=800',
        399.99,
        39999.0,
        'Gaming & Metaverse',
        NULL,
        'https://decentraland.org',
        100000,
        18901,
        true,
        NOW(),
        NOW() + INTERVAL '45 days',
        '{"campaign_type": "virtual_real_estate", "target_audience": "metaverse investors", "focus": "land ownership", "i18n": {"zh": {"title": "Decentraland - 拥有您的虚拟世界", "description": "在第一个完全去中心化的虚拟世界中购买土地、构建体验并将您的创作变现。", "category": "游戏与元宇宙"}}}'
    ),

    -- DeFi Tools & Analytics
    (
        'DeFiPulse - Track Your DeFi Investments',
        'Stay on top of the DeFi market with real-time analytics, portfolio tracking, and yield farming insights.',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        159.99,
        15999.0,
        'DeFi Tools',
        NULL,
        'https://defipulse.com',
        70000,
        12456,
        true,
        NOW(),
        NOW() + INTERVAL '25 days',
        '{"campaign_type": "tool_promotion", "target_audience": "DeFi investors", "features": ["portfolio tracking", "yield analytics"], "i18n": {"zh": {"title": "DeFiPulse - 跟踪您的DeFi投资", "description": "通过实时分析、投资组合跟踪和流动性挖矿洞察掌握DeFi市场动态。", "category": "DeFi工具"}}}'
    ),

    (
        'Zapper - Manage DeFi Like a Pro',
        'One dashboard to track, manage, and deploy capital across DeFi protocols. Save time and maximize returns.',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
        129.99,
        12999.0,
        'DeFi Tools',
        NULL,
        'https://zapper.fi',
        55000,
        8934,
        true,
        NOW(),
        NOW() + INTERVAL '20 days',
        '{"campaign_type": "productivity_tool", "target_audience": "DeFi power users", "value_prop": "all-in-one dashboard", "i18n": {"zh": {"title": "Zapper - 像专业人士一样管理DeFi", "description": "一个仪表板跟踪、管理和部署资本到DeFi协议。节省时间，最大化回报。", "category": "DeFi工具"}}}'
    ),

    -- Educational Platform Advertisements
    (
        'CryptoZombies - Learn Blockchain Development',
        'Interactive code school that teaches you to write smart contracts through building your own crypto-collectible game.',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        99.99,
        9999.0,
        'Education',
        NULL,
        'https://cryptozombies.io',
        85000,
        15432,
        true,
        NOW(),
        NOW() + INTERVAL '60 days',
        '{"campaign_type": "education_platform", "target_audience": "developer students", "learning_method": "gamified coding", "i18n": {"zh": {"title": "CryptoZombies - 学习区块链开发", "description": "通过构建自己的加密收藏品游戏来学习编写智能合约的互动代码学校。", "category": "教育"}}}'
    ),

    (
        'Moralis Academy - Master Web3 Development',
        'Comprehensive courses on blockchain development, DeFi, NFTs, and Web3. Learn from industry experts.',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
        199.99,
        19999.0,
        'Education',
        NULL,
        'https://moralis.io/academy',
        65000,
        11234,
        true,
        NOW(),
        NOW() + INTERVAL '40 days',
        '{"campaign_type": "course_promotion", "target_audience": "aspiring developers", "certification": true, "i18n": {"zh": {"title": "Moralis Academy - 精通Web3开发", "description": "区块链开发、DeFi、NFT和Web3的综合课程。向行业专家学习。", "category": "教育"}}}'
    ),

    -- Hardware Wallet Advertisements  
    (
        'Ledger - Secure Your Crypto Assets',
        'The most trusted hardware wallet for storing Bitcoin, Ethereum, and 1000+ other cryptocurrencies safely offline.',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        79.99,
        7999.0,
        'Hardware Wallet',
        NULL,
        'https://ledger.com',
        120000,
        22567,
        true,
        NOW(),
        NOW() + INTERVAL '90 days',
        '{"campaign_type": "security_focused", "target_audience": "crypto holders", "security_features": ["offline storage", "secure element"], "i18n": {"zh": {"title": "Ledger - 保护您的加密资产", "description": "最受信任的硬件钱包，离线安全存储比特币、以太坊和1000+其他加密货币。", "category": "硬件钱包"}}}'
    );

    RAISE NOTICE 'Successfully inserted % advertisement NFTs', (SELECT COUNT(*) FROM advertisement_nfts);

END $$;