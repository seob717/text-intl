# AI Translation Guide

text-intl supports AI-powered automatic translation using OpenAI, Anthropic, or Google Vertex AI (Gemini).

## Quick Start

```bash
# 1. Set up API credentials (choose one)
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
# or
gcloud auth application-default login

# 2. Extract messages from source code
text-intl extract

# 3. Translate all missing translations
text-intl translate

# 4. Translate specific locale only
text-intl translate --locale ko

# 5. Preview without making changes
text-intl translate --dry-run
```

## Configuration

### Basic Setup (`i18n.config.js`)

```javascript
export default {
  sourceLocale: 'en',
  locales: ['en', 'ko', 'ja', 'zh'],
  messagesDir: './messages',
  include: ['src/**/*.{ts,tsx,js,jsx}'],

  ai: {
    // Provider: 'openai', 'anthropic', or 'vertex'
    provider: 'vertex',

    // Model (optional)
    model: 'gemini-2.0-flash',

    // Vertex AI specific
    location: 'us-central1',
  },
};
```

### Provider Configuration

#### OpenAI

```bash
export OPENAI_API_KEY="sk-..."
```

```javascript
ai: {
  provider: 'openai',
  model: 'gpt-4o-mini',  // or 'gpt-4o', 'gpt-4-turbo'
}
```

#### Anthropic

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

```javascript
ai: {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',  // or 'claude-3-haiku-20240307'
}
```

#### Google Vertex AI (Gemini)

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set project (optional if already configured)
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

```javascript
ai: {
  provider: 'vertex',
  model: 'gemini-2.0-flash',  // or 'gemini-1.5-pro'
  location: 'us-central1',    // or other GCP regions
}
```

## Translation Rules

Control the tone, style, and terminology of translations.

### Available Options

| Option         | Description                         |
| -------------- | ----------------------------------- |
| `tone`         | Translation tone preset             |
| `style`        | Custom style guidelines             |
| `glossary`     | Term-to-translation mapping         |
| `instructions` | Additional translation instructions |
| `context`      | Context about the application       |

### Tone Presets

| Tone        | Description                                             |
| ----------- | ------------------------------------------------------- |
| `formal`    | Business/professional language                          |
| `casual`    | Friendly, everyday language                             |
| `polite`    | Honorific language (e.g., Korean 존댓말, Japanese 敬語) |
| `technical` | Precise technical terminology                           |
| `marketing` | Engaging, persuasive copy                               |

### Example Configuration

```javascript
ai: {
  provider: 'vertex',
  model: 'gemini-2.0-flash',

  translationRules: {
    // Global settings (apply to all locales)
    tone: 'polite',
    style: 'Natural, easy-to-read sentences. Technical terms can remain in English.',
    glossary: {
      'Dashboard': '대시보드',
      'Settings': '설정',
      'Analytics': '분석',
    },
    instructions: 'Maintain brand voice while being professional and friendly.',
    context: 'This is a B2B SaaS application for project management.',

    // Locale-specific overrides
    locales: {
      ko: {
        tone: 'polite',
        style: '존댓말 사용, 자연스러운 한국어로 번역',
        glossary: {
          'Help & Support': '고객 지원',
        },
      },
      ja: {
        tone: 'formal',
        style: '敬語を使用し、自然な日本語に翻訳',
        glossary: {
          'Dashboard': 'ダッシュボード',
        },
      },
      zh: {
        tone: 'formal',
        style: '使用简体中文，保持专业且友好的语气',
      },
    },
  },
}
```

### Glossary Usage

The glossary ensures consistent translation of key terms:

```javascript
glossary: {
  'Dashboard': '대시보드',      // Will always be translated as '대시보드'
  'Settings': '설정',
  'Export Data': '데이터 내보내기',
}
```

**Note:** Glossary terms are matched exactly. If your source text is "Dashboard", the glossary entry must also be "Dashboard" (case-sensitive).

## CLI Commands

### `text-intl translate`

Translate all missing translations for all locales.

```bash
text-intl translate
```

