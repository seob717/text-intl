/**
 * i18n Error Classes
 */

export class I18nError extends Error {
  declare name: string;

  constructor(message: string) {
    super(message);
    this.name = 'I18nError';
  }
}

export class I18nConfigError extends I18nError {
  readonly name = 'I18nConfigError' as const;

  constructor(message: string) {
    super(message);
    this.name = 'I18nConfigError';
  }
}

export class I18nMissingTranslationError extends I18nError {
  readonly name = 'I18nMissingTranslationError' as const;
  key: string;
  locale: string;
  namespace: string;

  constructor(key: string, locale: string, namespace: string) {
    super(`Missing translation: "${key}" in locale "${locale}", namespace "${namespace}"`);
    this.name = 'I18nMissingTranslationError';
    this.key = key;
    this.locale = locale;
    this.namespace = namespace;
  }
}

export class I18nProviderError extends I18nError {
  readonly name = 'I18nProviderError' as const;
  hookName: string;

  constructor(hookName: string) {
    super(`${hookName} must be used within I18nProvider`);
    this.name = 'I18nProviderError';
    this.hookName = hookName;
  }
}
