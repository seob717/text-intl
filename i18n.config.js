/**
 * i18n configuration for testing AI translation
 */
export default {
  // Source locale - the language used in source code
  sourceLocale: 'en',

  // All supported locales
  locales: ['en', 'ko', 'ja', 'zh'],

  // Directory for translation files
  messagesDir: './messages',

  // Files to scan for t() calls
  include: ['src/**/*.{ts,tsx,js,jsx}', 'test-app/**/*.{ts,tsx,js,jsx}'],

  // Files to ignore
  exclude: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],

  // AI translation configuration (optional - can use env vars instead)
  ai: {
    // Provider: 'openai', 'anthropic', or 'vertex' (Google Gemini)
    provider: 'vertex',

    // Model to use (optional)
    // OpenAI: 'gpt-4o-mini', 'gpt-4o'
    // Anthropic: 'claude-sonnet-4-20250514'
    // Vertex: 'gemini-2.0-flash', 'gemini-1.5-pro'
    model: 'gemini-2.0-flash',

    // Vertex AI specific settings
    location: 'us-central1',

    // Translation rules (tone, style, glossary)
    translationRules: {
      // Global tone: 'formal', 'casual', 'polite', 'technical', 'marketing'
      tone: 'polite',

      // Global style guidelines
      style: '자연스럽고 읽기 쉬운 문장으로 번역. 기술 용어는 영어 유지 가능.',

      // Global glossary (term → translation)
      glossary: {
        Dashboard: '대시보드',
        Settings: '설정',
        Analytics: '분석',
        Export: '내보내기',
      },

      // Custom instructions for all translations
      instructions: '브랜드 톤을 유지하면서 친근하고 전문적인 느낌으로 번역',

      // Locale-specific overrides
      locales: {
        ko: {
          tone: 'polite',
          style: '존댓말 사용, 자연스러운 한국어로 번역',
          glossary: {
            'Help & Support': '고객 지원',
            Home: '홈',
          },
        },
        ja: {
          tone: 'formal',
          style: '敬語を使用し、自然な日本語に翻訳',
          glossary: {
            Dashboard: 'ダッシュボード',
            Settings: '設定',
          },
        },
        zh: {
          tone: 'formal',
          style: '使用简体中文，保持专业且友好的语气',
        },
      },
    },
  },
};
