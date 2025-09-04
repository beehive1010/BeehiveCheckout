-- Clean Matrix System and USDT Rewards Implementation
-- 修复矩阵系统和USDT奖励机制 - 使用实际的数据库表结构

-- 1. 创建矩阵位置查询视图（支持19层）
DROP VIEW IF EXISTS user_matrix_positions CASCADE;

CREATE VIEW user_matrix_positions AS
SELECT DISTINCT
    r.root_wallet,
    r.member_wallet,
    r.layer,
    r."position",
    r.is_active,
    r.placed_at,
    -- 用户信息
    u.username,
    COALESCE(m.current_level, 0) as member_level,
    COALESCE(m.is_activated, false) as is_activated,
    -- 计算填充率
    CASE 
        WHEN r.layer <= 19 THEN 
            (SELECT COUNT(*) FROM referrals r2 
             WHERE r2.root_wallet = r.root_wallet 
             AND r2.layer = r.layer 
             AND r2.is_active = true) 
        ELSE 0 
    END as layer_fill_count,
    CASE 
        WHEN r.layer <= 19 THEN POWER(3, r.layer)::INTEGER
        ELSE 0 
    END as layer_capacity
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.layer BETWEEN 1 AND 19
ORDER BY r.root_wallet, r.layer, r."position";

-- 2. 创建矩阵汇总视图
DROP VIEW IF EXISTS user_matrix_summary CASCADE;

CREATE VIEW user_matrix_summary AS
SELECT 
    r.root_wallet,
    root_user.username as root_username,
    COALESCE(root_member.current_level, 0) as root_level,
    COUNT(DISTINCT r.member_wallet) as total_members,
    COUNT(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet END) as layer_1_members,
    COUNT(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet END) as layer_2_members,
    COUNT(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet END) as layer_3_members,
    -- 活跃成员统计
    COUNT(DISTINCT CASE WHEN r.is_active = true THEN r.member_wallet END) as active_members,
    COUNT(DISTINCT CASE WHEN m.is_activated = true THEN r.member_wallet END) as activated_members,
    -- 各层级填充率
    ROUND(
        CASE WHEN COUNT(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet END) > 0 
             THEN (COUNT(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet END)::NUMERIC * 100.0 / 3.0)
             ELSE 0 END, 2
    ) as layer_1_fill_rate,
    ROUND(
        CASE WHEN COUNT(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet END) > 0 
             THEN (COUNT(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet END)::NUMERIC * 100.0 / 9.0)
             ELSE 0 END, 2
    ) as layer_2_fill_rate,
    ROUND(
        CASE WHEN COUNT(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet END) > 0 
             THEN (COUNT(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet END)::NUMERIC * 100.0 / 27.0)
             ELSE 0 END, 2
    ) as layer_3_fill_rate
FROM referrals r
LEFT JOIN users root_user ON r.root_wallet = root_user.wallet_address
LEFT JOIN members root_member ON r.root_wallet = root_member.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.layer BETWEEN 1 AND 19
GROUP BY r.root_wallet, root_user.username, root_member.current_level;

-- 3. 寻找合格上线的函数
CREATE OR REPLACE FUNCTION find_qualified_upline(
    start_wallet VARCHAR(42),
    required_level INTEGER,
    max_depth INTEGER DEFAULT 10
) RETURNS TABLE(
    qualified_wallet VARCHAR(42),
    qualified_level INTEGER,
    depth_from_start INTEGER
)
LANGUAGE plpgsql
AS $function$
BEGIN
    -- 使用递归CTE查找合格的上线
    RETURN QUERY
    WITH RECURSIVE upline_search AS (
        -- 基础情况：查找直接上线
        SELECT 
            r.root_wallet as wallet,
            COALESCE(m.current_level, 0) as level,
            1 as depth
        FROM referrals r
        LEFT JOIN members m ON r.root_wallet = m.wallet_address
        WHERE r.member_wallet = start_wallet
        AND r.layer = 1
        
        UNION ALL
        
        -- 递归：继续向上查找
        SELECT 
            r.root_wallet as wallet,
            COALESCE(m.current_level, 0) as level,
            us.depth + 1
        FROM referrals r
        LEFT JOIN members m ON r.root_wallet = m.wallet_address
        JOIN upline_search us ON r.member_wallet = us.wallet
        WHERE us.depth < max_depth
        AND r.layer = 1
    )
    SELECT 
        us.wallet,
        us.level,
        us.depth
    FROM upline_search us
    WHERE us.level >= required_level
    ORDER BY us.depth
    LIMIT 1;
