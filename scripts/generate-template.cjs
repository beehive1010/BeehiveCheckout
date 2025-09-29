#!/usr/bin/env node

/**
 * 基于英文翻译文件生成模板脚本
 * 从en.json提取键结构生成_template.json
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '../src/translations');
const EN_FILE = path.join(TRANSLATIONS_DIR, 'en.json');
const TEMPLATE_FILE = path.join(TRANSLATIONS_DIR, '_template.json');

/**
 * 递归将对象的所有值设为空字符串
 * @param {Object} obj - 要处理的对象
 * @returns {Object} 值为空字符串的对象
 */
function generateTemplate(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return '';
  }
  
  const template = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      template[key] = generateTemplate(obj[key]);
    }
  }
  
  return template;
}

/**
 * 读取并解析JSON文件
 * @param {string} filePath - 文件路径
 * @returns {Object|null} 解析后的对象或null
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 无法读取文件 ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 主生成函数
 */
function generateTemplateFromEn() {
  console.log('🌍 基于英文翻译文件生成模板...\n');
  
  // 读取英文翻译文件
  if (!fs.existsSync(EN_FILE)) {
    console.error('❌ 未找到英文翻译文件:', EN_FILE);
    process.exit(1);
  }
  
  const enData = readJsonFile(EN_FILE);
  if (!enData) {
    console.error('❌ 无法解析英文翻译文件');
    process.exit(1);
  }
  
  // 生成模板
  const template = generateTemplate(enData);
  
  // 写入模板文件
  try {
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8');
    console.log('✅ 模板文件已生成:', TEMPLATE_FILE);
    
    // 统计键数量
    function countKeys(obj) {
      let count = 0;
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += countKeys(obj[key]);
        } else {
          count++;
        }
      }
      return count;
    }
    
    const keyCount = countKeys(template);
    console.log(`📊 模板包含 ${keyCount} 个翻译键`);
    
  } catch (error) {
    console.error('❌ 写入模板文件失败:', error.message);
    process.exit(1);
  }
}

// 运行生成
if (require.main === module) {
  generateTemplateFromEn();
}

module.exports = { generateTemplateFromEn };