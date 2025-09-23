-- =================================================================
-- 多语言数据库架构设置
-- 为BEEHIVE平台的动态内容添加多语言支持
-- =================================================================

-- 1. 创建统一的多语言表结构

-- 1.1 Advertisement NFTs 多语言支持
CREATE TABLE IF NOT EXISTS advertisement_nft_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertisement_nft_id UUID NOT NULL REFERENCES advertisement_nfts(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    click_url TEXT, -- 支持不同语言的链接
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(advertisement_nft_id, language_code)
);

-- 1.2 Merchant NFTs 多语言支持 (创建merchant_nfts_translations)
CREATE TABLE IF NOT EXISTS merchant_nft_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_nft_id UUID NOT NULL REFERENCES merchant_nfts(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_nft_id, language_code)
);

-- 1.3 Blog Posts 多语言支持 (替换现有的language字段)
CREATE TABLE IF NOT EXISTS blog_post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- 每种语言可以有不同的slug
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blog_post_id, language_code),
    UNIQUE(slug, language_code) -- 确保每种语言的slug唯一
);

-- 1.4 Course Lessons 多语言支持
CREATE TABLE IF NOT EXISTS lesson_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, language_code)
);

-- 2. 创建支持的语言配置表
CREATE TABLE IF NOT EXISTS supported_languages (
    code VARCHAR(5) PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NOT NULL,
    flag_emoji TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    rtl BOOLEAN DEFAULT FALSE, -- 从右到左的语言
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入支持的语言
INSERT INTO supported_languages (code, name, native_name, flag_emoji, is_default) VALUES
('en', 'English', 'English', '🇺🇸', TRUE),
('zh', 'Chinese Simplified', '简体中文', '🇨🇳', FALSE),
('zh-tw', 'Chinese Traditional', '繁體中文', '🇹🇼', FALSE),
('th', 'Thai', 'ไทย', '🇹🇭', FALSE),
('ms', 'Malay', 'Bahasa Melayu', '🇲🇾', FALSE),
('ko', 'Korean', '한국어', '🇰🇷', FALSE),
('ja', 'Japanese', '日本語', '🇯🇵', FALSE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    native_name = EXCLUDED.native_name,
    flag_emoji = EXCLUDED.flag_emoji,
    updated_at = NOW();

-- 3. 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_multilingual_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为多语言表添加更新时间戳触发器
DROP TRIGGER IF EXISTS trigger_advertisement_nft_translations_updated_at ON advertisement_nft_translations;
CREATE TRIGGER trigger_advertisement_nft_translations_updated_at
    BEFORE UPDATE ON advertisement_nft_translations
    FOR EACH ROW EXECUTE FUNCTION update_multilingual_updated_at();

DROP TRIGGER IF EXISTS trigger_merchant_nft_translations_updated_at ON merchant_nft_translations;
CREATE TRIGGER trigger_merchant_nft_translations_updated_at
    BEFORE UPDATE ON merchant_nft_translations
    FOR EACH ROW EXECUTE FUNCTION update_multilingual_updated_at();

DROP TRIGGER IF EXISTS trigger_blog_post_translations_updated_at ON blog_post_translations;
CREATE TRIGGER trigger_blog_post_translations_updated_at
    BEFORE UPDATE ON blog_post_translations
    FOR EACH ROW EXECUTE FUNCTION update_multilingual_updated_at();

DROP TRIGGER IF EXISTS trigger_lesson_translations_updated_at ON lesson_translations;
CREATE TRIGGER trigger_lesson_translations_updated_at
    BEFORE UPDATE ON lesson_translations
    FOR EACH ROW EXECUTE FUNCTION update_multilingual_updated_at();

DROP TRIGGER IF EXISTS trigger_supported_languages_updated_at ON supported_languages;
CREATE TRIGGER trigger_supported_languages_updated_at
    BEFORE UPDATE ON supported_languages
    FOR EACH ROW EXECUTE FUNCTION update_multilingual_updated_at();

-- 4. 创建多语言内容获取函数

-- 4.1 获取Advertisement NFT的多语言内容
CREATE OR REPLACE FUNCTION get_advertisement_nft_content(
    p_nft_id UUID,
    p_language_code VARCHAR(5) DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    price_usdt NUMERIC,
    price_bcc NUMERIC,
    category TEXT,
    advertiser_wallet VARCHAR,
    click_url TEXT,
    is_active BOOLEAN,
    language_code VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nft.id,
        COALESCE(trans.title, nft.title) as title,
        COALESCE(trans.description, nft.description) as description,
        nft.image_url,
        nft.price_usdt,
        nft.price_bcc,
        nft.category,
        nft.advertiser_wallet,
        COALESCE(trans.click_url, nft.click_url) as click_url,
        nft.is_active,
        p_language_code as language_code,
        nft.created_at
    FROM advertisement_nfts nft
    LEFT JOIN advertisement_nft_translations trans 
        ON nft.id = trans.advertisement_nft_id 
        AND trans.language_code = p_language_code
    WHERE nft.id = p_nft_id;
END;
$$ LANGUAGE plpgsql;

-- 4.2 获取Blog Post的多语言内容
CREATE OR REPLACE FUNCTION get_blog_post_content(
    p_post_id UUID DEFAULT NULL,
    p_slug TEXT DEFAULT NULL,
    p_language_code VARCHAR(5) DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    content TEXT,
    author TEXT,
    author_wallet VARCHAR,
    image_url TEXT,
    published BOOLEAN,
    published_at TIMESTAMPTZ,
    tags JSONB,
    views INTEGER,
    language_code VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        post.id,
        COALESCE(trans.title, post.title) as title,
        COALESCE(trans.slug, post.slug) as slug,
        COALESCE(trans.excerpt, post.excerpt) as excerpt,
        COALESCE(trans.content, post.content) as content,
        COALESCE(trans.author, post.author) as author,
        post.author_wallet,
        post.image_url,
        post.published,
        post.published_at,
        COALESCE(trans.tags, post.tags) as tags,
        post.views,
        p_language_code as language_code,
        post.created_at
    FROM blog_posts post
    LEFT JOIN blog_post_translations trans 
        ON post.id = trans.blog_post_id 
        AND trans.language_code = p_language_code
    WHERE (p_post_id IS NULL OR post.id = p_post_id)
      AND (p_slug IS NULL OR COALESCE(trans.slug, post.slug) = p_slug)
      AND post.published = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4.3 获取Course的多语言内容（包含lessons）
CREATE OR REPLACE FUNCTION get_course_with_translations(
    p_course_id UUID,
    p_language_code VARCHAR(5) DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    price_usdt NUMERIC,
    price_bcc NUMERIC,
    category TEXT,
    difficulty_level TEXT,
    duration_hours INTEGER,
    instructor_name TEXT,
    instructor_wallet VARCHAR,
    is_active BOOLEAN,
    required_level INTEGER,
    course_type VARCHAR,
    language_code VARCHAR,
    lessons JSONB
) AS $$
DECLARE
    course_lessons JSONB;
BEGIN
    -- 获取课程的lessons（包含多语言）
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', lesson.id,
            'title', COALESCE(lesson_trans.title, lesson.title),
            'description', COALESCE(lesson_trans.description, lesson.description),
            'lesson_order', lesson.lesson_order,
            'content_type', lesson.content_type,
            'content_url', lesson.content_url,
            'duration_minutes', lesson.duration_minutes,
            'is_free', lesson.is_free
        ) ORDER BY lesson.lesson_order
    ), '[]'::jsonb) INTO course_lessons
    FROM course_lessons lesson
    LEFT JOIN lesson_translations lesson_trans 
        ON lesson.id = lesson_trans.lesson_id 
        AND lesson_trans.language_code = p_language_code
    WHERE lesson.course_id = p_course_id;

    -- 返回课程信息
    RETURN QUERY
    SELECT 
        course.id,
        COALESCE(trans.title, course.title) as title,
        COALESCE(trans.description, course.description) as description,
        course.image_url,
        course.price_usdt,
        course.price_bcc,
        course.category,
        course.difficulty_level,
        course.duration_hours,
        course.instructor_name,
        course.instructor_wallet,
        course.is_active,
        course.required_level,
        course.course_type,
        p_language_code as language_code,
        course_lessons as lessons
    FROM courses course
    LEFT JOIN course_translations trans 
        ON course.id = trans.course_id 
        AND trans.language_code = p_language_code
    WHERE course.id = p_course_id;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建RLS策略

-- Advertisement NFT translations policies
ALTER TABLE advertisement_nft_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read advertisement nft translations" ON advertisement_nft_translations
    FOR SELECT USING (true);

CREATE POLICY "Advertisers can manage own ad nft translations" ON advertisement_nft_translations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM advertisement_nfts 
            WHERE id = advertisement_nft_id 
            AND advertiser_wallet = get_current_wallet_address()
        )
    );

