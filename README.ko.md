# text-intl

> 일반 텍스트 키를 사용하는 타입 안전 국제화 라이브러리

[![npm version](https://img.shields.io/npm/v/text-intl.svg)](https://www.npmjs.com/package/text-intl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](./README.md)

---

## 철학

**보이는 대로 작성하고, 작성한 대로 보입니다.**

```typescript
// 코드에서 - 일반 텍스트 그대로 사용
t('안녕하세요');
```

코드에서는 자연어를 그대로 작성합니다. 내부적으로 해시 기반 키 매핑을 통해 효율적으로 관리됩니다.

---

## 특징

- **일반 텍스트 키** - 코드에서 자연어를 그대로 사용
- **타입 안전** - TypeScript 지원
- **Gettext 스타일** - 코드에 `t("안녕하세요")` 직접 작성
- **ICU MessageFormat** - 복수형, 조건부, 숫자/날짜 포맷
- **React 지원** - 훅과 Provider 제공
- **자동 추출** - CLI가 코드에서 메시지 자동 추출
- **Tree-shakeable** - ESM + CJS 지원

---

## 설치

```bash
npm install text-intl
```

---

## 빠른 시작

### 1. 설정 파일 생성

```ts
// i18n.config.ts
export default {
  sourceLocale: 'ko',
  locales: ['ko', 'en'],
  messagesDir: './messages',
  include: ['src/**/*.{ts,tsx}'],
};
```

### 2. React Provider 설정

```tsx
// app/providers/i18n-provider.tsx
'use client';

import { setupI18n } from 'text-intl/react';

import koMessages from '@/messages/ko/common.json';
import koMeta from '@/messages/ko/common.meta.json';
import enMessages from '@/messages/en/common.json';
import enMeta from '@/messages/en/common.meta.json';

export const { I18nProvider, useTranslation, useLocale } = setupI18n({
  messages: {
    ko: { common: koMessages },
    en: { common: enMessages },
  },
  meta: {
    ko: { common: koMeta },
    en: { common: enMeta },
  },
  defaultLocale: 'ko',
  fallbackLocale: 'ko',
});
```

### 3. 앱 래핑

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

### 4. 컴포넌트에서 사용

```tsx
'use client';

import { useTranslation, useLocale } from '@/providers/i18n-provider';

export default function HomePage() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <div>
      <h1>{t('안녕하세요')}</h1>
      <p>{t('{name}님 환영합니다', { name: '사용자' })}</p>

      <button onClick={() => setLocale('ko')}>한국어</button>
      <button onClick={() => setLocale('en')}>English</button>
    </div>
  );
}
```

### 5. 메시지 추출

```bash
# 코드에서 메시지 추출
npx text-intl extract

# Watch 모드
npx text-intl watch

# 번역 검증
npx text-intl validate
```

추출 결과:

```
messages/
├── ko/
│   ├── common.json        # 해시 → 번역
│   └── common.meta.json   # 원문 → 해시 매핑
└── en/
    ├── common.json
    └── common.meta.json
```

---

## 사용 예제

### 변수

```tsx
t('{name}님 안녕하세요', { name: '철수' });
// → "철수님 안녕하세요"
```

### 복수형 (ICU)

```tsx
t('{count, plural, =0 {항목 없음} other {# 항목}}', { count: 5 });
// → "5 항목"
```

### 조건부 (Select)

```tsx
t('{gender, select, male {그가} female {그녀가} other {그들이}} 좋아합니다', { gender: 'female' });
// → "그녀가 좋아합니다"
```

### 컴포넌트 태그

```tsx
t('<link>여기</link>를 클릭하세요', {
  link: (children) => <a href="/next">{children}</a>,
});
// → <a href="/next">여기</a>를 클릭하세요
```

### 네임스페이스

```tsx
const { t } = useTranslation('dashboard');
t('대시보드 제목');
```

---

## API

### Core

```typescript
import { init, t, getLocale, setLocale } from 'text-intl';

init({
  locale: 'ko',
  messages: { ko: { common: {...} } },
  meta: { ko: { common: {...} } },
  fallbackLocale: 'ko'
});

t('안녕하세요');
t('{name}님', { name: '철수' });

getLocale(); // 'ko'
setLocale('en');
```

### React

```typescript
import { setupI18n } from 'text-intl/react';

const { I18nProvider, useTranslation, useLocale } = setupI18n({
  messages: { ko: { common: {...} } },
  meta: { ko: { common: {...} } },
  defaultLocale: 'ko',
  fallbackLocale: 'ko',
  components: {
    bold: (children) => <strong>{children}</strong>
  }
});
```

---

## 설정

### i18n.config.ts

```typescript
export default {
  sourceLocale: 'ko',
  locales: ['ko', 'en', 'ja'],
  messagesDir: './messages',
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  exclude: ['**/*.test.*', '**/node_modules/**'],
};
```

---

## 이슈 및 기여

버그 제보나 기능 요청은 [GitHub Issues](https://github.com/seob717/text-intl/issues)에 등록해주세요.

### 버그 제보 시 포함할 내용

- text-intl 버전
- Node.js 버전
- 재현 가능한 최소 코드
- 예상 동작과 실제 동작

### 기능 요청 시 포함할 내용

- 사용 사례 설명
- 기대하는 동작

---

## 라이선스

MIT
