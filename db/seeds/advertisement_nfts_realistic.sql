-- Advertisement NFTs Data Seeds - Realistic Business Scenarios
-- 广告NFT数据种子 - 真实业务场景版

DO $$ 
BEGIN
    -- 清空现有数据重新插入真实场景数据
    DELETE FROM advertisement_nfts;

    INSERT INTO advertisement_nfts (
        title, description, image_url, price_usdt, price_bcc, category, 
        advertiser_wallet, click_url, impressions_target, impressions_current,
        is_active, starts_at, ends_at, metadata
    ) VALUES
    
    -- 合作推广类 (Partnership & Promotion)
    (
        'BeeCoin生态联合推广计划',
        '与BeeCoin平台深度合作，共同推广Web3会员制生态系统。享受联合营销资源，扩大品牌影响力，共建去中心化未来。',
        'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
        1999.99,
        199999.0,
        '合作推广',
        NULL,
        'https://beecoin.network/partnership',
        500000,
        45230,
        true,
        NOW(),
        NOW() + INTERVAL '90 days',
        '{"campaign_type": "strategic_partnership", "cooperation_level": "platinum", "benefits": ["joint_marketing", "brand_coexposure", "resource_sharing"], "target_audience": "crypto_communities", "i18n": {"zh": {"title": "BeeCoin生态联合推广计划", "description": "与BeeCoin平台深度合作，共同推广Web3会员制生态系统。", "category": "合作推广"}}}'
    ),

    (
        'Web3项目孵化推广支持',
        '为优秀Web3项目提供全方位推广支持服务。包括社群运营、KOL推广、活动策划等一站式营销解决方案。',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
        999.99,
        99999.0,
        '合作推广',
        NULL,
        'https://web3incubator.network',
        300000,
        28765,
        true,
        NOW(),
        NOW() + INTERVAL '60 days',
        '{"campaign_type": "incubation_support", "services": ["community_management", "kol_promotion", "event_planning"], "success_stories": 25, "i18n": {"zh": {"title": "Web3项目孵化推广支持", "description": "为优秀Web3项目提供全方位推广支持服务。", "category": "合作推广"}}}'
    ),

    -- 沙龙活动类 (Salon & Events)
    (
        'DeFi投资者专属私享沙龙',
        '每月举办高端DeFi投资沙龙活动，邀请行业专家分享最新趋势和投资机会。限量席位，仅对VIP会员开放。',
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        599.99,
        59999.0,
        '沙龙活动',
        NULL,
        'https://defi-salon.beecoin.network',
        50000,
        12340,
        true,
        NOW(),
        NOW() + INTERVAL '30 days',
        '{"event_type": "exclusive_salon", "frequency": "monthly", "capacity": 50, "speaker_level": "industry_experts", "membership_required": "VIP", "i18n": {"zh": {"title": "DeFi投资者专属私享沙龙", "description": "每月举办高端DeFi投资沙龙活动，邀请行业专家分享。", "category": "沙龙活动"}}}'
    ),

    (
        'NFT艺术家创作分享会',
        '定期举办NFT艺术家线下创作分享会，展示最新作品，交流创作心得。提供艺术家与收藏家直接对话的机会。',
        'https://images.unsplash.com/photo-1640161704729-cbe966a08853?w=800',
        399.99,
        39999.0,
        '沙龙活动',
        NULL,
        'https://nft-artist-salon.network',
        80000,
        15670,
        true,
        NOW(),
        NOW() + INTERVAL '45 days',
        '{"event_type": "artist_sharing", "format": "offline_meetup", "features": ["artwork_display", "artist_talk", "networking"], "attendee_type": ["artists", "collectors"], "i18n": {"zh": {"title": "NFT艺术家创作分享会", "description": "定期举办NFT艺术家线下创作分享会，展示最新作品。", "category": "沙龙活动"}}}'
    ),

    (
        'Web3创业者圆桌论坛',
        '汇聚Web3领域优秀创业者，分享创业经验，探讨行业发展趋势。建立创业者社群，促进项目合作与资源对接。',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
        799.99,
        79999.0,
        '沙龙活动',
        NULL,
        'https://web3-entrepreneur-forum.network',
        120000,
        23450,
        true,
        NOW(),
        NOW() + INTERVAL '60 days',
        '{"event_type": "roundtable_forum", "target_audience": "entrepreneurs", "focus": ["experience_sharing", "trend_discussion", "networking"], "community_building": true, "i18n": {"zh": {"title": "Web3创业者圆桌论坛", "description": "汇聚Web3领域优秀创业者，分享创业经验。", "category": "沙龙活动"}}}'
    ),

    -- 市场预热类 (Market Warming)
    (
        '新代币上线预热活动',
        'BEE代币正式上线前的市场预热推广，包括空投活动、社群建设、KOL背书等多维度营销策略，为成功上线做充分准备。',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        2999.99,
        299999.0,
        '市场预热',
        NULL,
        'https://bee-token-launch.network',
        1000000,
        67890,
        true,
        NOW(),
        NOW() + INTERVAL '120 days',
        '{"campaign_type": "token_launch_warming", "strategies": ["airdrop_campaign", "community_building", "kol_endorsement"], "launch_preparation": true, "token_symbol": "BEE", "i18n": {"zh": {"title": "新代币上线预热活动", "description": "BEE代币正式上线前的市场预热推广。", "category": "市场预热"}}}'
    ),

    (
        'BeeCoin生态系统发布预告',
        '全面介绍BeeCoin生态系统的创新功能和应用场景，通过多渠道预热宣传，为正式发布营造市场期待。',
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        1499.99,
        149999.0,
        '市场预热',
        NULL,
        'https://beecoin-ecosystem-preview.network',
        800000,
        125430,
        true,
        NOW(),
        NOW() + INTERVAL '90 days',
        '{"campaign_type": "ecosystem_preview", "scope": "comprehensive_introduction", "channels": ["social_media", "pr_articles", "community_events"], "goal": "market_anticipation", "i18n": {"zh": {"title": "BeeCoin生态系统发布预告", "description": "全面介绍BeeCoin生态系统的创新功能。", "category": "市场预热"}}}'
    ),

    (
        'NFT会员卡首发预热计划',
        '限量版NFT会员卡首发前的市场预热活动，通过稀缺性营销和早鸟优惠，吸引核心用户群体提前关注和预购。',
        'https://images.unsplash.com/photo-1640826843966-e1bda632df31?w=800',
        899.99,
        89999.0,
        '市场预热',
        NULL,
        'https://nft-membership-preview.network',
        400000,
        89120,
        true,
        NOW(),
        NOW() + INTERVAL '45 days',
        '{"campaign_type": "nft_membership_preview", "strategy": "scarcity_marketing", "incentives": ["early_bird_discount", "exclusive_access"], "target": "core_users", "i18n": {"zh": {"title": "NFT会员卡首发预热计划", "description": "限量版NFT会员卡首发前的市场预热活动。", "category": "市场预热"}}}'
    ),

    -- 品牌合作类 (Brand Collaboration)
    (
        'Web3知名品牌战略合作',
        '与Web3领域知名品牌建立深度战略合作关系，共同打造创新产品和服务，实现品牌价值的互利共赢。',
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
        3999.99,
        399999.0,
        '品牌合作',
        NULL,
        'https://brand-collaboration.beecoin.network',
        600000,
        78900,
        true,
        NOW(),
        NOW() + INTERVAL '180 days',
        '{"collaboration_type": "strategic_partnership", "focus": "product_innovation", "benefits": "mutual_value_creation", "brand_tier": "top_tier", "duration": "long_term", "i18n": {"zh": {"title": "Web3知名品牌战略合作", "description": "与Web3领域知名品牌建立深度战略合作关系。", "category": "品牌合作"}}}'
    ),

    (
        '传统金融机构Web3转型咨询',
        '为传统金融机构提供Web3转型咨询服务，帮助其理解并融入去中心化金融生态，实现数字化转型升级。',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        4999.99,
        499999.0,
        '品牌合作',
        NULL,
        'https://tradfi-web3-consulting.network',
        200000,
        34560,
        true,
        NOW(),
        NOW() + INTERVAL '365 days',
        '{"service_type": "transformation_consulting", "target_industry": "traditional_finance", "scope": "defi_integration", "outcome": "digital_transformation", "i18n": {"zh": {"title": "传统金融机构Web3转型咨询", "description": "为传统金融机构提供Web3转型咨询服务。", "category": "品牌合作"}}}'
    ),

    -- 社群运营类 (Community Operations)
    (
        'BeeCoin全球社群运营推广',
        '全球范围内的BeeCoin社群建设与运营推广，包括多语言社群管理、活动策划、用户教育等全方位服务。',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        1299.99,
        129999.0,
        '社群运营',
        NULL,
        'https://global-community.beecoin.network',
        2000000,
        345670,
        true,
        NOW(),
        NOW() + INTERVAL '365 days',
        '{"scope": "global_community", "services": ["multilingual_management", "event_planning", "user_education"], "coverage": "worldwide", "languages": ["en", "zh", "ja", "ko", "es"], "i18n": {"zh": {"title": "BeeCoin全球社群运营推广", "description": "全球范围内的BeeCoin社群建设与运营推广。", "category": "社群运营"}}}'
    ),

    (
        'Web3教育内容创作与推广',
        '专业Web3教育内容创作团队，制作高质量的教程、分析文章和视频内容，帮助用户深入了解区块链技术。',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
        699.99,
        69999.0,
        '社群运营',
        NULL,
        'https://web3-education.beecoin.network',
        500000,
        89012,
        true,
        NOW(),
        NOW() + INTERVAL '180 days',
        '{"content_type": "educational_materials", "formats": ["tutorials", "articles", "videos"], "focus": "blockchain_technology", "target": "user_education", "i18n": {"zh": {"title": "Web3教育内容创作与推广", "description": "专业Web3教育内容创作团队，制作高质量教程。", "category": "社群运营"}}}'
    ),

    -- KOL合作类 (KOL Collaboration)
    (
        '顶级加密KOL深度合作计划',
        '与加密领域顶级KOL建立深度合作关系，通过专业内容创作和影响力传播，扩大BeeCoin品牌知名度。',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        2499.99,
        249999.0,
        'KOL合作',
        NULL,
        'https://kol-collaboration.beecoin.network',
        1500000,
        234567,
        true,
        NOW(),
        NOW() + INTERVAL '180 days',
        '{"collaboration_type": "deep_partnership", "kol_tier": "top_tier_crypto", "content_types": ["analysis", "reviews", "tutorials"], "reach": "millions", "i18n": {"zh": {"title": "顶级加密KOL深度合作计划", "description": "与加密领域顶级KOL建立深度合作关系。", "category": "KOL合作"}}}'
    ),

    (
        'Web3意见领袖推广联盟',
        '汇聚Web3领域意见领袖，形成推广联盟，通过集体发声和专业背书，提升项目权威性和市场认知度。',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        1799.99,
        179999.0,
        'KOL合作',
        NULL,
        'https://opinion-leader-alliance.network',
        800000,
        156789,
        true,
        NOW(),
        NOW() + INTERVAL '120 days',
        '{"alliance_type": "opinion_leaders", "strategy": "collective_endorsement", "focus": "authority_building", "market_recognition": true, "i18n": {"zh": {"title": "Web3意见领袖推广联盟", "description": "汇聚Web3领域意见领袖，形成推广联盟。", "category": "KOL合作"}}}'
    );

    RAISE NOTICE '成功插入 % 个真实场景的广告NFT', (SELECT COUNT(*) FROM advertisement_nfts);

END $$;