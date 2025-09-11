-- Test single advertisement NFT insert
DO $$ 
BEGIN
    INSERT INTO advertisement_nfts (
        title, description, image_url, price_usdt, price_bcc, category, 
        advertiser_wallet, click_url, impressions_target, impressions_current,
        is_active, starts_at, ends_at, metadata
    ) VALUES (
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
    );
    
    RAISE NOTICE 'Successfully inserted test advertisement NFT';
END $$;