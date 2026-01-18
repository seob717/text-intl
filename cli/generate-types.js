/**
 * Generate TypeScript types from meta files
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Generate TypeScript types for i18n messages
 * @param {Object} config - i18n configuration
 * @param {string} cwd - Current working directory
 */
export function generateTypes(config, cwd = process.cwd()) {
  const messagesDir = resolve(cwd, config.messagesDir);
  const sourceLocale = config.sourceLocale;
  const sourceLocaleDir = resolve(messagesDir, sourceLocale);

  // Collect all message keys from meta files
  const namespaces = {};

  // Read all namespaces from source locale
  const files = readdirSync(sourceLocaleDir);

  for (const file of files) {
    if (!file.endsWith('.meta.json')) continue;

    const namespace = file.replace('.meta.json', '');
    const metaPath = resolve(sourceLocaleDir, file);

    if (!existsSync(metaPath)) continue;

    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    namespaces[namespace] = Object.keys(meta);
  }

  // Generate TypeScript union types
  let typeDefinition = `/**
 * Auto-generated types for i18n messages
 * Do not edit manually - generated from meta files
 */

export type Locale = ${config.locales.map((l) => `'${l}'`).join(' | ')};

`;

  for (const [namespace, keys] of Object.entries(namespaces)) {
    const sortedKeys = keys.sort();
    const typeLines = sortedKeys.map((key) => {
      // Escape special characters for TypeScript string literals
      const escaped = key
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      return `  | '${escaped}'`;
    });

    typeDefinition += `export type ${capitalize(namespace)}MessageKey =\n${typeLines.join('\n')};\n\n`;
  }

  // Generate namespace type
  typeDefinition += `export type Namespace = ${Object.keys(namespaces)
    .map((n) => `'${n}'`)
    .join(' | ')};\n\n`;

  // Generate Messages type
  typeDefinition += `export type Messages = {\n`;
  typeDefinition += `  [L in Locale]: {\n`;
  for (const namespace of Object.keys(namespaces)) {
    typeDefinition += `    ${namespace}: Record<${capitalize(namespace)}MessageKey, string>;\n`;
  }
  typeDefinition += `  };\n`;
  typeDefinition += `};\n`;

  // Write to file
  const outputPath = resolve(messagesDir, 'types.ts');
  writeFileSync(outputPath, typeDefinition, 'utf-8');

  console.log(`✅ Generated types: ${outputPath}`);

  return outputPath;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
