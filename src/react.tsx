/**
 * React adapter for i18n with namespace support
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  init,
  t as coreT,
  setLocale as coreSetLocale,
  getLocale as coreGetLocale,
  Messages,
  Meta,
  LocaleOf,
  NamespaceOf,
} from './index.js';
import { I18nProviderError } from './errors.js';

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extracts variable names from translation string patterns like "{name}"
 */
export type ExtractVariables<T extends string> = T extends `${string}{${infer Var}}${infer Rest}`
  ? Var | ExtractVariables<Rest>
  : never;

/**
 * Values object for translation variables and tag handlers
 * Supports both simple variables and ICU MessageFormat values
 */
export type TranslationValues<T extends string = string> =
  ExtractVariables<T> extends never
    ? Record<string, string | number | Date | boolean | TagHandler> | undefined
    : { [K in ExtractVariables<T>]: string | number } & Record<
        string,
        string | number | Date | boolean | TagHandler
      >;

/** Tag handler function type (for React components) */
export type TagHandler<T = ReactNode> = (content: T, locale: string) => ReactNode;

// Re-export from index for convenience
export type {
  Messages,
  LocaleMessages,
  MessageNamespace,
  LocaleOf,
  NamespaceOf,
  TranslationKeyOf,
} from './index.js';

// ============================================================================
// Generic React API (Recommended)
// ============================================================================

/**
 * Generic translate function with key inference
 * Supports both hash keys and source text (when meta is provided)
 */
export interface TypedTranslateFunction<M extends Messages, _N extends NamespaceOf<M>> {
  (text: string, values?: Record<string, string | number | Date | boolean | TagHandler>): ReactNode;
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

export interface UseLocaleReturn {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// ============================================================================
// Internal Types
// ============================================================================

interface I18nContextType {
  t: (
    text: string,
    values?: Record<string, string | number | Date | boolean | TagHandler>,
    namespace?: string
  ) => ReactNode;
  locale: string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);
const DEFAULT_NAMESPACE = 'common';

// ============================================================================
// Components and Hooks
// ============================================================================

/**
 * I18n Provider
 */
export function I18nProvider({
  children,
  locale: initialLocale,
  messages,
  meta,
  fallbackLocale,
  components = {},
}: I18nProviderProps): ReactNode {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    init({ locale, messages, meta, fallbackLocale });
  }, [locale, messages, meta, fallbackLocale]);

  const setLocale = useCallback((newLocale: string) => {
    coreSetLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (
      text: string,
      values?: Record<string, string | number | Date | boolean | TagHandler>,
      namespace: string = DEFAULT_NAMESPACE
    ): ReactNode => {
      // Get translation from namespace
      // Filter out TagHandlers for coreT (which only accepts primitive values)
      const valuesForTranslation =
        values && typeof values === 'object'
          ? (Object.fromEntries(
              Object.entries(values).filter(([, v]) => typeof v !== 'function')
            ) as Record<string, string | number | Date | boolean>)
          : undefined;
      const translated = coreT(text, valuesForTranslation, namespace);

      // Handle tags first, then simple variables
      const parts: (string | ReactNode)[] = [];
      let lastIndex = 0;
      let hasReplacements = false;

      // Find all <tag>content</tag> or <tag>{variable}</tag> patterns
      const tagRegex = /<(\w+)>([^<]*)<\/\1>/g;
      let match;

      while ((match = tagRegex.exec(translated)) !== null) {
        const [fullMatch, tagName, content] = match;
        const index = match.index;

        // Add text before the match
        if (index > lastIndex) {
          parts.push(translated.slice(lastIndex, index));
        }

        // Check if content is a variable reference like {varName}
        const varMatch = content.match(/^\{(\w+)\}$/);
        let processedContent = content;

        if (varMatch && values) {
          // Replace variable reference with actual value
          const varName = varMatch[1];
          const value = values[varName];
          processedContent = value instanceof Date ? value.toString() : String(value);
        }

        // Get both inline and global handlers
        const inlineHandler = values && values[tagName];
        const globalHandler = components[tagName];

        if (typeof inlineHandler === 'function' && typeof globalHandler === 'function') {
          // Both exist - apply global formatter first, then wrap with inline handler
          const formatted = globalHandler(processedContent, locale);
          const result = (inlineHandler as TagHandler)(formatted, locale);
          parts.push(result);
          hasReplacements = true;
        } else if (typeof inlineHandler === 'function') {
          // Only inline handler - use it directly
          const result = (inlineHandler as TagHandler)(processedContent, locale);
          parts.push(result);
          hasReplacements = true;
        } else if (typeof globalHandler === 'function') {
          // Only global handler
          const result = globalHandler(processedContent, locale);
          parts.push(result);
          hasReplacements = true;
        } else {
          // No handler found, keep original
          parts.push(fullMatch);
        }

        lastIndex = index + fullMatch.length;
      }

      // Add remaining text
      if (lastIndex < translated.length) {
        parts.push(translated.slice(lastIndex));
      }

      // If we found tag replacements, return as React elements
      if (hasReplacements && parts.length > 0) {
        return parts.map((part, i) =>
          typeof part === 'string' ? part : <span key={i}>{part}</span>
        );
      }

      // No tag replacements found, handle simple {variable} substitution
      let result = translated;
      if (values) {
        Object.keys(values).forEach((key) => {
          const value = values[key];
          // Only replace with string/number values (not functions or objects)
          if (typeof value === 'string' || typeof value === 'number') {
            result = result.replace(`{${key}}`, String(value));
          }
        });
      }

      return result;
    },
    [components, locale]
  );

  const contextValue = useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

/**
 * Hook to use translation with optional namespace
 * @param namespace - Optional namespace (default: 'common')
 */
export function useTranslation<N extends Namespace = 'common'>(
  namespace: N = DEFAULT_NAMESPACE as N
): UseTranslationReturn<N> {
  const context = useContext(I18nContext);
  if (!context) {
    throw new I18nProviderError('useTranslation');
  }

  const t = useCallback(
    (text: string, values?: Record<string, string | number | Date | boolean | TagHandler>) =>
      context.t(text, values, namespace),
    [context, namespace]
  );

  return { t, locale: context.locale } as UseTranslationReturn<N>;
}

/**
 * Hook to get/set locale
 */
export function useLocale(): UseLocaleReturn {
  const context = useContext(I18nContext);
  if (!context) {
    throw new I18nProviderError('useLocale');
  }
  return { locale: context.locale, setLocale: context.setLocale };
}

/**
 * Get current locale (for use outside React components)
 */
export function getLocale(): string {
  return coreGetLocale();
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
export function createI18n<M extends Messages>(_messages: M): TypedI18n<M> {
  // Runtime implementation just returns the existing hooks
  // Type inference happens at compile time via TypeScript
  return {
    I18nProvider,
    useTranslation,
    useLocale,
  };
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
export function setupI18n<M extends Messages>({
  messages,
  meta,
  defaultLocale,
  fallbackLocale,
  components = {},
}: SetupI18nConfig<M>): SetupI18nResult<M> {
  function ConfiguredProvider({
    children,
    locale = defaultLocale,
  }: ConfiguredI18nProviderProps<M>): ReactNode {
    return (
      <I18nProvider
        locale={locale}
        messages={messages}
        meta={meta}
        fallbackLocale={fallbackLocale}
        components={components}
      >
        {children}
      </I18nProvider>
    );
  }

  return {
    I18nProvider: ConfiguredProvider,
    useTranslation,
    useLocale,
  };
}
