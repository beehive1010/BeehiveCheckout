#!/bin/bash

# Supabase Matrix System Deployment Script
# 自动化部署3×3强制矩阵系统到Supabase

set -e  # 错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要的环境变量
check_environment() {
    print_info "检查环境配置..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL 环境变量未设置"
        print_info "请设置您的Supabase数据库连接字符串:"
        print_info "export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
        exit 1
    fi
    
    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        print_warning "SUPABASE_PROJECT_REF 未设置，将跳过Supabase CLI操作"
    fi
    
    print_success "环境配置检查完成"
}

# 检查必要的文件
check_files() {
    print_info "检查迁移文件..."
    
    local files=(
        "supabase/migrations/20240904_matrix_system_fixes.sql"
        "supabase/migrations/20240904_matrix_triggers.sql"
        "supabase/migrations/20240904_matrix_fixes_corrected.sql"
    )
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "找不到文件: $file"
            exit 1
        fi
        print_success "找到文件: $file"
    done
}

# 执行SQL文件
execute_sql_file() {
    local file=$1
    local description=$2
    
    print_info "执行 $description..."
    print_info "文件: $file"
    
    if command -v psql >/dev/null 2>&1; then
        # 使用psql执行
        if psql "$DATABASE_URL" -f "$file"; then
            print_success "$description 执行成功"
        else
            print_error "$description 执行失败"
            exit 1
        fi
    else
        print_warning "psql 未安装，请手动在Supabase SQL编辑器中执行以下文件:"
        print_info "$file"
        read -p "执行完成后按Enter继续..."
    fi
}

# 验证部署
verify_deployment() {
    print_info "验证部署..."
    
    if command -v psql >/dev/null 2>&1; then
        # 检查函数是否存在
        local function_check="SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%matrix%';"
        
        print_info "检查矩阵函数..."
        if psql "$DATABASE_URL" -c "$function_check"; then
            print_success "矩阵函数检查完成"
        else
            print_warning "函数检查失败，请手动验证"
        fi
        
        # 检查触发器是否存在
        local trigger_check="SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';"
        
        print_info "检查触发器..."
        if psql "$DATABASE_URL" -c "$trigger_check"; then
            print_success "触发器检查完成"
        else
            print_warning "触发器检查失败，请手动验证"
        fi
        
        # 检查视图是否可用
        local view_check="SELECT COUNT(*) FROM matrix_overview LIMIT 1;"
        
        print_info "检查矩阵视图..."
        if psql "$DATABASE_URL" -c "$view_check"; then
            print_success "矩阵视图检查完成"
        else
            print_warning "视图检查失败，请手动验证"
        fi
    else
        print_warning "无法自动验证，请手动在Supabase中执行验证查询"
        print_info "验证查询请参考 SUPABASE_DEPLOYMENT.md 文档"
    fi
}

# 创建备份
create_backup() {
    print_info "建议在部署前创建数据库备份..."
    
    if command -v pg_dump >/dev/null 2>&1; then
        local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        print_info "创建备份文件: $backup_file"
        
        if pg_dump "$DATABASE_URL" > "$backup_file"; then
            print_success "备份创建成功: $backup_file"
        else
            print_warning "备份创建失败，但部署将继续"
        fi
    else
        print_warning "pg_dump 未安装，跳过自动备份"
        print_info "建议手动在Supabase控制台创建数据库备份"
    fi
}

# 显示部署后操作
show_post_deployment() {
    print_success "🎉 矩阵系统部署完成!"
    echo
    print_info "后续操作:"
    print_info "1. 在您的应用代码中使用 supabaseMatrixService"
    print_info "2. 测试矩阵放置功能: auto_place_user(member_wallet, referrer_wallet)"
    print_info "3. 验证团队统计: get_team_statistics(root_wallet)"
    print_info "4. 监控矩阵活动: SELECT * FROM matrix_activity_log"
    echo
    print_info "详细文档请参考: SUPABASE_DEPLOYMENT.md"
    echo
    print_success "现在您可以使用完整的3×3强制矩阵系统了! 🚀"
}

# 主部署函数
main() {
    echo "========================================"
    echo "🔧 Supabase 矩阵系统部署工具"
    echo "========================================"
    echo
    
    # 检查环境
    check_environment
    check_files
    
    # 询问是否继续
    read -p "是否继续部署? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "部署已取消"
        exit 0
    fi
    
    # 创建备份
    create_backup
    
    echo
    print_info "开始执行数据库迁移..."
    echo
    
    # 执行迁移文件
    execute_sql_file "supabase/migrations/20240904_matrix_system_fixes.sql" "基础矩阵系统修复"
    echo
    
    execute_sql_file "supabase/migrations/20240904_matrix_triggers.sql" "矩阵触发器和函数"
    echo
    
    execute_sql_file "supabase/migrations/20240904_matrix_fixes_corrected.sql" "字段名和保留字修正"
    echo
    
    # 验证部署
    verify_deployment
    echo
    
    # 显示完成信息
    show_post_deployment
}

# 捕获中断信号
trap 'print_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"