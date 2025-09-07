-- 课程系统示例数据
-- Education System Sample Data

-- 插入课程分类
INSERT INTO course_categories (name, description, icon, display_order) VALUES
('Blockchain Basics', '区块链基础知识和概念', 'Blocks', 1),
('Cryptocurrency', '加密货币交易和投资', 'Coins', 2),
('DeFi & Web3', '去中心化金融和Web3应用', 'Globe', 3),
('Trading Strategies', '交易策略和技术分析', 'TrendingUp', 4),
('NFT & Metaverse', 'NFT和元宇宙相关知识', 'Image', 5),
('Business & Marketing', '商业和营销策略', 'Briefcase', 6),
('Personal Development', '个人成长和技能提升', 'User', 7),
('Technology', '技术和开发相关', 'Code', 8);

-- 插入讲师信息
INSERT INTO course_instructors (name, email, bio, specialization, experience_years) VALUES
('Dr. Sarah Chen', 'sarah@beehive.edu', 'Blockchain researcher with 8+ years experience in cryptocurrency and DeFi protocols.', 'Blockchain Technology', 8),
('Michael Rodriguez', 'michael@beehive.edu', 'Former Wall Street trader turned crypto educator. Specialized in trading strategies and market analysis.', 'Trading & Investment', 12),
('Emily Wang', 'emily@beehive.edu', 'Web3 developer and entrepreneur. Expert in smart contracts and decentralized applications.', 'Web3 Development', 6),
('David Kumar', 'david@beehive.edu', 'Business strategist and marketing expert with focus on blockchain and crypto businesses.', 'Business Strategy', 10),
('Lisa Thompson', 'lisa@beehive.edu', 'Personal development coach specializing in financial literacy and wealth building.', 'Personal Finance', 15);

-- 获取分类ID (需要在实际环境中执行这些查询)
-- 为了示例，我们使用实际的UUID，在生产环境中应该动态获取

-- 插入课程数据 (Level 1-5 课程)

-- Level 1 课程 (免费入门课程)
INSERT INTO courses (title, description, category_id, required_level, price_bcc, course_type, duration, difficulty_level, video_url, is_published, published_at) VALUES
('Blockchain 101: What is Blockchain?', 
'Learn the fundamental concepts of blockchain technology, how it works, and why it matters in today''s digital economy.',
(SELECT id FROM course_categories WHERE name = 'Blockchain Basics'), 1, 0, 'video', '2 hours', 'beginner', 
'https://example.com/videos/blockchain-101', true, NOW()),

('Introduction to Cryptocurrency', 
'Understand what cryptocurrencies are, how they work, and the basics of Bitcoin, Ethereum, and other major cryptocurrencies.',
(SELECT id FROM course_categories WHERE name = 'Cryptocurrency'), 1, 0, 'video', '1.5 hours', 'beginner',
'https://example.com/videos/crypto-intro', true, NOW()),

('Setting Up Your First Crypto Wallet', 
'Step-by-step guide to creating and securing your first cryptocurrency wallet. Learn about different wallet types and security best practices.',
(SELECT id FROM course_categories WHERE name = 'Cryptocurrency'), 1, 0, 'video', '1 hour', 'beginner',
'https://example.com/videos/wallet-setup', true, NOW()),

('Financial Literacy Basics', 
'Essential financial concepts everyone should know. Learn about budgeting, saving, and building wealth.',
(SELECT id FROM course_categories WHERE name = 'Personal Development'), 1, 0, 'video', '3 hours', 'beginner',
'https://example.com/videos/financial-literacy', true, NOW());

-- Level 1-2 付费课程
INSERT INTO courses (title, description, category_id, required_level, price_bcc, course_type, duration, difficulty_level, video_url, is_published, published_at) VALUES
('Cryptocurrency Trading Fundamentals', 
'Learn the basics of cryptocurrency trading, including order types, reading charts, and managing risk.',
(SELECT id FROM course_categories WHERE name = 'Trading Strategies'), 1, 150, 'video', '4 hours', 'beginner',
'https://example.com/videos/trading-fundamentals', true, NOW()),