CREATE POLICY "Service role all access ad nft translations" ON advertisement_nft_translations
    TO service_role USING (true) WITH CHECK (true);

-- Merchant NFT translations policies
ALTER TABLE merchant_nft_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read merchant nft translations" ON merchant_nft_translations
    FOR SELECT USING (true);

CREATE POLICY "Merchants can manage own nft translations" ON merchant_nft_translations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM merchant_nfts 
            WHERE id = merchant_nft_id 
            AND merchant_wallet = get_current_wallet_address()
        )
    );

CREATE POLICY "Service role all access merchant nft translations" ON merchant_nft_translations
    TO service_role USING (true) WITH CHECK (true);

-- Blog post translations policies
ALTER TABLE blog_post_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read published blog translations" ON blog_post_translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE id = blog_post_id 
            AND published = true
        )
    );

CREATE POLICY "Authors can manage own blog translations" ON blog_post_translations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE id = blog_post_id 
            AND author_wallet = get_current_wallet_address()
        )
    );

CREATE POLICY "Service role all access blog translations" ON blog_post_translations
    TO service_role USING (true) WITH CHECK (true);

-- Lesson translations policies
ALTER TABLE lesson_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read lesson translations" ON lesson_translations
    FOR SELECT USING (true);

CREATE POLICY "Instructors can manage lesson translations" ON lesson_translations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN courses c ON cl.course_id = c.id
            WHERE cl.id = lesson_id 
            AND c.instructor_wallet = get_current_wallet_address()
        )
    );

