#!/usr/bin/env python3
"""
更新所有Supabase Edge Functions，在每个函数顶部添加CORS处理
"""
import os
import re
import glob

# CORS头部定义
CORS_HEADERS_CODE = """
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-admin-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
"""

def update_function_file(file_path):
    """更新单个函数文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 如果已经有corsHeaders定义，跳过
        if 'const corsHeaders' in content or 'corsHeaders = {' in content:
            print(f"✅ {file_path} 已有CORS定义，跳过")
            return True
            
        # 如果使用了共享CORS，需要替换
        if "from '../_shared/cors.ts'" in content:
            # 移除import语句
            content = re.sub(r"import\s+\{[^}]*corsHeaders[^}]*\}\s+from\s+['\"][^'\"]*cors\.ts['\"];\s*\n", "", content)
            print(f"🔄 {file_path} 移除了共享CORS import")
        
        # 找到import语句的结束位置
        lines = content.split('\n')
        insert_index = 0
        
        # 找到最后一个import语句的位置
        for i, line in enumerate(lines):
            if line.strip().startswith('import ') and 'from ' in line:
                insert_index = i + 1
                
        # 在import语句后插入CORS头部定义
        lines.insert(insert_index, CORS_HEADERS_CODE)
        
        # 确保在serve函数开始处添加OPTIONS处理
        updated_content = '\n'.join(lines)
        
        # 检查是否已有OPTIONS处理
        if "req.method === 'OPTIONS'" not in updated_content:
            # 在serve函数开始后添加OPTIONS处理
            pattern = r'(serve\s*\(\s*async\s*\(\s*req\s*\)\s*=>\s*\{)'
            options_handler = r'''\1
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
'''
            updated_content = re.sub(pattern, options_handler, updated_content)
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
            
        print(f"✅ 更新完成: {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ 更新失败 {file_path}: {str(e)}")
        return False

def main():
    """主函数"""
    # 获取所有edge function的index.ts文件
    function_files = glob.glob('supabase/functions/*/index.ts')
    
    print(f"找到 {len(function_files)} 个edge function文件")
    
    updated_count = 0
    for file_path in function_files:
        if update_function_file(file_path):
            updated_count += 1
            
    print(f"\n✅ 完成！成功更新了 {updated_count}/{len(function_files)} 个文件")

if __name__ == "__main__":
    main()