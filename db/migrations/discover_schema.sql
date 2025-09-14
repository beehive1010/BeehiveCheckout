-- Discover DApps Database Schema
-- 发现DApps数据库结构

-- DApp Categories Table
CREATE TABLE dapp_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- lucide icon name
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DApps Table
CREATE TABLE dapps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES dapp_categories(id),
    
    -- Basic Information
    logo_url TEXT,
    website_url TEXT NOT NULL,
    app_url TEXT, -- Direct app access URL
    
    -- Access Control
    required_level INTEGER NOT NULL DEFAULT 1, -- Required membership level
    is_premium BOOLEAN DEFAULT false, -- Premium members only
    
    -- DApp Details
    blockchain_networks TEXT[], -- Supported networks: ['ethereum', 'polygon', 'arbitrum', 'bsc']
    total_value_locked BIGINT DEFAULT 0, -- TVL in USD cents
    daily_active_users INTEGER DEFAULT 0,
    
    -- Features
    features TEXT[], -- ['swapping', 'lending', 'staking', 'gaming', 'nft']
    supported_tokens TEXT[], -- ['ETH', 'USDC', 'USDT', 'BTC']
    
    -- Ratings and Reviews
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated')),
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    
    -- SEO and Metadata
    tags TEXT[], -- Search tags
    metadata JSONB DEFAULT '{}', -- Additional metadata
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DApp Reviews Table
CREATE TABLE dapp_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dapp_id UUID NOT NULL REFERENCES dapps(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    
    -- Review Status
    is_verified BOOLEAN DEFAULT false, -- Verified user review
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dapp_id, wallet_address) -- One review per user per DApp
);

-- User DApp Interactions Table
CREATE TABLE user_dapp_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    dapp_id UUID NOT NULL REFERENCES dapps(id),
    
    -- Interaction Data
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'favorite', 'use'
    interaction_count INTEGER DEFAULT 1,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Favorites
    is_favorite BOOLEAN DEFAULT false,
    favorited_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wallet_address, dapp_id, interaction_type)
);

-- DApp Analytics Table
CREATE TABLE dapp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dapp_id UUID NOT NULL REFERENCES dapps(id),
    
    -- Analytics Data
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    
    -- Calculated Metrics
    click_through_rate DECIMAL(5,4) DEFAULT 0, -- CTR percentage
    engagement_score DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dapp_id, date)
);

-- Create indexes for better query performance
CREATE INDEX idx_dapps_category ON dapps(category_id);
CREATE INDEX idx_dapps_required_level ON dapps(required_level);
CREATE INDEX idx_dapps_status ON dapps(status);
CREATE INDEX idx_dapps_is_featured ON dapps(is_featured);
CREATE INDEX idx_dapps_blockchain_networks ON dapps USING GIN(blockchain_networks);
CREATE INDEX idx_dapps_features ON dapps USING GIN(features);
CREATE INDEX idx_dapps_tags ON dapps USING GIN(tags);
CREATE INDEX idx_dapps_average_rating ON dapps(average_rating);

CREATE INDEX idx_dapp_reviews_dapp ON dapp_reviews(dapp_id);
CREATE INDEX idx_dapp_reviews_wallet ON dapp_reviews(wallet_address);
CREATE INDEX idx_dapp_reviews_rating ON dapp_reviews(rating);

CREATE INDEX idx_user_dapp_interactions_wallet ON user_dapp_interactions(wallet_address);
CREATE INDEX idx_user_dapp_interactions_dapp ON user_dapp_interactions(dapp_id);
CREATE INDEX idx_user_dapp_interactions_type ON user_dapp_interactions(interaction_type);
CREATE INDEX idx_user_dapp_interactions_favorite ON user_dapp_interactions(is_favorite);

CREATE INDEX idx_dapp_analytics_dapp_date ON dapp_analytics(dapp_id, date);
CREATE INDEX idx_dapp_analytics_date ON dapp_analytics(date);

-- Create triggers for updated_at columns
CREATE TRIGGER update_dapp_categories_updated_at 
    BEFORE UPDATE ON dapp_categories 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_dapps_updated_at 
    BEFORE UPDATE ON dapps 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_dapp_reviews_updated_at 
    BEFORE UPDATE ON dapp_reviews 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_dapp_interactions_updated_at 
    BEFORE UPDATE ON user_dapp_interactions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_dapp_analytics_updated_at 
    BEFORE UPDATE ON dapp_analytics 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();