CREATE POLICY "Service role all access lesson translations" ON lesson_translations
    TO service_role USING (true) WITH CHECK (true);

-- Supported languages policies
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read supported languages" ON supported_languages
    FOR SELECT USING (true);

CREATE POLICY "Service role all access supported languages" ON supported_languages
    TO service_role USING (true) WITH CHECK (true);

-- 6. 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_advertisement_nft_translations_lookup ON advertisement_nft_translations(advertisement_nft_id, language_code);
CREATE INDEX IF NOT EXISTS idx_merchant_nft_translations_lookup ON merchant_nft_translations(merchant_nft_id, language_code);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_lookup ON blog_post_translations(blog_post_id, language_code);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_slug ON blog_post_translations(slug, language_code);
CREATE INDEX IF NOT EXISTS idx_lesson_translations_lookup ON lesson_translations(lesson_id, language_code);

-- 7. 创建视图以简化查询

-- 广告NFT多语言视图
CREATE OR REPLACE VIEW advertisement_nfts_multilingual AS
SELECT 
    nft.id,
    nft.image_url,
    nft.price_usdt,
    nft.price_bcc,
    nft.category,
    nft.advertiser_wallet,
    nft.impressions_target,
    nft.impressions_current,
    nft.is_active,
    nft.starts_at,
    nft.ends_at,
    nft.metadata,
    nft.created_at,
    nft.updated_at,
    COALESCE(
        jsonb_object_agg(
            t.language_code, 
            jsonb_build_object(
                'title', t.title,
                'description', t.description,
                'click_url', t.click_url
            )
        ) FILTER (WHERE t.id IS NOT NULL), 
        jsonb_build_object(
            'en', jsonb_build_object(
                'title', nft.title,
                'description', nft.description,
                'click_url', nft.click_url
            )
        )
    ) as translations
FROM advertisement_nfts nft
LEFT JOIN advertisement_nft_translations t ON nft.id = t.advertisement_nft_id
GROUP BY nft.id, nft.title, nft.description, nft.click_url, nft.image_url, 
         nft.price_usdt, nft.price_bcc, nft.category, nft.advertiser_wallet,
         nft.impressions_target, nft.impressions_current, nft.is_active, 
         nft.starts_at, nft.ends_at, nft.metadata, nft.created_at, nft.updated_at;

-- Blog文章多语言视图
CREATE OR REPLACE VIEW blog_posts_multilingual AS
SELECT 
    p.id,
    p.author_wallet,
    p.image_url,
    p.published,
    p.published_at,
    p.views,
    p.metadata,
    p.created_at,
    p.updated_at,
    COALESCE(
        jsonb_object_agg(
            t.language_code, 
            jsonb_build_object(
                'title', t.title,
                'slug', t.slug,
                'excerpt', t.excerpt,
                'content', t.content,
                'author', t.author,
                'tags', t.tags
            )
        ) FILTER (WHERE t.id IS NOT NULL), 
        jsonb_build_object(
            p.language, jsonb_build_object(
                'title', p.title,
                'slug', p.slug,
                'excerpt', p.excerpt,
                'content', p.content,
                'author', p.author,
                'tags', p.tags
            )
        )
    ) as translations
FROM blog_posts p
LEFT JOIN blog_post_translations t ON p.id = t.blog_post_id
GROUP BY p.id, p.title, p.slug, p.excerpt, p.content, p.author, p.author_wallet,
         p.image_url, p.published, p.published_at, p.tags, p.views, p.language,
         p.metadata, p.created_at, p.updated_at;

COMMENT ON TABLE advertisement_nft_translations IS '广告NFT多语言翻译表';
COMMENT ON TABLE merchant_nft_translations IS '商家NFT多语言翻译表';
COMMENT ON TABLE blog_post_translations IS 'Blog文章多语言翻译表';
COMMENT ON TABLE lesson_translations IS '课程lessons多语言翻译表';
COMMENT ON TABLE supported_languages IS '支持的语言配置表';

-- 完成设置
SELECT 'Multilingual database setup completed successfully!' as status;