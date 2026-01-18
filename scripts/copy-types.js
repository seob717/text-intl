#!/usr/bin/env node

/**
 * Copy manually written .d.ts files to dist folder
 * and add "use client" directive to React adapter files
 */

import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const files = ['src/index.d.ts', 'src/react.d.ts', 'src/config.d.ts', 'src/errors.d.ts'];

const distDir = resolve(root, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

files.forEach((file) => {
  const src = resolve(root, file);
  const destESM = resolve(root, file.replace('src/', 'dist/'));
  const destCJS = resolve(root, file.replace('src/', 'dist/').replace('.d.ts', '.d.cts'));

  try {
    copyFileSync(src, destESM);
    copyFileSync(src, destCJS);
    console.log(`✓ Copied ${file} → dist/`);
  } catch (error) {
    console.error(`✗ Failed to copy ${file}:`, error.message);
    process.exit(1);
  }
});

console.log('\n✅ Type definitions copied successfully');

// Add "use client" directive to React adapter files
const reactFiles = [resolve(root, 'dist/react.js'), resolve(root, 'dist/react.cjs')];

reactFiles.forEach((file) => {
  try {
    let content = readFileSync(file, 'utf-8');

    // Remove any existing "use client" directives first
    content = content.replace(/^["']use client["'];?\s*\n/gm, '');

    // Add single "use client" at the top
    const newContent = '"use client";\n' + content;
    writeFileSync(file, newContent, 'utf-8');
    console.log(`✓ Added "use client" to ${file.split('/').pop()}`);
  } catch (error) {
    console.error(`✗ Failed to add "use client" to ${file}:`, error.message);
    process.exit(1);
  }
});

console.log('\n✅ Build post-processing completed');
