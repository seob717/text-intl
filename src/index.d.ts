/**
 * @unknown/i18n - Type definitions
 *
 * Two ways to use:
 *
 * 1. Generic Factory (Recommended):
 *    ```typescript
 *    import { createI18n } from '@unknown/i18n/react';
 *    const messages = { ko: { common: {...} }, en: { common: {...} } } as const;
 *    export const { I18nProvider, useTranslation, useLocale } = createI18n(messages);
 *    ```
 *
 * 2. Declaration Merging:
 *    ```typescript
 *    declare module '@unknown/i18n' {
 *      interface I18nRegister { locale: 'ko' | 'en'; messages: {...}; }
 *    }
 *    ```
 */

import { ReactNode } from 'react';

// ============================================================================
// Core Type Utilities
// ============================================================================

/**
 * Extracts variable names from translation string patterns like "{name}"
 */
export type ExtractVariables<T extends string> =
  T extends `${string}{${infer Var}}${infer Rest}`
    ? Var | ExtractVariables<Rest>
    : never;

/**
 * Values object for translation variables and tag handlers
 * Supports both simple variables and ICU MessageFormat values
 */
export type TranslationValues<T extends string = string> =
  ExtractVariables<T> extends never
    ? Record<string, string | number | TagHandler> | undefined
    : { [K in ExtractVariables<T>]: string | number } & Record<string, string | number | TagHandler>;

/** Tag handler function type (for React components) */
export type TagHandler<T = ReactNode> = (content: T, locale: string) => ReactNode;

// ============================================================================
// Generic Message Types
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
  N extends NamespaceOf<M>
> = keyof M[LocaleOf<M>][N] & string;

// ============================================================================
// Generic React API (Recommended)
// ============================================================================

/**
 * Generic translate function with key inference
 * Supports both hash keys and source text (when meta is provided)
 */
export interface TypedTranslateFunction<M extends Messages, N extends NamespaceOf<M>> {
  (
    text: string,
    values?: Record<string, string | number | Date | boolean | TagHandler>
  ): ReactNode;
}

/**
 * Return type of typed useTranslation hook
 */
export interface TypedUseTranslationReturn<M extends Messages, N extends NamespaceOf<M>> {
  t: TypedTranslateFunction<M, N>;
  locale: LocaleOf<M>;
}

/**
 * Return type of typed useLocale hook
 */
export interface TypedUseLocaleReturn<M extends Messages> {
  locale: LocaleOf<M>;
  setLocale: (locale: LocaleOf<M>) => void;
}

/**
 * Props for typed I18nProvider
 */
export interface TypedI18nProviderProps<M extends Messages> {
  children: ReactNode;
  locale: LocaleOf<M>;
  messages: M;
  meta?: Meta;
  fallbackLocale?: LocaleOf<M>;
  components?: Record<string, TagHandler>;
}

/**
 * Result of createI18n factory function
 */
export interface TypedI18n<M extends Messages> {
  I18nProvider: (props: TypedI18nProviderProps<M>) => ReactNode;
  useTranslation: <N extends NamespaceOf<M> = 'common' & NamespaceOf<M>>(
    namespace?: N
  ) => TypedUseTranslationReturn<M, N>;
  useLocale: () => TypedUseLocaleReturn<M>;
}

/**
 * Create typed i18n hooks and provider
 *
 * @example
 * ```typescript
 * import { createI18n } from '@unknown/i18n/react';
 *
 * const messages = {
 *   ko: { common: { "안녕": "안녕" }, cart: { "장바구니": "장바구니" } },
 *   en: { common: { "안녕": "Hello" }, cart: { "장바구니": "Cart" } },
 * } as const;
 *
 * export const { I18nProvider, useTranslation, useLocale } = createI18n(messages);
 *
 * // Usage:
 * const { locale, setLocale } = useLocale();
 * // locale: 'ko' | 'en'
 *
 * const { t } = useTranslation('cart');
 * // t("장바구니") - key autocomplete works!
 * ```
 */
export function createI18n<M extends Messages>(messages: M): TypedI18n<M>;

// ============================================================================
// Setup API (Simplified - Recommended)
// ============================================================================

