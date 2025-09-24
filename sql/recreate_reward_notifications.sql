-- 重新创建reward_notifications表
-- =============================================
-- 修复404错误: reward_notifications表不存在
-- =============================================

SELECT '=== 重新创建reward_notifications表 ===' as section;

-- 1. 删除表（如果存在）
DROP TABLE IF EXISTS reward_notifications CASCADE;

-- 2. 重新创建表
CREATE TABLE public.reward_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_address character varying NOT NULL,
  reward_claim_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type = ANY (ARRAY['pending_reward'::text, 'expiring_soon'::text, 'expired'::text, 'claimed'::text])),
  title text NOT NULL,
  message text NOT NULL,
  countdown_hours integer,
  is_read boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT reward_notifications_pkey PRIMARY KEY (id)
);

-- 3. 创建外键约束（如果相关表存在）
DO $$
BEGIN
  -- 检查reward_claims表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reward_claims') THEN
    ALTER TABLE reward_notifications
    ADD CONSTRAINT reward_notifications_reward_claim_id_fkey 
    FOREIGN KEY (reward_claim_id) REFERENCES public.reward_claims(id);
  END IF;
  
  -- 检查members表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    ALTER TABLE reward_notifications
    ADD CONSTRAINT reward_notifications_wallet_address_fkey 
    FOREIGN KEY (wallet_address) REFERENCES public.members(wallet_address);
  END IF;
END $$;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_reward_notifications_wallet_address ON reward_notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_is_read ON reward_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_created_at ON reward_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_notification_type ON reward_notifications(notification_type);

-- 5. 启用RLS
ALTER TABLE reward_notifications ENABLE ROW LEVEL SECURITY;

-- 6. 创建RLS策略
CREATE POLICY "Users can view own notifications" ON reward_notifications
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "Users can update own notifications" ON reward_notifications
    FOR UPDATE USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage notifications" ON reward_notifications
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access reward_notifications" ON reward_notifications
    FOR ALL USING (true) WITH CHECK (true);

-- 7. 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON reward_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reward_notifications TO service_role;

-- 8. 验证表创建
SELECT '=== 表创建验证 ===' as verification;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reward_notifications' 
ORDER BY ordinal_position;

-- 显示索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'reward_notifications';

SELECT '✅ reward_notifications表重新创建完成' as completion_message;