END;
$function$;

-- 4. USDT奖励发放函数（使用现有的user_balances表）
CREATE OR REPLACE FUNCTION award_usdt_reward(
    recipient_wallet VARCHAR(42),
    payer_wallet VARCHAR(42),
    amount_cents BIGINT,
    level INTEGER,
    layer INTEGER,
    reward_type TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    reward_id VARCHAR := gen_random_uuid();
BEGIN
    -- 记录到user_rewards表
    INSERT INTO user_rewards (
        id,
        recipient_wallet,
        source_wallet,
        trigger_level,
        payout_layer,
        reward_amount,
        status,
        confirmed_at,
        created_at,
        wallet_address,
        amount,
        reward_type,
        layer,
        level,
        metadata
    ) VALUES (
        reward_id,
        recipient_wallet,
        payer_wallet,
        level,
        layer,
        (amount_cents / 100.0)::NUMERIC(10,2),
        'confirmed',
        NOW(),
        NOW(),
        recipient_wallet,
        amount_cents::VARCHAR,
        reward_type,
        layer,
        level,
        metadata_json || jsonb_build_object(
            'currency', 'USDT',
            'amount_usdt', amount_cents / 100.0,
            'timestamp', NOW()
        )
    );
    
    -- 更新user_balances表的USDT余额
    INSERT INTO user_balances (
        wallet_address,
        total_usdt_earned,
        available_usdt_rewards,
        last_updated,
        created_at
    ) VALUES (
        recipient_wallet,
        amount_cents,
        amount_cents,
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) 
    DO UPDATE SET 
        total_usdt_earned = COALESCE(user_balances.total_usdt_earned, 0) + amount_cents,
        available_usdt_rewards = COALESCE(user_balances.available_usdt_rewards, 0) + amount_cents,
        last_updated = NOW();
    
    -- 发送通知（如果user_notifications表存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        INSERT INTO user_notifications (
            recipient_wallet,
            type,
            title,
            message,
            amount,
            amount_type,
            level,
            layer,
            metadata,
            created_at
        ) VALUES (
            recipient_wallet,
            'reward_received',
            'USDT Reward Earned',
            format('You earned %s USDT from Level %s upgrade', 
                   (amount_cents/100.0)::TEXT, level::TEXT),
            amount_cents,
            'USDT',
            level,
            layer,
            metadata_json,
            NOW()
        );
    END IF;
END;
$function$;

-- 5. 层级NFT奖励处理函数（直接rollup逻辑）
CREATE OR REPLACE FUNCTION process_layer_nft_rewards(
    member_wallet_param VARCHAR(42),
    upgraded_level INTEGER,
    nft_price_usdt INTEGER
) RETURNS TABLE(
    success BOOLEAN,
    rewards_processed INTEGER,
    direct_rewards INTEGER,
    rollup_rewards INTEGER,
    total_amount_distributed BIGINT,
    message TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
    member_position RECORD;
    root_member RECORD;
    qualified_upline RECORD;
    reward_amount BIGINT := nft_price_usdt * 100; -- 转为分
    rewards_count INTEGER := 0;
    direct_count INTEGER := 0;
    rollup_count INTEGER := 0;
    total_distributed BIGINT := 0;
BEGIN
    -- 查找该成员在对应层级的所有位置
    FOR member_position IN
        SELECT DISTINCT 
            r.root_wallet,
            r.layer,
            r."position"
        FROM referrals r
        WHERE r.member_wallet = member_wallet_param
        AND r.is_active = true
        AND r.layer = upgraded_level
    LOOP
        -- 检查直接root用户的等级
        SELECT 
            COALESCE(m.current_level, 0) as current_level,
            COALESCE(m.is_activated, false) as is_activated,
            u.username
        INTO root_member
        FROM users u
        LEFT JOIN members m ON u.wallet_address = m.wallet_address
        WHERE u.wallet_address = member_position.root_wallet;
        
        -- 如果直接root等级足够，直接发放
        IF COALESCE(root_member.current_level, 0) >= upgraded_level THEN
            PERFORM award_usdt_reward(
                member_position.root_wallet,
                member_wallet_param,
                reward_amount,
                upgraded_level,
                member_position.layer,
                'DIRECT_REWARD',
                jsonb_build_object(
                    'reward_type', 'direct_to_root',
                    'currency', 'USDT',
                    'nft_price_usdt', nft_price_usdt,
                    'upgraded_level', upgraded_level
                )
            );
            
            direct_count := direct_count + 1;
            total_distributed := total_distributed + reward_amount;
            
        ELSE
            -- 寻找合格的上线并直接rollup
            SELECT * INTO qualified_upline
            FROM find_qualified_upline(member_position.root_wallet, upgraded_level, 10)
            LIMIT 1;
            
            IF qualified_upline.qualified_wallet IS NOT NULL THEN
                PERFORM award_usdt_reward(
                    qualified_upline.qualified_wallet,
                    member_wallet_param,
                    reward_amount,
                    upgraded_level,
                    member_position.layer,
                    'ROLLUP_REWARD',
                    jsonb_build_object(
                        'reward_type', 'direct_rollup',
                        'currency', 'USDT',
                        'nft_price_usdt', nft_price_usdt,
                        'rollup_depth', qualified_upline.depth_from_start,
                        'original_root', member_position.root_wallet
                    )
                );
                
                rollup_count := rollup_count + 1;
                total_distributed := total_distributed + reward_amount;
            END IF;
        END IF;
        
        rewards_count := rewards_count + 1;
    END LOOP;

    success := true;
    rewards_processed := rewards_count;
    direct_rewards := direct_count;
    rollup_rewards := rollup_count;
    total_amount_distributed := total_distributed;
    message := format('Processed %s positions: %s direct, %s rollup rewards', 
                     rewards_count, direct_count, rollup_count);
    
    RETURN NEXT;
    RETURN;
END;
$function$;

-- 6. 成员升级触发器
DROP TRIGGER IF EXISTS members_upgrade_reward_trigger ON members;
DROP FUNCTION IF EXISTS trigger_upgrade_rewards CASCADE;

CREATE OR REPLACE FUNCTION trigger_upgrade_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    result RECORD;
    nft_price INTEGER;
BEGIN
    -- 检查是否有等级升级
    IF NEW.current_level > COALESCE(OLD.current_level, 0) THEN
        -- 获取NFT价格（可以从level_config表获取，或使用默认值）
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'level_config') THEN
            SELECT platform_fee INTO nft_price
            FROM level_config 
            WHERE level = NEW.current_level
            LIMIT 1;
        END IF;
        
        -- 如果没有找到价格配置，使用默认公式
        IF nft_price IS NULL THEN
            nft_price := NEW.current_level * 1000; -- 默认每级1000 USDT
        END IF;
        
        -- 处理奖励分配
        SELECT * INTO result 
        FROM process_layer_nft_rewards(NEW.wallet_address, NEW.current_level, nft_price);
        
        -- 记录活动日志（如果表存在）
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_activity_log') THEN
            INSERT INTO matrix_activity_log (
                root_wallet,
                member_wallet,
                action_type,
                details,
                created_at
            ) VALUES (
                'SYSTEM',
                NEW.wallet_address,
                'UPGRADE_REWARDS_PROCESSED',
                jsonb_build_object(
                    'success', result.success,
                    'rewards_processed', result.rewards_processed,
                    'direct_rewards', result.direct_rewards,
                    'rollup_rewards', result.rollup_rewards,
                    'total_amount_usdt', (result.total_amount_distributed / 100.0)::TEXT,
                    'upgraded_level', NEW.current_level,
                    'nft_price_usdt', nft_price
                ),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE TRIGGER members_upgrade_reward_trigger
    AFTER UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_upgrade_rewards();

-- 7. 创建USDT余额汇总视图
DROP VIEW IF EXISTS user_usdt_summary CASCADE;

CREATE VIEW user_usdt_summary AS
SELECT 
    ub.wallet_address,
    u.username,
    -- USDT余额信息（已经是分为单位，需要除以100显示为美元）
    (COALESCE(ub.total_usdt_earned, 0) / 100.0)::NUMERIC(10,2) as total_usdt_earned,
    (COALESCE(ub.available_usdt_rewards, 0) / 100.0)::NUMERIC(10,2) as available_usdt_rewards,
    (COALESCE(ub.total_usdt_withdrawn, 0) / 100.0)::NUMERIC(10,2) as total_usdt_withdrawn,
    
    -- 从user_rewards表统计奖励记录
    COALESCE(ur_stats.total_rewards_count, 0) as total_rewards_count,
    COALESCE(ur_stats.confirmed_rewards_count, 0) as confirmed_rewards_count,
    COALESCE(ur_stats.direct_rewards_count, 0) as direct_rewards_count,
    COALESCE(ur_stats.rollup_rewards_count, 0) as rollup_rewards_count,
    COALESCE(ur_stats.total_reward_amount, 0) as total_reward_amount,
    
    -- 成员等级信息
    COALESCE(m.current_level, 0) as current_level,
    COALESCE(m.is_activated, false) as is_activated

FROM user_balances ub
LEFT JOIN users u ON ub.wallet_address = u.wallet_address
LEFT JOIN members m ON ub.wallet_address = m.wallet_address
LEFT JOIN (
    SELECT 
        ur.recipient_wallet as wallet_address,
        COUNT(ur.id) as total_rewards_count,
        COUNT(CASE WHEN ur.status = 'confirmed' THEN 1 END) as confirmed_rewards_count,
        COUNT(CASE WHEN ur.reward_type = 'DIRECT_REWARD' THEN 1 END) as direct_rewards_count,
        COUNT(CASE WHEN ur.reward_type = 'ROLLUP_REWARD' THEN 1 END) as rollup_rewards_count,
        SUM(ur.reward_amount)::NUMERIC(10,2) as total_reward_amount
    FROM user_rewards ur 
    WHERE ur.metadata->>'currency' = 'USDT'
    GROUP BY ur.recipient_wallet
) ur_stats ON ub.wallet_address = ur_stats.wallet_address
WHERE COALESCE(ub.total_usdt_earned, 0) > 0 
   OR COALESCE(ub.available_usdt_rewards, 0) > 0 
   OR ur_stats.wallet_address IS NOT NULL
ORDER BY COALESCE(ub.total_usdt_earned, 0) DESC;

-- 8. 添加注释
COMMENT ON FUNCTION find_qualified_upline IS '寻找符合等级要求的上线用户';
COMMENT ON FUNCTION award_usdt_reward IS 'USDT奖励发放函数 - 使用user_balances表';
COMMENT ON FUNCTION process_layer_nft_rewards IS '层级NFT奖励处理 - 直接rollup无等待';
COMMENT ON FUNCTION trigger_upgrade_rewards IS '成员升级触发器 - 自动处理奖励分配';
COMMENT ON VIEW user_matrix_positions IS '用户矩阵位置视图 - 支持19层';
COMMENT ON VIEW user_matrix_summary IS '用户矩阵汇总视图';
COMMENT ON VIEW user_usdt_summary IS '用户USDT余额和奖励汇总';

-- 9. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_referrals_member_layer ON referrals(member_wallet, layer);
CREATE INDEX IF NOT EXISTS idx_referrals_root_layer ON referrals(root_wallet, layer);
CREATE INDEX IF NOT EXISTS idx_user_rewards_recipient ON user_rewards(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);

-- 10. 验证部署
SELECT 
    'CLEAN_MATRIX_SYSTEM' as status,
    'Matrix system and USDT rewards using actual database schema' as description,
    'user_balances table for USDT, direct rollup logic' as implementation;