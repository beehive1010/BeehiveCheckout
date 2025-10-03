#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively get all translation keys with their values
function getAllKeysWithValues(obj, prefix = '') {
  const result = {};

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, getAllKeysWithValues(obj[key], fullKey));
    } else {
      result[fullKey] = obj[key];
    }
  }

  return result;
}

// Load translation file
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

// Set value at nested path in object
function setValueAtPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    // If the current key doesn't exist or is not an object, create/replace it with an object
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object' || Array.isArray(current[keys[i]])) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

// Main program
const reference = 'zh-tw'; // Use zh-tw as the most complete template
const targetLanguages = ['zh', 'ja', 'ko', 'ms', 'th'];

console.log(`📋 Using '${reference}' as the complete template\n`);

// Load reference translation
const referenceData = loadTranslation(reference);
if (!referenceData) {
  console.error('❌ Failed to load reference translation');
  process.exit(1);
}

const referenceKeys = getAllKeysWithValues(referenceData);
console.log(`✅ Reference template loaded: ${Object.keys(referenceKeys).length} keys\n`);
console.log('='.repeat(80));

// Process each target language
for (const lang of targetLanguages) {
  console.log(`\n🔧 Processing ${lang.toUpperCase()}...`);

  const targetData = loadTranslation(lang);
  if (!targetData) {
    console.log(`❌ Skipping ${lang} - failed to load`);
    continue;
  }

  const targetKeys = getAllKeysWithValues(targetData);
  const missingKeys = Object.keys(referenceKeys).filter(key => !(key in targetKeys));

  console.log(`   Current keys: ${Object.keys(targetKeys).length}`);
  console.log(`   Missing keys: ${missingKeys.length}`);

  if (missingKeys.length > 0) {
    // Add missing keys with reference values
    const updatedData = JSON.parse(JSON.stringify(targetData)); // Deep clone

    for (const key of missingKeys) {
      setValueAtPath(updatedData, key, referenceKeys[key]);
    }

    // Save updated translation file
    const filePath = path.join(__dirname, 'src/translations', `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2) + '\n', 'utf8');

    console.log(`   ✅ Added ${missingKeys.length} missing keys to ${lang}.json`);
    console.log(`   📝 Total keys now: ${Object.keys(getAllKeysWithValues(updatedData)).length}`);
  } else {
    console.log(`   ✅ No missing keys - ${lang}.json is complete!`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n🎉 Translation synchronization complete!\n');
console.log('⚠️  Note: New keys have been added with zh-tw translations.');
console.log('   Please review and translate them to the appropriate language.\n');
