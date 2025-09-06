-- Sequential NFT Purchase Validation Database Constraints
-- Ensures users cannot skip levels and maintains data integrity

-- Create function to validate sequential NFT purchases
CREATE OR REPLACE FUNCTION validate_sequential_nft_purchase()
RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    missing_level INTEGER;
BEGIN
    -- Get member data
    SELECT current_level, levels_owned, is_activated
    INTO member_record
    FROM members 
    WHERE wallet_address = NEW.wallet_address;
    
    -- For new users (no member record), only allow Level 1
    IF NOT FOUND THEN
        IF NEW.nft_level != 1 THEN
            RAISE EXCEPTION 'New users must start with NFT Level 1. Attempted level: %', NEW.nft_level
                USING ERRCODE = 'check_violation',
                      HINT = 'Purchase Level 1 first to begin your NFT journey';
        END IF;
        RETURN NEW;
    END IF;
    
    -- Check if user already owns this level
    IF member_record.levels_owned @> ARRAY[NEW.nft_level] THEN
        RAISE EXCEPTION 'User already owns NFT Level %. Each level can only be purchased once.', NEW.nft_level
            USING ERRCODE = 'unique_violation',
                  HINT = 'Choose a different level that you do not already own';
    END IF;
    
    -- Check sequential upgrade requirement (cannot skip levels)
    IF NEW.nft_level > COALESCE(member_record.current_level, 0) + 1 THEN
        RAISE EXCEPTION 'Sequential upgrade required. Cannot skip from Level % to Level %. Next available: Level %', 
            COALESCE(member_record.current_level, 0), 
            NEW.nft_level, 
            COALESCE(member_record.current_level, 0) + 1
            USING ERRCODE = 'check_violation',
                  HINT = 'NFT levels must be purchased sequentially';
    END IF;
    
    -- Verify all prerequisite levels are owned
    FOR missing_level IN 1..(NEW.nft_level - 1) LOOP
        IF NOT (member_record.levels_owned @> ARRAY[missing_level]) THEN
            RAISE EXCEPTION 'Missing prerequisite: Must own NFT Level % before purchasing Level %', 
                missing_level, NEW.nft_level
                USING ERRCODE = 'check_violation',
                      HINT = 'Purchase all lower levels first';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for nft_purchases table
DROP TRIGGER IF EXISTS validate_nft_purchase_sequence ON nft_purchases;
CREATE TRIGGER validate_nft_purchase_sequence
    BEFORE INSERT ON nft_purchases
    FOR EACH ROW
    EXECUTE FUNCTION validate_sequential_nft_purchase();

-- Create trigger for orders table (NFT purchases)
DROP TRIGGER IF EXISTS validate_nft_order_sequence ON orders;
CREATE TRIGGER validate_nft_order_sequence
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_type = 'nft_purchase' AND NEW.metadata->>'level' IS NOT NULL)
    EXECUTE FUNCTION validate_sequential_nft_purchase_orders();

-- Create specialized function for orders table
CREATE OR REPLACE FUNCTION validate_sequential_nft_purchase_orders()
RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    nft_level INTEGER;
    missing_level INTEGER;
BEGIN
    -- Extract level from metadata
    nft_level := (NEW.metadata->>'level')::INTEGER;
    
    IF nft_level IS NULL THEN
        RETURN NEW; -- Skip validation if no level specified
    END IF;
    
    -- Get member data
    SELECT current_level, levels_owned, is_activated
    INTO member_record
    FROM members 
    WHERE wallet_address = NEW.wallet_address;
    
    -- For new users (no member record), only allow Level 1
    IF NOT FOUND THEN
        IF nft_level != 1 THEN
            RAISE EXCEPTION 'New users must start with NFT Level 1. Attempted level: %', nft_level
                USING ERRCODE = 'check_violation',
                      HINT = 'Purchase Level 1 first to begin your NFT journey';
        END IF;
        RETURN NEW;
    END IF;
    
    -- Check if user already owns this level
    IF member_record.levels_owned @> ARRAY[nft_level] THEN
        RAISE EXCEPTION 'User already owns NFT Level %. Each level can only be purchased once.', nft_level
            USING ERRCODE = 'unique_violation',
                  HINT = 'Choose a different level that you do not already own';
    END IF;
    
    -- Check sequential upgrade requirement (cannot skip levels)
    IF nft_level > COALESCE(member_record.current_level, 0) + 1 THEN
        RAISE EXCEPTION 'Sequential upgrade required. Cannot skip from Level % to Level %. Next available: Level %', 
            COALESCE(member_record.current_level, 0), 
            nft_level, 
            COALESCE(member_record.current_level, 0) + 1
            USING ERRCODE = 'check_violation',
                  HINT = 'NFT levels must be purchased sequentially';
    END IF;
    
    -- Verify all prerequisite levels are owned
    FOR missing_level IN 1..(nft_level - 1) LOOP
        IF NOT (member_record.levels_owned @> ARRAY[missing_level]) THEN
            RAISE EXCEPTION 'Missing prerequisite: Must own NFT Level % before purchasing Level %', 
                missing_level, nft_level
                USING ERRCODE = 'check_violation',
                      HINT = 'Purchase all lower levels first';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to prevent duplicate level ownership
-- Note: This assumes levels_owned is properly maintained
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_wallet_nft_level 
ON nft_purchases (wallet_address, nft_level) 
WHERE status = 'completed';

-- Add check constraint for valid NFT levels (1-19 as per marketing plan)
ALTER TABLE nft_purchases 
DROP CONSTRAINT IF EXISTS check_valid_nft_level;

ALTER TABLE nft_purchases 
ADD CONSTRAINT check_valid_nft_level 
CHECK (nft_level >= 1 AND nft_level <= 19);

-- Add similar constraint for orders table
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS check_valid_order_nft_level;

ALTER TABLE orders 
ADD CONSTRAINT check_valid_order_nft_level 
CHECK (
    order_type != 'nft_purchase' OR 
    (metadata->>'level')::INTEGER IS NULL OR 
    ((metadata->>'level')::INTEGER >= 1 AND (metadata->>'level')::INTEGER <= 19)
);

-- Create index for better performance on sequential validation queries
CREATE INDEX IF NOT EXISTS idx_members_sequential_validation 
ON members (wallet_address, current_level, is_activated) 
INCLUDE (levels_owned);

-- Add comment for documentation
COMMENT ON FUNCTION validate_sequential_nft_purchase() IS 
'Enforces sequential NFT purchase rules: users must own lower levels before upgrading to higher levels, prevents duplicate purchases, and ensures data integrity at the database level.';

COMMENT ON FUNCTION validate_sequential_nft_purchase_orders() IS 
'Enforces sequential NFT purchase rules for the orders table when order_type is nft_purchase.';