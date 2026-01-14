import { describe, it, expect, beforeEach } from 'vitest'
import { createParser } from './parser'
import { ValidationError } from './errors'
import type { Parser, ResolvedEntity, ResolverScope } from './types'

// Mock resolver for testing
const mockResolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] => {
  // Simple mock that returns entities based on noun
  const entities: Record<string, ResolvedEntity> = {
    lamp: { id: 'lamp-1', name: 'lamp' },
    ball: { id: 'ball-1', name: 'ball' },
    'red ball': { id: 'ball-red', name: 'red ball' },
    'blue ball': { id: 'ball-blue', name: 'blue ball' },
    door: { id: 'door-1', name: 'door' },
    key: { id: 'key-1', name: 'key' },
    box: { id: 'box-1', name: 'box' },
    hammer: { id: 'hammer-1', name: 'hammer' },
    barrel: { id: 'barrel-1', name: 'barrel' },
    merchant: { id: 'merchant-1', name: 'merchant' },
    coin: { id: 'coin-1', name: 'coin' },
    chest: { id: 'chest-1', name: 'chest' },
  }

  // Match by noun and adjectives
  if (adjectives.length > 0) {
    const key = `${adjectives.join(' ')} ${noun}`
    if (entities[key]) {
      return [entities[key]]
    }
    // If specific adjective match not found, might be ambiguous
    if (noun === 'ball' && adjectives.length === 0) {
      return [entities['red ball']!, entities['blue ball']!]
    }
  }

  return entities[noun] ? [entities[noun]!] : []
}

