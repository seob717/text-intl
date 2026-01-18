/**
 * i18n CLI Configuration Types
 */

export interface I18nConfig {
  /**
   * Source locale (the language used in source code)
   * @example 'ko'
   */
  sourceLocale: string;

  /**
   * All supported locales
   * @example ['ko', 'en', 'ja']
   */
  locales: string[];

  /**
   * Directory where message JSON files are stored
   * @example './messages'
   */
  messagesDir: string;

  /**
   * Glob patterns for files to scan
   * @example ['src/**\/*.{ts,tsx}', 'app/**\/*.{ts,tsx}']
   */
  include: string[];

  /**
   * Glob patterns for files to exclude
   * @example ['**\/*.test.*', '**\/node_modules/**']
   */
  exclude?: string[];
}

/**
 * Define i18n CLI configuration with type inference
 *
 * @example
 * ```typescript
 * // i18n.config.ts
 * import { defineConfig } from '@unknown/i18n/config';
 *
 * export default defineConfig({
 *   sourceLocale: 'ko',
 *   locales: ['ko', 'en'],
 *   messagesDir: './messages',
 *   include: ['src/**\/*.{ts,tsx}', 'app/**\/*.{ts,tsx}'],
 *   exclude: ['**\/*.test.*'],
 * });
 * ```
 */
export function defineConfig(config: I18nConfig): I18nConfig;
