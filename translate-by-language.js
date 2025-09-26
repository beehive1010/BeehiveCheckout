import fs from 'fs';

// DeepL API配置
const DEEPL_API_KEY = 'a1885611-3d08-40c1-889a-dfaa129d54d6:fx';
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// 语言映射（DeepL支持的语言代码）
const LANGUAGE_MAP = {
  'zh': 'ZH',
  'zh-tw': 'ZH-HANT', 
  'th': 'TH',
  'ms': 'MS',
  'ko': 'KO',
  'ja': 'JA'
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function translateText(text, targetLang) {
  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'text': text,
        'source_lang': 'EN',
        'target_lang': targetLang,
        'preserve_formatting': '1',
        'split_sentences': '0'
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations[0].text;
  } catch (error) {
    console.warn(`Translation failed: ${error.message}`);
    return text; // 返回原文作为备用
  }
}

async function translateSingleLanguage(langCode, maxTranslations = 500) {
  console.log(`\n🎯 开始翻译 ${langCode} 语言...`);
  
  const deeplCode = LANGUAGE_MAP[langCode];
  if (!deeplCode) {
    console.error(`❌ 不支持的语言: ${langCode}`);
    return;
  }
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // 获取英语基准翻译
    console.log('📚 获取英语基准翻译...');
    const enQuery = `
      export PGPASSWORD=bee8881941 && 
      psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres -t -c "
      SELECT translation_key || '|||' || translated_text FROM app_translations 
      WHERE language_code = 'en' 
      ORDER BY translation_key 
      LIMIT ${maxTranslations * 2};
      "
    `;
    
    const { stdout: enOutput } = await execAsync(enQuery);
    const englishTranslations = {};
    enOutput.trim().split('\n').forEach(line => {
      const parts = line.trim().split('|||');
      if (parts.length >= 2) {
        const key = parts[0];
        const text = parts.slice(1).join('|||');
        englishTranslations[key] = text;
      }
    });
    
    console.log(`✅ 加载了 ${Object.keys(englishTranslations).length} 个英语翻译`);
    
    // 获取现有翻译
    const existingQuery = `
      export PGPASSWORD=bee8881941 && 
      psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres -t -c "
      SELECT translation_key FROM app_translations WHERE language_code = '${langCode}';
      "
    `;
    
    const { stdout: existingOutput } = await execAsync(existingQuery);
    const existingKeys = new Set(
      existingOutput.trim().split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0)
    );
    
    // 找出缺失的翻译键
    const allEnglishKeys = Object.keys(englishTranslations);
    const missingKeys = allEnglishKeys.filter(key => !existingKeys.has(key));
    
    console.log(`📊 ${langCode} 统计:`);
    console.log(`  现有翻译: ${existingKeys.size} 个`);
    console.log(`  缺失翻译: ${missingKeys.length} 个`);
    console.log(`  计划翻译: ${Math.min(missingKeys.length, maxTranslations)} 个`);
    
    if (missingKeys.length === 0) {
      console.log(`✅ ${langCode} 已完整，无需翻译`);
      return;
    }
    
    // 限制翻译数量
    const keysToTranslate = missingKeys.slice(0, maxTranslations);
    const insertStatements = [];
    
    console.log(`\n🚀 开始翻译 ${keysToTranslate.length} 个缺失翻译...`);
    
    let translatedCount = 0;
    for (const key of keysToTranslate) {
      const englishText = englishTranslations[key];
      if (!englishText) continue;
      
      try {
        console.log(`  [${translatedCount + 1}/${keysToTranslate.length}] 翻译: ${key.substring(0, 50)}...`);
        
        const translatedText = await translateText(englishText, deeplCode);
        const category = key.split('.')[0];
        
        insertStatements.push(`
INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('${key.replace(/'/g, "''")}', '${langCode}', '${translatedText.replace(/'/g, "''")}', '${category}', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();`);
        
        translatedCount++;
        
        // API限制：每分钟最多500次请求
        await delay(200); // 每个请求间隔200ms
        
        // 每100个翻译保存一次进度
        if (translatedCount > 0 && translatedCount % 100 === 0) {
          const progressSql = `-- ${langCode} 进度保存 (${translatedCount}/${keysToTranslate.length})
BEGIN;
${insertStatements.slice(-100).join('\n')}
COMMIT;`;
          
          fs.writeFileSync(`./progress-${langCode}-${translatedCount}.sql`, progressSql);
          console.log(`    💾 进度已保存: progress-${langCode}-${translatedCount}.sql`);
        }
        
      } catch (error) {
        console.warn(`    ⚠️  翻译失败: ${key} - ${error.message}`);
      }
    }
    
    // 生成最终SQL文件
    const sqlContent = `-- ${langCode} 翻译补全 (生成时间: ${new Date().toISOString()})
-- 翻译数量: ${translatedCount} 个

BEGIN;

${insertStatements.join('\n')}

COMMIT;

-- 验证结果
SELECT '${langCode}' as language, COUNT(*) as new_translations;
`;
    
    const filename = `./translate-${langCode}.sql`;
    fs.writeFileSync(filename, sqlContent);
    
    console.log(`\n✅ ${langCode} 翻译完成:`);
    console.log(`  翻译数量: ${translatedCount} 个`);
    console.log(`  SQL文件: ${filename}`);
    
    return {
      language: langCode,
      translated: translatedCount,
      filename
    };
    
  } catch (error) {
    console.error(`❌ ${langCode} 翻译失败:`, error);
    throw error;
  }
}

// 命令行参数解析
const args = process.argv.slice(2);
const targetLang = args[0];
const maxTranslations = parseInt(args[1]) || 500;

if (!targetLang) {
  console.log('使用方法: node translate-by-language.js <语言代码> [最大翻译数量]');
  console.log('支持的语言: zh, zh-tw, th, ms, ko, ja');
  console.log('例如: node translate-by-language.js zh-tw 500');
  process.exit(1);
}

if (!LANGUAGE_MAP[targetLang]) {
  console.error(`❌ 不支持的语言: ${targetLang}`);
  console.log('支持的语言: zh, zh-tw, th, ms, ko, ja');
  process.exit(1);
}

console.log(`🎯 开始翻译任务: ${targetLang} (最大 ${maxTranslations} 个翻译)`);

translateSingleLanguage(targetLang, maxTranslations)
  .then(result => {
    if (result) {
      console.log('\n🎉 翻译任务完成!');
      console.log(`💡 执行以下命令来更新数据库:`);
      console.log(`export PGPASSWORD=bee8881941 && psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres -f ${result.filename}`);
    }
  })
  .catch(error => {
    console.error('💥 翻译任务失败:', error);
    process.exit(1);
  });