('Understanding DeFi: Decentralized Finance Explained', 
'Comprehensive introduction to DeFi protocols, liquidity mining, yield farming, and decentralized exchanges.',
(SELECT id FROM course_categories WHERE name = 'DeFi & Web3'), 2, 200, 'video', '5 hours', 'intermediate',
'https://example.com/videos/defi-explained', true, NOW()),

('NFT Creation and Marketing', 
'Learn how to create, mint, and market your own NFTs. Includes technical setup and marketing strategies.',
(SELECT id FROM course_categories WHERE name = 'NFT & Metaverse'), 2, 250, 'video', '6 hours', 'intermediate',
'https://example.com/videos/nft-creation', true, NOW());

-- Level 3+ 高级课程
INSERT INTO courses (title, description, category_id, required_level, price_bcc, course_type, duration, difficulty_level, zoom_meeting_id, zoom_password, scheduled_at, is_published, published_at) VALUES
('Advanced Trading Strategies & Technical Analysis', 
'Master advanced trading techniques, technical indicators, and risk management strategies for professional traders.',
(SELECT id FROM course_categories WHERE name = 'Trading Strategies'), 3, 500, 'online', '8 weeks', 'advanced',
'123-456-789', 'TradePro2024', NOW() + INTERVAL '7 days', true, NOW()),

('Smart Contract Development with Solidity', 
'Hands-on course for developing smart contracts on Ethereum. Learn Solidity programming and deploy your first DApp.',
(SELECT id FROM course_categories WHERE name = 'Technology'), 5, 800, 'online', '12 weeks', 'advanced',
'987-654-321', 'DevMaster2024', NOW() + INTERVAL '14 days', true, NOW()),

('Building a Successful Crypto Business', 
'Comprehensive business strategy course for launching and scaling a cryptocurrency or blockchain-based business.',
(SELECT id FROM course_categories WHERE name = 'Business & Marketing'), 5, 1000, 'online', '10 weeks', 'advanced',
'555-123-456', 'BizCrypto2024', NOW() + INTERVAL '21 days', true, NOW());

-- Level 10+ 专家级课程
INSERT INTO courses (title, description, category_id, required_level, price_bcc, course_type, duration, difficulty_level, zoom_meeting_id, zoom_password, scheduled_at, is_published, published_at) VALUES
('Institutional Crypto Investment Strategies', 
'Advanced portfolio management and institutional-grade investment strategies for high-net-worth individuals.',
(SELECT id FROM course_categories WHERE name = 'Trading Strategies'), 10, 2000, 'online', '6 weeks', 'advanced',
'111-222-333', 'Institutional2024', NOW() + INTERVAL '30 days', true, NOW()),

('Blockchain Architecture & Consensus Mechanisms', 
'Deep dive into blockchain architecture, consensus algorithms, and designing scalable blockchain systems.',
(SELECT id FROM course_categories WHERE name = 'Technology'), 15, 3000, 'online', '16 weeks', 'advanced',
'444-555-666', 'Architecture2024', NOW() + INTERVAL '45 days', true, NOW());

-- 插入课程模块 (为一些课程添加模块)
INSERT INTO course_modules (course_id, title, description, module_order, content_type, video_url, duration_minutes) VALUES
-- Blockchain 101 模块
((SELECT id FROM courses WHERE title = 'Blockchain 101: What is Blockchain?'), 'What is a Blockchain?', 'Introduction to blockchain concept and basic principles', 1, 'video', 'https://example.com/videos/blockchain-101-module1', 30),
((SELECT id FROM courses WHERE title = 'Blockchain 101: What is Blockchain?'), 'How Blockchain Works', 'Deep dive into how blockchain technology operates', 2, 'video', 'https://example.com/videos/blockchain-101-module2', 45),
((SELECT id FROM courses WHERE title = 'Blockchain 101: What is Blockchain?'), 'Blockchain Applications', 'Real-world applications and use cases', 3, 'video', 'https://example.com/videos/blockchain-101-module3', 25),
((SELECT id FROM courses WHERE title = 'Blockchain 101: What is Blockchain?'), 'Knowledge Check', 'Quiz to test your understanding', 4, 'quiz', null, 10);

