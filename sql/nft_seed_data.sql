-- NFT Seed Data for Beehive Platform
-- This file populates the NFT-related tables with sample data

-- Start transaction for data consistency
BEGIN;

-- Insert NFT levels (1-19 membership levels)
INSERT INTO public.nft_levels (level, token_id, level_name, price_usdc, bcc_reward, unlock_layer, required_previous_level, max_supply, benefits, metadata_uri, is_active) VALUES
(1, 1, 'Warrior', 130.00, 130.00, 1, false, NULL, '["Matrix Activation", "BCC Token System", "Dashboard Access", "Education Center"]'::jsonb, 'https://metadata.beehive.com/nft/1', true),
(2, 2, 'Guardian', 150.00, 150.00, 2, true, NULL, '["Enhanced Matrix", "Advanced Tasks", "Premium Support", "Layer 2 Benefits"]'::jsonb, 'https://metadata.beehive.com/nft/2', true),
(3, 3, 'Knight', 200.00, 200.00, 3, true, NULL, '["Knight Privileges", "Exclusive NFTs", "Higher Rewards", "Priority Access"]'::jsonb, 'https://metadata.beehive.com/nft/3', true),
(4, 4, 'Champion', 250.00, 250.00, 4, true, NULL, '["Champion Status", "Special Events", "Enhanced Earnings", "VIP Community"]'::jsonb, 'https://metadata.beehive.com/nft/4', true),
(5, 5, 'Hero', 300.00, 300.00, 5, true, NULL, '["Hero Tier", "Advanced Analytics", "Custom Features", "Leadership Access"]'::jsonb, 'https://metadata.beehive.com/nft/5', true),
(6, 6, 'Elite', 350.00, 350.00, 6, true, NULL, '["Elite Membership", "Exclusive Events", "Maximum Rewards", "Beta Features"]'::jsonb, 'https://metadata.beehive.com/nft/6', true),
(7, 7, 'Master', 400.00, 400.00, 7, true, NULL, '["Master Level", "Teaching Access", "Community Leadership", "Advanced Tools"]'::jsonb, 'https://metadata.beehive.com/nft/7', true),
(8, 8, 'Grandmaster', 450.00, 450.00, 8, true, NULL, '["Grandmaster Tier", "Platform Governance", "Strategic Access", "Legacy Benefits"]'::jsonb, 'https://metadata.beehive.com/nft/8', true),
(9, 9, 'Legend', 500.00, 500.00, 9, true, NULL, '["Legend Status", "Historical Rewards", "Permanent Benefits", "Hall of Fame"]'::jsonb, 'https://metadata.beehive.com/nft/9', true),
(10, 10, 'Epic', 550.00, 550.00, 10, true, NULL, '["Epic Achievement", "Cross-Platform Access", "Ultimate Rewards", "Legendary Status"]'::jsonb, 'https://metadata.beehive.com/nft/10', true),
(11, 11, 'Mythic', 600.00, 600.00, 11, true, NULL, '["Mythic Powers", "Reality Shaping", "Infinite Potential", "Divine Access"]'::jsonb, 'https://metadata.beehive.com/nft/11', true),
(12, 12, 'Divine', 650.00, 650.00, 12, true, NULL, '["Divine Authority", "Creation Rights", "Universal Access", "Godlike Benefits"]'::jsonb, 'https://metadata.beehive.com/nft/12', true),
(13, 13, 'Celestial', 700.00, 700.00, 13, true, NULL, '["Celestial Realm", "Stellar Powers", "Cosmic Rewards", "Heaven Access"]'::jsonb, 'https://metadata.beehive.com/nft/13', true),
(14, 14, 'Transcendent', 750.00, 750.00, 14, true, NULL, '["Beyond Reality", "Transcendental Access", "Higher Dimensions", "Limitless Power"]'::jsonb, 'https://metadata.beehive.com/nft/14', true),
(15, 15, 'Infinite', 800.00, 800.00, 15, true, NULL, '["Infinite Possibilities", "Boundless Rewards", "Eternal Benefits", "Timeless Access"]'::jsonb, 'https://metadata.beehive.com/nft/15', true),
(16, 16, 'Eternal', 850.00, 850.00, 16, true, NULL, '["Eternal Existence", "Perpetual Rewards", "Immortal Status", "Forever Benefits"]'::jsonb, 'https://metadata.beehive.com/nft/16', true),
(17, 17, 'Omnipotent', 900.00, 900.00, 17, true, NULL, '["All-Powerful", "Ultimate Control", "Maximum Authority", "Supreme Access"]'::jsonb, 'https://metadata.beehive.com/nft/17', true),
(18, 18, 'Supreme', 950.00, 950.00, 18, true, NULL, '["Supreme Ruler", "Final Authority", "Ultimate Dominion", "Peak Status"]'::jsonb, 'https://metadata.beehive.com/nft/18', true),
(19, 19, 'Mythic Peak', 1000.00, 1000.00, 19, true, NULL, '["Mythic Peak", "Absolute Pinnacle", "Ultimate Achievement", "Perfect Status"]'::jsonb, 'https://metadata.beehive.com/nft/19', true);

