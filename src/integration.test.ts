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
        expect(result.command.verb).toBeDefined()
        expect(result.command.subject).toBeDefined()
        expect(result.command.object).toBeDefined()
        expect(result.command.preposition).toBeDefined()
      }
    })

    it('handles realistic game commands', () => {
      const parser = createParser({ resolver: integrationResolver })
      const commands = [
        'look',
        'inventory',
        'get lamp',
        'examine lamp',
        'go north',
        'open door',
        'unlock door with key',
        'say hello world',
      ]
      for (const cmd of commands) {
        const result = parser.parse(cmd)
        expect(result).toBeDefined()
        expect(result.type).not.toBe('parse_error')
      }
    })
  })

  describe('Round-trip', () => {
    it('parsed command contains enough info to reconstruct intent', () => {
      const parser = createParser({ resolver: integrationResolver })
      const input = 'get the red ball from chest'
      const result = parser.parse(input)
      if (result.type === 'command') {
        expect(result.command.raw).toBe(input)
        expect(result.command.verb).toBeDefined()
        expect(result.command.subject).toBeDefined()
        // Should have all information needed to execute the command
        expect(result.command.subject?.id).toBeDefined()
        expect(result.command.subject?.noun).toBeDefined()
      }
    })
  })
})

describe('Edge Cases', () => {
  const parser = createParser({ resolver: integrationResolver })

  describe('Malformed Input', () => {
    it('handles tab characters', () => {
      const result = parser.parse('get\tlamp')
      expect(result).toBeDefined()
    })

    it('handles newline characters', () => {
      const result = parser.parse('get\nlamp')
      expect(result).toBeDefined()
    })

    it('handles carriage returns', () => {
      const result = parser.parse('get\rlamp')
      expect(result).toBeDefined()
    })

    it('handles null bytes gracefully', () => {
      const result = parser.parse('get\x00lamp')
      expect(result).toBeDefined()
    })
  })

  describe('Unicode', () => {
    it('handles accented characters', () => {
      const result = parser.parse('get café')
      expect(result).toBeDefined()
    })

    it('handles CJK characters', () => {
      const result = parser.parse('get 日本')
      expect(result).toBeDefined()
    })

    it('handles RTL text', () => {
      const result = parser.parse('get مفتاح')
      expect(result).toBeDefined()
    })

    it('handles combining characters', () => {
      const result = parser.parse('get café') // Using combining accent
      expect(result).toBeDefined()
    })
  })

  describe('Stress', () => {
    it('handles 1000 character input without hanging', () => {
      const longInput = 'get ' + 'very '.repeat(200) + 'long name'
      const start = Date.now()
      const result = parser.parse(longInput)
      const elapsed = Date.now() - start
      expect(result).toBeDefined()
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
