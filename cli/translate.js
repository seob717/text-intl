/**
 * AI-powered translation module
 * Supports OpenAI, Anthropic, and Google Vertex AI (Gemini) for automatic translation
 * With configurable translation rules (tone, style, glossary)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

/**
 * Build translation prompt with custom rules
 * @param {string} sourceLocale - Source language code
 * @param {string} targetLocale - Target language code
 * @param {Object} rules - Translation rules from config
 * @returns {string} System prompt for translation
 */
function buildTranslationPrompt(sourceLocale, targetLocale, rules = {}) {
  const { tone, style, glossary, instructions, context } = rules;

  let prompt = `You are a professional translator. Translate the following texts from ${sourceLocale} to ${targetLocale}.

CRITICAL RULES (MUST FOLLOW):
1. Preserve ALL placeholders exactly: {name}, {count}, {price}, etc.
2. Preserve ALL ICU MessageFormat syntax exactly: {count, plural, =0 {no items} one {# item} other {# items}}
3. Preserve ALL HTML-like tags: <bold>, <link>, <emphasis>, etc.
4. Do NOT translate variable names inside curly braces
5. Maintain the exact same formatting and structure
6. Return ONLY the JSON array, no explanations`;

  // Add tone instructions
  if (tone) {
    const toneInstructions = {
      formal: 'Use formal, polite language appropriate for business contexts.',
      casual: 'Use casual, friendly language for everyday conversation.',
      polite: 'Use honorific and respectful language (e.g., 존댓말 in Korean, 敬語 in Japanese).',
      technical: 'Use precise technical terminology appropriate for documentation.',
      marketing: 'Use engaging, persuasive language suitable for marketing copy.',
    };
    prompt += `\n\nTONE: ${toneInstructions[tone] || tone}`;
  }

  // Add style instructions
  if (style) {
    prompt += `\n\nSTYLE GUIDE: ${style}`;
  }

  // Add glossary
  if (glossary && Object.keys(glossary).length > 0) {
    prompt += `\n\nGLOSSARY (Use these exact translations for the following terms):`;
    for (const [term, translation] of Object.entries(glossary)) {
      prompt += `\n- "${term}" → "${translation}"`;
    }
  }

  // Add custom instructions
  if (instructions) {
    prompt += `\n\nADDITIONAL INSTRUCTIONS: ${instructions}`;
  }

  // Add context
  if (context) {
    prompt += `\n\nCONTEXT: ${context}`;
  }

  return prompt;
}

/**
 * Get translation rules for a specific locale
 * @param {Object} config - i18n configuration
 * @param {string} targetLocale - Target locale
 * @returns {Object} Translation rules
 */
function getTranslationRules(config, targetLocale) {
  const aiConfig = config.ai || {};
  const rules = aiConfig.translationRules || {};

  // Check for locale-specific rules
  const localeRules = rules.locales?.[targetLocale] || {};

  // Merge global rules with locale-specific rules
  return {
    tone: localeRules.tone || rules.tone,
    style: localeRules.style || rules.style,
    glossary: { ...rules.glossary, ...localeRules.glossary },
    instructions: localeRules.instructions || rules.instructions,
    context: localeRules.context || rules.context,
  };
}

/**
 * Get Google Cloud access token using gcloud CLI
 * @returns {string} Access token
 */