Output:

```
🌍 AI Translation for text-intl

Source locale: en
Target locales: ko, ja, zh

🤖 Using vertex (gemini-2.0-flash) for translation
📝 Translating: English → Korean
   Tone: polite
   Glossary: 4 terms

📁 Processing namespace: common
   📊 Found 14 missing translations
  Translating batch 1/1...
   ✅ Translated 14 messages
...
```

### `text-intl translate --locale <locale>`

Translate only a specific locale.

```bash
text-intl translate --locale ko
```

### `text-intl translate --dry-run`

Preview what would be translated without making changes.

```bash
text-intl translate --dry-run
```

## How It Works

1. **Extract**: `text-intl extract` scans your source code for `t()` calls and generates:
   - `messages/{locale}/{namespace}.json` - Hash → Translation mapping
   - `messages/{locale}/{namespace}.meta.json` - Source text → Hash mapping

2. **Translate**: `text-intl translate` finds empty translations and fills them using AI:
   - Reads source text from meta files
   - Sends to AI provider with configured rules
   - Writes translated text back to message files

3. **Preserve**: The AI is instructed to preserve:
   - Variables: `{name}`, `{count}`, `{price}`
   - ICU MessageFormat: `{count, plural, =0 {none} one {#} other {#}}`
   - Tags: `<link>`, `<bold>`, `<emphasis>`

## Best Practices

### 1. Review AI Translations

AI translations are a starting point. Always review before shipping:

```bash
# Generate translations
text-intl translate --locale ko

# Review the changes
git diff messages/ko/

# Commit when satisfied
git add messages/ && git commit -m "feat: add Korean translations"
```

### 2. Use Glossary for Consistency

Define key terms in your glossary to ensure consistent translation:

```javascript
glossary: {
  'Dashboard': '대시보드',
  'Workspace': '워크스페이스',
  'Team': '팀',
}
```

### 3. Set Appropriate Tone

Choose the right tone for your audience:

- **B2B Apps**: `formal` or `polite`
- **Consumer Apps**: `casual` or `polite`
- **Documentation**: `technical`
- **Marketing Pages**: `marketing`

### 4. Use Locale-Specific Overrides

Different languages may need different approaches:

```javascript
locales: {
  ko: { tone: 'polite' },     // Korean prefers honorific language
  ja: { tone: 'formal' },     // Japanese formal is common in apps
  de: { tone: 'formal' },     // German often uses formal "Sie"
  es: { tone: 'casual' },     // Spanish apps often use "tú"
}
```

### 5. Provide Context

Help the AI understand your application:

```javascript
context: 'E-commerce platform for fashion retail. Target audience is young adults (18-35).',
instructions: 'Use trendy, modern language. Avoid overly formal expressions.',
```

## Troubleshooting

### API Authentication Errors

**OpenAI:**

```bash
# Verify API key is set
echo $OPENAI_API_KEY
```

**Anthropic:**

```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY
```

**Vertex AI:**

```bash
# Re-authenticate
gcloud auth application-default login

# Verify project
gcloud config get-value project
```

### Translation Quality Issues

1. **Tone mismatch**: Adjust the `tone` setting
2. **Inconsistent terms**: Add terms to `glossary`
3. **Unnatural phrasing**: Update `style` with specific guidelines
4. **Missing context**: Add `context` or `instructions`

### Variables Not Preserved

If variables like `{name}` are being translated, check:

1. The AI provider is working correctly
2. The batch size isn't too large (reduce if needed)
3. Try a different model (e.g., `gpt-4o` instead of `gpt-4o-mini`)

## Cost Considerations

AI translation costs depend on:

- **Provider pricing**: OpenAI, Anthropic, and Vertex AI have different rates
- **Model selection**: Smaller models (gpt-4o-mini, haiku) are cheaper
- **Message count**: Batch processing optimizes API calls

**Recommendations:**

- Use `--dry-run` to preview before translating
- Start with smaller models and upgrade if quality is insufficient
- Use glossary to reduce re-translation of common terms