describe('createParser()', () => {
  describe('Basic Functionality', () => {
    it('creates a parser with default vocabulary when no options provided', () => {
      const parser = createParser({ resolver: mockResolver })
      expect(parser).toBeDefined()
      expect(typeof parser.parse).toBe('function')
    })

    it('creates a parser with custom vocabulary when provided', () => {
      const parser = createParser({
        resolver: mockResolver,
        vocabulary: {
          verbs: [{ canonical: 'CUSTOM', synonyms: ['custom'], pattern: 'none' }],
        },
      })
      expect(parser).toBeDefined()
    })

    it('requires a resolver function', () => {
      // @ts-expect-error - Testing runtime validation
      expect(() => createParser({})).toThrow()
    })

    it('throws ValidationError when resolver is not a function', () => {
      // @ts-expect-error - Testing runtime validation
      expect(() => createParser({ resolver: 'not a function' })).toThrow(ValidationError)
    })

    it('returns an object with parse method', () => {
      const parser = createParser({ resolver: mockResolver })
      expect(parser.parse).toBeDefined()
      expect(typeof parser.parse).toBe('function')
    })

    it('returns an object with addVerb method', () => {
      const parser = createParser({ resolver: mockResolver })
      expect(parser.addVerb).toBeDefined()
      expect(typeof parser.addVerb).toBe('function')
    })

    it('returns an object with addDirection method', () => {
      const parser = createParser({ resolver: mockResolver })
      expect(parser.addDirection).toBeDefined()
      expect(typeof parser.addDirection).toBe('function')
    })

    it('returns an object with clearPronoun method', () => {
      const parser = createParser({ resolver: mockResolver })
      expect(parser.clearPronoun).toBeDefined()
      expect(typeof parser.clearPronoun).toBe('function')
    })
  })

  describe('Instance Isolation', () => {
    it('parser instances have independent vocabulary state', () => {
      // Create two parsers
      const parser1 = createParser({ resolver: mockResolver })
      const parser2 = createParser({ resolver: mockResolver })

      // Add a custom verb to parser1 only
      parser1.addVerb({
        canonical: 'CUSTOM',
        synonyms: ['custom'],
        pattern: 'none',
      })

      // parser1 should recognize the custom verb
      const result1 = parser1.parse('custom')
      expect(result1.type).toBe('command')
      if (result1.type === 'command') {
        expect(result1.command.verb).toBe('CUSTOM')
      }

      // parser2 should NOT recognize the custom verb
      const result2 = parser2.parse('custom')
      expect(result2.type).toBe('unknown_verb')
    })

    it('addDirection on one parser does not affect another', () => {
      // Create two parsers
      const parser1 = createParser({ resolver: mockResolver })
      const parser2 = createParser({ resolver: mockResolver })

      // Add a custom direction to parser1 only
      parser1.addDirection({
        canonical: 'WARP',
        aliases: ['warp'],
      })

      // parser1 should recognize the custom direction
      const result1 = parser1.parse('warp')
      expect(result1.type).toBe('command')
      if (result1.type === 'command') {
        expect(result1.command.direction).toBe('WARP')
      }

      // parser2 should NOT recognize the custom direction
      const result2 = parser2.parse('warp')
      expect(result2.type).toBe('unknown_verb')
    })

    it('multiple parsers can add verbs independently', () => {
      // Create multiple parsers
      const parsers = Array.from({ length: 5 }, () =>
        createParser({ resolver: mockResolver })
      )

      // Add a unique verb to each parser
      parsers.forEach((parser, i) => {
        parser.addVerb({
          canonical: `VERB${i}`,
          synonyms: [`verb${i}`],
          pattern: 'none',
        })
      })

      // Each parser should only recognize its own verb
      parsers.forEach((parser, i) => {
        // Should recognize its own verb
        const ownResult = parser.parse(`verb${i}`)
        expect(ownResult.type).toBe('command')

        // Should NOT recognize other verbs
        for (let j = 0; j < parsers.length; j++) {
          if (j !== i) {
            const otherResult = parser.parse(`verb${j}`)
            expect(otherResult.type).toBe('unknown_verb')
          }
        }
      })
    })

    it('DEFAULT_VOCABULARY is not mutated by addVerb', () => {
      // Create a parser and add a verb
      const parser = createParser({ resolver: mockResolver })
      parser.addVerb({
        canonical: 'MUTATE',
        synonyms: ['mutate'],
        pattern: 'none',
      })

      // Create a new parser - it should NOT see the added verb
      const freshParser = createParser({ resolver: mockResolver })
      const result = freshParser.parse('mutate')
      expect(result.type).toBe('unknown_verb')
    })
  })

  describe('Options', () => {
    it('respects partialMatch option when set to false', () => {
      const parser = createParser({ resolver: mockResolver, partialMatch: false })
      const result = parser.parse('exa lamp')
      expect(result.type).toBe('unknown_verb')
    })

    it('respects partialMatch option when set to true (default)', () => {
      const parser = createParser({ resolver: mockResolver, partialMatch: true })
      const result = parser.parse('exa lamp')
      // With partial match, "exa" should match "examine"
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXAMINE')
      }
    })

    it('respects minPartialLength option (default 3)', () => {
      const parser = createParser({ resolver: mockResolver })
      const result = parser.parse('la') // Too short
      expect(result.type).toBe('unknown_verb')
    })

    it('respects custom minPartialLength value', () => {
      const parser = createParser({ resolver: mockResolver, minPartialLength: 2 })
      const result = parser.parse('lo lamp') // Now long enough with subject for "lock"
      // "lo" matches "lock" (first partial match) which requires a subject
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        // "lo" partially matches "lock" (comes before "look" in vocab)
        expect(result.command.verb).toBe('LOCK')
        expect(result.command.subject).toBeDefined()
      }
    })
  })

  describe('Security: Input Length DoS Prevention', () => {
    it('rejects input exceeding maximum length', () => {
      const parser = createParser({ resolver: mockResolver })
      // Create input exceeding 1 million characters
      const maliciousInput = 'a'.repeat(1_000_001)

      expect(() => parser.parse(maliciousInput)).toThrow(ValidationError)
      expect(() => parser.parse(maliciousInput)).toThrow(
        /Input exceeds maximum length of 1000000 characters/
      )
    })

    it('accepts input at exactly maximum length', () => {
      const parser = createParser({ resolver: mockResolver })
      // Create input at exactly 1 million characters
      const maxInput = 'a'.repeat(1_000_000)

      const result = parser.parse(maxInput)
      expect(result).toBeDefined()
      expect(result.type).toBe('unknown_verb')
    })

    it('rejects massively oversized input (10MB)', () => {
      const parser = createParser({ resolver: mockResolver })
      // 10 million character string
      const hugeInput = 'x'.repeat(10_000_000)

      expect(() => parser.parse(hugeInput)).toThrow(ValidationError)
      expect(() => parser.parse(hugeInput)).toThrow(/Input exceeds maximum length/)
    })

    it('handles input just under limit efficiently', () => {
      const parser = createParser({ resolver: mockResolver })
      const largeInput = 'get lamp and then ' + 'a'.repeat(999_980)

      const start = Date.now()
      const result = parser.parse(largeInput)
      const elapsed = Date.now() - start

      expect(result).toBeDefined()
      // Should complete in reasonable time even at max size
      expect(elapsed).toBeLessThan(2000)
    })

    it('prevents DoS via repeated words near limit', () => {
      const parser = createParser({ resolver: mockResolver })
      // Create input with many repeated tokens near limit
      const repeatedWords = 'word '.repeat(200_000) // 200k * 5 chars = 1M chars

      const start = Date.now()
      const result = parser.parse(repeatedWords)
      const elapsed = Date.now() - start

      expect(result).toBeDefined()
      expect(elapsed).toBeLessThan(2000)
    })

    it('validates length before tokenization', () => {
      const parser = createParser({ resolver: mockResolver })
      // This test ensures the length check happens early, preventing
      // any expensive tokenization work on oversized input
      const oversized = 'x'.repeat(2_000_000)

      // Should throw immediately without doing expensive work
      const start = Date.now()
      expect(() => parser.parse(oversized)).toThrow(ValidationError)
      const elapsed = Date.now() - start

      // Should fail almost instantly (length check is O(1))
      expect(elapsed).toBeLessThan(50)
    })

    it('handles unicode characters in length calculation', () => {
      const parser = createParser({ resolver: mockResolver })
      // Unicode characters still count as individual chars in length
      // Emoji and other multi-byte chars count as 1-2 UTF-16 code units
      const unicodeInput = '🔑'.repeat(500_001) // Over limit with emoji

      expect(() => parser.parse(unicodeInput)).toThrow(ValidationError)
    })

    it('protects against quadratic behavior with nested quotes', () => {
      const parser = createParser({ resolver: mockResolver })
      // Nested quotes can cause quadratic behavior in tokenizer
      // Ensure we reject before hitting pathological case
      const nestedQuotes = '"'.repeat(1_000_001)

      expect(() => parser.parse(nestedQuotes)).toThrow(ValidationError)
    })
  })
})