-- Insert Advertisement NFTs (Web3 Services)
INSERT INTO public.advertisement_nfts (id, title, description, image_url, price_usdt, price_bcc, category, advertiser_wallet, click_url, impressions_target, is_active, starts_at, ends_at, metadata) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'DeFi Lending Protocol', 'Earn up to 15% APY on your crypto holdings with our secure DeFi lending platform', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400', 50.00, 50.00, 'DeFi', NULL, 'https://defilend.example.com', 10000, true, now(), now() + interval '30 days', '{"featured": true, "verified": true}'::jsonb),
('550e8400-e29b-41d4-a716-446655440002', 'NFT Marketplace Pro', 'Trade NFTs with zero gas fees on our Layer 2 marketplace', 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=400', 30.00, 30.00, 'NFT', NULL, 'https://nftpro.example.com', 8000, true, now(), now() + interval '45 days', '{"category": "marketplace", "chain": "polygon"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440003', 'Web3 Gaming Platform', 'Play-to-earn games with real rewards and NFT collectibles', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 75.00, 75.00, 'Gaming', NULL, 'https://web3games.example.com', 15000, true, now(), now() + interval '60 days', '{"genre": "RPG", "blockchain": "ethereum"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440004', 'Crypto Trading Bot', 'Automated trading strategies with AI-powered market analysis', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400', 100.00, 100.00, 'Trading', NULL, 'https://cryptobot.example.com', 5000, true, now(), now() + interval '90 days', '{"ai_powered": true, "success_rate": "85%"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440005', 'DAO Governance Tool', 'Participate in decentralized governance with advanced voting mechanisms', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400', 40.00, 40.00, 'DAO', NULL, 'https://daogov.example.com', 7000, true, now(), now() + interval '30 days', '{"governance": "quadratic", "privacy": "zero_knowledge"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440006', 'Metaverse Land Exchange', 'Buy, sell, and develop virtual real estate in multiple metaverses', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400', 150.00, 150.00, 'Metaverse', NULL, 'https://metaland.example.com', 12000, true, now(), now() + interval '120 days', '{"worlds": ["decentraland", "sandbox"], "3d": true}'::jsonb),
('550e8400-e29b-41d4-a716-446655440007', 'Yield Farming Optimizer', 'Maximize your DeFi yields with our automated farming strategies', 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400', 60.00, 60.00, 'DeFi', NULL, 'https://yieldmax.example.com', 6000, true, now(), now() + interval '45 days', '{"apy_optimization": true, "risk_management": "advanced"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440008', 'Cross-Chain Bridge', 'Seamlessly transfer assets across different blockchain networks', 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400', 35.00, 35.00, 'Infrastructure', NULL, 'https://bridge.example.com', 9000, true, now(), now() + interval '60 days', '{"chains": ["ethereum", "polygon", "bsc"], "instant": true}'::jsonb);

-- Insert Merchant NFTs (Physical/Digital Services)
INSERT INTO public.merchant_nfts (id, title, description, image_url, price_usdt, price_bcc, category, supply_total, supply_available, creator_wallet, metadata) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Premium Web3 Course Bundle', 'Complete Web3 development course with hands-on projects and certification', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400', 200.00, 200.00, 'Education', 100, 100, NULL, '{"duration": "40 hours", "includes": ["NFT", "DeFi", "Smart Contracts"], "certification": true}'::jsonb),
('660e8400-e29b-41d4-a716-446655440002', 'Blockchain Consulting Package', '1-hour consultation with blockchain experts for your project', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400', 300.00, 300.00, 'Consulting', 50, 50, NULL, '{"duration": "1 hour", "expertise": ["tokenomics", "architecture", "security"]}'::jsonb),
('660e8400-e29b-41d4-a716-446655440003', 'Smart Contract Audit', 'Professional security audit for your smart contracts', 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400', 500.00, 500.00, 'Security', 25, 25, NULL, '{"turnaround": "7 days", "comprehensive": true, "report_included": true}'::jsonb),
('660e8400-e29b-41d4-a716-446655440004', 'Custom NFT Collection', 'Design and deploy your unique NFT collection with metadata', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', 800.00, 800.00, 'Design', 20, 20, NULL, '{"collection_size": "10000", "metadata": true, "reveal_mechanism": true}'::jsonb),
('660e8400-e29b-41d4-a716-446655440005', 'DeFi Protocol Development', 'Complete DeFi protocol development from concept to deployment', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400', 2000.00, 2000.00, 'Development', 10, 10, NULL, '{"includes": ["smart_contracts", "frontend", "testing"], "timeline": "8 weeks"}'::jsonb),
('660e8400-e29b-41d4-a716-446655440006', 'Web3 Marketing Campaign', 'Complete marketing campaign for your Web3 project launch', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', 1500.00, 1500.00, 'Marketing', 15, 15, NULL, '{"duration": "30 days", "channels": ["twitter", "discord", "telegram"], "influencers": true}'::jsonb),
('660e8400-e29b-41d4-a716-446655440007', 'Tokenomics Design Service', 'Professional tokenomics design and economic modeling', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400', 1000.00, 1000.00, 'Economics', 30, 30, NULL, '{"includes": ["token_model", "vesting", "distribution"], "simulation": true}'::jsonb),
('660e8400-e29b-41d4-a716-446655440008', 'DAO Setup Package', 'Complete DAO setup with governance tokens and voting mechanisms', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400', 1200.00, 1200.00, 'Governance', 12, 12, NULL, '{"voting_types": ["token", "nft"], "treasury": true, "multisig": true}'::jsonb);

-- Update table statistics
ANALYZE public.nft_levels;
ANALYZE public.advertisement_nfts;
ANALYZE public.merchant_nfts;

COMMIT;

-- Verify data insertion
SELECT 'NFT Levels Count:', COUNT(*) FROM public.nft_levels;
SELECT 'Advertisement NFTs Count:', COUNT(*) FROM public.advertisement_nfts;
SELECT 'Merchant NFTs Count:', COUNT(*) FROM public.merchant_nfts;

-- Display summary
SELECT 
  'Summary:' as info,
  (SELECT COUNT(*) FROM public.nft_levels) as membership_levels,
  (SELECT COUNT(*) FROM public.advertisement_nfts) as advertisement_nfts,
  (SELECT COUNT(*) FROM public.merchant_nfts) as merchant_nfts;