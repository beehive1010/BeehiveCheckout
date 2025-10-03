#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 递归获取所有翻译键
function getAllKeys(obj, prefix = '') {
  const keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

// 读取翻译文件
function loadTranslation(lang) {
  const filePath = path.join(__dirname, 'src/translations', `${lang}.json`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${lang}.json:`, error.message);
    return null;
  }
}

// 主程序
const languages = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'ms', 'th'];
const translations = {};
const allKeys = {};

console.log('📊 Loading translation files...\n');

// 加载所有翻译文件
for (const lang of languages) {
  const translation = loadTranslation(lang);
  if (translation) {
    translations[lang] = translation;
    allKeys[lang] = new Set(getAllKeys(translation));
    console.log(`✅ ${lang.padEnd(6)}: ${allKeys[lang].size} keys`);
  }
}

console.log('\n' + '='.repeat(80));

// 使用 en 作为参考模板
const referenceKeys = allKeys['en'];
console.log(`\n📋 Using 'en' as reference template (${referenceKeys.size} keys)\n`);

// 检查每种语言缺失的键
for (const lang of languages) {
  if (lang === 'en') continue;

  const langKeys = allKeys[lang];
  const missingKeys = [...referenceKeys].filter(key => !langKeys.has(key));
  const extraKeys = [...langKeys].filter(key => !referenceKeys.has(key));

  console.log(`\n🔍 ${lang.toUpperCase()}:`);
  console.log(`   Total keys: ${langKeys.size}`);
  console.log(`   Missing keys: ${missingKeys.length}`);
  console.log(`   Extra keys: ${extraKeys.length}`);

  if (missingKeys.length > 0 && missingKeys.length <= 20) {
    console.log(`\n   Missing keys in ${lang}:`);
    missingKeys.forEach(key => console.log(`   - ${key}`));
  } else if (missingKeys.length > 20) {
    console.log(`\n   First 20 missing keys in ${lang}:`);
    missingKeys.slice(0, 20).forEach(key => console.log(`   - ${key}`));
    console.log(`   ... and ${missingKeys.length - 20} more`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Translation audit complete!\n');