/**
 * Configuration for setupI18n
 */
export interface SetupI18nConfig<M extends Messages> {
  messages: M;
  meta?: Meta;
  defaultLocale: LocaleOf<M>;
  fallbackLocale?: LocaleOf<M>;
  components?: Record<string, TagHandler>;
}

/**
 * Props for the configured I18nProvider from setupI18n
 */
export interface ConfiguredI18nProviderProps<M extends Messages> {
  children: ReactNode;
  locale?: LocaleOf<M>;
}

/**
 * Result of setupI18n function
 */
export interface SetupI18nResult<M extends Messages> {
  I18nProvider: (props: ConfiguredI18nProviderProps<M>) => ReactNode;
  useTranslation: <N extends NamespaceOf<M> = 'common' & NamespaceOf<M>>(
    namespace?: N
  ) => TypedUseTranslationReturn<M, N>;
  useLocale: () => TypedUseLocaleReturn<M>;
}

/**
 * Setup i18n with configuration - simplified API
 *
 * @example
 * ```typescript
 * // src/shared/i18n/index.ts
 * "use client";
 * import { setupI18n } from '@unknown/i18n/react';
 * import commonKo from '@/messages/ko/common.json';
 * import commonEn from '@/messages/en/common.json';
 *
 * export const {
 *   I18nProvider,
 *   useTranslation,
 *   useLocale,
 * } = setupI18n({
 *   messages: {
 *     ko: { common: commonKo },
 *     en: { common: commonEn },
 *   } as const,
 *   defaultLocale: 'ko',
 *   fallbackLocale: 'en', // Optional: fallback when translation is missing
 * });
 *
 * // Usage in app:
 * // <I18nProvider>{children}</I18nProvider>
 * // const { t } = useTranslation(); // namespace defaults to 'common'
 * // const { locale, setLocale } = useLocale();
 * ```
 */
export function setupI18n<M extends Messages>(config: SetupI18nConfig<M>): SetupI18nResult<M>;

// ============================================================================
// Declaration Merging API (Alternative)
// ============================================================================

/**
 * Extend this interface for declaration merging approach
 */
export interface I18nRegister {
  locale: string;
  messages: Record<string, Record<string, string>>;
}

export type Locale = I18nRegister['locale'];
export type Namespace = keyof I18nRegister['messages'];
export type TranslationKey<N extends Namespace> = keyof I18nRegister['messages'][N];

// ============================================================================
// Vanilla JS Core Functions
// ============================================================================

export interface InitConfig {
  locale: string;
  messages: Messages;
  meta?: Meta;
  fallbackLocale?: string;
}

export function init(config: InitConfig): void;

/**
 * Translate function with ICU MessageFormat support
 * @param text - The message key or ICU message string
 * @param values - Values for variable substitution
 * @param namespace - Message namespace (default: 'common')
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
 * 
 * // ICU Combined
 * t("{name} has {count, plural, one {# item} other {# items}}", { name: "John", count: 3 })
 * // → "John has 3 items"
 */
export function t(
  text: string, 
  values?: Record<string, string | number | Date | boolean>, 
  namespace?: string
): string;

export function getLocale(): string;
export function setLocale(locale: string): void;

// ============================================================================
// Non-generic React API (for declaration merging)
// ============================================================================

export interface I18nProviderProps {
  children: ReactNode;
  locale: Locale;
  messages: Messages;
  meta?: Meta;
  fallbackLocale?: Locale;
  components?: Record<string, TagHandler>;
}

export function I18nProvider(props: I18nProviderProps): ReactNode;

export interface TranslateFunction<N extends Namespace> {
  <K extends TranslationKey<N>>(
    text: K,
    values?: TranslationValues<K extends string ? K : string>
  ): ReactNode;
}

export interface UseTranslationReturn<N extends Namespace> {
  t: TranslateFunction<N>;
  locale: Locale;
}

export function useTranslation<N extends Namespace = 'common'>(
  namespace?: N
): UseTranslationReturn<N>;

export interface UseLocaleReturn {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export function useLocale(): UseLocaleReturn;
