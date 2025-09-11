-- 商户NFT数据种子
-- Merchant NFTs Data Seeds for Beehive Platform

-- 首先检查是否已有数据
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM merchant_nfts LIMIT 1) THEN
        RAISE NOTICE '商户NFT表已有数据，跳过插入';
        RETURN;
    END IF;

    -- 插入商户NFT数据
    INSERT INTO merchant_nfts (
        title, description, image_url, price_usdt, price_bcc, category, 
        supply_total, supply_available, is_active, creator_wallet, metadata
    ) VALUES
    -- Digital Art Category / 数字艺术品类
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
        '{"artist": "CryptoArt Studio", "edition": "Limited Edition", "rarity": "rare", "attributes": {"background": "galaxy", "style": "futuristic"}, "translations": {"zh": {"title": "蜂巢生态系统 - 限量版数字艺术", "description": "由知名数字艺术家创作的蜂巢生态主题艺术品，展现了Web3世界的无限可能。每个NFT都是独一无二的艺术杰作。", "category": "数字艺术"}}}'
    ),

    (
        '区块链城市景观系列',
        '未来主义风格的区块链城市景观，每一幅都代表着不同的DeFi协议和Web3项目。收藏价值极高。',
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800',
        299.99,
        29999.0,
        '数字艺术',
        50,
        32,
        true,
        NULL,
        '{"artist": "MetaVerse Designer", "edition": "精装版", "rarity": "epic", "attributes": {"theme": "cyberpunk", "elements": "neon lights"}}'
    ),

    -- 游戏道具类
    (
        '传奇武器：以太之剑',
        'Web3 RPG游戏中的传奇级武器NFT，拥有强大的攻击力和特殊技能。可在多个游戏中使用。',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
        89.99,
        8999.0,
        '游戏道具',
        500,
        387,
        true,
        NULL,
        '{"game": "CryptoRPG", "type": "weapon", "rarity": "legendary", "stats": {"attack": 95, "special": "Lightning Strike"}}'
    ),

    (
        '神秘护甲：DeFi守护者套装',
        '专为DeFi冒险者设计的神秘护甲，提供额外的收益加成和风险防护。限量发行的珍贵游戏资产。',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        129.99,
        12999.0,
        '游戏道具',
        200,
        156,
        true,
        NULL,
        '{"game": "DeFi Quest", "type": "armor", "rarity": "mythic", "stats": {"defense": 88, "bonus": "20% yield boost"}}'
    ),

    -- 音乐NFT类
    (
        'Web3 电子音乐专辑：《去中心化之声》',
        '由知名电子音乐制作人创作的Web3主题音乐专辑，包含8首原创曲目和独家remix版本。',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
        59.99,
        5999.0,
        '音乐',
        1000,
        734,
        true,
        NULL,
        '{"artist": "CryptoBeat Producer", "album": "Decentralized Sounds", "tracks": 8, "duration": "45:32"}}'
    ),

    (
        '限量单曲：《Bitcoin Dreams》',
        '获得格莱美提名的艺术家专为加密货币社区创作的单曲，包含独家MV和幕后花絮。',
        'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800',
        29.99,
        2999.0,
        '音乐',
        5000,
        3421,
        true,
        NULL,
        '{"artist": "Grammy Artist", "genre": "Electronic Pop", "duration": "3:45", "mv_included": true}}'
    ),

    -- 收藏品类
    (
        '蜂巢创世纪徽章',
        '纪念蜂巢平台上线的特殊徽章，只有早期用户才能获得。具有重要的历史意义和收藏价值。',
        'https://images.unsplash.com/photo-1640499900704-b00dd6a1103a?w=800',
        99.99,
        9999.0,
        '收藏品',
        1000,
        234,
        true,
        NULL,
        '{"type": "commemorative", "significance": "genesis launch", "holders_benefit": "exclusive access"}}'
    ),

    (
        'DeFi协议纪念卡牌系列',
        '收集各大DeFi协议的精美纪念卡牌，每张都详细介绍了协议的特色和发展历程。集齐全套可获得特殊奖励。',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
        19.99,
        1999.0,
        '收藏品',
        2500,
        1876,
        true,
        NULL,
        '{"series": "DeFi Legends", "total_cards": 50, "current_release": 15, "set_bonus": "exclusive staking pool"}}'
    ),

    -- 实用工具类
    (
        'Premium分析工具访问权',
        '获得高级市场分析工具的永久访问权，包括实时数据、技术指标和AI预测功能。',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        499.99,
        49999.0,
        '工具权限',
        500,
        312,
        true,
        NULL,
        '{"tool": "Advanced Analytics", "features": ["real-time data", "AI predictions", "custom alerts"], "validity": "lifetime"}}'
    ),

    (
        '独家交易信号服务',
        '由专业交易团队提供的独家交易信号服务，包括进场点、止损点和目标价位。历史胜率85%+。',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        299.99,
        29999.0,
        '工具权限',
        200,
        156,
        true,
        NULL,
        '{"service": "Professional Signals", "win_rate": "85%+", "frequency": "5-10 signals/week", "validity": "1 year"}}'
    ),

    -- 虚拟土地类
    (
        '元宇宙黄金地段商业用地',
        '位于热门元宇宙平台核心区域的虚拟土地，适合建设商店、展厅或娱乐场所。稀缺性资产。',
        'https://images.unsplash.com/photo-1636953056323-9c09fdd74fa6?w=800',
        1999.99,
        199999.0,
        '虚拟地产',
        100,
        67,
        true,
        NULL,
        '{"location": "Central Plaza", "size": "100x100 pixels", "zone": "commercial", "metaverse": "CryptoWorld"}}'
    ),

    (
        'DeFi主题虚拟展览馆',
        '专门用于展示DeFi项目和NFT收藏品的虚拟展览空间，配备先进的3D展示技术。',
        'https://images.unsplash.com/photo-1633218388467-87139406f70a?w=800',
        799.99,
        79999.0,
        '虚拟地产',
        50,
        28,
        true,
        NULL,
        '{"type": "exhibition_hall", "capacity": "500 visitors", "features": ["3D display", "VR support"], "theme": "DeFi"}}'
    ),

    -- 时尚配饰类
    (
        '限量版虚拟时装：Web3朋克风',
        '由知名时装设计师专为Web3社区打造的虚拟时装，可在多个元宇宙平台穿戴。',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        149.99,
        14999.0,
        '虚拟时装',
        300,
        178,
        true,
        NULL,
        '{"designer": "MetaFashion Studio", "style": "cyberpunk", "compatibility": ["VRChat", "Decentraland", "Sandbox"]}}'
    ),

    (
        '加密货币主题配饰套装',
        '包含帽子、墨镜、手表等多件配饰的套装，每件都印有不同加密货币的logo和元素。',
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
        79.99,
        7999.0,
        '虚拟时装',
        500,
        289,
        true,
        NULL,
        '{"items": ["hat", "sunglasses", "watch", "necklace"], "theme": "cryptocurrency", "rarity": "common"}}'
    ),

    -- 教育资源类
    (
        '区块链开发大师班完整课程包',
        '包含从基础到高级的完整区块链开发课程，由行业专家录制，附带源码和项目模板。',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        399.99,
        39999.0,
        '教育资源',
        1000,
        723,
        true,
        NULL,
        '{"course_hours": 150, "languages": ["Solidity", "JavaScript", "Python"], "projects": 15, "certification": true}}'
    ),

    (
        'DeFi投资策略秘籍电子书',
        '资深DeFi投资者撰写的独家策略指南，包含实战案例和风险管理技巧。',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
        49.99,
        4999.0,
        '教育资源',
        2000,
        1456,
        true,
        NULL,
        '{"pages": 250, "chapters": 12, "case_studies": 25, "bonus": "video tutorials"}}'
    );

    RAISE NOTICE '成功插入 % 个商户NFT', (SELECT COUNT(*) FROM merchant_nfts);

END $$;