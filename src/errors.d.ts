/**
 * i18n Error Classes
 */

export class I18nError extends Error {
  name: 'I18nError';
}

export class I18nConfigError extends I18nError {
  name: 'I18nConfigError';
}

export class I18nMissingTranslationError extends I18nError {
  name: 'I18nMissingTranslationError';
  key: string;
  locale: string;
  namespace: string;
  constructor(key: string, locale: string, namespace: string);
}

export class I18nProviderError extends I18nError {
  name: 'I18nProviderError';
  hookName: string;
  constructor(hookName: string);
}
