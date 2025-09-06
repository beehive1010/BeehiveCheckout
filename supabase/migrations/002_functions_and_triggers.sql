-- =============================================
-- Beehive Platform - Database Functions and Triggers
-- Supabase Migration - Functions and Triggers
-- =============================================

-- =============================================
-- Utility Functions
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate wallet address format
CREATE OR REPLACE FUNCTION public.is_valid_wallet_address(address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN address ~ '^0x[a-fA-F0-9]{40}$';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Matrix Management Functions
-- =============================================

-- Function to find next available matrix position
CREATE OR REPLACE FUNCTION public.find_next_matrix_position(
    p_root_wallet VARCHAR(42),
    p_layer INTEGER
)
RETURNS TABLE(matrix_position TEXT, parent_wallet VARCHAR(42)) AS $$
DECLARE
    positions_per_layer INTEGER;
    existing_positions INTEGER;
    next_position TEXT;
    parent_addr VARCHAR(42);
BEGIN
    -- Calculate positions per layer: 3^layer
    positions_per_layer := POWER(3, p_layer);
    
    -- Count existing positions in this layer
    SELECT COUNT(*) INTO existing_positions
    FROM public.referrals
    WHERE root_wallet = p_root_wallet AND layer = p_layer;
    
    -- If layer is full, return null
    IF existing_positions >= positions_per_layer THEN
        RETURN;
    END IF;
    
    -- Generate position string based on layer
    IF p_layer = 1 THEN
        -- Layer 1: L, M, R
        CASE existing_positions
            WHEN 0 THEN next_position := 'L';
            WHEN 1 THEN next_position := 'M';
            WHEN 2 THEN next_position := 'R';
        END CASE;
        parent_addr := p_root_wallet;
    ELSE
        -- Deeper layers: find parent and generate position
        -- This is simplified - actual implementation would be more complex
        next_position := 'L'; -- Placeholder
        parent_addr := p_root_wallet; -- Placeholder
    END IF;
    
    RETURN QUERY SELECT next_position as matrix_position, parent_addr;
END;
$$ LANGUAGE plpgsql;

-- Function to place member in matrix
CREATE OR REPLACE FUNCTION public.place_member_in_matrix(
    p_root_wallet VARCHAR(42),
    p_member_wallet VARCHAR(42),
    p_placer_wallet VARCHAR(42),
    p_placement_type TEXT DEFAULT 'direct'
)
RETURNS JSONB AS $$
DECLARE
    current_layer INTEGER := 1;
    placement_result RECORD;
    result JSONB;
BEGIN
    -- Find available position starting from layer 1
    WHILE current_layer <= 19 LOOP
        SELECT * INTO placement_result
        FROM public.find_next_matrix_position(p_root_wallet, current_layer);
        
        IF placement_result.position IS NOT NULL THEN
            -- Insert into referrals table
            INSERT INTO public.referrals (
                root_wallet,
                member_wallet,
                layer,
                position,
                parent_wallet,
                placer_wallet,
                placement_type,
                is_active,
                created_at
            ) VALUES (
                p_root_wallet,
                p_member_wallet,
                current_layer,
                placement_result.position,
                placement_result.parent_wallet,
                p_placer_wallet,
                p_placement_type,
                true,
                NOW()
            );
            
            -- Log matrix activity
            INSERT INTO public.matrix_activity_log (
                root_wallet,
                member_wallet,
                activity_type,
                layer,
                position,
                details,
                created_at
            ) VALUES (
                p_root_wallet,
                p_member_wallet,
                'placement',
                current_layer,
                placement_result.position,
                jsonb_build_object(
                    'placer_wallet', p_placer_wallet,
                    'placement_type', p_placement_type
                ),
                NOW()
            );
            
            result := jsonb_build_object(
                'success', true,
                'layer', current_layer,
                'position', placement_result.position,
                'parent_wallet', placement_result.parent_wallet
            );
            
            RETURN result;
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- If no position found in any layer
    result := jsonb_build_object(
        'success', false,
        'error', 'No available positions in matrix'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update matrix layer summaries
CREATE OR REPLACE FUNCTION public.update_matrix_layer_summary(
    p_root_wallet VARCHAR(42),
    p_layer INTEGER
)
RETURNS VOID AS $$
DECLARE
    total_pos INTEGER;
    filled_pos INTEGER;
    active_count INTEGER;
    completion_rate DECIMAL(5,2);
BEGIN
    -- Calculate positions for this layer
    total_pos := POWER(3, p_layer);
    
    -- Count filled positions
    SELECT COUNT(*) INTO filled_pos
    FROM public.referrals
    WHERE root_wallet = p_root_wallet AND layer = p_layer;
    
    -- Count active members
    SELECT COUNT(*) INTO active_count
    FROM public.referrals r
    JOIN public.members m ON r.member_wallet = m.wallet_address
    WHERE r.root_wallet = p_root_wallet 
      AND r.layer = p_layer 
      AND m.is_activated = true;
    
    -- Calculate completion rate
    completion_rate := CASE 
        WHEN total_pos > 0 THEN (filled_pos::DECIMAL / total_pos) * 100
        ELSE 0 
    END;
    
    -- Insert or update summary
    INSERT INTO public.matrix_layer_summary (
        root_wallet,
        layer,
        total_positions,
        filled_positions,
        active_members,
        layer_completion_rate,
        last_updated
    ) VALUES (
        p_root_wallet,
        p_layer,
        total_pos,
        filled_pos,
        active_count,
        completion_rate,
        NOW()
    )
    ON CONFLICT (root_wallet, layer)
    DO UPDATE SET
        total_positions = EXCLUDED.total_positions,
        filled_positions = EXCLUDED.filled_positions,
        active_members = EXCLUDED.active_members,
        layer_completion_rate = EXCLUDED.layer_completion_rate,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Reward Distribution Functions
-- =============================================

-- Function to distribute layer rewards
CREATE OR REPLACE FUNCTION public.distribute_layer_rewards(
    p_payer_wallet VARCHAR(42),
    p_amount_usdt DECIMAL(18,6),
    p_nft_level INTEGER,
    p_source_transaction_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    reward_record RECORD;
    total_distributed DECIMAL(18,6) := 0;
    distribution_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Find all eligible recipients in the upline
    FOR reward_record IN
        SELECT DISTINCT r.root_wallet as recipient,
               r.layer,
               'matrix' as reward_type
        FROM public.referrals r
        JOIN public.members m ON r.root_wallet = m.wallet_address
        WHERE r.member_wallet = p_payer_wallet
          AND r.layer <= p_nft_level -- Only distribute to unlocked layers
          AND m.is_activated = true
          AND m.current_level >= r.layer -- Recipient must have required NFT level
        ORDER BY r.layer
    LOOP
        -- Calculate reward amount (simplified - actual logic would be more complex)
        DECLARE
            reward_amount DECIMAL(18,6);
        BEGIN
            reward_amount := p_amount_usdt * 0.05; -- 5% per layer (simplified)
            
            -- Insert reward record
            INSERT INTO public.layer_rewards (
                recipient_wallet,
                payer_wallet,
                layer,
                reward_type,
                amount_usdt,
                source_transaction_id,
                nft_level,
                is_claimed,
                created_at
            ) VALUES (
                reward_record.recipient,
                p_payer_wallet,
                reward_record.layer,
                reward_record.reward_type,
                reward_amount,
                p_source_transaction_id,
                p_nft_level,
                false,
                NOW()
            );
            
            -- Update recipient's pending rewards
            UPDATE public.user_balances
            SET pending_upgrade_rewards = pending_upgrade_rewards + reward_amount,
                updated_at = NOW()
            WHERE wallet_address = reward_record.recipient;
            
            total_distributed := total_distributed + reward_amount;
            distribution_count := distribution_count + 1;
        END;
    END LOOP;
    
    result := jsonb_build_object(
        'success', true,
        'total_distributed', total_distributed,
        'distribution_count', distribution_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to claim pending rewards
CREATE OR REPLACE FUNCTION public.claim_pending_rewards(
    p_wallet_address VARCHAR(42)
)
RETURNS JSONB AS $$
DECLARE
    total_pending DECIMAL(18,6);
    claim_count INTEGER;
    result JSONB;
BEGIN
    -- Get total unclaimed rewards
    SELECT COALESCE(SUM(amount_usdt), 0), COUNT(*)
    INTO total_pending, claim_count
    FROM public.layer_rewards
    WHERE recipient_wallet = p_wallet_address AND is_claimed = false;
    
    IF total_pending > 0 THEN
        -- Mark rewards as claimed
        UPDATE public.layer_rewards
        SET is_claimed = true,
            claimed_at = NOW()
        WHERE recipient_wallet = p_wallet_address AND is_claimed = false;
        
        -- Update user balance
        UPDATE public.user_balances
        SET total_usdt_earned = total_usdt_earned + total_pending,
            pending_upgrade_rewards = 0,
            rewards_claimed = rewards_claimed + total_pending,
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;
        
        result := jsonb_build_object(
            'success', true,
            'amount_claimed', total_pending,
            'rewards_count', claim_count
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'error', 'No pending rewards to claim'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BCC Token Management Functions
-- =============================================

-- Function to process BCC purchase
CREATE OR REPLACE FUNCTION public.process_bcc_purchase(
    p_order_id VARCHAR(100),
    p_amount_received DECIMAL(18,6)
)
RETURNS JSONB AS $$
DECLARE
    order_record RECORD;
    bcc_amount DECIMAL(18,8);
    result JSONB;
BEGIN
    -- Get order details
    SELECT * INTO order_record
    FROM public.bcc_purchase_orders
    WHERE order_id = p_order_id AND status = 'pending';
    
    IF order_record.order_id IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Order not found or already processed'
        );
        RETURN result;
    END IF;
    
    -- Check if order expired
    IF NOW() > order_record.expires_at THEN
        UPDATE public.bcc_purchase_orders
        SET status = 'expired', updated_at = NOW()
        WHERE order_id = p_order_id;
        
        result := jsonb_build_object(
            'success', false,
            'error', 'Order has expired'
        );
        RETURN result;
    END IF;
    
    -- Calculate BCC amount
    bcc_amount := p_amount_received * order_record.exchange_rate;
    
    -- Update order status
    UPDATE public.bcc_purchase_orders
    SET status = 'completed',
        actual_amount_received = p_amount_received,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;
    
    -- Credit BCC to user's balance
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        total_usdt_earned,
        pending_upgrade_rewards,
        rewards_claimed,
        created_at,
        updated_at
    ) VALUES (
        order_record.buyer_wallet,
        bcc_amount,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address)
    DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + bcc_amount,
        updated_at = NOW();
    
    result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'amount_usdc', p_amount_received,
        'amount_bcc', bcc_amount,
        'buyer_wallet', order_record.buyer_wallet
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to spend BCC tokens
CREATE OR REPLACE FUNCTION public.spend_bcc_tokens(
    p_wallet_address VARCHAR(42),
    p_amount_bcc DECIMAL(18,8),
    p_item_type TEXT,
    p_item_id UUID,
    p_transaction_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    current_balance DECIMAL(18,8);
    result JSONB;
BEGIN
    -- Get current balance
    SELECT bcc_transferable INTO current_balance
    FROM public.user_balances
    WHERE wallet_address = p_wallet_address;
    
    IF current_balance IS NULL OR current_balance < p_amount_bcc THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Insufficient BCC balance',
            'required', p_amount_bcc,
            'available', COALESCE(current_balance, 0)
        );
        RETURN result;
    END IF;
    
    -- Deduct BCC from balance
    UPDATE public.user_balances
    SET bcc_transferable = bcc_transferable - p_amount_bcc,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- Create purchase record based on item type
    IF p_item_type IN ('merchant_nft', 'advertisement_nft') THEN
        INSERT INTO public.nft_purchases (
            id,
            buyer_wallet,
            nft_id,
            nft_type,
            price_usdt,
            price_bcc,
            payment_method,
            status,
            purchased_at,
            metadata
        ) VALUES (
            uuid_generate_v4(),
            p_wallet_address,
            p_item_id,
            p_item_type,
            0,
            p_amount_bcc,
            'bcc_tokens',
            'completed',
            NOW(),
            jsonb_build_object('transaction_id', p_transaction_id)
        );
    ELSIF p_item_type = 'course' THEN
        INSERT INTO public.course_activations (
            wallet_address,
            course_id,
            activation_type,
            activated_at,
            expires_at,
            metadata
        ) VALUES (
            p_wallet_address,
            p_item_id,
            'bcc_purchase',
            NOW(),
            NOW() + INTERVAL '1 year',
            jsonb_build_object('transaction_id', p_transaction_id, 'amount_paid', p_amount_bcc)
        );
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'amount_spent', p_amount_bcc,
        'remaining_balance', current_balance - p_amount_bcc
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- User Management Functions
-- =============================================

-- Function to create or update user
CREATE OR REPLACE FUNCTION public.upsert_user(
    p_wallet_address VARCHAR(42),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE wallet_address = p_wallet_address)
    INTO user_exists;
    
    IF user_exists THEN
        -- Update existing user
        UPDATE public.users
        SET username = COALESCE(p_username, username),
            email = COALESCE(p_email, email),
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;
        
        result := jsonb_build_object(
            'success', true,
            'action', 'updated',
            'wallet_address', p_wallet_address
        );
    ELSE
        -- Create new user
        INSERT INTO public.users (
            wallet_address,
            referrer_wallet,
            username,
            email,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            p_referrer_wallet,
            p_username,
            p_email,
            NOW(),
            NOW()
        );
        
        -- Create initial member record
        INSERT INTO public.members (
            wallet_address,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            NOW(),
            NOW()
        );
        
        -- Create initial balance record
        INSERT INTO public.user_balances (
            wallet_address,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            NOW(),
            NOW()
        );
        
        result := jsonb_build_object(
            'success', true,
            'action', 'created',
            'wallet_address', p_wallet_address
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Triggers for updated_at timestamps
-- =============================================

-- Users table trigger
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Members table trigger
CREATE TRIGGER trigger_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- User balances trigger
CREATE TRIGGER trigger_user_balances_updated_at
    BEFORE UPDATE ON public.user_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BCC purchase orders trigger
CREATE TRIGGER trigger_bcc_purchase_orders_updated_at
    BEFORE UPDATE ON public.bcc_purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Merchant NFTs trigger
CREATE TRIGGER trigger_merchant_nfts_updated_at
    BEFORE UPDATE ON public.merchant_nfts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Advertisement NFTs trigger
CREATE TRIGGER trigger_advertisement_nfts_updated_at
    BEFORE UPDATE ON public.advertisement_nfts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Courses trigger
CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Blog posts trigger
CREATE TRIGGER trigger_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Trigger for matrix updates
-- =============================================

-- Trigger to update matrix summaries when referrals change
CREATE OR REPLACE FUNCTION public.trigger_update_matrix_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update matrix summary for the affected layer
    PERFORM public.update_matrix_layer_summary(
        CASE WHEN TG_OP = 'DELETE' THEN OLD.root_wallet ELSE NEW.root_wallet END,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.layer ELSE NEW.layer END
    );
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referrals_matrix_summary
    AFTER INSERT OR UPDATE OR DELETE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_matrix_summary();

-- End of functions and triggers migration