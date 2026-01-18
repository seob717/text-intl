/**
 * React adapter for i18n with namespace support
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  init,
  t as coreT,
  setLocale as coreSetLocale,
  getLocale as coreGetLocale,
} from "./index.js";
import { I18nProviderError } from "./errors.js";

const I18nContext = createContext(null);
const DEFAULT_NAMESPACE = "common";

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
}) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    init({ locale, messages, meta, fallbackLocale });
  }, [locale, messages, meta, fallbackLocale]);

  const setLocale = useCallback((newLocale) => {
    coreSetLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (text, values, namespace = DEFAULT_NAMESPACE) => {
      // Get translation from namespace
      let translated = coreT(text, values, namespace);

      // Handle tags first, then simple variables
      const parts = [];
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
          processedContent = values[varName];
        }

        // Get both inline and global handlers
        const inlineHandler = values && values[tagName];
        const globalHandler = components[tagName];

        if (
          typeof inlineHandler === "function" &&
          typeof globalHandler === "function"
        ) {
          // Both exist - apply global formatter first, then wrap with inline handler
          const formatted = globalHandler(processedContent, locale);
          const result = inlineHandler(formatted);
          parts.push(result);
          hasReplacements = true;
        } else if (typeof inlineHandler === "function") {
          // Only inline handler - use it directly
          const result = inlineHandler(processedContent, locale);
          parts.push(result);
          hasReplacements = true;
        } else if (typeof globalHandler === "function") {
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
          typeof part === "string" ? part : <span key={i}>{part}</span>
        );
      }

      // No tag replacements found, handle simple {variable} substitution
      let result = translated;
      if (values) {
        Object.keys(values).forEach((key) => {
          const value = values[key];
          // Only replace with string/number values (not functions or objects)
          if (typeof value === "string" || typeof value === "number") {
            result = result.replace(`{${key}}`, value);
          }
        });
      }

      return result;
    },
    [components, locale]
  );

  const contextValue = useMemo(
    () => ({ t, locale, setLocale }),
    [t, locale, setLocale]
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

/**
 * Hook to use translation with optional namespace
 * @param {string} namespace - Optional namespace (default: 'common')
 */
export function useTranslation(namespace = DEFAULT_NAMESPACE) {
  const context = useContext(I18nContext);
  if (!context) {
    throw new I18nProviderError("useTranslation");
  }

  const t = useCallback(
    (text, values) => context.t(text, values, namespace),
    [context, namespace]
  );

  return { t, locale: context.locale };
}

/**
 * Hook to get/set locale
 */
export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new I18nProviderError("useLocale");
  }
  return { locale: context.locale, setLocale: context.setLocale };
}

/**
 * Get current locale (for use outside React components)
 */
export function getLocale() {
  return coreGetLocale();
}

/**
 * Create typed i18n hooks and provider
 * @param {Object} _messages - Messages object (used for type inference only)
 * @returns {{ I18nProvider, useTranslation, useLocale }}
 */
export function createI18n(_messages) {
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
 * @param {Object} config - Configuration object
 * @param {Object} config.messages - Messages object (hash -> translation)
 * @param {Object} [config.meta] - Meta object (sourceText -> hash)
 * @param {string} config.defaultLocale - Default locale
 * @param {string} [config.fallbackLocale] - Optional fallback locale
 * @param {Object} [config.components] - Optional tag handlers
 * @returns {{ I18nProvider, useTranslation, useLocale }}
 */
export function setupI18n({ messages, meta, defaultLocale, fallbackLocale, components = {} }) {
  function ConfiguredProvider({ children, locale = defaultLocale }) {
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
