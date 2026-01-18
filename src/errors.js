/**
 * i18n Error Classes
 */

export class I18nError extends Error {
  constructor(message) {
    super(message);
    this.name = 'I18nError';
  }
}

export class I18nConfigError extends I18nError {
  constructor(message) {
    super(message);
    this.name = 'I18nConfigError';
  }
}

export class I18nMissingTranslationError extends I18nError {
  constructor(key, locale, namespace) {
    super(`Missing translation: "${key}" in locale "${locale}", namespace "${namespace}"`);
    this.name = 'I18nMissingTranslationError';
    this.key = key;
    this.locale = locale;
    this.namespace = namespace;
  }
}

export class I18nProviderError extends I18nError {
  constructor(hookName) {
    super(`${hookName} must be used within I18nProvider`);
    this.name = 'I18nProviderError';
    this.hookName = hookName;
  }
}
