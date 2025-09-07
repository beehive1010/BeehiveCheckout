-- Education System Database Schema
-- 课程系统数据库结构

-- 课程分类表
CREATE TABLE course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- lucide icon name
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课程表
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES course_categories(id),
    
    -- 访问控制
    required_level INTEGER NOT NULL DEFAULT 1, -- 需要的会员等级
    price_bcc INTEGER NOT NULL DEFAULT 0, -- BCC价格，0表示免费
    is_free BOOLEAN GENERATED ALWAYS AS (price_bcc = 0) STORED,
    
    -- 课程信息
    course_type VARCHAR(20) NOT NULL CHECK (course_type IN ('online', 'video')), -- 在线直播或录播视频
    duration VARCHAR(50), -- 课程时长，如 "2 hours", "4 weeks"
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- 在线课程信息 (course_type = 'online')
    zoom_meeting_id VARCHAR(100),
    zoom_password VARCHAR(50),
    zoom_link TEXT,
    scheduled_at TIMESTAMPTZ, -- 直播时间
    
    -- 视频课程信息 (course_type = 'video')
    video_url TEXT, -- 视频播放链接
    download_link TEXT, -- 下载链接（如果允许下载）
    
    -- 课程状态
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    
    -- 统计信息
    total_enrollments INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课程模块表 (课程可以分为多个模块/章节)
CREATE TABLE course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    module_order INTEGER NOT NULL,
    
    -- 模块内容
    content_type VARCHAR(20) CHECK (content_type IN ('video', 'text', 'quiz', 'assignment')),
    video_url TEXT,
    content_text TEXT,
    duration_minutes INTEGER, -- 模块时长（分钟）
    
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(course_id, module_order)
);

-- 用户课程访问表
CREATE TABLE course_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    course_id UUID NOT NULL REFERENCES courses(id),
    
    -- 访问信息
    access_granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- 课程过期时间（如果有）
    
    -- 支付信息
    payment_method VARCHAR(20) DEFAULT 'bcc' CHECK (payment_method IN ('bcc', 'free')),
    amount_paid INTEGER DEFAULT 0, -- 支付的BCC数量
    payment_transaction_id UUID, -- 可关联到支付记录
    
    -- 进度跟踪
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 评价
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wallet_address, course_id)
);

-- 用户课程模块进度表
CREATE TABLE course_module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    course_id UUID NOT NULL,
    module_id UUID NOT NULL REFERENCES course_modules(id),
    
    -- 进度信息
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER DEFAULT 0, -- 用户在此模块花费的时间
    
    -- 测验/作业成绩 (如果模块有测验)
    quiz_score INTEGER, -- 分数 0-100
    quiz_attempts INTEGER DEFAULT 0,
    
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address, course_id) REFERENCES course_access(wallet_address, course_id),
    UNIQUE(wallet_address, module_id)
);

-- 课程讲师表
CREATE TABLE course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    bio TEXT,
    avatar_url TEXT,
    specialization VARCHAR(200), -- 专业领域
    experience_years INTEGER,
    
    -- 社交媒体链接
    linkedin_url TEXT,
    twitter_url TEXT,
    website_url TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课程-讲师关联表
CREATE TABLE course_instructor_relations (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES course_instructors(id),
    role VARCHAR(50) DEFAULT 'instructor', -- instructor, assistant, guest
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (course_id, instructor_id)
);

-- 课程公告表
CREATE TABLE course_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    -- 公告类型
    announcement_type VARCHAR(20) DEFAULT 'general' CHECK (announcement_type IN ('general', 'urgent', 'schedule_change')),
    
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 支付记录表 (用于跟踪BCC支付)
CREATE TABLE course_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    course_id UUID NOT NULL REFERENCES courses(id),
    
    -- 支付信息
    amount_bcc INTEGER NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- 交易信息
    transaction_hash VARCHAR(66), -- 区块链交易哈希（如果有）
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_required_level ON courses(required_level);
CREATE INDEX idx_courses_is_published ON courses(is_published);
CREATE INDEX idx_courses_course_type ON courses(course_type);

CREATE INDEX idx_course_access_wallet ON course_access(wallet_address);
CREATE INDEX idx_course_access_course ON course_access(course_id);
CREATE INDEX idx_course_access_progress ON course_access(progress_percentage);

CREATE INDEX idx_course_module_progress_wallet_course ON course_module_progress(wallet_address, course_id);
CREATE INDEX idx_course_module_progress_completed ON course_module_progress(is_completed);

CREATE INDEX idx_course_payments_wallet ON course_payments(wallet_address);
CREATE INDEX idx_course_payments_status ON course_payments(payment_status);

-- 创建更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用触发器到所有相关表
CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_access_updated_at BEFORE UPDATE ON course_access FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_module_progress_updated_at BEFORE UPDATE ON course_module_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_instructors_updated_at BEFORE UPDATE ON course_instructors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_announcements_updated_at BEFORE UPDATE ON course_announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_payments_updated_at BEFORE UPDATE ON course_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();