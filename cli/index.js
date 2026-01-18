#!/usr/bin/env node

/**
 * CLI entry point
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractMessages } from './extract.js';
import { watchFiles } from './watch.js';
import { validateTranslations, printReport } from './validate.js';

async function loadConfig() {
  const cwd = process.cwd();
  const extensions = ['.ts', '.js'];

  for (const ext of extensions) {
    const configPath = resolve(cwd, `i18n.config${ext}`);
    try {
      const { default: config } = await import(configPath);
      return config;
    } catch (error) {
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

    default: {
      console.log('Usage:');
      console.log('  i18n extract   - Extract messages from source');
      console.log('  i18n watch     - Watch and auto-extract');
      console.log('  i18n validate  - Validate translations');
      process.exit(1);
    }
  }
}

main().catch(console.error);
