import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load translation files
const en = JSON.parse(fs.readFileSync('/home/ubuntu/projects/BEEHIVE-V2/src/translations/en.json'));
const zh = JSON.parse(fs.readFileSync('/home/ubuntu/projects/BEEHIVE-V2/src/translations/zh.json'));

function flattenObject(obj, prefix = '') {
  const flattened = [];
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattened.push(...flattenObject(value, newKey));
    } else {
      flattened.push({ key: newKey, value: String(value) });
    }
  }
  return flattened;
}

async function populateTranslations() {
  console.log('🌍 Starting translation population via PostgreSQL...');
  
  // Flatten translation objects
  const enKeys = flattenObject(en);
  const zhKeys = flattenObject(zh);
  
  console.log(`📊 Found ${enKeys.length} English keys and ${zhKeys.length} Chinese keys`);
  
  // Clear existing translations
  console.log('🗑️ Clearing existing translations...');
  try {
    await execAsync(`PGPASSWORD=bee8881941 psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -c "DELETE FROM app_translations;"`);
    console.log('✅ Cleared existing translations');
  } catch (error) {
    console.error('❌ Error clearing translations:', error.message);
  }
  
  // Prepare SQL inserts in batches
  const batchSize = 100;
  const translations = [];
  
  // Add English translations
  enKeys.forEach(item => {
    const category = item.key.split('.')[0] || 'general';
    const escapedKey = item.key.replace(/'/g, "''");
    const escapedValue = item.value.replace(/'/g, "''");
    const escapedCategory = category.replace(/'/g, "''");
    
    translations.push(`('${escapedKey}', 'en', '${escapedValue}', '${escapedCategory}', 'English translation for ${escapedKey}')`);
  });
  
  // Add Chinese translations
  zhKeys.forEach(item => {
    const category = item.key.split('.')[0] || 'general';
    const escapedKey = item.key.replace(/'/g, "''");
    const escapedValue = item.value.replace(/'/g, "''");
    const escapedCategory = category.replace(/'/g, "''");
    
    translations.push(`('${escapedKey}', 'zh', '${escapedValue}', '${escapedCategory}', 'Chinese translation for ${escapedKey}')`);
  });
  
  console.log(`📝 Inserting ${translations.length} translation records...`);
  
  // Insert translations in batches
  for (let i = 0; i < translations.length; i += batchSize) {
    const batch = translations.slice(i, i + batchSize);
    const valuesString = batch.join(',\n  ');
    
    const insertSQL = `
      INSERT INTO app_translations (translation_key, language_code, translated_text, category, context)
      VALUES 
        ${valuesString}
      ON CONFLICT (translation_key, language_code) 
      DO UPDATE SET 
        translated_text = EXCLUDED.translated_text,
        category = EXCLUDED.category,
        context = EXCLUDED.context,
        updated_at = NOW();
    `;
    
    try {
      await execAsync(`PGPASSWORD=bee8881941 psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -c "${insertSQL.replace(/"/g, '\\"')}"`);
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
    } catch (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
  
  // Verify insertion
  try {
    const { stdout } = await execAsync(`PGPASSWORD=bee8881941 psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -t -c "SELECT COUNT(*) FROM app_translations;"`);
    const count = parseInt(stdout.trim());
    console.log(`🎉 Translation population complete! Total records: ${count}`);
  } catch (error) {
    console.error('❌ Error verifying count:', error.message);
  }
}

populateTranslations().catch(console.error);