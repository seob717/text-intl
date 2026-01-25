/**
 * Vanilla JS i18n core with namespace support
 * gettext-style translation with ICU MessageFormat support
 */

import { IntlMessageFormat } from 'intl-messageformat';
import { I18nConfigError } from './errors.js';

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Message value is always a string
 * Can be:
 * - Simple text: "Hello"
 * - With variables: "Hello {name}"
 * - ICU MessageFormat: "{count, plural, one {# item} other {# items}}"
 */
export type MessageValue = string;

/** Base message structure: { namespace: { hash: message } } */
export type MessageNamespace = Record<string, MessageValue>;

/** Messages for a single locale: { namespace: messages } */
export type LocaleMessages = Record<string, MessageNamespace>;

/** Full messages object: { locale: { namespace: messages } } */
export type Messages = Record<string, LocaleMessages>;

/** Meta mapping structure: { namespace: { sourceText: hash } } */
export type MetaNamespace = Record<string, string>;

/** Meta for a single locale: { namespace: meta } */
export type LocaleMeta = Record<string, MetaNamespace>;

/** Full meta object: { locale: { namespace: meta } } */
export type Meta = Record<string, LocaleMeta>;

/** Extract locale union from messages object */
export type LocaleOf<M extends Messages> = keyof M & string;

/** Extract namespace union from messages object */
export type NamespaceOf<M extends Messages> = keyof M[LocaleOf<M>] & string;

/** Extract translation keys for a namespace */
export type TranslationKeyOf<
  M extends Messages,
  N extends NamespaceOf<M>,
> = keyof M[LocaleOf<M>][N] & string;

// ============================================================================
// Initialization Config
// ============================================================================

export interface InitConfig {
  locale: string;
  messages: Messages;
  meta?: Meta;
  fallbackLocale?: string;
}

// ============================================================================
// Module State
// ============================================================================

let locale: string = 'ko';
let fallbackLocale: string | null = null;
let messages: Messages = {};
let meta: Meta = {}; // Source text to hash mapping
const DEFAULT_NAMESPACE = 'common';

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Check if a string contains ICU MessageFormat syntax
 * @param text - Text to check
 * @returns True if ICU syntax detected
 */
function isICUMessage(text: string): boolean {
  if (typeof text !== 'string') return false;

  // Check for ICU patterns: {variable, type, ...}
  // Types: plural, select, selectordinal, number, date, time
  return /\{\s*\w+\s*,\s*(plural|select|selectordinal|number|date|time)/.test(text);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize i18n
 * @param config - { locale, messages, meta?, fallbackLocale? }
 * messages structure: { ko: { common: { hash: translation } } }
 * meta structure: { ko: { common: { sourceText: hash } } }
 */
export function init(config: InitConfig): void {
  if (!config || typeof config !== 'object') {
    throw new I18nConfigError('init() requires a config object');
  }
  if (typeof config.locale !== 'string' || !config.locale) {
    throw new I18nConfigError('config.locale must be a non-empty string');
  }
  if (!config.messages || typeof config.messages !== 'object') {
    throw new I18nConfigError('config.messages must be an object');
  }
  if (!config.messages[config.locale]) {
    throw new I18nConfigError(`config.messages["${config.locale}"] is missing`);
  }

  locale = config.locale;
  messages = config.messages;
  meta = config.meta || {};
  fallbackLocale = config.fallbackLocale || null;
}

/**
 * Translate (gettext style with namespace + ICU MessageFormat support)
 * @param text - Source text (will be mapped to hash via meta)
 * @param values - Variable replacements
 * @param namespace - Namespace (default: 'common')
 * @returns Translated text
 *
 * @example
 * // Simple translation
 * t("안녕하세요")  // → "Hello"
 *
 * // With variables
 * t("안녕 {name}", { name: "철수" })  // → "Hello 철수"
 *
 * // ICU Plural
 * t("{count, plural, =0 {no items} one {# item} other {# items}}", { count: 5 })
 * // → "5 items"
 *
 * // ICU Select
 * t("{gender, select, male {He} female {She} other {They}}", { gender: "male" })
 * // → "He"
 */
export function t(
  text: string,
  values?: Record<string, string | number | Date | boolean>,
  namespace: string = DEFAULT_NAMESPACE
): string {
  let translated: string | null = null;

  // Try to find hash via meta mapping
  const hash = meta[locale]?.[namespace]?.[text];

  if (hash) {
    // Found hash in current locale's meta, look up translation
    translated = messages[locale]?.[namespace]?.[hash] ?? null;
  } else {
    // No meta found, try direct key lookup (backwards compatibility)
    translated = messages[locale]?.[namespace]?.[text] ?? null;
  }

  // Try fallback locale if translation not found
  if (!translated && fallbackLocale) {
    const fallbackHash = meta[fallbackLocale]?.[namespace]?.[text];

    if (fallbackHash) {
      translated = messages[fallbackLocale]?.[namespace]?.[fallbackHash] ?? null;
    } else {
      // Fallback: direct key lookup
      translated = messages[fallbackLocale]?.[namespace]?.[text] ?? null;
    }
  }

  // Use original text if no translation found
  translated = translated || text;

  // Ensure translated is a string (not an object)
  if (typeof translated !== 'string') {
    console.warn(`Translation for "${text}" is not a string:`, translated);
    translated = text;
  }

  // Check if ICU MessageFormat syntax is present
  if (isICUMessage(translated)) {
    try {
      const formatter = new IntlMessageFormat(translated, locale);
      const formatted = formatter.format(values);

      // IntlMessageFormat can return string or array of parts
      if (typeof formatted === 'string') {
        return formatted;
      } else if (Array.isArray(formatted)) {
        return formatted.map((part) => String(part)).join('');
      } else {
        return String(formatted);
      }
    } catch (error) {
      console.error('ICU MessageFormat error:', (error as Error).message);
      console.error('Message:', translated);
      console.error('Values:', values);
      // Fallback to original message on error
      return translated;
    }
  }

  // Simple variable substitution for non-ICU messages
  if (values && typeof translated === 'string') {
    Object.keys(values).forEach((key) => {
      const value = values[key];
      if (typeof value === 'string' || typeof value === 'number') {
        translated = (translated as string).replace(`{${key}}`, String(value));
      }
    });
  }

  return translated;
}

/**
 * Get current locale
 */
export function getLocale(): string {
  return locale;
}

/**
 * Set locale
 */
export function setLocale(newLocale: string): void {
  if (typeof newLocale !== 'string' || !newLocale) {
    throw new I18nConfigError('setLocale() requires a non-empty string');
  }
  if (!messages[newLocale]) {
    throw new I18nConfigError(`Locale "${newLocale}" is not available in messages`);
  }
  locale = newLocale;
}
