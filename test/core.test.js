import { describe, it, expect, beforeEach } from 'vitest';
import { init, t, getLocale, setLocale } from '../src/index.js';

describe('i18n Core', () => {
  beforeEach(() => {
    // Reset to default state before each test
    init({
      locale: 'en',
      messages: {
        en: {
          common: {
            hello: 'Hello',
            'hello_name': 'Hello {name}',
          }
        },
        ko: {
          common: {
            hello: '안녕하세요',
            'hello_name': '안녕하세요 {name}',
          }
        }
      }
    });
  });

  describe('init()', () => {
    it('should initialize with valid config', () => {
      init({
        locale: 'en',
        messages: {
          en: { common: { test: 'Test' } }
        }
      });
      expect(getLocale()).toBe('en');
    });

    it('should throw error if config is missing', () => {
      expect(() => init()).toThrow('init() requires a config object');
    });

    it('should throw error if locale is missing', () => {
      expect(() => init({ messages: {} })).toThrow('config.locale must be a non-empty string');
    });

    it('should throw error if messages is missing', () => {
      expect(() => init({ locale: 'en' })).toThrow('config.messages must be an object');
    });
  });

  describe('t() - Simple translation', () => {
    it('should translate simple messages', () => {
      expect(t('hello')).toBe('Hello');
    });

    it('should return original text if translation not found', () => {
      expect(t('missing_key')).toBe('missing_key');
    });

    it('should substitute variables', () => {
      expect(t('hello_name', { name: 'John' })).toBe('Hello John');
    });
  });

  describe('t() - ICU Plural', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              items: '{count, plural, =0 {no items} one {# item} other {# items}}',
              followers: '{count, plural, =0 {no followers yet} one {# follower} other {# followers}}',
            }
          }
        }
      });
    });

    it('should handle plural with =0', () => {
      expect(t('items', { count: 0 })).toBe('no items');
    });

    it('should handle plural with one', () => {
      expect(t('items', { count: 1 })).toBe('1 item');
    });

    it('should handle plural with other', () => {
      expect(t('items', { count: 5 })).toBe('5 items');
    });

    it('should handle large numbers', () => {
      expect(t('items', { count: 100 })).toBe('100 items');
    });

    it('should use locale-specific plural rules', () => {
      init({
        locale: 'ru',
        messages: {
          ru: {
            common: {
              items: '{count, plural, one {# предмет} few {# предмета} many {# предметов} other {# предметов}}',
            }
          }
        }
      });

      expect(t('items', { count: 1 })).toBe('1 предмет');
      expect(t('items', { count: 2 })).toBe('2 предмета');
      expect(t('items', { count: 5 })).toBe('5 предметов');
    });
  });

  describe('t() - ICU Select', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              gender_message: '{gender, select, male {He} female {She} other {They}} liked this',
              status: '{status, select, pending {Processing} completed {Done} failed {Error} other {Unknown}}',
            }
          }
        }
      });
    });

    it('should handle select with male', () => {
      expect(t('gender_message', { gender: 'male' })).toBe('He liked this');
    });

    it('should handle select with female', () => {
      expect(t('gender_message', { gender: 'female' })).toBe('She liked this');
    });

    it('should handle select with other', () => {
      expect(t('gender_message', { gender: 'unknown' })).toBe('They liked this');
    });

    it('should handle status select', () => {
      expect(t('status', { status: 'pending' })).toBe('Processing');
      expect(t('status', { status: 'completed' })).toBe('Done');
      expect(t('status', { status: 'invalid' })).toBe('Unknown');
    });
  });

  describe('t() - ICU Combined', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              complex: '{name} has {count, plural, =0 {no items} one {# item} other {# items}} in {container, select, cart {cart} wishlist {wishlist} other {list}}',
            }
          }
        }
      });
    });

    it('should handle plural + select combination', () => {
      expect(t('complex', { name: 'John', count: 0, container: 'cart' }))
        .toBe('John has no items in cart');
      
      expect(t('complex', { name: 'Jane', count: 1, container: 'wishlist' }))
        .toBe('Jane has 1 item in wishlist');
      
      expect(t('complex', { name: 'Bob', count: 5, container: 'unknown' }))
        .toBe('Bob has 5 items in list');
    });
  });

  describe('t() - ICU Offset', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              attendees: '{count, plural, offset:1 =0 {Nobody} =1 {Just you} one {You and # other} other {You and # others}}',
            }
          }
        }
      });
    });

    it('should handle offset correctly', () => {
      expect(t('attendees', { count: 0 })).toBe('Nobody');
      expect(t('attendees', { count: 1 })).toBe('Just you');
      expect(t('attendees', { count: 2 })).toBe('You and 1 other');
      expect(t('attendees', { count: 5 })).toBe('You and 4 others');
    });
  });

  describe('Locale management', () => {
    it('should get current locale', () => {
      expect(getLocale()).toBe('en');
    });

    it('should set locale', () => {
      setLocale('ko');
      expect(getLocale()).toBe('ko');
      expect(t('hello')).toBe('안녕하세요');
    });

    it('should throw error when setting invalid locale', () => {
      expect(() => setLocale('invalid')).toThrow('Locale "invalid" is not available');
    });
  });

  describe('Fallback locale', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        fallbackLocale: 'ko',
        messages: {
          en: {
            common: {
              hello: 'Hello',
            }
          },
          ko: {
            common: {
              hello: '안녕하세요',
              korean_only: '한국어만',
            }
          }
        }
      });
    });

    it('should use fallback locale when translation missing', () => {
      expect(t('korean_only')).toBe('한국어만');
    });

    it('should prefer current locale over fallback', () => {
      expect(t('hello')).toBe('Hello');
    });
  });

  describe('Namespace support', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              hello: 'Hello',
            },
            cart: {
              add: 'Add to cart',
            }
          }
        }
      });
    });

    it('should translate from default namespace', () => {
      expect(t('hello')).toBe('Hello');
    });

    it('should translate from specific namespace', () => {
      expect(t('add', {}, 'cart')).toBe('Add to cart');
    });

    it('should return key if namespace not found', () => {
      expect(t('test', {}, 'invalid_namespace')).toBe('test');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed ICU syntax gracefully', () => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              broken: '{count, plural, one {# item}', // Missing closing brace
            }
          }
        }
      });

      // Should return original message on error
      const result = t('broken', { count: 1 });
      expect(result).toBeTruthy();
    });

    it('should handle non-ICU messages with curly braces', () => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              code: 'Use {variable} for substitution',
            }
          }
        }
      });

      expect(t('code', { variable: 'count' })).toBe('Use count for substitution');
    });
  });

  describe('Hash-based keys with meta mapping', () => {
    beforeEach(() => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              'a1b2c3d4': 'Hello',
              'e5f6g7h8': 'Hello {name}',
              'f9e8d7c6': '{count, plural, =0 {no items} one {# item} other {# items}}',
            }
          },
          ko: {
            common: {
              'a1b2c3d4': '안녕하세요',
              'e5f6g7h8': '안녕하세요 {name}',
              'f9e8d7c6': '{count, plural, =0 {항목 없음} other {# 개 항목}}',
            }
          }
        },
        meta: {
          en: {
            common: {
              'Hello': 'a1b2c3d4',
              'Hello {name}': 'e5f6g7h8',
              '{count, plural, =0 {no items} one {# item} other {# items}}': 'f9e8d7c6',
            }
          },
          ko: {
            common: {
              'Hello': 'a1b2c3d4',
              'Hello {name}': 'e5f6g7h8',
              '{count, plural, =0 {no items} one {# item} other {# items}}': 'f9e8d7c6',
            }
          }
        }
      });
    });

    it('should translate using source text with meta mapping', () => {
      expect(t('Hello')).toBe('Hello');
    });

    it('should translate with variables using source text', () => {
      expect(t('Hello {name}', { name: 'John' })).toBe('Hello John');
    });

    it('should translate ICU plural using source text', () => {
      expect(t('{count, plural, =0 {no items} one {# item} other {# items}}', { count: 0 }))
        .toBe('no items');
      expect(t('{count, plural, =0 {no items} one {# item} other {# items}}', { count: 1 }))
        .toBe('1 item');
      expect(t('{count, plural, =0 {no items} one {# item} other {# items}}', { count: 5 }))
        .toBe('5 items');
    });

    it('should use correct translation for locale', () => {
      setLocale('ko');
      expect(t('Hello')).toBe('안녕하세요');
      expect(t('Hello {name}', { name: '철수' })).toBe('안녕하세요 철수');
    });

    it('should fallback to source text if meta not found', () => {
      expect(t('Unknown message')).toBe('Unknown message');
    });

    it('should work with fallback locale and meta', () => {
      init({
        locale: 'en',
        fallbackLocale: 'ko',
        messages: {
          en: {
            common: {
              'hash1': 'Hello',
            }
          },
          ko: {
            common: {
              'hash1': '안녕하세요',
              'hash2': '한국어만',
            }
          }
        },
        meta: {
          en: {
            common: {
              'Hello': 'hash1',
            }
          },
          ko: {
            common: {
              'Hello': 'hash1',
              'Korean only': 'hash2',
            }
          }
        }
      });

      expect(t('Hello')).toBe('Hello');
      expect(t('Korean only')).toBe('한국어만');
    });
  });

  describe('Backwards compatibility (direct key access)', () => {
    it('should still work with direct keys when no meta provided', () => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              'Hello': 'Hello World',
              'Goodbye': 'Goodbye World',
            }
          }
        }
        // No meta provided
      });

      expect(t('Hello')).toBe('Hello World');
      expect(t('Goodbye')).toBe('Goodbye World');
    });

    it('should prefer meta mapping over direct key when both exist', () => {
      init({
        locale: 'en',
        messages: {
          en: {
            common: {
              'test_key': 'Direct Key Value',
              'hash123': 'Meta Value',
            }
          }
        },
        meta: {
          en: {
            common: {
              'test_key': 'hash123', // Maps test_key to hash123
            }
          }
        }
      });

      // Should use meta mapping
      expect(t('test_key')).toBe('Meta Value');
    });
  });
});
