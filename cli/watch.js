/**
 * Watch mode for automatic extraction
 */

import chokidar from 'chokidar';
import { resolve } from 'path';
import { extractMessages } from './extract.js';

export async function watchFiles(config, cwd = process.cwd()) {
  let timer = null;
  let isProcessing = false;

  const processChanges = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      console.log('🔄 Extracting messages...');
      const result = await extractMessages(config, cwd);
      console.log(`✅ Found ${result.total} messages (${result.new} new)`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      isProcessing = false;
    }
  };

  const debounce = (delay = 300) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(processChanges, delay);
  };

  // Watch source files
  const patterns = config.include.map(pattern => resolve(cwd, pattern));

  const watcher = chokidar.watch(patterns, {
    ignored: config.exclude?.map(pattern => resolve(cwd, pattern)),
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('add', () => debounce());
  watcher.on('change', () => debounce());
  watcher.on('unlink', () => debounce());

  console.log('👀 Watching for changes...');
  console.log(`   Patterns: ${config.include.join(', ')}`);

  // Initial extraction
  await processChanges();

  return () => {
    if (timer) clearTimeout(timer);
    watcher.close();
  };
}
