/**
 * Vanilla JS i18n core with namespace support
 * gettext-style translation with ICU MessageFormat support
 */

import { IntlMessageFormat } from 'intl-messageformat';
import { I18nConfigError } from './errors.js';

let locale = 'ko';
let fallbackLocale = null;
let messages = {};
let meta = {}; // Source text to hash mapping
const DEFAULT_NAMESPACE = 'common';

/**
 * Check if a string contains ICU MessageFormat syntax
 * @param {string} text - Text to check
 * @returns {boolean} True if ICU syntax detected
 */
function isICUMessage(text) {
  if (typeof text !== 'string') return false;

  // Check for ICU patterns: {variable, type, ...}
  // Types: plural, select, selectordinal, number, date, time
  return /\{\s*\w+\s*,\s*(plural|select|selectordinal|number|date|time)/.test(text);
}

/**
 * Initialize i18n
 * @param {Object} config - { locale, messages, meta?, fallbackLocale? }
 * messages structure: { ko: { common: { hash: translation } } }
 * meta structure: { ko: { common: { sourceText: hash } } }
 */
export function init(config) {
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
 * @param {string} text - Source text (will be mapped to hash via meta)
 * @param {Object} values - Variable replacements
 * @param {string} namespace - Namespace (default: 'common')
 * @returns {string} Translated text
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
export function t(text, values, namespace = DEFAULT_NAMESPACE) {
  let translated = null;

  // Try to find hash via meta mapping
  const hash = meta[locale]?.[namespace]?.[text];

  if (hash) {
    // Found hash in current locale's meta, look up translation
    translated = messages[locale]?.[namespace]?.[hash];
  } else {
    // No meta found, try direct key lookup (backwards compatibility)
    translated = messages[locale]?.[namespace]?.[text];
  }

  // Try fallback locale if translation not found
  if (!translated && fallbackLocale) {
    const fallbackHash = meta[fallbackLocale]?.[namespace]?.[text];

    if (fallbackHash) {
      translated = messages[fallbackLocale]?.[namespace]?.[fallbackHash];
    } else {
      // Fallback: direct key lookup
      translated = messages[fallbackLocale]?.[namespace]?.[text];
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
      return typeof formatted === 'string' ? formatted : formatted.join('');
    } catch (error) {
      console.error('ICU MessageFormat error:', error.message);
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
        translated = translated.replace(`{${key}}`, value);
      }
    });
  }

  return translated;
}

/**
 * Get current locale
 */
export function getLocale() {
  return locale;
}

/**
 * Set locale
 */
export function setLocale(newLocale) {
  if (typeof newLocale !== 'string' || !newLocale) {
    throw new I18nConfigError('setLocale() requires a non-empty string');
  }
  if (!messages[newLocale]) {
    throw new I18nConfigError(`Locale "${newLocale}" is not available in messages`);
  }
  locale = newLocale;
}
