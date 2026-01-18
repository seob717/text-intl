# text-intl

> Type-safe internationalization with plain text keys

[![npm version](https://img.shields.io/npm/v/text-intl.svg)](https://www.npmjs.com/package/text-intl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[한국어](./README.md)

---

## Philosophy

**Write what you see. See what you write.**

```typescript
// In your code - use plain text directly
t("Hello World")
```

Write natural language directly in your code. Internally managed through hash-based key mapping for efficiency.

---

## Features

- **Plain Text Keys** - Use natural language directly in code
- **Type-Safe** - TypeScript support
- **Gettext-style** - Write `t("Hello World")` directly in code
- **ICU MessageFormat** - Pluralization, select, number/date formatting
- **React Support** - Hooks and Provider included
- **Auto-extraction** - CLI extracts messages from code
- **Tree-shakeable** - ESM + CJS support

---

## Installation

```bash
npm install text-intl
```

---

## Quick Start

### 1. Create Configuration

```ts
// i18n.config.ts
export default {
  sourceLocale: 'en',
  locales: ['en', 'fr', 'es'],
  messagesDir: './messages',
  include: ['src/**/*.{ts,tsx}'],
};
```

### 2. Setup React Provider

```tsx
// app/providers/i18n-provider.tsx
'use client';

import { setupI18n } from 'text-intl/react';

import enMessages from '@/messages/en/common.json';
import enMeta from '@/messages/en/common.meta.json';
import frMessages from '@/messages/fr/common.json';
import frMeta from '@/messages/fr/common.meta.json';

export const { I18nProvider, useTranslation, useLocale } = setupI18n({
  messages: {
    en: { common: enMessages },
    fr: { common: frMessages },
  },
  meta: {
    en: { common: enMeta },
    fr: { common: frMeta },
  },
  defaultLocale: 'en',
  fallbackLocale: 'en',
});
```

### 3. Wrap Your App

```tsx
// app/layout.tsx
import { I18nProvider } from '@/providers/i18n-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
```

### 4. Use in Components

```tsx
'use client';

import { useTranslation, useLocale } from '@/providers/i18n-provider';

export default function HomePage() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <div>
      <h1>{t('Hello World')}</h1>
      <p>{t('Welcome {name}', { name: 'User' })}</p>

      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('fr')}>Français</button>
    </div>
  );
}
```

### 5. Extract Messages

```bash
# Extract messages from code
npx text-intl extract

# Watch mode
npx text-intl watch

# Validate translations
npx text-intl validate
```

Output structure:
```
messages/
├── en/
│   ├── common.json        # hash → translation
│   └── common.meta.json   # source text → hash mapping
└── fr/
    ├── common.json
    └── common.meta.json
```

---

## Usage Examples

### Variables

```tsx
t('Hello {name}', { name: 'John' })
// → "Hello John"
```

### Pluralization (ICU)

```tsx
t('{count, plural, =0 {No items} one {# item} other {# items}}', { count: 5 })
// → "5 items"
```

### Select (Conditional)

```tsx
t('{gender, select, male {He} female {She} other {They}} liked your post',
  { gender: 'female' }
)
// → "She liked your post"
```

### Component Tags

```tsx
t('Click <link>here</link> to continue', {
  link: (children) => <a href="/next">{children}</a>
})
// → Click <a href="/next">here</a> to continue
```

### Namespaces

```tsx
const { t } = useTranslation('dashboard');
t('Dashboard Title')
```

---

## API

### Core

```typescript
import { init, t, getLocale, setLocale } from 'text-intl';

init({
  locale: 'en',
  messages: { en: { common: {...} } },
  meta: { en: { common: {...} } },
  fallbackLocale: 'en'
});

t('Hello World');
t('Hello {name}', { name: 'John' });

getLocale(); // 'en'
setLocale('fr');
```

### React

```typescript
import { setupI18n } from 'text-intl/react';

const { I18nProvider, useTranslation, useLocale } = setupI18n({
  messages: { en: { common: {...} } },
  meta: { en: { common: {...} } },
  defaultLocale: 'en',
  fallbackLocale: 'en',
  components: {
    bold: (children) => <strong>{children}</strong>
  }
});
```

---

## Configuration

### i18n.config.ts

```typescript
export default {
  sourceLocale: 'en',
  locales: ['en', 'fr', 'es', 'de'],
  messagesDir: './messages',
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/*.test.*', '**/node_modules/**'],
};
```

---

## Issues & Contributing

Report bugs or request features on [GitHub Issues](https://github.com/seob717/text-intl/issues).

### Bug Reports

Please include:
- text-intl version
- Node.js version
- Minimal reproducible code
- Expected vs actual behavior

### Feature Requests

Please include:
- Use case description
- Expected behavior

---

## License

MIT
