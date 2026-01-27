#!/usr/bin/env node

/**
 * CLI entry point
 */

import { resolve } from 'path';
import { extractMessages } from './extract.js';
import { watchFiles } from './watch.js';
import { validateTranslations, printReport } from './validate.js';
import { translateAll, translateLocale } from './translate.js';

async function loadConfig() {
  const cwd = process.cwd();
  const extensions = ['.ts', '.js'];

  for (const ext of extensions) {
    const configPath = resolve(cwd, `i18n.config${ext}`);
    try {
      const { default: config } = await import(configPath);
      return config;
    } catch {
      // Try next extension
    }
  }

  console.error('❌ Failed to load i18n.config.ts or i18n.config.js');
  process.exit(1);
}

async function main() {
  const command = process.argv[2];
  const config = await loadConfig();

  switch (command) {
    case 'extract': {
      console.log('🔍 Extracting messages...\n');
      const result = await extractMessages(config);
      console.log('\n✅ Done!');
      console.log(`   Total: ${result.total} messages`);
      console.log(`   New: ${result.new} messages\n`);
      break;
    }

    case 'watch': {
      await watchFiles(config);
      // Keep process running
      await new Promise(() => {});
      break;
    }

    case 'validate': {
      console.log('🔍 Validating translations...');
      const result = await validateTranslations(config);
      const valid = printReport(result);
      process.exit(valid ? 0 : 1);
      break;
    }

    case 'translate': {
      const args = process.argv.slice(3);
      const dryRun = args.includes('--dry-run');
      const localeIndex = args.indexOf('--locale');
      const targetLocale = localeIndex !== -1 ? args[localeIndex + 1] : null;

      if (targetLocale) {
        // Translate specific locale
        if (!config.locales.includes(targetLocale)) {
          console.error(`❌ Unknown locale: ${targetLocale}`);
          console.error(`   Available locales: ${config.locales.join(', ')}`);
          process.exit(1);
        }
        await translateLocale(config, targetLocale, { dryRun });
      } else {
        // Translate all locales
        await translateAll(config, { dryRun });
      }
      console.log('\n✅ Translation complete!');
      break;
    }

    default: {
      console.log('Usage:');
      console.log('  text-intl extract              - Extract messages from source');
      console.log('  text-intl watch                - Watch and auto-extract');
      console.log('  text-intl validate             - Validate translations');
      console.log('  text-intl translate            - AI translate all missing translations');
      console.log('  text-intl translate --locale X - AI translate specific locale');
      console.log('  text-intl translate --dry-run  - Preview translations without changes');
      process.exit(1);
    }
  }
}

main().catch(console.error);
