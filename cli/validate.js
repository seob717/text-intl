/**
 * Validate translations across all locales
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { glob } from 'glob';

/**
 * Extract variables from a translation string
 */
function extractVariables(text) {
  const matches = text.match(/\{(\w+)\}/g) || [];
  return matches.map(m => m.slice(1, -1));
}

/**
 * Validate translations
 */
export async function validateTranslations(config) {
  const { sourceLocale, locales, messagesDir } = config;
  const issues = [];
  const stats = {
    total: 0,
    missing: 0,
    variableMismatch: 0,
    empty: 0,
  };

  // Find all namespace files
  const pattern = join(messagesDir, sourceLocale, '*.json');
  const sourceFiles = await glob(pattern);

  for (const sourceFile of sourceFiles) {
    const namespace = sourceFile.split('/').pop().replace('.json', '');
    const sourceMessages = JSON.parse(readFileSync(sourceFile, 'utf-8'));
    const keys = Object.keys(sourceMessages);
    stats.total += keys.length;

    // Check each target locale
    for (const targetLocale of locales) {
      if (targetLocale === sourceLocale) continue;

      const targetFile = resolve(messagesDir, targetLocale, `${namespace}.json`);

      if (!existsSync(targetFile)) {
        issues.push({
          type: 'missing_file',
          locale: targetLocale,
          namespace,
          message: `Missing file: ${targetLocale}/${namespace}.json`,
        });
        stats.missing += keys.length;
        continue;
      }

      const targetMessages = JSON.parse(readFileSync(targetFile, 'utf-8'));

      for (const key of keys) {
        const sourceValue = sourceMessages[key];
        const targetValue = targetMessages[key];

        // Check for missing translation
        if (targetValue === undefined) {
          issues.push({
            type: 'missing',
            locale: targetLocale,
            namespace,
            key,
            message: `Missing translation for "${key}"`,
          });
          stats.missing++;
          continue;
        }

        // Check for empty translation
        if (targetValue === '') {
          issues.push({
            type: 'empty',
            locale: targetLocale,
            namespace,
            key,
            message: `Empty translation for "${key}"`,
          });
          stats.empty++;
          continue;
        }

        // Check for variable mismatch
        const sourceVars = extractVariables(sourceValue);
        const targetVars = extractVariables(targetValue);

        const missingVars = sourceVars.filter(v => !targetVars.includes(v));
        const extraVars = targetVars.filter(v => !sourceVars.includes(v));

        if (missingVars.length > 0 || extraVars.length > 0) {
          issues.push({
            type: 'variable_mismatch',
            locale: targetLocale,
            namespace,
            key,
            message: `Variable mismatch in "${key}"`,
            details: {
              missing: missingVars,
              extra: extraVars,
            },
          });
          stats.variableMismatch++;
        }
      }

      // Check for extra keys in target (not in source)
      const extraKeys = Object.keys(targetMessages).filter(k => !keys.includes(k));
      for (const key of extraKeys) {
        issues.push({
          type: 'extra',
          locale: targetLocale,
          namespace,
          key,
          message: `Extra key "${key}" not in source`,
        });
      }
    }
  }

  return { issues, stats };
}

/**
 * Print validation report
 */
export function printReport({ issues, stats }) {
  console.log('\n📊 Validation Report\n');
  console.log(`   Total keys: ${stats.total}`);
  console.log(`   Missing: ${stats.missing}`);
  console.log(`   Empty: ${stats.empty}`);
  console.log(`   Variable mismatch: ${stats.variableMismatch}`);

  if (issues.length === 0) {
    console.log('\n✅ All translations are valid!\n');
    return true;
  }

  console.log(`\n⚠️  Found ${issues.length} issues:\n`);

  // Group by type
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }

  const typeLabels = {
    missing_file: '📁 Missing Files',
    missing: '❌ Missing Translations',
    empty: '⚪ Empty Translations',
    variable_mismatch: '🔀 Variable Mismatches',
    extra: '➕ Extra Keys',
  };

  for (const [type, items] of Object.entries(grouped)) {
    console.log(`${typeLabels[type] || type}:`);
    for (const item of items.slice(0, 10)) {
      console.log(`   [${item.locale}/${item.namespace}] ${item.message}`);
      if (item.details) {
        if (item.details.missing?.length) {
          console.log(`      Missing vars: {${item.details.missing.join('}, {')}}`);
        }
        if (item.details.extra?.length) {
          console.log(`      Extra vars: {${item.details.extra.join('}, {')}}`);
        }
      }
    }
    if (items.length > 10) {
      console.log(`   ... and ${items.length - 10} more\n`);
    }
    console.log('');
  }

  return false;
}
