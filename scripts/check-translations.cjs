#!/usr/bin/env node

/**
 * 翻译文件完整性检查脚本
 * 检查所有语言文件是否包含模板中定义的所有键
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '../src/translations');
const TEMPLATE_FILE = path.join(TRANSLATIONS_DIR, '_template.json');

// 支持的语言列表
const LANGUAGES = ['en', 'zh', 'zh-tw', 'th', 'ms', 'ko', 'ja'];

/**
 * 递归获取对象的所有键路径
 * @param {Object} obj - 要处理的对象
 * @param {string} prefix - 键路径前缀
 * @returns {Array} 键路径数组
 */
function getKeyPaths(obj, prefix = '') {
  const paths = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        paths.push(...getKeyPaths(obj[key], currentPath));
      } else {
        paths.push(currentPath);
      }
    }
  }
  
  return paths;
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
 * 检查单个语言文件
 * @param {string} language - 语言代码
 * @param {Array} templateKeys - 模板键列表
 * @returns {Object} 检查结果
 */
function checkLanguageFile(language, templateKeys) {
  const filePath = path.join(TRANSLATIONS_DIR, `${language}.json`);
  
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      missingKeys: templateKeys,
      extraKeys: [],
      total: templateKeys.length,
      missing: templateKeys.length,
      coverage: 0
    };
  }
  
  const languageData = readJsonFile(filePath);
  if (!languageData) {
    return null;
  }
  
  const languageKeys = getKeyPaths(languageData);
  const missingKeys = templateKeys.filter(key => !languageKeys.includes(key));
  const extraKeys = languageKeys.filter(key => !templateKeys.includes(key));
  
  const coverage = Math.round(((templateKeys.length - missingKeys.length) / templateKeys.length) * 100);
  
  return {
    exists: true,
    missingKeys,
    extraKeys,
    total: templateKeys.length,
    missing: missingKeys.length,
    coverage
  };
}

/**
 * 主检查函数
 */
function checkTranslations() {
  console.log('🌍 检查翻译文件完整性...\n');
  
  // 读取模板文件
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('❌ 未找到模板文件:', TEMPLATE_FILE);
    process.exit(1);
  }
  
  const template = readJsonFile(TEMPLATE_FILE);
  if (!template) {
    console.error('❌ 无法解析模板文件');
    process.exit(1);
  }
  
  const templateKeys = getKeyPaths(template);
  console.log(`📊 模板包含 ${templateKeys.length} 个翻译键\n`);
  
  // 检查每个语言文件
  const results = {};
  
  for (const language of LANGUAGES) {
    const result = checkLanguageFile(language, templateKeys);
    results[language] = result;
    
    if (!result) {
      console.log(`❌ ${language}: 文件解析失败`);
      continue;
    }
    
    if (!result.exists) {
      console.log(`⚠️  ${language}: 文件不存在`);
      continue;
    }
    
    const status = result.coverage === 100 ? '✅' : result.coverage >= 90 ? '⚠️' : '❌';
    console.log(`${status} ${language}: ${result.coverage}% (${result.total - result.missing}/${result.total} 键)`);
    
    if (result.missingKeys.length > 0) {
      console.log(`   缺失键: ${result.missingKeys.length}`);
      if (result.missingKeys.length <= 5) {
        result.missingKeys.forEach(key => console.log(`     - ${key}`));
      } else {
        result.missingKeys.slice(0, 3).forEach(key => console.log(`     - ${key}`));
        console.log(`     ... 还有 ${result.missingKeys.length - 3} 个`);
      }
    }
    
    if (result.extraKeys.length > 0) {
      console.log(`   额外键: ${result.extraKeys.length}`);
      if (result.extraKeys.length <= 3) {
        result.extraKeys.forEach(key => console.log(`     + ${key}`));
      }
    }
    
    console.log('');
  }
  
  // 总结
  console.log('📈 总结:');
  const totalLanguages = LANGUAGES.length;
  const existingLanguages = Object.values(results).filter(r => r && r.exists).length;
  const completeLanguages = Object.values(results).filter(r => r && r.exists && r.coverage === 100).length;
  
  console.log(`   总语言数: ${totalLanguages}`);
  console.log(`   存在文件: ${existingLanguages}`);
  console.log(`   完整覆盖: ${completeLanguages}`);
  
  const averageCoverage = Object.values(results)
    .filter(r => r && r.exists)
    .reduce((sum, r) => sum + r.coverage, 0) / existingLanguages;
  
  console.log(`   平均覆盖率: ${Math.round(averageCoverage)}%`);
  
  // 建议
  console.log('\n💡 建议:');
  
  const needsUpdate = Object.entries(results)
    .filter(([lang, result]) => result && result.exists && result.coverage < 100)
    .map(([lang]) => lang);
  
  if (needsUpdate.length > 0) {
    console.log(`   需要更新的语言: ${needsUpdate.join(', ')}`);
  }
  
  const missing = Object.entries(results)
    .filter(([lang, result]) => !result || !result.exists)
    .map(([lang]) => lang);
  
  if (missing.length > 0) {
    console.log(`   缺失的语言文件: ${missing.join(', ')}`);
  }
  
  if (completeLanguages === totalLanguages) {
    console.log('   🎉 所有翻译文件都是完整的！');
  }
}

// 运行检查
if (require.main === module) {
  checkTranslations();
}

module.exports = { checkTranslations, getKeyPaths };