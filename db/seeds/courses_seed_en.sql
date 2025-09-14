-- English Course Data Seeds for Beehive Platform
-- 英文课程数据种子

-- Check if data already exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM courses WHERE metadata::jsonb ->> 'language' = 'English' LIMIT 1) THEN
        RAISE NOTICE 'English courses already exist, skipping insertion';
        RETURN;
    END IF;

    -- Insert English course data
    INSERT INTO courses (
        title, description, image_url, price_usdt, price_bcc, category, 
        difficulty_level, duration_hours, instructor_name, instructor_wallet,
        is_active, required_level, metadata
    ) VALUES
    -- Web3 Basics
    (
        'Web3 Fundamentals: Complete Blockchain Beginner Guide',
        'Comprehensive introduction to Web3 and blockchain technology basics, including cryptocurrencies, wallets, smart contracts, and core concepts. Perfect for complete beginners with no technical background required.',
        'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
        29.99,
        2999.0,
        'Web3 Basics',
        'beginner',
        8,
        'Alex Chen',
        NULL,
        true,
        1,
        '{"tags": ["blockchain", "Web3", "beginner"], "preview_video": "https://example.com/preview1.mp4", "language": "English"}'
    ),

    (
        'Smart Contract Development Mastery: Solidity from Zero to Hero',
        'Deep dive into Solidity programming language and smart contract development skills. Includes real project cases from simple contracts to complex DeFi protocols.',
        'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800',
        99.99,
        9999.0,
        'Web3 Technology',
        'intermediate',
        24,
        'Sarah Wang',
        NULL,
        true,
        3,
        '{"tags": ["Solidity", "Smart Contracts", "DeFi"], "preview_video": "https://example.com/preview2.mp4", "language": "English"}'
    ),

    -- DeFi Courses
    (
        'DeFi Protocol Deep Dive: Uniswap, Compound, Aave Analysis',
        'Detailed analysis of mainstream DeFi protocols working principles, economic models, and risk management. Learn how to safely participate in the DeFi ecosystem.',
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
        '{"tags": ["DeFi", "Uniswap", "Yield Farming"], "preview_video": "https://example.com/preview3.mp4", "language": "English"}'
    ),

    (
        'Liquidity Mining Strategies and Risk Management',
        'Learn various liquidity mining strategies and understand yield farming risks and rewards. Covers impermanent loss, smart contract risks, and other important concepts.',
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
        '{"tags": ["Liquidity Mining", "Risk Management", "Yield Optimization"], "preview_video": "https://example.com/preview4.mp4", "language": "English"}'
    ),

    -- NFT Courses
    (
        'Complete NFT Creation and Marketing Guide',
        'Complete workflow from NFT creation, minting to marketing and promotion. Learn how to publish and sell NFT artworks on OpenSea, Foundation and other platforms.',
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
        '{"tags": ["NFT", "Digital Art", "Marketing"], "preview_video": "https://example.com/preview5.mp4", "language": "English"}'
    ),

    (
        'NFT Technical Development: ERC-721 and ERC-1155 Standards',
        'Deep dive into NFT technical implementation, including ERC-721 and ERC-1155 standards, and how to develop your own NFT smart contracts.',
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
        '{"tags": ["NFT", "ERC-721", "Smart Contract Development"], "preview_video": "https://example.com/preview6.mp4", "language": "English"}'
    ),

    -- Trading Strategy Courses
    (
        'Cryptocurrency Trading Psychology and Risk Control',
        'Learn successful traders psychological qualities and risk management techniques. Master technical analysis, fundamental analysis, and trading strategy development.',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        69.99,
        6999.0,
        'Trading Strategy',
        'intermediate',
        14,
        'Ryan Zhou',
        NULL,
        true,
        2,
        '{"tags": ["Trading Strategy", "Risk Control", "Psychology"], "preview_video": "https://example.com/preview7.mp4", "language": "English"}'
    ),

    (
        'Quantitative Trading Strategy Development and Backtesting',
        'Develop trading strategies using Python and quantitative tools, learn backtesting, optimization, and live deployment. Includes multiple classic quantitative strategies.',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        119.99,
        11999.0,
        'Trading Strategy',
        'advanced',
        20,
        'Kevin Wu',
        NULL,
        true,
        6,
        '{"tags": ["Quantitative Trading", "Python", "Strategy Development"], "preview_video": "https://example.com/preview8.mp4", "language": "English"}'
    ),

    -- Blockchain Technology Courses
    (
        'Blockchain Core Technology: Consensus Algorithms and Distributed Systems',
        'Deep understanding of blockchain underlying technical principles, including various consensus algorithms, distributed system design, and network protocols.',
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        159.99,
        15999.0,
        'Blockchain Technology',
        'advanced',
        32,
        'Professor Li',
        NULL,
        true,
        7,
        '{"tags": ["Consensus Algorithms", "Distributed Systems", "Technical Principles"], "preview_video": "https://example.com/preview9.mp4", "language": "English"}'
    ),

    (
        'Layer 2 Scaling Solutions: Polygon, Arbitrum, Optimism',
        'Comprehensive understanding of Ethereum Layer 2 scaling solutions, learn how to develop and deploy applications on different L2 networks.',
        'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        79.99,
        7999.0,
        'Blockchain Technology',
        'intermediate',
        16,
        'Tony Zhao',
        NULL,
        true,
        4,
        '{"tags": ["Layer2", "Scaling", "Polygon"], "preview_video": "https://example.com/preview10.mp4", "language": "English"}'
    ),

    -- Web3 Business Applications
    (
        'Web3 Startup Guide: From Idea to Product Launch',
        'Learn complete Web3 startup process, including market analysis, product design, team building, fundraising strategy and other key elements.',
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
        99.99,
        9999.0,
        'Web3 Business',
        'intermediate',
        22,
        'Jennifer Ma',
        NULL,
        true,
        3,
        '{"tags": ["Entrepreneurship", "Business Model", "Product Design"], "preview_video": "https://example.com/preview11.mp4", "language": "English"}'
    ),

    (
        'DAO Governance and Community Building',
        'Deep understanding of Decentralized Autonomous Organization (DAO) operating mechanisms, learn how to build and manage Web3 communities.',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
        69.99,
        6999.0,
        'Web3 Business',
        'intermediate',
        12,
        'Alice Wang',
        NULL,
        true,
        3,
        '{"tags": ["DAO", "Community Governance", "Token Economics"], "preview_video": "https://example.com/preview12.mp4", "language": "English"}'
    ),

    -- Free Beginner Courses
    (
        'Digital Wallet Usage Guide',
        'Free course: Learn how to safely use various digital wallets, including MetaMask, Trust Wallet and other mainstream wallet usage techniques.',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        0,
        0,
        'Web3 Basics',
        'beginner',
        4,
        'Support Team',
        NULL,
        true,
        1,
        '{"tags": ["Digital Wallet", "Security", "Free"], "preview_video": "https://example.com/preview13.mp4", "language": "English", "free": true}'
    ),

    (
        'Web3 Security Protection Essentials',
        'Free security course: Learn common risks and protective measures in the Web3 world, protect your digital assets security.',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
        0,
        0,
        'Web3 Basics',
        'beginner',
        3,
        'Security Expert',
        NULL,
        true,
        1,
        '{"tags": ["Security", "Protection", "Free"], "preview_video": "https://example.com/preview14.mp4", "language": "English", "free": true}'
    ),

    -- Advanced Professional Courses
    (
        'MEV (Maximum Extractable Value) Deep Research',
        'Deep research into MEV concepts, strategies and impacts, learn how to identify and utilize arbitrage opportunities in DeFi ecosystem.',
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
        '{"tags": ["MEV", "Arbitrage", "Advanced Strategy"], "preview_video": "https://example.com/preview15.mp4", "language": "English"}'
    );

    RAISE NOTICE 'Successfully inserted % English courses', (SELECT COUNT(*) FROM courses WHERE metadata::jsonb ->> 'language' = 'English');

END $$;