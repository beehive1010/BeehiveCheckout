-- =====================================================
-- 翻译缓存表创建
-- 用于缓存自动翻译结果，提高性能并节省API调用
-- =====================================================

-- 创建翻译缓存表
CREATE TABLE IF NOT EXISTS translation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(64) UNIQUE NOT NULL, -- 翻译内容的哈希键
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    provider_name VARCHAR(50), -- 使用的翻译提供商
    expires_at TIMESTAMPTZ, -- 缓存过期时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_translation_cache_key ON translation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_translation_cache_languages ON translation_cache(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_cache_expires ON translation_cache(expires_at);

-- 创建清理过期缓存的函数
CREATE OR REPLACE FUNCTION cleanup_expired_translation_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM translation_cache 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建自动清理过期缓存的触发器函数
CREATE OR REPLACE FUNCTION auto_cleanup_translation_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- 随机清理过期缓存，避免每次插入都执行
    IF random() < 0.01 THEN -- 1%的概率执行清理
        PERFORM cleanup_expired_translation_cache();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS auto_cleanup_cache_trigger ON translation_cache;
CREATE TRIGGER auto_cleanup_cache_trigger
    AFTER INSERT ON translation_cache
    FOR EACH ROW
    EXECUTE FUNCTION auto_cleanup_translation_cache();

-- 为翻译缓存表启用 RLS
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略 - 所有用户都可以读取和写入缓存
CREATE POLICY "翻译缓存公开访问" ON translation_cache
    FOR ALL USING (true);

-- 创建获取翻译统计的视图
CREATE OR REPLACE VIEW translation_cache_stats AS
SELECT 
    target_language,
    provider_name,
    COUNT(*) as cached_translations,
    COUNT(CASE WHEN expires_at > NOW() OR expires_at IS NULL THEN 1 END) as active_cache,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_cache,
    AVG(LENGTH(original_text)) as avg_text_length,
    MAX(created_at) as last_cached_at
FROM translation_cache
GROUP BY target_language, provider_name
ORDER BY target_language, cached_translations DESC;

-- 创建翻译缓存管理函数
CREATE OR REPLACE FUNCTION get_translation_cache_info()
RETURNS TABLE (
    total_entries BIGINT,
    active_entries BIGINT,
    expired_entries BIGINT,
    cache_size_mb NUMERIC,
    oldest_cache TIMESTAMPTZ,
    newest_cache TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN expires_at > NOW() OR expires_at IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries,
        ROUND(
            (pg_total_relation_size('translation_cache')::NUMERIC / 1024 / 1024), 
            2
        ) as cache_size_mb,
        MIN(created_at) as oldest_cache,
        MAX(created_at) as newest_cache
    FROM translation_cache;
END;
$$ LANGUAGE plpgsql;

-- 插入一些示例说明数据
COMMENT ON TABLE translation_cache IS '翻译API结果缓存表，用于提高翻译性能和节省API调用次数';
COMMENT ON COLUMN translation_cache.cache_key IS '基于原文+语言的唯一缓存键';
COMMENT ON COLUMN translation_cache.provider_name IS '使用的翻译服务提供商名称';
COMMENT ON COLUMN translation_cache.expires_at IS '缓存过期时间，NULL表示永不过期';

-- 显示创建结果
SELECT '✅ 翻译缓存表和相关功能创建完成' as status;