-- English Discover DApps Seed Data for Beehive Platform
-- 英文发现DApp种子数据

DO $$ 
BEGIN
    -- Insert categories first
    IF NOT EXISTS (SELECT 1 FROM dapp_categories LIMIT 1) THEN
        INSERT INTO dapp_categories (name, description, icon, display_order) VALUES
        ('DeFi', 'Decentralized Finance protocols and applications', 'TrendingUp', 1),
        ('NFT Marketplaces', 'Non-Fungible Token trading and creation platforms', 'Image', 2),
        ('Gaming', 'Blockchain-based games and gaming platforms', 'Gamepad2', 3),
        ('Trading', 'Cryptocurrency and token trading platforms', 'BarChart3', 4),
        ('Tools', 'Web3 development and utility tools', 'Wrench', 5),
        ('Social', 'Decentralized social media and communication', 'Users', 6),
        ('Analytics', 'Blockchain analytics and data platforms', 'PieChart', 7),
        ('Infrastructure', 'Blockchain infrastructure and services', 'Network', 8);
        
        RAISE NOTICE 'Successfully inserted % DApp categories', (SELECT COUNT(*) FROM dapp_categories);
    END IF;

    -- Check if DApps data already exists
    IF EXISTS (SELECT 1 FROM dapps LIMIT 1) THEN
        RAISE NOTICE 'DApps data already exists, skipping insertion';
        RETURN;
    END IF;

    -- Insert DApps data
    INSERT INTO dapps (
        name, description, category_id, logo_url, website_url, app_url,
        required_level, is_premium, blockchain_networks, total_value_locked,
        daily_active_users, features, supported_tokens, average_rating,
        total_reviews, status, is_featured, is_verified, tags, metadata
    ) VALUES
    -- DeFi Applications
    (
        'Uniswap',
        'The largest decentralized exchange (DEX) on Ethereum. Swap tokens, provide liquidity, and earn fees in a completely decentralized manner.',
        (SELECT id FROM dapp_categories WHERE name = 'DeFi'),
        'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
        'https://uniswap.org',
        'https://app.uniswap.org',
        1,
        false,
        ARRAY['ethereum', 'polygon', 'arbitrum', 'optimism'],
        500000000000, -- $5B TVL in cents
        50000,
        ARRAY['swapping', 'liquidity_provision', 'yield_farming'],
        ARRAY['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'],
        4.5,
        1250,
        'active',
        true,
        true,
        ARRAY['DEX', 'AMM', 'DeFi', 'Ethereum', 'Uniswap'],
        '{"verified": true, "audit_reports": ["https://example.com/audit1"], "social_links": {"twitter": "@Uniswap", "discord": "https://discord.gg/uniswap"}}'
    ),

    (
        'Aave',
        'Leading decentralized lending protocol. Earn interest on deposits and borrow against your crypto assets with over-collateralization.',
        (SELECT id FROM dapp_categories WHERE name = 'DeFi'),
        'https://cryptologos.cc/logos/aave-aave-logo.svg',
        'https://aave.com',
        'https://app.aave.com',
        2,
        false,
        ARRAY['ethereum', 'polygon', 'avalanche', 'arbitrum'],
        800000000000, -- $8B TVL
        25000,
        ARRAY['lending', 'borrowing', 'staking'],
        ARRAY['ETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'LINK'],
        4.7,
        890,
        'active',
        true,
        true,
        ARRAY['lending', 'borrowing', 'DeFi', 'Aave'],
        '{"verified": true, "governance_token": "AAVE"}'
    ),

    (
        'Compound',
        'Autonomous interest rate protocol for supplying and borrowing crypto assets. Earn compound interest or borrow against collateral.',
        (SELECT id FROM dapp_categories WHERE name = 'DeFi'),
        'https://cryptologos.cc/logos/compound-comp-logo.svg',
        'https://compound.finance',
        'https://app.compound.finance',
        2,
        false,
        ARRAY['ethereum'],
        300000000000, -- $3B TVL
        15000,
        ARRAY['lending', 'borrowing'],
        ARRAY['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'],
        4.3,
        567,
        'active',
        true,
        true,
        ARRAY['lending', 'DeFi', 'Compound'],
        '{"verified": true, "governance_token": "COMP"}'
    ),

    -- NFT Marketplaces
    (
        'OpenSea',
        'The worlds largest NFT marketplace. Discover, collect, and sell extraordinary NFTs including art, gaming items, and digital collectibles.',
        (SELECT id FROM dapp_categories WHERE name = 'NFT Marketplaces'),
        'https://opensea.io/static/images/logos/opensea-logo.svg',
        'https://opensea.io',
        'https://opensea.io',
        1,
        false,
        ARRAY['ethereum', 'polygon', 'arbitrum'],
        0,
        100000,
        ARRAY['nft_trading', 'nft_creation', 'collections'],
        ARRAY['ETH', 'WETH', 'USDC'],
        4.2,
        2340,
        'active',
        true,
        true,
        ARRAY['NFT', 'marketplace', 'OpenSea', 'collectibles'],
        '{"verified": true, "royalty_fees": "2.5%"}'
    ),

    (
        'LooksRare',
        'Community-first NFT marketplace that rewards users. Trade NFTs and earn LOOKS tokens through trading and staking activities.',
        (SELECT id FROM dapp_categories WHERE name = 'NFT Marketplaces'),
        'https://looksrare.mo.cloudinary.net/logo.svg',
        'https://looksrare.org',
        'https://looksrare.org',
        3,
        false,
        ARRAY['ethereum'],
        0,
        8000,
        ARRAY['nft_trading', 'staking', 'rewards'],
        ARRAY['ETH', 'WETH', 'LOOKS'],
        4.0,
        456,
        'active',
        false,
        true,
        ARRAY['NFT', 'marketplace', 'rewards', 'LOOKS'],
        '{"governance_token": "LOOKS", "trading_rewards": true}'
    ),

    -- Gaming
    (
        'Axie Infinity',
        'Popular play-to-earn game where players collect, breed, and battle fantasy creatures called Axies. Earn AXS and SLP tokens through gameplay.',
        (SELECT id FROM dapp_categories WHERE name = 'Gaming'),
        'https://assets.coingecko.com/coins/images/13029/large/axie_infinity_logo.png',
        'https://axieinfinity.com',
        'https://app.axieinfinity.com',
        2,
        false,
        ARRAY['ethereum', 'ronin'],
        0,
        75000,
        ARRAY['gaming', 'play_to_earn', 'nft', 'breeding'],
        ARRAY['AXS', 'SLP', 'ETH'],
        4.1,
        3420,
        'active',
        true,
        true,
        ARRAY['gaming', 'play-to-earn', 'NFT', 'Axie'],
        '{"play_to_earn": true, "breeding_mechanics": true}'
    ),

    (
        'The Sandbox',
        'Virtual world where players can build, own, and monetize gaming experiences using SAND tokens and NFTs. Create and trade virtual real estate.',
        (SELECT id FROM dapp_categories WHERE name = 'Gaming'),
        'https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg',
        'https://www.sandbox.game',
        'https://www.sandbox.game/en/play/',
        2,
        false,
        ARRAY['ethereum', 'polygon'],
        0,
        25000,
        ARRAY['gaming', 'virtual_world', 'nft', 'metaverse'],
        ARRAY['SAND', 'ETH'],
        4.3,
        1890,
        'active',
        true,
        true,
        ARRAY['metaverse', 'virtual world', 'SAND', 'gaming'],
        '{"metaverse": true, "land_ownership": true}'
    ),

    -- Trading Platforms
    (
        '1inch',
        'DEX aggregator that finds the best rates across multiple decentralized exchanges. Save on gas and get better prices for token swaps.',
        (SELECT id FROM dapp_categories WHERE name = 'Trading'),
        'https://1inch.io/assets/favicon/favicon-32x32.png',
        'https://1inch.io',
        'https://app.1inch.io',
        2,
        false,
        ARRAY['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
        200000000000, -- $2B volume
        20000,
        ARRAY['swapping', 'aggregation', 'yield_farming'],
        ARRAY['ETH', 'USDC', 'USDT', 'WBTC', '1INCH'],
        4.4,
        782,
        'active',
        true,
        true,
        ARRAY['DEX aggregator', '1inch', 'trading'],
        '{"aggregation": true, "gas_optimization": true}'
    ),

    -- Tools & Infrastructure
    (
        'MetaMask',
        'Popular Ethereum wallet and Web3 gateway. Manage your crypto assets, interact with DApps, and access the decentralized web securely.',
        (SELECT id FROM dapp_categories WHERE name = 'Tools'),
        'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
        'https://metamask.io',
        'https://metamask.io/download/',
        1,
        false,
        ARRAY['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum'],
        0,
        30000000, -- 30M users
        ARRAY['wallet', 'web3_gateway', 'dapp_browser'],
        ARRAY['ETH', 'ERC20_TOKENS'],
        4.6,
        5420,
        'active',
        true,
        true,
        ARRAY['wallet', 'MetaMask', 'Web3', 'Ethereum'],
        '{"browser_extension": true, "mobile_app": true, "hardware_wallet_support": true}'
    ),

    (
        'Etherscan',
        'Leading Ethereum blockchain explorer. Track transactions, view smart contracts, monitor wallet activities, and analyze on-chain data.',
        (SELECT id FROM dapp_categories WHERE name = 'Analytics'),
        'https://etherscan.io/images/favicon3.ico',
        'https://etherscan.io',
        'https://etherscan.io',
        1,
        false,
        ARRAY['ethereum'],
        0,
        500000,
        ARRAY['blockchain_explorer', 'analytics', 'contract_verification'],
        ARRAY['ETH', 'ERC20_TOKENS'],
        4.8,
        1240,
        'active',
        true,
        true,
        ARRAY['explorer', 'analytics', 'Etherscan', 'blockchain'],
        '{"contract_verification": true, "api_access": true}'
    ),

    -- Social Platforms
    (
        'Lens Protocol',
        'Decentralized social media protocol built on Polygon. Own your social graph, content, and audience through NFT-based profiles.',
        (SELECT id FROM dapp_categories WHERE name = 'Social'),
        'https://lens.xyz/logo.svg',
        'https://lens.xyz',
        'https://www.lens.xyz',
        3,
        true,
        ARRAY['polygon'],
        0,
        12000,
        ARRAY['social_media', 'nft_profiles', 'content_creation'],
        ARRAY['WMATIC', 'USDC'],
        4.2,
        234,
        'active',
        true,
        true,
        ARRAY['social', 'decentralized', 'Lens', 'Web3 social'],
        '{"nft_profiles": true, "composable": true}'
    ),

    -- More DeFi
    (
        'PancakeSwap',
        'Leading DEX on Binance Smart Chain. Trade tokens, provide liquidity, and earn CAKE rewards through yield farming and staking.',
        (SELECT id FROM dapp_categories WHERE name = 'DeFi'),
        'https://pancakeswap.finance/logo.png',
        'https://pancakeswap.finance',
        'https://pancakeswap.finance',
        2,
        false,
        ARRAY['bsc', 'ethereum', 'arbitrum'],
        150000000000, -- $1.5B TVL
        45000,
        ARRAY['swapping', 'yield_farming', 'staking', 'lottery'],
        ARRAY['BNB', 'CAKE', 'USDT', 'ETH'],
        4.3,
        1678,
        'active',
        true,
        true,
        ARRAY['DEX', 'BSC', 'PancakeSwap', 'CAKE'],
        '{"yield_farming": true, "lottery": true, "nft_marketplace": true}'
    ),

    -- Advanced Tools
    (
        'Tenderly',
        'Web3 development platform with transaction simulation, debugging, and monitoring tools. Essential for smart contract development.',
        (SELECT id FROM dapp_categories WHERE name = 'Tools'),
        'https://tenderly.co/icons/icon-512x512.png',
        'https://tenderly.co',
        'https://dashboard.tenderly.co',
        5,
        true,
        ARRAY['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'],
        0,
        5000,
        ARRAY['development', 'debugging', 'monitoring', 'simulation'],
        ARRAY['ETH'],
        4.7,
        156,
        'active',
        false,
        true,
        ARRAY['development', 'debugging', 'Tenderly', 'smart contracts'],
        '{"simulation": true, "monitoring": true, "alerting": true}'
    );

    RAISE NOTICE 'Successfully inserted % DApps', (SELECT COUNT(*) FROM dapps);

END $$;