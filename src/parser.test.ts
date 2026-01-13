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
    })

    it('respects minPartialLength option (default 3)', () => {
      const parser = createParser({ resolver: mockResolver })
      const result = parser.parse('la') // Too short
      expect(result.type).toBe('unknown_verb')
    })

    it('respects custom minPartialLength value', () => {
      const parser = createParser({ resolver: mockResolver, minPartialLength: 2 })
      const result = parser.parse('lo') // Now long enough
      // "lo" should match "look"
      expect(result.type).not.toBe('unknown_verb')
    })
  })
})
