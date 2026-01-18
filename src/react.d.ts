/**
 * @unknown/i18n/react - React adapter type definitions
 */

export {
  // Type utilities
  ExtractVariables,
  TranslationValues,
  TagHandler,

  // Generic message types
  Messages,
  LocaleMessages,
  MessageNamespace,
  LocaleOf,
  NamespaceOf,
  TranslationKeyOf,

  // Generic API
  createI18n,
  TypedI18n,
  TypedI18nProviderProps,
  TypedUseTranslationReturn,
  TypedUseLocaleReturn,
  TypedTranslateFunction,

  // Setup API (Recommended)
  setupI18n,
  SetupI18nConfig,
  SetupI18nResult,
  ConfiguredI18nProviderProps,

  // Declaration merging API
  I18nRegister,
  Locale,
  Namespace,
  TranslationKey,
  I18nProvider,
  I18nProviderProps,
  useTranslation,
  UseTranslationReturn,
  TranslateFunction,
  useLocale,
  UseLocaleReturn,
  getLocale,
} from './index.js';