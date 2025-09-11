-- Merchant NFTs Data Seeds for Beehive Platform (English with Translation Keys)
-- 商户NFT数据种子 (英文版带翻译键)

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM merchant_nfts LIMIT 1) THEN
        RAISE NOTICE 'Merchant NFTs table already has data, skipping insert';
        RETURN;
    END IF;

    INSERT INTO merchant_nfts (
        title, description, image_url, price_usdt, price_bcc, category, 
        supply_total, supply_available, is_active, creator_wallet, metadata
    ) VALUES
    -- Digital Art Category
    (
        'Beehive Ecosystem - Limited Edition Digital Art',
        'Exclusive digital artwork created by renowned artists, showcasing the infinite possibilities of the Web3 world. Each NFT is a unique artistic masterpiece.',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        199.99,
        19999.0,
        'Digital Art',
        100,
        85,
        true,
        NULL,
        '{"artist": "CryptoArt Studio", "edition": "Limited Edition", "rarity": "rare", "attributes": {"background": "galaxy", "style": "futuristic"}, "i18n": {"zh": {"title": "蜂巢生态系统 - 限量版数字艺术", "description": "由知名数字艺术家创作的蜂巢生态主题艺术品，展现了Web3世界的无限可能。每个NFT都是独一无二的艺术杰作。", "category": "数字艺术"}}}'
    ),

    (
        'Blockchain City Landscape Series',
        'Futuristic blockchain cityscapes, each representing different DeFi protocols and Web3 projects. Extremely high collectible value.',
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800',
        299.99,
        29999.0,
        'Digital Art',
        50,
        32,
        true,
        NULL,
        '{"artist": "MetaVerse Designer", "edition": "Deluxe Edition", "rarity": "epic", "attributes": {"theme": "cyberpunk", "elements": "neon lights"}, "i18n": {"zh": {"title": "区块链城市景观系列", "description": "未来主义风格的区块链城市景观，每一幅都代表着不同的DeFi协议和Web3项目。收藏价值极高。", "category": "数字艺术"}}}'
    ),

    -- Gaming Items Category
    (
        'Legendary Weapon: Ethereum Sword',
        'Legendary weapon NFT from Web3 RPG games with powerful attack and special skills. Usable across multiple games.',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
        89.99,
        8999.0,
        'Gaming Items',
        500,
        387,
        true,
        NULL,
        '{"game": "CryptoRPG", "type": "weapon", "rarity": "legendary", "stats": {"attack": 95, "special": "Lightning Strike"}, "i18n": {"zh": {"title": "传奇武器：以太之剑", "description": "Web3 RPG游戏中的传奇级武器NFT，拥有强大的攻击力和特殊技能。可在多个游戏中使用。", "category": "游戏道具"}}}'
    ),

    (
        'Mystical Armor: DeFi Guardian Set',
        'Mystical armor designed for DeFi adventurers, providing additional yield bonuses and risk protection. Limited rare gaming asset.',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        129.99,
        12999.0,
        'Gaming Items',
        200,
        156,
        true,
        NULL,
        '{"game": "DeFi Quest", "type": "armor", "rarity": "mythic", "stats": {"defense": 88, "bonus": "20% yield boost"}, "i18n": {"zh": {"title": "神秘护甲：DeFi守护者套装", "description": "专为DeFi冒险者设计的神秘护甲，提供额外的收益加成和风险防护。限量发行的珍贵游戏资产。", "category": "游戏道具"}}}'
    ),

    -- Music NFTs Category
    (
        'Web3 Electronic Album: "Decentralized Sounds"',
        'Web3-themed electronic music album by renowned producer, featuring 8 original tracks and exclusive remix versions.',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
        59.99,
        5999.0,
        'Music',
        1000,
        734,
        true,
        NULL,
        '{"artist": "CryptoBeat Producer", "album": "Decentralized Sounds", "tracks": 8, "duration": "45:32", "i18n": {"zh": {"title": "Web3 电子音乐专辑：《去中心化之声》", "description": "由知名电子音乐制作人创作的Web3主题音乐专辑，包含8首原创曲目和独家remix版本。", "category": "音乐"}}}'
    ),

    (
        'Limited Single: "Bitcoin Dreams"',
        'Grammy-nominated artist''s exclusive single created for the crypto community, includes exclusive MV and behind-the-scenes footage.',
        'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800',
        29.99,
        2999.0,
        'Music',
        5000,
        3421,
        true,
        NULL,
        '{"artist": "Grammy Artist", "genre": "Electronic Pop", "duration": "3:45", "mv_included": true, "i18n": {"zh": {"title": "限量单曲：《Bitcoin Dreams》", "description": "获得格莱美提名的艺术家专为加密货币社区创作的单曲，包含独家MV和幕后花絮。", "category": "音乐"}}}'
    ),

    -- Collectibles Category
    (
        'Beehive Genesis Badge',
        'Special commemorative badge for Beehive platform launch, only available to early users. Significant historical and collectible value.',
        'https://images.unsplash.com/photo-1640499900704-b00dd6a1103a?w=800',
        99.99,
        9999.0,
        'Collectibles',
        1000,
        234,
        true,
        NULL,
        '{"type": "commemorative", "significance": "genesis launch", "holders_benefit": "exclusive access", "i18n": {"zh": {"title": "蜂巢创世纪徽章", "description": "纪念蜂巢平台上线的特殊徽章，只有早期用户才能获得。具有重要的历史意义和收藏价值。", "category": "收藏品"}}}'
    ),

    (
        'DeFi Protocol Commemorative Card Series',
        'Collect beautiful commemorative cards of major DeFi protocols, each detailing protocol features and development history. Special rewards for complete set.',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
        19.99,
        1999.0,
        'Collectibles',
        2500,
        1876,
        true,
        NULL,
        '{"series": "DeFi Legends", "total_cards": 50, "current_release": 15, "set_bonus": "exclusive staking pool", "i18n": {"zh": {"title": "DeFi协议纪念卡牌系列", "description": "收集各大DeFi协议的精美纪念卡牌，每张都详细介绍了协议的特色和发展历程。集齐全套可获得特殊奖励。", "category": "收藏品"}}}'
    ),

    -- Utility Tools Category
    (
        'Premium Analytics Tool Access Rights',
        'Permanent access to advanced market analysis tools, including real-time data, technical indicators, and AI prediction features.',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        499.99,
        49999.0,
        'Tool Access',
        500,
        312,
        true,
        NULL,
        '{"tool": "Advanced Analytics", "features": ["real-time data", "AI predictions", "custom alerts"], "validity": "lifetime", "i18n": {"zh": {"title": "Premium分析工具访问权", "description": "获得高级市场分析工具的永久访问权，包括实时数据、技术指标和AI预测功能。", "category": "工具权限"}}}'
    ),

    (
        'Exclusive Trading Signal Service',
        'Professional trading signals service by expert team, including entry points, stop-loss, and target prices. 85%+ historical win rate.',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        299.99,
        29999.0,
        'Tool Access',
        200,
        156,
        true,
        NULL,
        '{"service": "Professional Signals", "win_rate": "85%+", "frequency": "5-10 signals/week", "validity": "1 year", "i18n": {"zh": {"title": "独家交易信号服务", "description": "由专业交易团队提供的独家交易信号服务，包括进场点、止损点和目标价位。历史胜率85%+。", "category": "工具权限"}}}'
    ),

    -- Virtual Real Estate Category
    (
        'Metaverse Prime Commercial Land',
        'Virtual land located in the core area of popular metaverse platforms, suitable for building stores, showrooms, or entertainment venues. Scarce asset.',
        'https://images.unsplash.com/photo-1636953056323-9c09fdd74fa6?w=800',
        1999.99,
        199999.0,
        'Virtual Real Estate',
        100,
        67,
        true,
        NULL,
        '{"location": "Central Plaza", "size": "100x100 pixels", "zone": "commercial", "metaverse": "CryptoWorld", "i18n": {"zh": {"title": "元宇宙黄金地段商业用地", "description": "位于热门元宇宙平台核心区域的虚拟土地，适合建设商店、展厅或娱乐场所。稀缺性资产。", "category": "虚拟地产"}}}'
    ),

    (
        'DeFi Themed Virtual Exhibition Hall',
        'Virtual exhibition space specifically designed for showcasing DeFi projects and NFT collections, equipped with advanced 3D display technology.',
        'https://images.unsplash.com/photo-1633218388467-87139406f70a?w=800',
        799.99,
        79999.0,
        'Virtual Real Estate',
        50,
        28,
        true,
        NULL,
        '{"type": "exhibition_hall", "capacity": "500 visitors", "features": ["3D display", "VR support"], "theme": "DeFi", "i18n": {"zh": {"title": "DeFi主题虚拟展览馆", "description": "专门用于展示DeFi项目和NFT收藏品的虚拟展览空间，配备先进的3D展示技术。", "category": "虚拟地产"}}}'
    ),

    -- Virtual Fashion Category
    (
        'Limited Virtual Fashion: Web3 Punk Style',
        'Virtual fashion designed by renowned fashion designers specifically for Web3 community, wearable across multiple metaverse platforms.',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        149.99,
        14999.0,
        'Virtual Fashion',
        300,
        178,
        true,
        NULL,
        '{"designer": "MetaFashion Studio", "style": "cyberpunk", "compatibility": ["VRChat", "Decentraland", "Sandbox"], "i18n": {"zh": {"title": "限量版虚拟时装：Web3朋克风", "description": "由知名时装设计师专为Web3社区打造的虚拟时装，可在多个元宇宙平台穿戴。", "category": "虚拟时装"}}}'
    ),

    (
        'Cryptocurrency Themed Accessory Set',
        'Accessory set including hats, sunglasses, watches, each featuring different cryptocurrency logos and elements.',
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
        79.99,
        7999.0,
        'Virtual Fashion',
        500,
        289,
        true,
        NULL,
        '{"items": ["hat", "sunglasses", "watch", "necklace"], "theme": "cryptocurrency", "rarity": "common", "i18n": {"zh": {"title": "加密货币主题配饰套装", "description": "包含帽子、墨镜、手表等多件配饰的套装，每件都印有不同加密货币的logo和元素。", "category": "虚拟时装"}}}'
    ),

    -- Educational Resources Category
    (
        'Blockchain Development Master Class Complete Package',
        'Complete blockchain development course from basic to advanced, recorded by industry experts, includes source code and project templates.',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        399.99,
        39999.0,
        'Educational Resources',
        1000,
        723,
        true,
        NULL,
        '{"course_hours": 150, "languages": ["Solidity", "JavaScript", "Python"], "projects": 15, "certification": true, "i18n": {"zh": {"title": "区块链开发大师班完整课程包", "description": "包含从基础到高级的完整区块链开发课程，由行业专家录制，附带源码和项目模板。", "category": "教育资源"}}}'
    ),

    (
        'DeFi Investment Strategy Guide eBook',
        'Exclusive strategy guide written by experienced DeFi investors, includes real-world cases and risk management techniques.',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
        49.99,
        4999.0,
        'Educational Resources',
        2000,
        1456,
        true,
        NULL,
        '{"pages": 250, "chapters": 12, "case_studies": 25, "bonus": "video tutorials", "i18n": {"zh": {"title": "DeFi投资策略秘籍电子书", "description": "资深DeFi投资者撰写的独家策略指南，包含实战案例和风险管理技巧。", "category": "教育资源"}}}'
    );

    RAISE NOTICE 'Successfully inserted % merchant NFTs', (SELECT COUNT(*) FROM merchant_nfts);

END $$;