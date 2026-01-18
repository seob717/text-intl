/**
 * Extract messages from source code (gettext style with namespace support)
 * Generates hash-based keys for JSON files and maintains source-to-hash mapping in meta files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { glob } from 'glob';
import { createHash } from 'crypto';

const DEFAULT_NAMESPACE = 'common';

/**
 * Generate a stable hash for a message
 * Uses SHA256 and returns first 8 characters for readability
 * @param {string} text - Source text
 * @returns {string} Hash string (8 chars)
 */
function generateMessageHash(text) {
  return createHash('sha256')
    .update(text, 'utf8')
    .digest('hex')
    .substring(0, 8);
}

/**
 * Extract t() calls from a file with namespace detection
 * Detects: const { t } = useTranslation('namespace')
 */
function extractFromFile(filePath) {
  const code = readFileSync(filePath, 'utf-8');
  // Map: namespace -> Set of messages
  const namespaceMessages = new Map();

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const traverseFn = traverse.default || traverse;

    // Track which variable names are bound to which namespace
    // e.g., { t: 'cart' } means t() calls belong to 'cart' namespace
    const tBindings = new Map();
    let defaultNamespace = DEFAULT_NAMESPACE;

    traverseFn(ast, {
      // Detect: const { t } = useTranslation('namespace')
      // or: const { t: translate } = useTranslation('namespace')
      VariableDeclarator(path) {
        const init = path.node.init;
        if (
          init?.type === 'CallExpression' &&
          init.callee?.name === 'useTranslation'
        ) {
          // Get namespace from argument (default: 'common')
          const namespace = init.arguments[0]?.value || DEFAULT_NAMESPACE;

          // Get the destructured 't' variable name
          const id = path.node.id;
          if (id.type === 'ObjectPattern') {
            for (const prop of id.properties) {
              // { t } or { t: customName }
              const keyName = prop.key?.name;
              const localName = prop.value?.name || prop.key?.name;

              if (keyName === 't') {
                tBindings.set(localName, namespace);
              }
            }
          }
        }
      },

      // Detect t() calls
      CallExpression(path) {
        const calleeName = path.node.callee.name;

        // Check if this is a bound t function
        if (tBindings.has(calleeName)) {
          const namespace = tBindings.get(calleeName);
          const firstArg = path.node.arguments[0];

          if (firstArg?.type === 'StringLiteral') {
            if (!namespaceMessages.has(namespace)) {
              namespaceMessages.set(namespace, new Set());
            }
            namespaceMessages.get(namespace).add(firstArg.value);
          }
        }
        // Fallback: bare t() call without useTranslation (use default namespace)
        else if (calleeName === 't') {
          const firstArg = path.node.arguments[0];

          if (firstArg?.type === 'StringLiteral') {
            if (!namespaceMessages.has(defaultNamespace)) {
              namespaceMessages.set(defaultNamespace, new Set());
            }
            namespaceMessages.get(defaultNamespace).add(firstArg.value);
          }
        }
      },
    });
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error.message);
  }

  return namespaceMessages;
}

/**
 * Extract messages from all files (namespace-aware)
 */
export async function extractMessages(config, cwd = process.cwd()) {
  const messagesDir = resolve(cwd, config.messagesDir);

  // Find all source files
  const files = await glob(config.include, {
    cwd,
    ignore: config.exclude || [],
    absolute: true,
  });

  // Collect all messages by namespace
  // Map: namespace -> Set of messages
  const allNamespaceMessages = new Map();

  for (const file of files) {
    const namespaceMessages = extractFromFile(file);

    for (const [namespace, messages] of namespaceMessages) {
      if (!allNamespaceMessages.has(namespace)) {
        allNamespaceMessages.set(namespace, new Set());
      }
      for (const msg of messages) {
        allNamespaceMessages.get(namespace).add(msg);
      }
    }
  }

  // Update each locale's namespace files
  let newCount = 0;
  let totalMessages = 0;

  for (const locale of config.locales) {
    // Ensure locale directory exists: messages/ko/, messages/en/
    const localeDir = resolve(messagesDir, locale);
    if (!existsSync(localeDir)) {
      mkdirSync(localeDir, { recursive: true });
    }

    for (const [namespace, messages] of allNamespaceMessages) {
      totalMessages += messages.size;

      // File paths
      const namespacePath = resolve(localeDir, `${namespace}.json`);
      const metaPath = resolve(localeDir, `${namespace}.meta.json`);
      
      // Load existing files
      let existingMessages = {};
      let existingMeta = {};

      if (existsSync(namespacePath)) {
        existingMessages = JSON.parse(readFileSync(namespacePath, 'utf-8'));
      }
      if (existsSync(metaPath)) {
        existingMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      }

      // Build source-to-hash and hash-to-translation maps
      const updatedMeta = { ...existingMeta };
      const updatedMessages = {};

      for (const sourceText of messages) {
        // Check if we already have a hash for this source text
        let hash = existingMeta[sourceText];
        
        if (!hash) {
          // Generate new hash
          hash = generateMessageHash(sourceText);
          
          // Handle hash collision (unlikely but possible)
          let attempts = 0;
          while (Object.values(updatedMeta).includes(hash) && attempts < 100) {
            hash = generateMessageHash(sourceText + attempts);
            attempts++;
          }
          
          newCount++;
        }

        // Update meta mapping
        updatedMeta[sourceText] = hash;

        // Update message translation
        // If translation exists, preserve it; otherwise set to source for sourceLocale
        const existingTranslation = existingMessages[hash];
        updatedMessages[hash] = existingTranslation !== undefined 
          ? existingTranslation 
          : (locale === config.sourceLocale ? sourceText : '');
      }

      // Remove deleted messages (messages not in current extraction)
      // Clean up meta entries that are no longer in source
      for (const sourceText of Object.keys(existingMeta)) {
        if (!messages.has(sourceText)) {
          delete updatedMeta[sourceText];
          // Also remove from messages using the old hash
          const oldHash = existingMeta[sourceText];
          if (oldHash && updatedMessages[oldHash] === undefined) {
            delete updatedMessages[oldHash];
          }
        }
      }

      // Write meta file (sorted by source text for better diffs)
      const sortedMeta = Object.keys(updatedMeta)
        .sort()
        .reduce((acc, key) => {
          acc[key] = updatedMeta[key];
          return acc;
        }, {});

      writeFileSync(metaPath, JSON.stringify(sortedMeta, null, 2) + '\n', 'utf-8');

      // Write messages file (sorted by hash)
      const sortedMessages = Object.keys(updatedMessages)
        .sort()
        .reduce((acc, key) => {
          acc[key] = updatedMessages[key];
          return acc;
        }, {});

      writeFileSync(namespacePath, JSON.stringify(sortedMessages, null, 2) + '\n', 'utf-8');
    }
  }

  // Log namespaces found
  const namespaces = Array.from(allNamespaceMessages.keys());
  if (namespaces.length > 0) {
    console.log(`📁 Namespaces: ${namespaces.join(', ')}`);
  }

  // Generate TypeScript types from meta files
  generateTypes(config, messagesDir);

  return {
    total: totalMessages,
    new: newCount,
    namespaces: namespaces,
  };
}

