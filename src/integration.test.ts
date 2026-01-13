import { describe, it, expect } from 'vitest'
import { createParser } from './parser'
import type { ResolvedEntity, ResolverScope } from './types'

// Comprehensive resolver for integration tests
const integrationResolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] => {
  const entities: Record<string, ResolvedEntity> = {
    ball: { id: 'ball-1', name: 'ball' },
    chest: { id: 'chest-1', name: 'chest' },
    lamp: { id: 'lamp-1', name: 'lamp' },
    door: { id: 'door-1', name: 'door' },
    key: { id: 'key-1', name: 'key' },
  }

  // Handle adjectives
  if (adjectives.includes('red') && noun === 'ball') {
    return [{ id: 'ball-red', name: 'red ball' }]
  }

  return entities[noun] ? [entities[noun]!] : []
}

describe('Integration Tests', () => {
  describe('Complete Parsing Flows', () => {
    it('parses "get the red ball from the chest" end-to-end', () => {
      const parser = createParser({ resolver: integrationResolver })
      const result = parser.parse('get the red ball from the chest')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
        expect(result.command.subject?.noun).toBe('ball')
        expect(result.command.subject?.adjectives).toContain('red')
        expect(result.command.object?.noun).toBe('chest')
        expect(result.command.preposition).toBe('from')
      }
    })

    it('parses "examine it" using pronoun reference', () => {
      const parser = createParser({ resolver: integrationResolver })
      // First, establish a referent
      parser.parse('get lamp')
      // Now use pronoun
      const result = parser.parse('examine it')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXAMINE')
        expect(result.command.subject?.id).toBe('lamp-1')
      }
    })

    it('parses complex command with all elements', () => {
      const parser = createParser({ resolver: integrationResolver })
      const result = parser.parse('put the key in the chest')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('PUT')
        expect(result.command.subject?.noun).toBe('key')
        expect(result.command.subject?.id).toBe('key-1')
        expect(result.command.object?.noun).toBe('chest')
        expect(result.command.object?.id).toBe('chest-1')
        expect(result.command.preposition).toBe('in')
      }
    })

    it('handles realistic game commands', () => {
      const parser = createParser({ resolver: integrationResolver })
      const commandsWithExpectedVerbs: Array<[string, string]> = [
        ['look', 'LOOK'],
        ['inventory', 'INVENTORY'],
        ['get lamp', 'GET'],
        ['examine lamp', 'EXAMINE'],
        ['go north', 'GO'],
        ['open door', 'OPEN'],
        ['unlock door with key', 'UNLOCK'],
        ['say hello world', 'SAY'],
      ]
      for (const [cmd, expectedVerb] of commandsWithExpectedVerbs) {
        const result = parser.parse(cmd)
        expect(result.type).toBe('command')
        if (result.type === 'command') {
          expect(result.command.verb).toBe(expectedVerb)
        }
      }
    })
  })

  describe('Round-trip', () => {
    it('parsed command contains enough info to reconstruct intent', () => {
      const parser = createParser({ resolver: integrationResolver })
      const input = 'get the red ball from chest'
      const result = parser.parse(input)
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        // Raw input is preserved
        expect(result.command.raw).toBe(input)
        // Verb is canonical
        expect(result.command.verb).toBe('GET')
        // Subject has all required info
        expect(result.command.subject?.id).toBe('ball-red')
        expect(result.command.subject?.noun).toBe('ball')
        expect(result.command.subject?.adjectives).toContain('red')
        // Object has required info
        expect(result.command.object?.id).toBe('chest-1')
        expect(result.command.object?.noun).toBe('chest')
        // Preposition is captured
        expect(result.command.preposition).toBe('from')
      }
    })
  })
})

describe('Edge Cases', () => {
  const parser = createParser({ resolver: integrationResolver })

  describe('Malformed Input', () => {
    it('handles tab characters', () => {
      const result = parser.parse('get\tlamp')
      // Tab should be treated as whitespace separator
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('handles newline characters', () => {
      const result = parser.parse('get\nlamp')
      // Newline should be treated as whitespace separator
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('handles carriage returns', () => {
      const result = parser.parse('get\rlamp')
      // Carriage return should be treated as whitespace separator
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('handles null bytes gracefully', () => {
      const result = parser.parse('get\x00lamp')
      // Parser should handle null byte without crashing
      // Null byte acts as a separator, 'getlamp' is not a recognized verb but 'get' is separated
      // Actually null byte is skipped since it's not whitespace and not alphanumeric
      // So 'get' and 'lamp' should be parsed (null byte is skipped as punctuation)
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })
  })

  describe('Unicode', () => {
    it('handles accented characters', () => {
      const result = parser.parse('get café')
      // Parser should correctly parse but noun won't be found
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('café')
      }
    })

    it('handles CJK characters', () => {
      const result = parser.parse('get 日本')
      // Parser should correctly parse but CJK noun won't be found
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('日本')
      }
    })

    it('handles RTL text', () => {
      const result = parser.parse('get مفتاح')
      // Parser should correctly parse but RTL noun won't be found
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('مفتاح')
      }
    })

    it('handles combining characters', () => {
      const result = parser.parse('get café') // Using combining accent
      // Parser should correctly parse but noun won't be found
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Stress', () => {
    it('handles 1000 character input without hanging', () => {
      const longInput = 'get ' + 'very '.repeat(200) + 'long name'
      const start = Date.now()
      const result = parser.parse(longInput)
      const elapsed = Date.now() - start
      // Verify the result is a valid parse result (not undefined)
      expect(result).toBeDefined()
      expect(result.type).toBeDefined()
      // Result should be unknown_noun since "name" is not in our resolver
      expect(result.type).toBe('unknown_noun')
      expect(elapsed).toBeLessThan(1000) // Should be much faster, but allow 1s margin
    })

    it('parses quickly (under 10ms for typical input)', () => {
      const start = Date.now()
      for (let i = 0; i < 100; i++) {
        parser.parse('get the red ball from the chest')
      }
      const elapsed = Date.now() - start
      const avgTime = elapsed / 100
      expect(avgTime).toBeLessThan(10)
    })
  })
})
