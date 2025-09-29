import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzUzMTExNSwiZXhwIjoyMDQzMTA3MTE1fQ.qX6Q7nTWvAqSaYV9iEWbYBh1C04qn1PvqJhVLRGdSJw'; // Service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  console.log('🌍 Starting translation population...');
  
  // Flatten translation objects
  const enKeys = flattenObject(en);
  const zhKeys = flattenObject(zh);
  
  console.log(`📊 Found ${enKeys.length} English keys and ${zhKeys.length} Chinese keys`);
  
  // Clear existing translations
  console.log('🗑️ Clearing existing translations...');
  await supabase.from('app_translations').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  
  // Prepare translation records
  const translations = [];
  
  // Add English translations
  enKeys.forEach(item => {
    const category = item.key.split('.')[0] || 'general';
    translations.push({
      translation_key: item.key,
      language_code: 'en',
      translated_text: item.value,
      category: category,
      context: `English translation for ${item.key}`
    });
  });
  
  // Add Chinese translations
  zhKeys.forEach(item => {
    const category = item.key.split('.')[0] || 'general';
    translations.push({
      translation_key: item.key,
      language_code: 'zh',
      translated_text: item.value,
      category: category,
      context: `Chinese translation for ${item.key}`
    });
  });
  
  console.log(`📝 Inserting ${translations.length} translation records...`);
  
  // Insert translations in batches
  const batchSize = 100;
  for (let i = 0; i < translations.length; i += batchSize) {
    const batch = translations.slice(i, i + batchSize);
    const { error } = await supabase
      .from('app_translations')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }
  
  // Verify insertion
  const { count } = await supabase
    .from('app_translations')
    .select('*', { count: 'exact', head: true });
  
  console.log(`🎉 Translation population complete! Total records: ${count}`);
}

populateTranslations().catch(console.error);