function getGoogleAccessToken() {
  try {
    const token = execSync('gcloud auth print-access-token', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return token;
  } catch {
    throw new Error(
      'Failed to get Google Cloud access token. Make sure you are authenticated with `gcloud auth login` ' +
        'or `gcloud auth application-default login`'
    );
  }
}

/**
 * Get Google Cloud project ID
 * @param {Object} aiConfig - AI configuration
 * @returns {string} Project ID
 */
function getGoogleProjectId(aiConfig) {
  if (aiConfig.projectId) return aiConfig.projectId;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;

  try {
    const projectId = execSync('gcloud config get-value project', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (projectId) return projectId;
  } catch {
    // Ignore
  }

  throw new Error(
    'Google Cloud project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable ' +
      'or configure ai.projectId in i18n.config.ts'
  );
}

/**
 * Get AI provider configuration from environment or config
 * @param {Object} config - i18n configuration
 * @returns {{ provider: string, apiKey: string, model: string, projectId?: string, location?: string }}
 */
function getAIConfig(config) {
  const aiConfig = config.ai || {};

  // Check environment variables first
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  if (aiConfig.provider === 'openai' || (!aiConfig.provider && openaiKey)) {
    return {
      provider: 'openai',
      apiKey: aiConfig.apiKey || openaiKey,
      model: aiConfig.model || 'gpt-4o-mini',
    };
  }

  if (aiConfig.provider === 'anthropic' || (!aiConfig.provider && anthropicKey)) {
    return {
      provider: 'anthropic',
      apiKey: aiConfig.apiKey || anthropicKey,
      model: aiConfig.model || 'claude-sonnet-4-20250514',
    };
  }

  if (
    aiConfig.provider === 'vertex' ||
    aiConfig.provider === 'vertexai' ||
    aiConfig.provider === 'google'
  ) {
    return {
      provider: 'vertex',
      projectId: getGoogleProjectId(aiConfig),
      location: aiConfig.location || 'us-central1',
      model: aiConfig.model || 'gemini-2.0-flash',
    };
  }

  // Auto-detect Vertex AI if gcloud is configured
  if (!aiConfig.provider && googleProject) {
    return {
      provider: 'vertex',
      projectId: googleProject,
      location: aiConfig.location || 'us-central1',
      model: aiConfig.model || 'gemini-2.0-flash',
    };
  }

  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_CLOUD_PROJECT environment variable, ' +
      'or configure ai.provider in i18n.config.ts'
  );
}

/**
 * Translate text using OpenAI API
 * @param {string[]} texts - Source texts to translate
 * @param {string} sourceLocale - Source language code
 * @param {string} targetLocale - Target language code
 * @param {Object} aiConfig - AI configuration
 * @param {Object} rules - Translation rules
 * @returns {Promise<string[]>} Translated texts
 */
async function translateWithOpenAI(texts, sourceLocale, targetLocale, aiConfig, rules) {
  const systemPrompt = buildTranslationPrompt(sourceLocale, targetLocale, rules);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content:
            systemPrompt +
            `

Output format: Return a JSON array of translated strings in the same order as input.
Example input: ["Hello {name}", "Welcome to our app"]
Example output: ["안녕하세요 {name}", "앱에 오신 것을 환영합니다"]`,
        },
        {
          role: 'user',
          content: JSON.stringify(texts),
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    // If not valid JSON, try to extract array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse OpenAI response: ${content}`);
  }
}

/**
 * Translate text using Anthropic API
 * @param {string[]} texts - Source texts to translate
 * @param {string} sourceLocale - Source language code
 * @param {string} targetLocale - Target language code
 * @param {Object} aiConfig - AI configuration
 * @param {Object} rules - Translation rules
 * @returns {Promise<string[]>} Translated texts
 */
async function translateWithAnthropic(texts, sourceLocale, targetLocale, aiConfig, rules) {
  const basePrompt = buildTranslationPrompt(sourceLocale, targetLocale, rules);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': aiConfig.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiConfig.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${basePrompt}

Input texts:
${JSON.stringify(texts, null, 2)}

Output format: Return ONLY a JSON array of translated strings in the same order as input.
Example: ["translated text 1", "translated text 2"]`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    return JSON.parse(content);
  } catch {
    // If not valid JSON, try to extract array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse Anthropic response: ${content}`);
  }
}

/**
 * Translate text using Google Vertex AI (Gemini) API
 * @param {string[]} texts - Source texts to translate
 * @param {string} sourceLocale - Source language code
 * @param {string} targetLocale - Target language code
 * @param {Object} aiConfig - AI configuration
 * @param {Object} rules - Translation rules
 * @returns {Promise<string[]>} Translated texts
 */
