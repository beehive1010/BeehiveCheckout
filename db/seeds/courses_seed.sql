-- 课程数据种子
-- Course Data Seeds for Beehive Platform

-- 首先检查是否已有数据
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM courses LIMIT 1) THEN
        RAISE NOTICE '课程表已有数据，跳过插入';
        RETURN;
    END IF;

    -- 插入课程数据
    INSERT INTO courses (
        title, description, image_url, price_usdt, price_bcc, category, 
        difficulty_level, duration_hours, instructor_name, instructor_wallet,
        is_active, required_level, metadata
    ) VALUES
    -- Web3 基础课程
    (
        'Web3 基础入门：从零开始学习区块链',
        '全面介绍Web3和区块链技术的基础概念，包括加密货币、钱包、智能合约等核心知识。适合完全初学者，无需任何技术背景。',
        'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
        29.99,
        2999.0,
        'Web3基础',
        'beginner',
        8,
        'Alex Chen',
        NULL,
        true,
        1,
        '{"tags": ["区块链", "Web3", "入门"], "preview_video": "https://example.com/preview1.mp4", "language": "中文"}'
    ),

    (
        '智能合约开发实战：Solidity从入门到精通',
        '深入学习Solidity编程语言，掌握智能合约开发技能。包含实际项目案例，从简单合约到复杂DeFi协议。',
        'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800',
        99.99,
        9999.0,
        'Web3技术',
        'intermediate',
        24,
        'Sarah Wang',
        NULL,
        true,
        3,
        '{"tags": ["Solidity", "智能合约", "DeFi"], "preview_video": "https://example.com/preview2.mp4", "language": "中英文"}'
    ),

    -- DeFi课程
    (
        'DeFi协议深度解析：Uniswap、Compound、Aave',
        '详细解析主流DeFi协议的工作原理、经济模型和风险管理。学习如何安全地参与DeFi生态系统。',
        'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
        79.99,
        7999.0,
        'DeFi',
        'advanced',
        16,
        'Michael Zhang',
        NULL,
        true,
        5,
        '{"tags": ["DeFi", "Uniswap", "流动性挖矿"], "preview_video": "https://example.com/preview3.mp4", "language": "中文"}'
    ),

    (
        '流动性挖矿策略与风险管理',
        '学习各种流动性挖矿策略，了解收益农场的风险与回报。包括无常损失、智能合约风险等重要概念。',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
        59.99,
        5999.0,
        'DeFi',
        'intermediate',
        12,
        'Lisa Chen',
        NULL,
        true,
        3,
        '{"tags": ["流动性挖矿", "风险管理", "收益优化"], "preview_video": "https://example.com/preview4.mp4", "language": "中文"}'
    ),

    -- NFT课程
    (
        'NFT创作与营销完全指南',
        '从NFT创作、铸造到营销推广的完整流程。学习如何在OpenSea、Foundation等平台发布和销售NFT作品。',
        'https://images.unsplash.com/photo-1640161704729-cbe966a08853?w=800',
        49.99,
        4999.0,
        'NFT',
        'beginner',
        10,
        'Emma Liu',
        NULL,
        true,
        2,
        '{"tags": ["NFT", "数字艺术", "营销"], "preview_video": "https://example.com/preview5.mp4", "language": "中文"}'
    ),

    (
        'NFT技术开发：ERC-721与ERC-1155标准',
        '深入学习NFT的技术实现，包括ERC-721和ERC-1155标准，以及如何开发自己的NFT智能合约。',
        'https://images.unsplash.com/photo-1640826843966-e1bda632df31?w=800',
        89.99,
        8999.0,
        'NFT',
        'advanced',
        18,
        'David Kim',
        NULL,
        true,
        4,
        '{"tags": ["NFT", "ERC-721", "智能合约开发"], "preview_video": "https://example.com/preview6.mp4", "language": "中英文"}'
    ),

    -- 加密货币交易课程
    (
        '加密货币交易心理学与风险控制',
        '学习成功交易者的心理素质和风险管理技巧。掌握技术分析、基本面分析和交易策略制定。',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        69.99,
        6999.0,
        '交易策略',
        'intermediate',
        14,
        'Ryan Zhou',
        NULL,
        true,
        2,
        '{"tags": ["交易策略", "风险控制", "心理学"], "preview_video": "https://example.com/preview7.mp4", "language": "中文"}'
    ),

    (
        '量化交易策略开发与回测',
        '使用Python和量化工具开发交易策略，学习回测、优化和实盘部署。包含多种经典量化策略。',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        119.99,
        11999.0,
        '交易策略',
        'advanced',
        20,
        'Kevin Wu',
        NULL,
        true,
        6,
        '{"tags": ["量化交易", "Python", "策略开发"], "preview_video": "https://example.com/preview8.mp4", "language": "中英文"}'
    ),

    -- 区块链技术课程
    (
        '区块链底层技术：共识算法与分布式系统',
        '深入理解区块链的底层技术原理，包括各种共识算法、分布式系统设计和网络协议。',
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        159.99,
        15999.0,
        '区块链技术',
        'advanced',
        32,
        'Professor Li',
        NULL,
        true,
        7,
        '{"tags": ["共识算法", "分布式系统", "技术原理"], "preview_video": "https://example.com/preview9.mp4", "language": "中文"}'
    ),

    (
        'Layer 2扩容方案：Polygon、Arbitrum、Optimism',
        '全面了解以太坊Layer 2扩容方案，学习如何在不同的L2网络上开发和部署应用。',
        'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        79.99,
        7999.0,
        '区块链技术',
        'intermediate',
        16,
        'Tony Zhao',
        NULL,
        true,
        4,
        '{"tags": ["Layer2", "扩容", "Polygon"], "preview_video": "https://example.com/preview10.mp4", "language": "中英文"}'
    ),

    -- Web3商业应用
    (
        'Web3创业指南：从想法到产品落地',
        '学习Web3创业的完整流程，包括市场分析、产品设计、团队建设、融资策略等关键环节。',
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
        99.99,
        9999.0,
        'Web3商业',
        'intermediate',
        22,
        'Jennifer Ma',
        NULL,
        true,
        3,
        '{"tags": ["创业", "商业模式", "产品设计"], "preview_video": "https://example.com/preview11.mp4", "language": "中文"}'
    ),

    (
        'DAO治理与社区建设',
        '深入了解去中心化自治组织(DAO)的运作机制，学习如何建设和管理Web3社区。',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
        69.99,
        6999.0,
        'Web3商业',
        'intermediate',
        12,
        'Alice Wang',
        NULL,
        true,
        3,
        '{"tags": ["DAO", "社区治理", "代币经济"], "preview_video": "https://example.com/preview12.mp4", "language": "中文"}'
    ),

    -- 免费入门课程
    (
        '数字钱包使用指南',
        '免费课程：学习如何安全地使用各种数字钱包，包括MetaMask、Trust Wallet等主流钱包的使用技巧。',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        0,
        0,
        'Web3基础',
        'beginner',
        4,
        'Support Team',
        NULL,
        true,
        1,
        '{"tags": ["数字钱包", "安全", "免费"], "preview_video": "https://example.com/preview13.mp4", "language": "中文", "free": true}'
    ),

    (
        'Web3安全防护必知必会',
        '免费安全课程：学习Web3世界中的常见风险和防护措施，保护你的数字资产安全。',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
        0,
        0,
        'Web3基础',
        'beginner',
        3,
        'Security Expert',
        NULL,
        true,
        1,
        '{"tags": ["安全", "防护", "免费"], "preview_video": "https://example.com/preview14.mp4", "language": "中文", "free": true}'
    ),

    -- 高级专业课程
    (
        'MEV (最大可提取价值) 深度研究',
        '深入研究MEV的概念、策略和影响，学习如何在DeFi生态中识别和利用套利机会。',
        'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800',
        199.99,
        19999.0,
        'DeFi',
        'advanced',
        28,
        'Dr. Johnson',
        NULL,
        true,
        8,
        '{"tags": ["MEV", "套利", "高级策略"], "preview_video": "https://example.com/preview15.mp4", "language": "英文"}'
    );

    RAISE NOTICE '成功插入 % 门课程', (SELECT COUNT(*) FROM courses);

END $$;