-- Cryptocurrency Trading Fundamentals 模块
INSERT INTO course_modules (course_id, title, description, module_order, content_type, video_url, duration_minutes) VALUES
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), 'Market Basics', 'Understanding cryptocurrency markets and exchanges', 1, 'video', 'https://example.com/videos/trading-module1', 40),
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), 'Reading Charts', 'Technical analysis and chart patterns', 2, 'video', 'https://example.com/videos/trading-module2', 50),
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), 'Risk Management', 'Managing risk and position sizing', 3, 'video', 'https://example.com/videos/trading-module3', 45),
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), 'Trading Psychology', 'Mental aspects of successful trading', 4, 'video', 'https://example.com/videos/trading-module4', 35),
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), 'Final Assessment', 'Comprehensive trading quiz', 5, 'quiz', null, 20);

-- 关联讲师到课程
INSERT INTO course_instructor_relations (course_id, instructor_id, role) VALUES
((SELECT id FROM courses WHERE title = 'Blockchain 101: What is Blockchain?'), (SELECT id FROM course_instructors WHERE name = 'Dr. Sarah Chen'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Introduction to Cryptocurrency'), (SELECT id FROM course_instructors WHERE name = 'Dr. Sarah Chen'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Cryptocurrency Trading Fundamentals'), (SELECT id FROM course_instructors WHERE name = 'Michael Rodriguez'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Understanding DeFi: Decentralized Finance Explained'), (SELECT id FROM course_instructors WHERE name = 'Emily Wang'), 'instructor'),
((SELECT id FROM courses WHERE title = 'NFT Creation and Marketing'), (SELECT id FROM course_instructors WHERE name = 'Emily Wang'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Advanced Trading Strategies & Technical Analysis'), (SELECT id FROM course_instructors WHERE name = 'Michael Rodriguez'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Smart Contract Development with Solidity'), (SELECT id FROM course_instructors WHERE name = 'Emily Wang'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Building a Successful Crypto Business'), (SELECT id FROM course_instructors WHERE name = 'David Kumar'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Financial Literacy Basics'), (SELECT id FROM course_instructors WHERE name = 'Lisa Thompson'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Institutional Crypto Investment Strategies'), (SELECT id FROM course_instructors WHERE name = 'Michael Rodriguez'), 'instructor'),
((SELECT id FROM courses WHERE title = 'Blockchain Architecture & Consensus Mechanisms'), (SELECT id FROM course_instructors WHERE name = 'Dr. Sarah Chen'), 'instructor');

-- 添加一些课程公告
INSERT INTO course_announcements (course_id, title, content, announcement_type) VALUES
((SELECT id FROM courses WHERE title = 'Advanced Trading Strategies & Technical Analysis'), 'Course Starting Soon!', 'Get ready for an intensive 8-week journey into advanced trading strategies. Make sure you have completed the prerequisites and have your trading accounts ready.', 'general'),
((SELECT id FROM courses WHERE title = 'Smart Contract Development with Solidity'), 'Development Environment Setup', 'Please install the required development tools before the first class: VS Code, Node.js, and Hardhat. Setup instructions have been emailed to all enrolled students.', 'urgent');

-- 更新课程统计（这些通常会通过触发器或应用逻辑自动更新）
UPDATE courses SET total_enrollments = 0 WHERE total_enrollments IS NULL;
UPDATE courses SET average_rating = 0 WHERE average_rating IS NULL;