async function translateWithVertexAI(texts, sourceLocale, targetLocale, aiConfig, rules) {
  const accessToken = getGoogleAccessToken();
  const { projectId, location, model } = aiConfig;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const basePrompt = buildTranslationPrompt(sourceLocale, targetLocale, rules);
  const prompt = `${basePrompt}

Input texts:
${JSON.stringify(texts, null, 2)}

Output format: Return ONLY a JSON array of translated strings in the same order as input.
Example: ["translated text 1", "translated text 2"]`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI API error: ${error}`);
  }

  const data = await response.json();

  // Extract text from Vertex AI response
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error(`Unexpected Vertex AI response structure: ${JSON.stringify(data)}`);
  }

  try {
    return JSON.parse(content);
  } catch {
    // If not valid JSON, try to extract array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse Vertex AI response: ${content}`);
  }
}

/**
 * Translate texts using configured AI provider
 * @param {string[]} texts - Source texts to translate
 * @param {string} sourceLocale - Source language code
 * @param {string} targetLocale - Target language code
 * @param {Object} aiConfig - AI configuration
 * @param {Object} rules - Translation rules
 * @returns {Promise<string[]>} Translated texts
 */
async function translateTexts(texts, sourceLocale, targetLocale, aiConfig, rules = {}) {
  if (texts.length === 0) return [];

  // Batch translations to avoid API limits (max 50 texts per request)
  const BATCH_SIZE = 50;
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    console.log(
      `  Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`
    );

    let translated;
    if (aiConfig.provider === 'openai') {
      translated = await translateWithOpenAI(batch, sourceLocale, targetLocale, aiConfig, rules);
    } else if (aiConfig.provider === 'vertex') {
      translated = await translateWithVertexAI(batch, sourceLocale, targetLocale, aiConfig, rules);
    } else {
      translated = await translateWithAnthropic(batch, sourceLocale, targetLocale, aiConfig, rules);
    }

    results.push(...translated);

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get locale display name
 * @param {string} locale - Locale code
 * @returns {string} Display name
 */
function getLocaleName(locale) {
  const names = {
    en: 'English',
    ko: 'Korean',
    ja: 'Japanese',
    zh: 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
    ms: 'Malay',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    uk: 'Ukrainian',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
  };
  return names[locale] || locale;
}

/**
 * Translate missing translations for a specific locale
 * @param {Object} config - i18n configuration
 * @param {string} targetLocale - Target locale to translate
 * @param {Object} options - Options { dryRun: boolean }
 * @returns {Promise<{ translated: number, skipped: number }>}
 */
export async function translateLocale(config, targetLocale, options = {}) {
  const { dryRun = false } = options;
  const messagesDir = resolve(process.cwd(), config.messagesDir);
  const sourceLocale = config.sourceLocale;

  if (targetLocale === sourceLocale) {
    console.log(`⏭️  Skipping source locale: ${targetLocale}`);
    return { translated: 0, skipped: 0 };
  }

  const aiConfig = getAIConfig(config);
  const rules = getTranslationRules(config, targetLocale);

  console.log(`\n🤖 Using ${aiConfig.provider} (${aiConfig.model}) for translation`);
  console.log(`📝 Translating: ${getLocaleName(sourceLocale)} → ${getLocaleName(targetLocale)}`);

  // Log translation rules if configured
  if (rules.tone) console.log(`   Tone: ${rules.tone}`);
  if (rules.glossary && Object.keys(rules.glossary).length > 0) {
    console.log(`   Glossary: ${Object.keys(rules.glossary).length} terms`);
  }
  console.log();

  const sourceDir = resolve(messagesDir, sourceLocale);
  const targetDir = resolve(messagesDir, targetLocale);

  if (!existsSync(sourceDir)) {
    throw new Error(`Source locale directory not found: ${sourceDir}`);
  }

  if (!existsSync(targetDir)) {
    throw new Error(`Target locale directory not found: ${targetDir}`);
  }

  // Find all namespace files
  const files = readdirSync(sourceDir).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.meta.json')
  );

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const namespace = file.replace('.json', '');
    console.log(`\n📁 Processing namespace: ${namespace}`);

    const sourceMetaPath = resolve(sourceDir, `${namespace}.meta.json`);
    const targetMsgPath = resolve(targetDir, file);
    const targetMetaPath = resolve(targetDir, `${namespace}.meta.json`);

    if (!existsSync(sourceMetaPath)) {
      console.log(`   ⚠️  No meta file found, skipping`);
      continue;
    }

    const sourceMeta = JSON.parse(readFileSync(sourceMetaPath, 'utf-8'));
    const targetMessages = existsSync(targetMsgPath)
      ? JSON.parse(readFileSync(targetMsgPath, 'utf-8'))
      : {};

    // Find missing or empty translations
    const textsToTranslate = [];
    const hashesToUpdate = [];

    for (const [sourceText, hash] of Object.entries(sourceMeta)) {
      const existingTranslation = targetMessages[hash];

      // Skip if translation exists and is not empty
      if (existingTranslation && existingTranslation.trim() !== '') {
        totalSkipped++;
        continue;
      }

      textsToTranslate.push(sourceText);
      hashesToUpdate.push(hash);
    }

    if (textsToTranslate.length === 0) {
      console.log(`   ✅ All translations complete (${Object.keys(sourceMeta).length} messages)`);
      continue;
    }

    console.log(`   📊 Found ${textsToTranslate.length} missing translations`);

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would translate:`);
      textsToTranslate.slice(0, 5).forEach((text) => {
        console.log(`      - "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      });
      if (textsToTranslate.length > 5) {
        console.log(`      ... and ${textsToTranslate.length - 5} more`);
      }
      totalTranslated += textsToTranslate.length;
      continue;
    }

    // Translate with AI
    const translations = await translateTexts(
      textsToTranslate,
      sourceLocale,
      targetLocale,
      aiConfig,
      rules
    );

    // Update target messages
    for (let i = 0; i < hashesToUpdate.length; i++) {
      const hash = hashesToUpdate[i];
      const translation = translations[i];

      if (translation) {
        targetMessages[hash] = translation;
        totalTranslated++;
      }
    }

    // Sort and write updated messages
    const sortedMessages = Object.keys(targetMessages)
      .sort()
      .reduce((acc, key) => {
        acc[key] = targetMessages[key];
        return acc;
      }, {});

    writeFileSync(targetMsgPath, JSON.stringify(sortedMessages, null, 2) + '\n', 'utf-8');

    // Also copy meta file to target locale (for consistency)
    const sortedMeta = Object.keys(sourceMeta)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sourceMeta[key];
        return acc;
      }, {});

    writeFileSync(targetMetaPath, JSON.stringify(sortedMeta, null, 2) + '\n', 'utf-8');

    console.log(`   ✅ Translated ${translations.length} messages`);
  }

  return { translated: totalTranslated, skipped: totalSkipped };
}

/**
 * Translate all missing translations for all locales
 * @param {Object} config - i18n configuration
 * @param {Object} options - Options { dryRun: boolean, locales: string[] }
 * @returns {Promise<{ total: number, perLocale: Object }>}
 */
export async function translateAll(config, options = {}) {
  const { dryRun = false, locales = config.locales } = options;

  console.log('🌍 AI Translation for text-intl\n');
  console.log(`Source locale: ${config.sourceLocale}`);
  console.log(`Target locales: ${locales.filter((l) => l !== config.sourceLocale).join(', ')}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No files will be modified\n');
  }

  const results = {};
  let totalTranslated = 0;

  for (const locale of locales) {
    if (locale === config.sourceLocale) continue;

    const result = await translateLocale(config, locale, { dryRun });
    results[locale] = result;
    totalTranslated += result.translated;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Translation Summary\n');

  for (const [locale, result] of Object.entries(results)) {
    console.log(
      `   ${getLocaleName(locale)} (${locale}): ${result.translated} translated, ${result.skipped} skipped`
    );
  }

  console.log(`\n   Total: ${totalTranslated} translations`);

  return { total: totalTranslated, perLocale: results };
}