/**
 * Generate TypeScript types from meta files
 * @param {Object} config - i18n configuration
 * @param {string} messagesDir - Messages directory path
 */
function generateTypes(config, messagesDir) {
  const sourceLocale = config.sourceLocale;
  const sourceLocaleDir = resolve(messagesDir, sourceLocale);

  if (!existsSync(sourceLocaleDir)) {
    return;
  }

  // Collect all message keys from meta files
  const namespaces = {};

  const files = readdirSync(sourceLocaleDir);
  
  for (const file of files) {
    if (!file.endsWith('.meta.json')) continue;
    
    const namespace = file.replace('.meta.json', '');
    const metaPath = resolve(sourceLocaleDir, file);
    
    if (!existsSync(metaPath)) continue;
    
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    namespaces[namespace] = Object.keys(meta);
  }

  if (Object.keys(namespaces).length === 0) {
    return;
  }

  // Analyze each message to extract parameters
  const messageParams = {};
  for (const [namespace, keys] of Object.entries(namespaces)) {
    messageParams[namespace] = {};
    for (const key of keys) {
      messageParams[namespace][key] = extractParameters(key);
    }
  }

  // Generate TypeScript union types
  let typeDefinition = `/**
 * Auto-generated types for i18n messages
 * Do not edit manually - generated from meta files
 */

import type { TagHandler } from '@unknown/i18n';

export type Locale = ${config.locales.map(l => `'${l}'`).join(' | ')};

`;

  for (const [namespace, keys] of Object.entries(namespaces)) {
    const sortedKeys = keys.sort();
    const typeLines = sortedKeys.map(key => {
      // Escape special characters for TypeScript string literals
      const escaped = key
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      return `  | '${escaped}'`;
    });

    const capitalizedNamespace = namespace.charAt(0).toUpperCase() + namespace.slice(1);
    typeDefinition += `export type ${capitalizedNamespace}MessageKey =\n${typeLines.join('\n')};\n\n`;
  }

  // Generate namespace type
  typeDefinition += `export type Namespace = ${Object.keys(namespaces).map(n => `'${n}'`).join(' | ')};\n\n`;

  // Generate parameter types for each message
  typeDefinition += `export type MessageParams<T extends string> = \n`;
  for (const [namespace, keys] of Object.entries(namespaces)) {
    for (const key of keys) {
      const params = messageParams[namespace][key];
      const escaped = key
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      
      if (params.variables.length === 0 && params.tags.length === 0) {
        typeDefinition += `  T extends '${escaped}' ? undefined :\n`;
      } else {
        const varTypes = params.variables.map(v => `${v}: string | number | Date | boolean`);
        const tagTypes = params.tags.map(t => `${t}?: TagHandler`);
        const allTypes = [...varTypes, ...tagTypes].join('; ');
        typeDefinition += `  T extends '${escaped}' ? { ${allTypes} } :\n`;
      }
    }
  }
  typeDefinition += `  Record<string, any>;\n`;

  // Write to file
  const outputPath = resolve(messagesDir, 'types.ts');
  writeFileSync(outputPath, typeDefinition, 'utf-8');
  
  console.log(`✅ Generated types: ${outputPath}`);
}

/**
 * Extract parameters (variables and tags) from a message
 * @param {string} text - Message text
 * @returns {{ variables: string[], tags: string[] }}
 */
function extractParameters(text) {
  const variables = new Set();
  const tags = new Set();

  // Extract ICU variables: {var, type, ...}
  const icuRegex = /\{(\w+)\s*,\s*(plural|select|selectordinal|number|date|time)/g;
  let match;
  while ((match = icuRegex.exec(text)) !== null) {
    variables.add(match[1]);
  }

  // Remove ICU blocks to avoid extracting nested variables
  let cleanedText = text.replace(/\{(\w+)\s*,\s*(plural|select|selectordinal|number|date|time)\s*,[\s\S]*?\}/g, '');

  // Extract simple variables: {var}
  const simpleVarRegex = /\{(\w+)\}/g;
  while ((match = simpleVarRegex.exec(cleanedText)) !== null) {
    variables.add(match[1]);
  }

  // Extract tags: <tag>
  const tagRegex = /<(\w+)>/g;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.add(match[1]);
  }

  return {
    variables: Array.from(variables),
    tags: Array.from(tags)
  };
}
